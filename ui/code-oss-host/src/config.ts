export const CODE_COMMIT = 'fdefc478b9148c1a47f913b3ec618a1226d9f600';
export interface HostConfig {
  mode: 'foundation';
  baseUrl: string;
  webviewEndpoint: string;
  extensionHostEndpoint: string;
  diagnosticEndpoint: string;
  build: { codeCommit: string; uiBuildId: string };
}
export function validateHostConfig(input: unknown): HostConfig {
  if (!input || typeof input !== 'object') throw new Error('Missing Foundation host configuration');
  const config = input as HostConfig;
  if (config.mode !== 'foundation') throw new Error('Expected Foundation host mode');
  for (const key of ['baseUrl', 'webviewEndpoint', 'extensionHostEndpoint', 'diagnosticEndpoint'] as const) {
    if (typeof config[key] !== 'string' || !config[key]) throw new Error(`Missing host configuration: ${key}`);
  }
  if (config.build?.codeCommit !== CODE_COMMIT) throw new Error('Code OSS build does not match the pinned Foundation commit');
  if (typeof config.build.uiBuildId !== 'string' || !config.build.uiBuildId) throw new Error('Missing UI build identity');
  return config;
}
