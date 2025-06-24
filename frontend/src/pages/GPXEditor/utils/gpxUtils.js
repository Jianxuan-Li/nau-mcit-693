// GPX editing utility functions

// Create a deep copy of GPX data
export const cloneGPXData = (gpxData) => {
  return JSON.parse(JSON.stringify(gpxData));
};

// Trim GPX data based on percentage selection
export const trimGPXData = (gpxData, startPercent, endPercent) => {
  if (!gpxData || !gpxData.tracks || startPercent >= endPercent) {
    throw new Error('Invalid GPX data or selection range');
  }

  const clonedData = cloneGPXData(gpxData);
  
  // Calculate total points to determine trim indices
  let totalPoints = 0;
  clonedData.tracks.forEach(track => {
    track.segments.forEach(segment => {
      totalPoints += segment.points.length;
    });
  });

  const startIndex = Math.floor((startPercent / 100) * totalPoints);
  const endIndex = Math.ceil((endPercent / 100) * totalPoints);

  // Apply trimming
  let currentIndex = 0;
  const trimmedTracks = [];

  for (const track of clonedData.tracks) {
    const trimmedTrack = {
      ...track,
      segments: []
    };

    for (const segment of track.segments) {
      const segmentStartIndex = currentIndex;
      const segmentEndIndex = currentIndex + segment.points.length;

      // Check if this segment overlaps with the selection
      if (segmentEndIndex > startIndex && segmentStartIndex < endIndex) {
        const trimmedSegment = {
          points: []
        };

        // Determine which points to keep in this segment
        const keepStartIndex = Math.max(0, startIndex - segmentStartIndex);
        const keepEndIndex = Math.min(segment.points.length, endIndex - segmentStartIndex);

        // Copy the selected points
        for (let i = keepStartIndex; i < keepEndIndex; i++) {
          trimmedSegment.points.push({ ...segment.points[i] });
        }

        if (trimmedSegment.points.length > 0) {
          trimmedTrack.segments.push(trimmedSegment);
        }
      }

      currentIndex += segment.points.length;
    }

    if (trimmedTrack.segments.length > 0) {
      trimmedTracks.push(trimmedTrack);
    }
  }

  return {
    ...clonedData,
    tracks: trimmedTracks
  };
};

// Remove selected segments from GPX data
export const removeSegmentsFromGPX = (gpxData, selectedSegmentIds) => {
  if (!gpxData || !gpxData.tracks || !selectedSegmentIds || selectedSegmentIds.length === 0) {
    return cloneGPXData(gpxData);
  }

  const clonedData = cloneGPXData(gpxData);
  const segmentIdsSet = new Set(selectedSegmentIds);
  
  const filteredTracks = [];

  clonedData.tracks.forEach((track, trackIndex) => {
    const filteredTrack = {
      ...track,
      segments: []
    };

    track.segments.forEach((segment, segmentIndex) => {
      const segmentId = `${trackIndex}-${segmentIndex}`;
      
      // Only keep segments that are NOT selected for deletion
      if (!segmentIdsSet.has(segmentId)) {
        filteredTrack.segments.push({ ...segment });
      }
    });

    // Only keep tracks that have remaining segments
    if (filteredTrack.segments.length > 0) {
      filteredTracks.push(filteredTrack);
    }
  });

  return {
    ...clonedData,
    tracks: filteredTracks
  };
};

