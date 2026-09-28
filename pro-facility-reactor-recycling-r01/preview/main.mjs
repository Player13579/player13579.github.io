import {TARGETS,FacilityController,MemoryCauseLedger,FacilityAudio,NativeFacilityRenderer} from '../src/index.mjs';
import {project} from '../src/runtime/projection.mjs';
import {routeOptions} from './route.mjs?v=pro-facility-20260928-embed-r1';
const $=id=>document.getElementById(id),route=routeOptions(location.search),{embed,verify}=route;
document.body.classList.toggle('embed',embed);
if(route.target)$('target').value=route.target;
const canvas=$('view');let renderer,controller,context,bus,audio=new FacilityAudio({verify:true});
let offsetCamera=false,lastRaw=null,sequence=0,started=performance.now(),framesSubmitted=0,missing=false,replayTimer=null,replayStopped=false;
const epoch=Date.now()-performance.now();const approval=new WeakMap();const diagnostics=[];
const clock={monotonicMs:()=>performance.now(),serverNowMs:()=>epoch+performance.now(),uncertaintyMs:()=>0};
const target=()=>Object.values(TARGETS).find(x=>x.key===$('target').value);
const receiverAt=(origin,now)=>({x:origin.x+136+(now-started)/1000*20*Number($('speed').value),y:origin.y+5});
const makeController=()=>new FacilityController({serverEpoch:'isolated-preview-session',authenticateAndNormalize:raw=>approval.get(raw)??null,
 ledger:new MemoryCauseLedger(),allowMemoryLedger:true,clock,isPlayerKnown:id=>id==='preview-player',
 getActorAnchor:(id,now)=>missing?null:{playerId:id,world:receiverAt(target().origin,now),heightWorld:64,sampledAtMonotonicMs:now},
 audio:{playOnce:event=>audio.playOnce(event),stopAll:()=>audio.stopAll()},
 dispatchGeneric:()=>diagnostics.push({code:'generic_unexpected_in_target_fixture'}),onDiagnostic:d=>diagnostics.push(d)});
function metadata(){return {display:{backing:[canvas.width,canvas.height],css:[canvas.clientWidth,canvas.clientHeight],devicePixelRatio:window.devicePixelRatio,visualViewportScale:window.visualViewport?.scale??null},isolation:'synthetic receipts; not connected to DVA',verify,framesSubmitted,controller:controller?.stats,audio:audio.stats,
 GPU_submission_is_not_pixel_acceptance:true,adapter:renderer?.adapterInfo,compilation:renderer?.compilation,
 actual_GPU_pixels_and_timing:'not_run',hearing:'not_run',game_event_and_SFX:'not_run'};}
