import {VERSION,LIFE,HEIGHT,CSS_PX_PER_M,TYPE,receipt,fixtureReceipt,basis,Mesh,drawFixture,buildReceipt,fillSfx} from './effect.mjs';
import {FIRST_SOUND_MS} from './plan.mjs';
import {initGpu} from './gpu.mjs';

const q=new URLSearchParams(location.search), test=q.has('verify'), embedded=parent!==window;
const canvas=document.querySelector('canvas'), stage=document.querySelector('#stage'), status=document.querySelector('#status');
const ruler=document.querySelector('#ruler');if(test&&q.has('ruler'))ruler.hidden=false;
const startupToken=q.get('galleryStartupToken')??q.get('startupToken')??q.get('token')??'';
const galleryVersion=q.get('galleryVersionId')??q.get('versionId')??q.get('version')??VERSION;
const epoch=Number(q.get('galleryAttemptEpoch')??q.get('attemptEpoch')??0);
let seq=0, state='starting', failure=null, device=null, raf=0, generation=0, drawing=Promise.resolve(), startupStage='child-document', timer=0;
const history=[], cycles=[], recent=new Map(), active=[], mesh=new Mesh(), effectMesh=new Mesh();
let fixed=null, auto=true, nextAuto=Infinity, serial=0, frames=0, submittedFrames=0, activeTriangles=0, fixtureSide=q.get('side')||'right';
let size={w:1,h:1,dpr:1,cssWidth:1,cssHeight:1}, lastRender=null, lastFrameAt=0;
const inputZoom=Number(q.get('zoom')??q.get('previewScale')??1);
let opts={source:true,observer:true,nearLight:true,bright:['bright','light'].includes(q.get('bg')),zoom:Number.isFinite(inputZoom)?Math.max(.44,Math.min(inputZoom,4.2)):1,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
const GAIN=.68, sourcePool=new Map(), audio={ctx:null,enabled:false,starts:0,epoch:0,error:null,lastCause:null};
let current=receipt(fixtureReceipt('initial',undefined,fixtureSide));
function push(arr,it,limit=120){arr.push(it);if(arr.length>limit)arr.shift()}
function phase(name,extra={},phaseStatus='pending'){
  startupStage=name;
  const packet={type:'dva-gallery-startup',schema:'dva-gallery-startup/v1',token:startupToken,startupToken,versionId:galleryVersion,attemptEpoch:epoch,sequence:++seq,stage:name,status:phaseStatus,...extra};
  push(history,{...packet,at:performance.now()},32);
  if(embedded&&/^[a-f0-9]{32}$/i.test(startupToken)&&Number.isSafeInteger(epoch)&&epoch>0&&galleryVersion===VERSION){
    // Same-origin gallery is the sole receiver. Remote frames receive no lifecycle callback.
    parent.postMessage(packet,location.origin);
  }
}
function healthy(){return state==='running'&&!document.hidden&&!pageSuspended&&sizeValid}
function renderSize(){
  const r=canvas.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1);
  return {w:Math.max(1,Math.round(r.width*dpr)),h:Math.max(1,Math.round(r.height*dpr)),dpr,cssWidth:r.width,cssHeight:r.height}
}
function publishStatus(msg,error=false){status.textContent=msg;status.dataset.error=error?'true':'false';}
function stopVoices(){
  audio.epoch++;
  const now=audio.ctx?.currentTime??0;
  for(const a of sourcePool.values()){
    try{a.gain.gain.cancelScheduledValues(now);a.gain.gain.setTargetAtTime(0,now,.008);a.node.stop(now+.04)}catch{}
  }
}
function recordStop(reason){
  for(const a of active)push(cycles,{causeId:a.ev.id,outcome:reason,presented:a.presented,firstAt:a.firstAt,lastAt:a.lastAt,endAt:performance.now()});
  active.length=0;activeTriangles=0;
}
function stop(reason,{clear=false}={}){
  cancelAnimationFrame(raf);raf=0;generation++;
  if(clear)recordStop(reason);
  stopVoices();
}
function fail(reason){
  if(state==='disposed'||state==='error')return;
  failure=String(reason);state='error';stop('error',{clear:true});device?.destroy();device=null;
  clearTimeout(timer);canvas.dataset.state='error';phase(startupStage,{error:{code:'DOT_IAI_MILESTONE_RECEIPT_WEBGPU_FAILURE',message:failure}},'error');publishStatus(failure,true);
}
function begunSound(ev,visualClockAge){
  const ctx=audio.ctx;if(test||!audio.enabled||!healthy()||ctx?.state!=='running'||sourcePool.has(ev.id))return false;
  if(!Number.isFinite(visualClockAge)||visualClockAge>FIRST_SOUND_MS+70)return false;
  try{
    const seed=[...ev.id].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619),2166136261);
    const {data}=fillSfx(ctx.sampleRate,ev.tier,seed), b=ctx.createBuffer(1,data.length,ctx.sampleRate);
    b.copyToChannel(data,0);
    const node=ctx.createBufferSource(), gain=ctx.createGain();
    const pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
    node.buffer=b;gain.gain.value=GAIN/Math.sqrt(1+sourcePool.size);
    node.connect(gain);if(pan){pan.pan.value=.26*ev.dx;gain.connect(pan);pan.connect(ctx.destination)}else{gain.connect(ctx.destination)}
    node.onended=()=>{node.disconnect();gain.disconnect();pan?.disconnect();sourcePool.delete(ev.id)};
    node.start(0,Math.max(0,visualClockAge)/1000);sourcePool.set(ev.id,{node,gain});audio.starts++;audio.lastCause=ev.id;audio.error=null;return true;
  }catch(e){audio.error=String(e.message||e);return false}
}
async function allowAudio(){
  if(test)return {ok:false,enabled:false,status:'verify-muted',reason:'verify-muted',audioEnabled:false};
  if(!healthy())return {ok:false,enabled:false,status:'inactive'};
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)throw Error('WebAudio unavailable');
    const own=audio.epoch,ctx=audio.ctx??(audio.ctx=new Ctx());
    if(ctx.state!=='running')await ctx.resume();
    if(!healthy()||own!==audio.epoch||ctx.state!=='running')throw Error('音声を開始できませんでした。操作から再試行できます');
    audio.enabled=true;audio.error=null;document.querySelector('#audio').textContent='音声オン';
    return {ok:true,enabled:true,status:'enabled',audioEnabled:true};
  }catch(e){audio.enabled=false;audio.error=String(e.message||e);publishStatus(audio.error);return {ok:false,enabled:false,status:'retryable-error',reason:audio.error,audioEnabled:false}}
}
function applyOptions(o={}){
  if(!o||typeof o!=='object')return;
  for(const key of ['source','observer','nearLight','reduced','bright'])if(typeof o[key]==='boolean')opts[key]=o[key];
  if(typeof o.background==='string')opts.bright=['light','bright','day'].includes(o.background);
  if(Number.isFinite(o.zoom))opts.zoom=Math.max(.44,Math.min(4.2,o.zoom));
  if(typeof o.side==='string'&&['left','right','above'].includes(o.side)&&fixtureSide!==o.side){fixtureSide=o.side;if(current.id.startsWith('magic_dot_iai_milestone_'))current=receipt(fixtureReceipt('diagnostic_'+(++serial),current.tier,fixtureSide));}
  if(!opts.source)stopVoices();
}
function accept(raw,{preview=false,sound=true}={}){
  if(!healthy())return {ok:false,reason:'inactive'};
  const ev=receipt(raw);if(!ev)return {ok:false,reason:'invalid-or-expired'};
  if(recent.has(ev.id))return {ok:false,reason:'duplicate',causeId:ev.id};
  if(active.length>=6)return {ok:false,reason:'capacity'};
  const now=performance.now(), initial=preview?0:Math.max(0,Date.now()-ev.at);
  recent.set(ev.id,performance.now());while(recent.size>2048)recent.delete(recent.keys().next().value);
  current=ev;fixed=null;
  const on={ev,born:now-initial,presented:0,firstAt:null,lastAt:null,sounded:false,soundPending:sound&&initial<62};
  active.push(on);
  wake();return {ok:true,causeId:ev.id,age:initial};
}
function replay(options={}){
  if(typeof options==='string')options={tier:options};
  applyOptions(options);
  if(!healthy())return {ok:false,reason:'inactive'};
  recordStop('replay-replaced');stopVoices();fixed=null;
  nextAuto=performance.now()+1800;
  return accept(fixtureReceipt(++serial,options.tier??q.get('tier')??'perfect-reflect',fixtureSide),{preview:true,sound:options.sound!==false});
}
function qualityGeometry(t){
  mesh.length=0;const effects=fixed?[{ev:fixed.ev,time:fixed.age,on:null}]:active.map(o=>({ev:o.ev,time:Math.max(0,t-o.born),on:o}));
  const g=effectMesh, lights=[], sources=[];g.length=0;
  if(opts.source){
    for(const f of effects){
      const src=buildReceipt(g,f.ev,f.time,{reduced:opts.reduced});sources.push({...src,id:f.ev.id,age:f.time});
      if(opts.nearLight&&src.lum>.001)lights.push(src);
    }
  }
  const guard=opts.source&&effects.find(x=>x.ev.id===current.id&&x.time>=0&&x.time<LIFE);
  drawFixture(mesh,basis(current,guard?guard.time:null,opts.reduced),lights);
  const count=g.length/8;
  if(g.length+mesh.length>mesh.data.length){let temp=new Float32Array(2**Math.ceil(Math.log2(g.length+mesh.length)));temp.set(mesh.data.subarray(0,mesh.length));mesh.data=temp;}
  mesh.data.set(g.data.subarray(0,g.length),mesh.length);mesh.length+=g.length;
  return {effects,sources,count};
}
const snapshot=()=>({
  version:VERSION,effect:TYPE,state,ready:state==='running',fatal:failure,frames,submittedFrames,activeTriangles,
  causeId:lastRender?.causeId??current.id,age:lastRender?.age??null,stage:lastRender?.stage??null,
  options:{...opts},phase:history.map(x=>({...x})),cycles:cycles.map(x=>({...x})),lastRender,
  active:active.map(x=>({causeId:x.ev.id,born:x.born,presented:x.presented,firstAt:x.firstAt,lastAt:x.lastAt})),
  renderer:'webgpu',verifyMuted:test,held:fixed!==null,auto,visuals:activeTriangles>0,
  dimensions:{...size,hCss:HEIGHT*CSS_PX_PER_M*opts.zoom,zoom:opts.zoom,h64:opts.zoom===1},
  fixture:{type:'procedural-fixture-not-game-sprite',hMeters:HEIGHT,current:{...current},contactM:basis(current).p},
  audio:{enabled:audio.enabled,starts:audio.starts,live:sourcePool.size,state:audio.ctx?.state??'closed',verifiedMute:test,error:audio.error,lastCause:audio.lastCause},
  startup:{token:startupToken,versionId:galleryVersion,attemptEpoch:epoch,sequence:seq},
  gpu:device?{adapter:device.adapter,shaderInfo:device.shaderInfo}:null
});
async function frame(t,force=false){
  if(state!=='running'||!sizeValid||pageSuspended||document.hidden)return false;
  const own=generation;
  t=Number.isFinite(t)?t:performance.now();
  if(!fixed&&auto&&t>=nextAuto&&active.length===0)replay({sound:audio.enabled});
  for(let i=active.length-1;i>=0;i--){
    const a=active[i];if(t-a.born>=LIFE){
      active.splice(i,1);push(cycles,{causeId:a.ev.id,outcome:'expired',presented:a.presented,firstAt:a.firstAt,lastAt:a.lastAt,endAt:t,lastVisual:!!a.lastVisual});
    }
  }
  const must=force||fixed!==null||active.length>0||activeTriangles>0;
  if(!must)return false;
  if(lastFrameAt&&t-lastFrameAt<4&&!force)return false;
  lastFrameAt=t;
  const {effects,sources,count}=qualityGeometry(t);
  const scale=CSS_PX_PER_M*opts.zoom,ox=size.cssWidth*.44,oy=size.cssHeight*.70;
  const render=device.draw(mesh,{...size,ox,oy,scale,bright:opts.bright,observer:opts.observer&&opts.source});
  submittedFrames++;
  try{await render}catch(e){if(own===generation)fail(e.message||e);return false}
  if(own!==generation||state!=='running')return false;
  for(const f of effects){
    if(f.on){
      f.on.presented++;f.on.firstAt??=t;f.on.lastAt=t;f.on.lastVisual=sources.some(x=>x.id===f.ev.id&&x.triangles>0);
      if(f.on.soundPending){f.on.soundPending=false;f.on.sounded=opts.source&&begunSound(f.ev,performance.now()-f.on.born);}
    }
  }
  activeTriangles=count/3;
  const f=effects.at(-1), s=sources.at(-1);
  lastRender={frame:++frames,presentedAt:performance.now(),startAt:t,causeId:f?.ev.id??null,age:f?.time??null,stage:s?.stage??'clear',
    visible:activeTriangles>0,triangles:activeTriangles,anchorPx:s?[ox+(s.contact??s.p)[0]*scale,oy+(s.contact??s.p)[1]*scale]:null,
    receiverPx:s?[ox+s.p[0]*scale,oy+s.p[1]*scale]:null,progressM:s?.progress??0,
    phaseCount:sources.length,luminance:s?.lum??0,cssBodyHeight:HEIGHT*scale};
  if(!ruler.hidden)ruler.textContent=`${VERSION} | ${frames} | ${lastRender.causeId??'clear'} | ${Number.isFinite(lastRender.age)?lastRender.age.toFixed(1)+'ms':'--'} | ${Math.round(lastRender.cssBodyHeight)}px`;
  if(state==='running'&&canvas.dataset.state!=='ready'&&activeTriangles>0){
    const firstFrame={recorded:true,submitted:true,completed:true,canvasConnected:canvas.isConnected,passes:opts.observer&&opts.source?4:3,
      viewportWidth:size.w,viewportHeight:size.h,causeId:f?.ev.id,frame:frames,age:f?.time??null,sameDevice:true};
    canvas.dataset.state='ready';phase('playing',{firstFrame},'ready');clearTimeout(timer);publishStatus('WebGPU');
  }
  return true;
}
function enqueue(t,force=false){const call=()=>frame(t,force);drawing=drawing.then(call,call);return drawing}
function wake(){
  if(raf||!healthy())return;
  raf=requestAnimationFrame(async t=>{
    raf=0;await enqueue(t);
    if(!fixed&&(auto||active.length>0||activeTriangles>0)&&healthy())wake()
  });
}
let pageSuspended=false,sizeValid=false;
function resize(){
  const was=sizeValid;size=renderSize();sizeValid=size.cssHeight>=20&&size.cssWidth>=20;
  if(!sizeValid&&was)stop('invalid-size',{clear:true});
  if(healthy()){if(!was&&auto&&!fixed)replay({sound:false});enqueue(performance.now(),true);wake()}
}
async function hold(age,options={}){
  if(typeof age==='object'){options=age;age=age.age??0;}
  if(!Number.isFinite(age)||!healthy())return {ok:false,why:'inactive-or-invalid-age'};
  auto=false;nextAuto=Infinity;stop('hold',{clear:true});applyOptions(options);
  fixed={ev:current,age};await enqueue(performance.now(),true);return snapshot();
}
function resume(options={}){
  applyOptions(options);auto=options.auto!==false;fixed=null;
  nextAuto=performance.now()+(auto?0:Infinity);wake();return snapshot();
}
function suspend(){
  pageSuspended=true;stop('hidden',{clear:true});fixed=null;
}
function foreground(){
  pageSuspended=false;
  if(healthy()){if(auto)replay({sound:false});wake()}
}
function visibility(){if(document.hidden)suspend();else foreground()}
const ro=new ResizeObserver(resize);ro.observe(canvas);
function dispose(){
  if(state==='disposed')return snapshot();
  state='disposed';clearTimeout(timer);stop('disposed',{clear:true});ro.disconnect();media.removeEventListener('change',motionChange);
  addRemove(false);device?.destroy();device=null;fixed=null;
  audio.enabled=false;audio.ctx?.close().catch(()=>{});phase(startupStage,{action:'retired'},'cancelled');
  return snapshot();
}
const media=matchMedia('(prefers-reduced-motion: reduce)');
function motionChange(e){opts.reduced=e.matches;if(healthy())enqueue(performance.now(),true)}
media.addEventListener('change',motionChange);
function addRemove(yes){
  const a=yes?'addEventListener':'removeEventListener';
  document[a]('visibilitychange',visibility);window[a]('pagehide',onPageHide);window[a]('pageshow',foreground);
}
function onPageHide(e){if(e.persisted)suspend();else dispose()}
addRemove(true);
const control=Object.freeze({hold,replay,resume,emit:accept,snapshot,dispose,
  audio:allowAudio,setOptions(o){applyOptions(o);if(healthy())return enqueue(performance.now(),true).then(snapshot);return Promise.resolve(snapshot());},
  mute(){audio.enabled=false;stopVoices();return snapshot();},pause(){auto=false;fixed=null;stop('paused',{clear:true});return enqueue(performance.now(),true).then(snapshot);}
});
Object.defineProperty(window,'__dotEffectControl',{value:control});
Object.defineProperty(window,'__dotEffectSnapshot',{value:snapshot});
Object.defineProperty(window,'__dvaGalleryStartupSnapshot',{value:()=>history.at(-1)});
const gallerySound=Object.freeze({
  enable:allowAudio,enableAudio:allowAudio,replay:async()=>{const unlocked=await allowAudio();if(!unlocked.ok)return unlocked;const play=replay({sound:true});return {...unlocked,played:play.ok,causeId:play.causeId}},
  snapshot:()=>snapshot().audio,mute:control.mute
});
window.__dvaGalleryAudio=gallerySound;
window.__gallerySfx=Object.freeze({activateFromGesture:async()=>{
  const r=await gallerySound.replay();return {...r,state:r.ok?'active':'unsupported'};
},
  pause:control.mute,deactivate:control.mute,mute:control.mute,snapshot:gallerySound.snapshot});
