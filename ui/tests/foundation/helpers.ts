import { test as base, expect, type Page, type Frame } from '@playwright/test';
export const test = base.extend<{ browserEvidence: void }>({
  browserEvidence: [async ({ page }, use, testInfo) => {
    const events: unknown[] = [];
    page.on('console', message => events.push({ kind: 'console', level: message.type(), text: message.text(), location: message.location() }));
    page.on('pageerror', error => events.push({ kind: 'pageerror', message: error.message, stack: error.stack }));
    page.on('requestfailed', request => events.push({ kind: 'requestfailed', url: request.url(), failure: request.failure() }));
    page.on('response', response => { if (response.status() >= 400) events.push({ kind: 'http-error', url: response.url(), status: response.status() }); });
    await use();
    await testInfo.attach('browser-network-log', { body: JSON.stringify(events, null, 2), contentType: 'application/json' });
  }, { auto: true }]
});
export { expect };
export async function foundationView(page: Page, view = 'console'): Promise<Frame> {
  let result: Frame | undefined;
  await expect.poll(async () => {
    for (const frame of page.frames()) {
      // frameElement is only defined for child frames. Firefox asserts for the main frame.
      if (!frame.parentFrame() || frame.isDetached()) continue;
      const element = await frame.frameElement().catch(() => null);
      if (!element || await element.getAttribute('id') !== 'active-frame' || !await element.isVisible()) continue;
      const body = frame.locator(`body[data-view="${view}"]`);
      if (await body.count() && await body.isVisible()) {
        const ready = await body.evaluate(body => body.dataset.ready === 'true' || body.querySelector('[data-ready="true"]') !== null);
        if (ready) { result = frame; return true; }
      }
    }
    return false;
  }, { message: `Thetis ${view} should have an active, visible, ready webview`, timeout: 60000 }).toBe(true);
  return result!;
}
export async function command(page: Page, title: string) {
  await expect(page.locator('.monaco-workbench')).toBeVisible();
  await page.keyboard.press('F1');
  const input = page.locator('.quick-input-widget input').first();
  await input.fill('>' + title);
  await expect(page.locator('.quick-input-list .monaco-list-row').filter({ hasText: title }).first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('.quick-input-widget')).toBeHidden();
}
