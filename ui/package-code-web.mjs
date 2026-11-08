import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = path.join(repo, 'submodules/vscode');
const destination = path.join(repo, 'build/code-web');
if (path.dirname(destination) !== path.join(repo, 'build')) throw new Error('Invalid package output path');
const { getFlatProductionDependencies } = await import(pathToFileURL(path.join(code, 'build/lib/dependencies.ts')));
const dependencies = getFlatProductionDependencies(path.join(code, 'remote/web'));
// Assemble a fresh distribution so removed assets cannot survive a rebuild.
await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });
await fs.cp(path.join(repo, 'ui/host'), destination, { recursive: true });
await fs.cp(path.join(code, 'out-vscode-web'), path.join(destination, 'vscode/out'), { recursive: true, filter: source => !source.endsWith('.map') });
for (const { folder, base } of dependencies) {
  const relative = path.relative(base, folder);
  await fs.cp(folder, path.join(destination, 'vscode', relative), {
    recursive: true,
    dereference: true,
    filter: source => {
      const parts = path.relative(folder, source).split(path.sep);
      return !parts.some(part => ['node_modules', '.bin', 'test', 'tests'].includes(part));
    }
  });
}
for (const name of ['theme-defaults', 'theme-seti']) {
  await fs.cp(path.join(code, 'extensions', name), path.join(destination, 'extensions', name), { recursive: true });
}
await fs.cp(path.join(repo, 'ui/hello-world'), path.join(destination, 'extensions/hello-world'), { recursive: true, filter: source => path.basename(source) !== 'test' });
await fs.copyFile(path.join(code, 'LICENSE.txt'), path.join(destination, 'vscode/LICENSE.txt'));
await fs.copyFile(path.join(code, 'ThirdPartyNotices.txt'), path.join(destination, 'vscode/ThirdPartyNotices.txt'));
await fs.copyFile(path.join(code, 'resources/server/favicon.ico'), path.join(destination, 'vscode/favicon.ico'));
const { version } = JSON.parse(await fs.readFile(path.join(code, 'package.json'), 'utf8'));
const commit = execFileSync('git', ['-C', code, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
await fs.writeFile(path.join(destination, 'build-info.json'), JSON.stringify({ version, commit, target: 'web', mode: 'hello-world-diagnostic' }, null, 2) + '\n');
console.log(`Packaged Code OSS ${version} (${commit}) with ${dependencies.length} browser runtime dependencies.`);
