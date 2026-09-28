import {HeartReceiptCore} from '../src/core.mjs';
import {ReceiptLedger,WallClock} from '../src/contract.mjs';
import {createCanvasRenderer} from '../src/gpu.mjs';
import {HeartSFX} from '../src/sfx.mjs';
import {createFixtureAuthority} from './fixture.mjs';
const $=id=>document.getElementById(id),verify=new URLSearchParams(location.search).get('verify')==='1';
const authority=createFixtureAuthority(),clock=new WallClock(),ledger=new ReceiptLedger();
const sound=new HeartSFX({verify}),renderers=[],canvases=[$('dark'),$('light')];
let dead=false,raf=0,nextLoop=0,last=null,displayStart=0,pending=[],lastStatus='初期化中';
const systemReduced=matchMedia('(prefers-reduced-motion: reduce)');
if(verify){$('mode').textContent='VERIFY / 無音・模擬権威';$('sound').disabled=true;}
const context=()=>({...authority.scope,viewerId:$('other').checked?'other':authority.scope.viewerId});
const core=new HeartReceiptCore({verifyEnvelope:authority.verifyEnvelope,isCanonicalId:authority.isCanonicalId,getContext:context,getVisibility:()=>({visible:!$('invisible').checked&&renderers.length===2&&renderers.every(r=>r.gpu.ready),onScreen:!$('offscreen').checked,occluded:$('occluded').checked,documentVisible:!document.hidden}),ledger,clock,onStart:p=>sound.playOnce({id:p.id,ageMs:clock.now()-p.firstReceivedAt}),onStop:p=>sound.stop(p.id)});
function schedule(){if(dead)return;const now=clock.now();displayStart=now;pending.push(now);if($('multi').checked)pending.push(now+140,now+280);nextLoop=now+2200;}
async function deliver(){last=authority.mint();const r=await core.receive(last);lastStatus=r.ok?'receipt受領':`抑止: ${r.reason}`;}
$('sound').addEventListener('click',async e=>{try{$('sound').textContent=(await sound.unlockFromGesture(e))?'音は有効（以後の新ID）':'音は無効';}catch{$('sound').textContent='AudioContext利用不可';}});
$('once').addEventListener('click',schedule);
$('duplicate').addEventListener('click',async()=>{if(last){const r=await core.receive(last);lastStatus=`同ID再送: ${r.reason||'unexpected'}`;}});
$('dispose').addEventListener('click',dispose);
async function dispose(){if(dead)return;dead=true;cancelAnimationFrame(raf);pending=[];core.dispose();await sound.dispose();renderers.forEach(r=>r.dispose());document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',dispose);$('phase').textContent='解放済み。再開にはページを再読み込みしてください。';$('stats').textContent=JSON.stringify({core:core.stats(),audio:sound.stats(),GPU:'disposed'},null,2);document.querySelectorAll('button').forEach(b=>b.disabled=true);}
function hide(){if(document.hidden){pending=[];core.cancelAll('hidden');sound.stopAll();renderers.forEach(r=>r.draw({items:[]}));}}
document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',dispose);
function frame(){
  if(dead)return;
  const now=clock.now();if($('loop').checked&&now>=nextLoop&&!document.hidden)schedule();
  for(const t of pending.filter(t=>t<=now))void deliver();pending=pending.filter(t=>t>now);
  const active=core.tick();
  canvases.forEach((c,i)=>{const dpr=Math.min(3,devicePixelRatio||1),w=Math.round(c.clientWidth*dpr),h=Math.round(c.clientHeight*dpr);if(c.width!==w||c.height!==h){c.width=w;c.height=h;}renderers[i]?.draw({items:active.map(p=>({x:w/2,y:h/2,h:64*dpr,ageMs:p.ageMs,dpr})),reducedMotion:$('reduced').checked||systemReduced.matches,glow:$('glow').checked});});
  const age=Math.min(1800,Math.max(0,now-displayStart));$('progress').style.width=`${age/18}%`;
  $('phase').textContent=`${age<460?'準備':age<980?'作用':age<1800?'消失':'無表示間隔'} / ${Math.round(age)} ms · ${lastStatus}`;
  $('stats').textContent=JSON.stringify({mode:verify?'verify（音声資源ゼロ）':'normal',active:core.stats().active,ledger:ledger.size,rejections:core.stats().rejections,audio:sound.stats(),GPU:renderers.map(r=>({ready:r.gpu.ready,errors:r.gpu.errors()}))},null,2);
  raf=requestAnimationFrame(frame);
}
try{for(const c of canvases)renderers.push(await createCanvasRenderer(c));lastStatus='WebGPU準備完了';schedule();frame();}
catch(e){lastStatus=String(e.message);$('phase').textContent='描画未実行';$('stats').textContent=`WebGPU初期化失敗: ${lastStatus}\n代替描画をWebGPU成功とは扱いません。\nlocalhostまたはHTTPSの対応環境で実行してください。`;renderers.forEach(r=>r.dispose());}
// 自動検査用は読み取りのみ。本編にfixture注入の入口を作らない。
window.heartPreview=Object.freeze({stats:()=>({core:core.stats(),audio:sound.stats(),gpu:renderers.map(r=>r.gpu.ready)}),dispose});
