import { useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { useTrackBrowser } from '../context/TrackBrowserContext';

export function useMapOperations() {
  const {
    tracks,
    selectedTrack,
    loadedGpxData,
    actions,
    setMapInstance,
    getMapInstance,
    clearMapInstance,
    mapReady,
    isMapReady
  } = useTrackBrowser();
  
  // Debug logs
  console.log('useMapOperations render:', {
    hasMapInstance: !!getMapInstance(),
    mapReady,
    tracksCount: tracks.length,
    selectedTrack: selectedTrack?.name
  });

  // Update map tracks layers
  const updateMapTracks = useCallback(() => {
    const currentMap = getMapInstance();
    if (!currentMap || !currentMap.isStyleLoaded()) return;

    // console.log('Updating map tracks:', {
    //   tracksCount: tracks.length,
    //   selectedTrack: selectedTrack?.name,
    //   loadedGpxCount: loadedGpxData.size,
    //   loadedGpxTracks: Array.from(loadedGpxData.keys())
    // });

    // Clear all existing track layers and sources
    const style = currentMap.getStyle();
    if (style && style.layers) {
      const trackLayers = style.layers.filter(layer => 
        layer.id.startsWith('track-layer-') || layer.id.startsWith('gpx-layer-')
      );
      trackLayers.forEach(layer => {
        if (currentMap.getLayer(layer.id)) {
          // Remove all event listeners for this layer
          currentMap.off('mouseenter', layer.id);
          currentMap.off('mouseleave', layer.id);
          currentMap.off('click', layer.id);
          currentMap.removeLayer(layer.id);
        }
      });
    }
    
    if (style && style.sources) {
      Object.keys(style.sources).forEach(sourceId => {
        if (sourceId.startsWith('track-') || sourceId.startsWith('gpx-')) {
          if (currentMap.getSource(sourceId)) {
            currentMap.removeSource(sourceId);
          }
        }
      });
    }

    // Add simplified path layers for all tracks
    tracks.forEach((track) => {
      if (!track.simplifiedPath || !track.simplifiedPath.coordinates || track.simplifiedPath.coordinates.length === 0) {
        return;
      }
      
      const sourceId = `track-${track.id}`;
      const layerId = `track-layer-${track.id}`;
      const isSelected = track.id === selectedTrack?.id;
      const hasGpxData = loadedGpxData.has(track.id);
      
      // Hide simplified path if track is selected and has GPX data
      const shouldHideSimplified = isSelected && hasGpxData;

      // Add source
      currentMap.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            id: track.id,
            name: track.name,
            distance: track.distance,
            difficulty: track.difficulty
          },
          geometry: track.simplifiedPath
        }
      });

      // Add layer
      currentMap.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          'visibility': shouldHideSimplified ? 'none' : 'visible'
        },
        paint: {
          'line-color': isSelected ? '#2563eb' : '#10b981',
          'line-width': isSelected ? 4 : 3,
          'line-opacity': isSelected ? 1 : 0.8
        }
      });

      // Add hover effects (only if visible)
      if (!shouldHideSimplified) {
        currentMap.on('mouseenter', layerId, () => {
          currentMap.getCanvas().style.cursor = 'pointer';
          if (!isSelected) {
            currentMap.setPaintProperty(layerId, 'line-width', 4);
            currentMap.setPaintProperty(layerId, 'line-opacity', 1);
          }
        });

        currentMap.on('mouseleave', layerId, () => {
          currentMap.getCanvas().style.cursor = '';
          if (!isSelected) {
            currentMap.setPaintProperty(layerId, 'line-width', 3);
            currentMap.setPaintProperty(layerId, 'line-opacity', 0.8);
          }
        });
      }

      // Add click handler (always available)
      currentMap.on('click', layerId, () => {
        actions.setSelectedTrack(track);
      });
    });

    // Add full GPX track for selected track if available
    if (selectedTrack && loadedGpxData.has(selectedTrack.id)) {
      const gpxData = loadedGpxData.get(selectedTrack.id);
      const gpxSourceId = `gpx-${selectedTrack.id}`;
      const gpxLayerId = `gpx-layer-${selectedTrack.id}`;

      console.log('Adding GPX layer for selected track:', selectedTrack.name, 'with', gpxData.coordinates.length, 'points');

      try {
        currentMap.addSource(gpxSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              id: selectedTrack.id,
              name: selectedTrack.name,
              type: 'full_gpx'
            },
            geometry: {
              type: 'LineString',
              coordinates: gpxData.coordinates
            }
          }
        });

        currentMap.addLayer({
          id: gpxLayerId,
          type: 'line',
          source: gpxSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ef4444', // Red color for full GPX track
            'line-width': 3,
            'line-opacity': 0.9
          }
        });

        console.log('✓ GPX layer added successfully for track:', selectedTrack.name);
      } catch (error) {
        console.error('Error adding GPX layer:', error);
      }
    } else if (selectedTrack) {
      console.log('No GPX data available for selected track:', selectedTrack.name);
    }
  }, [getMapInstance, tracks, selectedTrack, loadedGpxData, actions.setSelectedTrack]);

  // Animate to selected track
  const animateToTrack = useCallback((track) => {
    const currentMap = getMapInstance();
    if (!currentMap || !track) return;
    
    try {
      const bbox = track.boundingBox;
      if (bbox && bbox.coordinates && bbox.coordinates[0]) {
        // Extract coordinates from bounding box polygon
        const coords = bbox.coordinates[0];
        const lngs = coords.map(coord => coord[0]);
        const lats = coords.map(coord => coord[1]);
        
        const bounds = [
          [Math.min(...lngs), Math.min(...lats)], // Southwest
          [Math.max(...lngs), Math.max(...lats)]  // Northeast
        ];
        
        // Animate to fit the bounds with padding
        currentMap.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 1500,
          essential: true
        });
      } else if (track.centerPoint && track.centerPoint.coordinates) {
        // Fallback to center point if bounding box is not available
        const [lng, lat] = track.centerPoint.coordinates;
        currentMap.flyTo({
          center: [lng, lat],
          zoom: 14,
          duration: 1500,
          essential: true
        });
      }
    } catch (error) {
      console.warn('Error animating to track:', error);
      // Fallback: try to use center point
      if (track.centerPoint && track.centerPoint.coordinates) {
        try {
          const [lng, lat] = track.centerPoint.coordinates;
          currentMap.flyTo({
            center: [lng, lat],
            zoom: 14,
            duration: 1500,
            essential: true
          });
        } catch (fallbackError) {
          console.warn('Fallback animation also failed:', fallbackError);
        }
      }
    }
  }, [getMapInstance]);

  // Fit all tracks in view
  const fitAllTracks = useCallback(() => {
    const currentMap = getMapInstance();
    if (!currentMap || tracks.length === 0) return;
    
    const validTracks = tracks.filter(track => track.boundingBox && track.boundingBox.coordinates);
    if (validTracks.length === 0) return;
    
    try {
      // Calculate combined bounds for all tracks
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      
      validTracks.forEach(track => {
        const coords = track.boundingBox.coordinates[0];
        coords.forEach(coord => {
          const [lng, lat] = coord;
          minLng = Math.min(minLng, lng);
          minLat = Math.min(minLat, lat);
          maxLng = Math.max(maxLng, lng);
          maxLat = Math.max(maxLat, lat);
        });
      });
      
      const bounds = [[minLng, minLat], [maxLng, maxLat]];
      
      currentMap.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        duration: 1500,
        essential: true
      });
    } catch (error) {
      console.warn('Error fitting all tracks:', error);
    }
  }, [getMapInstance, tracks]);

  // Initialize map
  const initializeMap = useCallback((container, options = {}) => {
    if (!container) return null;

    const defaultOptions = {
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-80.4922, 43.4516],
      zoom: 13,
      projection: 'mercator'
    };

    const map = new mapboxgl.Map({
      container,
      ...defaultOptions,
      ...options
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add geolocation control
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      }),
      'top-right'
    );

    // Store map instance in ref
    setMapInstance(map);

    return map;
  }, [setMapInstance]);

  // Cleanup map
  const cleanupMap = useCallback(() => {
    const currentMap = getMapInstance();
    if (currentMap) {
      currentMap.remove();
      clearMapInstance();
    }
  }, [getMapInstance, clearMapInstance]);

  // Update map style
  const updateMapStyle = useCallback((style) => {
    const currentMap = getMapInstance();
    if (currentMap) {
      currentMap.setStyle(style);
    }
  }, [getMapInstance]);

  // Auto-update tracks when dependencies change
  useEffect(() => {
    updateMapTracks();
  }, [updateMapTracks, tracks, selectedTrack, loadedGpxData.size, selectedTrack?.id]);

  // Force update when GPX data is loaded for currently selected track
  useEffect(() => {
    if (selectedTrack && loadedGpxData.has(selectedTrack.id) && getMapInstance()) {
      console.log('GPX data detected for selected track, forcing map update:', selectedTrack.name);
      // Small delay to ensure React state has been updated
      setTimeout(() => {
        updateMapTracks();
      }, 50);
    }
  }, [loadedGpxData.size, selectedTrack?.id, getMapInstance, updateMapTracks]);

  // Auto-animate to selected track
  useEffect(() => {
    const currentMap = getMapInstance();
    if (!currentMap || !selectedTrack) return;
    
    try {
      const bbox = selectedTrack.boundingBox;
      if (bbox && bbox.coordinates && bbox.coordinates[0]) {
        // Extract coordinates from bounding box polygon
        const coords = bbox.coordinates[0];
        const lngs = coords.map(coord => coord[0]);
        const lats = coords.map(coord => coord[1]);
        
        const bounds = [
          [Math.min(...lngs), Math.min(...lats)], // Southwest
          [Math.max(...lngs), Math.max(...lats)]  // Northeast
        ];
        
        // Animate to fit the bounds with padding
        currentMap.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 1500,
          essential: true
        });
      } else if (selectedTrack.centerPoint && selectedTrack.centerPoint.coordinates) {
        // Fallback to center point if bounding box is not available
        const [lng, lat] = selectedTrack.centerPoint.coordinates;
        currentMap.flyTo({
          center: [lng, lat],
          zoom: 14,
          duration: 1500,
          essential: true
        });
      }
    } catch (error) {
      console.warn('Error animating to track:', error);
      // Fallback: try to use center point
      if (selectedTrack.centerPoint && selectedTrack.centerPoint.coordinates) {
        try {
          const [lng, lat] = selectedTrack.centerPoint.coordinates;
          currentMap.flyTo({
            center: [lng, lat],
            zoom: 14,
            duration: 1500,
            essential: true
          });
        } catch (fallbackError) {
          console.warn('Fallback animation also failed:', fallbackError);
        }
      }
    }
  }, [selectedTrack, getMapInstance]);

  return {
    // Core functions
    initializeMap,
    cleanupMap,
    updateMapTracks,
    updateMapStyle,
    
    // Animation functions
    animateToTrack,
    fitAllTracks,
    
    // State
    getMapInstance,
    
    // Helper functions
    isMapReady,
  };
}

export default useMapOperations;