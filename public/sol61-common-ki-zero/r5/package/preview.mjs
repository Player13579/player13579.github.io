import { buildFrame, packSourceUniform, SOURCE_WGSL, RECEIVING_WGSL, OBS_WGSL, UNIFORM_BYTES, synthesizeSfx, supports } from './creative.mjs';

const canvas = document.querySelector('#view');
const status = document.querySelector('#status');
const diagnostics = document.querySelector('#diagnostics');
const ageControl = document.querySelector('#age');
const ageOut = document.querySelector('#ageOut');
const query = new URLSearchParams(location.search);
const verify = query.has('verify');
const spritePath = './assets/male-right-walk-v790.png';
const spriteSha = 'd707879e5ef7172dc92c4e2b31f24718cfc01ce68552b7f08ba3bc086ec030a6';
const spriteLayout = Object.freeze({sourceOrigin:Object.freeze({x:128,y:240}),ground:Object.freeze({x:0,y:31}),scale:0.41964285714285715});
const crop = Object.freeze({x:0,y:0,width:256,height:256});
const localFixtureEvent = Object.freeze({id:'standalone-common-ki-preview-fixture',type:'action-renki',playerId:'fixture-body',x:0,y:0,at:0,variant:'',durationMs:0});
let device, context, format, spriteImage, spriteTextureCache, spriteTexture, gpuReady=false;
let textures = null, pipelines = null, bind = null, vertexBuffer = null;
let bodyHull = null, currentAge = Number(ageControl.value), playing = false, hasStarted=false, playStart = 0, playBase = 0, currentTotal=0;
let frameSerial = 0, localProof = 'not-observed', proofPending = false, lastError = null, scaleName = 'actual';
let audioContext=null, activeAudio=null, currentCycle=0, cycleSfxPlayed=false, pendingProofCycle=null, sourceEpoch=0, runGeneration=0;
let lastMetrics = {};

