import { CONTRACT, SharedMediaClock, ManaRenderer, ManaGainRuntime, OneShotAudio, canvasVisible } from './src/index.js';

const canvas=document.querySelector('#effect'),status=document.querySelector('#status');
const verify=new URLSearchParams(location.search).has('verify');
const embed=new URLSearchParams(location.search).has('embed');
if(embed) document.documentElement.dataset.embed='1';
const audio=new OneShotAudio({verify});
const media=new SharedMediaClock(()=>audio.context);
const owner={id:'gallery-owner',roomId:'mana-gallery',sessionId:'r01',acc2:{state:'off',movementEffective:false}};
const player={id:'gallery-recipient',roomId:'mana-gallery',sessionId:'r01',alive:true,present:true,inVent:false,invisible:false,visibleToViewer:true,opacity:1,onScreen:true,world:{x:0,y:0},acc2:owner.acc2};
let serial=0,runtime,renderer,alive=true,next=0;
const view=()=>({visible:document.visibilityState==='visible'&&canvasVisible(canvas),muted:audio.muted,verify,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
function emit(){const now=media.now();runtime.accept({id:`mana-pro-r01:${++serial}`,playerId:player.id,ownerPlayerId:owner.id,roomId:owner.roomId,sessionId:owner.sessionId,type:'gain-mana',effectKind:'mana',confirmed:true,discrete:true,naturalRegen:false,source:'map-object',manaBefore:10,manaAfter:11,expiresAt:now+8});next=now+CONTRACT.duration+.5;}
try{
  renderer=await ManaRenderer.create(canvas,{onLost:()=>{runtime?.dispose();status.textContent='WebGPU device lost; replay stopped.';}});
  runtime=new ManaGainRuntime({roomId:owner.roomId,sessionId:owner.sessionId,resolvePlayer:id=>id===player.id?player:null,resolveOwner:id=>id===owner.id?owner:null,getView:view,project:()=>({x:50,y:70,scale:CONTRACT.h64EnvelopeScale,visible:true}),now:()=>media.now(),audio});
  document.querySelector('#audio').onclick=async()=>{try{const ok=await audio.unlock();if(ok){audio.setMuted(false);status.textContent='WebGPU active. Audio enabled for future visible events.';}}catch(e){status.textContent=`Audio unavailable: ${e.message}`;}};
  if(embed && !verify) canvas.addEventListener('click',async()=>{try{if(await audio.unlock()){audio.setMuted(false);emit();}}catch(e){status.textContent=`Audio unavailable: ${e.message}`;}});
  document.querySelector('#mute').onclick=()=>audio.setMuted(true);
  document.querySelector('#replay').onclick=emit;
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')runtime.invalidate();});
  window.addEventListener('pagehide',()=>{alive=false;runtime.dispose();audio.dispose();renderer.destroy();},{once:true});
  async function frame(){if(!alive)return;const now=media.now();if(runtime.active.size===0&&now>=next&&view().visible)emit();const snapshot=runtime.snapshot();const result=await renderer.render(snapshot,{background:'dark',evidence:snapshot.some(e=>e.needsEvidence),isCurrent:e=>runtime.frameAllowed(e)});runtime.acknowledgeFrame(result);if(result.status==='failed'){status.textContent=`WebGPU replay failed: ${result.error}`;alive=false;return;}status.textContent=`${verify?'VERIFY · AUDIO FORCED OFF':'WebGPU replay'} · ${renderer.compilation.length?'shader diagnostics present':'shader compilation reported no errors'} · ${runtime.active.size?'event active':'loop ready'} · ${canvas.width}×${canvas.height} raster / H64 envelope scale · SFX ${audio.context?.state??'locked'}`;if(alive)requestAnimationFrame(frame);}
  next=media.now();requestAnimationFrame(frame);
}catch(error){status.textContent=`WebGPU unavailable; no 2D/WebGL fallback. ${error.stack??error}`;audio.dispose();}
