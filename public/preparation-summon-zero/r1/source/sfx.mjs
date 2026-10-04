export const SFX_DURATION_MS = 263;
export const SFX_ID = 'preparation-summon-zero-sol61-r1-onset';
export function synthesizeCue(sampleRate = 48000) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
    throw new TypeError('A supported integer sample rate is required');
  const length = Math.ceil(sampleRate * SFX_DURATION_MS / 1000);
  const data = new Float32Array(length);
  let seed = 0x59f17a1, previous = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate, q = i / (length - 1);
    const env = Math.sin(Math.PI * q) ** 1.8;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    const air = noise - previous; previous = noise;
    // Warm arrival foundation with a finite airy rising harmonic, no click/beep.
    const fundamental = Math.sin(2 * Math.PI * (165 * t + 32 * t * t));
    const overtone = Math.sin(2 * Math.PI * (495 * t + 420 * t * t));
    const upper = Math.sin(2 * Math.PI * (825 * t + 190 * t * t));
    data[i] = env * (0.12 * fundamental + 0.052 * overtone + 0.022 * upper +
      0.013 * air * (1 - q));
  }
  data[0] = 0; data[length - 1] = 0;
  return data;
}
