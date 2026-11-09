import { test, expect } from 'vitest';
import fs from 'node:fs';

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
