import { VERSION, createPass, bindAuthoredPose, admit, synthesizePCM } from './teleport-pixel.mjs';
import { createCausalPairReceipt, createEndpointOnlyLease, endpointOnlyPlan } from './teleport-preview-adapter.mjs';
import { AUDIO_PHASE_DURATION_MS, LOOP_PAUSE_MS, audioIntentMatches, audioOffsetSeconds,
  canUnlockAudio, fixtureIdentity, hardZeroAudio, parseReviewAge } from './preview-playback.mjs';

const canvas=document.querySelector('#surface'), status=document.querySelector('#status');
const mode=document.querySelector('#mode'), restart=document.querySelector('#restart'), gpuLabel=document.querySelector('#gpu'), audioLabel=document.querySelector('#audio');
const errorNode=document.querySelector('#error');
const imageUrl=new URL('./assets/generated/philia-front-nine-v752.png',import.meta.url);
const assetPath='assets/generated/philia-front-nine-v752.png';
const assetSha256='4F1901DFD275BFEC01B6F4FD7DA66F190E0B2396320DE2FB36CC20A5E36490A3';
const sourceAuthor='existing authored asset; specific image author is not recorded in the current manifest';
const roomId='teleport-preview-room',roomIncarnationId='local-fixture-incarnation',generation=1,clientRoomSessionGeneration=1;
const casterId='fixture-caster',actorId='fixture-transported-actor';
let device,context,format,cache,poseSource,pass,frameHandle=0,loopTimer=0,lease=null,receipt=null,pose=null;
let authoredObjectUrl=null;
let reviewAgeMs=null,hardZero=false,fixtureSequence=0,activeFixture=null;
let audioContext=null,audioUnlocked=false,audioResume=null,pendingAudio=new Map(),queuedAudio=new Set(),playedAudio=new Set(),activeAudioSources=new Set();
const safeText=message=>{status.textContent=message;};
const observation={version:VERSION,ready:false,verify:false,loops:0,submits:0,frames:0,causalId:'',ageMs:0,plan:'initializing',errors:[],qualityAcceptance:'pending',gameIntegration:'not-connected'};
function publishObservation(planResult=null){
  const age=activeFixture?(reviewAgeMs===null?Math.max(0,Date.now()-activeFixture.startedAtMs):reviewAgeMs):0;
  observation.ageMs=age;observation.causalId=activeFixture?.causalId||'';
  observation.plan=planResult?.status||observation.plan;
  const root=document.documentElement,vars={status:observation.errors.length?'error':observation.ready?'ready':'loading',
    version:VERSION,verify:String(hardZero),quality:'pending',gameIntegration:'not-connected',
    loops:String(observation.loops),submits:String(observation.submits),frames:String(observation.frames),
    causalId:observation.causalId,ageMs:String(age),plan:observation.plan,
    sfxContexts:String(audioContext?1:0),sfxUnlocked:String(audioUnlocked)};
  for(const [key,value] of Object.entries(vars))root.dataset[`teleportPixel${key[0].toUpperCase()}${key.slice(1)}`]=value;
  canvas.dataset.version=VERSION;canvas.dataset.loops=vars.loops;canvas.dataset.submits=vars.submits;
  canvas.dataset.frames=vars.frames;canvas.dataset.causalId=vars.causalId;canvas.dataset.ageMs=vars.ageMs;
  canvas.dataset.plan=vars.plan;canvas.dataset.verify=vars.verify;
}
function failPreview(error){
  const message=String(error?.message||error);observation.ready=false;observation.errors.push(message);
  document.documentElement.dataset.status='error';errorNode.textContent=message;errorNode.hidden=false;safeText(message);publishObservation();
}
function audioSnapshot(){return Object.freeze({version:VERSION,verify:hardZero,unlocked:audioUnlocked,
  contextCount:audioContext?1:0,pending:pendingAudio.size,queued:queuedAudio.size,played:playedAudio.size,
  activeSources:activeAudioSources.size});}
