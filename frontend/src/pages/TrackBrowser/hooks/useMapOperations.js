import { useCallback, useEffect, useRef, useMemo } from 'react';
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

  // Tracking current layers for efficient updates
  const currentLayersRef = useRef(new Set());
  const currentEventsRef = useRef(new Map());

  // Helper function to clean up a specific layer
  const cleanupLayer = useCallback((map, layerId) => {
    if (map.getLayer(layerId)) {
      // Remove event listeners if they exist
      const events = currentEventsRef.current.get(layerId);
      if (events) {
        events.forEach(({ event, handler }) => {
          map.off(event, layerId, handler);
        });
        currentEventsRef.current.delete(layerId);
      }
      
      map.removeLayer(layerId);
      currentLayersRef.current.delete(layerId);
    }
  }, []);

  // Helper function to clean up a specific source
  const cleanupSource = useCallback((map, sourceId) => {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  }, []);

  // Add or update simplified track layers
  const updateSimplifiedTracks = useCallback((map) => {
    const expectedLayers = new Set();
    
    tracks.forEach((track) => {
      if (!track.simplifiedPath || !track.simplifiedPath.coordinates || track.simplifiedPath.coordinates.length === 0) {
        return;
      }
      
      const sourceId = `track-${track.id}`;
      const layerId = `track-layer-${track.id}`;
      const isSelected = track.id === selectedTrack?.id;
      const hasGpxData = loadedGpxData.has(track.id);
      
      expectedLayers.add(layerId);
      
      // Check if layer already exists and needs update
      const layerExists = map.getLayer(layerId);
      const shouldHideSimplified = isSelected && hasGpxData;
      
      if (layerExists) {
        // Update existing layer properties
        map.setPaintProperty(layerId, 'line-color', isSelected ? '#2563eb' : '#10b981');
        map.setPaintProperty(layerId, 'line-width', isSelected ? 4 : 3);
        map.setPaintProperty(layerId, 'line-opacity', isSelected ? 1 : 0.8);
        map.setLayoutProperty(layerId, 'visibility', shouldHideSimplified ? 'none' : 'visible');
        
        // Update event listeners if visibility changed
        const events = currentEventsRef.current.get(layerId);
        if (shouldHideSimplified && events) {
          // Remove hover events for hidden layers
          events.forEach(({ event, handler }) => {
            if (event !== 'click') {
              map.off(event, layerId, handler);
            }
          });
          currentEventsRef.current.set(layerId, events.filter(e => e.event === 'click'));
        } else if (!shouldHideSimplified && (!events || events.length === 1)) {
          // Add hover events back for visible layers
          addTrackEventListeners(map, layerId, isSelected, track);
        }
      } else {
        // Add new layer
        try {
          map.addSource(sourceId, {
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

          map.addLayer({
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
          
          currentLayersRef.current.add(layerId);
          addTrackEventListeners(map, layerId, isSelected, track);
        } catch (error) {
          console.warn(`Failed to add track layer ${layerId}:`, error);
        }
      }
    });
    
    // Remove layers that are no longer needed
    const layersToRemove = [];
    currentLayersRef.current.forEach(layerId => {
      if (layerId.startsWith('track-layer-') && !expectedLayers.has(layerId)) {
        layersToRemove.push(layerId);
      }
    });
    
    layersToRemove.forEach(layerId => {
      const sourceId = layerId.replace('track-layer-', 'track-');
      cleanupLayer(map, layerId);
      cleanupSource(map, sourceId);
    });
  }, [tracks, selectedTrack, loadedGpxData, cleanupLayer, cleanupSource]);

  // Add event listeners for a track layer
  const addTrackEventListeners = useCallback((map, layerId, isSelected, track) => {
    const events = [];
    
    // Mouse enter handler
    const onMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
      if (!isSelected) {
        map.setPaintProperty(layerId, 'line-width', 4);
        map.setPaintProperty(layerId, 'line-opacity', 1);
      }
    };
    
    // Mouse leave handler
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      if (!isSelected) {
        map.setPaintProperty(layerId, 'line-width', 3);
        map.setPaintProperty(layerId, 'line-opacity', 0.8);
      }
    };
    
    // Click handler
    const onClick = () => {
      actions.setSelectedTrack(track);
    };
    
    // Add event listeners
    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('click', layerId, onClick);
    
    events.push(
      { event: 'mouseenter', handler: onMouseEnter },
      { event: 'mouseleave', handler: onMouseLeave },
      { event: 'click', handler: onClick }
    );
    
    currentEventsRef.current.set(layerId, events);
  }, [actions.setSelectedTrack]);

  // Add or update GPX track layer
  const updateGpxTrack = useCallback((map) => {
    const gpxLayerId = selectedTrack ? `gpx-layer-${selectedTrack.id}` : null;
    const gpxSourceId = selectedTrack ? `gpx-${selectedTrack.id}` : null;
    
    // Remove existing GPX layers that are not current
    const gpxLayersToRemove = [];
    currentLayersRef.current.forEach(layerId => {
      if (layerId.startsWith('gpx-layer-') && layerId !== gpxLayerId) {
        gpxLayersToRemove.push(layerId);
      }
    });
    
    gpxLayersToRemove.forEach(layerId => {
      const sourceId = layerId.replace('gpx-layer-', 'gpx-');
      cleanupLayer(map, layerId);
      cleanupSource(map, sourceId);
    });
    
    // Add new GPX layer if needed
    if (selectedTrack && loadedGpxData.has(selectedTrack.id) && !map.getLayer(gpxLayerId)) {
      const gpxData = loadedGpxData.get(selectedTrack.id);
      
      try {
        map.addSource(gpxSourceId, {
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

        map.addLayer({
          id: gpxLayerId,
          type: 'line',
          source: gpxSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ef4444',
            'line-width': 3,
            'line-opacity': 0.9
          }
        });
        
        currentLayersRef.current.add(gpxLayerId);
        console.log('✓ GPX layer added for track:', selectedTrack.name);
      } catch (error) {
        console.error('Error adding GPX layer:', error);
      }
    }
  }, [selectedTrack, loadedGpxData, cleanupLayer, cleanupSource]);

  // Optimized update function
  const updateMapTracks = useCallback(() => {
    const currentMap = getMapInstance();
    if (!currentMap || !currentMap.isStyleLoaded()) return;

    updateSimplifiedTracks(currentMap);
    updateGpxTrack(currentMap);
  }, [getMapInstance, updateSimplifiedTracks, updateGpxTrack]);

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

  // Memoized dependencies to prevent unnecessary re-renders
  const tracksHash = useMemo(() => {
    return tracks.map(t => `${t.id}-${t.name}`).join(',');
  }, [tracks]);
  
  const selectedTrackId = selectedTrack?.id;
  const hasSelectedTrackGpx = selectedTrack ? loadedGpxData.has(selectedTrack.id) : false;

  // Single effect to handle all map updates
  useEffect(() => {
    const currentMap = getMapInstance();
    if (!currentMap || !currentMap.isStyleLoaded()) return;
    
    // Debounce updates to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      updateMapTracks();
    }, 10);
    
    return () => clearTimeout(timeoutId);
  }, [updateMapTracks, tracksHash, selectedTrackId, hasSelectedTrackGpx, getMapInstance]);

  // Auto-animate to selected track
  useEffect(() => {
    const currentMap = getMapInstance();
    if (!currentMap || !selectedTrack) return;
    
    // Debounce animation to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
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
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [selectedTrackId, getMapInstance]);

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