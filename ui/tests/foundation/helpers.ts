import { expect, type Page, type Frame } from '@playwright/test';
export async function foundationView(page: Page, view = 'console'): Promise<Frame> {
  let result: Frame | undefined;
  await expect.poll(async () => {
    for (const frame of page.frames()) {
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
  await page.keyboard.press('F1');
  const input = page.locator('.quick-input-widget input').first();
  await input.fill('>' + title);
  await expect(page.locator('.quick-input-list .monaco-list-row').filter({ hasText: title }).first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('.quick-input-widget')).toBeHidden();
}
