import { createLuminousAudio } from './sfx.mjs';
import { VERSION, DURATION_MS, OUTCOMES, normalizeFixture, cuePlan, hasLuminousEmissionAt } from './contract.mjs';
import { parseGalleryBinding, createGalleryProtocol } from './gallery-protocol.mjs';
const BOOT_KEY=Symbol.for('dva.luminous-sol61-r1.runtime-owner');
if(!globalThis[BOOT_KEY]){
 Object.defineProperty(globalThis,BOOT_KEY,{value:true,writable:false,configurable:false});
 startRuntime();
}
function startRuntime(){
const query=new URLSearchParams(location.search);
const verify=query.has('verify');
const canvas=document.querySelector('canvas');
const status=document.querySelector('#status');
const audioStatus=document.querySelector('#audio-status');
let binding;
try{binding=parseGalleryBinding(location.search);}catch(error){status.textContent='技術再生失敗：'+String(error.message||error);return;}
const galleryId=binding?.versionId||VERSION;
const protocol=createGalleryProtocol({binding,origin:location.origin,parentSource:parent,post:message=>{if(parent!==window)parent.postMessage(message,location.origin);}});
protocol.progress('child-document');
const outcomeInput=document.querySelector('#outcome');
const timeInput=document.querySelector('#time');
const mainInput=document.querySelector('#main');
const reducedInput=document.querySelector('#reduced');
const zoomInput=document.querySelector('#zoom');
const audioButton=document.querySelector('#audio');
const diagnostic={version:VERSION,galleryVersionId:galleryId,verify,ready:false,firstEffectFramePending:true,mode:'initializing',generation:0,causeId:null,submitted:0,completed:0,shaderMessages:[],errorScopes:[],uncapturedErrors:[],lastReceipt:null,lastError:null,fixture:null,sfxListeningStatus:'not_run',normalAudioListening:'not_run',mainGameIntegration:'not_connected',disposedRequested:false,disposeSettled:false,gpuCleanup:{state:'not-requested',drain:'not-requested',errors:[]},audioCloseSettled:false,audioCloseState:'not-requested',audioCloseError:null,retired:false};
let device,context,pipeline,uniformBuffer,bindGroup,raf=0,disposed=false,retiring=null;
let origin=0,age=0,mode='stopped',fixture,serial=0,submission=0,lastAudioAge=-1;
let inFlight=0,drawPending=false,loopTimer=0,drawTask=null,retireReply=null;
let bootPromise;
const shaderAbort=new AbortController();
let audio;
function audioFailure(error){
 diagnostic.audioError=String(error?.stack||error);
 audioStatus.textContent='音声エラー：'+String(error?.message||error)+'（音声ボタンで再試行できます）';
}
function inspectAudio(){
 try{
  const value=audio?.snapshot();
  if(value?.lastError)audioFailure(value.lastError);
  return value;
 }catch(error){audioFailure(error);return null;}
}
function audioCall(name,...args){
 try{
  const result=audio?.[name]?.(...args);
  if(result&&typeof result.then==='function')return Promise.resolve(result).then(value=>{inspectAudio();return value;},error=>{audioFailure(error);});
  inspectAudio();return result;
 }catch(error){audioFailure(error);}
}
function ensureAudio(){
 if(audio||disposed)return;
 try{audio=createLuminousAudio({verify});}catch(error){audioFailure(error);}
}
ensureAudio();
let scheduled=new Set();
const outcomeLabels={success:'成功：指名対象が消滅し、発動者が加速',failure:'失敗：指名対象は存続し、発動者が死亡',body:'バリアによりボディダメージへ変換：対象は存続',blocked:'防御：消滅もボディダメージも確定しない'};
function fail(error){if(disposed)return;diagnostic.lastError=String(error?.stack||error);mode='failed';diagnostic.mode=mode;status.textContent='技術再生失敗：'+String(error?.message||error);cancelAnimationFrame(raf);raf=0;audioCall('cancel');protocol.progress(protocol.stage,'error',{error:diagnostic.lastError});}
function fixtureFor(outcome){return normalizeFixture({sourceId:'fixture-issuer',targetId:'fixture-subject',causeId:'fixture-'+(++serial),outcome});}
function setStatus(){status.textContent=outcomeLabels[fixture.outcome]+' / '+mode+' / '+Math.round(age)+' ms'+(diagnostic.firstEffectFramePending?' / Eフレーム待機':'')+(verify?' / verify・音声固定0':'');}
function updateAge(){if(mode==='playing')age=Math.min(DURATION_MS,Math.max(0,performance.now()-origin));}
function invalidateAudio(){scheduled.clear();lastAudioAge=age;audioCall('cancel');}
function play(){
 if(!diagnostic.ready||disposed)return false;
 diagnostic.generation++;fixture=fixtureFor(outcomeInput.value);diagnostic.fixture=fixture;diagnostic.causeId=fixture.causeId;
 age=0;origin=performance.now();mode='playing';diagnostic.mode=mode;invalidateAudio();lastAudioAge=-1;
 if(!diagnostic.firstEffectFramePending)protocol.progress('playing');setStatus();schedule();return true;
}
function hold(ms){
 if(!diagnostic.ready||disposed||!Number.isFinite(ms)||ms<0||ms>DURATION_MS)return false;
 updateAge();age=ms;mode='held';diagnostic.mode=mode;diagnostic.generation++;invalidateAudio();setStatus();schedule();return true;
}
function resume(){
 if(!diagnostic.ready||disposed)return false;
 if(mode!=='held'||age>=DURATION_MS)return play();
 origin=performance.now()-age;mode='playing';diagnostic.mode=mode;lastAudioAge=age;if(!diagnostic.firstEffectFramePending)protocol.progress('playing');setStatus();schedule();return true;
}
function stop(){if(!diagnostic.ready||disposed)return false;updateAge();mode='stopped';age=0;diagnostic.mode=mode;diagnostic.generation++;invalidateAudio();cancelAnimationFrame(raf);raf=0;setStatus();schedule();return true;}
function snapshot(){return {...diagnostic,fixture,mode,age,mainOn:mainInput.checked,reducedMotion:reducedInput.checked,inFlight,audio:inspectAudio(),canvas:{width:canvas.width,height:canvas.height,cssWidth:canvas.getBoundingClientRect().width,cssHeight:canvas.getBoundingClientRect().height},disposed};}
function schedule(){if(disposed||!diagnostic.ready)return;if(inFlight){drawPending=true;return;}if(!raf)raf=requestAnimationFrame(()=>{raf=0;drawTask=draw();void drawTask.catch(fail);});}
async function draw(){
 if(disposed||!diagnostic.ready)return;
 updateAge();
 const rect=canvas.getBoundingClientRect();
 if(!(rect.width>0&&rect.height>0)){drawPending=true;return;}
 const dpr=Math.min(device.limits.maxTextureDimension2D/Math.max(rect.width,rect.height),devicePixelRatio||1,2);
 const width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 const generation=diagnostic.generation,cause=fixture.causeId,submittedOutcome=fixture.outcome,submittedAge=age,submittedMode=mode,current=++submission;
 const submittedConnected=canvas.isConnected,submittedVisible=!document.hidden;
 const viewportWidth=rect.width,viewportHeight=rect.height;
 const effectiveAge=mode==='stopped'?-1:age/1000;
 const values=new Float32Array([width,height,effectiveAge,OUTCOMES.indexOf(fixture.outcome),Number(zoomInput.value),mainInput.checked?1:0,0,reducedInput.checked?1:0]);
 device.pushErrorScope('validation');device.pushErrorScope('out-of-memory');device.pushErrorScope('internal');
 inFlight++;
 let fence,scopeResults;
 try{
 try{
   device.queue.writeBuffer(uniformBuffer,0,values);
   const encoder=device.createCommandEncoder({label:VERSION+' '+current});
   const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.draw(3);pass.end();
   device.queue.submit([encoder.finish()]);diagnostic.submitted++;
   fence=device.queue.onSubmittedWorkDone().then(()=>({ok:true}),error=>({ok:false,error}));
 }finally{
   scopeResults=await Promise.all([device.popErrorScope(),device.popErrorScope(),device.popErrorScope()]);
 }
   if(fence){const done=await fence;if(!done.ok)throw done.error;}
   diagnostic.errorScopes.push({submission:current,results:scopeResults.map(x=>x?String(x.message||x):null)});
   if(diagnostic.errorScopes.length>40)diagnostic.errorScopes.shift();
   if(scopeResults.some(Boolean))throw new Error('GPU scope error: '+scopeResults.filter(Boolean).map(x=>x.message||x).join(';'));
   diagnostic.completed++;
   const stillCurrent=!disposed&&generation===diagnostic.generation&&cause===fixture.causeId&&submittedOutcome===fixture.outcome;
   const receipt={submission:current,generation,causeId:cause,outcome:submittedOutcome,submittedAgeMs:submittedAge,submittedMode,completedAt:performance.now(),recorded:true,submitted:true,completed:true,passes:1,width,height,viewportWidth,viewportHeight,canvasConnected:submittedConnected,mainOn:values[5]===1,active:submittedMode!=='stopped'&&submittedAge<DURATION_MS,current:stillCurrent,scopeResults:scopeResults.map(x=>x?String(x.message||x):null)};
   diagnostic.lastReceipt=receipt;
   const cueCurrent=!disposed&&!document.hidden&&mode==='playing'&&submittedMode==='playing'&&generation===diagnostic.generation&&cause===fixture.causeId;
   if(cueCurrent&&mainInput.checked&&receipt.mainOn){
     const nowAge=Math.min(DURATION_MS,Math.max(0,performance.now()-origin));
     for(const cue of cuePlan(submittedOutcome)){
       if(scheduled.has(cue.kind)||cue.at>submittedAge||cue.at<=lastAudioAge)continue;
       scheduled.add(cue.kind);
       if(nowAge-cue.at<=110)audioCall('cue',cue.kind,{causeId:cause,generation});
     }
     lastAudioAge=submittedAge;
     const liveRect=canvas.getBoundingClientRect();
     if(diagnostic.firstEffectFramePending&&receipt.current&&submittedMode==='playing'&&mode==='playing'&&receipt.mainOn&&mainInput.checked&&hasLuminousEmissionAt(submittedOutcome,submittedAge)&&hasLuminousEmissionAt(submittedOutcome,nowAge)&&submittedVisible&&!document.hidden&&submittedConnected&&canvas.isConnected&&viewportWidth>0&&viewportHeight>0&&liveRect.width>0&&liveRect.height>0&&scopeResults.every(x=>x===null)&&diagnostic.uncapturedErrors.length===0){
       protocol.ready(receipt);
       diagnostic.firstEffectFramePending=false;
       protocol.progress('playing');
     }
   }
 }finally{
   inFlight--;
   if(!disposed){
     if(mode==='playing'&&age>=DURATION_MS){mode='ended';diagnostic.mode=mode;audioCall('finish');}
     timeInput.value=String(Math.round(age));if(mode!=='failed')setStatus();
     const pending=drawPending;drawPending=false;
     if(mode==='playing'||pending)schedule();
   }
 }
}
function lifecycle(){return {disposedRequested:diagnostic.disposedRequested,disposeSettled:diagnostic.disposeSettled,gpuCleanup:{...diagnostic.gpuCleanup,errors:[...diagnostic.gpuCleanup.errors]},audioCloseSettled:diagnostic.audioCloseSettled,audioCloseState:diagnostic.audioCloseState,audioCloseError:diagnostic.audioCloseError,audioState:diagnostic.audioState??'unknown',retired:diagnostic.retired,cleanupError:diagnostic.cleanupError??null};}
function dispose(){
 if(retiring)return retiring;
 disposed=true;diagnostic.disposedRequested=true;diagnostic.ready=false;mode='disposed';diagnostic.mode=mode;
 cancelAnimationFrame(raf);raf=0;observer.disconnect();clearTimeout(loopTimer);shaderAbort.abort();
 retiring=(async()=>{
  const errors=[];
  let audioTask;
  diagnostic.audioCloseState='pending';
  try{audioTask=Promise.resolve(audio?.dispose()).then(()=>({ok:true}),error=>({ok:false,error}));}
  catch(error){audioTask=Promise.resolve({ok:false,error});}
  await Promise.resolve(bootPromise).catch(()=>{});
  if(drawTask)try{await drawTask;}catch(error){errors.push('draw settlement: '+String(error));}
  diagnostic.gpuCleanup.state='pending';diagnostic.gpuCleanup.drain=device?'pending':'no-device';
  if(device)try{await device.queue.onSubmittedWorkDone();diagnostic.gpuCleanup.drain='completed';}catch(error){diagnostic.gpuCleanup.drain='error';diagnostic.gpuCleanup.errors.push('drain: '+String(error));}
  for(const [name,operation] of [['buffer',()=>uniformBuffer?.destroy()],['canvas',()=>context?.unconfigure()],['device',()=>device?.destroy()]]){
   try{operation();}catch(error){diagnostic.gpuCleanup.errors.push(name+': '+String(error));}
  }
  diagnostic.gpuCleanup.state=diagnostic.gpuCleanup.errors.length?'error':'completed';
  errors.push(...diagnostic.gpuCleanup.errors);
  const audioResult=await audioTask;
  diagnostic.audioCloseSettled=true;
  let audioSnapshot;
  try{audioSnapshot=audio?.snapshot();}catch(error){audioFailure(error);errors.push('audio snapshot: '+String(error));}
  diagnostic.audioState=audioSnapshot?.state??(audio?'unknown':'not-created');
  diagnostic.audioCloseState=audioSnapshot?.closeState??(audio?'error':'no-context');
  diagnostic.audioCloseError=audioSnapshot?.closeError??null;
  if(!audioResult.ok){diagnostic.audioCloseError=String(audioResult.error);audioFailure(audioResult.error);errors.push('audio dispose: '+String(audioResult.error));}
  if(audio&&(!audioSnapshot?.closeSettled||!['closed','no-context'].includes(audioSnapshot.closeState)||!['closed','not-created'].includes(audioSnapshot.state))){errors.push('Audio close not successfully confirmed');}
  if(audioSnapshot?.cleanupError)errors.push('audio cleanup: '+audioSnapshot.cleanupError);
  diagnostic.disposeSettled=true;
  diagnostic.retired=errors.length===0;
  diagnostic.cleanupError=errors.length?errors.join('; '):null;
  return lifecycle();
 })().catch(error=>{
  diagnostic.disposeSettled=true;diagnostic.retired=false;diagnostic.cleanupError=String(error);
  return lifecycle();
 });
 return retiring;
}
const observer=new ResizeObserver(()=>schedule());observer.observe(canvas);
document.querySelector('#play').addEventListener('click',play);
document.querySelector('#hold').addEventListener('click',()=>{updateAge();hold(age);});
document.querySelector('#resume').addEventListener('click',resume);
document.querySelector('#stop').addEventListener('click',stop);
timeInput.addEventListener('input',()=>hold(Number(timeInput.value)));
outcomeInput.addEventListener('change',()=>play());
for(const input of [mainInput,reducedInput,zoomInput])input.addEventListener('change',()=>{diagnostic.generation++;invalidateAudio();schedule();});
audioButton.disabled=verify;
audioButton.textContent=verify?'verify：音声は固定0':'音声を開始';
if(!diagnostic.audioError)audioStatus.textContent=verify?'verify：音声は固定0':'音声は未開始です';
audioButton.addEventListener('click',async()=>{
 if(disposed||verify)return;
 ensureAudio();const ok=await audioCall('unlock');if(disposed)return;
 audioButton.textContent=ok?'音声有効（次の再生から）':'音声を開始（再試行）';
 if(ok)audioStatus.textContent='音声有効（次の再生から）';
 else if(!inspectAudio()?.lastError)audioStatus.textContent='音声を開始できません。音声ボタンで再試行できます。';
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){updateAge();if(mode==='playing'){mode='held';diagnostic.mode=mode;}diagnostic.generation++;invalidateAudio();cancelAnimationFrame(raf);raf=0;}else schedule();});
addEventListener('pagehide',()=>void dispose());
addEventListener('message',event=>{
 if(!protocol.acceptsRetire(event)||retireReply)return;
 retireReply=dispose().then(result=>protocol.retirement(result.retired,result));
});
Object.defineProperty(window,'__DVA_LUMINOUS_R1__',{value:Object.freeze({version:VERSION,snapshot,play,hold,resume,stop,dispose}),writable:false});
async function boot(){
 if(!navigator.gpu)throw new Error('WebGPU unavailable');
 protocol.progress('adapter');
 const adapter=await navigator.gpu.requestAdapter();if(disposed)return;if(!adapter)throw new Error('WebGPU adapter unavailable');
 protocol.progress('device');
 device=await adapter.requestDevice();if(disposed)return;
 device.addEventListener('uncapturederror',event=>{diagnostic.uncapturedErrors.push(String(event.error?.message||event.error));fail(event.error);});
 void device.lost.then(info=>{if(!disposed)fail(new Error('GPU device lost: '+info.message));});
 context=canvas.getContext('webgpu');if(!context)throw new Error('WebGPU canvas unavailable');
 context.configure({device,format:navigator.gpu.getPreferredCanvasFormat(),alphaMode:'opaque'});
 protocol.progress('assets');
 const response=await fetch(new URL('./effect.wgsl',import.meta.url),{cache:'no-store',signal:shaderAbort.signal});if(!response.ok)throw new Error('WGSL HTTP '+response.status);
 const code=await response.text();if(disposed)return;const module=device.createShaderModule({code,label:VERSION});
 const info=await module.getCompilationInfo();if(disposed)return;diagnostic.shaderMessages=info.messages.map(m=>({type:m.type,message:m.message,lineNum:m.lineNum,linePos:m.linePos}));
 if(info.messages.some(m=>m.type==='error'))throw new Error('WGSL compilation failed: '+JSON.stringify(diagnostic.shaderMessages));
 protocol.progress('pipelines');
 device.pushErrorScope('validation');
 try{pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:navigator.gpu.getPreferredCanvasFormat()}]},primitive:{topology:'triangle-list'}});}finally{const e=await device.popErrorScope();diagnostic.pipelineScope=e?String(e.message):null;if(e)throw e;}
 if(disposed)return;
 uniformBuffer=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniformBuffer}}]});
 fixture=fixtureFor(OUTCOMES.includes(query.get('outcome'))?query.get('outcome'):'success');outcomeInput.value=fixture.outcome;
 diagnostic.ready=true;mode='stopped';diagnostic.mode=mode;diagnostic.fixture=fixture;diagnostic.causeId=fixture.causeId;setStatus();protocol.progress('first-frame');await draw();
 if(disposed||mode==='failed')return;
 if(query.has('embed')||query.has('autoplay')||query.has('galleryAutoLoop'))play();
 if(query.has('galleryAutoLoop')){const loop=()=>{if(disposed)return;if(mode==='ended'&&!document.hidden)play();loopTimer=setTimeout(loop,2200);};loopTimer=setTimeout(loop,2200);}
}
bootPromise=boot();void bootPromise.catch(fail);
}
