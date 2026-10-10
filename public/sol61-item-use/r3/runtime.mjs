import { VERSION, UNIFORM_BYTES, LIFETIME_MS, ENTRIES, planItemUse, packItemUse } from './source/item-use-e-sol61-r3.mjs';
import { SFX_VERSION, createUseSfx } from './source/item-use-e-sfx-sol61-r3.mjs';

const TU=globalThis.GPUTextureUsage??{COPY_SRC:1,COPY_DST:2,TEXTURE_BINDING:4,STORAGE_BINDING:8,RENDER_ATTACHMENT:16};
const BU=globalThis.GPUBufferUsage??{MAP_READ:1,MAP_WRITE:2,COPY_SRC:4,COPY_DST:8,INDEX:16,VERTEX:32,UNIFORM:64,STORAGE:128,INDIRECT:256,QUERY_RESOLVE:512};
const MM=globalThis.GPUMapMode??{READ:1};
const halfToFloat=h=>{const s=(h&0x8000)?-1:1,e=(h>>10)&31,f=h&1023;if(e===0)return s*Math.pow(2,-14)*(f/1024);if(e===31)return f===0?s*Infinity:NaN;return s*Math.pow(2,e-15)*(1+f/1024);};
const align=(n,a)=>Math.ceil(n/a)*a;
const finite=(v,n)=>{if(!Number.isFinite(v))throw new TypeError(`${n} must be finite`);return v;};
const positive=(v,n)=>{finite(v,n);if(v<=0)throw new RangeError(`${n} must be positive`);return v;};
const id=()=>globalThis.crypto?.randomUUID?.()??`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const thenable=v=>v&&typeof v.then==='function';
const compileErrors=messages=>(messages??[]).filter(m=>m.type==='error');

export function validateFixture(f) {
  if(!f||f.clockKind!=='fixture')throw new TypeError('standalone host accepts explicit fixture clock only');
  if(typeof f.causeId!=='string'||!f.causeId||typeof f.itemId!=='string'||!f.itemId)throw new TypeError('fixture causeId and itemId required');
  if(f.sourceCauseId!==f.causeId||f.visibilityCauseId!==f.causeId)throw new Error('source and visibility gates must name the same receipt cause');
  if(typeof f.playerId!=='string'||!f.playerId||f.sourcePlayerId!==f.playerId||f.anchorPlayerId!==f.playerId)throw new Error('receipt, source, and actor anchor must name the same player');
  for(const k of ['sourceOn','mainOn'])if(typeof f[k]!=='boolean')throw new TypeError(`explicit ${k} required`);
  if(!Object.hasOwn(f,'visibility'))throw new TypeError('explicit same-source visibility required');
  const visibility=finite(f.visibility,'visibility');if(visibility<0||visibility>1)throw new RangeError('visibility must be in [0,1]');
  if(typeof f.obsOn!=='boolean')throw new TypeError('explicit obsOn required');
  finite(f.ageMs,'ageMs');positive(f.heightPx,'heightPx');
  if(!Array.isArray(f.viewport)||f.viewport.length!==2||!Array.isArray(f.anchor)||f.anchor.length!==2)throw new TypeError('viewport and authority-projected anchor required');
  f.viewport.forEach((v,i)=>positive(v,`viewport[${i}]`));f.anchor.forEach((v,i)=>finite(v,`anchor[${i}]`));
  return f;
}

export function validateSuccessfulReceipt(r) {
  if(!r||r.type!=='action-item-use'||typeof r.id!=='string'||!r.id||typeof r.playerId!=='string'||!r.playerId||typeof r.variant!=='string'||!r.variant)throw new TypeError('successful action-item-use receipt required');
  finite(r.at,'receipt.at');finite(r.x,'receipt.x');finite(r.y,'receipt.y');
  return Object.freeze({causeId:r.id,itemId:r.variant,playerId:r.playerId,at:r.at,x:r.x,y:r.y});
}

async function withValidation(device,label,fn) {
  device.pushErrorScope('validation');
  let result,error;
  try { result=await fn(); } catch(e) { error=e; }
  let validationError;
  try { validationError=await device.popErrorScope(); } catch(e) { validationError??=e; }
  if(error)throw error;
  if(validationError)throw new Error(`${label}: WebGPU validation error: ${validationError.message??validationError}`);
  return result;
}

export async function createItemUseHost({device,context,format,shaderCode,width,height,ownerId=id(),verify=false,onProof=()=>{},onFailure=()=>{}}={}) {
  if(!device||!context||typeof shaderCode!=='string'||!shaderCode)throw new TypeError('ready shared device/context and pinned shader source required');
  if(format!=='rgba8unorm'&&format!=='bgra8unorm')throw new TypeError('explicit canvas format required');
  positive(width,'width');positive(height,'height');
  if(VERSION!=='item-use-e-zero-sol61-r3'||UNIFORM_BYTES!==96||LIFETIME_MS!==780||ENTRIES.vertices!==3||ENTRIES.vertex!=='vertexItemUse'||ENTRIES.world!=='worldItemUse'||ENTRIES.spreadX!=='spreadItemUseX'||ENTRIES.spreadY!=='spreadItemUseY'||ENTRIES.composite!=='compositeItemUse'||SFX_VERSION!=='item-use-e-sfx-sol61-r3')throw new Error('frozen Item-use E ABI/entry contract mismatch');
  const token=id();let generation=1,targetGeneration=1,sequence=0,state='preparing',resources=null,disposed=false,deviceLost=false;
  let audio=null,audioContextOwner=null,proofGenerations=new Set();
  const eventTarget=typeof device.addEventListener==='function';
  const uncaptured=e=>fail(new Error(`uncaptured GPU error: ${e.error?.message??e.message??'unknown'}`));
  function fail(e){if(state==='disposed'||state==='failed')return;state='failed';try{audio?.stopAll?.();}catch{}onFailure({ownerId,token,generation,error:String(e?.message??e)});}
  if(eventTarget)device.addEventListener('uncapturederror',uncaptured);
  const lostPromise=Promise.resolve(device.lost).then(info=>{deviceLost=true;fail(new Error(`device lost: ${info?.message??info?.reason??'unknown'}`));return info;});
  const current=(g=generation)=>!disposed&&!deviceLost&&state==='ready'&&g===generation;
  async function buildTargets(w,h){
    return withValidation(device,'createTargets',async()=>{
      if(!Number.isInteger(w)||!Number.isInteger(h)||w>device.limits?.maxTextureDimension2D||h>device.limits?.maxTextureDimension2D)throw new RangeError('target dimensions exceed device limits');
      const make=(label,fmt='rgba16float',extraUsage=0)=>device.createTexture({label,size:{width:w,height:h,depthOrArrayLayers:1},format:fmt,usage:TU.RENDER_ATTACHMENT|TU.TEXTURE_BINDING|extraUsage});
      const made=[];
      try {for(const [key,label,extra] of [['surface','item-use-world-surface',0],['emission','item-use-world-emission',TU.COPY_SRC],['spreadX','item-use-psf-x',0],['spreadY','item-use-psf-y',0]])made.push([key,make(label,'rgba16float',extra)]);return {width:w,height:h,...Object.fromEntries(made)};}
      catch(e){for(const [,t] of made)try{t?.destroy?.();}catch{}throw e;}
    });
  }
  function destroyTargets(t){if(!t)return;for(const k of ['surface','emission','spreadX','spreadY'])try{t[k]?.destroy?.();}catch{}}
  let uniform, startupTargets;
  try {
    const shader=await withValidation(device,'compileShader',async()=>device.createShaderModule({label:VERSION,code:shaderCode}));
    if(typeof shader.getCompilationInfo!=='function')throw new Error('shader compilation diagnostics unavailable');
    const info=await shader.getCompilationInfo();const errors=compileErrors(info.messages);
    if(errors.length)throw new Error(`shader compilation failed: ${errors.map(x=>x.message).join('; ')}`);
    const desc=(entryPoint,targets,label)=>({label,layout:'auto',vertex:{module:shader,entryPoint:ENTRIES.vertex},fragment:{module:shader,entryPoint,targets},primitive:{topology:'triangle-list'}});
    const [world,x,y,composite]=await withValidation(device,'createPipelines',async()=>Promise.all([
      device.createRenderPipelineAsync(desc(ENTRIES.world,[{format:'rgba16float'},{format:'rgba16float'}],'item-use-world-mrt')),
      device.createRenderPipelineAsync(desc(ENTRIES.spreadX,[{format:'rgba16float'}],'item-use-psf-x')),
      device.createRenderPipelineAsync(desc(ENTRIES.spreadY,[{format:'rgba16float'}],'item-use-psf-y')),
      device.createRenderPipelineAsync(desc(ENTRIES.composite,[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}],'item-use-composite'))
    ]));
    uniform=await withValidation(device,'createUniform',async()=>device.createBuffer({label:'item-use-96-byte-uniform',size:96,usage:BU.UNIFORM|BU.COPY_DST}));
    startupTargets=await buildTargets(width,height);
    if(deviceLost||state==='failed')throw new Error('device lost during startup');
    resources={shader,pipelines:{world,x,y,composite},uniform,targets:startupTargets};
    startupTargets=null;
    state='ready';
  } catch(e) {const alreadyFailed=state==='failed';state='failed';if(eventTarget)device.removeEventListener('uncapturederror',uncaptured);destroyTargets(startupTargets);resources&&destroyTargets(resources.targets);try{resources?.uniform?.destroy?.();}catch{}try{uniform?.destroy?.();}catch{}if(!alreadyFailed)onFailure({ownerId,token,generation,error:String(e?.message??e)});throw e;}

  const groups=(p,textureEntries=[])=>withValidation(device,'createBindGroup',async()=>{
    const g0=device.createBindGroup({layout:p.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:resources.uniform}}]});
    const g1=textureEntries.length?device.createBindGroup({layout:p.getBindGroupLayout(1),entries:textureEntries.map(([binding,view])=>({binding,resource:view}))}):null;
    return [g0,g1];
  });
  const view=t=>t.createView();
  function readbackRegion(t,anchor){const width=Math.min(128,t.width),height=Math.min(128,t.height);const x=Math.max(0,Math.min(t.width-width,Math.floor(anchor[0]-width/2)));const y=Math.max(0,Math.min(t.height-height,Math.floor(anchor[1]-height/2)));return {x,y,width,height};}
  function sampleHalfFloatRgb(buffer,region,bytesPerRow){const view=new DataView(buffer.getMappedRange());let finiteRgb=true,positive=false;const max=[0,0,0];for(let y=0;y<region.height;y++)for(let x=0;x<region.width;x++){const offset=y*bytesPerRow+x*8;for(let c=0;c<3;c++){const value=halfToFloat(view.getUint16(offset+c*2,true));if(!Number.isFinite(value)||value<0){finiteRgb=false;continue;}if(value>max[c])max[c]=value;if(value>0)positive=true;}}return {positive:finiteRgb&&positive,finitePositiveRgb:finiteRgb&&positive,finiteRgb,region:[region.x,region.y,region.width,region.height],width:region.width,height:region.height,bytesPerRow,pixelsSampled:region.width*region.height,channelMax:max};}
  const runPass=(encoder,label,pipeline,groups,targetViews,clearValues)=>{
    const pass=encoder.beginRenderPass({label,colorAttachments:targetViews.map((v,i)=>({view:v,clearValue:clearValues?.[i]??{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}))});
    pass.setPipeline(pipeline);pass.setBindGroup(0,groups[0]);if(groups[1])pass.setBindGroup(1,groups[1]);pass.draw(ENTRIES.vertices);pass.end();
  };
  async function render(fixture,{expectedGeneration=generation}={}){
    validateFixture(fixture);if(!current(expectedGeneration))throw new Error('stale owner, generation, device, or disposed host');
    const plan=planItemUse(fixture);const packed=packItemUse(plan);if(packed.byteLength!==96)throw new Error('packed uniform must be 96 bytes');
    const r=resources,t=r.targets,frameTargetGeneration=targetGeneration;
    let readbackBuffer=null;
    try {
    const [gw]=await groups(r.pipelines.world);
    const [gx,bx]=await groups(r.pipelines.x,[[0,view(t.emission)]]);
    const [gy,by]=await groups(r.pipelines.y,[[0,view(t.spreadX)]]);
    const [gc,bc]=await groups(r.pipelines.composite,[[0,view(t.surface)],[1,view(t.spreadY)],[2,view(t.emission)]]);
    if(!current(expectedGeneration)||resources.targets!==t||targetGeneration!==frameTargetGeneration)throw new Error('frame retired before record');
    const requestEmissionSample=plan.active&&fixture.ageMs>0;
    const region=requestEmissionSample?readbackRegion(t,fixture.anchor):null;
    const bytesPerRow=region?align(region.width*8,256):0;
    if(region)readbackBuffer=await withValidation(device,'createEmissionReadbackBuffer',async()=>device.createBuffer({label:'item-use-emission-readback',size:bytesPerRow*region.height,usage:BU.MAP_READ|BU.COPY_DST}));
    device.pushErrorScope('validation');let submitted=false;let commandBuffer;
    try {
      const encoder=device.createCommandEncoder({label:`${VERSION}:${sequence+1}`});
      device.queue.writeBuffer(r.uniform,0,packed);
      runPass(encoder,'world-mrt',r.pipelines.world,[gw,null],[view(t.surface),view(t.emission)]);
      if(region)encoder.copyTextureToBuffer({texture:t.emission,origin:{x:region.x,y:region.y,z:0}},{buffer:readbackBuffer,bytesPerRow,rowsPerImage:region.height},{width:region.width,height:region.height,depthOrArrayLayers:1});
      runPass(encoder,'spread-x',r.pipelines.x,[gx,bx],[view(t.spreadX)]);
      runPass(encoder,'spread-y',r.pipelines.y,[gy,by],[view(t.spreadY)]);
      const swap=context.getCurrentTexture();const outputView=swap.createView();
      runPass(encoder,'composite',r.pipelines.composite,[gc,bc],[outputView]);
      commandBuffer=encoder.finish();if(thenable(commandBuffer))throw new Error('record must remain synchronous');
      if(!current(expectedGeneration))throw new Error('frame retired before submit');
      device.queue.submit([commandBuffer]);submitted=true;sequence++;
    } catch(e) {const scopeError=await device.popErrorScope();if(scopeError)throw new Error(`record/submit validation error: ${scopeError.message??scopeError}`);throw e;}
    const submitError=await device.popErrorScope();if(submitError)throw new Error(`record/submit validation error: ${submitError.message??submitError}`);if(!submitted)throw new Error('frame was not submitted');
    const frame={ownerId,version:VERSION,token,generation:expectedGeneration,deviceGeneration:expectedGeneration,targetGeneration:frameTargetGeneration,sequence,dimensions:[t.width,t.height],targetFormat:'rgba16float',passOrder:['world-mrt','spread-x','spread-y','composite'],uniformBytes:packed.byteLength,submitted:true,completed:false,sourceGateActive:plan.active&&fixture.ageMs>0,sourceCauseId:plan.causeId,sourceItemId:plan.itemId,sourcePlayerId:fixture.playerId,validation:'clear'};
    await device.queue.onSubmittedWorkDone();
    if(!current(expectedGeneration)||resources.targets!==t||targetGeneration!==frameTargetGeneration){try{readbackBuffer?.destroy?.();}catch{}readbackBuffer=null;return {submitted:true,retired:true,proof:{...frame,completed:false,retired:true,firstSourceGateActiveSubmit:false},plan};}
    frame.completed=true;
    let emissionReadback=null;
    if(readbackBuffer){await readbackBuffer.mapAsync(MM.READ);if(!current(expectedGeneration)||resources.targets!==t||targetGeneration!==frameTargetGeneration){try{readbackBuffer.unmap?.();}catch{}try{readbackBuffer.destroy?.();}catch{}readbackBuffer=null;return {submitted:true,retired:true,proof:{...frame,completed:false,retired:true,firstSourceGateActiveSubmit:false},plan};}emissionReadback=sampleHalfFloatRgb(readbackBuffer,region,bytesPerRow);try{readbackBuffer.unmap?.();}finally{readbackBuffer.destroy?.();readbackBuffer=null;}}
    let firstSourceGateActiveSubmit=false;
    const positiveCurrentSample=Boolean(frame.sourceGateActive&&emissionReadback?.finitePositiveRgb&&emissionReadback?.positive&&frame.sourceCauseId===fixture.sourceCauseId&&frame.sourceCauseId===fixture.visibilityCauseId&&frame.sourcePlayerId===fixture.sourcePlayerId&&frame.sourcePlayerId===fixture.anchorPlayerId&&frame.deviceGeneration===generation&&frame.targetGeneration===targetGeneration&&current(expectedGeneration));
    if(positiveCurrentSample&&!proofGenerations.has(expectedGeneration)){proofGenerations.add(expectedGeneration);firstSourceGateActiveSubmit=true;onProof({...frame,emissionReadback,firstSourceGateActiveSubmit:true,fixtureOnly:true});}
    return {submitted:true,proof:{...frame,emissionReadback,firstSourceGateActiveSubmit},plan};
    } catch(e) {try{readbackBuffer?.unmap?.();}catch{}try{readbackBuffer?.destroy?.();}catch{}fail(e);throw e;}
  }
  async function resize(w,h){positive(w,'width');positive(h,'height');if(!current())throw new Error('host not current');state='resizing';const nextGeneration=++generation;let replacement=null;try{await device.queue.onSubmittedWorkDone();if(disposed||deviceLost||state!=='resizing'||generation!==nextGeneration)throw new Error('host retired during resize');replacement=await buildTargets(w,h);if(disposed||deviceLost||state!=='resizing'||generation!==nextGeneration){destroyTargets(replacement);replacement=null;throw new Error('host retired during resize');}const old=resources.targets;resources.targets=replacement;replacement=null;targetGeneration=nextGeneration;destroyTargets(old);state='ready';return {generation:nextGeneration,width:w,height:h};}catch(e){destroyTargets(replacement);fail(e);throw e;}}
  function retire(attemptToken){if(attemptToken!==token)throw new Error('attempt token mismatch');if(state==='disposed'||state==='failed'||state==='retired')return;state='retired';generation++;try{audio?.stopAll?.();}catch{}}
  async function dispose(){if(disposed)return;disposed=true;state='disposed';generation++;if(eventTarget)device.removeEventListener('uncapturederror',uncaptured);try{await device.queue.onSubmittedWorkDone();}finally{destroyTargets(resources?.targets);try{resources?.uniform?.destroy?.();}catch{}try{audio?.dispose?.();}catch{}}}
  return Object.freeze({ownerId,token,version:VERSION,state:()=>state,generation:()=>generation,render,resize,retire,dispose,deviceLost:lostPromise,cancelReceipt(causeId){if(typeof causeId!=='string'||!causeId)throw new TypeError('receipt cause ID required');audio?.cancel(causeId);},
    playSuccessfulReceipt({receipt,ageMs,sourceOn,mainOn,visibility,sourceCauseId,sourcePlayerId,visibilityCauseId,gestureGranted=false,audioContext}={}){
      if(!current())return {played:false,reason:'host-not-current'};
      const source=validateSuccessfulReceipt(receipt);finite(ageMs,'ageMs');if(typeof sourceOn!=='boolean'||typeof mainOn!=='boolean'||typeof visibility!=='number'||!Number.isFinite(visibility)||visibility<0||visibility>1)throw new TypeError('explicit receipt source gates required');
      if(sourceCauseId!==source.causeId||visibilityCauseId!==source.causeId)throw new Error('receipt source and visibility must have the same cause ID');
      if(sourcePlayerId!==source.playerId)throw new Error('receipt and source gate must have the same player ID');
      if(!gestureGranted)return {played:false,reason:'user-gesture-required'};
      if(!sourceOn||!mainOn||visibility<=0)return {played:false,reason:'source-not-visible'};
      if(!audioContext)throw new TypeError('gesture-owned AudioContext required');
      if(audioContextOwner&&audioContextOwner!==audioContext)throw new Error('AudioContext owner cannot change during this host attempt');
      audioContextOwner=audioContext;if(!audio)audio=createUseSfx({context:audioContext,verify});
      return audio.play({causeId:source.causeId,ageMs,visible:true});
    }});
}
