import {ManaAcquireSystem,ManaAudio,requestManaDevice,sampleTime,soundEnvelope,PHASES} from '../src/index.js';
import {PreviewViewport} from './scene.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
// Gallery-only presentation: keep Pro's sampler, scene, and runtime contracts.
const embedMode=params.get('embed')==='1', verifyMode=params.has('verify');
document.body.classList.toggle('embed',embedMode);
document.body.classList.toggle('verify',verifyMode);
const state={playing:params.get('autorun')!=='0',loopEnabled:true,scenario:'single',rate:1,durationMs:1500,occluded:false,manual:false,manualMs:0,group:0,start:10000,next:0,groupActive:true,bodyBlocked:false,ready:false,gpu:null,errors:[],views:[],frameLog:[],qaCompletion:null};
const clock={timeMs:10000,rate:1};
const body={x:0,y:0,heightPx:64,alive:true,present:true,inVent:false,invisible:false};
const audio=new ManaAudio({onDiagnostic:diagnostic});
if(verifyMode){audio.setVolume(0);audio.setMuted(true);}
const system=new ManaAcquireSystem({sessionId:'preview:0',getActorClock:id=>id==='cause-clock'?clock:null,getBeneficiary:id=>id==='beneficiary'?body:null,audio,onDiagnostic:diagnostic});
function diagnostic(d){state.errors.push(d);if(state.errors.length>200)state.errors.shift();}
window.addEventListener('mana-diagnostic',e=>diagnostic(e.detail));
const offsets=()=>state.scenario==='burst'?[0,160,320]:[0];
function groupEnd(){return state.durationMs+offsets().at(-1);}
function restoreBody(){Object.assign(body,{alive:true,present:true,inVent:false,invisible:false});}
function beginGroup(){
  state.group++;state.start=clock.timeMs;state.next=0;state.groupActive=true;state.frameLog=[];
  state.groupBaseline={sfxStarted:system.stats.sfxStarted,accepted:system.stats.accepted,skipped:system.stats.sfxSkipped};
}
state.groupBaseline={sfxStarted:0,accepted:0,skipped:0};
function emitDue(){
  if(!state.groupActive||state.bodyBlocked)return;
  const schedule=offsets(),elapsed=clock.timeMs-state.start;
  while(state.next<schedule.length&&elapsed>=schedule[state.next]){
    const n=state.next++;
    system.onManaCommitted({sessionId:system.sessionId,eventId:`preview-g${state.group}-cause${n}`,beneficiaryPlayerId:'beneficiary',actorPlayerId:'cause-clock',manaDelta:5,committed:true,startedAtActorMs:state.start+schedule[n],durationMs:state.durationMs,radiusPx:82,route:'preview-authoritative-mock'});
  }
}
function fixtureAt(ms){return offsets().filter(o=>ms>=o&&ms-o<state.durationMs).map((o,n)=>({key:`manual-${n}`,causeId:`manual-${n}`,eventId:`manual-${n}`,beneficiaryPlayerId:'beneficiary',actorPlayerId:'cause-clock',body:{...body},ageMs:ms-o,durationMs:state.durationMs,radiusPx:82,rate:state.rate}));}
function draw(items){
  if(state.ready){try{for(const view of state.views)view.render(items,{occluded:state.occluded,visible:body.present&&body.alive&&!body.invisible&&!body.inVent});}catch(e){showError(e);state.ready=false;}}
  const elapsed=state.manual?state.manualMs:Math.max(0,clock.timeMs-state.start);
  $('#time-label').textContent=`${Math.round(elapsed)} actor-ms · ${state.manual?'無音スクラブ':state.rate+'× actor時相'}`;
  if(document.activeElement!==$('#scrub'))$('#scrub').value=Math.min(+$('#scrub').max,elapsed);
  const phases=[...new Set(items.map(i=>sampleTime(i.ageMs,i.durationMs).phase))];
  $('#phase').textContent=phases.map(id=>PHASES.find(p=>p.id===id)?.label??id).join(' / ')||'消去済み / 次の原因待ち';
  $('#stats').textContent=`${items.length} / ${system.stats.accepted} / ${system.stats.sfxStarted}（音skip ${system.stats.sfxSkipped}）`;
  $('#play').textContent=state.playing?'一時停止':'通常ループを再開';
  if(audio.metrics.worklet)$('#voice-report').textContent=`Worklet受信：開始 ${audio.metrics.worklet.starts} / 現在 ${audio.metrics.worklet.active}声 / 最大同時 ${audio.metrics.worklet.maxConcurrent} / 終了 ${audio.metrics.worklet.ends}。これは実聴の評価ではありません。`;
  if(!embedMode)drawEnvelope(elapsed);
}
function drawEnvelope(elapsed){
  const canvas=$('#envelope'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,total=groupEnd()+100;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#101920';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#30464c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(10,h-22);ctx.lineTo(w-10,h-22);ctx.stroke();
  offsets().forEach((at,n)=>{
    ctx.strokeStyle=['#77d3b1','#e9bd77','#92a5d5'][n];ctx.lineWidth=1.5;ctx.beginPath();
    for(let k=0;k<=240;k++){const p=k/240,x=10+(at+p*state.durationMs)/total*(w-20),y=h-22-soundEnvelope(p)*85;if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
    const x=10+at/total*(w-20);ctx.fillStyle=ctx.strokeStyle;ctx.fillRect(x,12,1.5,h-34);ctx.font='11px system-ui';ctx.fillText(`cause ${n+1}`,x+4,12+n*12);
  });
  ctx.strokeStyle='#e6eceb';const x=10+Math.min(total,elapsed)/total*(w-20);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h-20);ctx.stroke();ctx.fillStyle='#889fa9';ctx.font='10px system-ui';ctx.fillText('合成前の設計包絡 / 音響計測・実聴ではありません',10,h-5);
}
function showError(e){const error=$('#error');error.hidden=false;error.textContent=`WebGPU実描画：not_run または中断\n${e?.stack??e}\n\nCPU画像への自動置換は行いません。品質記録・検査手順は同梱docsを参照してください。`;$('#gpu-status').textContent='WebGPU実描画 unavailable — not_run';state.errors.push({type:'runtime',message:String(e)});}
function restart(){state.manual=false;state.playing=true;state.loopEnabled=true;state.bodyBlocked=false;restoreBody();system.setSession(`preview:${Date.now()}:${state.group+1}`);beginGroup();}
$('#play').onclick=()=>{if(state.manual){restart();return;}state.playing=!state.playing;clock.rate=state.playing?state.rate:0;system.advance();};
$('#restart').onclick=restart;
$('#scenario').onchange=e=>{state.scenario=e.target.value;$('#scrub').max=groupEnd()+120;restart();};
$('#rate').onchange=e=>{state.rate=+e.target.value;clock.rate=state.playing?state.rate:0;system.advance();};
$('#duration').onchange=e=>{state.durationMs=+e.target.value;$('#scrub').max=groupEnd()+120;restart();};
$('#occlusion').onchange=e=>{state.occluded=e.target.checked;};
$('#scrub').oninput=e=>{if(!state.manual){state.manual=true;state.playing=false;state.groupActive=false;system.setSession(`scrub:${Date.now()}`);clock.rate=0;}state.manualMs=+e.target.value;};
$('#volume').oninput=e=>{if(!verifyMode)audio.setVolume(+e.target.value);};
$('#sound').onclick=async()=>{if(verifyMode)return;try{if(!audio.node){await audio.unlock();$('#sound').textContent='消音';$('#audio-status').textContent='音有効。以後の新規原因から1回ずつ。';}else{audio.setMuted(!audio.muted);$('#sound').textContent=audio.muted?'消音解除':'消音';$('#audio-status').textContent=audio.muted?'消音中。':'音有効。以後の新規原因から1回ずつ。';}}catch(e){$('#audio-status').textContent=`音未実行: ${e.message}`;diagnostic({type:'audio-unlock',message:String(e)});}};
function remove(reason){state.manual=false;state.bodyBlocked=true;state.loopEnabled=false;
 if(reason==='session')system.setSession(`session-change:${Date.now()}`);
 else{if(reason==='dead')body.alive=false;if(reason==='departed')body.present=false;if(reason==='vent')body.inVent=true;if(reason==='invisible')body.invisible=true;system.invalidateBeneficiary('beneficiary',reason);}
 system.advance();draw(system.snapshot());return {active:system.snapshot().length,reason};
}
document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>remove(b.dataset.remove));
$('#restore').onclick=()=>{restoreBody();system.advance();draw(system.snapshot());};
const previewConfigurations=embedMode?[{light:false,scale:1}]:
  [false,true].flatMap(light=>[1,2,3].map(scale=>({light,scale})));
