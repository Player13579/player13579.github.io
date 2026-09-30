import { ABI, VARIANTS, snapshotReceipt, prepare, phaseState, uniformFloats,
  createKernel, recordWorld, recordObserver, synthesize, sfxSubmissionController } from './artist.mjs';

const params = new URLSearchParams(location.search);
const VERIFY = params.has('verify');
const EMBED = params.get('embed') === '1';
document.documentElement.classList.toggle('embed', EMBED);
const canvas = document.querySelector('#preview');
const statusNode = document.querySelector('#status');
const rateSelect = document.querySelector('#rate');
const sourceToggle = document.querySelector('#source');
const observerToggle = document.querySelector('#observer');
const muteButton = document.querySelector('#mute');
const fixture = Object.freeze({
  playerId: 'gallery-white-hood-fixture', roomId: 'gallery-vibe-coding-r1',
  asset: './actor-white-hood-front-atlas.png', crop: [0, 0, 256, 256],
  sourceImage: [768, 768], origin: [128, 240], ground: [0, 31], actorHcss: 64,
  authoredMotion: 'white-hood/front idle', sourcePointInCrop: [128, 128], sourceAlpha: 1
});
const state = { device:null, context:null, format:null, kernel:null, resources:null,
  actorTexture:null, actorSampler:null, actorPipeline:null, actorLayout:null,
  actorUniform:null, actorGroup:null, recordSlots:null, resolvePipeline:null,
  resolveGroup:null, compositePipeline:null, compositeGroup:null, lastFrameAt:0,
  visualAge:0, cycleStart:0, cycle:0, event:null, receipt:null, prepared:null,
  raf:0, paused:false, disposed:false, ready:false, submissions:0, frameSerial:0,
  source:false, normalMuted:false, audioContext:null, audioBuffer:null, gestureUnlocked:false,
  sound:null, lastSuccessfulFrame:null, errors:[], shaders:[], resizeObserver:null };
state.source = !VERIFY;
state.normalMuted = VERIFY;
if (VERIFY) state.source = true;
if (VERIFY && muteButton) { muteButton.disabled=true; muteButton.textContent='音声: OFF'; }

const actorWGSL = /* wgsl */`
struct ActorFrame { viewport:vec2f, rect:vec4f, crop:vec4f, atlas:vec2f, pad:vec2f };
@group(0) @binding(0) var<uniform> u:ActorFrame;
@group(0) @binding(1) var atlas:texture_2d<f32>;
@group(0) @binding(2) var atlasSampler:sampler;
struct VOut { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn actorVS(@builtin(vertex_index) i:u32)->VOut {
 let pos=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));
 let q=pos[i];let p=u.rect.xy+q*u.rect.zw;var o:VOut;
 o.position=vec4f(p/u.viewport*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);
 o.uv=(u.crop.xy+q*u.crop.zw)/u.atlas;return o;
}
@fragment fn actorFS(v:VOut)->@location(0) vec4f { return textureSampleLevel(atlas,atlasSampler,v.uv,0.); }
`;
const resolveWGSL = /* wgsl */`
@group(0) @binding(0) var rearRadiance:texture_2d<f32>;
@group(0) @binding(1) var rearSignal:texture_2d<f32>;
@group(0) @binding(2) var bodySurface:texture_2d<f32>;
@group(0) @binding(3) var frontRadiance:texture_2d<f32>;
@group(0) @binding(4) var frontSignal:texture_2d<f32>;
@group(0) @binding(5) var receiverRadiance:texture_2d<f32>;
@group(0) @binding(6) var sparkleRadiance:texture_2d<f32>;
struct Out { @location(0) emission:vec4f, @location(1) signal:vec4f };
@vertex fn fullVS(@builtin(vertex_index)i:u32)->@builtin(position)vec4f { let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.); }
@fragment fn resolveFS(@builtin(position)p:vec4f)->Out {
 let xy=vec2i(p.xy);let a=textureLoad(bodySurface,xy,0).a;var o:Out;
 o.emission=vec4f(textureLoad(rearRadiance,xy,0).rgb*(1.-a)+textureLoad(frontRadiance,xy,0).rgb+textureLoad(receiverRadiance,xy,0).rgb+textureLoad(sparkleRadiance,xy,0).rgb,0.);
 o.signal=vec4f(textureLoad(rearSignal,xy,0).rgb*(1.-a)+textureLoad(frontSignal,xy,0).rgb,0.);return o;
}
`;
const compositeWGSL = /* wgsl */`
@group(0) @binding(0) var rearMaterial:texture_2d<f32>;
@group(0) @binding(1) var bodySurface:texture_2d<f32>;
@group(0) @binding(2) var frontMaterial:texture_2d<f32>;
@group(0) @binding(3) var emission:texture_2d<f32>;
@group(0) @binding(4) var observer:texture_2d<f32>;
struct VOut { @builtin(position) position:vec4f };
@vertex fn fullVS(@builtin(vertex_index)i:u32)->VOut { let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:VOut;o.position=vec4f(p[i],0.,1.);return o; }
fn encode(c:vec3f)->vec3f { let x=clamp(c,vec3f(0),vec3f(1));return select(x*12.92,1.055*pow(x,vec3f(1./2.4))-.055,x>vec3f(.0031308)); }
@fragment fn compositeFS(v:VOut)->@location(0) vec4f {
 let p=vec2i(v.position.xy);let base=vec3f(.004,.006,.012);
 let r=textureLoad(rearMaterial,p,0);let b=textureLoad(bodySurface,p,0);let f=textureLoad(frontMaterial,p,0);
 var c=r.rgb+base*(1.-r.a);c=b.rgb*b.a+c*(1.-b.a);c=f.rgb+c*(1.-f.a);
 c+=textureLoad(emission,p,0).rgb+textureLoad(observer,p,0).rgb;
 return vec4f(encode(c),1.);
}
`;

