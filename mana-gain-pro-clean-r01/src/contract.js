/** 時間・寸法の正本。WAV、shader、視覚、SFX、テストはここを参照する。 */
export const CONTRACT = Object.freeze({
  name: 'Inward Deposit / 内向きの蓄積',
  version: '1.0.0',
  duration: 1.36,                  // owner-effective seconds; 実時間ではない
  bounds: Object.freeze({ minX: -66, maxX: 66, minY: -127, maxY: 13 }),
  recipient: Object.freeze({ x: 0, y: -65, radiusX: 20, radiusY: 26 }),
  source: Object.freeze({ x: 0, y: -8 }),
  nominalCharacterWorldHeight: 128,
  h64CharacterScale: 0.5,          // キャラ128wu=64px。ゲーム未提示の変換なので設計仮定
  h64EnvelopeScale: 64 / 140,      // より厳しい、E全高140wu=64pxもプレビューする
  sampleRate: 48000,
  maxActive: 64,
  maxLedger: 100000,
  soundVolume: 0.24,
  phase: Object.freeze({ launch: 0.13, arrival: 0.49, filled: 0.73, settle: 0.83 }),
  excludes: Object.freeze(['desire-recovery', 'renki', 'renki-tenfold'])
});
export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export function smooth(a, b, x) { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); }
/** 待機・予約・OFF・効果未適用を active と取り違えない。 */
export function ownerRate(acc2) {
  return acc2?.state === 'active' && acc2?.movementEffective === true ? 2 : 1;
}
export function normalizedPhase(seconds) { return clamp(seconds / CONTRACT.duration); }
/** shader sampleFieldの量的対応を検査するCPU参照。ゲームのmana値ではない。 */
export function phaseState(phase) {
  const p = clamp(phase);
  const released = smooth(.13, .51, p), received = smooth(.45, .73, p);
  return { source: 1-released, inTransit: Math.max(0,released-received), received,
    displayed: 1-smooth(.83,1,p) };
}
