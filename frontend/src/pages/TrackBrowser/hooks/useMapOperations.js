import { useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { useTrackBrowser } from '../context/TrackBrowserContext';

export function useMapOperations() {
  const {
    mapInstance,
    tracks,
    selectedTrack,
    loadedGpxData,
    actions
  } = useTrackBrowser();

  // Update map tracks layers
  const updateMapTracks = useCallback(() => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;

    // Clear all existing track layers and sources
    const style = mapInstance.getStyle();
    if (style && style.layers) {
      const trackLayers = style.layers.filter(layer => 
        layer.id.startsWith('track-layer-') || layer.id.startsWith('gpx-layer-')
      );
      trackLayers.forEach(layer => {
        if (mapInstance.getLayer(layer.id)) {
          mapInstance.removeLayer(layer.id);
        }
      });
    }
    
    if (style && style.sources) {
      Object.keys(style.sources).forEach(sourceId => {
        if (sourceId.startsWith('track-') || sourceId.startsWith('gpx-')) {
          if (mapInstance.getSource(sourceId)) {
            mapInstance.removeSource(sourceId);
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

      // Add source
      mapInstance.addSource(sourceId, {
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
      mapInstance.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': isSelected ? '#2563eb' : '#10b981',
          'line-width': hasGpxData && isSelected ? 2 : (isSelected ? 5 : 3),
          'line-opacity': hasGpxData && isSelected ? 0.6 : (isSelected ? 1 : 0.8)
        }
      });

      // Add hover effects
      mapInstance.on('mouseenter', layerId, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (!isSelected) {
          mapInstance.setPaintProperty(layerId, 'line-width', 4);
          mapInstance.setPaintProperty(layerId, 'line-opacity', 1);
        }
      });

      mapInstance.on('mouseleave', layerId, () => {
        mapInstance.getCanvas().style.cursor = '';
        if (!isSelected) {
          mapInstance.setPaintProperty(layerId, 'line-width', 3);
          mapInstance.setPaintProperty(layerId, 'line-opacity', 0.8);
        }
      });

      // Add click handler
      mapInstance.on('click', layerId, () => {
        actions.setSelectedTrack(track);
      });
    });

    // Add full GPX track for selected track if available
    if (selectedTrack && loadedGpxData.has(selectedTrack.id)) {
      const gpxData = loadedGpxData.get(selectedTrack.id);
      const gpxSourceId = `gpx-${selectedTrack.id}`;
      const gpxLayerId = `gpx-layer-${selectedTrack.id}`;

      mapInstance.addSource(gpxSourceId, {
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

      mapInstance.addLayer({
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
    }
  }, [mapInstance, tracks, selectedTrack, loadedGpxData, actions.setSelectedTrack]);

  // Animate to selected track
  const animateToTrack = useCallback((track) => {
    if (!mapInstance || !track) return;
    
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
        mapInstance.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 1500,
          essential: true
        });
      } else if (track.centerPoint && track.centerPoint.coordinates) {
        // Fallback to center point if bounding box is not available
        const [lng, lat] = track.centerPoint.coordinates;
        mapInstance.flyTo({
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
          mapInstance.flyTo({
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
  }, [mapInstance]);

  // Fit all tracks in view
  const fitAllTracks = useCallback(() => {
    if (!mapInstance || tracks.length === 0) return;
    
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
      
      mapInstance.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        duration: 1500,
        essential: true
      });
    } catch (error) {
      console.warn('Error fitting all tracks:', error);
    }
  }, [mapInstance, tracks]);

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

    // Store map instance in context
    actions.setMapInstance(map);

    return map;
  }, [actions.setMapInstance]);

  // Cleanup map
  const cleanupMap = useCallback(() => {
    if (mapInstance) {
      mapInstance.remove();
      actions.setMapInstance(null);
    }
  }, [mapInstance, actions.setMapInstance]);

  // Update map style
  const updateMapStyle = useCallback((style) => {
    if (mapInstance) {
      mapInstance.setStyle(style);
    }
  }, [mapInstance]);

  // Auto-update tracks when dependencies change
  useEffect(() => {
    updateMapTracks();
  }, [mapInstance, tracks, selectedTrack, loadedGpxData]);

  // Auto-animate to selected track
  useEffect(() => {
    if (!mapInstance || !selectedTrack) return;
    
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
        mapInstance.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 1500,
          essential: true
        });
      } else if (selectedTrack.centerPoint && selectedTrack.centerPoint.coordinates) {
        // Fallback to center point if bounding box is not available
        const [lng, lat] = selectedTrack.centerPoint.coordinates;
        mapInstance.flyTo({
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
          mapInstance.flyTo({
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
  }, [selectedTrack, mapInstance]);

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
    mapInstance,
    
    // Helper functions
    isMapReady: mapInstance && mapInstance.isStyleLoaded(),
  };
}

export default useMapOperations;