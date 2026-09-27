/** Runtime constants shared by sampler, events, audio, preview and tests. */
export const CONTRACT = Object.freeze({
  version: '0.3.0', branch: 'ECodeImplementation', title: 'CORELOAD / 収束・充填・蓄勢',
  defaultDurationMs: 1500, minimumDurationMs: 900, referenceRadius: 82,
  canonicalActorHeight: 64, metersPerCanonicalPixel: 1.7 / 64,
  maxActiveEvents: 8, maxActors: 4, maxVolumes: 48, maxBodyParts: 64, maxSeenEvents: 8192,
  audioReleaseMs: 8, audioMaxPredictionMs: 85, audioMaster: 0.58,
  transport: Object.freeze([
    Object.freeze({ weight: 0.34, begin: 0.00, end: 0.36, start: [-41, 40, -9], endPoint: [-5.5, 41, 3], bend: [0, 5, -2], radii: [9.0, 5.8, 5.6] }),
    Object.freeze({ weight: 0.38, begin: 0.065, end: 0.44, start: [39, 27, 10], endPoint: [5.5, 34, 6], bend: [0, 4, 2], radii: [9.3, 6.0, 5.8] }),
    Object.freeze({ weight: 0.28, begin: 0.13, end: 0.52, start: [-17, 10, 8], endPoint: [0, 26, 5.5], bend: [-3, 0, 0], radii: [8.2, 5.4, 5.2] })
  ]),
  reserve: Object.freeze([
    Object.freeze({ threshold: 0, capacity: 0.34, center: [0, 42, 5.8], radii: [9.8, 7.4, 5.4] }),
    Object.freeze({ threshold: 0.34, capacity: 0.38, center: [0, 32.5, 5.8], radii: [8.8, 7.0, 5.0] }),
    Object.freeze({ threshold: 0.72, capacity: 0.28, center: [0, 24.1, 5.4], radii: [7.1, 5.6, 4.5] })
  ]),
  palette: Object.freeze({ shell: [0.009, 0.053, 0.12], body: [0.025, 0.34, 0.82], core: [0.72, 0.831, 1.0] }),
  holdStarts: 0.74, fadeStarts: 0.89,
  reviewPhases: [0, 0.015, 0.035, 0.08, 0.16, 0.25, 0.34, 0.40, 0.48, 0.56, 0.65, 0.74, 0.83, 0.90, 0.96, 0.99, 1]
});
export const clamp01 = x => Math.max(0, Math.min(1, x));
export const lerp = (a, b, x) => a + (b - a) * x;
export function smoother(x) { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); }
export function smootherDerivative(x) { return x <= 0 || x >= 1 ? 0 : 30 * x * x * (x - 1) * (x - 1); }
export function hash32(text) { let h = 2166136261; for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
