/** 全層・SFX が共有するゲーム時計。1秒=1000ms、速度係数やフレーム加算なし。 */
export const DURATION_MS = 1200;
export const SFX_CUE_MS = 252;
export const SFX_LATE_WINDOW_MS = 80;
export const DEMO_GAP_MS = 900;
export const DEMO_CYCLE_MS = DURATION_MS + DEMO_GAP_MS;

export function clamp01(x) { return Math.max(0, Math.min(1, x)); }
export function smooth(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/**
 * 五相: 開口→差込み→短い滞在→引抜き→消退。
 * 明るさはタスク達成量ではない。滞在に終点マークを付けず、進捗を積算しない。
 * reducedMotion は軌道量のみを減らし、寿命・一度性・因果順序は変えない。
 */
export function sampleTimeline(ageMs, reducedMotion = false) {
  if (!Number.isFinite(ageMs)) throw new TypeError('ageMs は有限値が必要です');
  const t = clamp01(ageMs / DURATION_MS);
  const alive = ageMs >= 0 && ageMs < DURATION_MS;
  const appear = smooth(0, 0.11, t);
  const fade = 1 - smooth(0.82, 1, t);
  const open = smooth(0.00, 0.15, t) * (1 - smooth(0.79, 0.96, t));
  const insert = smooth(0.08, 0.27, t);
  const release = smooth(0.62, 0.89, t);
  const settled = insert * (1 - release);
  const contactLobe = smooth(0.11, 0.21, t) * (1 - smooth(0.25, 0.40, t));
  const luminance = 0.50 + 0.46 * contactLobe + 0.10 * settled;
  const detail = smooth(0.17, 0.33, t) * (1 - smooth(0.64, 0.79, t));
  const sheet = smooth(0.06, 0.17, t) * (1 - smooth(0.76, 0.96, t));
  let phase = '開口';
  if (ageMs >= 180) phase = '差込み';
  if (ageMs >= 324) phase = '滞在';
  if (ageMs >= 744) phase = '引抜き';
  if (ageMs >= 1008) phase = '消退';
  if (!alive) phase = '無表示';
  return Object.freeze({
    ageMs, t, alive, phase,
    opacity: alive ? appear * fade : 0,
    open, insert, release, settled, contactLobe, luminance, detail, sheet,
    motionScale: reducedMotion ? 0.16 : 1,
  });
}

/** 音は現在のゲーム時刻で判定。停止中に AudioContext 側だけ未来予約しない。 */
export function soundDue(ageMs) {
  return ageMs >= SFX_CUE_MS && ageMs <= SFX_CUE_MS + SFX_LATE_WINDOW_MS;
}
