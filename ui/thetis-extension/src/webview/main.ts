import './main.css';
import { BANDS, FILTERS, MODES, syntheticSpectrum, operatingFamily, type FoundationState, type GainKey } from '../model/foundation';
import { applyRadioTheme, resolveDensity, resolveRadioTheme } from '../theme/radioTheme';
import type { EchoStatus } from '../diagnostics';
import { bindControlValues } from './controlValues';
import { previewPanel } from '../workbench/panelRegistry';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): { id?: string; scrollTop?: number } | undefined;
  setState(state: unknown): void;
};
const bridge = acquireVsCodeApi();
const root = document.getElementById('radio-root')!;
const id = document.body.dataset.view ?? 'console';
let state: FoundationState | undefined;
let ready = false;
let sequence = 0;
let traceSequence = 0;
let lastAck = 0;
let frame = 0;
let tuningStepHz = 1000;
const isConsole = id === 'console';
const isView = id.startsWith('thetis.');
document.body.dataset.ready = 'false';
document.body.dataset.surface = isView ? 'view' : 'panel';
root.className = `radio-root ${isConsole ? 'console' : 'utility'} ${isView ? 'sidebar' : ''}`;

const unavailable = 'Radio unavailable in Foundation';
const realControls = () => `<div class="real-controls" aria-label="Radio transmit controls unavailable">${['Power', 'MOX', 'Tune', 'PTT'].map(label => `<button type="button" id="radio-${label.toLowerCase()}" data-real-control="${label.toLowerCase()}" disabled title="${unavailable}" aria-label="${label}: ${unavailable}">${label}</button>`).join('')}</div>`;
const gain = (key: GainKey, label: string) => `<label class="gain-control" for="gain-${key}"><span>${label}</span><output id="gain-${key}-value" for="gain-${key}">--</output><input id="gain-${key}" data-gain="${key}" type="range" min="0" max="100" step="1" value="0" aria-label="${label} synthetic gain"></label>`;
const gains = () => `<fieldset data-synthetic disabled class="gains"><legend>Synthetic receive gain · <span data-target-label>RX1 controls</span></legend>${gain('af', 'AF')}${gain('rf', 'RF')}${gain('agc', 'AGC')}</fieldset>`;
const receiverTarget = () => `<label class="target-label" for="receiver-target">Target <select id="receiver-target" aria-label="Receiver target"><option value="rx1">RX1 controls</option><option value="rx2">RX2 controls</option></select></label>`;
const bands = () => `<fieldset data-synthetic disabled class="button-field"><legend>Synthetic bands</legend>${receiverTarget()}<div class="button-grid bands">${BANDS.map(b => `<button type="button" data-band="${b.hz}" aria-label="Tune synthetic ${b.name} band">${b.name}</button>`).join('')}</div></fieldset>`;
const modes = () => `<fieldset data-synthetic disabled class="button-field"><legend>Mode · <span data-target-label>RX1 controls</span></legend><div class="button-grid modes">${MODES.map(mode => `<button type="button" data-mode="${mode}" aria-pressed="false">${mode}</button>`).join('')}</div></fieldset>`;
const filters = () => `<fieldset data-synthetic disabled class="button-field"><legend>Filter width · <span data-target-label>RX1 controls</span></legend><div class="button-grid filters">${FILTERS.map(hz => `<button type="button" data-filter="${hz}" aria-label="Synthetic filter ${hz} Hz" aria-pressed="false">${hz >= 1000 ? `${hz / 1000}k` : hz}</button>`).join('')}</div></fieldset>`;
const preferences = () => `<fieldset data-synthetic disabled class="preferences"><legend>Radio appearance</legend><label for="radio-skin">Radio skin<select id="radio-skin" aria-label="Radio skin"><option value="classic">Thetis Classic</option><option value="midnight">Thetis Midnight</option></select></label><label for="radio-density">Control density<select id="radio-density" aria-label="Radio control density"><option value="auto">Automatic</option><option value="expanded">Expanded</option><option value="compact">Compact</option><option value="touch">Touch</option></select></label><p class="hint">Radio skins are independent of the workbench color theme. Controls remain usable without skin images.</p></fieldset>`;
const bridgeStatus = () => `<footer class="bridge-footer"><span id="bridge-status" role="status" aria-live="polite">Waiting for extension host...</span><span class="synthetic-label">Foundation / Demo</span></footer>`;
const meter = () => `<div class="meter" aria-label="Synthetic S meter, S7 demonstration"><div class="meter-label"><span>S METER</span><strong>S7 <small>DEMO</small></strong></div><div class="meter-track"><div class="meter-fill"></div></div><div class="meter-scale"><span>1</span><span>3</span><span>5</span><span>7</span><span>9</span><span>+20</span><span>+40</span></div></div>`;
const echo = () => `<section class="diagnostic-card"><h2>Embedded diagnostic echo</h2><p>This checks the UI connection to Thetis. Radio control is unavailable.</p><fieldset data-synthetic disabled><label for="echo-value">Echo text<input id="echo-value" maxlength="512" value="Thetis Foundation" aria-label="Diagnostic echo text"></label><button id="diagnostic-echo" type="button" data-echo aria-label="Test diagnostic echo">Test diagnostic echo</button></fieldset><output id="diagnostic-status" role="status" aria-live="polite">Diagnostic endpoint: connecting...</output></section>`;
function vfo(receiver: 'A' | 'B') {
  return `<section class="vfo-card" aria-label="VFO ${receiver}"><div class="vfo-heading"><span class="vfo-badge">${receiver}</span><span>${receiver === 'A' ? 'RX1' : 'RX2'}</span><span class="vfo-mode" ${receiver === 'A' ? 'data-state-mode' : 'data-rx2-mode'}>USB</span></div><fieldset data-synthetic disabled><label for="vfo-${receiver.toLowerCase()}">Frequency <span class="unit">Hz</span></label><input id="vfo-${receiver.toLowerCase()}" data-vfo="${receiver}" type="number" min="100000" max="61440000" step="1" inputmode="numeric" aria-label="VFO ${receiver} frequency in Hz"><div class="vfo-bottom"><output id="vfo-${receiver.toLowerCase()}-formatted">--.---.---</output><div class="step-buttons"><button type="button" data-step="-1" data-receiver="${receiver}" aria-label="Step VFO ${receiver} down 1 kHz">−</button><button type="button" data-step="1" data-receiver="${receiver}" aria-label="Step VFO ${receiver} up 1 kHz">+</button></div></div></fieldset></section>`;
}
function consoleMarkup() {
  return `<header class="console-header"><div class="wordmark"><h1>Thetis</h1><span>FOUNDATION</span></div><span class="demo-badge">DEMO · Radio unavailable</span><span class="synthetic-label">Synthetic receive workspace</span></header>
  <div class="top-deck">${vfo('A')}<section class="sync-deck" aria-label="Sync Step Recall"><h2>Sync / Step / Recall</h2><button disabled title="${unavailable}">Sync</button><fieldset data-synthetic disabled><label for="vfo-step">Step<select id="vfo-step" aria-label="Synthetic VFO tuning step"><option value="10">10 Hz</option><option value="100">100 Hz</option><option value="1000" selected>1 kHz</option><option value="10000">10 kHz</option></select></label></fieldset><button disabled title="${unavailable}">Recall</button></section>${vfo('B')}</div>
  <section class="radio-status operation-row"><h2>Operation</h2>${realControls()}<p>Foundation / Demo · No hardware transport attached</p></section>
  <section class="display-deck" aria-label="Synthetic receiver display"><div class="display-heading"><span>PANADAPTER <strong data-state-mode>USB</strong> <span id="plot-filter">2.7 kHz</span></span><span class="plot-demo">SYNTHETIC DATA · −140 to 0 dBm</span></div><canvas id="panadapter" role="img" aria-label="Deterministic synthetic panadapter, not live radio data"></canvas><div class="frequency-axis" aria-label="Synthetic spectrum frequencies"><span id="axis-left">14.150 MHz</span><span id="axis-center">14.200 MHz</span><span id="axis-right">14.250 MHz</span></div><canvas id="waterfall" role="img" aria-label="Deterministic synthetic waterfall, not live radio data"></canvas><div class="display-footer"><span>RX1 / VFO A</span><span>100 kHz span</span><span>DEMO · No IQ stream</span></div></section>
  <div class="plot-tools" aria-label="Pan Zoom Display"><fieldset data-synthetic disabled><button id="plot-pause" data-plot-pause aria-label="Pause synthetic plots" aria-pressed="false">Pause demo</button></fieldset><span class="synthetic-label">Pan / Zoom / Display</span><button disabled title="${unavailable}">Pan</button><button disabled title="${unavailable}">Zoom</button><button disabled title="${unavailable}">Display</button></div>
  <div class="lower-deck"><section class="dsp-deck"><h2>Receive / DSP</h2>${gains()}<div class="dsp-unavailable" aria-label="DSP hardware controls unavailable">${['NB', 'NR', 'ANF', 'SNB', 'APF', 'BIN'].map(label => `<button disabled title="${unavailable}">${label}</button>`).join('')}</div></section><section class="mode-deck"><h2>Mode &amp; Filter</h2>${modes()}${filters()}<section id="operating-slot" class="operating-slot" aria-label="Mode-specific operating controls"></section></section><section class="meter-deck"><h2>Receiver</h2>${meter()}<dl class="readiness"><dt>Source</dt><dd>Synthetic</dd><dt>Radio</dt><dd>Unavailable</dd><dt>TX</dt><dd>Disabled</dd></dl></section></div>
  <section class="rx2-strip" aria-label="RX2 strip"><span class="rx2-badge">RX2</span><output id="rx2-frequency">7.100.000 Hz</output><span data-rx2-mode>LSB</span><span id="rx2-filter">2.7 kHz</span><fieldset data-synthetic disabled><button data-target="rx1" aria-label="Select RX1 controls" aria-pressed="true">RX1 controls</button><button data-target="rx2" aria-label="Select RX2 controls" aria-pressed="false">RX2 controls</button><label class="rx2-enable-label"><input type="checkbox" id="rx2-enabled" aria-label="Show synthetic RX2 display"> RX2 demo display</label></fieldset><span class="hint">Synthetic receiver</span></section>
  <section id="rx2-display" class="display-deck rx2-display" aria-label="Synthetic RX2 display" hidden><div class="display-heading">RX2 · SYNTHETIC DATA · Radio unavailable</div><canvas id="rx2-panadapter" role="img" aria-label="Deterministic synthetic RX2 panadapter, not live radio data"></canvas></section>
  <details class="console-preferences"><summary>Radio appearance &amp; diagnostics</summary><div>${preferences()}${echo()}</div></details>${bridgeStatus()}`;
}
function viewMarkup() {
  let body: string;
  switch (id) {
    case 'thetis.operation.power': body = `<p class="foundation-note">Foundation / Demo · Radio unavailable</p>${realControls()}<p class="hint">Transmit requires the future radio integration.</p>`; break;
    case 'thetis.operation.gain': body = gains(); break;
    case 'thetis.operation.device': body = `<dl class="readiness"><dt>Build</dt><dd>Foundation / Demo</dd><dt>Device</dt><dd>Radio unavailable</dd><dt>Source</dt><dd>Synthetic</dd><dt>Transport</dt><dd>Not attached</dd></dl>`; break;
    case 'thetis.receiver.meters': body = `${meter()}<p class="hint">Synthetic reading · No live signal</p>`; break;
    case 'thetis.receiver.bands': body = bands(); break;
    case 'thetis.receiver.modes': body = modes(); break;
    case 'thetis.receiver.filters': body = filters(); break;
    case 'thetis.receiver.pureSignal': body = `<p>PureSignal</p><p class="hint">Radio unavailable. Predistortion controls are disabled in Foundation.</p><button disabled title="${unavailable}">Enable PureSignal</button>`; break;
    case 'thetis.receiver.diversity': body = `<p>Diversity</p><p class="hint">Radio unavailable. Diversity controls are disabled in Foundation.</p><button disabled title="${unavailable}">Enable diversity</button>`; break;
    default: body = `<p>Foundation / Demo · Radio unavailable</p>`;
  }
  return `${body}${bridgeStatus()}`;
}
function utilityMarkup() {
  const preview = previewPanel(id);
  if (preview) return `<header class="utility-header"><h1>Thetis ${preview.title}</h1><span class="demo-badge">Stage ${preview.stage} preview</span></header><p>This feature is planned for Stage ${preview.stage}.</p><p>Planned destination: ${preview.destination}.</p><p>Foundation / Demo · Radio unavailable. This preview cannot operate a radio.</p>${bridgeStatus()}`;
  const headings: Record<string, string> = { audio: 'Audio', rf: 'RF', display: 'Display', setup: 'Setup', diagnostics: 'Diagnostics', memories: 'Memories' };
  let body: string;
  switch (id) {
    case 'audio': body = `${gains()}<p class="hint">Audio devices, routing, equalization, and recording require radio integration.</p>`; break;
    case 'rf': body = `${gains()}<h2>Transmit &amp; RF</h2>${realControls()}<p>PureSignal and diversity are unavailable in Foundation.</p>`; break;
    case 'display': body = preferences(); break;
    case 'setup': body = `<dl class="readiness"><dt>Mode</dt><dd>Foundation / Demo</dd><dt>Radio</dt><dd>Unavailable</dd><dt>Data</dt><dd>Synthetic</dd></dl><p>Move, hide, and resize views using the native workbench title bars and view menus. Layout changes are preserved by Code OSS.</p><p>Run “Thetis: Restore Default Layout” in the Command Palette to reset view locations.</p>`; break;
    case 'diagnostics': body = `${echo()}<h2>First-click diagnostics</h2><p>Pointer, focus, input, and message acknowledgements appear in Thetis Logs → Sequence / Interaction Trace and the Thetis Foundation output channel.</p><p class="hint">Inputs enable only after this panel receives the initial shared model snapshot.</p>`; break;
    case 'memories': body = `<p>Choose a synthetic band preset for the selected receiver. Memories are not connected to a radio database.</p>${bands()}<p class="hint">Memory import, storage, and recall are unavailable in Foundation.</p>`; break;
    default: body = '';
  }
  return `<header class="utility-header"><h1>Thetis ${headings[id] ?? 'Foundation'}</h1><span class="demo-badge">Foundation / Demo · Radio unavailable</span></header>${body}${bridgeStatus()}`;
}
root.innerHTML = isConsole ? consoleMarkup() : isView ? viewMarkup() : utilityMarkup();
// IDs and native ARIA/disabled states are stable future skin mapping identities.
for (const element of root.querySelectorAll<HTMLElement>('[id]')) element.dataset.component = element.id;
const controlValues = bindControlValues(document, window, () => render());

