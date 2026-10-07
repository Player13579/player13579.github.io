import { LIFETIME_SECONDS, PROFILES } from './source/creative-model.mjs';
import { WORLD_WGSL, OBSERVER_WGSL } from './source/creative-shaders.mjs';
import { admitLocalSelectionR5 } from './source/receipt-adapter.mjs';
import { claimSelectionConfirmation, makeSelectionConfirmationPCM } from './source/creative-sfx.mjs';

const canvas=document.querySelector('#view'), stage=document.querySelector('#stage');
const status=document.querySelector('#status'), selection=document.querySelector('#selected');
const params=new URLSearchParams(window.location.search);
const galleryEmbed=params.get('embed')==='1',galleryAutoLoop=params.get('galleryAutoLoop')==='1',galleryDemoMode=galleryEmbed||galleryAutoLoop;
const galleryStartup={schema:'dva-gallery-startup/v1',token:params.get('galleryStartupToken'),versionId:params.get('galleryVersionId'),attemptEpoch:Number(params.get('galleryAttemptEpoch')),sequence:0,stage:'child-document',status:'pending',ready:false};
const galleryHandshake=galleryEmbed&&typeof galleryStartup.token==='string'&&galleryStartup.token.length>0&&
  typeof galleryStartup.versionId==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(galleryStartup.versionId)&&
  Number.isSafeInteger(galleryStartup.attemptEpoch)&&galleryStartup.attemptEpoch>0;
const requestedVariant=params.get('variant')??params.get('galleryVariant');
const requestedProfile=PROFILES.find(p=>p.id===requestedVariant);
if(requestedProfile)selection.value=requestedProfile.id;
const settings=()=>({mainOn:document.querySelector('#mainOn').checked,sourceOn:document.querySelector('#sourceOn').checked,
  observerOn:document.querySelector('#observerOn').checked,reducedMotion:document.querySelector('#reducedMotion').checked});
const fixture={localWeaponSelectionReceipts:[],localNonFirearmCurrentReceiptId:'',localNonFirearmSelectionOwner:null,
  localNonFirearmSelectedWeaponId:'',roomSessionGeneration:1,currentRoomId:'private-gallery-room',currentActorId:'private-gallery-actor'};
