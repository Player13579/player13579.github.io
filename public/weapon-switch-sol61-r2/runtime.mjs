import { playWeaponSwitchCue } from './source/sfx.mjs';
import { ACTIVE_LIFETIME_SECONDS, PREVIEW_RECEIPT_INTERVAL_MS, VERSION_ID, drawReceiptAddedWhileHeld, effectiveReceiptAge, holdReceiptSet, isSuccessfulWeaponSwitchReceipt, projectFixtureWorldPoint, receiptIsLive, resumeReceiptSet } from './host-contract.mjs';

const VERSION = VERSION_ID;
const SOURCE_PINS = Object.freeze({
  main: '3f48b41d4a6d6c1cc983866e27aeb29aafc39b3bc7302376684bdf3cc18b0055',
  observer: 'f7f36b148e21ae22d27f41e05f56b9b75d532f516fca569d7dedfd7a32716a35',
  sfx: 'a3510179dd63f83cc237b1d7b8430dc1572e4fc570a623a1c92be882d3e48801'
});

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
  passes: 0, generation: 0, initialized: false, ready: false, held: false, disposed: false, resizePending: true,
  cause: null, pendingReceipts: [], latestError: null, loop: true, context: null, device: null, audio: null, muted: false };
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
    passes:state.passes, cause:state.cause && {...state.cause}, sourceHashes:{...sourceHashes},
    latestError:state.latestError, resizePending:state.resizePending, buffers:state.owned.size,
    held:state.held, verify, events:events.slice()});
}
window.__weaponSwitchSnapshot = snapshot;
window.__weaponSwitchHold = age => {
  if(!live()||state.held)return false;
  const requested=Number.isFinite(Number(age))?Number(age):null;
  const held=holdReceiptSet(state,performance.now(),requested,(fixedAge,generation)=>draw(fixedAge,generation));
  if(held)for(const cause of state.active){cause.sfxSuppressed=true;if(cause.sfx){try{cause.sfx.cancel();}catch{}cause.sfx=null;}}
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
  lastW=w;lastH=h;canvas.width=w;canvas.height=h;
  for(const set of owned) { set.retired=true; set.ready.then(()=>{set.main.destroy();set.obs.destroy();owned.delete(set);}); }
  return true;
}
function makeSet() {
  const main=state.device.createTexture({size:[lastW,lastH],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  const obs=state.device.createTexture({size:[lastW,lastH],format:state.context.getCurrentTexture().format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  const buffers=[];
  const set={main,obs,buffers,ready:Promise.resolve(),retired:false}; owned.add(set); return set;
}
let currentSet=null;
function currentGeneration(g) { return live()&&g===state.generation&&!state.held; }
function expireCause(cause) {
  if(!cause || cause.cleared)return;
  cause.cleared=true; cause.expiredAt=performance.now();
  draw(0.78,cause.generation,{forceClear:true});
  state.active.delete(cause);
  if(state.cause===cause) state.cause=null;
  if(cause.sfx) { try{cause.sfx.cancel();}catch{} cause.sfx=null; }
}
function allocateUniform(set,age,cause) {
  const bytes=new ArrayBuffer(48), f=new Float32Array(bytes), dpr=Math.max(1,devicePixelRatio||1), hpx=64*dpr;
  f.set([lastW,lastH,lastW*.5+(cause?.x||0)*dpr,lastH*.5+(cause?.y||0)*dpr,age,hpx,cause?.variant??0,matchMedia('(prefers-reduced-motion: reduce)').matches?1:0,1,1,1,1]);
  const buffer=state.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  state.device.queue.writeBuffer(buffer,0,bytes);set.buffers.push(buffer);return buffer;
}
function draw(age,generation,{forceClear=false}={}) {
  if(!state.initialized||!live()||!lastW||!lastH) return null;
  const frameNow=performance.now();
  const causes=forceClear?[]:[...state.active].filter(c=>!c.cleared&&receiptIsLive(effectiveReceiptAge(c,frameNow)));
  const cause=causes.at(-1)||null, active=causes.length>0;
  if(!active&&!forceClear) return null;
  if(!currentSet || currentSet.retired || currentSet.buffers.length+causes.length>4) {
    if(owned.size>=4)return null;
    currentSet=makeSet();
  }
  const set=currentSet, device=state.device;
  const encoder=device.createCommandEncoder();
  const clear={r:0,g:0,b:0,a:0};
  const pass=encoder.beginRenderPass({colorAttachments:[{view:set.main.createView(),clearValue:clear,loadOp:'clear',storeOp:'store'}]});
  let observerUniform=null;
  if(active){pass.setPipeline(mainPipeline);for(const item of causes){const a=effectiveReceiptAge(item,frameNow);if(receiptIsLive(a)){observerUniform=allocateUniform(set,a,item);const bg=device.createBindGroup({layout:mainBgl,entries:[{binding:0,resource:{buffer:observerUniform}}]});pass.setBindGroup(0,bg);pass.draw(3);}}} pass.end();
  if(!observerUniform)observerUniform=allocateUniform(set,.78,null);
  const observerBind=device.createBindGroup({layout:obsBgl,entries:[{binding:0,resource:set.main.createView()},{binding:1,resource:{buffer:observerUniform}}]});
  const p2=encoder.beginRenderPass({colorAttachments:[{view:set.obs.createView(),clearValue:clear,loadOp:'clear',storeOp:'store'}]});
  if(active){p2.setPipeline(obsPipeline);p2.setBindGroup(0,observerBind);p2.draw(3);} p2.end();
  const p3=encoder.beginRenderPass({colorAttachments:[{view:state.context.getCurrentTexture().createView(),clearValue:clear,loadOp:'clear',storeOp:'store'}]});
  if(active){p3.setPipeline(compositePipeline);p3.setBindGroup(0,device.createBindGroup({layout:compositeBgl,entries:[{binding:0,resource:set.obs.createView()}]}));p3.draw(3);} p3.end();
  device.queue.submit([encoder.finish()]);
  const serial=++state.frameSerial; if(active){state.submittedFrames++;state.passes++;}
  const proof={serial,age,sourceHashes:{...sourceHashes},causeId:cause?.id||null,generation,submit:state.submittedFrames};
  set.ready=device.queue.onSubmittedWorkDone().then(()=>{events.push({at:performance.now(),kind:'fence',...proof});for(const b of set.buffers)b.destroy();set.buffers.length=0;if(set.retired){set.main.destroy();set.obs.destroy();owned.delete(set);}},e=>events.push({at:performance.now(),kind:'fence-error',error:fmtError(e),...proof}));
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
function activateReceipt(input,receivedAt) {
  const age=(performance.now()-receivedAt)/1000;
  if(!receiptIsLive(age))return false;
  const old=[...state.active].sort((a,b)=>a.receivedAt-b.receivedAt);
  const cause={id:input.id,x:input.x,y:input.y,variant:input.variant,generation:++state.generation,receivedAt,cleared:false,sfx:null,sfxSuppressed:state.held};
  if(old.length>=4){const evict=old[0];evict.cleared=true;if(evict.sfx)evict.sfx.cancel();draw(.78,evict.generation,{forceClear:true});state.active.delete(evict);}
  state.active.add(cause);state.cause=cause;events.push({at:cause.receivedAt,kind:'receipt',id:cause.id,variant:cause.variant,generation:cause.generation});
  if(!drawReceiptAddedWhileHeld(state,cause,performance.now(),(fixedAge,generation)=>draw(fixedAge,generation)))schedule();
  return true;
}
function acceptReceipt(input,receivedAt=performance.now()) {
  if(!live()||!isSuccessfulWeaponSwitchReceipt(input)) return false;
  if(state.seen.has(input.id)) return false;
  state.seen.add(input.id);
  if(!state.ready){state.pendingReceipts.push({input:{...input},receivedAt});return true;}
  return activateReceipt(input,receivedAt);
}
state.seen=new Set();state.active=new Set();
window.__weaponSwitchReceipt=(id,x,y,variant)=>{
  const receipt=typeof id==='object'?id:{id,x,y,variant};
  // Registered fixture projection: world origin (0,0) is the canvas center;
  // the returned CSS-pixel offsets are converted to physical pixels in the shader ABI.
  const point=projectFixtureWorldPoint(receipt.x,receipt.y,lastW,lastH,Math.max(1,devicePixelRatio||1));
  return acceptReceipt({...receipt,x:point.x,y:point.y});
};
window.addEventListener('message',e=>{
  if(e.source!==parent||e.origin!==location.origin)return;
  const d=e.data;
  if(d?.schema==='dva-gallery-startup/v1'&&d.action==='retire'&&d.token===token&&d.versionId===versionId&&d.attemptEpoch===epoch){dispose('retired');return;}
  if(d?.schema==='dva-weapon-switch-receipt/v1') acceptReceipt(d.receipt);
});
document.querySelector('#variant').addEventListener('change',e=>{if(state.initialized)acceptReceipt({id:`manual-${crypto.randomUUID()}`,x:.5,y:.5,variant:Number(e.target.value)});});
document.querySelector('#hold').onclick=()=>window.__weaponSwitchHold();
document.querySelector('#resume').onclick=()=>window.__weaponSwitchResume();
function cancelCurrent() { for(const c of [...state.active]){c.cleared=true;if(c.sfx)c.sfx.cancel();}state.active.clear();state.cause=null;state.generation++;if(raf)cancelAnimationFrame(raf);raf=0;try{draw(.78,state.generation,{forceClear:true});}catch{} }
function dispose(reason='disposed') { if(state.disposed)return; cancelCurrent();state.disposed=true;state.ready=false;state.loop=false;state.resizeObserver?.disconnect();if(state.resizeHandler)window.removeEventListener('resize',state.resizeHandler);state.audio?.close?.();if(reason!=='device-lost'&&reason!=='startup-error')emit('playing','cancelled',{error:{code:'RETIRED',message:reason}});for(const set of owned){set.ready.finally(()=>{set.main.destroy();set.obs.destroy();for(const b of set.buffers)b.destroy();});}owned.clear();try{state.device?.destroy?.();}catch{} }
window.addEventListener('pagehide',()=>dispose('pagehide'),{once:true});
async function boot() {
  if(!live())return;
  emit('child-document','pending');emit('adapter','pending');
  if(!navigator.gpu){emit('device','unsupported',{error:{code:'WEBGPU_UNAVAILABLE',message:'This preview requires WebGPU.'}});status.textContent='WebGPU is unavailable.';return;}
  try {
    emit('device','pending');const adapter=await navigator.gpu.requestAdapter();if(!live())return;if(!adapter)throw new Error('No WebGPU adapter.');
    const device=await adapter.requestDevice();if(!live()){device.destroy();return;}state.device=device;
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
    const pending=state.pendingReceipts.splice(0);for(const item of pending)activateReceipt(item.input,item.receivedAt);
    if(params.has('verify'))state.muted=true;
    if(!verify&&params.get('mute')!=='1') state.muted=false;
    // Embedded gallery supplies successful receipts; standalone fixture autoplays a finite synthetic demonstrator.
    if(!params.has('embed')) {state.loop=true;const run=()=>{if(!live()||!state.loop)return;if(state.held){setTimeout(run,PREVIEW_RECEIPT_INTERVAL_MS);return;}const variant=Number(document.querySelector('#variant').value);window.__weaponSwitchReceipt({id:`fixture-${crypto.randomUUID()}`,x:0,y:0,variant});setTimeout(run,PREVIEW_RECEIPT_INTERVAL_MS);};setTimeout(run,250);}
  } catch(e){if(!live())return;const err=fmtError(e);state.latestError={...err,diagnostic:e?.diagnostic||null,sourceHashes:{...sourceHashes},phase:state.phase};status.textContent=`${versionId||'weapon-switch'} failed: ${err.message}`;emit(state.phase,'error',{error:state.latestError});dispose('startup-error');}
}
boot();

// Authored cue is exposed through the established parent SFX gesture bridge.
window.__gallerySfx={activateFromGesture(){
  if(verify||params.has('verify'))return {state:'silent',reason:'verification mode'};
  if(state.disposed||!state.initialized)return {state:'unavailable'};
  if(state.held)return {state:'unavailable',reason:'preview is held'};
  const cause=[...state.active].find(c=>!c.cleared&&!c.sfxSuppressed&&performance.now()-c.receivedAt<=60);
  if(!cause)return {state:'unavailable',reason:'no current successful receipt'};
  if(!state.audio){try{state.audio=new AudioContext();}catch{return {state:'unsupported'};}}
  return state.audio.resume().then(()=>{
    if(verify||state.held||cause.sfxSuppressed||cause.cleared||!state.active.has(cause)||performance.now()-cause.receivedAt>60)return {state:'stale'};
    if(cause.sfx)return {state:'active'};
    cause.sfx=playWeaponSwitchCue(state.audio,state.audio.destination,{verify:false,muted:state.muted,age:(performance.now()-cause.receivedAt)/1000});
    return cause.sfx?{state:'active'}:{state:'unsupported'};
  });
}};
