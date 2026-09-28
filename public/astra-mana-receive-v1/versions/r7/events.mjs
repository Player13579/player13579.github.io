export const VERSION = 'astra-mana-receive-v1-r7';
export const DURATION = 1.48;
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const excluded = value => /(?:desire|renki|natural)/i.test(String(value || ''));
export function admissibility(receipt, owner, session) {
  if (!receipt || receipt.type !== 'gain-mana' || receipt.effectKind !== 'mana' || receipt.confirmed !== true || receipt.discrete !== true) return 'not-confirmed-discrete-mana';
  if (typeof receipt.eventId !== 'string' || !receipt.eventId || typeof receipt.playerId !== 'string' || !receipt.playerId) return 'missing-identity';
  if (receipt.sessionId !== session || !owner || owner.sessionId !== session || receipt.playerId !== owner.playerId) return 'invalid-session-owner';
  if (!Number.isFinite(receipt.actualDelta) || receipt.actualDelta <= 0 || receipt.naturalRecovery === true || excluded(receipt.variant)) return 'non-receipt-or-excluded';
  if (!finitePoint(receipt.sourceWorld) || !finitePoint(owner.world)) return 'missing-world-anchor';
  if (!owner.alive || owner.hidden || !owner.onScreen || !owner.sessionValid) return 'suppressed-owner';
  return null;
}
// Presentation-only ledger: no receipt or owner mutation. No time-based dedupe eviction.
export class ManaReceipts {
  constructor(sessionId, {onStart = () => {}, onStop = () => {}, onRate = () => {}} = {}) {
    this.sessionId = sessionId; this.seen = new Set(); this.active = []; this.onStart = onStart; this.onStop = onStop; this.onRate = onRate;
  }
  receive(receipt, owner) {
    const reason = admissibility(receipt, owner, this.sessionId);
    const key = JSON.stringify([receipt?.eventId, receipt?.playerId]);
    if (this.seen.has(key)) return {accepted:false, reason:'duplicate'};
    // Suppressed valid receipts are consumed so visibility changes never replay them.
    if (reason === 'suppressed-owner') this.seen.add(key);
    if (reason) return {accepted:false, reason};
    this.seen.add(key);
    const instance = {key, eventId:receipt.eventId, playerId:receipt.playerId, age:0, sourceWorld:{...receipt.sourceWorld}, world:{...owner.world}, rate:owner.acc2Active === true ? 2 : 1, reducedMotion:owner.reducedMotion === true};
    this.active.push(instance); this.onStart(instance);
    return {accepted:true, instance};
  }
  advance(wallDt, ownerLookup) {
    if (!Number.isFinite(wallDt) || wallDt < 0) throw new RangeError('wallDt must be finite and nonnegative');
    const next = [];
    for (const e of this.active) {
      const o = ownerLookup(e.playerId);
      if (!o || o.sessionId !== this.sessionId || !o.sessionValid || !o.alive || o.hidden || !o.onScreen || !finitePoint(o.world)) { this.onStop(e); continue; }
      // Caller supplies the state active during this wall interval; split at known state boundaries.
      const rate = o.acc2Active === true ? 2 : 1;
      e.age += wallDt * rate; e.world = {...o.world}; e.reducedMotion = o.reducedMotion === true;
      if (e.rate !== rate) { e.rate = rate; this.onRate(e); }
      if (e.age >= DURATION) this.onStop(e); else next.push(e);
    }
    this.active = next;
  }
  reset(sessionId) { for (const e of this.active) this.onStop(e); this.active=[]; this.seen.clear(); this.sessionId=sessionId; }
}