let currentReceipt=null,actorEVisualTime=0,lastNow=performance.now(),device=null,context=null,format=null;
let targetGeneration=0,deviceGeneration=0,disposed=false,frameBusy=false,resourcesReady=false,renderScheduled=false,uniformBuffer=null;
let worldTexture=null,sourceTexture=null,observerTexture=null,sampler=null;
let actorPipeline=null,worldPipeline=null,observerPipeline=null,compositePipeline=null;
let actorPresentation=null,frameSerial=0,audioContext=null,galleryCycle=0,galleryAutoLoopDueAtMs=null,galleryVariantIndex=Math.max(0,PROFILES.findIndex(p=>p.id===selection.value));
const playedReceiptIds=new Set(),activeAudioSources=new Set();
const verificationMode=new URLSearchParams(window.location.search).has('verify');
function gallerySend(stageName,state,extra={}){
  if(!galleryHandshake||disposed)return false;
  galleryStartup.sequence++;galleryStartup.stage=stageName;galleryStartup.status=state;
  try{parent.postMessage({schema:galleryStartup.schema,token:galleryStartup.token,versionId:galleryStartup.versionId,
    attemptEpoch:galleryStartup.attemptEpoch,sequence:galleryStartup.sequence,stage:stageName,status:state,...extra},window.location.origin);return true;}
  catch{return false;}
}
function installFixtureReceipt(profile,{origin='trusted-private-fixture-selection'}={}){
  if(disposed||!profile)return null;
  const id=`fixture-gallery:${fixture.roomSessionGeneration}:${++galleryCycle}:${crypto.randomUUID()}`;
  const receipt=Object.freeze({id,type:'non-firearm-weapon-selection',origin:'local-selection',fixtureOnly:true,
    fixtureGenerator:origin,actorId:'private-gallery-actor',roomId:'private-gallery-room',roomGeneration:fixture.roomSessionGeneration,
    previous:Object.freeze({id:currentReceipt?.selected.id===profile.id?'fixture:gallery-demo-cycle':currentReceipt?.selected.id||'fixture:ordinary-item'}),
    selected:Object.freeze({id:profile.id,inventoryKind:profile.inventoryKind,sourceId:profile.sourceId,weaponKind:profile.weaponKind}),
    startedAt:performance.now(),eClockStartedAt:actorEVisualTime,eClockRoomId:'private-gallery-room',eClockRoomGeneration:fixture.roomSessionGeneration});
  retireActiveCueAudio();currentReceipt=receipt;fixture.localWeaponSelectionReceipts.push(receipt);
  if(fixture.localWeaponSelectionReceipts.length>64)fixture.localWeaponSelectionReceipts.shift();
  fixture.localNonFirearmCurrentReceiptId=id;fixture.localNonFirearmSelectedWeaponId=profile.id;
  fixture.localNonFirearmSelectionOwner=Object.freeze({receiptId:id,actorId:receipt.actorId,roomId:receipt.roomId,roomGeneration:receipt.roomGeneration});
  galleryVariantIndex=PROFILES.findIndex(p=>p.id===profile.id);
  galleryAutoLoopDueAtMs=galleryAutoLoop?actorEVisualTime+LIFETIME_SECONDS*1000+260:null;
  status.textContent=`Private gallery demo fixture · ${profile.id}; synthetic gallery receipt, not a game receipt.`;
  status.className='';scheduleRender();return receipt;
}
function advanceGalleryAutoLoop(){
  if(!galleryAutoLoop||!resourcesReady||disposed||galleryAutoLoopDueAtMs===null||actorEVisualTime<galleryAutoLoopDueAtMs)return false;
  galleryAutoLoopDueAtMs=null;const next=(galleryVariantIndex+1)%PROFILES.length,profile=PROFILES[next];selection.value=profile.id;
  installFixtureReceipt(profile,{origin:'explicit-gallery-auto-loop'});return true;
}
function gallerySnapshot(){return Object.freeze({demoMode:galleryDemoMode,autoLoop:galleryAutoLoop,handshake:galleryHandshake,
  startup:Object.freeze({...galleryStartup}),selectedId:fixture.localNonFirearmSelectedWeaponId||null,
  causeId:currentReceipt?.id||null,fixtureOnly:currentReceipt?.fixtureOnly===true,fixtureGenerator:currentReceipt?.fixtureGenerator||null,
  causeStartedAtMs:currentReceipt?.eClockStartedAt??null,audioRunning:audioContext?.state==='running',resourcesReady,renderScheduled,disposed,actorEVisualTime});}
