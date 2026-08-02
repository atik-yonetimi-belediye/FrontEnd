import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({ fetchAllPages: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('../components/DashboardLayout', () => ({ default: ({ title, children }) => <main><h1>{title}</h1>{children}</main> }));
vi.mock('../services/pagination', () => ({ fetchAllPages: mocks.fetchAllPages }));
vi.mock('../services/api', () => ({
  default: { post: mocks.post, patch: mocks.patch, delete: mocks.delete },
  getApiErrorMessage: (error, fallback) => error?.response?.data?.message || fallback,
}));

import AdminAraclar from '../pages/admin/AdminAraclar';

const vehicles = [{ id: 5, plaka: '46 ABC 123', arac_turu: 'kati_atik', cavus_id: 1, cavus_ad_soyad: 'Selin Yılmaz', mahalle_ad: 'Haydar Bey', sofor_id: 2, sofor_ad_soyad: 'Ahmet Kaya', aktif_mi: true, silinebilir_mi: false, created_at: '2026-07-30T10:00:00Z' }];
const sergeants = [{ id: 1, ad_soyad: 'Selin Yılmaz', aktif_mi: true }, { id: 3, ad_soyad: 'Ayşe Demir', aktif_mi: true }];
const drivers = [{ id: 2, ad: 'Ahmet', soyad: 'Kaya', ad_soyad: 'Ahmet Kaya', arac_id: 5, aktif_mi: true }];

describe('yönetici araç yönetimi', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAllPages.mockImplementation((path) => ({ '/admin/araclar': vehicles, '/admin/cavuslar': sergeants, '/admin/soforler': drivers })[path]);
    mocks.post.mockResolvedValue({ data: { data: {} } });
    mocks.patch.mockResolvedValue({ data: { data: {} } });
    mocks.delete.mockResolvedValue({ data: { data: {} } });
  });

  it('araç sahibini ve tüm yönetim işlemlerini gösterir', async () => {
    render(<AdminAraclar />);
    expect(await screen.findByRole('heading', { name: '46 ABC 123' })).toBeInTheDocument();
    expect(screen.getByText('Şu anda bu çavuşa bağlı')).toBeInTheDocument();
    expect(screen.getByText('Selin Yılmaz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Düzenle/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Atama/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pasife Al/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sil/ })).toBeDisabled();
  });

  it('yeni aracı doğru veriyle oluşturur', async () => {
    render(<AdminAraclar />);
    await screen.findByRole('heading', { name: '46 ABC 123' });
    await userEvent.click(screen.getByRole('button', { name: /Yeni Araç Ekle/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Plaka'), '46 xyz 99');
    await userEvent.selectOptions(within(dialog).getByLabelText('Bağlı Çavuş'), '3');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/admin/araclar', { plaka: '46 XYZ 99', arac_turu: 'kati_atik', cavus_id: 3 }));
  });

  it('aktif aracı başka çavuşa aktarırken bağlı şoför uyarısını gösterir', async () => {
    render(<AdminAraclar />);
    await screen.findByRole('heading', { name: '46 ABC 123' });
    await userEvent.click(screen.getByRole('button', { name: /Düzenle/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('status')).toHaveTextContent('Şu anda Selin Yılmaz çavuşuna bağlı.');
    await userEvent.selectOptions(within(dialog).getByLabelText('Bağlı Çavuş'), '3');
    expect(within(dialog).getByText(/Ahmet Kaya adlı şoför de yeni çavuşa aktarılacak/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith('/admin/araclar/5', { plaka: '46 ABC 123', arac_turu: 'kati_atik', cavus_id: 3 }));
  });
});
