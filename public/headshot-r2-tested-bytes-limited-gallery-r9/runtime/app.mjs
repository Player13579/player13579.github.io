import {planContact,projectContact,previewEvent,DURATION_MS} from './contact.mjs';
import {createRenderer} from './renderer.mjs';
import {createContactAudio} from './sfx.mjs';
const canvas=document.querySelector('#surface'),status=document.querySelector('#status');
const controls={play:document.querySelector('#play'),stop:document.querySelector('#stop'),
  reduced:document.querySelector('#reduced'),observer:document.querySelector('#observer'),age:document.querySelector('#age')};
const verify=new URL(location.href).searchParams.has('verify');
const audio=createContactAudio({verify});
let renderer=null,token=0,run=0,raf=0,event=null,ready=false,retired=false,lastReceipt=null,generation=0,lastSize='',heldAge=null;
let sourceGain=1,layer=0;
const currentAge=()=>heldAge??(event?performance.now()-event.startedAt:420);
function geometry() {
  const rect=canvas.getBoundingClientRect(),ratio=window.devicePixelRatio||1;
  const pixelWidth=Math.max(1,Math.round(rect.width*ratio)),pixelHeight=Math.max(1,Math.round(rect.height*ratio));
  const size=`${pixelWidth}:${pixelHeight}`;if(size!==lastSize){generation++;lastSize=size;}
  const pixelsPerWorldUnit=pixelHeight/480;
  return {pixelWidth,pixelHeight,pixelsPerWorldUnit,targetId:'private-contact-surface',generation,
    project:point=>({x:pixelWidth/2+point.x*pixelsPerWorldUnit,y:pixelHeight/2+point.y*pixelsPerWorldUnit})};
}
function show(receipt) {lastReceipt=receipt;status.textContent=JSON.stringify({version:'gunner-headshot-unified-sol61-r2',
  causeKind:'explicit preview fixture; not a gameplay event',verify,receipt},null,2);}
async function drawAt(ageMs,playSound=false,clearFor=null) {
  const g=geometry();
  const plan=event?planContact({event,nowMs:event.startedAt+ageMs,
    target:{id:event.targetId,visible:true},reducedMotion:controls.reduced.checked}):null;
  const receipt=await renderer.draw(projectContact(plan,g),g,{observer:controls.observer.checked,sourceGain,layer,clearFor:plan?null:clearFor??event});show(receipt);
  if(playSound)audio.play(receipt).catch(error=>{document.querySelector('#audio-status').textContent=`Audio unavailable: ${error.message}`;});
  return receipt;
}
async function clear() {token++;cancelAnimationFrame(raf);raf=0;heldAge=null;const clearFor=event;event=null;await audio.stop();if(ready&&!retired)await drawAt(420,false,clearFor);}
async function replay() {
  await clear();if(retired||!ready)return;
  const owned=++token;event=previewEvent(performance.now(),String(++run));
  const frame=async()=>{
    raf=0;
    if(owned!==token||retired)return;
    const age=performance.now()-event.startedAt;
    try {await drawAt(age,true);}catch(error){fail(error);return;}
    if(owned!==token||retired)return;
    if(age>=DURATION_MS){event=null;raf=0;return;}
    raf=requestAnimationFrame(frame);
  };await frame();
}
function fail(error) {token++;cancelAnimationFrame(raf);raf=0;ready=false;controls.play.disabled=true;
  status.textContent=`WebGPU failure: ${error.stack||error.message}`;audio.stop();}
controls.play.addEventListener('click',()=>{audio.unlock().catch(error=>{document.querySelector('#audio-status').textContent=`Audio unavailable: ${error.message}`;});replay().catch(fail);});controls.stop.addEventListener('click',()=>clear().catch(fail));
controls.age.addEventListener('input',async()=>{if(!ready||retired)return;token++;cancelAnimationFrame(raf);
  raf=0;heldAge=Number(controls.age.value);await audio.stop();event??=previewEvent(performance.now(),`inspect-${++run}`);await drawAt(heldAge).catch(fail);});
for(const c of [controls.reduced,controls.observer])c.addEventListener('change',()=>{if(ready&&!retired)drawAt(currentAge()).catch(fail);});
const resize=new ResizeObserver(()=>{if(ready&&!retired)drawAt(currentAge()).catch(fail);});resize.observe(canvas);
async function dispose() {if(retired)return;await clear();retired=true;ready=false;resize.disconnect();await audio.dispose();await renderer?.dispose();}
window.addEventListener('pagehide',()=>{dispose().catch(()=>{});},{once:true});
window.addEventListener('visibilitychange',()=>{if(document.hidden&&ready)clear().catch(fail);});
window.headshotPreview={replay,clear,dispose,
  setOptics:async options=>{if(!ready||retired)throw new Error('Preview not ready');
    const gain=options.sourceGain??sourceGain,nextLayer=options.layer??layer;
    if(!Number.isFinite(gain)||gain<0||gain>4||![0,1,2].includes(nextLayer))throw new TypeError('Invalid optical controls');
    sourceGain=gain;layer=nextLayer;
    if(options.observer!==undefined)controls.observer.checked=Boolean(options.observer);
    if(options.reduced!==undefined)controls.reduced.checked=Boolean(options.reduced);
    return drawAt(currentAge());},
  hold:async age=>{if(!ready)throw new Error('Preview not ready');if(!Number.isFinite(age)||age<0||age>420)throw new RangeError('Inspect age must be 0..420');
    token++;cancelAnimationFrame(raf);raf=0;heldAge=age;await audio.stop();
    event??=previewEvent(performance.now(),`inspect-${++run}`);return drawAt(age);},
  snapshot:()=>({ready,retired,active:lastReceipt?.active??false,hasSource:!!event,heldAge,rafPending:!!raf,
    optics:{sourceGain,layer,observer:controls.observer.checked,reduced:controls.reduced.checked},lastReceipt,diagnostics:renderer?.diagnostics})};
try {renderer=await createRenderer(canvas);if(retired){await renderer.dispose();}else{ready=true;await clear();controls.play.disabled=false;controls.stop.disabled=false;}}
catch(error){fail(error);}
