import {EFFECTS,EventLedger} from './contract.mjs';
import {ActorClock,LatestSubmissionGate} from './actor-clock.mjs';
import {sampleEffect} from './sampler.mjs';
import {ERenderer} from './gpu.mjs';
import {ActorAudio} from './audio.mjs';
const $=s=>document.querySelector(s),eventId=document.body.dataset.effect,spec=EFFECTS[eventId];
const params=new URLSearchParams(location.search);
if(params.has('embed'))$('.preview').classList.add('compact');
const clock=new ActorClock(),ledger=new EventLedger(),audio=new ActorAudio(clock);
let sequence=0,lastEvent=null,auto=true,manualAge=null,delayMs=0,background=Math.max(0,Math.min(1,Number(params.get('background')??0))),scale=1,reduced=false;
const verificationMode=params.has('verify');
if(verificationMode)audio.setMuted(true);
let renderer,gate,stopped=false,lastEmit=-1e9,frameId=0,lastStatus=0,audioUnlocking=false;
const session=`preview-${eventId}-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
function makeEvent({start=clock.now(),causeId=`${session}-${++sequence}`,targetId=$('#target')?.value??'',x=0,y=0,playerId='preview-actor-01'}={}){
  const e={eventId,causeId,actorStartMs:start,x,y,playerId,radius:spec.radius,lifetimeActorMs:1200};
  if(eventId==='action-ninjutsu-focus')e.targetId=targetId;
  return e;
}
function accept(e){
  const result=ledger.accept(e,clock.now());
  if(result.accepted){if(!verificationMode&&audio.enabled&&!audioUnlocking)audio.accept(result.event);lastEvent=result.event;lastEmit=clock.now();}
  $('#receipt').textContent=`${result.reason} · ${e.causeId}
