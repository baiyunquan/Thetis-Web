import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../../tests/fixtures/radio-snapshot-v1.json';
import { RadioClient } from '../../thetis-extension/src/transport/radioClient';

class Socket {
  readyState: 0 | 1 | 2 | 3 = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: any[] = [];
  send(value: string) { if (this.readyState !== 1) throw new Error('socket closed'); this.sent.push(JSON.parse(value)); }
  close() { this.readyState = 3; this.onclose?.(); }
  open() { this.readyState = 1; this.onopen?.(); }
  receive(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }); }
}
function rig() {
  const sockets: Socket[] = [];
  const client = new RadioClient('ws://localhost:50001/code/control', () => {
    const socket = new Socket(); sockets.push(socket); return socket;
  });
  return { client, sockets, welcome(id = 'first', state = fixture) {
    const socket = sockets.at(-1)!; socket.open();
    socket.receive({ type: 'welcome', schemaVersion: 1, connectionId: id, snapshot: state });
    return socket;
  } };
}
const action = { operation: 'receiver.setFrequency', target: 'rx1', payload: { vfo: 'a', frequencyHz: 14074001 } } as const;

describe('backend radio client', () => {
  afterEach(() => vi.useRealTimers());
  it('enables mutations only after welcome and never invents state from an acknowledgment', async () => {
    const r = rig(); r.client.connect();
    await expect(r.client.execute(action)).rejects.toThrow('not connected');
    const socket = r.welcome();
    const pending = r.client.execute(action);
    const command = socket.sent.at(-1).command;
    expect(command).toMatchObject({ connectionId: 'first', sessionGeneration: fixture.sessionGeneration, sequence: 1 });
    socket.receive({ type: 'result', result: { schemaVersion: 1, ...command, accepted: true, revision: 8, error: null } });
    expect((await pending).accepted).toBe(true);
    expect((await r.client.getSnapshot()).receivers[0]!.vfoAHz).toBe(14200001);
    socket.receive({ type: 'snapshot', snapshot: { ...fixture, revision: 8, receivers: [{ id: 'rx1', vfoAHz: 14074001, vfoBHz: 7100000 }] } });
    expect((await r.client.getSnapshot()).receivers[0]!.vfoAHz).toBe(14074001);
    r.client.dispose();
  });
  it('rejects a busy browser until explicit retry', () => {
    const r = rig(); r.client.connect(); const first = r.sockets[0]!; first.open();
    first.receive({ type: 'rejected', code: 'controllerBusy', message: 'Already in use' });
    expect(r.client.getStatus().phase).toBe('rejected');
    expect(r.sockets).toHaveLength(1);
    r.client.connect(); expect(r.sockets).toHaveLength(2);
    r.welcome('second'); expect(r.client.getStatus().phase).toBe('connected');
    r.client.dispose();
  });
  it('rejects pending commands on disconnect and does not replay them after reconnect', async () => {
    const r = rig(); r.client.connect(); const first = r.welcome();
    const pending = r.client.execute(action);
    const rejection = expect(pending).rejects.toThrow('disconnected'); first.close(); await rejection;
    r.client.connect(); const second = r.welcome('second');
    expect(second.sent.filter(x => x.type === 'command')).toHaveLength(0);
    expect((await r.client.getSnapshot()).revision).toBe(7);
    r.client.dispose();
  });
  it('ignores stale revisions and rejects an unexpected backend generation', async () => {
    const r = rig(); r.client.connect(); const socket = r.welcome();
    socket.receive({ type: 'snapshot', snapshot: { ...fixture, revision: 6 } });
    expect((await r.client.getSnapshot()).revision).toBe(7);
    socket.receive({ type: 'snapshot', snapshot: { ...fixture, sessionGeneration: 'new-backend', revision: 1 } });
    expect(r.client.getStatus().phase).toBe('incompatible');
    r.client.dispose();
  });
  it('sends heartbeats at 15 seconds and never retries a timed-out mutation', async () => {
    vi.useFakeTimers(); const r = rig(); r.client.connect(); const socket = r.welcome();
    await vi.advanceTimersByTimeAsync(15000);
    expect(socket.sent.filter(x => x.type === 'heartbeat')).toHaveLength(1);
    const pending = r.client.execute(action); const rejected = expect(pending).rejects.toThrow('outcome is unknown');
    await vi.advanceTimersByTimeAsync(5000); await rejected;
    expect(socket.sent.filter(x => x.type === 'command')).toHaveLength(1);
    r.client.dispose();
  });
  it('reports a stalled welcome and releases its socket without enabling input', async () => {
    vi.useFakeTimers(); const r = rig(); r.client.connect(); r.sockets[0]!.open();
    await vi.advanceTimersByTimeAsync(10000);
    expect(r.client.getStatus().phase).toBe('disconnected');
    expect(r.client.getStatus().detail).toContain('welcome timed out');
    expect(r.sockets[0]!.readyState).toBe(3);
    r.client.dispose();
  });
});
