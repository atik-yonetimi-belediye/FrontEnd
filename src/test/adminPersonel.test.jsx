import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  fetchAllPages: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../components/DashboardLayout', () => ({
  default: ({ title, children }) => <main><h1>{title}</h1>{children}</main>,
}));

vi.mock('../services/pagination', () => ({ fetchAllPages: mocks.fetchAllPages }));
vi.mock('../services/api', () => ({
  default: { post: mocks.post, patch: mocks.patch, delete: mocks.delete },
  getApiErrorMessage: (error, fallback = 'İşlem başarısız') => error?.response?.data?.message || fallback,
}));

import AdminPersonel from '../pages/admin/AdminPersonel';

const cavuslar = [{
  id: 1,
  ad_soyad: 'Selin Yılmaz',
  telefon: '05052223344',
  mahalle_id: 1,
  mahalle_ad: 'Haydar Bey',
  aktif_mi: true,
  sofor_sayisi: 1,
  arac_sayisi: 1,
  konteyner_sayisi: 2,
  created_at: '2026-07-30T10:00:00Z',
}];
const soforler = [{
  id: 2,
  ad: 'Ahmet',
  soyad: 'Kaya',
  telefon: '05053334455',
  cavus_id: 1,
  cavus_ad_soyad: 'Selin Yılmaz',
  mahalle_ad: 'Haydar Bey',
  arac_id: 5,
  plaka: '46 ABC 123',
  aktif_mi: true,
  toplama_kaydi_sayisi: 3,
  created_at: '2026-07-30T10:00:00Z',
}];
const mahalleler = [{ id: 1, ad: 'Haydar Bey' }, { id: 2, ad: 'Şazibey' }];
const araclar = [{ id: 5, plaka: '46 ABC 123', arac_turu: 'kati_atik', cavus_id: 1, aktif_mi: true }];

function mockLists() {
  mocks.fetchAllPages.mockImplementation((path) => ({
    '/admin/cavuslar': cavuslar,
    '/admin/soforler': soforler,
    '/mahalleler': mahalleler,
    '/admin/araclar': araclar,
  })[path]);
}

describe('yönetici personel yönetimi', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mockLists();
    mocks.post.mockResolvedValue({ data: { data: {} } });
    mocks.patch.mockResolvedValue({ data: { data: {} } });
    mocks.delete.mockResolvedValue({ data: { data: {} } });
  });

  it('çavuş ve şoför işlemlerini erişilebilir kontrollerle gösterir', async () => {
    render(<AdminPersonel />);

    expect(await screen.findByText('Selin Yılmaz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yeni Çavuş Ekle/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Düzenle/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Şifre/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pasife Al/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sil/ })).toBeDisabled();

    await userEvent.click(screen.getByRole('tab', { name: /Şoförler/ }));
    expect(screen.getByText('Ahmet Kaya')).toBeInTheDocument();
    expect(screen.getByText(/46 ABC 123/)).toBeInTheDocument();
  });

  it('yeni çavuş formunu doğrulayıp doğru API isteğini gönderir', async () => {
    render(<AdminPersonel />);
    await screen.findByText('Selin Yılmaz');
    await userEvent.click(screen.getByRole('button', { name: /Yeni Çavuş Ekle/ }));

    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Ad Soyad' }), 'Ayşe Demir');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Telefon' }), '5431112233');
    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: 'Sorumlu Mahalle' }), '2');
    await userEvent.type(within(dialog).getByLabelText('İlk Şifre'), 'GucluSifre123');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/admin/cavuslar', {
      ad_soyad: 'Ayşe Demir',
      telefon: '5431112233',
      mahalle_id: 2,
      sifre: 'GucluSifre123',
    }));
  });

  it('pasife alma işlemini açık onaydan sonra gönderir', async () => {
    render(<AdminPersonel />);
    await screen.findByText('Selin Yılmaz');
    await userEvent.click(screen.getByRole('button', { name: 'Pasife Al' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/bağlı aktif şoförler de pasife alınır/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pasife Al' }));

    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith('/admin/cavuslar/1/durum', { aktif_mi: false }));
  });
});
