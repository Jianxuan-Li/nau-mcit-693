import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import markerManager from './mapHandlers/MarkerManager';
import simplifiedPathManager from './mapHandlers/SimplifiedPathManager';
import gpxPathManager from './mapHandlers/GPXPathManager';
import { animateToRoute, animateToFitAllRoutes, animateToZoom, getOptimalZoomForRoute } from './utils/mapAnimationUtils';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

let mapInstance = null;
let mapReady = false;
let loadCallbacks = [];

// Default map configuration
const DEFAULT_CONFIG = {
  style: 'mapbox://styles/mapbox/outdoors-v12',
  center: [-106.3, 56.1], // Center of Canada
  zoom: 3,
  pitchWithRotate: false,
  dragRotate: false,
  projection: 'mercator', // Use flat mercator projection instead of globe
  renderWorldCopies: false // Prevent world copies in flat projection
};

export const initMap = (container, options = {}) => {
  if (!mapInstance && container) {
    const config = { ...DEFAULT_CONFIG, ...options, container };
    
    mapInstance = new mapboxgl.Map(config);

    // Add navigation controls
    mapInstance.addControl(new mapboxgl.NavigationControl());

    // Handle map load
    mapInstance.on('load', () => {
      mapReady = true;
      mapInstance.resize();

      // Execute all pending load callbacks
      loadCallbacks.forEach(callback => callback(mapInstance));
      loadCallbacks = [];
    });

    // Handle zoom changes for path visibility
    mapInstance.on('zoom', () => {
      simplifiedPathManager.updateVisibility(mapInstance);
    });

    // Handle map errors
    mapInstance.on('error', (e) => {
      console.error('MapInstance: Spatial map error:', e);
    });

    // Handle resize
    window.addEventListener('resize', handleResize);
  }
  
  return mapInstance;
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

export const getBounds = () => {
  if (mapInstance) {
    const bounds = mapInstance.getBounds();
    return {
      min_lat: bounds.getSouth(),
      max_lat: bounds.getNorth(),
      min_lng: bounds.getWest(),
      max_lng: bounds.getEast()
    };
  }
  return null;
};

// Add or update markers for routes using MarkerManager
// markerData should be an array of { routeId, centerPoint, displayNumber, routeName }
export const updateRouteMarkers = (markerData) => {
  if (!mapInstance) {
    console.warn('No map instance available for updating markers');
    return;
  }
  
  markerManager.updateRouteMarkers(markerData, mapInstance);
};

// Clear all markers using MarkerManager
export const clearMarkers = () => {
  markerManager.clearAllMarkers();
};

// Get current markers using MarkerManager
export const getMarkers = () => {
  return markerManager.getAllMarkers();
};

// Get marker count
export const getMarkerCount = () => {
  return markerManager.getMarkerCount();
};

// Add or update simplified paths using SimplifiedPathManager
// pathData should be an array of { routeId, coordinates, routeName }
export const updateSimplifiedPaths = (pathData) => {
  if (!mapInstance) {
    console.warn('No map instance available for updating paths');
    return;
  }
  
  simplifiedPathManager.updateSimplifiedPaths(pathData, mapInstance);
};

// Clear all simplified paths
export const clearPaths = () => {
  if (mapInstance) {
    simplifiedPathManager.clearAllPaths(mapInstance);
  }
};

// Get simplified path count
export const getPathCount = () => {
  return simplifiedPathManager.getPathCount();
};

// Check if paths are currently visible
export const arePathsVisible = () => {
  return simplifiedPathManager.arePathsVisible();
};

// Set zoom threshold for path visibility
export const setPathZoomThreshold = (threshold) => {
  simplifiedPathManager.setZoomThreshold(threshold);
};

// Load and show GPX for a selected route
export const loadAndShowGPX = async (routeId, routeName = null) => {
  if (!mapInstance) {
    console.warn('No map instance available for loading GPX');
    return null;
  }
  
  try {
    return await gpxPathManager.loadAndShowGPX(routeId, routeName, mapInstance);
  } catch (error) {
    console.error('Failed to load and show GPX:', error);
    throw error;
  }
};

// Clear current GPX path
export const clearGPXPath = () => {
  if (mapInstance) {
    gpxPathManager.clearCurrentGPXPath(mapInstance);
  }
};

// Get GPX data for a route
export const getGPXData = (routeId) => {
  return gpxPathManager.getGPXData(routeId);
};

// Check if GPX is loaded
export const isGPXLoaded = (routeId) => {
  return gpxPathManager.isGPXLoaded(routeId);
};

// Check if GPX is loading
export const isGPXLoading = (routeId) => {
  return gpxPathManager.isGPXLoading(routeId);
};

// Get GPX error
export const getGPXError = (routeId) => {
  return gpxPathManager.getGPXError(routeId);
};

// Clear GPX error
export const clearGPXError = (routeId) => {
  gpxPathManager.clearGPXError(routeId);
};

// Get GPX loading statistics
export const getGPXLoadingStats = () => {
  return gpxPathManager.getLoadingStats();
};

// Get currently selected route ID
export const getSelectedRouteId = () => {
  return gpxPathManager.getSelectedRouteId();
};

// Animate map view to a specific route
export const animateMapToRoute = (route, options = {}) => {
  if (!mapInstance) {
    console.warn('No map instance available for animation');
    return;
  }
  
  animateToRoute(mapInstance, route, options);
};

// Animate map view to fit all routes
export const animateMapToFitAllRoutes = (routes, options = {}) => {
  if (!mapInstance) {
    console.warn('No map instance available for fit all animation');
    return;
  }
  
  animateToFitAllRoutes(mapInstance, routes, options);
};

// Animate map to specific zoom level
export const animateMapToZoom = (zoomLevel, options = {}) => {
  if (!mapInstance) {
    console.warn('No map instance available for zoom animation');
    return;
  }
  
  animateToZoom(mapInstance, zoomLevel, options);
};

// Get optimal zoom level for a route
export const getRouteOptimalZoom = (route) => {
  if (!mapInstance) return 10;
  
  const container = mapInstance.getContainer();
  return getOptimalZoomForRoute(route, container);
};

const handleResize = () => {
  resize();
};

export const destroyMap = () => {
  if (mapInstance) {
    clearMarkers();
    clearPaths();
    gpxPathManager.clearAllGPXData(mapInstance);
    window.removeEventListener('resize', handleResize);
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
  getBounds,
  updateRouteMarkers,
  clearMarkers,
  getMarkers,
  getMarkerCount,
  updateSimplifiedPaths,
  clearPaths,
  getPathCount,
  arePathsVisible,
  setPathZoomThreshold,
  loadAndShowGPX,
  clearGPXPath,
  getGPXData,
  isGPXLoaded,
  isGPXLoading,
  getGPXError,
  clearGPXError,
  getGPXLoadingStats,
  getSelectedRouteId,
  animateMapToRoute,
  animateMapToFitAllRoutes,
  animateMapToZoom,
  getRouteOptimalZoom,
  destroyMap
};