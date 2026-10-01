import assert from 'node:assert/strict';
import { boundedSurfaceSize, frameInput, makeSurfacePixels, readReviewAge, validateSurfaceLease, verificationAudioPolicy, verifyMode } from './preview-host.mjs';
import { readFileSync } from 'node:fs';
import { makePreview } from '../preview-fixture.mjs';

assert.equal(verifyMode('?verify'), true);
assert.equal(verifyMode('?x=1&verify=1'), true);
assert.equal(verifyMode('?verification=1'), false);
assert.equal(verificationAudioPolicy('?verify=1'), 'hard-zero');
assert.equal(verificationAudioPolicy(''), 'user-gesture-finite-version-sfx');
assert.equal(readReviewAge(''), null);
assert.equal(readReviewAge('?reviewAgeMs=0'), 0);
assert.equal(readReviewAge('?reviewAgeMs=1199'), 1199);
assert.equal(readReviewAge('?reviewAgeMs=1200'), false);
assert.equal(readReviewAge('?reviewAgeMs=1.5'), false);
const frozenFixture = makePreview(), hostFixture = frameInput(20, 'normal', false);
assert.deepEqual(hostFixture.receipt, frozenFixture.receipt, 'browser-safe fixed receipt matches frozen preview fixture');
assert.deepEqual(hostFixture.poseLease, frozenFixture.poseLease, 'approved pose metadata matches frozen preview fixture');
assert.deepEqual(hostFixture.context, frozenFixture.context);
assert.equal(hostFixture.rawActorClock, frozenFixture.rawActorClock);
assert.equal(hostFixture.motionAgeMs, frozenFixture.motionAgeMs);

const px = makeSurfacePixels(96, 54);
assert.equal(px.baseRadiance.length, 96 * 54 * 4);
assert.equal(px.albedo.length, px.worldNormal.length);
assert.equal(px.albedo.length, px.worldPosition.length);
let surfaceCount = 0, invalidMaskCount = 0;
for (let i = 3; i < px.worldPosition.length; i += 4) {
  if (px.worldPosition[i]) surfaceCount++;
  else invalidMaskCount++;
}
assert.ok(surfaceCount > 0, 'explicit geometry supplies valid world-position surface masks');
assert.ok(invalidMaskCount > 0, 'background texels carry no invented surface mask');
assert.throws(() => makeSurfacePixels(0, 4), RangeError);
assert.deepEqual(boundedSurfaceSize(1000, 562.5, 2), { width: 1500, height: 843 },
  'backing dimensions scale from the fixed CSS stage, not the canvas backing store');
const capped = boundedSurfaceSize(16_777_216, 16_777_215, 2);
assert.ok(capped.width * capped.height <= 2_500_000, 'absurd CSS inputs still obey the bounded GPU texture budget');
assert.throws(() => boundedSurfaceSize(0, 100, 1), RangeError);
const css = readFileSync(new URL('./preview.css', import.meta.url), 'utf8');
const hostSource = readFileSync(new URL('./preview-host.mjs', import.meta.url), 'utf8');
assert.match(css, /\.stage\{[^}]*contain:layout size/);
assert.match(css, /canvas\{position:absolute;inset:0;[^}]*contain:size/);
assert.match(hostSource, /new ResizeObserver\(resizeTargets\)\.observe\(canvas\.parentElement\)/,
  'resize observation follows the fixed CSS stage, not intrinsic backing dimensions');
assert.match(hostSource, /width === targetWidth && height === targetHeight && hdr && textures/,
  'unchanged sizes do not destroy and recreate targets');

const device = {}, hdr = {}, views = [ {}, {}, {}, {} ];
const lease = { device, targetView: {}, scope: 'physical-surface-inputs', isCurrent: () => true,
  baseRadiance: views[0], albedo: views[1], worldNormal: views[2], worldPosition: views[3] };
assert.equal(validateSurfaceLease(device, lease, hdr), true);
assert.equal(validateSurfaceLease({}, lease, hdr), false, 'foreign device is rejected');
assert.equal(validateSurfaceLease(device, { ...lease, worldNormal: views[0] }, hdr), false, 'aliased material inputs are rejected');
assert.equal(validateSurfaceLease(device, { ...lease, albedo: hdr }, hdr), false, 'HDR feedback alias is rejected');
assert.equal(validateSurfaceLease(device, { ...lease, isCurrent: () => false }, hdr), false, 'stale resource lease is rejected');
console.log('runtime preview host ownership and bounded backing-size checks passed');
