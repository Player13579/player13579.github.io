import { CONTRACT as C } from './contract.js';
import { StaminaEvents } from './events.js';
import { sampleEffect } from './sampler.js';
import { bodyParts } from './fixture.js';
import { createBackend, CoreloadRenderer } from './renderer.js';
import { StaminaAudio } from './audio.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const embedMode = params.get('embed') === '1';
const verifyMode = params.has('verify');
document.body.classList.toggle('embed', embedMode);
document.body.classList.toggle('verify', verifyMode);
const state = { paused:false, manual:null, cycle:0, elapsed:0, sinceCycle:0, lastTime:null, audioClock:1, disabled:false, pending:[], secondaryFired:new Set(), matrix:[] };
const audio = new StaminaAudio(stats=>{ $('audioStats').textContent=JSON.stringify({ ...stats, realListening:'not_run — 聴取評価は別途記録' },null,2); });
const managers = [1,2].map(speed=>({ speed, now:0, ledger:new StaminaEvents({
  onStart:(e,a,p)=>{ if(state.audioClock===speed) audio.start(e,a,p); },
  onUpdate:(e,a,p)=>{ if(state.audioClock===speed) audio.update(e,a,p); },
  onStop:(e)=>{ if(state.audioClock===speed) audio.stop(e); }
}), events:[], startNow:0 }));
let backend, panels=[], inspector, inMatrix=false, latestPackets=[];
const isNeighbor = () => $('scenario').value==='neighbor';
const duration = () => Number($('duration').value);
const fixtureActor = (playerId,now,rate,position=[0,0,0]) => ({playerId,nowMs:now,rate,position,alive:true,present:true,visible:true});
const fixtureEvent = (playerId,startedAt,eventId,gain=20) => ({type:'gain-stamina',kind:$('scenario').value==='natural'?'natural-tick':'discrete',authoritative:true,playerId,startedAt,eventId,gain,duration:duration(),radius:82,sourceToken:'preview-authority'});
function beginCycle() {
  state.cycle++; state.sinceCycle=0; state.secondaryFired.clear(); state.manual=null; state.disabled=false;
  for (const m of managers) {
    for (const key of [...m.ledger.events.keys()]) m.ledger.stop(key,'new_preview_cycle');
    m.startNow=m.now;
    m.ledger.setActor(fixtureActor('beneficiary',m.now,state.paused?0:m.speed));
    m.ledger.setActor({...fixtureActor('neighbor',m.now,state.paused?0:m.speed,[42,0,4]),present:isNeighbor()});
    const scenario=$('scenario').value; const gain=scenario==='zero'?0:scenario==='negative'?-10:20;
    const event=fixtureEvent('beneficiary',m.now,`cycle-${state.cycle}-clock-${m.speed}-primary`,gain);
    m.events=[event]; m.ledger.ingest(event);
    if (scenario==='overlap'||scenario==='neighbor') {
      // Accept a future actor-timestamped gain once; no voice before its own start.
      const second=fixtureEvent(scenario==='neighbor'?'neighbor':'beneficiary',m.now+180,`cycle-${state.cycle}-clock-${m.speed}-secondary`);
      m.events.push(second);m.ledger.ingest(second);
    }
    m.ledger.update();
  }
  $('scrubText').textContent='自動ループ'; $('pause').textContent=state.paused?'再開':'一時停止';
}
function scenePackets(m,phaseOverride=state.manual) {
  const show=$('character').checked; const arm=$('arm').checked;
  let effectStates=[];
  if (phaseOverride!==null) {
    if (!['zero','negative','natural'].includes($('scenario').value)) {
      effectStates=m.events.map((event,index)=>{
        const normalized={...event,duration:duration(),radius:82,key:`probe-${m.speed}-${index}`};
        const actor=fixtureActor(event.playerId,event.startedAt+phaseOverride*duration(),m.speed,event.playerId==='neighbor'?[42,0,4]:[0,0,0]);
        return sampleEffect(normalized,actor,{phase:phaseOverride-(index?180/duration():0),lane:event.playerId==='beneficiary'?index:0});
      });
    }
  } else effectStates=m.ledger.active().map(({event,actor,lane})=>sampleEffect(event,actor,{lane}));
  const layer=$('layer').value;
  const volumes=effectStates.flatMap(s=>s.volumes).filter(v=>layer==='all'||(layer==='transfer'?v.kind===0:v.kind===1));
  const actors=['beneficiary',...(isNeighbor()?['neighbor']:[])].map(id=>m.ledger.actors.get(id)).filter(Boolean);
  const parts=actors.flatMap(actor=>bodyParts(actor,{showCharacter:show,foregroundArm:arm}));
  return {volumes,parts,states:effectStates,cameraX:isNeighbor()?20:0,bloom:$('bloom').checked,receivingLight:$('receiverLight').checked};
}
function drawPanels(phaseOverride=state.manual) {
  latestPackets=managers.map(m=>scenePackets(m,phaseOverride));
  panels.forEach(panel=>{
    const packet=latestPackets[panel.clockIndex];
    panel.renderer.draw({...packet,lightBackground:panel.light});
    const text=packet.states.length?packet.states.map(s=>`${s.p.toFixed(3)} ${s.phaseName}`).join(' / '):'Eなし';
    $(panel.phaseId).textContent=`p=${text}`;
  });
  if ($('inspect').closest('details').open) inspector.draw({...latestPackets[0],width:512,height:352,scale:2.5,foot:284,lightBackground:false});
}
function writeLedger() {
  const lines=[];
  managers.forEach((m,i)=>{
    lines.push(`actor ${m.speed}×  now=${m.now.toFixed(1)} ms  cycle=${state.cycle}`);
    lines.push(` accepted=${m.ledger.stats.accepted} starts=${m.ledger.stats.starts} stops=${m.ledger.stats.stops} duplicates=${m.ledger.stats.duplicate} live=${m.ledger.events.size}`);
    for(const s of latestPackets[i]?.states??[]) lines.push(` p=${s.p.toFixed(3)}  Q=${s.charge.toFixed(3)}  outside=${s.outside.toFixed(3)}  flux=${s.flux.toFixed(3)}  volumes=${s.volumes.length}`);
    lines.push('');
  });
  $('ledger').textContent=lines.join('\n');
  if(state.manual===null){ const m=managers[0];$('phase').value=Math.min(1,(m.now-m.startNow)/duration()); }
}
function animation(time) {
  const dt=state.lastTime===null?0:Math.max(0,time-state.lastTime);state.lastTime=time;
  if(!state.paused&&!inMatrix){
    state.elapsed+=dt;state.sinceCycle+=dt;
    for(const m of managers){
      m.now+=dt*m.speed;
      for(const actor of [...m.ledger.actors.values()]) m.ledger.setActor({...actor,nowMs:m.now,rate:m.speed});
      if($('scenario').value==='duplicate')for(const event of m.events)m.ledger.ingest(event);
      m.ledger.update();
    }
    if(state.sinceCycle>duration()+950) beginCycle();
  }
  if(!inMatrix&&!state.disabled){
    try {drawPanels();writeLedger();} catch(error){ fail(error); }
  }
  requestAnimationFrame(animation);
}
function fail(error){state.disabled=true;audio.stopAll();$('status').classList.add('error');$('status').textContent=`描画停止: ${error.message}\nCPU代替なし。実GPU/画質の成功として記録しません。`;$('error').hidden=false;$('error').textContent=$('status').textContent;console.error(error);}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function record(){return{revision:'0.3.0',recordedAt:new Date().toISOString(),userAgent:navigator.userAgent,devicePixelRatio:devicePixelRatio,
  diagnostic:backend?.diagnostic??null,canvasGeometry:panels.map(p=>({id:p.id,raster:[p.renderer.canvas.width,p.renderer.canvas.height],css:[p.renderer.canvas.clientWidth,p.renderer.canvas.clientHeight]})),
  testSettings:{scenario:$('scenario').value,duration:duration(),showCharacter:$('character').checked,foregroundArm:$('arm').checked,bloom:$('bloom').checked,manualPhase:state.manual},
  ledgers:managers.map(m=>({actorRate:m.speed,stats:m.ledger.stats,history:m.ledger.history})),matrix:state.matrix,
  RenderObservation:{status:'not_run',reason:'Browser drawing alone does not document human full-lifetime quality review.'},
  Listening:{status:'not_run'},QualityAdoption:'not_approved',GameIntegration:'not_approved'};}
