import * as vscode from 'vscode';
import { createFoundationModel, type FoundationModel, type FoundationState } from '../model/foundation';
import { FoundationDiagnostics, type EchoStatus } from '../diagnostics';
import { FOUNDATION_VIEWS, getRestoreViewIds } from './viewRegistry';

type PanelId = 'console' | 'audio' | 'rf' | 'display' | 'setup' | 'diagnostics' | 'memories';
const PANEL_TITLES: Record<PanelId, string> = {
  console: 'Thetis Console', audio: 'Thetis Audio', rf: 'Thetis RF', display: 'Thetis Display',
  setup: 'Thetis Setup', diagnostics: 'Thetis Diagnostics', memories: 'Thetis Memories'
};
let runtime: FoundationWorkbench | undefined;
export function registerThetisViews(context: vscode.ExtensionContext) {
  const instance = runtime = new FoundationWorkbench(context);
  instance.register();
  context.subscriptions.push({ dispose: () => { instance.dispose(); if (runtime === instance) runtime = undefined; } });
  return instance;
}
export async function openThetisPanel(id: string = 'console', options: { beside?: boolean } = {}): Promise<void> {
  if (!runtime) throw new Error('Thetis views have not been registered');
  runtime.openPanel(id in PANEL_TITLES ? id as PanelId : 'console', options);
}
interface NavigationItem { label: string; description?: string; command?: vscode.Command; children?: NavigationItem[]; }
class NavigationProvider implements vscode.TreeDataProvider<NavigationItem>, vscode.Disposable {
  private changed = new vscode.EventEmitter<NavigationItem | undefined>();
  readonly onDidChangeTreeData = this.changed.event;
  constructor(private readonly rows: () => NavigationItem[]) {}
  refresh() { this.changed.fire(undefined); }
  getChildren(element?: NavigationItem): NavigationItem[] { return element ? element.children ?? [] : this.rows(); }
  getTreeItem(element: NavigationItem) {
    const item = new vscode.TreeItem(element.label, element.children ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
    item.description = element.description;
    item.tooltip = `${element.label}${element.description ? `: ${element.description}` : ''}`;
    item.command = element.command;
    item.iconPath = new vscode.ThemeIcon(element.children ? 'list-tree' : element.command ? 'arrow-right' : 'circle-outline');
    return item;
  }
  dispose() { this.changed.dispose(); }
}

export class FoundationWorkbench implements vscode.Disposable {
  readonly model: FoundationModel;
  readonly diagnostics: FoundationDiagnostics;
  private readonly output = vscode.window.createOutputChannel('Thetis Foundation');
  private readonly panels = new Map<PanelId, vscode.WebviewPanel>();
  private readonly liveWebviews = new Map<vscode.Webview, { id: string; ready: boolean }>();
  private readonly traceRows: string[] = [];
  private readonly providers: NavigationProvider[] = [];
  private readonly disposables: vscode.Disposable[] = [];
  private persistTimer?: ReturnType<typeof setTimeout>;
  private readonly status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 150);
  constructor(private readonly context: vscode.ExtensionContext) {
    this.model = createFoundationModel(context.workspaceState.get('thetis.foundation.state.v1'));
    this.diagnostics = new FoundationDiagnostics(vscode.workspace.getConfiguration('thetis.foundation').get<string>('diagnosticEndpoint', ''), line => this.trace(line));
    this.disposables.push(this.model.subscribe(state => {
      this.broadcast({ type: 'state', state });
      if (this.persistTimer) clearTimeout(this.persistTimer);
      this.persistTimer = setTimeout(() => { void context.workspaceState.update('thetis.foundation.state.v1', state); }, 180);
    }), this.diagnostics.subscribe(status => {
      this.broadcast({ type: 'diagnostic', status });
      this.refreshTrees();
      this.status.tooltip = `Foundation / Demo; radio unavailable. ${status.detail}`;
    }));
  }
  register() {
    const context = this.context;
    this.status.text = 'Thetis: Foundation / Demo';
    this.status.tooltip = 'Synthetic console. Radio unavailable. Click to open Console.';
    this.status.command = 'thetis.openConsole';
    this.status.show();
    this.disposables.push(this.status, this.output, this.diagnostics);
    for (const view of FOUNDATION_VIEWS) {
      if (view.type === 'webview') {
        this.disposables.push(vscode.window.registerWebviewViewProvider(view.id, {
          resolveWebviewView: webviewView => {
            const disposable = this.connectWebview(webviewView.webview, view.id);
            webviewView.onDidDispose(() => disposable.dispose());
          }
        }));
      } else {
        const provider = new NavigationProvider(() => this.navigationRows(view.id));
        this.providers.push(provider);
        this.disposables.push(provider, vscode.window.createTreeView(view.id, { treeDataProvider: provider, showCollapseAll: true }));
      }
    }
    this.disposables.push(vscode.window.registerWebviewPanelSerializer('thetis.console', {
      deserializeWebviewPanel: async (panel, saved) => {
        const candidate = saved && typeof saved === 'object' && 'id' in saved ? saved.id : undefined;
        const id: PanelId = typeof candidate === 'string' && candidate in PANEL_TITLES ? candidate as PanelId : 'console';
        this.attachPanel(id, panel);
      }
    }));
    const command = (id: string, handler: (...args: any[]) => unknown) => this.disposables.push(vscode.commands.registerCommand(id, handler));
    command('thetis.openConsole', () => this.openPanel('console'));
    command('thetis.openConsoleBeside', () => this.openPanel('console', { beside: true }));
    command('thetis.openPanel', async (id?: string) => {
      const selected = id && id in PANEL_TITLES ? id as PanelId : (await vscode.window.showQuickPick(Object.keys(PANEL_TITLES))) as PanelId | undefined;
      if (selected) this.openPanel(selected);
    });
    command('thetis.restoreDefaultLayout', () => this.restoreDefaultLayout());
    command('thetis.layout.restoreDefault', () => this.restoreDefaultLayout());
    command('thetis.showTrace', () => this.output.show(true));
    command('thetis.diagnostics.echo', (value?: string) => this.diagnostics.echo(typeof value === 'string' ? value : 'Thetis Foundation'));
    command('thetis.selectRadioSkin', async () => {
      const selected = await vscode.window.showQuickPick([{ label: 'Thetis Classic', id: 'classic' }, { label: 'Thetis Midnight', id: 'midnight' }], { title: 'Radio skin (independent of workbench theme)' });
      if (selected) this.model.dispatch({ type: 'setRadioTheme', id: selected.id });
    });
    command('thetis.selectDensity', async () => {
      const selected = await vscode.window.showQuickPick(['auto', 'expanded', 'compact', 'touch'], { title: 'Radio control density' });
      if (selected) this.model.dispatch({ type: 'setDensity', density: selected });
    });
    this.diagnostics.connect();
    // Ensure Thetis Console is open on startup so the workbench is never empty
    this.openPanel('console');
    this.trace('Foundation activated: synthetic controls only; radio unavailable');
  }
  openPanel(id: PanelId, options: { beside?: boolean } = {}) {
    const column = options.beside ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active;
    const existing = this.panels.get(id);
    if (existing) { existing.reveal(column); return existing; }
    const panel = vscode.window.createWebviewPanel('thetis.console', PANEL_TITLES[id], column, { enableScripts: true, retainContextWhenHidden: false });
    this.attachPanel(id, panel);
    return panel;
  }
  private attachPanel(id: PanelId, panel: vscode.WebviewPanel) {
    const previous = this.panels.get(id);
    if (previous && previous !== panel) previous.dispose();
    this.panels.set(id, panel);
    panel.title = PANEL_TITLES[id];
    const connection = this.connectWebview(panel.webview, id);
    panel.onDidDispose(() => {
      if (this.panels.get(id) === panel) this.panels.delete(id);
      connection.dispose();
    });
  }
  private connectWebview(webview: vscode.Webview, id: string): vscode.Disposable {
    const media = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    webview.options = { enableScripts: true, localResourceRoots: [media] };
    const connection = { id, ready: false };
    this.liveWebviews.set(webview, connection);
    // Register the message listener before assigning HTML so the first ready message cannot race it.
    const messages = webview.onDidReceiveMessage(message => {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'ready') {
        connection.ready = true;
        this.trace(`${id} ready`);
        void webview.postMessage({ type: 'state', state: this.model.getState(), initial: true });
        void webview.postMessage({ type: 'diagnostic', status: this.diagnostics.getStatus() });
      } else if (message.type === 'action') {
        if (!connection.ready) { this.trace(`${id} action rejected before ready`); return; }
        const accepted = this.model.dispatch(message.action);
        this.trace(`${id} action ${String(message.action?.type).slice(0, 48)} ${accepted ? 'accepted' : 'rejected'} seq=${message.sequence}`);
        void webview.postMessage({ type: 'ack', sequence: message.sequence, accepted, revision: this.model.getState().revision });
      } else if (message.type === 'echo' && connection.ready) {
        void this.diagnostics.echo(typeof message.value === 'string' ? message.value : 'Thetis Foundation');
      } else if (message.type === 'trace' && typeof message.event === 'string') {
        this.trace(`${id} ${message.event.slice(0, 40)} target=${String(message.target).slice(0, 80)} ready=${Boolean(message.ready)} seq=${message.sequence} pointer=${message.pointerId ?? '-'} focus=${Boolean(message.focused)}`);
      }
    });
    webview.html = this.webviewHtml(webview, id);
    return { dispose: () => { messages.dispose(); this.liveWebviews.delete(webview); } };
  }
  private webviewHtml(webview: vscode.Webview, id: string) {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    const asset = (file: string) => webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', file));
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"><link rel="stylesheet" href="${asset('main.css')}"><title>Thetis Foundation</title></head><body data-view="${id}"><main id="radio-root" aria-label="Thetis Foundation demo"><p role="status">Connecting synthetic controls to the extension host...</p></main><script nonce="${nonce}" src="${asset('main.js')}"></script></body></html>`;
  }
  private broadcast(message: unknown) {
    for (const [webview, connection] of this.liveWebviews) if (connection.ready) void webview.postMessage(message);
  }
  trace(line: string) {
    const entry = `${new Date().toISOString()} ${line}`;
    this.output.appendLine(entry);
    this.traceRows.unshift(entry);
    this.traceRows.length = Math.min(this.traceRows.length, 100);
    this.refreshTrees();
  }
  private refreshTrees() { for (const provider of this.providers) provider.refresh(); }
  private navigationRows(id: string): NavigationItem[] {
    const panel = (label: string, target: PanelId, description?: string): NavigationItem => ({ label, description, command: { command: 'thetis.openPanel', title: label, arguments: [target] } });
    const command = (label: string, command: string, description?: string): NavigationItem => ({ label, description, command: { command, title: label } });
    const unavailable = { label: 'Radio unavailable', description: 'Foundation / Demo' };
    switch (id) {
      case 'thetis.memories.navigation': return [panel('Memory workspace', 'memories', 'Synthetic presets'), panel('Open Console', 'console'), unavailable];
      case 'thetis.audio.navigation': return [panel('Audio controls', 'audio', 'Synthetic AF / AGC'), { label: 'Audio devices', description: 'Unavailable in Foundation' }, unavailable];
      case 'thetis.rf.navigation': return [panel('RF controls', 'rf'), { label: 'PureSignal', description: 'Radio unavailable' }, { label: 'Diversity', description: 'Radio unavailable' }];
      case 'thetis.display.navigation': return [panel('Display preferences', 'display'), command('Select radio skin', 'thetis.selectRadioSkin'), command('Control density', 'thetis.selectDensity')];
      case 'thetis.setup.navigation': return [panel('Foundation setup', 'setup'), command('Restore default layout', 'thetis.restoreDefaultLayout'), unavailable];
      case 'thetis.diagnostics.navigation': return [panel('Diagnostics', 'diagnostics'), command('Test diagnostic echo', 'thetis.diagnostics.echo', this.diagnostics.getStatus().phase), command('Show interaction trace', 'thetis.showTrace'), unavailable];
      case 'thetis.tasks.cwx': return [{ label: 'CWX unavailable', description: 'Requires radio integration' }, unavailable];
      case 'thetis.tasks.recordings': return [{ label: 'No recordings', description: 'Synthetic Foundation; recording unavailable' }];
      case 'thetis.tasks.schedules': return [{ label: 'No schedules', description: 'Scheduling unavailable in Foundation' }];
      case 'thetis.logs.engine': return [{ label: 'Foundation ready', description: 'Synthetic model initialized' }, { label: 'Diagnostic echo', description: this.diagnostics.getStatus().phase }, unavailable];
      case 'thetis.logs.sequence': return this.traceRows.map(label => ({ label }));
      case 'thetis.logs.cat': return [{ label: 'CAT unavailable', description: 'No radio transport attached' }];
      default: return [];
    }
  }
  async restoreDefaultLayout() {
    // Native commands preserve Code OSS ownership of view movement and persistence.
    await vscode.commands.executeCommand('workbench.action.resetViewLocations');
    for (const id of getRestoreViewIds()) await vscode.commands.executeCommand(`${id}.focus`);
    for (const id of ['thetis.receiver.pureSignal', 'thetis.receiver.diversity']) await vscode.commands.executeCommand(`${id}.removeView`);
    await vscode.commands.executeCommand('workbench.view.extension.thetis-operation');
    await vscode.commands.executeCommand('workbench.action.closePanel');
    this.openPanel('console');
    this.trace('Restored view locations and revealed every default view through native commands; Device may remain expanded');
  }
  dispose() {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    void this.context.workspaceState.update('thetis.foundation.state.v1', this.model.getState());
    for (const panel of this.panels.values()) panel.dispose();
    for (const disposable of this.disposables) disposable.dispose();
    this.liveWebviews.clear();
  }
}
