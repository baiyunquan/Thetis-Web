export const PREVIEW_PANELS = {
  cwx: { title: 'CWX', stage: 6, destination: 'Bottom Panel / Thetis Tasks / CWX' },
  recordings: { title: 'Recordings', stage: 6, destination: 'Bottom Panel / Thetis Tasks / Recordings' },
  schedules: { title: 'Scheduled Memories', stage: 6, destination: 'Bottom Panel / Thetis Tasks / Schedules and the Memory editor' },
  pureSignal: { title: 'PureSignal', stage: 7, destination: 'RF editor and optional Secondary Side Bar section' },
  diversity: { title: 'Diversity', stage: 7, destination: 'RF editor and optional Secondary Side Bar section' },
  audioDevices: { title: 'Audio Devices', stage: 5, destination: 'Audio editor / device routing' },
  legacySkins: { title: 'Legacy Skin Management', stage: 8, destination: 'Display & Skins editor / import, install, select and remove' }
} as const;
export const PANEL_TITLES = {
  console: 'Thetis Console', audio: 'Thetis Audio', rf: 'Thetis RF', display: 'Thetis Display',
  setup: 'Thetis Setup', diagnostics: 'Thetis Diagnostics', memories: 'Thetis Memories',
  ...Object.fromEntries(Object.entries(PREVIEW_PANELS).map(([id, value]) => [id, `Thetis ${value.title} Preview`]))
} as Record<'console' | 'audio' | 'rf' | 'display' | 'setup' | 'diagnostics' | 'memories' | keyof typeof PREVIEW_PANELS, string>;
export type ThetisPanelId = keyof typeof PANEL_TITLES;
export function previewPanel(id: string) { return Object.hasOwn(PREVIEW_PANELS, id) ? PREVIEW_PANELS[id as keyof typeof PREVIEW_PANELS] : undefined; }
