import {VERSION,DURATION_MS,fixture,CauseGate} from './source/plan.mjs';
import {StunRenderer} from './runtime.mjs';
import {StunSound} from './source/sound.mjs';
const params=new URLSearchParams(location.search),verify=params.has('verify'),canvas=document.querySelector('#stage');
if(params.get('embed')==='1')document.body.classList.add('embed');
const renderer=new StunRenderer(canvas,{onStage:stage=>notify(stage)}),sound=new StunSound({verify}),gate=new CauseGate();
let input=fixture(35),scale=1,running=false,epoch=1,causeOrdinal=1,started=0,raf=0,loopTimer=0,disposed=false,startupSequence=0;
const controls={sourceOn:true,observerOn:true,contextOn:true,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
const view=()=>({width:canvas.width,height:canvas.height,scale,camera:{x:0,y:0},origin:{x:canvas.width*.44,y:canvas.height*.5}});
function notify(stage,proof=null,error=null){const token=params.get('galleryStartupToken'),versionId=params.get('galleryVersionId'),attemptEpoch=Number(params.get('galleryAttemptEpoch'));if(!token||versionId!==VERSION||!Number.isSafeInteger(attemptEpoch)||attemptEpoch<=0||window.parent===window)return;window.parent.postMessage({schema:'dva-gallery-startup/v1',token,versionId,attemptEpoch,sequence:++startupSequence,stage,status:error?'error':stage==='playing'&&proof?.completed?'ready':'pending',firstFrame:proof,error:error?{code:'STUN_PREVIEW_ERROR',message:error}:null},location.origin);}
function snapshot(){return {versionId:VERSION,ready:renderer.ready,running,ageMs:input.ageMs,causeId:input.cause.id,epoch,scale,geometry:{cause:{...input.cause},receiver:{...input.receiver},projection:{...view(),receiverDisplayHeight:input.receiver.height*scale}},controls:{...controls},renderer:renderer.snapshot(),audio:sound.snapshot(),sourceDurationMs:720,gameStunDurationMs:2500};}
async function draw(ageMs){input={...input,ageMs};const current=epoch,causeId=input.cause.id;const proof=await renderer.render(input,view(),controls);if(current!==epoch||causeId!==input.cause.id||disposed)return {...proof,stale:true};return proof;}
function stop(){running=false;epoch++;renderer.invalidate();cancelAnimationFrame(raf);clearTimeout(loopTimer);raf=0;loopTimer=0;sound.cancel();}
async function hold(ageMs,options={}){if(!Number.isFinite(ageMs))throw new TypeError('finite hold age');stop();Object.assign(controls,options);return draw(ageMs);}
async function play({audio=false,autoLoop=params.get('galleryAutoLoop')==='1'}={}){
 stop();const current=epoch;input=fixture(0,{id:'synthetic-stun-grenade-'+(++causeOrdinal),height:64});gate.receive({...input.cause,at:input.cause.startedAt},{roomId:input.cause.roomId,generation:input.cause.generation});running=true;started=performance.now();
 let first=true;
 const frame=()=>{if(disposed||!running||current!==epoch)return;const age=performance.now()-started;const proofPromise=draw(Math.min(DURATION_MS,age));
  proofPromise.then(proof=>{if(current!==epoch||disposed||proof.stale||!proof.completed)return;if(first){first=false;notify('playing',proof);}if(audio&&controls.sourceOn)sound.play(input.cause,performance.now()-started);}).catch(fatal);
  if(age<DURATION_MS)raf=requestAnimationFrame(frame);else{running=false;sound.cancel();if(autoLoop)loopTimer=setTimeout(()=>{if(current===epoch&&!disposed)play({audio,autoLoop}).catch(fatal);},350);}
 };raf=requestAnimationFrame(frame);return snapshot();
}
function fatal(error){stop();notify('playing',null,String(error?.message??error));document.body.dataset.error=String(error?.message??error);console.error(error);dispose().catch(e=>console.error(e));}
async function dispose(){if(disposed)return;disposed=true;stop();gate.dispose();await sound.dispose();await renderer.dispose();}
window.__stunGrenade={snapshot,hold,play,setScale:async(value)=>{if(!Number.isFinite(value)||value<=0||value>4)throw new RangeError('scale (0,4]');scale=value;return hold(input.ageMs);},setControls:async(value)=>hold(input.ageMs,value),dispose};
window.__dvaGallerySfxBridge={activate:()=>sound.activate(),snapshot:()=>sound.snapshot(),stop:()=>sound.cancel()};
document.querySelector('#replay').onclick=async()=>{try{const activated=await sound.activate();await play({audio:activated});}catch(e){fatal(e);}};
document.querySelector('#age').oninput=e=>hold(Number(e.target.value)).catch(fatal);
for(const [id,key] of [['source','sourceOn'],['observer','observerOn'],['context','contextOn']])document.querySelector('#'+id).onchange=e=>hold(input.ageMs,{[key]:e.target.checked}).catch(fatal);
document.querySelector('#scale').onchange=e=>window.__stunGrenade.setScale(Number(e.target.value)).catch(fatal);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>dispose());
window.addEventListener('message',event=>{const d=event.data;if(event.source!==parent||event.origin!==location.origin||d?.schema!=='dva-gallery-startup/v1'||d.action!=='retire'||d.token!==params.get('galleryStartupToken')||d.versionId!==VERSION||d.attemptEpoch!==Number(params.get('galleryAttemptEpoch')))return;dispose().catch(e=>console.error(e));});
try{notify('child-document');await renderer.initialize();await renderer.resize(980,620);notify('first-frame');const proof=await draw(35);notify('playing',proof);if(params.get('galleryAutoLoop')==='1')await play();}catch(e){fatal(e);}
