import {createExcaliburPreviewBridge} from '../inputs/bridge/source/excalibur-preview-bridge.mjs';
import {createExcaliburPreviewBridgeShell} from '../inputs/shell/preview-bridge-shell.mjs';
import {loadVerifiedPreviewAtlases,browserPngDecoder} from '../inputs/shell/verified-atlas-loader.mjs';
import {createPreviewCommand,releaseBoundaryFor} from './command-factory.mjs';

const query=new URLSearchParams(location.search),canvas=document.getElementById('view'),status=document.getElementById('status');
const controls=Object.fromEntries(['edition','identity','facing','rate','replay','hold','resume','end','mainOn','sourceOn','observerOn'].map(id=>[id,document.getElementById(id)]));
for(const key of ['edition','identity','facing','rate'])if([...controls[key].options].some(o=>o.value===query.get(key)))controls[key].value=query.get(key);
let renderer=null,cache=null,target=null,shell=null,atlases=null,closed=false,hostEpoch=0,causeSerial=0,openFrame=null,ownedSessionCount=0,frameCompletions=[],lastFrameProof=null,repeatTimer=null,operation=Promise.resolve();
let latestTiming=null,latestPlan=null,latestCompletion=null,latestTerminalCompletion=null;
const events=[],errors=[];
const startupToken=query.get('galleryStartupToken'),startupVersion=query.get('galleryVersionId'),startupEpoch=Number(query.get('galleryAttemptEpoch'));
let startupSequence=0,startupSnapshot=null;
function startup(stage,status='pending',extra={}) {
  if(!startupToken||!startupVersion||!Number.isSafeInteger(startupEpoch))return;
  startupSnapshot=Object.freeze({schema:'dva-gallery-startup/v1',token:startupToken,versionId:startupVersion,attemptEpoch:startupEpoch,
    sequence:++startupSequence,stage,status,scope:'standalone-preview-only',clockMode:'preview-render-backpressure',...extra});
  if(parent!==window)parent.postMessage(startupSnapshot,location.origin);
}
globalThis.__dvaGalleryStartupSnapshot=()=>startupSnapshot;
startup('child-document');
const event=e=>{events.push({...e,wallMs:performance.now()});if(events.length>512)events.splice(0,events.length-512);};
const failure=error=>{if(openFrame){try{openFrame.discard();}catch{}openFrame=null;}const message=String(error?.stack||error);errors.push(message);if(errors.length>32)errors.shift();status.textContent=message;event({kind:'error',message});startup(startupSnapshot?.stage||'child-document','error',{error:{code:'R10_PREVIEW_ERROR',message}});};
const settings=()=>Object.freeze({edition:controls.edition.value,identity:controls.identity.value,facing:Number(controls.facing.value),rate:Number(controls.rate.value)});
function dimensions(){const box=canvas.getBoundingClientRect();const width=Math.round(box.width-2),height=Math.round(box.height-2),dpr=devicePixelRatio||1;
  if(width<=0||height<=0||canvas.clientWidth<=0||canvas.clientHeight<=0)throw new Error('Positive visible canvas required');
  return {width,height,dpr,pixelWidth:Math.round(width*dpr),pixelHeight:Math.round(height*dpr)};}
function viewportFor(){const dims=dimensions(),lease=target.captureLease();
  if(lease.width!==dims.pixelWidth||lease.height!==dims.pixelHeight||lease.logicalWidth!==dims.width||lease.logicalHeight!==dims.height)throw new Error('Physical viewport and registered target dimensions disagree');
  return Object.freeze({...dims,targetLease:lease,device:renderer.device,deviceGeneration:renderer.deviceGeneration,generation:lease.generation,targetGeneration:lease.generation,
    logicalToPixel:Object.freeze([lease.width/dims.width,0,0,lease.height/dims.height,0,0]),worldToLogical:Object.freeze([1,0,0,1,0,0])});}
function backdrop(frame,viewport){frame.clear('main',[.16,.18,.21,1]);
  frame.rect('main',{x:0,y:viewport.height*.60,w:viewport.width,h:viewport.height*.40,color:[.20,.22,.25,1]});
  frame.rect('main',{x:0,y:viewport.height*.60,w:viewport.width,h:1,color:[.34,.37,.40,1]});}
function stamp(){return {edition:controls.edition.value,identity:controls.identity.value,facing:Number(controls.facing.value),cssWidth:dimensions().width,cssHeight:dimensions().height,
  backingWidth:canvas.width,backingHeight:canvas.height,dpr:devicePixelRatio,rendererState:renderer?.state};}
