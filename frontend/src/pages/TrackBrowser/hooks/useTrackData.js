import { useEffect, useCallback } from 'react';
import { publicRoutesApi } from '../../../utils/request';
import { useTrackBrowser } from '../context/TrackBrowserContext';

export function useTrackData() {
  const {
    tracks,
    searchTerm,
    difficultyFilter,
    currentPage,
    totalPages,
    limit,
    loading,
    error,
    actions
  } = useTrackBrowser();

  // Parse route data from API response
  const parseRouteData = useCallback((routes) => {
    return routes.map(route => {
      let simplifiedPath = null;
      let centerPoint = null;
      let boundingBox = null;
      
      // Parse GeoJSON strings
      if (route.simplified_path) {
        try {
          simplifiedPath = JSON.parse(route.simplified_path);
        } catch (e) {
          console.warn('Failed to parse simplified_path for route:', route.id);
        }
      }
      
      if (route.center_point) {
        try {
          centerPoint = JSON.parse(route.center_point);
        } catch (e) {
          console.warn('Failed to parse center_point for route:', route.id);
        }
      }
      
      if (route.bounding_box) {
        try {
          boundingBox = JSON.parse(route.bounding_box);
        } catch (e) {
          console.warn('Failed to parse bounding_box for route:', route.id);
        }
      }
      
      return {
        id: route.id,
        name: route.name,
        distance: route.route_length_km 
          ? `${route.route_length_km.toFixed(2)} km` 
          : (route.total_distance ? `${route.total_distance} km` : 'N/A'),
        elevation: route.max_elevation_gain !== null && route.max_elevation_gain !== undefined 
          ? `${route.max_elevation_gain}m` 
          : '0m',
        difficulty: route.difficulty || 'unknown',
        simplifiedPath,
        centerPoint,
        boundingBox,
        user: route.user,
        rawData: route // Keep original data for reference
      };
    });
  }, []); // Empty dependency array since this function doesn't depend on any external values

  // Fetch routes from API
  const fetchRoutes = useCallback(async () => {
    try {
      actions.setLoading(true);
      actions.setError(null);
      
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (difficultyFilter) {
        params.append('difficulty', difficultyFilter);
      }
      
      const response = await publicRoutesApi.getAll(params.toString());
      
      // Check if response has routes directly or nested in data
      const routes = response.routes || (response.data && response.data.routes);
      const pagination = response.pagination || (response.data && response.data.pagination);
      
      if (routes) {
        const routesData = parseRouteData(routes);
        actions.setTracks(routesData);
        actions.setTotalPages(pagination ? pagination.total_pages : 1);
      } else {
        actions.setTracks([]);
        actions.setTotalPages(1);
      }
    } catch (err) {
      console.error('Error fetching routes:', err);
      actions.setError('Failed to fetch routes');
      actions.setTracks([]);
    }
  }, [currentPage, searchTerm, difficultyFilter, limit, parseRouteData, actions]);

  // Fetch routes on component mount and when filters change
  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // Refresh function for manual data refresh
  const refreshTracks = useCallback(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // Helper function to get track by ID
  const getTrackById = useCallback((trackId) => {
    return tracks.find(track => track.id === trackId);
  }, [tracks]);

  // Helper function to check if there are any tracks
  const hasTracks = tracks.length > 0;

  // Helper function to check if pagination is needed
  const needsPagination = totalPages > 1;

  return {
    // Data
    tracks,
    totalPages,
    currentPage,
    limit,
    
    // State
    loading,
    error,
    hasTracks,
    needsPagination,
    
    // Actions
    refreshTracks,
    getTrackById,
    
    // Filter state (for convenience)
    searchTerm,
    difficultyFilter,
  };
}

export default useTrackData;