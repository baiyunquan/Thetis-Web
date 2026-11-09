import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { createFoundationModel, createInitialState, reduceFoundationState, syntheticSpectrum, operatingFamily } from '../../thetis-extension/src/model/foundation.ts';
import { bindControlValues } from '../../thetis-extension/src/webview/controlValues.ts';
import { FoundationDiagnostics } from '../../thetis-extension/src/diagnostics.ts';

class DiagnosticSocketFixture {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: DiagnosticSocketFixture[] = [];
  readyState = 0;
  sent: { requestId: string; value: string }[] = [];
  onopen: ((event: Event) => unknown) | null = null;
  onmessage: ((event: MessageEvent) => unknown) | null = null;
  onclose: ((event: Event) => unknown) | null = null;
  onerror: ((event: Event) => unknown) | null = null;
  constructor(readonly url: string) { DiagnosticSocketFixture.instances.push(this); }
  send(message: string) { assert.equal(this.readyState, 1); this.sent.push(JSON.parse(message)); }
  open() { this.readyState = 1; this.onopen?.(new Event('open')); }
  reply(message: { requestId: string; value: string }) { this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) })); }
  close() { this.readyState = 3; this.onclose?.(new Event('close')); }
}
function diagnosticFixture() {
  vi.useFakeTimers();
  DiagnosticSocketFixture.instances = [];
  vi.stubGlobal('WebSocket', DiagnosticSocketFixture);
  const diagnostics = new FoundationDiagnostics('wss://localhost:50001/code/diagnostic', () => {});
  return { diagnostics, cleanup: () => { diagnostics.dispose(); vi.unstubAllGlobals(); vi.useRealTimers(); } };
}
test('cold and connecting diagnostic echoes queue exact caller values until the socket opens', async () => {
  const { diagnostics, cleanup } = diagnosticFixture();
  try {
    const first = diagnostics.echo('cold custom value');
    const socket = DiagnosticSocketFixture.instances[0];
    const second = diagnostics.echo('connecting custom value');
    assert.equal(DiagnosticSocketFixture.instances.length, 1);
    assert.equal(socket.sent.length, 0);
    socket.open();
    assert.deepEqual(socket.sent.map(m => m.value), ['cold custom value', 'connecting custom value']);
    socket.reply(socket.sent[1]);
    socket.reply(socket.sent[0]);
    assert.equal((await first).value, 'cold custom value');
    assert.equal((await second).value, 'connecting custom value');
  } finally { cleanup(); }
});

test('diagnostic close settles pending echoes and reconnects only on the next demand', async () => {
  const { diagnostics, cleanup } = diagnosticFixture();
  try {
    const pending = diagnostics.echo('before disconnect');
    const first = DiagnosticSocketFixture.instances[0];
    first.open();
    first.close();
    assert.equal((await pending).phase, 'unavailable');
    assert.equal(vi.getTimerCount(), 0);
    assert.equal(first.onmessage, null);
    assert.equal(first.onopen, null);
    assert.equal(DiagnosticSocketFixture.instances.length, 1);
    const reconnected = diagnostics.echo('after reconnect');
    const second = DiagnosticSocketFixture.instances[1];
    second.open();
    assert.equal(second.sent[0].value, 'after reconnect');
    second.reply(second.sent[0]);
    assert.equal((await reconnected).value, 'after reconnect');
  } finally { cleanup(); }
});

test('quiet diagnostic heartbeat keeps the socket active without replacing the user echo result', async () => {
  const { diagnostics, cleanup } = diagnosticFixture();
  try {
    const result = diagnostics.echo('user result');
    const socket = DiagnosticSocketFixture.instances[0];
    socket.open(); socket.reply(socket.sent[0]); await result;
    const status = diagnostics.getStatus();
    vi.advanceTimersByTime(15000);
    assert.equal(socket.sent.length, 2);
    assert.match(socket.sent[1].requestId, /^foundation-heartbeat-/);
    socket.reply(socket.sent[1]);
    assert.equal(diagnostics.getStatus(), status);
    socket.close();
    assert.equal(vi.getTimerCount(), 0);
    const reconnect = diagnostics.echo('dispose connected socket');
    const next = DiagnosticSocketFixture.instances[1];
    next.open(); next.reply(next.sent[0]); await reconnect;
    assert.equal(vi.getTimerCount(), 1);
    diagnostics.dispose();
    assert.equal(vi.getTimerCount(), 0);
    assert.equal(next.onmessage, null);
  } finally { cleanup(); }
});

test('diagnostic requests resolve only for a matching request identity and exact echo value', async () => {
  const { diagnostics, cleanup } = diagnosticFixture();
  try {
    let settled = false;
    const pending = diagnostics.echo('exact text').then(result => { settled = true; return result; });
    const socket = DiagnosticSocketFixture.instances[0]; socket.open();
    const request = socket.sent[0];
    socket.reply({ requestId: 'unrelated', value: request.value });
    socket.reply({ requestId: request.requestId, value: 'wrong text' });
    await Promise.resolve();
    assert.equal(settled, false);
    socket.reply(request);
    assert.equal((await pending).value, 'exact text');
  } finally { cleanup(); }
});

