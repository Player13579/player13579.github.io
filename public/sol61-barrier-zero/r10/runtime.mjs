import { DESIGN, eventRules, defaults, uniformFloats, contactCell, receipt, authoritativeState } from './artist.mjs';
import { support } from './projection.mjs';
import { worldShader } from './world-shader.mjs';
import { postShader } from './post-shader.mjs';
import { BarrierSfx } from './sfx-runtime.mjs';
import { wav } from './sfx-score.mjs';
import { normalizeWireEvent, submittedClock } from './e-clock-contract.mjs';

export const FRAME_ABI_ORDER = Object.freeze(['viewport','phase','gates','optics','frameLayout','contact','camera','bounds']);
export const FRAME_BYTES = 128;
export const EVENT_RULES = eventRules;
const shaderStage = globalThis.GPUShaderStage ?? {VERTEX:1,FRAGMENT:2};
const blend = {color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
const worldEntries = d => d.createBindGroupLayout({entries:[
  {binding:0,visibility:shaderStage.VERTEX|shaderStage.FRAGMENT,buffer:{type:'uniform'}},
  {binding:1,visibility:shaderStage.FRAGMENT,texture:{sampleType:'float'}},
  {binding:2,visibility:shaderStage.FRAGMENT,sampler:{type:'filtering'}}
]});
const postEntries = d => d.createBindGroupLayout({entries:[
  {binding:0,visibility:shaderStage.FRAGMENT,buffer:{type:'uniform'}},
  ...[1,2,3,4].map(binding=>({binding,visibility:shaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float'}})),
  {binding:5,visibility:shaderStage.FRAGMENT,sampler:{type:'non-filtering'}}
]});
const attach = (views, clear=true) => views.map(view=>({view,loadOp:clear?'clear':'load',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}));
const clampScissor = (box,width,height,cx,cy) => {
  const x0=Math.max(0,Math.floor(cx+box[0])),y0=Math.max(0,Math.floor(cy+box[1]));
  const x1=Math.min(width,Math.ceil(cx+box[2])),y1=Math.min(height,Math.ceil(cy+box[3]));
  return [x0,y0,Math.max(0,x1-x0),Math.max(0,y1-y0)];
};
const cellScissors = (box,width,height,dual) => (dual?[.25,.75]:[.5]).map(x=>clampScissor(box,width,height,width*x,height/2));
const stageNumber = Object.freeze({create:0,stable:1,break:2,hit:3,off:4});
const freshSettings = () => ({...defaults()});

export const sharedEClock = submittedClock;
export function eventFrame(state, ageMs=0) {
  if (!state || !Number.isFinite(ageMs) || ageMs<0) return {stage:4,t:0,live:false,known:false,contact:[0,0,0]};
  return authoritativeState(state.owner,state.receipt,ageMs);
}

export async function createBarrierRuntime(canvas,{verification=new URL(location.href).searchParams.has('verify'),embedded=new URL(location.href).searchParams.has('embed')}={}) {
  const usage=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING;
  if(!navigator.gpu) throw Error('WebGPU unavailable');
  const adapter=await navigator.gpu.requestAdapter(); if(!adapter) throw Error('WebGPU adapter unavailable');
  const device=await adapter.requestDevice({requiredLimits:{maxColorAttachments:3}});
  const context=canvas.getContext('webgpu'); if(!context) throw Error('webgpu canvas context unavailable');
  const format=navigator.gpu.getPreferredCanvasFormat(); context.configure({device,format,alphaMode:'opaque'});
  const width=canvas.width,height=canvas.height,dpr=width/(Number(canvas.dataset.logicalWidth)||width),H=Number(canvas.dataset.actorHeight)||64;
  const makeTarget=(label)=>device.createTexture({label,size:[width,height],format:'rgba16float',usage});
  const scene=makeTarget('r10 scene'),bright=makeTarget('r10 bright'),signal=makeTarget('r10 two-source signal'),blurX=makeTarget('r10 horizontal near'),blurY=makeTarget('r10 vertical near');
  const uniform=device.createBuffer({label:'r10 exact 128-byte Frame ABI',size:FRAME_BYTES,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const actorSampler=device.createSampler({magFilter:'linear',minFilter:'linear'}),postSampler=device.createSampler({magFilter:'nearest',minFilter:'nearest'});
  const response=await fetch('./body.png'); if(!response.ok) throw Error(`body.png fetch failed ${response.status}`);
  const bitmap=await createImageBitmap(await response.blob());
  const actor=device.createTexture({label:'immutable original body.png',size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
  device.queue.copyExternalImageToTexture({source:bitmap},{texture:actor,premultipliedAlpha:false,colorSpace:'srgb'},{width:bitmap.width,height:bitmap.height}); bitmap.close();
  const worldModule=device.createShaderModule({label:'authored r10 worldShader unchanged',code:worldShader});
  const postModule=device.createShaderModule({label:'authored r10 postShader unchanged',code:postShader});
  const compilation=[];
  for(const [name,module] of [['world',worldModule],['post',postModule]]) {
    const info=await module.getCompilationInfo(); compilation.push({name,messages:info.messages.map(m=>({type:m.type,lineNum:m.lineNum,linePos:m.linePos,message:m.message}))});
    const errors=info.messages.filter(m=>m.type==='error'); if(errors.length) throw Error(`${name} WGSL: ${errors.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join('\n')}`);
  }
  window.__barrierR10Compilation={shaderModules:'compiled',messages:compilation,adapter:adapter.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description}:null,canvasFormat:format,worldFormat:'rgba16float'};
  const wLayout=worldEntries(device),pLayout=postEntries(device);
  const wPipeLayout=device.createPipelineLayout({bindGroupLayouts:[wLayout]}),pPipeLayout=device.createPipelineLayout({bindGroupLayouts:[pLayout]});
  const targets=[0,1,2].map(()=>({format:'rgba16float',blend,writeMask:GPUColorWrite.ALL}));
  const worldPipelineSpecs=[['background','background','fullVS'],['rear','rear','fieldVS'],['front','front','fieldVS'],['body','bodyFS','bodyVS'],['rearPoint','rearPoint','pointVS'],['frontPoint','frontPoint','pointVS'],['occluder','occluderFS','occluderVS']];
  const worldPipelines={};
  for(const [key,entry,vs] of worldPipelineSpecs) worldPipelines[key]=await device.createRenderPipelineAsync({label:`r10 ${key}`,layout:wPipeLayout,vertex:{module:worldModule,entryPoint:vs},fragment:{module:worldModule,entryPoint:entry,targets},primitive:{topology:'triangle-list'}});
  const contourSource='let contour=pulse*(1.-ease(.085,.16,abs(tile.metric-(.72-.22*pulse))));';
  if(worldShader.split(contourSource).length!==2)throw Error('r10 contour diagnostic anchor mismatch');
  const noContourShader=worldShader.replace(contourSource,'let contour=0.;');
  const noContourModule=device.createShaderModule({label:'r10 measurement-only zero-contour diagnostic',code:noContourShader});
  const diagnosticInfo=await noContourModule.getCompilationInfo();
  const diagnosticErrors=diagnosticInfo.messages.filter(m=>m.type==='error');if(diagnosticErrors.length)throw Error(`r10 no-contour diagnostic WGSL: ${diagnosticErrors.map(m=>m.message).join(' | ')}`);
  const noContourPipelines={};
  for(const [key,entry,vs] of worldPipelineSpecs) noContourPipelines[key]=await device.createRenderPipelineAsync({label:`r10 diagnostic contour-off ${key}`,layout:wPipeLayout,vertex:{module:noContourModule,entryPoint:vs},fragment:{module:noContourModule,entryPoint:entry,targets},primitive:{topology:'triangle-list'}});
  const postPipelines={};
  for(const name of ['horizontal','vertical','finish']) postPipelines[name]=await device.createRenderPipelineAsync({label:`r10 ${name}`,layout:pPipeLayout,vertex:{module:postModule,entryPoint:'fullVS'},fragment:{module:postModule,entryPoint:name,targets:[{format:name==='finish'?format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  const worldBG=device.createBindGroup({layout:wLayout,entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:actor.createView()},{binding:2,resource:actorSampler}]});
  const postBG=filtered=>device.createBindGroup({layout:pLayout,entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:scene.createView()},{binding:2,resource:bright.createView()},{binding:3,resource:signal.createView()},{binding:4,resource:filtered.createView()},{binding:5,resource:postSampler}]});
  const sfxFiles={create:'barrier-create-r9.wav',hit:'barrier-hit-r9.wav',break:'barrier-break-r9.wav'};
  const sound=new BarrierSfx({verification,fetchImpl:async url=>{const kind=Object.keys(sfxFiles).find(key=>String(url).endsWith(sfxFiles[key]));return kind?new Response(wav(kind),{status:200,headers:{'content-type':'audio/wav'}}):new Response('',{status:404});}});
  let settings=freshSettings(),layout={dual:false,diagnostic:false},contourDiagnosticOff=false,camera={observerCenter:[0,0],sourceShift:[0,0]},
    owner={id:'fixture-owner',alive:true,visible:true,inVent:false,ejected:false,barrierDurability:1},seen=new Set(),acceptedEvents=new Map(),
    lastState={stage:4,t:0,live:false,known:false,contact:[0,0,0]},lastSubmitted=null,submitId=0,serial=0,
    gpuErrors=[],lastFault=null,ready=false,firstSubmitted=false,rafId=0,drawStats={};
  device.addEventListener('uncapturederror',e=>gpuErrors.push(String(e.error?.message??e.error)));
  device.lost.then(info=>{if(info.reason!=='destroyed')lastFault=`device lost: ${info.message}`;});

  const writeFrame=state=>{
    const b=support(H,dpr,camera.observerCenter,camera.sourceShift);
    const f=uniformFloats({width,height,H,dpr,state,settings,dual:layout.dual,diagnostic:layout.diagnostic,observerCenter:camera.observerCenter,sourceShift:camera.sourceShift});
    if(f.byteLength!==FRAME_BYTES)throw Error(`artist ABI mismatch: ${f.byteLength} bytes`);
    device.queue.writeBuffer(uniform,0,f); return {f,b};
  };
  const submit=async()=>{
    const activeWorldPipelines=contourDiagnosticOff?noContourPipelines:worldPipelines;
    const {f,b}=writeFrame(lastState),encoder=device.createCommandEncoder({label:`r10 ${Object.keys(stageNumber).find(k=>stageNumber[k]===lastState.stage)} ${Math.round(lastState.t*1000)}ms`});
    const rp=encoder.beginRenderPass({label:'r10 world premultiplied MRT',colorAttachments:attach([scene.createView(),bright.createView(),signal.createView()])});
    rp.setBindGroup(0,worldBG); rp.setPipeline(activeWorldPipelines.background); rp.draw(3);
    const worldBox=[-b.world[0],-b.world[1],b.world[0],b.world[1]],scissors=cellScissors(worldBox,width,height,layout.dual);
    if(lastState.live&&settings.source&&settings.rear){rp.setPipeline(activeWorldPipelines.rear);for(let cell=0;cell<scissors.length;cell++){rp.setScissorRect(...scissors[cell]);rp.draw(6,1,0,cell);drawStats.rear=(drawStats.rear||0)+1;}}
    rp.setScissorRect(0,0,width,height);
    if(lastState.live&&settings.points&&settings.source){rp.setPipeline(activeWorldPipelines.rearPoint);rp.draw(6,(layout.dual?2:1)*2);drawStats.rearPoint=(drawStats.rearPoint||0)+1;}
    if(settings.actor){rp.setPipeline(activeWorldPipelines.body);rp.draw(6,layout.dual?2:1);drawStats.body=(drawStats.body||0)+1;}
    if(lastState.live&&settings.source&&settings.front){rp.setPipeline(activeWorldPipelines.front);for(let cell=0;cell<scissors.length;cell++){rp.setScissorRect(...scissors[cell]);rp.draw(6,1,0,cell);drawStats.front=(drawStats.front||0)+1;}}
    rp.setScissorRect(0,0,width,height);
    if(lastState.live&&settings.points&&settings.source){rp.setPipeline(activeWorldPipelines.frontPoint);rp.draw(6,(layout.dual?2:1)*2);drawStats.frontPoint=(drawStats.frontPoint||0)+1;}
    if(layout.diagnostic&&lastState.live){rp.setPipeline(activeWorldPipelines.occluder);rp.draw(6,layout.dual?2:1);drawStats.occluder=(drawStats.occluder||0)+1;}
    rp.end();
    const obs=lastState.live&&settings.source;
    const blur=(name,target,input,box,clear=true)=>{
      for(let cell=0;cell<(layout.dual?2:1);cell++){
        const cx=width*(layout.dual?(cell===0?.25:.75):.5),rect=clampScissor(box,width,height,cx,height/2);
        const p=encoder.beginRenderPass({label:`r10 ${name} cell${cell}`,colorAttachments:[{view:target.createView(),loadOp:clear?'clear':'load',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});
        p.setPipeline(postPipelines[name]);p.setBindGroup(0,postBG(input));p.setScissorRect(...rect);p.draw(3);p.end();
      }
    };
    if(obs){
      const blurSupport=b.near.map(v=>v+7*dpr);
      const boxes=cellScissors([-blurSupport[0],-blurSupport[1],blurSupport[0],blurSupport[1]],width,height,layout.dual);
      for(let cell=0;cell<boxes.length;cell++){
        const p=encoder.beginRenderPass({label:`r10 horizontal near cell${cell}`,colorAttachments:[{view:blurX.createView(),loadOp:cell===0?'clear':'load',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});p.setPipeline(postPipelines.horizontal);p.setBindGroup(0,postBG(bright));p.setScissorRect(...boxes[cell]);p.draw(3);p.end();
      }
      for(let cell=0;cell<boxes.length;cell++){
        const p=encoder.beginRenderPass({label:`r10 vertical near cell${cell}`,colorAttachments:[{view:blurY.createView(),loadOp:cell===0?'clear':'load',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});p.setPipeline(postPipelines.vertical);p.setBindGroup(0,postBG(blurX));p.setScissorRect(...boxes[cell]);p.draw(3);p.end();
      }
    } else {
      for(const [name,target] of [['horizontal',blurX],['vertical',blurY]]){const p=encoder.beginRenderPass({label:`r10 ${name} disabled`,colorAttachments:[{view:target.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});p.end();}
    }
    const final=encoder.beginRenderPass({label:'r10 finish full canvas',colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
    final.setPipeline(postPipelines.finish);final.setBindGroup(0,postBG(blurY));final.setScissorRect(0,0,width,height);final.draw(3);final.end();
    const id=++submitId;device.queue.submit([encoder.finish()]);await device.queue.onSubmittedWorkDone();firstSubmitted=true;
    lastSubmitted={submitId:id,serial,stage:lastState.stage,ageSeconds:lastState.t,live:lastState.live,known:lastState.known,flags:{...settings},dual:layout.dual,camera:structuredClone(camera),uniformFloats:Array.from(f),uniformBytes:f.byteLength,uniformHex:Array.from(new Uint8Array(f.buffer)).map(x=>x.toString(16).padStart(2,'0')).join(''),support:b,scissorCells:scissors,passes:{...drawStats}};
    drawStats={};return lastSubmitted;
  };
  const reset=()=>{settings=freshSettings();layout={dual:false,diagnostic:false};contourDiagnosticOff=false;camera={observerCenter:[0,0],sourceShift:[0,0]};owner={id:'fixture-owner',alive:true,visible:true,inVent:false,ejected:false,barrierDurability:1};seen=new Set();acceptedEvents=new Map();serial++;lastState={stage:4,t:0,live:false,known:false,contact:[0,0,0]};};
  const setCase=async spec=>{
    reset();settings={...settings,...spec.settings};layout={...layout,...spec.layout};camera={...camera,...spec.camera};owner={...owner,...spec.owner};
    const stage=spec.stage??'stable',age=spec.ageMs??0;
    lastState=stage==='stable'?{stage:1,t:0,live:owner.barrierDurability>0,known:false,contact:[0,0,0]}:stage==='off'?{stage:4,t:0,live:false,known:false,contact:[0,0,0]}:{stage:stageNumber[stage],t:age/1000,live:age<(stage==='break'?480:650),known:!!spec.known,contact:spec.known===false?[0,0,0]:spec.contact??[.50,.15,.66]};
    serial++;const first=await submit();await new Promise(requestAnimationFrame);const confirm=await submit();if(first.serial!==confirm.serial||first.stage!==confirm.stage||Math.abs(first.ageSeconds-confirm.ageSeconds)>1e-7)throw Error('later matching submission not confirmed');return {...confirm,confirmedAfterLaterFrame:true};
  };
  const admitEvent=(event,actualOwner,sourceClockNowMs)=>{
    const accepted=receipt(event,actualOwner,sourceClockNowMs,seen);if(!accepted)return null;
    const key=accepted.causeId;acceptedEvents.set(key,{accepted,ownerId:actualOwner.id});return accepted;
  };
  const admitWireEvent=(rawEvent,actualOwner,receiptStartedAtMs)=>{
    const normalizedEvent=normalizeWireEvent(rawEvent,receiptStartedAtMs);if(!normalizedEvent)return null;
    const accepted=admitEvent(normalizedEvent,actualOwner,receiptStartedAtMs);return accepted?{normalizedEvent,receipt:accepted}:null;
  };
  const applyHostClock=async({eventKey,actualOwner,effect,effectNow,displayRate=1})=>{
    const record=acceptedEvents.get(eventKey);if(!record||record.ownerId!==actualOwner?.id)return null;
    owner=actualOwner;const accepted=record.accepted,clock=sharedEClock({effect,kind:accepted.kind,effectNow,displayRate,owner});
    if(clock.future)lastState={stage:4,t:0,live:false,known:false,contact:[0,0,0]};
    else if(clock.transientActive)lastState={...accepted,t:clock.ageSeconds,live:true};
    else if(clock.stableAfterTransient)lastState={stage:1,t:0,live:true,known:false,contact:[0,0,0]};
    else lastState={stage:4,t:0,live:false,known:false,contact:[0,0,0]};
    lastState.contact=accepted.known?accepted.contact:[0,0,0];serial++;
    if(!clock.transientActive&&!clock.stableAfterTransient)sound.stopCause(eventKey);
    const submitted=await submit();await sound.sync(accepted.kind,eventKey,{ageMs:clock.ageMs,rate:displayRate,submitted:true,wallNowMs:performance.now()});
    return {receipt:accepted,clock,submitted};
  };
  const dispatchEvent=async(event,actualOwner,clockNowMs,displayRate=1)=>{
    const accepted=admitEvent(event,actualOwner,clockNowMs);if(!accepted)return null;
    return applyHostClock({eventKey:accepted.causeId,actualOwner,effect:{startedAt:event.startedAtMs},effectNow:clockNowMs,displayRate});
  };
  const api={device,adapter,format,verification,embedded,compilation,sound,submit,setCase,reset,dispatchEvent,admitEvent,admitWireEvent,normalizeWireEvent,applyHostClock,
    async updateAcceptedEffect({event,actualOwner,canonicalEffectNow,displayRate=1}){
      const key=event?.eventId??event?.causeId;return applyHostClock({eventKey:key,actualOwner,effect:{startedAt:event.startedAtMs},effectNow:canonicalEffectNow,displayRate});
    },
    updateCanonicalEffect({eventKey,actualOwner,effect,effectNow,displayRate}){return applyHostClock({eventKey,actualOwner,effect,effectNow,displayRate});},
    setState(state){lastState={...state,contact:state.known?state.contact:[0,0,0]};serial++;},
    setSettings(next){settings={...freshSettings(),...next};serial++;return submit();},
    setLayout(next){layout={dual:false,diagnostic:false,...next};serial++;return submit();},
    setCamera(next){camera={observerCenter:[0,0],sourceShift:[0,0],...next};serial++;return submit();},
    setContourDiagnosticOff(enabled){contourDiagnosticOff=!!enabled;serial++;return submit();},
    snapshot(){return {id:DESIGN.id,ready,firstSubmitted,verification,adapter:adapter.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description}:null,format,worldTargetFormat:'rgba16float',shaderWarnings:compilation.flatMap(c=>c.messages.filter(m=>m.type!=='error')),gpuErrors:[...gpuErrors],gpuFault:lastFault,submitId,serial,lastSubmitted,lastState,flags:{...settings},layout:{...layout},camera:structuredClone(camera),contourDiagnosticOff,audio:sound.audit()};},
    destroy(){sound.dispose();for(const t of[scene,bright,signal,blurX,blurY,actor,uniform])t.destroy();device.destroy();ready=false;}
  };
  ready=true;api.ready=true;window.__barrierR10=api;await submit();return api;
}





