
import {DischargeRuntime,audioEligible} from './runtime.mjs';
import {DURATION_MS} from './channels.mjs';
import {createSnapAudio} from './audio.mjs';
import {createAudioReceiptCurrentness} from './audio-preview-guard.mjs';
import {createFramePump} from './frame-pump.mjs';
import {createGalleryStartupBridge} from './gallery-startup-bridge.mjs';
const params=new URLSearchParams(location.search),verify=params.has('verify');
if(verify)document.body.classList.add('verify');
const stage=document.querySelector('#stage'),canvas=document.querySelector('#fx'),sourceEl=document.querySelector('#source'),targetEl=document.querySelector('#target'),status=document.querySelector('#status');
const runtime=new DischargeRuntime({canvas});
const startup=createGalleryStartupBridge({expectedVersionId:'quantum-electric-discharge-sol61-r5',expectedRuntimeSha256:'16d7eba68a073cd2ab51d9b57f2c81f94667bfe2f8b6a821b794f3b46483341e',canvas});
window.__dvaGalleryStartupSnapshot=startup.snapshot;
let causeNo=0,currentCauseId=null,currentGeneration=null,playing=false,startedAt=0,pendingFrame=null,latestReceipt=null,replayTimer=null,retired=false,startupReady=false;
const audioReceiptIsCurrent=createAudioReceiptCurrentness({runtime,getPendingFrame:()=>pendingFrame,getCurrentCauseId:()=>currentCauseId,getControls:()=>({sourceEmission:document.querySelector('#emission').checked,observerScatter:document.querySelector('#scatter').checked,reducedMotion:document.querySelector('#reduced').checked,targetVisible:!document.querySelector('#hidden').checked}),getPlaying:()=>playing,isVerify:()=>verify});
const sound=createSnapAudio({verify,isCurrentReceipt:audioReceiptIsCurrent,getCurrentEvent:()=>({causeId:currentCauseId,generation:currentGeneration,startedAt}),now:()=>performance.now()});
const framePump=createFramePump(callback=>requestAnimationFrame(callback),()=>{activeFrame=frame();return activeFrame},error=>{status.textContent='Frame loop error: '+String(error);playing=false;startup.fail('pipelines',error)},handle=>cancelAnimationFrame(handle));
let activeFrame=null,cleanupPromise=null;
startup.bindCleanup(()=>cleanup());
function cleanup(){if(cleanupPromise)return cleanupPromise;retired=true;playing=false;resizeObserver.disconnect();if(replayTimer!==null)clearTimeout(replayTimer);replayTimer=null;framePump.dispose();runtime.stop();
  cleanupPromise=(async()=>{const results=await Promise.allSettled([bootPromise,activeFrame,runtime.dispose(),sound.dispose()]);
    // The real pump callback's finally runs after the step settles; wait for that callback too.
    await framePump.drain();
    const r=runtime.lifecycle,a=sound.snapshot(),pump=framePump.getState();
    const errors=results.filter(x=>x.status==='rejected').map(x=>String(x.reason));
    const noDevice=r.deviceCreated===false&&r.creationClosed===true&&r.creationPending===false&&r.adapterRequestPending===false&&r.deviceRequestPending===false&&r.renderChainSettled===true&&r.contextAcquired===false&&r.resourcesCreated===0;
    if(noDevice){if(errors.length||r.cleanupErrors.length||pump.running||pump.queued||pump.requested||!pump.disposed||a.activeSources||!['absent','closed'].includes(a.contextState))throw new Error('no-device cleanup incomplete');
      return {proofSchema:'quantum-gallery-connected-retirement/v1',disposeSettled:true,teardown:'disposed',deviceLifecycle:'no-device-settled',device:{status:'no-device-settled',acquired:false},renderer:{...r,actualCallbackSettled:true,bootSettled:true,framePump:pump,pendingObservedFrames:0},audio:{disposeSettled:true,contextState:a.contextState,activeVoices:a.activeSources},cleanupErrors:[]};}
    if(errors.length||r.cleanupErrors.length||!r.queueDrained||!r.resourcesDisposed||!r.contextUnconfigured||!r.destroyCalled||r.lostReason!=='destroyed'||pump.running||pump.requested||a.activeSources)throw new Error('cleanup incomplete: '+JSON.stringify({errors,r,a,pump}));
    return {proofSchema:'quantum-gallery-connected-retirement/v1',disposeSettled:true,teardown:'disposed',deviceLifecycle:'destroyed-loss-settled',device:{status:'destroyed-loss-settled',drained:r.queueDrained,destroyCalled:r.destroyCalled,lostReason:r.lostReason},renderer:{...r,actualCallbackSettled:true,bootSettled:true,framePump:pump,pendingObservedFrames:0},audio:{disposeSettled:true,contextState:a.contextState,activeVoices:a.activeSources},cleanupErrors:[]};
  })();return cleanupPromise;}