test('disposing a connecting diagnostic socket settles requests and clears timers and callbacks', async () => {
  const { diagnostics, cleanup } = diagnosticFixture();
  try {
    const pending = diagnostics.echo('never opened');
    const socket = DiagnosticSocketFixture.instances[0];
    diagnostics.dispose();
    assert.equal((await pending).phase, 'unavailable');
    assert.equal(vi.getTimerCount(), 0);
    assert.equal(socket.onopen, null);
    assert.equal(socket.onmessage, null);
    assert.equal(socket.onclose, null);
    assert.equal(socket.onerror, null);
    assert.equal((await diagnostics.echo('after disposal')).phase, 'unavailable');
    assert.equal(DiagnosticSocketFixture.instances.length, 1);
  } finally { cleanup(); }
});

class InputFixture extends EventTarget {
  constructor(readonly id: string, public value: string, readonly type = 'number') { super(); }
}
class DocumentFixture extends EventTarget {
  activeElement: InputFixture | null = null;
  focused = true;
  hasFocus() { return this.focused; }
  bubble(type: string, target: InputFixture) {
    const event = new Event(type);
    Object.defineProperty(event, 'target', { value: target });
    this.dispatchEvent(event);
  }
}
test('a previously focused slider reconciles external receiver values after focus leaves the iframe', () => {
  const document = new DocumentFixture();
  const window = new EventTarget();
  const input = new InputFixture('gain-af', '45', 'range');
  document.activeElement = input;
  let desired = '45';
  const binding = bindControlValues(document, window, () => binding.setValue(input, desired));
  document.bubble('pointerdown', input);
  document.bubble('input', input);
  desired = '25';
  binding.setValue(input, desired);
  assert.equal(input.value, '45', 'active drag is not interrupted');
  document.focused = false;
  window.dispatchEvent(new Event('blur'));
  assert.equal(input.value, '25', 'blur reconciles even when activeElement remains the old slider');
  desired = '63';
  binding.setValue(input, desired);
  assert.equal(input.value, '63', 'subsequent shared snapshots update the stale focused control');
  binding.dispose();
});

test('incoming snapshots preserve a current VFO draft and reconcile it when editing ends', () => {
  const document = new DocumentFixture();
  const window = new EventTarget();
  const input = new InputFixture('vfo-a', '14200000');
  document.activeElement = input;
  let desired = '7100000';
  const binding = bindControlValues(document, window, () => binding.setValue(input, desired));
  input.value = '1420';
  document.bubble('input', input);
  binding.setValue(input, desired);
  assert.equal(input.value, '1420', 'typing is not overwritten by another panel update');
  document.activeElement = null;
  document.bubble('focusout', input);
  assert.equal(input.value, '7100000');
  desired = '10120000';
  binding.setValue(input, desired);
  assert.equal(input.value, '10120000');
  binding.dispose();
});

test('a focused slider follows shared snapshots after its pointer drag ends', () => {
  const document = new DocumentFixture();
  const window = new EventTarget();
  const input = new InputFixture('gain-rf', '80', 'range');
  document.activeElement = input;
  const binding = bindControlValues(document, window, () => binding.setValue(input, '60'));
  document.bubble('pointerdown', input);
  binding.setValue(input, '60');
  assert.equal(input.value, '80');
  document.bubble('pointerup', input);
  assert.equal(input.value, '60');
  binding.setValue(input, '30');
  assert.equal(input.value, '30', 'mere focus does not preserve a finished drag');
  binding.dispose();
});

test('all subscribers observe one immutable integer-Hz VFO update', () => {
  const model = createFoundationModel();
  const observations: number[] = [];
  model.subscribe(s => observations.push(s.vfoAHz));
  model.subscribe(s => observations.push(s.vfoAHz));
  const before = model.getState();
  assert.equal(model.dispatch({ type: 'setVfo', receiver: 'A', hz: 14250123 }), true);
  assert.deepEqual(observations, [14250123, 14250123]);
  assert.equal(before.vfoAHz, 14200000);
  assert.equal(Object.isFrozen(model.getState()), true);
});

test('invalid protocol input and every real radio action leave state unchanged', () => {
  const model = createFoundationModel();
  const before = model.getState();
  for (const action of [null, { type: 'power' }, { type: 'mox' }, { type: 'tune' }, { type: 'ptt' },
    { type: 'setVfo', receiver: 'A', hz: 14200123.5 }, { type: 'setVfo', receiver: 'B', hz: Infinity },
    { type: 'setVfo', receiver: 'A', hz: 1 }, { type: 'setMode', mode: 'transmit' },
    { type: 'setGain', key: '__proto__', value: 40 }, { type: 'setGain', key: 'af', value: 101 }]) {
    assert.equal(model.dispatch(action), false, JSON.stringify(action));
    assert.equal(model.getState(), before);
  }
});

