import React, { useRef, useState } from 'react';

const GPXUploader = ({ onGPXUpload, onGPXClear, hasGPX, fileName }) => {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Parse GPX file content
  const parseGPX = (xmlText) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid GPX file format');
    }

    const gpx = xmlDoc.documentElement;
    if (gpx.tagName !== 'gpx') {
      throw new Error('Not a valid GPX file');
    }

    const result = {
      version: gpx.getAttribute('version') || '1.1',
      creator: gpx.getAttribute('creator') || 'Unknown',
      tracks: [],
      waypoints: [],
      routes: []
    };

    // Parse metadata
    const metadata = gpx.querySelector('metadata');
    if (metadata) {
      result.metadata = {
        name: metadata.querySelector('name')?.textContent || '',
        desc: metadata.querySelector('desc')?.textContent || '',
        time: metadata.querySelector('time')?.textContent || ''
      };
    }

    // Parse tracks
    const tracks = gpx.querySelectorAll('trk');
    tracks.forEach((track, trackIndex) => {
      const trackData = {
        name: track.querySelector('name')?.textContent || `Track ${trackIndex + 1}`,
        desc: track.querySelector('desc')?.textContent || '',
        segments: []
      };

      // Parse track segments
      const segments = track.querySelectorAll('trkseg');
      segments.forEach((segment, segmentIndex) => {
        const segmentData = {
          points: []
        };

        // Parse track points
        const points = segment.querySelectorAll('trkpt');
        points.forEach((point, pointIndex) => {
          const lat = parseFloat(point.getAttribute('lat'));
          const lon = parseFloat(point.getAttribute('lon'));
          
          if (isNaN(lat) || isNaN(lon)) {
            console.warn(`Invalid coordinates at track ${trackIndex}, segment ${segmentIndex}, point ${pointIndex}`);
            return;
          }

          const pointData = {
            lat,
            lon,
            index: pointIndex
          };

          // Parse elevation
          const ele = point.querySelector('ele');
          if (ele) {
            pointData.ele = parseFloat(ele.textContent);
          }

          // Parse time
          const time = point.querySelector('time');
          if (time) {
            pointData.time = new Date(time.textContent);
          }

          segmentData.points.push(pointData);
        });

        if (segmentData.points.length > 0) {
          trackData.segments.push(segmentData);
        }
      });

      if (trackData.segments.length > 0) {
        result.tracks.push(trackData);
      }
    });

    // Parse waypoints
    const waypoints = gpx.querySelectorAll('wpt');
    waypoints.forEach((waypoint) => {
      const lat = parseFloat(waypoint.getAttribute('lat'));
      const lon = parseFloat(waypoint.getAttribute('lon'));
      
      if (!isNaN(lat) && !isNaN(lon)) {
        const waypointData = {
          lat,
          lon,
          name: waypoint.querySelector('name')?.textContent || '',
          desc: waypoint.querySelector('desc')?.textContent || ''
        };

        const ele = waypoint.querySelector('ele');
        if (ele) {
          waypointData.ele = parseFloat(ele.textContent);
        }

        result.waypoints.push(waypointData);
      }
    });

    return result;
  };

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setError('Please select a GPX file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Read file content
      const text = await file.text();
      
      // Parse GPX
      const gpxData = parseGPX(text);
      
      // Validate parsed data
      if (!gpxData.tracks || gpxData.tracks.length === 0) {
        throw new Error('GPX file contains no valid tracks');
      }

      // Calculate total points
      let totalPoints = 0;
      gpxData.tracks.forEach(track => {
        track.segments.forEach(segment => {
          totalPoints += segment.points.length;
        });
      });

      if (totalPoints === 0) {
        throw new Error('GPX file contains no valid track points');
      }

      console.log(`GPX parsed successfully: ${gpxData.tracks.length} tracks, ${totalPoints} points`);
      
      // Call the upload handler
      onGPXUpload(file, gpxData);
      
    } catch (err) {
      console.error('Error parsing GPX file:', err);
      setError(err.message || 'Failed to parse GPX file');
    } finally {
      setIsLoading(false);
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle clear button
  const handleClear = () => {
    setError(null);
    onGPXClear();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle upload button click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Upload GPX File</h3>
      
      {/* Upload Area */}
      {!hasGPX ? (
        <div
          onClick={handleUploadClick}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isLoading}
          />
          
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
              <p className="text-gray-600">Processing GPX file...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600 mb-1">Click to upload GPX file</p>
              <p className="text-sm text-gray-500">or drag and drop</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">GPX Loaded</p>
                <p className="text-xs text-green-600 mt-1">{fileName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUploadClick}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Change
              </button>
              <button
                onClick={handleClear}
                className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Upload Instructions */}
      {!hasGPX && !error && (
        <div className="mt-3 text-xs text-gray-500">
          <p>Supported format: GPX files (.gpx)</p>
          <p>Maximum file size: 50MB</p>
        </div>
      )}
    </div>
  );
};

export default GPXUploader;