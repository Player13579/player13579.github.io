/** 全値はゲーム表示の設計値。実銃の弾速・温度・実測音圧ではない。 */
export const PROFILES = Object.freeze({
  handgun: Object.freeze({
    index: 0, title: 'HANDGUN', name: '割れた短い噴出・小さな舟形',
    life: 0.205, transit: 0.080, width: 4.4, muzzleLength: 17,
    body: [0.58, 0.19, 0.045], light: [1.0, 0.50, 0.16], peak: 3.4,
    audioDuration: 0.260, audioGain: 0.48, demoInterval: 0.46,
    mechanics: '単発の圧力解放。二葉の短い噴出と先端を閉じた舟形が一回だけ進行する。'
  }),
  smg: Object.freeze({
    index: 1, title: 'SMG', name: '片側の切欠き舌・小型の鉤',
    life: 0.128, transit: 0.058, width: 3.1, muzzleLength: 11,
    body: [0.40, 0.34, 0.065], light: [1.0, 0.84, 0.22], peak: 2.7,
    audioDuration: 0.160, audioGain: 0.30, demoInterval: 0.068,
    mechanics: '一イベント一発。短い非対称噴出が高速連射時にも別々に閉じ、連射自体は権威イベント列だけが作る。'
  }),
  assault: Object.freeze({
    index: 2, title: 'ASSAULT', name: '上下の圧力唇・段付きの鉾先',
    life: 0.240, transit: 0.072, width: 5.0, muzzleLength: 23,
    body: [0.66, 0.23, 0.055], light: [1.0, 0.59, 0.23], peak: 4.2,
    audioDuration: 0.340, audioGain: 0.44, demoInterval: 0.112,
    mechanics: '前方へ絞られる二枚の圧力唇と段付き主形。SMGより厚い解放と長い回復を持つ。'
  }),
  sniper: Object.freeze({
    index: 3, title: 'SNIPER', name: '中央の裂け目・長い菱形圧力殻',
    life: 0.360, transit: 0.055, width: 6.1, muzzleLength: 34,
    body: [0.47, 0.24, 0.12], light: [1.0, 0.70, 0.43], peak: 6.1,
    audioDuration: 0.610, audioGain: 0.54, demoInterval: 1.02,
    mechanics: '狭い先端と広い根元を持つ圧力殻。強い源の短いピークと、低密度の長い解放相を分離する。'
  }),
  taser: Object.freeze({
    index: 4, title: 'TASER', name: '二極の菱形端子・たわむ二本の導体',
    life: 0.440, transit: 0.235, width: 3.8, muzzleLength: 9,
    body: [0.08, 0.29, 0.45], light: [0.27, 0.78, 1.0], peak: 3.5,
    audioDuration: 0.470, audioGain: 0.40, demoInterval: 0.80,
    mechanics: '二極の発射と張力が残る導体。空中の長い放電や、接触成立後の電流を捏造しない。'
  })
});
export const VARIANTS = Object.freeze(Object.keys(PROFILES));
export const LIMITS = Object.freeze({ maxShots: 64, maxPending: 128, maxLedger: 100000,
  maxFutureSeconds: 2, maxOccluders: 32, maxVoices: 24 });
export function profile(variant) {
  if (!Object.hasOwn(PROFILES, variant)) throw new TypeError(`未知のvariant: ${variant}`);
  return PROFILES[variant];
}
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function smoothstep(a, b, x) { const t = clamp((x-a)/(b-a), 0, 1); return t*t*(3-2*t); }
export function envelope(t, attack, hold, end) {
  if (t <= 0 || t >= end) return 0;
  return smoothstep(0, attack, t) * (1-smoothstep(hold, end, t));
}
export function hashId(id) {
  let h = 2166136261;
  for (let i=0;i<id.length;i++) h = Math.imul(h ^ id.charCodeAt(i),16777619);
  return h >>> 0;
}
