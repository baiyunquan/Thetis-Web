import { test, expect } from 'vitest';
import { foundationStatus } from '../../thetis-extension/src/workbench/status';
test('host connectivity and receiver selection never imply radio readiness', () => {
  expect(foundationStatus('rx2', { phase: 'replied', detail: 'Echo received' })).toEqual({
    connection: 'Host: connected / Echo: replied', receiver: 'RX2 controls / Radio unavailable', detail: 'Echo received'
  });
  expect(foundationStatus('rx1', { phase: 'unavailable', detail: 'Connection closed' }).connection).toBe('Host: unverified / Echo: unavailable');
});
