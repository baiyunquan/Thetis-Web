// Compatibility entry point for the maintained packaged-runtime smoke suite.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const result = spawnSync(process.execPath, [fileURLToPath(new URL('./scripts/test.mjs', import.meta.url)),
  'e2e', 'foundation', '--project=edge', ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
