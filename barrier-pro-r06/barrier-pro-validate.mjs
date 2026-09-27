import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const required = [
  'README.md',
  'barrier-pro-design.md',
  'barrier-pro-audit.md',
  'barrier-pro-gates.md',
  'barrier-pro-model.mjs',
  'barrier-pro-sampler.mjs',
  'barrier-pro-renderer.mjs',
  'barrier-pro-shader.wgsl',
  'barrier-pro-gallery.html',
  'barrier-pro-gallery.mjs',
  'barrier-pro-sfx.mjs',
  'barrier-pro-contract.json',
  'results/release-status.json',
  'results/cpu-self-inspection.json',
  'SHA256SUMS.txt'
];

for (const rel of required) {
  await fs.access(new URL(rel, import.meta.url));
}

const status = JSON.parse(await fs.readFile(new URL('./results/release-status.json', import.meta.url), 'utf8'));
assert.equal(status.real_gpu_acceptance, 'not_run');
assert.equal(status.real_audio_acceptance, 'not_run');
console.log('barrier-pro-validate: PASS');
