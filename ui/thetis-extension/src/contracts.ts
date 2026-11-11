/** Operational backend contracts. These values never originate in the synthetic foundation store. */
export const RADIO_SCHEMA_VERSION = 1 as const;
export type ReceiverId = 'rx1' | 'rx2' | 'sub';
export type VfoId = 'a' | 'b';
export interface ReceiverState {
  readonly id: ReceiverId;
  readonly vfoAHz: number | null;
  readonly vfoBHz: number | null;
}
export interface RadioSnapshot {
  readonly schemaVersion: 1;
  readonly sessionGeneration: string;
  readonly revision: number;
  readonly lifecycle: string;
  readonly receivers: readonly ReceiverState[];
  readonly capabilities: readonly string[];
  readonly fault: string | null;
}
export interface RadioCommand {
  readonly requestId: string;
  readonly sessionGeneration: string;
  readonly connectionId: string;
  readonly sequence: number;
  readonly operation: 'receiver.setFrequency';
  readonly target: ReceiverId;
  readonly payload: { readonly vfo: VfoId; readonly frequencyHz: number };
  readonly expectedRevision?: number;
}
export interface CommandResult {
  readonly schemaVersion: 1;
  readonly requestId: string;
  readonly sessionGeneration: string;
  readonly connectionId: string;
  readonly sequence: number;
  readonly accepted: boolean;
  readonly revision: number;
  readonly error: { readonly code: string; readonly message: string } | null;
}
export function parseRadioSnapshot(input: unknown): RadioSnapshot {
  const data = input as RadioSnapshot;
  const safeHz = (hz: unknown) => hz === null || typeof hz === 'number' && Number.isSafeInteger(hz) && hz >= 0;
  if (!data || data.schemaVersion !== RADIO_SCHEMA_VERSION || typeof data.sessionGeneration !== 'string' || !data.sessionGeneration ||
    !Number.isSafeInteger(data.revision) || data.revision < 0 || typeof data.lifecycle !== 'string' ||
    !Array.isArray(data.receivers) || !Array.isArray(data.capabilities) || !data.capabilities.every(x => typeof x === 'string') ||
    !(data.fault === null || typeof data.fault === 'string')) throw new Error('Incompatible radio snapshot');
  const seen = new Set<ReceiverId>();
  const receivers = data.receivers.map(receiver => {
    if (!receiver || !['rx1', 'rx2', 'sub'].includes(receiver.id) || seen.has(receiver.id) || !safeHz(receiver.vfoAHz) || !safeHz(receiver.vfoBHz)) {
      throw new Error('Invalid radio receiver state');
    }
    seen.add(receiver.id);
    return Object.freeze({ id: receiver.id, vfoAHz: receiver.vfoAHz, vfoBHz: receiver.vfoBHz });
  });
  return Object.freeze({ schemaVersion: RADIO_SCHEMA_VERSION, sessionGeneration: data.sessionGeneration, revision: data.revision,
    lifecycle: data.lifecycle, receivers: Object.freeze(receivers), capabilities: Object.freeze([...data.capabilities]), fault: data.fault });
}
