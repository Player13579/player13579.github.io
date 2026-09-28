import {TYPE,RADIUS,ReceiptLedger,validId} from '../src/contract.mjs';
/** server専用。ユーザー操作・BODY姿勢からは呼ばない。DBでcommit済みの成功を確認してからprivate送信する。 */
export function createHeartTransferIssuer({isCommittedHeartTransfer,isCanonicalId,sendPrivate,ledger}){
  if(![isCommittedHeartTransfer,isCanonicalId,sendPrivate].every(f=>typeof f==='function')||!(ledger instanceof ReceiptLedger))throw new TypeError('trusted server services required');
  return async function issue(committedEvent){
    const e=committedEvent;
    if(!(await isCommittedHeartTransfer(e)))return {ok:false,reason:'not_committed_transfer'};
    if(!validId(e.magicId)||isCanonicalId(e.magicId)!==true)return {ok:false,reason:'noncanonical_id'};
    const {caster,target,roomId,sessionId}=e;
    if(!caster||!target||![caster.id,target.id,roomId,sessionId].every(validId)||![caster.x,caster.y,target.x,target.y].every(Number.isFinite)||typeof target.role!=='string'||!target.role)return {ok:false,reason:'invalid_authority_data'};
    // このモジュールはtargetを移動せず、kill/death判定やBODY変更を一切呼ばない。
    const receipt=Object.freeze({id:e.magicId,type:TYPE,x:caster.x,y:caster.y,radius:RADIUS,playerId:caster.id,viewerId:caster.id,variant:target.role,targetId:target.id,targetX:target.x,targetY:target.y});
    const claim=ledger.claim(e.magicId);if(claim!=='claimed')return {ok:false,reason:claim};
    // 信頼できるprivate transport/outboxが宛先scopeを拘束する。broadcast関数は依存に含めない。
    const envelope=Object.freeze({delivery:'private',ownerId:caster.id,roomId,sessionId,receipt});
    try{await sendPrivate(caster.id,envelope);return {ok:true,id:e.magicId};}
    catch{return {ok:false,reason:'delivery_failed',retryPolicy:'transport outboxで同じreceiptを再送。新IDを発行しない。'};}
  };
}
