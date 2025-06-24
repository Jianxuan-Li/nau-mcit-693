import mapboxgl from 'mapbox-gl';
import GPXParser from 'gpxparser';
import { publicRoutesApi } from '../../../utils/request';

class GPXPathManager {
  constructor() {
    this.gpxPaths = new Map(); // key: routeId, value: { routeId, coordinates, sourceName, layerName, gpxData }
    this.loadedGpxData = new Map(); // key: routeId, value: full GPX data with stats
    this.loadingGpx = new Set(); // Set of routeIds currently loading
    this.gpxErrors = new Map(); // key: routeId, value: error message
    this.selectedRouteId = null;
    this.startEndMarkers = new Map(); // key: routeId, value: { startMarker, endMarker }
  }

  // Create start marker element
  createStartMarkerElement() {
    const el = document.createElement('div');
    el.className = 'gpx-start-marker';
    el.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      position: relative;
    `;
    
    // Add inner dot
    const innerDot = document.createElement('div');
    innerDot.style.cssText = `
      width: 6px;
      height: 6px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    el.appendChild(innerDot);
    
    return el;
  }

  // Create end marker element
  createEndMarkerElement() {
    const el = document.createElement('div');
    el.className = 'gpx-end-marker';
    el.style.cssText = `
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 20px solid #dc2626;
      cursor: pointer;
      position: relative;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    `;
    
    // Add white border effect
    const borderEl = document.createElement('div');
    borderEl.style.cssText = `
      width: 0;
      height: 0;
      border-left: 10px solid transparent;
      border-right: 10px solid transparent;
      border-bottom: 24px solid white;
      position: absolute;
      top: -2px;
      left: -10px;
      z-index: -1;
    `;
    el.appendChild(borderEl);
    
    return el;
  }

  // Add start and end markers for a GPX path
  addStartEndMarkers(routeId, coordinates, mapInstance) {
    if (!coordinates || coordinates.length < 2) return;

    // Remove existing markers for this route
    this.removeStartEndMarkers(routeId);

    const startCoord = coordinates[0];
    const endCoord = coordinates[coordinates.length - 1];

    // Create start marker
    const startMarkerEl = this.createStartMarkerElement();
    const startMarker = new mapboxgl.Marker(startMarkerEl)
      .setLngLat(startCoord)
      .addTo(mapInstance);

    // Create end marker
    const endMarkerEl = this.createEndMarkerElement();
    const endMarker = new mapboxgl.Marker(endMarkerEl)
      .setLngLat(endCoord)
      .addTo(mapInstance);

    // Add tooltips
    startMarkerEl.title = 'Start Point';
    endMarkerEl.title = 'End Point';

    // Store markers
    this.startEndMarkers.set(routeId, {
      startMarker,
      endMarker
    });

    console.log(`✓ Added start/end markers for route ${routeId}`);
  }

  // Remove start and end markers for a specific route
  removeStartEndMarkers(routeId) {
    const markers = this.startEndMarkers.get(routeId);
    if (markers) {
      if (markers.startMarker) {
        markers.startMarker.remove();
      }
      if (markers.endMarker) {
        markers.endMarker.remove();
      }
      this.startEndMarkers.delete(routeId);
      console.log(`Removed start/end markers for route ${routeId}`);
    }
  }

  // Remove all start and end markers
  removeAllStartEndMarkers() {
    this.startEndMarkers.forEach((markers, routeId) => {
      if (markers.startMarker) {
        markers.startMarker.remove();
      }
      if (markers.endMarker) {
        markers.endMarker.remove();
      }
    });
    this.startEndMarkers.clear();
    console.log('Removed all start/end markers');
  }

  // Update GPX paths - show only the selected route's full path
  updateGPXPaths(selectedRouteId, mapInstance) {
    if (!mapInstance) {
      console.warn('No map instance available for updating GPX paths');
      return;
    }

    // If selection changed, clear current GPX path
    if (this.selectedRouteId !== selectedRouteId) {
      this.clearCurrentGPXPath(mapInstance);
      this.selectedRouteId = selectedRouteId;
    }

    // Show GPX path for selected route if available
    if (selectedRouteId && this.loadedGpxData.has(selectedRouteId)) {
      this.showGPXPath(selectedRouteId, mapInstance);
    }
  }

  // Load GPX data for a route
  async loadGPXData(routeId, routeName = null) {
    if (!routeId || this.loadedGpxData.has(routeId) || this.loadingGpx.has(routeId)) {
      return; // Already loaded or loading
    }

    this.loadingGpx.add(routeId);
    this.gpxErrors.delete(routeId);

    try {
      console.log(`Loading GPX data for route ${routeId}...`);
      
      // Get download URL from API (public endpoint for unregistered users)
      const downloadResponse = await publicRoutesApi.getDownloadUrl(routeId);
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
          distance: gpxParser.tracks[0].distance?.total 
            ? (gpxParser.tracks[0].distance.total / 1000).toFixed(2) 
            : 0,
          elevation: gpxParser.tracks[0].elevation?.max 
            ? Math.round(gpxParser.tracks[0].elevation.max) 
            : 0,
          points: gpxParser.tracks[0].points?.length || 0,
          elevationGain: gpxParser.tracks[0].elevation?.pos || 0,
          elevationLoss: gpxParser.tracks[0].elevation?.neg || 0,
        },
        metadata: {
          name: gpxParser.metadata?.name || routeName || `Route ${routeId}`,
          description: gpxParser.metadata?.desc || '',
          time: gpxParser.metadata?.time || null,
        },
        rawGpx: gpxText,
        loadedAt: new Date().toISOString()
      };

