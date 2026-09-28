/** 正規化済みの信頼境界。DVA既存wire schemaを推測して直接受理しない。 */
export const KIND = 'action-item-use';
export const VARIANTS = Object.freeze(['mineral-water', 'seawater', 'antidote']);
export const LIFETIME_MS = 1200;
export const RADIUS = 90;
export const AUDIO_FRESH_MS = 80;
export const BODY_DURATION = Object.freeze({'mineral-water':1100, seawater:900, antidote:780});
export const CAPACITY = 64;
export const MAX_SEEN = 16384;
const ID = /^[\p{L}\p{N}_.:@/-]{1,160}$/u;
export const validId = v => typeof v === 'string' && ID.test(v);
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export const emptyTarget = v => v === undefined || v === null || v === '';
export function eventKey(r) { return JSON.stringify([r.sessionId, r.roomId, r.id]); }
export function contextKey(c) { return JSON.stringify([c?.sessionId, c?.roomId, c?.viewerId]); }
/** フィールド名はこのパッケージの正規化API。actual wireへの写像はhost adapterが所有する。 */
export function validateReceipt(r, now) {
  if (!isObject(r) || !Number.isFinite(now)) return 'invalid-input';
  if (![r.id,r.playerId,r.sessionId,r.roomId,r.actorGeneration].every(validId)) return 'invalid-identity';
  if (r.kind !== KIND || !VARIANTS.includes(r.variant)) return 'unsupported-event';
  if (r.consumptionSucceeded !== true || r.selfUse !== true) return 'not-confirmed-self-consumption';
  if (!Number.isSafeInteger(r.x) || !Number.isSafeInteger(r.y)) return 'invalid-origin';
  if (Math.abs(r.x)>1e7 || Math.abs(r.y)>1e7) return 'origin-out-of-render-domain';
  if (r.radius !== RADIUS || r.durationMs !== 0) return 'wrong-receipt-geometry-or-duration';
  if (['target','targetId','targetPlayerId','targetX','targetY'].some(k => !emptyTarget(r[k]))) return 'target-forbidden';
  if (!['live','late'].includes(r.delivery)) return 'replay-or-snapshot';
  if (!Number.isFinite(r.occurredAtMs) || !Number.isFinite(r.receivedAtMs) ||
      r.occurredAtMs > r.receivedAtMs || r.receivedAtMs > now || r.occurredAtMs < 0) return 'invalid-clock';
  if (now-r.occurredAtMs >= LIFETIME_MS) return 'expired';
  return null;
}
/** 全gateはfail-closed。privacy/遮蔽をopacityの好みとして扱わない。 */
export function gate(r, c, a) {
  if (!isObject(c) || ![c.sessionId,c.roomId,c.viewerId].every(validId)) return 'missing-context';
  if (r.sessionId!==c.sessionId || r.roomId!==c.roomId) return 'context-mismatch';
  if (c.documentVisible !== true) return 'document-hidden';
  if (!isObject(a) || a.playerId!==r.playerId || a.generation!==r.actorGeneration ||
      a.sessionId!==r.sessionId || a.roomId!==r.roomId) return 'actor-mismatch';
  if (a.authorizedForViewer!==true || a.privacyAllowed!==true) return 'privacy-denied';
  if (a.visible!==true) return 'not-visible';
  if (a.onScreen!==true) return 'offscreen';
  if (a.occluded!==false) return 'occluded-or-unknown';
  if (a.maskReady!==true) return 'mask-not-ready';
  return null;
}
export function smoothstep(a,b,x) { const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
/** 描画包絡。BODY進行や効果receiptを読まず、成立イベントの表示経過だけを用いる。 */
export function envelope(variant, ageMs, reduced=false) {
  if (!VARIANTS.includes(variant) || !Number.isFinite(ageMs) || ageMs<=0 || ageMs>=LIFETIME_MS) return 0;
  const t=ageMs/1000;
  const onset=reduced?0.12:0.085;
  const tailStart=variant==='antidote'?0.57:variant==='seawater'?0.64:0.72;
  return smoothstep(0,onset,t)*(1-smoothstep(tailStart,1.2,t));
}
export function hashId(text) {
  let h=2166136261; for (const c of text) {h^=c.codePointAt(0); h=Math.imul(h,16777619);}
  return h>>>0;
}
