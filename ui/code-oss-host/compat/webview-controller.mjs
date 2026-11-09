import { createHash } from 'node:crypto';
import { PINNED_CODE_COMMIT } from '../../scripts/code-cache.mjs';

export const WEBVIEW_CONTROLLER_ADAPTER = 'webview-controller-claim-v1';
const fingerprints = {
  html: '454234910089548d9870e14848c2728e2a038c545f837aefd133c875ffd5bc2d',
  worker: '83c76adde3ba663433523660289f99111bf00f395ef541d567c060a6f7cc7d8e'
};
const marker = '// If a new worker was found, wait for it to take control via skipWaiting() + clients.claim() in the SW.';
const requestClaim = `// Thetis embedder: reclaim an activated worker when a browser remount has no controller.
if (!navigator.serviceWorker.controller && registration.active && !registration.installing && !registration.waiting) {
  registration.active.postMessage({ channel: 'thetis-claim-client' });
}
`;
export const CLAIM_HANDLER_SOURCE = `// Thetis embedder: claims only this registration's existing same-origin clients.
sw.addEventListener('message', event => {
  if (event.data?.channel !== 'thetis-claim-client' || !event.source?.url) return;
  try { if (new URL(event.source.url).origin !== sw.location.origin) return; } catch { return; }
  event.stopImmediatePropagation();
  event.waitUntil(sw.clients.claim());
});
`;
const normalize = text => text.replaceAll('\r\n', '\n');
const digest = text => createHash('sha256').update(text).digest('hex');

/** Adapt generated copies only. A Code upgrade requires deliberate requalification. */
export function adaptWebviewController(commit, input) {
  if (commit !== PINNED_CODE_COMMIT) throw new Error('Requalify the webview controller adapter for this Code revision.');
  let html = normalize(input.html);
  let worker = normalize(input.worker);
  if (digest(html) !== fingerprints.html) throw new Error('Requalify the controller adapter: upstream index.html changed.');
  if (digest(worker) !== fingerprints.worker) throw new Error('Requalify the controller adapter: upstream service-worker.js changed.');
  html = html.replace(marker, requestClaim + marker);
  const script = html.match(/<script async type="module">([\s\S]*?)<\/script>/)[1];
  const cspDigest = createHash('sha256').update(script).digest('base64');
  html = html.replace(/'sha256-[^']+'/g, `'sha256-${cspDigest}'`);
  worker = worker.replace('const VERSION = 6;', CLAIM_HANDLER_SOURCE + 'const VERSION = 6;');
  return { html, worker };
}
