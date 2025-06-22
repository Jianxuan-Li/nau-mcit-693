import React from 'react';

const DetailModal = ({ track, isOpen, onClose }) => {
  if (!isOpen || !track) return null;

  const formatElevation = (elevation) => {
    if (!elevation) return 'N/A';
    return `${elevation}m`;
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatSpeed = (speed) => {
    if (!speed) return 'N/A';
    return `${speed.toFixed(1)} km/h`;
  };

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'moderate':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'expert':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 mt-16 mb-8 md:mt-20 md:mb-16 bg-white rounded-lg shadow-xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {track.name || 'Unnamed Route'}
            </h2>
            {track.user && (
              <p className="text-sm text-gray-500 mt-1">
                Created by {track.user.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Distance */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-blue-900">Distance</span>
              </div>
              <span className="text-2xl font-bold text-blue-900">{track.route_length_km}km</span>
            </div>

            {/* Elevation */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-green-900">Max Elevation</span>
              </div>
              <span className="text-2xl font-bold text-green-900">{formatElevation(track.max_elevation_gain)}</span>
            </div>

            {/* Duration */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-purple-900">Est. Duration</span>
              </div>
              <span className="text-2xl font-bold text-purple-900">{formatDuration(track.estimated_duration)}</span>
            </div>

            {/* Speed */}
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-orange-900">Avg Speed</span>
              </div>
              <span className="text-2xl font-bold text-orange-900">{formatSpeed(track.average_speed)}</span>
            </div>

            {/* Difficulty */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Difficulty</span>
              </div>
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${getDifficultyStyle(track.difficulty)}`}>
                {track.difficulty || 'Unknown'}
              </span>
            </div>

            {/* Creation Date */}
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-indigo-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-indigo-900">Created</span>
              </div>
              <span className="text-lg font-semibold text-indigo-900">{formatDate(track.created_at)}</span>
            </div>
          </div>

          {/* Description */}
          {track.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{track.description}</p>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Route Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Route Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Route ID:</span>
                  <span className="font-medium">{track.id}</span>
                </div>
                {track.route_type && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{track.route_type}</span>
                  </div>
                )}
                {track.tags && track.tags.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {track.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Technical Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="font-medium">{formatDate(track.updated_at)}</span>
                </div>
                {track.min_elevation && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Min Elevation:</span>
                    <span className="font-medium">{formatElevation(track.min_elevation)}</span>
                  </div>
                )}
                {track.total_ascent && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Ascent:</span>
                    <span className="font-medium">{formatElevation(track.total_ascent)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;