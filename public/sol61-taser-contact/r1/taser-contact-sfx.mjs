const TAU = Math.PI * 2;
const DURATION_MS = 480;
const MAX_RECEIPT_LATENESS_MS = 34;
const VOICE_GAIN = 0.38;
const TARGET_PCM_PEAK = 0.78;
const BUFFER_CACHE = new WeakMap();

const PHASES = Object.freeze([
  Object.freeze({ name: 'contact-discharge', startMs: 0, endMs: 60, anchorMs: 0, crackles: 4 }),
  Object.freeze({ name: 'restrike-1', startMs: 85, endMs: 140, anchorMs: 85, crackles: 2 }),
  Object.freeze({ name: 'restrike-2', startMs: 175, endMs: 225, anchorMs: 175, crackles: 2 }),
  Object.freeze({ name: 'restrike-3', startMs: 270, endMs: 320, anchorMs: 270, crackles: 3 })
]);

function seed32(value) {
  const text = String(value);
  if (!text || text === 'undefined' || text === 'null') throw new TypeError('A non-empty causeId seed is required');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  return hash || 0x9e3779b9;
}

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function smooth01(x) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function makeBursts(seed) {
  const random = makeRandom(seed), bursts = [];
  for (const phase of PHASES) {
    bursts.push({ atMs: phase.anchorMs, strength: phase.anchorMs === 0 ? 1 : 0.78, kind: 'snap' });
    let previous = phase.startMs + (phase.anchorMs === 0 ? 8 : 7);
    for (let i = 0; i < phase.crackles; i++) {
      const span = Math.max(1, phase.endMs - 15 - previous);
      const atMs = previous + 2 + random() * span / (phase.crackles - i + 1);
      bursts.push({ atMs, strength: 0.26 + random() * 0.28, kind: 'crackle' });
      previous = atMs + 1.5;
    }
  }
  return bursts.sort((a, b) => a.atMs - b.atMs);
}

function burstEnvelope(seconds) {
  if (seconds < 0 || seconds >= 0.015) return 0;
  const attack = Math.min(1, seconds / 0.001);
  const decay = Math.exp(-seconds / 0.0043);
  const cutoff = 1 - smooth01((seconds - 0.0105) / 0.0045);
  return attack * decay * cutoff;
}

export function snapEnvelopeAtMs(milliseconds) {
  return burstEnvelope(Number(milliseconds) / 1000);
}

/** Deterministic mono PCM; seed it with the authoritative contact causeId. */
export function renderTaserContactPcm(causeId, sampleRate = 48000) {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('Unsupported sample rate');
  const random = makeRandom(seed32(causeId));
  const frames = Math.round(sampleRate * DURATION_MS / 1000);
  const pcm = new Float32Array(frames);
  const active = new Uint8Array(frames);
  const bursts = makeBursts(seed32(causeId));
  const phaseA = random() * TAU, phaseB = random() * TAU;
  const burstSamples = bursts.map(b => ({ ...b, at: b.atMs / 1000 }));

  for (let i = 1; i < frames - 1; i++) {
    const t = i / sampleRate;
    let value = 0;
    for (const burst of burstSamples) {
      const local = t - burst.at;
      if (local < 0 || local >= 0.015) continue;
      const env = burstEnvelope(local) * burst.strength;
      const highNoise = random() * 2 - 1;
      // Short, fixed low resonances give the broadband crack a compact body;
      // frequencies never glide and the 15 ms envelope prevents pitched tones.
      const lowResonance = Math.sin(TAU * 118 * local + phaseA) * 0.18
        + Math.sin(TAU * 231 * local + phaseB) * 0.09;
      const bodyNoise = random() * 2 - 1;
      value += env * (0.72 * highNoise + 0.18 * bodyNoise + lowResonance);
      if (env > 0) active[i] = 1;
    }

    // A quiet, fixed-resonance tail carries the final restrike into silence at 480 ms.
    if (t >= 0.320) {
      const tail = Math.exp(-(t - 0.320) / 0.040) * (1 - smooth01((t - 0.420) / 0.060));
      const tailNoise = random() * 2 - 1;
      value += tail * (0.008 * tailNoise
        + 0.006 * Math.sin(TAU * 104 * (t - 0.320) + phaseA)
        + 0.003 * Math.sin(TAU * 186 * (t - 0.320) + phaseB));
      if (tail > 0) active[i] = 1;
    }
    pcm[i] = value;
  }

  // Remove residual DC, restore exact zero endpoints, then normalize with headroom.
  let mean = 0, activeSamples = 0;
  for (let i = 0; i < pcm.length; i++) if (active[i]) { mean += pcm[i]; activeSamples++; }
  mean /= Math.max(1, activeSamples);
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    if (active[i]) pcm[i] -= mean;
    const magnitude = Math.abs(pcm[i]);
    if (magnitude > peak) peak = magnitude;
  }
  pcm[0] = 0;
  pcm[pcm.length - 1] = 0;
  if (peak > 0) {
    const scale = TARGET_PCM_PEAK / peak;
    for (let i = 0; i < pcm.length; i++) pcm[i] *= scale;
  }
  return pcm;
}

