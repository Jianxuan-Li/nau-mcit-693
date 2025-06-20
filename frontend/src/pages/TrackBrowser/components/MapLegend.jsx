import React, { useState } from 'react';
import { useTrackBrowser } from '../context/TrackBrowserContext';
import { useGpxLoader } from '../hooks/useGpxLoader';

const MapLegend = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectedTrack } = useTrackBrowser();
  const { getLoadingStats } = useGpxLoader();
  
  const stats = getLoadingStats();

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`bg-gray-50 rounded-lg transition-all duration-200 ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={toggleExpanded}
      >
        <h3 className="text-sm font-medium text-gray-700">Map Legend</h3>
        <button className="text-gray-500 hover:text-gray-700">
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3">
          {/* Legend Items */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-green-500 mr-2"></div>
              <span className="text-xs text-gray-600">Simplified path</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-blue-500 mr-2"></div>
              <span className="text-xs text-gray-600">Selected route (simplified)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-red-500 mr-2"></div>
              <span className="text-xs text-gray-600">Full GPX track (replaces simplified)</span>
            </div>
          </div>

          {/* Difficulty Legend */}
          <div className="space-y-2 mb-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Difficulty Levels:</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-full mr-1"></div>
                <span className="text-gray-600">Easy</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-full mr-1"></div>
                <span className="text-gray-600">Moderate</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded-full mr-1"></div>
                <span className="text-gray-600">Hard</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded-full mr-1"></div>
                <span className="text-gray-600">Expert</span>
              </div>
            </div>
          </div>

          {/* Selected Track Info */}
          {selectedTrack && (
            <div className="border-t pt-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Selected Track:</div>
              <div className="text-xs text-gray-600">
                <div className="truncate" title={selectedTrack.name}>
                  {selectedTrack.name}
                </div>
                <div className="flex justify-between mt-1">
                  <span>{selectedTrack.distance}</span>
                  <span>{selectedTrack.elevation}</span>
                </div>
                {selectedTrack.user && (
                  <div className="text-gray-500 mt-1">by {selectedTrack.user.name}</div>
                )}
              </div>
            </div>
          )}

          {/* GPX Loading Stats */}
          {stats.total > 0 && (
            <div className="border-t pt-3">
              <div className="text-xs font-medium text-gray-700 mb-1">GPX Status:</div>
              <div className="text-xs text-gray-600 space-y-1">
                {stats.loaded > 0 && (
                  <div className="flex justify-between">
                    <span>Loaded:</span>
                    <span className="text-green-600">{stats.loaded}</span>
                  </div>
                )}
                {stats.loading > 0 && (
                  <div className="flex justify-between">
                    <span>Loading:</span>
                    <span className="text-blue-600">{stats.loading}</span>
                  </div>
                )}
                {stats.errors > 0 && (
                  <div className="flex justify-between">
                    <span>Errors:</span>
                    <span className="text-red-600">{stats.errors}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Controls Info */}
          <div className="border-t pt-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Controls:</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• Click track to select & load full GPX</div>
              <div>• Use &quot;Fit All&quot; to view all tracks</div>
              <div>• Zoom with mouse wheel</div>
              <div>• Pan by dragging</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapLegend;