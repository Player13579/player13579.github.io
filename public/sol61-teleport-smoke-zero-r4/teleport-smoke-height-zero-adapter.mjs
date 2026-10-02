import { PROFILE, phaseAt, pairedBodyPhaseAt, projectHeight, lightingStateAt, sourceAt, smokeLobes, resolvePairedBodyPhase } from './creative.mjs';
import { validateOwningClock } from './vendor/r6-owning-e-clock-validator.mjs';
import { createCausalPairReceipt } from './vendor/r6-raw-causal-projection-validator.mjs';

const finite=Number.isFinite, id=x=>typeof x==='string'&&x.length>0;
function deepFreeze(x){if(!x||typeof x!=='object'||Object.isFrozen(x))return x;for(const v of Object.values(x))deepFreeze(v);return Object.freeze(x);}
const freezePoint=p=>Object.freeze({x:p.x,y:p.y});
const farr=(x,n)=>Array.isArray(x)&&x.length===n&&x.every(finite)&&Object.isFrozen(x);

// The inherited validator is used only to validate the original producer
// projection and privacy whitelist. Its 640ms wall-time fields are discarded.
export function createSmokeReceipt({scope,pair,clock,profileVersion=PROFILE.version}) {
  const expected={actorId:pair?.transportedActorId,causalId:pair?.castId,roomId:scope?.roomId,
    generation:scope?.generation,revision:pair?.revisionAfter,sourceIds:[pair?.departure?.id,pair?.arrival?.id]};
  if(profileVersion!==PROFILE.version||!validateOwningClock(clock,expected))throw new TypeError('Current actor/source E clock required');
  const raw=createCausalPairReceipt({scope,pair,nowMs:0});
  const {startedAtMs,durationMs,timeBasis,...validated}=raw;
  return deepFreeze({...validated,schema:'teleport-smoke-height-zero-receipt-v1',
    roomIncarnationId:scope.roomIncarnationId,clientRoomSessionGeneration:scope.clientRoomSessionGeneration,
    startedAtEms:clock.atEms,durationEms:PROFILE.durationEms,timeBasis:'actor-e-clock',profileVersion});
}

export function validateSmokeReceipt({receipt,scope,clock,actor,privacy}) {
  const blocked=reason=>Object.freeze({status:'blocked',reason});
  if(!receipt||!Object.isFrozen(receipt)||receipt.schema!=='teleport-smoke-height-zero-receipt-v1'||
      receipt.profileVersion!==PROFILE.version||receipt.durationEms!==800||receipt.timeBasis!=='actor-e-clock'||
      !id(receipt.causalId)||!id(receipt.transportedActorId)||!id(receipt.casterId)||
      !id(receipt.departureId)||!id(receipt.arrivalId)||receipt.departureId===receipt.arrivalId||
      receipt.roomId!==scope?.roomId||receipt.generation!==scope?.generation||
      receipt.roomIncarnationId!==scope?.roomIncarnationId||
      receipt.clientRoomSessionGeneration!==scope?.clientRoomSessionGeneration||
      !Number.isSafeInteger(receipt.revisionAfter)||receipt.revisionAfter<1||
      !finite(receipt.startedAtEms)||receipt.startedAtEms<0||!receipt.from||!receipt.to||
      !Object.isFrozen(receipt.from)||!Object.isFrozen(receipt.to)||
      !validateOwningClock(clock,{actorId:receipt.transportedActorId,causalId:receipt.causalId,
        roomId:receipt.roomId,generation:receipt.generation,revision:receipt.revisionAfter,
        sourceIds:[receipt.departureId,receipt.arrivalId]}))return blocked('invalid-owning-receipt-or-clock');
  const dep=receipt.sourceProof?.departure,arr=receipt.sourceProof?.arrival;
  if(!Object.isFrozen(receipt.sourceProof)||receipt.sourceProof.causalId!==receipt.causalId||
      receipt.sourceProof.departureId!==receipt.departureId||receipt.sourceProof.arrivalId!==receipt.arrivalId||
      dep?.playerId!==receipt.casterId||dep?.targetId!==receipt.transportedActorId||
      arr?.playerId!==receipt.transportedActorId||dep?.variant!==''||arr?.variant!=='arrival')return blocked('invalid-raw-source-proof');
  if(!actor||actor.id!==receipt.transportedActorId||actor.relocationRevision!==receipt.revisionAfter||
      ![actor.x,actor.y].every(finite)||typeof actor.alive!=='boolean'||typeof actor.ejected!=='boolean'||typeof actor.inVent!=='boolean')return blocked('invalid-current-actor');
  if(!privacy||typeof privacy.departureVisible!=='boolean'||typeof privacy.arrivalVisible!=='boolean')return blocked('invalid-privacy');
  if(clock.atEms<receipt.startedAtEms)return Object.freeze({status:'omitted',reason:'not-started'});
  if(clock.atEms-receipt.startedAtEms>=PROFILE.durationEms)return Object.freeze({status:'omitted',reason:'expired'});
  if(!actor.alive||actor.ejected||actor.inVent||actor.x!==receipt.to.x||actor.y!==receipt.to.y)return Object.freeze({status:'cancelled',reason:'actor-not-current-at-destination'});
  if(!privacy.departureVisible&&!privacy.arrivalVisible)return Object.freeze({status:'omitted',reason:'private-endpoints'});
  const ageEms=clock.atEms-receipt.startedAtEms;
  return Object.freeze({status:'ready',ageEms,receipt,roleVisibility:Object.freeze({departure:privacy.departureVisible,arrival:privacy.arrivalVisible})});
}