function commit(e){latestCompletion={kind:'completed',edition:e.edition,causeId:e.source.id,frameId:e.completedFrame.frameId,targetGeneration:e.targetGeneration,
  eAgeMs:e.eAgeSeconds*1000,poseIndex:e.poseIndex,releaseAccepted:e.releaseAccepted,releaseAgeMs:e.packet?e.packet.eAgeSeconds*1000:null,
  scope:e.scope,uniformBytes:e.uniformBytes};event(latestCompletion);
  if(startupSnapshot?.status!=='ready'&&e.edition==='r10'&&e.isCurrent()&&canvas.isConnected){startup('playing','ready',{firstFrame:{recorded:true,submitted:true,completed:true,
    canvasConnected:true,passes:3,viewportWidth:dimensions().width,viewportHeight:dimensions().height,frameId:e.completedFrame.frameId,
    causeId:e.source.id,targetGeneration:e.targetGeneration,ageMs:e.eAgeSeconds*1000},acceptanceScope:'preview-only completed drawing; full quality/realtime/performance pending'});}
}
async function createShell(){if(repeatTimer!==null){clearTimeout(repeatTimer);repeatTimer=null;}const selected=settings();
  if(shell){const previousShell=shell;await previousShell.drain();shell=null;await previousShell.dispose();}
  const epoch=++hostEpoch;
  if(closed||epoch!==hostEpoch)return;
  ownedSessionCount=0;
  const nextShell=await createExcaliburPreviewBridgeShell({edition:selected.edition,renderer,textureCache:cache,
    bridgeFactory:async args=>{const bridge=await createExcaliburPreviewBridge({...args,onCommitted:commit});
      const compilation=Object.fromEntries(Object.entries(bridge.compilation).map(([name,info])=>[name,info.messages.map(m=>({type:m.type,message:m.message,lineNum:m.lineNum,linePos:m.linePos}))]));
      event({kind:'pipelines-created',edition:selected.edition,compilation,uniformBytes:224,worldAttachments:2,observerAttachments:2});return bridge;},
    createSession:({generation})=>{
      latestTiming=null;latestPlan=null;latestCompletion=null;latestTerminalCompletion=null;lastFrameProof=null;
      if(ownedSessionCount>=32)throw new Error('Owned preview session cap32; recreate shell before another cause');ownedSessionCount++;
      const viewport=viewportFor(),source=Object.freeze({type:'alchemy-excalibur',previewOnly:true,scope:'standalone-preview-only',
        id:`preview:${selected.edition}:${++causeSerial}`,playerId:'preview-registered-actor',roomId:'preview-physical-room',localGeneration:generation,startedAt:0,duration:1200});
      const session={source,viewport,selected,hostEpoch:epoch,clockGeneration:generation,releaseBoundary:releaseBoundaryFor(selected.edition)};
      session.command=createPreviewCommand({edition:selected.edition,identity:selected.identity,image:atlases.assets[selected.identity].image,source,viewport,progress:0,facing:selected.facing});
      event({kind:'cause-created',causeId:source.id,releaseBoundary:session.releaseBoundary,...selected,...stamp()});return session;},
    resizeSession:({session})=>{
      const dims=dimensions();target.resize(dims.pixelWidth,dims.pixelHeight,{width:dims.width,height:dims.height});
      const viewport=viewportFor();const next={...session,viewport};next.command=createPreviewCommand({edition:selected.edition,identity:selected.identity,image:atlases.assets[selected.identity].image,
        source:session.source,viewport,progress:0,facing:selected.facing});return next;},
    beginFrame:(timing,session)=>{
      if(openFrame)throw new Error('One real shared renderer frame at a time');
      frameCompletions=[];
      const viewport=session.viewport,actualFrame=renderer.beginFrame(`Excalibur ${selected.edition} preview ${session.source.id}`);
      // Observe the real renderer proof without changing its promises/results.
      const frame=Object.freeze({...actualFrame,addEncoder:command=>actualFrame.addEncoder({...command,
        onSubmitted:command.onSubmitted?proof=>{
          event({kind:'gpu-submitted',frameId:proof.frameId,targetId:proof.completedFrame?.targetId,causeId:session.source.id,targetGeneration:viewport.generation});
          void proof.errorScopes.then(scopes=>event({kind:'gpu-raw-error-scopes',frameId:proof.frameId,causeId:session.source.id,scopes:scopes.map(s=>s===null?null:String(s.message||s))}),failure);
          void proof.done.then(()=>event({kind:'gpu-queue-done',frameId:proof.frameId,causeId:session.source.id}),failure);
          const completion=command.onSubmitted(proof);frameCompletions.push(Promise.resolve(completion));return completion;
        }:undefined})});openFrame=frame;
      try{backdrop(frame,viewport);
        const command=createPreviewCommand({edition:selected.edition,identity:selected.identity,image:atlases.assets[selected.identity].image,source:session.source,viewport,
          progress:timing.slashActive?timing.slashProgress:0,facing:selected.facing});
        // The actor remains visible after the 620ms slash. It contributes only
        // backdrop/body, while the accepted emitted E follows its 1200ms clock.
        if(!timing.slashActive||!timing.eActive||timing.phase==='ended')cache.record(frame,'main',command);
        const currentState=Object.freeze({targetLease:viewport.targetLease,ownerAlive:true,ownerVisible:true,connectedVisible:true,
          isCurrent:()=>!closed&&hostEpoch===epoch&&document.visibilityState==='visible'&&canvas.isConnected&&canvas.clientWidth>0&&canvas.clientHeight>0&&
            shell?.getState().generation===session.clockGeneration&&viewport.targetLease.isCurrent()});
        return {frame,target:'main',viewport,source:session.source,command,action:command.exAction,currentState,
          pathEndWorld:Object.freeze({x:viewport.width/2+selected.facing*220,y:viewport.height/2+20}),
          mainOn:controls.mainOn.checked,sourceOn:controls.sourceOn.checked,observerOn:controls.observerOn.checked};
      }catch(error){try{frame.discard();}catch{}openFrame=null;throw error;}},
    submitFrame:(frame,timing,session)=>{
      // A final real encoded command supplies completion for backdrop/expiry
      // frames too. The renderer's strict current-target proof remains unchanged.
      const viewport=viewportFor();
      frame.addEncoder({label:'R10 preview completion boundary',reads:[],writes:['main'],completedFrameTarget:'main',targetGeneration:viewport.generation,
        encode(){},onSubmitted:proof=>{
          const completion=proof.completedFrame.accept(()=>!closed&&hostEpoch===epoch&&viewport.targetLease.isCurrent()&&canvas.isConnected&&document.visibilityState==='visible');
          frameCompletions.push(completion.then(valid=>{lastFrameProof={frameId:proof.frameId,valid,targetGeneration:viewport.generation};
            if(!valid&&!closed&&hostEpoch===epoch)throw new Error('Preview completed-frame target proof rejected');
            // Live-E commits end before 1200ms. Expiry/explicit end is a separate
            // cleared-frame receipt, published only after the same strict proof.
            if(valid&&session.hostEpoch===epoch&&shell?.getState().generation===session.clockGeneration&&
              (timing.phase==='expired'||timing.phase==='ended'||!timing.eActive)){
              latestTerminalCompletion=Object.freeze({kind:'completed-terminal',scope:'standalone-preview-only',edition:selected.edition,
                causeId:session.source.id,sourceGeneration:session.source.localGeneration,phase:timing.phase,eAgeMs:timing.eAgeMs,
                frameId:proof.frameId,targetGeneration:viewport.generation,completedFrameAccepted:true,retired:true});event(latestTerminalCompletion);
            }return lastFrameProof;}));
        }});
      try{const submitted=frame.submit();return {submitted,completion:Promise.all(frameCompletions)};}finally{openFrame=null;}
    },
    onFrame:e=>{latestTiming=Object.freeze({...e.timing,wallElapsedMs:e.timing.wallClockScaledElapsedMs/selected.rate,renderWaitWallMs:e.timing.renderWaitMs/selected.rate});latestPlan=e.planned||null;event({kind:'frame-queued',causeGeneration:e.timing.generation,eAgeMs:e.timing.eAgeMs,slashProgress:e.timing.slashProgress,
      phase:e.timing.phase,retired:e.retired,planned:Boolean(e.planned),bodyLive:e.planned?.bodyLive,releaseCandidate:e.planned?.releaseCandidate,submittedCommands:e.submitted});
      if(e.timing.phase==='expired'&&query.get('galleryAutoLoop')==='1'&&!closed&&repeatTimer===null){
        // The original 3000ms authored repeat interval is 1200ms E plus 1800ms
        // cooldown. Backpressure duration is additional measured fixture time.
        repeatTimer=setTimeout(()=>{repeatTimer=null;if(!closed)void safe(replayHost);},1800/selected.rate);
      }
      status.textContent=JSON.stringify({clockMode:'preview-render-backpressure',realtimeAcceptance:false,state:e.timing.state,phase:e.timing.phase,requestedEAgeMs:e.timing.eAgeMs,slashProgress:e.timing.slashProgress,
        ...stamp(),latestCompletion,errors:errors.length},null,2);},
    clock:{onFailure:failure,now:()=>performance.now()*selected.rate,requestFrame:callback=>requestAnimationFrame(t=>{try{callback(t*selected.rate);}catch(error){failure(error);}}),cancelFrame:handle=>cancelAnimationFrame(handle)},
    disposeSession:()=>{}});
  if(closed||epoch!==hostEpoch){await nextShell.dispose();return;}
  shell=nextShell;
  startup('first-frame');await shell.play();
}
async function dispose(){if(closed)return;closed=true;if(repeatTimer!==null){clearTimeout(repeatTimer);repeatTimer=null;}hostEpoch++;if(shell)await shell.dispose();
  if(openFrame){try{openFrame.discard();}catch{}openFrame=null;}
  try{await renderer?.device.queue.onSubmittedWorkDone();}catch{}
  cache?.destroy();target?.unregister();renderer?.destroy();atlases?.close();event({kind:'host-disposed'});}
