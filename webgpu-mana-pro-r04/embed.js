import {requestDevice} from './src/gpu.js';
import {InspectionView} from './preview/fixture.js';
import {PreviewController} from './preview/controller.js';

const status=document.getElementById('status');
const error=document.getElementById('error');
const verify=new URLSearchParams(location.search).has('verify');
let audio=null;
if(!verify){
  const {ManaGainAudio}=await import('./src/audio.js');
  audio=new ManaGainAudio({onDiagnostic:message=>console.warn('ManaAcquireE audio diagnostic',message)});
}
const controller=new PreviewController(audio);
const views=[];
let previous=performance.now(),frames=0,adapterInfo=null,compilation=[];
function fail(reason){status.textContent='WebGPU replay failed';error.hidden=false;error.textContent=reason?.stack??String(reason);controller.running=false;}
async function unlockOnGesture(){
  if(verify||!audio||audio.ready)return;
  try{
    await audio.unlock();
    status.textContent=status.textContent.replace(/ · frames \d+$/, '')+' · gesture audio enabled for future causes';
    window.removeEventListener('pointerdown',unlockOnGesture,true);
    window.removeEventListener('keydown',unlockOnGesture,true);
  }catch(reason){console.warn('ManaAcquireE gesture audio unlock failed',reason);}
}
if(!verify){
  window.addEventListener('pointerdown',unlockOnGesture,true);
  window.addEventListener('keydown',unlockOnGesture,true);
}
function frame(now){
  if(!controller.running)return;
  try{
    const instances=controller.step(document.hidden?0:now-previous);previous=now;
    const options={visible:true,occlusion:false,bloom:true,debugLabels:null};
    for(const view of views)view.render(instances,options);
    frames++;
    if(frames%60===0)status.textContent=status.textContent.replace(/ · frames \d+$/, '')+` · frames ${frames}`;
    requestAnimationFrame(frame);
  }catch(reason){fail(reason);}
}
try{
  const gpu=await requestDevice();adapterInfo=gpu.info;
  for(const [id,light] of [['dark',false],['light',true]]){
    const canvas=document.getElementById(id);
    const view=await InspectionView.create(gpu.device,gpu.format,canvas,1,light);
    views.push(view);compilation.push(...view.compilation);
  }
  status.textContent=verify
    ?`WebGPU rendering · H64 dark/light · autoplay loop · verify=true · audio muted · quality pending${adapterInfo?.isFallbackAdapter?' · software adapter':''}`
    :`WebGPU rendering · H64 dark/light · autoplay loop · audio awaits pointer/key gesture · quality pending${adapterInfo?.isFallbackAdapter?' · software adapter':''}`;
  controller.restart();previous=performance.now();requestAnimationFrame(frame);
}catch(reason){fail(reason);}
document.addEventListener('visibilitychange',()=>{audio?.setMuted(document.hidden);previous=performance.now();});
window.__manaR04Replay={get report(){return {release:'r0.4',verify,audio:verify?'muted-no-audio-module':'package-audio-awaits-gesture',audioUnlocked:audio?.ready??false,audioWorklet:audio?.workletStats??'not_run',renderStatus:frames?'running':'not_run',frames,adapterInfo,compilation,source:'original r0.4 src and preview modules',replayability:frames?'webgpu-replayable':'not_replayable_or_not_run',qualityStatus:'pending/not_approved',productionApproved:false,error:error.hidden?null:error.textContent};}};
window.addEventListener('pagehide',()=>{controller.dispose();for(const view of views)view.dispose();void audio?.dispose();});
