import {VARIANTS,DESIGN,SwitchEController,SwitchAudio,createCanvasSurface,sampleDynamics,sourceLocal,BodyClock} from '../src/index.mjs';
const $ = id=>document.getElementById(id);
const audio = new SwitchAudio({settings:{verify:true}});
const states = new Map(), selections = new Map(), bodies = new Map();
let surface=null, raf=0, serial=0, roomSerial=0, lastReceipt=null, queued=[];
const history=[];
function log(event) { history.push(event); if (history.length>60) history.shift(); $('log').textContent=history.map(x=>JSON.stringify(x)).join('\n'); }
function view() { const r=$('stage').getBoundingClientRect(); return {width:r.width,height:r.height,scale:1,originX:0,originY:0,dpr:window.devicePixelRatio||1,background:$('theme').value}; }
const controller = new SwitchEController({audio,readVisibility:id=>states.get(id),readSelection:id=>selections.get(id),
  onSelection:e=>{selections.set(e.playerId,e.variant);log({selection:e.id,variant:e.variant,changed:e.changed});},
  onBodySwitch:e=>{bodies.set(e.id,{clock:new BodyClock(),last:performance.now()});log({BODY:e.id,baseMs:e.baseDurationMs,fieldMs:e.fieldLifetimeMs,soundOwner:e.soundOwner});},
  onCancelBody:e=>{bodies.delete(e.id);log({BODY_cancel:e.id,reason:e.reason});},
  onPrivacyClear:()=>surface?.clear(),onDiagnostic:log});
