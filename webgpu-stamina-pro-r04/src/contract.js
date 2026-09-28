/** Runtime constants shared by sampler, events, audio, preview and tests. */
export const CONTRACT = Object.freeze({
  version: '0.4.0', branch: 'ECodeImplementation', title: 'CONFLUENCE / 連結供給・充填・定着',
  defaultDurationMs: 1500, minimumDurationMs: 900, referenceRadius: 82,
  canonicalActorHeight: 64, metersPerCanonicalPixel: 1.7 / 64,
  maxActiveEvents: 8, maxActors: 4, maxVolumes: 48, maxBodyParts: 64, maxSeenEvents: 8192,
  audioReleaseMs: 8, audioMaxPredictionMs: 85, audioMaster: 0.56,
  /** Shared Q(t) is distributed across three inlets but read as one supply structure. */
  transport: Object.freeze([
    Object.freeze({ weight: 0.34, begin: 0.02, end: 0.42, start: [-20.0, 39.0, 4.6], target: [-5.9, 36.7, 5.6], bend: [0.0, 2.4, 1.1], thickness: 5.8, depth: 5.4 }),
    Object.freeze({ weight: 0.34, begin: 0.05, end: 0.45, start: [20.0, 36.0, 4.6], target: [5.9, 34.2, 5.6], bend: [0.0, 2.2, 1.1], thickness: 5.8, depth: 5.4 }),
    Object.freeze({ weight: 0.32, begin: 0.10, end: 0.54, start: [0.0, 21.2, 4.9], target: [0.0, 25.3, 5.8], bend: [0.0, 1.6, 0.6], thickness: 6.4, depth: 5.8 })
  ]),
  /** One visible outer reservoir, realized as connected overlapping analytic solids. */
  scaffold: Object.freeze([
    Object.freeze({ center: [-18.6, 37.8, 4.0], radii: [11.8, 13.7, 6.5], weight: 0.23, drift: [2.2, -1.0, 0.5] }),
    Object.freeze({ center: [18.6, 37.0, 4.0], radii: [11.8, 13.4, 6.5], weight: 0.23, drift: [-2.2, -1.0, 0.5] }),
    Object.freeze({ center: [0.0, 22.3, 4.4], radii: [17.8, 8.8, 6.1], weight: 0.22, drift: [0.0, 0.8, 0.5] }),
    Object.freeze({ center: [0.0, 46.2, 2.9], radii: [8.2, 6.2, 4.5], weight: 0.10, drift: [0.0, -0.8, 0.2] }),
    Object.freeze({ center: [0.0, 31.2, 1.9], radii: [22.0, 6.2, 4.2], weight: 0.22, drift: [0.0, 0.0, -0.3] })
  ]),
  reserve: Object.freeze([
    Object.freeze({ threshold: 0.00, capacity: 0.34, center: [0.0, 36.0, 5.7], radii: [10.5, 7.4, 5.8] }),
    Object.freeze({ threshold: 0.26, capacity: 0.36, center: [0.0, 28.3, 5.9], radii: [9.7, 7.0, 5.6] }),
    Object.freeze({ threshold: 0.60, capacity: 0.40, center: [0.0, 20.6, 5.6], radii: [8.9, 6.2, 5.2] })
  ]),
  reserveCore: Object.freeze({ center: [0.0, 28.2, 5.0], radii: [6.4, 17.0, 4.8] }),
  palette: Object.freeze({ shell: [0.010, 0.075, 0.16], body: [0.090, 0.49, 0.98], core: [0.84, 0.95, 1.00] }),
  holdStarts: 0.76, fadeStarts: 0.90,
  reviewPhases: [0, 0.015, 0.04, 0.08, 0.14, 0.22, 0.32, 0.42, 0.54, 0.64, 0.74, 0.82, 0.90, 0.96, 0.99, 1]
});
export const clamp01 = x => Math.max(0, Math.min(1, x));
export const lerp = (a, b, x) => a + (b - a) * x;
export function smoother(x) { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); }
export function smootherDerivative(x) { return x <= 0 || x >= 1 ? 0 : 30 * x * x * (x - 1) * (x - 1); }
export function hash32(text) { let h = 2166136261; for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