let fixturePipeline,fixtureBind,fixtureBuffer;
async function boot(){
 try{
  renderer=await NativeFacilityRenderer.create(canvas,{onDiagnostic:d=>diagnostics.push(d)});
  const d=renderer.device;const module=d.createShaderModule({code:await (await fetch('./fixture.wgsl')).text()});
  const info=await module.getCompilationInfo();if(info.messages.some(m=>m.type==='error'))throw new Error('fixture WGSL error');
  fixturePipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:'rgba16float',blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]}});
  fixtureBuffer=d.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  fixtureBind=d.createBindGroup({layout:fixturePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:fixtureBuffer}}]});
  controller=makeController();$('activate').disabled=false;$('status').textContent=verify?'verify: 強制無音。技術提出と画素評価は別です。':'通常プレビュー: muteが既定です。';
  requestAnimationFrame(draw);
  if(embed)scheduleEmbedReplay();
 }catch(error){$('status').textContent=`停止: ${error.message} / 実GPU・画素・聴感はnot_run。`;
  window.__facilityProbe={status:'not_run',reason:error.message};$('telemetry').textContent=JSON.stringify(metadata(),null,2);}
}
function draw(now){
 const t=target(),origin=t.origin;const actor=receiverAt(origin,now);
 const view={centerWorld:{x:origin.x+145+(offsetCamera?2300:0),y:origin.y},pixelsPerWorldUnit:1,width:704,height:320,referenceHeightWorld:64};
 let events=controller.sampleFrame();
 if($('inspect').checked){
  const age=Number($('phase').value);const w=receiverAt(origin,started+age);
  events=[{causeKey:'phase-inspection-only',targetKey:t.key,origin,receiver:missing?null:w,heightWorld:64,ageMs:age,playerId:'preview-player'}];
 }
 const src=project(origin,view),dst=project(actor,view),light=$('background').value==='light';
 renderer.device.queue.writeBuffer(fixtureBuffer,0,new Float32Array([704,320,light?1:0,0,...src,...dst]));
 try{
  if(renderer.render(events,view,{background:light?[.82,.84,.85]:[.016,.019,.026],glow:$('glow').checked,reducedMotion:$('reduced').checked,
    beforeEffects:pass=>{pass.setPipeline(fixturePipeline);pass.setBindGroup(0,fixtureBind);pass.draw(3);}}))framesSubmitted++;
  window.__facilityProbe={status:'submitted_not_observed',...metadata()};
 }catch(error){diagnostics.push({code:'render_failed',message:error.message});$('status').textContent=error.message;return;}
 $('telemetry').textContent=JSON.stringify({...metadata(),frame:renderer.lastFrameStats,diagnostics:diagnostics.slice(-5)},null,2);
 requestAnimationFrame(draw);
}
async function submitReceipt(automatic=false){
 if(!controller)return null;started=performance.now();missing=!automatic&&$('eventCase').value==='missing';offsetCamera=!automatic&&$('eventCase').value==='offscreen';
 $('inspect').checked=false;const c=automatic?'normal':$('eventCase').value,delay=c==='delayed'?1300:c==='expired'?2300:0;
 const t=target();const receipt={status:'success',objectId:t.objectId,type:t.type,effectKind:t.effectKind,playerId:'preview-player',
  objectCausalId:`preview-only-${++sequence}`,capturedTime:Math.floor(clock.serverNowMs()-delay),worldOrigin:{...t.origin}};
 const raw=Object.freeze({fixtureId:sequence});approval.set(raw,receipt);lastRaw=raw;
 const results=await Promise.all(Array.from({length:c==='duplicate'?12:1},()=>controller.receive(raw)));
 if(!embed||!automatic)$('status').textContent=results.map(x=>x.status).join(', ');
 else $('status').textContent=`Embed replay / ${t.key}: ${results[0]?.status??'no result'} · verify silent`;
 return results[0]??null;
}
function scheduleEmbedReplay(delay=0){
 if(!embed||replayStopped||document.hidden||!controller)return;
 clearTimeout(replayTimer);
 replayTimer=setTimeout(async()=>{
  replayTimer=null;
  try{await submitReceipt(true);}finally{scheduleEmbedReplay(2600);}
 },delay);
}
$('activate').onclick=()=>submitReceipt(false);
$('repeat').onclick=async()=>{if(lastRaw&&controller)$('status').textContent=JSON.stringify(await controller.receive(lastRaw));};
$('camera').onclick=()=>{offsetCamera=!offsetCamera;};
$('phase').oninput=()=>{$('phaseValue').textContent=`${$('phase').value}ms`;};
$('target').onchange=()=>{started=performance.now();controller?.active.clear();missing=false;lastRaw=null;};
$('reduced').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
$('audio').disabled=verify;
$('audio').onclick=async()=>{
 if(verify)return;
 if(!context){context=new AudioContext();bus=context.createGain();bus.connect(context.destination);
  audio=new FacilityAudio({context,outputBus:bus,getMixState:()=>({muted:$('mute').checked,volume:Number($('volume').value)}),verify:false});}
 await context.resume();syncMix();$('status').textContent='音声バスを有効化。同じreceiptは再発音しません。新しい検査イベントで聴いてください。';
};
function syncMix(){if(bus)bus.gain.setTargetAtTime($('mute').checked?0:Number($('volume').value),context.currentTime,.008);}
$('mute').onchange=syncMix;$('volume').oninput=syncMix;
$('export').onclick=()=>{
 const pixels=$('pixelResult').value,hearing=$('hearingResult').value;
 if((pixels!=='not_run'||hearing!=='not_run')&&(!$('reviewer').value||!$('evidence').value)){alert('実評価の評価者と証拠参照が必要です。');return;}
 if(verify&&hearing!=='not_run'){alert('verifyは無音です。聴感評価を実行済みにできません。');return;}
 const report={...metadata(),recordedAt:new Date().toISOString(),case:{target:$('target').value,background:$('background').value,speed:Number($('speed').value),event:$('eventCase').value},
  observation:{actual_GPU_pixels_and_timing:pixels,hearing,reviewer:$('reviewer').value,evidence:$('evidence').value,notes:$('notes').value}};
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');
 a.href=url;a.download='facility-E-local-observation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
boot();
document.addEventListener('visibilitychange',()=>{
 if(!embed)return;
 if(document.hidden){clearTimeout(replayTimer);replayTimer=null;}else scheduleEmbedReplay();
});
window.addEventListener('pagehide',()=>{
 replayStopped=true;clearTimeout(replayTimer);replayTimer=null;controller?.dispose();
 try{audio.stopAll();}catch{}
 if(context)void context.close();
});