${eventId==='action-ninjutsu-focus'?`targetId=${JSON.stringify(e.targetId)} / `:''}start=${e.actorStartMs.toFixed(1)} actor-ms`;
  return result;
}
function emit(options={}){
  try{return accept(makeEvent(options));}catch(e){$('#receipt').textContent=`入力拒否: ${e.message}`;return null;}
}
function snapshot(){
  const actorNowMs=manualAge??clock.now();
  const events=manualAge===null?ledger.active(actorNowMs):[makeEvent({start:0,causeId:'inspection-only-no-audio'})];
  const samples=events.map(e=>sampleEffect(e,actorNowMs,{reducedMotion:reduced})).filter(s=>s.active);
  return {actorNowMs,samples,scale,background,fixture:!params.has('no-fixture'),observation:$('#obs')?.checked??true,localLight:true,camera:[0,0]};
}
function renderError(error){
  $('#fatal').hidden=false;$('#fatal').textContent=error.message??String(error);$('#gpu-status').textContent='GPU NOT RUN / ERROR';
}
function resize(){const rect=$('canvas').getBoundingClientRect();renderer?.resize(rect.width,rect.height,Math.min(devicePixelRatio||1,2));}
function frame(wall){
  if(stopped)return;
  if(auto&&manualAge===null&&clock.rate>0&&clock.now()-lastEmit>=1100)emit();
  audio.sync();
  gate?.request(snapshot); // 待機終了後にこの関数を呼ぶ。ここで時刻を捕獲しない。
  if(wall-lastStatus>100){
    const snap=snapshot(),sample=snap.samples.at(-1);
    $('#phase').textContent=sample?`${sample.phase}  ${Math.round(sample.ageActorMs)} / 1200 actor-ms · active=${snap.samples.length} · submitted=${gate?.count??0}`:`finite boundary / active=0 · submitted=${gate?.count??0}`;
    $('#progress').style.width=`${sample?sample.ageActorMs/12:0}%`;
    if(manualAge===null)$('#scrub').value=sample?.ageActorMs??1200;
    $('#clock-status').textContent=`actor=${snap.actorNowMs.toFixed(0)} ms · rate=${clock.rate.toFixed(2)} · active=${snap.samples.length} · submitted=${gate?.count??0}`;
    const audioStatus=verificationMode?'SFX MUTED':audio.enabled&&!audio.muted?'SFX READY':'SFX WAITING FOR GESTURE';
    $('#gpu-status').textContent=`LIVE ADAPTER: ${renderer?.adapter?.info?.description||renderer?.adapter?.info?.vendor||'available'} · ${audioStatus}`;
    lastStatus=wall;
  }
  frameId=requestAnimationFrame(frame);
}
async function unlockProAudio(event){
  if(verificationMode||audio.enabled||audioUnlocking||!event.isTrusted)return;
  audioUnlocking=true;
  document.removeEventListener('pointerdown',unlockProAudio);
  document.removeEventListener('keydown',unlockProAudio);
  // Discard all pre-gesture causes before the Pro audio engine replays its pending map.
  audio.events.clear();
  try{await audio.enable();}
  catch(e){$('#receipt').textContent=`音声未実行: ${e.message}`;}
  finally{audioUnlocking=false;}
}
if(!verificationMode){
  document.addEventListener('pointerdown',unlockProAudio,{once:true});
  document.addEventListener('keydown',unlockProAudio,{once:true});
}
$('#audio').onclick=async()=>{
  if(verificationMode){audio.setMuted(true);return;}
  if(!audio.enabled)await unlockProAudio({isTrusted:true});
};
$('#pause').onclick=()=>{
  manualAge=null;clock.setRate(clock.rate===0?Number($('#rate').value):0);audio.sync();$('#pause').textContent=clock.rate===0?'再開':'停止';
};
$('#replay').onclick=()=>{manualAge=null;clock.setRate(Number($('#rate').value));audio.sync();emit();};
$('#overlap').onclick=()=>{manualAge=null;const now=clock.now();emit({start:now-360});emit({start:now-180});emit({start:now});};
$('#duplicate').onclick=()=>{if(lastEvent)accept(lastEvent);};
$('#late').onclick=()=>{manualAge=null;emit({start:clock.now()-900});};
$('#background').onchange=e=>{background=Number(e.target.value);};
$('#size').onchange=e=>{scale=e.target.value==='actor64'?1:e.target.value==='envelope64'?64/(2*spec.radius):2;$('#dimension').textContent=e.target.value==='actor64'?'ACTOR FIXTURE H64 CSS PX':e.target.value==='envelope64'?'FULL E ENVELOPE H64 CSS PX':'2× INSPECTION / NOT H64';};
$('#rate').onchange=e=>{manualAge=null;clock.setRate(Number(e.target.value));audio.sync();};
$('#delay').onchange=e=>{delayMs=Number(e.target.value);};
$('#motion').checked=reduced;$('#motion').onchange=e=>{reduced=e.target.checked;};
$('#loop').onchange=e=>{auto=e.target.checked;};
$('#scrub').oninput=e=>{manualAge=Number(e.target.value);clock.setRate(0);audio.sync();$('#pause').textContent='再開';};
$('#target')?.addEventListener('change',()=>{ $('#receipt').textContent='targetIdは次のイベントの受信値だけに反映。造形・色・SFXは変えません。'; });
async function boot(){
  try{
    renderer=await ERenderer.create($('canvas'),{onLost:renderError});resize();
    const info=renderer.adapter.info;$('#gpu-status').textContent=`LIVE ADAPTER: ${info?.description||info?.vendor||'available'} / 品質承認ではありません`;
    gate=new LatestSubmissionGate({delay:()=>new Promise(resolve=>setTimeout(resolve,delayMs)),submit:s=>renderer.draw(s),onError:renderError});
    const ro=new ResizeObserver(resize);ro.observe($('canvas'));
  }catch(e){renderError(e);}
  emit();requestAnimationFrame(frame);
}
window.DVA_ELab={eventId,clock,ledger,audio,get renderer(){return renderer;},makeEvent,accept,snapshot,
  inspectAt:async(age,{bright=0,compact=false,overlap=1,targetId='',observation=true,fixture=true}={})=>{
    if(!renderer)throw new Error('GPU未起動');
    auto=false;stopped=true;cancelAnimationFrame(frameId);gate?.dispose();await renderer.device.queue.onSubmittedWorkDone();manualAge=age;clock.setRate(0);audio.sync();
    const samples=Array.from({length:overlap},(_,i)=>sampleEffect(makeEvent({start:0,causeId:`gpu-test-${i}`,targetId}),age));
    const pixels=await renderer.draw({actorNowMs:age,samples:samples.filter(s=>s.active),background:bright,scale:compact?64/(2*spec.radius):1,fixture,observation},{readback:true});
    return {width:renderer.canvas.width,height:renderer.canvas.height,pixels:Array.from(pixels),format:'RGBA8'};
  }
};
addEventListener('pagehide',()=>{stopped=true;cancelAnimationFrame(frameId);gate?.dispose();renderer?.destroy();void audio.destroy();});
boot();