      this.loadedGpxData.set(routeId, gpxData);
      console.log(`✓ GPX data loaded for route ${routeId} (${coordinates.length} points)`);
      
      return gpxData;
    } catch (error) {
      console.error(`Error loading GPX data for route ${routeId}:`, error);
      this.gpxErrors.set(routeId, error.message);
      throw error;
    } finally {
      this.loadingGpx.delete(routeId);
    }
  }

  // Show GPX path on map
  showGPXPath(routeId, mapInstance) {
    if (!mapInstance || !this.loadedGpxData.has(routeId)) {
      return;
    }

    const gpxData = this.loadedGpxData.get(routeId);
    const sourceName = `gpx-source-${routeId}`;
    const layerName = `gpx-layer-${routeId}`;

    try {
      // Remove existing GPX path if any
      this.clearCurrentGPXPath(mapInstance);

      // Add source
      if (!mapInstance.getSource(sourceName)) {
        mapInstance.addSource(sourceName, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              routeId: routeId,
              routeName: gpxData.metadata.name,
              type: 'full_gpx'
            },
            geometry: {
              type: 'LineString',
              coordinates: gpxData.coordinates
            }
          }
        });
      }

      // Add layer
      if (!mapInstance.getLayer(layerName)) {
        mapInstance.addLayer({
          id: layerName,
          type: 'line',
          source: sourceName,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ef4444', // Red color for selected GPX
            'line-width': 4,
            'line-opacity': 0.9
          }
        });

        // Add click handler for the GPX path
        mapInstance.on('click', layerName, (e) => {
          this.handleGPXClick(e.features[0].properties, e.lngLat);
        });

        // Change cursor on hover
        mapInstance.on('mouseenter', layerName, () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });

        mapInstance.on('mouseleave', layerName, () => {
          mapInstance.getCanvas().style.cursor = '';
        });
      }

      // Store path info
      this.gpxPaths.set(routeId, {
        routeId: routeId,
        coordinates: gpxData.coordinates,
        sourceName: sourceName,
        layerName: layerName,
        gpxData: gpxData
      });

      // Add start and end markers
      this.addStartEndMarkers(routeId, gpxData.coordinates, mapInstance);

      console.log(`✓ GPX path displayed for route ${routeId}`);
    } catch (error) {
      console.error(`Failed to show GPX path for route ${routeId}:`, error);
    }
  }

  // Clear current GPX path from map
  clearCurrentGPXPath(mapInstance) {
    if (!mapInstance) return;

    this.gpxPaths.forEach((pathInfo, routeId) => {
      try {
        // Remove layer
        if (mapInstance.getLayer(pathInfo.layerName)) {
          mapInstance.removeLayer(pathInfo.layerName);
        }

        // Remove source
        if (mapInstance.getSource(pathInfo.sourceName)) {
          mapInstance.removeSource(pathInfo.sourceName);
        }

        // Remove start and end markers
        this.removeStartEndMarkers(routeId);

        console.log(`Removed GPX path for route ${routeId}`);
      } catch (error) {
        console.error(`Failed to remove GPX path for route ${routeId}:`, error);
      }
    });

    this.gpxPaths.clear();
  }

  // Handle GPX path click
  handleGPXClick(properties, lngLat) {
    console.log('GPX path clicked:', properties, 'at', lngLat);
    // TODO: Could show popup with route details, elevation profile, etc.
  }

  // Load and show GPX for a route (convenience method)
  async loadAndShowGPX(routeId, routeName, mapInstance) {
    try {
      // Load GPX data if not already loaded
      if (!this.loadedGpxData.has(routeId)) {
        await this.loadGPXData(routeId, routeName);
      }

      // Show on map
      this.updateGPXPaths(routeId, mapInstance);
      
      return this.loadedGpxData.get(routeId);
    } catch (error) {
      console.error('Failed to load and show GPX:', error);
      throw error;
    }
  }

  // Get GPX data for a route
  getGPXData(routeId) {
    return this.loadedGpxData.get(routeId);
  }

  // Check if GPX is loaded
  isGPXLoaded(routeId) {
    return this.loadedGpxData.has(routeId);
  }

  // Check if GPX is loading
  isGPXLoading(routeId) {
    return this.loadingGpx.has(routeId);
  }

  // Get GPX error
  getGPXError(routeId) {
    return this.gpxErrors.get(routeId);
  }

  // Clear GPX error
  clearGPXError(routeId) {
    this.gpxErrors.delete(routeId);
  }

  // Clear all GPX data
  clearAllGPXData(mapInstance) {
    if (mapInstance) {
      this.clearCurrentGPXPath(mapInstance);
    }
    
    // Remove any remaining markers
    this.removeAllStartEndMarkers();
    
    this.loadedGpxData.clear();
    this.loadingGpx.clear();
    this.gpxErrors.clear();
    this.selectedRouteId = null;
    
    console.log('Cleared all GPX data');
  }

  // Get loading statistics
  getLoadingStats() {
    return {
      loaded: this.loadedGpxData.size,
      loading: this.loadingGpx.size,
      errors: this.gpxErrors.size,
      total: this.loadedGpxData.size + this.loadingGpx.size + this.gpxErrors.size
    };
  }

  // Get current selected route ID
  getSelectedRouteId() {
    return this.selectedRouteId;
  }
}

// Create singleton instance
const gpxPathManager = new GPXPathManager();

export default gpxPathManager;