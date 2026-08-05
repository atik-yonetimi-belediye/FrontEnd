import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPublicApi } from './helpers';

test.beforeEach(async ({ page }) => { await mockPublicApi(page); });

test('vatandaş ana sayfa ve şikâyet formu mobilde erişilebilirdir', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Çevrenizi Korumak/ })).toBeVisible();
  await page.getByRole('link', { name: 'Şikayet Bildir' }).click();
  await expect(page.getByRole('heading', { name: 'Şikayet Bildir' })).toBeVisible();
  await expect(page.locator('.complaint-page .form-container.animate-fade-in')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('sikayet-mobil.png'), fullPage: true });
  const metrics = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(metrics.scrollWidth).toBe(metrics.width);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact))).toEqual([]);
});