function setStatus(message) { if (statusNode) statusNode.textContent = message; }
function stageError(error) {
  const text = String(error?.stack || error?.message || error);
  state.errors.push(text); setStatus(`WebGPU error: ${String(error?.message || error)}`);
  console.error('[vibe-r1]', error);
}
function texture(device, width, height, format, label) {
  return device.createTexture({ label, size:[width,height], format,
    usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC });
}
function destroyResources(r) {
  if (!r) return;
  for (const t of Object.values(r)) { if (t?.destroy) { try { t.destroy(); } catch {} } }
}
function disposeTargets() {
  if (state.resources) destroyResources(state.resources);
  state.resources = null; state.resolveGroup = null; state.compositeGroup = null;
}
function frameRect(width,height) {
  const dpr = width / Math.max(1, canvas.clientWidth);
  const H = fixture.actorHcss * dpr;
  const scale = H / 256;
  const anchorX = width * .5, anchorY = height * .55;
  return { H, x:anchorX - fixture.origin[0]*scale, y:anchorY + (fixture.ground[1]-fixture.origin[1])*scale,
    w:256*scale, h:256*scale, sourceX:anchorX, sourceY:anchorY + (fixture.ground[1]-fixture.origin[1]+fixture.sourcePointInCrop[1])*scale };
}
function projectFixtureOrigin(r) {
  // Gallery camera: fixed actor-world origin [0,0] translated to the exact
  // opaque authored actor sample. Actor and immutable event share this map.
  const camera=Object.freeze({scale:1,translation:[r.sourceX,r.sourceY]});
  return Object.freeze({camera,screen:[camera.translation[0],camera.translation[1]]});
}
function makeTargets(width,height) {
  const r = {};
  for (const name of ['rearMaterial','rearRadiance','rearSignal','frontMaterial','frontRadiance','frontSignal',
    'receiverMaterial','receiverRadiance','receiverSignal','sparkleMaterial','sparkleRadiance','sparkleSignal','emission','signal','observer','bodySurface'])
    r[name] = texture(state.device,width,height,'rgba16float',`vibe-r1:${name}`);
  r.foreground = texture(state.device,width,height,'rgba8unorm','vibe-r1:empty-fixture-foreground');
  state.resources = r;
  state.resolveGroup = state.device.createBindGroup({ layout:state.resolvePipeline.getBindGroupLayout(0), entries:[
    {binding:0,resource:r.rearRadiance.createView()},{binding:1,resource:r.rearSignal.createView()},
    {binding:2,resource:r.bodySurface.createView()},{binding:3,resource:r.frontRadiance.createView()},
    {binding:4,resource:r.frontSignal.createView()},{binding:5,resource:r.receiverRadiance.createView()},
    {binding:6,resource:r.sparkleRadiance.createView()}] });
  state.compositeGroup = state.device.createBindGroup({ layout:state.compositePipeline.getBindGroupLayout(0), entries:[
    {binding:0,resource:r.rearMaterial.createView()},{binding:1,resource:r.bodySurface.createView()},
    {binding:2,resource:r.frontMaterial.createView()},{binding:3,resource:r.emission.createView()},
    {binding:4,resource:r.observer.createView()}] });
  for (const slot of Object.values(state.recordSlots)) {
    slot.group = state.device.createBindGroup({layout:state.kernel.worldBindings,entries:[
      {binding:0,resource:{buffer:slot.buffer}},{binding:1,resource:r.foreground.createView()},
      {binding:2,resource:r.bodySurface.createView()}]});
  }
  state.recordSlots.observer.group = state.device.createBindGroup({
    layout:state.kernel.observer.getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:state.recordSlots.observer.buffer}},{binding:1,resource:r.emission.createView()},
      {binding:2,resource:r.signal.createView()},{binding:3,resource:state.observerSampler}]});
  const ar = frameRect(width,height);
  // WGSL vec4 alignment leaves an 8-byte pad after viewport.
  const uniform = new Float32Array([width,height,0,0,ar.x,ar.y,ar.w,ar.h,0,0,256,256,768,768,0,0]);
  state.device.queue.writeBuffer(state.actorUniform,0,uniform);
  state.actorGroup = state.device.createBindGroup({layout:state.actorLayout,entries:[
    {binding:0,resource:{buffer:state.actorUniform}},{binding:1,resource:state.actorTexture.createView()},
    {binding:2,resource:state.actorSampler}]});
}
function sizeCanvas() {
  if (!state.device || state.disposed) return;
  const box = canvas.getBoundingClientRect();
  const dpr = Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const w=Math.max(1,Math.round(box.width*dpr)),h=Math.max(1,Math.round(box.height*dpr));
  if (canvas.width===w&&canvas.height===h&&state.resources) return;
  canvas.width=w;canvas.height=h;disposeTargets();makeTargets(w,h);requestFrame();
}
function createRecordSlots() {
  const names=['rear','front','receiver','sparkle','observer'];state.recordSlots={};
  for(const name of names){
    const buffer=state.device.createBuffer({label:`vibe-r1:${name}:uniform`,size:ABI.bytes,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    state.recordSlots[name]={buffer,group:null};
  }
}
function makeFixtureEvent(now) {
  state.cycle++;
  const id=`magic_gallery-vibe-r1-${state.cycle}`;
  const variant=VARIANTS[(state.cycle-1)%VARIANTS.length];
  // The gallery world uses a fixed fixture origin (0,0); the camera's
  // translation projects that immutable event point onto the sampled actor
  // pixel below. Resize changes only that view transform, not the receipt.
  const x=0,y=0;
  const event={id,type:'action-vibe-coding',playerId:fixture.playerId,variant,x,y,radius:145,at:now,
    durationMs:0,targetX:null,targetY:null,targetId:'',objectId:'',viewerId:'',mode:'',effectKind:'',completionKind:'',markerCount:1};
  const receipt=snapshotReceipt(event,fixture.roomId);
  if(receipt.status!=='supported')throw new Error(`gallery fixture receipt rejected: ${receipt.reason}`);
  state.event=event;state.receipt=receipt;state.cycleStart=state.visualAge;state.prepared=null;
}
function currentPrepared(now) {
  if(!state.receipt) return null;
  const r=frameRect(canvas.width,canvas.height);
  const ageEms=Math.max(0,state.visualAge-state.cycleStart);
  const projection=projectFixtureOrigin(r);
  const sourceX=Math.round(projection.screen[0]), sourceY=Math.round(projection.screen[1]);
  const frame={roomId:fixture.roomId,ownerId:fixture.playerId,phase:'playing',actorPresent:true,actorVisible:true,
    coverageStatus:'actual-alpha',ageEms,rate:Number(rateSelect?.value||1),H:r.H,sourcePx:[sourceX,sourceY],
    projectedOriginalX:state.receipt.originalX,projectedOriginalY:state.receipt.originalY,
    actualSourceCoverage:fixture.sourceAlpha,viewport:[canvas.width,canvas.height]};
  const result=prepare(state.receipt,frame);
  if(result.status==='offscreen'){state.sound?.cancel(result.key);return null;}
  return result.status==='prepared'?result:null;
}
function writeRecord(slotName,p,opts) {
  const values=uniformFloats(p,{source:state.source,...opts});
  state.device.queue.writeBuffer(state.recordSlots[slotName].buffer,0,values);
}
function beginPass(encoder,names,label) {
  const clear={r:0,g:0,b:0,a:0};
  return encoder.beginRenderPass({label,colorAttachments:names.map(name=>({view:state.resources[name].createView(),clearValue:clear,loadOp:'clear',storeOp:'store'}))});
}
function clearCoverage(encoder) {
  const pass=encoder.beginRenderPass({label:'vibe-r1:no-nonactor-occluders',colorAttachments:[{
    view:state.resources.foreground.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.end();
}
function drawActor(encoder) {
  const pass=encoder.beginRenderPass({label:'vibe-r1:actual-white-hood-actor-surface',colorAttachments:[{
    view:state.resources.bodySurface.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
  pass.setPipeline(state.actorPipeline);pass.setBindGroup(0,state.actorGroup);pass.draw(6,1);pass.end();
}
function passKernel(encoder,slotName,targetNames,kind,p) {
  const pass=beginPass(encoder,targetNames,`vibe-r1:${slotName}`);
  if(kind==='observer')recordObserver(pass,state.kernel,p,{bindGroup:state.recordSlots.observer.group});
  else recordWorld(pass,state.kernel,p,{kind,bindGroup:state.recordSlots[slotName].group});
  pass.end();
}
function drawResolve(encoder) {
  const pass=encoder.beginRenderPass({label:'vibe-r1:rear-actor-alpha-resolve',colorAttachments:['emission','signal'].map(name=>({view:state.resources[name].createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}))});
  pass.setPipeline(state.resolvePipeline);pass.setBindGroup(0,state.resolveGroup);pass.draw(3,1);pass.end();
}
function drawComposite(encoder) {
  const pass=encoder.beginRenderPass({label:'vibe-r1:linear-world-e-observer-once',colorAttachments:[{
    view:state.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});
  pass.setPipeline(state.compositePipeline);pass.setBindGroup(0,state.compositeGroup);pass.draw(3,1);pass.end();
}
function updateFixture(now) {
  if(!state.receipt){makeFixtureEvent(now);return;}
  const age=state.visualAge-state.cycleStart;
  if(age>=1400){makeFixtureEvent(now);}
}
async function render(now) {
  state.raf=0;
  if(state.disposed||!state.ready||state.paused||document.hidden)return;
  if(!state.resources)sizeCanvas();
  const delta=state.lastFrameAt?Math.min(50,Math.max(0,now-state.lastFrameAt)):0;state.lastFrameAt=now;
  state.visualAge+=delta*Number(rateSelect?.value||1);
  updateFixture(now);
  const p=currentPrepared(now);state.prepared=p;
  if(p&&!p.live)state.sound?.cancel(p.receipt.key);
  const encoder=state.device.createCommandEncoder({label:`vibe-r1-frame-${++state.frameSerial}`});
  clearCoverage(encoder);drawActor(encoder);
  if(p){
    writeRecord('rear',p,{layer:-1,main:true,sparkle:false,receiver:false,near:false,flare:false});
    writeRecord('front',p,{layer:1,main:true,sparkle:false,receiver:false,near:false,flare:false});
    writeRecord('receiver',p,{layer:1,main:false,sparkle:false,receiver:true,near:false,flare:false});
    writeRecord('sparkle',p,{layer:1,main:false,sparkle:true,receiver:false,near:false,flare:false});
    writeRecord('observer',p,{layer:1,main:false,sparkle:false,receiver:false,near:observerToggle?.checked!==false,flare:observerToggle?.checked!==false});
    passKernel(encoder,'rear',['rearMaterial','rearRadiance','rearSignal'],'world',p);
    passKernel(encoder,'front',['frontMaterial','frontRadiance','frontSignal'],'world',p);
    passKernel(encoder,'receiver',['receiverMaterial','receiverRadiance','receiverSignal'],'receiver',p);
    passKernel(encoder,'sparkle',['sparkleMaterial','sparkleRadiance','sparkleSignal'],'sparkle',p);
    drawResolve(encoder);
    passKernel(encoder,'observer',['observer'],'observer',p);
  } else {
    for(const name of ['rearMaterial','rearRadiance','rearSignal','frontMaterial','frontRadiance','frontSignal','receiverMaterial','receiverRadiance','receiverSignal','sparkleMaterial','sparkleRadiance','sparkleSignal','emission','signal','observer']){
      const pass=encoder.beginRenderPass({label:`vibe-r1:clear-${name}`,colorAttachments:[{view:state.resources[name].createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.end();
    }
  }
  drawComposite(encoder);
  const command=encoder.finish();state.device.queue.submit([command]);state.submissions++;
  const submittedFrame=state.frameSerial, submittedEventKey=p?.receipt.key;
  state.lastSuccessfulFrame={id:submittedFrame,eventKey:submittedEventKey,ageEms:p?.ageEms??null,rate:p?.rate??null};
  state.device.queue.onSubmittedWorkDone().then(()=>{
    if(state.disposed||VERIFY||!p||!state.gestureUnlocked||state.normalMuted||document.hidden||!state.source)return;
    const nowPrepared=currentPrepared(performance.now());
    if(!nowPrepared||nowPrepared.receipt.key!==submittedEventKey||nowPrepared.ageEms>=1180||nowPrepared.rate<=0)return;
    state.sound?.onSubmission(nowPrepared,{submitted:true,eventKey:submittedEventKey,visible:true,gesture:true});
  }).catch(stageError);
  if(VERIFY)state.audioContext=null;
  setStatus(`WebGPU · cycle ${state.cycle} · ${p?Math.floor(p.ageEms)+' E ms':'gap'} · submit ${state.submissions}${VERIFY?' · verify audio 0':''}`);
  state.raf=requestAnimationFrame(render);
}
function requestFrame(){if(!state.ready||state.disposed||state.paused||state.raf)return;state.raf=requestAnimationFrame(render);}

async function loadActorTexture(device) {
  const image=new Image();image.src=fixture.asset;await image.decode();
  if(image.naturalWidth!==768||image.naturalHeight!==768)throw new Error('actor atlas dimensions changed');
  // External-image copies require COPY_DST AND RENDER_ATTACHMENT, even when
  // the destination is subsequently only sampled by the actor pipeline.
  device.pushErrorScope('validation');
  let texture=null,uploadError=null;
  try {
    texture=device.createTexture({label:'canonical white-hood/front authored atlas',size:[768,768],format:'rgba8unorm-srgb',usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT});
    device.queue.copyExternalImageToTexture({source:image,premultipliedAlpha:false},{texture},[768,768]);
    await device.queue.onSubmittedWorkDone();
  } catch(error) { uploadError=error; }
  const validationError=await device.popErrorScope();
  if(uploadError||validationError){
    texture?.destroy();
    throw new Error(`actor atlas upload failed: ${(uploadError||validationError).message}`);
  }
  return texture;
}
function shaderModule(device,label,code){const m=device.createShaderModule({label,code});state.shaders.push(m);return m;}
async function compileDiagnostics() {
  const results=[];
  for(const module of state.kernel.modules.concat(state.shaders)){
    if(typeof module.getCompilationInfo!=='function')continue;
    const info=await module.getCompilationInfo();
    for(const d of info.messages||[])results.push({type:d.type,lineNum:d.lineNum,linePos:d.linePos,message:d.message});
  }
  return results;
}
async function initialize() {
  if(!navigator.gpu)throw new Error('WebGPU is unavailable');
  const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('No WebGPU adapter');
  state.device=await adapter.requestDevice();
  state.context=canvas.getContext('webgpu');if(!state.context)throw new Error('Could not acquire WebGPU canvas context');
  state.format=navigator.gpu.getPreferredCanvasFormat();
  state.context.configure({device:state.device,format:state.format,alphaMode:'opaque'});
  state.actorTexture=await loadActorTexture(state.device);
  state.actorSampler=state.device.createSampler({magFilter:'linear',minFilter:'linear'});
  state.observerSampler=state.device.createSampler({magFilter:'linear',minFilter:'linear'});
  const world=shaderModule(state.device,'vibe-r1-authored-actor-surface',actorWGSL);
  state.actorLayout=state.device.createBindGroupLayout({entries:[
    {binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:'uniform',minBindingSize:64}},
    {binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
    {binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}}]});
  const actorPipeLayout=state.device.createPipelineLayout({bindGroupLayouts:[state.actorLayout]});
  state.actorPipeline=state.device.createRenderPipeline({label:'vibe-r1-authored-body-surface',layout:actorPipeLayout,
    vertex:{module:world,entryPoint:'actorVS'},fragment:{module:world,entryPoint:'actorFS',targets:[{format:'rgba16float'}]},
    primitive:{topology:'triangle-list'}});
  state.actorUniform=state.device.createBuffer({label:'vibe-r1-actor-fixture-uniform',size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const resolve=shaderModule(state.device,'vibe-r1-actual-alpha-resolve',resolveWGSL);
  state.resolvePipeline=state.device.createRenderPipeline({label:'vibe-r1-actual-alpha-resolve',layout:'auto',vertex:{module:resolve,entryPoint:'fullVS'},
    fragment:{module:resolve,entryPoint:'resolveFS',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  const composite=shaderModule(state.device,'vibe-r1-linear-presentation',compositeWGSL);
  state.compositePipeline=state.device.createRenderPipeline({label:'vibe-r1-linear-presentation',layout:'auto',vertex:{module:composite,entryPoint:'fullVS'},
    fragment:{module:composite,entryPoint:'compositeFS',targets:[{format:state.format}]},primitive:{topology:'triangle-list'}});
  state.kernel=createKernel(state.device,{worldFormats:ABI.worldFormats,observerFormat:'rgba16float'});
  const diagnostics=await compileDiagnostics();
  const errors=diagnostics.filter(d=>d.type==='error');
  if(errors.length)throw new Error(`WGSL compilation errors: ${JSON.stringify(errors)}`);
  state.recordSlots=null;createRecordSlots();
  state.ready=true;sizeCanvas();
  state.sound=sfxSubmissionController({verification:VERIFY,startVoice:createVoice,cancelVoice:stopVoice});
  state.lastFrameAt=0;requestFrame();
  window.dispatchEvent(new CustomEvent('vibe-r1-ready',{detail:{diagnostics,format:state.format}}));
  setStatus(`WebGPU ready · ${state.format} · 128-byte ABI · ${VARIANTS.length} variants${VERIFY?' · verify audio 0':''}`);
}

function ensureAudioBuffer() {
  if(state.audioBuffer)return state.audioBuffer;
  if(!state.audioContext)state.audioContext=new AudioContext();
  const samples=synthesize(state.audioContext.sampleRate);const buffer=state.audioContext.createBuffer(1,samples.length,state.audioContext.sampleRate);
  buffer.copyToChannel(samples,0);state.audioBuffer=buffer;return buffer;
}
function createVoice(cue) {
  if(VERIFY||!state.gestureUnlocked||!state.audioContext||state.normalMuted)return null;
  const source=state.audioContext.createBufferSource();source.buffer=ensureAudioBuffer();source.playbackRate.value=cue.playbackRate;
  const gain=state.audioContext.createGain();gain.gain.value=.72;source.connect(gain).connect(state.audioContext.destination);
  const handle={source,gain,key:cue.causeKey};source.onended=()=>state.sound?.voiceEnded(cue.causeKey);
  source.start(0,cue.bufferOffsetSeconds);return handle;
}
function stopVoice(handle) { if(!handle)return;try{handle.source.stop();}catch{}try{handle.source.disconnect();handle.gain.disconnect();}catch{} }
async function unlockAudio() {
  if(VERIFY)return galleryStatus();
  state.gestureUnlocked=true;ensureAudioBuffer();
  if(state.audioContext.state==='suspended')await state.audioContext.resume();
  return gallerySnapshot();
}
function galleryStatus(){return Object.freeze({verify:VERIFY,muted:VERIFY||state.normalMuted,contextCreated:!!state.audioContext,
  contextState:state.audioContext?.state||'not-created',gestureUnlocked:state.gestureUnlocked,activeVoices:state.sound?.audit().activeVoiceCount||0});}
function gallerySnapshot(){return Object.freeze({...galleryStatus(),cycle:state.cycle,frameSerial:state.frameSerial,submissions:state.submissions,
  ageEms:state.prepared?.ageEms??null,rate:Number(rateSelect?.value||1),eventId:state.event?.id||null,lastSuccessfulFrame:state.lastSuccessfulFrame,
  source:state.source,observer:observerToggle?.checked!==false,fixture:{...fixture},errors:state.errors.length});}
function setMuted(value){state.normalMuted=Boolean(value)||VERIFY;if(state.normalMuted)state.sound?.cancel();if(muteButton)muteButton.textContent=`音声: ${state.normalMuted?'OFF':'ON'}`;return galleryStatus();}
async function dispose() {
  if(state.disposed)return;state.disposed=true;state.paused=true;
  if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;state.sound?.close();
  try{state.resizeObserver?.disconnect();}catch{};disposeTargets();
  for(const s of Object.values(state.recordSlots||{}))try{s.buffer.destroy();}catch{}
  try{state.actorUniform?.destroy();state.actorTexture?.destroy();}catch{}
  try{await state.audioContext?.close();}catch{};try{state.device?.destroy();}catch{}
}
function halfToFloat(h) {
  const sign=(h&0x8000)?-1:1,exp=(h>>10)&0x1f,mant=h&0x03ff;
  if(exp===0)return sign*Math.pow(2,-14)*(mant/1024);
  if(exp===31)return mant?NaN:sign*Infinity;
  return sign*Math.pow(2,exp-15)*(1+mant/1024);
}
async function readNativeTargets({targets=['bodySurface','foreground','frontMaterial','rearMaterial','emission','observer'],rect=null}={}) {
  if(!state.ready||state.disposed||!state.device||!state.resources)throw new Error('Vibe r1 native targets are not available');
  const wasPaused=state.paused;
  state.paused=true;state.lastFrameAt=0;
  if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;
  try {
    // Freeze subsequent submissions before copying the last completed frame.
    await state.device.queue.onSubmittedWorkDone();
    const frame=state.lastSuccessfulFrame;
    if(!frame)throw new Error('No submitted frame is available for native readback');
    const width=canvas.width,height=canvas.height;
    const area=rect||{x:0,y:0,width,height};
    const x=Math.floor(area.x),y=Math.floor(area.y),w=Math.floor(area.width),h=Math.floor(area.height);
    if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(w)||!Number.isInteger(h)||x<0||y<0||w<1||h<1||x+w>width||y+h>height)
      throw new RangeError(`Readback rect must be an integer rectangle inside ${width}x${height}`);
    if(!Array.isArray(targets)||!targets.length)throw new TypeError('targets must be a nonempty array');
    const available={bodySurface:'rgba16float',foreground:'rgba8unorm',frontMaterial:'rgba16float',rearMaterial:'rgba16float',
      frontRadiance:'rgba16float',rearRadiance:'rgba16float',frontSignal:'rgba16float',rearSignal:'rgba16float',
      receiverMaterial:'rgba16float',receiverRadiance:'rgba16float',receiverSignal:'rgba16float',sparkleMaterial:'rgba16float',
      sparkleRadiance:'rgba16float',sparkleSignal:'rgba16float',emission:'rgba16float',signal:'rgba16float',observer:'rgba16float'};
    const result={frame:{...frame},dimensions:{width,height},rect:{x,y,width:w,height:h},
      fixtureSourceCoverage:{value:fixture.sourceAlpha,meaning:'declared-fixture-constant; not a GPU or final-pixel measurement'},
      targets:{},unavailable:{final:'Canvas presentation uses the WebGPU swapchain texture and is not COPY_SRC; no final-target readback was added.'}};
    for(const name of targets) {
      const format=available[name],source=state.resources[name];
      if(!format||!source){result.unavailable[name]='Unknown or unavailable internal target';continue;}
      const bytesPerPixel=format==='rgba8unorm'?4:8,rowBytes=w*bytesPerPixel,bytesPerRow=Math.ceil(rowBytes/256)*256;
      const buffer=state.device.createBuffer({label:`vibe-r1-diagnostic-readback:${name}`,size:bytesPerRow*h,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      try {
        const encoder=state.device.createCommandEncoder({label:`vibe-r1-diagnostic-copy:${name}`});
        encoder.copyTextureToBuffer({texture:source,origin:{x,y,z:0}},{buffer,offset:0,bytesPerRow,rowsPerImage:h},{width:w,height:h,depthOrArrayLayers:1});
        state.device.queue.submit([encoder.finish()]);await buffer.mapAsync(GPUMapMode.READ);
        const mapped=new Uint8Array(buffer.getMappedRange());
        if(format==='rgba8unorm') {
          const values=new Uint8Array(w*h*4);
          for(let row=0;row<h;row++)values.set(mapped.subarray(row*bytesPerRow,row*bytesPerRow+rowBytes),row*rowBytes);
          result.targets[name]={format,channels:4,valueType:'uint8-unorm-code-values',bytesPerPixel,rowBytes,bytesPerRow,values};
        } else {
          const values=new Float32Array(w*h*4),view=new DataView(mapped.buffer,mapped.byteOffset,mapped.byteLength);
          for(let row=0;row<h;row++)for(let col=0;col<w*4;col++)values[row*w*4+col]=halfToFloat(view.getUint16(row*bytesPerRow+col*2,true));
          result.targets[name]={format,channels:4,valueType:'float32-decoded-from-ieee754-binary16',bytesPerPixel,rowBytes,bytesPerRow,values};
        }
      } finally {if(buffer.mapState==='mapped')buffer.unmap();buffer.destroy();}
    }
    return result;
  } finally {
    if(!wasPaused&&!state.disposed){state.paused=false;state.lastFrameAt=0;requestFrame();}
  }
}
function visibilityChanged(){if(document.hidden){state.paused=true;state.lastFrameAt=0;state.sound?.visibilityChanged();}else if(!state.disposed){state.paused=false;state.lastFrameAt=0;sizeCanvas();requestFrame();}}
window.addEventListener('pagehide',dispose,{once:true});document.addEventListener('visibilitychange',visibilityChanged);
window.__gallerySfx=Object.freeze({activateFromGesture:unlockAudio,setMuted,status:galleryStatus,snapshot:gallerySnapshot,dispose});
window.vibeCodingR1=Object.freeze({status:()=>({ready:state.ready,verify:VERIFY,embed:EMBED,canvas:[canvas.width,canvas.height],cssRect:(()=>{const r=canvas.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};})(),
  format:state.format,submissions:state.submissions,frameSerial:state.frameSerial,cycle:state.cycle,ageEms:state.prepared?.ageEms??null,rate:Number(rateSelect?.value||1),
  eventId:state.event?.id||null,receipt:state.receipt,prepared:state.prepared?{status:state.prepared.status,ageEms:state.prepared.ageEms,sourcePx:state.prepared.sourcePx,scissor:state.prepared.scissor}:null,
  fixture,sourceProjection:projectFixtureOrigin(frameRect(canvas.width,canvas.height)),sourceEnabled:state.source,observerEnabled:observerToggle?.checked!==false,shaderModules:state.kernel?.modules?.length||0,
  targetFormats:state.resources?{artistMRT:ABI.worldFormats,observer:'rgba16float',bodySurface:'rgba16float',foregroundCoverage:'rgba8unorm',actorTexture:'rgba8unorm-srgb',presentation:state.format}:{},errors:state.errors.slice()}),
  pause:()=>{state.paused=true;state.lastFrameAt=0;state.sound?.visibilityChanged();if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;},
  resume:()=>{if(!state.disposed){state.paused=false;state.lastFrameAt=0;requestFrame();}},readNativeTargets,dispose});

sourceToggle?.addEventListener('change',()=>{state.source=sourceToggle.checked;if(!state.source)state.sound?.cancel();requestFrame();});
observerToggle?.addEventListener('change',requestFrame);
rateSelect?.addEventListener('change',()=>{state.sound?.cancel();state.lastFrameAt=0;requestFrame();});
muteButton?.addEventListener('click',()=>{if(state.normalMuted)setMuted(false);else setMuted(true);});
document.addEventListener('pointerdown',()=>{if(!VERIFY)void unlockAudio().catch(stageError);},{once:true});
window.addEventListener('resize',sizeCanvas);
try {
  const stage=document.querySelector('#stage');
  if(typeof ResizeObserver==='function'){state.resizeObserver=new ResizeObserver(sizeCanvas);state.resizeObserver.observe(stage);}
  await initialize();
} catch(error) { stageError(error); }
