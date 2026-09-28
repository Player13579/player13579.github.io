import {createBarrierRenderer} from './barrier-pro-renderer.mjs';
import {DURATIONS_MS,BRANCHES,playSFX} from './barrier-pro-sampler.mjs';

const canvas=document.getElementById('view');
const query=new URLSearchParams(location.search);
const audioButton=document.getElementById('enable-audio');
const branches=['create','absorb','fracture','bust'];
const totalMs=branches.reduce((sum,branch)=>sum+DURATIONS_MS[branch],0);
const state={version:'barrier-pro-r0.3',ready:false,verify:query.has('verify'),audioEnabled:false,qualityApproval:false,qualityStatus:'not_accepted',branch:null,ageMs:0,visitedBranches:[],drawCount:0,errors:[],metadata:null,settings:null};
window.barrierProR03Preview=state;
let renderer=null,cycleOrigin=0,raf=0,pinnedFrame=null,audio=null,voice=null,lastAudioBranch=null;
audioButton.hidden=state.verify;
audioButton.addEventListener('click',async()=>{
 if(state.verify)return;
 audioButton.disabled=true;
 try{audio??=new AudioContext();await audio.resume();state.audioEnabled=audio.state==='running';audioButton.textContent=state.audioEnabled?'音を有効化しました':'音を有効化できません';if(!state.audioEnabled)audioButton.disabled=false;}
 catch(error){state.errors.push(String(error?.stack??error));audioButton.disabled=false;}
});
function options(branch,ageMs){return {branch,ageMs,hPx:64,background:0,coreEnabled:true,bandMask:31,diagnostic:0,
 authoritativeActive:branch==='create'||branch==='absorb'};}
function draw(branch,ageMs){
  state.branch=branch;state.ageMs=ageMs;
  if(!state.verify&&state.audioEnabled&&audio?.state==='running'&&branch!==lastAudioBranch){voice?.cancel();voice=playSFX(audio,branch);lastAudioBranch=branch;}
  if(!state.visitedBranches.includes(branch))state.visitedBranches.push(branch);
  state.settings=renderer.draw(options(branch,ageMs));
  state.drawCount++;
  state.errors=[...renderer.errors];
}
function fail(error){state.errors.push(String(error?.stack??error));if(raf)cancelAnimationFrame(raf);raf=0;}
function step(now){
  if(!renderer)return;
  try{
    if(pinnedFrame){draw(pinnedFrame.branch,pinnedFrame.ageMs);raf=requestAnimationFrame(step);return;}
    const elapsed=(now-cycleOrigin)%totalMs;let offset=0,branch=branches.at(-1),ageMs=0;
    for(const candidate of branches){const duration=DURATIONS_MS[candidate];if(elapsed<offset+duration){branch=candidate;ageMs=elapsed-offset;break;}offset+=duration;}
    draw(branch,ageMs);
    raf=requestAnimationFrame(step);
  }catch(error){fail(error);}
}
state.inspect=()=>renderer.inspect();
state.captureFrame=(branch,ageMs)=>{
  if(!renderer||!BRANCHES.includes(branch)||!Number.isFinite(ageMs))throw new Error('invalid or unavailable capture frame');
  pinnedFrame={branch,ageMs};draw(branch,ageMs);return {branch,ageMs,hPx:64,settings:state.settings,errors:state.errors};
};
state.resumeLoop=()=>{pinnedFrame=null;cycleOrigin=performance.now();};
try{
  renderer=await createBarrierRenderer(canvas);
  state.metadata=renderer.metadata;
  state.ready=true;
  cycleOrigin=performance.now();
  draw('create',0);
  raf=requestAnimationFrame(step);
}catch(error){fail(error);}
window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);renderer?.destroy();},{once:true});
