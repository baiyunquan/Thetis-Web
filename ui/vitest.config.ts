import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  include: ['tests/**/*.test.ts', 'thetis-extension/src/**/*.spec.ts'],
  exclude: ['**/node_modules/**', '**/dist/**'],
  passWithNoTests: false
} });
