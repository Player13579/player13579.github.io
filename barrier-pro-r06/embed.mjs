// Technical gallery wrapper. Source model, WGSL, times, panels and core-light
// setting are the Pro r0.6 preview's own; verification playback has no audio.
import {createBarrierRenderer} from './barrier-pro-renderer.mjs';
import {EVENTS} from './barrier-pro-model.mjs';

const panels=[
  {id:'dark64',background:'dark',H:64},
  {id:'light64',background:'light',H:64},
  {id:'dark100',background:'dark',H:100},
  {id:'light100',background:'light',H:100}
];
const branches=['create','absorb','fracture','bust'];
const segments=branches.map(branch=>EVENTS[branch].durationMs+220);
const cycleMs=segments.reduce((sum,length)=>sum+length,0);
const state={ready:false,branch:'create',ageMs:0,cycle:0,drawCount:0,
  errors:[],qualityApproval:false,audioEnabled:false};
window.__barrierProR06Embed=state;
let renderers=[],raf=0,origin=0;
function fail(error){
  state.errors.push(String(error?.stack||error));
  document.getElementById('error').textContent=state.errors.at(-1);
  document.body.dataset.previewStatus='failed';
  if(raf)cancelAnimationFrame(raf);
  raf=0;
}
function frame(now){
  try{
    const elapsed=Math.max(0,now-origin);
    state.cycle=Math.floor(elapsed/cycleMs);
    let within=elapsed%cycleMs,index=0;
    while(index<branches.length-1&&within>=segments[index])within-=segments[index++];
    const branch=branches[index];
    const ageMs=Math.min(within,EVENTS[branch].durationMs);
    for(const panel of renderers){
      panel.renderer.render({event:branch,tMs:ageMs,
        receiverHeightPx:panel.H,background:panel.background,coreLightEnabled:true});
      if(panel.renderer.diagnostics.length)
        throw new Error(panel.renderer.diagnostics.join('\n'));
    }
    state.branch=branch;state.ageMs=ageMs;state.drawCount++;
    if(!state.ready){state.ready=true;document.body.dataset.previewStatus='ready';}
    raf=requestAnimationFrame(frame);
  }catch(error){fail(error);}
}
try{
  renderers=await Promise.all(panels.map(async panel=>({
    ...panel,renderer:await createBarrierRenderer(document.getElementById(panel.id),{scale:2})
  })));
  origin=performance.now();
  raf=requestAnimationFrame(frame);
}catch(error){fail(error);}
window.addEventListener('pagehide',()=>{
  if(raf)cancelAnimationFrame(raf);
  for(const panel of renderers)panel.renderer.device.destroy();
},{once:true});
