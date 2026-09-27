import {ShotRenderer,requestWebGPU,ShotEngine,ShotAudio,GameClock,PROFILES,VARIANTS} from './src/index.js';
import {fixtureEvent,makeScene} from './preview/fixtures.js';

const heroCamera={x:0,y:0,pixelsPerUnit:3,rotation:0};
const h64Camera={x:0,y:0,pixelsPerUnit:1,rotation:0};
const dwell=1.1;
const $=s=>document.querySelector(s);
const renderers=[];
let engine,audio,clock,selected=VARIANTS[0],epoch=1,lastSlot=-1,sceneDirty=true,bright=false,alive=true;

function refreshScenes(){
  const sceneOptions={receive:true,bright};
  renderers.forEach(({renderer,camera})=>renderer.uploadScene(makeScene(renderer.width,renderer.height,camera,sceneOptions)));
  sceneDirty=false;
}

function enterSlot(slot,now){
  const cycle=Math.floor(slot/VARIANTS.length);
  const nextBright=(cycle%2)===1;
  if(nextBright!==bright){
    bright=nextBright;
    epoch++;
    engine.setRoom({roomId:'shoot-pro-r01-adapter',epoch,now});
    audio.stopAll();
    sceneDirty=true;
  }
  selected=VARIANTS[slot%VARIANTS.length];
  $('#weapon').textContent=PROFILES[selected].title;
  $('#mode').textContent=bright?'明背景':'暗背景';
  const occurredAt=slot*dwell+0.04;
  const id=`shoot-pro-r01/${cycle}/${slot%VARIANTS.length}/${selected}`;
  engine.enqueue(...fixtureEvent({id,variant:selected,occurredAt,roomId:'shoot-pro-r01-adapter',epoch,x:-126,y:0,targetX:132,targetY:0,depth:0.5,pathLimitT:1}));
}

function frame(){
  if(!alive)return;
  try{
    // Sample one execution-time value for both the frame clock and its events.
    // RAF's queued timestamp can predate async WebGPU initialization.
    const frameNow=performance.now()/1000;
    const now=clock.advance(frameNow);
    const slot=Math.floor(now/dwell);
    if(slot>lastSlot){lastSlot=slot;enterSlot(slot,now);}
    const shots=engine.tick(now);
    if(sceneDirty)refreshScenes();
    for(const entry of renderers){
      const visible=entry.hero?shots.filter(s=>s.variant===selected):shots.filter(s=>s.variant===entry.variant);
      entry.renderer.render(visible,entry.camera,{reducedMotion:false});
    }
  }catch(error){
    alive=false;
    document.body.dataset.error='render-failed';
    console.error('Shoot E r0.1 compatibility adapter stopped:',error);
    return;
  }
  requestAnimationFrame(frame);
}

try{
  const gpu=await requestWebGPU();
  const heroRenderer=await ShotRenderer.create($('#hero'),{device:gpu.device,adapterInfo:gpu.info});
  renderers.push({renderer:heroRenderer,camera:heroCamera,hero:true});
  for(const variant of VARIANTS){
    const profile=PROFILES[variant];
    const card=document.createElement('article');
    card.className='card';
    const head=document.createElement('div');
    head.className='card-head';
    head.innerHTML=`<b>${profile.title}</b><span>${Math.round(profile.life*1000)} ms</span>`;
    const canvas=document.createElement('canvas');
    canvas.width=320;canvas.height=64;
    canvas.setAttribute('aria-label',`${profile.title} 320×64 H64`);
    card.append(head,canvas);
    $('#native-grid').append(card);
    const renderer=await ShotRenderer.create(canvas,{device:gpu.device,adapterInfo:gpu.info});
    renderers.push({renderer,camera:h64Camera,variant});
  }
  // Preserve the original source-ID path without autoplay audio unlock.
  audio=new ShotAudio({owner:'shoot-e',standalone:true});
  audio.setListener({x:0,y:0,range:700,panRange:350});
  clock=new GameClock({wallTime:performance.now()/1000});
  engine=new ShotEngine({roomId:'shoot-pro-r01-adapter',epoch,onStart:(shot,age)=>audio.play(shot,age),onRoomChange:()=>audio.stopAll()});
  document.documentElement.dataset.webgpu='ready';
  requestAnimationFrame(frame);
  window.addEventListener('pagehide',()=>{
    alive=false;engine.dispose();audio.dispose();
    for(const {renderer} of renderers)renderer.dispose();
  },{once:true});
}catch(error){
  alive=false;
  document.documentElement.dataset.webgpu='unavailable';
  console.error('Shoot E r0.1 compatibility initialization failed:',error);
}
