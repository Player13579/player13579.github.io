import {ShotRenderer,requestWebGPU,ShotEngine,ShotAudio,BrowserTimebase,PROFILES,VARIANTS} from './src/index.js';
import {fixtureEvent,makeScene} from './preview/fixtures.js';
import {captureH64,selectH64CaptureShot} from './h64-capture.js?v=gallery-v40-shoot-r03';
import {createAdapterAudioGate} from './adapter-audio-gate.js?v=gallery-v40-shoot-r03';

const heroCamera={x:0,y:0,pixelsPerUnit:3,rotation:0};
const h64Camera={x:0,y:0,pixelsPerUnit:1,rotation:0};
const dwell=1.1;
const $=s=>document.querySelector(s);
const renderers=[];
let engine,audio,clock,selected=VARIANTS[0],epoch=1,lastSlot=-1,sceneDirty=true,bright=false,alive=true;
let h64CaptureRequest=null;
const verifyMode=new URLSearchParams(location.search).has('verify');
let audioGate;

function refreshScenes(){
  const sceneOptions={receive:true,bright};
  renderers.forEach(({renderer,camera})=>renderer.uploadScene(makeScene(renderer.width,renderer.height,camera,sceneOptions)));
  sceneDirty=false;
}

function enterSlot(slot, now){
  const cycle=Math.floor(slot/VARIANTS.length);
  const nextBright=(cycle%2)===1;
  if(nextBright!==bright){
    bright=nextBright;
    epoch++;
    engine.setRoom({roomId:'shoot-pro-r03-adapter',epoch,now});
    audio.stopAll();
    sceneDirty=true;
  }
  selected=VARIANTS[slot%VARIANTS.length];
  $('#weapon').textContent=PROFILES[selected].title;
  $('#mode').textContent=bright?'明背景':'暗背景';
  const occurredAt=slot*dwell+0.04;
  const id=`shoot-pro-r03/${cycle}/${slot%VARIANTS.length}/${selected}`;
  engine.enqueue(...fixtureEvent({id,variant:selected,occurredAt,roomId:'shoot-pro-r03-adapter',epoch,x:-126,y:0,targetX:132,targetY:0,depth:0.5,pathLimitT:1}));
}

function frame(timestamp){
  if(!alive)return;
  try{
    const now=clock.frame(timestamp);
    const slot=Math.floor(now/dwell);
    if(slot>lastSlot){lastSlot=slot;enterSlot(slot,now);}
    const shots=engine.tick(now);
    if(sceneDirty)refreshScenes();
    for(const entry of renderers){
      const visible=entry.hero?shots.filter(s=>s.variant===selected):shots.filter(s=>s.variant===entry.variant);
      entry.renderer.render(visible,entry.camera,{reducedMotion:false});
    }
    if(h64CaptureRequest){
      const request=h64CaptureRequest;
      if(now>=request.deadline){h64CaptureRequest=null;request.reject(new Error('H64 capture timed out before requested weapon age'));}
      else {
        const entry=renderers.find(item=>!item.hero&&item.variant===request.variant);
        const shot=entry&&selectH64CaptureShot(shots,request.variant,request.targetAgeMs,request.toleranceMs);
        if(shot){
          h64CaptureRequest=null;
          const rect=entry.renderer.canvas.getBoundingClientRect();
          captureH64(entry.renderer,shot,{variant:request.variant,background:bright?'bright':'dark',canvasRect:{width:rect.width,height:rect.height},frame:clock.frames})
            .then(request.resolve,request.reject);
        }
      }
    }
  }catch(error){
    alive=false;
    document.body.dataset.error='render-failed';
    console.error('Shoot E r0.3 adapter stopped:',error);
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
  // Keep the shipped event→engine→audio ownership path. Autoplay never unlocks Web Audio;
  // verification mode is muted by the host browser policy, so this preview stays silent.
  audio=new ShotAudio({owner:'shoot-e',standalone:true});
  audio.setListener({x:0,y:0,range:700,panRange:350});
  clock=new BrowserTimebase();
  audioGate=createAdapterAudioGate({verify:verifyMode,unlock:()=>audio.unlock()});
  engine=new ShotEngine({roomId:'shoot-pro-r03-adapter',epoch,onStart:(shot,age)=>{if(audioGate.enabled)audio.play(shot,age);},onRoomChange:()=>audio.stopAll()});
  const audioButton=document.createElement('button');audioButton.type='button';audioButton.textContent='音を有効化';audioButton.setAttribute('aria-label','音を有効化');
  const audioStatus=document.createElement('span');audioStatus.setAttribute('role','status');audioStatus.textContent=verifyMode?'verify · 音声0固定':'操作後、新しい射撃から再生';
  Object.assign(audioButton.style,{marginLeft:'12px',padding:'4px 9px',color:'#e9edf3',background:'#202733',border:'1px solid #414c5c',borderRadius:'4px',font:'inherit',fontSize:'10px',cursor:'pointer'});
  document.querySelector('header').append(audioButton,audioStatus);
  document.documentElement.dataset.verifyMuted=String(verifyMode);
  if(verifyMode)audioButton.hidden=true;
  audioButton.addEventListener('click',async()=>{try{if(await audioGate.enableFromGesture()){audioButton.textContent='音声有効 / 次の射撃から';audioStatus.textContent='有効化前の射撃は再生しません';}else if(!verifyMode)audioStatus.textContent='音声を有効化できません。再度操作してください。';}catch(error){audioStatus.textContent=`音声 not_run: ${error.message}`;}});
  window.__shootPreview = () => ({ frames: clock.frames, slot: lastSlot, variant: selected,
    active: engine.active.length, pending: engine.pending.length, stats: { ...engine.stats },
    error: document.body.dataset.error || null });
  window.__shootPreview.captureH64 = ({variant,targetAgeMs=80,toleranceMs=24,timeoutMs=7000}={}) => {
    if(!VARIANTS.includes(variant))return Promise.reject(new TypeError('unknown weapon variant'));
    if(h64CaptureRequest)return Promise.reject(new Error('an H64 capture is already pending'));
    if(!Number.isFinite(targetAgeMs)||!Number.isFinite(toleranceMs)||toleranceMs<0||!Number.isFinite(timeoutMs)||timeoutMs<=0)return Promise.reject(new TypeError('invalid H64 capture timing'));
    return new Promise((resolve,reject)=>{h64CaptureRequest={variant,targetAgeMs,toleranceMs,deadline:clock.time+timeoutMs/1000,resolve,reject};});
  };
  document.documentElement.dataset.webgpu='ready';
  requestAnimationFrame(frame);
  window.addEventListener('pagehide',()=>{
    alive=false;engine.dispose();audio.dispose();
    for(const {renderer} of renderers)renderer.dispose();
  },{once:true});
}catch(error){
  alive=false;
  document.documentElement.dataset.webgpu='unavailable';
  console.error('Shoot E r0.3 WebGPU initialization failed:',error);
}
