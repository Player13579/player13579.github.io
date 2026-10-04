import {DonationRenderer,DonationPlayback} from './runtime.mjs';
import {createGallerySfxHook} from './sfx-compat.mjs';
import {confirmDonationFirstFrame} from './startup-first-frame.mjs';
const query=new URL(location.href).searchParams;
const verify=query.has('verify'),embed=query.get('embed')==='1';
const startup=globalThis.__dvaGalleryStartup;
const $=s=>document.getElementById(s);let counter=0,playback,loopTimer=0,disposed=false,loops=0;
const renderers=[];let cleanupPromise=null;
const attemptIsActive=()=>!disposed&&(startup?.isActive?.()??true);
import {DURATION_MS} from './creative.mjs';
const maybeBeginFirstFrame=(reason,ms=playback?.timeMs)=>{
  if(!startup||startup.mode!=='standalone-manual'||!attemptIsActive()||startup.snapshot?.().firstFrame||
     !Number.isFinite(ms)||ms<0||ms>=DURATION_MS||playback?.options?.source!==true)return false;
  return startup.beginFirstFrame?.(reason)===true;
};
const activeFault=d=>d?.module==='device-lost'||d?.module==='device'||d?.module==='pipeline-validation'||d?.status==='failed';
function watchRendererFaults(renderer){
  try{renderer.device?.addEventListener?.('uncapturederror',e=>{if(attemptIsActive())startup?.fail?.(e.error||new Error('WebGPU uncaptured error'),'WEBGPU_UNCAPTURED_ERROR');});}catch{}
  try{renderer.device?.lost?.then(info=>{if(attemptIsActive())startup?.fail?.(Object.assign(new Error(info?.message||'WebGPU device lost'),{code:'WEBGPU_DEVICE_LOST'}),'WEBGPU_DEVICE_LOST');},error=>{if(attemptIsActive())startup?.fail?.(error,'WEBGPU_DEVICE_LOST');});}catch{}
}
function disposeOwned(){
  if(!cleanupPromise){disposed=true;clearTimeout(loopTimer);
    cleanupPromise=playback?playback.dispose():Promise.allSettled(renderers.map(r=>Promise.resolve().then(()=>r.dispose())));}
  return cleanupPromise;
}
const fixture=()=>({kind:'donation-settled',success:true,id:`gallery-synthetic-${++counter}`,amount:100,recipientId:'synthetic-payment-intake',source:{x:82,y:82},recipient:{x:242,y:82},settledAt:performance.now(),synthetic:true});
$('audio').textContent=verify?'検証モード：音源の生成・再生は強制停止。映像は通常の時間軸で再生します。':'音は再生操作後のみ。通常SFX聴感確認は未実施。';
try{
  if(embed){document.body.classList.add('embed');}
  startup?.setCleanup?.(()=>{void disposeOwned();});
  const createRenderer=verify&&query.has('startupTestFactory')&&typeof globalThis.__donationCreateRendererForTests==='function'
    ? globalThis.__donationCreateRendererForTests
    : (canvas,options)=>DonationRenderer.create(canvas,options);
  for(const id of embed?['large']:['large','native']){
    const renderer=await createRenderer($(id),{onStartupPhase:stage=>startup?.advance?.(stage,'pending')});
    if(!attemptIsActive()){
      try{await renderer?.dispose?.();}catch{}
      throw Object.assign(new Error('Donation renderer initialization completed after its gallery attempt was retired'),{code:'DVA_GALLERY_STARTUP_CANCELLED'});
    }
    renderers.push(renderer);watchRendererFaults(renderer);
  }
  playback=new DonationPlayback(renderers,{verify});playback.receipt=fixture();
  const clearProof=async()=>{
    if(!attemptIsActive()||renderers.length!==(embed?1:2))return false;
    for(const renderer of renderers){
      const clear=renderer.frames.slice().reverse().find(row=>row.clear===true&&row.ms<0);
      const rect=renderer.canvas.getBoundingClientRect();
      if(!renderer.ready||renderer.disposed||!renderer.canvas.isConnected||!(rect.width>0)||!(rect.height>0)||
         !(renderer.canvas.width>0)||!(renderer.canvas.height>0)||!clear||!Number.isSafeInteger(clear.submit)||clear.submit<1||
         renderer.submitCount<clear.submit||renderer.diagnostics.some(activeFault))return false;
    }
    await Promise.all(renderers.map(r=>r.device.queue.onSubmittedWorkDone()));
    return attemptIsActive()&&renderers.every(r=>r.ready&&!r.disposed&&!r.diagnostics.some(activeFault)&&
      r.canvas.isConnected&&r.canvas.width>0&&r.canvas.height>0&&r.frames.some(row=>row.clear===true&&row.ms<0));
  };
  const resourcesReady=await clearProof();
  if(!attemptIsActive())throw Object.assign(new Error('Donation startup attempt retired during initial clear completion'),{code:'DVA_GALLERY_STARTUP_CANCELLED'});
  if(!resourcesReady)throw Object.assign(new Error('Donation renderers did not complete a presentable initial clear'),{code:'INITIAL_RESOURCE_CLEAR_INCOMPLETE'});
  const resourcesProof={ready:true,clearCompleted:true,rendererCount:renderers.length};
  if(startup?.mode==='standalone-manual'){if(!startup.awaitInput?.(resourcesProof))throw Object.assign(new Error('Standalone manual startup could not enter the input-wait state'),{code:'STARTUP_AWAIT_INPUT_REJECTED'});}
  else startup?.advance?.('first-frame','pending');
  for(const renderer of renderers){
    const render=renderer.render.bind(renderer);let firstFrameCheckStarted=false;
    renderer.render=(ms,receipt,options)=>{
      const before=renderer.frames.length,ok=render(ms,receipt,options);
      if(!firstFrameCheckStarted&&ms>=0&&ms<DURATION_MS&&options?.source===true&&receipt?.synthetic===true&&ok){
        const frame=renderer.frames.slice(before).find(row=>!row.clear&&row.source===true&&row.ms>=0&&row.ms<DURATION_MS&&row.passes===2&&row.causeId===receipt.id);
        if(frame){if(startup?.mode==='standalone-manual')maybeBeginFirstFrame('accepted-receive',ms);firstFrameCheckStarted=true;
          void confirmDonationFirstFrame({renderer,frame,receipt,startup,isActive:attemptIsActive})
            .then(confirmed=>{if(!confirmed&&attemptIsActive())throw Object.assign(new Error('Current Donation startup attempt did not confirm its submitted frame'),{code:'FIRST_FRAME_CONFIRMATION_FAILED'});})
            .catch(error=>startup?.fail?.(error,error?.code||'FIRST_FRAME_CONFIRMATION_ERROR',error?.unsupported?'unsupported':'error'));
        }
      }
      return ok;
    };
  }
  const rawReceive=playback.receive.bind(playback);
  playback.receive=(input,options)=>{const accepted=rawReceive(input,options);if(accepted&&playback.options.source===true)maybeBeginFirstFrame('accepted-receive',0);return accepted;};
  const repeat=()=>{if(disposed||document.hidden)return;loops++;playback.receive(fixture(),{audio:playback.sound.enabled});loopTimer=setTimeout(repeat,3500);};
  const restartLoop=()=>{clearTimeout(loopTimer);repeat();};
  globalThis.__gallerySfx=createGallerySfxHook(playback.sound,()=>{if(embed)restartLoop();else playback.receive(fixture(),{audio:true});},()=>disposed);
globalThis.donationCard={snapshot:()=>({...playback.snapshot(),loops,audio:playback.sound.snapshot()}),receive:r=>playback.receive(r),hold:ms=>{if(ms>=0&&ms<DURATION_MS&&playback.options.source===true)maybeBeginFirstFrame('active-hold',ms);playback.hold(ms);},cancel:()=>playback.cancel(),dispose:disposeOwned,fixture};
  for(const id of ['play','stop','phase'])$(id).disabled=false;
  const syncOptions=()=>{playback.options={source:$('source').checked,obs:$('obs').checked,intensity:Number($('intensity').value)};};syncOptions();
  $('play').onclick=async()=>{syncOptions();await playback.sound.activateFromGesture();playback.receive(fixture(),{audio:playback.sound.enabled});$('status').textContent='模擬成功レシート：カード読取 → 決済成立 → 金貨送付。';};
  $('stop').onclick=()=>{playback.cancel();$('status').textContent='停止 / この原因の有限Eは消失';};
  const hold=ms=>{if(ms>=0&&ms<DURATION_MS&&playback.options.source===true)maybeBeginFirstFrame('active-hold',ms);playback.hold(ms);$('ms').textContent=`${ms} ms`;};
  $('phase').onchange=()=>hold(Number($('phase').value));$('time').oninput=()=>hold(Number($('time').value));
  for(const id of ['source','obs'])$(id).onchange=()=>{const wasSource=playback.options.source;syncOptions();if(id==='source'&&!wasSource&&playback.options.source===true)maybeBeginFirstFrame('source-on-redraw',playback.timeMs);playback.draw(playback.timeMs);};
  $('intensity').oninput=()=>{$('intensityValue').textContent=Number($('intensity').value).toFixed(2);syncOptions();playback.draw(playback.timeMs);};
  $('status').textContent='準備完了。r4 luminous coins / source-bound cross streaks。実GPU compile/native replay は別途未確認。品質合格・採用は未判定。';
  if(embed)repeat();
  document.addEventListener('visibilitychange',()=>{clearTimeout(loopTimer);if(document.hidden)playback.cancel();else if(embed&&!disposed)restartLoop();});
  addEventListener('pagehide',()=>{void disposeOwned();},{once:true});
}catch(e){if(attemptIsActive()&&e?.code!=='DVA_GALLERY_STARTUP_CANCELLED'){document.body.classList.add('failed');$('status').textContent=`初期化失敗: ${e.message}`;globalThis.donationCardFailure={message:e.message,stack:e.stack};startup?.fail?.(e,e?.code||'DONATION_PREVIEW_INITIALIZATION_ERROR',e?.unsupported?'unsupported':'error');await disposeOwned();throw e;}}