const U = globalThis.GPUBufferUsage;
const TU = globalThis.GPUTextureUsage;
const shaderModules = [];
const FULLSCREEN_VERTEX = `
@vertex fn fullscreen(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
 return vec4f(p[i],0.0,1.0);
}`;
const BASE_WGSL = `${FULLSCREEN_VERTEX}
struct View { footH:vec4f };
@group(0) @binding(0) var<uniform> v:View;
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
 let down=(p.y-v.footH.y)/v.footH.z;
 var c=vec3f(0.105,0.132,0.165);
 if(down>0.015 && down<1.2) { c=vec3f(0.135,0.153,0.171); }
 let x=(p.x-v.footH.x)/v.footH.z;
 let wall= x>0.56 && x<0.64 && down>-0.13 && down<0.33;
 if(wall) { c=vec3f(0.18,0.20,0.215); }
 return vec4f(c,1.0);
}`;
const BODY_WGSL = `
struct In { @location(0) pos:vec2f, @location(1) uv:vec2f };
struct Out { @builtin(position) pos:vec4f, @location(0) uv:vec2f };
@vertex fn vs(i:In)->Out { var o:Out; o.pos=vec4f(i.pos,0.0,1.0); o.uv=i.uv; return o; }
@group(0) @binding(0) var imageSampler:sampler;
@group(0) @binding(1) var imageTexture:texture_2d<f32>;
fn srgbToLinear(c:vec3f)->vec3f {
 let lo=c/12.92; let hi=pow((c+vec3f(0.055))/1.055,vec3f(2.4));
 return select(hi,lo,c<=vec3f(0.04045));
}
@fragment fn fs(i:Out)->@location(0) vec4f {
 let halfTexel=vec2f(0.5)/vec2f(textureDimensions(imageTexture));
 let uvMin=vec2f(0.0); let uvMax=vec2f(256.0/768.0,256.0/768.0); let center=(uvMin+uvMax)*0.5;
 let clampedUV=clamp(i.uv,min(uvMin+halfTexel,center),max(uvMax-halfTexel,center));
 let s=textureSample(imageTexture,imageSampler,clampedUV); let a=s.a;
 if(a<=0.00001){return vec4f(0.0);}
 let straight=clamp(s.rgb/a,vec3f(0.0),vec3f(1.0));
 let linear=srgbToLinear(straight)*a;
 return vec4f(linear,a);
}`;
const ADD_TEXTURE_WGSL = `${FULLSCREEN_VERTEX}
@group(0) @binding(0) var sourceTexture:texture_2d<f32>;
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f { return textureLoad(sourceTexture,vec2i(p.xy),0); }`;
const COPY_BODY_WGSL = ADD_TEXTURE_WGSL;
const KI_SHARED_WGSL = `
struct KiPlate { shape:vec4f, light:vec4f, flow:vec4f };
struct KiParams { footH:vec4f, sourceSampler:vec4f, plates:array<KiPlate,8> };
@group(0) @binding(0) var<uniform> ki:KiParams;`;
const KI_VISIBILITY_WGSL = `
fn slab(o:f32,d:f32,lo:f32,hi:f32)->vec2f {
 if(abs(d)<0.00001) { if(o<lo||o>hi){return vec2f(1.0,0.0);} return vec2f(-100000.0,100000.0); }
 let a=(lo-o)/d; let b=(hi-o)/d; return vec2f(min(a,b),max(a,b));
}
fn kiSourceVisibility(source:vec3f,receiver:vec3f)->f32 {
 if(receiver.x>=0.56 && receiver.x<=0.64 && receiver.y>=0.0 && receiver.y<=0.45 && receiver.z>=0.24 && receiver.z<=0.34){return 1.0;}
 let d=receiver-source; let x=slab(source.x,d.x,0.56,0.64); let y=slab(source.y,d.y,0.0,0.45); let z=slab(source.z,d.z,0.24,0.34);
 let near=max(max(x.x,y.x),z.x); let far=min(min(x.y,y.y),z.y);
 let blocked=far>=max(near,0.001) && near<0.999;
 return select(1.0,0.0,blocked);
}`;
function withSourceVisibility(shaderText){
 const injected=`${KI_SHARED_WGSL}\n${KI_VISIBILITY_WGSL}\n${shaderText}`;
 return injected;
}
function withObserverSideVisibility(shaderText){
 const marker='rgb+=vis*power*(4.*p.shape.w*p.light.y)*kernel*vec3f(.48,1.45,2.05);';
 if(!shaderText.includes(marker))throw new Error('R5 OBS source adapter marker mismatch');
 return withSourceVisibility(shaderText.replace(marker,'let receiver=vec3f(point.x,point.y,0.); let sideVisible=kiSourceVisibility(vec3f(p.shape.xy,p.light.z),receiver); rgb+=vis*sideVisible*power*(4.*p.shape.w*p.light.y)*kernel*vec3f(.48,1.45,2.05);'));
}
const R5_RECEIVER_WGSL = `${FULLSCREEN_VERTEX}
${KI_SHARED_WGSL}
@group(0) @binding(1) var<uniform> flags:vec4f;
${KI_VISIBILITY_WGSL}
${RECEIVING_WGSL}
@fragment fn fs(@builtin(position) pix:vec4f)->@location(0) vec4f {
 if(flags.x<0.5){return vec4f(0.0);}
 let H=ki.footH.z; let x=(pix.x-ki.footH.x)/H; let down=(pix.y-ki.footH.y)/H;
 let floor=down>0.015 && down<1.2;
 let wall=x>0.56 && x<0.64 && down>-0.13 && down<0.33;
 if(!floor && !wall){return vec4f(0.0);}
 var position:vec3f; var normal:vec3f;
 if(floor){position=vec3f(x,0.0,down);normal=vec3f(0.0,1.0,0.0);}
 else{position=vec3f(0.60,0.34-down,0.29);normal=vec3f(-1.0,0.0,0.0);}
 return vec4f(kiReceived(position,normal,vec3f(0.48,0.51,0.54),1.0),0.0);
}`;
const R5_BODY_RECEIVER_WGSL = `${FULLSCREEN_VERTEX}
${KI_SHARED_WGSL}
@group(0) @binding(1) var bodyTexture:texture_2d<f32>;
@group(0) @binding(2) var<uniform> flags:vec4f;
${KI_VISIBILITY_WGSL}
${RECEIVING_WGSL}
@fragment fn fs(@builtin(position) pix:vec4f)->@location(0) vec4f {
 if(flags.x<0.5){return vec4f(0.0);}
 let q=vec2i(pix.xy); let bodyAlpha=textureLoad(bodyTexture,q,0).a;
 if(bodyAlpha<=0.00001){return vec4f(0.0);}
 let H=ki.footH.z; let position=vec3f((pix.x-ki.footH.x)/H,(ki.footH.y-pix.y)/H,0.0);
 let received=kiReceived(position,vec3f(0.0,0.0,1.0),vec3f(0.42,0.46,0.52),1.0);
 return vec4f(received*bodyAlpha*0.78,0.0);
}`;
const R5_OBS_WGSL = `${FULLSCREEN_VERTEX}\n${withObserverSideVisibility(`@group(0) @binding(1) var bodyTexture:texture_2d<f32>;
@group(0) @binding(2) var<uniform> flags:vec4f;
${OBS_WGSL}`)}`;
const FINAL_WGSL = `${FULLSCREEN_VERTEX}
@group(0) @binding(0) var linearTexture:texture_2d<f32>;
fn tone(x:vec3f)->vec3f { return x/(vec3f(1.0)+x); }
fn encodeSrgb(x:vec3f)->vec3f {
 let c=clamp(x,vec3f(0.0),vec3f(1.0));
 let lo=12.92*c; let hi=1.055*pow(c,vec3f(1.0/2.4))-vec3f(0.055);
 return select(hi,lo,c<=vec3f(0.0031308));
}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
 let scene=textureLoad(linearTexture,vec2i(p.xy),0).rgb;
 return vec4f(encodeSrgb(tone(scene)),1.0);
}`;
function shader(device, label, code) {
  const module = device.createShaderModule({label, code});
  shaderModules.push({label,module});
  return module;
}
function throwDiagnostics(label, messages) {
  const bad = messages.filter(m => m.type === 'error' || m.type === 'warning');
  if (bad.length) throw new Error(`${label}: ${bad.map(m=>`${m.type} ${m.lineNum??''}:${m.linePos??''} ${m.message}`).join('\n')}`);
}
function uniformBuffer(label, bytes) { return device.createBuffer({label,size:bytes,usage:U.UNIFORM|U.COPY_DST}); }
function makeTexture(label,w,h,formatName='rgba16float',usage=TU.RENDER_ATTACHMENT|TU.TEXTURE_BINDING) {
  return device.createTexture({label,size:[w,h],format:formatName,usage});
}
function makeBind(pipeline, entries) { return device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries}); }
function addBlend() { return {color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}}; }
function srcOverBlend() { return {color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}; }
function clip(x,y,w,h) { return [x/w*2-1,1-y/h*2]; }

