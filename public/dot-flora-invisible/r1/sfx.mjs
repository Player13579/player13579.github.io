// Flora Invisible r1: fictional phase-fold cause, synthesized air response.
// Data construction only; playback ownership and same-cause GPU gating live outside.
export function synthesize(sampleRate = 48000) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new RangeError('sampleRate must be an integer from 8000 to 192000');
  }
  const length = Math.ceil(sampleRate * 1.6);
  const mono = new Float32Array(length);
  const weights = new Float64Array(length);
  let seed = 0x46f10a31;
  const noise = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 2147483648 - 1;
  };
  const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const pulse = (t, start, peak, end) => t <= start || t >= end ? 0
    : t < peak ? smooth((t - start) / (peak - start))
    : 1 - smooth((t - peak) / (end - peak));
  const coefficient = hz => 1 - Math.exp(-2 * Math.PI * hz / sampleRate);
  const aLow = coefficient(115), aBody = coefficient(410);
  const aEdge = coefficient(2400), aFloor = coefficient(700);
  let low = 0, body = 0, edge = 0, floor = 0;
  let sum = 0, weightSum = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const n = noise();
    low += aLow * (n - low); body += aBody * (n - body);
    edge += aEdge * (n - edge); floor += aFloor * (n - floor);
    // Broad pressure onset; two staggered boundary contacts converge in mono.
    const onset = pulse(t, 0, 0.085, 0.32);
    const left = pulse(t, 0.12, 0.37, 1.04);
    const right = pulse(t, 0.18, 0.48, 1.10);
    const seam = pulse(t, 0.80, 1.035, 1.39);
    const decay = pulse(t, 1.04, 1.12, 1.56);
    const envelope = smooth(t / 0.012) * (1 - smooth((t - 1.49) / 0.11));
    const rubbing = edge - floor;
    const grain = 0.77 + 0.14 * Math.sin(t * 29) + 0.09 * Math.sin(t * 47 + 0.7);
    const value = envelope * (
      3.4 * low * onset + 1.35 * (body - low) * (left + right) * grain
      + 0.64 * rubbing * (0.83 * left + right + 0.65 * seam)
      + 1.8 * (body - low) * seam + 0.38 * rubbing * decay);
    mono[i] = value; weights[i] = envelope;
    sum += mono[i]; weightSum += envelope;
  }
  // Remove DC through the same smooth support, preserving silent endpoints.
  const dc = sum / weightSum;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    mono[i] -= dc * weights[i]; peak = Math.max(peak, Math.abs(mono[i]));
  }
  const gain = peak > 0 ? 0.72 / peak : 1;
  for (let i = 0; i < length; i++) mono[i] *= gain;
  mono[0] = 0; mono[length - 1] = 0;
  return { sampleRate, channels: [mono], durationMs: 1600, synthetic: true };
}

export function makeBuffer(context) {
  const data = synthesize(context.sampleRate);
  const buffer = context.createBuffer(1, data.channels[0].length, data.sampleRate);
  buffer.getChannelData(0).set(data.channels[0]);
  return buffer;
}
