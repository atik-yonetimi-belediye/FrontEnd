import { test, expect } from '@playwright/test';

const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const paginated = (items) => ({ success: true, data: items, meta: { pagination: { page: 1, limit: 50, total: items.length, total_pages: 1 } } });
const container = { id: 5, konteyner_kodu: 'KNT-GOREV-05', tur: 'kati_atik', mahalle_id: 1, mahalle_ad: 'Haydarbey', cavus_id: 1, cavus_ad_soyad: 'Selin Yılmaz', latitude: 37.5858, longitude: 36.9145, aktif_mi: true, aktif_gorev_id: null, son_toplanma_tarihi: null };
const sergeants = [{ id: 1, ad_soyad: 'Selin Yılmaz', mahalle_id: 1, mahalle_ad: 'Haydarbey', aktif_mi: true }, { id: 3, ad_soyad: 'Ayşe Demir', mahalle_id: 2, mahalle_ad: 'Şazibey', aktif_mi: true }];
const drivers = [{ id: 2, ad_soyad: 'Ahmet Kaya', cavus_id: 1, plaka: '46 ABC 123', arac_turu: 'kati_atik', acik_gorev_sayisi: 0, uygun_mi: true }, { id: 4, ad_soyad: 'Deniz Kılınç', cavus_id: 1, plaka: '46 XYZ 789', arac_turu: 'geri_donusum', acik_gorev_sayisi: 1, uygun_mi: false, uygun_degil_nedeni: 'Araç türü konteynerle uyumsuz.' }];
const task = { id: 20, konteyner_id: 5, konteyner_kodu: 'KNT-GOREV-05', tur: 'kati_atik', latitude: 37.5858, longitude: 36.9145, mahalle_ad: 'Haydarbey', cavus_id: 1, cavus_ad_soyad: 'Selin Yılmaz', arac_id: 7, plaka: '46 ABC 123', oncelik: 'yuksek', durum: 'atandi', hedef_tarih: '2026-08-02T17:30:00+03:00', yonetici_notu: 'Öncelikli toplama', gecikti_mi: false };

async function mockTiles(page) {
  await page.route(/https:\/\/.*(?:basemaps\.cartocdn\.com|arcgisonline\.com|tile\.openstreetmap\.org)\/.*/, (route) => route.fulfill({ status: 200, contentType: 'image/png', body: tilePng }));
}

async function mockAdmin(page) {
  await mockTiles(page);
  await page.route('**/api/**', (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 20 } }) });
    if (path === '/api/auth/session') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { user: { id: 1, role: 'admin', ad_soyad: 'Admin Test' } } }) });
    if (path === '/api/admin/konteynerler') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paginated([container])) });
    if (path === '/api/admin/cavuslar') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paginated(sergeants)) });
    if (path === '/api/admin/konteynerler/5/uygun-soforler') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { konteyner: container, soforler: drivers } }) });
    if (path === '/api/admin/konteynerler/5/gorevler') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paginated([])) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paginated([])) });
  });
}

async function openTaskPanel(page) {
  await page.locator('.leaflet-marker-icon').first().click();
  await page.getByRole('button', { name: /Görev Ata/ }).evaluate((button) => button.click());
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('harita popupından uygun şoföre görev atanır', async ({ page }) => {
  await mockAdmin(page);
  await page.goto('/admin/harita');
  await openTaskPanel(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/Araç türü konteynerle uyumsuz/)).toBeVisible();
  await dialog.getByRole('button', { name: /Ahmet Kaya/ }).click();
  await dialog.getByLabel('Öncelik').selectOption('acil');
  await dialog.getByLabel('Görev Notu').fill('Acil saha görevi');
  const requestPromise = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/admin/konteynerler/5/gorevler');
  await dialog.getByRole('button', { name: 'Görevi Ata' }).click();
  expect((await requestPromise).postDataJSON()).toMatchObject({ cavus_id: 1, sofor_id: 2, oncelik: 'acil', yonetici_notu: 'Acil saha görevi' });
});

test('görev paneli 320–580 px aralığında yatay taşmaz', async ({ page }) => {
  await mockAdmin(page);
  await page.goto('/admin/harita');
  for (const width of [320, 360, 390, 430, 580]) {
    await page.setViewportSize({ width, height: 800 });
    await openTaskPanel(page);
    const modal = page.locator('.map-action-modal');
    const result = await modal.evaluate((element) => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, client: element.clientWidth, scroll: element.scrollWidth, right: element.getBoundingClientRect().right }));
    expect(result.document).toBeLessThanOrEqual(result.viewport);
    expect(result.scroll).toBeLessThanOrEqual(result.client);
    expect(result.right).toBeLessThanOrEqual(result.viewport + 0.5);
    await modal.getByRole('button', { name: 'Pencereyi kapat' }).click();
  }
});

test('şoför atanmış görevi görür ve yola çıkabilir', async ({ page }) => {
  await mockTiles(page);
  await page.route('**/api/**', (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 20, durum: 'devam_ediyor' } }) });
    if (path === '/api/auth/session') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { user: { id: 2, role: 'sofor', ad: 'Ahmet' } } }) });
    if (path === '/api/sofor/gorevler') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paginated([task])) });
    if (path === '/api/sofor/konteynerler') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paginated([container])) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paginated([])) });
  });
  await page.goto('/sofor');
  await expect(page.getByRole('heading', { name: 'Bana Atanan Görevler' })).toBeVisible();
  await expect(page.getByText('Öncelikli toplama')).toBeVisible();
  const requestPromise = page.waitForRequest((request) => request.method() === 'PATCH' && new URL(request.url()).pathname === '/api/sofor/gorevler/20/baslat');
  await page.getByRole('button', { name: /Yola Çık/ }).click();
  await requestPromise;
});
