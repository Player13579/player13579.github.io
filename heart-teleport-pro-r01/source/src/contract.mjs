/** receipt境界だけが対象データを読む。描画・SFXへはallowlistの新objectを渡す。 */
export const TYPE = 'action-heart-teleport';
export const RADIUS = 64;
export const LIFETIME_MS = 1800;
export const MAX_ACTIVE = 8;
export const validId = v => (typeof v === 'string' && v.length > 0 && v.length <= 256) || (Number.isSafeInteger(v) && v >= 0);
const finite = v => typeof v === 'number' && Number.isFinite(v);
export function plainRecord(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  if (![null, Object.prototype].includes(Object.getPrototypeOf(v))) return false;
  return Object.values(Object.getOwnPropertyDescriptors(v)).every(d => 'value' in d);
}
export function validateReceipt(envelope, context, isCanonicalId) {
  if (!plainRecord(envelope) || !plainRecord(envelope.receipt) || !plainRecord(context)) return {ok:false,reason:'malformed'};
  const r = envelope.receipt;
  if (!validId(r.id) || isCanonicalId(r.id) !== true) return {ok:false,reason:'noncanonical_id'};
  if (r.type !== TYPE || r.radius !== RADIUS) return {ok:false,reason:'type_or_radius'};
  if (!validId(r.playerId) || r.viewerId !== r.playerId || envelope.ownerId !== r.playerId || envelope.delivery !== 'private') return {ok:false,reason:'private_owner'};
  if (![context.viewerId, context.selfId, context.ownerId].every(id => id === r.playerId)) return {ok:false,reason:'self_viewer_owner'};
  if (!validId(context.roomId) || !validId(context.sessionId) || envelope.roomId !== context.roomId || envelope.sessionId !== context.sessionId) return {ok:false,reason:'room_session'};
  // casterの権威アンカーは受信ホストが同じreceipt時点の履歴から照合する。
  if (!finite(r.x) || !finite(r.y) || context.casterId !== r.playerId || r.x !== context.casterX || r.y !== context.casterY) return {ok:false,reason:'caster_anchor'};
  if (!validId(r.targetId) || !finite(r.targetX) || !finite(r.targetY) || typeof r.variant !== 'string' || !r.variant || r.variant.length > 128) return {ok:false,reason:'target_contract'};
  const projection = Object.freeze({id:r.id, playerId:r.playerId, casterX:r.x, casterY:r.y});
  const scope = Object.freeze({viewerId:context.viewerId,selfId:context.selfId,ownerId:context.ownerId,roomId:context.roomId,sessionId:context.sessionId});
  return {ok:true, projection, scope};
}
export function sameScope(a,b) { return !!a && !!b && ['viewerId','selfId','ownerId','roomId','sessionId'].every(k=>a[k]===b[k]); }
/** performance時間と実時計の後退で寿命を引き延ばさない。simulation dtは使わない。 */
export class WallClock {
  #wall; #mono; #origin; #m0; #last;
  constructor(wall=()=>Date.now(), mono=()=>performance.now()) {this.#wall=wall;this.#mono=mono;this.#origin=wall();this.#m0=mono();this.#last=this.#origin;}
  now(){return this.#last=Math.max(this.#last,this.#wall(),this.#origin+this.#mono()-this.#m0);}
}
/** ホストがsession内のモジュール再mount間でも保持する。自動evictやclearはしない。 */
export class ReceiptLedger {
  #seen=new Set(); #capacity;
  constructor(capacity=65536){if(!Number.isSafeInteger(capacity)||capacity<1)throw new TypeError('ledger capacity');this.#capacity=capacity;}
  claim(id){if(this.#seen.has(id))return 'duplicate';if(this.#seen.size>=this.#capacity)return 'ledger_full';this.#seen.add(id);return 'claimed';}
  has(id){return this.#seen.has(id);}
  get size(){return this.#seen.size;}
}
export function visibilityAllowed(v) {
  return !!v && v.visible === true && v.onScreen === true && v.occluded === false && v.documentVisible === true;
}
