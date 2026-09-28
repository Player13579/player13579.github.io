import { CONTRACT, SharedMediaClock, ManaRenderer, ManaGainRuntime, OneShotAudio, canvasVisible } from './index.js';
const $=id=>document.getElementById(id);
const status=$('status'), log=$('log'), canvasIds=['dark','light','zoomdark','zoomlight'];
const canvases=canvasIds.map($), renderers=[];
const isVerify=new URLSearchParams(location.search).has('verify'); $('verify').checked=isVerify;
const audio=new OneShotAudio({verify:isVerify});
const media=new SharedMediaClock(()=>audio.context);
let session=1, serial=0, runtime, scrubbing=false, running=true, scheduleSerial=0, lastBatch=0, nextCycle=0;
const acc2=()=>({state:$('rate').value,movementEffective:$('rate').value==='active'});
const events=[];
function player() {
  const state=$('visibility').value;
  return {id:'recipient-1',roomId:'gallery',sessionId:String(session),alive:state!=='dead',present:state!=='left',
    inVent:state==='vent',invisible:state==='invisible',visibleToViewer:state!=='invisible',opacity:state==='invisible'?0:1,
    onScreen:state!=='offscreen',world:{x:0,y:0},acc2:acc2()};
}
function view() {return {visible:document.visibilityState==='visible'&&canvases.some(canvasVisible),muted:$('mute').checked,verify:$('verify').checked||isVerify||scrubbing,reducedMotion:$('reduced').checked};}
function scale() {return $('scale').value==='character'?CONTRACT.h64CharacterScale:CONTRACT.h64EnvelopeScale;}
function audit(e) {events.push(e); if(events.length>32)events.shift(); log.textContent=events.map(e=>`${e.id ?? '-'}  ${e.action}: ${e.reason}`).join('\n');}
function resetScope() {scheduleSerial++; session++; runtime.resetScope('gallery',String(session)); nextCycle=media.now()+.25;}
function emit(source='map-object') {
  if(scrubbing) return;
  const now=media.now();
  const event={id:`gallery:${session}:${++serial}`,playerId:'recipient-1',ownerPlayerId:'recipient-1',roomId:'gallery',sessionId:String(session),
    type:'gain-mana',effectKind:'mana',confirmed:true,discrete:true,naturalRegen:false,source,mysteryKind:source==='Mystery'?'mana-surge':undefined,
    manaBefore:10,manaAfter:11,expiresAt:now+($('visibility').value==='expired'?-1:8)};
  runtime.accept(event); lastBatch=now; nextCycle=now+CONTRACT.duration+.65;
}
function startSingle() {
  scrubbing=false; scheduleSerial++; emit();
}
function burst() {
  scrubbing=false; const token=++scheduleSerial; emit();
  [90,200].forEach((ms,i)=>setTimeout(()=>{if(token===scheduleSerial && view().visible)emit(i?'Mystery':'map-object');},ms));
}
try {
  const first=await ManaRenderer.create(canvases[0],{onLost:()=>{runtime?.dispose();status.textContent='WebGPU device lost — 視覚・SFXを停止しました。再読込してください。';}});
  renderers.push(first);
  for(let i=1;i<canvases.length;i++) renderers.push(await ManaRenderer.create(canvases[i],{device:first.device}));
  runtime=new ManaGainRuntime({roomId:'gallery',sessionId:String(session),resolvePlayer:id=>id==='recipient-1'?player():null,
    resolveOwner:id=>id==='recipient-1'?player():null,getView:view,project:()=>({x:50,y:70,scale:scale(),visible:player().onScreen}),now:()=>media.now(),audio,onAudit:audit});
  $('play').onclick=startSingle; $('cluster').onclick=burst;
  $('audio').onclick=async()=>{try{await audio.unlock();$('mute').checked=false;audio.setMuted(false);$('audio').textContent='音が有効（次の新規イベントから）';}catch(e){status.textContent=String(e);}};
  $('mute').onchange=()=>audio.setMuted($('mute').checked);
  $('verify').onchange=()=>{if($('verify').checked)audio.stopAll('verify');};
  $('rate').onchange=()=>runtime.setOwnerAcc2('recipient-1',acc2());
  $('visibility').onchange=()=>runtime.invalidate();
  $('session').onclick=resetScope;
  $('scrub').oninput=()=>{scrubbing=true;scheduleSerial++;runtime.dispose();audio.stopAll('scrub');};
  $('live').onclick=()=>{scrubbing=false;nextCycle=media.now();};
  $('repeat').onchange=()=>{nextCycle=media.now();};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'){scheduleSerial++;runtime.invalidate();audio.stopAll('hidden');}});
  window.addEventListener('pagehide',()=>{running=false;scheduleSerial++;runtime.dispose();audio.dispose();renderers.forEach(r=>r.destroy());});
  // ステータス変化だけを使い、実時間を2倍して位相をジャンプさせない。
  let autoStage=-1;
  async function tick() {
    if(!running)return;
    const now=media.now();
    if(!scrubbing && $('repeat').checked && runtime.active.size===0 && now>=nextCycle && view().visible) {autoStage=-1;emit();}
    if($('switch').checked && runtime.active.size && !scrubbing) {
      const elapsed=now-lastBatch, stage=elapsed<.30?0:elapsed<.65?1:2;
      if(stage!==autoStage){autoStage=stage;runtime.setOwnerAcc2('recipient-1',{state:stage===1?'active':'off',movementEffective:stage===1});}
    }
    const p=Number($('scrub').value);
    const snapshots=scrubbing?[{id:'inspection-only',token:'inspection',x:50,y:70,scale:scale(),seconds:p*CONTRACT.duration,reducedMotion:$('reduced').checked,gain:1}]:runtime.snapshot();
    let proofTaken=false;
    for(let i=0;i<renderers.length;i++) {
      if(!canvasVisible(canvases[i]))continue;
      const need=!scrubbing && !proofTaken && snapshots.some(e=>e.needsEvidence);
      const result=await renderers[i].render(snapshots,{background:i%2?'light':'dark',evidence:need,isCurrent:e=>scrubbing||runtime.frameAllowed(e)});
      if(need){proofTaken=true;runtime.acknowledgeFrame(result);}
      if(result.status==='failed'){runtime.acknowledgeFrame(result);status.textContent='GPU failed: '+result.error;running=false;break;}
    }
    const firstFx=snapshots[0];
    $('phase').textContent=scrubbing?`p=${p.toFixed(3)} / ${ (p*CONTRACT.duration).toFixed(3)} E秒`:'ライブ';
    if(running)status.textContent=`WebGPU: shader compiled / candidate only\nAudioContext: ${audio.context?.state ?? 'not-created'} / voices ${audio.voices.size}\nE duration: ${CONTRACT.duration} owner秒 / 2×は実効ACC2のみ\nphase: ${firstFx?(firstFx.seconds/CONTRACT.duration).toFixed(3):'idle'} / active: ${runtime.active.size}\nscale: ${scale().toFixed(6)} px/wu / canvas 100×86、CSS実寸100×86\nroom/session: gallery/${session} / ${scrubbing?'無音位相検査':view().verify?'verify無音':'ライブ'}\nGPUフレーム確認はOS画面提示・聴感の証明ではありません。`;
    requestAnimationFrame(tick);
  }
  window.manaPreview={runtime,audio,renderers,contract:CONTRACT};
  requestAnimationFrame(tick);
} catch(error) {status.textContent=`WebGPU起動失敗。Canvas2D / WebGLへの代替なし。\n${error.stack ?? error}`;audio.stopAll('gpu-init-failed');}
