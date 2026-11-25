import { synthesizeSubstitutionSfx, SFX_CUES } from "./creative/sfx.mjs";

export function createAudioHost({ AudioContextClass = globalThis.AudioContext, verify = false } = {}) {
  const verification = verify === true, errors = [], cleanupErrors = [], voices = new Set(), played = new Set();
  let context = null, unlocked = false, retired = false, unlockPromise = null, disposePromise = null;
  let closeSettled = false, closeInProgress = false;
  const record = (error, cleanup = false) => {
    let message;
    try { message = error && typeof error.message === "string" ? error.message : String(error); }
    catch { message = "audio host error"; }
    errors.push(message);
    if (cleanup) cleanupErrors.push(message);
  };
  const release = voice => {
    if (voice.released) return;
    voice.released = true;
    voices.delete(voice);
    voice.resolve();
  };

  function unlock() {
    if (verification || retired || !AudioContextClass) return Promise.resolve(false);
    if (unlockPromise) return unlockPromise;
    if (!context) {
      try { context = new AudioContextClass(); }
      catch (error) { unlocked = false; record(error); return Promise.reject(error); }
    }
    const active = context;
    let operation;
    operation = Promise.resolve().then(() => active.resume()).then(() => {
      unlocked = !retired && active.state === "running";
      return unlocked;
    }).catch(error => {
      unlocked = false;
      record(error);
      throw error;
    }).finally(() => {
      if (unlockPromise === operation) unlockPromise = null;
    });
    unlockPromise = operation;
    return operation;
  }

  async function cue({ kind, causeId, ageMs, sourceEligible, visible, mainOn, playing, fresh, enabled, isCurrent } = {}) {
    const spec = Object.hasOwn(SFX_CUES, kind) ? SFX_CUES[kind] : null;
    const window = kind === "grant" ? [20, 85] : kind === "trigger" ? [16, 75] : null;
    if (verification || retired || enabled !== true || !unlocked || !context || context.state !== "running" ||
        !window || !Number.isFinite(ageMs) || ageMs < window[0] || ageMs > window[1] || !spec ||
        ageMs < spec.offsetMs || ageMs > spec.latestStartAgeMs || !Number.isInteger(causeId) || causeId <= 0 ||
        played.has(causeId) || sourceEligible !== true || visible !== true || mainOn !== true ||
        playing !== true || fresh !== true) return false;

    let voice = null;
    try {
      const pcm = synthesizeSubstitutionSfx(kind);
      const buffer = context.createBuffer(pcm.channels.length, pcm.channels[0].length, pcm.sampleRate);
      pcm.channels.forEach((channel, index) => buffer.copyToChannel(channel, index));
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      if (typeof isCurrent === "function" && isCurrent() !== true) return false;
      if (retired || !unlocked || !context || context.state !== "running" || played.has(causeId)) return false;
      let resolve;
      const finished = new Promise(done => { resolve = done; });
      voice = { source, finished, resolve, released: false, stopRequested: false };
      voices.add(voice);
      source.onended = () => release(voice);
      source.start(0, (ageMs - spec.offsetMs) / 1000);
      played.add(causeId);
      return true;
    } catch (error) {
      if (voice) release(voice);
      record(error);
      throw error;
    }
  }

  async function stop() {
    const owned = Array.from(voices);
    let failure = null;
    for (const voice of owned) {
      if (voice.released || voice.stopRequested) continue;
      voice.stopRequested = true;
      try { voice.source.stop(); }
      catch (error) {
        record(error, true);
        if (failure === null) failure = error;
        release(voice);
      }
    }
    await Promise.all(owned.map(voice => voice.finished));
    if (failure !== null) throw failure;
  }

  function dispose() {
    if (disposePromise) return disposePromise;
    retired = true;
    unlocked = false;
    disposePromise = (async () => {
      if (unlockPromise) {
        try { await unlockPromise; } catch { /* The unlock caller receives this failure. */ }
      }
      let failure = null;
      try { await stop(); } catch (error) { failure = error; }
      if (!context) {
        closeSettled = true;
        played.clear();
        if (failure !== null) throw failure;
        return;
      }
      const closing = context;
      if (closing.state === "closed") closeSettled = true;
      else {
        closeInProgress = true;
        try { await closing.close(); closeSettled = true; }
        catch (error) {
          closeSettled = true;
          record(error, true);
          if (failure === null) failure = error;
        } finally { closeInProgress = false; }
      }
      if (closing.state !== "closed") {
        const error = new Error("AudioContext.close() settled without closing the context");
        record(error, true);
        if (failure === null) failure = error;
      }
      played.clear();
      if (failure !== null) throw failure;
    })();
    return disposePromise;
  }

  function snapshot() {
    const contextState = context ? context.state : "absent";
    const closed = retired && closeSettled && (contextState === "closed" || contextState === "absent") && voices.size === 0 && !unlockPromise && !closeInProgress && cleanupErrors.length === 0;
    return Object.freeze({
      retired, closed, closeSettled, contextState, activeVoices: voices.size,
      pending: voices.size + (unlockPromise ? 1 : 0) + (closeInProgress ? 1 : 0),
      errors: errors.slice(), cleanupErrors: cleanupErrors.slice(), unlocked: !retired && unlocked, verify: verification
    });
  }

  return Object.freeze({ unlock, cue, stop, dispose, snapshot, get unlocked() { return !retired && unlocked; } });
}
