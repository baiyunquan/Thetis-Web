import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const helper = fileURLToPath(new URL('../setup-code-host.ps1', import.meta.url));
const run = (args, localAppData) => spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', helper, ...args], { encoding: 'utf8', env: { ...process.env, LOCALAPPDATA: localAppData } });

test('PlanOnly emits DNS, explicit trust/firewall intentions and creates no files', () => {
  const localAppData = mkdtempSync(join(tmpdir(), 'thetis-plan-only-'));
  try {
    const result = run(['-PlanOnly', '-ServerAddress', '192.168.114.100'], localAppData);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const plan = JSON.parse(result.stdout);
    assert.equal(plan.baseHost, 'thetis.home.arpa');
    assert.equal(plan.dnsRecords[0].address, '192.168.114.100');
    assert.equal(plan.dnsRecords[1].name, '*.thetis.home.arpa');
    assert.equal(plan.installTrust, false);
    assert.equal(plan.configureFirewall, false);
    assert.equal(plan.firewall.remoteAddress, '192.168.0.0/16');
    assert.match(plan.scopeNotice, /192\.168\.0\.0\/16/);
    assert.doesNotMatch(plan.scopeNotice, /outside/);
    assert.equal(existsSync(join(localAppData, 'Thetis')), false);
  } finally { rmSync(localAppData, { recursive: true, force: true }); }
});

test('PlanOnly can describe explicit opt-ins without applying them', () => {
  const localAppData = mkdtempSync(join(tmpdir(), 'thetis-plan-switches-'));
  try {
    const result = run(['-PlanOnly', '-InstallTrust', '-ConfigureFirewall', '-ServerAddress', '192.168.0.10'], localAppData);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const plan = JSON.parse(result.stdout);
    assert.equal(plan.installTrust, true);
    assert.equal(plan.configureFirewall, true);
    assert.equal(existsSync(join(localAppData, 'Thetis')), false);
  } finally { rmSync(localAppData, { recursive: true, force: true }); }
});

test('a loopback DNS target is rejected instead of promising LAN access', () => {
  const localAppData = mkdtempSync(join(tmpdir(), 'thetis-plan-invalid-'));
  try {
    const result = run(['-PlanOnly', '-ServerAddress', '127.0.0.1'], localAppData);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /routable IPv4/);
    assert.equal(existsSync(join(localAppData, 'Thetis')), false);
  } finally { rmSync(localAppData, { recursive: true, force: true }); }
});

test('the lab subnet is inside the /16 and an adjacent network remains outside', () => {
  const localAppData = mkdtempSync(join(tmpdir(), 'thetis-plan-subnets-'));
  try {
    for (const [address, outside] of [['192.168.3.165', false], ['192.169.0.10', true]]) {
      const result = run(['-PlanOnly', '-ServerAddress', address], localAppData);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const plan = JSON.parse(result.stdout);
      assert.equal(plan.firewall.remoteAddress, '192.168.0.0/16');
      assert.equal(plan.scopeNotice.includes('outside'), outside);
    }
    assert.equal(existsSync(join(localAppData, 'Thetis')), false);
  } finally { rmSync(localAppData, { recursive: true, force: true }); }
});