let scope=controller.enterRoom('preview-0');
function visibleState(id) { return {playerId:id,roomKey:scope.roomKey,scopeGeneration:scope.generation,visible:true,actorOnscreen:true,vent:false,ejected:false}; }
function issue(variant,index=2) {
  const v=view(),id=`preview-${index}`;
  if (!states.has(id)) states.set(id,visibleState(id));
  if (!selections.has(id)) selections.set(id,'handgun');
  if ($('same').checked) selections.set(id,variant);
  const receipt={id:`magic_preview_${++serial}`,type:'action-weapon-switch',playerId:id,variant,x:Math.round(v.width*(index+0.5)/5),y:170,radius:90,at:Date.now(),targetX:null,targetY:null,durationMs:0,target:null,object:null,viewer:null,mode:'',effectKind:'',completionKind:''};
  // same の操作は新規actorIDでcontroller側の既知選択とも一致させる。
  if ($('same').checked) { receipt.playerId=`preview-reselect-${serial}`; states.set(receipt.playerId,visibleState(receipt.playerId)); selections.set(receipt.playerId,variant); }
  lastReceipt=receipt;
  log({receipt:receipt.id,result:controller.receive(receipt,{scope,viewport:v,isLocal:$('actor').value==='human',isPhilia:$('philia').checked}),direction:$('direction').value,actor:$('actor').value});
}
function cancelQueued() { for (const t of queued) clearTimeout(t); queued=[]; }
function setPrivacy(kind) {
  cancelQueued(); $('inspect').checked=false;
  for (const [id,state] of states) {
    if (kind==='hidden') state.visible=false;
    if (kind==='vent') state.vent=true;
    if (kind==='ejected') state.ejected=true;
    controller.cancelActor(id,kind);
  }
  surface?.clear();
}
function frame() {
  if (!surface) return;
  const v=view(), now=performance.now();
  for (const [id,b] of bodies) { b.clock.step(now-b.last,Number($('speed').value)); b.last=now; if (b.clock.done) {bodies.delete(id);controller.releaseBody(id);} }
  let frames=controller.frame(v);
  if ($('inspect').checked && !document.hidden) {
    const ageMs=Number($('time').value);
    frames=VARIANTS.map((variant,index)=>({id:`inspect-${index}`,playerId:'inspection_not_actor',variant,variantIndex:index,x:v.width*(index+.5)/5,y:170,worldX:0,worldY:0,scale:1,radius:90,ageMs,...sampleDynamics(variant,ageMs,$('reduced').checked),sourceLocal:sourceLocal(variant),reducedMotion:$('reduced').checked})).filter(x=>x.alive);
  }
  try {surface.render(frames,v);} catch(error) {log({render_error:error.message});stop();return;}
  raf=requestAnimationFrame(frame);
}
function stop() {cancelAnimationFrame(raf);cancelQueued();controller.clear('preview_stopped');surface?.clear();}
$('init').addEventListener('click',async()=>{
  $('init').disabled=true;
  try {
    surface=await createCanvasSurface($('gpu'),{onLost:e=>{stop();$('status').textContent='device lost / fallbackなし';log(e);}});
    $('status').textContent='WebGPU初期化・shaderコンパイル済み。画素の品質・聴感の合否は別途目視/聴取してください。';
    $('empty').hidden=true; for(const id of ['one','all','rapid']) $(id).disabled=false;
    log({adapter:surface.adapterInfo,shader:surface.renderer.compilationMessages}); frame();
  } catch(error) {$('status').textContent=error.message+' / 実GPU画素・動き・聴感 not_run';$('init').disabled=false;log({init_error:error.message});}
});
$('one').addEventListener('click',()=>{$('inspect').checked=false;issue($('variant').value);});
$('all').addEventListener('click',()=>{$('inspect').checked=false;VARIANTS.forEach(issue);});
$('rapid').addEventListener('click',()=>{$('inspect').checked=false;cancelQueued();for(let i=0;i<10;i++) queued.push(setTimeout(()=>issue(VARIANTS[i%5]),i*80));});
$('duplicate').addEventListener('click',()=>{if(lastReceipt) log({resend:controller.receive(lastReceipt,{scope,viewport:view(),isLocal:$('actor').value==='human',isPhilia:$('philia').checked})});});
$('theme').addEventListener('change',()=>{$('stage').classList.toggle('light',$('theme').value==='light');});
$('reduced').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
$('reduced').addEventListener('change',()=>controller.setReducedMotion($('reduced').checked)); controller.setReducedMotion($('reduced').checked);
for(const id of ['verify','mute','volume']) $(id).addEventListener('input',()=>audio.setSettings({verify:$('verify').checked,muted:$('mute').checked,volume:Number($('volume').value)}));
$('unlock').addEventListener('click',async()=>log({audio_unlocked:await audio.unlock(),verify:$('verify').checked}));
$('time').addEventListener('input',()=>{$('timeValue').textContent=$('time').value+' ms';});
$('inspect').addEventListener('change',()=>{if($('inspect').checked){cancelQueued();controller.clear('inspection');audio.cancelAll();}});
for(const id of ['hidden','vent','ejected']) $(id).addEventListener('click',()=>setPrivacy(id));
$('room').addEventListener('click',()=>{cancelQueued();$('inspect').checked=false;scope=controller.enterRoom(`preview-${++roomSerial}`);states.clear();selections.clear();bodies.clear();log({room:scope.roomKey});});
$('restore').addEventListener('click',()=>{for(const id of states.keys())states.set(id,visibleState(id));log({restored:true,active:controller.activeCount});});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelQueued();$('inspect').checked=false;}controller.setPageVisible(!document.hidden);});
window.addEventListener('pagehide',()=>{stop();controller.dispose();surface?.dispose();void audio.dispose();});
window.switchEDemo = {get diagnostics(){return {surfaceReady:!!surface,active:controller.activeCount,bodyOwners:controller.bodyOwnerCount,history:[...history]};}};

// Isolated gallery-style technical replay. verify query is an enforced mute lock.
const queryVerify = new URLSearchParams(location.search).has('verify');
if (queryVerify) {
  $('verify').checked = true;
  $('verify').disabled = true;
  audio.setSettings({verify:true,muted:$('mute').checked,volume:Number($('volume').value)});
}
let replayTimer = 0;
const replayVariants = [...VARIANTS];
$('init').addEventListener('click', () => {
  if (queryVerify) audio.setSettings({verify:true,muted:true,volume:0});
  const waitForSurface = () => {
    if (surface) {
      clearInterval(replayTimer);
      let replayIndex = 0;
      issue(replayVariants[replayIndex++ % replayVariants.length]);
      replayTimer = window.setInterval(() => {
        if (!surface || document.hidden) return;
        issue(replayVariants[replayIndex++ % replayVariants.length]);
      }, 1500);
    } else if (!$('init').disabled) {
      clearInterval(replayTimer);
    }
  };
  clearInterval(replayTimer);
  replayTimer = window.setInterval(waitForSurface, 100);
}, {once:true});
if (new URLSearchParams(location.search).has('embed')) $('init').click();
