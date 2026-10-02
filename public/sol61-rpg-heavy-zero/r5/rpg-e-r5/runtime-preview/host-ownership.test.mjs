import assert from 'node:assert/strict';
import { boundedSurfaceSize, EMBED_CYCLE_LENGTH_MS, EMBED_EVENT_DURATION_MS, embedLoopState, frameInput, makeSurfacePixels, readReviewAge, validateSurfaceLease, verificationAudioPolicy, verifyMode } from './preview-host.mjs';
import { readFileSync } from 'node:fs';
import { makePreview } from '../preview-fixture.mjs';
import { createAudioOwner, plan, VERSION } from '../rpg-e.mjs';

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
assert.equal(EMBED_EVENT_DURATION_MS, 1200);
assert.equal(EMBED_CYCLE_LENGTH_MS, 1500);
assert.deepEqual(embedLoopState(0), { cycle: 0, ageMs: 0, inPauseGap: false });
assert.deepEqual(embedLoopState(1199), { cycle: 0, ageMs: 1199, inPauseGap: false });
assert.deepEqual(embedLoopState(1200), { cycle: 0, ageMs: 1200, inPauseGap: true });
assert.deepEqual(embedLoopState(1499), { cycle: 0, ageMs: 1200, inPauseGap: true });
assert.deepEqual(embedLoopState(1500), { cycle: 1, ageMs: 0, inPauseGap: false });
assert.throws(() => embedLoopState(-1), RangeError);
assert.throws(() => embedLoopState(Infinity), RangeError);
const cycle0 = frameInput(0, 'normal', false, 0), cycle1 = frameInput(0, 'normal', false, 1);
assert.equal(plan(cycle0).status, 'planned');
assert.equal(plan(cycle1).status, 'planned');
assert.notEqual(cycle0.receipt.causeId, cycle1.receipt.causeId, 'every embedded replay receives a fresh causal identity');
assert.notEqual(cycle0.receipt.soundId, cycle1.receipt.soundId, 'each replay has fresh one-shot SFX identity');
assert.notEqual(cycle0.receipt.source.id, cycle1.receipt.source.id, 'each replay has a fresh source ID');
assert.ok(cycle1.receipt.attempts.every(a => a.causeId === cycle1.receipt.causeId));
assert.equal(cycle1.poseLease.causeId, cycle1.receipt.causeId);
assert.equal(cycle1.rawActorClock - cycle1.receipt.eClockStartedAt, 0, 'new E clock starts at actual local fixture age zero');
assert.throws(() => frameInput(0, 'normal', false, -1), RangeError);
const validSubmissions = new Set();
let soundStarts = 0;
const audioContext = { state: 'running', sampleRate: 48000,
  createBuffer() { return { copyToChannel() {} }; },
  createBufferSource() { return { connect() {}, disconnect() {}, start() { soundStarts++; } }; } };
const audioOwner = createAudioOwner({ context: audioContext, destination: {},
  isSubmitted: receipt => validSubmissions.has(receipt) });
for (const fixture of [cycle0, cycle1]) {
  const planned = plan(fixture);
  const submitted = Object.freeze({ submitted: true, scope: 'preview-only', version: VERSION,
    causeId: planned.causeId, sourceEffectId: planned.sourceEffectId, roomId: planned.roomId,
    sessionGeneration: planned.sessionGeneration, soundId: planned.soundId, positiveCoverage: true,
    endpoints: planned.endpoints });
  assert.equal(audioOwner.admit(submitted, 'launch', { unlocked: true }), false,
    'a structurally plausible but unsubmitted sound cause is rejected');
  validSubmissions.add(submitted);
  assert.equal(audioOwner.admit(submitted, 'launch', { unlocked: true }), true);
  assert.equal(audioOwner.admit(submitted, 'launch', { unlocked: true }), false,
    'one causal launch sound is consumed once');
  const impact = submitted.endpoints.find(e => e.role === 'impact');
  assert.ok(impact);
  assert.equal(audioOwner.admit(submitted, 'impact', { unlocked: true, endpointId: impact.id }), true);
  assert.equal(audioOwner.admit(submitted, 'impact', { unlocked: true, endpointId: impact.id }), false,
    'one causal impact sound is consumed once');
}
assert.equal(soundStarts, 4, 'two unique cycles each admit one finite launch and impact sound after submission');
audioOwner.destroy();

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
assert.match(hostSource, /embedElapsedMs \+= Math\.max\(0, now - embedLastNow\)/,
  'embed loop derives event age and cycle from a visibility-paused local preview clock');
assert.match(hostSource, /if \(document\.hidden\) \{ embedLastNow = now; return embedElapsedMs; \}/,
  'hidden iframe time does not advance the local E fixture clock');
assert.match(hostSource, /if \(running && !embedded && age >= 1200\)/,
  'standalone remains one-shot while embed mode auto-loops');
assert.match(hostSource, /submittedEFrames\+\+/,
  'cycle telemetry advances only after the owned effect submission returns');
assert.match(hostSource, /audioOwner\?\.destroy\(\); audioContext\?\.close\(\); effectPass\?\.destroy\(\); disposeTargets\(\)/,
  'unload stops playback and releases host-owned audio/GPU resources');
assert.match(hostSource, /window\.__gallerySfx = Object\.freeze\(\{ activateFromGesture/,
  'gallery user gesture reaches the authored preview SFX owner');
assert.match(hostSource, /soundEligibleCycle = currentCycle\(\) \+ 1/,
  'a late gesture arms sound at the next fresh event rather than replaying a mid-cycle onset');
assert.match(hostSource, /currentCycle\(\) < soundEligibleCycle/,
  'embedded SFX waits for a fresh submitted cause cycle');
assert.match(hostSource, /if \(verification\) return \{ state: 'silent' \}/,
  'verification bridge stays hard-zero');
assert.match(hostSource, /if \(verification\) return false;\s*if \(!audioContext\)/,
  'verify creates no AudioContext even if a caller attempts the unlock path');
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
assert.match(html, /id="error" role="alert" hidden/);
assert.match(css, /html\.embed header,html\.embed \.controls,html\.embed \.note,html\.embed details\{display:none\}/,
  'embedded presentation hides standalone controls without hiding failures');

const device = {}, hdr = {}, views = [ {}, {}, {}, {} ];
const lease = { device, targetView: {}, scope: 'physical-surface-inputs', isCurrent: () => true,
  baseRadiance: views[0], albedo: views[1], worldNormal: views[2], worldPosition: views[3] };
assert.equal(validateSurfaceLease(device, lease, hdr), true);
assert.equal(validateSurfaceLease({}, lease, hdr), false, 'foreign device is rejected');
assert.equal(validateSurfaceLease(device, { ...lease, worldNormal: views[0] }, hdr), false, 'aliased material inputs are rejected');
assert.equal(validateSurfaceLease(device, { ...lease, albedo: hdr }, hdr), false, 'HDR feedback alias is rejected');
assert.equal(validateSurfaceLease(device, { ...lease, isCurrent: () => false }, hdr), false, 'stale resource lease is rejected');
console.log('runtime preview host ownership and bounded backing-size checks passed');
