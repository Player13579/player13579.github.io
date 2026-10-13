export const RETIREMENT_PROOF_SCHEMA = 'taser-contact-retirement-proof-r1140/v1';
const arr = value => Array.isArray(value) ? value : [];
export function validateRetirementProof(value) {
  const errors = [];
  if (!value || value.disposeSettled !== true || value.teardown !== 'disposed' || value.deviceLifecycle !== 'destroyed-loss-settled') errors.push('dispose/device lifecycle incomplete');
  const d=value?.device||{}; if(d.status!=='destroyed-loss-settled'||d.drained!==true||d.destroyCalled!==true||d.lostReason!=='destroyed') errors.push('device proof incomplete');
  const r=value?.renderer||{}; if(r.disposed!==true||r.pendingSettled!==true||r.pendingCount!==0||r.queueDrained!==true||r.resourcesDisposed!==true||r.contextUnconfigured!==true||arr(r.cleanupErrors).length) errors.push('renderer proof incomplete');
  const a=value?.audio||{}; if(a.disposeSettled!==true||!['closed','absent'].includes(a.contextState)||a.voicesRemaining!==0||arr(a.cleanupErrors).length) errors.push('audio proof incomplete');
  if(Number(value?.pendingTasks)!==0||arr(value?.cleanupErrors).length) errors.push('cleanup proof incomplete');
  const id=value?.adapter||{}; if(typeof id.token!=='string'||!id.token||typeof id.sessionId!=='string'||!id.sessionId||!Number.isSafeInteger(id.attemptEpoch)||id.attemptEpoch<1) errors.push('adapter identity missing');
  return { ok:errors.length===0, errors };
}
export async function disposeWebGpuResources({drawSettlement,queue,resources=[],context,device,deviceLost}) {
  const errors=[]; let pendingSettled=false,queueDrained=false,resourcesDisposed=true,contextUnconfigured=false,destroyCalled=false,lostReason=null;
  try { await drawSettlement; pendingSettled=true; } catch(e){errors.push(`pending draw: ${e?.message??e}`);}
  try { await queue.onSubmittedWorkDone(); queueDrained=true; } catch(e){errors.push(`queue drain: ${e?.message??e}`);}
  for(const [i,x] of resources.entries()) { try { x?.destroy?.(); } catch(e){resourcesDisposed=false;errors.push(`resource ${i}: ${e?.message??e}`);} }
  try { context?.unconfigure(); contextUnconfigured=true; } catch(e){errors.push(`context unconfigure: ${e?.message??e}`);}
  try { device.destroy(); destroyCalled=true; } catch(e){errors.push(`device destroy: ${e?.message??e}`);}
  try { const loss=await deviceLost; lostReason=loss?.reason??null; } catch(e){errors.push(`device lost: ${e?.message??e}`);}
  const ok=pendingSettled&&queueDrained&&resourcesDisposed&&contextUnconfigured&&destroyCalled&&lostReason==='destroyed'&&!errors.length;
  return { errors, pendingSettled, queueDrained, resourcesDisposed, contextUnconfigured, destroyCalled, lostReason, ok };
}
export async function runTaserRetirementCleanup(ops) {
  const errors=[]; const attempt=async(label,fn)=>{try{return await fn();}catch(e){errors.push(`${label}: ${e?.message??e}`);return null;}};
  await attempt('cancel callbacks',()=>ops.cancel?.());
  await attempt('observer disconnect',()=>ops.disconnectObserver?.());
  await attempt('voice stop',()=>ops.stopVoices?.());
  await attempt('initialize settle',()=>ops.awaitInitialize?.());
  await attempt('pending draw',()=>ops.awaitPendingDraw?.());
  await attempt('tracker dispose',()=>ops.disposeTracker?.());
  const renderer=await attempt('renderer dispose',()=>ops.disposeRenderer?.()) ?? {};
  const audio=await attempt('audio close',()=>ops.closeAudio?.()) ?? {contextState:ops.audioCreated?'unknown':'absent',voicesRemaining:ops.voicesRemaining?.()??0,disposeSettled:!ops.audioCreated};
  const pendingTasks=ops.pendingTasks?.()??0;
  const cleanupErrors=[...errors,...arr(renderer.errors),...arr(audio.cleanupErrors)];
  const proof={ proofSchema:RETIREMENT_PROOF_SCHEMA, disposeSettled:!errors.some(x=>x.startsWith('pending draw')||x.startsWith('renderer dispose')||x.startsWith('audio close')),
    teardown:'unknown',deviceLifecycle:'unknown',pendingTasks,
    device:{status:renderer.ok?'destroyed-loss-settled':'unknown',drained:renderer.queueDrained===true,destroyCalled:renderer.destroyCalled===true,lostReason:renderer.lostReason??null},
    renderer:{disposed:renderer.ok===true,pendingSettled:renderer.pendingSettled===true,pendingCount:pendingTasks,queueDrained:renderer.queueDrained===true,resourcesDisposed:renderer.resourcesDisposed===true,contextUnconfigured:renderer.contextUnconfigured===true,cleanupErrors:arr(renderer.errors)},
    audio:{disposeSettled:audio.disposeSettled===true,contextState:audio.contextState,voicesRemaining:audio.voicesRemaining,cleanupErrors:arr(audio.cleanupErrors)},cleanupErrors };
  proof.teardown='disposed';proof.deviceLifecycle='destroyed-loss-settled';
  if(!validateRetirementProof({...proof,adapter:{token:'pending',sessionId:'pending',attemptEpoch:1}}).ok) {proof.teardown='unknown';proof.deviceLifecycle='unknown';}
  return proof;
}
export function createTaserRetirementMessageHandler({valid,identity,cleanup,post}) {
  let task=null, replied=false;
  return event=>{
    const m=event?.data;
    if(!valid(event)||m?.schema!=='dva-gallery-startup/v1'||m.action!=='retire'||m.token!==identity.token||m.versionId!==identity.versionId||m.attemptEpoch!==identity.attemptEpoch)return false;
    if(task)return true;
    task=(async()=>{
      let lifecycle;
      try { lifecycle={...await cleanup(),adapter:{token:identity.token,sessionId:identity.sessionId,attemptEpoch:identity.attemptEpoch}}; }
      catch(e){lifecycle={disposeSettled:false,teardown:'unknown',deviceLifecycle:'unknown',pendingTasks:1,cleanupErrors:[String(e?.message??e)],adapter:{token:identity.token,sessionId:identity.sessionId,attemptEpoch:identity.attemptEpoch}};}
      const verdict=validateRetirementProof(lifecycle);
      const message={schema:'dva-gallery-startup/v1',action:verdict.ok?'retired':'retire-error',token:identity.token,sessionId:identity.sessionId,versionId:identity.versionId,attemptEpoch:identity.attemptEpoch,sequence:identity.nextSequence(),adapterSessionId:identity.sessionId,teardown:verdict.ok?'disposed':'unknown',lifecycle};
      if(!verdict.ok) lifecycle.cleanupErrors=[...arr(lifecycle.cleanupErrors),...verdict.errors];
      try {post(message); replied=true;} catch(e) { if(!replied){try{post({...message,action:'retire-error',teardown:'unknown'});replied=true;}catch{}} }
    })(); return true;
  };
}




