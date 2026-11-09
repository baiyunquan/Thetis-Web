import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateBaseline, inventoryCandidates } from './validate.mjs';

const inventoryText = readFileSync(new URL('../../docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md', import.meta.url), 'utf8');
const ledgerUrl = new URL('./ledger.json', import.meta.url);
const fresh = () => JSON.parse(readFileSync(ledgerUrl, 'utf8'));

test('baselineEveryActiveSurfaceHasAnOwner: independently covers the source inventory', () => {
  const candidates = inventoryCandidates(inventoryText);
  assert.deepEqual(['Form', 'UserControl', 'SetupTabPage'].map(kind => candidates.filter(row => row.kind === kind).length), [56, 16, 89]);
  assert.deepEqual(validateBaseline(fresh()), []);
});

test('missing inventory candidate fails even after an attacker updates declared counts', () => {
  const ledger = fresh();
  const missing = ledger.candidates.pop();
  ledger.counts[missing.kind]--;
  assert.match(validateBaseline(ledger).join('\n'), /missing inventory candidate/);
});

test('same-count substitution of a candidate cannot disguise a coverage hole', () => {
  const ledger = fresh();
  ledger.candidates[0] = structuredClone(ledger.candidates[1]);
  assert.match(validateBaseline(ledger).join('\n'), /duplicate candidate/);
  assert.match(validateBaseline(ledger).join('\n'), /missing inventory candidate/);
});

test('intentionally unassigned row fails', () => {
  const ledger = fresh();
  ledger.candidates[0].ownerStage = '';
  assert.match(validateBaseline(ledger).join('\n'), /ownerStage/);
});

test('removing the real source declaration fails', () => {
  const ledger = fresh();
  ledger.candidates[0].sourceRefs = [];
  assert.match(validateBaseline(ledger).join('\n'), /sourceRefs/);
});

test('historicalScreenshotDoesNotOverrideCurrentHandler', () => {
  const ledger = fresh();
  ledger.behaviors[0].authority = 'historical-manual';
  assert.match(validateBaseline(ledger).join('\n'), /current-handler authority/);
});

test('manual and live evidence cannot be silently interchanged', () => {
  const ledger = fresh();
  ledger.behaviors[0].screenshotRefs[0].kind = 'live-windows';
  assert.match(validateBaseline(ledger).join('\n'), /historical-manual/);
});

test('invented source lines are rejected against the checkout', () => {
  const ledger = fresh();
  ledger.behaviors[0].handlerRefs[0].symbol = 'NotARealThetisHandler';
  assert.match(validateBaseline(ledger).join('\n'), /symbol not found/);
});

test('detailed control names must exist in the current designer', () => {
  const ledger = fresh();
  ledger.behaviors[0].controls = ['InventedConsoleControl'];
  assert.match(validateBaseline(ledger).join('\n'), /unknown Console control/);
});

test('an explicitly broken inventory input cannot become a new baseline', () => {
  assert.match(validateBaseline(fresh(), { inventoryText: '# empty' }).join('\n'), /inventory counts/);
});

test('candidate declarations and evidence resolve to actual repository files', () => {
  assert.deepEqual(validateBaseline(fresh(), { verifyFiles: true }), []);
  assert.ok(fileURLToPath(ledgerUrl).endsWith('ledger.json'));
});
