import {LIFE_MS,TaserController} from './src/contract.js';
import {ContactRenderer} from './src/renderer.js';
import {ContactSound} from './src/sound.js';

const canvas=document.querySelector('#effect');
const failure=document.querySelector('#failure');
const verify=new URLSearchParams(location.search).has('verify');
const sound=new ContactSound({verify});
const renderer=new ContactRenderer(canvas);
let sequence=0,startAt=0,raf=0,disposed=false;
const access=()=>({disclosed:true,visible:true,effectAllowed:true,alive:true});
const controller=new TaserController({resolveAccess:access,sound});

function issue(){
  startAt=performance.now();
  controller.ingest({type:'action-taser',id:`gallery-local-${++sequence}`,
    playerId:'fixture-source',targetId:'fixture-receiver',x:0,y:0,radius:95,
    variant:'',targetX:null,targetY:null},startAt);
}
function records(age){
  const w=renderer.width/renderer.pixelRatio,h=renderer.height/renderer.pixelRatio;
  const points=[
    {x:w*.25,y:h*.245,scale:1,clip:[0,0,w*.5,h*.43]},
    {x:w*.75,y:h*.245,scale:1,clip:[w*.5,0,w,h*.43]},
    {x:w*.25,y:h*.725,scale:3,clip:[0,h*.43,w*.5,h]},
    {x:w*.75,y:h*.725,scale:3,clip:[w*.5,h*.43,w,h]}
  ];
  return points.map(p=>({...p,ageMs:age,reduced:false,showTarget:true,
    effect:age<LIFE_MS,partialOccluder:false}));
}
function frame(now){
  if(disposed||!renderer.ready)return;
  try{
    if(now-startAt>=1800)issue();
    controller.tick(now);
    // Always present directly into the native WebGPU canvas. No readback path.
    renderer.render(records(now-startAt),{world:true,bloom:true,receiver:true});
    raf=requestAnimationFrame(frame);
  }catch(error){fail(error);}
}
function fail(error){
  failure.textContent=`WebGPU replay failed: ${error instanceof Error?error.message:String(error)}`;
  failure.classList.add('show');cancelAnimationFrame(raf);
  globalThis.__taserReplay={status:'failed',message:failure.textContent};
}
async function resize(){
  if(!renderer.ready)return;
  const r=canvas.getBoundingClientRect();
  renderer.resize(r.width,r.height,Math.min(devicePixelRatio||1,2));
}
addEventListener('pointerdown',()=>{if(!verify)sound.unlockFromGesture().catch(()=>{});},{passive:true});
addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);controller.dispose();sound.dispose();renderer.dispose();},{once:true});

try{
  await renderer.init();
  await resize();
  new ResizeObserver(resize).observe(canvas);
  issue();
  globalThis.__taserReplay={status:'running',version:'0.9.0-preview',verify,
    renderer:'native-webgpu-canvas',adapter:renderer.adapterInfo,
    get diagnostics(){return renderer.diagnostics();},get sequence(){return sequence;}};
  raf=requestAnimationFrame(frame);
}catch(error){fail(error);}
