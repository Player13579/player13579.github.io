import {createFireRuntime} from './fire-runtime.mjs';
import {DEFAULT_FIXTURE,FIRE_ID,normalizeFireInput} from './fire-plan.mjs';
import {createFireSfx} from './fire-sfx.mjs';
const params=new URLSearchParams(location.search),verify=params.has('verify'),embedded=window.parent!==window;
const identity={token:params.get('galleryStartupToken'),versionId:params.get('galleryVersionId')??FIRE_ID,attemptEpoch:Number(params.get('galleryAttemptEpoch'))};
const parentOrigin=embedded&&document.referrer?new URL(document.referrer).origin:null;
const transport=embedded&&parentOrigin===location.origin&&/^[a-f0-9]{32}$/i.test(identity.token??'')&&identity.versionId===FIRE_ID&&Number.isInteger(identity.attemptEpoch)&&identity.attemptEpoch>0;
let messageSequence=0,sourcePins=null,bootSettled=false,failedGpuLifecycle=null,bootstrapTimerPending=false,bootstrapTimerSettled=true,bootstrapTimerElapsedMs=0;
const adapterSessionId=crypto.randomUUID();
function notify(stage,statusValue='pending',extra={}){if(transport&&!retired)parent.postMessage({schema:'dva-gallery-startup/v1',...identity,adapterSessionId,sourcePins:sourcePins?structuredClone(sourcePins):null,sequence:++messageSequence,stage,status:statusValue,error:null,...extra},parentOrigin);}
async function hashBytes(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');}
async function checkSources(){
  const response=await fetch(new URL('./PACKAGE.json',import.meta.url));if(!response.ok)throw Error('package unavailable');const bytes=await response.arrayBuffer(),hash=await hashBytes(bytes);
  const expected=params.get('galleryPackageManifestSha256');if(expected&&expected!==hash)throw Error('package pin mismatch');
  const manifest=JSON.parse(new TextDecoder().decode(bytes));if(manifest.id!==FIRE_ID||manifest.schema!=='fire-zero-gallery/v1')throw Error('package schema/id');
  if(params.has('galleryPackageSchema')&&params.get('galleryPackageSchema')!==manifest.schema)throw Error('query package schema mismatch');
  for(const [name,query] of [['SOURCE-MANIFEST.json','gallerySourceManifestSha256'],['PACKAGE-SEAL.json','galleryPackageSealSha256']]){if(params.has(query)){const r=await fetch(new URL(name,import.meta.url));if(!r.ok||await hashBytes(await r.arrayBuffer())!==params.get(query))throw Error('auxiliary pin mismatch '+name);}}
  const checked=[];for(const row of manifest.runtimeFiles){const body=await fetch(new URL(row.path,import.meta.url));if(!body.ok)throw Error('source unavailable '+row.path);const actual=await body.arrayBuffer();if(actual.byteLength!==row.bytes||await hashBytes(actual)!==row.sha256)throw Error('source pin mismatch '+row.path);checked.push(row);}
  sourcePins={schema:manifest.schema,packageManifestSha256:hash,packageSealSha256:params.get('galleryPackageSealSha256'),sourceManifestSha256:manifest.sourceManifest.sha256,runtimeFiles:checked};return manifest;
}
async function waitBootstrapTimer(){bootstrapTimerPending=true;bootstrapTimerSettled=false;const start=performance.now();try{await new Promise(resolve=>setTimeout(resolve,8));bootstrapTimerElapsedMs=performance.now()-start;}finally{bootstrapTimerPending=false;bootstrapTimerSettled=true;}}
function bootstrapTimerSnapshot(){return {pending:bootstrapTimerPending,settled:bootstrapTimerSettled,elapsedMs:bootstrapTimerElapsedMs};}
if(embedded)document.body.classList.add('embedded');
const canvas=document.getElementById('fire'),status=document.getElementById('status');
let runtime=null,sfx=null,retired=false,ready=false,raf=0,running=true,heldAge=null,origin=0,cycle=0,currentCause='',lastReceipt=null,completedCycleAt=null,retirePromise=null;
let config={...DEFAULT_FIXTURE,source:true,observer:true,heatRefraction:true,glare:true,receivedLight:true,mainOnly:false,bright:false,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,sourceX:0};
const history=[],errors=[],audioErrors=[];let sfxStarted=false;
function nowAge(){return heldAge??Math.max(0,performance.now()-origin);}
function begin(){origin=performance.now();heldAge=null;completedCycleAt=null;sfxStarted=false;currentCause='fire-fixture-'+(++cycle);}
function audioError(e){audioErrors.push(String(e?.message??e));status.textContent='VFX 継続 / SFX: '+audioErrors.at(-1);}
async function frame(){
  if(retired||!ready)return;
  try{
    const age=nowAge(),receipt=await runtime.render({...config,causeId:currentCause,ageEms:age});if(retired||receipt.cancelled)return;
    lastReceipt={...receipt,completionAgeEms:heldAge??Math.max(0,performance.now()-origin)};history.push(lastReceipt);if(history.length>300)history.shift();
    status.textContent=FIRE_ID+' '+receipt.plan.phase+' / '+Math.round(age)+' ms / GPU '+(receipt.gpuCompleted?'完了':'失敗')+' / synthetic H'+config.actorHeightCss;
    if(receipt.causeId===currentCause&&!sfxStarted&&receipt.gpuCompleted&&receipt.plan.sfxRequestEligible&&heldAge===null&&sfx){const sourceCause=receipt.causeId;const result=sfx.start({causeId:sourceCause,lifetimeEms:receipt.plan.lifetimeEms,elapsedEms:nowAge()});Promise.resolve(result).then(h=>{if(!h)return;if(retired||currentCause!==sourceCause){h.stop();return;}sfxStarted=true;}).catch(audioError);}
    if(age>=config.lifetimeEms&&heldAge===null){if(completedCycleAt===null){completedCycleAt=performance.now();sfx?.stop(currentCause);}if(running&&performance.now()-completedCycleAt>=config.gapEms)begin();}
  }catch(e){errors.push(String(e?.message??e));status.textContent='VFX エラー: '+errors.at(-1);running=false;return;}
  if(!retired)raf=requestAnimationFrame(frame);
}
const api={id:FIRE_ID,ready:null,
  async activate(options={}){await api.ready;if(retired)throw Error('retired');config={...config,...normalizeFireInput({...config,...options,ageEms:0})};running=true;begin();if(!raf)raf=requestAnimationFrame(frame);return currentCause;},
  async hold(ageEms){await api.ready;if(!Number.isFinite(ageEms)||ageEms<0)throw Error('age');heldAge=ageEms;running=false;return runtime.render({...config,ageEms,causeId:currentCause});},
  async configure(options={}){await api.ready;config={...config,...normalizeFireInput({...config,...options,ageEms:heldAge??nowAge()})};return runtime.render({...config,ageEms:nowAge(),causeId:currentCause});},
  async resume(){await api.ready;if(retired)return false;if(heldAge!==null){origin=performance.now()-heldAge;heldAge=null;}running=true;return true;},
  async setAutoLoopEnabled(value){await api.ready;running=Boolean(value);return running;},
  async unlockAudio(){await api.ready;if(verify)return false;if(!sfx)return false;try{return await sfx.unlock();}catch(e){audioError(e);return false;}},
  snapshot(){return {id:FIRE_ID,verify,muted:verify||sfx?.snapshot()?.muted!==false,ready,retired,running,heldAge,causeId:currentCause,config:structuredClone(config),ageEms:ready?nowAge():null,lastReceipt:lastReceipt?structuredClone(lastReceipt):null,history:structuredClone(history),runtime:runtime?.snapshot()??null,audio:sfx?.snapshot()??{notIntegrated:true,verify},errors:[...errors],audioErrors:[...audioErrors]};},
  lifecycleSnapshot(){return {adapterSessionId,bootSettled,ready,retired,pending:(runtime?.snapshot().pending??0)+(bootstrapTimerPending?1:0),queuedRaf:raf,bootstrapTimer:bootstrapTimerSnapshot(),sourcePins:sourcePins?structuredClone(sourcePins):null};},
  retire(){if(retirePromise)return retirePromise;retired=true;running=false;cancelAnimationFrame(raf);raf=0;retirePromise=(async()=>{await api.ready.catch(()=>{});if(sfx)await sfx.dispose();const audioState=sfx?.snapshot();const audio=audioState?{...audioState,absent:!audioState.contextCreated,closed:audioState.contextState==='closed'||audioState.contextState==='absent',pending:audioState.pendingUnlocks+audioState.pendingTimers,active:audioState.pendingVoices}:{notIntegrated:true,absent:true,closed:true,pending:0,active:0};const gpu=runtime?await runtime.retire():failedGpuLifecycle??{neverCreated:true,drained:true,pending:0,submission:0,completedSubmission:0,resourcesRemaining:0,contextUnconfigured:true};return {schema:'fire-zero-retirement/v1',...identity,adapterSessionId,id:FIRE_ID,retired:true,disposeSettled:true,bootSettled,creationSettled:true,noQueuedOrActive:raf===0&&gpu.pending===0&&audio.pending===0&&audio.active===0&&!bootstrapTimerPending&&bootstrapTimerSettled,pending:gpu.pending+(bootstrapTimerPending?1:0),bootstrapTimer:bootstrapTimerSnapshot(),submitted:gpu.submission,completed:gpu.completedSubmission,device:gpu.neverCreated?{neverCreated:true,destroyCalled:false}:{sameOwnedDevice:gpu.sameOwnedDevice,drained:gpu.drained,destroyCalled:gpu.destroyCalled,lostReason:gpu.lost?.reason},contextUnconfigured:gpu.contextUnconfigured,resourcesRemaining:gpu.resourcesRemaining,audio,gpu,sourcePins,errors:[...errors,...(gpu.errors??[])]};})();return retirePromise;}
};
window.__fireZeroR4=api;
api.ready=(async()=>{
  notify('child-document');notify('adapter');const manifest=await checkSources();
  if(retired)return {id:FIRE_ID,cancelled:true};
  const hashes=Object.fromEntries(manifest.runtimeFiles.map(r=>[r.path,r.sha256]));
  runtime=await createFireRuntime(canvas,{expectedHashes:hashes,onStage:stage=>{notify(stage);if(stage==='device')notify('assets','ready');}});
  if(retired)return {id:FIRE_ID,cancelled:true};
  sfx=createFireSfx({verify,muted:verify});
  ready=true;begin();await waitBootstrapTimer();
  if(retired){ready=false;return {id:FIRE_ID,cancelled:true};}await frame();
  const initialReceipt=lastReceipt;const firstFrameAccepted=!!initialReceipt&&initialReceipt.gpuCompleted===true&&initialReceipt.passes===2&&initialReceipt.plan?.active===true&&initialReceipt.plan?.sourceGain>0&&initialReceipt.causeId===currentCause;if(!firstFrameAccepted)throw Error('initial GPU frame incomplete or inactive');
  const row=manifest.runtimeFiles.find(r=>r.path==='fire-runtime.mjs');
  const firstFrame={adapterSessionId,recorded:true,submitted:true,completed:true,gpuCompleted:initialReceipt.gpuCompleted,plan:{active:initialReceipt.plan.active,sourceGain:initialReceipt.plan.sourceGain},submittedAgeEms:initialReceipt.submittedAgeEms,submission:initialReceipt.submission,canvasConnected:initialReceipt.canvasConnected,passes:initialReceipt.passes,viewportWidth:initialReceipt.target.width,viewportHeight:initialReceipt.target.height,causeId:initialReceipt.causeId,generation:initialReceipt.generation,source:row};
  notify('first-frame','ready',{firstFrame});notify('playing','ready',{firstFrame});
  return {id:FIRE_ID,ready:true,verify,syntheticFixture:true,sfxIntegrated:true,firstFrame};
})();
api.ready.catch(e=>{failedGpuLifecycle=e.fireLifecycle??null;notify('playing','error',{error:String(e.message)});}).finally(()=>{bootSettled=true;}).catch(()=>{});
Object.freeze(api);
window.__gallerySfx=Object.freeze({async activateFromGesture(){try{await api.ready;const ok=await api.unlockAudio();const snapshot=api.snapshot();const audio=snapshot.audio;return {ok:ok===true&&snapshot.verify===false&&audio.verify===false&&audio.muted===false&&audio.contextState==='running',reason:ok?'audio-state-check':'audio-unavailable-or-verify',snapshot:audio};}catch(e){return {ok:false,reason:'ready-failed',snapshot:api.snapshot().audio,error:String(e?.message??e)};}}});
addEventListener('message',async event=>{const m=event.data;if(!transport||event.source!==parent||event.origin!==parentOrigin||m?.schema!=='dva-gallery-startup/v1'||m.action!=='retire'||m.token!==identity.token||m.versionId!==identity.versionId||m.attemptEpoch!==identity.attemptEpoch)return;try{const lifecycle=await api.retire();parent.postMessage({schema:'dva-gallery-startup/v1',...identity,adapterSessionId,sequence:++messageSequence,status:'cancelled',action:'retired',lifecycle},parentOrigin);}catch(e){parent.postMessage({schema:'dva-gallery-startup/v1',...identity,sequence:++messageSequence,status:'error',action:'retired',error:String(e.message)},parentOrigin);}});
document.getElementById('replay').onclick=()=>api.activate();
document.getElementById('pause').onclick=()=>heldAge===null?api.hold(nowAge()):api.resume();
document.getElementById('audio').onclick=()=>api.unlockAudio();
for(const [id,key] of [['source','source'],['observer','observer'],['received','receivedLight'],['main','mainOnly'],['bright','bright']])document.getElementById(id).onchange=e=>api.configure({[key]:e.target.checked});
addEventListener('pagehide',()=>api.retire());
api.ready.catch(e=>{errors.push(String(e.message));status.textContent='VFX 起動失敗: '+e.message;});
