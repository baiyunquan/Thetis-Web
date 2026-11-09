import { test, expect, foundationView, command, recordNativeViewRecreation, waitNativeStorage, reloadWorkbench } from './helpers';

test('the first physical click, VFO edits, receiver targeting, themes and reload preserve synthetic state', async ({ page }, testInfo) => {
  await page.goto('/code/');
  let view = await foundationView(page);
  const initial = Number(await view.locator('#vfo-a').inputValue());
  await view.getByRole('button', { name: 'Step VFO A up 1 kHz', exact: true }).click();
  await expect(view.locator('#vfo-a')).toHaveValue(String(initial + 1000));
  await command(page, 'Thetis: Show Interaction Trace');
  const trace = page.locator('.panel .view-lines');
  await expect(trace).toContainText('console action setVfo accepted');
  await testInfo.attach('first-input-bridge-trace', { body: await trace.innerText(), contentType: 'text/plain' });
  await page.getByRole('button', { name: /^Hide Panel/ }).click();
  view = await foundationView(page);
  for (const id of ['power', 'mox', 'tune', 'ptt']) await expect(view.locator(`#radio-${id}`)).toBeDisabled();
  await view.locator('#vfo-a').fill('14321567');
  await view.locator('#vfo-a').press('Tab');
  await expect(view.locator('#vfo-a')).toHaveValue('14321567');
  await expect(view.locator('#bridge-status')).toContainText(/ack [1-9]/);
  const rx2Before = await view.locator('#rx2-enabled').isChecked();
  await view.getByRole('button', { name: 'Select RX2 controls', exact: true }).click();
  await expect(view.getByRole('button', { name: 'Select RX2 controls', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await view.locator('#rx2-enabled').isChecked()).toBe(rx2Before);
  await expect(view.locator('#vfo-a')).toHaveValue('14321567');
  await view.getByRole('button', { name: 'CWU', exact: true }).click();
  await expect(view.locator('#operating-slot')).toHaveAttribute('data-operating-mode', 'cw');
  await view.locator('details.console-preferences > summary').click();
  await view.locator('#radio-skin').selectOption('midnight');
  await expect(view.locator('body')).toHaveAttribute('data-skin', 'midnight');
  await view.locator('#radio-density').selectOption('touch');
  await expect(view.locator('#radio-root')).toHaveAttribute('data-density', 'touch');
  const pauseEvents = await view.evaluateHandle(() => {
    const events: unknown[] = [];
    for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'focusin', 'focusout', 'scroll']) {
      document.addEventListener(type, event => events.push({ type, target: (event.target as HTMLElement)?.id,
        active: (document.activeElement as HTMLElement)?.id, scrollY, y: (event as MouseEvent).clientY, time: performance.now() }), { capture: true, passive: true });
    }
    return events;
  });
  await view.locator('#plot-pause').click();
  try {
    await expect(view.locator('#plot-pause')).toHaveAccessibleName('Resume synthetic plots');
  } catch (error) {
    await testInfo.attach('pause-browser-events', { body: JSON.stringify(await pauseEvents.jsonValue()), contentType: 'application/json' });
    await command(page, 'Thetis: Show Interaction Trace');
    await testInfo.attach('failed-pause-input-trace', { body: await page.locator('.panel .view-lines').innerText(), contentType: 'text/plain' });
    throw error;
  }
  await pauseEvents.dispose();
  await page.screenshot({ path: testInfo.outputPath('synthetic-interaction.png'), fullPage: true });
  // A layout command must preserve the model, and a normal reload must restore the open panel.
  recordNativeViewRecreation(page);
  await command(page, 'Thetis: Restore Default Layout');
  view = await foundationView(page);
  await expect(view.locator('#vfo-a')).toHaveValue('14321567');
  await waitNativeStorage(page, ['"thetis.operation.device":{"collapsed":false', '"serializedGrid":', '14321567', '"plotPaused":true']);
  await reloadWorkbench(page);
  view = await foundationView(page);
  await expect(view.locator('#vfo-a')).toHaveValue('14321567');
  await expect(view.locator('body')).toHaveAttribute('data-skin', 'midnight');
  await expect(view.locator('#plot-pause')).toHaveAccessibleName('Resume synthetic plots');
});

test('navigation opens a labelled later-stage preview in a native editor', async ({ page }) => {
  await page.goto('/code/');
  await foundationView(page);
  await page.getByRole('tab', { name: 'Audio', exact: true }).click();
  await page.getByText('Audio devices', { exact: true }).click();
  const preview = await foundationView(page, 'audioDevices');
  await expect(preview.locator('body')).toContainText('Stage 5 preview');
  await expect(preview.locator('body')).toContainText('Planned destination: Audio editor / device routing');
  await expect(page.getByRole('tab', { name: /Thetis Audio Devices Preview/ })).toBeVisible();
});

test('an intentionally closed Console stays closed after reload and can be reopened by command', async ({ page }) => {
  await page.goto('/code/');
  await foundationView(page);
  const tab = page.getByRole('tab', { name: /Thetis Console/ }).first();
  await tab.click();
  await waitNativeStorage(page, ['"serializedGrid":', 'thetis.console', '"thetis.foundation.firstUse.v1":true']);
  await tab.locator('.action-label.codicon-close-small').click();
  await expect(page.getByRole('tab', { name: /Thetis Console/ })).toHaveCount(0);
  // Closing an isolated webview can leave WebKit's workbench document blurred.
  // Native Code only collects periodic state while its document has focus.
  await page.locator('.editor .editor-group-container').click({ position: { x: 30, y: 80 } });
  // EditorPart deletes its saved grid when all editor groups are empty.
  await waitNativeStorage(page, ['"thetis.foundation.firstUse.v1":true'], ['memento/workbench.parts.editor={"editorpart.state":']);
  await reloadWorkbench(page);
  await expect(page.getByText('Thetis: Foundation / Demo', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Thetis Console/ })).toHaveCount(0);
  await command(page, 'Thetis: Open Console');
  await foundationView(page);
});

test('a diagnostic request still completes after the former HTTP idle timeout', async ({ page }) => {
  await page.goto('/code/');
  const view = await foundationView(page);
  await view.locator('details.console-preferences > summary').click();
  await expect(view.locator('#diagnostic-status')).toContainText('Echo received');
  // Deliberately exceed the old ten-second deadline; this tests idle lifetime rather than startup readiness.
  await page.waitForTimeout(12000);
  await view.locator('#echo-value').fill('after-idle');
  await view.locator('#diagnostic-echo').click();
  await expect(view.locator('#diagnostic-status')).toHaveText('Echo received: after-idle');
});
