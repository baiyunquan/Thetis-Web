import { test, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { adaptWebviewController, CLAIM_HANDLER_SOURCE } from '../../code-oss-host/compat/webview-controller.mjs';
const pin = 'fdefc478b9148c1a47f913b3ec618a1226d9f600';
const base = new URL('../../../submodules/vscode/src/vs/workbench/contrib/webview/browser/pre/', import.meta.url);
const original = { html: fs.readFileSync(new URL('index.html', base), 'utf8'), worker: fs.readFileSync(new URL('service-worker.js', base), 'utf8') };
test('the pinned controller adapter preserves strict CSP with the actual inline-script digest', () => {
  const adapted = adaptWebviewController(pin, original);
  const script = adapted.html.match(/<script async type="module">([\s\S]*?)<\/script>/)![1];
  const digest = createHash('sha256').update(script).digest('base64');
  expect(adapted.html).toContain(`'sha256-${digest}'`);
  expect(adapted.html).toContain("default-src 'none'");
  expect(adapted.html).toContain("frame-src 'self'");
  expect(adapted.html).toContain("registration.active.postMessage({ channel: 'thetis-claim-client' })");
  expect(adapted.worker).toContain('Copyright (c) Microsoft Corporation.');
});
test('unexpected revisions and modified upstream assets fail closed', () => {
  expect(() => adaptWebviewController('different', original)).toThrow(/revision/);
  expect(() => adaptWebviewController(pin, { ...original, html: original.html + ' ' })).toThrow(/index.html/);
  expect(() => adaptWebviewController(pin, { ...original, worker: original.worker + ' ' })).toThrow(/service-worker.js/);
});
test('only a same-origin client can request the existing worker to claim its scope', async () => {
  let handler: (event: any) => void;
  let claimed = 0, stopped = 0;
  let pending: Promise<void> | undefined;
  vm.runInNewContext(CLAIM_HANDLER_SOURCE, { URL, sw: {
    location: { origin: 'https://hash.thetis.home.arpa:50001' },
    addEventListener: (_: string, listener: typeof handler) => { handler = listener; },
    clients: { claim: async () => { claimed++; } }
  } });
  const request = (url: string, channel = 'thetis-claim-client') => handler!({ data: { channel }, source: { url }, stopImmediatePropagation: () => stopped++, waitUntil: (promise: Promise<void>) => { pending = promise; } });
  request('https://unrelated.example/');
  request('invalid URL');
  request('https://hash.thetis.home.arpa:50001/code/', 'radio-command');
  expect(claimed).toBe(0);
  request('https://hash.thetis.home.arpa:50001/code/');
  await pending;
  expect(claimed).toBe(1);
  expect(stopped).toBe(1);
});
