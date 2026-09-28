import {VERSION, QUALITY, LIFE_MS, TaserController, canDisclose, phaseAt} from './contract.js';
import {ContactSound} from './sound.js';
import {ContactRenderer} from './renderer.js';

const $ = id => document.getElementById(id);
const query = new URLSearchParams(location.search);
const verifyMode = query.get('mode') !== 'normal';
const sound = new ContactSound({verify: verifyMode});
const renderer = new ContactRenderer($('preview'));
let accessState = 'visible', running = true, inspecting = false, manualAge = 160, sequence = 0, loopStart = 0;
let presentationMode='native',presentBusy=false,presentationEpoch=0,presentedFrames=0;
let lastReadout = 0, lastBench = null, lastCapture = null, pendingFrame = 0;
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
$('reduced').checked = query.get('reduced') === '1' || motionPreference.matches;
$('mode').value = verifyMode ? 'verify' : 'normal'; $('unlock').disabled=verifyMode;
const resolveAccess = () => ({disclosed:accessState!=='private',visible:accessState==='visible'||accessState==='partial',
  effectAllowed:accessState==='visible'||accessState==='partial',alive:accessState!=='dead'});
const controller = new TaserController({resolveAccess,sound});

function previewEvent() {
  return {type:'action-taser',id:`local-preview-${++sequence}`,playerId:'fixture-shooter',targetId:'fixture-target',
    x:0,y:0,radius:95,variant:'',targetX:null,targetY:null};
}
function emitFresh() {
  loopStart=performance.now(); controller.ingest(previewEvent(),loopStart);
  inspecting=false;manualAge=0;
}
function options() { return {world:$('world').checked,bloom:$('bloom').checked,receiver:$('receiver').checked}; }
function displayRecords(age,{effect=true,reduced=$('reduced').checked,access=resolveAccess()}={}) {
  if (!canDisclose(access)) return [];
  const width=renderer.width/renderer.pixelRatio,height=renderer.height/renderer.pixelRatio;
  // 原寸H64はCSS pxに固定。ウィンドウ幅によって対象まで縮めない。
  const points=[{x:width*.25,y:height*.245,scale:1,clip:[0,0,width*.5,height*.43]},
    {x:width*.75,y:height*.245,scale:1,clip:[width*.5,0,width,height*.43]},
    {x:width*.25,y:height*.725,scale:3,clip:[0,height*.43,width*.5,height]},
    {x:width*.75,y:height*.725,scale:3,clip:[width*.5,height*.43,width,height]}];
  return points.map(p=>({...p,ageMs:age,reduced,showTarget:true,effect:effect&&age<LIFE_MS,
    partialOccluder:accessState==='partial'}));
}
async function presentReadback() {
  if(presentationMode!=='readback'||presentBusy)return;
  presentBusy=true;const epoch=presentationEpoch;
  try {
    const pixels=await renderer.readPixels();
    if(epoch!==presentationEpoch)return;
    const view=$('present-view');
    if(view.width!==pixels.width)view.width=pixels.width;
    if(view.height!==pixels.height)view.height=pixels.height;
    view.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels.bytes),pixels.width,pixels.height),0,0);
    presentedFrames++;
  }catch(e){fatal(e);}finally{presentBusy=false;}
}
function invalidatePresentation(){
  presentationEpoch++;
  // GPU queueより先に表示面を閉じ、取消し前のnative frameも画面に残さない。
  const visibility=canDisclose(resolveAccess())?'visible':'hidden';
  $('preview').style.visibility=visibility;$('present-view').style.visibility=visibility;
  const v=$('present-view');if(!v.hidden)v.getContext('2d').clearRect(0,0,v.width,v.height);
}
function drawAt(age,{inspection=false,forceEffect=false}={}) {
  const active=controller.tick();
  const effect=inspection||forceEffect||active.length>0;
  renderer.render(displayRecords(age,{effect}),options());presentReadback();
}
function updateReadout(age) {
  const displayed=Math.max(0,Math.min(LIFE_MS,Math.round(age)));
  $('timeline').value=String(displayed);$('time').textContent=`${String(displayed).padStart(4,'0')} / 1200 ms`;
  $('phase').textContent=!canDisclose(resolveAccess())?'非公開 / 対象・E・音を遮断':phaseAt(age);
  const r=renderer.diagnostics(),s=sound.diagnostics();
  $('errors').textContent=String(r.errors.length);$('perf').textContent=r.cpuEncodeMedianMs===null?'—':`${r.cpuEncodeMedianMs.toFixed(2)} ms`;
  $('sound-count').textContent=`${s.started} / ${s.state}`;
}
function frame(now) {
  if(!renderer.ready)return;
  if(presentationMode==='readback'&&presentBusy){controller.tick();pendingFrame=requestAnimationFrame(frame);return;}
  try {
    if(running&&!inspecting&&now-loopStart>=1800)emitFresh();
    const age=inspecting?manualAge:now-loopStart;
    drawAt(age,{inspection:inspecting});
    if(now-lastReadout>90){updateReadout(age);lastReadout=now;}
    pendingFrame=requestAnimationFrame(frame);
  } catch(e) {fatal(e);}
}
function setInspect(age) {
  running=false;inspecting=true;manualAge=age;$('play').textContent='自動ループ再開';
  // 検査は時刻サンプルであり、成功イベントやSFXを再発行しない。
  for(const instance of controller.tick())sound.cancel(instance.event.id);
  drawAt(age,{inspection:true});updateReadout(age);
}
function fatal(e) {
  const message=e instanceof Error?e.message:String(e);$('fatal').classList.add('visible');$('fatal').textContent=message;
  $('status').textContent='描画未成立 · エラー記録を参照';$('status').style.color='#ffa990';
  $('log').textContent=JSON.stringify({status:'failed',message},null,2);
  cancelAnimationFrame(pendingFrame);globalThis.__labError=message;
}
function downloadBlob(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function diagnostics() {
  return {version:VERSION,quality:QUALITY,generatedAt:new Date().toISOString(),runtime:{userAgent:navigator.userAgent,secureContext:isSecureContext},
    renderer:renderer.diagnostics(),controller:controller.diagnostics(),sound:sound.diagnostics(),
    mode:$('mode').value,reducedMotion:$('reduced').checked,privacyCase:accessState,
    presentation:{mode:presentationMode,readbackPresentedFrames:presentedFrames,description:presentationMode==='readback'?'WebGPUで計算した画素をCanvas2Dへ転送。Canvas2DでEを描いてはいない。':'native GPU canvas'},
    lastBenchmark:lastBench,lastCapture,gameConnection:'not-connected',humanListening:'not_run',
    note:'診断用fixtureの記録。対象ID・射手ID・event座標・秘匿座標は出力しない。'};
}
async function pixelCapture() {
  if(!canDisclose(resolveAccess())) {
    await renderer.device.queue.onSubmittedWorkDone();
    renderer.render([],options());await renderer.device.queue.onSubmittedWorkDone();
  }
  const r=await renderer.readPixels();
  // Canvas2Dは既にWebGPUで生成された画素をPNGへ保存するだけ。Eの描画には使わない。
  const c=document.createElement('canvas');c.width=r.width;c.height=r.height;
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(r.bytes),r.width,r.height),0,0);
  lastCapture={width:r.width,height:r.height,mode:inspecting?'sampled-phase':'live',ageMs:inspecting?manualAge:performance.now()-loopStart,
    source:'WebGPU output texture readback',adapter:renderer.adapterInfo};
  return new Promise(resolve=>c.toBlob(resolve,'image/png'));
}
async function runBenchmark({frames=40,warmup=8}={}) {
  setInspect(360);cancelAnimationFrame(pendingFrame);$('benchmark').disabled=true;
  const results=[];try{
    for(const count of [1,8,32]){
      const width=renderer.width/renderer.pixelRatio,height=renderer.height/renderer.pixelRatio;
      const cols=8,rows=4;
      const records=Array.from({length:count},(_,n)=>({x:(n%cols+.5)*width/cols,y:(Math.floor(n/cols)+.5)*height/rows,
        scale:1,ageMs:160,clip:[0,0,width,height],reduced:$('reduced').checked,partialOccluder:false,showTarget:true,effect:true}));
      results.push(await renderer.benchmark(records,{frames,warmup}));
    }
    lastBench={results,interpretation:'同期queue完了までのホスト所要時間。GPU timestamp・ゲーム統合性能ではない。'};
    $('log').textContent=JSON.stringify(lastBench,null,2);return lastBench;
  } finally {$('benchmark').disabled=false;pendingFrame=requestAnimationFrame(frame);}
}

$('play').onclick=()=>{if(running&&!inspecting)setInspect(performance.now()-loopStart);else{running=true;inspecting=false;$('play').textContent='一時停止';emitFresh();}};
$('replay').onclick=()=>{running=true;inspecting=false;$('play').textContent='一時停止';emitFresh();};
$('timeline').oninput=e=>setInspect(Number(e.target.value));
for(const b of document.querySelectorAll('[data-time]'))b.onclick=()=>setInspect(Number(b.dataset.time));
$('mode').onchange=()=>{const verify=$('mode').value==='verify';sound.setVerify(verify);$('unlock').disabled=verify;$('unlock').textContent='音を有効化';};
$('unlock').onclick=async()=>{try{const ok=await sound.unlockFromGesture();$('unlock').textContent=ok?'音: 有効（新規IDから）':'音: 未有効';}catch(e){$('status').textContent=`音声エラー: ${e.message}`;}};
$('volume').oninput=e=>sound.setVolume(Number(e.target.value));
$('visibility').onchange=()=>{accessState=$('visibility').value;invalidatePresentation();controller.tick();if(renderer.ready)drawAt(inspecting?manualAge:performance.now()-loopStart,{inspection:inspecting});};
$('present-mode').onchange=()=>{const value=$('present-mode').value;presentationMode=value==='auto'?(renderer.adapterInfo.classification==='software-adapter'?'readback':'native'):value;$('present-view').hidden=presentationMode==='native';invalidatePresentation();$('status').textContent=presentationMode==='readback'?'WebGPU稼働 / 互換readback表示（転送のみCPU）':'WebGPU稼働 / native表示';if(inspecting)drawAt(manualAge,{inspection:true});};
$('export').onclick=()=>downloadBlob(new Blob([JSON.stringify(diagnostics(),null,2)],{type:'application/json'}),`action-taser-${VERSION}-diagnostics.json`);
$('capture').onclick=async()=>{try{const blob=await pixelCapture();if(blob)downloadBlob(blob,`action-taser-${VERSION}-pixels.png`);}catch(e){fatal(e);}};
$('benchmark').onclick=()=>runBenchmark().catch(fatal);
// 非表示タブでの音の遅延・復帰時のイベント再発行を避ける。
document.addEventListener('visibilitychange',()=>{if(document.hidden){controller.dispose();for(const v of controller.tick())sound.cancel(v.event.id);}});
addEventListener('pagehide',()=>{controller.dispose();sound.dispose();cancelAnimationFrame(pendingFrame);});

