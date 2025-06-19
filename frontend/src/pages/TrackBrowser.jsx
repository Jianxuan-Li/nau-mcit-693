import React, { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { publicRoutesApi } from '../utils/request';

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
        const routesData = routes.map(route => ({
          id: route.id,
          name: route.name,
          distance: route.total_distance ? `${route.total_distance} km` : 'N/A',
          elevation: route.max_elevation_gain !== null && route.max_elevation_gain !== undefined ? `${route.max_elevation_gain}m` : '0m',
          difficulty: route.difficulty || 'unknown',
          coordinates: route.coordinates ? JSON.parse(route.coordinates) : []
        }));
        
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
      const trackLayers = style.layers.filter(layer => layer.id.startsWith('track-layer-'));
      trackLayers.forEach(layer => {
        map.current.removeLayer(layer.id);
      });
    }
    
    if (style && style.sources) {
      Object.keys(style.sources).forEach(sourceId => {
        if (sourceId.startsWith('track-')) {
          map.current.removeSource(sourceId);
        }
      });
    }

    // Add new track layers
    tracks.forEach((track) => {
      if (!track.coordinates || track.coordinates.length === 0) return;
      
      const sourceId = `track-${track.id}`;
      const layerId = `track-layer-${track.id}`;

      map.current.addSource(sourceId, {
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
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': track.id === selectedTrack?.id ? '#3b82f6' : '#10b981',
          'line-width': 4
        }
      });

      // Add hover effect
      map.current.on('mouseenter', layerId, () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', layerId, () => {
        map.current.getCanvas().style.cursor = '';
      });

      map.current.on('click', layerId, () => {
        setSelectedTrack(track);
      });
    });
  }, [tracks, selectedTrack]);

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
                  <h2 className="text-xl font-semibold">Track List</h2>
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
                        <div className="mt-2">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            track.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            track.difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                            track.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {track.difficulty}
                          </span>
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
                  <h2 className="text-xl font-semibold">Track List</h2>
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
                        <div className="mt-2">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            track.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            track.difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                            track.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {track.difficulty}
                          </span>
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