import {C,normalizeGain,sampleGain} from './sampler.mjs';
import {GainStaminaSystem} from './events.mjs';
import {createGPU,StaminaRenderer} from './renderer.mjs';
import {StaminaAudio} from './audio.mjs';
const $=id=>document.getElementById(id),audio=new StaminaAudio();
const embedMode=new URLSearchParams(location.search).get('embed')==='1';
const verifyMode=new URLSearchParams(location.search).has('verify');
const model={gpu:null,renderers:new Map(),tracks:[],loop:0,wall:0,paused:false,scrubbing:false,manualP:0,extra:0,last:performance.now(),history:[],gallery:[],gpuError:null};
const phases={intake_onset:'入域の起こり',intake:'外から身体へ',deposit:'到達・充填',settled:'蓄勢・静かな保持',release:'消灯',ended:'終端',pending:'開始前'};
let resolveReady;const ready=new Promise(r=>resolveReady=r);
function log(s){$('actionlog').textContent=s;model.history.push(s);if(model.history.length>60)model.history.shift();}
const duration=()=>Number($('duration').value);
function actor(id,x=0,z=0){return {playerId:id,timeMs:0,x,y:0,z,alive:true,present:true,visible:true,timeScale:1,paused:false};}
function eventFor(t,index,startedAt){return {type:'gain-stamina',playerId:t.actors[index].playerId,eventId:`cycle-${model.loop}/${index}/${model.extra}`,amount:24,startedAt,durationMs:duration(),radius:82,source:$('source').value,gainKind:'discrete',authoritative:true};}
function beginCycle(){
 model.loop++;model.extra=0;model.wall=0;model.paused=false;model.scrubbing=false;$('scrubval').textContent='LIVE';$('pause').textContent='actor停止';
 if(!model.tracks.length)model.tracks=[{name:'normal',rate:1,system:new GainStaminaSystem()},{name:'fast',rate:2,system:new GainStaminaSystem()}];
 for(const t of model.tracks){
  t.system.cancelAll('new_preview_cycle');t.base=t.actors?.[0]?.timeMs??0;
  const near=$('scenario').value==='nearby';
  t.actors=[actor(`${t.name}:recipient-A`,near?-17:0,0)];if(near)t.actors.push(actor(`${t.name}:recipient-B`,23,-14));
  for(const a of t.actors){a.timeMs=t.base;a.timeScale=t.rate;}
  t.first=eventFor(t,0,t.base);const accepted=t.system.ingestAuthoritativeGain(t.first,t.actors[0]).accepted;t.secondSent=false;t.samples=[];t.cycleAccepted=accepted?1:0;
 }
 audio.cancel();
}
function updateTrack(t,dt){
 for(const a of t.actors){a.timeMs+=dt*t.rate;a.timeScale=t.rate;a.paused=model.paused;}
 const scenario=$('scenario').value,age=t.actors[0].timeMs-t.base;
 if(!t.secondSent&&(scenario==='overlap'||scenario==='nearby')&&age>=C.nearOverlapDeltaActorMs){
  const i=scenario==='nearby'?1:0;
  const e={...eventFor(t,i,t.base+C.nearOverlapDeltaActorMs),eventId:`cycle-${model.loop}/second`};
  const r=t.system.ingestAuthoritativeGain(e,t.actors[i]);if(r.accepted)t.cycleAccepted++;t.secondSent=true;
 }
 if(scenario==='duplicates')t.system.ingestAuthoritativeGain(t.first,t.actors[0]);
 t.samples=t.system.update(new Map(t.actors.map(a=>[a.playerId,a])));
}
function staticSamples(t,p,{overlap=$('scenario').value==='overlap',nearby=$('scenario').value==='nearby'}={}){
 const items=[],as=t.actors.map(a=>({...a,alive:true,present:true,visible:true}));
 const specs=[{index:0,offset:0}];if(overlap||nearby)specs.push({index:nearby?1:0,offset:180});
 specs.forEach(({index,offset},i)=>{
  const e={...normalizeGain({...t.first,playerId:as[index].playerId,eventId:`sampler-${t.name}-${i}`,startedAt:0,durationMs:duration()}),slot:i};
  const s=sampleGain(e,p*duration()*t.rate-offset);if(s.active)items.push({...s,actor:as[index],rate:0});
 });return {samples:items,actors:as};
}
function drawTracks(){
 if(!model.gpu||model.renderingStopped)return;
 if(model.gpu.errors.length)throw Error(model.gpu.errors.at(-1));
 for(const t of model.tracks){
  const view=model.scrubbing?staticSamples(t,model.manualP):{samples:t.samples,actors:t.actors.filter(a=>a.visible&&a.present&&a.alive)};
  for(const mode of ['dark','light'])model.renderers.get(`${t.name}-${mode}`).render({...view,light:mode==='light',showActor:$('showActor').checked,crossArm:$('crossArm').checked,scale:1});
 }
 if(!$('zoomBox').hidden&&model.zoom){const t=model.tracks[0],view=model.scrubbing?staticSamples(t,model.manualP):{samples:t.samples,actors:t.actors};model.zoom.render({...view,scale:2.5,light:false,showActor:$('showActor').checked,crossArm:$('crossArm').checked});}
}
function displayStats(){
 const rows=[];
 for(const t of model.tracks){
  const ss=model.scrubbing?staticSamples(t,model.manualP).samples:t.samples;
  const age=model.scrubbing?model.manualP*duration()*t.rate:t.actors[0].timeMs-t.base;
  const phase=ss[0]?.phase??(age>=duration()?'ended':'pending');
  document.querySelectorAll(`.${t.name}-phase`).forEach(e=>e.textContent=phases[phase]);
  document.querySelectorAll(`.${t.name}-age`).forEach(e=>e.textContent=`${Math.round(age)} / ${duration()} actor ms`);
  for(const s of ss)rows.push([`${t.rate}× / ${s.eventId}`,`${s.ageMs.toFixed(1)} / ${s.durationMs}`,s.progress.toFixed(3),s.external.toFixed(3),s.charge.toFixed(3),phases[s.phase]]);
 }
 const body=$('events');body.replaceChildren();
 if(!rows.length)rows.push(['—','—','—','—','—','生存中の可視Eなし']);
 for(const row of rows){const tr=document.createElement('tr');for(const v of row){const td=document.createElement('td');td.textContent=v;tr.append(td);}body.append(tr);}
 $('counters').textContent=model.tracks.map(t=>`${t.rate}×: accepted=${t.system.diagnostics.accepted}  duplicates=${t.system.diagnostics.duplicates}  active=${t.system.active.size}  expired=${t.system.diagnostics.expired}  cancelled=${t.system.diagnostics.cancelled}\n  terminal: ${t.system.history.slice(-3).map(h=>h.reason).join(', ')||'none'}`).join('\n');
 $('audioStats').textContent=`AudioWorklet ${audio.enabled?'RUNNING':'未有効'} · voice starts ${audio.stats.voiceStarts} · active ${audio.stats.activeVoices}\nends ${audio.stats.voiceEnds} · watchdog ${audio.stats.watchdogStops} · 実聴判定 not_run${audio.error?' · '+audio.error:''}`;
}
function frame(now){
 const dt=Math.min(80,Math.max(0,now-model.last));model.last=now;
 if(!model.scrubbing){
  const elapsed=model.paused?0:dt;model.wall+=elapsed;
  if($('loop').checked&&model.wall>duration()+C.nearOverlapDeltaActorMs+550)beginCycle();
  for(const t of model.tracks)updateTrack(t,elapsed);
  const chosen=model.tracks.find(t=>t.name===$('audioTrack').value);audio.sync(chosen?.samples??[]);
 }
 try{drawTracks();}catch(e){setFailure(e);}
 if(!model.lastStats||now-model.lastStats>100){displayStats();model.lastStats=now;}
 requestAnimationFrame(frame);
}
function setFailure(e){model.renderingStopped=true;model.gpuError=String(e?.stack??e);$('failure').hidden=false;$('failure').textContent=`実WebGPU描画を完了できません。CPU代理像は表示しません。\n${e?.message??e}`;$('backend').textContent='WebGPU unavailable / GPU品質 not_run';}
$('replay').onclick=()=>{beginCycle();log('新しいeventIdの正gainを一回ずつ発行。古いeventの再起動ではありません。');};
for(const id of ['scenario','duration'])$(id).onchange=()=>beginCycle();
$('source').onchange=()=>log('出所のみ変更。次のgainも同じ形・音です。');
$('pause').onclick=()=>{model.paused=!model.paused;$('pause').textContent=model.paused?'actor再開':'actor停止';};
$('extra').onclick=()=>{model.extra++;for(const t of model.tracks){const e=eventFor(t,0,t.actors[0].timeMs);const r=t.system.ingestAuthoritativeGain(e,t.actors[0]);if(r.accepted)t.cycleAccepted++;}log('別eventIdを追加。古いeventの位相・寿命は不変。');};
$('duplicate').onclick=()=>{for(const t of model.tracks){const r=t.system.ingestAuthoritativeGain(t.first,t.actors[0]);log(`${t.rate}× 再送: ${r.reason??'accepted'}`);}};
$('natural').onclick=()=>{for(const t of model.tracks){const r=t.system.ingestAuthoritativeGain({...t.first,eventId:'natural-check',gainKind:'natural-regeneration',startedAt:t.actors[0].timeMs},t.actors[0]);log(`自然回復tick: ${r.reason}; 新しいE・voiceは発行しない。`);}};
for(const b of document.querySelectorAll('[data-stop]'))b.onclick=()=>{
 $('loop').checked=false;model.scrubbing=false;model.paused=false;
 for(const t of model.tracks)for(const a of t.actors){if(b.dataset.stop==='dead')a.alive=false;if(b.dataset.stop==='exited')a.present=false;if(b.dataset.stop==='invisible')a.visible=false;if(b.dataset.stop==='clock_reversed')a.timeMs-=3000;}
 log(`${b.textContent}: terminal cancel。人物メッシュだけの表示切替とは別です。`);
};
$('restore').onclick=()=>{for(const t of model.tracks)for(const a of t.actors){a.alive=true;a.present=true;a.visible=true;}log('actorを可視・生存に戻した。終了したeventは復活しない。');};
$('epoch').onclick=()=>{for(const t of model.tracks){t.system.resetEpoch();t.actors[0].timeMs=0;}audio.resetEpoch();beginCycle();log('明示操作でscene epochをリセット。旧eventを再送しない新しいscene用。');};
$('scrub').oninput=()=>{model.scrubbing=true;model.manualP=Number($('scrub').value)/1000;$('scrubval').textContent=`p = ${model.manualP.toFixed(3)}`;audio.cancel();};
async function togglePreviewAudio(){
 if(verifyMode)return;
 try{
  if(audio.enabled){await audio.mute();$('audio').textContent='音を有効化';}
  else{await audio.enable();$('audio').textContent='音を停止';beginCycle();log('AudioWorkletを有効化。新しいgainから試聴。表示パネル数ではなくevent数で発音。');}
  if(embedMode)$('normal-dark').title=audio.enabled?'クリックで音声を停止':'クリックで音声を有効化（次の新しい回復Eから）';
 }catch(e){audio.error=String(e);log(`音声を起動できません: ${e.message}`);}
}
$('audio').onclick=togglePreviewAudio;
if(embedMode){const canvas=$('normal-dark');canvas.title='クリックで音声を有効化（次の新しい回復Eから）';canvas.addEventListener('click',togglePreviewAudio);}
$('audioTrack').onchange=()=>{audio.cancel();beginCycle();log('試聴時相を変更し、新しいgainを発行。旧voiceを再起動しない。');};
function runtimeReport(){return {package:'stamina-e-reserve',version:C.version,qualityAdopted:false,productionConnectionApproved:false,
 environment:{userAgent:navigator.userAgent,devicePixelRatio:devicePixelRatio,secureContext:isSecureContext},gpu:model.gpu?.metadata??null,
 gpuErrors:model.gpu?.errors??[],initializationError:model.gpuError,frames:Object.fromEntries([...model.renderers].map(([k,r])=>[k,r.stats])),
 checks:{renderObservation:'not_run',fullLifetimeQuality:'not_run',audioAudition:'not_run',cpuProxyUsed:false},
 audio:{enabled:audio.enabled,state:audio.context?.state??'not_created',sampleRate:audio.context?.sampleRate??null,baseLatency:audio.context?.baseLatency??null,stats:audio.stats,error:audio.error},
 tracks:model.tracks.map(t=>({name:t.name,rate:t.rate,diagnostics:t.system.diagnostics,terminal:t.system.history.slice(-10)})),history:model.history};}
