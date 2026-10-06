import { playWeaponSwitchCue } from './source/sfx.mjs';
import { ACTIVE_LIFETIME_SECONDS, PREVIEW_RECEIPT_INTERVAL_MS, VERSION_ID, drawReceiptAddedWhileHeld, effectiveReceiptAge, holdReceiptSet, isSuccessfulWeaponSwitchReceipt, projectFixtureWorldPoint, receiptIsLive, resumeReceiptSet } from './host-contract.mjs';

const VERSION = VERSION_ID;
const SOURCE_PINS = Object.freeze({
  main: '3f48b41d4a6d6c1cc983866e27aeb29aafc39b3bc7302376684bdf3cc18b0055',
  observer: 'f7f36b148e21ae22d27f41e05f56b9b75d532f516fca569d7dedfd7a32716a35',
  sfx: 'c0e1c2c0547587a70aa598a92b58cd108f74a96c63d2597cb5fb202a5825c1c5'
});

const MAX_INFLIGHT_UNIFORM_BUFFERS=24;
const params = new URL(location.href).searchParams;
const verify = params.has('verify');
const token = params.get('galleryStartupToken');
const versionId = params.get('galleryVersionId') || VERSION;
const epoch = Number(params.get('galleryAttemptEpoch'));
const canvas = document.querySelector('#view'), status = document.querySelector('#status');
const shaders = Object.freeze({ main: new URL('./source/weapon-switch.wgsl', import.meta.url).href,
  observer: new URL('./source/observer.wgsl', import.meta.url).href,
  sfx: new URL('./source/sfx.mjs', import.meta.url).href });
const sourceHashes = Object.create(null), events = [];
const state = { phase: 'child-document', sequence: 0, submittedFrames: 0, frameSerial: 0,
  passes: 0, generation: 0, initialized: false, ready: false, held: false, disposed: false, resizePending: true, inFlightUniformBuffers: 0,
  cause: null, pendingReceipts: [], latestError: null, loop: true, context: null, device: null, audio: null, audioEnabled: false, muted: false, targetGeneration: 0, deviceGeneration: 0 };
const live = () => !state.disposed;
function emit(stage, result, extra = {}) {
  state.phase = stage; state.sequence++;
  const msg = { schema:'dva-gallery-startup/v1', token, versionId, attemptEpoch:epoch,
    sequence:state.sequence, stage, status:result, ...extra };
  if (token && versionId && Number.isSafeInteger(epoch)) parent.postMessage(msg, location.origin);
  events.push({at:performance.now(), ...msg});
}
function snapshot() {
  return Object.freeze({schema:'dva-weapon-switch-snapshot/v1', phase:state.phase, initialized:state.initialized,
    generation:state.generation, frameSerial:state.frameSerial, submittedFrames:state.submittedFrames,
    passes:state.passes, cause:state.cause && {...state.cause}, sourceHashes:{...sourceHashes}, inFlightUniformBuffers:state.inFlightUniformBuffers,
    latestError:state.latestError, resizePending:state.resizePending, buffers:state.owned.size,
    held:state.held, verify, audioEnabled:state.audioEnabled,audioState:state.audio?.state||null,events:events.slice()});
}
window.__weaponSwitchSnapshot = snapshot;
window.__weaponSwitchHold = age => {
  if(!live()||state.held)return false;
  const requested=Number.isFinite(Number(age))?Number(age):null;
  const held=holdReceiptSet(state,performance.now(),requested,(fixedAge,generation)=>draw(fixedAge,generation));
  if(held)for(const cause of state.active)cancelCauseSfx(cause);
  return held;
};
window.__weaponSwitchResume = () => {
  if(!live()||!state.held)return false;
  resumeReceiptSet(state,performance.now());state.loop=true;schedule();return true;
};
window.__weaponSwitchDispose = dispose;