(async()=>{
  try {
    await renderer.init();
    presentationMode=query.get('present')??(renderer.adapterInfo.classification==='software-adapter'?'readback':'native');
    if(presentationMode!=='native')presentationMode='readback';
    $('present-view').hidden=presentationMode==='native';
    const fit=()=>{const cssW=$('preview').getBoundingClientRect().width,oldSize=`${renderer.width}/${renderer.height}`;renderer.resize(cssW,cssW/2,Math.min(devicePixelRatio||1,2));if(oldSize!==`${renderer.width}/${renderer.height}`)invalidatePresentation();};
    fit();new ResizeObserver(fit).observe($('preview'));
    $('adapter').textContent=`${renderer.adapterInfo.description||renderer.adapterInfo.architecture||renderer.adapterInfo.vendor||'name unavailable'} / ${renderer.adapterInfo.classification}`;
    $('status').textContent=presentationMode==='readback'?'WebGPU稼働 / 互換readback表示（転送のみCPU）':'WebGPU稼働 / native表示';
    emitFresh();pendingFrame=requestAnimationFrame(frame);
    // 自動検査API。座標は固定fixtureだけ。ゲームのprivate dataには接続されていない。
    globalThis.__lab={ready:true,renderer,controller,sound,diagnostics,runBenchmark,pixelCapture,
      sample:async(age,{reduced=false,privacy='visible',world=true,bloom=true,receiver=true}={})=>{
        cancelAnimationFrame(pendingFrame);await renderer.device.queue.onSubmittedWorkDone();
        const changedPrivacy=accessState!==privacy;accessState=privacy;if(changedPrivacy)invalidatePresentation();$('visibility').value=privacy;$('reduced').checked=reduced;
        $('world').checked=world;$('bloom').checked=bloom;$('receiver').checked=receiver;
        setInspect(age);await renderer.device.queue.onSubmittedWorkDone();return diagnostics();
      },
      readPixels:()=>renderer.readPixels(), fresh:()=>emitFresh(),
      setPrivacy:value=>{accessState=value;invalidatePresentation();$('visibility').value=value;controller.tick();},
      burst:n=>{for(let i=0;i<n;i++)controller.ingest(previewEvent());return controller.diagnostics();},
      stop:()=>{setInspect(360);cancelAnimationFrame(pendingFrame);},
      resume:()=>{running=true;inspecting=false;emitFresh();cancelAnimationFrame(pendingFrame);pendingFrame=requestAnimationFrame(frame);}};
  }catch(e){fatal(e);}
})();
