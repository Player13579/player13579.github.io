import {PROFILE} from './creative.mjs';
import {createSmokeReceipt,validateSmokeReceipt,validatePreparedPose,makeFramePlan} from './teleport-smoke-height-zero-adapter.mjs';
import {createFiniteAudioScheduler} from './teleport-smoke-height-zero-audio.mjs';
import {createSmokeHost} from './teleport-smoke-height-zero-host.mjs';
import {recordFailure} from './failure-diagnostics.mjs';

const $=id=>document.getElementById(id),canvas=$('surface'),status=$('status'),gpu=$('gpu'),audioText=$('audio'),errorNode=$('error');
const assetPath='assets/generated/philia-front-nine-v752.png';
const assetSha256='4f1901dfd275bfec01b6f4fd7da66f190e0b2396320de2fb36cc20a5e36490a3';
const assetAuthor='Source manifest does not record a specific image author; preserve this attribution gap.';
const query=new URLSearchParams(location.search),hardZero=query.has('verify'),reviewH=Math.min(112,Math.max(40,Number(query.get('reviewH'))||64));
const heldValue=query.get('age'),heldAge=heldValue===null?null:Math.min(800,Math.max(0,Number(heldValue)||0));
const audio=createFiniteAudioScheduler({hardZero});
let device,context,cache,host,image,imageUrl,raf=0,frameCounter=0,viewportGeneration=1,actorEms=0,lastWall=null,rate=Number(query.get('rate'))||1;
let receipt=null,fixtureSequence=0,activeFixture=null,busy=false,disposed=false;
let errors=[],errorDiagnostics=[],frames=0,submits=0,loops=0,latestPlan='initializing',currentAge=0,latestSubmissionToken=0,latestHostFrame=null;
const root=document.documentElement;
function report(){
  const data={version:'teleport-smoke-gust-r8',status:errors.length?'error':host?'ready':'loading',profile:PROFILE.version,
    qualityAcceptance:'pending-primary-native-and-Sol-review',userAdoption:'unknown_unadopted',gameIntegration:'not-connected',
    verify:hardZero,hardZeroAudio:hardZero,actorEClockRate:rate,ageEms:currentAge,loops,frames,submits,plan:latestPlan,
    sourceVisible:$('endpoint').value!=='arrival',arrivalVisible:$('endpoint').value!=='departure',
    sourceEnabled:$('source').checked,nearbyEnabled:$('nearby').checked,observerEnabled:$('observer').checked,effectEnabled:$('effect').checked,
    sourceRole:latestHostFrame?.sourceRole||null,sourceRoles:latestHostFrame?.sourceRoles||[],bodySourceRole:latestHostFrame?.bodySourceRole||null,
    conversionSources:latestHostFrame?.conversionSources||[],
    receiverFixture:'explicit-bounded-ground-plane-fixture-not-game-environment',wgslMessages:host?.diagnostics||[],errors,errorDiagnostics};
  root.dataset.teleportSmoke=JSON.stringify(data);canvas.dataset.version=data.version;canvas.dataset.ageEms=String(currentAge);canvas.dataset.plan=latestPlan;
  canvas.dataset.frames=String(frames);canvas.dataset.submits=String(submits);canvas.dataset.verify=String(hardZero);canvas.dataset.eClockRate=String(rate);
}
function fail(error){audio.invalidateReceipt(receipt);const detail=recordFailure(error,{errors,errorDiagnostics}),message=detail.message;latestPlan='error';errorNode.hidden=false;errorNode.textContent=message;status.textContent=message;root.dataset.status='error';report();if(raf)cancelAnimationFrame(raf);raf=0;busy=false;}
function currentClock(at=actorEms){return Object.freeze({schema:'teleport-actor-e-clock-r2',actorId:activeFixture.actorId,causalId:activeFixture.causalId,
  roomId:activeFixture.roomId,generation:activeFixture.generation,relocationRevision:activeFixture.revisionAfter,
  sourceIds:Object.freeze([activeFixture.departureId,activeFixture.arrivalId]),atEms:at,current:true});}
