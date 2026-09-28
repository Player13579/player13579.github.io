import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const required = [
  'README.md',
  'ENGINE-INTEGRATION.md',
  'barrier-pro-audit.md',
  'barrier-pro-design.md',
  'barrier-pro-gates.md',
  'barrier-pro-contract.json',
  'barrier-pro-model.mjs',
  'barrier-pro-sampler.mjs',
  'barrier-pro-renderer.mjs',
  'barrier-pro-shader.wgsl',
  'barrier-pro-gallery.html',
  'barrier-pro-gallery.mjs',
  'barrier-pro-sfx.mjs',
  'barrier-pro-tests.mjs',
  'results/cpu-self-inspection.json',
  'results/release-status.json',
  'SHA256SUMS.txt',
  'sfx/create.wav',
  'sfx/absorb.wav',
  'sfx/fracture.wav',
  'sfx/bust.wav'
];

for (const rel of required) {
  await fs.access(new URL(rel, import.meta.url));
}
const status = JSON.parse(await fs.readFile(new URL('./results/release-status.json', import.meta.url), 'utf8'));
assert.equal(status.real_gpu_acceptance, 'not_run');
assert.equal(status.real_audio_acceptance, 'not_run');
console.log('barrier-pro-validate: PASS');