function trace(event: string, target?: EventTarget | null, pointerId?: number) {
  const element = target instanceof Element ? target.closest<HTMLElement>('[id],button,input,select') ?? target : undefined;
  bridge.postMessage({ type: 'trace', event, target: element?.id || element?.getAttribute('aria-label') || element?.tagName || 'document', ready,
    sequence: ++traceSequence, pointerId, focused: document.hasFocus() });
}
function sendAction(action: unknown) {
  if (!ready) { trace('action-before-ready'); return; }
  bridge.postMessage({ type: 'action', action, sequence: ++sequence });
}
function updateStatus(detail?: string) {
  const output = document.getElementById('bridge-status');
  if (output) output.textContent = detail ?? (ready ? `Synthetic controls ready · revision ${state?.revision ?? 0} · ack ${lastAck}` : 'Waiting for extension host...');
}
function setValue(id: string, value: string) {
  const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  controlValues.setValue(element, value);
}
function text(id: string, value: string) {
  const element = document.getElementById(id);
  // Preserve text nodes during focus reconciliation, including an in-flight click.
  if (element && element.textContent !== value) element.textContent = value;
}
function formatted(hz: number): string { return String(hz).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function render() {
  if (!state) return;
  const target = state.receiverTarget === 'rx2' ? state.rx2 : state;
  applyRadioTheme(root, resolveRadioTheme(state.radioTheme).tokens);
  root.dataset.skin = state.radioTheme;
  root.dataset.density = resolveDensity(state.density, root.clientWidth, matchMedia('(pointer: coarse)').matches);
  document.body.dataset.skin = state.radioTheme;
  setValue('vfo-a', String(state.vfoAHz));
  setValue('vfo-b', String(state.vfoBHz));
  text('vfo-a-formatted', `${formatted(state.vfoAHz)} Hz`);
  text('vfo-b-formatted', `${formatted(state.vfoBHz)} Hz`);
  text('rx2-frequency', `${formatted(state.vfoBHz)} Hz`);
  for (const key of ['af', 'rf', 'agc'] as const) { setValue(`gain-${key}`, String(target.gains[key])); text(`gain-${key}-value`, String(target.gains[key])); }
  setValue('radio-skin', state.radioTheme);
  setValue('radio-density', state.density);
  setValue('receiver-target', state.receiverTarget);
  const rx2Enabled = document.getElementById('rx2-enabled') as HTMLInputElement | null;
  if (rx2Enabled) rx2Enabled.checked = state.rx2Enabled;
  const rx2Display = document.getElementById('rx2-display');
  if (rx2Display) rx2Display.hidden = !state.rx2Enabled;
  for (const element of root.querySelectorAll('[data-state-mode]')) element.textContent = state.mode;
  for (const element of root.querySelectorAll('[data-rx2-mode]')) element.textContent = state.rx2.mode;
  for (const element of root.querySelectorAll('[data-target-label]')) element.textContent = `${state.receiverTarget.toUpperCase()} controls`;
  for (const element of root.querySelectorAll<HTMLElement>('[data-mode]')) element.setAttribute('aria-pressed', String(element.dataset.mode === target.mode));
  for (const element of root.querySelectorAll<HTMLElement>('[data-filter]')) element.setAttribute('aria-pressed', String(Number(element.dataset.filter) === target.filterHz));
  for (const element of root.querySelectorAll<HTMLElement>('[data-target]')) element.setAttribute('aria-pressed', String(element.dataset.target === state.receiverTarget));
  text('plot-filter', `${state.filterHz / 1000} kHz`);
  text('rx2-filter', `${state.rx2.filterHz / 1000} kHz`);
  const pause = document.getElementById('plot-pause');
  if (pause) {
    text('plot-pause', state.plotPaused ? 'Resume demo' : 'Pause demo');
    pause.setAttribute('aria-label', state.plotPaused ? 'Resume synthetic plots' : 'Pause synthetic plots');
    pause.setAttribute('aria-pressed', String(state.plotPaused));
  }
  const slot = document.getElementById('operating-slot');
  if (slot) {
    const family = operatingFamily(target.mode);
    if (slot.dataset.operatingMode !== family) {
      const families = { phone: ['Phone', 'Mic gain', 'VOX', 'Compressor'], cw: ['CW', 'CW speed', 'Sidetone', 'Keyer'], fm: ['FM', 'Deviation', 'Tone', 'Squelch'], digital: ['Digital', 'VAC', 'Line gain', 'Audio routing'] };
      const [heading, ...controls] = families[family];
      slot.dataset.operatingMode = family;
      slot.innerHTML = `<h2>${heading} operating controls</h2><div>${controls.map(control => `<button disabled title="${unavailable}">${control}</button>`).join('')}</div><p class="hint">Radio unavailable · controls disabled</p>`;
    }
  }
  text('axis-left', `${((state.vfoAHz - 50000) / 1e6).toFixed(3)} MHz`);
  text('axis-center', `${(state.vfoAHz / 1e6).toFixed(3)} MHz`);
  text('axis-right', `${((state.vfoAHz + 50000) / 1e6).toFixed(3)} MHz`);
  drawPlots();
  updateStatus();
}
function canvasContext(id: string) {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) return;
  const scale = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(canvas.clientWidth));
  const height = Math.max(1, Math.floor(canvas.clientHeight));
  canvas.width = width * scale; canvas.height = height * scale;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(scale, scale);
  return { context, width, height };
}
function drawPlots() {
  if (!state || !isConsole) return;
  const tokens = resolveRadioTheme(state.radioTheme).tokens;
  const plot = canvasContext('panadapter');
  if (plot) {
    const { context: ctx, width, height } = plot;
    ctx.fillStyle = tokens['--radio-plot']; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = tokens['--radio-grid']; ctx.lineWidth = 1;
    ctx.font = '10px Segoe UI';
    for (let i = 1; i < 7; i++) {
      const y = i * height / 7;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      ctx.fillStyle = tokens['--radio-muted']; ctx.fillText(String(-20 * i), 6, y - 4);
    }
    for (let i = 1; i < 10; i++) { const x = i * width / 10; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    const filterWidth = Math.max(4, width * state.filterHz / 100000);
    ctx.fillStyle = `${tokens['--radio-accent']}28`; ctx.fillRect(width / 2, 0, filterWidth, height);
    ctx.strokeStyle = tokens['--radio-accent']; ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); ctx.stroke();
    const values = syntheticSpectrum(Math.min(1200, width), frame);
    ctx.strokeStyle = tokens['--radio-trace']; ctx.lineWidth = 1.4; ctx.beginPath();
    values.forEach((value, i) => { const x = i * width / (values.length - 1); const y = -value / 140 * height; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath();
    const fill = ctx.createLinearGradient(0, 0, 0, height); fill.addColorStop(0, `${tokens['--radio-trace']}40`); fill.addColorStop(1, `${tokens['--radio-trace']}04`);
    ctx.fillStyle = fill; ctx.fill();
  }
  const waterfall = canvasContext('waterfall');
  if (waterfall) {
    const { context: ctx, width, height } = waterfall;
    ctx.fillStyle = tokens['--radio-plot']; ctx.fillRect(0, 0, width, height);
    const columns = Math.min(320, Math.ceil(width / 2)), rows = 48;
    for (let row = 0; row < rows; row++) {
      const values = syntheticSpectrum(columns, row + frame);
      for (let col = 0; col < columns; col++) {
        const intensity = Math.max(0, Math.min(1, (values[col] + 130) / 85));
        ctx.fillStyle = state.radioTheme === 'midnight' ? `hsl(${207 - intensity * 62} 66% ${10 + intensity * 55}%)` : `hsl(${226 - intensity * 178} 72% ${11 + intensity * 48}%)`;
        ctx.fillRect(col * width / columns, row * height / rows, Math.ceil(width / columns), Math.ceil(height / rows));
      }
    }
    ctx.fillStyle = tokens['--radio-accent']; ctx.fillRect(width / 2, 0, 1, height);
  }
  if (state.rx2Enabled) {
    const rx2 = canvasContext('rx2-panadapter');
    if (rx2) {
      const { context: ctx, width, height } = rx2;
      ctx.fillStyle = tokens['--radio-plot']; ctx.fillRect(0, 0, width, height);
      const values = syntheticSpectrum(Math.min(600, width), frame + 14);
      ctx.strokeStyle = tokens['--radio-trace']; ctx.lineWidth = 1.3; ctx.beginPath();
      values.forEach((value, i) => { const x = i * width / (values.length - 1); const y = -value / 140 * height; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    }
  }
}

document.addEventListener('pointerdown', event => trace('pointerdown', event.target, event.pointerId), true);
document.addEventListener('focusin', event => trace('focusin', event.target), true);
document.addEventListener('click', event => {
  trace('click', event.target, event instanceof PointerEvent ? event.pointerId : undefined);
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
  if (!button || button.disabled || !state || !ready) return;
  const data = button.dataset;
  if (data.mode) sendAction({ type: 'setMode', mode: data.mode });
  else if (data.filter) sendAction({ type: 'setFilter', hz: Number(data.filter) });
  else if (data.band) sendAction({ type: 'setVfo', receiver: state.receiverTarget === 'rx1' ? 'A' : 'B', hz: Number(data.band) });
  else if (data.target) sendAction({ type: 'selectReceiver', receiver: data.target });
  else if (data.step) {
    const hz = (data.receiver === 'A' ? state.vfoAHz : state.vfoBHz) + Number(data.step) * tuningStepHz;
    sendAction({ type: 'setVfo', receiver: data.receiver, hz });
  } else if ('plotPause' in data) sendAction({ type: 'setPlotPaused', paused: !state.plotPaused });
  else if ('echo' in data) {
    const value = (document.getElementById('echo-value') as HTMLInputElement | null)?.value ?? 'Thetis Foundation';
    bridge.postMessage({ type: 'echo', value });
  }
});
document.addEventListener('input', event => {
  trace('input', event.target);
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !ready) return;
  if (input.dataset.gain) {
    text(`${input.id}-value`, input.value);
    sendAction({ type: 'setGain', key: input.dataset.gain, value: Number(input.value) });
  }
});
document.addEventListener('change', event => {
  trace('change', event.target);
  const input = event.target;
  if (!ready || !(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
  if (input.dataset.vfo) {
    if (input.checkValidity() && input.value.trim()) sendAction({ type: 'setVfo', receiver: input.dataset.vfo, hz: Number(input.value) });
    else { input.reportValidity(); updateStatus('Enter a whole frequency from 100000 to 61440000 Hz.'); }
  } else if (input.id === 'radio-skin') sendAction({ type: 'setRadioTheme', id: input.value });
  else if (input.id === 'radio-density') sendAction({ type: 'setDensity', density: input.value });
  else if (input.id === 'receiver-target') sendAction({ type: 'selectReceiver', receiver: input.value });
  else if (input.id === 'rx2-enabled' && input instanceof HTMLInputElement) sendAction({ type: 'setRx2Enabled', enabled: input.checked });
  else if (input.id === 'vfo-step') {
    tuningStepHz = Number(input.value);
    for (const button of root.querySelectorAll<HTMLElement>('[data-step]')) button.setAttribute('aria-label', `Step VFO ${button.dataset.receiver} ${button.dataset.step === '1' ? 'up' : 'down'} ${tuningStepHz} Hz`);
  }
});
window.addEventListener('message', event => {
  const message = event.data;
  if (!message || typeof message !== 'object') return;
  if (message.type === 'state' && message.state?.version === 1 && message.state.source === 'synthetic') {
    state = message.state;
    render();
    if (!ready) {
      ready = true;
      for (const fieldset of root.querySelectorAll<HTMLFieldSetElement>('fieldset[data-synthetic]')) fieldset.disabled = false;
      document.body.dataset.ready = 'true';
      bridge.setState({ id, scrollTop: bridge.getState()?.scrollTop ?? 0 });
      trace('model-ready');
      updateStatus();
    }
  } else if (message.type === 'ack' && Number.isSafeInteger(message.sequence)) {
    lastAck = message.sequence;
    updateStatus(message.accepted ? undefined : 'Synthetic action rejected by extension validation.');
    trace(message.accepted ? 'message-ack' : 'message-rejected');
  } else if (message.type === 'diagnostic') {
    const diagnostic = message.status as EchoStatus;
    if (typeof diagnostic?.detail === 'string') text('diagnostic-status', diagnostic.detail);
    document.getElementById('diagnostic-status')?.setAttribute('data-state', diagnostic.phase);
  }
});
const restoredScroll = bridge.getState()?.scrollTop;
if (typeof restoredScroll === 'number' && Number.isFinite(restoredScroll)) window.scrollTo(0, restoredScroll);
window.addEventListener('scroll', () => bridge.setState({ id, scrollTop: window.scrollY }), { passive: true });
new ResizeObserver(() => { if (state) { root.dataset.density = resolveDensity(state.density, root.clientWidth, matchMedia('(pointer: coarse)').matches); drawPlots(); } }).observe(root);
if (isConsole) setInterval(() => { if (ready && state && !state.plotPaused && document.visibilityState === 'visible') { frame = (frame + 1) % 3600; drawPlots(); } }, 500);
trace('script-ready');
// Listeners and disabled controls are installed before readiness is announced.
bridge.postMessage({ type: 'ready', id });
