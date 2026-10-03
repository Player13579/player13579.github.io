const VERSION_ID='hover-sprint-faithful-extraction-r1';
const params=new URLSearchParams(location.search),verify=params.has('verify');
const canvas=document.querySelector('#preview'),$=id=>document.getElementById(id);
document.documentElement.classList.toggle('embed',params.get('embed')==='1');
if(verify)document.documentElement.classList.add('verify');
const HEADINGS=Object.freeze({right:{x:1,y:0},down:{x:0,y:1},left:{x:-1,y:0},up:{x:0,y:-1},'down-right':{x:1,y:1}});
let headingKey=HEADINGS[params.get('heading')]?params.get('heading'):'right';
const contract=window.DvaHoverSprintGalleryContract;
const startup=window.__dvaGalleryStartup;
let renderer=null,target=null,pass=null,raf=0,ordinaryFramePending=false,queuedDrawJobs=0,playbackReady=false,disposed=false,heldPhase=parsePhase(params.get('phase'));
let loopOrigin=performance.now(),cycleBase=0,roomGeneration=contract.ROOM_GENERATION,lastAge=0,frameSequence=0,drawChain=Promise.resolve();
let audioContext=null,master=null,muted=verify,failed=false;
const startupBridge=contract.createStartupBridge({params,startup,windowRef:window,documentRef:document,canvas,verify,
  isEvidenceCurrent:e=>{if(disposed||failed||$('source')?.checked!==true||document.visibilityState==='hidden')return false;
    const t=timeAt(performance.now());if(t.age>=contract.LIVE_MS)return false;
    return contract.buildSample(t.age,{cycle:t.cycle,roomGeneration}).causeId===e.causeId;}});
const ledger=window.DvaWebGPUDefenseMovementESfx.createLedger({maxEntries:256,retentionMs:30000});
const cuePlayer=window.DvaWebGPUECuePlayer.createPlayer({getContext:()=>audioContext,getMaster:()=>master,
  isMuted:()=>verify||muted,maxVolume:.22,maxLateMs:180,maxLayers:8,maxLayerMs:700,maxEntries:256,retentionMs:30000});
const audioSnapshot=()=>({verify,supported:Boolean(window.AudioContext||window.webkitAudioContext),
  contextState:verify?'closed':audioContext?.state||'suspended',masterGain:verify?0:Number(master?.gain?.value)||0,
  muted:verify||muted,hidden:document.visibilityState==='hidden'});
function galleryActive(){return !disposed&&!failed&&startup?.isActive?.()!==false&&(!startupBridge.enabled||startupBridge.current());}
async function unlockAudio(){
  if(verify){muted=true;if(master)master.gain.setValueAtTime(0,audioContext.currentTime);return false;}
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx){$('audio-state').textContent='Web Audio is unsupported.';return false;}
  if(!audioContext){audioContext=new Ctx();master=audioContext.createGain();master.gain.value=muted?0:.22;master.connect(audioContext.destination);}
  await audioContext.resume();return galleryActive()&&audioContext.state==='running';
}
const sfx=contract.createSfxBridge({verify,unlockAudio,getAudioSnapshot:audioSnapshot});
window.__gallerySfx=sfx;
window.__hoverSprintGallerySnapshot=()=>Object.freeze({versionId:VERSION_ID,verify,heldPhase,cycleBase,roomGeneration,lastAge,
  rendererState:renderer?.state||'uninitialized',audio:audioSnapshot(),disposed});
