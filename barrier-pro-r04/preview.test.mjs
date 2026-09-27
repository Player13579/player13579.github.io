import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BRANCHES, DURATIONS_MS, sampleEnvelope } from './barrier-pro-sampler.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const workspace = join(here, '..', '..');
const sourceRoot = join(workspace, 'outputs/request-20260927/barrier-gpt-pro-design/r0.4/barrier-pro-r0.4');
const manifest = JSON.parse(await readFile(join(here, 'provenance.json'), 'utf8'));

assert.deepEqual(BRANCHES, ['create', 'absorb', 'fracture', 'bust']);
for (const branch of BRANCHES) {
  const authoritativeActive = branch === 'create' || branch === 'absorb';
  const event = sampleEnvelope(branch, 1, { authoritativeActive });
  assert.equal(event.eventActive, true, `${branch} starts as an active event`);
  assert.equal(event.authoritativeActive, authoritativeActive);
  assert.ok(DURATIONS_MS[branch] > 0);
}

const html = await readFile(join(here, 'index.html'), 'utf8');
const preview = await readFile(join(here, 'preview.mjs'), 'utf8');
const renderer = await readFile(join(here, 'barrier-pro-renderer.mjs'), 'utf8');
assert.match(html, /width="980" height="620"/);
assert.match(preview, /has\('verify'\)/);
assert.match(preview, /get\('embed'\) === '1'/);
assert.match(preview, /new AudioContext\(\)/);
assert.match(preview, /addEventListener\('click'/);
assert.match(renderer, /getContext\('webgpu'\)/);
assert.doesNotMatch(renderer + preview, /getContext\(['"]2d['"]\)|CanvasRenderingContext2D/);
assert.match(manifest.sourceQuality, /unaccepted/);

for (const [name, expectedHash] of Object.entries(manifest.runtimeFiles)) {
  const [copied, original] = await Promise.all([
    readFile(join(here, name)),
    readFile(join(sourceRoot, name)),
  ]);
  const copiedHash = createHash('sha256').update(copied).digest('hex');
  const originalHash = createHash('sha256').update(original).digest('hex');
  assert.equal(copiedHash, expectedHash, `${name} matches recorded Pro source hash`);
  assert.equal(copiedHash, originalHash, `${name} is an unchanged source copy`);
}

console.log('barrier-pro-r04 preview checks passed');