test('gain, mode and filter edits are shared synthetic state; subscriptions dispose', () => {
  const model = createFoundationModel();
  let count = 0;
  const subscription = model.subscribe(() => count++);
  assert.equal(model.dispatch({ type: 'setGain', key: 'af', value: 63 }), true);
  assert.equal(model.dispatch({ type: 'setMode', mode: 'CWU' }), true);
  assert.equal(model.dispatch({ type: 'setFilter', hz: 500 }), true);
  assert.equal(model.getState().gains.af, 63);
  assert.equal(model.getState().mode, 'CWU');
  assert.equal(model.getState().filterHz, 500);
  assert.equal(count, 3);
  subscription.dispose();
  model.dispatch({ type: 'setGain', key: 'af', value: 61 });
  assert.equal(count, 3);
});

test('receiver target is shared and invalid targets cannot silently retarget band edits', () => {
  const model = createFoundationModel();
  const before = model.getState();
  assert.equal(model.getState().receiverTarget, 'rx1');
  assert.equal(model.dispatch({ type: 'selectReceiver', receiver: 'rx2' }), true);
  assert.equal(model.getState().receiverTarget, 'rx2');
  assert.equal(model.dispatch({ type: 'selectReceiver', receiver: 'C' }), false);
  assert.equal(model.getState().receiverTarget, 'rx2');
  assert.equal(model.getState().rx2Enabled, false);
  assert.equal(model.getState().vfoAHz, before.vfoAHz);
  assert.equal(model.getState().vfoBHz, before.vfoBHz);
});

test('synthetic RX2 display enablement is separate from receiver selection', () => {
  const model = createFoundationModel();
  assert.equal(model.dispatch({ type: 'setRx2Enabled', enabled: true }), true);
  assert.equal(model.getState().rx2Enabled, true);
  assert.equal(model.getState().receiverTarget, 'rx1');
  assert.equal(model.dispatch({ type: 'setRx2Enabled', enabled: 'yes' }), false);
});

test('RX2 targeted mode, filter and gain edits preserve independent RX1 controls', () => {
  const model = createFoundationModel();
  const rx1 = model.getState();
  model.dispatch({ type: 'selectReceiver', receiver: 'rx2' });
  model.dispatch({ type: 'setMode', mode: 'LSB' });
  model.dispatch({ type: 'setFilter', hz: 500 });
  model.dispatch({ type: 'setGain', key: 'af', value: 25 });
  assert.equal(model.getState().mode, rx1.mode);
  assert.equal(model.getState().filterHz, rx1.filterHz);
  assert.equal(model.getState().gains.af, rx1.gains.af);
  assert.equal(model.getState().rx2.mode, 'LSB');
  assert.equal(model.getState().rx2.filterHz, 500);
  assert.equal(model.getState().rx2.gains.af, 25);
  assert.equal(Object.isFrozen(model.getState().rx2.gains), true);
  assert.equal(model.getState().rx2Enabled, false);
});

test('plot pause survives a restored view and rejects nonboolean protocol data', () => {
  const model = createFoundationModel();
  assert.equal(model.getState().plotPaused, false);
  assert.equal(model.dispatch({ type: 'setPlotPaused', paused: true }), true);
  const restored = createFoundationModel(model.getState());
  assert.equal(restored.getState().plotPaused, true);
  assert.equal(restored.dispatch({ type: 'setPlotPaused', paused: 'true' }), false);
  assert.equal(restored.dispatch({ type: 'setPlotPaused', paused: false }), true);
  assert.equal(restored.getState().plotPaused, false);
});

test('lower operating controls select the appropriate radio mode family', () => {
  assert.deepEqual(MODES_FOR_TEST.map(operatingFamily), ['phone', 'phone', 'phone', 'cw', 'cw', 'fm', 'phone', 'phone', 'digital', 'digital']);
});
const MODES_FOR_TEST = ['LSB', 'USB', 'DSB', 'CWL', 'CWU', 'FM', 'AM', 'SAM', 'DIGL', 'DIGU'] as const;

test('restored snapshots accept only known validated values and stay offline', () => {
  const state = createInitialState({ vfoAHz: 7100123, vfoBHz: -1, mode: 'LSB', filterHz: 2400,
    gains: { af: 80, rf: Infinity }, power: true, radioAvailable: true });
  assert.equal(state.vfoAHz, 7100123);
  assert.equal(state.vfoBHz, 7100000);
  assert.equal(state.mode, 'LSB');
  assert.equal(state.gains.af, 80);
  assert.equal(state.radioAvailable, false);
  assert.equal(state.power, false);
});

test('synthetic spectrum is deterministic, finite and labelled in model', () => {
  const a = syntheticSpectrum(120, 0);
  assert.deepEqual(a, syntheticSpectrum(120, 0));
  assert.notDeepEqual(a, syntheticSpectrum(120, 3));
  assert.equal(a.length, 120);
  assert.ok(a.every(n => Number.isFinite(n) && n >= -140 && n <= 0));
  assert.equal(reduceFoundationState(createInitialState(), { type: 'setFilter', hz: 777 }), undefined);
});
