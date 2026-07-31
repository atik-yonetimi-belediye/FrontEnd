import { test, expect } from '@playwright/test';
import { mockPublicApi } from './helpers';

const roles = [
  ['denizk', 'admin', '/admin'],
  ['05052223344', 'cavus', '/cavus'],
  ['05053334455', 'sofor', '/sofor'],
  ['03441112233', 'sirket', '/sirket'],
];

for (const [identifier, role, path] of roles) {
  test(`${role} rolü otomatik olarak kendi paneline yönlenir`, async ({ page }) => {
    await mockPublicApi(page);
    await page.route('**/api/auth/login', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { user: { id: 1, role, ad_soyad: 'Test Kullanıcı' } } }) }));
    await page.goto('/login');
    await page.getByLabel('Telefon numarası veya kullanıcı adı').fill(identifier);
    await page.getByLabel('Şifre').fill('test-parola');
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  });
}
