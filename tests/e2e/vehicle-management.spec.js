import { test, expect } from '@playwright/test';

const paginated = (items) => ({ success: true, data: items, meta: { pagination: { page: 1, limit: 50, total: items.length, total_pages: 1 } } });
const vehicles = [{ id: 5, plaka: '46 ABC 123', arac_turu: 'kati_atik', cavus_id: 1, cavus_ad_soyad: 'Selin Yılmaz', mahalle_ad: 'Haydar Bey', sofor_id: 2, sofor_ad_soyad: 'Ahmet Kaya', aktif_mi: true, silinebilir_mi: false, created_at: '2026-07-30T10:00:00Z' }];
const sergeants = [{ id: 1, ad_soyad: 'Selin Yılmaz', aktif_mi: true }, { id: 3, ad_soyad: 'Ayşe Demir', aktif_mi: true }];
const drivers = [{ id: 2, ad: 'Ahmet', soyad: 'Kaya', ad_soyad: 'Ahmet Kaya', arac_id: 5, aktif_mi: true }];

async function mockApi(page) {
  await page.route('**/api/**', (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    if (path === '/api/auth/session') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { user: { id: 1, role: 'admin', ad_soyad: 'Admin Test' } } }) });
    const data = { '/api/admin/araclar': vehicles, '/api/admin/cavuslar': sergeants, '/api/admin/soforler': drivers }[path] || [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paginated(data)) });
  });
}

test.beforeEach(async ({ page }) => { await mockApi(page); await page.goto('/admin/araclar'); });

test('aktif araç başka çavuşa şoförüyle aktarılabilir ve mevcut sahibi görünür', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '46 ABC 123' })).toBeVisible();
  await expect(page.getByText('Şu anda bu çavuşa bağlı')).toBeVisible();
  await page.getByRole('button', { name: /Düzenle/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/Şu anda.*Selin Yılmaz.*çavuşuna bağlı/)).toBeVisible();
  await dialog.getByLabel('Bağlı Çavuş').selectOption('3');
  await expect(dialog.getByText(/Ahmet Kaya adlı şoför de yeni çavuşa aktarılacak/)).toBeVisible();
  const requestPromise = page.waitForRequest((request) => request.method() === 'PATCH' && new URL(request.url()).pathname === '/api/admin/araclar/5');
  await dialog.getByRole('button', { name: 'Kaydet' }).click();
  expect((await requestPromise).postDataJSON()).toEqual({ plaka: '46 ABC 123', arac_turu: 'kati_atik', cavus_id: 3 });
});

test('araç ekranı ve formu 320–580 px aralığında yatay taşmaz', async ({ page }) => {
  for (const width of [320, 360, 390, 430, 580]) {
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole('button', { name: /Yeni Araç Ekle/ }).click();
    const modal = page.locator('.vehicle-modal');
    await expect(modal).toBeVisible();
    const result = await modal.evaluate((element) => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, client: element.clientWidth, scroll: element.scrollWidth, right: element.getBoundingClientRect().right }));
    expect(result.document).toBeLessThanOrEqual(result.viewport);
    expect(result.scroll).toBeLessThanOrEqual(result.client);
    expect(result.right).toBeLessThanOrEqual(result.viewport + .5);
    await modal.getByRole('button', { name: 'Pencereyi kapat' }).click();
  }
});