window.__gallerySfx={activateFromGesture:()=>sound.enable(),setMuted:value=>sound.setMuted(value),snapshot:sound.snapshot};
window.__quantumGallery={replay,snapshot:()=>({retired,playing,currentCauseId,currentGeneration,latestReceipt,pump:framePump.getState(),runtime:runtime.lifecycle,audio:sound.snapshot()}),retire:startup.retire};
function scheduleFrame(){framePump.schedule()}
function anchors(){const r=stage.getBoundingClientRect(),sx=r.width*.22,tx=r.width*.78,y=r.height*.5;for(const [el,x] of [[sourceEl,sx],[document.querySelector('#sl'),sx],[targetEl,tx],[document.querySelector('#tl'),tx]])el.style.left=x+'px';return {source:[sx,y],target:[tx,y],width:r.width,height:r.height,dpr:Math.min(devicePixelRatio||1,2)}}
function size(){const r=stage.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));anchors()}
const resizeObserver=new ResizeObserver(size);resizeObserver.observe(stage);size();
function replay(){if(retired)return;sound.stop();causeNo++;currentCauseId='preview-'+causeNo;currentGeneration=runtime.start({id:currentCauseId});playing=true;latestReceipt=null;startedAt=performance.now();status.textContent='playing · cause '+causeNo}
document.querySelector('#replay').onclick=replay;
for(const id of ['emission','hidden'])document.querySelector('#'+id).addEventListener('change',()=>{if(!document.querySelector('#emission').checked||document.querySelector('#hidden').checked)sound.stop()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)sound.stop()});
document.querySelector('#sound').onclick=async()=>{const unlocked=await sound.enable();status.textContent=unlocked?'sound enabled':'sound unavailable'};
async function frame(){if(retired)return;if(!playing){scheduleFrame();return}const a=anchors(),age=performance.now()-startedAt,hidden=document.querySelector('#hidden').checked;targetEl.style.visibility=hidden?'hidden':'visible';document.querySelector('#tl').style.visibility=hidden?'hidden':'visible';const fitView=Math.min(a.width/640,a.height/300);const view=1;
pendingFrame={causeId:currentCauseId,ageMs:age,controls:{sourceEmission:document.querySelector('#emission').checked,observerScatter:document.querySelector('#scatter').checked,reducedMotion:document.querySelector('#reduced').checked,targetVisible:!hidden,verify}};
try{const receipt=await runtime.render({source:a.source.map(v=>v*a.dpr),target:a.target.map(v=>v*a.dpr),ageMs:age,seed:causeNo,actorHeight:64*a.dpr,reducedMotion:pendingFrame.controls.reducedMotion,sourceVisible:true,targetVisible:pendingFrame.controls.targetVisible,sourceEmission:pendingFrame.controls.sourceEmission,observerScatter:pendingFrame.controls.observerScatter,verify,view});if(retired)return;latestReceipt=receipt;if(receipt&&!startupReady){const firstFrame=startup.firstFrameFromReceipt(receipt,{causeId:currentCauseId,generation:currentGeneration});if(firstFrame&&startup.report('playing','ready',{firstFrame}))startupReady=true}let audioOutcome=null;if(receipt&&sound.unlocked&&audioReceiptIsCurrent(receipt)&&audioEligible(receipt,{verify}))audioOutcome=sound.play(receipt);if(receipt)status.textContent=`cause ${receipt.causeId} · age ${Math.round(age)} ms · ${receipt.controls.sourceEmission?'emission on':'emission off'} · view 1 (embed fit ${fitView.toFixed(2)})${audioOutcome?.status==='expired-audible-window'?' · sound expired before audible window':''}`}catch(e){status.textContent='WebGPU unavailable: '+e.message;playing=false;startup.fail('pipelines',e)}finally{pendingFrame=null}
if(retired)return;if(age>=DURATION_MS){playing=false;runtime.stop();status.textContent='complete · next cycle in 900 ms';replayTimer=setTimeout(replay,900)}scheduleFrame()}
async function boot(){try{startup.report('assets','delayed');await startup.verifyRuntimeSource();if(retired||startup.isRetired())return;startup.report('pipelines','pending');replay();scheduleFrame()}catch(error){status.textContent='Preview startup failed: '+error.message;startup.fail('assets',error)}}
const bootPromise=boot();void bootPromise;