for(const {light,scale} of previewConfigurations){
  const tile=document.createElement('article');tile.className='tile'+(light?' light':'');tile.innerHTML=`<header><b>${scale}× · H${64*scale}</b><span>${light?'明背景':'暗背景'} / 同一shader</span></header><canvas id="h64-${scale}-${light?'light':'dark'}" aria-label="H64 ${scale}倍 ${light?'明':'暗'}背景"></canvas><div class="caption">${scale===1?'実寸：1 game px = 1 CSS px':'再描画による拡大。画像の拡大ではありません。'}</div>`;$('#views').append(tile);
  if(embedMode&&!verifyMode){
    const audioControl=document.createElement('div');audioControl.className='embed-audio-control';audioControl.setAttribute('aria-label','効果音の再生設定');
    audioControl.append($('#sound'),$('#audio-status'));tile.append(audioControl);
  }
}
let last=performance.now();function tick(now){
  const dt=Math.max(0,now-last);last=now;clock.rate=state.playing&&!state.manual?state.rate:0;
  if(state.playing&&!state.manual){clock.timeMs+=dt*state.rate;emitDue();}
  const items=state.manual?fixtureAt(state.manualMs):system.advance();
  draw(items);
  const elapsed=clock.timeMs-state.start;
  if(state.qaCompletion){state.frameLog.push({actorMs:elapsed,active:items.length,phases:items.map(i=>sampleTime(i.ageMs,i.durationMs).phase)});if(elapsed>groupEnd()+120){state.playing=false;clock.rate=0;const finish=state.qaCompletion;state.qaCompletion=null;finish({status:'completed-mock-runtime',gpu:state.gpu,scenario:state.scenario,rate:state.rate,durationMs:state.durationMs,occluded:state.occluded,accepted:system.stats.accepted-state.groupBaseline.accepted,sfxStarted:system.stats.sfxStarted-state.groupBaseline.sfxStarted,sfxSkipped:system.stats.sfxSkipped-state.groupBaseline.skipped,remaining:system.snapshot().length,frameLog:state.frameLog,audio:audio.metrics,errors:state.errors});}}
  else if(!state.manual&&state.playing&&state.loopEnabled&&elapsed>groupEnd()+600)beginGroup();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.manaQA={
  get ready(){return state.ready;},get errors(){return structuredClone(state.errors);},get gpu(){return state.gpu;},
  getState:()=>({ready:state.ready,active:system.snapshot(),stats:{...system.stats},audio:structuredClone(audio.metrics),clock:{...clock},manual:state.manual,errors:structuredClone(state.errors)}),
  setFrame:async({actorMs=530,scenario='single',rate=1,durationMs=1500,occluded=false}={})=>{state.manual=true;state.playing=false;state.groupActive=false;system.setSession(`qa-frame:${Date.now()}`);restoreBody();Object.assign(state,{scenario,rate,durationMs,occluded,manualMs:actorMs});$('#occlusion').checked=occluded;$('#scenario').value=scenario;$('#rate').value=String(rate);$('#duration').value=String(durationMs);$('#scrub').max=groupEnd()+120;draw(fixtureAt(actorMs));if(state.ready)await state.views[0].device.queue.onSubmittedWorkDone();return {ready:state.ready,actorMs,scope:'mock-body deterministic WebGPU frame; not live game'};},
  runScenario:({scenario='single',rate=1,durationMs=1500,occluded=false}={})=>new Promise(resolve=>{state.scenario=scenario;state.rate=rate;state.durationMs=durationMs;state.occluded=occluded;$('#occlusion').checked=occluded;$('#scenario').value=scenario;$('#rate').value=String(rate);$('#duration').value=String(durationMs);restart();state.loopEnabled=false;state.qaCompletion=resolve;}),
  remove,restore:()=>{restoreBody();system.advance();return system.snapshot();},
  unlockAudio:()=>audio.unlock(),shutdown:async()=>{state.playing=false;system.dispose();for(const view of state.views)view.dispose();await audio.dispose();}
};
try{
  const gpu=await requestManaDevice();const info=gpu.info??{};
  const description=[info.vendor,info.architecture,info.device,info.description].filter(Boolean).join(' / ');
  const software=/swiftshader|llvmpipe|software/i.test(description)||info.isFallbackAdapter===true;
  state.gpu={browser:navigator.userAgent,description,backend:software?'software_webgpu':'hardware_or_unspecified',isFallbackAdapter:info.isFallbackAdapter??null};
  $('#gpu-status').textContent=description||'adapter取得済み（機種情報非開示）';
  if(software)$('#gpu-status').textContent+=' · SOFTWARE / 実ハードGPUではない';
  for(const {light,scale} of previewConfigurations)state.views.push(await PreviewViewport.create(gpu.device,gpu.format,$(`#h64-${scale}-${light?'light':'dark'}`),{scale,light}));
  state.ready=true;window.__manaReady=true;
}catch(e){showError(e);window.__manaReady=false;}
