import {AUTHORITY,LIFE,LOOP,packUniforms,audioEligible,synthShot,normalizeDirection} from './contract.mjs';
import {resolveCauseOffset,startBufferAtCauseOffset} from '../playback-offset.mjs';
export async function createShootingRuntime(canvas,{verify=false,onReceipt=()=>{},onStartup=()=>{},isRetiring=()=>false}={}){
 if(!navigator.gpu)throw new Error('WebGPU required');
 onStartup('adapter','pending');const adapter=await navigator.gpu.requestAdapter();if(isRetiring())throw new DOMException('retired during adapter request','AbortError');if(!adapter)throw new Error('WebGPU adapter unavailable');onStartup('adapter','ready',{adapter:true});
 onStartup('device','pending');const device=await adapter.requestDevice();const lost=device.lost;if(isRetiring()){device.destroy();await lost;throw new DOMException('retired during device request','AbortError')}onStartup('device','ready',{device:true});const context=canvas.getContext('webgpu'),format=navigator.gpu.getPreferredCanvasFormat();
 let disposed=false,retiring=false,retirePromise=null,drawFlight=null,serial=0,lastReceipt=null,scopeErrors=[],audioContext=null,muted=verify,audioEnabled=false;
 let targetGeneration=0,targets=null,audioEvent=null,audioAttempt=null;const sounded=new Set(),voices=new Set();
 onStartup('assets','pending');const sourceCode=await fetch(new URL('./source.wgsl',import.meta.url)).then(r=>{if(!r.ok)throw new Error('source WGSL fetch');return r.text()});if(isRetiring()){device.destroy();await lost;throw new DOMException('retired during source fetch','AbortError')}
 const observerCode=await fetch(new URL('./observer.wgsl',import.meta.url)).then(r=>{if(!r.ok)throw new Error('observer WGSL fetch');return r.text()});if(isRetiring()){device.destroy();await lost;throw new DOMException('retired during observer fetch','AbortError')}onStartup('assets','ready',{sourceBytes:sourceCode.length,observerBytes:observerCode.length});
 const source=device.createShaderModule({code:sourceCode}),observer=device.createShaderModule({code:observerCode});
 onStartup('pipelines','pending');const compilation=await Promise.all([source.getCompilationInfo(),observer.getCompilationInfo()]);if(isRetiring()){device.destroy();await lost;throw new DOMException('retired during shader compilation','AbortError')}
 const shaderMessages=compilation.flatMap((c,i)=>c.messages.map(m=>({shader:i,type:m.type,message:m.message,lineNum:m.lineNum})));
 if(shaderMessages.some(m=>m.type==='error'))throw new Error(JSON.stringify(shaderMessages));onStartup('pipelines','pending',{shaderMessages});
 const uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const worldPipeline=device.createRenderPipeline({layout:'auto',vertex:{module:source,entryPoint:'vs'},fragment:{module:source,entryPoint:'fs',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
 const observerPipeline=device.createRenderPipeline({layout:'auto',vertex:{module:observer,entryPoint:'vs'},fragment:{module:observer,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});onStartup('pipelines','ready',{shaderMessages,sourcePipeline:true,observerPipeline:true});
 const worldBindings=device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
 device.addEventListener('uncapturederror',e=>scopeErrors.push({type:'uncaptured',message:e.error.message}));
 const loss=[];const lostPromise=device.lost.then(v=>{loss.push({reason:v.reason,message:v.message,disposed,retiring});return v});
 function resize(width,height){
  if(disposed||retiring)throw new Error('disposed');if(drawFlight)throw new Error('resize during draw');if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new TypeError('integer target required');
  if(targets?.width===width&&targets?.height===height)return;
  targets?.scene.destroy();targets?.light.destroy();canvas.width=width;canvas.height=height;
  context.configure({device,format,alphaMode:'opaque'});targetGeneration++;
  const usage=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING;
  const scene=device.createTexture({size:[width,height],format:'rgba16float',usage}),light=device.createTexture({size:[width,height],format:'rgba16float',usage});
  const bindings=device.createBindGroup({layout:observerPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:scene.createView()},{binding:2,resource:light.createView()}]});
  targets={scene,light,bindings,width,height};
 }
 function draw(input){if(retiring||disposed)return Promise.reject(new Error('retiring'));if(drawFlight)return Promise.reject(new Error('draw already in flight'));drawFlight=drawInner(input).finally(()=>{drawFlight=null});return drawFlight}
 async function drawInner(input){
  if(disposed)throw new Error('disposed');const packed=packUniforms({...input,width:canvas.width,height:canvas.height});
  const sequence=++serial,generation=targetGeneration;device.pushErrorScope('validation');device.pushErrorScope('out-of-memory');device.pushErrorScope('internal');
  device.queue.writeBuffer(uniform,0,packed.data);
  const command=device.createCommandEncoder();const world=command.beginRenderPass({colorAttachments:[{view:targets.scene.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]},{view:targets.light.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});
  world.setPipeline(worldPipeline);world.setBindGroup(0,worldBindings);world.draw(3);world.end();
  const output=command.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});
  output.setPipeline(observerPipeline);output.setBindGroup(0,targets.bindings);output.draw(3);output.end();device.queue.submit([command.finish()]);
  await device.queue.onSubmittedWorkDone();const errors=await Promise.all([device.popErrorScope(),device.popErrorScope(),device.popErrorScope()]);
  const receipt={...AUTHORITY,sequence,targetGeneration:generation,causeID:input.causeID,age:input.age,phase:packed.plan.phase,active:packed.plan.active,passes:2,submitted:true,completed:!disposed&&generation===targetGeneration&&!errors.some(Boolean),errorScopes:errors.map(e=>e?{message:e.message}:null),width:canvas.width,height:canvas.height,sourceEnabled:input.sourceEnabled!==false,observerEnabled:input.observerEnabled!==false,held:!!input.held,shaderMessages};
  scopeErrors.push(...errors.filter(Boolean).map(e=>({type:'scope',message:e.message})));lastReceipt=receipt;onReceipt(receipt);
  return receipt;
 }
 async function enableAudio(){
  if(verify||disposed)return {ok:false,reason:verify?'verify':'disposed',snapshot:audioSnapshot()};
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return {ok:false,reason:'unavailable',snapshot:audioSnapshot()};
  audioContext??=new Audio();try{await audioContext.resume()}catch{return {ok:false,reason:'resume-failed',snapshot:audioSnapshot()}}audioEnabled=!disposed&&!retiring&&audioContext.state==='running';
  return {ok:audioEnabled,reason:audioEnabled?'running':'suspended',snapshot:audioSnapshot()};
 }
 function audioSnapshot(){return {verify,muted,enabled:audioEnabled,state:audioContext?.state??'not-created',event:audioEvent,lastAttempt:audioAttempt,voices:voices.size}}
 function stopAudio(){for(const voice of voices){try{voice.source.stop()}catch{}voice.source.disconnect();voice.gain.disconnect()}voices.clear()}
 function sound(receipt,{age=receipt.age,startedAt}={}){
  const now=performance.now();
  if(!Number.isFinite(startedAt)||startedAt>now)return {ok:false,reason:'invalid-registered-origin',snapshot:audioSnapshot()};
  if(receipt!==lastReceipt||receipt.causeID!==lastReceipt?.causeID||receipt.targetGeneration!==targetGeneration||disposed||retiring||!audioEnabled||audioContext?.state!=='running'||sounded.has(receipt.causeID)||!audioEligible({...receipt,age,verify,muted}))return {ok:false,reason:'gated',snapshot:audioSnapshot()};
  let samples;try{samples=synthShot(audioContext.sampleRate,receipt.sequence)}catch{audioAttempt={causeID:receipt.causeID,ok:false,reason:'invalid-sample',clockDomain:'performance.now',ageSeconds:(now-startedAt)/1000};return {ok:false,reason:'invalid-sample',snapshot:audioSnapshot()}}
  const buffer=audioContext.createBuffer(1,samples.length,audioContext.sampleRate);buffer.copyToChannel(samples,0);
  const source=audioContext.createBufferSource(),gain=audioContext.createGain();gain.gain.value=.5;source.buffer=buffer;source.connect(gain).connect(audioContext.destination);
  const timing=resolveCauseOffset({startedAt,now,sampleRate:audioContext.sampleRate,sampleCount:samples.length,verify:verify||muted});audioAttempt={causeID:receipt.causeID,registeredStartedAt:startedAt,...timing,started:false};
  if(!timing.ok){source.disconnect();gain.disconnect();return {ok:false,reason:timing.reason,snapshot:audioSnapshot()}}
  if(!audioEligible({...receipt,age:timing.ageSeconds,verify,muted})){audioAttempt={causeID:receipt.causeID,...timing,ok:false,reason:'trigger-window-expired',started:false};source.disconnect();gain.disconnect();return {ok:false,reason:'trigger-window-expired',snapshot:audioSnapshot()}}
  const started=startBufferAtCauseOffset(source,timing);if(!started.ok){audioAttempt={causeID:receipt.causeID,...timing,ok:false,reason:started.reason,started:false};source.disconnect();gain.disconnect();return {ok:false,reason:started.reason,snapshot:audioSnapshot()}}
  audioAttempt={causeID:receipt.causeID,...started,started:true};const voice={source,gain};voices.add(voice);source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect()};sounded.add(receipt.causeID);
  audioEvent={causeID:receipt.causeID,sequence:receipt.sequence,age:timing.ageSeconds,clockDomain:timing.clockDomain,bufferOffsetSeconds:timing.offsetSeconds,expectedRemainingDurationSeconds:timing.expectedRemainingDurationSeconds,registeredStartedAt:startedAt,time:audioContext.currentTime,type:'synthetic-pressure-and-slide',started:true};
  return {ok:true,reason:'started',source,gain,offset:started,snapshot:audioSnapshot()};
 }
 function setMuted(value){muted=verify||!!value;if(muted)stopAudio();return audioSnapshot()}
 function dispose(){if(retirePromise)return retirePromise;retiring=true;stopAudio();retirePromise=(async()=>{if(drawFlight)await drawFlight;disposed=true;if(audioContext)await audioContext.close();targets?.scene.destroy();targets?.light.destroy();uniform.destroy();device.destroy();await lostPromise;return {disposed:true,serial,lastReceipt,loss}})();return retirePromise}
 resize(canvas.width||960,canvas.height||480);
 return {draw,resize,enableAudio,sound,setMuted,stopAudio,dispose,audioSnapshot,snapshot:()=>({ready:!disposed,disposed,retiring,...AUTHORITY,shaderMessages,lastReceipt,scopeErrors,loss,targetGeneration})};
}

