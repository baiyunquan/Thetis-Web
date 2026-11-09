import { test } from 'vitest';
import assert from 'node:assert/strict';
import { RADIO_THEMES, applyRadioTheme, resolveRadioTheme, resolveDensity } from '../../thetis-extension/src/theme/radioTheme.ts';

test('two radio skins expose the same radio-scoped tokens independent of workbench colors', () => {
  assert.deepEqual(Object.keys(RADIO_THEMES), ['classic', 'midnight']);
  const keys = Object.keys(RADIO_THEMES.classic.tokens).sort();
  assert.ok(keys.length >= 10);
  assert.deepEqual(Object.keys(RADIO_THEMES.midnight.tokens).sort(), keys);
  assert.ok(keys.every(key => key.startsWith('--radio-')));
  for (const key of ['--radio-fault', '--radio-stale', '--radio-disabled', '--radio-disabled-text', '--radio-selection', '--radio-selection-text']) assert.ok(keys.includes(key), `missing semantic token ${key}`);
  assert.notEqual(RADIO_THEMES.classic.tokens['--radio-bg'], RADIO_THEMES.midnight.tokens['--radio-bg']);
  assert.equal(resolveRadioTheme('missing').id, 'classic');
});

test('theme application writes tokens to supplied root without requiring optional imagery', () => {
  const values: Record<string, string> = {};
  const root = { style: { setProperty: (key: string, value: string) => { values[key] = value; } } };
  applyRadioTheme(root, RADIO_THEMES.midnight.tokens);
  assert.equal(values['--radio-bg'], RADIO_THEMES.midnight.tokens['--radio-bg']);
  assert.equal(Object.keys(values).length, Object.keys(RADIO_THEMES.midnight.tokens).length);
});

test('automatic density adapts to width and coarse pointer; explicit override remains usable', () => {
  assert.equal(resolveDensity('auto', 1200, false), 'expanded');
  assert.equal(resolveDensity('auto', 450, false), 'compact');
  assert.equal(resolveDensity('auto', 1200, true), 'touch');
  assert.equal(resolveDensity('expanded', 450, false), 'expanded');
});
