export const DEFAULT_MAP_LAYER = 'street';
export const MAP_LAYER_STORAGE_KEY = 'atik-map-layer';

export const MAP_LAYERS = Object.freeze({
  street: Object.freeze({
    label: 'Sokak',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  }),
  satellite: Object.freeze({
    label: 'Uydu',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
  }),
  dark: Object.freeze({
    label: 'Gece',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  }),
});

export const isMapLayer = (value) => Object.hasOwn(MAP_LAYERS, value);