function makeBodyVertices(width,height,dpr,layout) {
  const baselineCss=canvas.clientHeight*0.76;
  const scale=layout.scale;
  const entry={assetPath:'assets/generated/male-right-walk-v790.png',layout,
    idle:{x:0,y:0,width:256,height:256}};
  const player={id:'fixture-body',x:canvas.clientWidth/2,y:baselineCss-layout.ground.y*scale};
  const command=globalThis.DvaWebGPUPlayerSprite.createCommand({player,identity:'fixture-body',direction:'right',mode:'walk',entry,image:spriteImage,frame:crop,camera:{x:0,y:0},zoom:dpr});
  if(!command) throw new Error('Pinned player-sprite createCommand rejected the exact first crop descriptor');
  const s=command.sprite, m=s.transform, [cx,cy,cw,ch]=s.crop, [sw,sh]=s.sourceSize;
  const points=[[s.x,s.y,0,0],[s.x+s.w,s.y,1,0],[s.x,s.y+s.h,0,1],[s.x,s.y+s.h,0,1],[s.x+s.w,s.y,1,0],[s.x+s.w,s.y+s.h,1,1]];
  const values=[];
  for(const [lx,ly,tx,ty] of points){
    const wx=m[0]*lx+m[2]*ly+m[4], wy=m[1]*lx+m[3]*ly+m[5];
    const [nx,ny]=clip(wx,wy,width,height);
    values.push(nx,ny,(cx+tx*cw)/sw,(cy+ty*ch)/sh);
  }
  const foot=[width/2,baselineCss*dpr];
  const hullHeight=bodyHull.maxY-bodyHull.minY+1;
  const H=hullHeight*scale*dpr;
  return {vertices:new Float32Array(values),foot,H,command,baselineCss,scale};
}

async function loadBody() {
  const response=await fetch(spritePath,{cache:'no-store'});
  if(!response.ok) throw new Error(`Body source HTTP ${response.status}`);
  const bytes=await response.arrayBuffer();
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const actual=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  if(actual!==spriteSha) throw new Error(`Body source pin mismatch: ${actual}`);
  const blob=new Blob([bytes],{type:'image/png'});
  spriteImage=new Image(); spriteImage.src=URL.createObjectURL(blob);
  await spriteImage.decode();
  const c=new OffscreenCanvas(spriteImage.naturalWidth,spriteImage.naturalHeight);
  const ctx=c.getContext('2d',{willReadFrequently:true}); ctx.drawImage(spriteImage,0,0);
  const alpha=ctx.getImageData(crop.x,crop.y,crop.width,crop.height).data;
  let minX=crop.width,minY=crop.height,maxX=-1,maxY=-1,count=0;
  for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++)if(alpha[(y*crop.width+x)*4+3]>0){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);count++;}
  if(count!==10982||maxY-minY+1!==227||minX!==82||maxX!==169||minY!==13||maxY!==239) throw new Error('Pinned first-crop alpha hull descriptor mismatch');
  bodyHull=Object.freeze({minX,minY,maxX,maxY,width:maxX-minX+1,height:maxY-minY+1,nonzeroAlphaPixels:count});
  spriteTextureCache=globalThis.DvaWebGPUPlayerSprite.createTextureCache(device);
  const command=globalThis.DvaWebGPUPlayerSprite.createCommand({player:{id:'fixture-body',x:0,y:0},identity:'fixture-body',direction:'right',mode:'walk',entry:{assetPath:'assets/generated/male-right-walk-v790.png',layout:spriteLayout},image:spriteImage,frame:crop,camera:{x:0,y:0},zoom:1});
  spriteTexture=spriteTextureCache.textureFor(command);
}

