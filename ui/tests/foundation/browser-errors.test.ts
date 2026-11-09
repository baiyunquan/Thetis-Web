import { test, expect } from 'vitest';
import { knownUpstreamError, replacedWebviewPlaceholder } from './browser-errors';
test('known upstream diagnostics require the precise error and Code source stack', () => {
  const message = "ENOPRO: No file system provider found for resource 'file:///.copilot/config.json'";
  const stack = 'AgentPluginService http://localhost:50001/code/vscode/out/vs/workbench/workbench.web.main.internal.js:746717:17';
  expect(knownUpstreamError({ message, stack })).toBeDefined();
  expect(knownUpstreamError({ message })).toBeUndefined();
  expect(knownUpstreamError({ message: 'ENOPRO: radio configuration unavailable', stack })).toBeUndefined();
  expect(knownUpstreamError({ message: 'Found unexpected null', stack: 'at thetis/main.js:1' })).toBeUndefined();
  expect(knownUpstreamError({ message: 'Found unexpected null', stack: 'assertIsDefined hookupOnLoadHandlers http://hash.localhost:50001/code/vscode/out/vs/workbench/contrib/webview/browser/pre/index.html:1222:43' })).toBeDefined();
});
test('only cancelled temporary webview documents are expected resource failures', () => {
  const root = 'http://hash.localhost:50001/code/vscode/out/vs/workbench/contrib/webview/browser/pre/';
  expect(replacedWebviewPlaceholder(root + 'fake.html?id=1', 'Frame load interrupted')).toBe(true);
  expect(replacedWebviewPlaceholder(root + 'index.html', 'Frame load interrupted')).toBe(false);
  expect(replacedWebviewPlaceholder(root + 'index.html', 'Frame load interrupted', true)).toBe(true);
  expect(replacedWebviewPlaceholder(root + 'fake.html', 'Connection refused')).toBe(false);
});
