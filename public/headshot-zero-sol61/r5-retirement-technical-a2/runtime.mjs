import {VERSION,DURATION_MS,DEFAULTS,validateOptions,Playback} from './model.mjs';
import {HeadshotSound} from './sfx.mjs';
import {createOwnedTaskTracker,createOwnedRetirementController,classifyOwnedDeviceLoss} from './retirement-lifecycle.mjs';
const params=new URLSearchParams(location.search),verify=params.has('verify');
if(params.has('embed'))document.documentElement.classList.add('embed');
const canvas=document.querySelector('#effect'),statusNode=document.querySelector('#status');
const clock=new Playback(),sound=new HeadshotSound({verify});
let options={...DEFAULTS,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
let device,context,uniform,worldPipeline,presentPipeline,worldBind,presentBind,worldTexture;
let resourcesReady=false,ready=false,starting=false,disposed=false,failed=false,raf=0,busy=false,pending=false,submitted=0,completed=0,lastReceipt=null,diagnostics=[],scopes=[],fatal=null,loopWait=false,expectedDestroyDevice=null;
const resources=[];
let initializeSettled=false,contextAcquired=false,contextUnconfigured=false,queueDrained=false,destroyCalls=0,resourcesCreated=0,resourcesDestroyed=0;let cleanupOwnedDevice=null;
const retirementErrors=[];
const audit={versionId:VERSION,nativeStatus:'not_run',gpuError:null,deviceLost:null,disposeCompleted:false,retirementErrors};
const notify=()=>{statusNode.textContent=failed?`描画失敗: ${fatal}`:`${clock.mode} · ${Math.round(clock.age())} ms · ${completed} GPU完了 · ${sound.status}`;};
function snapshot(){return {...audit,retirement:retirementSnapshot(),status:disposed?'disposed':failed?'failed':ready?'ready':'initializing',ready,disposed,mode:clock.mode,ageMs:clock.age(),cause:clock.cause,generation:clock.generation,submitted,completed,lastReceipt,shaderDiagnostics:diagnostics,actualScopes:scopes,audioStatus:sound.status,verify,muted:sound.muted,options:{...options},width:canvas.width,height:canvas.height,rafScheduled:Boolean(raf),activeVoices:sound.voices.size};}
function retirementSnapshot(){const audio={disposed:sound.disposed,contextState:sound.context?sound.context.state:'absent',voicesRemaining:sound.voices.size};const acquired=!!device;return{creationClosed:disposed,initializeSettled,disposeSettled:audit.disposeCompleted,renderer:{pendingTasks:ownedTasks.size,busy,pending,rafScheduled:Boolean(raf),resourcesCreated,resourcesDestroyed,resourcesRemaining:resourcesCreated-resourcesDestroyed,contextAcquired,contextUnconfigured},device:{status:!acquired?'never-created':queueDrained&&destroyCalls===1&&audit.deviceLost?.expected?'destroyed-loss-settled':'retirement-incomplete',acquired,queueDrained,destroyCalls,sameOwnedDevice:acquired&&cleanupOwnedDevice===device,lostReason:audit.deviceLost?.reason??null,lostExpected:audit.deviceLost?.expected===true},audio,cleanupErrors:retirementErrors.filter(e=>e.stage.startsWith('retirement:')||['world-texture-destroy','gpu-resource-destroy','device-destroy','context-unconfigure','device-lost'].includes(e.stage))};}
function recordRuntimeError(error,stage='runtime'){
 const row={stage,name:String(error?.name||'Error'),message:String(error?.message??error),at:new Date().toISOString()};retirementErrors.push(row);
 audit.gpuError??=row.message;failed=true;fatal=row.message;cancelAnimationFrame(raf);raf=0;sound.stop();notify();
}
function fail(error){recordRuntimeError(error);}
const ownedTasks=createOwnedTaskTracker((error,stage)=>recordRuntimeError(error,stage));
function dimensions(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);if(!Number.isFinite(rect.width)||rect.width<=0||!Number.isFinite(rect.height)||rect.height<=0)return null;return {width:Math.max(1,Math.round(rect.width*dpr)),height:Math.max(1,Math.round(rect.height*dpr)),sx:rect.width*dpr/980,sy:rect.height*dpr/620};}
async function resize(dim){
 if(canvas.width===dim.width&&canvas.height===dim.height&&worldTexture)return;
 // Fence only when an existing target is about to be released; initial allocation has no prior GPU use.
 if(worldTexture){await device.queue.onSubmittedWorkDone();if(disposed)return;}
 if(worldTexture){worldTexture.destroy();resourcesDestroyed++;}canvas.width=dim.width;canvas.height=dim.height;
 worldTexture=device.createTexture({size:[dim.width,dim.height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});resourcesCreated++;
 presentBind=device.createBindGroup({layout:presentPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:worldTexture.createView()}]});
}
async function startPlaybackWhenSized(){
 if(!resourcesReady||ready||starting||disposed||failed)return;
 const dim=dimensions();if(!dim){pending=false;return;}
 starting=true;
 try{await resize(dim);if(disposed||failed)return;ready=true;clock.replay();requestRender();schedule();}
 catch(error){fail(error);}
 finally{starting=false;}
}
async function renderFrame(){
 if(!ready||disposed||failed)return;if(busy){pending=true;return;}busy=true;
 try{
  const dim=dimensions();if(!dim){sound.stop();return;}await resize(dim);if(disposed)return;
  const ageMs=clock.age();if(ageMs<0)throw new Error('non-monotonic playback clock');
  const receipt={cause:clock.cause,generation:clock.generation,ageMs,active:clock.mode!=='stopped'&&ageMs<DURATION_MS,width:dim.width,height:dim.height,source:options.source,observer:options.observer,fixture:options.fixture,submission:submitted+1};
  const h=options.fixtureH*options.zoom*dim.sy;
  const frame=new Float32Array([dim.width,dim.height,receipt.active?ageMs/1000:DURATION_MS/1000,0,options.anchorX*dim.sx,options.anchorY*dim.sy,h,options.zoom*dim.sy,Number(options.source),Number(options.observer),Number(options.fixture),0,Number(options.reducedMotion),0,0,0]);
  for(const filter of ['validation','internal','out-of-memory'])device.pushErrorScope(filter);
  device.queue.writeBuffer(uniform,0,frame);
  const encoder=device.createCommandEncoder();
  const world=encoder.beginRenderPass({colorAttachments:[{view:worldTexture.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,0]}]});world.setPipeline(worldPipeline);world.setBindGroup(0,worldBind);
  const x0=Math.max(0,Math.floor(frame[4]-.55*h)),y0=Math.max(0,Math.floor(frame[5]-.65*h));
  const x1=Math.min(dim.width,Math.ceil(frame[4]+.55*h)),y1=Math.min(dim.height,Math.ceil(frame[5]+.25*h));
  if(x1>x0&&y1>y0){world.setScissorRect(x0,y0,x1-x0,y1-y0);world.draw(3);}world.end();
  const present=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});present.setPipeline(presentPipeline);present.setBindGroup(0,presentBind);present.draw(3);present.end();
  device.queue.submit([encoder.finish()]);submitted++;
  const pops=[device.popErrorScope(),device.popErrorScope(),device.popErrorScope()];
  await device.queue.onSubmittedWorkDone();const actual=await Promise.all(pops);scopes=actual.map((e,i)=>({filter:['out-of-memory','internal','validation'][i],error:e?.message??null}));
  if(actual.some(Boolean))throw new Error(actual.filter(Boolean).map(e=>e.message).join('; '));
  completed++;lastReceipt={...receipt,completed:true};audit.nativeStatus='actual-submission-completed';
  if(!disposed&&receipt.generation===clock.generation&&receipt.cause===clock.cause)sound.play(receipt,{mode:clock.mode,cause:clock.cause,generation:clock.generation,ageMs:clock.age()});
  notify();
 }catch(error){fail(error);}finally{busy=false;if(pending&&!disposed&&!failed){pending=false;queueMicrotask(()=>void render());}}
}
function schedule(){if(raf||disposed||failed||document.hidden)return;raf=requestAnimationFrame(tick);}
function tick(){raf=0;if(disposed||failed||!ready)return;
 // Ignore stale RAF timestamp arguments: replay and sampling both read performance.now().
 const age=clock.age();if(clock.mode==='playing'&&age>=DURATION_MS){
  sound.stop();if(params.get('galleryAutoLoop')==='1'&&age>=DURATION_MS+700){clock.replay();loopWait=false;}else loopWait=true;
 }
 void render();if(clock.mode==='playing')schedule();
}
function requestRender(){if(disposed||failed)return;pending=true;if(resourcesReady&&!ready){if(!starting){pending=false;void ownedTasks.track(startPlaybackWhenSized(),'start-playback');}return;}if(ready&&!busy){pending=false;void render();}if(clock.mode==='playing')schedule();}
function replay(){if(disposed||failed)return false;sound.stop();loopWait=false;clock.replay();requestRender();return clock.cause;}
function hold(ageMs){if(disposed||failed)return false;cancelAnimationFrame(raf);raf=0;sound.stop();clock.hold(ageMs);requestRender();return true;}
function resume(){if(disposed||failed)return false;const changed=clock.resume();if(changed){requestRender();schedule();}return changed;}
function stop(){if(disposed)return false;cancelAnimationFrame(raf);raf=0;sound.stop();clock.stop();requestRender();return true;}
function setOptions(patch){if(disposed)return false;options=validateOptions(patch,options);clock.generation++;sound.stop();requestRender();return {...options};}
function render(){return ownedTasks.track(renderFrame(),'render-frame');}
const retirement=createOwnedRetirementController({
 closeAdmission(){disposed=true;ready=false;pending=false;clock.stop();cancelAnimationFrame(raf);raf=0;resizeObserver.disconnect();document.removeEventListener('visibilitychange',visibility);},
 stopPlayback(){sound.stop();},
 disposeSound(){return sound.dispose();},
 drainOwnedTasks(){return ownedTasks.drain();},
 async queueFence(){if(device){const d=device;await d.queue.onSubmittedWorkDone();if(d!==device)throw Error('owned queue changed');queueDrained=true;}},
 destroyResources(){
  const ownedDevice=device;cleanupOwnedDevice=ownedDevice;
  if(context){try{context.unconfigure();contextUnconfigured=true;}catch(error){recordRuntimeError(error,'context-unconfigure');}}
  if(worldTexture){try{worldTexture.destroy();resourcesDestroyed++;}catch(error){recordRuntimeError(error,'world-texture-destroy');}finally{worldTexture=null;}}
  for(const resource of resources.splice(0)){try{resource.destroy();resourcesDestroyed++;}catch(error){recordRuntimeError(error,'gpu-resource-destroy');}}
  if(ownedDevice){expectedDestroyDevice=ownedDevice;try{ownedDevice.destroy();destroyCalls++;}catch(error){recordRuntimeError(error,'device-destroy');}}
 },
 async awaitOwnedDeviceLost(){
  const ownedDevice=device;if(!ownedDevice)return;
  const info=await ownedDevice.lost;
  const loss=classifyOwnedDeviceLoss(info,{expectedDestroyDevice,ownedDevice});
  audit.deviceLost=loss;
  if(!loss.expected)recordRuntimeError(new Error(`unexpected owned WebGPU device loss during retirement: ${JSON.stringify(audit.deviceLost)}`),'device-lost');
 },
 complete(){audit.disposeCompleted=true;notify();},
 snapshot,
 onError(error,stage){recordRuntimeError(error,`retirement:${stage}`);}
});
async function fence(){if(retirement.promise)return retirement.fence();while(busy||pending||ownedTasks.size){await new Promise(resolve=>setTimeout(resolve,0));}if(device&&!disposed)await device.queue.onSubmittedWorkDone();return snapshot();}
function dispose(){return retirement.dispose();}
const api={versionId:VERSION,durationMs:DURATION_MS,replay,hold,resume,stop,setOptions,snapshot,dispose,enableAudio:()=>disposed?Promise.resolve(false):ownedTasks.track(sound.enable(),'audio-enable'),setMuted:value=>sound.setMuted(value),fence};
globalThis.__headshotZero=api;
globalThis.__zeroEVerification={...api,start:replay};
globalThis.__dvaGallerySfx={enable:()=>sound.enable(),setMuted:value=>sound.setMuted(value),stop:()=>sound.stop(),snapshot:()=>({status:sound.status,muted:sound.muted,verify})};
const visibility=()=>{if(document.hidden){sound.stop();cancelAnimationFrame(raf);raf=0;}else if(clock.mode==='playing')schedule();};document.addEventListener('visibilitychange',visibility);
const resizeObserver=new ResizeObserver(()=>{if(!disposed)requestRender();});resizeObserver.observe(canvas);
document.querySelector('#replay').onclick=replay;document.querySelector('#hold').onclick=()=>hold(350);document.querySelector('#resume').onclick=resume;document.querySelector('#stop').onclick=stop;document.querySelector('#audio').onclick=()=>void sound.enable();document.querySelector('#zoom').onclick=()=>setOptions({zoom:options.zoom===1?4:1});
async function initialize(){
 if(!navigator.gpu)throw new Error('WebGPU is required');
 const adapter=await navigator.gpu.requestAdapter();if(disposed)return;if(!adapter)throw new Error('No WebGPU adapter');
 device=await adapter.requestDevice();if(disposed)return;
 const ownedDevice=device;
 ownedDevice.lost.then(info=>{
  const loss=classifyOwnedDeviceLoss(info,{expectedDestroyDevice,ownedDevice});
  audit.deviceLost=loss;
  if(!loss.expected)fail(new Error(`device lost: ${info?.message||info?.reason||'unknown'}`));
 });
 ownedDevice.addEventListener('uncapturederror',event=>fail(event.error));
 context=canvas.getContext('webgpu');contextAcquired=!!context;const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 const shaderFiles=await Promise.all(['common.wgsl','world.wgsl','observer.wgsl'].map(path=>fetch(new URL(path,import.meta.url)).then(r=>{if(!r.ok)throw new Error(`${path} ${r.status}`);return r.text();})));
 const codes=[shaderFiles[0]+'\n'+shaderFiles[1],shaderFiles[0]+'\n'+shaderFiles[2]];
 if(disposed)return;
 const modules=codes.map((code,i)=>device.createShaderModule({code,label:['world','observer'][i]}));
 diagnostics=await Promise.all(modules.map(async (module,i)=>({module:['world','observer'][i],messages:(await module.getCompilationInfo()).messages.map(m=>({type:m.type,message:m.message,lineNum:m.lineNum,linePos:m.linePos}))})));
 if(disposed)return;
 if(diagnostics.some(d=>d.messages.some(m=>m.type==='error')))throw new Error('WGSL compilation failed');
 for(const filter of ['validation','internal','out-of-memory'])device.pushErrorScope(filter);
 [worldPipeline,presentPipeline]=await Promise.all(modules.map((module,i)=>device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format:i===0?'rgba16float':format}]},primitive:{topology:'triangle-list'}})));
 const setup=await Promise.all([device.popErrorScope(),device.popErrorScope(),device.popErrorScope()]);if(setup.some(Boolean))throw new Error(setup.filter(Boolean).map(e=>e.message).join('; '));
 if(disposed)return;
 uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});resources.push(uniform);resourcesCreated++;
 worldBind=device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
 if(disposed)return;resourcesReady=true;requestRender();
}
ownedTasks.track(initialize().finally(()=>{initializeSettled=true;}),'initialize').catch(()=>{});
