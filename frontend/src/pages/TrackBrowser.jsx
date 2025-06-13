import React, { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function TrackBrowser() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/outdoors-v12');
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Mock data for tracks
  const tracks = [
    {
      id: 1,
      name: "Huron Natural Area Trail",
      distance: "3.2 km",
      elevation: "45m",
      difficulty: "easy",
      coordinates: [
        [-80.4922, 43.4516],
        [-80.4950, 43.4530],
        [-80.4980, 43.4520],
        [-80.4960, 43.4500],
        [-80.4922, 43.4516]
      ]
    },
    {
      id: 2,
      name: "Laurel Creek Trail",
      distance: "4.5 km",
      elevation: "60m",
      difficulty: "moderate",
      coordinates: [
        [-80.4850, 43.4550],
        [-80.4880, 43.4580],
        [-80.4920, 43.4570],
        [-80.4900, 43.4540],
        [-80.4850, 43.4550]
      ]
    }
  ];

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

      // Add tracks when map loads
      map.current.on('load', () => {
        tracks.forEach((track, index) => {
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
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map style when changed
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(mapStyle);
    }
  }, [mapStyle]);

  const handleMapStyleChange = (style) => {
    setMapStyle(style);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Track Browser
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => handleMapStyleChange('mapbox://styles/mapbox/outdoors-v12')}
            className={`px-4 py-2 rounded ${
              mapStyle === 'mapbox://styles/mapbox/outdoors-v12'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Outdoor Map
          </button>
          <button
            onClick={() => handleMapStyleChange('mapbox://styles/mapbox/terrain-v2')}
            className={`px-4 py-2 rounded ${
              mapStyle === 'mapbox://styles/mapbox/terrain-v2'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Terrain Map
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          <div ref={mapContainer} className="h-[600px] rounded" />
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Track List</h2>
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
                    'bg-red-100 text-red-800'
                  }`}>
                    {track.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrackBrowser; 