import {ManaEffectController,ManaOneShotAudio,EFFECT_DURATION_SECONDS,H64_WORLD_TO_CSS,evaluatePhase} from '../src/index.mjs';
const $=id=>document.getElementById(id),canvas=$('stage');
const context={roomId:'gallery-room-1',sessionId:'gallery-session-1'};
let actor={playerId:'receiver-demo',roomId:context.roomId,sessionId:context.sessionId,alive:true,present:true,vented:false,invisible:false,opacity:1,onScreen:true,renderVisible:true,worldX:0,worldY:0};
let controller,audioContext,lastEvent,seq=0,session=1,scrubbing=false,lastSpawn=0,scale=1,scrubPending=null,scrubRunning=false;
const params=new URLSearchParams(location.search);$('verify').checked=params.has('verify');
$('reduced').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
function views(){const d=canvas.width/256,z=d*H64_WORLD_TO_CSS;return [
  {rect:[0,0,canvas.width/2,canvas.height],background:[.006,.010,.016,1],project:(x,y)=>[(64+x*H64_WORLD_TO_CSS)*d,(92+y*H64_WORLD_TO_CSS)*d],scale:z},
  {rect:[canvas.width/2,0,canvas.width/2,canvas.height],background:[.76,.80,.78,1],project:(x,y)=>[(192+x*H64_WORLD_TO_CSS)*d,(92+y*H64_WORLD_TO_CSS)*d],scale:z},
];}
function resize(){
  scale=Number($('scale').value);const dpr=Math.max(1,devicePixelRatio||1);
  // 両viewport幅が整数になるよう偶数にそろえる。
  canvas.width=Math.round(256*scale*dpr/2)*2;canvas.height=Math.round(112*scale*dpr);
  canvas.style.width=`${256*scale}px`;canvas.style.height=`${112*scale}px`;
  $('scaleLabel').textContent=scale===1?'H64 実寸 / 0.5 CSS px per world unit':`${scale}倍表示 / H${64*scale}（H64判定ではない）`;
}
function motion(){return {moving:$('moving').checked,acc2State:$('acc2').value,acc2Effective:$('acc2').value==='active'};}
function changeMotion(){const m=motion();actor.motion=m;controller?.setOwnerMotion(actor.playerId,m);$('rateLabel').textContent=`進行率 ${m.moving&&m.acc2Effective?2:1}×（所有者のみ）`;}
function event(overrides={}){const now=performance.now();return {id:`gallery-gain-${session}-${++seq}`,playerId:actor.playerId,roomId:context.roomId,sessionId:context.sessionId,type:'gain-mana',effectKind:'mana',committed:true,gainClass:'discrete',source:'map-object',variant:'normal',manaBefore:40,manaAfter:44,committedAtMs:now,expiresAtMs:now+8000,...overrides};}
function spawn(e=event()){if(scrubbing)return;lastEvent=e;lastSpawn=performance.now();const r=controller.admit(e);$('status').textContent=r.accepted?`模擬確定通知 ${e.id} を受理。可視GPUフレームを確認して開始します。`:`抑制: ${r.reason}`;updateLog();return r;}
function updateLog(){if(controller)$('log').textContent=controller.engine.log.slice(-18).map(x=>JSON.stringify(x)).join('\n');}
function onFrame({frame}){
  const item=frame.items.at(-1),u=item?.phase??0,s=evaluatePhase(u);
  $('phaseName').textContent=item?s.phase:'終了 / 待機';$('phaseValue').textContent=`${(u*EFFECT_DURATION_SECONDS).toFixed(3)} / ${EFFECT_DURATION_SECONDS.toFixed(3)} owner s`;$('progress').style.width=`${u*100}%`;
  if(!scrubbing && $('repeat').checked && !controller.engine.active.size && performance.now()-lastSpawn>(EFFECT_DURATION_SECONDS+0.45)*1000 && actor.alive && actor.present && !actor.vented && !actor.invisible && actor.onScreen && !document.hidden)spawn();
  updateLog();
}
async function scrub(u){
  if(!controller)return;
  if(!scrubbing){scrubbing=true;controller.stop();$('repeat').checked=false;}
  scrubPending=u;if(scrubRunning)return;scrubRunning=true;
  try{
    while(scrubPending!==null){
      const age=scrubPending;scrubPending=null;
      while(controller.renderer.busy)await new Promise(r=>setTimeout(r,10));
      await controller.renderer.clear();controller.renderer.allowPresentation();
      const frame={epoch:controller.engine.epoch,atMs:performance.now(),items:[{key:'inspect-not-event',token:1,epoch:controller.engine.epoch,worldX:0,worldY:0,phase:age,seed:.5,reducedMotion:$('reduced').checked,pending:false}]};
      await controller.renderer.render(frame,views(),{verify:true});
      $('phaseName').textContent=`検査: ${evaluatePhase(age).phase}`;$('phaseValue').textContent=`${(age*EFFECT_DURATION_SECONDS).toFixed(3)} owner s`;$('progress').style.width=`${age*100}%`;
    }
  }catch(e){$('status').textContent=String(e);}finally{scrubRunning=false;}
}
resize();changeMotion();
try{
  controller=await ManaEffectController.create({canvas,context,resolveActor:id=>id===actor.playerId?actor:null,views,verify:$('verify').checked,reducedMotion:$('reduced').checked});
  controller.onFrame=onFrame;controller.onError=e=>{$('status').textContent=String(e);$('status').classList.add('error');};
  for(const id of ['play','overlap','enableAudio','duplicate','zero','renki','session','resume'])$(id).disabled=false;
  $('status').textContent='この端末でshader/pipelineを作成しました。画質・聴感の受入は別途です。初期状態は無音です。';
  changeMotion();controller.start();
  window.__manaGallery={controller,views,spawn,actor};
}catch(e){$('status').textContent=`初期化できません: ${e}\nWebGPU以外へは代替しません。`;$('status').classList.add('error');}
$('play').onclick=()=>spawn();
$('overlap').onclick=()=>{spawn();setTimeout(()=>spawn(),85);setTimeout(()=>spawn(event({source:'mystery',variant:'mana-surge'})),175);};
$('duplicate').onclick=()=>{if(lastEvent)spawn(lastEvent);else $('status').textContent='先に正の獲得を1件発生させてください。';};
$('zero').onclick=()=>spawn(event({manaAfter:40}));$('renki').onclick=()=>spawn(event({variant:'renki'}));
$('acc2').onchange=changeMotion;$('moving').onchange=changeMotion;
$('mute').onchange=()=>controller?.setMuted($('mute').checked);
$('verify').onchange=()=>controller?.setVerify($('verify').checked);
$('reduced').onchange=()=>{if(controller)controller.reducedMotion=$('reduced').checked;};
$('enableAudio').onclick=async()=>{
  try{
    if($('verify').checked){$('status').textContent='verify中はAudioContextを起動しません。';return;}
    if(!audioContext){audioContext=new AudioContext();await audioContext.resume();controller.attachAudio(new ManaOneShotAudio(audioContext));}
    else await audioContext.resume();
    $('mute').checked=false;controller.setMuted(false);$('status').textContent='音を有効にしました。次に可視フレームが成立した新規event idから発音します。';
  }catch(e){$('status').textContent=`音を開始できません: ${e}`;}
};
$('recipientState').onchange=()=>{
  const state=$('recipientState').value;
  Object.assign(actor,{alive:state!=='dead',present:state!=='departed',vented:state==='vented',invisible:state==='invisible',onScreen:state!=='offscreen'});
  if(state!=='visible')controller?.invalidatePlayer(actor.playerId,state);else if(controller)controller.needsClear=true;
};
$('session').onclick=()=>{session++;context.roomId=`gallery-room-${session}`;context.sessionId=`gallery-session-${session}`;actor.roomId=context.roomId;actor.sessionId=context.sessionId;controller.setContext(context);lastEvent=null;changeMotion();$('status').textContent='旧ルーム・セッションの表示と音を破棄しました。';};
$('scale').onchange=()=>{if(controller){controller.renderer.hide();controller.needsClear=true;}resize();};
$('scrub').oninput=()=>{const u=Number($('scrub').value)/1000;$('scrubValue').textContent=`${(u*100).toFixed(1)}%`;scrub(u);};
$('resume').onclick=async()=>{while(scrubRunning)await new Promise(r=>setTimeout(r,10));scrubbing=false;controller.needsClear=true;controller.start();};
window.addEventListener('pagehide',()=>{controller?.dispose();audioContext?.close();});
