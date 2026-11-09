import { test, expect } from 'vitest';
import { PREVIEW_PANELS, PANEL_TITLES } from '../../thetis-extension/src/workbench/panelRegistry';
test('future navigation destinations expose their owning stage and intended native surface', () => {
  for (const id of ['cwx', 'recordings', 'schedules', 'pureSignal', 'diversity', 'audioDevices', 'legacySkins'] as const) {
    const preview = PREVIEW_PANELS[id];
    expect(preview.stage).toBeGreaterThan(1);
    expect(preview.stage).toBeLessThanOrEqual(10);
    expect(preview.destination).toMatch(/Panel|Side Bar|editor/);
    expect(PANEL_TITLES[id]).toContain(preview.title);
  }
  expect(PANEL_TITLES.console).toBe('Thetis Console');
});
