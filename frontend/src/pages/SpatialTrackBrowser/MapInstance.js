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

// Bound change detection state
let currentBounds = null;
let boundChangeCallback = null;
let boundChangeTimeout = null;
let isLoadingBounds = false;
let isPendingLoad = false;
let hasNewBounds = false;
let pendingBounds = null;

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

// Utility function to compare bounds with tolerance
const boundsEqual = (bounds1, bounds2, tolerance = 0.0001) => {
  if (!bounds1 || !bounds2) return false;
  return Math.abs(bounds1.min_lat - bounds2.min_lat) < tolerance &&
         Math.abs(bounds1.max_lat - bounds2.max_lat) < tolerance &&
         Math.abs(bounds1.min_lng - bounds2.min_lng) < tolerance &&
         Math.abs(bounds1.max_lng - bounds2.max_lng) < tolerance;
};

// Handle bound changes - now only tracks changes without automatic loading
const handleBoundChange = () => {
  if (!mapInstance) return;

  const newBounds = getBounds();
  if (!newBounds) return;

  // Only proceed if bounds have actually changed
  if (boundsEqual(currentBounds, newBounds)) {
    hasNewBounds = false;
    pendingBounds = null;
    return;
  }

  // Clear existing timeout
  if (boundChangeTimeout) {
    clearTimeout(boundChangeTimeout);
  }

  // Set pending state immediately
  isPendingLoad = true;
  hasNewBounds = true;
  pendingBounds = newBounds;

  // Set timeout to clear pending state (no automatic loading)
  boundChangeTimeout = setTimeout(() => {
    isPendingLoad = false;
  }, 1000);
};

// Set up bound change listeners
const setupBoundChangeListeners = () => {
  if (!mapInstance) return;

  // Listen for map movement events
  mapInstance.on('moveend', handleBoundChange);
  mapInstance.on('zoomend', handleBoundChange);
};

export const initMap = (container, options = {}) => {
  // If map exists but container is different, destroy and recreate
  if (mapInstance && container) {
    const currentContainer = mapInstance.getContainer();
    if (currentContainer !== container) {
      console.log('MapInstance: Container changed, recreating map instance');
      destroyMap();
    }
  }
  
  if (!mapInstance && container) {
    console.log('MapInstance: Creating new map instance');
    const config = { ...DEFAULT_CONFIG, ...options, container };
    
    mapInstance = new mapboxgl.Map(config);

    // Add navigation controls
    mapInstance.addControl(new mapboxgl.NavigationControl());

    // Handle map load
    mapInstance.on('load', () => {
      mapReady = true;
      mapInstance.resize();

      // Set up bound change listeners
      setupBoundChangeListeners();

      // Initialize current bounds
      currentBounds = getBounds();

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

// Set callback for bound changes
export const onBoundChange = (callback) => {
  boundChangeCallback = callback;
};

// Remove bound change callback
export const offBoundChange = () => {
  boundChangeCallback = null;
  if (boundChangeTimeout) {
    clearTimeout(boundChangeTimeout);
    boundChangeTimeout = null;
  }
  isPendingLoad = false;
  hasNewBounds = false;
  pendingBounds = null;
};

// Check if bounds are currently loading
export const isBoundsLoading = () => {
  return isLoadingBounds;
};

// Check if bounds load is pending
export const isBoundsPending = () => {
  return isPendingLoad;
};

// Check if there are new bounds available to search
export const hasNewBoundsToSearch = () => {
  return hasNewBounds;
};

// Get the pending bounds that can be searched
export const getPendingBounds = () => {
  return pendingBounds;
};

// Manual trigger to load routes for current or pending bounds
export const triggerBoundsSearch = () => {
  if (!boundChangeCallback) {
    console.warn('No bound change callback set');
    return Promise.resolve();
  }

  let boundsToSearch;
  
  if (hasNewBounds && pendingBounds) {
    // Use pending bounds if available
    boundsToSearch = pendingBounds;
    currentBounds = pendingBounds;
    hasNewBounds = false;
    pendingBounds = null;
  } else {
    // Use current bounds
    boundsToSearch = getBounds();
    if (!boundsToSearch) {
      console.warn('No bounds available for search');
      return Promise.resolve();
    }
    currentBounds = boundsToSearch;
  }

  // Set loading state
  isLoadingBounds = true;
  
  // Call the callback and handle the promise
  return Promise.resolve(boundChangeCallback(boundsToSearch))
    .finally(() => {
      isLoadingBounds = false;
    });
};

// Get current bounds (cached)
export const getCurrentBounds = () => {
  return currentBounds;
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

// Hide a specific simplified path
export const hideSimplifiedPath = (routeId) => {
  if (!mapInstance) {
    console.warn('No map instance available for hiding path');
    return;
  }
  
  simplifiedPathManager.hidePath(routeId, mapInstance);
};

// Show a specific simplified path
export const showSimplifiedPath = (routeId) => {
  if (!mapInstance) {
    console.warn('No map instance available for showing path');
    return;
  }
  
  simplifiedPathManager.showPath(routeId, mapInstance);
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
    
    // Clean up bound change state
    offBoundChange();
    currentBounds = null;
    isLoadingBounds = false;
    isPendingLoad = false;
    hasNewBounds = false;
    pendingBounds = null;
    
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
  onBoundChange,
  offBoundChange,
  isBoundsLoading,
  isBoundsPending,
  hasNewBoundsToSearch,
  getPendingBounds,
  triggerBoundsSearch,
  getCurrentBounds,
  updateRouteMarkers,
  clearMarkers,
  getMarkers,
  getMarkerCount,
  updateSimplifiedPaths,
  clearPaths,
  getPathCount,
  arePathsVisible,
  setPathZoomThreshold,
  hideSimplifiedPath,
  showSimplifiedPath,
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