export async function mountPreview(){
 const startup=globalThis.__dvaShootingStartup;const report=(stage,status,extra)=>startup?.report(stage,status,extra);
 const canvas=document.querySelector('canvas'),query=new URLSearchParams(location.search),verify=query.has('verify');
 let runtime,disposed=false,disposePromise=null,initFlight=null,renderFlight=null,pending=false,ready=false,running=true,held=false,holdAge=.022,sourceEnabled=true,observerEnabled=true,background=0,direction=[1,0],cause=0,start=performance.now(),raf=0,busy=false,history=[],warmupReceipt=null;
 const status=document.querySelector('#status');
 function completedSourceFrameProof(receipt,live,box){
  const gpu=runtime?.snapshot();
  const age=receipt?.age,observedAge=live?.age;
  const eligible=!!receipt&&receipt===gpu?.lastReceipt&&receipt.versionID===AUTHORITY.versionID&&receipt.groupID===AUTHORITY.groupID&&receipt.completed===true&&receipt.submitted===true&&receipt.active===true&&receipt.sourceEnabled===true&&receipt.observerEnabled===true&&receipt.held===false&&Number.isSafeInteger(receipt.sequence)&&receipt.sequence>0&&Number.isSafeInteger(receipt.targetGeneration)&&receipt.targetGeneration>0&&receipt.targetGeneration===gpu?.targetGeneration&&receipt.passes===2&&Array.isArray(receipt.errorScopes)&&receipt.errorScopes.every(x=>x===null)&&/^shooting-[1-9]\d*$/.test(receipt.causeID||'')&&receipt.causeID===live?.causeID&&Number.isFinite(age)&&age>=0&&Number.isFinite(observedAge)&&age<=observedAge&&observedAge<LIFE&&live?.ready===true&&live?.disposed===false&&live?.running===true&&live?.held===false&&live?.sourceEnabled===true&&live?.observerEnabled===true&&gpu?.ready===true&&gpu?.disposed===false&&gpu?.retiring===false&&canvas.isConnected&&box.width>0&&box.height>0;
  if(!eligible)return null;
  return {recorded:true,submitted:true,completed:true,canvasConnected:true,passes:2,viewportWidth:box.width,viewportHeight:box.height,causeID:receipt.causeID,sequence:receipt.sequence,targetGeneration:receipt.targetGeneration,proofSchema:'dva-completed-source-frame/v1',sourceOn:receipt.sourceEnabled,observerOn:receipt.observerEnabled,warmup:false,active:true,held:false,running:true,ageSeconds:age,observedAgeSeconds:observedAge,lifetimeSeconds:LIFE};
 }
 const snapshot=()=>({ready,disposed,...AUTHORITY,running,held,age:held?holdAge:running?(performance.now()-start)/1000:LIFE,causeID:`shooting-${cause}`,sourceEnabled,observerEnabled,background,direction,loopSeconds:LOOP,lifetimeSeconds:LIFE,warmupReceipt,history:history.slice(-240),runtime:runtime?.snapshot(),audio:runtime?.audioSnapshot()});
 function newCause(){cause++;start=performance.now();runtime?.stopAudio()}
 function play(){if(disposed||!ready)return snapshot();held=false;running=true;newCause();schedule();return snapshot()}
 function stop(){running=false;held=false;runtime?.stopAudio();renderIdle();return snapshot()}
 function hold(age){if(!ready||disposed)return snapshot();if(!Number.isFinite(age)||age<0)throw new TypeError('finite nonnegative hold');running=false;held=true;holdAge=age;newCause();runtime?.stopAudio();render();return snapshot()}
 const api={snapshot,play,replay:play,stop,hold,setSourceEnabled(v){sourceEnabled=!!v;if(!sourceEnabled)runtime?.stopAudio();render();return snapshot()},setObserverEnabled(v){observerEnabled=!!v;render();return snapshot()},setBackground(v){background=Number(v);render();return snapshot()},setDirection(x,y){direction=normalizeDirection(x,y);render();return snapshot()},enableAudio:()=>runtime.enableAudio(),setMuted:v=>runtime.setMuted(v),dispose(){if(disposePromise)return disposePromise;disposed=true;running=false;cancelAnimationFrame(raf);disposePromise=(async()=>{if(initFlight)try{await initFlight}catch{}if(renderFlight)await renderFlight;await runtime?.dispose();return snapshot()})();return disposePromise}};
 globalThis.__DVA_SHOOTING_E_R4__=api;
 const renderIdle=()=>render(LIFE);
 function schedule(){if(!disposed&&!raf)raf=requestAnimationFrame(()=>{raf=0;render()})}
 function render(forcedAge){if(busy){pending=true;return renderFlight}renderFlight=renderInner(forcedAge).finally(()=>{renderFlight=null});return renderFlight}
 async function renderInner(forcedAge){
  if(!ready||disposed||busy){if(running)schedule();return}
  busy=true;try{
   let age=forcedAge??(held?holdAge:running?(performance.now()-start)/1000:LIFE);
   if(running&&age>=LOOP){newCause();age=(performance.now()-start)/1000}
   const width=960,height=480;runtime.resize(width,height);
   const receipt=await runtime.draw({age,causeID:`shooting-${cause}`,muzzle:[340,255],direction,sourceEnabled,observerEnabled,background,seed:cause,scale:1,held});
   history.push(receipt);if(history.length>300)history.shift();
   if(!disposed&&!held&&running&&sourceEnabled&&receipt.causeID===`shooting-${cause}`&&receipt.active&&receipt.completed){const startedAt=start;runtime.sound(receipt,{age:(performance.now()-startedAt)/1000,startedAt});}
   if(status)status.textContent=`${AUTHORITY.versionID} · ${receipt.phase} · ${age.toFixed(3)}秒 · ${verify?'検証消音':runtime.audioSnapshot().muted?'消音':'音声'}`;
  }catch(e){running=false;if(status)status.textContent=e.message;api.error=String(e)}finally{busy=false;if(!disposed&&(running||pending)){pending=false;schedule()}}
 }
 try{report('adapter','pending');initFlight=createShootingRuntime(canvas,{verify,onStartup:report,isRetiring:()=>disposed||startup?.isRetiring()});runtime=await initFlight;if(disposed||startup?.isRetiring()){await runtime.dispose();return api}report('pipelines','pending',{warmup:'pending'});
  const warmupFlight=runtime.draw({age:LIFE,causeID:'preview-warmup',muzzle:[340,255],direction,sourceEnabled:false,observerEnabled:false,background,seed:0,scale:1,held:true});
  renderFlight=warmupFlight;try{warmupReceipt=await warmupFlight}finally{renderFlight=null}
  if(disposed||startup?.isRetiring()){await runtime.dispose();return api}
  if(!warmupReceipt.completed||!warmupReceipt.submitted||warmupReceipt.passes!==2||warmupReceipt.active||warmupReceipt.sourceEnabled||warmupReceipt.observerEnabled||warmupReceipt.errorScopes.some(Boolean)||warmupReceipt.width!==960||warmupReceipt.height!==480||warmupReceipt.targetGeneration!==runtime.snapshot().targetGeneration)throw new Error('idle warm-up receipt is incomplete');
  report('pipelines','ready',{warmupReceipt});ready=true;newCause();report('first-frame','pending');const firstFlight=render();await firstFlight;if(disposed||startup?.isRetiring()){await runtime.dispose();return api}schedule();api.ready=Promise.resolve(api.snapshot());startup?.setApi(api);
  const first=runtime.snapshot().lastReceipt;const active=snapshot();const box=canvas.getBoundingClientRect();const firstFrame=completedSourceFrameProof(first,active,box);if(!firstFrame)throw new Error('no eligible completed source frame for current running cause');report('first-frame','ready',{firstFrame});report('playing','ready',{firstFrame});
 }catch(e){api.error=String(e);if(status)status.textContent=String(e);if(e?.name!=='AbortError')startup?.fail(e);if(runtime)await runtime.dispose();throw e}
 document.querySelector('#replay')?.addEventListener('click',play);
 document.querySelector('#audio')?.addEventListener('click',async()=>{const result=await runtime.enableAudio();if(result.ok)play();else if(status)status.textContent=`音声: ${result.reason}`});
 document.querySelector('#mute')?.addEventListener('click',()=>runtime.setMuted(!runtime.audioSnapshot().muted));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 addEventListener('pagehide',()=>api.dispose(),{once:true});return api;
}
if(typeof document!=='undefined'&&document.querySelector('canvas[data-shooting-preview]'))mountPreview();
