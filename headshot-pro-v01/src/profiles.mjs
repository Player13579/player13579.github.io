/** 新規の接触設計。速度・寸法・音程は演出値であり武器威力や実測物性ではない。 */
export const EVENT_TYPE = 'action-gunner-headshot';
export const WEAPONS = Object.freeze(['handgun', 'smg', 'assault', 'sniper', 'taser']);
export const VARIANTS = Object.freeze(WEAPONS.flatMap(w => [`hip:${w}`, `aim:${w}`]));
export const LIMITS = Object.freeze({
  radius: 150, maxActive: 16, maxSeen: 4096, maxPending: 64,
  arrivalTTLms: 420, futureToleranceMs: 8, wallLifetimeMs: 2000,
  audioOnsetLimitMs: 85, maxVoices: 8, maskSize: 128,
  maxCoordinate: 1e9, maxRate: 4,
});
export const OBSERVATION_BUDGET = Object.freeze({
  bloom: 0.13, nearLight: 0.30, maxAddedLuminance: 1.5,
  sourceThreshold: 0.52, maxBloomRadiusNativePx: 1.6,
  voiceGain: 0.20, masterGain: 0.72,
});
const DATA = {
  handgun: {durationMs: 245, length: 0.66, width: 0.185, spread: 0.070, decay: 4.6, frequency: 1680, soundMs: 126, damping: 28, weight: 0.54},
  smg:     {durationMs: 180, length: 0.56, width: 0.155, spread: 0.045, decay: 6.3, frequency: 2180, soundMs: 88,  damping: 43, weight: 0.36},
  assault: {durationMs: 275, length: 0.73, width: 0.220, spread: 0.095, decay: 4.1, frequency: 1450, soundMs: 146, damping: 25, weight: 0.67},
  sniper:  {durationMs: 370, length: 0.87, width: 0.158, spread: 0.045, decay: 3.7, frequency: 1130, soundMs: 190, damping: 20, weight: 0.77},
  taser:   {durationMs: 310, length: 0.60, width: 0.215, spread: 0.030, decay: 3.8, frequency: 1890, soundMs: 171, damping: 24, weight: 0.41},
};
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }
export function profileFor(variant) {
  if (!VARIANTS.includes(variant)) throw new TypeError(`未対応variant: ${String(variant)}`);
  const [mode, weapon] = variant.split(':'); const aim = mode === 'aim'; const d = DATA[weapon];
  return Object.freeze({ ...d, variant, weapon, weaponIndex: WEAPONS.indexOf(weapon), aim,
    durationMs: d.durationMs + (aim ? 18 : 0),
    width: d.width * (aim ? 0.88 : 1.10),
    spread: d.spread * (aim ? 0.48 : 1),
    skew: aim ? 0.035 : 0.135,
    frequency: d.frequency * (aim ? 1.075 : 0.97),
  });
}
/** LDMの単一正本。u=0/1で0、主形より長く光だけを残さない。 */
export function sampleProfile(profile, ageMs, reducedMotion = false) {
  const u = ageMs / profile.durationMs;
  if (!Number.isFinite(u) || u <= 0 || u >= 1) return {u: clamp(Number.isFinite(u) ? u : 1), body: 0, emission: 0, release: 0, width: profile.width, length: profile.length};
  const attack = smoothstep(0, 0.052, u);
  const body = attack * (1 - smoothstep(0.48, 1, u));
  // 充填された片面から接触口へ収束する一回の包絡。周期点滅はない。
  const emission = 3.0 * attack * Math.exp(-profile.decay * u) * (1 - smoothstep(0.68, 0.96, u));
  const release = reducedMotion ? 0.28 : smoothstep(0.05, 0.40, u) * (1 - 0.25 * smoothstep(0.4, 1, u));
  return {u, body, emission: emission * (reducedMotion ? 0.78 : 1), release,
    width: profile.width * (reducedMotion ? 1 : 0.91 + 0.13 * release),
    length: profile.length * (reducedMotion ? 1 : 0.83 + 0.17 * smoothstep(0, 0.22, u)),
  };
}
