import {ManaRuntime} from '../src/runtime.mjs';
import {ManaRenderer} from '../src/renderer.mjs';
import {ManaAudio} from '../src/audio.mjs';
import {canvasVisible} from '../src/visibility.mjs';
import {DURATION} from '../src/contract.mjs';
const $=id=>document.getElementById(id),canvas=$('view');
const query=new URLSearchParams(location.search),embedded=query.has('embed'),verify=query.has('verify');
let renderer=null,audio=null,audioContext=null,alive=true,mode='live',scrub=0,eventSeq=0,sessionSeq=1,autoAt=0,zoom=1,last=null,scheduled=[];
const actor={playerId:'gallery-recipient',roomId:'gallery-room',sessionId:'gallery-session-1',worldX:0,worldY:0,alive:true,present:true,vented:false,invisible:false,opacity:1,onScreen:true,renderVisible:true};
const runtime=new ManaRuntime({context:{roomId:actor.roomId,sessionId:actor.sessionId},resolveRecipient:id=>id===actor.playerId?{...actor}:null,onInvalidate:r=>renderer?.invalidate(r)});
runtime.setEnvironment({verify,muted:verify||$('mute').checked});
const motion=()=>({moving:$('moving').checked,acc2State:$('rate').value,acc2Effective:$('rate').value==='active'});
const setMotion=()=>{actor.motion=motion();runtime.setOwnerMotion(actor.playerId,actor.motion,performance.now());};setMotion();
const makeEvent=(extra={})=>({id:`gallery-r03-${sessionSeq}-${++eventSeq}`,playerId:actor.playerId,roomId:actor.roomId,sessionId:actor.sessionId,type:'gain-mana',effectKind:'mana',gainClass:'discrete',committed:true,source:'map-object',variant:'normal',manaBefore:4,manaAfter:8,committedAtMs:performance.now(),expiresAtMs:performance.now()+12000,...extra});
function clearScheduled(){for(const t of scheduled)clearTimeout(t);scheduled=[];}
function stopEvents(reason){for(const key of [...runtime.active.keys()])runtime.cancel(key,reason);}
function play(){mode='live';runtime.setEnvironment({verify,muted:verify||$('mute').checked});$('layer').value='31';stopEvents('preview-replay');clearScheduled();setMotion();const result=runtime.admit(makeEvent());autoAt=performance.now()+(DURATION+.38)*1000;if(!result.accepted)$('status').textContent=`抑制：${result.reason}`;}
function schedule(ms,fn){const epoch=runtime.epoch;scheduled.push(setTimeout(()=>{if(alive&&epoch===runtime.epoch)fn();},ms));}
$('play').onclick=play;
$('repeat').onchange=()=>{if($('repeat').checked){autoAt=0;if(mode==='scrub')play();}};
$('burst').onclick=()=>{play();schedule(120,()=>runtime.admit(makeEvent({source:'mystery',variant:'mana-surge'})));schedule(240,()=>runtime.admit(makeEvent()));};
$('switch').onclick=()=>{$('rate').value='off';$('moving').checked=true;play();schedule(400,()=>{$('rate').value='active';setMotion();});schedule(800,()=>{$('rate').value='waiting';setMotion();});schedule(1100,()=>{$('rate').value='off';setMotion();});};
$('rate').onchange=setMotion;$('moving').onchange=setMotion;
$('reduced').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
$('audio').onclick=async()=>{
  if(verify)return;
  try{if(!audioContext)audioContext=new AudioContext({latencyHint:'interactive'});await audioContext.resume();
    if(audioContext.state!=='running')throw new Error('AudioContextがrunningではありません');
    if(!audio){audio=new ManaAudio(audioContext);runtime.audio=audio;}
    $('mute').checked=false;runtime.setEnvironment({muted:false});$('soundStatus').textContent='音：次の新規可視イベントから有効';
  }catch(e){$('soundStatus').textContent=`音：無効 (${e.message})`;}
};
$('mute').onchange=()=>{runtime.setEnvironment({muted:$('mute').checked});$('soundStatus').textContent=$('mute').checked?'音：ミュート':'音：新規可視イベントのみ';};
$('scrub').oninput=()=>{mode='scrub';scrub=Number($('scrub').value)/1000;$('phase').textContent=scrub.toFixed(3);$('repeat').checked=false;clearScheduled();stopEvents('scrub');runtime.setEnvironment({verify:true});};
$('layer').onchange=()=>{if(mode!=='scrub'){$('scrub').value='500';$('scrub').oninput();}};
$('zoom').onchange=()=>{zoom=Number($('zoom').value);canvas.width=480*zoom;canvas.height=208*zoom;canvas.style.width=`${480*zoom}px`;canvas.style.height=`${208*zoom}px`;$('scaleLabel').textContent=zoom===1?'H64 原寸':`H64 × ${zoom} 検査表示`;};
$('eligibility').onchange=()=>{
  const v=$('eligibility').value;Object.assign(actor,{alive:v!=='dead',present:v!=='departed',vented:v==='vented',invisible:v==='invisible',onScreen:v!=='offscreen',renderVisible:v!=='offscreen'});
  if(v!=='normal'){runtime.invalidatePlayer(actor.playerId,v);clearScheduled();}
};
$('session').onclick=()=>{clearScheduled();stopEvents('session-change');mode='live';sessionSeq++;actor.roomId=`gallery-room-${sessionSeq}`;actor.sessionId=`gallery-session-${sessionSeq}`;runtime.setContext({roomId:actor.roomId,sessionId:actor.sessionId});runtime.setEnvironment({verify:false});setMotion();autoAt=performance.now()+1000;};
$('invalid').onclick=()=>{
  for(const patch of [{manaAfter:4},{manaAfter:3},{gainClass:'natural-regeneration'},...['desire-recovery','renki','renki-tenfold'].map(variant=>({variant}))]){
    const r=runtime.admit(makeEvent(patch));runtime.record('excluded-fixture',null,r.reason);
  }
};
function download(name,obj){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save').onclick=()=>download('mana-r03-session-record.json',{version:'0.3.0',environment:{userAgent:navigator.userAgent,devicePixelRatio,canvas:[canvas.width,canvas.height],zoom},renderer:renderer?.diagnostics,runtime:runtime.audit,audio:audio?.audit||[],qualityObservation:'not_run',listening:'not_run',note:'この自動記録は人による読解/聴感を判定しません。'});
function visibilityChanged(){const v=canvasVisible(canvas,{ignoreOwnVisibility:true});runtime.setEnvironment({visible:v});if(!v){clearScheduled();audio?.stopAll();}}
document.addEventListener('visibilitychange',visibilityChanged);window.addEventListener('scroll',visibilityChanged,{passive:true});window.addEventListener('resize',visibilityChanged);
new IntersectionObserver(visibilityChanged,{threshold:0}).observe(canvas);
window.addEventListener('pagehide',()=>{alive=false;clearScheduled();runtime.dispose();audio?.dispose();renderer?.dispose();audioContext?.close();});
async function step(){
  if(!alive)return;
  try{
    const now=performance.now();const visible=canvasVisible(canvas,{ignoreOwnVisibility:true});
    if(visible!==runtime.environment.visible)runtime.setEnvironment({visible});
    if(visible){
      if(mode==='live'&&$('repeat').checked&&runtime.active.size===0&&now>=autoAt)play();
      const frame=mode==='live'?runtime.prepare(now,{reducedMotion:$('reduced').checked}):{epoch:runtime.epoch,serial:0,at:now,items:[{key:'scrub-only',token:1,worldX:0,worldY:0,phase:scrub,opacity:1,reducedMotion:$('reduced').checked}]};
      const preparedMode=mode;
      last=await renderer.draw(frame,{theme:'both',scale:.5*zoom,footY:150*zoom,layers:Number($('layer').value),verify:mode==='scrub',current:()=>preparedMode===mode&&(mode==='scrub'||runtime.current(frame))});
      if(last&&mode==='live')runtime.commit(last,performance.now());
      const s=[...runtime.active.values()][0];
      if(mode==='live')$('status').textContent=s?`再生中 · ${s.clock.rate}× · ${runtime.active.size}件`:'待機';else $('status').textContent='無音検査';
      if($('technical').open)$('log').textContent=JSON.stringify({phase:mode==='scrub'?scrub:s?.clock.phase??null,active:runtime.active.size,shader:renderer.diagnostics.shaderCompilation,submission:renderer.diagnostics.gpuSubmission,visibleTokens:last?.visibleTokens||[],recentEvents:runtime.audit.slice(-8)},null,2);
    }
  }catch(e){runtime.failGPU('render-failed');$('status').textContent=`GPU停止：${e.message}`;console.error(e);alive=false;}
  if(alive)requestAnimationFrame(step);
}
try{
  renderer=await ManaRenderer.create(canvas,{onFatal:message=>{runtime.failGPU(message);$('status').textContent=`GPU停止：${message}`;}});
  for(const id of ['play','burst','switch'])$(id).disabled=false;
  $('status').textContent='準備完了・初期無音';globalThis.__manaR03={runtime,renderer,play};if(verify){$('audio').disabled=true;$('mute').disabled=true;}if(embedded){$('repeat').checked=true;play();}requestAnimationFrame(step);
}catch(e){$('status').textContent=`WebGPU未起動：${e.message}`;$('log').textContent=e.stack;console.error(e);}
