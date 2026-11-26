(() => {
'use strict';
const doc = document, canvas = doc.querySelector('canvas'), output = doc.querySelector('output'), button = doc.querySelector('button');
const ageLimit = 850; // Same as the ordinary nonlethal app-owned impact receipt.
const targetName = 'main';
const zoom = 1, world = Object.freeze({x:1500,y:900}), clear = {r:0.014,g:0.026,b:0.038,a:1};
let gpu, device, target, shapes, raf=0, timer=0, serial=0, cause=null, closed=false, failed=false, busy=null, boot=null;
let attempts=0, validated=0;
function status(value, label){doc.body.dataset.state=value; output.textContent=label;}
function cancel(){if(raf)cancelAnimationFrame(raf);if(timer)clearTimeout(timer);raf=timer=0;}
function visible(){return !closed&&!failed&&!doc.hidden&&canvas.isConnected;}
function restart(){
  if(!visible()||!gpu)return;
  cancel();cause={id:'impact-r1-'+(++serial),startedAt:performance.now()};
  request();
}
function request(){
  if(!visible()||!cause||raf||busy)return;
  raf=requestAnimationFrame(()=>{raf=0;const task=draw();busy=task;task.catch(fault).finally(()=>{
    if(busy===task)busy=null;if(visible()&&cause)request();
  });});
}
function fault(e){if(closed||failed)return;failed=true;cancel();cause=null;button.disabled=true;status('error',String(e?.message||e));}
function dimensions(){
  const box=canvas.getBoundingClientRect(),width=Math.round(box.width),height=Math.round(box.height);
  if(width<1||height<1)return null;const limit=device.limits.maxTextureDimension2D,dpr=Math.min(window.devicePixelRatio||1,limit/width,limit/height);
  return {kind:'main',width,height,pixelWidth:Math.max(1,Math.round(width*dpr)),pixelHeight:Math.max(1,Math.round(height*dpr))};
}
async function draw(){
  const owned=cause, v=dimensions();
  if(!visible()||!owned||!v)return;
  target.resize(v.pixelWidth,v.pixelHeight);
  const now=performance.now(),age=now-owned.startedAt,alive=age>=0&&age<ageLimit;
  const scene={now,effects:alive?[{id:owned.id,...world,startedAt:owned.startedAt,duration:ageLimit}]:[]};
  const camera={x:world.x-v.width/2,y:world.y-v.height/2};
  const commands=window.plan({scene,camera,zoom,viewport:v,visibility:{allowCull:true,culled:false}});
  let batch; let result; let error;
  device.pushErrorScope('validation');
  try {
    const frame=gpu.beginFrame('Universal Combat Impact R1');
    batch=shapes.enqueue(frame,{...v,target:targetName,clear,commands,label:'world:hit-effects'});
    result=frame.submit();
    attempts++;
    await device.queue.onSubmittedWorkDone();
  } catch(e){error=e;}
  finally {
    try { const validation=await device.popErrorScope(); if(validation)error??=new Error(validation.message); }
    catch(e){error??=e;}
    batch?.destroy();
  }
  if(error)throw error;
  if(!visible()||owned!==cause)return;
  if(alive&&performance.now()-owned.startedAt<ageLimit&&commands.length>0&&result>0){
    validated++;doc.body.dataset.validatedFrames=String(validated);doc.body.dataset.submittedFrames=String(attempts);
    doc.body.dataset.commandCount=String(commands.length);doc.body.dataset.causeId=owned.id;doc.body.dataset.ageMs=String(Math.round(age));
    status('playing','再生中');
  }
  if(!alive){cause=null;timer=setTimeout(()=>{timer=0;restart();},450);}
}
async function init(){
  const owner=await window.DvaWebGPUFrameCore.create();if(closed){owner.destroy();return;}
  gpu=owner;device=owner.device;device.lost.then(info=>{if(!closed)fault(Error(info?.message||'WebGPU device lost'));});
  const initial=dimensions()||{pixelWidth:1,pixelHeight:1};
  target=gpu.registerTarget(targetName,canvas,{width:initial.pixelWidth,height:initial.pixelHeight});
  shapes=window.DvaWebGPUEffectShapes.create({device,format:gpu.format,maxDraws:64});
  button.disabled=false;restart();
}
button.addEventListener('click',restart);
doc.addEventListener('visibilitychange',()=>{if(doc.hidden){cause=null;cancel();}else restart();});
window.addEventListener('pagehide',()=>{closed=true;cause=null;cancel();void Promise.allSettled([boot,busy]).then(()=>{shapes?.destroy();gpu?.destroy();});},{once:true});
boot=init();boot.catch(fault);
})();
