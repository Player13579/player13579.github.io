import {createGPUResources,ContactRenderer,HeadshotContactSystem,RateClock,ContactAudio,VARIANTS,CONTACT} from '../src/index.mjs';
import {FixtureHost,PresentationClock,fixtureScene,projection} from './fixture.mjs';
import {makeZip,download,pngFromPixels} from './zip.mjs';
import {lifetimeEvidence,compatibilityEvidence,pixelMetrics} from './evidence.mjs';
import {audioAllowed} from './gallery-adapter.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),verifyMode=!audioAllowed(location.search),log=t=>{$('log').textContent=(String(t)+'\n'+$('log').textContent).slice(0,9000);};
for(const variant of VARIANTS){const o=document.createElement('option');o.value=o.textContent=variant;$('variant').append(o);}
const presentation=new PresentationClock(),clock=new RateClock({sourceNow:presentation.now}),host=new FixtureHost(clock),sound=new ContactAudio();
const system=new HeadshotContactSystem({clock,verifyCanonical:host.verifyCanonical,getPermission:host.getPermission,sound:verifyMode?null:sound,roomId:host.roomId,epoch:host.epoch});
if(verifyMode){$('sound').hidden=true;$('sound').disabled=true;$('evidence-status').textContent='verify · audio muted';}
const media=matchMedia('(prefers-reduced-motion: reduce)');$('reduced').checked=media.matches;system.setReducedMotion(media.matches);
let resources,views=[],ready=false,running=true,testing=false,closed=false,cycles=0,submissions=0,lastPacket=null,lastFrames=[],busy=Promise.resolve(),liveRequest=null;
const stats={minPositiveU:1,maxPositiveU:0,positiveFrames:0,clampSteps:0};
function snapshot(){const f=lastFrames[0];return {ready,running,testing,active:system.activeCount,cycles,submissions,variant:f?.event.variant??null,id:f?.event.id??null,ageMs:f?.ageMs??null,u:f?.envelope.u??null,phase:f?.envelope.phase??null,...stats,clockMode:'submission-following, not wall-time benchmark'};}
function update(){const s=snapshot();$('active').textContent=`active=${s.active}`;$('cycle').textContent=`cycle=${cycles}`;$('time').textContent=`u=${(s.u??0).toFixed(3)}`;$('phase').textContent=s.phase??'可視な正規接触を待機';$('progress').value=s.u??0;$('clock-note').textContent=`提出追従時計・最大16.667ms/提出。制限 ${presentation.clampedSteps}回 / 切り捨て実時間 ${Math.round(presentation.discardedWallMs)}ms。描画性能測定ではありません。`;}
function layerFlags(){return [...document.querySelectorAll('.layer')].reduce((n,e)=>n+(e.checked?Number(e.value):0),0);}
async function draw(capture=false){
  const mask=host.mask(),flags=layerFlags(),results=await Promise.all(views.map(async v=>{
    const record=lastFrames.map(frame=>({frame,mask,projection:projection(v.size)}));
    const result=v.renderer.render(record,{layerMask:flags,capture});await v.renderer.submitted();return {view:v,result};
  }));return results;
}
async function tick(wall){
  if(closed)return;
  if(testing||document.hidden){presentation.rebase();requestAnimationFrame(tick);return;}
  let currentCapture=null;
  try{
    presentation.advance(wall);lastFrames=system.frame();
    if(running&&lastFrames.length===0&&host.visible&&host.present){lastPacket=host.issue($('variant').value);const receipt=await system.accept(lastPacket);if(receipt.accepted)cycles++;lastFrames=system.frame();}
    const request=liveRequest;currentCapture=request;liveRequest=null;busy=draw(Boolean(request));const results=await busy;submissions++;
    const f=lastFrames[0];if(f?.envelope.body>0){stats.positiveFrames++;stats.minPositiveU=Math.min(stats.minPositiveU,f.envelope.u);stats.maxPositiveU=Math.max(stats.maxPositiveU,f.envelope.u);}stats.clampSteps=presentation.clampedSteps;update();
    if(request){const report={snapshot:snapshot(),views:[],scope:'次の実自動提出のreadback。目視判定は未実施。'},files=[];for(const {view:v,result} of results){report.views.push({name:v.name,...pixelMetrics(result.pixels,v.scene)});files.push({name:v.name+'.png',data:await pngFromPixels(result)});}files.push({name:'live.json',data:JSON.stringify(report,null,2)});request.resolve({files,report});}
  }catch(error){ready=false;running=false;$('status').textContent='実行停止: '+error.message;log(error.stack??error);if(currentCapture)currentCapture.reject(error);if(liveRequest){liveRequest.reject(error);liveRequest=null;}return;}
  requestAnimationFrame(tick);
}
function captureNext(){if(!ready||testing||liveRequest)return Promise.reject(new Error('capture unavailable'));return new Promise((resolve,reject)=>{liveRequest={resolve,reject};});}
async function exclusive(task){if(testing||!ready||liveRequest)throw new Error('検査開始不可');testing=true;try{await busy;system.cancelAll('evidence-started');lastFrames=[];return await task();}finally{presentation.rebase();testing=false;}}
async function runLifetime(){return exclusive(()=>lifetimeEvidence(resources,(n,total)=>{$('evidence-status').textContent=`GPU取得 ${n}/${total}（品質の自動合格ではありません）`;}));}
async function runCompatibility(){return exclusive(()=>compatibilityEvidence(resources));}
window.contactPreview={snapshot,captureNext,runLifetime,runCompatibility,resources:()=>({compilation:resources?.compilation,adapterInfo:resources?.adapterInfo}),setInput:variant=>{if(!VARIANTS.includes(variant))throw new TypeError('variant');$('variant').value=variant;}};
$('loop').onclick=()=>{running=!running;$('loop').textContent=`自動ループ ${running?'ON':'OFF'}`;$('loop').setAttribute('aria-pressed',String(running));};
$('sound').onclick=async()=>{if(verifyMode)return;try{await sound.unlock();$('sound').textContent='音声ON / 次の新規IDから';}catch(e){log(e.message);}};
$('rate').onchange=()=>clock.setRate(Number($('rate').value));
$('reduced').onchange=()=>system.setReducedMotion($('reduced').checked);
media.addEventListener?.('change',e=>{$('reduced').checked=e.matches;system.setReducedMotion(e.matches);});
$('hidden').onchange=()=>{host.visible=!$('hidden').checked;if(!host.visible)system.cancelAll('target-hidden');};
$('wall').onchange=()=>{host.occlusion=$('wall').checked;};$('protect').onchange=()=>{host.protect=$('protect').checked;};$('surface').onchange=()=>{host.receiver=$('surface').checked;};
$('generation').onclick=()=>host.respawn();$('room').onclick=()=>{host.nextRoom();system.setSession(host.roomId,host.epoch);};
$('duplicate').onclick=async()=>{if(lastPacket)log(JSON.stringify(await system.accept(lastPacket)));};
$('capture').onclick=async()=>{try{const v=await captureNext();download(makeZip(v.files),'DVA-headshot-v5-live.zip');$('evidence-status').textContent='ライブreadback取得済み。目視は未評価。';}catch(e){log(e.message);}};
$('lifetime').onclick=async()=>{try{const v=await runLifetime();download(makeZip(v.files),'DVA-headshot-v5-lifetime.zip');$('evidence-status').textContent=`全寿命数値: ${v.report.status} / 目視: not_run`;}catch(e){log(e.stack??e);}};
$('compatibility').onclick=async()=>{try{const v=await runCompatibility();download(new TextEncoder().encode(JSON.stringify(v,null,2)),'DVA-headshot-v5-compatibility.json','application/json');log(JSON.stringify(v,null,2));}catch(e){log(e.stack??e);}};
document.addEventListener('visibilitychange',()=>{if(document.hidden){system.cancelAll('page-hidden');lastFrames=[];presentation.rebase();}});
window.addEventListener('pagehide',()=>{closed=true;system.dispose();sound.dispose();views.forEach(v=>v.renderer.dispose());});
try{
  resources=await createGPUResources();
  resources.device.addEventListener('uncapturederror',e=>{log('WebGPU: '+e.error.message);});
  for(const [name,size,light] of [['hero',320,false],['dark64',64,false],['light64',64,true],['dark32',32,false],['light32',32,true]]){const renderer=new ContactRenderer($(name),resources),scene=fixtureScene(size,light);renderer.setScenePixels(scene);views.push({name,size,renderer,scene});}
  ready=true;$('status').textContent='WebGPU初期化済み / 単一Eを自動ループ';requestAnimationFrame(tick);
}catch(error){$('status').textContent='WebGPU未実行: '+error.message;log(error.stack??error);$('evidence-status').textContent='GPU: not_run（初期化失敗）。別の描画で代替しません。';}
