import {ActionItemUse} from './r01/src/runtime.mjs';
import {UseSound} from './r01/src/sfx.mjs';
import {UseRenderer} from './r01/src/renderer.mjs';
import {VARIANTS} from './r01/src/contract.mjs';

const $=id=>document.getElementById(id);
const verify=new URLSearchParams(location.search).has('verify');
const sound=new UseSound({verify});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const stage={width:720,height:400};
let gpu=null,loop=0,cycleStarted=performance.now(),frameId=0,logicalNow=performance.now();
const approved=new WeakSet();
const anchors=()=>[0,1].flatMap(row=>[0,1,2].map(col=>({x:120+col*240,y:155+row*200})));
const fixture='<i class="head"></i><i class="torso"></i><i class="arm"></i><i class="arm right"></i><i class="leg"></i><i class="leg right"></i>';
$('fixtures').innerHTML=anchors().map(({x,y})=>`<div class="fixture" style="left:${x}px;top:${y}px">${fixture}</div>`).join('');
const context=()=>({sessionId:'gallery-session',roomId:'gallery-room',viewerId:'gallery-viewer',documentVisible:document.visibilityState==='visible',reducedMotion:reduced.matches});
const resolveActor=id=>({playerId:id,generation:'gallery-fixture',roomId:'gallery-room',sessionId:'gallery-session',authorizedForViewer:true,privacyAllowed:true,visible:true,onScreen:true,occluded:false,maskReady:true});
const runtime=new ActionItemUse({confirm:r=>approved.has(r),getContext:context,resolveActor,clock:()=>logicalNow,sound});
function startCycle(now){
 runtime.cancelAll();loop++;cycleStarted=now;logicalNow=now;
 for(let j=0;j<VARIANTS.length;j++){
  const receipt=Object.freeze({id:`item-use-pro-r01-${loop}-${j}`,kind:'action-item-use',variant:VARIANTS[j],playerId:`gallery-actor-${j}`,actorGeneration:'gallery-fixture',sessionId:'gallery-session',roomId:'gallery-room',x:120+j*240,y:155,radius:90,durationMs:0,targetId:null,targetX:null,targetY:null,consumptionSucceeded:true,selfUse:true,occurredAtMs:now,receivedAtMs:now,delivery:'live'});
  approved.add(receipt);runtime.receive(receipt);
 }
}
function maskFor(frameId,dpr,width,height){
 const data=new Uint8Array(width*height);data.fill(255);
 for(const {x,y} of anchors()){
  const x0=Math.max(0,Math.floor((x-19)*dpr)),x1=Math.min(width,Math.ceil((x+19)*dpr));
  const y0=Math.max(0,Math.floor((y-66)*dpr)),y1=Math.min(height,Math.ceil((y+1)*dpr));
  for(let row=y0;row<y1;row++)data.fill(0,row*width+x0,row*width+x1);
 }
 return {frameId,width,height,data};
}
function draw(effects){
 if(!gpu)return;
 const dpr=Math.min(2,Math.max(1,devicePixelRatio||1)),width=Math.round(stage.width*dpr),height=Math.round(stage.height*dpr);
 gpu.resize(width,height);
 const draws=effects.flatMap(e=>[0,1].map(row=>({xPx:e.receipt.x*dpr,yPx:(e.receipt.y+row*200)*dpr,worldToPixel:dpr,variant:e.receipt.variant,ageMs:e.ageMs,reducedMotion:e.reducedMotion})));
 const id=++frameId;gpu.render(draws,{frameId:id,mask:maskFor(id,dpr,width,height),devicePixelRatio:dpr});
}
function frame(now){
 if(document.visibilityState==='visible'){
  if(now-cycleStarted>=1600)startCycle(now);
  logicalNow=performance.now();
  draw(runtime.frame());
 }
 requestAnimationFrame(frame);
}
async function initialize(){
 try{
  gpu=await UseRenderer.create($('vfx'),{onDeviceLost:()=>{$('error').hidden=false;$('error').textContent='WebGPU device lost; playback stopped.';runtime.cancelAll();sound.stopAll();}});
  logicalNow=performance.now();startCycle(logicalNow);requestAnimationFrame(frame);
  window.itemUseProR01={verify,variants:VARIANTS,runtime,sound,get gpu(){return gpu;},get frameId(){return frameId;},async checkpoint(){return gpu.checkpoint();}};
 }catch(error){$('error').hidden=false;$('error').textContent=`WebGPU playback unavailable: ${error?.message??error}`;}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'){runtime.cancelAll();sound.stopAll();}else{logicalNow=performance.now();startCycle(logicalNow);}});
window.addEventListener('pagehide',()=>{runtime.dispose();sound.dispose();gpu?.dispose();},{once:true});
initialize();
