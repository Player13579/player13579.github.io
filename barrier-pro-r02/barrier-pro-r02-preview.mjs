import {createBarrierRenderer} from './barrier-pro-renderer.mjs';
import {DURATIONS_MS} from './barrier-pro-sampler.mjs';

const canvas=document.getElementById('gpu');
const verify=new URLSearchParams(location.search).has('verify');
const sequence=['create','absorb','fracture','bust'];
const total=sequence.reduce((sum,branch)=>sum+DURATIONS_MS[branch],0);
let renderer=null,raf=0,origin=performance.now(),lastBranch='',lastAge=-1;
const state={ready:false,verify,audioEnabled:false,branch:null,ageMs:0,errors:[],metadata:null};
window.barrierProPreview=state;
function render(now){
  if(!renderer)return;
  const elapsed=Math.max(0,now-origin)%total;
  let branch=sequence[sequence.length-1],ageMs=0,offset=0;
  for(const candidate of sequence){const duration=DURATIONS_MS[candidate];if(elapsed<offset+duration){branch=candidate;ageMs=elapsed-offset;break;}offset+=duration;}
  const authoritativeActive=branch==='create'||branch==='absorb';
  try{
    renderer.draw({branch,ageMs,authoritativeActive,hPx:64,background:0,yawDeg:-14,pitchDeg:6,faceMode:'both',coreEnabled:true,grayscale:false,diagnostic:0});
    state.branch=branch;state.ageMs=ageMs;state.renderCount=(state.renderCount??0)+1;
    if(branch!==lastBranch||Math.floor(ageMs/100)!==Math.floor(lastAge/100)){state.lastFrame={branch,ageMs};lastBranch=branch;lastAge=ageMs;}
  }catch(error){state.errors.push(String(error?.stack??error));}
  raf=requestAnimationFrame(render);
}
try{
  renderer=await createBarrierRenderer(canvas);
  state.metadata=renderer.metadata;
  state.inspect=()=>renderer.inspect();
  state.ready=true;
  origin=performance.now();
  raf=requestAnimationFrame(render);
}catch(error){state.errors.push(String(error?.stack??error));}
window.addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});

