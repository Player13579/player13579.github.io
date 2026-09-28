import { CONTRACT } from './contract.js';
const text = x => typeof x === 'string' && x.length > 0 && x.length <= 256;
const finite = Number.isFinite;
/** この境界で受け付けるのは、ゲームが確定済みの増加を正規化した通知だけ。 */
export function eventRejection(e, scope, now) {
  if (!e || !text(e.id) || !text(e.playerId) || !text(e.ownerPlayerId)) return 'missing-identity';
  if (e.roomId !== scope.roomId || e.sessionId !== scope.sessionId) return 'wrong-scope';
  if (e.type !== 'gain-mana' || e.effectKind !== 'mana' || e.confirmed !== true) return 'not-confirmed-mana';
  if (e.discrete !== true || e.naturalRegen !== false) return 'not-discrete';
  if (CONTRACT.excludes.includes(e.variant)) return 'excluded-variant';
  // allowlist: 未知の原因を通常獲得に混ぜない。
  if (!(e.source === 'map-object' || (e.source === 'Mystery' && e.mysteryKind === 'mana-surge'))) return 'excluded-source';
  if (![e.manaBefore, e.manaAfter, e.expiresAt].every(finite)) return 'non-finite';
  if (!(e.manaAfter > e.manaBefore)) return 'no-actual-positive-delta';
  if (!(e.expiresAt > now)) return 'expired';
  return null;
}
/** 不明な可視状態は許可しない。位置は通知位置ではなく毎フレームの受け手位置。 */
export function visibilityRejection(player, view, scope, now, expiresAt) {
  if (!(expiresAt > now)) return 'expired';
  if (!player || player.roomId !== scope.roomId || player.sessionId !== scope.sessionId) return 'receiver-scope';
  if (player.alive !== true || player.present !== true) return 'dead-or-left';
  if (player.inVent !== false || player.invisible !== false || player.visibleToViewer !== true) return 'private-receiver';
  if (!(finite(player.opacity) && player.opacity > 0)) return 'transparent-receiver';
  if (!finite(player.world?.x) || !finite(player.world?.y)) return 'invalid-world-position';
  if (player.onScreen !== true || view?.visible !== true) return 'offscreen-or-hidden';
  return null;
}
/** 同じsession内では終わったIDも保持。容量時は忘れて再発音せずfail-closed。 */
export class EventLedger {
  constructor(capacity = CONTRACT.maxLedger) { this.capacity = capacity; this.entries = new Map(); }
  claim(e) {
    if (this.entries.has(e.id)) return this.entries.get(e.id) === e.playerId ? 'duplicate' : 'id-recipient-conflict';
    if (this.entries.size >= this.capacity) return 'ledger-capacity';
    this.entries.set(e.id, e.playerId); return null;
  }
  clear() { this.entries.clear(); }
}
