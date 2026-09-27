/** 全値はゲーム表示の設計値。実銃の弾速・温度・実測音圧ではない。 */
export const PROFILES = Object.freeze({
  handgun: Object.freeze({
    index: 0, title: 'HANDGUN', name: '二葉の圧力袋・腹を持つ裂けた輸送殻',
    life: 0.280, transit: 0.274, width: 9.0, muzzleLength: 44,
    body: [0.55, 0.115, 0.024], light: [1.0, 0.52, 0.19], peak: 5.8,
    audioDuration: 0.260, audioGain: 0.48, demoInterval: 0.46,
    mechanics: '単発の圧力解放。二葉の源と腹を持つ輸送殻、直後の開いた圧力縁を一つの発射履歴として描く。'
  }),
  smg: Object.freeze({
    index: 1, title: 'SMG', name: '片側排気の斜め楔・切り返す短い扁平殻',
    life: 0.180, transit: 0.178, width: 7.4, muzzleLength: 32,
    body: [0.34, 0.26, 0.026], light: [1.0, 0.86, 0.29], peak: 5.0,
    audioDuration: 0.160, audioGain: 0.30, demoInterval: 0.068,
    mechanics: '一イベント一発。片側排気の扁平な楔が高速連射時にも別々に閉じ、連射自体は権威イベント列だけが作る。'
  }),
  assault: Object.freeze({
    index: 2, title: 'ASSAULT', name: '開いた圧縮顎・段付き肩の長い輸送槍',
    life: 0.320, transit: 0.314, width: 10.0, muzzleLength: 62,
    body: [0.42, 0.16, 0.052], light: [1.0, 0.71, 0.35], peak: 6.6,
    audioDuration: 0.340, audioGain: 0.44, demoInterval: 0.112,
    mechanics: '開いた圧縮顎から、広い段付き肩と細い前端を持つ主形へ力を渡す。SMGより厚い解放と長い回復を持つ。'
  }),
  sniper: Object.freeze({
    index: 3, title: 'SNIPER', name: '絞られた発射腔・中空の長いランスと圧力縁',
    life: 0.500, transit: 0.490, width: 10.6, muzzleLength: 78,
    body: [0.21, 0.25, 0.31], light: [0.72, 0.84, 1.0], peak: 8.0,
    audioDuration: 0.610, audioGain: 0.54, demoInterval: 1.02,
    mechanics: '絞り腔と中空の長いランス。後方の圧力縁を狭い芯と分離し、長い射線の進行を残す。強い源の短いピークと、低密度の長い解放相を分離する。'
  }),
  taser: Object.freeze({
    index: 4, title: 'TASER', name: '二極の発射座・厚い端子頭と弛みを解く二導体',
    life: 0.600, transit: 0.590, width: 7.8, muzzleLength: 24,
    body: [0.024, 0.25, 0.34], light: [0.25, 0.87, 1.0], peak: 4.8,
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
