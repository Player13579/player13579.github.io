import { CONTRACT as C } from './src/contract.js';
import { StaminaEvents } from './src/events.js';
import { sampleEffect } from './src/sampler.js';
import { bodyParts } from './src/fixture.js';
import { createBackend, CoreloadRenderer } from './src/renderer.js';

const $=id=>document.getElementById(id);
const verify=new URLSearchParams(location.search).has('verify');
let audio=null, audioStats=null, backend=null, views=[], previous=null, now=0, cycle=0, running=true, frames=0;
if(!verify){
  const {StaminaAudio}=await import('./src/audio.js');
  audio=new StaminaAudio(stats=>{audioStats=stats;});
}
const ledger=new StaminaEvents({
  onStart:(event,actor,phase)=>audio?.start(event,actor,phase),
  onUpdate:(event,actor,phase)=>audio?.update(event,actor,phase),
  onStop:event=>audio?.stop(event)
});
async function unlockOnGesture(){
  if(verify||!audio||audio.enabled)return;
  try{await audio.enable();window.removeEventListener('pointerdown',unlockOnGesture,true);window.removeEventListener('keydown',unlockOnGesture,true);}
  catch(error){console.warn('Stamina r0.4 audio unlock failed',error);}
}
if(!verify){window.addEventListener('pointerdown',unlockOnGesture,true);window.addEventListener('keydown',unlockOnGesture,true);}
function beginCycle(){
  cycle++;
  for(const key of [...ledger.events.keys()])ledger.stop(key,'new_preview_cycle');
  ledger.setActor({playerId:'beneficiary',nowMs:now,rate:1,position:[0,0,0],alive:true,present:true,visible:true});
  ledger.ingest({type:'gain-stamina',kind:'discrete',authoritative:true,playerId:'beneficiary',startedAt:now,eventId:`stamina-r04-${cycle}`,gain:20,duration:C.defaultDurationMs,radius:C.referenceRadius,sourceToken:'gallery-preview'});
  ledger.update();
}
function draw(){
  const active=ledger.active().map(({event,actor,lane})=>sampleEffect(event,actor,{lane}));
  const volumes=active.flatMap(state=>state.volumes);
  const actor=ledger.actors.get('beneficiary');
  const parts=bodyParts(actor);
  for(const view of views)view.renderer.draw({volumes,parts,width:256,height:176,scale:1,foot:122,lightBackground:view.light,bloom:true,receivingLight:true});
  frames++;
}
function fail(error){running=false;$('status').textContent='WebGPU replay failed';$('error').hidden=false;$('error').textContent=error?.stack??String(error);console.error(error);}
function frame(time){
  if(!running)return;
  try{
    const dt=previous===null?0:Math.max(0,time-previous);previous=time;
    if(!document.hidden){now+=dt;ledger.setActor({playerId:'beneficiary',nowMs:now,rate:1});ledger.update();if(now-cycleStart> C.defaultDurationMs+950){cycleStart=now;beginCycle();}}
    draw();requestAnimationFrame(frame);
  }catch(error){fail(error);}
}
let cycleStart=0;
try{
  backend=await createBackend();
  for(const [id,light] of [['dark',false],['light',true]])views.push({light,renderer:new CoreloadRenderer(backend,$(id))});
  $('status').textContent=verify?'WebGPU · H64 dark/light · autoplay loop · verify=true · audio muted':'WebGPU · H64 dark/light · autoplay loop · audio awaits gesture';
  beginCycle();cycleStart=now;requestAnimationFrame(frame);
}catch(error){fail(error);}
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio?.stopAll();previous=null;}});
window.__staminaR04Replay={get report(){return{revision:'0.4.0',verify,audio:verify?'muted-no-audio-module':'gesture-gated-no-backlog',audioUnlocked:audio?.enabled??false,audioWorklet:audioStats,audioCauseKeys:audio?.sent.size??0,ledgerStarts:ledger.stats.starts,frames,source:'original r0.4 src and shaders',replayability:frames?'webgpu-replayable':'not_run',qualityStatus:'pending/not_approved',productionApproved:false,error:$('error').hidden?null:$('error').textContent,adapter:backend?.diagnostic?.adapter??null,compilation:backend?.diagnostic?.shaderCompilation??null};}};
window.addEventListener('pagehide',()=>{running=false;for(const view of views)view.renderer.dispose();void audio?.dispose();});
