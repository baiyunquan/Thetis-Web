import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Historical spike runner: requires the original Hello World distribution.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(path.join(repo, 'submodules/vscode/package.json'));
const { chromium } = require('playwright');
const artifacts = path.join(repo, 'build/code-web-test');
await fs.mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const messages = [];
const failures = [];
page.on('console', message => messages.push({ type: message.type(), text: message.text() }));
page.on('pageerror', error => failures.push({ type: 'pageerror', text: error.message }));
page.on('requestfailed', request => failures.push({ type: 'requestfailed', url: request.url(), text: request.failure()?.errorText }));
page.on('response', response => {
  if (response.status() >= 400) failures.push({ type: 'http', url: response.url(), status: response.status() });
});
async function helloFrame() {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      // Frame-scoped visibility can be true while Code still hides its pending iframe.
      const element = await frame.frameElement().catch(() => null);
      if (!element || await element.getAttribute('id') !== 'active-frame' || !await element.isVisible()) continue;
      if (await frame.getByRole('heading', { name: 'Hello World', exact: true }).isVisible().catch(() => false)) return frame;
    }
    await page.waitForTimeout(250);
  }
  throw new Error('Hello World did not open in the browser extension host.');
}
try {
  const response = await page.goto('http://localhost:50001/code/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  assert.equal(response.status(), 200);
  await page.locator('.monaco-workbench').waitFor({ timeout: 60000 });
  let frame = await helloFrame();
  await frame.getByRole('button', { name: 'Test Extension Host' }).click();
  await frame.getByText('Extension host replied: 1', { exact: true }).waitFor();
  await frame.getByRole('button', { name: 'Test Extension Host' }).click();
  await frame.getByText('Extension host replied: 2', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'hello-world.png'), fullPage: true });

  // The contributed command must reveal the same panel instead of creating another one.
  await page.keyboard.press('F1');
  await page.getByRole('textbox').fill('>Thetis: Hello World');
  await page.keyboard.press('Enter');
  frame = await helloFrame();
  await frame.getByText('Extension host replied: 2', { exact: true }).waitFor();
  assert.equal(await page.locator('.tabs-container .tab').count(), 1);

  await page.reload({ waitUntil: 'domcontentloaded' });
  frame = await helloFrame();
  await frame.getByRole('button', { name: 'Test Extension Host' }).click();
  await frame.getByText('Extension host replied: 1', { exact: true }).waitFor();
  assert.equal(failures.length, 0, 'Page and resource failures: ' + JSON.stringify(failures));
  console.log('PASS: real Code OSS workbench, browser extension activation, two message round trips, command reuse, reload.');
} catch (error) {
  await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true }).catch(() => {});
  console.error('Frames:', page.frames().map(frame => frame.url()));
  console.error('Browser errors:', failures);
  console.error('Browser console:', messages.filter(item => item.type === 'error' || item.type === 'warning' || item.text.includes('[hello-')));
  throw error;
} finally {
  await fs.writeFile(path.join(artifacts, 'browser-log.json'), JSON.stringify({ messages, failures }, null, 2));
  await browser.close();
}
