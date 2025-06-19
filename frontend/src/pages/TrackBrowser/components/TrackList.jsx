import React from 'react';
import TrackCard from './TrackCard';
import Pagination from './Pagination';
import { useTrackData } from '../hooks/useTrackData';
import { useMapOperations } from '../hooks/useMapOperations';

const TrackList = ({ className = '' }) => {
  const { tracks, loading, error, hasTracks, needsPagination } = useTrackData();
  const { fitAllTracks } = useMapOperations();

  if (loading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-600">Loading tracks...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!hasTracks) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3v10" />
            </svg>
          </div>
          <div className="text-gray-600">No tracks found</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Track List</h2>
          {hasTracks && (
            <button
              onClick={fitAllTracks}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              title="Fit all tracks in view"
            >
              Fit All
            </button>
          )}
        </div>
        
        {/* Pagination in header */}
        {needsPagination && <Pagination />}
      </div>
      
      {/* Track Cards */}
      <div className="space-y-3">
        {tracks.map((track) => (
          <TrackCard key={track.id} track={track} />
        ))}
      </div>
      
      {/* Track Count */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Showing {tracks.length} track{tracks.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default TrackList;