import {RateClock,HeadshotContactSystem,HeadshotRenderer,ContactAudio,VARIANTS,LIMITS,profileFor} from '../src/index.mjs';
import {FixtureHost,DISPLAY_VARIANTS,fixtureScene} from './fixture-host.mjs';
import {PreviewLoopController,PresentationTime} from './loop-controller.mjs';
import {runBrowserValidation} from './validation.mjs';
import {submitViews} from './presenter.mjs';
import {captureLifetimeEvidence,pixelMetrics,sha256} from './lifetime-validation.mjs';
import {createStoredZip,downloadBytes,canvasPNG,toBase64} from './evidence-export.mjs';
const $=id=>document.getElementById(id),motionQuery=matchMedia('(prefers-reduced-motion: reduce)'),params=new URLSearchParams(location.search);
const verifyMode=params.has('verify'),embedMode=params.get('embed')==='1';
const time=new PresentationTime(),clock=new RateClock({sourceNow:time.now}),host=new FixtureHost(clock);
let audio=null,native=null,light=null,hero=null,smallDark=null,smallLight=null,lastPacket=null,validating=false,report=null,sceneKey='',maskKey='',cachedMask=null;
let ready=false,fatal=null,inFlight=Promise.resolve(),lastUI=-Infinity,stressUntil=0,stressRestore=true;
let pendingCaptures=[];
const selected=()=>`${$('mode').value}:${$('weapon').value}`;
const soundProxy={play(info){if(info.event.variant===selected())return audio?.play(info);},stop(id){audio?.stop(id);},setRate(r){audio?.setRate(r);},resetSession(){audio?.resetSession();}};
const system=new HeadshotContactSystem({clock,verifyCanonical:host.verifyCanonical,getPermission:host.getPermission,sound:verifyMode?null:soundProxy,roomId:host.roomId,epoch:host.epoch,reducedMotion:motionQuery.matches});
const loop=new PreviewLoopController({time,clock,host,system,variants:DISPLAY_VARIANTS});
$('reduced').checked=motionQuery.matches;
function log(message){$('log').textContent=String(message)+'\n'+$('log').textContent.split('\n').slice(0,9).join('\n');}
function fatalError(e){fatal=String(e?.stack??e);ready=false;system.cancelAll('preview_failure');$('capability').classList.add('error');$('capability').textContent=`WebGPUプレビュー停止: ${e?.message??e}。灰色の待機表示を検査合格とは扱いません。`;$('state').textContent='停止 / GPU実行結果を確認してください';for(const r of pendingCaptures.splice(0)){clearTimeout(r.timer);r.reject(new Error(fatal));}}
async function issue(variant=selected(),options={}){const packet=host.issue(variant,options);if(variant===selected())lastPacket=packet;const r=await system.accept(packet);if(!r.accepted)log(r.reason);return r;}
async function batch(){return Promise.all(DISPLAY_VARIANTS.map(v=>issue(v)));}
const tiles=new Map();
for(const background of ['dark','light','dark32','light32']){
  const list=[];for(let i=0;i<DISPLAY_VARIANTS.length;i++){
    const variant=DISPLAY_VARIANTS[i],tile=document.createElement('div');tile.className='tile';tile.dataset.variant=variant;tile.dataset.background=background;tile.dataset.active='false';tile.style.left=`${i%5*128}px`;tile.style.top=`${Math.floor(i/5)*128}px`;
    const label=document.createElement('strong');label.textContent=variant.replace(':',' · ');label.title=profileFor(variant).label;const status=document.createElement('span');status.className='tile-status';status.textContent='初期化中';
    const bar=document.createElement('span');bar.className='tile-bar';const fill=document.createElement('i');bar.append(fill);tile.append(label,status,bar);$(`labels-${background}`).append(tile);list.push({tile,status,fill,variant});
  }tiles.set(background,list);
}
for(const variant of VARIANTS){const row=document.createElement('div');row.className='audition';const text=document.createElement('span');text.textContent=variant;const player=document.createElement('audio');player.controls=!verifyMode;player.preload='none';player.src=`./sfx/${variant.replace(':','-')}.wav`;player.volume=verifyMode?0:.35;player.muted=verifyMode;row.append(text,player);$('auditions').append(row);}
$('once').onclick=()=>issue().catch(log);
function updateLoopButton(){$('loop').textContent=`自動再発行 ${loop.running?'ON':'OFF'}`;$('loop').setAttribute('aria-pressed',String(loop.running));}
$('loop').onclick=()=>{loop.setRunning(!loop.running);updateLoopButton();};
$('restart').onclick=()=>{host.hidden=false;host.occluded=false;host.present=true;$('hidden').checked=false;$('occluded').checked=false;clock.setRate(1);$('rate').value='1';stressUntil=0;loop.restart();loop.setRunning(true);updateLoopButton();log('新しい正規fixture IDで10種を再開。旧IDは再使用しません。');};
$('audio').onclick=()=>enableSoundFromGesture();
if(verifyMode){$('audio').hidden=true;$('volume').disabled=true;$('audio-status').textContent='verify · audio muted';}
$('volume').oninput=()=>{if(!verifyMode)audio?.setVolume(Number($('volume').value));};
async function enableSoundFromGesture(){if(verifyMode)return false;try{if(!audio){const C=window.AudioContext??window.webkitAudioContext;if(!C)throw new Error('AudioContext unavailable');const context=new C();await context.resume();audio=new ContactAudio(context);audio.setVolume(Number($('volume').value));window.__fixtureAudioContext=context;}else await window.__fixtureAudioContext.resume();$('audio-status').textContent='音声 ON / 選択variantのみ / 新規idから';return true;}catch(e){$('audio-status').textContent=`音声を開始できません: ${e.message}`;log(`音声: ${e.message}`);return false;}}
if(embedMode&&!verifyMode){const embedAudio=document.createElement('button');embedAudio.type='button';embedAudio.textContent='音声を有効化';embedAudio.setAttribute('aria-label','ヘッドショット効果音を有効化');embedAudio.style.cssText='position:fixed;z-index:10;top:8px;right:8px;padding:7px 10px;color:#eef2f8;background:#253144;border:1px solid #50627a;border-radius:4px;font:12px system-ui;cursor:pointer';embedAudio.addEventListener('click',async()=>{if(await enableSoundFromGesture())embedAudio.textContent='音声有効';});document.body.append(embedAudio);}
$('rate').onchange=()=>{clock.setRate(Number($('rate').value));audio?.setRate(clock.rate);time.resetWall();};
$('reduced').onchange=()=>system.setReducedMotion($('reduced').checked);
motionQuery.addEventListener('change',e=>{$('reduced').checked=e.matches;system.setReducedMotion(e.matches);});
$('hidden').onchange=()=>{host.hidden=$('hidden').checked;system.frame();};
$('occluded').onchange=()=>{host.occluded=$('occluded').checked;sceneKey='';};
$('light-bg').onchange=()=>sceneKey='';
$('target-dead').onchange=()=>{host.targetAlive=!$('target-dead').checked;log('対象生死hintだけを変更。死亡・損傷・反撃停止の演出は追加しません。');};
$('shooter-dead').onchange=()=>{host.shooterAlive=!$('shooter-dead').checked;log('射手の生死変化で既存の正規接触を取り消しません。');};
$('duplicate').onclick=async()=>{if(!lastPacket)await issue();log(`同id再送: ${(await system.accept(lastPacket)).reason}`);};
$('forged').onclick=async()=>log(`偽イベント: ${(await system.accept({trusted:true,type:'action-gunner-headshot'})).reason}`);
$('stale').onclick=()=>issue(selected(),{atMs:clock.now()-1000});
$('room').onclick=()=>{host.nextRoom();system.setSession(host.roomId,host.epoch);lastPacket=null;log(`${host.roomId} / epoch ${host.epoch}。旧音・旧接触を破棄。`);};
$('respawn').onclick=()=>{host.respawn();system.frame();log('同targetIdの世代変更。旧世代Eは復活させません。');};
$('stress').onclick=async()=>{stressRestore=loop.running;loop.setRunning(false);system.cancelAll('fixture_stress');stressUntil=clock.now()+1000;sceneKey='';await Promise.all(Array.from({length:LIMITS.maxActive},()=>issue(selected(),{position:{x:1200,y:-300}})));};
function maskForFrame(){const key=JSON.stringify([host.hidden,host.occluded,host.present,host.targetGeneration]);if(key!==maskKey){cachedMask=host.mask();maskKey=key;}return cachedMask;}
function updateScenes(){const stress=stressUntil>0,key=JSON.stringify([$(`light-bg`).checked,host.occluded,stress]);if(key===sceneKey)return;sceneKey=key;
  native.setScenePixels(fixtureScene(640,256,{light:false,occluded:host.occluded,stress}));
  light.setScenePixels(fixtureScene(640,256,{light:true,occluded:host.occluded,stress}));
  smallDark.setScenePixels(fixtureScene(640,256,{light:false,occluded:host.occluded,stress,nativeSize:32}));
  smallLight.setScenePixels(fixtureScene(640,256,{light:true,occluded:host.occluded,stress,nativeSize:32}));
  hero.setScenePixels(fixtureScene(384,384,{hero:true,light:$('light-bg').checked,occluded:host.occluded}));
}
function updateUI(frames,wallNow){
  const byVariant=new Map(frames.map(f=>[f.event.variant,f])),snapshot=loop.snapshot();
  for(const rows of tiles.values())for(const t of rows){
    const f=byVariant.get(t.variant);t.tile.dataset.active=String(!!f&&f.envelope.body>0);t.tile.dataset.eventId=f?.event.id??'';t.tile.dataset.ageMs=String(f?.ageMs??'');t.fill.style.width=`${f?f.envelope.u*100:0}%`;
    if(wallNow-lastUI>=100)t.status.textContent=f?`${f.envelope.body>0?'RUN':'開始'} ${Math.round(f.ageMs)}/${f.profile.durationMs}ms · ${f.envelope.phase}`:(host.hidden?'不可視 / 抑止':stressUntil?'負荷検査中':loop.running?'再入場待ち':'停止 / idle');
  }
  const focus=byVariant.get(selected());$('hero-name').textContent=`${selected()} · ${profileFor(selected()).label}`;$('phase-fill').style.width=`${focus?focus.envelope.u*100:0}%`;
  if(wallNow-lastUI>=100){lastUI=wallNow;
    $('state').textContent=`${validating?'検査中':loop.running?'自動再生中':'再発行停止'} · active ${frames.length}/10 · 有色包絡 ${snapshot.nonzeroEnvelope} · 提出 ${snapshot.submittedFrames}`;
    $('state').dataset.active=String(frames.length);
    $('focus-state').textContent=focus?`${selected()} · ${Math.round(focus.ageMs)} / ${focus.profile.durationMs} ms`:`${selected()} · idle`;
    $('clock-status').textContent=`検査時計 ${clock.rate}× · 最大Δ16.667ms · 制限 ${snapshot.clock.clampedSteps}回`;
  }
}
const encodeFiles=files=>files.map(f=>({name:f.name,dataBase64:toBase64(typeof f.data==='string'?new TextEncoder().encode(f.data):f.data)}));
function captureNextPresentedFrame(){
  if(!native||fatal||validating||document.hidden)return Promise.reject(new Error('ライブ取得不可: 初期化/停止/検査中/非表示'));
  return new Promise((resolve,reject)=>{const item={resolve,reject,timer:null};item.timer=setTimeout(()=>{pendingCaptures=pendingCaptures.filter(p=>p!==item);reject(new Error('live capture timeout'));},15000);pendingCaptures.push(item);});
}
function cropTile(pixels,width,index,size=64){const out=new Uint8Array(size*size*4),cx=64+index%5*128,cy=64+Math.floor(index/5)*128,h=size/2;for(let y=0;y<size;y++)out.set(pixels.subarray(((cy-h+y)*width+cx-h)*4,((cy-h+y)*width+cx+h)*4),y*size*4);return out;}
async function liveEvidence(captures,snapshot){
  const liveReport={schema:'DVA-E-live-presentation-3',createdAt:new Date().toISOString(),scope:'実際の自動tickが提出した次のフレーム。時刻/イベントを検査側から強制しない。',snapshot,
    status:'captured_not_human_reviewed',backgrounds:[],human_visual_acceptance:'not_run',human_listening:'not_run'};
  const files=[];
  for(const [background,c]of Object.entries(captures)){
    const size=background.endsWith('32')?32:64;
    const scene=fixtureScene(640,256,{light:background.startsWith('light'),occluded:snapshot.sceneParameters.occluded,stress:snapshot.sceneParameters.stress,nativeSize:size});
    const cells=DISPLAY_VARIANTS.map((variant,index)=>({variant,...pixelMetrics(cropTile(c.pixels,c.width,index,size),cropTile(scene,c.width,index,size))}));
    liveReport.backgrounds.push({background,nativeSize:size,cells,width:c.width,height:c.height,rgba_sha256:await sha256(c.pixels)});
    const canvas=document.createElement('canvas');canvas.width=c.width;canvas.height=c.height;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(c.pixels),c.width,c.height),0,0);
    files.push({name:`live-${background}.png`,data:await canvasPNG(canvas)});
  }
  files.push({name:'live-loop.json',data:JSON.stringify(liveReport,null,2)+'\n'});return {report:liveReport,files};
}
async function drawFrame(wallNow){
  if(stressUntil>0&&clock.now()>=stressUntil){stressUntil=0;loop.setRunning(stressRestore);sceneKey='';updateLoopButton();}
  const frames=await loop.step(wallNow);if(document.hidden||validating)return;
  updateScenes();const mask=maskForFrame(),layerMask=Number($('layers').value);
  const sceneParameters={occluded:host.occluded,stress:stressUntil>0,layerMask,reducedMotion:system.reducedMotion};
  const requests=pendingCaptures.splice(0),capture=requests.length>0;
  let views;
  try{views=await submitViews({frames,dark:native,light,hero,smallDark,smallLight,host,mask,selectedVariant:selected(),layerMask,capture});}
  catch(e){for(const r of requests){clearTimeout(r.timer);r.reject(e);}throw e;}
  loop.recordSubmitted(frames);updateUI(frames,wallNow);
  if(!ready&&frames.some(f=>f.envelope.body>0)){ready=true;$('capability').textContent='自動ループの非ゼロ包絡フレームをGPUへ提出済み。dark/lightは同じid・時相です。画素/目視の受入は別記録です。';log('10種の自動再発行を開始。クリック不要。');}
  if(capture){try{const result=await liveEvidence(views.captures,{...loop.snapshot(),sceneParameters});for(const r of requests){clearTimeout(r.timer);r.resolve(result);}}catch(e){for(const r of requests){clearTimeout(r.timer);r.reject(e);}throw e;}}
}
async function tick(wallNow){
  try{if(native&&!fatal&&!validating&&!document.hidden){inFlight=drawFrame(wallNow);await inFlight;}}
  catch(e){fatalError(e);}finally{requestAnimationFrame(tick);}
}
async function exclusive(task){
  if(validating)throw new Error('別の検査を実行中');if(!native||fatal)throw new Error('WebGPU not ready');
  validating=true;for(const r of pendingCaptures.splice(0)){clearTimeout(r.timer);r.reject(new Error('diagnostic_started'));}for(const id of ['validate','lifetimes','capture-live'])$(id).disabled=true;
  try{await inFlight;loop.setSuspended(true);$('state').textContent='証拠取得中 · ライブ再発行を一時停止';return await task();}
  finally{loop.setSuspended(false);validating=false;for(const id of ['validate','lifetimes','capture-live'])$(id).disabled=false;}
}
async function lifetimeEvidence(){return exclusive(()=>captureLifetimeEvidence(native.device,{diagnostics:native.diagnostics,reducedMotion:system.reducedMotion,onProgress:p=>{$('capture-progress').textContent=`${p.variantIndex}/10 · ${p.variant} · H${p.nativeSize} · ${p.index}/${p.total}時点`;}}));}
$('capture-live').onclick=async()=>{try{const result=await captureNextPresentedFrame();downloadBytes(createStoredZip(result.files),'DVA-v4-live-frame.zip');$('capture-progress').textContent='自動tickのH64/H32暗明フレームを取得。目視評価は未実施。';}catch(e){log(e.message);}};
$('lifetimes').onclick=async()=>{try{const result=await lifetimeEvidence();report=result.report;$('validation-result').textContent=JSON.stringify({status:report.status,variants:report.variants.map(v=>({variant:v.variant,status:v.status})),human_visual_acceptance:'not_run'},null,2);$('report').disabled=false;downloadBytes(createStoredZip(result.files),'DVA-v4-lifetime-GPU-evidence.zip');$('capture-progress').textContent=`取得終了: ${report.status}（画素条件のみ。目視/聴感は未評価）`;}catch(e){log(e.message);}};
$('validate').onclick=async()=>{try{report=await exclusive(()=>runBrowserValidation(native.device,native.diagnostics));$('validation-result').textContent=JSON.stringify(report,null,2);$('report').disabled=false;}catch(e){log(e.message);}};
$('report').onclick=()=>{if(report)downloadBytes(new TextEncoder().encode(JSON.stringify(report,null,2)),'DVA-v4-local-validation.json','application/json');};
document.addEventListener('visibilitychange',()=>{loop.setSuspended(document.hidden);if(document.hidden){for(const r of pendingCaptures.splice(0)){clearTimeout(r.timer);r.reject(new Error('document hidden'));}}});
window.addEventListener('pagehide',()=>{audio?.dispose();void window.__fixtureAudioContext?.close();system.dispose();},{once:true});
window.__headshotPreview={system,host,clock,time,loop,issue,batch,get ready(){return ready;},get error(){return fatal;},get renderer(){return native;},get lightRenderer(){return light;},get smallDarkRenderer(){return smallDark;},get smallLightRenderer(){return smallLight;},
  get snapshot(){return loop.snapshot();},captureLive:captureNextPresentedFrame,
  async captureLiveExport(){const r=await captureNextPresentedFrame();return {report:r.report,files:encodeFiles(r.files)};},
  async captureLifetimeExport(){const r=await lifetimeEvidence();return {report:r.report,files:encodeFiles(r.files)};},
  async validate(){return exclusive(()=>runBrowserValidation(native.device,native.diagnostics));}};
try{
  native=await HeadshotRenderer.create({canvas:$('native')});
  light=await HeadshotRenderer.create({canvas:$('native-light'),device:native.device});
  hero=await HeadshotRenderer.create({canvas:$('hero'),device:native.device});
  smallDark=await HeadshotRenderer.create({canvas:$('native32'),device:native.device});
  smallLight=await HeadshotRenderer.create({canvas:$('native32-light'),device:native.device});
  // 初期化終了後に初めて時計を駆動。初回のreadyは非ゼロ包絡の提出後だけ立つ。
  time.resetWall();requestAnimationFrame(tick);
}catch(e){fatalError(e);for(const id of ['validate','lifetimes','capture-live'])$(id).disabled=true;}
