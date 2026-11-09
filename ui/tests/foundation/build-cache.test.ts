import { test, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

test('Code qualification rejects dirty tracked sources and an unexpected revision', async () => {
  const { assertPinnedCodeCheckout } = await import('../../scripts/code-cache.mjs');
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'thetis-code-pin-'));
  const git = (...args: string[]) => execFileSync('git', ['-C', fixture, ...args], { encoding: 'utf8' }).trim();
  try {
    git('init', '--quiet');
    fs.writeFileSync(path.join(fixture, 'source.ts'), 'export const original = true;\n');
    git('add', 'source.ts');
    git('-c', 'user.name=Thetis Test', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'test: create pin fixture');
    const pin = git('rev-parse', 'HEAD');
    expect(assertPinnedCodeCheckout(fixture, pin)).toBe(pin);
    expect(() => assertPinnedCodeCheckout(fixture, 'unexpected')).toThrow(/revision/);
    fs.appendFileSync(path.join(fixture, 'source.ts'), '// modified\n');
    expect(() => assertPinnedCodeCheckout(fixture, pin)).toThrow(/tracked/);
    git('add', 'source.ts');
    expect(() => assertPinnedCodeCheckout(fixture, pin)).toThrow(/tracked/);
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});

test('a changed Code pin or build option invalidates the reusable browser bundle', async () => {
  const file = new URL('../../scripts/code-cache.mjs', import.meta.url);
  expect(fs.existsSync(file), 'Code cache fingerprint implementation exists').toBe(true);
  const { fingerprint } = await import(file.href);
  const first = fingerprint({ commit: 'abc', node: '24.22.1', pnpm: '12.16.0', flags: ['web', 'nls'], locks: ['lock-a'] });
  expect(fingerprint({ commit: 'abc', node: '24.22.1', pnpm: '12.16.0', flags: ['web', 'nls'], locks: ['lock-a'] })).toBe(first);
  expect(fingerprint({ commit: 'def', node: '24.22.1', pnpm: '12.16.0', flags: ['web', 'nls'], locks: ['lock-a'] })).not.toBe(first);
  expect(fingerprint({ commit: 'abc', node: '24.22.1', pnpm: '12.16.0', flags: ['web'], locks: ['lock-a'] })).not.toBe(first);
  expect(fingerprint({ commit: 'abc', node: '24.22.1', pnpm: '12.16.0', flags: ['web', 'nls'], locks: ['lock-b'] })).not.toBe(first);
});