async function loadImage(){const url=new URL(`./${assetPath}`,import.meta.url);const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`Authored sprite fetch failed (${response.status})`);
  const bytes=await response.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==assetSha256)throw new Error('Pinned authored sprite hash mismatch');imageUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));const img=new Image();img.src=imageUrl;await img.decode();return img;}
function makeFixture(){
  const suffix=String(++fixtureSequence),roomId='teleport-zero-preview-room',actorId='teleport-zero-preview-actor';
  const startedAtEms=actorEms,wall=Date.now(),from=Object.freeze({x:450,y:500}),to=Object.freeze({x:1020,y:500});
  const departure=Object.freeze({id:`zero-departure-${suffix}`,type:'action-teleport',variant:'',playerId:'zero-preview-caster',targetId:actorId,radius:135,
    x:Math.round(from.x),y:Math.round(from.y),targetX:Math.round(to.x),targetY:Math.round(to.y),at:wall});
  const arrival=Object.freeze({id:`zero-arrival-${suffix}`,type:'action-teleport',variant:'arrival',playerId:actorId,radius:135,x:Math.round(to.x),y:Math.round(to.y),at:wall+1});
  const pair=Object.freeze({family:'gravity-target',castId:`zero-cast-${suffix}`,casterId:'zero-preview-caster',transportedActorId:actorId,revisionAfter:1,
    from,to,departure,arrival});
  const scope=Object.freeze({roomId,roomIncarnationId:'zero-fixture-incarnation',generation:1,clientRoomSessionGeneration:1,eClockRoomId:roomId});
  const identity={causalId:pair.castId,actorId,roomId,roomIncarnationId:scope.roomIncarnationId,generation:1,
    clientRoomSessionGeneration:scope.clientRoomSessionGeneration,scope,revisionAfter:1,departureId:departure.id,arrivalId:arrival.id,startedAtEms};
  activeFixture=identity;receipt=createSmokeReceipt({scope,pair,clock:currentClock(startedAtEms)});loops++;
}
function dimensions(){const rect=canvas.getBoundingClientRect(),dpr=Math.max(1,Math.min(2,devicePixelRatio||1));const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;viewportGeneration++;}return {width:rect.width,height:rect.height,pixelWidth:w,pixelHeight:h,dpr};}
function makeCommand(role,frameId,zoom,camera){
  const anchor=role==='departure'?receipt.from:receipt.to;
  return window.DvaWebGPUPlayerSprite.createCommand({player:{id:activeFixture.actorId,x:anchor.x,y:anchor.y},identity:'white-hood',direction:'front',mode:'walk',
    entry:Object.freeze({assetPath,layout:Object.freeze({sourceOrigin:Object.freeze({x:128,y:240}),ground:Object.freeze({x:0,y:31}),scale:.4375})}),
    image,frame:Object.freeze({x:0,y:0,width:256,height:256}),camera,zoom,alpha:1,order:role==='departure'?100:101});
}
function viewport(d){const zoom=reviewH/(225*.4375),from=receipt.from;
  const camera=Object.freeze({x:from.x-235/zoom,y:from.y-420/zoom});
  return Object.freeze({width:d.width,height:d.height,zoom,camera,generation:viewportGeneration,dpr:d.dpr,deviceIdentity:device,frameId:`smoke-frame-${++frameCounter}`});}
