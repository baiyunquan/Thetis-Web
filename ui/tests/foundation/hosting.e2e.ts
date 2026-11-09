import { test, expect, foundationView } from './helpers';

test('foundation loads its native workbench, panel resources and diagnostic socket from Thetis', async ({ page, request }, testInfo) => {
  const health = await request.get('/code/health');
  expect(health.ok()).toBe(true);
  const info = await health.json();
  expect(info.radioInitialized).toBe(false);
  await page.goto('/code/');
  const view = await foundationView(page);
  await expect(view.locator('body')).toContainText(/Foundation|Demo/);
  await expect(page.locator('.monaco-workbench')).toBeVisible();
  await expect(page.getByRole('tab', { name: /Thetis Console/ }).first()).toBeVisible();
  for (const id of ['thetis.operation.power', 'thetis.operation.gain', 'thetis.receiver.meters', 'thetis.receiver.bands', 'thetis.receiver.modes', 'thetis.receiver.filters']) await foundationView(page, id);
  await page.screenshot({ path: testInfo.outputPath('initial-layout.png'), fullPage: true });
  await view.locator('details.console-preferences > summary').click();
  await view.locator('#echo-value').fill('browser-to-CSharp-proof');
  await view.locator('#diagnostic-echo').click();
  await expect(view.locator('#diagnostic-status')).toHaveText('Echo received: browser-to-CSharp-proof');
  await expect(page.getByText('Host: connected / Echo: replied', { exact: true })).toBeVisible();
  await expect(page.getByText('RX1 controls / Radio unavailable', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('foundation.png'), fullPage: true });
  await testInfo.attach('host-health', { body: JSON.stringify(info, null, 2), contentType: 'application/json' });
});