function validatedContactReceipt(receipt) {
  return Boolean(receipt && receipt.eventType === 'action-taser' &&
    receipt.initialSeed !== true && receipt.failed !== true && receipt.duplicate !== true &&
    typeof receipt.causeId === 'string' && receipt.causeId.trim() &&
    receipt.sourceId === receipt.causeId && receipt.targetId &&
    typeof receipt.frameId === 'string' && receipt.frameId.trim() && receipt.visible === true &&
    Number.isFinite(receipt.sourceAgeAtVisibleMs) && receipt.sourceAgeAtVisibleMs >= 0 &&
    receipt.gpuCompletion?.status === 'completed' &&
    Number.isFinite(receipt.gpuCompletion.completedAtMs) &&
    Number.isFinite(receipt.gpuCompletion.visibleAtMs) &&
    receipt.gpuCompletion.visibleAtMs >= receipt.gpuCompletion.completedAtMs);
}

/**
 * Audio-only consumer for the root integration seam. `isCurrentVisibleCompletion`
 * must check the actual current app data, accepted visible canvas/frame identity,
 * matching live action-taser source and target, and completed submission. A false
 * or throwing predicate is silent. This module never changes or gates the VFX.
 */
export function createTaserContactSfxBridge({
  isCurrentVisibleCompletion,
  getAudioState = () => null,
  activateAudioFromGesture = null
} = {}) {
  if (typeof isCurrentVisibleCompletion !== 'function') throw new TypeError('A current visible GPU completion validator is required');
  const played = new Set();
  const playedOrder = [];

  function remember(causeId) {
    if (played.has(causeId)) return false;
    played.add(causeId);
    playedOrder.push(causeId);
    while (playedOrder.length > 2048) played.delete(playedOrder.shift());
    return true;
  }

  function snapshot() {
    let audio = null;
    try { audio = getAudioState?.() || null; } catch (_) { audio = null; }
    const contextState = audio?.context?.state || 'unavailable';
    const masterGain = Number(audio?.master?.gain?.value);
    const ready = Boolean(audio && audio.verify !== true && audio.muted !== true && audio.hidden !== true &&
      audio.unlocked === true && contextState === 'running' && Number.isFinite(masterGain) && masterGain > 0);
    return Object.freeze({ verify: audio?.verify === true, muted: audio?.muted === true,
      hidden: audio?.hidden === true, unlocked: audio?.unlocked === true,
      contextState, masterGain: Number.isFinite(masterGain) ? masterGain : null,
      ready, admittedCauseCount: played.size });
  }

  async function activateFromGesture() {
    if (typeof activateAudioFromGesture !== 'function') return Object.freeze({ ok: false, reason: 'gesture-audio-owner-unavailable', snapshot: snapshot() });
    const before = snapshot();
    if (before.verify || before.muted || before.hidden) return Object.freeze({ ok: false, reason: 'audio-gate-closed', snapshot: before });
    try {
      await activateAudioFromGesture();
      const current = snapshot();
      return Object.freeze({ ok: current.ready, reason: current.ready ? 'audio-running' : 'audio-not-running', snapshot: current });
    } catch (_) {
      return Object.freeze({ ok: false, reason: 'audio-activation-failed', snapshot: snapshot() });
    }
  }

  function accept(receipt, audio = getAudioState?.(), nowMs = globalThis.performance?.now?.()) {
    if (!validatedContactReceipt(receipt)) return { started: false, reason: 'invalid-contact-completion-receipt' };
    let current = false;
    try { current = isCurrentVisibleCompletion(receipt) === true; } catch (_) { current = false; }
    if (!current) return { started: false, reason: 'not-current-visible-gpu-completion' };
    if (!remember(receipt.causeId)) return { started: false, reason: 'duplicate-cause' };

    const completedAt = receipt.gpuCompletion.completedAtMs;
    const visibleAt = receipt.gpuCompletion.visibleAtMs;
    const receiptAge = nowMs - completedAt;
    const contactAgeAtPlayback = receipt.sourceAgeAtVisibleMs + (nowMs - visibleAt);
    if (!Number.isFinite(nowMs) || receiptAge < 0 || nowMs < visibleAt ||
        receiptAge > MAX_RECEIPT_LATENESS_MS || contactAgeAtPlayback < 0 ||
        contactAgeAtPlayback > MAX_RECEIPT_LATENESS_MS) {
      return { started: false, reason: 'late-or-future-completion' };
    }
    const context = audio?.context, master = audio?.master;
    if (audio?.verify === true || audio?.muted === true || audio?.hidden === true ||
        audio?.unlocked !== true || !context || !master || context.state !== 'running' ||
        !(Number(master.gain?.value) > 0) || !Number.isFinite(context.currentTime)) {
      return { started: false, reason: 'audio-gate-closed' };
    }

    let source = null, gain = null;
    try {
      let cache = BUFFER_CACHE.get(context);
      if (!cache) { cache = new Map(); BUFFER_CACHE.set(context, cache); }
      const sampleRate = context.sampleRate;
      let buffer = cache.get(sampleRate);
      if (!buffer) {
        const pcm = renderTaserContactPcm(receipt.causeId, sampleRate);
        buffer = context.createBuffer(1, pcm.length, sampleRate);
        buffer.getChannelData(0).set(pcm);
        cache.set(sampleRate, buffer);
      }
      source = context.createBufferSource();
      gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = VOICE_GAIN;
      source.connect(gain);
      gain.connect(master);
      let ended = false;
      const cleanup = () => {
        if (ended) return;
        ended = true;
        try { source?.disconnect?.(); } catch (_) { /* best-effort audio cleanup */ }
        try { gain?.disconnect?.(); } catch (_) { /* best-effort audio cleanup */ }
      };
      source.onended = cleanup;
      source.start(context.currentTime);
      return { started: true, reason: 'current-contact-gpu-frame', causeId: receipt.causeId,
        durationMs: DURATION_MS, source, gain };
    } catch (_) {
      // Audio is optional. Preserve the already-completed visual by failing silent.
      try { source?.disconnect?.(); } catch (_) { /* best-effort audio cleanup */ }
      try { gain?.disconnect?.(); } catch (_) { /* best-effort audio cleanup */ }
      return { started: false, reason: 'audio-start-failed' };
    }
  }
  return Object.freeze({ accept, snapshot, activateFromGesture, durationMs: DURATION_MS,
    maxReceiptLatenessMs: MAX_RECEIPT_LATENESS_MS });
}

export const TASER_CONTACT_SFX_CONTRACT = Object.freeze({
  durationMs: DURATION_MS,
  maxReceiptLatenessMs: MAX_RECEIPT_LATENESS_MS,
  phases: PHASES,
  snapAttackMs: 1,
  snapDecayMs: 15,
  peak: TARGET_PCM_PEAK,
  noPitchSweep: true,
  noBeep: true
});
