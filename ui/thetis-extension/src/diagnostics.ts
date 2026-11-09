export interface EchoStatus {
  phase: 'connecting' | 'connected' | 'replied' | 'unavailable';
  detail: string;
  requestId?: string;
  value?: string;
}
/** One extension-owned diagnostic socket. It has no TCI or radio-control messages. */
export class FoundationDiagnostics {
  private socket?: WebSocket;
  private serial = 0;
  private disposed = false;
  private heartbeat?: ReturnType<typeof setInterval>;
  private state: EchoStatus = { phase: 'unavailable', detail: 'Diagnostic endpoint unavailable' };
  private listeners = new Set<(status: EchoStatus) => void>();
  private pending = new Map<string, { value: string; resolve: (value: EchoStatus) => void; timer: ReturnType<typeof setTimeout>; sent: boolean }>();
  constructor(private readonly endpoint: string, private readonly trace: (line: string) => void) {}
  getStatus(): EchoStatus { return this.state; }
  subscribe(listener: (status: EchoStatus) => void) {
    this.listeners.add(listener);
    return { dispose: () => { this.listeners.delete(listener); } };
  }
  private update(status: EchoStatus) {
    this.state = status;
    this.trace(`diagnostic ${status.phase}: ${status.detail}`);
    for (const listener of this.listeners) listener(status);
  }
  connect(): void {
    if (this.disposed || this.socket || !this.endpoint) return;
    try {
      const url = new URL(this.endpoint);
      if (url.protocol !== 'ws:' && url.protocol !== 'wss:') throw new Error('Expected WebSocket endpoint');
      this.update({ phase: 'connecting', detail: 'Connecting to embedded diagnostic echo' });
      const socket = this.socket = new WebSocket(url.href);
      socket.onopen = () => {
        if (this.disposed || this.socket !== socket) return;
        this.update({ phase: 'connected', detail: 'Embedded diagnostic echo connected; radio unavailable' });
        this.heartbeat = setInterval(() => {
          if (this.socket !== socket || socket.readyState !== WebSocket.OPEN) return;
          try {
            // The server echoes this small diagnostic message. Its reply has no user-facing state.
            socket.send(JSON.stringify({ requestId: `foundation-heartbeat-${++this.serial}`, value: 'foundation keepalive' }));
          } catch { this.disconnect(socket, 'Diagnostic heartbeat connection closed'); }
        }, 15000);
        const queued = [...this.pending.keys()];
        for (const requestId of queued) this.sendPending(requestId);
        if (!queued.length) void this.echo('Thetis Foundation');
      };
      socket.onmessage = event => {
        if (this.disposed || this.socket !== socket) return;
        try {
          const data = JSON.parse(String(event.data));
          if (!data || typeof data.requestId !== 'string' || typeof data.value !== 'string') return;
          const entry = this.pending.get(data.requestId);
          if (!entry || data.value !== entry.value) return;
          this.pending.delete(data.requestId);
          clearTimeout(entry.timer);
          const reply: EchoStatus = { phase: 'replied', detail: `Echo received: ${data.value}`, requestId: data.requestId, value: data.value };
          this.update(reply);
          entry.resolve(reply);
        } catch { this.trace('diagnostic ignored malformed reply'); }
      };
      socket.onerror = () => this.disconnect(socket, 'Embedded diagnostic connection failed');
      socket.onclose = () => this.disconnect(socket, 'Embedded diagnostic connection closed');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Invalid diagnostic endpoint';
      this.update({ phase: 'unavailable', detail });
      this.finishPending(detail);
    }
  }
  async echo(value = 'Thetis Foundation'): Promise<EchoStatus> {
    if (typeof value !== 'string' || value.length > 512) return { phase: 'unavailable', detail: 'Echo value must be text of at most 512 characters' };
    if (this.disposed) return { phase: 'unavailable', detail: 'Diagnostic disposed' };
    if (!this.endpoint) return { phase: 'unavailable', detail: 'Diagnostic endpoint unavailable' };
    if (this.socket && this.socket.readyState !== WebSocket.OPEN && this.socket.readyState !== WebSocket.CONNECTING) this.disconnect(this.socket, 'Diagnostic connection closed');
    const requestId = `foundation-${++this.serial}`;
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        const result: EchoStatus = { phase: 'unavailable', detail: 'Diagnostic echo timed out', requestId };
        this.update(result);
        resolve(result);
      }, 5000);
      this.pending.set(requestId, { value, resolve, timer, sent: false });
      if (this.socket?.readyState === WebSocket.OPEN) this.sendPending(requestId);
      else this.connect();
    });
  }
  private sendPending(requestId: string) {
    const entry = this.pending.get(requestId);
    const socket = this.socket;
    if (!entry || entry.sent || !socket || socket.readyState !== WebSocket.OPEN) return;
    try {
      socket.send(JSON.stringify({ requestId, value: entry.value }));
      entry.sent = true;
    } catch { this.disconnect(socket, 'Diagnostic connection closed before echo was sent'); }
  }
  private disconnect(socket: WebSocket, detail: string) {
    if (this.socket !== socket) return;
    this.socket = undefined;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    try { socket.close(); } catch { /* A failed connection may already have closed. */ }
    this.finishPending(detail);
    if (!this.disposed) this.update({ phase: 'unavailable', detail });
  }
  private finishPending(detail: string) {
    for (const [requestId, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.resolve({ phase: 'unavailable', detail, requestId });
    }
    this.pending.clear();
  }
  dispose() {
    this.disposed = true;
    if (this.socket) this.disconnect(this.socket, 'Diagnostic disposed');
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    this.finishPending('Diagnostic disposed');
    this.state = { phase: 'unavailable', detail: 'Diagnostic disposed' };
    this.listeners.clear();
  }
}
