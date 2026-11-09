import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.e2e.ts',
  timeout: 90000, expect: { timeout: 20000 },
  fullyParallel: false, workers: 1, retries: 0,
  outputDir: '../build/foundation-evidence/browser',
  reporter: [['list'], ['json', { outputFile: '../build/foundation-evidence/browser-results.json' }]],
  use: { baseURL: process.env.THETIS_BASE_URL ?? 'http://localhost:50001', viewport: { width: 1440, height: 1000 },
    actionTimeout: 20000, screenshot: 'only-on-failure', trace: 'retain-on-failure', ignoreHTTPSErrors: false },
  projects: [
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1440, height: 1000 } } },
    // Test the embedded endpoint directly; the user's system proxy may intercept *.localhost.
    { name: 'firefox', use: { ...devices['Desktop Firefox'], launchOptions: { firefoxUserPrefs: { 'network.proxy.type': 0 } }, viewport: { width: 1440, height: 1000 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 1000 } } }
  ]
});
