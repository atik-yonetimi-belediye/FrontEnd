import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({ fetchAllPages: vi.fn(), get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('leaflet', () => ({ default: { divIcon: vi.fn(() => ({})) } }));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
}));
vi.mock('../components/maps/MapBaseLayer', () => ({ default: () => <div>Harita katmanı</div> }));
vi.mock('../components/DashboardLayout', () => ({ default: ({ title, children }) => <main><h1>{title}</h1>{children}</main> }));
vi.mock('../services/pagination', () => ({ fetchAllPages: mocks.fetchAllPages }));
vi.mock('../services/api', () => ({
  default: { get: mocks.get, post: mocks.post, patch: mocks.patch },
  getApiErrorMessage: (error, fallback) => error?.response?.data?.message || fallback,
}));

import AdminMap from '../pages/admin/AdminMap';

const container = { id: 5, konteyner_kodu: 'KNT-TEST-05', tur: 'kati_atik', mahalle_id: 1, mahalle_ad: 'Haydarbey', cavus_id: 1, cavus_ad_soyad: 'Selin Yılmaz', latitude: 37.5, longitude: 36.9, aktif_mi: true, aktif_gorev_id: null, son_toplanma_tarihi: null };
const sergeants = [{ id: 1, ad_soyad: 'Selin Yılmaz', mahalle_id: 1, mahalle_ad: 'Haydarbey', aktif_mi: true }];
const drivers = [{ id: 2, ad_soyad: 'Ahmet Kaya', cavus_id: 1, plaka: '46 ABC 123', arac_turu: 'kati_atik', acik_gorev_sayisi: 0, uygun_mi: true }];

describe('yönetici harita görev işlemleri', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAllPages.mockImplementation((path) => ({ '/admin/konteynerler': [container], '/admin/cavuslar': sergeants, '/admin/konteynerler/5/gorevler': [] })[path] || []);
    mocks.get.mockResolvedValue({ data: { data: { soforler: drivers } } });
    mocks.post.mockResolvedValue({ data: { data: { id: 10 } } });
    mocks.patch.mockResolvedValue({ data: { data: {} } });
  });

  it('popup içinde sorumlu ve görev işlemlerini gösterir', async () => {
    render(<AdminMap />);
    expect(await screen.findByText('KNT-TEST-05')).toBeInTheDocument();
    expect(screen.getByText('Selin Yılmaz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Görev Ata/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sorumlu/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Detaylar/ })).toBeInTheDocument();
  });

  it('uygun şoförü seçerek görev oluşturur', async () => {
    render(<AdminMap />);
    await screen.findByText('KNT-TEST-05');
    await userEvent.click(screen.getByRole('button', { name: /Görev Ata/ }));
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /Ahmet Kaya/ })).toBeEnabled());
    await userEvent.click(within(dialog).getByRole('button', { name: /Ahmet Kaya/ }));
    await userEvent.selectOptions(within(dialog).getByLabelText('Öncelik'), 'yuksek');
    await userEvent.type(within(dialog).getByLabelText('Görev Notu'), 'Öncelikli toplama');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Görevi Ata' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/admin/konteynerler/5/gorevler', {
      cavus_id: 1,
      sofor_id: 2,
      oncelik: 'yuksek',
      hedef_tarih: null,
      yonetici_notu: 'Öncelikli toplama',
      farkli_mahalle_onayi: false,
    }));
  });
});
