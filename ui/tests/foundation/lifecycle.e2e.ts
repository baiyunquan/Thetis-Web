import { test, expect, foundationView, captureBrowserEvidence } from './helpers';

test('repeated cold browser sessions release asset and diagnostic clients', async ({ browser, request }, testInfo) => {
  test.setTimeout(180000); // Four complete cold starts, including native extension discovery.
  const measurements: unknown[] = [];
  try {
  for (let iteration = 0; iteration < 4; iteration++) {
    const started = Date.now();
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, ignoreHTTPSErrors: false });
    let evidence: ReturnType<typeof captureBrowserEvidence> | undefined;
    try {
      const page = await context.newPage();
      evidence = captureBrowserEvidence(page);
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
      measurements.push({ iteration, readyAndFirstInputMs: Date.now() - started, open, events: evidence.events });
    } finally {
      measurements.push({ iteration, events: evidence?.events, failures: evidence?.failures });
      evidence?.markClosing();
      await context.close();
    }
    expect(evidence?.failures).toEqual([]);
    let closed: any;
    await expect.poll(async () => {
      closed = await (await request.get('/code/health')).json();
      // The health request itself is the one remaining temporary HTTP client.
      return [closed.connections, closed.diagnosticConnections];
    }, { timeout: 15000 }).toEqual([1, 0]);
    measurements.push({ iteration, closed });
  }
  } finally {
    await testInfo.attach('connection-and-startup-measurements', { body: JSON.stringify({ browser: browser.version(), measurements }, null, 2), contentType: 'application/json' });
  }
});
