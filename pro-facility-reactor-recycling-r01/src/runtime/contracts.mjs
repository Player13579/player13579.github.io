/** 受領仕様を固定する。値は表示の識別メタデータであり、利益を付与する計算に使わない。 */
export const VISUAL_LIFETIME_MS = 2200;
export const TARGETS = Object.freeze({
  'v302-reactor-reactorGauge-1': Object.freeze({
    objectId: 'v302-reactor-reactorGauge-1', type: 'reactorGauge', effectKind: 'luckBoost',
    origin: Object.freeze({x:3699, y:388}), key:'A',
    declaredBenefit:Object.freeze({delta:0.15, durationMs:20000}), cooldownMs:38000,
  }),
  'v302-fabrication-recyclingUnit-2': Object.freeze({
    objectId: 'v302-fabrication-recyclingUnit-2', type: 'recyclingUnit', effectKind: 'credits',
    origin: Object.freeze({x:4315, y:2102}), key:'B',
    declaredBenefit:Object.freeze({delta:3, durationMs:0}), cooldownMs:34000,
  }),
});
export const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const finite = v => typeof v === 'number' && Number.isFinite(v);
export const identifier = v => typeof v === 'string' && v.length > 0 && v.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(v);
export const point = p => isRecord(p) && finite(p.x) && finite(p.y) && Math.abs(p.x)<1e9 && Math.abs(p.y)<1e9;
export function requiredFunction(f,name) { if(typeof f!=='function') throw new TypeError(`${name}: 関数が必要`); return f; }
/** capturedTime はミリ秒のサーバー時刻。秒/ミリ秒を桁数から推測しない。wire形式はホストが正規化する。 */
export function validateReceipt(r, serverNowMs, policy) {
  if(!isRecord(r) || r.status!=='success') return {ok:false,reason:'not_success'};
  for(const k of ['objectId','type','effectKind','playerId','objectCausalId'])
    if(!identifier(r[k])) return {ok:false,reason:`invalid_${k}`};
  if(!Number.isSafeInteger(r.capturedTime) || r.capturedTime<0) return {ok:false,reason:'invalid_capturedTime'};
  if(!point(r.worldOrigin)) return {ok:false,reason:'invalid_world_origin'};
  if(!finite(serverNowMs)) return {ok:false,reason:'clock_unavailable'};
  if(r.capturedTime > serverNowMs + policy.maxFutureMs) return {ok:false,reason:'future_receipt'};
  if(!policy.isPlayerKnown(r.playerId)) return {ok:false,reason:'unknown_player'};
  const target=TARGETS[r.objectId];
  if(target && (r.type!==target.type || r.effectKind!==target.effectKind)) return {ok:false,reason:'target_identity_mismatch'};
  if(target && (r.worldOrigin.x!==target.origin.x || r.worldOrigin.y!==target.origin.y)) return {ok:false,reason:'target_origin_mismatch'};
  const receipt=Object.freeze({status:'success',objectId:r.objectId,type:r.type,effectKind:r.effectKind,
    playerId:r.playerId,objectCausalId:r.objectCausalId,capturedTime:r.capturedTime,
    worldOrigin:Object.freeze({x:r.worldOrigin.x,y:r.worldOrigin.y})});
  return {ok:true,receipt,target:target??null};
}
/** 原因IDはobjectId等の変更で別原因にしない。同IDで中身が変われば衝突として棄却する。 */
export function causeKey(serverEpoch, objectCausalId) { return JSON.stringify([serverEpoch,objectCausalId]); }
export function fingerprint(r) { return JSON.stringify([r.objectId,r.type,r.effectKind,r.playerId,r.objectCausalId,r.capturedTime,r.worldOrigin.x,r.worldOrigin.y]); }
export function checkedClock(clock) {
  const monotonicMs=clock.monotonicMs(); const serverNowMs=clock.serverNowMs(); const uncertaintyMs=clock.uncertaintyMs();
  if(!finite(monotonicMs)||!finite(serverNowMs)||!finite(uncertaintyMs)||uncertaintyMs<0||uncertaintyMs>50)
    return {ok:false,reason:'clock_not_bounded'};
  return {ok:true,monotonicMs,serverNowMs,uncertaintyMs};
}
export function checkedAnchor(v, playerId, nowMs) {
  // 可視受け手の座標は既存actorのサンプルだけを使う。欠落時に施設位置を代用しない。
  if(!isRecord(v)||v.playerId!==playerId||!point(v.world)||!finite(v.heightWorld)||v.heightWorld<=0||v.heightWorld>10000||
      !finite(v.sampledAtMonotonicMs)||Math.abs(nowMs-v.sampledAtMonotonicMs)>250) return null;
  return {world:{x:v.world.x,y:v.world.y},heightWorld:v.heightWorld,playerId};
}