export function validatePreparedPose({resource,receipt,deviceIdentity,frameId,viewportGeneration,assetSha256}) {
  const actor=resource?.actor,sprite=actor?.sprite,t=sprite?.transform;
  if(resource?.kind!=='externalSample'||!resource.texture||resource.deviceIdentity!==deviceIdentity||
      actor?.playerId!==receipt?.transportedActorId||actor?.assetIdentity!=='assets/generated/philia-front-nine-v752.png'||
      actor?.frameId!==frameId||actor?.viewportGeneration!==viewportGeneration||
      !farr(actor.crop,4)||!farr(actor.sourceSize,2)||!farr(t,6)||!farr(actor.footAnchorTransform,6)||
      ![sprite?.x,sprite?.y,sprite?.w,sprite?.h].every(finite)||sprite.w<=0||sprite.h<=0||
      !resource.ownerLease?.ready||!resource.ownerLease?.current||resource.ownerLease.deviceIdentity!==deviceIdentity||
      resource.ownerLease.uploadVersion!==resource.uploadVersion||resource.alphaMode!=='premultiplied'||
      resource.colorEncoding!=='legacy-encoded'||resource.format!=='rgba8unorm'||
      !/^[a-f0-9]{64}$/i.test(assetSha256||''))throw new TypeError('Exact current prepared source pose required');
  return Object.freeze({actorId:actor.playerId,identity:actor.identity,direction:actor.direction,
    assetPath:actor.assetIdentity,assetSha256,frameId,viewportGeneration,texture:resource.texture,
    deviceIdentity,uploadVersion:resource.uploadVersion,ownerLease:resource.ownerLease,
    alphaMode:resource.alphaMode,colorEncoding:resource.colorEncoding,crop:actor.crop,sourceSize:actor.sourceSize,
    localRect:Object.freeze([sprite.x,sprite.y,sprite.w,sprite.h]),transform:t,
    uvRect:Object.freeze([actor.crop[0]/actor.sourceSize[0],actor.crop[1]/actor.sourceSize[1],
      actor.crop[2]/actor.sourceSize[0],actor.crop[3]/actor.sourceSize[1]])});
}

const ticketBrands=new WeakMap();
export function createPreparedPairTicket({frameId,pairIdentity,departurePose,arrivalPose,receipt,deviceIdentity,clock}) {
  if(!id(frameId)||!pairIdentity||!Object.isFrozen(pairIdentity)||
      departurePose?.actorId!==receipt?.transportedActorId||arrivalPose?.actorId!==receipt?.transportedActorId||
      departurePose?.deviceIdentity!==deviceIdentity||arrivalPose?.deviceIdentity!==deviceIdentity||
      departurePose?.uploadVersion!==arrivalPose?.uploadVersion||
      !departurePose.ownerLease.current||!arrivalPose.ownerLease.current||!validateOwningClock(clock,{actorId:receipt.transportedActorId,
        causalId:receipt.causalId,roomId:receipt.roomId,generation:receipt.generation,revision:receipt.revisionAfter,
        sourceIds:[receipt.departureId,receipt.arrivalId]}))return null;
  const ticket=Object.freeze({kind:'teleport-smoke-prepared-pair-ticket',frameId});
  ticketBrands.set(ticket,{frameId,pairIdentity,departurePose,arrivalPose,receipt,deviceIdentity,clock});
  return ticket;
}
export function provePreparedPairTicket({ticket,frameId,pairIdentity,ageEms}) {
  const p=ticketBrands.get(ticket);
  if(!p||p.frameId!==frameId||frameId!==p.departurePose.frameId||frameId!==p.arrivalPose.frameId||
      p.pairIdentity!==pairIdentity||p.clock.atEms-p.receipt.startedAtEms!==ageEms||
      p.departurePose.deviceIdentity!==p.deviceIdentity||p.arrivalPose.deviceIdentity!==p.deviceIdentity||
      !p.departurePose.ownerLease.current||!p.arrivalPose.ownerLease.current||
      p.departurePose.ownerLease.uploadVersion!==p.departurePose.uploadVersion||
      p.arrivalPose.ownerLease.uploadVersion!==p.arrivalPose.uploadVersion)return null;
  return Object.freeze({kind:'current-prepared-pair-body-proof',ticket,frameId,pairIdentity,validatedEAge:ageEms});
}
export function selectPairedPresentation({ageEms,frameId,ticket,pairIdentity,endpointOnly=false}) {
  return resolvePairedBodyPhase({ageEms,frameId,ticket,pairIdentity,endpointOnly,provePreparedPairTicket});
}

