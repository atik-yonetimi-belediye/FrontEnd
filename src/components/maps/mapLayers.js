const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY?.trim();
const cartoParam = cartoApiKey ? `?api_key=${encodeURIComponent(cartoApiKey)}` : '';

export const DEFAULT_MAP_LAYER = 'street';
export const MAP_LAYER_STORAGE_KEY = 'atik-map-layer';

export const MAP_LAYERS = Object.freeze({
  street: Object.freeze({
    label: 'Sokak',
    url: cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${cartoParam}`
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: cartoApiKey
      ? '&copy; CARTO'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }),
  satellite: Object.freeze({
    label: 'Uydu',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
  }),
  dark: Object.freeze({
    label: 'Gece',
    url: cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${cartoParam}`
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: cartoApiKey
      ? '&copy; CARTO'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: cartoApiKey ? undefined : 'map-tiles-dark',
  }),
});

export const isMapLayer = (value) => Object.hasOwn(MAP_LAYERS, value);

