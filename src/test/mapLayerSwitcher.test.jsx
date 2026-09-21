import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-leaflet', () => ({
  TileLayer: ({ url, attribution }) => (
    <div data-testid="tile-layer" data-url={url} data-attribution={attribution} />
  ),
}));

import MapBaseLayer from '../components/maps/MapBaseLayer';
import { MAP_LAYER_STORAGE_KEY, MAP_LAYERS } from '../components/maps/mapLayers';

describe('ortak harita katmanı kontrolü', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('Sokak, Uydu ve Gece katmanlarını erişilebilir düğmelerle sunar', () => {
    render(<MapBaseLayer />);

    const street = screen.getByRole('button', { name: 'Sokak' });
    const satellite = screen.getByRole('button', { name: 'Uydu' });
    const dark = screen.getByRole('button', { name: 'Gece' });

    expect(street).toHaveAttribute('aria-pressed', 'true');
    expect(satellite).toHaveAttribute('aria-pressed', 'false');
    expect(dark).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('tile-layer').dataset.url).toBe(MAP_LAYERS.street.url);
  });

  it('katmanı değiştirir ve tercihi sonraki render için saklar', () => {
    const { unmount } = render(<MapBaseLayer />);
    fireEvent.click(screen.getByRole('button', { name: 'Uydu' }));

    expect(screen.getByRole('button', { name: 'Uydu' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tile-layer').dataset.url).toContain('arcgisonline.com');
    expect(localStorage.getItem(MAP_LAYER_STORAGE_KEY)).toBe('satellite');

    unmount();
    render(<MapBaseLayer />);
    expect(screen.getByRole('button', { name: 'Uydu' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('geçersiz saklanmış tercihte güvenli biçimde Sokak katmanına döner', () => {
    localStorage.setItem(MAP_LAYER_STORAGE_KEY, 'bilinmeyen-katman');
    render(<MapBaseLayer />);

    expect(screen.getByRole('button', { name: 'Sokak' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tile-layer').dataset.url).toBe(MAP_LAYERS.street.url);
  });
});
