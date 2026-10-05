import * as Plan from './source/plan.mjs';
import {DonationRenderer,DonationPlayback,confirmFirstFrameProof} from './runtime.mjs';

const query=new URL(location.href).searchParams;
const verify=query.has('verify'),embed=query.get('embed')==='1',autoloop=embed;
const startup=globalThis.__dvaGalleryStartup;
const $=id=>document.getElementById(id);
let disposed=false,loopTimer=0,serial=0,playback=null,renderer=null;
let firstFrameMarked=false;
let disposePromise=null;
const active=()=>!disposed&&(startup?.isActive?.()??true);
const fixture=()=>Plan.makeFixture(0,{id:`donation-zero-gallery-synthetic-${++serial}`,sourceOn:true});
function dispose(){if(!disposePromise){disposed=true;clearTimeout(loopTimer);disposePromise=(async()=>{await playback?.dispose();if(!playback)await renderer?.dispose();})();}return disposePromise;}
function installSfxBridge(){
  globalThis.__gallerySfx=Object.freeze({
    activateFromGesture:async()=>{
      if(!playback||disposed||verify)return false;
      const enabled=await playback.sound.activateFromGesture();if(!enabled||disposed)return false;
      if(embed)startLoop();else playback.receive(fixture(),{audio:true});
      return true;
    },
    snapshot:()=>playback?.sound.snapshot()??{verify,enabled:false,disposed:true,activeCues:0,receiptCount:0}
  });
}
function markFirstFrame(scope){
  if(!startup||!active()||firstFrameMarked)return;
  const check=async()=>{
    if(!active()||!playback||playback.generation!==scope.playbackGeneration||playback.input?.receipt?.id!==scope.receiptId||playback.input?.sourceOn!==true)return;
    const firstFrame=await confirmFirstFrameProof({...scope,playback,isActive:active});
    if(firstFrame&&active()&&playback.generation===scope.playbackGeneration&&playback.input?.receipt?.id===scope.receiptId&&playback.input?.sourceOn===true){firstFrameMarked=true;startup.advance('playing','ready',{firstFrame});}
    else if(active()&&playback.generation===scope.playbackGeneration&&playback.input?.receipt?.id===scope.receiptId&&playback.input?.sourceOn===true)requestAnimationFrame(()=>void check());
  };
  if(startup.mode==='standalone-manual')startup.beginFirstFrame?.(scope.reason||'accepted-receive');
  requestAnimationFrame(()=>void check().catch(error=>startup.fail?.(error,'FIRST_FRAME_CONFIRMATION_FAILED')));
}
function receive(){
  if(!active()||!playback)return false;
  const submitCounts=playback.renderers.map(renderer=>renderer.submitCount);
  const accepted=playback.receive(fixture(),{audio:playback.sound.enabled});
  if(accepted)markFirstFrame({playbackGeneration:playback.generation,receiptId:playback.input.receipt.id,submitCounts});
  return accepted;
}
function startLoop(){clearTimeout(loopTimer);if(!autoloop||disposed||document.hidden)return;receive();loopTimer=setTimeout(startLoop,3500);}
try{
  if(embed)document.body.classList.add('embed');
  startup?.setCleanup?.(()=>{void dispose();});
  const canvas=$('preview');
  renderer=await DonationRenderer.create(canvas,{onStartupPhase:stage=>startup?.advance?.(stage,'pending'),
    onFailure:error=>startup?.fail?.(error,error?.code||'WEBGPU_UNCAPTURED_ERROR')});
  if(!active()){await renderer.dispose();throw Object.assign(new Error('Donation startup attempt retired'),{code:'STARTUP_CANCELLED'});}
  renderer.clear();
  playback=new DonationPlayback([renderer],{verify});
  installSfxBridge();
  await renderer.device.queue.onSubmittedWorkDone();
  if(!active())throw Object.assign(new Error('Donation startup attempt retired after clear'),{code:'STARTUP_CANCELLED'});
  startup?.advance?.('pipelines','ready');
  if(startup?.mode==='standalone-manual')startup.awaitInput?.({ready:true,clearCompleted:true,rendererCount:1});
  else if(autoloop)startLoop();
  $('play').disabled=false;$('stop').disabled=false;$('status').textContent='Synthetic gallery-only settled donation receipt. No payment or network request is made.';
  $('play').onclick=async()=>{if(!verify)await playback.sound.activateFromGesture();receive();};
  $('stop').onclick=()=>playback.cancel(true);
  $('phase').oninput=()=>{const ageMs=Number($('phase').value);const submitCounts=playback.renderers.map(renderer=>renderer.submitCount);if(!playback.hold(ageMs))return;if(playback.input?.sourceOn===true&&ageMs>=0&&ageMs<Plan.DURATION_MS)markFirstFrame({playbackGeneration:playback.generation,receiptId:playback.input.receipt.id,submitCounts,reason:'active-hold'});};
  $('source').onchange=()=>{if(playback.input){const submitCounts=playback.renderers.map(renderer=>renderer.submitCount);playback.input={...playback.input,sourceOn:$('source').checked};playback.draw(playback.timeMs);if($('source').checked)markFirstFrame({playbackGeneration:playback.generation,receiptId:playback.input.receipt.id,submitCounts,reason:'source-on-redraw'});}};
  document.addEventListener('visibilitychange',()=>{clearTimeout(loopTimer);if(document.hidden)playback?.cancel(true);else if(autoloop&&!disposed)startLoop();});
  addEventListener('pagehide',()=>{void dispose();},{once:true});
}catch(error){
  if(active()&&error?.code!=='STARTUP_CANCELLED'){
    document.body.classList.add('failed');$('status').textContent=`Donation WebGPU startup failed: ${error.message}`;
    startup?.fail?.(error,error?.code||'DONATION_RUNTIME_FAILED',error?.unsupported?'unsupported':'error');await dispose();throw error;
  }
}