async function probeMatrix(){
  if(inMatrix)return; inMatrix=true;audio.stopAll();state.matrix=[];$('matrix').disabled=true;
  const previous={character:$('character').checked,arm:$('arm').checked};
  try{
    for(const show of [true,false])for(const arm of [true,false])for(const p of C.reviewPhases){
      $('character').checked=show;$('arm').checked=arm;drawPanels(p);await backend.device.queue.onSubmittedWorkDone();
      state.matrix.push({phase:p,showCharacter:show,foregroundArm:arm,panels:4,technicalDraw:'submitted_and_completed',visualQuality:'not_reviewed'});
    }
    $('matrixStatus').textContent=`${state.matrix.length}条件×4パネルをGPU queueで完了。目視画質合格ではありません。記録JSONにadapter情報を保存。`;
  }catch(error){state.matrix.push({error:error.message});fail(error);}finally{$('character').checked=previous.character;$('arm').checked=previous.arm;inMatrix=false;$('matrix').disabled=false;}
  return record();
}

$('restart').onclick=()=>{state.paused=false;beginCycle();};
for(const id of ['scenario','duration']) $(id).onchange=()=>{state.paused=false;beginCycle();};
$('pause').onclick=()=>{
  // A scrub is not a live event clock: return with a new explicit preview cycle.
  if(state.manual!==null){state.paused=false;beginCycle();return;}
  state.paused=!state.paused;
  for(const m of managers)for(const actor of [...m.ledger.actors.values()])m.ledger.setActor({...actor,rate:state.paused?0:m.speed});
  for(const m of managers)m.ledger.update();
  $('pause').textContent=state.paused?'再開':'一時停止';
};
$('phase').oninput=()=>{state.manual=Number($('phase').value);state.paused=true;audio.stopAll();$('scrubText').textContent=`p=${state.manual.toFixed(3)} / 無音`; $('pause').textContent='再開';};
$('auto').onclick=()=>{state.paused=false;beginCycle();};
$('audioClock').onchange=()=>{audio.stopAll();state.audioClock=Number($('audioClock').value);$('audioStats').textContent='次の新しいgainから選択時計で発音。過去分の一括再生なし。';};
$('audio').onclick=async()=>{if(verifyMode||embedMode)return;try{if(audio.enabled){await audio.disable();$('audio').textContent='音を有効化';}else{const result=await audio.enable();$('audio').textContent='音を止める';$('audioStats').textContent=JSON.stringify({...result,nextNewGainOnly:true,listening:'not_run'},null,2);}}catch(error){$('audioStats').textContent=`音声初期化失敗: ${error.message}`;}};
for(const button of document.querySelectorAll('[data-kill]')) button.onclick=()=>{
  state.paused=true;state.manual=null;audio.stopAll();
  for(const m of managers){for(const actor of [...m.ledger.actors.values()]){
    const reason=button.dataset.kill;
    if(reason==='cancelled')m.ledger.cancelPlayer(actor.playerId,reason);
    else m.ledger.setActor({...actor,rate:0,nowMs:reason==='clock_rewind'?actor.nowMs-20:actor.nowMs,alive:reason==='death'?false:actor.alive,present:reason==='exited'?false:actor.present,visible:reason==='invisible'?false:actor.visible});
  } for(const event of m.events)m.ledger.ingest(event);m.ledger.update();}
  $('scrubText').textContent=`終了: ${button.dataset.kill}`;
};
$('export').onclick=()=>downloadBlob(new Blob([JSON.stringify(record(),null,2)],{type:'application/json'}),'CORELOAD-r03-browser-record.json');
$('capture').onclick=async()=>{try{downloadBlob(await panels[0].renderer.snapshotBlob(),`CORELOAD-r03-H64-GPU-${state.manual??'live'}.png`);}catch(e){fail(e);}};
$('matrix').onclick=probeMatrix;
$('checkpoints').onclick=async()=>{state.paused=true;audio.stopAll();$('checkpoints').disabled=true;for(const p of C.reviewPhases){state.manual=p;$('phase').value=p;$('scrubText').textContent=`p=${p.toFixed(3)} / 無音`;await new Promise(r=>setTimeout(r,360));}$('checkpoints').disabled=false;};
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.paused=true;audio.stopAll();for(const m of managers)for(const a of [...m.ledger.actors.values()])m.ledger.setActor({...a,visible:false,rate:0});$('scrubText').textContent='タブ非表示で終了。新しい一回で再開。';}});

try {
  backend=await createBackend({onDiagnostic:d=>{$('gpuLog').textContent=JSON.stringify(d,null,2);}});
  const views=embedMode?[['dark1',0,false,'phase1dark']]:[['dark1',0,false,'phase1dark'],['light1',0,true,'phase1light'],['dark2',1,false,'phase2dark'],['light2',1,true,'phase2light']];
  panels=views.map(([id,clockIndex,light,phaseId])=>({id,clockIndex,light,phaseId,renderer:new CoreloadRenderer(backend,$(id))}));
  if(!embedMode)inspector=new CoreloadRenderer(backend,$('inspect'));
  $('status').textContent='WebGPUのWGSL / pipeline初期化成功。無操作自動ループ中。これは画質採用・全寿命目視・実聴の合格ではありません。';
  beginCycle();requestAnimationFrame(animation);
  window.__CORELOAD__={ready:true,record,probeMatrix,probe:async p=>{state.paused=true;state.manual=p;audio.stopAll();drawPanels(p);await backend.device.queue.onSubmittedWorkDone();return record();},restart:beginCycle};
} catch(error) {fail(error);window.__CORELOAD__={ready:false,error:error.message,record};}
