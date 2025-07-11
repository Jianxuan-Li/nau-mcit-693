import React, { useState } from 'react';
import { publicRoutesApi } from '../../../utils/request';

const SpatialTrackCard = ({ 
  track, 
  isSelected = false, 
  onSelect,
  onDetailClick,
  isGPXLoaded = false,
  isGPXLoading = false,
  gpxError = null
}) => {
  const [downloading, setDownloading] = useState(false);

  const handleClick = () => {
    if (onSelect) {
      onSelect(track);
    }
  };

  const handleRetry = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(track);
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    
    try {
      setDownloading(true);
      const response = await publicRoutesApi.getDownloadUrl(track.id);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = response.download_url;
      link.download = `${track.name || 'route'}.gpx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDetailClick = (e) => {
    e.stopPropagation();
    if (onDetailClick) {
      onDetailClick(track);
    }
  };

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'moderate':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      case 'expert':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format elevation
  const formatElevation = (elevation) => {
    if (!elevation) return 'N/A elevation';
    return `${elevation}m elevation`;
  };

  // Format duration as estimated time
  const formatDuration = (duration) => {
    if (!duration) return null;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    if (hours > 0) {
      return `Est. ${hours}h ${minutes}m`;
    }
    return `Est. ${minutes}m`;
  };

  // Format speed
  const formatSpeed = (speed) => {
    if (!speed) return null;
    return `${speed.toFixed(1)} km/h`;
  };

  return (
    <div
      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'bg-blue-50 border-2 border-blue-500 shadow-md'
          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
      }`}
      onClick={handleClick}
    >
      {/* Track Name */}
      <h3 className="font-medium text-gray-900 mb-2 truncate" title={track.name || 'Unnamed Route'}>
        {track.name || 'Unnamed Route'}
      </h3>
      
      {/* Distance and Elevation */}
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>{track.route_length_km}km</span>
        <span>{formatElevation(track.max_elevation_gain)}</span>
      </div>
      
      {/* Duration and Speed */}
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{formatDuration(track.estimated_duration) || 'Duration N/A'}</span>
        <span>{formatSpeed(track.average_speed) || 'Speed N/A'}</span>
      </div>
      
      {/* User Information */}
      {track.user && (
        <div className="text-xs text-gray-500 mb-2">
          by {track.user.name}
        </div>
      )}
      
      {/* Bottom Row: Difficulty, Download Button and Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Difficulty Badge */}
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getDifficultyStyle(track.difficulty)}`}>
            {track.difficulty || 'unknown'}
          </span>
          
          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download GPX file"
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-blue-600"></div>
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Download</span>
              </>
            )}
          </button>
          
          {/* Detail Button */}
          <button
            onClick={handleDetailClick}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            title="View details"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Detail</span>
          </button>
        </div>
        
        {/* GPX Status (only show for selected track) */}
        {isSelected && (
          <div className="flex items-center text-xs">
            {isGPXLoading && (
              <div className="flex items-center text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-blue-600 mr-1"></div>
                Loading GPX...
              </div>
            )}
            
            {isGPXLoaded && !isGPXLoading && (
              <div className="flex items-center text-green-600">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Full track
              </div>
            )}
            
            {gpxError && (
              <div className="flex items-center">
                <div className="flex items-center text-red-600 mr-2" title={gpxError}>
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Failed
                </div>
                <button
                  onClick={handleRetry}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                  title="Retry loading GPX"
                >
                  Retry
                </button>
              </div>
            )}
            
            {!isGPXLoading && !isGPXLoaded && !gpxError && (
              <div className="flex items-center text-gray-500">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Click to load
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpatialTrackCard;