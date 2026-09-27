/** 全値はゲーム表示の設計値。実銃の弾速・温度・実測音圧ではない。 */
export const PROFILES = Object.freeze({
  handgun: Object.freeze({
    index: 0, title: 'HANDGUN', name: '片口の圧力袋・膨らみとくびれが続く輸送殻',
    life: 0.280, transit: 0.274, width: 9.0, muzzleLength: 44,
    body: [0.53, 0.070, 0.032], light: [1.0, 0.43, 0.19], peak: 5.8,
    audioDuration: 0.260, audioGain: 0.48, demoInterval: 0.46,
    mechanics: '単発の圧力解放。片口の圧力袋から、膨らみ・くびれを持つ非一様断面の輸送殻へ連続する。通過済み区間だけに緩和中の境界を残す。'
  }),
  smg: Object.freeze({
    index: 1, title: 'SMG', name: '片側排気の斜め楔・反り返る連続薄層',
    life: 0.180, transit: 0.178, width: 7.4, muzzleLength: 32,
    body: [0.22, 0.36, 0.040], light: [0.80, 1.0, 0.30], peak: 5.0,
    audioDuration: 0.160, audioGain: 0.30, demoInterval: 0.068,
    mechanics: '一イベント一発。片側排気の斜め楔から、反りが反転する薄層を通じて前端へ渡す。速い立上りと局所履歴の緩和を分離し、連射は権威イベント列だけが作る。'
  }),
  assault: Object.freeze({
    index: 2, title: 'ASSAULT', name: '角張る段付き顎・広肩の輸送槍と開いた圧力層',
    life: 0.320, transit: 0.314, width: 10.0, muzzleLength: 62,
    body: [0.43, 0.245, 0.078], light: [1.0, 0.78, 0.36], peak: 6.6,
    audioDuration: 0.340, audioGain: 0.44, demoInterval: 0.112,
    mechanics: '角張る二段の開いた顎から、広い肩と細い前端へつなぐ。圧力層の厚みは段階的に変わり、handgunの丸い単口・SMGの片側排気とは初動から異なる。'
  }),
  sniper: Object.freeze({
    index: 3, title: 'SNIPER', name: '絞り腔・灰青の中空ランスと広がる圧力境界',
    life: 0.500, transit: 0.490, width: 10.6, muzzleLength: 78,
    body: [0.26, 0.32, 0.40], light: [0.72, 0.84, 1.0], peak: 8.0,
    audioDuration: 0.610, audioGain: 0.54, demoInterval: 1.02,
    mechanics: '絞り腔から厚みを持つ灰青の中空ランスへ。狭い発光芯を有色殻の内側に収め、先端の白光だけを主形にしない。通過域の圧力境界が発射から進行まで続く。'
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
