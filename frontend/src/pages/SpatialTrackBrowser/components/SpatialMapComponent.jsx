import React, { useRef, useEffect, useState } from 'react';
import { initMap, isReady, onLoad, updateStyle, isBoundsLoading, isBoundsPending, hasNewBoundsToSearch } from '../MapInstance';

const SpatialMapComponent = ({ className = '', onMapReady, onSearchClick, loading = false, routesCount = 0 }) => {
  const mapContainer = useRef(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/outdoors-v12');
  const [mapReady, setMapReady] = useState(false);
  const [boundsLoading, setBoundsLoading] = useState(false);
  const [boundsPending, setBoundsPending] = useState(false);
  const [hasNewBounds, setHasNewBounds] = useState(false);

  // Initialize map using singleton
  useEffect(() => {
    if (!mapContainer.current) return;

    // Force a small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      if (mapContainer.current) {
        // Initialize the singleton map instance
        initMap(mapContainer.current, { style: mapStyle });
        
        // Set up load callback
        onLoad(() => {
          setMapReady(true);
          // Call parent callback when map is ready
          if (onMapReady) {
            onMapReady();
          }
        });

        // Check if map is already ready
        if (isReady()) {
          setMapReady(true);
          // Call parent callback if map is already ready
          if (onMapReady) {
            onMapReady();
          }
        }
      }
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      // Note: We don't destroy the map here since it's a singleton
      // The map will be destroyed when the app unmounts or explicitly called
    };
  }, []); // Only run once on mount

  // Update map style using singleton method
  useEffect(() => {
    updateStyle(mapStyle);
  }, [mapStyle]);

  // Monitor bounds loading, pending, and new bounds states
  useEffect(() => {
    const checkBoundsStates = () => {
      setBoundsLoading(isBoundsLoading());
      setBoundsPending(isBoundsPending());
      setHasNewBounds(hasNewBoundsToSearch());
    };

    // Check initially
    checkBoundsStates();

    // Set up an interval to check bounds states
    const interval = setInterval(checkBoundsStates, 100);

    return () => clearInterval(interval);
  }, []);

  // Map style options
  const mapStyleOptions = [
    { value: 'mapbox://styles/mapbox/outdoors-v12', label: 'Outdoors' },
    { value: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite' },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {/* Map Style Selector */}
      <div className="absolute top-4 left-4 z-10">
        <select
          value={mapStyle}
          onChange={(e) => setMapStyle(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {mapStyleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading Overlay */}
      {!mapReady && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading spatial map...</p>
          </div>
        </div>
      )}

      {/* Search Button - shown when there are new bounds to search */}
      {mapReady && hasNewBounds && !boundsLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={onSearchClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search Current Area</span>
          </button>
        </div>
      )}

      {/* Bounds Loading Overlay */}
      {mapReady && boundsLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-2 z-10">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-sm text-gray-700">Loading routes...</p>
          </div>
        </div>
      )}

      {/* Map Status Indicator */}
      {mapReady && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-sm px-3 py-1 text-xs text-gray-600">
          {loading ? 'Loading routes...' : `${routesCount} routes found`}
        </div>
      )}
    </div>
  );
};

export default SpatialMapComponent;