// Convert GPX data back to XML string for download
export const gpxDataToXML = (gpxData) => {
  if (!gpxData) {
    throw new Error('No GPX data provided');
  }

  const formatDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString();
  };

  const formatNumber = (num, decimals = 6) => {
    if (num === undefined || num === null || isNaN(num)) return '';
    return Number(num).toFixed(decimals);
  };

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<gpx version="${gpxData.version || '1.1'}" creator="${gpxData.creator || 'GPXBase Editor'}" `;
  xml += 'xmlns="http://www.topografix.com/GPX/1/1" ';
  xml += 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ';
  xml += 'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n';

  // Add metadata
  if (gpxData.metadata) {
    xml += '  <metadata>\n';
    if (gpxData.metadata.name) {
      xml += `    <name><![CDATA[${gpxData.metadata.name}]]></name>\n`;
    }
    if (gpxData.metadata.desc) {
      xml += `    <desc><![CDATA[${gpxData.metadata.desc}]]></desc>\n`;
    }
    if (gpxData.metadata.time) {
      xml += `    <time>${formatDateTime(gpxData.metadata.time)}</time>\n`;
    }
    xml += '  </metadata>\n';
  }

  // Add waypoints
  if (gpxData.waypoints && gpxData.waypoints.length > 0) {
    gpxData.waypoints.forEach(waypoint => {
      xml += `  <wpt lat="${formatNumber(waypoint.lat)}" lon="${formatNumber(waypoint.lon)}">\n`;
      if (waypoint.ele !== undefined) {
        xml += `    <ele>${formatNumber(waypoint.ele, 2)}</ele>\n`;
      }
      if (waypoint.name) {
        xml += `    <name><![CDATA[${waypoint.name}]]></name>\n`;
      }
      if (waypoint.desc) {
        xml += `    <desc><![CDATA[${waypoint.desc}]]></desc>\n`;
      }
      xml += '  </wpt>\n';
    });
  }

  // Add tracks
  if (gpxData.tracks && gpxData.tracks.length > 0) {
    gpxData.tracks.forEach(track => {
      xml += '  <trk>\n';
      if (track.name) {
        xml += `    <name><![CDATA[${track.name}]]></name>\n`;
      }
      if (track.desc) {
        xml += `    <desc><![CDATA[${track.desc}]]></desc>\n`;
      }

      // Add track segments
      if (track.segments && track.segments.length > 0) {
        track.segments.forEach(segment => {
          xml += '    <trkseg>\n';
          
          if (segment.points && segment.points.length > 0) {
            segment.points.forEach(point => {
              xml += `      <trkpt lat="${formatNumber(point.lat)}" lon="${formatNumber(point.lon)}">\n`;
              if (point.ele !== undefined) {
                xml += `        <ele>${formatNumber(point.ele, 2)}</ele>\n`;
              }
              if (point.time) {
                xml += `        <time>${formatDateTime(point.time)}</time>\n`;
              }
              xml += '      </trkpt>\n';
            });
          }
          
          xml += '    </trkseg>\n';
        });
      }
      
      xml += '  </trk>\n';
    });
  }

  xml += '</gpx>';
  return xml;
};

// Create and trigger download of GPX file
export const downloadGPX = (gpxData, filename = 'edited-track.gpx') => {
  try {
    const xmlContent = gpxDataToXML(gpxData);
    const blob = new Blob([xmlContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    return true;
  } catch (error) {
    console.error('Error downloading GPX:', error);
    throw error;
  }
};

// Generate statistics for GPX data
export const generateGPXStats = (gpxData) => {
  if (!gpxData || !gpxData.tracks) {
    return {
      totalPoints: 0,
      totalSegments: 0,
      totalTracks: 0,
      totalDistance: 0,
      hasTimeData: false,
      hasElevationData: false
    };
  }

  let totalPoints = 0;
  let totalSegments = 0;
  let hasTimeData = false;
  let hasElevationData = false;
  let totalDistance = 0;

  gpxData.tracks.forEach(track => {
    if (track.segments) {
      totalSegments += track.segments.length;
      
      track.segments.forEach(segment => {
        if (segment.points) {
          totalPoints += segment.points.length;
          
          // Check for time and elevation data
          segment.points.forEach((point, index) => {
            if (point.time) hasTimeData = true;
            if (point.ele !== undefined) hasElevationData = true;
            
            // Calculate distance
            if (index > 0) {
              const prevPoint = segment.points[index - 1];
              const distance = calculateDistance(
                prevPoint.lat, prevPoint.lon,
                point.lat, point.lon
              );
              totalDistance += distance;
            }
          });
        }
      });
    }
  });

  return {
    totalPoints,
    totalSegments,
    totalTracks: gpxData.tracks.length,
    totalDistance: totalDistance / 1000, // Convert to km
    hasTimeData,
    hasElevationData
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

// Validate GPX data structure
export const validateGPXData = (gpxData) => {
  const errors = [];
  
  if (!gpxData) {
    errors.push('GPX data is null or undefined');
    return errors;
  }
  
  if (!gpxData.tracks || !Array.isArray(gpxData.tracks)) {
    errors.push('GPX data must contain a tracks array');
    return errors;
  }
  
  if (gpxData.tracks.length === 0) {
    errors.push('GPX data must contain at least one track');
    return errors;
  }
  
  gpxData.tracks.forEach((track, trackIndex) => {
    if (!track.segments || !Array.isArray(track.segments)) {
      errors.push(`Track ${trackIndex} must contain a segments array`);
      return;
    }
    
    if (track.segments.length === 0) {
      errors.push(`Track ${trackIndex} must contain at least one segment`);
      return;
    }
    
    track.segments.forEach((segment, segmentIndex) => {
      if (!segment.points || !Array.isArray(segment.points)) {
        errors.push(`Track ${trackIndex}, segment ${segmentIndex} must contain a points array`);
        return;
      }
      
      if (segment.points.length === 0) {
        errors.push(`Track ${trackIndex}, segment ${segmentIndex} must contain at least one point`);
        return;
      }
      
      segment.points.forEach((point, pointIndex) => {
        if (typeof point.lat !== 'number' || typeof point.lon !== 'number') {
          errors.push(`Track ${trackIndex}, segment ${segmentIndex}, point ${pointIndex} must have valid lat/lon coordinates`);
        }
      });
    });
  });
  
  return errors;
};