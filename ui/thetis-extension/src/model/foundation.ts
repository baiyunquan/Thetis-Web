/** Foundation state is synthetic only. No action in this module can key a radio. */
export const MODES = ['LSB', 'USB', 'DSB', 'CWL', 'CWU', 'FM', 'AM', 'SAM', 'DIGL', 'DIGU'] as const;
export const FILTERS = [100, 250, 500, 1000, 1800, 2400, 2700, 3000, 4000, 6000, 10000] as const;
export const BANDS = [
  { name: '160m', hz: 1900000 }, { name: '80m', hz: 3700000 }, { name: '60m', hz: 5357000 },
  { name: '40m', hz: 7100000 }, { name: '30m', hz: 10120000 }, { name: '20m', hz: 14200000 },
  { name: '17m', hz: 18100000 }, { name: '15m', hz: 21200000 }, { name: '12m', hz: 24920000 },
  { name: '10m', hz: 28400000 }, { name: '6m', hz: 50200000 }
] as const;
export type Mode = typeof MODES[number];
export function operatingFamily(mode: Mode): 'phone' | 'cw' | 'fm' | 'digital' {
  return mode === 'CWL' || mode === 'CWU' ? 'cw' : mode === 'FM' ? 'fm' : mode === 'DIGL' || mode === 'DIGU' ? 'digital' : 'phone';
}
export type GainKey = 'af' | 'rf' | 'agc';
export type RadioThemeId = 'classic' | 'midnight';
export type Density = 'auto' | 'expanded' | 'compact' | 'touch';
export interface ReceiverControls {
  readonly mode: Mode;
  readonly filterHz: number;
  readonly gains: Readonly<Record<GainKey, number>>;
}
export interface FoundationState {
  readonly version: 1;
  readonly revision: number;
  readonly vfoAHz: number;
  readonly vfoBHz: number;
  readonly mode: Mode;
  readonly filterHz: number;
  readonly receiverTarget: 'rx1' | 'rx2';
  readonly rx2Enabled: boolean;
  readonly plotPaused: boolean;
  readonly rx2: ReceiverControls;
  readonly gains: Readonly<Record<GainKey, number>>;
  readonly radioTheme: RadioThemeId;
  readonly density: Density;
  readonly radioAvailable: false;
  readonly power: false;
  readonly source: 'synthetic';
}
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}
function integerBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}
function freeze(state: FoundationState): FoundationState {
  Object.freeze(state.gains);
  Object.freeze(state.rx2.gains);
  Object.freeze(state.rx2);
  return Object.freeze(state);
}
export function createInitialState(saved?: unknown): FoundationState {
  const data = record(saved);
  const gains = record(data.gains);
  const rx2 = record(data.rx2);
  const rx2Gains = record(rx2.gains);
  return freeze({
    version: 1, revision: 0,
    vfoAHz: integerBetween(data.vfoAHz, 100000, 61440000) ? data.vfoAHz : 14200000,
    vfoBHz: integerBetween(data.vfoBHz, 100000, 61440000) ? data.vfoBHz : 7100000,
    mode: MODES.includes(data.mode as Mode) ? data.mode as Mode : 'USB',
    filterHz: FILTERS.includes(data.filterHz as any) ? data.filterHz as number : 2700,
    receiverTarget: data.receiverTarget === 'rx2' ? 'rx2' : 'rx1',
    rx2Enabled: data.rx2Enabled === true,
    plotPaused: data.plotPaused === true,
    rx2: {
      mode: MODES.includes(rx2.mode as Mode) ? rx2.mode as Mode : 'LSB',
      filterHz: FILTERS.includes(rx2.filterHz as any) ? rx2.filterHz as number : 2700,
      gains: {
        af: integerBetween(rx2Gains.af, 0, 100) ? rx2Gains.af : 35,
        rf: integerBetween(rx2Gains.rf, 0, 100) ? rx2Gains.rf : 80,
        agc: integerBetween(rx2Gains.agc, 0, 100) ? rx2Gains.agc : 60
      }
    },
    gains: {
      af: integerBetween(gains.af, 0, 100) ? gains.af : 45,
      rf: integerBetween(gains.rf, 0, 100) ? gains.rf : 80,
      agc: integerBetween(gains.agc, 0, 100) ? gains.agc : 60
    },
    radioTheme: data.radioTheme === 'midnight' ? 'midnight' : 'classic',
    density: ['auto', 'expanded', 'compact', 'touch'].includes(data.density as string) ? data.density as Density : 'auto',
    radioAvailable: false, power: false, source: 'synthetic'
  });
}
export function reduceFoundationState(state: FoundationState, input: unknown): FoundationState | undefined {
  const action = record(input);
  let patch: Partial<FoundationState>;
  switch (action.type) {
    case 'selectReceiver':
      if (action.receiver !== 'rx1' && action.receiver !== 'rx2') return;
      patch = { receiverTarget: action.receiver };
      break;
    case 'setRx2Enabled':
      if (typeof action.enabled !== 'boolean') return;
      patch = { rx2Enabled: action.enabled };
      break;
    case 'setPlotPaused':
      if (typeof action.paused !== 'boolean') return;
      patch = { plotPaused: action.paused };
      break;
    case 'setVfo':
      if (!['A', 'B'].includes(action.receiver as string) || !integerBetween(action.hz, 100000, 61440000)) return;
      patch = action.receiver === 'A' ? { vfoAHz: action.hz } : { vfoBHz: action.hz };
      break;
    case 'setGain':
      if (!['af', 'rf', 'agc'].includes(action.key as string) || !integerBetween(action.value, 0, 100)) return;
      patch = state.receiverTarget === 'rx2'
        ? { rx2: { ...state.rx2, gains: { ...state.rx2.gains, [action.key as GainKey]: action.value } } }
        : { gains: { ...state.gains, [action.key as GainKey]: action.value } };
      break;
    case 'setMode':
      if (!MODES.includes(action.mode as Mode)) return;
      patch = state.receiverTarget === 'rx2' ? { rx2: { ...state.rx2, mode: action.mode as Mode } } : { mode: action.mode as Mode };
      break;
    case 'setFilter':
      if (!FILTERS.includes(action.hz as any)) return;
      patch = state.receiverTarget === 'rx2' ? { rx2: { ...state.rx2, filterHz: action.hz as number } } : { filterHz: action.hz as number };
      break;
    case 'setRadioTheme':
      if (action.id !== 'classic' && action.id !== 'midnight') return;
      patch = { radioTheme: action.id };
      break;
    case 'setDensity':
      if (!['auto', 'expanded', 'compact', 'touch'].includes(action.density as string)) return;
      patch = { density: action.density as Density };
      break;
    default: return;
  }
  return freeze({ ...state, ...patch, revision: state.revision + 1 });
}
export function createFoundationModel(saved?: unknown) {
  let state = createInitialState(saved);
  const listeners = new Set<(state: FoundationState) => void>();
  return {
    getState: () => state,
    dispatch(input: unknown): boolean {
      const next = reduceFoundationState(state, input);
      if (!next) return false;
      state = next;
      for (const listener of listeners) listener(state);
      return true;
    },
    subscribe(listener: (state: FoundationState) => void) {
      listeners.add(listener);
      return { dispose: () => { listeners.delete(listener); } };
    }
  };
}
export type FoundationModel = ReturnType<typeof createFoundationModel>;

/** Repeatable demonstration trace, deliberately unrelated to hardware IQ/audio. */
export function syntheticSpectrum(count: number, frame = 0): number[] {
  const length = Math.max(0, Math.min(4096, Math.floor(count)));
  return Array.from({ length }, (_, i) => {
    const x = i / Math.max(1, length - 1);
    const noise = 4 * Math.sin(i * 1.31 + frame * 0.17) + 2 * Math.cos(i * 2.74 + frame * 0.31);
    const peak = (center: number, width: number, height: number) => height * Math.exp(-Math.pow((x - center) / width, 2));
    return Math.max(-140, Math.min(0, -119 + noise + peak(0.36, 0.012, 62) + peak(0.67, 0.018, 42) + peak(0.82, 0.006, 29)));
  });
}
