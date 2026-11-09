import { test, expect, foundationView, command, waitNativeStorage, recordNativeViewRecreation, reloadWorkbench } from './helpers';

test('native collapse, move, hide, reload and restoration preserve the shared model', async ({ page }, testInfo) => {
  test.setTimeout(180000); // Three full browser reloads and native IndexedDB flushes.
  await page.goto('/code/');
  let consoleView = await foundationView(page);
  for (const id of ['thetis.operation.power', 'thetis.operation.gain', 'thetis.receiver.meters', 'thetis.receiver.bands', 'thetis.receiver.modes', 'thetis.receiver.filters']) await foundationView(page, id);
  recordNativeViewRecreation(page);
  await consoleView.locator('#vfo-a').fill('17890123');
  await consoleView.locator('#vfo-a').press('Tab');
  const power = page.locator('.sidebar .pane-header').filter({ hasText: 'Power & Transmit' });
  await expect(power).toHaveAttribute('aria-expanded', 'true');
  await power.click();
  await expect(power).toHaveAttribute('aria-expanded', 'false');
  await waitNativeStorage(page, ['"thetis.operation.power":{"collapsed":true', '"serializedGrid":', 'thetis.console', '17890123', 'workbench.sidebar.activeviewletid=workbench.view.extension.thetis-operation']);
  await reloadWorkbench(page);
  consoleView = await foundationView(page);
  // Built Code may select Explorer on a raw browser cold start (layout.ts).
  // Reveal the saved container without resetting its saved view state.
  const operate = page.getByRole('tab', { name: 'Operate', exact: true });
  if (await operate.getAttribute('aria-selected') !== 'true') await operate.click();
  await expect(power).toHaveAttribute('aria-expanded', 'false');
  await expect(consoleView.locator('#vfo-a')).toHaveValue('17890123');
  const gain = await foundationView(page, 'thetis.operation.gain');
  await gain.locator('#gain-af').click();
  await command(page, 'View: Move View', true);
  await page.locator('.quick-input-list .monaco-list-row').filter({ hasText: /^Audio & RF Gain$/ }).click();
  await page.locator('.quick-input-widget input').first().fill('Receiver Controls');
  await page.locator('.quick-input-list .monaco-list-row').filter({ hasText: /^Receiver Controls$/ }).click();
  await expect(page.locator('.auxiliarybar .pane-header').filter({ hasText: 'Audio & RF Gain' })).toBeVisible();
  await waitNativeStorage(page, ['"thetis.operation.gain":"workbench.view.extension.thetis-receiver-controls"']);
  await reloadWorkbench(page);
  consoleView = await foundationView(page);
  const moved = page.locator('.auxiliarybar .pane-header').filter({ hasText: 'Audio & RF Gain' });
  await expect(moved).toBeVisible();
  await expect(page.locator('.sidebar .pane-header').filter({ hasText: 'Audio & RF Gain' })).toHaveCount(0);
  await expect(consoleView.locator('#vfo-a')).toHaveValue('17890123');
  await moved.click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: "Hide 'Audio & RF Gain'", exact: true })).toBeVisible();
  // Code intentionally ignores menu mouse-up during its first 100 ms. Use the
  // native keyboard path, not a forced click or a startup sleep.
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(moved).toBeHidden();
  await waitNativeStorage(page, ['"id":"thetis.operation.gain","isHidden":true']);
  await reloadWorkbench(page);
  await foundationView(page);
  await expect(page.locator('.pane-header').filter({ hasText: 'Audio & RF Gain' })).toBeHidden();
  await command(page, 'Thetis: Restore Default Layout');
  await expect(page.locator('.sidebar .pane-header').filter({ hasText: 'Audio & RF Gain' })).toBeVisible();
  consoleView = await foundationView(page);
  await expect(consoleView.locator('#vfo-a')).toHaveValue('17890123');
  for (const id of ['thetis.operation.power', 'thetis.operation.gain', 'thetis.receiver.meters', 'thetis.receiver.bands', 'thetis.receiver.modes', 'thetis.receiver.filters']) await foundationView(page, id);
  await page.screenshot({ path: testInfo.outputPath('restored-layout.png') });
});