const safe=action=>{const next=operation.then(action);operation=next.catch(failure);return next;};
async function replayHost(){if(repeatTimer!==null){clearTimeout(repeatTimer);repeatTimer=null;}if(ownedSessionCount>=32)return createShell();return shell.replay();}
function endHost(){if(repeatTimer!==null){clearTimeout(repeatTimer);repeatTimer=null;}return shell?.end();}
async function resizeHost(width,height){if(closed||!shell)return;await shell.drain();const previous=shell.getState().state;
  shell.end();await shell.drain();if(width!==undefined){canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;}const dims=dimensions();target.resize(dims.pixelWidth,dims.pixelHeight,{width:dims.width,height:dims.height});
  event({kind:'resize-retires-and-replays',previousState:previous,...dims,targetGeneration:target.generation});
  await replayHost();if(previous==='held')shell.hold();}
async function boot(){
  startup('assets');
  const response=await fetch('inputs/assets/ATLAS.json');if(!response.ok)throw new Error('Atlas pin index missing');const assets=await response.json();
  atlases=await loadVerifiedPreviewAtlases({assets,loadBytes:async asset=>{const r=await fetch(asset.path);if(!r.ok)throw new Error(`Atlas HTTP ${r.status}`);return r.arrayBuffer();},decode:browserPngDecoder(),isCurrent:()=>!closed});
  renderer=await globalThis.DvaWebGPURenderer.create({onFailure:failure});cache=globalThis.DvaWebGPUPlayerSprite.createTextureCache(renderer.device);
  const dims=dimensions();target=renderer.registerTarget('main',canvas,{width:dims.pixelWidth,height:dims.pixelHeight,logicalWidth:dims.width,logicalHeight:dims.height,sampleable:true,generation:1,alphaMode:'opaque'});
  startup('pipelines');await createShell();for(const id of ['replay','hold','resume','end'])controls[id].disabled=false;
  controls.replay.onclick=()=>safe(replayHost);controls.hold.onclick=()=>safe(()=>shell.hold());controls.resume.onclick=()=>safe(()=>shell.resume());controls.end.onclick=()=>safe(endHost);
  for(const id of ['edition','identity','facing','rate'])controls[id].onchange=()=>safe(createShell);
  for(const id of ['mainOn','sourceOn','observerOn'])controls[id].onchange=()=>safe(()=>{const state=shell.getState().state;if(state==='held'){shell.resume();shell.hold();}else if(state==='ended')return replayHost();});
  addEventListener('resize',()=>safe(resizeHost));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')safe(endHost);});
  addEventListener('pagehide',()=>{void dispose();},{once:true});
  addEventListener('message',e=>{const d=e.data;if(e.source===parent&&e.origin===location.origin&&d?.schema==='dva-gallery-startup/v1'&&d.action==='retire'&&
    d.token===startupToken&&d.versionId===startupVersion&&d.attemptEpoch===startupEpoch)void dispose();});
  globalThis.excaliburPreview=Object.freeze({scope:'standalone-preview-only',
    replay:()=>safe(replayHost),hold:()=>shell.hold(),resume:()=>shell.resume(),end:endHost,dispose,
    select:options=>safe(async()=>{for(const key of ['edition','identity','facing','rate'])if(options[key]!==undefined)controls[key].value=String(options[key]);await createShell();}),
    resize:(width,height)=>safe(async()=>{if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new Error('Positive integer canvas dimensions');return resizeHost(width,height);}),
    snapshot:()=>({scope:'standalone-preview-only',settings:settings(),state:shell?.getState(),latestTiming,latestPlan,latestCompletion,latestTerminalCompletion,events:[...events],errors:[...errors],ownedSessionCount,lastFrameProof,clockMode:'preview-render-backpressure',realtimeAcceptance:false,...stamp(),silent:true,verify:query.has('verify')})});
  event({kind:'host-ready',...stamp(),scope:'standalone-preview-only',silent:true});
}
if(!query.has('verify')){status.textContent='Private verification requires ?verify=1.';}else boot().catch(async error=>{failure(error);try{await dispose();}catch(cleanup){failure(cleanup);}});
