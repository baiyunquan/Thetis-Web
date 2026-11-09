import { validateHostConfig } from './config';
import { DEFAULT_EXPANDED_VIEWS } from '../../thetis-extension/src/workbench/viewRegistry';

async function bootstrap() {
  if (location.hostname === '127.0.0.1') {
    location.hostname = 'localhost';
    return;
  }
  const status = document.getElementById('host-status')!;
  const response = await fetch('./host-config.json', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Host configuration unavailable (HTTP ${response.status})`);
  const config = validateHostConfig(await response.json());
  // Keep this runtime import external to our bootstrap bundle. Code OSS owns its modules.
  const workbenchModule = './vscode/out/vs/workbench/workbench.web.main.internal.js';
  const { create, URI } = await import(/* @vite-ignore */ workbenchModule);
  document.title = 'Thetis Foundation';
  status.remove();
  create(document.body, {
    webviewEndpoint: config.webviewEndpoint,
    additionalBuiltinExtensions: [
      URI.parse(new URL('extensions/thetis/', location.href).href),
      URI.parse(new URL('extensions/theme-defaults/', location.href).href),
      URI.parse(new URL('extensions/theme-seti/', location.href).href)
    ],
    workspaceProvider: { workspace: undefined, trusted: true, open: async () => false },
    // The default profile and empty workspace have stable Code-owned storage identities.
    // Do not force this layout on subsequent visits: native moves/collapses are user state.
    defaultLayout: { views: DEFAULT_EXPANDED_VIEWS.map(id => ({ id })) },
    productConfiguration: {
      nameShort: 'Thetis', nameLong: 'Thetis Foundation', applicationName: 'thetis-foundation', quality: 'oss',
      commit: config.build.codeCommit, webEndpointUrlTemplate: config.extensionHostEndpoint
    },
    configurationDefaults: {
      'thetis.foundation.diagnosticEndpoint': config.diagnosticEndpoint,
      'workbench.startupEditor': 'none', 'workbench.colorTheme': 'Default Dark Modern', 'workbench.iconTheme': 'vs-seti',
      'window.title': 'Thetis Foundation', 'telemetry.telemetryLevel': 'off', 'update.mode': 'none',
      'extensions.autoCheckUpdates': false, 'extensions.autoUpdate': false, 'security.workspace.trust.enabled': false
    }
  });
  console.info('[thetis-host] Foundation loaded', { codeCommit: config.build.codeCommit, uiBuildId: config.build.uiBuildId });
}
void bootstrap().catch(error => {
  const status = document.getElementById('host-status') ?? document.body.appendChild(document.createElement('p'));
  status.setAttribute('role', 'alert');
  status.textContent = `Thetis Foundation could not start: ${error instanceof Error ? error.message : String(error)}`;
  console.error('[thetis-host]', error);
});
