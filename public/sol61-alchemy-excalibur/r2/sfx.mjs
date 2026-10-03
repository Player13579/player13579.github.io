const END_MS = 1000;
const MAX_VOICES = 4;
const MAX_GAIN = 0.24;
const RAMP = 0.005;

function finite(value) { return Number.isFinite(value); }

/** One preview-owned invention cue. No AudioContext is created until a real gesture. */
export function createExcaliburSfx({ verify = false, AudioContextCtor = globalThis.AudioContext,
  getCurrentCauseId = null, getCurrentEffectAge = null,
  now = () => globalThis.performance?.now?.() ?? 0 } = {}) {
  let context = null;
  let enabled = false;
  let disposed = false;
  const active = new Map();
  const consumed = new Set();
  let sourceCreations = 0;
  let contextCreations = 0;

  function cleanupVoice(id) {
    const voice = active.get(id);
    if (!voice) return false;
    active.delete(id);
    for (const node of voice.sources) { try { node.stop(); } catch {} }
    try { voice.nodes.forEach(node => { try { node.disconnect(); } catch {} }); } catch {}
    return true;
  }

  function createNoise(ctx) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.56));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    // Deterministic, zero-mean noise: preview iterations are repeatable.
    let seed = 0x51f15e;
    let mean = 0;
    for (let i = 0; i < length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const sample = ((seed >>> 8) / 0x800000) - 1;
      channel[i] = sample;
      mean += sample;
    }
    mean /= length;
    for (let i = 0; i < length; i++) channel[i] -= mean;
    return buffer;
  }

  function rampEnvelope(param, start, attackEnd, releaseStart, end, peak) {
    param.cancelScheduledValues(start);
    param.setValueAtTime(0, start);
    param.linearRampToValueAtTime(peak, Math.min(attackEnd, start + RAMP));
    param.setValueAtTime(peak, releaseStart);
    param.linearRampToValueAtTime(0, end);
  }

  function play(causeId) {
    if (verify || disposed || !enabled || !context || !context.state || !causeId || typeof causeId !== 'string')
      return { played: false, reason: verify ? 'verification-hard-mute' : 'audio-locked-or-disposed' };
    if (consumed.has(causeId)) return { played: false, reason: 'duplicate-cause' };
    if (active.size >= MAX_VOICES) return { played: false, reason: 'voice-cap' };
    if (consumed.size >= 4096) return { played: false, reason: 'cause-history-cap' };
    consumed.add(causeId);
    const start = context.currentTime;
    const end = start + END_MS / 1000;
    const nodes = [];
    const master = context.createGain();
    master.gain.setValueAtTime(MAX_GAIN, start);
    master.connect(context.destination);
    nodes.push(master);

    const low = context.createOscillator();
    const lowGain = context.createGain();
    low.type = 'triangle';
    low.frequency.setValueAtTime(58, start);
    rampEnvelope(lowGain.gain, start, start + 0.025, start + 0.075, start + 0.12, 0.30);
    low.connect(lowGain); lowGain.connect(master); low.start(start); low.stop(start + 0.13);
    nodes.push(low, lowGain);
    sourceCreations += 1;

    const metal = context.createOscillator();
    const metalGain = context.createGain();
    const metalFilter = context.createBiquadFilter();
    metal.type = 'sine';
    metal.frequency.setValueAtTime(612, start + 0.12);
    metal.frequency.exponentialRampToValueAtTime(486, start + 0.42);
    metalFilter.type = 'bandpass'; metalFilter.frequency.setValueAtTime(720, start + 0.12);
    metalFilter.Q.setValueAtTime(1.1, start + 0.12);
    rampEnvelope(metalGain.gain, start + 0.12, start + 0.14, start + 0.37, start + 0.44, 0.42);
    metal.connect(metalFilter); metalFilter.connect(metalGain); metalGain.connect(master);
    metal.start(start + 0.12); metal.stop(start + 0.445);
    nodes.push(metal, metalFilter, metalGain);
    sourceCreations += 1;

    const noise = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = createNoise(context);
    highpass.type = 'highpass'; highpass.frequency.setValueAtTime(1100, start + 0.44);
    rampEnvelope(noiseGain.gain, start + 0.44, start + 0.48, start + 0.88, end, 0.18);
    noise.connect(highpass); highpass.connect(noiseGain); noiseGain.connect(master);
    noise.start(start + 0.44); noise.stop(end + 0.005);
    nodes.push(noise, highpass, noiseGain);
    sourceCreations += 1;

    const voice = { id: causeId, nodes, sources: [low, metal, noise], master, startedAt: start, endsAt: end };
    active.set(causeId, voice);
    noise.onended = () => cleanupVoice(causeId);
    return { played: true, causeId, endsAt: end, gainCeiling: MAX_GAIN, sourceCreations };
  }

  async function activateFromGesture(item) {
    if (verify) return { state: 'silent', reason: 'verification-hard-mute' };
    if (disposed) return { state: 'unsupported', reason: 'disposed' };
    if (!AudioContextCtor) return { state: 'unsupported', reason: 'AudioContext unavailable' };
    try {
      if (!context) { context = new AudioContextCtor(); contextCreations += 1; }
      // resume() is invoked during the gallery gesture, before this async continuation.
      const resume = context.resume?.();
      if (resume && typeof resume.then === 'function') await resume;
      if (disposed) return { state: 'unsupported', reason: 'disposed' };
      enabled = true;
      // Never replay a late onset. A gesture during the active ray arms only a
      // later, genuinely new gallery cycle; age/cause are sampled after resume.
      const age = getCurrentEffectAge?.();
      const id = getCurrentCauseId?.();
      if (finite(age) && age >= 0 && age <= 5 && typeof id === 'string' && id) {
        const result = play(id);
        if (!result.played && !['duplicate-cause'].includes(result.reason))
          return { state: 'unsupported', reason: result.reason };
      }
      return { state: 'active', reason: 'armed-at-next-authored-onset' };
    } catch (error) {
      enabled = false;
      return { state: 'unsupported', reason: error?.message || 'audio setup failed' };
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true; enabled = false;
    for (const id of [...active.keys()]) cleanupVoice(id);
    if (context) {
      const old = context; context = null;
      try { const closing = old.close?.(); if (closing?.catch) closing.catch(() => {}); } catch {}
    }
  }

  return Object.freeze({ activateFromGesture, play, dispose,
    get snapshot() { return Object.freeze({ verify: Boolean(verify), enabled, disposed,
      activeVoices: active.size, consumedCauses: consumed.size, contextCreations, sourceCreations,
      maxVoices: MAX_VOICES, gainCeiling: MAX_GAIN, lifetimeMs: END_MS }); } });
}
