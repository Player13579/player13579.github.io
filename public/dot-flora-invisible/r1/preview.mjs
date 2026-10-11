import {createRenderer} from './renderer.mjs';
import {plan,normalizeRawEvent} from './plan.mjs';
import {createPlayback} from './playback.mjs';
import {makeBuffer} from './sfx.mjs';
const canvas=document.querySelector('canvas'),status=document.querySelector('#status');
const verify=new URL(location.href).searchParams.has('verify');
let renderer,device,preparing=null,playback,event,raf=0,serial=0,closed=false,controlEpoch=0,frameWork=Promise.resolve();
const player={id:'preview-self',x:490,y:358,alive:true,invisible:true};
const viewport={kind:'main',width:980,height:620,pixelWidth:980,pixelHeight:620};
const clock=()=>performance.now();
async function prepare(){
  if(renderer)return;if(preparing)return preparing;
  preparing=(async()=>{
    if(!navigator.gpu)throw new Error('WebGPUが必要です');
    const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('GPU adapterなし');
    device=await adapter.requestDevice();
    if(closed){device.destroy();return;}
    const context=canvas.getContext('webgpu'),format=navigator.gpu.getPreferredCanvasFormat();
    context.configure({device,format,alphaMode:'opaque'});
    renderer=createRenderer({device,context,format,width:980,height:620});
    const diagnostics=await renderer.compilationInfo();
    if(diagnostics.some(d=>d.messages.some(m=>m.type==='error')))throw new Error('shader compilation error');
    device.lost.then(info=>{if(!closed){cancelAnimationFrame(raf);status.textContent='GPU lost: '+info.message;}});
  })();try{await preparing;}finally{preparing=null;}
}
function ensurePlayback(){
  if(playback)return;
  const Audio=window.AudioContext||window.webkitAudioContext;
  const audioContext=verify||!Audio?null:new Audio();
  playback=createPlayback({clock,audioContext,createAudioBuffer:makeBuffer,verify,onState:s=>{
    if(s.event.includes('error')||s.event.includes('refused'))status.textContent='音声: '+s.event+'（映像は継続）';
  }});
  playback.setMuted(verify||document.querySelector('#muted').checked);
}
function draw(){frameWork=renderFrame();return frameWork;}
async function renderFrame(){
  if(closed||!renderer||!playback)return;
  const snap=playback.snapshot();if(!snap.active){await renderer.clear();status.textContent='終了';return;}
  const submittedAt=snap.sourceOrigin+snap.ageMs;
  const p=plan({effect:event,player,viewerId:player.id,now:submittedAt,phase:'playing',camera:{x:0,y:0},zoom:1,viewport,reducedMotion:document.querySelector('#reduced').checked});
  if(!p)return;
  try{
    const receipt=await renderer.render(p),completedAt=clock();
    if(closed||snap.generation!==playback.snapshot().generation||snap.state!==playback.snapshot().state)return;
    window.__floraCandidate={...snap,receipt,completedAt,verification:verify,quality:'not_run'};
    if(snap.state==='playing')void playback.completed({causeId:snap.causeId,generation:snap.generation,sourceOrigin:snap.sourceOrigin,submittedAt,completedAt,ageAtSubmit:snap.ageMs});
    if(playback.snapshot().state==='playing')raf=requestAnimationFrame(draw);
    else if(!playback.snapshot().active)await renderer.clear();
    status.textContent=snap.state+' '+Math.round(snap.ageMs)+'ms · GPU完了';
  }catch(error){cancelAnimationFrame(raf);status.textContent='描画失敗: '+error.message;}
}
document.querySelector('#start').onclick=async()=>{
  const epoch=++controlEpoch;cancelAnimationFrame(raf);ensurePlayback();void playback.unlockFromGesture();
  try{await prepare();await frameWork;if(closed||epoch!==controlEpoch)return;playback.begin('preview-'+(++serial));const snap=playback.snapshot();
    event=normalizeRawEvent({id:snap.causeId,type:'flora-invisible',playerId:player.id,viewerId:player.id,at:Date.now(),durationMs:1600},snap.sourceOrigin);void draw();
  }catch(e){status.textContent='準備失敗: '+e.message;}
};
document.querySelector('#stop').onclick=()=>{controlEpoch++;cancelAnimationFrame(raf);playback?.stop();status.textContent='停止（最終描画を保持）';};
document.querySelector('#hold').onclick=async()=>{controlEpoch++;cancelAnimationFrame(raf);if(playback?.hold(800)){await frameWork;void draw();}};
document.querySelector('#muted').onchange=e=>playback?.setMuted(verify||e.target.checked);
document.querySelector('#reduced').onchange=()=>{if(playback?.snapshot().state==='held')void draw();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);playback?.stop();}});
addEventListener('pagehide',()=>{closed=true;cancelAnimationFrame(raf);playback?.dispose();void renderer?.dispose().then(()=>device?.destroy());},{once:true});
