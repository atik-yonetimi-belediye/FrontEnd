import React from 'react';
import { TileLayer } from 'react-leaflet';
import MapLayerSwitcher from './MapLayerSwitcher';
import useMapLayerPreference from './useMapLayerPreference';
import { MAP_LAYERS } from './mapLayers';

export default function MapBaseLayer({ placement = 'top-right' }) {
  const [layerKey, setLayerKey] = useMapLayerPreference();
  const layer = MAP_LAYERS[layerKey];

  return (
    <>
      <TileLayer
        key={layerKey}
        attribution={layer.attribution}
        url={layer.url}
        className={layer.className}
      />
      <MapLayerSwitcher value={layerKey} onChange={setLayerKey} placement={placement} />
    </>
  );
}
