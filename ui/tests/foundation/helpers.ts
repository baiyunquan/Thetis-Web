import { test as base, expect, type Page, type Frame } from '@playwright/test';
import { knownUpstreamError, replacedWebviewPlaceholder } from './browser-errors';
const viewRecreations = new WeakSet<Page>();
/** Subsequent cancellations of Code documents disposed by native view actions remain in raw logs. */
export function recordNativeViewRecreation(page: Page) { viewRecreations.add(page); }
export const test = base.extend<{ browserEvidence: void }>({
  browserEvidence: [async ({ page }, use, testInfo) => {
    const events: unknown[] = [];
    const failures: string[] = [];
    page.on('console', message => events.push({ kind: 'console', level: message.type(), text: message.text(), location: message.location() }));
    page.on('pageerror', error => {
      const known = knownUpstreamError(error);
      events.push({ kind: 'pageerror', message: error.message, stack: error.stack, knownUpstream: known });
      if (!known) failures.push(error.stack ?? error.message);
    });
    page.on('requestfailed', request => {
      const expected = replacedWebviewPlaceholder(request.url(), request.failure()?.errorText, viewRecreations.has(page) && request.isNavigationRequest());
      events.push({ kind: 'requestfailed', url: request.url(), failure: request.failure(), expectedPlaceholderCancellation: expected });
      if (!expected) failures.push(`${request.failure()?.errorText} ${request.url()}`);
    });
    page.on('response', response => {
      events.push({ kind: 'response', url: response.url(), status: response.status(), bytes: response.headers()['content-length'], timing: response.request().timing() });
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    await use();
    await testInfo.attach('browser-network-log', { body: JSON.stringify(events, null, 2), contentType: 'application/json' });
    if (testInfo.status === testInfo.expectedStatus) expect(failures, 'unexpected browser or network errors (raw log attached)').toEqual([]);
  }, { auto: true }]
});
export { expect };
export async function foundationView(page: Page, view = 'console'): Promise<Frame> {
  let result: Frame | undefined;
  await expect.poll(async () => {
    for (const frame of page.frames()) {
      if (!frame.parentFrame() || frame.isDetached()) continue;
      const body = frame.locator(`body[data-view="${view}"][data-ready="true"]`);
      if (!await body.count() || !await body.isVisible()) continue;
      const owner = await frame.frameElement();
      if (await owner.getAttribute('id') === 'active-frame' && await owner.isVisible()) { result = frame; return true; }
    }
    return false;
  }, { message: `Thetis ${view} should have an active, visible, ready webview`, timeout: 60000 }).toBe(true);
  return result!;
}
export async function command(page: Page, title: string, pickerFollows = false) {
  await expect(page.locator('.monaco-workbench')).toBeVisible();
  await page.keyboard.press('F1');
  const input = page.locator('.quick-input-widget input').first();
  await input.fill('>' + title);
  await page.locator('.quick-input-list .monaco-list-row').filter({ hasText: title }).first().click();
  if (!pickerFollows) await expect(page.locator('.quick-input-widget')).toBeHidden();
}

/** Read-only qualification of Code's asynchronous native storage, never a product state writer. */
export async function waitNativeStorage(page: Page, fragments: string[]) {
  await expect.poll(() => page.evaluate(async fragments => {
    const values: string[] = [];
    for (const info of await indexedDB.databases()) {
      if (!info.name?.startsWith('vscode-web-state-db-')) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(info.name!);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        if (!db.objectStoreNames.contains('ItemTable')) continue;
        const rows = await new Promise<unknown[]>((resolve, reject) => {
          const request = db.transaction('ItemTable', 'readonly').objectStore('ItemTable').getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        values.push(...rows.map(String));
      } finally { db.close(); }
    }
    return fragments.every(fragment => values.some(value => value.includes(fragment)));
  }, fragments), { message: 'native Code state should reach IndexedDB before a raw browser reload', timeout: 20000 }).toBe(true);
}
