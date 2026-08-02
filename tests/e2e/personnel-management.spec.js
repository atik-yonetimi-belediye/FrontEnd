import { test, expect } from '@playwright/test';

const paginated = (items) => ({
  success: true,
  data: items,
  meta: { pagination: { page: 1, limit: 50, total: items.length, total_pages: 1 } },
});

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
  toplama_kaydi_sayisi: 4,
  created_at: '2026-07-30T10:00:00Z',
}];

async function mockPersonnelApi(page) {
  await page.route('**/api/**', (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    }
    if (path === '/api/auth/session') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { user: { id: 1, role: 'admin', ad_soyad: 'Admin Test' } } }) });
    }
    const data = {
      '/api/admin/cavuslar': cavuslar,
      '/api/admin/soforler': soforler,
      '/api/mahalleler': [{ id: 1, ad: 'Haydar Bey' }, { id: 2, ad: 'Şazibey' }],
      '/api/admin/araclar': [{ id: 5, plaka: '46 ABC 123', arac_turu: 'kati_atik', cavus_id: 1, aktif_mi: true }],
    }[path] || [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paginated(data)) });
  });
}

test.beforeEach(async ({ page }) => {
  await mockPersonnelApi(page);
  await page.goto('/admin/personel');
});

test('personel yönetimi mobil ekranda taşmadan tüm işlemleri sunar', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Selin Yılmaz' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Yeni Çavuş Ekle/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Düzenle' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Şifre' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pasife Al' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sil' })).toBeDisabled();

  await page.getByRole('tab', { name: /Şoförler/ }).click();
  await expect(page.getByRole('heading', { name: 'Ahmet Kaya' })).toBeVisible();
  await expect(page.getByText(/46 ABC 123/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('yeni çavuş ekleme ve pasife alma isteklerini doğru gönderir', async ({ page }) => {
  await page.getByRole('button', { name: /Yeni Çavuş Ekle/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Ad Soyad').fill('Ayşe Demir');
  await dialog.getByLabel('Telefon').fill('05051112233');
  await dialog.getByLabel('Sorumlu Mahalle').selectOption('2');
  await dialog.getByLabel('İlk Şifre').fill('GucluSifre123');

  const createRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/admin/cavuslar');
  await dialog.getByRole('button', { name: 'Kaydet' }).click();
  expect((await createRequest).postDataJSON()).toEqual({
    ad_soyad: 'Ayşe Demir',
    telefon: '05051112233',
    mahalle_id: 2,
    sifre: 'GucluSifre123',
  });

  await expect(page.getByText('Çavuş başarıyla eklendi.')).toBeVisible();
  await page.getByRole('button', { name: 'Pasife Al' }).click();
  const statusDialog = page.getByRole('dialog');
  const statusRequest = page.waitForRequest((request) => request.method() === 'PATCH' && new URL(request.url()).pathname === '/api/admin/cavuslar/1/durum');
  await statusDialog.getByRole('button', { name: 'Pasife Al' }).click();
  expect((await statusRequest).postDataJSON()).toEqual({ aktif_mi: false });
});

test('personel formu 320–580 px aralığında modal sınırları içinde kalır', async ({ page }) => {
  for (const width of [320, 360, 390, 430, 580]) {
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole('tab', { name: /Şoförler/ }).click();
    await page.getByRole('button', { name: /Yeni Şoför Ekle/ }).click();

    const modal = page.locator('.personnel-modal');
    await expect(modal).toBeVisible();
    const measurements = await modal.evaluate((element) => {
      const modalRect = element.getBoundingClientRect();
      const fields = [...element.querySelectorAll('input, select')].map((field) => {
        const rect = field.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      });
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        modalLeft: modalRect.left,
        modalRight: modalRect.right,
        modalClientWidth: element.clientWidth,
        modalScrollWidth: element.scrollWidth,
        fields,
      };
    });

    expect(measurements.documentWidth, `${width}px sayfa taşması`).toBeLessThanOrEqual(measurements.viewportWidth);
    expect(measurements.modalLeft, `${width}px modal sol sınırı`).toBeGreaterThanOrEqual(-0.5);
    expect(measurements.modalRight, `${width}px modal sağ sınırı`).toBeLessThanOrEqual(measurements.viewportWidth + 0.5);
    expect(measurements.modalScrollWidth, `${width}px modal iç taşması`).toBeLessThanOrEqual(measurements.modalClientWidth);
    for (const field of measurements.fields) {
      expect(field.left, `${width}px alan sol sınırı`).toBeGreaterThanOrEqual(measurements.modalLeft - 0.5);
      expect(field.right, `${width}px alan sağ sınırı`).toBeLessThanOrEqual(measurements.modalRight + 0.5);
    }

    await modal.getByRole('button', { name: 'Pencereyi kapat' }).click();
  }
});