function currentActor(){return Object.freeze({id:activeFixture.actorId,x:receipt.to.x,y:receipt.to.y,relocationRevision:activeFixture.revisionAfter,alive:true,ejected:false,inVent:false});}
async function frame(now){
  raf=0;if(disposed||busy||!host)return;busy=true;
  try{
    if(lastWall!==null&&heldAge===null)actorEms+=Math.max(0,now-lastWall)*rate;lastWall=now;
    if(!receipt||heldAge===null&&actorEms-receipt.startedAtEms>=PROFILE.durationEms)makeFixture();
    const age=heldAge===null?Math.max(0,actorEms-receipt.startedAtEms):heldAge;currentAge=age;
    const frameFixture=activeFixture,frameReceipt=receipt,clock=currentClock(receipt.startedAtEms+age);
    const d=dimensions(),vp=viewport(d),roles=['departure','arrival'],resources={},poseByRole={};
    const lighting=Object.freeze({sourceEnabled:$('source').checked,nearbyEnabled:$('nearby').checked,observerEnabled:$('observer').checked});
    for(const role of roles){const command=makeCommand(role,vp.frameId,vp.zoom,vp.camera);if(!command)throw new Error(`Authored ${role} pose command refused`);
      const resource=cache.prepareSampledResource(command,{frameId:vp.frameId,viewportGeneration});
      const pose=validatePreparedPose({resource,receipt,deviceIdentity:device,frameId:vp.frameId,viewportGeneration,assetSha256});
      resources[role]={resource,pose,actor:role==='departure'?{x:receipt.from.x,y:receipt.from.y}:{x:receipt.to.x,y:receipt.to.y}};poseByRole[role]=pose;
    }
    const endpoint=$('endpoint').value,privacy=Object.freeze({departureVisible:endpoint!=='arrival',arrivalVisible:endpoint!=='departure'});
    const plan=makeFramePlan({receipt,scope:frameFixture.scope,clock,actor:currentActor(),privacy,viewport:vp,poseByRole,effectEnabled:$('effect').checked,
      diagnostics:lighting});
    latestPlan=plan.status;
    const token=++latestSubmissionToken,result=await host.render({plan,poseResources:resources,canvasCss:{...d,zoom:vp.zoom,camera:vp.camera,actorHWorld:225*.4375},settings:{lighting}});
    latestHostFrame=result.descriptors||null;
    frames++;if(result.submitted)submits++;
    const cues=[];if(plan.status==='ready'&&plan.pairedAuthority.drawDeparture&&privacy.departureVisible)cues.push('departure');if(plan.status==='ready'&&plan.pairedAuthority.drawArrival&&privacy.arrivalVisible)cues.push('arrival');
    void result.validation.then(gpuError=>{
        if(gpuError)throw new Error(`WebGPU validation failed: ${gpuError.message||gpuError}`);
        if(token!==latestSubmissionToken||disposed||errors.length||plan.status!=='ready')return;
        const nowAge=heldAge===null?Math.max(0,actorEms-frameReceipt.startedAtEms):heldAge,nowClock=currentClock(frameReceipt.startedAtEms+nowAge);
        const freshAdmission=validateSmokeReceipt({receipt:frameReceipt,scope:frameFixture.scope,clock:nowClock,actor:currentActor(),privacy});
        const current=activeFixture===frameFixture&&receipt===frameReceipt&&
          activeFixture.scope===frameFixture.scope&&$('endpoint').value===endpoint&&$('effect').checked&&freshAdmission.status==='ready'&&
          $('source').checked===lighting.sourceEnabled&&$('nearby').checked===lighting.nearbyEnabled&&$('observer').checked===lighting.observerEnabled&&
          Object.values(resources).every(x=>x.resource.ownerLease.current&&x.resource.ownerLease.uploadVersion===x.resource.uploadVersion);
        if(!current){audio.invalidateReceipt(frameReceipt);return;}
        audio.record({receipt:frameReceipt,clock:nowClock,submitted:result.submitted,authoredVisible:result.authoredVisible,roles:cues,rate,
          sourceCurrent:true,privateAllowed:true});
      }).catch(fail);
    if(plan.status==='ready'){
      status.textContent=`${PROFILE.version} · ${Math.round(age)} / 800 E-ms · 1× ${Math.round(PROFILE.strokeEms)}ms rise/descend · pair ${plan.pairedAuthority.phase} · quality pending`;
    }else status.textContent=`${PROFILE.version} · ${plan.status}${plan.reason?` · ${plan.reason}`:''} · quality pending`;
    audioText.textContent=hardZero?'VERIFY HARD ZERO · no AudioContext, buffer, or audio node.':`SFX ${JSON.stringify(audio.snapshot())} · unlock requires this page gesture.`;
    report();
  }catch(error){fail(error);return;}finally{busy=false;}
  raf=requestAnimationFrame(frame);
}
async function initialize(){
  if(!navigator.gpu)throw new Error('WebGPU is unavailable; this is a WebGPU-only preview.');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw new Error('No WebGPU adapter');
  device=await adapter.requestDevice();context=canvas.getContext('webgpu');if(!context)throw new Error('WebGPU canvas context refused');
  const presentationFormat=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format:presentationFormat,alphaMode:'premultiplied'});
  device.addEventListener('uncapturederror',event=>fail(event.error||new Error('Uncaptured WebGPU validation error')));
  void device.lost.then(info=>{if(info.reason!=='destroyed')fail(new Error(`WebGPU device lost: ${info.message||info.reason}`));});
  cache=window.DvaWebGPUPlayerSprite.createTextureCache(device);image=await loadImage();
  host=await createSmokeHost({device,context,canvas,cache,format:'rgba16float',presentationFormat});
  $('gpu').textContent=`${adapter.info?.description||'WebGPU'} · rgba16float scene/source · canvas ${presentationFormat} · actual same-device owner lease`;
  const rateSelect=$('rate');rateSelect.value=String(rate);rateSelect.addEventListener('change',()=>{rate=Number(rateSelect.value);audio.setRate(rate);lastWall=performance.now();report();});
  $('endpoint').addEventListener('change',()=>{audio.invalidateReceipt(receipt);lastWall=performance.now();});$('restart').addEventListener('click',()=>{audio.invalidateReceipt(receipt);makeFixture();lastWall=performance.now();});
  for(const id of ['source','nearby','observer'])$(id).addEventListener('change',()=>report());
  $('effect').addEventListener('change',()=>{if(!$('effect').checked)audio.invalidateReceipt(receipt);report();});
  $('sound').disabled=hardZero;$('sound').textContent=hardZero?'VERIFY hard mute is locked':'通常SFXをこのgestureで有効化';
  $('sound').addEventListener('click',async()=>{if(hardZero)return;await audio.unlockFromGesture();audioText.textContent=`SFX ${JSON.stringify(audio.snapshot())}`;});
  window.__gallerySfx=Object.freeze({activateFromGesture:async()=>hardZero?audio.snapshot():audio.unlockFromGesture(),snapshot:()=>audio.snapshot()});
  makeFixture();lastWall=performance.now();report();raf=requestAnimationFrame(frame);
}
window.__teleportSmokeZeroReview=()=>Object.freeze({version:'teleport-smoke-gust-r8',qualityAcceptance:'pending',userAdoption:'unknown_unadopted',gameIntegration:'not-connected',
  hardZero,ageEms:currentAge,frames,submits,loops,sourceRole:latestHostFrame?.sourceRole||null,sourceRoles:latestHostFrame?.sourceRoles||[],
  bodySourceRole:latestHostFrame?.bodySourceRole||null,conversionSources:latestHostFrame?.conversionSources||[],
  errors:Object.freeze([...errors]),errorDiagnostics:Object.freeze([...errorDiagnostics]),receiver:host?.fixtureReceiver||null,diagnostics:host?.diagnostics||[]});
window.addEventListener('pagehide',()=>{disposed=true;if(raf)cancelAnimationFrame(raf);audio.dispose().catch(()=>{});const done=device?.queue?.onSubmittedWorkDone?.()||Promise.resolve();
  void done.catch(()=>{}).then(()=>host?.destroy()).catch(()=>{}).finally(async()=>{try{await cache?.destroy();device?.destroy();}catch{}if(imageUrl)URL.revokeObjectURL(imageUrl);});});
initialize().catch(fail);