function parsePhase(value){if(value==null||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=8000?n:null;}
function size(){return contract.backingSize(Number(devicePixelRatio)||1);}
function timeAt(timestamp){if(heldPhase!==null)return {age:heldPhase,cycle:cycleBase,held:true};const elapsed=Math.max(0,timestamp-loopOrigin);return {age:elapsed%contract.LOOP_MS,cycle:cycleBase+Math.floor(elapsed/contract.LOOP_MS),held:false};}
function stopOwnedAudio(){cuePlayer.stopAll();}
function showError(error,code='HOVER_SPRINT_GALLERY_FAILURE',status='error'){
  if(!galleryActive())return;
  failed=true;if(raf)cancelAnimationFrame(raf);raf=0;stopOwnedAudio();
  $('status').textContent=`Replay failed: ${error?.message||error}`;
  startupBridge.fail(error,code,status);
}
async function renderAt(timestamp){
  if(!galleryActive()||!renderer||document.visibilityState==='hidden')return null;
  const {age,cycle,held}=timeAt(timestamp),sourceOn=$('source').checked,reducedMotion=$('reduced').checked;
  const input=contract.buildSample(age,{sourceOn,reducedMotion,cycle,roomGeneration,heading:HEADINGS[headingKey]});
  const submission=contract.recordFrame({renderer,targetId:'hover-sprint-preview',pass,input,pixelWidth:target.width,pixelHeight:target.height});
  const result=submission.result,submittedProof=submission.proof,proofError=submission.proofError,commandCount=submission.submissionCount;
  const currentFrameId=++frameSequence;
  if(proofError){showError(proofError.error||proofError,'HOVER_SPRINT_SUBMISSION_RECEIPT_FAILURE');return null;}
  if(!submittedProof){showError(new Error('WebGPU frame completed submission without the required observer receipt'),'HOVER_SPRINT_SUBMISSION_RECEIPT_MISSING');return null;}
  const visible={sourceOn,held,drawn:result.drawn,commands:result.commands.length,submitted:commandCount>0,causeId:input.causeId,effectAgeMs:age};
  const onsetEvent=result.drawn>0&&sourceOn&&!held?input.scene.events[0]||null:null;
  {
    const first={...visible,frameId:submittedProof.frameId,passes:submission.renderPassCount};
    startupBridge.markSubmitted(first);
    try{
      const [validation]=await Promise.all([submittedProof.validation,submittedProof.done]);
      if(!galleryActive())return null;
      if(validation)throw new Error(`WebGPU validation failed: ${validation.message||validation}`);
      startupBridge.complete({...first,queueCompleted:true});
      if(result.drawn===0||!sourceOn)stopOwnedAudio();
      const current=timeAt(performance.now()),currentSample=contract.buildSample(current.age,{cycle:current.cycle,roomGeneration});
      const rect=canvas.getBoundingClientRect();
      const visibleNow=document.visibilityState!=='hidden'&&canvas.isConnected&&rect.width>0&&rect.height>0;
      const sourceStillOn=$('source').checked;
      if(contract.canAdmitOnset({hasOnset:Boolean(onsetEvent),visible:visibleNow,sourceOn:sourceStillOn,held:heldPhase!==null,
        currentAgeMs:current.age,sameCause:current.age<contract.LIVE_MS&&currentSample.causeId===input.causeId})){
        const cue=ledger.admit({eventId:onsetEvent.id,type:onsetEvent.type,variant:onsetEvent.variant,roomId:contract.ROOM_ID,
          roomGeneration,eventAtMs:onsetEvent.startedAt,nowMs:currentSample.scene.nowMs},{audible:true,reducedMotion});
        if(cue)cuePlayer.play(cue,{nowMs:currentSample.scene.nowMs,muted:verify||muted,actorRate:1});
      }
      $('status').textContent=`WebGPU submitted and queue-completed · Hover Sprint ${Math.floor(age)} / 8000 ms · ${result.drawn?'four-nozzle source active':'transparent'}`;
    }catch(error){if(galleryActive())showError(error,'HOVER_SPRINT_QUEUE_OR_VALIDATION_FAILURE');}
  }
  if(!galleryActive())return null;
  lastAge=age;
  const observer=$('observer-state');observer.hidden=!$('observer').checked;
  if(!observer.hidden)observer.textContent=JSON.stringify({eventId:input.causeId,ageMs:age,liveUntil:input.scene.players[0]?.hoverSprintUntil??null,
    eventPresent:input.scene.events.length===1,drawn:result.drawn,submitted:commandCount>0});
  return Object.freeze({frameId:submittedProof?.frameId||currentFrameId,age,cycle,held,sourceOn,reducedMotion,
    effects:result.effects,commands:result.commands.length,submitted:commandCount>0,queueCompleted:Boolean(submittedProof)});
}
function schedulerError(error,code='HOVER_SPRINT_SCHEDULER_FAILURE'){
  if(!galleryActive())return;
  try{showError(error,code);}catch(reportError){console.error('Hover Sprint scheduler error reporting failed',reportError);}
}
function cancelQueuedFrame(){if(!raf)return false;cancelAnimationFrame(raf);raf=0;ordinaryFramePending=false;return true;}
function enqueueDraw(work){
  queuedDrawJobs++;
  const run=drawChain.then(work);
  drawChain=run.then(()=>{queuedDrawJobs--;if(playbackReady&&galleryActive())schedule();},()=>{queuedDrawJobs--;});
  return run;
}
function schedule(){
  if(!playbackReady||!galleryActive()||heldPhase!==null||document.visibilityState==='hidden'||raf||ordinaryFramePending||queuedDrawJobs>0)return;
  ordinaryFramePending=true;
  try{raf=requestAnimationFrame(timestamp=>{
    raf=0;
    const run=enqueueDraw(()=>renderAt(timestamp));
    const handled=run.then(()=>{
      ordinaryFramePending=false;
      if(galleryActive())schedule();
    },error=>{
      ordinaryFramePending=false;
      schedulerError(error);
    });
    void handled.catch(error=>{
      ordinaryFramePending=false;
      schedulerError(error);
    });
  });}catch(error){raf=0;ordinaryFramePending=false;schedulerError(error);}
}
function refreshHeld(){
  if(heldPhase===null||!galleryActive())return;
  const run=enqueueDraw(()=>renderAt(performance.now()));
  void run.catch(error=>schedulerError(error,'HOVER_SPRINT_HELD_RENDER_FAILURE'));
}
async function initialize(){
  if(!galleryActive())return;
  startupBridge.report('adapter','pending');startupBridge.report('adapter','ready');
  try{
    startupBridge.report('device','pending');const backing=size();canvas.width=backing.width;canvas.height=backing.height;
    const createdRenderer=await window.DvaWebGPURenderer.create({gpu:navigator.gpu,onFailure:error=>showError(error,'WEBGPU_DEVICE_FAILURE')});
    if(!galleryActive()){try{createdRenderer?.destroy();}catch{}return;}
    renderer=createdRenderer;
    startupBridge.report('device','ready');startupBridge.report('assets','pending');
    pass=window.DvaWebGPUHoverSprintE.create();startupBridge.report('assets','ready');startupBridge.report('pipelines','pending');
    target=renderer.registerTarget('hover-sprint-preview',canvas,{...backing,logicalWidth:384,logicalHeight:320,alphaMode:'premultiplied'});
    if(verify){muted=true;$('muted').checked=true;$('audio-state').textContent='Verify mode: master audio hard-zero; no gesture unlock.';$('audio').disabled=true;}
    $('seek').value=String(heldPhase??0);$('seek-value').value=`${Math.floor(heldPhase??0)} ms`;
    await enqueueDraw(()=>renderAt(performance.now()));
    if(!galleryActive())return;
    playbackReady=true;
    if(heldPhase===null)schedule();
    else $('status').textContent='Held source replay; seeking and comparison controls remain silent.';
    startupBridge.report('pipelines','ready');
  }catch(error){if(!galleryActive())return;showError(error,navigator.gpu?'HOVER_SPRINT_WEBGPU_STARTUP_FAILED':'WEBGPU_UNSUPPORTED',navigator.gpu?'error':'unsupported');}
}
$('audio').addEventListener('click',async()=>{const result=await sfx.activateFromGesture({id:VERSION_ID});if(!galleryActive())return;$('audio-state').textContent=result.reason;});
$('muted').addEventListener('change',()=>{muted=verify||$('muted').checked;if(master)master.gain.setTargetAtTime(muted?0:.22,audioContext.currentTime,.008);if(muted)stopOwnedAudio();refreshHeld();});
$('source').addEventListener('change',()=>{stopOwnedAudio();refreshHeld();});
$('reduced').addEventListener('change',refreshHeld);
$('observer').addEventListener('change',refreshHeld);
$('heading').value=headingKey;$('heading').addEventListener('change',event=>{if(!HEADINGS[event.target.value])return;headingKey=event.target.value;refreshHeld();});
$('seek').addEventListener('input',event=>{const next=Number(event.target.value);$('seek-value').value=`${next} ms`;
  let previous=heldPhase;cancelQueuedFrame();
  if(heldPhase===null){const current=timeAt(performance.now());previous=current.age;cycleBase=current.cycle;heldPhase=current.age;}
  if(next<previous)roomGeneration++;
  heldPhase=next;stopOwnedAudio();refreshHeld();});
$('play').addEventListener('click',()=>{if(!galleryActive())return;cancelQueuedFrame();const now=performance.now(),current=timeAt(now);
  cycleBase=current.cycle+1;heldPhase=null;loopOrigin=now;schedule();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){cancelQueuedFrame();stopOwnedAudio();}else if(heldPhase!==null)refreshHeld();else schedule();});
window.addEventListener('resize',()=>{if(!renderer||!galleryActive())return;cancelQueuedFrame();
  const run=enqueueDraw(async()=>{if(!galleryActive())return;const next=size();if(target.resize(next.width,next.height))await renderAt(performance.now());});
  void run.then(()=>{if(galleryActive())schedule();},error=>schedulerError(error,'HOVER_SPRINT_RESIZE_FAILURE'));});
async function dispose(){if(disposed)return;disposed=true;cancelQueuedFrame();ordinaryFramePending=false;stopOwnedAudio();pass?.destroy();pass=null;const old=renderer;renderer=null;try{old?.destroy();}catch(error){$('status').textContent=`Cleanup: ${error.message}`;}if(audioContext){try{await audioContext.close();}catch{}}}
startup?.setCleanup?.(()=>{void dispose();});
window.addEventListener('pagehide',()=>{void dispose();},{once:true});
void initialize();
