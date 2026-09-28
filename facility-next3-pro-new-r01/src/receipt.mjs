import {FACILITIES, facilityById} from './catalog.mjs';
const nonempty = v => typeof v === 'string' && v.length > 0 && v.length <= 512 && !/[\u0000-\u001f]/u.test(v);
/** effectKind はサーバー正本の値をホストから明示注入する。タイプや利益から推測しない。 */
export function createReceiptValidator(effectKinds) {
  if (!effectKinds || FACILITIES.some(d => !nonempty(effectKinds[d.objectId]))) {
    throw new TypeError('3件の正確な effectKind を objectId ごとの mapping で指定してください。既定値はありません。');
  }
  const kinds = Object.freeze(Object.fromEntries(FACILITIES.map(d => [d.objectId,effectKinds[d.objectId]])));
  return function validateReceipt(raw) {
    if (!raw || typeof raw !== 'object') return {ok:false,reason:'receipt_not_object'};
    const def = facilityById(raw.objectId);
    if (!def) return {ok:false,reason:'unowned_object'};
    if (raw.type !== def.type) return {ok:false,reason:'type_mismatch'};
    if (raw.effectKind !== kinds[def.objectId]) return {ok:false,reason:'effectKind_mismatch'};
    if (!nonempty(raw.playerId) || !nonempty(raw.objectCausalId)) return {ok:false,reason:'invalid_cause_or_player'};
    if (!Number.isSafeInteger(raw.capturedTime) || raw.capturedTime <= 0) return {ok:false,reason:'capturedTime_requires_epoch_ms_integer'};
    const p = raw.worldOrigin;
    // すでにサーバーが丸めた座標だけを受け入れる。ここで丸めて不一致を隠さない。
    if (!p || !Number.isSafeInteger(p.x) || !Number.isSafeInteger(p.y) || p.x !== def.origin.x || p.y !== def.origin.y) {
      return {ok:false,reason:'rounded_world_origin_mismatch'};
    }
    const receipt = Object.freeze({objectId:def.objectId,type:def.type,effectKind:raw.effectKind,playerId:raw.playerId,
      objectCausalId:raw.objectCausalId,capturedTime:raw.capturedTime,worldOrigin:Object.freeze({x:p.x,y:p.y})});
    return {ok:true,definition:def,receipt};
  };
}
export function receiptKey(r) { return JSON.stringify([r.objectId,r.playerId,r.objectCausalId]); }
export function receiptFingerprint(r) {
  return JSON.stringify([r.objectId,r.type,r.effectKind,r.playerId,r.objectCausalId,r.capturedTime,r.worldOrigin.x,r.worldOrigin.y]);
}
export function hash32(text) {
  let h = 2166136261;
  for (let i=0;i<text.length;i++) h = Math.imul(h ^ text.charCodeAt(i),16777619);
  return h >>> 0;
}
