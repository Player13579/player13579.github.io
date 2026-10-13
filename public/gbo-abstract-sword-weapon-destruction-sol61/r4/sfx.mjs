// Deterministic finite synthetic fracture; no samples, oscillators, or runtime randomness.
export function createFractureBuffer(context, cause = 1) {
  const sampleRate = context.sampleRate;
  const length = Math.ceil(sampleRate * 0.7);
  const buffer = context.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let seed = (cause * 2654435761) >>> 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    seed = (1664525 * seed + 1013904223) >>> 0;
    const noise = t >= 0.42 ? ((seed / 0x80000000) - 1) * Math.exp(-(t - 0.42) / 0.018) : 0;
    const dt = t - 0.42;
    const fracture = dt >= 0
      ? 0.17 * Math.sin(2 * Math.PI * 1760 * dt) * Math.exp(-dt / 0.045)
        + 0.10 * Math.sin(2 * Math.PI * 2630 * dt) * Math.exp(-dt / 0.026)
        + 0.055 * Math.sin(2 * Math.PI * 4010 * dt) * Math.exp(-dt / 0.017)
      : 0;
    const ct = t - 0.44;
    const clack = ct >= 0
      ? 0.11 * Math.sin(2 * Math.PI * 220 * ct) * Math.exp(-ct / 0.035)
        + 0.06 * Math.sin(2 * Math.PI * 570 * ct) * Math.exp(-ct / 0.035)
      : 0;
    data[i] = Math.max(-0.8, Math.min(0.8, noise + fracture + clack));
  }
  return buffer;
}

export function startFractureVoice(context, cause = 1, age = 0) {
  if (!Number.isFinite(age) || age < 0 || age >= 0.7) return { expired: true, source: null, gain: null };
  const source = context.createBufferSource();
  source.buffer = createFractureBuffer(context, cause);
  const gain = context.createGain();
  gain.gain.value = 0.32;
  source.connect(gain);
  gain.connect(context.destination);
  source.start(context.currentTime, age);
  return { source, gain, expired: false };
}
