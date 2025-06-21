import mapboxgl from 'mapbox-gl';

class SimplifiedPathManager {
  constructor() {
    this.paths = new Map(); // key: routeId, value: { routeId, coordinates, sourceName, layerName }
    this.isVisible = false;
    this.zoomThreshold = 10; // Show paths when zoom >= 10 (city level)
  }

  // Update simplified paths based on route data
  updateSimplifiedPaths(pathData, mapInstance) {
    if (!mapInstance) {
      console.warn('No map instance available for updating paths');
      return;
    }

    // pathData should be an array of { routeId, coordinates, routeName }
    // where coordinates is an array of [lng, lat] pairs
    
    // Keep track of current route IDs
    const currentRouteIds = new Set(pathData.map(pd => pd.routeId));
    
    // Remove paths that are no longer in the routes list
    const pathsToRemove = [];
    this.paths.forEach((pathInfo, routeId) => {
      if (!currentRouteIds.has(routeId)) {
        pathsToRemove.push(routeId);
      }
    });
    
    pathsToRemove.forEach(routeId => {
      this.removePath(routeId, mapInstance);
    });

    // Add new paths for routes that don't have them yet
    pathData.forEach((pathInfo) => {
      if (!this.paths.has(pathInfo.routeId) && pathInfo.coordinates && pathInfo.coordinates.length > 0) {
        this.addPath(pathInfo, mapInstance);
      }
    });

    // Update visibility based on current zoom
    this.updateVisibility(mapInstance);

    console.log(`SimplifiedPath status: ${this.paths.size} paths managed for ${pathData.length} routes`);
  }

  // Add a single simplified path
  addPath(pathInfo, mapInstance) {
    const { routeId, coordinates, routeName } = pathInfo;
    
    if (this.paths.has(routeId)) {
      console.log(`Path for route ${routeId} already exists, skipping`);
      return;
    }

    if (!coordinates || coordinates.length === 0) {
      console.warn(`Route ${routeId} has no valid coordinates, skipping path`);
      return;
    }

    const sourceName = `route-source-${routeId}`;
    const layerName = `route-layer-${routeId}`;

    try {
      // Add source to map
      if (!mapInstance.getSource(sourceName)) {
        mapInstance.addSource(sourceName, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              routeId: routeId,
              routeName: routeName
            },
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          }
        });
      }

      // Add layer to map
      if (!mapInstance.getLayer(layerName)) {
        mapInstance.addLayer({
          id: layerName,
          type: 'line',
          source: sourceName,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'visibility': this.isVisible ? 'visible' : 'none'
          },
          paint: {
            'line-color': '#3B82F6', // Blue color matching markers
            'line-width': 3,
            'line-opacity': 0.8
          }
        });

        // Add click handler for the path
        mapInstance.on('click', layerName, (e) => {
          this.handlePathClick(e.features[0].properties, e.lngLat);
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
      this.paths.set(routeId, {
        routeId: routeId,
        coordinates: coordinates,
        routeName: routeName,
        sourceName: sourceName,
        layerName: layerName
      });

      console.log(`Added simplified path for route ${routeName || routeId}`);
    } catch (error) {
      console.error(`Failed to add path for route ${routeId}:`, error);
    }
  }

  // Remove a single path
  removePath(routeId, mapInstance) {
    const pathInfo = this.paths.get(routeId);
    if (!pathInfo) return;

    try {
      // Remove layer
      if (mapInstance.getLayer(pathInfo.layerName)) {
        mapInstance.removeLayer(pathInfo.layerName);
      }

      // Remove source
      if (mapInstance.getSource(pathInfo.sourceName)) {
        mapInstance.removeSource(pathInfo.sourceName);
      }

      this.paths.delete(routeId);
      console.log(`Removed simplified path for route ${routeId}`);
    } catch (error) {
      console.error(`Failed to remove path for route ${routeId}:`, error);
    }
  }

  // Clear all paths
  clearAllPaths(mapInstance) {
    if (!mapInstance) return;

    this.paths.forEach((pathInfo, routeId) => {
      this.removePath(routeId, mapInstance);
    });

    this.paths.clear();
    console.log('Cleared all simplified paths');
  }

  // Update visibility based on zoom level
  updateVisibility(mapInstance) {
    if (!mapInstance) return;

    const currentZoom = mapInstance.getZoom();
    const shouldBeVisible = currentZoom >= this.zoomThreshold;

    if (shouldBeVisible !== this.isVisible) {
      this.isVisible = shouldBeVisible;
      
      this.paths.forEach((pathInfo) => {
        if (mapInstance.getLayer(pathInfo.layerName)) {
          mapInstance.setLayoutProperty(
            pathInfo.layerName,
            'visibility',
            this.isVisible ? 'visible' : 'none'
          );
        }
      });

      console.log(`Simplified paths ${this.isVisible ? 'shown' : 'hidden'} at zoom level ${currentZoom.toFixed(2)}`);
    }
  }

  // Set zoom threshold for path visibility
  setZoomThreshold(threshold) {
    this.zoomThreshold = threshold;
    console.log(`SimplifiedPath zoom threshold set to ${threshold}`);
  }

  // Handle path click
  handlePathClick(properties, lngLat) {
    console.log('Simplified path clicked:', properties, 'at', lngLat);
    // TODO: Add path selection logic here
    // Could highlight the path, show popup, etc.
  }

  // Get path for specific route
  getPath(routeId) {
    return this.paths.get(routeId);
  }

  // Get all paths
  getAllPaths() {
    return Array.from(this.paths.values());
  }

  // Get path count
  getPathCount() {
    return this.paths.size;
  }

  // Check if paths are currently visible
  arePathsVisible() {
    return this.isVisible;
  }

  // Get current zoom threshold
  getZoomThreshold() {
    return this.zoomThreshold;
  }

  // Hide a specific path
  hidePath(routeId, mapInstance) {
    const pathInfo = this.paths.get(routeId);
    if (!pathInfo || !mapInstance) return;

    try {
      if (mapInstance.getLayer(pathInfo.layerName)) {
        mapInstance.setLayoutProperty(
          pathInfo.layerName,
          'visibility',
          'none'
        );
        console.log(`Hidden simplified path for route ${routeId}`);
      }
    } catch (error) {
      console.error(`Failed to hide path for route ${routeId}:`, error);
    }
  }

  // Show a specific path
  showPath(routeId, mapInstance) {
    const pathInfo = this.paths.get(routeId);
    if (!pathInfo || !mapInstance) return;

    try {
      if (mapInstance.getLayer(pathInfo.layerName)) {
        // Only show if global visibility is enabled and zoom is appropriate
        const shouldShow = this.isVisible;
        mapInstance.setLayoutProperty(
          pathInfo.layerName,
          'visibility',
          shouldShow ? 'visible' : 'none'
        );
        console.log(`${shouldShow ? 'Shown' : 'Kept hidden'} simplified path for route ${routeId}`);
      }
    } catch (error) {
      console.error(`Failed to show path for route ${routeId}:`, error);
    }
  }
}

// Create singleton instance
const simplifiedPathManager = new SimplifiedPathManager();

export default simplifiedPathManager;