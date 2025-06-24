import React, { useRef, useEffect, useState } from 'react';
import { initMap, isReady, onLoad, updateStyle, updateGPXVisualization } from '../MapInstance';

const GPXMapComponent = ({ 
  className = '', 
  gpxData, 
  selectedSegments = [], 
  timelineSelection = { start: 0, end: 100 } 
}) => {
  const mapContainer = useRef(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/outdoors-v12');
  const [mapReady, setMapReady] = useState(false);

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
        });

        // Check if map is already ready
        if (isReady()) {
          setMapReady(true);
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

  // Update GPX visualization when data or selection changes
  useEffect(() => {
    if (mapReady && gpxData) {
      updateGPXVisualization(timelineSelection, selectedSegments);
    }
  }, [mapReady, gpxData, timelineSelection, selectedSegments]);

  // Map style options
  const mapStyleOptions = [
    { value: 'mapbox://styles/mapbox/outdoors-v12', label: 'Outdoors' },
    { value: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite' },
    { value: 'mapbox://styles/mapbox/streets-v12', label: 'Streets' },
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
            <p className="text-sm text-gray-600">Loading GPX editor...</p>
          </div>
        </div>
      )}

      {/* GPX Status */}
      {mapReady && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-sm px-3 py-1 text-xs text-gray-600">
          {gpxData ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>GPX loaded</span>
            </div>
          ) : (
            <span>No GPX loaded</span>
          )}
        </div>
      )}

      {/* Edit Mode Indicator */}
      {mapReady && gpxData && (timelineSelection.start > 0 || timelineSelection.end < 100 || selectedSegments.length > 0) && (
        <div className="absolute top-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2 text-sm text-yellow-800">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            <span>Editing mode active</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GPXMapComponent;