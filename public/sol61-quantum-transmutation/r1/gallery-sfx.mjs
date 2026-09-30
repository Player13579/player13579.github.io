import { createSoundBuffer } from './artist.mjs';

const SOUND_LIMIT_MS = 150;
const SOUND_LENGTH_SECONDS = 3.45;

export function createQuantumGallerySfx({
  verification = false,
  AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext,
  bufferFactory = createSoundBuffer,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
} = {}) {
  let context = null;
  let disposed = false;
  let muted = false;
  const buffers = new Map();
  const receipts = new Set();
  const voices = new Map();
  const starts = [];

  function stopAll() {
    for (const voice of voices.values()) {
      try { voice.source.stop(); } catch (_) {}
      try { voice.source.disconnect(); } catch (_) {}
      try { voice.gain.disconnect(); } catch (_) {}
    }
    voices.clear();
  }

  async function activateFromGesture() {
    if (verification || disposed) return false;
    if (muted) return false;
    if (!context) {
      if (typeof AudioContextCtor !== 'function') return false;
      context = new AudioContextCtor();
    }
    if (context.state !== 'running') await context.resume();
    return context.state === 'running';
  }

  function playReceipt({ id, variant, ageMs = 0 } = {}) {
    if (verification || disposed || muted || !context || context.state !== 'running') return false;
    if (typeof id !== 'string' || !id || !['lead', 'mercury'].includes(variant) ||
        !Number.isFinite(ageMs) || ageMs < 0 || ageMs > SOUND_LIMIT_MS || receipts.has(id)) return false;
    let buffer = buffers.get(variant);
    if (!buffer) {
      buffer = bufferFactory(context, variant);
      if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration < SOUND_LENGTH_SECONDS - 0.01)
        throw new Error('Quantum finite SFX buffer must cover its authored 3.45-second cue');
      buffers.set(variant, buffer);
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.24;
    source.connect(gain);
    gain.connect(context.destination);
    const offset = ageMs / 1000;
    const startAt = Math.max(context.currentTime, 0);
    source.start(startAt, offset);
    const voice = { source, gain, id, variant, ageMs, startedAt: now() };
    receipts.add(id);
    voices.set(id, voice);
    starts.push(Object.freeze({ id, variant, ageMs, durationSeconds: SOUND_LENGTH_SECONDS,
      offsetSeconds: offset, currentTime: context.currentTime }));
    source.onended = () => {
      if (voices.get(id) !== voice) return;
      voices.delete(id);
      try { source.disconnect(); } catch (_) {}
      try { gain.disconnect(); } catch (_) {}
    };
    return true;
  }

  function setMuted(value) {
    if (typeof value !== 'boolean') throw new TypeError('mute state must be boolean');
    muted = value;
    if (muted) stopAll();
    return muted;
  }

  async function dispose() {
    if (disposed) return false;
    disposed = true;
    stopAll();
    for (const buffer of buffers.values()) {
      // AudioBuffer has no destroy method; dropping references releases it.
      void buffer;
    }
    buffers.clear();
    if (context) {
      try { await context.close(); } catch (_) {}
      context = null;
    }
    return true;
  }

  function snapshot() {
    return Object.freeze({ verification, disposed, muted, audioContextCreated: context !== null,
      contextState: context?.state ?? 'none', receiptCount: receipts.size,
      activeVoices: voices.size, starts: Object.freeze(starts.slice()) });
  }

  return Object.freeze({ activateFromGesture, playReceipt, setMuted, stopAll, dispose, snapshot });
}
