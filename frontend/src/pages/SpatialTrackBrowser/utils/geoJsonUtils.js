// Parse center_point from GeoJSON string to lat/lng object
export const parseCenterPoint = (centerPointString) => {
  try {
    if (!centerPointString) return null;
    
    const geoJson = JSON.parse(centerPointString);
    
    if (geoJson.type === 'Point' && geoJson.coordinates && geoJson.coordinates.length >= 2) {
      const [lng, lat] = geoJson.coordinates;
      return { lat, lng };
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse center_point GeoJSON:', error);
    return null;
  }
};

// Parse simplified_path from GeoJSON string to coordinates array
export const parseSimplifiedPath = (simplifiedPathString) => {
  try {
    if (!simplifiedPathString) return null;
    
    const geoJson = JSON.parse(simplifiedPathString);
    
    if (geoJson.type === 'LineString' && geoJson.coordinates && geoJson.coordinates.length >= 2) {
      // Return coordinates as-is (already in [lng, lat] format)
      return geoJson.coordinates;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse simplified_path GeoJSON:', error);
    return null;
  }
};

// Convert routes from API response to marker data format
export const convertRoutesToMarkerData = (routes) => {
  return routes
    .map((route, index) => {
      const centerPoint = parseCenterPoint(route.center_point);
      
      if (!centerPoint) {
        console.warn(`Route ${route.id} has invalid center_point, skipping marker`);
        return null;
      }
      
      return {
        routeId: route.id,
        centerPoint: centerPoint,
        displayNumber: index + 1,
        routeName: route.name
      };
    })
    .filter(Boolean); // Remove null entries
};

// Convert routes from API response to simplified path data format
export const convertRoutesToPathData = (routes) => {
  return routes
    .map((route) => {
      const coordinates = parseSimplifiedPath(route.simplified_path);
      
      if (!coordinates) {
        console.warn(`Route ${route.id} has invalid simplified_path, skipping path`);
        return null;
      }
      
      return {
        routeId: route.id,
        coordinates: coordinates,
        routeName: route.name
      };
    })
    .filter(Boolean); // Remove null entries
};