import {createCausalPairReceipt,createEndpointOnlyLease,endpointOnlyPlan} from './teleport-preview-adapter.mjs';
const finite=Number.isFinite;
export function validateOwningClock(clock,expected) {
 return Boolean(clock&&Object.isFrozen(clock)&&clock.schema==='teleport-actor-e-clock-r2'&&clock.current===true&&
  clock.actorId===expected.actorId&&clock.causalId===expected.causalId&&clock.roomId===expected.roomId&&
  clock.generation===expected.generation&&Number.isSafeInteger(clock.generation)&&clock.generation>=0&&
  clock.relocationRevision===expected.revision&&Number.isSafeInteger(clock.relocationRevision)&&clock.relocationRevision>0&&
  finite(clock.atEms)&&clock.atEms>=0&&Array.isArray(clock.sourceIds)&&Object.isFrozen(clock.sourceIds)&&
  clock.sourceIds.length===expected.sourceIds.length&&new Set(clock.sourceIds).size===clock.sourceIds.length&&clock.sourceIds.every((id,i)=>typeof id==='string'&&id.length>0&&id===expected.sourceIds[i]));
}
export function createOwningEReceipt({scope,pair,clock}) {
 const expected={actorId:pair?.transportedActorId,causalId:pair?.castId,roomId:scope?.roomId,generation:scope?.generation,revision:pair?.revisionAfter,sourceIds:[pair?.departure?.id,pair?.arrival?.id]};
 if(!validateOwningClock(clock,expected))throw TypeError('Current immutable actor/source E clock required');
 // Reuse only r1's raw producer/privacy projection validation. A constant zero is
 // an internal validation origin, never a wall-time substitute for the E clock.
 const legacy=createCausalPairReceipt({scope,pair,nowMs:0});
 const {startedAtMs,durationMs,...source}=legacy;
 return Object.freeze({...source,timeBasis:'actor-e-clock',startedAtEms:clock.atEms,durationEms:640});
}
export function createOwningEndpointLease({projection,clock}) {
 const expected={actorId:projection?.transportedActorId,causalId:projection?.castId,roomId:projection?.roomId,generation:projection?.clientRoomSessionGeneration,revision:projection?.relocationRevision,sourceIds:[projection?.sourceId]};
 if(!validateOwningClock(clock,expected))throw TypeError('Current visible endpoint E clock required');
 const legacy=createEndpointOnlyLease(Object.freeze({...projection,localFirstReceiptAtMs:0}));
 const {localFirstReceiptAtMs,...source}=legacy;
 return Object.freeze({...source,schema:'teleport-endpoint-e-r2',timeBasis:'actor-e-clock',startedAtEms:clock.atEms,durationEms:640});
}
export function endpointOnlyEPlan({lease,pose,scope,clock,viewport,actor}) {
 const expected={actorId:lease?.transportedActorId,causalId:lease?.castId,roomId:lease?.roomId,generation:scope?.generation,revision:lease?.relocationRevision,sourceIds:[lease?.endpoint?.sourceId]};
 if(!lease||lease.schema!=='teleport-endpoint-e-r2'||lease.timeBasis!=='actor-e-clock'||lease.durationEms!==640||
  !finite(lease.startedAtEms)||lease.startedAtEms<0||!validateOwningClock(clock,expected)||clock.atEms<lease.startedAtEms)
  return Object.freeze({status:'blocked',reason:'invalid-owning-e-clock'});
 // Revalidate the recognized endpoint source before any phase/lifetime omission.
 // Frozen input alone is not proof that source kind, role or privacy fields agree.
 const allowed=new Set(['role','sourceId','type','radius','playerId','targetId','variant','position','sourceAtServerMs']);
 if(!Object.isFrozen(lease)||!Object.isFrozen(lease.endpoint)||!Object.isFrozen(lease.endpoint.position)||Object.keys(lease.endpoint).some(k=>!allowed.has(k)))
  return Object.freeze({status:'blocked',reason:'invalid-current-endpoint-source'});
 try {
  createEndpointOnlyLease(Object.freeze({roomIncarnationId:lease.roomIncarnationId,clientRoomSessionGeneration:lease.clientRoomSessionGeneration,roomId:lease.roomId,eClockRoomId:lease.eClockRoomId,castId:lease.castId,family:lease.family,transportedActorId:lease.transportedActorId,endpointRole:lease.endpoint.role,sourceId:lease.endpoint.sourceId,sourceType:lease.endpoint.type,sourceVariant:lease.endpoint.variant,sourceRadius:lease.endpoint.radius,sourcePlayerId:lease.endpoint.playerId,...(lease.endpoint.targetId===undefined?{}:{sourceTargetId:lease.endpoint.targetId}),sourceX:lease.endpoint.position.x,sourceY:lease.endpoint.position.y,sourceAtServerMs:lease.endpoint.sourceAtServerMs,relocationRevision:lease.relocationRevision,poseIdentity:lease.poseIdentity,localFirstReceiptAtMs:0}));
 } catch {
  return Object.freeze({status:'blocked',reason:'invalid-current-endpoint-source'});
 }
 const legacy=Object.freeze({...lease,schema:'teleport-endpoint-preview-r1',localFirstReceiptAtMs:0});
 const result=endpointOnlyPlan({lease:legacy,pose,scope,nowMs:clock.atEms-lease.startedAtEms,viewport,actor});
 return Object.freeze({...result,timeBasis:'actor-e-clock',durationEms:640});
}
