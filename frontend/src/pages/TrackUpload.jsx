import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import GPXParser from 'gpxparser';
import { routesApi } from '../utils/request';
import useAuth from '../hooks/useAuth';
import Modal from '../components/Modal';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function TrackUpload() {
  const navigate = useNavigate();
  const { isLoading: isCheckingAuth, user } = useAuth();
  const [gpxFiles, setGpxFiles] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    const initMap = () => {
      if (!map.current && mapContainer.current && !isCheckingAuth) {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/outdoors-v12',
          center: [-74.006, 40.7128],
          zoom: 10
        });

        map.current.on('load', () => {
          map.current.resize();
        });
      }
    };

    if (!isCheckingAuth) {
      requestAnimationFrame(initMap);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isCheckingAuth]);

  const mapData = useMemo(() => ({
    tracks: gpxFiles.map(track => ({
      id: track.id,
      coordinates: track.coordinates
    })),
    selectedTrackId
  }), [
    gpxFiles.length,
    gpxFiles.map(track => track.id).join(','),
    gpxFiles.map(track => track.coordinates.length).join(','),
    selectedTrackId
  ]);

  useEffect(() => {
    if (map.current && mapData.tracks.length > 0) {
      updateMapRoutes();
    }
  }, [mapData]);

  // Focus on selected track when it changes
  useEffect(() => {
    if (selectedTrackId) {
      focusOnTrack(selectedTrackId);
    }
  }, [selectedTrackId]);

  useEffect(() => {
    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDragEnter = (e) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragCounter(prev => prev - 1);
    if (dragCounter - 1 === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragCounter(0);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.name.endsWith('.gpx')
    );
    
    if (droppedFiles.length === 0) {
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid File Type',
        message: 'Please drop only GPX files.'
      });
      return;
    }
    
    await processFiles(droppedFiles);
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      file => file.name.endsWith('.gpx')
    );
    await processFiles(selectedFiles);
  };

  const processFiles = async (files) => {
    setIsProcessing(true);
    const newGpxFiles = [];

    for (const file of files) {
      try {
        // Check file size (20MB limit to match backend)
        if (file.size > 20 * 1024 * 1024) {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'File Too Large',
            message: `File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 20MB.`
          });
          continue;
        }

        const text = await file.text();
        const gpx = new GPXParser();
        gpx.parse(text);

        const trackData = {
          id: Date.now() + Math.random(),
          file: file,
          filename: file.name,
          gpxData: gpx,
          coordinates: gpx.tracks[0]?.points?.map(point => [point.lon, point.lat]) || [],
          info: {
            name: gpx.metadata?.name || file.name.replace('.gpx', ''),
            difficulty: 'easy',
            scenery: '',
            description: ''
          },
          stats: {
            distance: gpx.tracks[0]?.distance?.total ? (gpx.tracks[0].distance.total / 1000).toFixed(2) : 0,
            elevation: gpx.tracks[0]?.elevation?.max ? Math.round(gpx.tracks[0].elevation.max) : 0,
            points: gpx.tracks[0]?.points?.length || 0
          }
        };

        newGpxFiles.push(trackData);
      } catch (error) {
        console.error('Error processing GPX file:', file.name, error);
      }
    }

    setGpxFiles(prev => [...prev, ...newGpxFiles]);
    if (newGpxFiles.length > 0 && !selectedTrackId) {
      setSelectedTrackId(newGpxFiles[0].id);
    }
    setIsProcessing(false);
  };

  const updateMapRoutes = () => {
    if (!map.current) return;

    // Remove existing sources and layers
    gpxFiles.forEach((_, index) => {
      try {
        if (map.current.getLayer(`route-${index}`)) {
          map.current.removeLayer(`route-${index}`);
        }
        if (map.current.getSource(`route-${index}`)) {
          map.current.removeSource(`route-${index}`);
        }
      } catch (e) {
        // Layer or source doesn't exist
      }
    });

    // Add new routes
    gpxFiles.forEach((track, index) => {
      if (track.coordinates.length > 0) {
        const isSelected = track.id === selectedTrackId;
        
        map.current.addSource(`route-${index}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: track.coordinates
            }
          }
        });

        map.current.addLayer({
          id: `route-${index}`,
          type: 'line',
          source: `route-${index}`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': isSelected ? '#3b82f6' : '#6b7280',
            'line-width': isSelected ? 4 : 3,
            'line-opacity': isSelected ? 1 : 0.85
          }
        });
      }
    });

    // If no track is selected, fit map to show all routes
    if (gpxFiles.length > 0 && !selectedTrackId) {
      const bounds = new mapboxgl.LngLatBounds();
      gpxFiles.forEach(track => {
        track.coordinates.forEach(coord => bounds.extend(coord));
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  };

  const focusOnTrack = (trackId) => {
    if (!map.current || !trackId) return;
    
    const track = gpxFiles.find(t => t.id === trackId);
    if (!track || track.coordinates.length === 0) return;

    // Create bounds for the selected track
    const bounds = new mapboxgl.LngLatBounds();
    track.coordinates.forEach(coord => bounds.extend(coord));
    
    // Animate to the track with smooth transition
    map.current.fitBounds(bounds, {
      padding: 80,
      duration: 3000
    });
  };

  const handleTrackInfoChange = (trackId, field, value) => {
    setGpxFiles(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, info: { ...track.info, [field]: value } }
        : track
    ));
  };

  const removeTrack = (trackId) => {
    setGpxFiles(prev => prev.filter(track => track.id !== trackId));
    if (selectedTrackId === trackId) {
      const remaining = gpxFiles.filter(track => track.id !== trackId);
      setSelectedTrackId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const renderUploadArea = () => (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Upload GPX Files</h3>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
        <div className="space-y-2">
          <div className="text-gray-600">
            <p className="text-sm font-medium">Drop GPX files here</p>
            <p className="text-xs">or</p>
          </div>
          <input
            type="file"
            multiple
            accept=".gpx"
            onChange={handleFileSelect}
            className="hidden"
            id="fileInput"
          />
          <label
            htmlFor="fileInput"
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors cursor-pointer inline-block text-xs"
          >
            Browse Files
          </label>
          <p className="text-xs text-gray-500">
            GPX only • Max 20MB each
          </p>
        </div>
      </div>
      {isProcessing && (
        <div className="mt-3 text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-xs text-gray-600 mt-1">Processing...</p>
        </div>
      )}
    </div>
  );

  const renderFileList = () => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Tracks ({gpxFiles.length})</h3>
        {gpxFiles.length > 0 && (
          <button
            onClick={() => {
              setGpxFiles([]);
              setSelectedTrackId(null);
            }}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Clear All
          </button>
        )}
      </div>
      {gpxFiles.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">No tracks uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {gpxFiles.map((track) => (
            <div
              key={track.id}
              className={`p-2 border rounded cursor-pointer transition-colors ${
                selectedTrackId === track.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTrackId(track.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {track.info.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{track.filename}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-gray-500">{track.stats.distance}km</span>
                    <span className="text-xs text-gray-500">+{track.stats.elevation}m</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTrack(track.id);
                  }}
                  className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors flex-shrink-0"
                  title="Delete track"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTrackForm = () => {
    const selectedTrack = gpxFiles.find(track => track.id === selectedTrackId);
    
    if (!selectedTrack) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Select a track to edit its information</p>
        </div>
      );
    }

    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Track Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Track Name</label>
            <input
              type="text"
              value={selectedTrack.info.name}
              onChange={(e) => handleTrackInfoChange(selectedTrack.id, 'name', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
            <select
              value={selectedTrack.info.difficulty}
              onChange={(e) => handleTrackInfoChange(selectedTrack.id, 'difficulty', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10"
            >
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scenery Description</label>
            <textarea
              value={selectedTrack.info.scenery}
              onChange={(e) => handleTrackInfoChange(selectedTrack.id, 'scenery', e.target.value)}
              rows="3"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3"
              placeholder="Describe the scenery and landscape..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Description</label>
            <textarea
              value={selectedTrack.info.description}
              onChange={(e) => handleTrackInfoChange(selectedTrack.id, 'description', e.target.value)}
              rows="4"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3"
              placeholder="Additional details about the track..."
            />
          </div>
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    if (gpxFiles.length === 0) {
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'No Files Selected',
        message: 'Please upload at least one GPX file before submitting.'
      });
      return;
    }

    setIsProcessing(true);
    const results = [];

    try {
      for (const track of gpxFiles) {
        try {
          // Create route data matching the new API structure
          const routeData = {
            name: track.info.name,
            description: track.info.description + (track.info.scenery ? '\n\nScenery: ' + track.info.scenery : ''),
            difficulty: track.info.difficulty,
            totalDistance: track.stats.distance,
            maxElevationGain: track.stats.elevation,
            estimatedDuration: Math.max(60, Math.round(track.stats.distance * 12)) // Estimate 12 minutes per km, minimum 60 minutes
          };

          const routeResult = await routesApi.create(track.file, routeData);
          results.push({ success: true, name: track.info.name, route: routeResult });
        } catch (error) {
          console.error(`Error uploading track ${track.info.name}:`, error);
          results.push({ success: false, name: track.info.name, error: error.message });
        }
      }

      // Show results
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (failed === 0) {
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Upload Successful',
          message: `All ${successful} tracks uploaded successfully!`
        });
        // Clear the form
        setGpxFiles([]);
        setSelectedTrackId(null);
      } else if (successful === 0) {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Upload Failed',
          message: 'Failed to upload all tracks. Please check the console for details.'
        });
      } else {
        setModal({
          isOpen: true,
          type: 'warning',
          title: 'Partial Upload Success',
          message: `${successful} tracks uploaded successfully, ${failed} failed. Check console for details.`
        });
        console.log('Upload results:', results);
      }
    } catch (error) {
      console.error('Error during submission:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Upload Error',
        message: 'Unexpected error during submission. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Upload GPX Tracks</h1>
        <p className="text-sm text-gray-600 mt-1">Upload and manage multiple GPX track files</p>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left side - Map (50%) */}
        <div className="w-1/2 bg-gray-100">
          <div ref={mapContainer} className="h-full w-full" />
        </div>
        
        {/* Right side - GPX Files and Form (50%) */}
        <div className="w-1/2 flex">
          {/* GPX Files List (25% of total page) */}
          <div 
            className={`w-1/2 bg-white border-l border-gray-200 flex flex-col relative ${
              isDragOver ? 'bg-blue-50' : ''
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleFileDrop}
          >
            {/* Drag overlay */}
            {isDragOver && (
              <div className="absolute inset-0 bg-blue-100 bg-opacity-90 border-2 border-dashed border-blue-400 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="text-blue-600 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-blue-600">Drop GPX files here</p>
                  <p className="text-sm text-blue-500">Release to upload</p>
                </div>
              </div>
            )}
            
            {/* Upload area - fixed at top */}
            <div className="p-3 border-b border-gray-200 bg-white">
              {renderUploadArea()}
            </div>
            
            {/* File list - scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3">
                {renderFileList()}
              </div>
            </div>
          </div>

          {/* Form area (25% of total page) */}
          <div className="w-1/2 bg-white border-l border-gray-200 flex flex-col">
            {/* Form content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                {renderTrackForm()}
              </div>
            </div>
            
            {/* Bottom buttons - fixed at bottom */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={gpxFiles.length === 0 || isProcessing}
                  className={`flex-1 px-4 py-2 rounded-md text-white transition-colors text-sm ${
                    gpxFiles.length === 0 || isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </div>
                  ) : (
                    `Submit All (${gpxFiles.length})`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        type={modal.type}
        title={modal.title}
      >
        {modal.message}
      </Modal>
    </div>
  );
}

export default TrackUpload; 