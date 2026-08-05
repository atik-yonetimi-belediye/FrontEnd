import { test, expect } from '@playwright/test';

const tilePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

const container = {
  id: 1,
  konteyner_kodu: 'GD-TEST-01',
  mahalle_ad: 'Haydarbey',
  tur: 'geri_donusum',
  latitude: 37.5858,
  longitude: 36.9145,
  aktif_mi: true,
};

const paginated = (items) => ({
  success: true,
  data: items,
  meta: { pagination: { page: 1, limit: 50, total: items.length, total_pages: 1 } },
});

async function mockRoleMap(page, role) {
  await page.route(/https:\/\/.*(?:basemaps\.cartocdn\.com|arcgisonline\.com)\/.*/, (route) => (
    route.fulfill({ status: 200, contentType: 'image/png', body: tilePng })
  ));

  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/session') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: { id: 1, role, ad_soyad: 'Harita Testi', permissions: ['*'] } } }),
      });
    }
    if (path === '/api/sirket/geri-donusum-talepleri') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paginated([])) });
    }
    if (path.includes('/konteynerler')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paginated([container])) });
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });
}

const roleMaps = [
  { role: 'admin', path: '/admin/harita' },
  { role: 'cavus', path: '/cavus/konteynerler' },
  { role: 'sofor', path: '/sofor' },
  { role: 'sirket', path: '/sirket', openMap: true },
];

for (const scenario of roleMaps) {
  test(`${scenario.role} haritası Sokak, Uydu ve Gece katmanlarını değiştirir`, async ({ page }) => {
    await mockRoleMap(page, scenario.role);
    await page.goto(scenario.path);

    if (scenario.openMap) {
      await page.getByRole('button', { name: 'Yeni Talep Oluştur' }).click();
    }

    const switcher = page.getByRole('group', { name: 'Harita görünümü' });
    await expect(switcher).toBeVisible();
    await expect(switcher.getByRole('button', { name: 'Sokak' })).toHaveAttribute('aria-pressed', 'true');
    await expect(switcher.getByRole('button', { name: 'Uydu' })).toBeVisible();
    await expect(switcher.getByRole('button', { name: 'Gece' })).toBeVisible();

    await switcher.getByRole('button', { name: 'Uydu' }).click();
    await expect(switcher.getByRole('button', { name: 'Uydu' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('img.leaflet-tile[src*="arcgisonline.com"]')).not.toHaveCount(0);

    await switcher.getByRole('button', { name: 'Gece' }).click();
    await expect(switcher.getByRole('button', { name: 'Gece' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('img.leaflet-tile[src*="dark_all"]')).not.toHaveCount(0);
  });
}

test('şirket haritasında seçilen konteyner talep verisine eklenir', async ({ page }) => {
  await mockRoleMap(page, 'sirket');
  await page.goto('/sirket');
  await page.getByRole('button', { name: 'Yeni Talep Oluştur' }).click();

  await page.getByLabel('Geri Dönüşüm Konteyneri (Opsiyonel)').selectOption('1');
  await page.getByLabel('Talep Başlığı').fill('Harita bağlantılı talep');
  await page.getByLabel('Tahmini Miktar (kg)').fill('25');
  await page.getByLabel('Açıklama').fill('Seçilen konteyner için geri dönüşüm talebi.');
  await page.getByLabel('Adres').fill('Haydarbey Mahallesi');

  const requestPromise = page.waitForRequest((request) => (
    request.method() === 'POST'
    && new URL(request.url()).pathname === '/api/sirket/geri-donusum-talepleri'
  ));
  await page.getByRole('button', { name: 'Talebi Gönder' }).click();
  const request = await requestPromise;
  expect(request.postDataJSON().konteyner_id).toBe(1);
});