window.enableGallerySound=allowAudio;
window.replayGallerySound=gallerySound.replay;
if(embedded)stage.classList.add('embedded');
document.querySelector('#replay').onclick=()=>replay();
document.querySelector('#audio').onclick=async()=>{if(audio.enabled){control.mute();document.querySelector('#audio').textContent='音声を有効にする'}else if((await allowAudio()).ok){replay();}};
phase('child-document');
timer=setTimeout(()=>{if(state==='starting'||canvas.dataset.state!=='ready')fail('WebGPU の起動時間を超えました')},14000);
(async()=>{
  try{
    phase('adapter');
    const actual=await initGpu(canvas,{onPhase(name){
      if(state!=='starting')return;
      if(name==='adapter-resolved')phase('device');
      if(name==='device-resolved')phase('assets');
      if(name==='canvas-configured')phase('pipelines');
      if(name==='pipeline-ready')phase('first-frame');
    },onFailure:fail});
    if(state!=='starting'){actual.destroy();return;}
    device=actual;state='running';resize();
    if(healthy()&&active.length===0)replay({sound:false});
    const done=await enqueue(performance.now(),true);if(done&&canvas.dataset.state==='ready')clearTimeout(timer);wake();
  }catch(e){fail(e.message||e);clearTimeout(timer)}
})();

