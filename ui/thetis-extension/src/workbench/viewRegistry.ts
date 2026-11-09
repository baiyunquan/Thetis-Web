/** Pure manifest source consumed by both the packaging script and the extension. */
export interface Container { id: string; title: string; icon: string; }
export interface FoundationView {
  id: string; name: string; container: string; type: 'tree' | 'webview';
  visibility: 'visible' | 'collapsed' | 'hidden'; icon: string; initialSize?: number;
}
const icon = (name: string) => `media/${name}.svg`;
export const PRIMARY_CONTAINERS: Container[] = [
  ['operation', 'Operation'], ['memories', 'Memories'], ['audio', 'Audio'], ['rf', 'RF'],
  ['display', 'Display'], ['setup', 'Setup'], ['diagnostics', 'Diagnostics']
].map(([id, title]) => ({ id: `thetis-${id}`, title, icon: icon(id) }));
export const SECONDARY_CONTAINERS: Container[] = [{ id: 'thetis-receiver-controls', title: 'Receiver Controls', icon: icon('receiver') }];
export const PANEL_CONTAINERS: Container[] = [
  { id: 'thetis-tasks', title: 'Thetis Tasks', icon: icon('tasks') },
  { id: 'thetis-logs', title: 'Thetis Logs', icon: icon('logs') }
];
function controls(container: string, area: string, items: [string, string, FoundationView['visibility'], number][]): FoundationView[] {
  return items.map(([id, name, visibility, initialSize]) => ({
    id: `thetis.${area}.${id}`, name, container, type: 'webview', visibility, initialSize, icon: icon(area === 'operation' ? 'operation' : 'receiver')
  }));
}
export const FOUNDATION_VIEWS: FoundationView[] = [
  ...controls('thetis-operation', 'operation', [['power', 'Power & Transmit', 'visible', 1], ['gain', 'Audio & RF Gain', 'visible', 2], ['device', 'Device & Readiness', 'collapsed', 1]]),
  ...PRIMARY_CONTAINERS.slice(1).map(c => ({ id: `${c.id.replace('-', '.')}.navigation`, name: c.title,
    container: c.id, type: 'tree' as const, visibility: 'visible' as const, icon: c.icon })),
  ...controls('thetis-receiver-controls', 'receiver', [
    ['meters', 'Meters', 'visible', 1], ['bands', 'Bands', 'visible', 2], ['modes', 'Modes', 'visible', 2], ['filters', 'Filters', 'visible', 2],
    ['pureSignal', 'PureSignal', 'hidden', 1], ['diversity', 'Diversity', 'hidden', 1]
  ]),
  ...[['cwx', 'CWX'], ['recordings', 'Recordings'], ['schedules', 'Schedules']].map(([id, name]) => ({
    id: `thetis.tasks.${id}`, name, container: 'thetis-tasks', type: 'tree' as const, visibility: 'visible' as const, icon: icon('tasks')
  })),
  ...[['engine', 'Engine'], ['sequence', 'Sequence / Interaction Trace'], ['cat', 'CAT']].map(([id, name]) => ({
    id: `thetis.logs.${id}`, name, container: 'thetis-logs', type: 'tree' as const, visibility: 'visible' as const, icon: icon('logs')
  }))
];
export const DEFAULT_EXPANDED_VIEWS = FOUNDATION_VIEWS.filter(v => v.type === 'webview' && v.visibility === 'visible').map(v => v.id);
export const getRestoreViewIds = (): string[] => FOUNDATION_VIEWS.filter(view => view.visibility !== 'hidden').map(view => view.id);
export function getContributions() {
  const views: Record<string, Omit<FoundationView, 'container'>[]> = {};
  for (const { container, ...view } of FOUNDATION_VIEWS) (views[container] ??= []).push(view);
  return { viewsContainers: { activitybar: PRIMARY_CONTAINERS, secondarySidebar: SECONDARY_CONTAINERS, panel: PANEL_CONTAINERS }, views };
}