function recreateTargets(w,h) {
  if(textures){for(const t of Object.values(textures))t.destroy();}
  textures={back:makeTexture('common-ki back source rgba16float',w,h),front:makeTexture('common-ki front source rgba16float',w,h),body:makeTexture('technical body rgba16float',w,h),receiver:makeTexture('source-bound receiver rgba16float',w,h),bodyReceiver:makeTexture('source-bound body received light rgba16float',w,h),observer:makeTexture('visible-source OBS rgba16float',w,h),scene:makeTexture('linear scene composition rgba16float',w,h)};
  bind.backTex=makeBind(pipelines.addTexture,[{binding:0,resource:textures.back.createView()}]);
  bind.frontTex=makeBind(pipelines.addTexture,[{binding:0,resource:textures.front.createView()}]);
  bind.bodyCopy=makeBind(pipelines.copyBody,[{binding:0,resource:textures.body.createView()}]);
  bind.bodyReceiver=makeBind(pipelines.bodyReceiver,[{binding:0,resource:{buffer:bind.params}},{binding:1,resource:textures.body.createView()},{binding:2,resource:{buffer:bind.nearbyFlags}}]);
  bind.final=makeBind(pipelines.final,[{binding:0,resource:textures.scene.createView()}]);
  bind.obs=makeBind(pipelines.observer,[{binding:0,resource:{buffer:bind.params}},{binding:1,resource:textures.body.createView()},{binding:2,resource:{buffer:bind.observerFlags}}]);
  bind.receiver=makeBind(pipelines.receiver,[{binding:0,resource:{buffer:bind.params}},{binding:1,resource:{buffer:bind.nearbyFlags}}]);
}

