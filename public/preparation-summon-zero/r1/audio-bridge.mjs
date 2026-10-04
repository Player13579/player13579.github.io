import * as Sfx from './source/sfx.mjs';
import { VERSION } from './host-contract.mjs';

export function createSfxBridge({ windowRef = globalThis.window, verify = false,
  isCurrent = () => true, currentEligibility = () => null } = {}) {
  let context = null, master = null, voice = null, latestReceipt = null, disposed = false;
  const emittedCauses = new Set();
  function stop() {
    if (!voice) return;
    try { voice.stop(); } catch {}
    try { voice.disconnect(); } catch {}
    voice = null;
  }
  function snapshot() {
    return Object.freeze({ verify, supported: Boolean(windowRef?.AudioContext || windowRef?.webkitAudioContext),
      contextCount: verify ? 0 : Number(Boolean(context)), contextState: verify ? 'closed' : context?.state || 'suspended',
      masterGain: verify ? 0 : Number(master?.gain?.value) || 0,
      muted: verify || !master || master.gain.value === 0,
      hidden: windowRef?.document?.visibilityState === 'hidden', latest: latestReceipt });
  }
  function tryPlay(frame = currentEligibility()) {
    if (!frame || disposed || verify || !isCurrent() || frame.held || frame.hidden ||
        !frame.sourceEnabled || !frame.layoutCurrent || !Number.isFinite(frame.ageMs) ||
        frame.ageMs < 0 || frame.ageMs > 180 || !frame.causeId || emittedCauses.has(frame.causeId) ||
        context?.state !== 'running' || !(master?.gain?.value > 0)) return false;
    emittedCauses.add(frame.causeId);
    try {
      stop();
      const pcm = Sfx.synthesizeCue(context.sampleRate);
      const buffer = context.createBuffer(1, pcm.length, context.sampleRate);
      buffer.copyToChannel(pcm, 0);
      const source = context.createBufferSource();
      source.buffer = buffer; source.connect(master); voice = source;
      const receipt = Object.freeze({ sfxId: Sfx.SFX_ID, causeId: frame.causeId,
        eventId: frame.causeId, state: 'scheduled', startAgeMs: frame.ageMs,
        durationMs: Sfx.SFX_DURATION_MS, verifyMuted: false });
      latestReceipt = receipt;
      source.onended = () => { if (voice === source) voice = null; try { source.disconnect(); } catch {} };
      source.start();
      return true;
    } catch (error) {
      latestReceipt = Object.freeze({ sfxId: Sfx.SFX_ID, causeId: frame.causeId,
        state: 'failed', error: String(error?.message || error), durationMs: Sfx.SFX_DURATION_MS });
      return false;
    }
  }
  async function activateFromGesture(item) {
    if (item?.id !== VERSION) return Object.freeze({ state: 'unsupported', reason: 'Selected version does not match this preview' });
    if (verify) return Object.freeze({ state: 'silent', reason: 'verify mode hard-mutes audio' });
    if (disposed || !isCurrent()) return Object.freeze({ state: 'unavailable', reason: 'Preview is no longer current' });
    const AudioContextCtor = windowRef?.AudioContext || windowRef?.webkitAudioContext;
    if (!AudioContextCtor) return Object.freeze({ state: 'unsupported', reason: 'AudioContext is unavailable' });
    try {
      if (!context) {
        context = new AudioContextCtor();
        master = context.createGain(); master.gain.value = 0.22; master.connect(context.destination);
      }
      await context.resume();
      if (!isCurrent() || disposed) return Object.freeze({ state: 'unavailable', reason: 'Preview changed while audio resumed' });
      if (context.state !== 'running' || !(master.gain.value > 0))
        return Object.freeze({ state: 'unavailable', reason: 'Audio context did not enter the running state' });
      tryPlay(currentEligibility());
      return Object.freeze({ state: 'active', reason: 'Summon Zero onset cue is enabled' });
    } catch (error) {
      return Object.freeze({ state: 'unavailable', reason: String(error?.message || error) });
    }
  }
  const api = Object.freeze({ activateFromGesture, getSnapshot: snapshot });
  if (windowRef) windowRef.__gallerySfx = api;
  return Object.freeze({ activateFromGesture, getSnapshot: snapshot, tryPlay, stop,
    dispose() { if (disposed) return; disposed = true; stop(); if (context) void context.close(); context = null; master = null; },
    get latestReceipt() { return latestReceipt; }, get emittedCauseIds() { return Object.freeze([...emittedCauses]); } });
}
