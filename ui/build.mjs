import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { codeCacheMatches, describeCodeCache } from './scripts/code-cache.mjs';
import { adaptWebviewController, WEBVIEW_CONTROLLER_ADAPTER } from './code-oss-host/compat/webview-controller.mjs';

const ui = path.dirname(fileURLToPath(import.meta.url));
const repo = path.dirname(ui);
const code = path.join(repo, 'submodules/vscode');
const out = path.join(ui, 'dist');
const staged = path.join(repo, 'build/code-web');
if (!codeCacheMatches()) throw new Error('Code OSS bundle is absent or incompatible. Run the code_web CMake target or ui/build-code-web.ps1 first.');
const cache = describeCodeCache();
const { getContributions } = await import('./thetis-extension/src/workbench/viewRegistry.ts');
const { getFlatProductionDependencies } = await import(pathToFileURL(path.join(code, 'build/lib/dependencies.ts')));
const runtimeFiles = [];
async function list(dir, prefix = '', source = false) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (source && (entry.name === 'node_modules' || entry.name === 'dist')) continue;
    const relative = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await list(path.join(dir, entry.name), relative + '/', source));
    else files.push(relative);
  }
  return files.sort();
}
for (const folder of ['code-oss-host', 'thetis-extension']) {
  for (const file of await list(path.join(ui, folder), '', true)) runtimeFiles.push([folder + '/' + file,
    createHash('sha256').update(await fs.readFile(path.join(ui, folder, file))).digest('hex')]);
}
const packagingInputs = await Promise.all(['package.json', 'pnpm-lock.yaml', 'build.mjs'].map(async file => [file,
  createHash('sha256').update(await fs.readFile(path.join(ui, file))).digest('hex')]));
const uiBuildId = createHash('sha256').update(JSON.stringify({ cache: cache.fingerprint, runtimeFiles, packagingInputs })).digest('hex');
// Only these two generated output roots can be replaced.
for (const target of [out, staged]) {
  if (![path.join(repo, 'ui/dist'), path.join(repo, 'build/code-web')].includes(target)) throw new Error('Invalid UI output root');
  await fs.rm(target, { recursive: true, force: true });
}
await fs.mkdir(path.join(out, 'extensions/thetis/media'), { recursive: true });
await Promise.all([
  build({ entryPoints: [path.join(ui, 'code-oss-host/src/bootstrap.ts')], outfile: path.join(out, 'bootstrap.js'), bundle: true, format: 'esm', platform: 'browser', target: 'es2024' }),
  build({ entryPoints: [path.join(ui, 'thetis-extension/src/extension.ts')], outfile: path.join(out, 'extensions/thetis/extension.js'), bundle: true, format: 'cjs', platform: 'browser', external: ['vscode'], target: 'es2024' }),
  build({ entryPoints: [path.join(ui, 'thetis-extension/src/webview/main.ts')], outfile: path.join(out, 'extensions/thetis/media/main.js'), bundle: true, format: 'iife', platform: 'browser', target: 'es2024' })
]);
await fs.copyFile(path.join(ui, 'code-oss-host/index.html'), path.join(out, 'index.html'));
await fs.cp(path.join(ui, 'thetis-extension/media'), path.join(out, 'extensions/thetis/media'), { recursive: true });
const manifest = JSON.parse(await fs.readFile(path.join(ui, 'thetis-extension/package.json'), 'utf8'));
manifest.contributes = { ...manifest.contributes, ...getContributions() };
delete manifest.scripts;
// The source workspace is ESM, but the pinned Code web-worker host requires CommonJS extensions.
delete manifest.type;
await fs.writeFile(path.join(out, 'extensions/thetis/package.json'), JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(path.join(out, 'extensions/thetis/package.nls.json'), '{}\n');
await fs.cp(path.join(code, 'out-vscode-web'), path.join(out, 'vscode/out'), { recursive: true, filter: file => !file.endsWith('.map') });
const pre = path.join(out, 'vscode/out/vs/workbench/contrib/webview/browser/pre');
const adapted = adaptWebviewController(cache.commit, {
  html: await fs.readFile(path.join(pre, 'index.html'), 'utf8'),
  worker: await fs.readFile(path.join(pre, 'service-worker.js'), 'utf8')
});
await fs.writeFile(path.join(pre, 'index.html'), adapted.html);
await fs.writeFile(path.join(pre, 'service-worker.js'), adapted.worker);
const dependencies = getFlatProductionDependencies(path.join(code, 'remote/web'));
for (const { folder, base } of dependencies) {
  await fs.cp(folder, path.join(out, 'vscode', path.relative(base, folder)), {
    recursive: true, dereference: true,
    filter: file => !path.relative(folder, file).split(path.sep).some(part => ['node_modules', '.bin', 'src', 'test', 'tests'].includes(part)) && !/\.(?:map|ts)$/.test(file)
  });
}
for (const name of ['theme-defaults', 'theme-seti']) await fs.cp(path.join(code, 'extensions', name), path.join(out, 'extensions', name), { recursive: true });
for (const name of ['LICENSE.txt', 'ThirdPartyNotices.txt']) await fs.copyFile(path.join(code, name), path.join(out, 'vscode', name));
await fs.copyFile(path.join(code, 'resources/server/favicon.ico'), path.join(out, 'vscode/favicon.ico'));
const { version } = JSON.parse(await fs.readFile(path.join(code, 'package.json'), 'utf8'));
await fs.writeFile(path.join(out, 'build-info.json'), JSON.stringify({ version, commit: cache.commit, uiBuildId, codeFingerprint: cache.fingerprint, adapters: [WEBVIEW_CONTROLLER_ADAPTER], mode: 'foundation' }, null, 2) + '\n');
const files = [...await list(out), 'asset-manifest.json'].sort();
await fs.writeFile(path.join(out, 'asset-manifest.json'), JSON.stringify({ schemaVersion: 1, codeCommit: cache.commit, uiBuildId, adapters: [WEBVIEW_CONTROLLER_ADAPTER], files }, null, 2) + '\n');
await fs.cp(out, staged, { recursive: true });
console.log(`Built Thetis foundation ${uiBuildId.slice(0, 12)} using cached Code OSS ${cache.commit.slice(0, 12)}; ${files.length} public files.`);
