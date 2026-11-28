const canvas=document.getElementById('surface'),failure=document.getElementById('error'),params=new URLSearchParams(location.search),verify=params.has('verify');
const effectUrl=new URL('./effect.mjs',import.meta.url);
const versionId='fighter-slash-parry-astra62-r4',adapterRevision='parry-r4-startup-contract-r2';
const child={token:params.get('galleryStartupToken'),versionId:params.get('galleryVersionId'),attemptEpoch:Number(params.get('galleryAttemptEpoch'))};
const single=k=>params.getAll(k).length===1;
const inGallery=parent!==window&&location.pathname==='/public/astra-duo/parry-r4/index.html'&&single('galleryStartupToken')&&single('galleryVersionId')&&single('galleryAttemptEpoch')&&/^[0-9a-f]{32}$/.test(child.token||'')&&child.versionId===versionId&&Number.isSafeInteger(child.attemptEpoch)&&child.attemptEpoch>0;
let soundCleanup=null,lastSoundCycle=-1,submittedSequence=0,lastFrame=null,firstFrame=null,seq=0,device=null,context=null,pipeline=null,uniform=null,module=null,raf=0,disposed=false,paused=false,startedAt=0,audio=null,disposePromise=null,currentStage='child-document',failed=false,playingSent=false,latestEnvelope=null,bootPromise=null,bootSettled=false,retireRequested=false,deviceLostObserved=false,terminalEnvelope=null;
const audioResumePromises=new Set(),framePromises=new Set(),cleanupErrors=[];
const record=(stage,e)=>cleanupErrors.push(stage+': '+String(e?.message||e));
function emit(stage,status,extra={}){if(!inGallery)return null;const envelope=Object.freeze({schema:'dva-gallery-startup/v1',token:child.token,versionId,attemptEpoch:child.attemptEpoch,sequence:++seq,stage,status,adapterRevision,...extra});latestEnvelope=envelope;parent.postMessage(envelope,location.origin);return envelope}
Object.defineProperty(window,'__dvaGalleryStartupSnapshot',{value:()=>latestEnvelope,configurable:true});
function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
function fail(e){if(failed||disposed)return;failed=true;failure.hidden=false;failure.textContent=String(e?.stack||e);stop();window.__dvaEffectSnapshot={...(window.__dvaEffectSnapshot||{}),rendererDiagnostics:{error:String(e?.stack||e),status:'ERROR'}};emit(currentStage,'error',{error:{code:'PREVIEW_STARTUP_ERROR',message:String(e?.message||e)}});void dispose()}
function trackFrame(p){const tracked=Promise.resolve(p).catch(e=>{record('frame-completion',e);fail(e)});framePromises.add(tracked);void tracked.then(()=>framePromises.delete(tracked));return tracked}
function size(){const r=canvas.getBoundingClientRect(),d=window.devicePixelRatio||1,w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}return {w,h,d}}
async function init(){
 if(disposed)return;
 emit('child-document','pending');window.__dvaEffectSnapshot={versionId,verify,firstFrame:null,lastFrame:null,rendererDiagnostics:{error:null,status:'INITIALIZING'},scheduler:{disposed:false,paused:false,inFlight:false},dispose};
 module=await import(effectUrl.href);if(disposed)return;if(typeof module.shader!=='string'||!Number.isFinite(module.duration)||module.duration<=0||typeof module.playSound!=='function')throw Error('Invalid effect module contract');
 currentStage='adapter';emit('adapter','pending');if(disposed)return;if(!navigator.gpu)throw Error('WebGPU unavailable');const adapter=await navigator.gpu.requestAdapter();if(disposed)return;if(!adapter)throw Error('No WebGPU adapter');
 currentStage='device';emit('device','pending');if(disposed)return;device=await adapter.requestDevice();
 void device.lost.then(()=>{deviceLostObserved=true},()=>{});
 if(disposed)return;context=canvas.getContext('webgpu');if(!context)throw Error('WebGPU canvas context unavailable');const format=navigator.gpu.getPreferredCanvasFormat();
 const code=`struct U{size:vec2f,time:f32,_pad:f32};@group(0) @binding(0) var<uniform> u:U;struct V{@builtin(position) p:vec4f,@location(0) uv:vec2f};@vertex fn vs(@builtin(vertex_index) i:u32)->V{var pos=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:V;o.p=vec4f(pos[i],0.,1.);o.uv=vec2f(pos[i].x,-pos[i].y)*0.5;return o;}@fragment fn fs(i:V)->@location(0) vec4f{return effect(i.uv*u.size,u.time,u.size);}${module.shader}`;
 currentStage='pipelines';emit('pipelines','pending');if(disposed)return;const shader=device.createShaderModule({code});const compile=await shader.getCompilationInfo();if(disposed)return;if(compile.messages.some(m=>m.type==='error'))throw new Error('WGSL compilation failed: '+compile.messages.map(m=>m.message).join('\n'));
 device.pushErrorScope('validation');let validation;try{pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}})}finally{validation=await device.popErrorScope()}if(disposed)return;if(validation)throw new Error('WebGPU pipeline validation failed: '+validation.message);
 uniform=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});context.configure({device,format,alphaMode:'premultiplied'});
 startedAt=performance.now();let first=true;
 function frame(now){
  raf=0;if(disposed||failed||paused)return;let scopePushed=false;
  try{
   const {w,h,d}=size(),cssWidth=canvas.clientWidth,cssHeight=canvas.clientHeight;
   const cycle=Math.floor((now-startedAt)/1000/module.duration),t=((now-startedAt)/1000)%module.duration;
   if(!verify&&audio&&cycle>lastSoundCycle){lastSoundCycle=cycle;soundCleanup?.();soundCleanup=module.playSound(audio,audio.destination)||null}
   device.queue.writeBuffer(uniform,0,new Float32Array([cssWidth/64,cssHeight/64,t,0]));device.pushErrorScope('validation');scopePushed=true;
   const enc=device.createCommandEncoder(),pass=enc.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:.012,g:.02,b:.035,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();device.queue.submit([enc.finish()]);
   const submitted=performance.now(),submission=++submittedSequence,scopeResult=device.popErrorScope();scopePushed=false;
   const queueResult=Promise.resolve().then(()=>device.queue.onSubmittedWorkDone());
   trackFrame(Promise.allSettled([scopeResult,queueResult]).then(results=>{
    for(const result of results)if(result.status==='rejected')throw result.reason;
    const validation=results[0].value;if(validation)throw new Error('WebGPU frame validation failed: '+validation.message);
    if(disposed||failed)return;
    const rect=canvas.getBoundingClientRect(),currentDpr=window.devicePixelRatio||1;
    if(!canvas.isConnected||rect.width<=0||rect.height<=0||canvas.clientWidth<=0||canvas.clientHeight<=0||canvas.clientWidth!==cssWidth||canvas.clientHeight!==cssHeight||canvas.width!==w||canvas.height!==h||currentDpr!==d)return;
    const evidence={completed:true,queueCompletionObserved:true,submissionId:submission,ageMsAtSubmission:submitted-startedAt,ageMsAtCompletion:performance.now()-startedAt,viewportCssWidth:cssWidth,viewportCssHeight:cssHeight,viewportWidth:w,viewportHeight:h,dpr:d,passes:1,sourceVersionId:versionId,active:true,cycle,recorded:true,submitted:true,canvasConnected:true};lastFrame=Object.freeze(evidence);
    if(first){first=false;firstFrame=Object.freeze({...evidence})}
    window.__dvaEffectSnapshot={versionId,verify,firstFrame,lastFrame,rendererDiagnostics:{error:null,status:'COMPLETE'},scheduler:{disposed,paused:false,inFlight:false},dispose};
    if(!playingSent){playingSent=true;currentStage='playing';emit('playing','ready',{firstFrame})}
   }));
   if(!disposed&&!failed)raf=requestAnimationFrame(frame);
  }catch(e){
   if(scopePushed){try{trackFrame(Promise.resolve(device.popErrorScope()).then(v=>{if(v)throw new Error(v.message)}))}catch(scopeError){record('frame-scope',scopeError)}}
   fail(e);
  }
 }
 currentStage='first-frame';emit('first-frame','pending');if(!disposed)raf=requestAnimationFrame(frame);
}
function dispose(){
 if(disposePromise)return disposePromise;
 disposed=true;stop();
 disposePromise=Promise.resolve().then(async()=>{
  try{soundCleanup?.()}catch(e){record('sound-stop',e)}soundCleanup=null;
  await bootPromise;
  await Promise.allSettled([...audioResumePromises]);
  let audioClose=Promise.resolve();try{if(audio&&audio.state!=='closed')audioClose=Promise.resolve(audio.close()).catch(e=>record('audio-close',e))}catch(e){record('audio-close',e)}
  await Promise.allSettled([...framePromises]);
  let queueDrained=false,deviceDestroyed=false;
  if(device){try{await device.queue.onSubmittedWorkDone();queueDrained=true}catch(e){record('queue-drain',e)}}
  try{context?.unconfigure()}catch(e){record('context-unconfigure',e)}
  try{uniform?.destroy()}catch(e){record('uniform-destroy',e)}
  if(device){try{device.destroy();deviceDestroyed=true}catch(e){record('device-destroy',e)}}
  pipeline=null;uniform=null;
  await audioClose;
  const audioClosed=!audio||audio.state==='closed';
  const deviceLifecycle=!bootSettled?'unknown':!device?'not-acquired':deviceDestroyed&&queueDrained?'destroyed':'unknown';
  const terminal=deviceLifecycle==='not-acquired'||deviceLifecycle==='destroyed';
  const pendingWork=bootSettled&&audioResumePromises.size===0&&framePromises.size===0&&terminal?0:null;
  const ok=terminal&&audioClosed&&pendingWork===0&&cleanupErrors.length===0;
  const lifecycle={disposed:true,bootSettled,deviceLifecycle,deviceDestroyed,queueDrained,deviceLostObserved,audioClosed,pendingWork,cleanupErrors:[...cleanupErrors]};
  window.__dvaEffectSnapshot={...(window.__dvaEffectSnapshot||{}),disposed:true,scheduler:{disposed:true,paused:false,inFlight:false},lifecycle};
  terminalEnvelope=emit('retired',ok?'ready':'error',{lifecycle,...(!ok?{error:{code:'RETIREMENT_CLEANUP_FAILED',message:cleanupErrors.join('; ')||'boot, device cleanup, pending work or audio close not confirmed'}}:{})});
 }).catch(e=>{
  record('cleanup',e);
  terminalEnvelope=emit('retired','error',{lifecycle:{disposed:true,bootSettled,deviceLifecycle:'unknown',deviceDestroyed:false,queueDrained:false,deviceLostObserved,audioClosed:!audio||audio.state==='closed',pendingWork:null,cleanupErrors:[...cleanupErrors]},error:{code:'RETIREMENT_CLEANUP_FAILED',message:String(e?.message||e)}});
 });
 return disposePromise;
}
function onMessage(e){const d=e.data;if(!inGallery||e.origin!==location.origin||e.source!==parent||d?.schema!=='dva-gallery-startup/v1'||d.action!=='retire'||d.token!==child.token||d.versionId!==versionId||d.attemptEpoch!==child.attemptEpoch)return;if(!retireRequested){retireRequested=true;if(!terminalEnvelope)emit('ready','cancelled')}void dispose()}
addEventListener('message',onMessage);
window.__gallerySfx={async activateFromGesture(){if(verify)return {state:'silent',verify:true};if(disposed)return {state:'unavailable'};if(!audio)audio=new AudioContext();let resume;try{resume=Promise.resolve(audio.resume())}catch(e){if(disposed)return {state:'unavailable'};throw e}audioResumePromises.add(resume);try{await resume}catch(e){if(disposed)return {state:'unavailable'};throw e}finally{audioResumePromises.delete(resume)}if(disposed||audio.state!=='running')return {state:'unavailable'};lastSoundCycle=-1;return {state:'active',enabled:true,verify:false,cycle:lastSoundCycle}}};
addEventListener('pagehide',()=>{void dispose()},{once:true});canvas.addEventListener('pointerdown',()=>{if(!verify&&!disposed)void window.__gallerySfx.activateFromGesture()});addEventListener('resize',()=>{if(!disposed&&device)size()});
bootPromise=Promise.resolve().then(init).catch(fail).finally(()=>{bootSettled=true});