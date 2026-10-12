const STARTUP_SCHEMA='dva-gallery-startup/v1';
const PROOF_SCHEMA='quantum-gallery-retirement-proof-r1478/v1';
const HEX=/^[0-9a-f]{64}$/;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function replaceInstanceMethod(target,key,wrap){
  if(!target||typeof target[key]!=='function')throw new Error(`required method unavailable: ${key}`);
  const original=target[key];
  Object.defineProperty(target,key,{configurable:true,writable:true,value:wrap(original)});
  return original;
}
function timeout(promise,ms,label){let timer;return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} timeout`)),ms)})]).finally(()=>clearTimeout(timer))}

export function createTrackedFramePump(createFramePump, requestAnimationFrame, step, onError=()=>{}){
  let activeStep=null,stepCount=0;
  const rafCallbacks=new Set();
  const lifecycle=[];
  const record=(event)=>lifecycle.push({event,at:globalThis.performance?.now?.()??Date.now(),state:pump.getState()});
  const raf=callback=>{
    let resolve;const completion=new Promise(r=>{resolve=r});
    const ticket={completion};rafCallbacks.add(ticket);
    return requestAnimationFrame(timestamp=>{
      rafCallbacks.delete(ticket);resolve();callback(timestamp);
    });
  };
  const wrappedStep=()=>{
    stepCount++;
    const work=Promise.resolve().then(step);
    const completion=work.finally(()=>{stepCount--;if(activeStep===completion)activeStep=null});
    activeStep=completion;
    return completion;
  };
  const pump=createFramePump(raf,wrappedStep,onError);
  return Object.freeze({
    pump,
    getState:()=>Object.freeze({pump:pump.getState(),activeStepCount:stepCount,pendingRafCallbacks:rafCallbacks.size}),
    snapshot:()=>Object.freeze({pump:pump.getState(),activeStepCount:stepCount,pendingRafCallbacks:rafCallbacks.size,lifecycle:lifecycle.map(x=>({...x,state:{...x.state}}))}),
    noteRetireRequested(){record('retire-requested')},
    noteStopCalled(){record('stop-called')},
    async disposeAndDrain(timeoutMs=10000){
      record('dispose-requested');
      pump.dispose();
      const pending=[...rafCallbacks].map(row=>row.completion);
      if(activeStep)pending.push(activeStep);
      await timeout(Promise.all(pending),timeoutMs,'actual frame-pump drain');
      await new Promise(resolve=>setTimeout(resolve,0));
      const state=this.getState();
      if(state.activeStepCount!==0||state.pendingRafCallbacks!==0||state.pump.queued||state.pump.running||state.pump.requested||state.pump.disposed!==true)
        throw new Error('frame-pump did not reach an observed idle/disposed state');
      record('actual-pending-step-drained');
      return state;
    }
  });
}

export function createQuantumRetirementObserver({
  windowRef=globalThis.window, canvas, expected, startup,
  timeoutMs=10000, now=()=>globalThis.performance?.now?.()??Date.now()
}={}){
  const params=new URLSearchParams(windowRef?.location?.search||'');
  const identity={
    schema:PROOF_SCHEMA,sourceOrigin:windowRef?.location?.origin||null,
    parentOrigin:(()=>{try{return new URL(windowRef.document.referrer).origin}catch{return null}})(),
    token:params.get('galleryStartupToken'),attemptEpoch:Number(params.get('galleryAttemptEpoch')),
    versionId:params.get('galleryVersionId'),packageManifestSha256:params.get('galleryPackageManifestSha256'),
    packageSchema:params.get('galleryPackageSchema'),packageSealSha256:params.get('galleryPackageSealSha256'),
    sourceManifestSha256:params.get('gallerySourceManifestSha256')||params.get('sourceManifestSha256'),
    originalSourceManifestSha256:expected?.originalSourceManifestSha256||null
  };
  const expectedValid=expected&&HEX.test(identity.packageManifestSha256||'')&&HEX.test(identity.packageSealSha256||'')&&HEX.test(expected.sourceManifestSha256||'')&&HEX.test(expected.originalSourceManifestSha256||'');
  const identityValid=expectedValid&&identity.token&&identity.token.length>=16&&Number.isSafeInteger(identity.attemptEpoch)&&identity.attemptEpoch>0&&
    identity.versionId===expected.versionId&&identity.packageSchema===expected.packageSchema&&
    identity.sourceManifestSha256===expected.sourceManifestSha256&&
    identity.sourceOrigin===identity.parentOrigin;
  const errors=[];const devices=[];const resources=[];const contexts=[];const queues=[];const audioContexts=[];const sources=[];
  let installed=false, bound=null, retirementPromise=null, sequence=Math.max(0,Number(startup?.snapshot?.().sequence)||0), retiring=false;
  const addError=(phase,error)=>errors.push({phase,message:String(error?.message||error),at:now()});
  const byDevice=new WeakMap();
  function patchAudioContext(){
    const Original=windowRef.AudioContext;
    if(typeof Original!=='function')return;
    const Wrapped=new Proxy(Original,{construct(target,args){
      const context=Reflect.construct(target,args,target);const row={context,closeCalls:0,closeSettled:false,closeError:null};audioContexts.push(row);
      try{replaceInstanceMethod(context,'close',original=>function(...callArgs){row.closeCalls++;let result;try{result=Reflect.apply(original,this,callArgs)}catch(error){row.closeError=String(error?.message||error);throw error}const p=Promise.resolve(result).then(value=>{row.closeSettled=true;return value},error=>{row.closeSettled=true;row.closeError=String(error?.message||error);throw error});return result&&typeof result.then==='function'?result:p})}catch(error){addError('audio-close-observer-install',error)}
      try{replaceInstanceMethod(context,'createBufferSource',original=>function(...callArgs){const source=Reflect.apply(original,this,callArgs);const sr={source,stopCalls:0,disconnectCalls:0,ended:false,errors:[]};sources.push(sr);source.addEventListener?.('ended',()=>{sr.ended=true},{once:true});try{replaceInstanceMethod(source,'stop',f=>function(...a){try{const value=Reflect.apply(f,this,a);sr.stopCalls++;return value}catch(error){sr.errors.push(String(error?.message||error));throw error}})}catch(error){sr.errors.push(String(error?.message||error))}try{replaceInstanceMethod(source,'disconnect',f=>function(...a){try{const value=Reflect.apply(f,this,a);sr.disconnectCalls++;return value}catch(error){sr.errors.push(String(error?.message||error));throw error}})}catch(error){sr.errors.push(String(error?.message||error))}return source})}catch(error){addError('audio-source-observer-install',error)}
      return context;
    }});
    try{Object.defineProperty(windowRef,'AudioContext',{configurable:true,writable:true,value:Wrapped})}catch(error){addError('audio-context-observer-install',error)}
  }
  function instrumentDevice(device){
    if(!device||devices.some(row=>row.device===device))return;
    const queue=device.queue;if(!queue)throw new Error('actual GPUDevice has no queue');
    const row={device,deviceId:`qdev-${devices.length+1}`,queue,queueId:`qqueue-${queues.length+1}`,destroyCalls:0,lostSettled:false,lostInfo:null,
      buffersCreated:0,texturesCreated:0,submitSequence:0,fences:[],context:null,contextConfigured:false,contextUnconfigured:false,contextUnconfigureCalls:0,errors:[]};
    devices.push(row);queues.push({queue,deviceId:row.deviceId,queueId:row.queueId,submitSequence:0,fences:[]});byDevice.set(device,row);
    const qrow=queues.at(-1);
    replaceInstanceMethod(queue,'submit',original=>function(commands,...args){qrow.submitSequence++;row.submitSequence=qrow.submitSequence;return Reflect.apply(original,this,[commands,...args])});
    replaceInstanceMethod(queue,'onSubmittedWorkDone',original=>function(...args){const fence={deviceId:row.deviceId,queueId:row.queueId,throughSequence:qrow.submitSequence,startedAt:now(),settled:false,resolved:false,error:null,promise:null};qrow.fences.push(fence);row.fences.push(fence);let result;try{result=Reflect.apply(original,this,args)}catch(error){fence.settled=true;fence.error=String(error?.message||error);fence.promise=Promise.resolve();throw error}fence.promise=Promise.resolve(result).then(()=>{fence.settled=true;fence.resolved=true;fence.settledAt=now()},error=>{fence.settled=true;fence.error=String(error?.message||error);fence.settledAt=now()});return result});
    for(const [method,kind] of [['createBuffer','buffer'],['createTexture','texture']])replaceInstanceMethod(device,method,original=>function(...args){const resource=Reflect.apply(original,this,args);const rr={deviceId:row.deviceId,kind,resource,destroyCalls:0,destroySucceeded:false,createAt:now(),destroyError:null};resources.push(rr);if(kind==='buffer')row.buffersCreated++;else row.texturesCreated++;try{replaceInstanceMethod(resource,'destroy',destroy=>function(...destroyArgs){rr.destroyCalls++;try{const value=Reflect.apply(destroy,this,destroyArgs);rr.destroySucceeded=true;rr.destroyAt=now();return value}catch(error){rr.destroyError=String(error?.message||error);throw error}})}catch(error){rr.destroyError=`destroy observer install: ${error?.message||error}`;addError(`${kind}-destroy-observer-install`,error)}return resource});
    replaceInstanceMethod(device,'destroy',original=>function(...args){row.destroyCalls++;try{const value=Reflect.apply(original,this,args);row.destroyAt=now();return value}catch(error){row.errors.push({phase:'device-destroy',message:String(error?.message||error)});throw error}});
    const lost=device.lost;if(!lost||typeof lost.then!=='function')throw new Error('same actual GPUDevice has no loss promise');
    row.lostPromise=Promise.resolve(lost).then(info=>{row.lostSettled=true;row.lostInfo=info;row.lostAt=now();return info},error=>{row.lostSettled=true;row.lostInfoError=String(error?.message||error);row.lostAt=now();throw error});row.lostPromise.catch(()=>{});
    device.addEventListener?.('uncapturederror',event=>row.errors.push({phase:'uncapturederror',message:event?.error?.message||'uncaptured GPU error'}));
  }
  function patchRequestAdapter(){
    const gpu=windowRef?.navigator?.gpu;if(!gpu)throw new Error('WebGPU unavailable before startup');
    replaceInstanceMethod(gpu,'requestAdapter',original=>function(...args){const result=Reflect.apply(original,this,args);Promise.resolve(result).then(adapter=>{if(!adapter){addError('adapter','requestAdapter returned null');return}try{replaceInstanceMethod(adapter,'requestDevice',requestDevice=>function(...deviceArgs){const devicePromise=Reflect.apply(requestDevice,this,deviceArgs);Promise.resolve(devicePromise).then(device=>{try{instrumentDevice(device)}catch(error){addError('device-observer-install',error)}},error=>addError('requestDevice',error));return devicePromise})}catch(error){addError('adapter-observer-install',error)}},error=>addError('requestAdapter',error));return result});
  }
  function patchCanvas(){
    if(!canvas)throw new Error('preview canvas missing');
    replaceInstanceMethod(canvas,'getContext',original=>function(type,...args){const context=Reflect.apply(original,this,[type,...args]);if(this===canvas&&type==='webgpu'&&context&&!contexts.some(row=>row.context===context)){const row={context,configured:0,unconfigured:0,errors:[]};contexts.push(row);const owner=devices.find(d=>d.device===context.getConfiguration?.()?.device)||devices.at(-1);if(owner)owner.context=context;try{replaceInstanceMethod(context,'configure',f=>function(...a){const result=Reflect.apply(f,this,a);row.configured++;row.deviceId=a[0]?.device===owner?.device?owner.deviceId:null;if(owner){owner.context=context;owner.contextConfigured=true}return result})}catch(error){addError('context-configure-observer-install',error)}try{replaceInstanceMethod(context,'unconfigure',f=>function(...a){try{const result=Reflect.apply(f,this,a);row.unconfigured++;if(owner){owner.contextUnconfigureCalls++;owner.contextUnconfigured=true}return result}catch(error){row.errors.push(String(error?.message||error));throw error}})}catch(error){addError('context-unconfigure-observer-install',error)}}return context});
  }
  function install(){
    if(installed)return errors.length===0;installed=true;
    if(!identityValid)addError('identity','route pins or parent origin do not match the frozen technical route');
    try{patchAudioContext()}catch(error){addError('audio-context',error)}
    try{patchCanvas()}catch(error){addError('canvas-observer',error)}
    try{patchRequestAdapter()}catch(error){addError('webgpu-observer',error)}
    return errors.length===0;
  }
  function bind({runtime,sound,frameDrain,stop}){bound={runtime,sound,frameDrain,stop}}
  function currentLifecycle(){
    const d=devices[0], audio=soundSnapshot();
    const queueFences=queues.flatMap(q=>q.fences);
    const allResourcesDestroyed=resources.length>0&&resources.every(r=>r.destroySucceeded&&r.destroyCalls===1&&!r.destroyError);
    const frame=bound?.frameDrain?.snapshot?.()||null;
    return {proofSchema:PROOF_SCHEMA,sourceOrigin:identity.sourceOrigin,parentOrigin:identity.parentOrigin,token:identity.token,versionId:identity.versionId,attemptEpoch:identity.attemptEpoch,
      packageSchema:identity.packageSchema,packageManifestSha256:identity.packageManifestSha256,packageSealSha256:identity.packageSealSha256,sourceManifestSha256:identity.sourceManifestSha256,originalSourceManifestSha256:identity.originalSourceManifestSha256,
      disposeSettled:false,teardown:'unknown',deviceLifecycle:'unknown',framePump:frame,
      renderer:{disposeSettled:false,drainMethod:'actual-pinned-runtime.dispose awaits private render chain; actual frame-pump wrapper awaited',actualCallbackSettled:frame?.activeStepCount===0,pendingObservedFrames:frame?.activeStepCount??null,deviceId:d?.deviceId??null,queueId:d?.queueId??null,submitSequence:d?.submitSequence??null,completedThroughSequence:Math.max(-1,...(d?.fences||[]).filter(f=>f.resolved).map(f=>f.throughSequence)),queueFenceCount:queueFences.length,pendingFenceCount:queueFences.filter(f=>!f.settled).length,queueDrained:queueFences.length>0&&queueFences.every(f=>f.settled&&f.resolved),resourcesCreated:resources.length,resourcesDestroyed:resources.filter(r=>r.destroySucceeded).length,resourceInventoryComplete:resources.length>0&&resources.every(r=>r.destroySucceeded&&r.destroyCalls===1&&!r.destroyError),resourcesDisposed:allResourcesDestroyed,contextUnconfigured:!!d?.contextUnconfigured,cleanupErrors:errors.slice()},
      audio:{disposeSettled:false,contextCount:audioContexts.length,contextClosed:audioContexts.every(a=>a.closeSettled&&!a.closeError),voicesCreated:sources.length,activeSources:audio.activeSources??null,voicesStoppedOrEnded:sources.every(s=>(s.stopCalls>0||s.ended)&&s.disconnectCalls>0&&s.errors.length===0),cleanupErrors:[...audioContexts.flatMap(a=>a.closeError?[a.closeError]:[]),...sources.flatMap(s=>s.errors)]},
      device:{status:'unknown',deviceId:d?.deviceId||null,queueId:d?.queueId||null,drained:false,submitSequence:d?.submitSequence??null,completedThroughSequence:Math.max(-1,...(d?.fences||[]).filter(f=>f.resolved).map(f=>f.throughSequence)),destroyCalls:d?.destroyCalls??0,destroyCalled:!!d?.destroyCalls,lostReason:d?.lostInfo?.reason??null,lostMessage:d?.lostInfo?.message??null,lostSettled:!!d?.lostSettled,bufferCount:d?.buffersCreated??0,textureCount:d?.texturesCreated??0,resourceInventoryComplete:resources.length>0&&resources.every(r=>r.destroySucceeded&&r.destroyCalls===1&&!r.destroyError),contextUnconfigured:!!d?.contextUnconfigured,queueFences:queueFences.map(f=>({deviceId:f.deviceId,queueId:f.queueId,throughSequence:f.throughSequence,settled:f.settled,resolved:f.resolved,error:f.error}))},
      cleanupErrors:errors.slice()};
  }
  function soundSnapshot(){try{return bound?.sound?.snapshot?.()||{contextState:'unavailable',activeSources:0}}catch{return {contextState:'snapshot-error',activeSources:null}}}
  async function retire(reason='parent-retired'){
    if(retirementPromise)return retirementPromise;
    retiring=true;
    retirementPromise=(async()=>{
      const startAt=now();let runtimeSettled=false,audioSettled=false,frameState=null;const localErrors=errors.map(e=>({phase:e.phase,message:e.message}));
      const collect=(phase,error)=>{localErrors.push({phase,message:String(error?.message||error)});addError(phase,error)};
      if(!bound||typeof bound.stop!=='function'||typeof bound.frameDrain?.disposeAndDrain!=='function'||typeof bound.runtime?.dispose!=='function'||typeof bound.sound?.dispose!=='function')collect('binding',new Error('retirement dependencies were not completely bound'));
      const d=devices.length===1?devices[0]:null;
      if(devices.length!==1)collect('device-inventory',new Error(`expected exactly one actual preview device; observed ${devices.length}`));
      bound?.frameDrain?.noteRetireRequested?.();
      const pumpBeforeStop=bound?.frameDrain?.getState?.()||null;
      try{bound?.stop?.(reason);bound?.frameDrain?.noteStopCalled?.()}catch(error){collect('stop',error)}
      try{frameState=await timeout(bound.frameDrain.disposeAndDrain(timeoutMs),timeoutMs,'frame pump drain')}catch(error){collect('frame-pump-drain',error)}
      const jobs=[];
      if(bound?.runtime?.dispose){jobs.push(timeout(bound.runtime.dispose(),timeoutMs,'actual runtime dispose').then(()=>{runtimeSettled=true},error=>collect('runtime-dispose',error)))}
      if(bound?.sound?.dispose){jobs.push(timeout(bound.sound.dispose(),timeoutMs,'actual audio dispose').then(()=>{audioSettled=true},error=>collect('audio-dispose',error)))}
      await Promise.all(jobs);
      const pendingFences=queues.flatMap(q=>q.fences).filter(f=>!f.settled);
      try{await timeout(Promise.all(pendingFences.map(f=>f.promise)),timeoutMs,'actual queue fence settlements')}catch(error){collect('queue-fence-settlement',error)}
      if(!d)collect('device-inventory',new Error('no unique same-device lifecycle record'));
      else{
        if(d.fences.some(f=>f.error))collect('queue-fence',new Error('same-device queue fence rejected; runtime may have swallowed this failure'));
        if(d.submitSequence<1)collect('queue-submit',new Error('no actual same-device GPU submission was observed'));
        if(!d.fences.some(f=>f.resolved&&f.throughSequence>=d.submitSequence))collect('queue-drain',new Error('no successful same-device fence covers final actual submit sequence'));
        if(!d.contextUnconfigured||!d.contextUnconfigureCalls)collect('context-unconfigure',new Error('same-device canvas context was not actually unconfigured'));
        if(d.destroyCalls!==1)collect('device-destroy',new Error(`expected one actual same-device destroy call, got ${d.destroyCalls}`));
        if(resources.length===0||resources.some(r=>!r.destroySucceeded||r.destroyCalls!==1||r.destroyError))collect('resource-release',new Error('actual created buffer/texture inventory is incomplete or not destroyed exactly once'));
        try{await timeout(d.lostPromise,timeoutMs,'same-device lost settlement')}catch(error){collect('device-lost',error)}
        if(d.lostInfo?.reason!=='destroyed')collect('device-lost-reason',new Error(`same-device loss reason was ${String(d.lostInfo?.reason)}`));
      }
      if(!runtimeSettled)collect('runtime-dispose',new Error('actual runtime dispose did not settle'));
      if(!audioSettled)collect('audio-dispose',new Error('actual sound dispose did not settle'));
      if(audioContexts.some(a=>!a.closeSettled||a.closeError))collect('audio-context-close',new Error('an owned audio context close did not succeed'));
      if(sources.some(s=>!(s.stopCalls>0||s.ended)||s.disconnectCalls===0||s.errors.length))collect('audio-voices',new Error('an owned voice was not stopped/ended and disconnected'));
      if(soundSnapshot().activeSources!==0)collect('audio-active-sources',new Error('actual sound snapshot retained active voices after dispose'));
      const lifecycle=currentLifecycle();lifecycle.disposeSettled=runtimeSettled&&audioSettled;lifecycle.teardown=localErrors.length?'unknown':'disposed';lifecycle.deviceLifecycle=localErrors.length?'unknown':'destroyed-loss-settled';lifecycle.renderer.disposeSettled=runtimeSettled;lifecycle.renderer.framePump={beforeStop:pumpBeforeStop,afterDrain:frameState,events:bound?.frameDrain?.snapshot?.().lifecycle||[]};lifecycle.renderer.queueDrained=d?.fences.length>0&&d.fences.every(f=>f.settled&&f.resolved);lifecycle.renderer.cleanupErrors=localErrors.filter(x=>x.phase==='runtime-dispose'||x.phase==='queue-fence'||x.phase==='queue-drain'||x.phase==='resource-release'||x.phase==='context-unconfigure').map(x=>x.message);lifecycle.audio.disposeSettled=audioSettled;lifecycle.audio.activeSources=soundSnapshot().activeSources??null;lifecycle.device.status=localErrors.length?'unknown':'destroyed-loss-settled';lifecycle.device.drained=!localErrors.length;lifecycle.device.destroyCalled=!!d?.destroyCalls;lifecycle.device.lostReason=d?.lostInfo?.reason??null;lifecycle.device.lostMessage=d?.lostInfo?.message??null;lifecycle.device.lostSettled=!!d?.lostSettled;lifecycle.reason=String(reason);lifecycle.durationMs=now()-startAt;
      if(localErrors.length){send({action:'retire-error',teardown:'unknown',error:{code:'QUANTUM_RETIREMENT_INCOMPLETE',message:localErrors.map(x=>`${x.phase}: ${x.message}`).join('; ').slice(0,1000)},lifecycle});return false}
      send({action:'retired',teardown:'disposed',lifecycle});return true;
    })();return retirementPromise;
  }
  function send({action,teardown,lifecycle,error}={}){
    if(!identityValid||!windowRef?.parent||windowRef.parent===windowRef)return false;
    sequence=Math.max(sequence,Number(startup?.snapshot?.().sequence)||0)+1;
    try{windowRef.parent.postMessage({schema:STARTUP_SCHEMA,action,token:identity.token,versionId:identity.versionId,attemptEpoch:identity.attemptEpoch,sequence,stage:'playing',status:action==='retired'?'ready':'error',teardown,lifecycle,error,packageSchema:identity.packageSchema,packageManifestSha256:identity.packageManifestSha256,packageSealSha256:identity.packageSealSha256,sourceManifestSha256:identity.sourceManifestSha256,originalSourceManifestSha256:identity.originalSourceManifestSha256},identity.parentOrigin);return true}catch(error){addError('post-message',error);return false}
  }
  return Object.freeze({identity,identityValid,install,bind,retire,isRetiring:()=>retiring,snapshot:()=>({identityValid,installed,errors:errors.slice(),devices:devices.map(d=>({deviceId:d.deviceId,queueId:d.queueId,submitSequence:d.submitSequence,destroyCalls:d.destroyCalls,lostSettled:d.lostSettled})),resources:resources.map(r=>({deviceId:r.deviceId,kind:r.kind,destroyCalls:r.destroyCalls,destroySucceeded:r.destroySucceeded})),contexts:contexts.map(c=>({configured:c.configured,unconfigured:c.unconfigured})),audio:{contexts:audioContexts.length,sources:sources.length}})});
}
