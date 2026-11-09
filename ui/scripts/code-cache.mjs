import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function fingerprint(input) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function describeCodeCache() {
  const code = path.join(repo, 'submodules/vscode');
  const pkg = JSON.parse(fs.readFileSync(path.join(code, 'package.json'), 'utf8'));
  const input = {
    commit: execFileSync('git', ['-C', code, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    node: fs.readFileSync(path.join(code, '.nvmrc'), 'utf8').trim().replace(/^v/, ''),
    pnpm: pkg.packageManager.split('@')[1], flags: ['web', 'nls'],
    locks: ['pnpm-lock.yaml', 'build/pnpm-lock.yaml', 'remote/pnpm-lock.yaml'].map(file =>
      createHash('sha256').update(fs.readFileSync(path.join(code, file))).digest('hex'))
  };
  return { ...input, fingerprint: fingerprint(input) };
}
export function codeCacheMatches() {
  try {
    const stamp = JSON.parse(fs.readFileSync(path.join(repo, 'build/code-cache.json'), 'utf8'));
    const current = describeCodeCache();
    const required = ['nls.messages.js', 'vs/workbench/workbench.web.main.internal.js', 'vs/workbench/workbench.web.main.internal.css', 'vs/workbench/api/worker/extensionHostWorkerMain.js'];
    return stamp.fingerprint === current.fingerprint && required.every(file => fs.existsSync(path.join(repo, 'submodules/vscode/out-vscode-web', file)));
  } catch { return false; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const matches = codeCacheMatches();
    console.log(matches ? 'Reusing qualified Code OSS browser bundle.' : 'Code OSS browser cache needs a build.');
    process.exitCode = matches ? 0 : 1;
  } else if (process.argv.includes('--write')) {
    fs.mkdirSync(path.join(repo, 'build'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'build/code-cache.json'), JSON.stringify(describeCodeCache(), null, 2) + '\n');
  }
}
