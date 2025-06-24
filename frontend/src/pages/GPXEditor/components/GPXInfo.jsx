import React from 'react';

const GPXInfo = ({ gpxData }) => {
  if (!gpxData) return null;

  // Calculate track statistics
  const calculateStats = () => {
    let totalDistance = 0;
    let totalPoints = 0;
    let totalElevationGain = 0;
    let totalElevationLoss = 0;
    let minElevation = Infinity;
    let maxElevation = -Infinity;
    let startTime = null;
    let endTime = null;

    gpxData.tracks.forEach(track => {
      track.segments.forEach(segment => {
        const points = segment.points;
        totalPoints += points.length;

        for (let i = 0; i < points.length; i++) {
          const point = points[i];

          // Track time range
          if (point.time) {
            if (!startTime || point.time < startTime) {
              startTime = point.time;
            }
            if (!endTime || point.time > endTime) {
              endTime = point.time;
            }
          }

          // Track elevation
          if (point.ele !== undefined) {
            minElevation = Math.min(minElevation, point.ele);
            maxElevation = Math.max(maxElevation, point.ele);

            // Calculate elevation gain/loss
            if (i > 0 && points[i - 1].ele !== undefined) {
              const elevationDiff = point.ele - points[i - 1].ele;
              if (elevationDiff > 0) {
                totalElevationGain += elevationDiff;
              } else {
                totalElevationLoss += Math.abs(elevationDiff);
              }
            }
          }

          // Calculate distance
          if (i > 0) {
            const prevPoint = points[i - 1];
            const distance = calculateDistance(
              prevPoint.lat, prevPoint.lon,
              point.lat, point.lon
            );
            totalDistance += distance;
          }
        }
      });
    });

    return {
      totalDistance: totalDistance / 1000, // Convert to km
      totalPoints,
      totalElevationGain,
      totalElevationLoss,
      minElevation: minElevation === Infinity ? null : minElevation,
      maxElevation: maxElevation === -Infinity ? null : maxElevation,
      startTime,
      endTime,
      duration: startTime && endTime ? endTime - startTime : null
    };
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Format duration
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'Unknown';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return date.toLocaleString();
  };

  const stats = calculateStats();
  const trackName = gpxData.tracks[0]?.name || gpxData.metadata?.name || 'Unnamed Track';

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Track Information</h3>
      
      {/* Track Name */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900">{trackName}</h4>
        {gpxData.metadata?.desc && (
          <p className="text-sm text-gray-600 mt-1">{gpxData.metadata.desc}</p>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        
        {/* Distance */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-blue-600 font-medium">Distance</div>
          <div className="text-lg font-semibold text-blue-900">
            {stats.totalDistance.toFixed(2)} km
          </div>
        </div>

        {/* Points */}
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-green-600 font-medium">Points</div>
          <div className="text-lg font-semibold text-green-900">
            {stats.totalPoints.toLocaleString()}
          </div>
        </div>

        {/* Duration */}
        {stats.duration && (
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-purple-600 font-medium">Duration</div>
            <div className="text-lg font-semibold text-purple-900">
              {formatDuration(stats.duration)}
            </div>
          </div>
        )}

        {/* Tracks/Segments */}
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="text-yellow-600 font-medium">Segments</div>
          <div className="text-lg font-semibold text-yellow-900">
            {gpxData.tracks.reduce((total, track) => total + track.segments.length, 0)}
          </div>
        </div>

        {/* Elevation Gain */}
        {stats.totalElevationGain > 0 && (
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-red-600 font-medium">Elevation Gain</div>
            <div className="text-lg font-semibold text-red-900">
              {Math.round(stats.totalElevationGain)} m
            </div>
          </div>
        )}

        {/* Elevation Loss */}
        {stats.totalElevationLoss > 0 && (
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-orange-600 font-medium">Elevation Loss</div>
            <div className="text-lg font-semibold text-orange-900">
              {Math.round(stats.totalElevationLoss)} m
            </div>
          </div>
        )}

        {/* Min/Max Elevation */}
        {stats.minElevation !== null && stats.maxElevation !== null && (
          <>
            <div className="bg-indigo-50 p-3 rounded-lg">
              <div className="text-indigo-600 font-medium">Min Elevation</div>
              <div className="text-lg font-semibold text-indigo-900">
                {Math.round(stats.minElevation)} m
              </div>
            </div>
            <div className="bg-teal-50 p-3 rounded-lg">
              <div className="text-teal-600 font-medium">Max Elevation</div>
              <div className="text-lg font-semibold text-teal-900">
                {Math.round(stats.maxElevation)} m
              </div>
            </div>
          </>
        )}
      </div>

      {/* Time Information */}
      {stats.startTime && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
          <div className="grid grid-cols-1 gap-2">
            <div>
              <span className="font-medium text-gray-700">Start:</span>{' '}
              <span className="text-gray-600">{formatDate(stats.startTime)}</span>
            </div>
            {stats.endTime && (
              <div>
                <span className="font-medium text-gray-700">End:</span>{' '}
                <span className="text-gray-600">{formatDate(stats.endTime)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creator Information */}
      {gpxData.creator && (
        <div className="mt-3 text-xs text-gray-500">
          Created by: {gpxData.creator}
        </div>
      )}
    </div>
  );
};

export default GPXInfo;