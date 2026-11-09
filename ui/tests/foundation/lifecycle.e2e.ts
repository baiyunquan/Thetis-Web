import { test, expect, foundationView } from './helpers';

test('repeated cold browser sessions release asset and diagnostic clients', async ({ browser, request }, testInfo) => {
  const measurements: unknown[] = [];
  for (let iteration = 0; iteration < 4; iteration++) {
    const started = Date.now();
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, ignoreHTTPSErrors: false });
    try {
      const page = await context.newPage();
      await page.goto('/code/');
      const view = await foundationView(page);
      const initial = Number(await view.locator('#vfo-a').inputValue());
      await view.getByRole('button', { name: 'Step VFO A up 1 kHz', exact: true }).click();
      await expect(view.locator('#vfo-a')).toHaveValue(String(initial + 1000));
      await view.locator('details.console-preferences > summary').click();
      await expect(view.locator('#diagnostic-status')).toContainText('Echo received');
      const open = await (await request.get('/code/health')).json();
      expect(open.radioInitialized).toBe(false);
      expect(open.diagnosticConnections).toBe(1);
      measurements.push({ iteration, readyAndFirstInputMs: Date.now() - started, open });
    } finally { await context.close(); }
    let closed: any;
    await expect.poll(async () => {
      closed = await (await request.get('/code/health')).json();
      // The health request itself is the one remaining temporary HTTP client.
      return [closed.connections, closed.diagnosticConnections];
    }, { timeout: 15000 }).toEqual([1, 0]);
    measurements.push({ iteration, closed });
  }
  await testInfo.attach('connection-and-startup-measurements', { body: JSON.stringify({ browser: browser.version(), measurements }, null, 2), contentType: 'application/json' });
});
