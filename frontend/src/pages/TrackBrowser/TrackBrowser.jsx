import React from 'react';
import { TrackBrowserProvider } from './context/TrackBrowserContext';
import { useTrackBrowser } from './context/TrackBrowserContext';
import MapComponent from './components/MapComponent';
import TrackList from './components/TrackList';
import SearchFilters from './components/SearchFilters';
import MapLegend from './components/MapLegend';

// Main layout component (separated to use context)
const TrackBrowserLayout = () => {
  const { windowSize } = useTrackBrowser();
  
  // Calculate dynamic layout
  const headerHeight = 64; // Approximate header height
  const isMobile = windowSize.width < 1024; // lg breakpoint

  return (
    <div 
      className="flex flex-col overflow-hidden"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Header section */}
      <div className="p-6 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Track Browser
          </h1>
        </div>
        
        {/* Search and Filter Controls */}
        <SearchFilters />
        
        {/* Map Legend */}
        <MapLegend className="mt-4" />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {isMobile ? (
          // Mobile layout: stacked
          <div className="flex flex-col w-full gap-6">
            {/* Map takes 60% of mobile height */}
            <div className="h-3/5 bg-white rounded-lg shadow">
              <MapComponent className="w-full h-full" />
            </div>
            
            {/* Track list takes 40% of mobile height */}
            <div className="h-2/5 bg-white rounded-lg shadow border border-gray-200 overflow-y-auto">
              <div className="p-4 h-full">
                <TrackList className="h-full" />
              </div>
            </div>
          </div>
        ) : (
          // Desktop layout: side by side
          <>
            {/* Map takes 60% of desktop width */}
            <div className="w-3/5 bg-white rounded-lg shadow">
              <MapComponent className="w-full h-full" />
            </div>
            
            {/* Track list takes 40% of desktop width */}
            <div className="w-2/5 bg-white rounded-lg shadow border border-gray-200 overflow-y-auto">
              <div className="p-4 h-full">
                <TrackList className="h-full" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Main component with provider
const TrackBrowser = () => {
  return (
    <TrackBrowserProvider>
      <TrackBrowserLayout />
    </TrackBrowserProvider>
  );
};

export default TrackBrowser;