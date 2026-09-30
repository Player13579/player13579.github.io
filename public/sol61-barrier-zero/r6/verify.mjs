import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const test = spawnSync(process.execPath, [path.join(root, 'runtime-port-test.mjs')], { encoding: 'utf8', windowsHide: true });
if (test.status !== 0) {
  process.stderr.write(test.stderr || test.stdout);
  process.exit(test.status ?? 1);
}
const result = JSON.parse(test.stdout.trim());
assert.equal(result.status, 'pass CPU runtime contract/source port; actual WebGPU untested');
console.log(JSON.stringify({ ...result, actualGPU: 'not_run — separate root authorization/review required', browser: 'not_run', server: 'not_run' }));