function saveJSON(name,data){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
$('export').onclick=()=>saveJSON('reserve-r02-runtime.json',runtimeReport());
$('zoom').onclick=()=>{if(!model.gpu)return;model.zoom??=new StaminaRenderer(model.gpu,$('zoomCanvas'));$('zoomBox').hidden=!$('zoomBox').hidden;};
$('gallery').onclick=()=>{
 if(!model.gpu){log('WebGPUが起動していないためフレーム列は生成しません。');return;}
 $('galleryBox').hidden=false;for(const r of model.gallery)r.destroy();model.gallery=[];$('frames').replaceChildren();
 for(const light of [false,true])for(const p of [0,.035,.10,.24,.40,.60,.75,.90,.97,1]){
  const wrap=document.createElement('div');wrap.className='frame';const canvas=document.createElement('canvas');canvas.width=152;canvas.height=120;
  const caption=document.createElement('p');caption.textContent=`${light?'LIGHT':'DARK'} p=${p.toFixed(3)} / H64`;wrap.append(canvas,caption);$('frames').append(wrap);
  const r=new StaminaRenderer(model.gpu,canvas);model.gallery.push(r);
  const e=normalizeGain({type:'gain-stamina',playerId:'gallery',eventId:'static',amount:1,startedAt:0,durationMs:duration()});
  const a=actor('gallery'),s={...sampleGain(e,p*duration()),actor:a};
  r.render({samples:s.active?[s]:[],actors:[a],showActor:$('showActor').checked,crossArm:$('crossArm').checked,light,origin:[76,100]});
 }
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const t of model.tracks)t.system.cancelAll('preview_backgrounded');audio.cancel();model.paused=true;}else{model.last=performance.now();log('タブ復帰。旧Eは終了済み。「新しい一回」で再検査。');}});
window.addEventListener('pagehide',()=>audio.cancel());
window.staminaLab={ready,runtimeReport,
 async renderTestFrame({p=0.5,durationMs=1500,scenario='single',showActor=true,crossArm=false}={}){
  await ready;if(!model.gpu||model.renderingStopped)throw Error(model.gpuError??'GPU unavailable');
  $('duration').value=String(durationMs);$('scenario').value=scenario;$('showActor').checked=showActor;$('crossArm').checked=crossArm;
  beginCycle();$('loop').checked=false;model.scrubbing=true;model.manualP=p;audio.cancel();drawTracks();displayStats();await model.gpu.device.queue.onSubmittedWorkDone();
  if(model.gpu.errors.length)throw Error(model.gpu.errors.at(-1));
  return runtimeReport();
 },
 beginCycle,
 snapshot:()=>model.tracks.map(t=>({name:t.name,rate:t.rate,active:t.samples.map(s=>({key:s.key,ageMs:s.ageMs,progress:s.progress,charge:s.charge,durationMs:s.durationMs})),diagnostics:{...t.system.diagnostics}}))
};
$('dpr').textContent=String(devicePixelRatio);beginCycle();
try{
 model.gpu=await createGPU();
 for(const name of ['normal-dark','normal-light','fast-dark','fast-light'])model.renderers.set(name,new StaminaRenderer(model.gpu,$(name)));
 $('backend').textContent=`${model.gpu.metadata.classification} · WGSL/pipeline OK · 品質未判定`;
 $('gpuState').textContent='実行情報取得可 · 全寿命GPU品質 not_run · 実聴 not_run · 採用未承認';
}catch(e){setFailure(e);}
resolveReady({ok:!!model.gpu&&!model.gpuError&&model.renderers.size===4});model.last=performance.now();requestAnimationFrame(frame);