async function initGpu() {
  if(!navigator.gpu) throw new Error('WebGPU unavailable');
  const adapter=await navigator.gpu.requestAdapter(); if(!adapter)throw new Error('No WebGPU adapter');
  device=await adapter.requestDevice(); context=canvas.getContext('webgpu'); if(!context)throw new Error('webgpu canvas context unavailable');
  format=navigator.gpu.getPreferredCanvasFormat();
  context.configure({device,format,alphaMode:'opaque'});
  await loadBody();
  const sourceModule=shader(device,'common-ki exact artist SOURCE_WGSL',`${FULLSCREEN_VERTEX}\n${SOURCE_WGSL}`);
  const receiverModule=shader(device,'common-ki R5 source-bound floor and side receiver',R5_RECEIVER_WGSL);
  const bodyReceiverModule=shader(device,'common-ki R5 body-alpha-masked receiving pass',R5_BODY_RECEIVER_WGSL);
  const observerModule=shader(device,'common-ki R5 visible-source imaging PSF',R5_OBS_WGSL);
  const bodyModule=shader(device,'pinned first-crop technical body sampling',BODY_WGSL);
  const addModule=shader(device,'linear texture add/source over',ADD_TEXTURE_WGSL);
  const baseModule=shader(device,'neutral test scene base',BASE_WGSL);
  const finalModule=shader(device,'explicit SDR tone-map and sRGB output',FINAL_WGSL);
  await Promise.all(shaderModules.map(async ({label,module})=>throwDiagnostics(label,await module.getCompilationInfo().then(x=>x.messages))));
  const sourcePipeline=await device.createRenderPipelineAsync({label:'common ki artist source',layout:'auto',vertex:{module:sourceModule,entryPoint:'fullscreen'},fragment:{module:sourceModule,entryPoint:'commonKiSource',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  const basePipeline=await device.createRenderPipelineAsync({label:'neutral test scene',layout:'auto',vertex:{module:baseModule,entryPoint:'fullscreen'},fragment:{module:baseModule,entryPoint:'fs',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  const receiverPipeline=await device.createRenderPipelineAsync({label:'R5 source-bound Lambertian floor and side receiver',layout:'auto',vertex:{module:receiverModule,entryPoint:'fullscreen'},fragment:{module:receiverModule,entryPoint:'fs',targets:[{format:'rgba16float',blend:addBlend()}]},primitive:{topology:'triangle-list'}});
  const bodyReceiverPipeline=await device.createRenderPipelineAsync({label:'R5 body-alpha-masked additive receiving light',layout:'auto',vertex:{module:bodyReceiverModule,entryPoint:'fullscreen'},fragment:{module:bodyReceiverModule,entryPoint:'fs',targets:[{format:'rgba16float',blend:addBlend()}]},primitive:{topology:'triangle-list'}});
  const observerPipeline=await device.createRenderPipelineAsync({label:'R5 source-bound local imaging PSF',layout:'auto',vertex:{module:observerModule,entryPoint:'fullscreen'},fragment:{module:observerModule,entryPoint:'commonKiObserver',targets:[{format:'rgba16float',blend:addBlend()}]},primitive:{topology:'triangle-list'}});
  const addTexture=await device.createRenderPipelineAsync({label:'linear additive layer',layout:'auto',vertex:{module:addModule,entryPoint:'fullscreen'},fragment:{module:addModule,entryPoint:'fs',targets:[{format:'rgba16float',blend:addBlend()}]},primitive:{topology:'triangle-list'}});
  const copyBody=await device.createRenderPipelineAsync({label:'ordinary body source-over',layout:'auto',vertex:{module:addModule,entryPoint:'fullscreen'},fragment:{module:addModule,entryPoint:'fs',targets:[{format:'rgba16float',blend:srcOverBlend()}]},primitive:{topology:'triangle-list'}});
  const bodyPipeline=await device.createRenderPipelineAsync({label:'pinned technical male body',layout:'auto',vertex:{module:bodyModule,entryPoint:'vs',buffers:[{arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x2'}]}]},fragment:{module:bodyModule,entryPoint:'fs',targets:[{format:'rgba16float',blend:srcOverBlend()}]},primitive:{topology:'triangle-list'}});
  const bodySampler=device.createSampler({label:'existing linear sprite filtering',magFilter:'linear',minFilter:'linear',mipmapFilter:'nearest',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
  const finalPipeline=await device.createRenderPipelineAsync({label:'explicit display transfer',layout:'auto',vertex:{module:finalModule,entryPoint:'fullscreen'},fragment:{module:finalModule,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
  pipelines={source:sourcePipeline,base:basePipeline,receiver:receiverPipeline,bodyReceiver:bodyReceiverPipeline,observer:observerPipeline,addTexture,copyBody,body:bodyPipeline,final:finalPipeline};
  const params=uniformBuffer('captured R5 artist parameters 416B',UNIFORM_BYTES), paramsBack=uniformBuffer('R5 back plate sort filter 416B',UNIFORM_BYTES), paramsFront=uniformBuffer('R5 front plate sort filter 416B',UNIFORM_BYTES), view=uniformBuffer('view foot/H',16), nearbyFlags=uniformBuffer('nearby feature switch',16), observerFlags=uniformBuffer('observer feature switch',16);
  bind={params,paramsBack,paramsFront,view,
    sourceBack:makeBind(sourcePipeline,[{binding:0,resource:{buffer:paramsBack}}]),
    sourceFront:makeBind(sourcePipeline,[{binding:0,resource:{buffer:paramsFront}}]),
    base:makeBind(basePipeline,[{binding:0,resource:{buffer:view}}]),
    nearbyFlags,observerFlags,
    receiver:null,
    observer:null,
    sprite:makeBind(bodyPipeline,[{binding:0,resource:bodySampler},{binding:1,resource:spriteTexture}])};
  // Rebuild the OBS group after target allocation. Keep the same captured uniform buffer.
  Object.defineProperty(bind,'_bodySampler',{value:bodySampler});
  recreateCanvasSize();
  bind.obs=makeBind(observerPipeline,[{binding:0,resource:{buffer:params}},{binding:1,resource:textures.body.createView()},{binding:2,resource:{buffer:observerFlags}}]);
  device.lost.then(info=>{gpuReady=false;lastError=`Device lost: ${info.message}`;playing=false;runGeneration++;cycleSfxPlayed=true;cancelFixtureSfx('device-lost');status.textContent=lastError;}).catch(e=>{gpuReady=false;lastError=e.message;playing=false;runGeneration++;cancelFixtureSfx('device-lost');});
  gpuReady=true;
}

function recreateCanvasSize() {
  if(!device || !pipelines || !bind)return;
  const dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1));
  const w=Math.max(2,Math.round(canvas.clientWidth*dpr)),h=Math.max(2,Math.round(canvas.clientHeight*dpr));
  if(canvas.width===w&&canvas.height===h&&textures)return;
  canvas.width=w;canvas.height=h;recreateTargets(w,h);
}

function renderFrame(age) {
  if(!gpuReady||!device||!bodyHull||!pipelines||!bind||!textures)return;
  recreateCanvasSize();
  const dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1));
  const selected=document.querySelector('#height').value;
  const scale=selected==='64'?64/bodyHull.height:spriteLayout.scale;
  scaleName=selected;
  const body=makeBodyVertices(canvas.width,canvas.height,dpr,{...spriteLayout,scale});
  const variant=document.querySelector('#variant').value;
  const controls={source:document.querySelector('#source').checked,nearby:document.querySelector('#nearby').checked,observer:document.querySelector('#observer').checked};
  if(!supports({...localFixtureEvent,variant}))throw new Error('Local fixture event is not accepted by exact artist source filter');
  const frame=buildFrame({ageEMs:age,variant,H:body.H,controls});
  const back=packSourceUniform(frame,body.foot,false),front=packSourceUniform(frame,body.foot,true),full=packSourceUniform(frame,body.foot,null);
  device.queue.writeBuffer(bind.paramsBack,0,back);device.queue.writeBuffer(bind.paramsFront,0,front);device.queue.writeBuffer(bind.params,0,full);
  device.queue.writeBuffer(bind.view,0,new Float32Array([body.foot[0],body.foot[1],body.H,0]));
  device.queue.writeBuffer(bind.nearbyFlags,0,new Float32Array([Number(frame.nearbyEnabled),0,0,0]));
  device.queue.writeBuffer(bind.observerFlags,0,new Float32Array([Number(frame.observerEnabled),0,0,0]));
  if(!vertexBuffer)vertexBuffer=device.createBuffer({label:'pinned body crop vertices',size:body.vertices.byteLength,usage:U.VERTEX|U.COPY_DST});device.queue.writeBuffer(vertexBuffer,0,body.vertices);
  const encoder=device.createCommandEncoder({label:'common-ki preview shared frame'});
  for(const [texture,group,label] of [[textures.back,bind.sourceBack,'back plates'],[textures.front,bind.sourceFront,'front plates']]){
    const rp=encoder.beginRenderPass({label:`render ${label}`,colorAttachments:[{view:texture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
    rp.setPipeline(pipelines.source);rp.setBindGroup(0,group);rp.draw(3);rp.end();
  }
  {const rp=encoder.beginRenderPass({label:'render qualified technical body fixture',colorAttachments:[{view:textures.body.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});rp.setPipeline(pipelines.body);rp.setBindGroup(0,bind.sprite);rp.setVertexBuffer(0,vertexBuffer);rp.draw(6);rp.end();}
  {const rp=encoder.beginRenderPass({label:'render R5 source-bound floor and side received light',colorAttachments:[{view:textures.receiver.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});rp.setPipeline(pipelines.receiver);rp.setBindGroup(0,bind.receiver);rp.draw(3);rp.end();}
  {const rp=encoder.beginRenderPass({label:'render R5 received light masked by ordinary body alpha',colorAttachments:[{view:textures.bodyReceiver.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});rp.setPipeline(pipelines.bodyReceiver);rp.setBindGroup(0,bind.bodyReceiver);rp.draw(3);rp.end();}
  {const rp=encoder.beginRenderPass({label:'render visible-source local PSF',colorAttachments:[{view:textures.observer.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});rp.setPipeline(pipelines.observer);rp.setBindGroup(0,bind.obs);rp.draw(3);rp.end();}
  {const rp=encoder.beginRenderPass({label:'compose linear scene and final actor transfer',colorAttachments:[{view:textures.scene.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});
    rp.setPipeline(pipelines.base);rp.setBindGroup(0,bind.base);rp.draw(3);
    rp.setPipeline(pipelines.addTexture);rp.setBindGroup(0,bind.backTex);rp.draw(3);
    rp.setPipeline(pipelines.addTexture);rp.setBindGroup(0,makeBind(pipelines.addTexture,[{binding:0,resource:textures.receiver.createView()}]));rp.draw(3);
    rp.setPipeline(pipelines.copyBody);rp.setBindGroup(0,bind.bodyCopy);rp.draw(3);
    rp.setPipeline(pipelines.addTexture);rp.setBindGroup(0,makeBind(pipelines.addTexture,[{binding:0,resource:textures.bodyReceiver.createView()}]));rp.draw(3);
    rp.setPipeline(pipelines.addTexture);rp.setBindGroup(0,bind.frontTex);rp.draw(3);
    rp.setPipeline(pipelines.addTexture);rp.setBindGroup(0,makeBind(pipelines.addTexture,[{binding:0,resource:textures.observer.createView()}]));rp.draw(3);
    rp.end();}
  {const rp=encoder.beginRenderPass({label:'explicit linear-to-SDR display transfer',colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});rp.setPipeline(pipelines.final);rp.setBindGroup(0,bind.final);rp.draw(3);rp.end();}
  const shouldObserve=!proofPending&&localProof==='not-observed'&&frame.sourceFlux>0;
  if(shouldObserve)device.pushErrorScope('validation');
  device.queue.submit([encoder.finish()]);frameSerial++;
  lastMetrics={state:'ready',frameSerial,ageEMs:age,fixtureClock:'monotonic preview clock at fixed actor rate 1; not R61 eEffectNow',variant,actualSource:'standalone-local-fixture-only',backendSourceAdmission:'not-connected',fixtureBodyVisible:true,bodySourceSha256:spriteSha,sourceCrop:[crop.x,crop.y,crop.width,crop.height],bodyAlphaHull:bodyHull,sourceOrigin:spriteLayout.sourceOrigin,ground:spriteLayout.ground,bodyLayoutScale:scale,devicePixelRatio:dpr,HBackingPixels:body.H,footPx:body.foot,format,canvasBacking:[canvas.width,canvas.height],layerOrder:['neutral background','rear source','source-bound floor/side received light','ordinary body','body-alpha-masked received light','front source','source-bound OBS','explicit display transfer'],uniformBytes:UNIFORM_BYTES,plates:frame.plates.length,sourceFlux:frame.sourceFlux,sourceEnabled:frame.plates.length>0,nearbyEnabled:frame.nearbyEnabled,observerEnabled:frame.observerEnabled,proof:'prepared/submitted counters are not canonical game receipt or same-frame app admission',nativeReplay:'not run',quality:'pending',adoption:'unadopted',mainGameConnected:false,SFX:verify?'hard zero (verify URL)':'local fixture one-shot after visible-source submission proof only',finalTransfer:'linear rgba16float scene → Reinhard-like x/(1+x) → explicit sRGB output',errors:lastError?[lastError]:[]};
  if(shouldObserve){proofPending=true;pendingProofCycle=currentCycle;localProof='validation+queue pending';const tokenCycle=currentCycle,tokenSourceEpoch=sourceEpoch,tokenRun=runGeneration,tokenVariant=variant,tokenAge=currentAge,tokenRate=1,tokenFlux=frame.sourceFlux;const validation=device.popErrorScope();const completed=device.queue.onSubmittedWorkDone();Promise.all([validation,completed]).then(([error])=>{proofPending=false;lastMetrics.localSubmissionProof=error?'validation-error':'validation-null-and-queue-complete';lastMetrics.validationError=error?{name:error.name,message:error.message}:null;lastMetrics.queueCompletion='fulfilled';lastMetrics.canonicalSourceAdmission='unavailable';if(error){localProof='validation-error';}else if(!(tokenFlux>0)||tokenCycle!==currentCycle||tokenSourceEpoch!==sourceEpoch||tokenRun!==runGeneration||tokenVariant!==document.querySelector('#variant').value||tokenRate!==1||!playing||verify||!document.querySelector('#source').checked||currentAge>=1170){localProof='not-observed';lastMetrics.localAdmission='cancelled: source envelope expired or cycle, run, variant, rate, or verify state changed';}else{localProof='local-preview-visible-submit';playFixtureSfxOnce(tokenCycle,tokenRun,tokenSourceEpoch,tokenVariant,tokenAge,tokenRate);}showDiagnostics();}).catch(error=>{localProof='submission-failed';proofPending=false;lastError=error?.message||String(error);lastMetrics.queueCompletion='rejected';lastMetrics.errors=[lastError];cancelFixtureSfx('submission-failed');showDiagnostics();});}
  showDiagnostics();
}

function stopAudio(reason){
  if(activeAudio){try{activeAudio.source.stop();}catch{}activeAudio=null;}
  if(reason)lastMetrics.audioCancellation=reason;
}
function cancelFixtureSfx(reason){stopAudio(reason);}
function playFixtureSfxOnce(cycle,run=runGeneration,epoch=sourceEpoch,variant=document.querySelector('#variant').value,sourceAge=currentAge,rate=1){
  if(verify||!playing||!document.querySelector('#source').checked||cycleSfxPlayed||cycle!==currentCycle||run!==runGeneration||epoch!==sourceEpoch||variant!==document.querySelector('#variant').value||!(sourceAge>0&&sourceAge<1170)||!(currentAge<1170)||rate!==1)return;
  cycleSfxPlayed=true;
  if(!audioContext){lastMetrics.sfxPlayback='blocked: AudioContext was not created by an explicit normal-mode Play gesture';return;}
  const pcm=synthesizeSfx(48000,document.querySelector('#variant').value);
  const buffer=audioContext.createBuffer(1,pcm.length,48000);buffer.copyToChannel(pcm,0);
  const source=audioContext.createBufferSource(),gain=audioContext.createGain();
  source.buffer=buffer;source.playbackRate.value=1;gain.gain.value=1;source.connect(gain);gain.connect(audioContext.destination);
  source.onended=()=>{if(activeAudio?.source===source)activeAudio=null;};
  source.start();activeAudio={source,gain,cycle};
  lastMetrics.sfxPlayback='played once after local validation-null + queue completion';
  lastMetrics.sfxSamples=pcm.length;lastMetrics.sfxDurationSeconds=pcm.length/48000;
}

function showDiagnostics(){diagnostics.textContent=JSON.stringify({...lastMetrics,shaderModules:shaderModules.map(s=>s.label),compilationErrors:0,localSubmissionValidation:localProof,canonicalAck:'not implemented',normalSfxPlayback:verify?'hard-zero':(lastMetrics.sfxPlayback||'pending local fixture submission'),productionSfx:'not connected'} ,null,2);}
function drawCurrent(){if(!gpuReady){if(!lastError)status.textContent='WebGPU preview resources are preparing';return;}try{currentAge=Number(ageControl.value);renderFrame(currentAge);status.textContent=verify?'verify preview (audio hard-zero)':`standalone fixture / ${currentAge} E ms / ${scaleName} H`;}catch(error){lastError=error.message;status.textContent=error.message;showDiagnostics();}}
function tick(now){if(!playing)return;const total=playBase+(now-playStart);currentTotal=total;const nextCycle=Math.floor(total/1200);if(nextCycle!==currentCycle){currentCycle=nextCycle;cycleSfxPlayed=false;localProof='not-observed';cancelFixtureSfx('new-local-fixture-cycle');}currentAge=total%1200;ageControl.value=String(Math.floor(currentAge));ageOut.value=String(Math.floor(currentAge));renderFrame(currentAge);requestAnimationFrame(tick);}
document.querySelector('#play').addEventListener('click',()=>{if(playing)return;if(verify){status.textContent='verify mode: audio is hard-zero';}else if(!audioContext){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(Audio){audioContext=new Audio();audioContext.resume().catch(error=>{lastMetrics.audioUnlockError=error.message;showDiagnostics();});}}else{audioContext.resume().catch(error=>{lastMetrics.audioUnlockError=error.message;showDiagnostics();});}runGeneration++;if(!hasStarted){playBase=0;currentTotal=0;currentAge=0;currentCycle=0;cycleSfxPlayed=false;hasStarted=true;ageControl.value='0';ageOut.value='0';if(!proofPending)localProof='not-observed';}else{currentCycle=Math.floor(playBase/1200);currentAge=playBase%1200;cycleSfxPlayed=true;}playing=true;playStart=performance.now();requestAnimationFrame(tick);});
document.querySelector('#pause').addEventListener('click',()=>{playing=false;runGeneration++;playBase=currentTotal;currentAge=playBase%1200;cycleSfxPlayed=true;cancelFixtureSfx('paused');});
document.querySelector('#render').addEventListener('click',drawCurrent);
ageControl.addEventListener('input',()=>{ageOut.value=ageControl.value;if(!playing){drawCurrent();if(hasStarted){playBase=Number(ageControl.value);currentTotal=playBase;currentAge=playBase%1200;currentCycle=Math.floor(playBase/1200);cycleSfxPlayed=true;}}});
for(const id of ['height','source','nearby','observer','variant'])document.querySelector(`#${id}`).addEventListener('change',()=>{if(id==='source'){sourceEpoch++;if(!document.querySelector('#source').checked){cycleSfxPlayed=true;cancelFixtureSfx('source-disabled');}}if(id==='variant'){sourceEpoch++;cycleSfxPlayed=true;cancelFixtureSfx('variant-changed');}drawCurrent();});
new ResizeObserver(()=>{recreateCanvasSize();if(!playing)drawCurrent();}).observe(canvas);
window.addEventListener('pagehide',()=>{gpuReady=false;playing=false;cancelFixtureSfx('preview-disposed');audioContext?.close();vertexBuffer?.destroy();spriteTextureCache?.destroy();for(const t of Object.values(textures||{}))t.destroy();device?.destroy();URL.revokeObjectURL(spriteImage?.src||'');},{once:true});

try {
  await initGpu();
  status.textContent='WebGPU pipelines ready; source/backend admission remains unavailable in this standalone preview.';
  drawCurrent();
  const pcm=synthesizeSfx(48000,'');
  lastMetrics.pcmDiagnostic={samples:pcm.length,seconds:pcm.length/48000,finite:pcm.every(Number.isFinite),played:false};
  showDiagnostics();
} catch(error) {
  lastError=error?.message||String(error);status.textContent=`WebGPU preview failed: ${lastError}`;
  const shaderResults=await Promise.all(shaderModules.map(async ({label,module})=>({label,messages:(await module.getCompilationInfo()).messages.filter(m=>m.type==='error'||m.type==='warning').map(m=>({type:m.type,message:m.message,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}))})));
  diagnostics.textContent=JSON.stringify({state:'error',error:error?.stack||lastError,shaderResults,canonicalSourceAdmission:'unavailable',quality:'pending',adoption:'unadopted'},null,2);
}
