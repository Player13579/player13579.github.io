import { DESIGN, fixtureState, view } from './design.mjs';
import { support, scissors } from './projection.mjs';
import { resolveInputEvent, authoritativeState } from './input-state.mjs';
import { worldShader } from './world-shader.mjs';
import { postShader } from './post-shader.mjs';
import { createSfxController } from './sfx-controller.mjs';

const usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
const shaderStage = GPUShaderStage;
// Exact frozen render-contract Frame ABI: eight vec4f fields / 128 bytes.
export const FRAME_ABI_ORDER=['viewport','phase','gates','optics','layout','contact','camera','bounds'];
const makeShader = (device, code, label) => { const module=device.createShaderModule({code,label}); return module; };
// `layout` is an artist ABI field name but a reserved WGSL token. Rename the identifier only at compile time; its vec4 slot and host offset stay unchanged.
export const compileCompatibleWGSL=source=>source.replace(/\blayout\b/g,'frameLayout');
const bglWorld=(d)=>d.createBindGroupLayout({entries:[{binding:0,visibility:shaderStage.VERTEX|shaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:shaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:2,visibility:shaderStage.FRAGMENT,sampler:{type:'filtering'}}]});
const bglPost=(d)=>d.createBindGroupLayout({entries:[{binding:0,visibility:shaderStage.FRAGMENT,buffer:{type:'uniform'}},...[1,2,3,4].map(binding=>({binding,visibility:shaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float'}})),{binding:5,visibility:shaderStage.FRAGMENT,sampler:{type:'non-filtering'}}]});
const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
const targets=[0,1,2].map(()=>({format:'rgba16float',blend,writeMask:GPUColorWrite.ALL}));
function uniformBytes({width,height,dpr,age,stage,live,known,state,opts,dual,diagnostic,observerCenter,sourceShift,box}){
  const o=new ArrayBuffer(128),f=new Float32Array(o);f.set([width,height,64*dpr,dpr],0);f.set([age,stage,live?1:0,known?1:0],4);f.set([opts.source?1:0,opts.coverage?1:0,opts.actor?1:0,opts.receiver?1:0],8);f.set([opts.near?1:0,opts.cross?1:0,opts.ghost?1:0,opts.points?1:0],12);f.set([dual?1:0,diagnostic?1:0,Math.max(Math.abs(box.OBS[0]),Math.abs(box.OBS[2])),Math.max(Math.abs(box.OBS[1]),Math.abs(box.OBS[3]))],16);
  const c=state.contact??[0,0,0];f.set([c[0],c[1],c[2],0],20);f.set([observerCenter[0],observerCenter[1],sourceShift[0],sourceShift[1]],24);f.set(box.worldMetres,28);return o;
}
function pass(encoder, attachments, label, clear=true){return encoder.beginRenderPass({label,colorAttachments:attachments.map(view=>({view,loadOp:clear?'clear':'load',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}))});}
export async function createBarrierRuntime(canvas,{verification=new URL(location.href).searchParams.has('verify'),embedded=false}={}){
  if(!navigator.gpu)throw Error('WebGPU unavailable');
  const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter unavailable');
  const device=await adapter.requestDevice({requiredLimits:{maxColorAttachments:3}});const context=canvas.getContext('webgpu');if(!context)throw Error('webgpu canvas context unavailable');
  const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
  const width=canvas.width,height=canvas.height,dpr=width/(parseFloat(canvas.dataset.logicalWidth)||width);
  const makeTarget=(label)=>device.createTexture({label,size:[width,height],format:'rgba16float',usage});
  const scene=makeTarget('r8 scene'),bright=makeTarget('r8 bright'),signal=makeTarget('r8 sourceSignal'),blurX=makeTarget('r8 horizontal'),blurY=makeTarget('r8 vertical');
  const uniform=device.createBuffer({label:'r8 exact 128-byte Frame',size:128,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const actorSampler=device.createSampler({magFilter:'linear',minFilter:'linear'}),postSampler=device.createSampler({magFilter:'nearest',minFilter:'nearest'});
  const image=await createImageBitmap(await (await fetch('./body.png')).blob());const actor=device.createTexture({label:'frozen actor body.png',size:[image.width,image.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:image},{texture:actor},{width:image.width,height:image.height});image.close();
  const worldLayout=bglWorld(device),postLayout=bglPost(device),worldModule=makeShader(device,compileCompatibleWGSL(worldShader),'frozen r8 world WGSL identifier-compatible'),postModule=makeShader(device,compileCompatibleWGSL(postShader),'frozen r8 post WGSL identifier-compatible');
  for(const module of[worldModule,postModule]){const info=await module.getCompilationInfo(),errors=info.messages.filter(x=>x.type==='error');if(errors.length)throw Error(errors.map(x=>`${x.lineNum}:${x.linePos} ${x.message}`).join('\n'));}
  const worldPipelineLayout=device.createPipelineLayout({bindGroupLayouts:[worldLayout]}),postPipelineLayout=device.createPipelineLayout({bindGroupLayouts:[postLayout]});
  const worldPipelines={};for(const [key,entry,topology] of [['background','background','triangle-list'],['rear','rear','triangle-list'],['front','front','triangle-list'],['body','bodyFS','triangle-list'],['rearPoint','rearPoint','triangle-list'],['frontPoint','frontPoint','triangle-list'],['occluder','occluderFS','triangle-list']]){const vs=key==='background'?'fullVS':key==='rear'||key==='front'?'fieldVS':key==='body'?'bodyVS':key==='occluder'?'occluderVS':'pointVS';worldPipelines[key]=device.createRenderPipeline({label:'r8 '+key,layout:worldPipelineLayout,vertex:{module:worldModule,entryPoint:vs},fragment:{module:worldModule,entryPoint:entry,targets},primitive:{topology}});}
  const postPipelines={};for(const name of ['horizontal','vertical','finish'])postPipelines[name]=device.createRenderPipeline({label:'r8 '+name,layout:postPipelineLayout,vertex:{module:postModule,entryPoint:'fullVS'},fragment:{module:postModule,entryPoint:name,targets:[{format:name==='finish'?format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  const worldBG=device.createBindGroup({layout:worldLayout,entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:actor.createView()},{binding:2,resource:actorSampler}]});
  const postBG=(filtered)=>device.createBindGroup({layout:postLayout,entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:scene.createView()},{binding:2,resource:bright.createView()},{binding:3,resource:signal.createView()},{binding:4,resource:filtered.createView()},{binding:5,resource:postSampler}]});
  const audio=createSfxController({verification});
  const defaults=()=>({source:true,coverage:true,actor:true,receiver:true,near:true,cross:true,ghost:true,points:true,front:true,rear:true});let settings=defaults(),settingsSerial=0,submitId=0,lastSubmitted=null,lastState=fixtureState(0),lastStage='create',lastEvent=null,seen=new Set(),camera={observerCenter:[0,0],sourceShift:[0,0]},layout={dual:false,diagnosticOccluder:false},eventOwner={id:'fixture-owner',alive:true,visible:true,inVent:false,ejected:false,barrierDurability:100},gpuErrors=[];
  let lastError=null;device.addEventListener('uncapturederror',e=>gpuErrors.push(String(e.error?.message??e.error)));device.lost.then(info=>{if(info.reason!=='destroyed')lastError=`device lost: ${info.message}`;});
  const captureSupport=()=>support(64,dpr,camera.observerCenter,camera.sourceShift);
  const submit=async()=>{
    const box=captureSupport(),frame=uniformBytes({width,height,dpr,age:lastState.t,stage:lastState.stage,live:lastState.live,known:!!lastState.known,state:lastState,opts:settings,dual:layout.dual,diagnostic:layout.diagnosticOccluder,observerCenter:camera.observerCenter,sourceShift:camera.sourceShift,box});device.queue.writeBuffer(uniform,0,frame);
    const command=device.createCommandEncoder({label:`r8 ${lastStage} ${Math.round(lastState.t*1000)}ms serial${settingsSerial}`}),worldViews=[scene.createView(),bright.createView(),signal.createView()];
    let rp=pass(command,worldViews,'world MRT');rp.setBindGroup(0,worldBG);rp.setPipeline(worldPipelines.background);rp.draw(3);
    if((settings.source||settings.coverage)&&settings.rear){rp.setPipeline(worldPipelines.rear);for(let cell=0;cell<(layout.dual?2:1);cell++){const rect=scissors(box.world,width,height,layout.dual)[cell];rp.setScissorRect(...rect);rp.draw(6,1,0,cell);}}
    rp.setScissorRect(0,0,width,height);
    if(settings.points){rp.setPipeline(worldPipelines.rearPoint);rp.draw(6,(layout.dual?2:1)*2);}
    if(settings.actor){rp.setPipeline(worldPipelines.body);rp.draw(6,layout.dual?2:1);}
    if((settings.source||settings.coverage)&&settings.front){rp.setPipeline(worldPipelines.front);for(let cell=0;cell<(layout.dual?2:1);cell++){rp.setScissorRect(...scissors(box.world,width,height,layout.dual)[cell]);rp.draw(6,1,0,cell);}}
    rp.setScissorRect(0,0,width,height);
    if(settings.points){rp.setPipeline(worldPipelines.frontPoint);rp.draw(6,(layout.dual?2:1)*2);}
    if(layout.diagnosticOccluder){rp.setPipeline(worldPipelines.occluder);rp.draw(6,layout.dual?2:1);}rp.end();
    const blur=(target,filtered,name,scissor)=>{const p=command.beginRenderPass({label:name,colorAttachments:[{view:target.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});p.setPipeline(postPipelines[name]);p.setBindGroup(0,postBG(filtered));if(scissor)p.setScissorRect(...scissor);p.draw(3);p.end();};
    // Blur is bounded by the full source-derived OBS support and grows seven native-DPR pixels.
    const blurBox=[box.OBS[0]-7*dpr,box.OBS[1]-7*dpr,box.OBS[2]+7*dpr,box.OBS[3]+7*dpr],blurScissor=scissors(blurBox,width,height,layout.dual)[0];
    blur(blurX,bright,'horizontal',blurScissor);blur(blurY,blurX,'vertical',blurScissor);
    const final=command.beginRenderPass({label:'r8 finish full viewport',colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});final.setPipeline(postPipelines.finish);final.setBindGroup(0,postBG(blurY));final.setScissorRect(0,0,width,height);final.draw(3);final.end();
    const submittedId=++submitId;device.queue.submit([command.finish()]);await device.queue.onSubmittedWorkDone();lastSubmitted={submitId:submittedId,stage:lastStage,age:lastState.t,live:lastState.live,flags:{...settings},settingsSerial,layout:{...layout},camera:{...camera},box};return lastSubmitted;
  };
  const reset=()=>{settings=defaults();camera={observerCenter:[0,0],sourceShift:[0,0]};layout={dual:false,diagnosticOccluder:false};eventOwner={id:'fixture-owner',alive:true,visible:true,inVent:false,ejected:false,barrierDurability:100};seen.clear();lastEvent=null;settingsSerial++;};
  const apply=changes=>{if(changes.settings)settings={...settings,...changes.settings};if(changes.camera)camera={...camera,...changes.camera};if(changes.layout)layout={...layout,...changes.layout};if(changes.owner)eventOwner={...eventOwner,...changes.owner};if(changes.stage){lastStage=changes.stage;const age=changes.ageMs??0;lastState={stage:{create:0,stable:1,break:2,hit:3,off:4}[lastStage],t:age/1000,live:lastStage!=='off',event:lastStage==='stable'||lastStage==='off'?null:lastStage,known:changes.known??true,contact:changes.contact??[.50,.15,.66]};}settingsSerial++;};
  const setCase=async spec=>{reset();apply(spec);await submit();await new Promise(r=>requestAnimationFrame(r));const confirmed=await submit();const later=lastSubmitted&&lastSubmitted.submitId===confirmed.submitId&&lastSubmitted.settingsSerial===confirmed.settingsSerial&&lastSubmitted.stage===confirmed.stage&&Math.abs(lastSubmitted.age-confirmed.age)<1e-6;if(!later)throw Error('no later matching submitted frame for case');return{...confirmed,confirmedBy:later?lastSubmitted.submitId:null,confirmedAfterLaterFrame:later};};
  const dispatchEvent=async(event,nowMs)=>{const resolved=resolveInputEvent(event,eventOwner,seen,nowMs);if(!resolved)return null;lastEvent=resolved;const elapsed=Math.max(0,nowMs-resolved.startedAtMs),state=authoritativeState(eventOwner,resolved,elapsed);if(!state.live)return null;lastState={...state,contact:state.contact??[.50,.15,.66]};lastStage=state.event;settingsSerial++;await submit();await audio.cause(resolved.kind,performance.now()-elapsed,resolved.causeId);return resolved;};
  if(!verification)audio.arm(canvas);
  const api={device,adapter,verification,embedded,submit,setCase,reset,apply,dispatchEvent,playSfx:(kind,at)=>audio.cause(kind,at),triggerGesture:()=>audio.unlock(),get audit(){return{DPR:dpr,width,height,settingsSerial,lastSubmitted,lastState,lastStage,lastError,gpuErrors:[...gpuErrors],audio:audio.audit(),verification};},destroy(){audio.destroy();scene.destroy();bright.destroy();signal.destroy();blurX.destroy();blurY.destroy();actor.destroy();uniform.destroy();device.destroy();}};
  submit().catch(e=>{lastError=String(e?.stack??e);});api.destroy=()=>{audio.destroy();scene.destroy();bright.destroy();signal.destroy();blurX.destroy();blurY.destroy();actor.destroy();uniform.destroy();device.destroy();};return api;
}
