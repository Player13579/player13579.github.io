/** 本作固有の選択済み造形・光・音。旧E/BODY/Canvasの定数は参照していない。 */
export const DESIGN = Object.freeze({
  handgun: Object.freeze({index: 0, name: '対向する二枚の巻き襞', peakMs: 174, relaxMs: 640, toneHz: 620, toneEndHz: 455, soundMs: 188, overtone: 2.04}),
  smg: Object.freeze({index: 1, name: '三段の斜行プリーツ', peakMs: 150, relaxMs: 600, toneHz: 745, toneEndHz: 610, soundMs: 162, overtone: 2.72}),
  assault: Object.freeze({index: 2, name: '広い折板の噛み合わせ', peakMs: 204, relaxMs: 720, toneHz: 440, toneEndHz: 350, soundMs: 224, overtone: 1.98}),
  sniper: Object.freeze({index: 3, name: '細長い二葉のレンズ状開口', peakMs: 232, relaxMs: 790, toneHz: 850, toneEndHz: 690, soundMs: 282, overtone: 3.02}),
  taser: Object.freeze({index: 4, name: '間隙を残す双曲の折返し', peakMs: 188, relaxMs: 690, toneHz: 560, toneEndHz: 710, soundMs: 238, overtone: 2.38})
});
export const clamp01 = x => Math.min(1, Math.max(0, x));
export function smooth(a, b, x) { const t = clamp01((x-a)/(b-a)); return t*t*(3-2*t); }
/** 受信後時間。単峰の入力と遅い媒体緩和を別変数に保つ。 */
export function sampleDynamics(variant, ageMs, reducedMotion = false) {
  const d = DESIGN[variant];
  if (!d) throw new RangeError('invalid_variant');
  if (!Number.isFinite(ageMs)) throw new RangeError('invalid_age');
  if (ageMs < 0 || ageMs >= 1200) return {source: 0, medium: 0, shape: 1, lens: 0, alive: false};
  const end = 1-smooth(850, 1200, ageMs);
  const attack = smooth(0, d.peakMs, ageMs);
  const decay = Math.exp(-Math.max(0, ageMs-d.peakMs)/200);
  const source = attack*decay*end;
  // 畳み込まれた応答の設計近似。source と密度・不透明度を同値にしない。
  const medium = smooth(12, d.peakMs+100, ageMs)*Math.exp(-Math.max(0,ageMs-d.peakMs-100)/(d.relaxMs*0.72))*end;
  const shape = reducedMotion ? 1 : 0.86 + 0.14*smooth(0,d.peakMs+70,ageMs);
  const lens = smooth(0.55,0.95,source)*0.045*(reducedMotion ? 0.65 : 1);
  return {source, medium, shape, lens, alive: true};
}
/** 形の源に沿う最強発光点。レンズゴーストはこの一点に束縛する。 */
export function sourceLocal(variant) {
  switch (variant) {
    case 'handgun': return [-0.32, -0.62];
    case 'smg': return [-0.30, -0.60];
    case 'assault': return [-0.82, -0.12];
    case 'sniper': return [-0.27875, -0.449375];
    case 'taser': return [-0.23, -0.70];
    default: throw new RangeError('invalid_variant');
  }
}
/** レンズ軸上の弱い内面反射。世界内受け手やrayを生成しない。 */
export function lensGeometry(sourcePx, viewport) {
  const c = [viewport.width*0.5, viewport.height*0.5];
  const d = [sourcePx[0]-c[0],sourcePx[1]-c[1]];
  return {source: [...sourcePx], center: c,
    ghost1: [c[0]-d[0]*0.12,c[1]-d[1]*0.12],
    ghost2: [c[0]-d[0]*0.27,c[1]-d[1]*0.27],
    axisOffset: Math.hypot(d[0]/viewport.width,d[1]/viewport.height)};
}
