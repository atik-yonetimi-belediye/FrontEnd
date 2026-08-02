import { useCallback, useState } from 'react';
import { DEFAULT_MAP_LAYER, isMapLayer, MAP_LAYER_STORAGE_KEY } from './mapLayers';

const readStoredLayer = () => {
  try {
    const storedLayer = localStorage.getItem(MAP_LAYER_STORAGE_KEY);
    return isMapLayer(storedLayer) ? storedLayer : DEFAULT_MAP_LAYER;
  } catch {
    return DEFAULT_MAP_LAYER;
  }
};

export default function useMapLayerPreference() {
  const [layer, setLayerState] = useState(readStoredLayer);

  const setLayer = useCallback((nextLayer) => {
    const safeLayer = isMapLayer(nextLayer) ? nextLayer : DEFAULT_MAP_LAYER;
    setLayerState(safeLayer);
    try {
      localStorage.setItem(MAP_LAYER_STORAGE_KEY, safeLayer);
    } catch {
      // Harita tercihi saklanamazsa mevcut oturumda çalışmaya devam eder.
    }
  }, []);

  return [layer, setLayer];
}
