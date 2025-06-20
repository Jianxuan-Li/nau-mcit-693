import mapboxgl from 'mapbox-gl';

let mapInstance = null;

export const initMap = (container, options = {}) => {
  if (!mapInstance) {
    mapInstance = new mapboxgl.Map({
      container,
      ...options
    });
  }
  return mapInstance;
};

export const getInstance = () => {
  return mapInstance;
};

export const destroyMap = () => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
};

export default {
  initMap,
  getInstance,
  destroyMap
};

