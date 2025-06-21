/**
 * Map Animation Utilities
 * Provides functions for animating map view to routes and managing camera transitions
 */

// Default animation options
const DEFAULT_ANIMATION_OPTIONS = {
  duration: 1500,
  padding: { top: 50, bottom: 50, left: 50, right: 50 },
  maxZoom: 16,
  minZoom: 3,
  essential: true
};

/**
 * Parse bounding box from GeoJSON string
 * @param {string} boundingBoxString - GeoJSON string representation of bounding box
 * @returns {Array|null} - Mapbox bounds array [[minLng, minLat], [maxLng, maxLat]]
 */
export const parseBoundingBox = (boundingBoxString) => {
  try {
    if (!boundingBoxString) return null;
    
    const geoJson = JSON.parse(boundingBoxString);
    
    if (geoJson.type === 'Polygon' && geoJson.coordinates && geoJson.coordinates[0]) {
      const coords = geoJson.coordinates[0];
      
      // Extract longitude and latitude values
      const lngs = coords.map(coord => coord[0]);
      const lats = coords.map(coord => coord[1]);
      
      const bounds = [
        [Math.min(...lngs), Math.min(...lats)], // Southwest
        [Math.max(...lngs), Math.max(...lats)]  // Northeast
      ];
      
      return bounds;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse bounding box GeoJSON:', error);
    return null;
  }
};

/**
 * Calculate bounding box from coordinates array
 * @param {Array} coordinates - Array of [lng, lat] coordinate pairs
 * @returns {Array|null} - Mapbox bounds array [[minLng, minLat], [maxLng, maxLat]]
 */
export const calculateBoundsFromCoordinates = (coordinates) => {
  if (!coordinates || coordinates.length === 0) return null;
  
  try {
    let minLng = Infinity, minLat = Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;
    
    coordinates.forEach(coord => {
      if (coord && coord.length >= 2) {
        const [lng, lat] = coord;
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      }
    });
    
    // Validate bounds
    if (!isFinite(minLng) || !isFinite(minLat) || !isFinite(maxLng) || !isFinite(maxLat)) {
      return null;
    }
    
    return [[minLng, minLat], [maxLng, maxLat]];
  } catch (error) {
    console.warn('Failed to calculate bounds from coordinates:', error);
    return null;
  }
};

/**
 * Animate map view to fit a route's bounding box
 * @param {Object} mapInstance - Mapbox GL map instance
 * @param {Object} route - Route object with bounding_box or center_point
 * @param {Object} options - Animation options (optional)
 */
export const animateToRoute = (mapInstance, route, options = {}) => {
  if (!mapInstance || !route) {
    console.warn('Invalid map instance or route for animation');
    return;
  }
  
  const animationOptions = { ...DEFAULT_ANIMATION_OPTIONS, ...options };
  
  try {
    // Try to use bounding box first
    let bounds = null;
    
    if (route.bounding_box) {
      bounds = parseBoundingBox(route.bounding_box);
    }
    
    // If no bounding box, try to use simplified path
    if (!bounds && route.simplified_path) {
      const simplifiedPath = JSON.parse(route.simplified_path);
      if (simplifiedPath.type === 'LineString' && simplifiedPath.coordinates) {
        bounds = calculateBoundsFromCoordinates(simplifiedPath.coordinates);
      }
    }
    
    if (bounds) {
      console.log('Animating to route bounds:', bounds);
      mapInstance.fitBounds(bounds, {
        padding: animationOptions.padding,
        duration: animationOptions.duration,
        maxZoom: animationOptions.maxZoom,
        essential: animationOptions.essential
      });
    } else {
      // Fallback to center point
      animateToRouteCenter(mapInstance, route, options);
    }
  } catch (error) {
    console.warn('Error animating to route bounds, falling back to center:', error);
    animateToRouteCenter(mapInstance, route, options);
  }
};

/**
 * Animate map view to route center point
 * @param {Object} mapInstance - Mapbox GL map instance
 * @param {Object} route - Route object with center_point
 * @param {Object} options - Animation options (optional)
 */
export const animateToRouteCenter = (mapInstance, route, options = {}) => {
  if (!mapInstance || !route) {
    console.warn('Invalid map instance or route for center animation');
    return;
  }
  
  const animationOptions = { ...DEFAULT_ANIMATION_OPTIONS, ...options };
  
  try {
    if (route.center_point) {
      const centerPoint = JSON.parse(route.center_point);
      
      if (centerPoint.type === 'Point' && centerPoint.coordinates && centerPoint.coordinates.length >= 2) {
        const [lng, lat] = centerPoint.coordinates;
        
        console.log('Animating to route center:', [lng, lat]);
        mapInstance.flyTo({
          center: [lng, lat],
          zoom: Math.min(14, animationOptions.maxZoom), // Default zoom for center point
          duration: animationOptions.duration,
          essential: animationOptions.essential
        });
      } else {
        console.warn('Invalid center point format for route:', route.id);
      }
    } else {
      console.warn('No center point available for route:', route.id);
    }
  } catch (error) {
    console.error('Error parsing route center point:', error);
  }
};

/**
 * Animate map view to fit multiple routes
 * @param {Object} mapInstance - Mapbox GL map instance
 * @param {Array} routes - Array of route objects
 * @param {Object} options - Animation options (optional)
 */
export const animateToFitAllRoutes = (mapInstance, routes, options = {}) => {
  if (!mapInstance || !routes || routes.length === 0) {
    console.warn('Invalid map instance or routes for fit all animation');
    return;
  }
  
  const animationOptions = { ...DEFAULT_ANIMATION_OPTIONS, ...options };
  
  try {
    let overallMinLng = Infinity, overallMinLat = Infinity;
    let overallMaxLng = -Infinity, overallMaxLat = -Infinity;
    let foundBounds = false;
    
    routes.forEach(route => {
      let bounds = null;
      
      // Try bounding box first
      if (route.bounding_box) {
        bounds = parseBoundingBox(route.bounding_box);
      }
      
      // Try simplified path
      if (!bounds && route.simplified_path) {
        try {
          const simplifiedPath = JSON.parse(route.simplified_path);
          if (simplifiedPath.type === 'LineString' && simplifiedPath.coordinates) {
            bounds = calculateBoundsFromCoordinates(simplifiedPath.coordinates);
          }
        } catch (e) {
          // Skip this route
        }
      }
      
      if (bounds) {
        foundBounds = true;
        const [[minLng, minLat], [maxLng, maxLat]] = bounds;
        overallMinLng = Math.min(overallMinLng, minLng);
        overallMinLat = Math.min(overallMinLat, minLat);
        overallMaxLng = Math.max(overallMaxLng, maxLng);
        overallMaxLat = Math.max(overallMaxLat, maxLat);
      }
    });
    
    if (foundBounds && isFinite(overallMinLng) && isFinite(overallMinLat) && 
        isFinite(overallMaxLng) && isFinite(overallMaxLat)) {
      const combinedBounds = [[overallMinLng, overallMinLat], [overallMaxLng, overallMaxLat]];
      
      console.log('Animating to fit all routes:', combinedBounds);
      mapInstance.fitBounds(combinedBounds, {
        padding: animationOptions.padding,
        duration: animationOptions.duration,
        maxZoom: animationOptions.maxZoom,
        essential: animationOptions.essential
      });
    } else {
      console.warn('Could not calculate combined bounds for routes');
    }
  } catch (error) {
    console.error('Error animating to fit all routes:', error);
  }
};

/**
 * Smooth zoom to a specific level
 * @param {Object} mapInstance - Mapbox GL map instance
 * @param {number} zoomLevel - Target zoom level
 * @param {Object} options - Animation options (optional)
 */
export const animateToZoom = (mapInstance, zoomLevel, options = {}) => {
  if (!mapInstance || typeof zoomLevel !== 'number') {
    console.warn('Invalid map instance or zoom level for zoom animation');
    return;
  }
  
  const animationOptions = { ...DEFAULT_ANIMATION_OPTIONS, ...options };
  
  try {
    console.log('Animating to zoom level:', zoomLevel);
    mapInstance.flyTo({
      zoom: Math.max(animationOptions.minZoom, Math.min(zoomLevel, animationOptions.maxZoom)),
      duration: animationOptions.duration,
      essential: animationOptions.essential
    });
  } catch (error) {
    console.error('Error animating zoom:', error);
  }
};

/**
 * Get optimal zoom level for a route based on its bounding box
 * @param {Object} route - Route object
 * @param {Object} mapContainer - Map container element for size calculation
 * @returns {number} - Optimal zoom level
 */
export const getOptimalZoomForRoute = (route, mapContainer) => {
  if (!route || !mapContainer) return 10; // Default zoom
  
  try {
    let bounds = null;
    
    if (route.bounding_box) {
      bounds = parseBoundingBox(route.bounding_box);
    }
    
    if (!bounds && route.simplified_path) {
      const simplifiedPath = JSON.parse(route.simplified_path);
      if (simplifiedPath.type === 'LineString' && simplifiedPath.coordinates) {
        bounds = calculateBoundsFromCoordinates(simplifiedPath.coordinates);
      }
    }
    
    if (bounds) {
      const [[minLng, minLat], [maxLng, maxLat]] = bounds;
      const lngDiff = maxLng - minLng;
      const latDiff = maxLat - minLat;
      
      // Simple heuristic for zoom level based on bounding box size
      const maxDiff = Math.max(lngDiff, latDiff);
      
      if (maxDiff > 1) return 8;        // Very large area
      if (maxDiff > 0.1) return 10;     // Large area
      if (maxDiff > 0.01) return 12;    // Medium area
      if (maxDiff > 0.001) return 14;   // Small area
      return 16;                        // Very small area
    }
    
    return 12; // Default for center point
  } catch (error) {
    console.warn('Error calculating optimal zoom:', error);
    return 10;
  }
};