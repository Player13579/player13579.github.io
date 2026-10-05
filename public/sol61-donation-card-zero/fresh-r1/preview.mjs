import * as Plan from './source/plan.mjs';
import {DonationRenderer,DonationPlayback} from './runtime.mjs';

const query=new URL(location.href).searchParams;
const verify=query.has('verify'),embed=query.get('embed')==='1',autoloop=embed;
const startup=globalThis.__dvaGalleryStartup;
const $=id=>document.getElementById(id);
let disposed=false,loopTimer=0,serial=0,playback=null,renderer=null;
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
let firstFrameMarked=false;
function markFirstFrame(){
  if(!startup||!active()||firstFrameMarked)return;
  const playbackGeneration=playback.generation,causeId=playback.input?.receipt?.id;
  const check=async()=>{
    if(!active()||firstFrameMarked||playback.generation!==playbackGeneration||!causeId||playback.input?.receipt?.id!==causeId||playback.input.sourceOn!==true)return;
    const observed=playback.renderers.map(r=>({r,row:r.frames.findLast(row=>row.passes===2&&row.sourceOn===true&&row.causeId===causeId&&row.ageMs>=0&&row.ageMs<Plan.DURATION_MS&&row.generation===r.generation&&row.targetGeneration===r.targetGeneration),
      state:{generation:r.generation,targetGeneration:r.targetGeneration,targets:r.targets,postBind:r.postBind,width:r.canvas.width,height:r.canvas.height}}));
    if(!observed.length||observed.some(o=>!o.row)){requestAnimationFrame(()=>void check().catch(error=>startup.fail?.(error,'FIRST_FRAME_CONFIRMATION_FAILED')));return;}
    await Promise.all(observed.map(o=>o.r.device.queue.onSubmittedWorkDone()));
    if(!active()||firstFrameMarked||playback.generation!==playbackGeneration||playback.input?.receipt?.id!==causeId||playback.input.sourceOn!==true)return;
    if(observed.some(o=>!o.r.isCurrent(o.state)||!o.r.canvas.isConnected)){
      requestAnimationFrame(()=>void check().catch(error=>startup.fail?.(error,'FIRST_FRAME_CONFIRMATION_FAILED')));return;
    }
    const first=observed[0];
    firstFrameMarked=true;
    startup.advance('playing','ready',{firstFrame:{recorded:true,submitted:true,completed:true,canvasConnected:true,
      passes:first.row.passes,viewportWidth:first.state.width,viewportHeight:first.state.height,
      submit:first.row.submit,generation:first.row.generation,targetGeneration:first.row.targetGeneration,causeId,playbackGeneration,sourceOn:true,ageMs:first.row.ageMs}});
  };
  if(startup.mode==='standalone-manual')startup.beginFirstFrame?.('accepted-receive');
  requestAnimationFrame(()=>void check().catch(error=>startup.fail?.(error,'FIRST_FRAME_CONFIRMATION_FAILED')));
}
function receive(){
  if(!active()||!playback)return false;
  const accepted=playback.receive(fixture(),{audio:playback.sound.enabled});
  if(accepted)markFirstFrame();
  return accepted;
}
function startLoop(){clearTimeout(loopTimer);if(!autoloop||disposed||document.hidden)return;receive();loopTimer=setTimeout(startLoop,3500);}
try{
  if(embed)document.body.classList.add('embed');
  startup?.setCleanup?.(()=>{void dispose();});
  const canvas=$('preview');
  renderer=await DonationRenderer.create(canvas,{onStartupPhase:stage=>startup?.advance?.(stage,'pending')});
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
  $('phase').oninput=()=>playback.hold(Number($('phase').value));
  $('source').onchange=()=>{if(playback.input){playback.input={...playback.input,sourceOn:$('source').checked};playback.draw(playback.timeMs);}};
  document.addEventListener('visibilitychange',()=>{clearTimeout(loopTimer);if(document.hidden)playback?.cancel(true);else if(autoloop&&!disposed)startLoop();});
  addEventListener('pagehide',()=>{void dispose();},{once:true});
}catch(error){
  if(active()&&error?.code!=='STARTUP_CANCELLED'){
    document.body.classList.add('failed');$('status').textContent=`Donation WebGPU startup failed: ${error.message}`;
    startup?.fail?.(error,error?.code||'DONATION_RUNTIME_FAILED',error?.unsupported?'unsupported':'error');await dispose();throw error;
  }
}
