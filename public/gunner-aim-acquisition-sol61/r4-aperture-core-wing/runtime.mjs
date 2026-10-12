import {META,VARIANTS,validateSource,makeFixtureSource,plan} from './contract.mjs';
import {createAudio,completeRenderReceipt,dispatchCompletedReceipt,stopAudioForLifecycle} from './audio.mjs';
const params=new URLSearchParams(location.search),verify=params.has('verify');
const canvas=document.querySelector('canvas'),status=document.querySelector('#status');
const audio=createAudio({verify});
let device,context,uniform,hdr,sourcePipeline,observerPipeline,sourceGroup,observerGroup;
let source=null,age=0,start=0,held=false,loop=true,playing=false,disposed=false,ready=false,raf=0,generation=0,serial=0,submitted=0,completed=0,inFlight=0;
let fixtureHeight=params.get('fixture')==='128'?128:64,sourceEnabled=true,observerEnabled=true,variant='handgun',latestReceipt=null;
const receipts=[],errors=[],diagnostics=[],cycles=[],deviceLosses=[];let retirement=null,expectedLostDevice=null,deviceLostPromise=Promise.resolve(null),disposePromise=null,cleanupPromise=null;let endRecorded=false;let renderChain=Promise.resolve();let pending=0;
const galleryStartup=window.__dvaGalleryStartup;
const retiredError=()=>Object.assign(new Error('Gallery preview retired during startup'),{name:'GalleryRetiredError'});
function assertAlive(){if(disposed||galleryStartup?.isRetired?.())throw retiredError();}
function startup(stage,status='pending',extra={}){galleryStartup?.publish?.(stage,status,extra);}
function startupFailure(stage,error){if(error?.name==='GalleryRetiredError'||disposed||galleryStartup?.isRetired?.())return;startup(stage,'error',{error:{code:String(error?.code||'GUNNER_AIM_STARTUP_FAILED'),message:String(error?.message||error).slice(0,500)}});}
function releasePartialResources(){try{hdr?.destroy();}catch{}try{uniform?.destroy();}catch{}hdr=uniform=null;try{context?.unconfigure?.();}catch{} }
function snapshot(){return {...META,ready,verify,disposed,playing,loop,held,ageMs:age,phase:source?plan(source,age,fixtureHeight).phase:'idle',cause:source?.id||null,source:source?structuredClone(source):null,generation,sourceEnabled,observerEnabled,fixtureHeight,sourceHeight:fixtureHeight,submitted,completed,inFlight,pending,latestReceipt:latestReceipt?structuredClone(latestReceipt):null,receipts:structuredClone(receipts),cycles:structuredClone(cycles),diagnostics:structuredClone(diagnostics),errors:[...errors],audio:audio.snapshot(),viewport:{backingWidth:canvas.width,backingHeight:canvas.height,cssWidth:canvas.getBoundingClientRect().width,cssHeight:canvas.getBoundingClientRect().height,dpr:devicePixelRatio,logicalWidth:640,logicalHeight:320},retirement,deviceLosses:structuredClone(deviceLosses)};}
function report(){status.textContent=errors.length?errors[errors.length-1]:`${META.title} · ${ready?'WebGPU':'準備中'} · ${Math.round(age)}ms`;document.documentElement.dataset.ready=String(ready);document.documentElement.dataset.cause=source?.id||'';}
function recordDeviceLoss(target,info){
 const reason=String(info?.reason??'unknown'),message=String(info?.message??'');
 const ownedDevice=target===device;
 const expected=ownedDevice&&target===expectedLostDevice&&retirement?.owned===true&&retirement?.expectedDeviceLost===true&&retirement?.destroyCalled===true&&reason===retirement?.expectedLossReason;
 const row={reason,message,expected,ownedDevice,at:performance.now()};deviceLosses.push(row);
 if(!expected)errors.push(`device-lost:${reason}:${message}`);
 report();return row;
}function render(){pending++;const frozen={cause:source?.id||null,source:source?structuredClone(source):null,generation,ageMs:age,phase:source?plan(source,age,fixtureHeight).phase:'idle',sourceEnabled,observerEnabled,fixtureHeight,active:!!source&&age>=0&&age<900,submittedAt:performance.now(),viewport:{width:canvas.width,height:canvas.height}};
 renderChain=renderChain.then(async()=>{if(disposed||!ready){pending--;return snapshot();}
 inFlight++;const s=frozen.source||makeFixtureSource(0,variant,0);const values=new Float32Array([640,320,1/canvas.width,1/canvas.height,s.x,s.y,s.targetX,s.targetY,frozen.source?frozen.ageMs:900,frozen.fixtureHeight/64,frozen.fixtureHeight,0,frozen.sourceEnabled?1:0,frozen.observerEnabled?1:0,0,0]);device.queue.writeBuffer(uniform,0,values);
 const encoder=device.createCommandEncoder();const p=encoder.beginRenderPass({colorAttachments:[{view:hdr.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});p.setPipeline(sourcePipeline);p.setBindGroup(0,sourceGroup);p.draw(3);p.end();
 const q=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});q.setPipeline(observerPipeline);q.setBindGroup(0,observerGroup);q.draw(3);q.end();
 const seq=++submitted;device.queue.submit([encoder.finish()]);await device.queue.onSubmittedWorkDone();assertAlive();completed=seq;inFlight--;pending--;
 latestReceipt=completeRenderReceipt(frozen,seq,performance.now());receipts.push(latestReceipt);if(receipts.length>240)receipts.shift();
 dispatchCompletedReceipt(audio,latestReceipt,{source,generation,playing,held,sourceEnabled,disposed,retired:galleryStartup?.isRetired?.()===true});
 if(frozen.phase==='expired'&&!endRecorded&&frozen.generation===generation){endRecorded=true;cycles.push({...latestReceipt});if(cycles.length>64)cycles.shift();}
 report();return snapshot();}).catch(e=>{inFlight=Math.max(0,inFlight-1);pending=Math.max(0,pending-1);if(e?.name!=='GalleryRetiredError'&&!disposed&&!galleryStartup?.isRetired?.())errors.push(String(e.stack||e));playing=false;report();throw e;});return renderChain;
}
function begin(input){if(source)stopAudioForLifecycle(audio,'replacement',source.id);const now=performance.now();const s=input?structuredClone(input):makeFixtureSource(++serial,variant,now);if(!validateSource(s))throw new TypeError('Gunner aim acquisition source rejected');if(input&&(now-s.startedAt<0||now-s.startedAt>=900))throw new TypeError('Source timestamp outside live900ms');source=s;age=now-s.startedAt;start=s.startedAt;held=false;playing=true;generation++;endRecorded=false;return render();}
function tick(){if(disposed)return;const now=performance.now();if(ready&&playing&&!held&&!document.hidden&&pending===0){age=now-start;if(age>=900){stopAudioForLifecycle(audio,'expiry',source?.id);age=900;playing=false;render().then(()=>{if(loop&&!held&&!disposed){start=performance.now()+550;playing=true;source=null;}});}else render();}
 else if(ready&&playing&&!held&&source===null&&now>=start)begin();
 // loop waiting has no source; no expired-cause resubmissions.
 if(ready&&playing&&!held&&source===null){if(now>=start)begin();}
 raf=requestAnimationFrame(tick);
}
let startupStage='adapter';
let readyPromise=Promise.resolve(null);
async function initialize(){
 assertAlive();
 if(!navigator.gpu){const e=new Error('WebGPU required');e.code='WEBGPU_UNSUPPORTED';throw e;}
 startupStage='adapter';startup('adapter','pending');
 const adapter=await navigator.gpu.requestAdapter();assertAlive();
 if(!adapter)throw new Error('WebGPU adapter missing');startup('adapter','ready');
 startupStage='device';startup('device','pending');
 const requestedDevice=await adapter.requestDevice();
 device=requestedDevice;deviceLostPromise=requestedDevice.lost.then(info=>recordDeviceLoss(requestedDevice,info));
 if(disposed||galleryStartup?.isRetired?.()){requestedDevice.destroy();retirement={owned:true,submitted,at:performance.now(),destroyCalled:true,expectedDeviceLost:true,expectedLossReason:'destroyed'};expectedLostDevice=requestedDevice;await deviceLostPromise;throw retiredError();}
 requestedDevice.addEventListener('uncapturederror',e=>{if(disposed)return;errors.push(String(e.error));report();});
 startup('device','ready');context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();canvas.width=640;canvas.height=320;context.configure({device:requestedDevice,format,alphaMode:'opaque'});assertAlive();
 startupStage='assets';startup('assets','pending');
 const codes=await Promise.all(['source.wgsl','observer.wgsl'].map(async n=>{const r=await fetch(new URL(n,import.meta.url));assertAlive();if(!r.ok)throw new Error(`${n}:HTTP ${r.status}`);const code=await r.text();assertAlive();return [n,code];}));assertAlive();const modules=[];
 for(const [name,code] of codes){assertAlive();const module=requestedDevice.createShaderModule({label:name,code});const info=await module.getCompilationInfo();assertAlive();const messages=info.messages.map(m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));diagnostics.push({module:name,messages});if(messages.some(m=>m.type==='error'))throw new Error(`${name}:WGSL error`);modules.push(module);}
 startup('assets','ready');startupStage='pipelines';startup('pipelines','pending');requestedDevice.pushErrorScope('validation');
 sourcePipeline=await requestedDevice.createRenderPipelineAsync({layout:'auto',vertex:{module:modules[0],entryPoint:'vs'},fragment:{module:modules[0],entryPoint:'fs',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});assertAlive();
 observerPipeline=await requestedDevice.createRenderPipelineAsync({layout:'auto',vertex:{module:modules[1],entryPoint:'vs'},fragment:{module:modules[1],entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});assertAlive();
 const pipelineError=await requestedDevice.popErrorScope();assertAlive();if(pipelineError)throw pipelineError;
 uniform=requestedDevice.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});hdr=requestedDevice.createTexture({size:[640,320],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});sourceGroup=requestedDevice.createBindGroup({layout:sourcePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});observerGroup=requestedDevice.createBindGroup({layout:observerPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:hdr.createView()},{binding:2,resource:requestedDevice.createSampler({magFilter:'linear',minFilter:'linear'})}]});assertAlive();
 ready=true;startup('pipelines','ready');startupStage='first-frame';startup('first-frame','pending');
 const first=await begin();assertAlive();const receipt=first.latestReceipt;const initial=first.receipts?.find(r=>r.sequence===receipt?.sequence);
 if(errors.length||!receipt||!initial||receipt.completed!==true||receipt.sequence!==first.submitted||receipt.sequence!==first.completed||receipt.generation!==first.generation||receipt.cause!==first.cause||receipt.passes!==2||!canvas.isConnected||canvas.width<=0||canvas.height<=0)throw new Error('Initial completed render receipt did not satisfy gallery startup proof');
 startup('first-frame','ready');startupStage='playing';startup('playing','ready',{firstFrame:{recorded:true,submitted:receipt.sequence>0,completed:receipt.completed===true,canvasConnected:canvas.isConnected===true,passes:receipt.passes,viewportWidth:receipt.viewport.width,viewportHeight:receipt.viewport.height,submissionSequence:receipt.sequence,cause:receipt.cause,generation:receipt.generation,completedAt:receipt.completedAt}});
 raf=requestAnimationFrame(tick);return snapshot();
}
async function disposeRuntime(immediate=false){
 if(cleanupPromise)return cleanupPromise;
 stopAudioForLifecycle(audio,immediate?'retire':'dispose',source?.id);
 if(immediate){disposed=true;loop=false;playing=false;held=false;age=900;cancelAnimationFrame(raf);}
 cleanupPromise=(async()=>{
  if(!immediate&&ready){loop=false;playing=false;held=false;age=900;await render().catch(()=>{});}
  if(!disposed){disposed=true;cancelAnimationFrame(raf);}
  if(!ready&&typeof readyPromise!=='undefined')await readyPromise.catch(()=>{});
  await audio.dispose().catch(()=>{});releasePartialResources();
  const owned=device;
  if(owned){retirement=retirement||{owned:true,clearCompleted:completed,submitted,at:performance.now(),destroyCalled:false,expectedDeviceLost:true,expectedLossReason:'destroyed'};expectedLostDevice=owned;if(!retirement.destroyCalled){owned.destroy();retirement.destroyCalled=true;}await deviceLostPromise.catch(()=>{});}
  await renderChain.catch(()=>{});return snapshot();
 })();disposePromise=cleanupPromise;return cleanupPromise;
}
function retireRuntime(){return disposeRuntime(true);}const api={snapshot,replay:async s=>{await readyPromise;return begin(s);},hold:async ms=>{await readyPromise;if(!Number.isFinite(ms)||ms<0||ms>900)throw new TypeError('hold age 0..900');stopAudioForLifecycle(audio,'hold',source?.id);loop=false;held=true;playing=false;if(!source){source=makeFixtureSource(++serial,variant,performance.now());generation++;}age=ms;return render();},resume:async()=>{await readyPromise;if(!source||age>=900)return begin();held=false;playing=true;start=performance.now()-age;return render();},stop:async()=>{await readyPromise;stopAudioForLifecycle(audio,'stop',source?.id);loop=false;playing=false;held=false;age=900;return render();},setNaturalLoop:value=>{loop=!!value;if(loop&&!playing&&!held)begin();return snapshot();},setSourceEnabled:async value=>{if(!value)stopAudioForLifecycle(audio,'source-disabled',source?.id);sourceEnabled=!!value;return render();},setObserverEnabled:async value=>{observerEnabled=!!value;return render();},setFixtureHeight:async value=>{if(![64,128].includes(value))throw new TypeError('fixture64/128');fixtureHeight=value;return render();},setVariant:async value=>{if(!VARIANTS.includes(value))throw new TypeError('weapon variant');variant=value;return begin();},setMuted:value=>audio.mute(value),unlockAudio:()=>audio.unlock(),dispose:()=>disposeRuntime(false)};
window.__DVA_GUNNER_AIM_R4__=api;galleryStartup?.setRetireHandler?.(retireRuntime);
readyPromise=initialize().catch(e=>{if(e?.name!=='GalleryRetiredError'&&!disposed&&!galleryStartup?.isRetired?.()){errors.push(String(e.stack||e));startupFailure(startupStage,e);}report();throw e;});api.ready=readyPromise;
for(const [id,fn] of [['replay',()=>api.replay()],['audio',()=>api.unlockAudio()],['mute',()=>api.setMuted(!audio.snapshot().muted)]])document.querySelector(`#${id}`).onclick=()=>Promise.resolve(fn()).catch(e=>{errors.push(String(e));report();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAudioForLifecycle(audio,'hidden',source?.id);playing=false;age=900;if(ready)render();}else report();});





