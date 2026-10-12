import { createZeroSfxPlaybackHost } from '../inputs/r1623/src/playback-host.mjs';
import { resolveCauseBoundMonoBuffer } from '../inputs/r1623/src/pcm-buffer-adapter.mjs';

/**
 * Normal gallery audio is opt-in from an explicit user gesture. Completed GPU
 * receipts received before that gesture are intentionally not replayed.
 * Verification is permanently muted for this controller instance.
 */
export function createNormalGalleryAudioController({
  verifyMode,
  AudioContextCtor,
  readCurrentSourceAgeMs,
  isSourceCurrent,
  resolveAudioBuffer = resolveCauseBoundMonoBuffer,
  sourcePan = 0,
  maxVoices = 4,
  maxRememberedCauses = 2048,
  retirementTimeoutMs = 2000,
} = {}) {
  if (typeof verifyMode !== 'boolean') throw new TypeError('verifyMode must be explicit');
  let retired = false;
  let muted = verifyMode;
  let playIntent = false;
  let intentEpoch = 0;
  let retirement = null;

  const host = createZeroSfxPlaybackHost({
    verifyMode,
    AudioContextCtor,
    readCurrentSourceAgeMs,
    isSourceCurrent,
    resolveAudioBuffer,
    sourcePan,
    maxVoices,
    maxRememberedCauses,
    retirementTimeoutMs,
  });

  async function unlockFromGesture() {
    if (verifyMode) return Object.freeze({ unlocked: false, reason: 'verify-mode' });
    if (retired) return Object.freeze({ unlocked: false, reason: 'retired' });
    if (muted) return Object.freeze({ unlocked: false, reason: 'muted' });
    const epoch = ++intentEpoch;
    playIntent = false;
    const result = await host.unlockFromGesture();
    if (retired || muted || epoch !== intentEpoch) return Object.freeze({ unlocked: false, reason: retired ? 'retired' : 'cancelled' });
    if (result?.unlocked !== true) return result;
    playIntent = true;
    return Object.freeze({ ...result, playIntent: true });
  }

  async function playCompletedFrame(receipt) {
    if (verifyMode) return Object.freeze({ status: 'suppressed-verify' });
    if (retired) return Object.freeze({ status: 'retired' });
    if (muted) return Object.freeze({ status: 'suppressed-muted' });
    if (!playIntent) return Object.freeze({ status: 'explicit-play-required' });
    // R1623 performs the strict completed/same-device proof, exact current
    // cause/generation/frame checks, live age reads after async PCM preparation,
    // expiry gate, bounded scheduling, and actual-start deduplication.
    return host.playCompletedFrame(receipt);
  }

  async function setMuted(nextMuted) {
    if (typeof nextMuted !== 'boolean') throw new TypeError('muted state must be explicit');
    if (retired) return Object.freeze({ requested: 0, remaining: 0, errors: [{ phase: 'retired' }] });
    intentEpoch++;
    if (nextMuted) playIntent = false;
    muted = verifyMode || nextMuted;
    const result = await host.setMuted(muted);
    return Object.freeze({ ...result, muted, playIntent });
  }

  function stopSource(identity) {
    if (retired) return Promise.resolve(Object.freeze({ requested: 0, remaining: 0, reason: 'retired', errors: [] }));
    intentEpoch++;
    playIntent = false;
    return host.stopSource(identity);
  }

  function retire() {
    if (retirement) return retirement;
    retired = true;
    muted = true;
    playIntent = false;
    intentEpoch++;
    retirement = host.retire().then(result => Object.freeze({ ...result, settled: result.settled === true }));
    return retirement;
  }

  return Object.freeze({
    unlockFromGesture,
    playCompletedFrame,
    setMuted,
    stopSource,
    retire,
    snapshot: () => Object.freeze({
      verifyMode,
      muted,
      playIntent,
      retired,
      intentEpoch,
      playback: host.snapshot(),
    }),
  });
}