import { test, expect } from '@playwright/test';
import { foundationView } from './helpers';

test('foundation loads its native workbench, panel resources and diagnostic socket from Thetis', async ({ page, request }, testInfo) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') failures.push(`${request.failure()?.errorText} ${request.url()}`); });
  const health = await request.get('/code/health');
  expect(health.ok()).toBe(true);
  const info = await health.json();
  expect(info.radioInitialized).toBe(false);
  await page.goto('/code/');
  const view = await foundationView(page);
  await expect(view.locator('body')).toContainText(/Foundation|Demo/);
  await expect(page.locator('.monaco-workbench')).toBeVisible();
  await expect(page.getByRole('tab', { name: /Thetis Console/ }).first()).toBeVisible();
  await view.locator('details.console-preferences > summary').click();
  await view.locator('#echo-value').fill('browser-to-CSharp-proof');
  await view.locator('#diagnostic-echo').click();
  await expect(view.locator('#diagnostic-status')).toHaveText('Echo received: browser-to-CSharp-proof');
  await page.screenshot({ path: testInfo.outputPath('foundation.png'), fullPage: true });
  await testInfo.attach('host-health', { body: JSON.stringify(info, null, 2), contentType: 'application/json' });
  expect(failures).toEqual([]);
});
