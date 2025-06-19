import React, { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import GPXParser from 'gpxparser';
import { publicRoutesApi, routesApi } from '../utils/request';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function TrackBrowser() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/outdoors-v12');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadedGpxData, setLoadedGpxData] = useState(new Map()); // Map of routeId -> gpx data
  const [loadingGpx, setLoadingGpx] = useState(new Set()); // Set of routeIds being loaded
  const [gpxErrors, setGpxErrors] = useState(new Map()); // Map of routeId -> error message
  const limit = 10;

  // Fetch routes from API
  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (difficultyFilter) {
        params.append('difficulty', difficultyFilter);
      }
      
      const response = await publicRoutesApi.getAll(params.toString());
      
      // Check if response has routes directly or nested in data
      const routes = response.routes || (response.data && response.data.routes);
      const pagination = response.pagination || (response.data && response.data.pagination);
      
      if (routes) {
        const routesData = routes.map(route => {
          let simplifiedPath = null;
          let centerPoint = null;
          let boundingBox = null;
          
          // Parse GeoJSON strings
          if (route.simplified_path) {
            try {
              simplifiedPath = JSON.parse(route.simplified_path);
            } catch (e) {
              console.warn('Failed to parse simplified_path for route:', route.id);
            }
          }
          
          if (route.center_point) {
            try {
              centerPoint = JSON.parse(route.center_point);
            } catch (e) {
              console.warn('Failed to parse center_point for route:', route.id);
            }
          }
          
          if (route.bounding_box) {
            try {
              boundingBox = JSON.parse(route.bounding_box);
            } catch (e) {
              console.warn('Failed to parse bounding_box for route:', route.id);
            }
          }
          
          return {
            id: route.id,
            name: route.name,
            distance: route.route_length_km ? `${route.route_length_km.toFixed(2)} km` : (route.total_distance ? `${route.total_distance} km` : 'N/A'),
            elevation: route.max_elevation_gain !== null && route.max_elevation_gain !== undefined ? `${route.max_elevation_gain}m` : '0m',
            difficulty: route.difficulty || 'unknown',
            simplifiedPath: simplifiedPath,
            centerPoint: centerPoint,
            boundingBox: boundingBox,
            user: route.user
          };
        });
        
        setTracks(routesData);
        setTotalPages(pagination ? pagination.total_pages : 1);
      } else {
        setTracks([]);
      }
    } catch (err) {
      setError('Failed to fetch routes');
      console.error('Error fetching routes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch routes on component mount and when filters change
  useEffect(() => {
    fetchRoutes();
  }, [currentPage, searchTerm, difficultyFilter]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      // Resize map when window size changes
      if (map.current) {
        map.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [-80.4922, 43.4516],
        zoom: 13,
        projection: 'mercator'
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Add geolocation control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }),
        'top-right'
      );

    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map tracks when tracks data changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // Clear all existing track layers and sources
    const style = map.current.getStyle();
    if (style && style.layers) {
      const trackLayers = style.layers.filter(layer => 
        layer.id.startsWith('track-layer-') || layer.id.startsWith('gpx-layer-')
      );
      trackLayers.forEach(layer => {
        map.current.removeLayer(layer.id);
      });
    }
    
    if (style && style.sources) {
      Object.keys(style.sources).forEach(sourceId => {
        if (sourceId.startsWith('track-') || sourceId.startsWith('gpx-')) {
          map.current.removeSource(sourceId);
        }
      });
    }

    // Add simplified path layers for all tracks
    tracks.forEach((track) => {
      if (!track.simplifiedPath || !track.simplifiedPath.coordinates || track.simplifiedPath.coordinates.length === 0) return;
      
      const sourceId = `track-${track.id}`;
      const layerId = `track-layer-${track.id}`;
      const isSelected = track.id === selectedTrack?.id;
      const hasGpxData = loadedGpxData.has(track.id);

      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            id: track.id,
            name: track.name,
            distance: track.distance,
            difficulty: track.difficulty
          },
          geometry: track.simplifiedPath
        }
      });

      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': isSelected ? '#2563eb' : '#10b981',
          'line-width': hasGpxData && isSelected ? 2 : (isSelected ? 5 : 3),
          'line-opacity': hasGpxData && isSelected ? 0.6 : (isSelected ? 1 : 0.8)
        }
      });

      // Add hover effect
      map.current.on('mouseenter', layerId, () => {
        map.current.getCanvas().style.cursor = 'pointer';
        if (!isSelected) {
          map.current.setPaintProperty(layerId, 'line-width', 4);
          map.current.setPaintProperty(layerId, 'line-opacity', 1);
        }
      });

      map.current.on('mouseleave', layerId, () => {
        map.current.getCanvas().style.cursor = '';
        if (!isSelected) {
          map.current.setPaintProperty(layerId, 'line-width', 3);
          map.current.setPaintProperty(layerId, 'line-opacity', 0.8);
        }
      });

      map.current.on('click', layerId, () => {
        setSelectedTrack(track);
      });
    });

    // Add full GPX track for selected track if available
    if (selectedTrack && loadedGpxData.has(selectedTrack.id)) {
      const gpxData = loadedGpxData.get(selectedTrack.id);
      const gpxSourceId = `gpx-${selectedTrack.id}`;
      const gpxLayerId = `gpx-layer-${selectedTrack.id}`;

      map.current.addSource(gpxSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            id: selectedTrack.id,
            name: selectedTrack.name,
            type: 'full_gpx'
          },
          geometry: {
            type: 'LineString',
            coordinates: gpxData.coordinates
          }
        }
      });

      map.current.addLayer({
        id: gpxLayerId,
        type: 'line',
        source: gpxSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ef4444', // Red color for full GPX track
          'line-width': 3,
          'line-opacity': 0.9
        }
      });
    }
  }, [tracks, selectedTrack, loadedGpxData]);

  // Animate to selected track
  useEffect(() => {
    if (!map.current || !selectedTrack || !selectedTrack.boundingBox) return;
    
    try {
      const bbox = selectedTrack.boundingBox;
      if (bbox && bbox.coordinates && bbox.coordinates[0]) {
        // Extract coordinates from bounding box polygon
        const coords = bbox.coordinates[0];
        const lngs = coords.map(coord => coord[0]);
        const lats = coords.map(coord => coord[1]);
        
        const bounds = [
          [Math.min(...lngs), Math.min(...lats)], // Southwest
          [Math.max(...lngs), Math.max(...lats)]  // Northeast
        ];
        
        // Animate to fit the bounds with padding
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 1500, // Animation duration in milliseconds
          essential: true
        });
      } else if (selectedTrack.centerPoint && selectedTrack.centerPoint.coordinates) {
        // Fallback to center point if bounding box is not available
        const [lng, lat] = selectedTrack.centerPoint.coordinates;
        map.current.flyTo({
          center: [lng, lat],
          zoom: 14,
          duration: 1500,
          essential: true
        });
      }
    } catch (error) {
      console.warn('Error animating to selected track:', error);
      // Fallback: try to use center point
      if (selectedTrack.centerPoint && selectedTrack.centerPoint.coordinates) {
        try {
          const [lng, lat] = selectedTrack.centerPoint.coordinates;
          map.current.flyTo({
            center: [lng, lat],
            zoom: 14,
            duration: 1500,
            essential: true
          });
        } catch (fallbackError) {
          console.warn('Fallback animation also failed:', fallbackError);
        }
      }
    }
  }, [selectedTrack]);

  // Load GPX data for a track
  const loadGpxData = async (track) => {
    if (loadedGpxData.has(track.id) || loadingGpx.has(track.id)) {
      return; // Already loaded or loading
    }

    setLoadingGpx(prev => new Set([...prev, track.id]));
    setGpxErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(track.id);
      return newErrors;
    });

    try {
      // Get download URL from API
      const downloadResponse = await routesApi.getDownloadUrl(track.id);
      const downloadUrl = downloadResponse.download_url;

      // Fetch the GPX file
      const gpxResponse = await fetch(downloadUrl);
      if (!gpxResponse.ok) {
        throw new Error(`Failed to download GPX file: ${gpxResponse.statusText}`);
      }

      const gpxText = await gpxResponse.text();
      
      // Parse GPX
      const gpxParser = new GPXParser();
      gpxParser.parse(gpxText);

      if (!gpxParser.tracks || gpxParser.tracks.length === 0) {
        throw new Error('No tracks found in GPX file');
      }

      const coordinates = gpxParser.tracks[0].points.map(point => [point.lon, point.lat]);
      
      const gpxData = {
        coordinates,
        parser: gpxParser,
        stats: {
          distance: gpxParser.tracks[0].distance?.total ? (gpxParser.tracks[0].distance.total / 1000).toFixed(2) : 0,
          elevation: gpxParser.tracks[0].elevation?.max ? Math.round(gpxParser.tracks[0].elevation.max) : 0,
          points: gpxParser.tracks[0].points?.length || 0
        }
      };

      setLoadedGpxData(prev => new Map([...prev, [track.id, gpxData]]));
    } catch (error) {
      console.error('Error loading GPX data:', error);
      setGpxErrors(prev => new Map([...prev, [track.id, error.message]]));
    } finally {
      setLoadingGpx(prev => {
        const newLoading = new Set(prev);
        newLoading.delete(track.id);
        return newLoading;
      });
    }
  };

  // Load GPX data when a track is selected
  useEffect(() => {
    if (selectedTrack && !loadedGpxData.has(selectedTrack.id) && !loadingGpx.has(selectedTrack.id)) {
      loadGpxData(selectedTrack);
    }
  }, [selectedTrack]);

  // Function to fit all tracks in view
  const fitAllTracks = () => {
    if (!map.current || tracks.length === 0) return;
    
    const validTracks = tracks.filter(track => track.boundingBox && track.boundingBox.coordinates);
    if (validTracks.length === 0) return;
    
    try {
      // Calculate combined bounds for all tracks
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      
      validTracks.forEach(track => {
        const coords = track.boundingBox.coordinates[0];
        coords.forEach(coord => {
          const [lng, lat] = coord;
          minLng = Math.min(minLng, lng);
          minLat = Math.min(minLat, lat);
          maxLng = Math.max(maxLng, lng);
          maxLat = Math.max(maxLat, lat);
        });
      });
      
      const bounds = [[minLng, minLat], [maxLng, maxLat]];
      
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        duration: 1500,
        essential: true
      });
    } catch (error) {
      console.warn('Error fitting all tracks:', error);
    }
  };

  // Update map style when changed
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(mapStyle);
    }
  }, [mapStyle]);

  const handleMapStyleChange = (style) => {
    setMapStyle(style);
  };

  // Calculate dynamic heights
  const headerHeight = 80; // Approximate header height
  const availableHeight = windowSize.height - headerHeight;
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
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search tracks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setDifficultyFilter('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Clear Filters
          </button>
        </div>
        
        {/* Legend */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Map Legend</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-green-500 mr-2"></div>
              <span className="text-gray-600">Simplified path</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-blue-500 mr-2"></div>
              <span className="text-gray-600">Selected route</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-red-500 mr-2"></div>
              <span className="text-gray-600">Full GPX track</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {isMobile ? (
          // Mobile layout: stacked
          <div className="flex flex-col w-full gap-6">
            <div className="flex-1 bg-white rounded-lg shadow">
              <div ref={mapContainer} className="w-full h-full rounded-lg" />
            </div>
            <div className="h-1/3 bg-white rounded-lg shadow border border-gray-200 overflow-y-auto">
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">Track List</h2>
                    {tracks.length > 0 && (
                      <button
                        onClick={fitAllTracks}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        title="Fit all tracks in view"
                      >
                        Fit All
                      </button>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-gray-600">
                        {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
                
                {loading && (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-gray-600">Loading tracks...</div>
                  </div>
                )}
                
                {error && (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-red-600">{error}</div>
                  </div>
                )}
                
                {!loading && !error && tracks.length === 0 && (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-gray-600">No tracks found</div>
                  </div>
                )}
                
                {!loading && !error && tracks.length > 0 && (
                  <div className="space-y-4">
                    {tracks.map((track) => (
                      <div
                        key={track.id}
                        className={`p-4 rounded-lg cursor-pointer transition-colors ${
                          selectedTrack?.id === track.id
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedTrack(track)}
                      >
                        <h3 className="font-medium text-gray-900">{track.name}</h3>
                        <div className="mt-2 flex justify-between text-sm text-gray-600">
                          <span>{track.distance}</span>
                          <span>{track.elevation} elevation</span>
                        </div>
                        {track.user && (
                          <div className="mt-1 text-xs text-gray-500">
                            by {track.user.name}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            track.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            track.difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                            track.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {track.difficulty}
                          </span>
                          {selectedTrack?.id === track.id && (
                            <div className="flex items-center text-xs">
                              {loadingGpx.has(track.id) && (
                                <div className="flex items-center text-blue-600">
                                  <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-blue-600 mr-1"></div>
                                  Loading GPX...
                                </div>
                              )}
                              {loadedGpxData.has(track.id) && !loadingGpx.has(track.id) && (
                                <div className="flex items-center text-green-600">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Full track loaded
                                </div>
                              )}
                              {gpxErrors.has(track.id) && (
                                <div className="flex items-center text-red-600" title={gpxErrors.get(track.id)}>
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Load failed
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Desktop layout: side by side
          <>
            <div className="w-3/5 bg-white rounded-lg shadow">
              <div ref={mapContainer} className="w-full h-full rounded-lg" />
            </div>
            <div className="w-2/5 bg-white rounded-lg shadow border border-gray-200 overflow-y-auto">
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">Track List</h2>
                    {tracks.length > 0 && (
                      <button
                        onClick={fitAllTracks}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        title="Fit all tracks in view"
                      >
                        Fit All
                      </button>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-gray-600">
                        {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
                
                {loading && (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-gray-600">Loading tracks...</div>
                  </div>
                )}
                
                {error && (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-red-600">{error}</div>
                  </div>
                )}
                
                {!loading && !error && tracks.length === 0 && (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-gray-600">No tracks found</div>
                  </div>
                )}
                
                {!loading && !error && tracks.length > 0 && (
                  <div className="space-y-4">
                    {tracks.map((track) => (
                      <div
                        key={track.id}
                        className={`p-4 rounded-lg cursor-pointer transition-colors ${
                          selectedTrack?.id === track.id
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedTrack(track)}
                      >
                        <h3 className="font-medium text-gray-900">{track.name}</h3>
                        <div className="mt-2 flex justify-between text-sm text-gray-600">
                          <span>{track.distance}</span>
                          <span>{track.elevation} elevation</span>
                        </div>
                        {track.user && (
                          <div className="mt-1 text-xs text-gray-500">
                            by {track.user.name}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            track.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            track.difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                            track.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {track.difficulty}
                          </span>
                          {selectedTrack?.id === track.id && (
                            <div className="flex items-center text-xs">
                              {loadingGpx.has(track.id) && (
                                <div className="flex items-center text-blue-600">
                                  <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-blue-600 mr-1"></div>
                                  Loading GPX...
                                </div>
                              )}
                              {loadedGpxData.has(track.id) && !loadingGpx.has(track.id) && (
                                <div className="flex items-center text-green-600">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Full track loaded
                                </div>
                              )}
                              {gpxErrors.has(track.id) && (
                                <div className="flex items-center text-red-600" title={gpxErrors.get(track.id)}>
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Load failed
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TrackBrowser; 