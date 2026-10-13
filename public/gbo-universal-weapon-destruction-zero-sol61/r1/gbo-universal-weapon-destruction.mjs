import {createDestructionAudio} from './gbo-destruction-sfx.mjs';
export const VERSION='gbo-universal-weapon-destruction-zero-sol61-r1';
export const DURATION=1.42;
export const DEFAULT_OPTIONS=Object.freeze({h64:64,loop:false,loopGap:1,source:true,observer:true,reducedMotion:false,anchor:Object.freeze([.5,.5]),support:Object.freeze([.75,.375]),angle:0,muted:false});
const copy=value=>JSON.parse(JSON.stringify(value));
function normalize(input,verify){
 const o={...DEFAULT_OPTIONS,...input};
 if(!Number.isFinite(o.h64)||o.h64<=0||o.h64>1024)throw Error('h64 must be positive CSS px <=1024');
 if(!Number.isFinite(o.loopGap)||o.loopGap<.1||o.loopGap>60)throw Error('loopGap must be .1..60 seconds');
 for(const name of ['source','observer','reducedMotion','loop','muted'])if(typeof o[name]!=='boolean')throw Error(name+' must be boolean');
 for(const name of ['anchor','support'])if(!Array.isArray(o[name])||o[name].length!==2||!o[name].every(Number.isFinite))throw Error(name+' needs two finite coordinates');
 if(o.support.some(v=>v<=0||v>3))throw Error('support is positive relative H64, <=3');
 if(!Number.isFinite(o.angle))throw Error('angle must be radians');
 o.anchor=[...o.anchor];o.support=[...o.support];o.muted=!!verify||o.muted;return o;
}
export async function createGboWeaponDestruction({canvas,verify=false,options={},deps={},onPhase=()=>{}}={}){
 if(!canvas)throw Error('WebGPU canvas required');
 const now=deps.now??(()=>performance.now());
 const raf=deps.requestAnimationFrame??(fn=>requestAnimationFrame(fn));
 const caf=deps.cancelAnimationFrame??(id=>cancelAnimationFrame(id));
 const notify=data=>{try{onPhase(copy(data));}catch{}};
 let opts=normalize(options,verify),disposed=false,disposing=false,state='initializing',generation=0,causeCounter=0,causeId=null;
 let start=0,heldAge=0,rafId=null,sequence=0,settingsRevision=0,targetGeneration=0,lastKey='',viewport=null;
 let latestSubmitted=null,latestCompleted=null,disposal=null,fatal=null,expectedLoss=false,lostResult=null;
 const pending=new Set(),errors=[],resources=new Set();
 const device=deps.device??await (await (deps.gpu??deps.navigator?.gpu??globalThis.navigator?.gpu)?.requestAdapter())?.requestDevice();
 if(!device)throw Error('WebGPU unavailable');
 const context=deps.context??canvas.getContext('webgpu');
 if(!context){device.destroy();throw Error('WebGPU context unavailable');}
 const format=deps.format??(deps.gpu??deps.navigator?.gpu??globalThis.navigator?.gpu)?.getPreferredCanvasFormat?.()??'bgra8unorm';
 const audio=createDestructionAudio({verify,createAudioContext:deps.createAudioContext??(()=>new (globalThis.AudioContext??globalThis.webkitAudioContext)()),onState:a=>notify({phase:a.error?'audio-error':'audio-state',audio:a})});
 const lostPromise=device.lost?.then(info=>{lostResult={reason:info.reason,message:info.message??'',expected:expectedLoss&&info.reason==='destroyed'};if(!lostResult.expected){fatal='GPU device lost: '+info.reason;state='failed';cancel();audio.stop();}return lostResult;});
 device.addEventListener?.('uncapturederror',event=>{errors.push(String(event.error?.message??event));fatal=errors.at(-1);state='failed';cancel();audio.stop();notify({phase:'error',error:fatal});});
 let worldTexture=null,emissionTexture=null,worldBind=null,presentBind=null;
 function cancel(){if(rafId!==null){caf(rafId);rafId=null;}}
 const BU=globalThis.GPUBufferUsage??{UNIFORM:64,COPY_DST:8};
 const TU=globalThis.GPUTextureUsage??{RENDER_ATTACHMENT:16,TEXTURE_BINDING:4};
 let uniform,worldPipeline,presentPipeline,sampler;
 const readShader=deps.loadShader??(async file=>{const response=await fetch(new URL(file,import.meta.url));if(!response.ok)throw Error('Shader '+file+' '+response.status);return response.text();});
 try{
  const [worldCode,presentCode]=await Promise.all([readShader('world.wgsl'),readShader('present.wgsl')]);
  const worldModule=device.createShaderModule({label:VERSION+'/world',code:worldCode}),presentModule=device.createShaderModule({label:VERSION+'/present',code:presentCode});
  for(const module of [worldModule,presentModule])if(module.getCompilationInfo){const info=await module.getCompilationInfo();const bad=info.messages.filter(m=>m.type==='error');if(bad.length)throw Error(bad.map(m=>m.message).join('\n'));}
  const mk=desc=>device.createRenderPipelineAsync?device.createRenderPipelineAsync(desc):device.createRenderPipeline(desc);
  worldPipeline=await mk({label:VERSION+'/world',layout:'auto',vertex:{module:worldModule,entryPoint:'vs'},fragment:{module:worldModule,entryPoint:'fs',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  presentPipeline=await mk({label:VERSION+'/present',layout:'auto',vertex:{module:presentModule,entryPoint:'vs'},fragment:{module:presentModule,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
  uniform=device.createBuffer({label:'gbo-uniform',size:64,usage:BU.UNIFORM|BU.COPY_DST});resources.add(uniform);
  sampler=device.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
 }catch(error){try{context.unconfigure();}catch{}for(const r of resources)r.destroy();expectedLoss=true;device.destroy();await audio.close();throw error;}
 function measure(){
  const rect=canvas.getBoundingClientRect(),ratio=deps.devicePixelRatio??globalThis.devicePixelRatio??1;
  if(!Number.isFinite(rect.width)||!Number.isFinite(rect.height)||rect.width<=0||rect.height<=0||!Number.isFinite(ratio)||ratio<=0)return null;
  return {cssWidth:rect.width,cssHeight:rect.height,backingWidth:Math.max(1,Math.round(rect.width*ratio)),backingHeight:Math.max(1,Math.round(rect.height*ratio)),ratio,h64CSS:opts.h64,h64Backing:opts.h64*ratio};
 }
 function resize(v){
  if(viewport?.backingWidth===v.backingWidth&&viewport?.backingHeight===v.backingHeight){viewport=v;return;}
  for(const tex of [worldTexture,emissionTexture])if(tex){tex.destroy();resources.delete(tex);}
  canvas.width=v.backingWidth;canvas.height=v.backingHeight;
  context.configure({device,format,alphaMode:'premultiplied'});
  worldTexture=device.createTexture({label:'gbo-world',size:[v.backingWidth,v.backingHeight],format:'rgba16float',usage:TU.RENDER_ATTACHMENT|TU.TEXTURE_BINDING});
  emissionTexture=device.createTexture({label:'gbo-emission',size:[v.backingWidth,v.backingHeight],format:'rgba16float',usage:TU.RENDER_ATTACHMENT|TU.TEXTURE_BINDING});resources.add(worldTexture);resources.add(emissionTexture);
  worldBind=device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
  presentBind=device.createBindGroup({layout:presentPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:worldTexture.createView()},{binding:2,resource:emissionTexture.createView()},{binding:3,resource:sampler}]});
  targetGeneration++;viewport=v;
 }
 function validAudio(){return !disposed&&!disposing&&!fatal&&state==='active'&&!opts.muted&&!!measure()&&!(deps.isHidden?.()??globalThis.document?.hidden??false);}
 function submit(age,force=false,terminal=false){
  if(disposed||fatal||disposing&&!terminal)return null;
  const v=measure();if(!v){audio.stop();return null;}
  resize(v);const phase=age<=0?'clear':age<.22?'stress':age<.60?'rupture':age<1.18?'disassembly':age<DURATION?'extinction':'clear';
  const key=JSON.stringify([causeId,generation,age,settingsRevision,targetGeneration,v]);if(!force&&key===lastKey)return null;lastKey=key;
  const values=new Float32Array([v.backingWidth,v.backingHeight,v.h64Backing,0,age,Number(opts.source),Number(opts.observer),0,opts.anchor[0],opts.anchor[1],opts.angle,0,opts.support[0],opts.support[1],Number(opts.reducedMotion),0]);
  device.queue.writeBuffer(uniform,0,values);
  const encoder=device.createCommandEncoder({label:VERSION+'/'+phase});
  const wp=encoder.beginRenderPass({label:'world',colorAttachments:[worldTexture,emissionTexture].map(texture=>({view:texture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}))});wp.setPipeline(worldPipeline);wp.setBindGroup(0,worldBind);wp.draw(3);wp.end();
  const pp=encoder.beginRenderPass({label:'present',colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pp.setPipeline(presentPipeline);pp.setBindGroup(0,presentBind);pp.draw(3);pp.end();
  device.queue.submit([encoder.finish()]);
  const receipt={version:VERSION,causeId,cause:causeId,generation,age,sequence:++sequence,passes:2,active:age>0&&age<DURATION,source:opts.source,phase,viewport:copy(v),options:copy(opts),settingsRevision,targetGeneration,terminal,completed:false};latestSubmitted=receipt;notify({phase:'submitted',frame:receipt});
  // Capture every identity at submit time; never rebuild from mutable playback state.
  const done=Promise.resolve(device.queue.onSubmittedWorkDone()).then(()=>{const result={...receipt,completed:true};if(!latestCompleted||result.sequence>latestCompleted.sequence)latestCompleted=result;notify({phase:'completed',frame:result});return result;},error=>{errors.push(String(error));fatal=String(error);state='failed';cancel();audio.stop();notify({phase:'error',error:fatal,frame:receipt});throw error;});
  pending.add(done);done.then(()=>pending.delete(done),()=>pending.delete(done));return done;
 }
 function ageNow(){return state==='held'?heldAge:state==='active'?Math.max(0,(now()-start)/1000):DURATION;}
 function schedule(){if(rafId===null&&!disposed&&!disposing&&!fatal&&state==='active')rafId=raf(tick);}
 function tick(){rafId=null;if(disposed||disposing||fatal||state!=='active')return;
  if(deps.isHidden?.()??globalThis.document?.hidden??false){stop();return;}
  const age=ageNow();
  try{
   if(age>=DURATION){submit(DURATION);audio.stop(false);if(opts.loop&&age>=DURATION+opts.loopGap){replay();return;}if(!opts.loop){state='finished';notify({phase:'finished',frame:latestSubmitted});return;}}
   else{submit(age);audio.play(causeId,age,validAudio);}
  }catch(error){fatal=String(error);state='failed';cancel();audio.stop();notify({phase:'error',error:fatal});return;}
  schedule();
 }
 function replay(id){if(disposed||disposing||fatal||typeof id==='string'&&id===causeId)return false;cancel();audio.stop(false);generation++;causeId=typeof id==='string'&&id?id:'gbo-cause-'+(++causeCounter);start=now();heldAge=0;state='active';submit(0);audio.play(causeId,0,validAudio);schedule();return true;}
 function hold(age){if(disposed||disposing||fatal)return false;if(!Number.isFinite(age)||age<0||age>DURATION)throw Error('hold age must be 0..1.42 seconds');cancel();audio.stop();state='held';heldAge=age;return submit(age)??Promise.resolve(latestCompleted);}
 function stop(){if(disposed||disposing)return false;cancel();audio.stop();state='stopped';submit(DURATION);notify({phase:'stopped',frame:latestSubmitted});return true;}
 function setOptions(partial){if(disposed||disposing)return false;const next=normalize({...opts,...partial},verify);if(JSON.stringify(next)===JSON.stringify(opts))return true;opts=next;settingsRevision++;if(opts.muted)audio.stop();submit(ageNow());if(state==='active')schedule();return true;}
 async function activateAudioFromGesture(){if(verify||!validAudio())return false;const token=generation;const ok=await audio.activate(()=>token===generation&&validAudio());if(ok&&token===generation&&validAudio())audio.play(causeId,ageNow(),validAudio);return ok;}
 let disposePromise=null;
 async function doDispose(){
  disposing=true;cancel();audio.stop();
  const failures=[],drainBefore=await Promise.allSettled([...pending]);
  if(drainBefore.some(v=>v.status==='rejected'))failures.push('pending queue completion rejected');
  let terminal=null,queueDrained=false,unconfigured=false,resourcesDestroyed=true,deviceDestroyed=false;
  try{terminal=await submit(DURATION,true,true);await Promise.allSettled([...pending]);await device.queue.onSubmittedWorkDone();queueDrained=true;if(!terminal?.completed)failures.push('terminal clear not completed');}catch(error){failures.push(String(error));}
  try{context.unconfigure();unconfigured=true;}catch(error){failures.push(String(error));}
  for(const resource of resources)try{resource.destroy();}catch(error){resourcesDestroyed=false;failures.push(String(error));}resources.clear();
  expectedLoss=true;try{device.destroy();deviceDestroyed=true;}catch(error){failures.push(String(error));}
  const audioResult=await audio.close();const loss=deviceDestroyed&&lostPromise?await lostPromise:null;
  if(!loss?.expected)failures.push('owned destroyed loss not settled');
  disposed=true;disposing=false;state='disposed';
  disposal={status:failures.length?'cleanup-failed':'disposed',terminalReceipt:terminal,drainBefore:drainBefore.map(v=>v.status),queueDrained,unconfigured,resourcesDestroyed,deviceDestroyed,lost:loss,audio:audioResult,failures};
  notify({phase:'disposed',disposal});return copy(disposal);
 }
 function dispose(){if(!disposePromise)disposePromise=doDispose();return disposePromise;}
 function snapshot(){return copy({version:VERSION,ready:state!=='initializing'&&state!=='failed'&&!disposed,duration:DURATION,state,age:ageNow(),causeId,cause:causeId,generation,lastReceipt:latestCompleted,renderer:{deviceLost:lostResult},lifecycle:{disposeSettled:disposed,teardown:disposal,deviceDrained:disposal?.queueDrained??false,deviceDestroyed:disposal?.deviceDestroyed??false,deviceLostSettled:!!disposal?.lost},options:opts,viewport,latestSubmitted,latestCompleted,pendingCallbacks:pending.size,disposed,disposing,disposal,errors,fatal,lost:lostResult,audio:{...audio.snapshot(),verify:!!verify,muted:opts.muted}});}
 state='ready';notify({phase:'ready',version:VERSION});replay();return {replay,hold,stop,dispose,setOptions,snapshot,activateAudioFromGesture};
}