function scheduleRender(){
  if(!resourcesReady||disposed||renderScheduled)return false;
  renderScheduled=true;
  requestAnimationFrame(now=>{
    renderScheduled=false;if(!resourcesReady||disposed)return;
    if(frameBusy){advanceActorClock(now);advanceGalleryAutoLoop();scheduleRender();return;}
    void render(now);
  });
  return true;
}
function advanceActorClock(now){
  if(!Number.isFinite(now))return;
  const delta=Math.max(0,Math.min(100,now-lastNow));lastNow=now;actorEVisualTime+=delta;
}
function unlockAudioFromGesture(){
  if(verificationMode)return Promise.resolve(false);
  try{
    const AudioCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtor)return Promise.resolve(false);
    if(!audioContext)audioContext=new AudioCtor();
    return Promise.resolve(audioContext.resume?.()).then(()=>audioContext?.state==='running').catch(()=>false);
  }catch{return Promise.resolve(false);}
}
async function activateGallerySfxFromGesture(){
  if(verificationMode)return{state:'silent',reason:'verification mode'};
  if(disposed)return{state:'stale',reason:'preview retired'};
  return await unlockAudioFromGesture()?{state:'active',reason:'using the preview-authored one-shot cue'}:
    {state:'unsupported',reason:'browser audio activation is locked or unavailable'};
}
function retireActiveCueAudio(){
  for(const source of activeAudioSources){try{source.stop();}catch{}}
  activeAudioSources.clear();
}
function playSelectionCue(cue){
  if(!cue||verificationMode||audioContext?.state!=='running')return false;
  try{
    const pcm=makeSelectionConfirmationPCM({variant:cue.variant,sampleRate:48000,sourceOn:true});
    const buffer=audioContext.createBuffer(1,pcm.pcm.length,pcm.sampleRate);
    buffer.copyToChannel(pcm.pcm,0);
    const source=audioContext.createBufferSource();source.buffer=buffer;source.connect(audioContext.destination);
    activeAudioSources.add(source);source.onended=()=>activeAudioSources.delete(source);source.start();return true;
  }catch{return false;}
}
const releaseTextures=()=>{for(const t of [worldTexture,sourceTexture,observerTexture]){try{t?.destroy();}catch{}}worldTexture=sourceTexture=observerTexture=null;};
function resize(){
  const rect=stage.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.max(0,Math.round(rect.width*dpr)),h=Math.max(0,Math.round(rect.height*dpr));
  if(!w||!h||!device)return false;
  if(canvas.width===w&&canvas.height===h&&worldTexture)return true;
  canvas.width=w;canvas.height=h;targetGeneration++;context.configure({device,format,alphaMode:'premultiplied'});releaseTextures();
  const usage=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING;
  worldTexture=device.createTexture({size:[w,h],format:'rgba16float',usage});
  sourceTexture=device.createTexture({size:[w,h],format:'rgba16float',usage});
  observerTexture=device.createTexture({size:[w,h],format:'rgba16float',usage});return true;
}
async function setup(){
  if(galleryHandshake)gallerySend('pipelines','pending');
  const worldLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}]});
  const observerLayout=device.createBindGroupLayout({entries:[
    {binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
    {binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
    {binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
    {binding:3,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}}]});
  const compositeLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}}]});
  const actorWGSL=`struct U{view:vec4f,state:vec4f,controls:vec4f,detail:vec4f}; @group(0) @binding(0) var<uniform> u:U; struct V{@builtin(position)position:vec4f,@location(0)local:vec2f,@location(1)part:f32}; @vertex fn vs(@builtin(vertex_index)i:u32)->V{let corners=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));let j=i%6u;let head=i>=6u;let h=u.state.y;let center=vec2f(u.view.z-.60*h,u.view.w+.55*h);let extent=select(vec2f(.20*h,.39*h),vec2f(.115*h,.115*h),head);let offset=select(vec2f(0.,.11*h),vec2f(0.,-.385*h),head);let px=center+offset+corners[j]*extent;var o:V;o.position=vec4f(px.x/u.view.x*2.-1.,1.-px.y/u.view.y*2.,0.,1.);o.local=corners[j];o.part=select(0.,1.,head);return o;} struct F{@location(0)main:vec4f,@location(1)radiance:vec4f}; @fragment fn fs(v:V)->F{var o:F;o.main=vec4f(.28,.36,.42,1.);o.radiance=vec4f(0.);if(v.part>.5&&dot(v.local,v.local)>1.){o.main=vec4f(0.);}return o;}`;
  const amod=device.createShaderModule({code:actorWGSL}),wmod=device.createShaderModule({code:WORLD_WGSL}),omod=device.createShaderModule({code:OBSERVER_WGSL});
  const transfer=format.endsWith('-srgb')?'let c=vec3f(1.)-exp(-max(s.rgb,vec3f(0.))); return vec4f(c,s.a);':'let m=vec3f(1.)-exp(-max(s.rgb,vec3f(0.))); let c=select(1.055*pow(m,vec3f(1./2.4))-.055,12.92*m,m<=vec3f(.0031308)); return vec4f(c,s.a);';
  const composite=`struct V{@builtin(position)position:vec4f}; @vertex fn vs(@builtin(vertex_index)i:u32)->V{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:V;o.position=vec4f(p[i],0.,1.);return o;} @group(0) @binding(0) var t:texture_2d<f32>; @fragment fn fs(v:V)->@location(0)vec4f{let s=textureLoad(t,vec2i(v.position.xy),0); ${transfer}}`;
  const cmod=device.createShaderModule({code:composite});
  const diagnostics=await Promise.all([amod,wmod,omod,cmod].map(m=>m.getCompilationInfo()));
  const shaderErrors=diagnostics.flatMap(d=>d.messages.filter(x=>x.type==='error').map(x=>x.message));
  if(shaderErrors.length)throw new Error(`WGSL compilation: ${shaderErrors.join('; ')}`);
  const targets=[{format:'rgba16float',blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}},
    {format:'rgba16float',blend:{color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'zero',dstFactor:'one',operation:'add'}}}];
  device.pushErrorScope('validation');device.pushErrorScope('internal');device.pushErrorScope('out-of-memory');
  try{
    actorPipeline=device.createRenderPipeline({layout:device.createPipelineLayout({bindGroupLayouts:[worldLayout]}),vertex:{module:amod,entryPoint:'vs'},fragment:{module:amod,entryPoint:'fs',targets},primitive:{topology:'triangle-list'}});
    worldPipeline=device.createRenderPipeline({layout:device.createPipelineLayout({bindGroupLayouts:[worldLayout]}),vertex:{module:wmod,entryPoint:'vs'},fragment:{module:wmod,entryPoint:'fs',targets},primitive:{topology:'triangle-list'}});
    observerPipeline=device.createRenderPipeline({layout:device.createPipelineLayout({bindGroupLayouts:[observerLayout]}),vertex:{module:omod,entryPoint:'vs'},fragment:{module:omod,entryPoint:'fs',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
    compositePipeline=device.createRenderPipeline({layout:device.createPipelineLayout({bindGroupLayouts:[compositeLayout]}),vertex:{module:cmod,entryPoint:'vs'},fragment:{module:cmod,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
  }catch(e){
    const raw3Promises=[device.popErrorScope(),device.popErrorScope(),device.popErrorScope()];
    try{await Promise.all(raw3Promises);}catch{}
    throw e;
  }
  let startupScopesPopped=false;
  let startupScopePromises=[],startupScopeResults=[];
  try{
    await device.queue.onSubmittedWorkDone();
    startupScopePromises=[device.popErrorScope(),device.popErrorScope(),device.popErrorScope()];startupScopesPopped=true;
    if(startupScopePromises.length!==3||startupScopePromises.some(p=>!p||typeof p.then!=='function'))throw new Error('startup scope pop did not return three promises');
    startupScopeResults=await Promise.all(startupScopePromises);
    if(startupScopeResults.length!==3||startupScopeResults.some(result=>result!==null))throw new Error(`pipeline scopes were not literal null: ${startupScopeResults.map(e=>e?.message||String(e)).join('; ')}`);
  }catch(e){
    if(!startupScopesPopped){const raw3Promises=[device.popErrorScope(),device.popErrorScope(),device.popErrorScope()];try{await Promise.all(raw3Promises);}catch{}}
    throw e;
  }
  window.__r5StartupProof=Object.freeze({queueSettled:true,literalNullScopes:Object.freeze([...startupScopeResults]),rawScopePromiseCount:startupScopePromises.length,shaderDiagnostics:diagnostics.length});
  uniformBuffer=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  sampler=device.createSampler({minFilter:'linear',magFilter:'linear'});
  window.__r5Pipelines={actorPipeline,worldPipeline,observerPipeline,compositePipeline};
}
function currentFrame(now,{capturePresentation=true}={}){
  const stageRect=stage.getBoundingClientRect(),dpr=canvas.width/stageRect.width,cssHeight=stageRect.height;
  if(capturePresentation)actorPresentation={ownerId:'private-gallery-actor',roomId:'private-gallery-room',roomGeneration:fixture.roomSessionGeneration,
    targetGeneration,xLogical:stageRect.width/2,yLogical:cssHeight*.55,heightLogical:cssHeight*.1125,facing:1,
    matrix:[dpr,0,0,dpr,0,0],camera:{kind:'gallery-logical-to-backing',scale:dpr},frameSerial:++frameSerial};
  return {ownerId:'private-gallery-actor',roomId:'private-gallery-room',roomGeneration:fixture.roomSessionGeneration,
    clockRoomId:'private-gallery-room',clockRoomGeneration:fixture.roomSessionGeneration,
    ownerAlive:true,ownerVisible:stageRect.width>0&&stageRect.height>0,connectedVisible:stage.isConnected,
    viewport:{pixelWidth:canvas.width,pixelHeight:canvas.height,dpr,logicalToPixel:[dpr,0,0,dpr,0,0],generation:targetGeneration},
    expectedGeneration:targetGeneration,targetGeneration,deviceGeneration,expectedDeviceGeneration:deviceGeneration,
    actorEVisualTime,
    currentTrustedOwnership:r=>r===currentReceipt&&fixture.localNonFirearmSelectedWeaponId===r.selected.id,
    currentReceipt:r=>r===currentReceipt&&fixture.localNonFirearmCurrentReceiptId===r.id&&fixture.localNonFirearmSelectionOwner?.receiptId===r.id&&fixture.localWeaponSelectionReceipts.includes(r),
    presentationForReceipt:r=>r===currentReceipt&&actorPresentation?actorPresentation:null,
    held:false,verify:verificationMode,muted:verificationMode,audioRunning:audioContext?.state==='running',
    frameNow:now};
}
async function render(now){
  if(disposed||!resourcesReady||frameBusy||!device)return;frameBusy=true;
  let scopesOpen=false;
  try{
    advanceActorClock(now);advanceGalleryAutoLoop();window.__r5LastFrameProof=null;
    if(!resize())return;
    const f=currentFrame(now),receiptAtSubmit=currentReceipt,admission=receiptAtSubmit?admitLocalSelectionR5({state:fixture,receipt:receiptAtSubmit,frame:f,settings:settings()}):null;
    const stageRect=stage.getBoundingClientRect(),dpr=canvas.width/stageRect.width,h=stageRect.height*.1125*dpr;
    const blank=new Float32Array([canvas.width,canvas.height,canvas.width*.5+.60*h,canvas.height*.55-.55*h,.78,h,0,0,0,0,0,0,0,0,0,0]);
    const uniforms=admission?.active?admission.plan.uniforms:blank;
    device.queue.writeBuffer(uniformBuffer,0,uniforms);
    const enc=device.createCommandEncoder({label:'R5 three-pass technical frame'});
    device.pushErrorScope('validation');device.pushErrorScope('internal');device.pushErrorScope('out-of-memory');scopesOpen=true;
    const clear={loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}};
    const world=enc.beginRenderPass({colorAttachments:[{...clear,view:worldTexture.createView()},{...clear,view:sourceTexture.createView()}]});
    const worldGroup=device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniformBuffer}}]});
    world.setPipeline(actorPipeline);world.setBindGroup(0,worldGroup);world.draw(12);
    world.setPipeline(worldPipeline);world.setBindGroup(0,worldGroup);world.draw(3);world.end();
    const observer=enc.beginRenderPass({colorAttachments:[{...clear,view:observerTexture.createView()}]});observer.setPipeline(observerPipeline);
    observer.setBindGroup(0,device.createBindGroup({layout:observerPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniformBuffer}},{binding:1,resource:worldTexture.createView()},{binding:2,resource:sourceTexture.createView()},{binding:3,resource:sampler}]}));observer.draw(3);observer.end();
    const composite=enc.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});composite.setPipeline(compositePipeline);
    composite.setBindGroup(0,device.createBindGroup({layout:compositePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:observerTexture.createView()}]}));composite.draw(3);composite.end();
    device.queue.submit([enc.finish()]);
    scheduleRender();
    await device.queue.onSubmittedWorkDone();advanceActorClock(performance.now());
    const frameScopePromises=[device.popErrorScope(),device.popErrorScope(),device.popErrorScope()];
    if(frameScopePromises.length!==3||frameScopePromises.some(p=>!p||typeof p.then!=='function'))throw new Error('frame scope pop did not return three promises');
    const frameScopeResults=await Promise.all(frameScopePromises);scopesOpen=false;
    if(frameScopeResults.length!==3||frameScopeResults.some(result=>result!==null))throw new Error(`frame scopes were not literal null: ${frameScopeResults.map(e=>e?.message||String(e)).join('; ')}`);
    if(admission?.active){
      const p=admission.plan,submittedReceipt=receiptAtSubmit,submittedPresentation=actorPresentation,completionNow=performance.now();
      advanceActorClock(completionNow);
      const completedFrame=currentFrame(completionNow,{capturePresentation:false});
      const latestReceipt=currentReceipt;
      const completionAdmission=latestReceipt===submittedReceipt?admitLocalSelectionR5({state:fixture,receipt:latestReceipt,frame:completedFrame,settings:settings()}):null;
      if(!completionAdmission?.active||completionAdmission.causeId!==p.causeId||completedFrame.targetGeneration!==f.targetGeneration||completedFrame.deviceGeneration!==f.deviceGeneration||actorPresentation!==submittedPresentation)return;
      const proof=Object.freeze({queueSubmitted:true,scopePromiseCount:frameScopePromises.length,literalNullScopes:Object.freeze([...frameScopeResults]),causeId:p.causeId,
        targetGeneration:completedFrame.targetGeneration,deviceGeneration:completedFrame.deviceGeneration,encodedPlan:p,completionAgeSeconds:completionAdmission.plan.ageSeconds,
        ownerCommand:Object.freeze({...submittedPresentation,submittedInSameCommandBuffer:true,submissionFrameSerial:frameSerial})});
      window.__r5LastFrameProof=proof;
      if(galleryHandshake&&!galleryStartup.ready&&canvas.isConnected===true&&proof.encodedPlan.uniforms[0]>0&&proof.encodedPlan.uniforms[1]>0){
        galleryStartup.ready=true;
        gallerySend('playing','ready',{firstFrame:{recorded:true,submitted:true,completed:true,fixtureOnly:true,
          canvasConnected:true,passes:proof.encodedPlan.passes,abiBytes:proof.encodedPlan.uniforms.byteLength,
          viewportWidth:proof.encodedPlan.uniforms[0],viewportHeight:proof.encodedPlan.uniforms[1],causeId:proof.causeId,
          ageSeconds:proof.completionAgeSeconds,targetGeneration:proof.targetGeneration,deviceGeneration:proof.deviceGeneration,
          frameSerial:proof.ownerCommand.submissionFrameSerial}});
      }
      const sfxFrame={...completedFrame,held:false,verify:verificationMode,muted:verificationMode,audioRunning:audioContext?.state==='running',acceptedCueFrame:encoded=>
        window.__r5LastFrameProof===proof&&proof.encodedPlan===encoded&&proof.causeId===submittedReceipt.id&&proof.scopePromiseCount===3&&proof.literalNullScopes.every(x=>x===null)&&
        currentReceipt===submittedReceipt&&fixture.localNonFirearmCurrentReceiptId===submittedReceipt.id&&completedFrame.currentReceipt(submittedReceipt)&&
        completedFrame.targetGeneration===targetGeneration&&completedFrame.deviceGeneration===deviceGeneration};
      const cue=claimSelectionConfirmation({receipt:submittedReceipt,encodedPlan:p,frame:sfxFrame,playedIds:playedReceiptIds,settings:settings()});
      if(cue)playSelectionCue(cue);
      status.textContent=`Private R5 technical frame · ${p.selectedId} · E age ${completionAdmission.plan.ageSeconds.toFixed(3)}s · 3 passes · 64-byte ABI`;
    }
  }catch(e){
    if(scopesOpen){try{const raw3Promises=[device.popErrorScope(),device.popErrorScope(),device.popErrorScope()];await Promise.all(raw3Promises);}catch{}}
    status.textContent=`R5 fixture error: ${e.message}`;status.className='error';
  }
  finally{frameBusy=false;scheduleRender();}
}
async function start(){
  if(galleryHandshake)gallerySend('adapter','pending');
  if(!navigator.gpu){status.textContent='WebGPU unavailable';gallerySend('adapter','unsupported',{error:{code:'WEBGPU_UNSUPPORTED',message:'navigator.gpu is unavailable'}});return;}
  const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Object.assign(new Error('requestAdapter returned null'),{code:'WEBGPU_UNSUPPORTED',unsupported:true});
  if(galleryHandshake)gallerySend('device','pending');
  device=await adapter.requestDevice();deviceGeneration++;context=canvas.getContext('webgpu');if(!context)throw new Error('canvas.getContext(webgpu) returned null');
  format=navigator.gpu.getPreferredCanvasFormat();await setup();resize();resourcesReady=true;
  if(galleryDemoMode){const selected=PROFILES.find(p=>p.id===selection.value)||PROFILES[0];installFixtureReceipt(selected,{origin:galleryAutoLoop?'explicit-gallery-auto-loop':'explicit-embed-demo'});}
  if(galleryHandshake)gallerySend('first-frame','pending');
  scheduleRender();
}
document.querySelector('#select').addEventListener('click',event=>{
  if(!event.isTrusted)return;
  const selected=PROFILES.find(p=>p.id===selection.value);if(!selected||selected.id===currentReceipt?.selected.id)return;
  void unlockAudioFromGesture();installFixtureReceipt(selected,{origin:'trusted-private-fixture-selection'});
});
for(const e of document.querySelectorAll('input'))e.addEventListener('change',()=>scheduleRender());
const onResize=()=>{targetGeneration++;scheduleRender();};
if(typeof ResizeObserver==='function'){
  try{new ResizeObserver(onResize).observe(stage);window.__r5ResizeObserverStatus=Object.freeze({mode:'observer'});}
  catch(error){window.addEventListener('resize',onResize);window.__r5ResizeObserverStatus=Object.freeze({mode:'window-resize-fallback',errorName:String(error?.name||'Error')});}
}else{window.addEventListener('resize',onResize);window.__r5ResizeObserverStatus=Object.freeze({mode:'window-resize-fallback',reason:'ResizeObserver unavailable'});}
function disposeGallery(){if(disposed)return;galleryAutoLoopDueAtMs=null;disposed=true;resourcesReady=false;retireActiveCueAudio();releaseTextures();uniformBuffer?.destroy();device?.destroy();}
window.addEventListener('message',event=>{
  const data=event?.data;if(event.source!==parent||event.origin!==window.location.origin||!galleryHandshake||data?.schema!=='dva-gallery-startup/v1'||data.action!=='retire'||data.token!==galleryStartup.token||data.versionId!==galleryStartup.versionId||data.attemptEpoch!==galleryStartup.attemptEpoch)return;
  gallerySend(galleryStartup.ready?'playing':galleryStartup.stage,'cancelled');
  disposeGallery();
});
window.addEventListener('pagehide',disposeGallery,{once:true});
Object.defineProperty(window,'__r5GalleryAdapter',{value:Object.freeze({snapshot:gallerySnapshot}),writable:false,configurable:false});
Object.defineProperty(window,'__dvaGalleryStartupSnapshot',{value:()=>Object.freeze({...galleryStartup}),writable:false,configurable:false});
Object.defineProperty(window,'__gallerySfx',{value:Object.freeze({activateFromGesture:activateGallerySfxFromGesture,
  snapshot:()=>Object.freeze({verify:verificationMode,enabled:audioContext?.state==='running',source:'weapon-switch-r5-creative-sfx'})}),writable:false,configurable:false});
if(galleryHandshake)gallerySend('child-document','pending');
start().catch(e=>{status.textContent=`R5 fixture startup error: ${e.message}`;status.className='error';gallerySend(galleryStartup.stage,e?.unsupported?'unsupported':'error',{error:{code:String(e?.code||'R5_GALLERY_STARTUP_ERROR'),message:String(e?.message||e).slice(0,500)}});});
