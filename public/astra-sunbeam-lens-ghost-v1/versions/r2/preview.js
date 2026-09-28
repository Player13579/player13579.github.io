import {createRenderer,VERSION,DURATION,ghostCenters} from './sunbeam.js';
import {createSound} from './sfx.js';
const params=new URLSearchParams(location.search),verify=params.has('verify'),canvas=document.querySelector('canvas');
if(params.has('embed'))document.body.classList.add('embed');
const sound=createSound({verify});document.querySelector('#sound').disabled=verify;
let light=params.get('background')==='light',fixed=params.has('phase')?+params.get('phase'):null;
const zoom=+(params.get('zoom')||1),dpr=+(params.get('dpr')||devicePixelRatio||1),rate=+(params.get('rate')||1);
const width=640*zoom,height=320*zoom,source=[100*zoom,146*zoom],target=[530*zoom,102*zoom],center=[320*zoom,160*zoom];
canvas.style.width=width+'px';canvas.style.height=height+'px';let renderer,start=performance.now(),last=null,frames=[],raf=0;
const state={ready:false,version:VERSION,renderer:'webgpu',h64Reference:64*zoom,verify,audioLocked:verify,time:0,errors:[]};
window.__sunbeamSnapshot=()=>({...state,submissions:renderer?.submissions||0,compilation:renderer?.compilation||[],gpuErrors:renderer?.errors||[],frames,source,target,center,ghosts:ghostCenters(source,center)});
function draw(t){state.time=t;renderer.render({time:t,width,height,dpr,zoom,source,target,center,light,ghost:!params.has('ghostOff')});}
window.__sunbeamSetPhase=t=>{fixed=t;draw(t)};window.__sunbeamGpuDone=()=>renderer.done();
document.querySelector('#replay').onclick=()=>{fixed=null;start=performance.now()};document.querySelector('#background').onclick=()=>{light=!light;draw(state.time)};document.querySelector('#sound').onclick=()=>sound.play('manual-'+performance.now());
try {renderer=await createRenderer(canvas);state.ready=true;draw(fixed??0);document.querySelector('#status').textContent=verify?'検証モード · 強制無音':'WebGPU';
 const step=now=>{if(fixed===null){let t=((now-start)/1000*rate)%2.5;draw(t);if(last!==null)frames.push({wall:now/1000,time:t,gap:(now-last)/1000});if(frames.length>900)frames.shift();last=now}raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step);
}catch(e){state.errors.push(String(e));document.querySelector('#status').textContent=String(e)}
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);renderer?.destroy();sound.dispose()},{once:true});
