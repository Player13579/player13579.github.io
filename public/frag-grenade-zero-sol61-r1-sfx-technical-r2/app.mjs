import {VERSION,DURATION_MS,fixture,CauseGate} from './source/plan.mjs';
import {FragRenderer} from './runtime.mjs';
import {FragSound} from './source/sound.mjs';
const params=new URLSearchParams(location.search),canvas=document.querySelector('#stage'),verify=params.has('verify'),galleryVersion=params.get('galleryVersionId'),soundEligible=!verify&&(!galleryVersion||galleryVersion===VERSION);
if(params.get('embed')==='1')document.body.classList.add('embed');
const renderer=new FragRenderer(canvas,{onStage:stage=>notify(stage)}),sound=new FragSound({verify}),gate=new CauseGate();
let input=fixture(),scale=1,epoch=1,ordinal=1,running=false,raf=0,timer=0,disposed=false,sequence=0,startMs=0,audioArmed=false;
const controls={sourceOn:true,observerOn:true,contextOn:true,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
const view=()=>({width:canvas.width,height:canvas.height,scale,origin:{x:canvas.width*.48,y:canvas.height*.60}});
function notify(stage,proof=null,error=null){const token=params.get('galleryStartupToken'),versionId=params.get('galleryVersionId'),attemptEpoch=Number(params.get('galleryAttemptEpoch'));if(!token||versionId!==VERSION||!Number.isSafeInteger(attemptEpoch)||attemptEpoch<=0||window.parent===window)return;parent.postMessage({schema:'dva-gallery-startup/v1',token,versionId,attemptEpoch,sequence:++sequence,stage,status:error?'error':proof?.completed?'ready':'pending',firstFrame:proof,error:error?{code:'FRAG_PREVIEW_ERROR',message:error}:null},location.origin);}
function snapshot(){return {versionId:VERSION,ready:renderer.ready,running,epoch,ageMs:input.ageMs,causeId:input.cause.id,scale,input:structuredClone(input),controls:{...controls},projection:{actorHeightPx:input.receiver.height*scale,logicalActorHeight:input.receiver.height,scale,canvasWidth:canvas.width,canvasHeight:canvas.height},renderer:renderer.snapshot(),audio:sound.snapshot(),durationMs:DURATION_MS,gameRadius:132};}
function gallerySfxSnapshot(){const audio=sound.snapshot(),running=audio.state==='running',enabled=audioArmed&&running&&soundEligible&&!disposed;return {...audio,enabled,active:enabled,running,closed:audio.state==='closed'||disposed};}
async function draw(age){input={...input,ageMs:age};const owner=epoch,id=input.cause.id;const proof=await renderer.render(input,view(),controls);return owner!==epoch||id!==input.cause.id||disposed?{...proof,stale:true}:proof;}
function stop(){running=false;epoch++;renderer.invalidate();cancelAnimationFrame(raf);clearTimeout(timer);raf=timer=0;sound.cancel();}
async function hold(age,options={}){if(!Number.isFinite(age))throw new TypeError('finite age');stop();Object.assign(controls,options);return draw(age);}
async function play({audio,autoLoop=params.get('galleryAutoLoop')==='1'}={}){
 const audioRequested=soundEligible&&(audio===undefined?audioArmed:audio===true);
 stop();input=fixture(0,{id:'synthetic-frag-'+(++ordinal)});gate.receive(input.cause,{roomId:input.cause.roomId,generation:input.cause.generation});const owner=epoch,id=input.cause.id;running=true;startMs=performance.now();let first=true;
 const frame=()=>{if(disposed||owner!==epoch||!running)return;const age=Math.min(DURATION_MS,performance.now()-startMs);
  draw(age).then(proof=>{if(disposed||owner!==epoch||id!==input.cause.id||proof.stale||!proof.completed)return;if(first){first=false;notify('playing',proof);}const state=renderer.snapshot();if(audioRequested&&controls.sourceOn&&proof.versionId===VERSION&&proof.causeId===id&&proof.generation===state.generation&&proof.targetGeneration===state.targetGeneration&&state.lastCompleted?.sequence===proof.sequence&&proof.ageMs===input.ageMs&&performance.now()-startMs<100)sound.play(input.cause,performance.now()-startMs);}).catch(fatal);
  if(age<DURATION_MS)raf=requestAnimationFrame(frame);else{running=false;sound.cancel();if(autoLoop)timer=setTimeout(()=>{if(!disposed&&owner===epoch)play({autoLoop}).catch(fatal);},420);}
 };raf=requestAnimationFrame(frame);return snapshot();
}
async function receive(event,session,{ageMs=0}={}){if(!gate.receive(event,session))return false;stop();input={...fixture(ageMs),cause:{...event,duration:DURATION_MS,radius:132}};return draw(ageMs);}
function fatal(error){stop();notify('playing',null,String(error.message??error));document.body.dataset.error=String(error.message??error);console.error(error);dispose().catch(console.error);}
async function dispose(){if(disposed)return;disposed=true;stop();gate.dispose();await sound.dispose();await renderer.dispose();}
window.__fragGrenade={snapshot,hold,play,receive,stop,dispose,setScale:async n=>{if(!Number.isFinite(n)||n<=0||n>3)throw new RangeError('scale (0,3]');scale=n;return hold(input.ageMs);},setControls:async values=>hold(input.ageMs,values),setOccluder:async value=>{input={...input,occluder:!!value};return hold(input.ageMs);},setObserver:async values=>{if(!Number.isFinite(values.exposure)||!Number.isFinite(values.pupil)||values.exposure<.1||values.exposure>4||values.pupil<.3||values.pupil>2)throw new RangeError('exposure .1..4, pupil .3..2');input={...input,observer:{...values}};return hold(input.ageMs);}};
async function activateFromGesture(){if(!soundEligible)return false;const activated=await sound.activate();if(activated)audioArmed=true;return activated;}
window.__dvaGallerySfxBridge={activate:activateFromGesture,stop:()=>sound.cancel(),snapshot:()=>sound.snapshot()};
async function activateFromGalleryGesture(){await activateFromGesture();const audio=gallerySfxSnapshot();return {...audio,state:verify?'silent':audio.enabled?'active':'unsupported',verify};}
window.__gallerySfx={activateFromGesture:activateFromGalleryGesture,setMuted:value=>{if(value){audioArmed=false;sound.cancel();}},snapshot:gallerySfxSnapshot};
document.querySelector('#replay').onclick=async()=>{try{const activated=await activateFromGesture();await play(activated?{audio:true}:{});}catch(error){fatal(error);}};
document.querySelector('#age').oninput=event=>hold(Number(event.target.value)).catch(fatal);
document.querySelector('#scale').onchange=event=>window.__fragGrenade.setScale(Number(event.target.value)).catch(fatal);
for(const [id,key] of [['source','sourceOn'],['observer','observerOn'],['context','contextOn']])document.querySelector('#'+id).onchange=event=>hold(input.ageMs,{[key]:event.target.checked}).catch(fatal);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});addEventListener('pagehide',()=>dispose());
addEventListener('message',event=>{const d=event.data;if(event.source!==parent||event.origin!==location.origin||d?.schema!=='dva-gallery-startup/v1'||d.action!=='retire'||d.token!==params.get('galleryStartupToken')||d.versionId!==VERSION||d.attemptEpoch!==Number(params.get('galleryAttemptEpoch')))return;dispose().catch(console.error);});
try{notify('child-document');await renderer.initialize();await renderer.resize(980,620);notify('first-frame');const proof=await draw(55);notify('playing',proof);if(params.get('galleryAutoLoop')==='1')await play();}catch(error){fatal(error);}
