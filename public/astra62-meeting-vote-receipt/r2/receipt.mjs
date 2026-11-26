// receipt.mjs
export const version = 'meeting-vote-receipt-astra62-r2';
export const lifetimeMs = 920;

// One watermark per local stream. A rejection never consumes a serial.
export function createAcknowledgements() {
  let lastSerial = 0;
  return event => {
    if (event === null || typeof event !== 'object') return false;
    try {
      if (Array.isArray(event)) return false;
      if (!Object.hasOwn(event, 'accepted') || event.accepted !== true) return false;
      if (!Object.hasOwn(event, 'own') || event.own !== true) return false;
      if (!Object.hasOwn(event, 'serial')) return false;
      const serial = event.serial;
      if (!Number.isSafeInteger(serial) || serial <= lastSerial) return false;
      lastSerial = serial;
      return true;
    } catch {
      return false;
    }
  };
}

const tau = 2 * Math.PI;
function ramp(start, end, t) {
  const u = Math.max(0, Math.min(1, (t - start) / (end - start)));
  return u * u * (3 - 2 * u);
}

// Mono PCM only; playback belongs to the bridge, after a successful gate.
export function makeReceiptPcm(sampleRate = 48000) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new RangeError('sample rate');
  }
  const pcm = new Float32Array(Math.ceil(sampleRate * 0.760));
  const pole = hz => -Math.expm1(-tau * hz / sampleRate);
  const kHigh = pole(3200), kMid = pole(790), kLow = pole(185);
  const noiseGain = Math.sqrt(sampleRate / 48000);
  let seed = 0x62a512, high = 0, mid = 0, low = 0;
  for (let n = 0; n < pcm.length; n++) {
    const t = n / sampleRate;
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const white = seed / 2147483648 - 1;
    high += kHigh * (white - high);
    mid += kMid * (white - mid);
    low += kLow * (white - low);
    const fibre = (high - mid) * noiseGain;
    const drag = (mid - low) * noiseGain;

    // A light flex on approach, then intermittent friction against the feed shoe.
    const flex = ramp(0.035, 0.115, t) * (1 - ramp(0.115, 0.208, t));
    const travel = ramp(0.210, 0.575, t);
    const load = ramp(0.210, 0.284, t) * (1 - ramp(0.475, 0.575, t));
    const grip = 0.75 + 0.25 * Math.cos(tau * (4.4 * travel + 0.09 * Math.sin(13 * travel)));
    let sample = fibre * (0.32 * flex + 0.49 * grip * load) + drag * 0.48 * load;

    // Detent release: a short noisy contact followed by the damped housing response.
    const d = t - 0.575;
    if (d >= 0) {
      const hit = (1 - Math.exp(-d / 0.00085)) * Math.exp(-d / 0.010);
      sample += hit * (0.38 * fibre + 0.095 * Math.sin(tau * 1140 * d));
      const h = Math.max(0, d - 0.004);
      sample += (1 - Math.exp(-h / 0.002)) * (0.18 * Math.exp(-h / 0.028) * Math.sin(tau * 217 * h)
                + 0.075 * Math.exp(-h / 0.016) * Math.sin(tau * 496 * h));
    }
    pcm[n] = sample * (1 - ramp(0.725, 0.758, t));
  }
  return pcm;
}
