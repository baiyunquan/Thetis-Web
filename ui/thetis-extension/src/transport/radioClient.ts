import { parseRadioSnapshot, type CommandResult, type RadioCommand, type RadioSnapshot } from '../contracts';

export type RadioAction = Pick<RadioCommand, 'operation' | 'target' | 'payload' | 'expectedRevision'>;
export type RadioSocket = Pick<WebSocket, 'readyState' | 'send' | 'close' | 'onopen' | 'onmessage' | 'onclose' | 'onerror'>;
export interface RadioConnectionStatus {
  readonly phase: 'idle' | 'connecting' | 'connected' | 'rejected' | 'disconnected' | 'incompatible';
  readonly detail: string;
}
export interface StartupPrompt {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly choices: readonly string[];
  readonly defaultChoice: string;
}
/** One operational socket per extension host. Views cannot queue actions while disconnected. */
export class RadioClient {
  private socket?: RadioSocket;
  private snapshot?: RadioSnapshot;
  private connectionId?: string;
  private sequence = 0;
  private disposed = false;
  private heartbeat?: ReturnType<typeof setInterval>;
  private welcomeDeadline?: ReturnType<typeof setTimeout>;
  private status: RadioConnectionStatus = { phase: 'idle', detail: 'Backend not connected' };
  private readonly listeners = new Set<(snapshot: RadioSnapshot) => void>();
  private readonly statusListeners = new Set<(status: RadioConnectionStatus) => void>();
  private readonly promptListeners = new Set<(prompts: readonly StartupPrompt[]) => void>();
  private prompts: readonly StartupPrompt[] = [];
  private readonly pending = new Map<string, {
    command: RadioCommand; resolve: (result: CommandResult) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>;
  }>();
  constructor(private readonly endpoint: string, private readonly createSocket: (url: string) => RadioSocket = url => new WebSocket(url)) {}
  getStatus(): RadioConnectionStatus { return this.status; }
  subscribe(listener: (snapshot: RadioSnapshot) => void) { this.listeners.add(listener); return { dispose: () => { this.listeners.delete(listener); } }; }
  subscribeStatus(listener: (status: RadioConnectionStatus) => void) { this.statusListeners.add(listener); return { dispose: () => { this.statusListeners.delete(listener); } }; }
  subscribePrompts(listener: (prompts: readonly StartupPrompt[]) => void) { this.promptListeners.add(listener); return { dispose: () => { this.promptListeners.delete(listener); } }; }
  getPrompts(): readonly StartupPrompt[] { return this.prompts; }
  private update(status: RadioConnectionStatus) {
    this.status = Object.freeze(status);
    for (const listener of this.statusListeners) listener(this.status);
  }
  connect(): void {
    if (this.disposed || this.socket) return;
    try {
      const endpoint = new URL(this.endpoint);
      if (!['ws:', 'wss:'].includes(endpoint.protocol)) throw new Error('Expected embedded WebSocket endpoint');
      this.connectionId = undefined; this.sequence = 0;
      this.update({ phase: 'connecting', detail: 'Connecting to the radio backend' });
      const socket = this.socket = this.createSocket(endpoint.href);
      this.welcomeDeadline = setTimeout(() => this.disconnect(socket, 'disconnected', 'Backend welcome timed out'), 10000);
      socket.onmessage = event => {
        if (this.socket !== socket || this.disposed) return;
        try { this.receive(socket, JSON.parse(String(event.data))); }
        catch (error) { this.disconnect(socket, 'incompatible', error instanceof Error ? error.message : 'Invalid backend message'); }
      };
      socket.onerror = () => this.disconnect(socket, 'disconnected', 'Backend disconnected');
      socket.onclose = () => this.disconnect(socket, 'disconnected', 'Backend disconnected');
    } catch (error) {
      this.update({ phase: 'incompatible', detail: error instanceof Error ? error.message : 'Invalid backend endpoint' });
    }
  }
  private receive(socket: RadioSocket, message: any) {
    if (!message || typeof message !== 'object') throw new Error('Invalid backend message');
    switch (message.type) {
      case 'rejected':
        if (message.code !== 'controllerBusy') throw new Error('Backend rejected the connection');
        this.disconnect(socket, 'rejected', 'Already in use. Close the other browser, then Retry.');
        return;
      case 'welcome': {
        if (this.connectionId || message.schemaVersion !== 1 || typeof message.connectionId !== 'string' || !message.connectionId) throw new Error('Incompatible backend welcome');
        this.snapshot = parseRadioSnapshot(message.snapshot);
        if (this.welcomeDeadline) clearTimeout(this.welcomeDeadline); this.welcomeDeadline = undefined;
        this.connectionId = message.connectionId;
        this.update({ phase: 'connected', detail: 'Connected to the shared radio backend' });
        for (const listener of this.listeners) listener(this.snapshot);
        this.heartbeat = setInterval(() => {
          if (this.socket === socket && socket.readyState === 1) {
            try { socket.send(JSON.stringify({ type: 'heartbeat' })); }
            catch { this.disconnect(socket, 'disconnected', 'Backend disconnected'); }
          }
        }, 15000);
        return;
      }
      case 'snapshot': {
        if (!this.connectionId || !this.snapshot) throw new Error('Snapshot arrived before backend welcome');
        const next = parseRadioSnapshot(message.snapshot);
        if (next.sessionGeneration !== this.snapshot.sessionGeneration) throw new Error('Backend generation changed; reconnect for a new session');
        // Each event carries a complete snapshot, so a skipped revision is already a full resynchronization.
        if (next.revision <= this.snapshot.revision) return;
        this.snapshot = next;
        for (const listener of this.listeners) listener(next);
        return;
      }
      case 'result': {
        const result = message.result as CommandResult;
        const entry = result && this.pending.get(result.requestId);
        if (!entry) return;
        if (result.schemaVersion !== 1 || result.connectionId !== this.connectionId || result.sessionGeneration !== entry.command.sessionGeneration ||
          result.sequence !== entry.command.sequence || !Number.isSafeInteger(result.revision) || result.revision < 0 || typeof result.accepted !== 'boolean' ||
          (result.accepted ? result.error !== null : !result.error || typeof result.error.code !== 'string' || typeof result.error.message !== 'string')) {
          throw new Error('Invalid backend acknowledgment');
        }
        clearTimeout(entry.timer); this.pending.delete(result.requestId); entry.resolve(result);
        return;
      }
      case 'prompts': {
        if (!this.connectionId || !Array.isArray(message.prompts) || message.prompts.length > 32) throw new Error('Invalid startup prompts');
        this.prompts = Object.freeze(message.prompts.map((prompt: StartupPrompt) => {
          if (!prompt || typeof prompt.id !== 'string' || typeof prompt.title !== 'string' || typeof prompt.message !== 'string' ||
            !Array.isArray(prompt.choices) || !prompt.choices.length || !prompt.choices.every(choice => typeof choice === 'string') || !prompt.choices.includes(prompt.defaultChoice)) throw new Error('Invalid startup choice');
          return Object.freeze({ id: prompt.id, title: prompt.title, message: prompt.message, choices: Object.freeze([...prompt.choices]), defaultChoice: prompt.defaultChoice });
        }));
        for (const listener of this.promptListeners) listener(this.prompts);
        return;
      }
      case 'heartbeat': case 'promptResult': return;
      default: throw new Error('Unsupported backend message');
    }
  }
  async getSnapshot(): Promise<RadioSnapshot> {
    if (this.status.phase !== 'connected' || !this.snapshot) throw new Error('Backend not connected');
    return this.snapshot;
  }
  async execute(action: RadioAction): Promise<CommandResult> {
    const socket = this.socket;
    if (!socket || socket.readyState !== 1 || this.status.phase !== 'connected' || !this.connectionId || !this.snapshot) throw new Error('Backend not connected');
    if (action.operation !== 'receiver.setFrequency' || !['rx1', 'rx2', 'sub'].includes(action.target) || !action.payload ||
      !['a', 'b'].includes(action.payload.vfo) || !Number.isSafeInteger(action.payload.frequencyHz) || action.payload.frequencyHz < 0 ||
      action.expectedRevision !== undefined && (!Number.isSafeInteger(action.expectedRevision) || action.expectedRevision < 0)) throw new Error('Invalid radio action');
    if (this.pending.size >= 32) throw new Error('Too many pending backend commands');
    const sequence = ++this.sequence;
    const command: RadioCommand = { requestId: `${this.connectionId}-${sequence}`, sessionGeneration: this.snapshot.sessionGeneration,
      connectionId: this.connectionId, sequence, operation: action.operation, target: action.target,
      payload: { vfo: action.payload.vfo, frequencyHz: action.payload.frequencyHz }, expectedRevision: action.expectedRevision };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(command.requestId);
        reject(new Error('Command timed out; its outcome is unknown. Refresh state before making another change.'));
        if (this.socket === socket && socket.readyState === 1) {
          try { socket.send(JSON.stringify({ type: 'snapshot' })); }
          catch { this.disconnect(socket, 'disconnected', 'Backend disconnected'); }
        }
      }, 5000);
      this.pending.set(command.requestId, { command, resolve, reject, timer });
      try { socket.send(JSON.stringify({ type: 'command', schemaVersion: 1, command })); }
      catch { this.disconnect(socket, 'disconnected', 'Backend disconnected'); }
    });
  }
  respond(promptId: string, choice: string): void {
    const prompt = this.prompts.find(item => item.id === promptId);
    if (this.status.phase !== 'connected' || !this.socket || !prompt?.choices.includes(choice)) throw new Error('Startup choice is unavailable');
    try { this.socket.send(JSON.stringify({ type: 'respond', promptId, choice })); }
    catch { this.disconnect(this.socket, 'disconnected', 'Backend disconnected'); }
  }
  private disconnect(socket: RadioSocket, phase: RadioConnectionStatus['phase'], detail: string) {
    if (this.socket !== socket) return;
    this.socket = undefined; this.connectionId = undefined;
    socket.onopen = null; socket.onmessage = null; socket.onclose = null; socket.onerror = null;
    if (this.heartbeat) clearInterval(this.heartbeat); this.heartbeat = undefined;
    if (this.welcomeDeadline) clearTimeout(this.welcomeDeadline); this.welcomeDeadline = undefined;
    for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(new Error(detail)); }
    this.pending.clear(); this.prompts = [];
    for (const listener of this.promptListeners) listener(this.prompts);
    try { socket.close(); } catch { /* The underlying transport may already be closed. */ }
    this.update({ phase, detail });
  }
  dispose(): void {
    this.disposed = true;
    if (this.socket) this.disconnect(this.socket, 'disconnected', 'Backend disconnected');
    this.listeners.clear(); this.statusListeners.clear(); this.promptListeners.clear();
  }
}
