import { test, expect, foundationView, command } from './helpers';

test('desktop geometry, workbench theme and radio skin are independent', async ({ page }, testInfo) => {
  await page.goto('/code/');
  let view = await foundationView(page);
  await view.locator('details.console-preferences > summary').click();
  await view.locator('#radio-skin').selectOption('midnight');
  await command(page, 'Preferences: Color Theme', true);
  await page.locator('.quick-input-list .monaco-list-row').filter({ hasText: 'Light Modern' }).first().click();
  await expect(page.locator('.monaco-workbench')).toHaveClass(/\bvs\b/);
  await expect(view.locator('body')).toHaveAttribute('data-skin', 'midnight');
  for (const [width, height] of [[1280, 720], [1920, 1080], [2560, 1440]]) {
    await page.setViewportSize({ width, height });
    view = await foundationView(page);
    await view.locator('#vfo-a').scrollIntoViewIfNeeded();
    await expect(view.locator('#vfo-a')).toBeVisible();
    await expect.poll(() => view.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`desktop-${width}x${height}.png`) });
  }
});

test.describe('touch and portrait', () => {
  test.use({ hasTouch: true });
  test('narrow panels reflow and the first touch updates integer Hz', async ({ page }, testInfo) => {
    await page.goto('/code/');
    let view = await foundationView(page);
    await page.getByRole('button', { name: /^Toggle Primary Side Bar/ }).click();
    await page.getByRole('button', { name: /^Toggle Secondary Side Bar/ }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    view = await foundationView(page);
    await expect(view.locator('#radio-root')).toHaveAttribute('data-density', 'touch');
    const step = view.getByRole('button', { name: 'Step VFO A up 1 kHz', exact: true });
    const before = Number(await view.locator('#vfo-a').inputValue());
    await step.tap();
    await expect(view.locator('#vfo-a')).toHaveValue(String(before + 1000));
    await expect.poll(() => view.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await step.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: testInfo.outputPath('portrait-touch.png') });
  });
});

for (const scale of [1, 1.25, 1.5, 2]) {
  test.describe(`browser pixel ratio ${scale}`, () => {
    test.use({ deviceScaleFactor: scale, viewport: { width: 1920, height: 1080 } });
    test('VFO text and instruments render at the requested browser scale', async ({ page }, testInfo) => {
      await page.goto('/code/');
      const view = await foundationView(page);
      const metrics = { workbenchPixelRatio: await page.evaluate(() => devicePixelRatio),
        ...await view.evaluate(() => ({ instrumentPixelRatio: devicePixelRatio, width: innerWidth, canvasWidth: (document.getElementById('panadapter') as HTMLCanvasElement).width })) };
      // Chromium emulation can report a different DPR in isolated child frames.
      // Retain both measurements; do not label this physical Windows DPI proof.
      expect(metrics.workbenchPixelRatio).toBe(scale);
      expect(metrics.canvasWidth).toBeGreaterThan(0);
      await expect(view.locator('#vfo-a')).toBeVisible();
      await testInfo.attach('browser-scale', { body: JSON.stringify(metrics), contentType: 'application/json' });
      await page.screenshot({ path: testInfo.outputPath(`scale-${scale}.png`) });
    });
  });
}

test('the workbench and scripted panels load with internet requests blocked', async ({ page, context }) => {
  const external: string[] = [];
  const base = new URL(test.info().project.use.baseURL!);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    const local = url.hostname === base.hostname || url.hostname.endsWith('.' + base.hostname);
    if (local || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    external.push(url.href);
    return route.abort('internetdisconnected');
  });
  await page.goto('/code/');
  const view = await foundationView(page);
  await view.locator('details.console-preferences > summary').click();
  await expect(view.locator('#diagnostic-status')).toContainText('Echo received');
  expect(external).toEqual([]);
});
