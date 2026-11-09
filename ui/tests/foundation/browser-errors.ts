/** Exceptions observed in the unmodified fdefc478 Code bundle. Always retain raw logs. */
export function knownUpstreamError(error: { name?: string; message: string; stack?: string }, recreatingViews = false): string | undefined {
  const stack = error.stack ?? '';
  if (recreatingViews && error.name === 'Canceled' && error.message === 'Canceled' && stack.trim() === 'Canceled: Canceled') return 'Code canceled a deliberately recreated native view';
  if (error.message === "ENOPRO: No file system provider found for resource 'file:///.copilot/config.json'"
    && stack.includes('AgentPluginService') && stack.includes('/code/vscode/out/vs/workbench/workbench.web.main.internal.js:')) return 'Code AgentPluginService has no browser file provider';
  if (error.message === 'Found unexpected null' && stack.includes('assertIsDefined')
    && stack.includes('/code/vscode/out/vs/workbench/contrib/webview/browser/pre/index.html')
    && (stack.includes('hookupOnLoadHandlers') || /pre\/index\.html[^\n]*:(?:1219|1223):29\)/.test(stack))) return 'Code temporary webview document replaced during WebKit load';
  return undefined;
}
export function replacedWebviewPlaceholder(url: string, error?: string, recreatingViews = false): boolean {
  const path = new URL(url).pathname;
  return (path.endsWith('/webview/browser/pre/fake.html') || (recreatingViews && ['/webview/browser/pre/index.html', '/webview/browser/pre/service-worker.js'].some(suffix => path.endsWith(suffix))))
    && ['net::ERR_ABORTED', 'Load request cancelled', 'Frame load interrupted', 'NS_BINDING_ABORTED', ...(recreatingViews || path.endsWith('/fake.html') ? ['NS_ERROR_FAILURE'] : [])].includes(error ?? '');
}
