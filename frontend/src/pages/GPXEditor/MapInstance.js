import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

let mapInstance = null;
let mapReady = false;
let loadCallbacks = [];

// GPX Editor specific state
let currentGPXData = null;
let gpxSourceId = 'gpx-source';
let gpxLayerId = 'gpx-layer';
let gpxMarkersLayerId = 'gpx-markers-layer';

// Default map configuration
const DEFAULT_CONFIG = {
  style: 'mapbox://styles/mapbox/outdoors-v12',
  center: [-106.3, 56.1], // Center of Canada
  zoom: 3,
  pitchWithRotate: false,
  dragRotate: false,
  projection: 'mercator',
  renderWorldCopies: false
};

export const initMap = (container, options = {}) => {
  // If map exists but container is different, destroy and recreate
  if (mapInstance && container) {
    const currentContainer = mapInstance.getContainer();
    if (currentContainer !== container) {
      console.log('GPXEditor MapInstance: Container changed, recreating map instance');
      destroyMap();
    }
  }
  
  if (!mapInstance && container) {
    console.log('GPXEditor MapInstance: Creating new map instance');
    const config = { ...DEFAULT_CONFIG, ...options, container };
    
    mapInstance = new mapboxgl.Map(config);

    // Add navigation controls
    mapInstance.addControl(new mapboxgl.NavigationControl());

    // Handle map load
    mapInstance.on('load', () => {
      mapReady = true;
      mapInstance.resize();

      // Initialize GPX layers
      initializeGPXLayers();

      // Execute all pending load callbacks
      loadCallbacks.forEach(callback => callback(mapInstance));
      loadCallbacks = [];
    });

    // Handle map errors
    mapInstance.on('error', (e) => {
      console.error('GPXEditor MapInstance: Map error:', e);
    });

    // Handle resize
    window.addEventListener('resize', handleResize);
  }
  
  return mapInstance;
};

// Initialize GPX-specific layers
const initializeGPXLayers = () => {
  if (!mapInstance || !mapReady) return;

  // Add GPX source
  if (!mapInstance.getSource(gpxSourceId)) {
    mapInstance.addSource(gpxSourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });
  }

  // Add GPX line layer
  if (!mapInstance.getLayer(gpxLayerId)) {
    mapInstance.addLayer({
      id: gpxLayerId,
      type: 'line',
      source: gpxSourceId,
      filter: ['==', '$type', 'LineString'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
  }

  // Add GPX markers layer
  if (!mapInstance.getLayer(gpxMarkersLayerId)) {
    mapInstance.addLayer({
      id: gpxMarkersLayerId,
      type: 'circle',
      source: gpxSourceId,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 6,
        'circle-color': '#ef4444',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
  }
};

// Convert GPX data to GeoJSON
const gpxToGeoJSON = (gpxData) => {
  const features = [];

  if (gpxData.tracks && gpxData.tracks.length > 0) {
    gpxData.tracks.forEach((track, trackIndex) => {
      if (track.segments && track.segments.length > 0) {
        track.segments.forEach((segment, segmentIndex) => {
          if (segment.points && segment.points.length > 0) {
            // Create line feature for the segment
            const coordinates = segment.points.map(point => [point.lon, point.lat]);
            
            features.push({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: coordinates
              },
              properties: {
                trackIndex,
                segmentIndex,
                trackName: track.name || `Track ${trackIndex + 1}`,
                segmentName: `Segment ${segmentIndex + 1}`,
                pointCount: segment.points.length
              }
            });

            // Add start and end point markers
            if (coordinates.length > 0) {
              // Start point
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: coordinates[0]
                },
                properties: {
                  type: 'start',
                  trackIndex,
                  segmentIndex,
                  label: 'Start'
                }
              });

              // End point
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: coordinates[coordinates.length - 1]
                },
                properties: {
                  type: 'end',
                  trackIndex,
                  segmentIndex,
                  label: 'End'
                }
              });
            }
          }
        });
      }
    });
  }

  return {
    type: 'FeatureCollection',
    features: features
  };
};

// Get bounds from GPX data
export const getGPXBounds = (gpxData) => {
  if (!gpxData || !gpxData.tracks || gpxData.tracks.length === 0) {
    return null;
  }

  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;

  gpxData.tracks.forEach(track => {
    if (track.segments) {
      track.segments.forEach(segment => {
        if (segment.points) {
          segment.points.forEach(point => {
            minLat = Math.min(minLat, point.lat);
            maxLat = Math.max(maxLat, point.lat);
            minLon = Math.min(minLon, point.lon);
            maxLon = Math.max(maxLon, point.lon);
          });
        }
      });
    }
  });

  if (minLat === Infinity) return null;

  return {
    southwest: [minLon, minLat],
    northeast: [maxLon, maxLat]
  };
};

// Load GPX data to map
export const loadGPXToMap = async (gpxData) => {
  if (!mapInstance || !mapReady) {
    throw new Error('Map not ready');
  }

  currentGPXData = gpxData;
  const geoJSON = gpxToGeoJSON(gpxData);
  
  // Update the source with new data
  const source = mapInstance.getSource(gpxSourceId);
  if (source) {
    source.setData(geoJSON);
  }

  return geoJSON;
};

// Clear GPX from map
export const clearGPXFromMap = () => {
  if (!mapInstance || !mapReady) return;

  currentGPXData = null;
  
  // Clear the source data
  const source = mapInstance.getSource(gpxSourceId);
  if (source) {
    source.setData({
      type: 'FeatureCollection',
      features: []
    });
  }
};

// Animate map to fit GPX bounds
export const animateToGPX = (bounds, options = {}) => {
  if (!mapInstance || !bounds) return;

  const defaultOptions = {
    padding: { top: 50, bottom: 50, left: 50, right: 50 },
    duration: 1500
  };

  mapInstance.fitBounds([bounds.southwest, bounds.northeast], {
    ...defaultOptions,
    ...options
  });
};

// Update GPX visualization based on timeline selection
export const updateGPXVisualization = (timelineSelection, selectedSegments = []) => {
  if (!mapInstance || !mapReady || !currentGPXData) return;

  // TODO: Implement visualization updates based on timeline selection and segment selection
  console.log('Updating GPX visualization:', { timelineSelection, selectedSegments });
};

export const getInstance = () => {
  return mapInstance;
};

export const isReady = () => {
  return mapReady;
};

export const onLoad = (callback) => {
  if (mapReady && mapInstance) {
    callback(mapInstance);
  } else {
    loadCallbacks.push(callback);
  }
};

export const updateStyle = (style) => {
  if (mapInstance && mapReady) {
    mapInstance.setStyle(style);
  }
};

export const resize = () => {
  if (mapInstance) {
    setTimeout(() => {
      mapInstance.resize();
    }, 100);
  }
};

const handleResize = () => {
  resize();
};

export const destroyMap = () => {
  if (mapInstance) {
    window.removeEventListener('resize', handleResize);
    
    // Clean up GPX data
    currentGPXData = null;
    
    mapInstance.remove();
    mapInstance = null;
    mapReady = false;
    loadCallbacks = [];
  }
};

export default {
  initMap,
  getInstance,
  isReady,
  onLoad,
  updateStyle,
  resize,
  loadGPXToMap,
  clearGPXFromMap,
  getGPXBounds,
  animateToGPX,
  updateGPXVisualization,
  destroyMap
};