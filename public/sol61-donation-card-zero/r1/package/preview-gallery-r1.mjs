import {DonationRenderer,DonationPlayback} from './runtime.mjs';
import {createDonationGalleryAudioBridge} from './gallery-audio-bridge.mjs';
const query=new URL(location.href).searchParams;
const verify=query.has('verify'),embed=query.get('embed')==='1';
const $=s=>document.getElementById(s);let counter=0,playback,loopTimer=0,disposed=false;
const fixture=()=>({kind:'donation-settled',success:true,id:`gallery-synthetic-${++counter}`,amount:100,recipientId:'synthetic-payment-intake',source:{x:82,y:82},recipient:{x:242,y:82},settledAt:performance.now(),synthetic:true});
$('audio').textContent=verify?'検証モード：音源の生成・再生は強制停止。映像は通常の時間軸で再生します。':'音は再生操作後のみ。通常SFX聴感確認は未実施。';
try{
  if(embed){document.body.classList.add('embed');}
  const renderers=[];for(const id of embed?['large']:['large','native'])renderers.push(await DonationRenderer.create($(id)));
  playback=new DonationPlayback(renderers,{verify});playback.receipt=fixture();
  globalThis.donationCard={snapshot:()=>playback.snapshot(),receive:r=>playback.receive(r),hold:ms=>playback.hold(ms),cancel:()=>playback.cancel(),dispose:()=>playback.dispose(),fixture};
const galleryAudio=createDonationGalleryAudioBridge({playback,verify,itemId:'donation-card-zero-sol61-r1'});
globalThis.__donationCardGallery=Object.freeze({get audioEnabled(){return galleryAudio.enabled;},get visualReady(){return Boolean(playback&&renderers.every(r=>r.ready&&!r.disposed));}});
  for(const id of ['play','stop','phase'])$(id).disabled=false;
  $('play').onclick=()=>{playback.options={source:$('source').checked,obs:$('obs').checked};playback.receive(fixture());$('status').textContent='模擬成功レシート：カード読取 → 決済成立 → 金貨送付。';};
  $('stop').onclick=()=>{playback.cancel();$('status').textContent='停止 / この原因の有限Eは消失';};
  const hold=ms=>{playback.hold(ms);$('ms').textContent=`${ms} ms`;};
  $('phase').onchange=()=>hold(Number($('phase').value));$('time').oninput=()=>hold(Number($('time').value));
  for(const id of ['source','obs'])$(id).onchange=()=>{playback.options[id]=$(id).checked;playback.draw(playback.timeMs);};
  $('status').textContent='準備完了。実GPU診断と提出数は donationCard.snapshot() で取得できます。品質合格・採用は未判定。';
  if(embed){const repeat=()=>{if(disposed)return;playback.receive(fixture(),{audio:galleryAudio.enabled});loopTimer=setTimeout(repeat,3500);};repeat();}
  addEventListener('pagehide',()=>{disposed=true;clearTimeout(loopTimer);void playback.dispose();},{once:true});
}catch(e){document.body.classList.add('failed');$('status').textContent=`初期化失敗: ${e.message}`;globalThis.donationCardFailure={message:e.message,stack:e.stack};throw e;}
