export async function mockPublicApi(page) {
  await page.route('**/api/auth/session', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) }));
  await page.route('**/api/konteynerler**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [{ id: 1, konteyner_kodu: 'TEST-01', mahalle_ad: 'Test', tur: 'kati_atik', latitude: 37.58, longitude: 36.91 }], meta: { pagination: { page: 1, total_pages: 1 } } }) }));
  await page.route('**/api/public/stats', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { aktif_konteyner: 1, bugun_toplanan: 0, cozulen_sikayet: 0, tamamlanan_geri_donusum_talebi: 0, tamamlanan_tahmini_miktar: 0 } }) }));
}
