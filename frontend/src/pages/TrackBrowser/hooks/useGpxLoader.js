import { useCallback, useEffect } from 'react';
import GPXParser from 'gpxparser';
import { routesApi } from '../../../utils/request';
import { useTrackBrowser } from '../context/TrackBrowserContext';

export function useGpxLoader() {
  const {
    selectedTrack,
    loadedGpxData,
    loadingGpx,
    gpxErrors,
    actions
  } = useTrackBrowser();

  // Load GPX data for a track
  const loadGpxData = useCallback(async (track) => {
    if (!track || loadedGpxData.has(track.id) || loadingGpx.has(track.id)) {
      return; // Already loaded or loading
    }

    actions.addLoadingGpx(track.id);
    actions.removeGpxError(track.id);

    try {
      // Get download URL from API
      const downloadResponse = await routesApi.getDownloadUrl(track.id);
      const downloadUrl = downloadResponse.download_url;

      // Fetch the GPX file
      const gpxResponse = await fetch(downloadUrl);
      if (!gpxResponse.ok) {
        throw new Error(`Failed to download GPX file: ${gpxResponse.statusText}`);
      }

      const gpxText = await gpxResponse.text();
      
      // Parse GPX
      const gpxParser = new GPXParser();
      gpxParser.parse(gpxText);

      if (!gpxParser.tracks || gpxParser.tracks.length === 0) {
        throw new Error('No tracks found in GPX file');
      }

      const coordinates = gpxParser.tracks[0].points.map(point => [point.lon, point.lat]);
      
      const gpxData = {
        coordinates,
        parser: gpxParser,
        stats: {
          distance: gpxParser.tracks[0].distance?.total 
            ? (gpxParser.tracks[0].distance.total / 1000).toFixed(2) 
            : 0,
          elevation: gpxParser.tracks[0].elevation?.max 
            ? Math.round(gpxParser.tracks[0].elevation.max) 
            : 0,
          points: gpxParser.tracks[0].points?.length || 0,
          elevationGain: gpxParser.tracks[0].elevation?.pos || 0,
          elevationLoss: gpxParser.tracks[0].elevation?.neg || 0,
        },
        metadata: {
          name: gpxParser.metadata?.name || track.name,
          description: gpxParser.metadata?.desc || '',
          time: gpxParser.metadata?.time || null,
        },
        rawGpx: gpxText,
        loadedAt: new Date().toISOString()
      };

      actions.addLoadedGpx(track.id, gpxData);
      
      console.log(`GPX loaded successfully for track: ${track.name}`, {
        points: gpxData.stats.points,
        distance: gpxData.stats.distance,
        elevation: gpxData.stats.elevation
      });

    } catch (error) {
      console.error('Error loading GPX data:', error);
      actions.addGpxError(track.id, error.message);
    } finally {
      actions.removeLoadingGpx(track.id);
    }
  }, [loadedGpxData, loadingGpx, actions]);

  // Auto-load GPX when a track is selected
  useEffect(() => {
    if (selectedTrack && !loadedGpxData.has(selectedTrack.id) && !loadingGpx.has(selectedTrack.id)) {
      loadGpxData(selectedTrack);
    }
  }, [selectedTrack, loadedGpxData, loadingGpx, loadGpxData]);

  // Preload GPX for tracks (optional - can be used for better UX)
  const preloadGpxData = useCallback(async (tracks, maxConcurrent = 2) => {
    if (!tracks || tracks.length === 0) return;

    const tracksToLoad = tracks.filter(track => 
      !loadedGpxData.has(track.id) && 
      !loadingGpx.has(track.id) &&
      !gpxErrors.has(track.id)
    );

    // Load a limited number of tracks concurrently
    const batch = tracksToLoad.slice(0, maxConcurrent);
    const promises = batch.map(track => loadGpxData(track));
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Error in preloading GPX data:', error);
    }
  }, [loadedGpxData, loadingGpx, gpxErrors, loadGpxData]);

  // Get GPX data for a specific track
  const getGpxData = useCallback((trackId) => {
    return loadedGpxData.get(trackId);
  }, [loadedGpxData]);

  // Check if GPX is loaded for a track
  const isGpxLoaded = useCallback((trackId) => {
    return loadedGpxData.has(trackId);
  }, [loadedGpxData]);

  // Check if GPX is loading for a track
  const isGpxLoading = useCallback((trackId) => {
    return loadingGpx.has(trackId);
  }, [loadingGpx]);

  // Check if GPX has an error for a track
  const getGpxError = useCallback((trackId) => {
    return gpxErrors.get(trackId);
  }, [gpxErrors]);

  // Retry loading GPX for a track
  const retryLoadGpx = useCallback((track) => {
    actions.removeGpxError(track.id);
    loadGpxData(track);
  }, [actions, loadGpxData]);

  // Clear all GPX data (useful for memory management)
  const clearAllGpxData = useCallback(() => {
    actions.clearGpxData();
  }, [actions]);

  // Get loading statistics
  const getLoadingStats = useCallback(() => {
    return {
      loaded: loadedGpxData.size,
      loading: loadingGpx.size,
      errors: gpxErrors.size,
      total: loadedGpxData.size + loadingGpx.size + gpxErrors.size
    };
  }, [loadedGpxData.size, loadingGpx.size, gpxErrors.size]);

  return {
    // Core functions
    loadGpxData,
    preloadGpxData,
    retryLoadGpx,
    clearAllGpxData,
    
    // Query functions
    getGpxData,
    isGpxLoaded,
    isGpxLoading,
    getGpxError,
    getLoadingStats,
    
    // State (for convenience)
    loadedGpxData,
    loadingGpx,
    gpxErrors,
  };
}

export default useGpxLoader;