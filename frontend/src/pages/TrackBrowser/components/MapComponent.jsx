import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapOperations } from '../hooks/useMapOperations';
import { useTrackBrowser } from '../context/TrackBrowserContext';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const MapComponent = ({ className = '' }) => {
  const mapContainer = useRef(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/outdoors-v12');
  const { windowSize, actions } = useTrackBrowser();
  const { 
    initializeMap, 
    cleanupMap, 
    updateMapStyle,
    mapInstance 
  } = useMapOperations();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = initializeMap(mapContainer.current, {
      style: mapStyle
    });

    // Handle map load
    if (map) {
      map.on('load', () => {
        map.resize();
      });
    }

    return () => {
      cleanupMap();
    };
  }, []); // Only run once on mount

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      actions.setWindowSize(newSize);
      
      // Resize map when window size changes
      if (mapInstance) {
        mapInstance.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapInstance, actions]);

  // Update map style when changed
  useEffect(() => {
    updateMapStyle(mapStyle);
  }, [mapStyle, updateMapStyle]);

  // Map style options
  const mapStyleOptions = [
    { value: 'mapbox://styles/mapbox/outdoors-v12', label: 'Outdoors' },
    { value: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite' },
    { value: 'mapbox://styles/mapbox/streets-v12', label: 'Streets' },
    { value: 'mapbox://styles/mapbox/light-v11', label: 'Light' },
    { value: 'mapbox://styles/mapbox/dark-v11', label: 'Dark' },
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
      {!mapInstance && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;