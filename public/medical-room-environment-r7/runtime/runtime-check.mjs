import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGINAL, acceptedFrameInput, fluidState, uniforms } from '../artist.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(here, '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestBytes = await readFile(resolve(sourceRoot, 'manifest.json'));
const sourceManifest = JSON.parse(manifestBytes.toString('utf8'));
assert.equal(hash(manifestBytes), 'ed7ebb22d644bffc7d63e23f2827ec1407e69b58a17a2ffd414e17a624090de1', 'r7 source manifest remains frozen');

const sourceFiles = [
  'API-RUNTIME.md',
  'source-contract.json',
  'artist.mjs',
  'cloth.mjs',
  'support-light/artist.mjs',
  'world.wgsl',
  'blur.wgsl',
  'post.wgsl',
  'medical-room-vfx-r4.png',
];
for (const file of sourceFiles) {
  const bytes = await readFile(resolve(sourceRoot, file));
  assert.equal(hash(bytes), sourceManifest.files[file].sha256, `${file} matches the frozen source hash`);
}
assert.equal(hash(await readFile(resolve(sourceRoot, ORIGINAL.path))), ORIGINAL.sha256, 'original PNG remains byte-identical');

const viewportPx = [1920, 1080];
const imageRectPx = [494.8, 0, 930.4, 1080];
const baseInput = { viewportPx, imageRectPx, environmentTimeMs: 0, sourceVisibility: 1, effect: true, fluid: true, cloth: true, obs: true };
const base = uniforms(baseInput);
assert.equal(base.light.length, 24);
assert.equal(base.light.byteLength, 96);
assert.equal(base.water.length, 32);
assert.equal(base.water.byteLength, 128);
assert.equal(base.cloth.length, 16);
assert.equal(base.cloth.byteLength, 64);
assert.equal(base.water[1], 1, 'water starts enabled');
assert.deepEqual([...base.water.slice(4, 8)], [887, 188, 885, 234], 'water anchors stay in original pixel coordinates');
assert.deepEqual([...base.cloth.slice(4, 8)], [254, 156, 312, 229], 'cart cloth keeps its frozen support rectangle');
assert.deepEqual([...base.cloth.slice(8, 12)], [791, 136, 834, 166], 'sink cloth keeps its frozen support rectangle');
assert.ok(Math.abs(base.light[4] - 494.8) < 0.001 && Math.abs(base.light[6] - 930.4) < 0.001, 'light/image fit uses backing pixels');

assert.equal(fluidState(0).stage, 'running');
assert.equal(fluidState(5500).stage, 'closing');
assert.equal(fluidState(6000).stage, 'residual');
assert.equal(fluidState(9000).stage, 'draining');
assert.equal(fluidState(10500).stage, 'dry');
assert.equal(fluidState(12000).stage, 'running', 'source timeline wraps at its declared period');

const waterOff = uniforms({ ...baseInput, fluid: false });
assert.equal(waterOff.water[1], 0);
assert.equal(waterOff.cloth[3], 1, 'water toggle leaves cloth enabled');
const clothOff = uniforms({ ...baseInput, cloth: false });
assert.equal(clothOff.cloth[3], 0);
assert.equal(clothOff.water[1], 1, 'cloth toggle leaves water enabled');
const obsOff = uniforms({ ...baseInput, obs: false });
assert.equal(obsOff.light[10], 0);
assert.equal(obsOff.water[1], 1);
assert.equal(obsOff.cloth[3], 1);
const sourceLightOff = uniforms({ ...baseInput, sourceVisibility: 0 });
assert.equal(sourceLightOff.light[9], 0);
assert.equal(sourceLightOff.water[1], 1, 'light-source toggle does not cancel the water demo');
const effectOff = uniforms({ ...baseInput, effect: false });
assert.equal(effectOff.light[3], 0);
assert.equal(effectOff.water[1], 0);
assert.equal(effectOff.cloth[3], 0);
const reduced = uniforms({ ...baseInput, reducedMotion: true });
assert.equal(reduced.water[1], 0);
assert.equal(reduced.cloth[3], 0);
assert.equal(reduced.light[8], 1, 'reduced-motion lighting stays at the frozen high phase');

const accepted = acceptedFrameInput({
  visible: true,
  current: true,
  roomId: 'medical',
  sourceMode: 'gallery-demo',
  basisHash: ORIGINAL.sha256,
  environmentTimeMs: 6000,
});
assert.equal(accepted.environmentTimeMs, 6000);
assert.equal(accepted.sourceMode, 'gallery-demo');
assert.equal(acceptedFrameInput({ visible: false, current: true, roomId: 'medical', sourceMode: 'gallery-demo', basisHash: ORIGINAL.sha256, environmentTimeMs: 0 }), null);
assert.throws(() => acceptedFrameInput({ visible: true, current: true, roomId: 'medical', sourceMode: 'actual-tap', basisHash: ORIGINAL.sha256, environmentTimeMs: 0 }), /actual tap-state producer/);
assert.throws(() => uniforms({ ...baseInput, environmentTimeMs: -1 }), /invalid medical r6/);

console.log(JSON.stringify({ status: 'pass', checks: 48, sourceManifestSha256: hash(manifestBytes), originalSha256: ORIGINAL.sha256, gpu: 'not_run' }, null, 2));
