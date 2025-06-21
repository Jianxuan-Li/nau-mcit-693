import mapboxgl from 'mapbox-gl';

class MarkerManager {
  constructor() {
    this.markers = new Map(); // key: route.id, value: { marker, route, element }
    this.numberCounter = 0;
    this.routeNumberMap = new Map(); // key: route.id, value: display number
  }

  // Create a numbered marker element
  createNumberedMarker(number) {
    const el = document.createElement('div');
    el.className = 'route-marker';
    el.style.cssText = `
      width: 30px;
      height: 30px;
      background-color: #3B82F6;
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: transform 0.2s ease;
    `;
    el.textContent = number;
    
    // Add hover effect
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.1)';
    });
    
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
    });
    
    return el;
  }

  // Add or update markers for routes with simplified interface
  updateRouteMarkers(routeMarkers, mapInstance) {
    if (!mapInstance) {
      console.warn('No map instance available for adding markers');
      return;
    }

    // routeMarkers should be an array of { routeId, centerPoint, displayNumber, routeName }
    // where centerPoint is { lat, lng }
    
    // Keep track of current route IDs
    const currentRouteIds = new Set(routeMarkers.map(rm => rm.routeId));
    
    // Remove markers that are no longer in the routes list
    const markersToRemove = [];
    this.markers.forEach((markerData, routeId) => {
      if (!currentRouteIds.has(routeId)) {
        markersToRemove.push(routeId);
      }
    });
    
    markersToRemove.forEach(routeId => {
      this.removeMarker(routeId);
    });

    // Add new markers for routes that don't have them yet
    routeMarkers.forEach((routeMarker) => {
      if (!this.markers.has(routeMarker.routeId) && routeMarker.centerPoint) {
        this.addMarkerFromData(routeMarker, mapInstance);
      }
    });

    console.log(`Marker status: ${this.markers.size} markers on map for ${routeMarkers.length} routes`);
  }

  // Add marker from simplified data structure
  addMarkerFromData(routeMarker, mapInstance) {
    const { routeId, centerPoint, displayNumber, routeName } = routeMarker;
    
    if (this.markers.has(routeId)) {
      console.log(`Marker for route ${routeId} already exists, skipping`);
      return;
    }

    if (!centerPoint || !centerPoint.lat || !centerPoint.lng) {
      console.warn(`Route ${routeId} has no valid center_point, skipping marker`);
      return;
    }

    const markerElement = this.createNumberedMarker(displayNumber);
    
    const marker = new mapboxgl.Marker(markerElement)
      .setLngLat([centerPoint.lng, centerPoint.lat])
      .addTo(mapInstance);

    // Store marker data
    const markerData = {
      marker: marker,
      routeId: routeId,
      routeName: routeName,
      centerPoint: centerPoint,
      element: markerElement,
      displayNumber: displayNumber
    };

    this.markers.set(routeId, markerData);
    this.routeNumberMap.set(routeId, displayNumber);

    // Add click handler
    markerElement.addEventListener('click', () => {
      this.handleMarkerClick({ id: routeId, name: routeName });
    });

    console.log(`Added marker ${displayNumber} for route ${routeName || routeId}`);
  }

  // Legacy method for backward compatibility (can be removed later)
  addMarker(route, displayNumber, mapInstance) {
    const routeMarker = {
      routeId: route.id,
      centerPoint: route.center_point,
      displayNumber: displayNumber,
      routeName: route.name
    };
    this.addMarkerFromData(routeMarker, mapInstance);
  }

  // Remove a single marker
  removeMarker(routeId) {
    const markerData = this.markers.get(routeId);
    if (markerData) {
      markerData.marker.remove();
      this.markers.delete(routeId);
      this.routeNumberMap.delete(routeId);
      console.log(`Removed marker for route ${routeId}`);
    }
  }

  // Clear all markers
  clearAllMarkers() {
    this.markers.forEach((markerData) => {
      markerData.marker.remove();
    });
    this.markers.clear();
    this.routeNumberMap.clear();
    this.numberCounter = 0;
    console.log('Cleared all markers');
  }

  // Handle marker click
  handleMarkerClick(route) {
    console.log('Route marker clicked:', route.name || route.id);
    // TODO: Add route selection logic here
    // Could dispatch custom event or call callback
  }

  // Get marker for specific route
  getMarker(routeId) {
    return this.markers.get(routeId);
  }

  // Get all markers
  getAllMarkers() {
    return Array.from(this.markers.values());
  }

  // Get marker count
  getMarkerCount() {
    return this.markers.size;
  }

  // Get display number for route
  getRouteDisplayNumber(routeId) {
    return this.routeNumberMap.get(routeId);
  }
}

// Create singleton instance
const markerManager = new MarkerManager();

export default markerManager;