async function activateFromGesture(){
  unlockAudioFromGesture();if(audioResume)await audioResume;publishObservation();return audioSnapshot();
}
window.__gallerySfx=Object.freeze({activateFromGesture,snapshot:audioSnapshot});
window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.data?.type!=='gallery-sfx-activate')return;
  void activateFromGesture();
});
function frozenPoint(x,y){return Object.freeze({x,y});}
function createPreviewFixture(which){
  const now=Date.now(),identity=fixtureIdentity(++fixtureSequence),revisionAfter=identity.revisionAfter;
  if(which==='pair'){
    const departure=Object.freeze({id:identity.departureId,type:'action-teleport',variant:'',playerId:casterId,
      targetId:actorId,radius:135,x:210,y:260,targetX:690,targetY:330,at:now});
    const arrival=Object.freeze({id:identity.arrivalId,type:'action-teleport',variant:'arrival',playerId:actorId,
      radius:135,x:690,y:330,at:now+1});
    const pair=Object.freeze({family:'gravity-target',castId:identity.causalId,casterId,transportedActorId:actorId,
      revisionAfter,from:frozenPoint(210,260),to:frozenPoint(690,330),departure,arrival});
    const scope=Object.freeze({roomId,roomIncarnationId,generation,clientRoomSessionGeneration,eClockRoomId:roomId});
    const result={scope,receipt:createCausalPairReceipt({scope,pair,nowMs:now})};
    activeFixture={...identity,actorId,revisionAfter,sourceIds:[identity.departureId,identity.arrivalId],startedAtMs:now};
    return result;
  }
  const role=which==='arrival'?'arrival':'departure';
  const sourceId=role==='arrival'?identity.arrivalId:identity.departureId;
  const endpoint=createEndpointOnlyLease(Object.freeze({roomIncarnationId,clientRoomSessionGeneration,roomId,
    eClockRoomId:roomId,castId:identity.causalId,family:'gravity-target',transportedActorId:actorId,
    endpointRole:role,sourceId,sourceType:'action-teleport',
    sourceVariant:role==='arrival'?'arrival':'',sourceRadius:135,
    sourcePlayerId:role==='arrival'?actorId:casterId,
    ...(role==='departure'?{sourceTargetId:actorId}:{}),sourceX:role==='arrival'?690:210,
    sourceY:role==='arrival'?330:260,sourceAtServerMs:now,relocationRevision:revisionAfter,
    poseIdentity:'white-hood',localFirstReceiptAtMs:now}));
  const scope=Object.freeze({roomId,generation:clientRoomSessionGeneration});
  const poseContext=Object.freeze({transportedActorId:actorId,causalId:endpoint.castId,roomId,
    generation:clientRoomSessionGeneration});
  activeFixture={...identity,actorId,revisionAfter,sourceIds:role==='arrival'?[identity.arrivalId]:[identity.departureId],startedAtMs:now};
  return {scope,endpoint,poseContext};
}
async function loadAuthoredImage(){
  const response=await fetch(imageUrl,{cache:'no-store'});
  if(!response.ok)throw new Error(`Authored sprite fetch failed (${response.status})`);
  const bytes=await response.arrayBuffer();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  if(digest!==assetSha256)throw new Error('Authored sprite hash mismatch; refusing to bind a different pose');
  const image=new Image();authoredObjectUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));image.src=authoredObjectUrl;
  await image.decode();
  return {image};
}
function createSpritePose(image,bindContext){
  const entry=Object.freeze({assetPath,layout:Object.freeze({sourceOrigin:Object.freeze({x:128,y:240}),
    ground:Object.freeze({x:0,y:31}),scale:0.4375})});
  const command=window.DvaWebGPUPlayerSprite.createCommand({player:{id:actorId,x:0,y:0},identity:'white-hood',
    direction:'front',mode:'walk',entry,image,frame:Object.freeze({x:0,y:0,width:256,height:256}),
    camera:{x:0,y:0},zoom:1});
  if(!command)throw new Error('Authored character command could not be created');
  const resource=cache.prepareSampledResource(command,{frameId:'teleport-preview-authored-frame',viewportGeneration:1});
  if(resource.texture!==cache.textureFor(command))throw new Error('Preview did not bind the exact sprite-cache texture lease');
  return bindAuthoredPose({sampledResource:resource,receipt:bindContext,
    authoredAsset:{assetPath,sha256:assetSha256,author:sourceAuthor}});
}
function resize(){
  const rect=canvas.getBoundingClientRect(),dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  return {width:rect.width,height:rect.height,pixelWidth:w,pixelHeight:h,dpr};
}
function framePlan(now){
  const dimensions=resize();
  const viewport=Object.freeze({width:dimensions.width,height:dimensions.height,zoom:1,generation:1,
    camera:Object.freeze({x:0,y:0}),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  const actor=Object.freeze({id:actorId,x:690,y:330,relocationRevision:activeFixture.revisionAfter,alive:true,ejected:false,inVent:false});
  if(receipt){
    if(actor.relocationRevision!==receipt.revisionAfter)
      return Object.freeze({status:'cancelled',reason:'actor-revision-mismatch'});
    return admit({receipt,scope:{roomId,generation},pose,nowMs:now,viewport,
      privacy:{departureVisible:true,arrivalVisible:true},actor});
  }
  return endpointOnlyPlan({lease,pose,scope:{roomId,generation:clientRoomSessionGeneration},
    nowMs:now,viewport,actor});
}
function currentPlanNow(){return reviewAgeMs===null?Date.now():activeFixture.startedAtMs+reviewAgeMs;}
function liveAudioPlan(intent){
  const expected={causalId:activeFixture?.causalId,actorId:activeFixture?.actorId,
    revisionAfter:activeFixture?.revisionAfter,sourceId:activeFixture?.sourceIds?.[intent.phase],phase:intent.phase};
  if(!audioIntentMatches(intent,expected)||hardZero||reviewAgeMs!==null||document.hidden)return null;
  const plan=framePlan(Date.now());
  return plan.status==='ready'&&plan.causalId===intent.causalId&&plan.actorId===intent.actorId&&
    plan.endpoints.some(endpoint=>endpoint.phase===intent.phase)&&
    audioOffsetSeconds(plan.ageMs,intent.phase,intent.durationMs)!==null?plan:null;
}
function queueAudioIntent(intent){
  const key=`${intent.causalId}:${intent.phase}`;
  if(hardZero||reviewAgeMs!==null||playedAudio.has(key)||queuedAudio.has(key))return;
  const plan=liveAudioPlan(intent);if(!plan)return;
  queuedAudio.add(key);
  if(!audioUnlocked||!audioContext||audioContext.state!=='running'){
    pendingAudio.set(key,intent);return;
  }
  window.setTimeout(()=>playAudioIntent(key,intent),0);
}
function playAudioIntent(key,intent){
  if(hardZero||reviewAgeMs!==null||!audioUnlocked||audioContext?.state!=='running')return;
  const plan=liveAudioPlan(intent);if(!plan)return;
  try{
    const pcm=synthesizePCM(intent.phase),offset=audioOffsetSeconds(plan.ageMs,intent.phase,pcm.durationSeconds*1000);
    if(offset===null)return;
    const buffer=audioContext.createBuffer(1,pcm.samples.length,pcm.sampleRate);
    buffer.copyToChannel(pcm.samples,0);
    const source=audioContext.createBufferSource();source.buffer=buffer;source.connect(audioContext.destination);
    source.onended=()=>activeAudioSources.delete(source);
    source.start(audioContext.currentTime,offset);
    activeAudioSources.add(source);playedAudio.add(key);pendingAudio.delete(key);
    audioLabel.textContent=`finite PCM phase ${intent.phase} · cast ${intent.causalId} · source ${intent.sourceId} · offset ${Math.round(offset*1000)} ms`;
  }catch(error){pendingAudio.delete(key);audioLabel.textContent=`Audio skipped: ${error.message}`;}
}
function flushPendingAudio(){
  for(const [key,intent] of pendingAudio){
    if(!liveAudioPlan(intent)){pendingAudio.delete(key);queuedAudio.delete(key);continue;}
    if(audioContext?.state==='running')playAudioIntent(key,intent);
  }
}
function unlockAudioFromGesture(){
  if(!canUnlockAudio(location.search))return;
  try{
    if(!audioContext){const AudioCtor=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtor){audioLabel.textContent='Web Audio unavailable; visuals continue silently.';return;}
      audioContext=new AudioCtor();}
    audioResume=Promise.resolve(audioContext.resume()).then(()=>{
      audioUnlocked=audioContext?.state==='running';
      audioLabel.textContent=audioUnlocked?'Audio unlocked by this gesture.':'Audio remains locked; visuals continue.';
      flushPendingAudio();
    }).catch(error=>{audioUnlocked=false;audioLabel.textContent=`Audio unlock failed; visuals continue: ${error.message}`;});
  }catch(error){audioLabel.textContent=`Audio unavailable; visuals continue: ${error.message}`;}
}
function scheduleAudioForRecord(record){
  if(hardZero||reviewAgeMs!==null||!activeFixture)return;
  for(const phase of record.phases){
    const sourceId=activeFixture.sourceIds[phase];if(!sourceId)continue;
    queueAudioIntent(Object.freeze({causalId:activeFixture.causalId,actorId:activeFixture.actorId,
      revisionAfter:activeFixture.revisionAfter,sourceId,phase,durationMs:AUDIO_PHASE_DURATION_MS[phase]}));
  }
}
function render(){
  frameHandle=0;
  if(!device||!pass||!pose)return;
  const plan=framePlan(currentPlanNow());
  const encoder=device.createCommandEncoder({label:'teleport pixel isolated preview'});
  const view=context.getCurrentTexture().createView();
  const renderPass=encoder.beginRenderPass({colorAttachments:[{view,clearValue:{r:.035,g:.05,b:.065,a:1},loadOp:'clear',storeOp:'store'}]});
  if(plan.status==='ready'){
    let prepared;
    try{
      prepared=pass.prepare(plan);
      const record=prepared.record(renderPass);
      renderPass.end();device.queue.submit([encoder.finish()]);observation.submits++;observation.frames++;
      const completion=device.queue.onSubmittedWorkDone();
      void prepared.release({submitted:true,completion});
      if(reviewAgeMs===null)scheduleAudioForRecord(record);
      safeText(`${reviewAgeMs===null?'':'HELD REVIEW FIXTURE · '}${VERSION} · ${plan.leaseKind||'causal-pair'} · age ${Math.round(plan.ageMs)} ms · ${plan.columns}×${plan.rows} cells · ${record.phases.join('+')||'no-phase'}${reviewAgeMs===null?'':' · no quality proof'}`);
      observation.plan=plan.status;publishObservation(plan);
      if(reviewAgeMs===null)frameHandle=requestAnimationFrame(render);
      return;
    }catch(error){try{prepared?.release();}catch{} renderPass.end();failPreview(error);return;}
  }
  renderPass.end();device.queue.submit([encoder.finish()]);observation.submits++;observation.frames++;
  observation.plan=plan.status;publishObservation(plan);
  safeText(`${reviewAgeMs===null?'':`HELD REVIEW FIXTURE · age ${reviewAgeMs} ms · no quality proof · `}${VERSION} · ${plan.status}${plan.reason?` (${plan.reason})`:''} · press 再生`);
  if(reviewAgeMs!==null)return;
  if(plan.status==='cancelled'||plan.status==='blocked')return;
  if(plan.reason==='expired')loopTimer=window.setTimeout(()=>begin(mode.value),LOOP_PAUSE_MS);
  else frameHandle=requestAnimationFrame(render);
}
function begin(which){
  if(frameHandle)cancelAnimationFrame(frameHandle);
  if(loopTimer)clearTimeout(loopTimer);loopTimer=0;
  pendingAudio.clear();queuedAudio.clear();playedAudio.clear();
  observation.loops++;observation.ready=true;observation.errors=[];errorNode.textContent='';errorNode.hidden=true;
  const fixture=createPreviewFixture(which);receipt=fixture.receipt||null;lease=fixture.endpoint||null;
  const bindContext=receipt||fixture.poseContext;
  pose=createSpritePose(poseSource.image,bindContext);
  publishObservation();
  audioLabel.textContent=hardZero?'AUDIO HARD ZERO · no audio context or nodes created':
    reviewAgeMs===null?'Muted until a user gesture; press Replay · enable sound.':'Held review fixture · sound disabled.';
  if(reviewAgeMs===null)frameHandle=requestAnimationFrame(render);else render();
}
async function initialize(){
  hardZero=hardZeroAudio(location.search);
  reviewAgeMs=parseReviewAge(location.search);
  if(!navigator.gpu)throw new Error('WebGPU is unavailable');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if(!adapter)throw new Error('No WebGPU adapter');
  device=await adapter.requestDevice();context=canvas.getContext('webgpu');
  device.addEventListener('uncapturederror',event=>failPreview(event.error||new Error('Uncaptured WebGPU validation error')));
  void device.lost.then(info=>{if(info.reason!=='destroyed')failPreview(new Error(`WebGPU device lost: ${info.message||info.reason}`));});
  format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'premultiplied'});
  pass=createPass({device,format,deviceIdentity:device});cache=window.DvaWebGPUPlayerSprite.createTextureCache(device);
  poseSource=await loadAuthoredImage();
  const sampleEntry={assetPath,layout:{sourceOrigin:{x:128,y:240},ground:{x:0,y:31},scale:.4375}};
  const cmd=window.DvaWebGPUPlayerSprite.createCommand({player:{id:actorId,x:0,y:0},identity:'white-hood',direction:'front',
    mode:'walk',entry:sampleEntry,image:poseSource.image,frame:{x:0,y:0,width:256,height:256},camera:{x:0,y:0},zoom:1});
  const resource=cache.prepareSampledResource(cmd,{frameId:'teleport-preview-authored-frame',viewportGeneration:1});
  if(resource.deviceIdentity!==device||resource.ownerLease?.ready!==true||resource.ownerLease?.current!==true)
    throw new Error('The authored player sprite owner lease is not current/ready on this device');
  observation.verify=hardZero;observation.ready=true;document.documentElement.dataset.status='ready';publishObservation();
  gpuLabel.textContent=`${adapter.info?.description||'WebGPU device'} · ${format}`;
  mode.disabled=false;restart.disabled=false;
  begin(mode.value);
  if(reviewAgeMs===null)safeText('WebGPU shader pipeline and existing authored sprite lease are prepared. Local fixture playback only.');
}
mode.addEventListener('change',()=>{unlockAudioFromGesture();begin(mode.value);});
restart.addEventListener('click',()=>{unlockAudioFromGesture();begin(mode.value);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audioUnlocked=false;pendingAudio.clear();queuedAudio.clear();try{audioContext?.suspend();}catch{}}});
window.addEventListener('pagehide',()=>{if(frameHandle)cancelAnimationFrame(frameHandle);if(loopTimer)clearTimeout(loopTimer);
  for(const source of activeAudioSources){try{source.stop();}catch{}}activeAudioSources.clear();
  const completion=device?.queue?.onSubmittedWorkDone?.()||Promise.resolve();
  void Promise.resolve(completion).catch(()=>{}).then(()=>cache?.destroy()).finally(()=>{try{device?.destroy();}catch{}});
  try{audioContext?.close();}catch{}if(authoredObjectUrl)URL.revokeObjectURL(authoredObjectUrl); });
initialize().catch(failPreview);