export function makeFramePlan({receipt,scope,clock,actor,privacy,viewport,poseByRole,effectEnabled=true,diagnostics={}}) {
  if(!effectEnabled)return Object.freeze({status:'ordinary',reason:'effect-off'});
  const admitted=validateSmokeReceipt({receipt,scope,clock,actor,privacy});
  if(admitted.status!=='ready')return admitted;
  if(!viewport||![viewport.width,viewport.height,viewport.zoom,viewport.camera?.x,viewport.camera?.y,viewport.dpr].every(finite)||
      viewport.width<=0||viewport.height<=0||viewport.zoom<=0||viewport.dpr<=0||!Number.isInteger(viewport.generation))return Object.freeze({status:'blocked',reason:'invalid-viewport'});
  const ageEms=admitted.ageEms,phase=pairedBodyPhaseAt(ageEms),endpointRows=[];
  for(const role of ['departure','arrival']){
    if(!privacy[`${role}Visible`])continue;
    const p=phaseAt(ageEms,role),source=lightingStateAt(ageEms,role,diagnostics),pose=poseByRole[role];
    if(!pose||pose.actorId!==receipt.transportedActorId||pose.deviceIdentity!==viewport.deviceIdentity||!pose.ownerLease.current)return Object.freeze({status:'blocked',reason:'prepared-pose-lost'});
    if(p.active&&(p.drawLiftedBody||p.smokeEnvelope>0))endpointRows.push(Object.freeze({role,pose,phase:p,source,lobes:smokeLobes(ageEms,role)}));
  }
  const validPair=privacy.departureVisible&&privacy.arrivalVisible&&poseByRole.departure&&poseByRole.arrival;
  const pairIdentity=validPair?Object.freeze({causalId:receipt.causalId,actorId:receipt.transportedActorId,
    roomId:receipt.roomId,generation:receipt.generation,revision:receipt.revisionAfter,
    deviceIdentity:viewport.deviceIdentity,uploadVersion:poseByRole.departure.uploadVersion,
    departureId:receipt.departureId,arrivalId:receipt.arrivalId}):null;
  const ticket=validPair?createPreparedPairTicket({frameId:viewport.frameId,pairIdentity,departurePose:poseByRole.departure,
    arrivalPose:poseByRole.arrival,receipt,deviceIdentity:viewport.deviceIdentity,clock}):null;
  const authority=selectPairedPresentation({ageEms,frameId:viewport.frameId,ticket,pairIdentity,endpointOnly:!validPair});
  const emissionRole=ageEms<140?'departure':ageEms>=180&&ageEms<320?'arrival':null;
  const emissionEndpoint=emissionRole&&endpointRows.some(row=>row.role===emissionRole&&row.phase.drawLiftedBody&&
    (emissionRole==='departure'?authority.drawDeparture:authority.drawArrival))?emissionRole:null;
  return Object.freeze({status:'ready',receipt,clock,ageEms,phase,pairedAuthority:authority,endpointRows:Object.freeze(endpointRows),
    pairIdentity,ticket,viewport,poseByRole,emissionEndpoint});
}

// The host and focused tests share this exact draw-order/authority selection.
export function selectFrameLayers(plan) {
  if(plan?.status!=='ready')return Object.freeze({ordinary:true,roles:Object.freeze([]),authoredVisible:false});
  const roles=plan.endpointRows.map(row=>Object.freeze({role:row.role,backSmoke:row.phase.smokeEnvelope>0,
    liftedBody:!!row.phase.drawLiftedBody&&!!(row.role==='departure'?plan.pairedAuthority.drawDeparture:plan.pairedAuthority.drawArrival),
    frontSmoke:row.phase.smokeEnvelope>0,source:plan.emissionEndpoint===row.role}));
  return Object.freeze({ordinary:!plan.pairedAuthority.suppressOrdinary,roles:Object.freeze(roles),
    authoredVisible:roles.some(row=>row.liftedBody)});
}

export {PROFILE,phaseAt,pairedBodyPhaseAt,projectHeight,lightingStateAt,sourceAt,smokeLobes,resolvePairedBodyPhase};
