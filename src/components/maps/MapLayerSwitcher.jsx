import React from 'react';
import { Map, Moon, Satellite } from 'lucide-react';
import { MAP_LAYERS } from './mapLayers';
import './MapLayerSwitcher.css';

const LAYER_ICONS = {
  street: Map,
  satellite: Satellite,
  dark: Moon,
};

export default function MapLayerSwitcher({ value, onChange, placement = 'top-right' }) {
  return (
    <div
      className={`map-layer-switcher map-layer-switcher--${placement}`}
      role="group"
      aria-label="Harita görünümü"
    >
      {Object.entries(MAP_LAYERS).map(([key, layer]) => {
        const Icon = LAYER_ICONS[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            className={`map-layer-button ${active ? 'active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(key)}
          >
            <Icon size={15} aria-hidden="true" />
            <span>{layer.label}</span>
          </button>
        );
      })}
    </div>
  );
}
