import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/radio-snapshot-v1.json';
import { parseRadioSnapshot } from '../../thetis-extension/src/contracts';

describe('backend contract v1', () => {
  it('reads the same integer-Hz fixture as the managed harness without mutating source objects', () => {
    const source = structuredClone(fixture);
    const state = parseRadioSnapshot(source);
    source.receivers[0]!.vfoAHz = 1;
    expect(state.receivers[0]!.vfoAHz).toBe(14200001);
    expect(state.receivers[1]!.vfoAHz).toBeNull();
    expect(Object.isFrozen(state.receivers[0])).toBe(true);
    expect(Object.isFrozen(state.capabilities)).toBe(true);
  });
  it.each([
    { ...fixture, schemaVersion: 2 },
    { ...fixture, revision: 0.5 },
    { ...fixture, receivers: [{ id: 'rx1', vfoAHz: -999, vfoBHz: 1 }] },
    { ...fixture, receivers: [{ id: 'rx1', vfoAHz: 9007199254740992, vfoBHz: 1 }] },
    { ...fixture, receivers: [fixture.receivers[0], fixture.receivers[0]] },
    { ...fixture, receivers: [{ id: 'rx9', vfoAHz: 1, vfoBHz: 1 }] }
  ])('rejects incompatible, unsafe or ambiguous state', value => {
    expect(() => parseRadioSnapshot(value)).toThrow();
  });
});
