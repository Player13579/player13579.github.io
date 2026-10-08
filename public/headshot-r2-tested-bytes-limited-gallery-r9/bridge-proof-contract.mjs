// Strict private producer contract. The real parent's validator is weaker.
export const CATALOG_ID='gunner-headshot-unified-sol61-cloud-r2';
export const SOURCE_VERSION='gunner-headshot-unified-sol61-r2';
export const TARGET_ID='private-contact-surface';
export const EXPECTED_SOURCE_HASHES={
  'index.html':'9cd5d5b202bfbb4818af5d01f71766119bf36421093063dbf5f9939903d9507c',
  'app.mjs':'a042394f51458b9d4a7f099ac6edb717b7df68516efcd8849e9e91ce8637ded1',
  'contact.mjs':'8d45795a50903d4bfd66945c1eb055591fef21ef2f2e73c2223460cdaf0f5729',
  'renderer.mjs':'0fffffdf87cf36d746447c83189ec8d44046a8d46f3e3e37bf213a082a9b7b07',
  'sfx.mjs':'5154b26309da2f46c5aea4bdfa705f8ee99debdab1c1b3ba67c08c4c59b567f6',
  'shaders.mjs':'9a2e35c4a7c68679b241e8d02fb2a56ff260910be0d41deff20580925e5d0c4d',
  'form.mjs':'b1e6e390be7f25ed1cde945bc94097f614d5fc1bfdc278ca16332161843d8560'
};
const assert=(condition,reason)=>{if(!condition)throw new Error(reason);};
const positive=x=>Number.isFinite(x)&&x>0;
const finite=x=>Number.isFinite(x);
export function buildActiveProof(input) {
  const {receipt:r,snapshot:s,target:t,observation:o,identity:i,baselineSerial,activationAt,observerFault}=input;
  assert(!observerFault,'observation gap');
  assert(i.version===SOURCE_VERSION&&i.catalogVersion===CATALOG_ID,'version mapping');
  assert(Object.entries(EXPECTED_SOURCE_HASHES).every(([name,hash])=>i.hashes?.[name]===hash),'source hash mismatch');
  assert(typeof i.documentId==='string'&&i.documentId.length>0&&finite(i.timeOrigin),'source document identity');
  assert(t.documentId===i.documentId&&o?.documentId===i.documentId,'source document changed');
  assert(s?.ready===true&&s.retired===false&&s.heldAge===null&&s.hasSource===true,'source is not a natural active run');
  assert(s.lastReceipt===r&&o.sourceReceipt===r,'original receipt identity join');
  assert(s.diagnostics?.submissions?.includes(r),'receipt absent from source diagnostics');
  assert(s.diagnostics.submissions.at(-1)===r,'newer source work already exists');
  assert(s.diagnostics.pipelineScope===null&&s.diagnostics.compilation?.length===2&&
    ['contact-world','contact-observer'].every((label,n)=>s.diagnostics.compilation[n].label===label)&&
    s.diagnostics.compilation.every(m=>Array.isArray(m.messages)&&m.messages.every(v=>v.type!=='error')),
    'pipeline/compilation evidence');
  assert(s.diagnostics.uncaptured?.length===0&&s.diagnostics.deviceLost===null,'device error');
  assert(Number.isSafeInteger(r.submitSerial)&&r.submitSerial>baselineSerial,'stale serial');
  assert(typeof r.eventId==='string'&&r.eventId.startsWith('preview-contact-')&&finite(r.startedAt)&&r.startedAt>=activationAt,
    'fresh explicit preview cause');
  assert(r.playerId==='preview-shooter'&&r.targetId==='preview-target'&&r.variant==='hip:handgun'&&
    r.contactOnly===true&&r.killOutcomeUnknown===true,'original explicit fixture context');
  assert(r.active===true&&r.clear===false&&finite(r.ageMs)&&r.ageMs>=0&&r.ageMs<420,'initial/terminal clear is not active');
  assert(r.completion==='fulfilled'&&[r.submittedAt,r.fenceAcquiredAt,r.fulfilledAt].every(finite)&&
    r.submittedAt<=r.fenceAcquiredAt&&r.fenceAcquiredAt<=r.fulfilledAt,'source fence');
  assert(Array.isArray(r.actualErrorScopes)&&r.actualErrorScopes.length===3&&
    ['internal','out-of-memory','validation'].every((filter,n)=>r.actualErrorScopes[n].filter===filter&&
      r.actualErrorScopes[n].error===null&&!('popRejected' in r.actualErrorScopes[n])),'all actual scopes required');
  assert(t.connected===true&&positive(t.cssWidth)&&positive(t.cssHeight)&&positive(t.dpr),'physical canvas');
  assert(t.canvasId===i.canvasId&&typeof i.canvasId==='string'&&i.canvasId.length>0,'physical canvas identity');
  assert(r.targetSurfaceId===TARGET_ID&&Number.isSafeInteger(r.generation)&&r.generation>=1&&t.generation===r.generation,
    'target generation changed');
  assert(t.backingWidth===r.backingWidth&&t.backingHeight===r.backingHeight&&
    t.backingWidth===Math.max(1,Math.round(t.cssWidth*t.dpr))&&
    t.backingHeight===Math.max(1,Math.round(t.cssHeight*t.dpr)),'backing geometry changed');
  assert(Array.isArray(r.uniforms)&&r.uniforms.length===12&&r.uniforms[0]===r.backingWidth&&
    r.uniforms[1]===r.backingHeight&&r.uniforms[3]===1,'active backing uniforms');
  assert(o.submitSerial===r.submitSerial&&o.finished===true&&o.submitted===true&&o.fence==='fulfilled'&&
    typeof o.deviceId==='string'&&typeof o.queueId==='string','native submit/fence ownership');
  assert([o.encodedAt,o.finishedAt,o.submitReturnedAt,o.fenceObservedAt,o.fenceObservedFulfilledAt].every(finite)&&
    o.encodedAt<=o.finishedAt&&o.finishedAt<=o.submitReturnedAt&&o.submitReturnedAt<=o.fenceObservedAt&&
    o.fenceObservedAt<=o.fenceObservedFulfilledAt,'native time ordering');
  assert(r.startedAt<=r.submittedAt&&r.submittedAt<=o.encodedAt&&o.submitReturnedAt<=r.fenceAcquiredAt&&
    r.fenceAcquiredAt<=o.fenceObservedAt&&o.fenceObservedFulfilledAt<=r.fulfilledAt,'source/native time join');
  assert(Array.isArray(o.passes)&&o.passes.length===2&&
    ['head-contact-world','head-contact-observer'].every((label,n)=>{
      const p=o.passes[n];return p.index===n&&p.ended===true&&p.draws?.length===1&&
        p.draws[0].pipeline===label&&p.draws[0].args.length===1&&p.draws[0].args[0]===3;
    }),'two actual active drawing passes required');
  return {
    recorded:true,submitted:true,completed:true,canvasConnected:true,passes:o.passes.length,
    viewportWidth:t.cssWidth,viewportHeight:t.cssHeight,backingWidth:t.backingWidth,backingHeight:t.backingHeight,
    sourceVersionId:i.version,sourceHashes:{...i.hashes},sourceDocumentId:i.documentId,sourceTimeOrigin:i.timeOrigin,
    canvasIdentity:i.canvasId,targetSurfaceId:r.targetSurfaceId,generation:r.generation,sourceSubmissionId:r.submitSerial,
    sourceCauseId:r.eventId,sourceStartedAt:r.startedAt,sourceAgeMs:r.ageMs,
    sourcePlayerId:r.playerId,sourceTargetId:r.targetId,sourceVariant:r.variant,
    deviceOwnerId:o.deviceId,queueOwnerId:o.queueId,queueCompleted:true,
    actualErrorScopes:structuredClone(r.actualErrorScopes),evidenceKind:'original-native-receipt+native-call-observation'
  };
}
export function captureNaturalTerminal({receipt:r,snapshot:s,target:t,observation:o,firstFrame:f,interrupted,observerFault}) {
  assert(!interrupted&&!observerFault,'natural run interrupted or observation incomplete');
  assert(s.ready===true&&s.retired===false&&s.heldAge===null&&s.hasSource===true&&s.lastReceipt===r,
    'terminal must be captured at original show before natural source release');
  assert(s.diagnostics.submissions.at(-1)===r&&o.sourceReceipt===r,'terminal original receipt identity');
  assert(s.diagnostics.deviceLost===null&&s.diagnostics.uncaptured.length===0,'terminal device error');
  assert(r.active===false&&r.clear===true&&r.ageMs===420&&r.completion==='fulfilled','terminal clear fence');
  assert(r.submitSerial>f.sourceSubmissionId&&r.eventId===f.sourceCauseId&&r.startedAt===f.sourceStartedAt,
    'terminal must retain active source cause');
  assert(r.playerId===f.sourcePlayerId&&r.targetId===f.sourceTargetId&&r.variant===f.sourceVariant&&
    r.contactOnly===true&&r.killOutcomeUnknown===true,'terminal fixture context changed');
  assert(r.targetSurfaceId===f.targetSurfaceId&&r.generation===f.generation&&
    t.documentId===f.sourceDocumentId&&t.canvasId===f.canvasIdentity&&t.connected===true&&
    t.generation===r.generation&&t.backingWidth===r.backingWidth&&t.backingHeight===r.backingHeight&&
    r.backingWidth===f.backingWidth&&r.backingHeight===f.backingHeight&&
    t.cssWidth===f.viewportWidth&&t.cssHeight===f.viewportHeight&&positive(t.dpr)&&
    r.backingWidth===Math.max(1,Math.round(t.cssWidth*t.dpr))&&
    r.backingHeight===Math.max(1,Math.round(t.cssHeight*t.dpr)),'terminal physical target changed');
  assert(r.uniforms.length===12&&r.uniforms[0]===r.backingWidth&&r.uniforms[1]===r.backingHeight&&
    r.uniforms[2]===420&&r.uniforms[3]===0,'terminal clear uniforms');
  assert(r.actualErrorScopes.length===3&&['internal','out-of-memory','validation'].every((filter,n)=>
    r.actualErrorScopes[n].filter===filter&&r.actualErrorScopes[n].error===null&&
    !('popRejected' in r.actualErrorScopes[n])),'terminal scopes');
  assert([r.submittedAt,r.fenceAcquiredAt,r.fulfilledAt].every(finite)&&r.submittedAt<=r.fenceAcquiredAt&&
    r.fenceAcquiredAt<=r.fulfilledAt&&o.submitSerial===r.submitSerial&&o.finished&&o.submitted&&o.fence==='fulfilled'&&
    o.deviceId===f.deviceOwnerId&&o.queueId===f.queueOwnerId&&o.documentId===f.sourceDocumentId,'terminal native ownership/fence');
  assert(o.passes.length===2&&o.passes.every((p,n)=>p.index===n&&p.ended)&&o.passes[0].draws.length===0&&
    o.passes[1].draws.length===1&&o.passes[1].draws[0].pipeline==='head-contact-observer'&&
    o.passes[1].draws[0].args.length===1&&o.passes[1].draws[0].args[0]===3,'terminal actual pass work');
  return {receipt:r,sourceDocumentId:f.sourceDocumentId,canvasIdentity:f.canvasIdentity,
    sourceCauseId:r.eventId,sourceStartedAt:r.startedAt,sourceSubmissionId:r.submitSerial,
    generation:r.generation,ageMs:r.ageMs,completion:r.completion,actualErrorScopes:structuredClone(r.actualErrorScopes)};
}
export function terminalIsSettled(candidate,snapshot) {
  return snapshot.ready===true&&snapshot.retired===false&&snapshot.heldAge===null&&
    snapshot.active===false&&snapshot.hasSource===false&&snapshot.rafPending===false&&
    snapshot.lastReceipt===candidate.receipt;
}
export function startupMessage(attempt,sequence,stage,status,extra={}) {
  // Reserved identity/status fields cannot be replaced by extras.
  return {...extra,schema:'dva-gallery-startup/v1',token:attempt.token,versionId:CATALOG_ID,
    attemptEpoch:attempt.epoch,sequence,stage,status};
}
export function createErrorLatch() {
  let firstError=null,retirement=null;
  return {
    error(value){firstError??=structuredClone(value);return structuredClone(firstError);},
    retire(value){retirement??=structuredClone(value);},
    snapshot(){return {firstError:structuredClone(firstError),retirement:structuredClone(retirement)};}
  };
}
