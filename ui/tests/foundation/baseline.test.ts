import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultLedger, inventoryCandidates, validateBaseline } from '../../baseline/validate.mjs';

const fresh = () => structuredClone(defaultLedger);
const inventoryText = readFileSync(new URL('../../../docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md', import.meta.url), 'utf8');

describe('source-backed foundation baseline', () => {
  it('baselineEveryActiveSurfaceHasAnOwner', () => {
    const expected = inventoryCandidates(inventoryText);
    expect(expected.filter(row => row.kind === 'Form')).toHaveLength(56);
    expect(expected.filter(row => row.kind === 'UserControl')).toHaveLength(16);
    expect(expected.filter(row => row.kind === 'SetupTabPage')).toHaveLength(89);
    expect(validateBaseline(fresh())).toEqual([]);
  });

  it('rejects an intentionally unassigned row', () => {
    const ledger = fresh();
    ledger.candidates[0].ownerStage = '';
    expect(validateBaseline(ledger).join('\n')).toMatch(/ownerStage/);
  });

  it('checks candidate keys independently of self-reported counts', () => {
    const ledger = fresh();
    ledger.candidates[0] = structuredClone(ledger.candidates[1]);
    const errors = validateBaseline(ledger).join('\n');
    expect(errors).toMatch(/duplicate candidate/);
    expect(errors).toMatch(/missing inventory candidate/);
  });

  it('rejects a missing candidate even if ledger counts are adjusted', () => {
    const ledger = fresh();
    const row = ledger.candidates.pop()!;
    ledger.counts[row.kind]--;
    expect(validateBaseline(ledger).join('\n')).toMatch(/missing inventory candidate/);
  });

  it('requires the real inventory declaration', () => {
    const ledger = fresh();
    ledger.candidates[0].sourceRefs = [];
    expect(validateBaseline(ledger).join('\n')).toMatch(/sourceRefs/);
  });

  it('historicalScreenshotDoesNotOverrideCurrentHandler', () => {
    const ledger = fresh();
    ledger.behaviors[0].authority = 'historical-manual';
    expect(validateBaseline(ledger).join('\n')).toMatch(/current-handler authority/);
  });

  it('keeps rendered manual evidence historical', () => {
    const ledger = fresh();
    ledger.behaviors[0].screenshotRefs[0].kind = 'live-windows';
    expect(validateBaseline(ledger).join('\n')).toMatch(/historical-manual/);
  });

  it('checks actual source symbols and paths', () => {
    const ledger = fresh();
    ledger.behaviors[0].handlerRefs[0].symbol = 'NotARealThetisHandler';
    expect(validateBaseline(ledger).join('\n')).toMatch(/symbol not found/);
  });

  it('does not turn unmeasured hardware or timing into evidence', () => {
    const ledger = fresh();
    ledger.behaviors[0].timingToleranceMs = 1;
    expect(validateBaseline(ledger).join('\n')).toMatch(/unmeasured tolerances/);
  });
});

describe.skipIf(process.platform !== 'win32')('Windows LAN setup helper', () => {
  it('PlanOnly describes DNS and opt-in scope without certificate/trust/firewall changes', () => {
    const helper = fileURLToPath(new URL('../../setup-code-host.ps1', import.meta.url));
    const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', helper, '-PlanOnly', '-ServerAddress', '192.168.114.100'], { encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan.dnsRecords).toEqual([
      { name: 'thetis.home.arpa', type: 'A', address: '192.168.114.100' },
      { name: '*.thetis.home.arpa', type: 'A', address: '192.168.114.100' }
    ]);
    expect(plan.installTrust).toBe(false);
    expect(plan.configureFirewall).toBe(false);
    expect(plan.firewall.remoteAddress).toBe('192.168.0.0/16');
    expect(plan.scopeNotice).toMatch(/192\.168\.0\.0\/16/);
    expect(plan.scopeNotice).not.toMatch(/outside/);
  });
});
