/** 通常の確定した正の離散獲得専用。ゲーム状態を読み出すだけで書き換えない。 */
export const EFFECT_DURATION_SECONDS = 1.6; // 唯一の実行時duration正本。phaseはすべてこの時計の正規化値。
export const MAX_ACTIVE_EVENTS = 64;
export const MAX_SESSION_IDS = 100_000; // 上限時はfail-closed。生存中の重複排除記録を追い出さない。
export const BOUNDS = Object.freeze({minX: -66, maxX: 66, minY: -127, maxY: 13});
export const H64_WORLD_TO_CSS = 0.5; // 設計仮定：キャラクター基準高128 world units → 64 CSS px。
/** r0.2: 位相は視覚・SFX・検査が共有する。durationを増設しない。 */
export const PHASE = Object.freeze({
  sourceStart: 0.00, sourceDrainStart: 0.08, sourceDrainEnd: 0.62,
  travelStart: 0.02, travelEnd: 0.30, receiveStart: 0.30, receiveEnd: 0.76,
  tailStart: 0.62, tailEnd: 0.76, settleStart: 0.84, fadeStart: 0.90, end: 1.00,
});
/** 数値はゲームの実測ではなく、指定された包絡内の表示設計値 (world units)。 */
export const GEOMETRY = Object.freeze({
  sourceX: 0, sourceY: -5, sourceRadiusX: 43, sourceRadiusY: 13,
  routeStartX: -24, routeStartY: -6, routeEndX: -13, routeEndY: -55,
  routeBend: -22, routeRadius: 11.5, routeSwell: 2.5, routeSegments: 16,
  receiverX: 0, receiverY: -61, receiveBottom: 18,
  receiveHalfWidthMin: 22, receiveHalfWidthMax: 34,
  receiveHeightMin: 8, receiveHeightMax: 44,
  edgeWidth: 2.0, observePeak: 0.10,
});
export const CONTRACT = Object.freeze({
  effectType: 'gain-mana', effectKind: 'mana', receiverOffset: {x: 0, y: -61},
  outputKind: 'executable_effect_source_not_image_generation',
  sourceCommit: '8ad8e9b07ab8dc8737dd9b4022a775bce61d16e1',
  baseBlob: '4e10a53310be5b9d0aa3a6c881cf4f39d6590bd4',
  extensionBlob: '0eda016558e426ff4142d850d26200b40fafd834',
});
const nonempty = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 256;
const finite = v => typeof v === 'number' && Number.isFinite(v);
export function eventKey(event) {
  return JSON.stringify([event.roomId, event.sessionId, event.id]); // 区切り文字を含むIDでも衝突させない。
}
export function classifyEvent(event, context, nowMs) {
  if (!event || !context || !finite(nowMs)) return 'invalid-input';
  if (![event.id, event.playerId, event.roomId, event.sessionId].every(nonempty)) return 'missing-id';
  if (event.roomId !== context.roomId || event.sessionId !== context.sessionId) return 'wrong-context';
  if (event.type !== 'gain-mana' || event.effectKind !== 'mana') return 'wrong-effect';
  if (event.committed !== true || event.gainClass !== 'discrete') return 'not-committed-discrete';
  if (!finite(event.manaBefore) || !finite(event.manaAfter) || event.manaBefore < 0 || event.manaAfter <= event.manaBefore) return 'not-positive-actual-delta';
  if (!finite(event.committedAtMs) || !finite(event.expiresAtMs) || event.committedAtMs > nowMs || event.expiresAtMs <= nowMs || event.expiresAtMs <= event.committedAtMs) return 'expired-or-invalid-time';
  if (['desire-recovery', 'renki', 'renki-tenfold'].includes(event.variant)) return 'excluded-renki';
  if (event.source === 'map-object') {
    if (event.variant !== 'normal') return 'unsupported-map-object-variant';
  } else if (event.source === 'mystery') {
    if (event.variant !== 'mana-surge') return 'unsupported-mystery-variant';
  } else return 'unsupported-source';
  if (event.ownerPlayerId !== undefined && event.ownerPlayerId !== event.playerId) return 'owner-mismatch';
  return null;
}
export function actorEligibility(actor, event, context) {
  if (!actor || actor.playerId !== event.playerId) return 'missing-recipient';
  if (actor.roomId !== context.roomId || actor.sessionId !== context.sessionId) return 'recipient-context';
  if (actor.alive !== true) return 'dead';
  if (actor.present !== true) return 'departed';
  if (actor.vented !== false) return 'vented-or-unknown';
  if (actor.invisible !== false || !finite(actor.opacity) || actor.opacity <= 0) return 'invisible-or-unknown';
  if (actor.onScreen !== true || actor.renderVisible !== true) return 'offscreen-or-hidden';
  if (!finite(actor.worldX) || !finite(actor.worldY)) return 'invalid-world-position';
  return null;
}
export function ownerRate(motion) {
  return motion?.moving === true && motion?.acc2State === 'active' && motion?.acc2Effective === true ? 2 : 1;
}
export function defaultEnvironment() {
  return {visible: true, muted: true, verify: false}; // 音はユーザー操作前には無効。
}
export function seededUnit(key) {
  let n = 2166136261;
  for (let i = 0; i < key.length; i++) n = Math.imul(n ^ key.charCodeAt(i), 16777619);
  return (n >>> 0) / 4294967295;
}
