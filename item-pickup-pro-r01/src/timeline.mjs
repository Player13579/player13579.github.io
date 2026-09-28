/** 表示専用時計。receipt.durationMsの代入・変更はしない。 */
export const PRESENTATION_MS = 1800;
export const RADIUS_WORLD = 84;
export const AUDIO_FRESH_MS = 120;
export const AUDIO_SUBMIT_WINDOW_MS = 64;
export const MAX_ACTIVE = 32;
export const MAX_LEDGER = 65536;
export const MAX_VOICES = 8;

export function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
/** WGSLのphaseと同じ関数。全て絶対ageから求め、フレームの積算ノイズを使わない。 */
export function phase(ageMs, reducedMotion = false) {
  if (!Number.isFinite(ageMs) || ageMs <= 0 || ageMs >= PRESENTATION_MS) {
    return { body: 0, emission: 0, seam: 0, closure: reducedMotion ? 1 : 0, light: 0 };
  }
  const body = smooth(0, 90, ageMs) * (1 - smooth(900, 1800, ageMs));
  const emission = smooth(0, 210, ageMs) * (1 - smooth(420, 1560, ageMs));
  const seam = smooth(180, 360, ageMs) * (1 - smooth(620, 1200, ageMs));
  const closure = reducedMotion ? 1 : smooth(60, 420, ageMs);
  return { body, emission, seam, closure, light: emission };
}

export function idKey(id) {
  return typeof id === 'string' ? `s:${id}` : `n:${id}`;
}
export function validId(id) {
  return (typeof id === 'string' && id.length > 0 && id.length <= 256 && id.trim() === id) ||
    (typeof id === 'number' && Number.isSafeInteger(id) && id >= 0);
}
export const RECEIPT_KEYS = Object.freeze([
  'type', 'id', 'source', 'playerId', 'x', 'y', 'radius', 'variant', 'durationMs', 'at'
]);
export function validateReceipt(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return 'receipt_not_object';
  const keys = Object.keys(r);
  if (keys.length !== RECEIPT_KEYS.length || keys.some(k => !RECEIPT_KEYS.includes(k)) ||
      RECEIPT_KEYS.some(k => !Object.hasOwn(r, k))) return 'receipt_key_set';
  if (r.type !== 'action-item-pickup' || r.source !== 'player' ||
      r.radius !== RADIUS_WORLD || r.variant !== 'asset' || r.durationMs !== 0) return 'receipt_constants';
  if (!validId(r.id) || !validId(r.playerId) || idKey(r.id) === idKey(r.playerId)) return 'receipt_independent_id';
  if (!Number.isSafeInteger(r.x) || !Number.isSafeInteger(r.y)) return 'receipt_rounded_position';
  if (!Number.isSafeInteger(r.at) || r.at < 0) return 'receipt_timestamp';
  return null;
}
