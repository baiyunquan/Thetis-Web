import { test } from 'vitest';
import assert from 'node:assert/strict';
import { getContributions, FOUNDATION_VIEWS, DEFAULT_EXPANDED_VIEWS, getRestoreViewIds } from '../../thetis-extension/src/workbench/viewRegistry.ts';

test('native manifest contributes seven Primary containers, Secondary controls, and two bottom containers', () => {
  const { viewsContainers } = getContributions();
  assert.deepEqual(viewsContainers.activitybar.map(c => c.id), [
    'thetis-operation', 'thetis-memories', 'thetis-audio', 'thetis-rf', 'thetis-display', 'thetis-setup', 'thetis-diagnostics']);
  assert.deepEqual(viewsContainers.secondarySidebar.map(c => c.id), ['thetis-receiver-controls']);
  assert.deepEqual(viewsContainers.panel.map(c => c.id), ['thetis-tasks', 'thetis-logs']);
});

test('Operation and receiver controls have declared native visibility, with hidden optional views', () => {
  const { views } = getContributions();
  const operation = views['thetis-operation'];
  assert.deepEqual(operation.map(v => [v.id, v.visibility]), [
    ['thetis.operation.power', 'visible'], ['thetis.operation.gain', 'visible'], ['thetis.operation.device', 'collapsed']]);
  assert.deepEqual(views['thetis-receiver-controls'].map(v => [v.id, v.visibility]), [
    ['thetis.receiver.meters', 'visible'], ['thetis.receiver.bands', 'visible'], ['thetis.receiver.modes', 'visible'],
    ['thetis.receiver.filters', 'visible'], ['thetis.receiver.pureSignal', 'hidden'], ['thetis.receiver.diversity', 'hidden']]);
  assert.equal(DEFAULT_EXPANDED_VIEWS.length, 6);
});

test('views are unique and navigation stays native TreeViews while controls are WebviewViews', () => {
  assert.equal(FOUNDATION_VIEWS.length, 21);
  assert.equal(new Set(FOUNDATION_VIEWS.map(v => v.id)).size, FOUNDATION_VIEWS.length);
  for (const view of FOUNDATION_VIEWS) {
    assert.equal(view.type, view.id.startsWith('thetis.operation.') || view.id.startsWith('thetis.receiver.') ? 'webview' : 'tree');
  }
  const contributions = getContributions();
  assert.ok(Object.values(contributions.views).flat().every(v => v.icon.endsWith('.svg')));
});

test('bottom tasks and log views retain their independent native identities', () => {
  const { views } = getContributions();
  assert.deepEqual(views['thetis-tasks'].map(v => v.id), ['thetis.tasks.cwx', 'thetis.tasks.recordings', 'thetis.tasks.schedules']);
  assert.deepEqual(views['thetis-logs'].map(v => v.id), ['thetis.logs.engine', 'thetis.logs.sequence', 'thetis.logs.cat']);
});

test('explicit native restore reveals every default view including Device, navigation and bottom views', () => {
  const ids = getRestoreViewIds();
  assert.equal(ids.length, 19);
  for (const id of ['thetis.operation.device', 'thetis.audio.navigation', 'thetis.tasks.cwx', 'thetis.logs.cat']) assert.ok(ids.includes(id));
  assert.equal(ids.includes('thetis.receiver.pureSignal'), false);
  assert.equal(ids.includes('thetis.receiver.diversity'), false);
});
