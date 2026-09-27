import {createBarrierRenderer} from './barrier-pro-renderer.mjs';
import {DURATIONS_MS} from './barrier-pro-sampler.mjs';

const canvas=document.getElementById('view');
const branches=['create','absorb','fracture','bust'];
const segmentMs=branches.map(branch=>DURATIONS_MS[branch]+180);
const totalMs=segmentMs.reduce((a,b)=>a+b,0);
const state={ready:false,branch:'create',ageMs:0,cycle:0,drawCount:0,errors:[],qualityApproval:false};
window.__barrierProR05Embed=state;
let renderer=null,raf=0,origin=0;
function fail(error){
  state.errors.push(String(error?.stack||error));
  document.getElementById('error').textContent=state.errors.at(-1);
  if(raf)cancelAnimationFrame(raf);
  raf=0;
}
function frame(now){
  try{
    const elapsed=Math.max(0,now-origin);
    state.cycle=Math.floor(elapsed/totalMs);
    let within=elapsed%totalMs,index=0;
    while(index<branches.length-1&&within>=segmentMs[index])within-=segmentMs[index++];
    const branch=branches[index];
    const ageMs=Math.min(within,DURATIONS_MS[branch]);
    renderer.draw({branch,ageMs,hPx:64,background:0,coreEnabled:true,bandMask:1,
      authoritativeActive:branch==='create'||branch==='absorb'});
    state.branch=branch;state.ageMs=ageMs;state.drawCount++;
    if(renderer.errors.length)throw new Error(renderer.errors.join('\n'));
    raf=requestAnimationFrame(frame);
  }catch(error){fail(error);}
}
try{
  renderer=await createBarrierRenderer(canvas);
  state.ready=true;
  origin=performance.now();
  raf=requestAnimationFrame(frame);
}catch(error){fail(error);}
window.addEventListener('pagehide',()=>{
  if(raf)cancelAnimationFrame(raf);
  renderer?.destroy();
},{once:true});
