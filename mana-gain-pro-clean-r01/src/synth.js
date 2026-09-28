import { CONTRACT, smooth, clamp } from './contract.js';
/** 外部録音なし。単発の発生→吸入→受領和音→収束。決定的合成。 */
export function synthesize(sampleRate = CONTRACT.sampleRate) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000) throw new RangeError('sampleRate');
  const n = Math.round(CONTRACT.duration * sampleRate), L = new Float32Array(n), R = new Float32Array(n);
  let glissPhase = 0;
  const start = CONTRACT.phase.arrival * CONTRACT.duration;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate, p = t / CONTRACT.duration;
    const attack = smooth(0, .006, t), ending = 1 - smooth(.88, 1, p);
    const tap = Math.exp(-t * 34) * (Math.sin(2 * Math.PI * 426 * t) + .32 * Math.sin(2 * Math.PI * 1278 * t));
    const travel = smooth(.09, .19, p) * (1 - smooth(.45, .54, p));
    const f = 290 + 420 * smooth(.1, .52, p);
    glissPhase += 2 * Math.PI * f / sampleRate;
    const inhale = travel * (.20 * Math.sin(glissPhase) + .065 * Math.sin(glissPhase * 2 + .6));
    const dt = Math.max(0, t - start);
    const receipt = smooth(start, start + .010, t) * Math.exp(-dt * 5.3);
    // 固有の短いE6付加和音。恒常ループ、警告音、引用旋律を使わない。
    const tones = [329.6276, 493.8833, 659.2551, 830.6094];
    let chimeL = 0, chimeR = 0;
    for (let k = 0; k < tones.length; k++) {
      const w = [1, .62, .41, .23][k];
      chimeL += w * Math.sin(2 * Math.PI * tones[k] * dt) * Math.exp(-dt * k * .9);
      chimeR += w * Math.sin(2 * Math.PI * tones[k] * dt + .015 * k) * Math.exp(-dt * k * .9);
    }
    const seated = smooth(.56, .60, p) * Math.exp(-Math.max(0, p - .60) * 13) * Math.sin(2 * Math.PI * 164.8138 * t) * .10;
    const fade = attack * ending;
    L[i] = fade * (.21 * tap + inhale + receipt * .19 * chimeL + seated);
    R[i] = fade * (.21 * tap + inhale + receipt * .19 * chimeR + seated);
  }
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  // オフライン原音peak -6.02 dBFS。実行時はさらにCONTRACT.soundVolumeで下げる。
  const gain = peak ? .5 / peak : 0;
  for (let i = 0; i < n; i++) { L[i] *= gain; R[i] *= gain; }
  return { sampleRate, channels: [L, R], duration: n / sampleRate };
}
export function encodeWav({ sampleRate, channels }) {
  const [L, R] = channels, n = L.length, bytes = new ArrayBuffer(44 + n * 4), v = new DataView(bytes);
  const s = (p, x) => { for (let i = 0; i < x.length; i++) v.setUint8(p + i, x.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); s(8, 'WAVE'); s(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 4, true);
  v.setUint16(32, 4, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.round(clamp(L[i], -1, 1) * 32767), true); v.setInt16(46 + i * 4, Math.round(clamp(R[i], -1, 1) * 32767), true); }
  return new Uint8Array(bytes);
}
