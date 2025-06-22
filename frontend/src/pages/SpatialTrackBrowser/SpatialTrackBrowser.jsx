import React, { useState, useEffect } from 'react';
import SpatialMapComponent from './components/SpatialMapComponent';
import SpatialTrackCard from './components/SpatialTrackCard';
import DetailModal from './components/DetailModal';
import { publicRoutesApi } from '../../utils/request';
import { 
  getBounds, 
  updateRouteMarkers, 
  updateSimplifiedPaths,
  loadAndShowGPX,
  clearGPXPath,
  isGPXLoaded,
  isGPXLoading,
  getGPXError,
  animateMapToRoute,
  onBoundChange,
  offBoundChange,
  hideSimplifiedPath,
  showSimplifiedPath
} from './MapInstance';
import { convertRoutesToMarkerData, convertRoutesToPathData } from './utils/geoJsonUtils';

// Main layout component
const SpatialTrackBrowserLayout = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [detailRoute, setDetailRoute] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Set up bound change callback
  useEffect(() => {
    // Set up the debounced bound change callback
    onBoundChange(fetchSpatialRoutes);

    // Cleanup on unmount
    return () => {
      offBoundChange();
    };
  }, []);

  // Function to fetch routes based on map bounds
  const fetchSpatialRoutes = async (bounds = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use provided bounds or get current bounds
      const targetBounds = bounds || getBounds();
      if (!targetBounds) {
        return;
      }

      const response = await publicRoutesApi.getBySpatialExtent(targetBounds, { limit: 50 });
      
      const routesData = response.routes || [];
      setRoutes(routesData);
      
      // Convert routes to marker data and update markers on map
      const markerData = convertRoutesToMarkerData(routesData);
      updateRouteMarkers(markerData);
      
      // Convert routes to path data and update simplified paths on map
      const pathData = convertRoutesToPathData(routesData);
      updateSimplifiedPaths(pathData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle route selection
  const handleRouteSelect = async (route) => {
    try {
      // If same route is clicked, deselect it
      if (selectedRoute && selectedRoute.id === route.id) {
        // Show the previously selected route's simplified path
        showSimplifiedPath(selectedRoute.id);
        setSelectedRoute(null);
        clearGPXPath();
        return;
      }

      // If there was a previously selected route, show its simplified path
      if (selectedRoute) {
        showSimplifiedPath(selectedRoute.id);
      }

      // Select new route
      setSelectedRoute(route);
      
      // Hide the newly selected route's simplified path
      hideSimplifiedPath(route.id);
      
      // Animate map to the selected route with a slight delay to ensure selection state is updated
      setTimeout(() => {
        animateMapToRoute(route, {
          duration: 1200, // Slightly faster animation
          padding: { top: 60, bottom: 60, left: 60, right: 60 }, // More padding for better view
          maxZoom: 15 // Don't zoom in too much
        });
      }, 100);
      
      // Load and show GPX for the selected route
      await loadAndShowGPX(route.id, route.name);
      
      console.log(`Route selected and animated to: ${route.name || route.id}`);
    } catch (error) {
      console.error('Error selecting route:', error);
      // Don't clear selection on error, user can retry
    }
  };

  // Handle detail modal
  const handleDetailClick = (route) => {
    setDetailRoute(route);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setDetailRoute(null);
  };

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Main content area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6">

        {/* Map takes 50% height on mobile, 60% width on desktop */}
        <div className="flex-1 md:w-3/5 bg-white rounded-lg shadow">
          <SpatialMapComponent 
            className="w-full h-full" 
            onMapReady={fetchSpatialRoutes}
            loading={loading}
            routesCount={routes.length}
          />
        </div>

        {/* Track list takes 50% height on mobile, 40% width on desktop */}
        <div className="flex-1 md:w-2/5 bg-white rounded-lg shadow border border-gray-200 overflow-y-auto">
          <div className="p-4 h-full">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <div className="text-gray-600">Loading tracks...</div>
                </div>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="text-red-600 mb-2">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-red-600">{error}</div>
                </div>
              </div>
            ) : routes.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3v10" />
                    </svg>
                  </div>
                  <div className="text-gray-600">No tracks found</div>
                </div>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">Track List</h2>
                  </div>
                </div>
                
                {/* Track Cards */}
                <div className="space-y-3">
                  {routes.map((route) => (
                    <SpatialTrackCard 
                      key={route.id} 
                      track={route}
                      isSelected={selectedRoute?.id === route.id}
                      onSelect={() => handleRouteSelect(route)}
                      onDetailClick={handleDetailClick}
                      isGPXLoaded={isGPXLoaded(route.id)}
                      isGPXLoading={isGPXLoading(route.id)}
                      gpxError={getGPXError(route.id)}
                    />
                  ))}
                </div>
                
                {/* Track Count */}
                <div className="mt-4 text-center text-sm text-gray-500">
                  Showing {routes.length} track{routes.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <DetailModal 
        track={detailRoute}
        isOpen={showDetailModal}
        onClose={closeDetailModal}
      />
    </div>
  );
};

// Main component
const SpatialTrackBrowser = () => {
  return <SpatialTrackBrowserLayout />;
};

export default SpatialTrackBrowser;