const responseText = async (url, key) => {
  const response=await fetch(url); if(!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`);
  const text=await response.text(); const bytes=new TextEncoder().encode(text);
  sourceHashes[key]=await crypto.subtle.digest('SHA-256',bytes).then(b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''));
  if(sourceHashes[key]!==SOURCE_PINS[key]) throw Object.assign(new Error(`Pinned ${key} source hash mismatch.`),{code:'SOURCE_PIN_MISMATCH',source:key,actual:sourceHashes[key],expected:SOURCE_PINS[key]});
  return text;
};
const align = (n,a) => Math.ceil(n/a)*a;
const fmtError = e => ({name:e?.name||'Error',message:String(e?.message||e),code:e?.code||'WEBGPU_INIT_FAILED'});
const owned = new Set(); state.owned=owned;
let mainPipeline, obsPipeline, compositePipeline, mainBgl, obsBgl, compositeBgl, lastW=0,lastH=0,raf=0;
function initCanvasSize() {
  const dpr=Math.max(1,devicePixelRatio||1), rect=canvas.getBoundingClientRect();
  const w=Math.max(1,Math.round(rect.width*dpr)), h=Math.max(1,Math.round(rect.height*dpr));
  state.resizePending=false;
  if(w===lastW&&h===lastH)return false;
  lastW=w;lastH=h;canvas.width=w;canvas.height=h;state.targetGeneration++;
  for(const set of owned) { set.retired=true; if(set.lastUse)set.lastUse.then(()=>disposeSet(set),()=>disposeSet(set)); else disposeSet(set); }
  currentSet=null;
  return true;
}
function makeSet() {
  const main=state.device.createTexture({size:[lastW,lastH],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  const obs=state.device.createTexture({size:[lastW,lastH],format:state.context.getCurrentTexture().format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  const buffers=[];state.targetGeneration++;
  const set={main,obs,buffers,lastUse:Promise.resolve(),useSerial:0,retired:false,destroyed:false,targetGeneration:state.targetGeneration}; owned.add(set); return set;
}
function disposeSet(set) { if(!set||set.destroyed)return; set.destroyed=true; try{set.main.destroy();}catch{} try{set.obs.destroy();}catch{} for(const b of set.buffers.splice(0)){try{b.destroy();}catch{}} owned.delete(set); if(currentSet===set)currentSet=null; }
let currentSet=null;
function currentGeneration(g) { return live()&&g===state.generation&&!state.held; }
function expireCause(cause) {
  if(!cause || cause.cleared)return;
  cancelCauseSfx(cause);cause.cleared=true; cause.expiredAt=performance.now();
  draw(0.78,cause.generation,{forceClear:true});
  state.active.delete(cause);
  if(state.cause===cause) state.cause=null;
}

function allocateUniform(set,age,cause) {
  const bytes=new ArrayBuffer(48), f=new Float32Array(bytes), dpr=Math.max(1,devicePixelRatio||1), hpx=64*dpr;
  f.set([lastW,lastH,lastW*.5+(cause?.x||0)*dpr,lastH*.5+(cause?.y||0)*dpr,age,hpx,cause?.variant??0,matchMedia('(prefers-reduced-motion: reduce)').matches?1:0,1,1,1,1]);
  const buffer=state.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  state.device.queue.writeBuffer(buffer,0,bytes);set.buffers.push(buffer);state.inFlightUniformBuffers++;return buffer;
}
const MAIN_SUPPORT_RECTS = Object.freeze([
  Object.freeze([[-.12,.12,-.08,.08],[.03,.41,-.07,.02],[-.09,0,.03,.24]]),
  Object.freeze([[-.16,.16,-.09,.09],[.02,.48,-.075,.025],[-.09,0,.03,.24],[.054,.126,.065,.235]]),
  Object.freeze([[-.17,.17,-.085,.085],[-.01,.59,-.065,.015],[-.09,0,.03,.24],[.054,.126,.065,.235],[-.34,-.15,-.035,.055]]),
  Object.freeze([[-.14,.14,-.07,.07],[-.05,.65,-.053,.003],[-.09,0,.03,.24],[-.34,-.15,-.035,.055],[-.035,.185,-.133,-.077]]),
  Object.freeze([[-.10,.10,-.09,.09],[.03,.31,-.07,0],[-.09,0,.03,.24]])
]);
const MAIN_ROWS = Object.freeze([
  Object.freeze({lo:-Infinity,hi:-.0263,direction:-1}),
  Object.freeze({lo:-.0137,hi:.1137,direction:1}),
  Object.freeze({lo:.1263,hi:Infinity,direction:-1})
]);
const clamp01=x=>Math.max(0,Math.min(1,x));
const smoothstep01=x=>{const v=clamp01(x);return v*v*(3-2*v);};
function shaderSupportForCause(cause,age){
  if(!cause||!Number.isInteger(cause.variant)||cause.variant<0||cause.variant>4||!Number.isFinite(age)||age<=.06||age>=.78||!lastW||!lastH)return null;
  if(!mainPipeline||sourceHashes.main!==SOURCE_PINS.main)return null;
  const onset=smoothstep01((age-.06)/.08),fade=1-smoothstep01((age-.57)/.21);
  if(!(onset>0&&fade>0))return null;
  const dpr=Math.max(1,devicePixelRatio||1),h=64*dpr;
  const clipX0=Math.max(-.92,-lastW/(2*h)),clipX1=Math.min(.92,lastW/(2*h));
  const clipY0=Math.max(-.52,-lastH/(2*h)),clipY1=Math.min(.52,lastH/(2*h));
  if(!(clipX1>clipX0&&clipY1>clipY0))return null;
  const cx=cause.x*dpr/h,cy=cause.y*dpr/h;
  const arrival=smoothstep01((age-.12)/.24),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const travel=(1-arrival)*(reduced?.06:.28);
  for(let ri=0;ri<MAIN_ROWS.length;ri++)for(let bi=0;bi<MAIN_SUPPORT_RECTS[cause.variant].length;bi++){
    const [x0,x1,y0,y1]=MAIN_SUPPORT_RECTS[cause.variant][bi],row=MAIN_ROWS[ri];
    const py0=Math.max(y0+cy,row.lo,clipY0),py1=Math.min(y1+cy,row.hi,clipY1);
    if(py1-py0<.006)continue;
    const shift=cx+.035+row.direction*travel;
    const px0=Math.max(x0+shift,clipX0),px1=Math.min(x1+shift,clipX1);
    if(px1-px0>=.006)return Object.freeze({phaseAge:age,onset,fade,row:ri,rect:bi,supportArea:(px1-px0)*(py1-py0),pixelMeasured:false});
  }
  return null;
}
function finishProofWaiter(waiter,proof){
  if(waiter.done)return;waiter.done=true;clearTimeout(waiter.timer);state.proofWaiters.delete(waiter);if(waiter.cause.sfxWaitCancel===waiter.cancel)waiter.cause.sfxWaitCancel=null;waiter.resolve(proof);
}
function publishCompletedProof(cause,proof){
  if(!cause||cause.cleared||!state.active.has(cause)||state.cause!==cause||cause.generation!==proof.receiptGeneration||proof.device!==state.device||proof.deviceGeneration!==state.deviceGeneration||proof.targetGeneration!==state.targetGeneration||proof.set!==currentSet)return false;
  cause.completedGpuProof=proof;
  for(const waiter of [...state.proofWaiters])if(waiter.cause===cause)finishProofWaiter(waiter,proof);
  return true;
}
function waitForCompletedProof(cause,deadline){
  const previous=cause.completedGpuProof;
  if(previous&&previous.device===state.device&&previous.deviceGeneration===state.deviceGeneration&&previous.targetGeneration===state.targetGeneration&&previous.set===currentSet)return {promise:Promise.resolve(previous),cancel:()=>{}};
  let resolve;const promise=new Promise(r=>{resolve=r;}),waiter={cause,resolve,done:false,timer:null,cancel:null};
  waiter.cancel=()=>finishProofWaiter(waiter,null);waiter.timer=setTimeout(()=>finishProofWaiter(waiter,null),Math.max(0,deadline-performance.now()));
  state.proofWaiters.add(waiter);cause.sfxWaitCancel=waiter.cancel;return {promise,cancel:waiter.cancel};
}
function cancelCauseSfx(cause,{suppress=true}={}){
  if(!cause)return;if(suppress)cause.sfxSuppressed=true;
  if(cause.sfxWaitCancel){try{cause.sfxWaitCancel();}catch{}cause.sfxWaitCancel=null;}
  if(cause.sfx){try{cause.sfx.cancel();}catch{}cause.sfx=null;}
}

function sfxEnvironmentReady(context=state.audio){
  return !verify&&!params.has('verify')&&!state.disposed&&state.initialized&&state.ready&&!!state.device&&
    !state.muted&&!state.latestError&&!!context&&context===state.audio&&context.state==='running';
}
function completedCauseProof(cause,proof){
  return !!proof&&proof.completed===true&&proof.activeDrawSubmitted===true&&proof.mainEnabled===true&&
    proof.pixelMeasured===false&&proof.causeId===cause.id&&proof.receiptGeneration===cause.generation&&
    proof.device===state.device&&proof.deviceGeneration===state.deviceGeneration&&
    proof.targetGeneration===state.targetGeneration&&proof.set===currentSet&&
    proof.sourceHash===SOURCE_PINS.main&&sourceHashes.main===SOURCE_PINS.main&&
    proof.activeGeometrySupport?.supportArea>0;
}
function requestCauseSfx(cause,{resumePromise=Promise.resolve(),allowUnlock=false}={}){
  if(!cause||cause.sfxAttempted||state.held||cause.sfxSuppressed||!live()||
    state.cause!==cause||!state.active.has(cause)||cause.cleared||state.muted||state.latestError||verify||params.has('verify'))return null;
  const context=state.audio;
  if(!context||context!==state.audio||(!allowUnlock&&(!state.audioEnabled||context.state!=='running')))return null;
  const admittedAt=performance.now(),admissionAge=(admittedAt-cause.receivedAt)/1000;
  if(!Number.isFinite(admissionAge)||admissionAge<0||admissionAge>.06)return null;
  cause.sfxAdmittedAt=admittedAt;cause.sfxAdmissionAge=admissionAge;cause.sfxAttempted=true;
  const deadline=cause.receivedAt+580,proofWait=waitForCompletedProof(cause,deadline);
  cause.sfxWaitCancel=proofWait.cancel;
  cause.sfxPromise=Promise.all([Promise.resolve(resumePromise),proofWait.promise]).then(([,proof])=>{
    const playedAt=performance.now(),age=(playedAt-cause.receivedAt)/1000;
    const admissionUnchanged=cause.sfxAdmittedAt===admittedAt&&cause.sfxAdmissionAge===admissionAge&&
      Number.isFinite(cause.sfxAdmissionAge)&&cause.sfxAdmissionAge>=0&&cause.sfxAdmissionAge<=.06;
    if(!sfxEnvironmentReady(context)||state.held||state.cause!==cause||cause.generation!==state.cause?.generation||
      !state.active.has(cause)||cause.cleared||cause.sfxSuppressed||cause.sfx||!admissionUnchanged||
      !completedCauseProof(cause,proof)||!Number.isFinite(age)||age<0||age+.004>=.58)
      return {state:'stale',reason:'same-cause active proof, original admission, or 580 ms seek window expired'};
    cause.sfxWaitCancel=null;
    const cue=playWeaponSwitchCue(context,context.destination,{verify:false,muted:state.muted,age,variant:cause.variant});
    if(!cue)return {state:'stale',reason:'sound window ended before seek could be scheduled'};
    cause.sfx=cue;return {state:'active'};
  },()=>({state:'unsupported',reason:'AudioContext resume rejected'}));
  return cause.sfxPromise;
}

function draw(age,generation,{forceClear=false}={}) {
  if(!state.initialized||!live()||!lastW||!lastH) return null;
  const frameNow=performance.now();
  const causes=forceClear?[]:[...state.active].filter(c=>!c.cleared&&receiptIsLive(effectiveReceiptAge(c,frameNow)));
  const cause=causes.at(-1)||null, active=causes.length>0;
  if(!active&&!forceClear) return null;
  const requiredUniforms=active?causes.length:1;
  if(state.inFlightUniformBuffers+requiredUniforms>MAX_INFLIGHT_UNIFORM_BUFFERS){
    const error={code:'GPU_SUBMISSION_BACKPRESSURE',message:'Preview GPU submissions are still completing; this receipt was not rendered.'};
    state.latestError=error;status.textContent=error.message;emit('playing','error',{error});return null;
  }
  if(!currentSet || currentSet.retired) {
    if(owned.size>=4) {
      const error={code:'GPU_RESOURCE_LIMIT',message:'Preview GPU resources are still retiring; this receipt was not rendered.'};
      state.latestError=error; status.textContent=error.message; emit('playing','error',{error}); return null;
    }
    currentSet=makeSet();
  }
  const set=currentSet, device=state.device;
  const encoder=device.createCommandEncoder();
  const clear={r:0,g:0,b:0,a:0};
  const pass=encoder.beginRenderPass({colorAttachments:[{view:set.main.createView(),clearValue:clear,loadOp:'clear',storeOp:'store'}]});
  let observerUniform=null;
  const proofCandidates=[];
  if(active){pass.setPipeline(mainPipeline);for(const item of causes){const a=effectiveReceiptAge(item,frameNow);if(receiptIsLive(a)){observerUniform=allocateUniform(set,a,item);const bg=device.createBindGroup({layout:mainBgl,entries:[{binding:0,resource:{buffer:observerUniform}}]});pass.setBindGroup(0,bg);pass.draw(3);const support=shaderSupportForCause(item,a);if(support)proofCandidates.push({cause:item,support});}}} pass.end();
  if(!observerUniform)observerUniform=allocateUniform(set,.78,null);
  const observerBind=device.createBindGroup({layout:obsBgl,entries:[{binding:0,resource:set.main.createView()},{binding:1,resource:{buffer:observerUniform}}]});
  const p2=encoder.beginRenderPass({colorAttachments:[{view:set.obs.createView(),clearValue:clear,loadOp:'clear',storeOp:'store'}]});
  if(active){p2.setPipeline(obsPipeline);p2.setBindGroup(0,observerBind);p2.draw(3);} p2.end();
  const p3=encoder.beginRenderPass({colorAttachments:[{view:state.context.getCurrentTexture().createView(),clearValue:clear,loadOp:'clear',storeOp:'store'}]});
  if(active){p3.setPipeline(compositePipeline);p3.setBindGroup(0,device.createBindGroup({layout:compositeBgl,entries:[{binding:0,resource:set.obs.createView()}]}));p3.draw(3);} p3.end();
  device.queue.submit([encoder.finish()]);
  state.latestError=null; status.textContent=active?'Weapon switch preview active.':'WebGPU ready; waiting for a successful receipt.'; state.phase='playing';
  const serial=++state.frameSerial; if(active){state.submittedFrames++;state.passes++;}
  const proof={serial,age,sourceHashes:{...sourceHashes},causeId:cause?.id||null,generation,submit:state.submittedFrames};
  const pendingProofs=proofCandidates.map(({cause:item,support})=>({cause:item,record:{schema:'dva-active-geometry-proof/v1',causeId:item.id,receiptGeneration:item.generation,serial,submit:state.submittedFrames,device,targetGeneration:set.targetGeneration,deviceGeneration:state.deviceGeneration,sourceHash:sourceHashes.main,mainEnabled:true,activeDrawSubmitted:true,activeGeometrySupport:support,pixelMeasured:false,set,completed:false}}));
  const submittedBuffers=set.buffers.splice(0), useSerial=++set.useSerial;
  const fence=device.queue.onSubmittedWorkDone(); set.lastUse=fence;
  fence.then(()=>{events.push({at:performance.now(),kind:'fence',...proof});for(const {cause:item,record} of pendingProofs){record.completed=true;record.completedAt=performance.now();publishCompletedProof(item,record);}for(const b of submittedBuffers){try{b.destroy();}catch{} state.inFlightUniformBuffers=Math.max(0,state.inFlightUniformBuffers-1);}if(set.retired&&set.useSerial===useSerial)disposeSet(set);},e=>{for(const b of submittedBuffers){try{b.destroy();}catch{} state.inFlightUniformBuffers=Math.max(0,state.inFlightUniformBuffers-1);}const error={code:'GPU_SUBMISSION_FAILED',message:fmtError(e).message};state.latestError=error;status.textContent=error.message;emit('playing','error',{error});events.push({at:performance.now(),kind:'fence-error',error:fmtError(e),...proof});if(set.retired&&set.useSerial===useSerial)disposeSet(set);});
  if(!active&&cause) expireCause(cause);
  return proof;
}
function schedule() { if(!live()||state.held||raf||!state.initialized)return; raf=requestAnimationFrame(tick); }
function tick() {
  raf=0;if(!live()||state.held)return;
  const cause=state.cause;
  if(cause&&!cause.cleared){const age=effectiveReceiptAge(cause,performance.now());
    if(!receiptIsLive(age))expireCause(cause);
    else draw(age,cause.generation);
  }
  if(state.loop) schedule();
}
function activateReceipt(input,receivedAt,fixtureSelection=false) {
  const age=(performance.now()-receivedAt)/1000;
  if(!receiptIsLive(age))return false;
  if(fixtureSelection){
    for(const prior of [...state.active])if(prior.fixtureSelection){
      prior.cleared=true;
      cancelCauseSfx(prior);
      state.active.delete(prior);
      if(state.cause===prior)state.cause=null;
      events.push({at:performance.now(),kind:'fixture-preview-replaced',id:prior.id,variant:prior.variant,generation:prior.generation});
    }
  }
  const old=[...state.active].sort((a,b)=>a.receivedAt-b.receivedAt);
  const cause={id:input.id,x:input.x,y:input.y,variant:input.variant,generation:++state.generation,receivedAt,cleared:false,sfx:null,sfxSuppressed:state.held,sfxPromise:null,sfxAdmittedAt:null,sfxAdmissionAge:null,completedGpuProof:null,fixtureSelection};
  if(old.length>=4){const evict=old[0];cancelCauseSfx(evict);evict.cleared=true;draw(.78,evict.generation,{forceClear:true});state.active.delete(evict);}
  state.active.add(cause);state.cause=cause;events.push({at:cause.receivedAt,kind:'receipt',id:cause.id,variant:cause.variant,generation:cause.generation,fixtureSelection});
  if(!drawReceiptAddedWhileHeld(state,cause,performance.now(),(fixedAge,generation)=>draw(fixedAge,generation)))schedule();
  if(state.audioEnabled)requestCauseSfx(cause);
  return true;
}
function acceptReceipt(input,receivedAt=performance.now(),fixtureSelection=false) {
  if(!live()||!isSuccessfulWeaponSwitchReceipt(input)) return false;
  if(state.seen.has(input.id)) return false;
  state.seen.add(input.id);
  if(!state.ready){state.pendingReceipts.push({input:{...input},receivedAt,fixtureSelection});return true;}
  return activateReceipt(input,receivedAt,fixtureSelection);
}
state.seen=new Set();state.active=new Set();state.proofWaiters=new Set();
const projectReceipt=receipt=>{
  const point=projectFixtureWorldPoint(receipt.x,receipt.y,lastW,lastH,Math.max(1,devicePixelRatio||1));
  return {...receipt,x:point.x,y:point.y};
};
window.__weaponSwitchReceipt=(id,x,y,variant)=>{
  const receipt=typeof id==='object'?id:{id,x,y,variant};
  // Ordinary successful receipts retain the established multi-event behavior.
  return acceptReceipt(projectReceipt(receipt));
};
window.__weaponSwitchFixtureSelection=receipt=>{
  if(!receipt||typeof receipt!=='object')return false;
  return acceptReceipt(projectReceipt(receipt),performance.now(),true);
};
window.addEventListener('message',e=>{
  if(e.source!==parent||e.origin!==location.origin)return;
  const d=e.data;
  if(d?.schema==='dva-gallery-startup/v1'&&d.action==='retire'&&d.token===token&&d.versionId===versionId&&d.attemptEpoch===epoch){dispose('retired');return;}
  if(d?.schema==='dva-weapon-switch-receipt/v1') acceptReceipt(d.receipt);
});
document.querySelector('#variant').addEventListener('change',e=>{if(state.initialized)window.__weaponSwitchFixtureSelection({id:`manual-fixture-${crypto.randomUUID()}`,x:.5,y:.5,variant:Number(e.target.value)});});
document.querySelector('#hold').onclick=()=>window.__weaponSwitchHold();
document.querySelector('#resume').onclick=()=>window.__weaponSwitchResume();
function cancelCurrent() { for(const c of [...state.active]){cancelCauseSfx(c);c.cleared=true;} for(const waiter of [...state.proofWaiters])finishProofWaiter(waiter,null);state.active.clear();state.cause=null;state.generation++;if(raf)cancelAnimationFrame(raf);raf=0;try{draw(.78,state.generation,{forceClear:true});}catch{} }
function dispose(reason='disposed') { if(state.disposed)return; cancelCurrent();state.disposed=true;state.ready=false;state.loop=false;state.resizeObserver?.disconnect();if(state.resizeHandler)window.removeEventListener('resize',state.resizeHandler);state.audio?.close?.();if(reason!=='device-lost'&&reason!=='startup-error')emit('playing','cancelled',{error:{code:'RETIRED',message:reason}});const retiring=[...owned];for(const set of retiring){set.retired=true;if(set.lastUse)set.lastUse.then(()=>disposeSet(set),()=>disposeSet(set));else disposeSet(set);}Promise.all(retiring.map(set=>set.lastUse?.catch?.(()=>{})??Promise.resolve())).finally(()=>{try{state.device?.destroy?.();}catch{}}); }
window.addEventListener('pagehide',()=>dispose('pagehide'),{once:true});
async function boot() {
  if(!live())return;
  emit('child-document','pending');emit('adapter','pending');
  if(!navigator.gpu){emit('device','unsupported',{error:{code:'WEBGPU_UNAVAILABLE',message:'This preview requires WebGPU.'}});status.textContent='WebGPU is unavailable.';return;}
  try {
    emit('device','pending');const adapter=await navigator.gpu.requestAdapter();if(!live())return;if(!adapter)throw new Error('No WebGPU adapter.');
    const device=await adapter.requestDevice();if(!live()){device.destroy();return;}state.device=device;state.deviceGeneration++;
    device.lost.then(info=>{if(live()){const error={code:'WEBGPU_DEVICE_LOST',message:info?.message||'WebGPU device was lost.',reason:info?.reason||'unknown'};state.latestError=error;status.textContent=error.message;emit('playing','error',{error});dispose('device-lost');}});
    state.context=canvas.getContext('webgpu');if(!state.context)throw new Error('Canvas could not create a WebGPU context.');
    state.context.configure({device,format:navigator.gpu.getPreferredCanvasFormat(),alphaMode:'premultiplied'});
    emit('assets','pending');
    if(params.has('embed')&&versionId!==VERSION) throw Object.assign(new Error(`This entry is pinned to ${VERSION}.`),{code:'VERSION_PIN_MISMATCH'});
    const [mainCode,obsCode]=await Promise.all([responseText(shaders.main,'main'),responseText(shaders.observer,'observer'),responseText(shaders.sfx,'sfx')]);if(!live())return;
    emit('pipelines','pending');const compositeCode='@group(0) @binding(0) var src:texture_2d<f32>; struct O{@builtin(position) p:vec4<f32>}; @vertex fn vs(@builtin(vertex_index) n:u32)->O{let a=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));var o:O;o.p=vec4<f32>(a[n],0.,1.);return o;} @fragment fn fs(o:O)->@location(0) vec4<f32>{return textureLoad(src,vec2<i32>(o.p.xy),0);}';
    const mainModule=device.createShaderModule({label:'weapon-switch.wgsl',code:mainCode}),obsModule=device.createShaderModule({label:'observer.wgsl',code:obsCode}),compositeModule=device.createShaderModule({label:'gallery-composite',code:compositeCode});
    const diagnostics=await Promise.all([mainModule.getCompilationInfo(),obsModule.getCompilationInfo(),compositeModule.getCompilationInfo()]);if(!live())return;
    for(let i=0;i<diagnostics.length;i++)for(const m of diagnostics[i].messages){const row={module:['weapon-switch.wgsl','observer.wgsl','gallery-composite'][i],message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length};events.push({at:performance.now(),kind:'compilation-message',...row});if(m.type==='error')throw Object.assign(new Error(row.message),{diagnostic:row});}
    const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
    mainBgl=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}]});
    obsBgl=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}]});
    const pl=device.createPipelineLayout({bindGroupLayouts:[mainBgl]}),ol=device.createPipelineLayout({bindGroupLayouts:[obsBgl]});
    mainPipeline=device.createRenderPipeline({layout:pl,vertex:{module:mainModule,entryPoint:'vs'},fragment:{module:mainModule,entryPoint:'fs',targets:[{format:'rgba16float',blend}]},primitive:{topology:'triangle-list'}});
    obsPipeline=device.createRenderPipeline({layout:ol,vertex:{module:obsModule,entryPoint:'vs'},fragment:{module:obsModule,entryPoint:'fs',targets:[{format:state.context.getCurrentTexture().format,blend}]},primitive:{topology:'triangle-list'}});
    compositeBgl=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float'}}]});
    compositePipeline=device.createRenderPipeline({layout:device.createPipelineLayout({bindGroupLayouts:[compositeBgl]}),vertex:{module:compositeModule,entryPoint:'vs'},fragment:{module:compositeModule,entryPoint:'fs',targets:[{format:state.context.getCurrentTexture().format,blend}]},primitive:{topology:'triangle-list'}});
    emit('pipelines','ready');
    const obsBuffer=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});obsBuffer.destroy();
    const observerView=device.createTexture({size:[1,1],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});observerView.destroy();
    const initSize=()=>{state.resizePending=true;if(!state.initialized)return;initCanvasSize();};
    state.resizeObserver=new ResizeObserver(initSize);state.resizeObserver.observe(canvas);state.resizeHandler=initSize;window.addEventListener('resize',initSize);
    initCanvasSize();state.initialized=true;
    // One transparent WebGPU clear before any active cause; no idle RAF/submissions thereafter.
    draw(.78,state.generation,{forceClear:true});await device.queue.onSubmittedWorkDone();if(!live())return;
    const proof={recorded:true,submitted:true,completed:true,canvasConnected:canvas.isConnected,passes:1,viewportWidth:lastW,viewportHeight:lastH,frameSerial:state.frameSerial};
    state.ready=true;emit('playing','ready',{firstFrame:proof,versionId:VERSION,sourcePins:{...sourceHashes}});status.textContent='WebGPU ready; waiting for a successful receipt.';state.phase='playing';
    const pending=state.pendingReceipts.splice(0);for(const item of pending)activateReceipt(item.input,item.receivedAt,item.fixtureSelection===true);
    state.muted=verify||params.get('mute')==='1';
    // Embedded gallery supplies successful receipts; standalone fixture autoplays a finite synthetic demonstrator.
    if(!params.has('embed')) {state.loop=true;const run=()=>{if(!live()||!state.loop)return;if(state.held){setTimeout(run,PREVIEW_RECEIPT_INTERVAL_MS);return;}const variant=Number(document.querySelector('#variant').value);window.__weaponSwitchReceipt({id:`fixture-${crypto.randomUUID()}`,x:0,y:0,variant});setTimeout(run,PREVIEW_RECEIPT_INTERVAL_MS);};setTimeout(run,250);}
  } catch(e){if(!live())return;const err=fmtError(e);state.latestError={...err,diagnostic:e?.diagnostic||null,sourceHashes:{...sourceHashes},phase:state.phase};status.textContent=`${versionId||'weapon-switch'} failed: ${err.message}`;emit(state.phase,'error',{error:state.latestError});dispose('startup-error');}
}
boot();

// A trusted gesture unlocks the child context independently of the current receipt.
// Every subsequently admitted fresh cause reuses that context but remains proof-gated.
window.__gallerySfx={activateFromGesture(){
  if(verify||params.has('verify'))return {state:'silent',reason:'verification mode'};
  if(state.disposed||!state.initialized||!state.ready||!state.device)return {state:'unavailable',reason:'preview device is not ready'};
  if(state.latestError)return {state:'unavailable',reason:'preview runtime has an active error'};
  if(state.muted)return {state:'silent',reason:'preview is muted'};
  if(!state.audio){try{state.audio=new AudioContext();}catch{return {state:'unsupported',reason:'AudioContext creation failed'};}}
  const context=state.audio;
  let resumePromise;try{resumePromise=Promise.resolve(context.resume());}catch{return {state:'unsupported',reason:'AudioContext resume rejected'};}
  const cause=state.cause;
  if(!state.held&&cause&&!cause.cleared&&!cause.sfxSuppressed&&state.active.has(cause))
    requestCauseSfx(cause,{resumePromise,allowUnlock:true});
  return resumePromise.then(()=>{
    if(verify||params.has('verify'))return {state:'silent',reason:'verification mode'};
    if(!sfxEnvironmentReady(context)){state.audioEnabled=false;return state.disposed||!state.ready||!state.device
      ?{state:'unavailable',reason:'preview is no longer ready'}
      :{state:'unsupported',reason:'AudioContext did not resume to running ('+(context.state||'unknown')+').'};}
    state.audioEnabled=true;
    const current=state.cause,age=current?(performance.now()-current.receivedAt)/1000:Infinity;
    if(!state.held&&current&&!current.sfxAttempted&&!current.cleared&&!current.sfxSuppressed&&
      state.active.has(current)&&Number.isFinite(age)&&age>=0&&age<=.06)
      requestCauseSfx(current);
    return {state:'active',reason:'authored SFX enabled for fresh successful receipts'};
  },()=>{state.audioEnabled=false;return {state:'unsupported',reason:'AudioContext resume rejected'};});
}};
