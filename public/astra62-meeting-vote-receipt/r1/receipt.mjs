export const version = 'meeting-vote-receipt-astra62-r1';
export const lifetimeMs = 830;

// This adapter accepts a synthetic, local acknowledgement only. A vote target is never needed.
export function createAcknowledgements() {
  let lastSerial = 0;
  return ({accepted, own, serial} = {}) => {
    if (accepted !== true || own !== true || !Number.isSafeInteger(serial) || serial <= lastSerial) return false;
    lastSerial = serial;
    return true;
  };
}

export function makeReceiptPcm(sampleRate = 48000) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('sample rate');
  const pcm = new Float32Array(Math.ceil(sampleRate * 0.72));
  let seed = 0x56b17, previous = 0, low = 0;
  for (let n = 0; n < pcm.length; n++) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    const t = n / sampleRate;
    const slide = Math.max(0, Math.min(1, (t - 0.24) / 0.265));
    const motion = Math.sin(Math.PI * slide) ** 2;
    low += (1 - Math.exp(-2 * Math.PI * 2900 / sampleRate)) * (noise - low);
    const rustle = (low - previous) * 0.45 * motion;
    previous += (1 - Math.exp(-2 * Math.PI * 520 / sampleRate)) * (low - previous);
    const d = t - 0.535;
    const tap = d <= 0 ? 0 : (1 - Math.exp(-d / 0.0018)) * Math.exp(-d / 0.021)
      * (0.105 * Math.sin(2 * Math.PI * 524 * d) + 0.058 * Math.sin(2 * Math.PI * 889 * d) + 0.054 * low);
    const tail = Math.min(1,(pcm.length - 1 - n) / (0.01 * sampleRate));
    pcm[n] = (rustle * 0.48 + tap) * tail;
  }
  return pcm;
}
