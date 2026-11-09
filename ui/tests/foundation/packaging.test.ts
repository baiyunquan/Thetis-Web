import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../dist/', import.meta.url));

test('the staged distribution only exposes packaged runtime assets and includes the worker boot chain', () => {
  expect(fs.existsSync(path.join(root, 'asset-manifest.json')), 'build creates an explicit public asset manifest').toBe(true);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'asset-manifest.json'), 'utf8'));
  for (const required of ['index.html', 'bootstrap.js', 'build-info.json', 'extensions/thetis/package.json', 'extensions/thetis/extension.js',
    'vscode/out/nls.messages.js', 'vscode/out/vs/workbench/api/worker/extensionHostWorkerMain.js',
    'vscode/out/vs/workbench/contrib/webview/browser/pre/service-worker.js',
    'vscode/node_modules/vscode-textmate/release/main.js']) {
    expect(manifest.files, required).toContain(required);
  }
  for (const file of manifest.files) {
    expect(file).not.toMatch(/(^|\/)(src|test|tests|\.git)(\/|$)/);
    expect(path.resolve(root, file).startsWith(path.resolve(root) + path.sep)).toBe(true);
    expect(fs.statSync(path.join(root, file)).isFile(), file).toBe(true);
  }
  expect(manifest.files).not.toContain('totw.html');
  expect(manifest.files).not.toContain('extensions/hello-world/extension.js');
});
