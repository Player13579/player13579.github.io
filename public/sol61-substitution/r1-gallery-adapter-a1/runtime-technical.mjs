import * as Effect from "./creative/contract.mjs";
import { createGpuRenderer } from "./gpu-renderer.mjs";
import { createGalleryProtocol, parseGalleryAuth, isFreshSourceReceipt, isReadyFrameValid } from "./gallery-protocol.mjs";
import { fixture as makeFixture, sanitizeFixture } from "./viewer-fixture.mjs";
import { createAudioHost } from "./audio-host.mjs";

const VERSION = "substitution-sol61-r1";
const DURATION = Effect.DURATIONS_MS;
const ROLE = Effect.ROLES;
const ownText = async (fetcher,url) => {
  const r = await fetcher(url);
  if (!r.ok) throw new Error("読み込みに失敗しました");
  const bytes = new Uint8Array(await r.arrayBuffer());
  return { text: new TextDecoder().decode(bytes), bytes };
};
const sha256 = async bytes => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(x=>x.toString(16).padStart(2,"0")).join("");

export function createPreviewRuntime({ windowRef=globalThis.window, documentRef=globalThis.document,
  rendererFactory=createGpuRenderer, audioFactory=createAudioHost, now=()=>performance.now(),
  raf=cb=>requestAnimationFrame(cb), cancelRaf=id=>cancelAnimationFrame(id),
  fetcher=fetch, visibility=()=>documentRef.visibilityState, onDiagnostic=()=>{} } = {}) {
  const auth = parseGalleryAuth(windowRef.location.search);
  let renderer=null, audio=null, rafId=0, dead=false, hidden=false, mode="idle", mainOn=true;
  let generation=0, nextCause=1, active=null, diagnosticFixture=null, lastReadyCause=null, serialized=Promise.resolve();
  let renderSerial=0, audioFirstCause=1, abortReason=null;
  let creationClosed=false, initSettled=true, startPromise=null, retirementPromise=null, pendingRender=0;
  const cleanupErrors=[];
  const verify = new URLSearchParams(windowRef.location.search).has("verify");
  const url = name => new URL(name, import.meta.url).href;
  const emit = (stage, detail={}) => onDiagnostic({stage,...detail});
  const audioError = error => {
    let message="Audio unavailable.";
    try { message=String(error?.message||error).slice(0,240); } catch {}
    try {
      const notice=documentRef.querySelector("#audio-status");
      if(notice)notice.textContent="Audio unavailable.";
    } catch {}
    try { emit("audio-error",{message}); } catch {}
  };
  const protocol = createGalleryProtocol({windowRef,auth,onCommand:command => controls[command]?.(),onRetire:()=>retire()});
  const controls = {};
  const cssProjection = p => {
    if(p?.authorized!==true||p.visible!==true||p.current!==true||p.registered!==true)return null;
    const v=renderer?.snapshot?.().viewport;
    if(!v || !(v.cssWidth>0) || !(v.cssHeight>0))return null;
    const zoom=Number(ui.zoom.value)||1, sx=v.cssWidth/800, sy=v.cssHeight/440;
    const footX=Math.fround(((p.footX-400)*zoom+400)*sx);
    const footY=Math.fround(((p.footY-220)*zoom+220)*sy);
    const actorHeightPx=Math.fround(p.actorHeightPx*zoom*sy);
    if(![footX,footY,actorHeightPx].every(Number.isFinite)||!(actorHeightPx>0))return null;
    return {footX,footY,actorHeightPx,authorized:true,visible:true,current:true,registered:true};
  };
  const backingProjection = p => {
    if(p?.authorized!==true||p.visible!==true||p.current!==true||p.registered!==true)return null;
    const v=renderer?.snapshot?.().viewport, css=cssProjection(p);
    if(!v || !css || !(v.dpr>0))return null;
    const footX=Math.fround(css.footX*v.dpr),footY=Math.fround(css.footY*v.dpr);
    const actorHeightPx=Math.fround(css.actorHeightPx*v.dpr);
    if(![footX,footY,actorHeightPx].every(Number.isFinite)||!(actorHeightPx>0))return null;
    return {footX,footY,actorHeightPx,authorized:true,visible:true,current:true,registered:true};
  };
  const backingViewport = () => {
    const v=renderer?.snapshot?.().viewport;
    return v ? [v.backingWidth,v.backingHeight] : [0,0];
  };
  const baselineActors = () => {
    const target=active?.fixture ?? diagnosticFixture;
    if(!target)return [];
    const safe=target.roles.filter(Boolean).map(cssProjection).filter(Boolean), seen=new Set();
    return safe.filter(p=>{const k=p.footX+":"+p.footY+":"+p.actorHeightPx;if(seen.has(k))return false;seen.add(k);return true;});
  };
  const reportStage = (stage,detail) => emit(stage,detail);
  const render = async options => {
    if (creationClosed || dead) throw new Error("ランタイムは終了しています");
    pendingRender++;
    try { return await renderer.render(options); }
    finally { pendingRender--; }
  };
  const start = () => {
    if (creationClosed || dead) return Promise.reject(new Error("ランタイムは終了しています"));
    if (startPromise) return startPromise;
    initSettled=false;
    startPromise=(async()=>{
      try {
        if (auth.mode==="rejected") throw new Error("ギャラリー認証が不正です");
        const [effect,baseline] = await Promise.all([ownText(fetcher,url("./creative/effect.wgsl")),ownText(fetcher,url("./fixture-baseline.wgsl"))]);
        if (creationClosed || dead) return false;
        if (!windowRef.navigator?.gpu) throw new Error("WebGPUが利用できません");
        renderer=rendererFactory({canvas:documentRef.querySelector("canvas"),effectWgsl:effect.text,baselineWgsl:baseline.text,reportStage});
        await renderer.ready;
        if (creationClosed || dead) return false;
        const warm = await render({draws:[],baselineActors:[],causeId:0,generation:0,ageMs:0,sourceEligible:false,mode:"warmup",mainOn:false});
        if (creationClosed || dead) return false;
        if (warm.status!=="completed" || warm.completed!==true) throw new Error("描画準備を完了できません");
        audio=audioFactory({verify});
        const shaderSha256=await sha256(effect.bytes), baselineSha256=await sha256(baseline.bytes);
        if (creationClosed || dead) return false;
        emit("warmup-complete",{shaderSha256,baselineSha256});
        return true;
      } finally {
        initSettled=true;
      }
    })();
    return startPromise;
  };
  const schedule = () => {
    if (creationClosed || dead || hidden || rafId) return;
    rafId=raf(tick);
  };
  const tick = timestamp => {
    rafId=0;
    if (creationClosed || dead || hidden) return;
    serialized=serialized.then(()=>frame(now())).catch(error=>fatal(error)).finally(()=>schedule());
  };
  const currentAge = t => mode==="diagnostic" ? Math.max(0,Number(ui.diagnosticAge.value)||0) :
    active && mode==="playing" ? Math.max(0,t-active.startedAt) : active?.heldAge ?? 0;
  const projectionsFor = () => active ? sanitizeFixture(active.fixture) : diagnosticFixture;
  const currentRoles = t => {
    if ((!active && mode!=="diagnostic") || mode==="idle") return [];
    const age=currentAge(t), drawAge=Math.fround(age), kind=active?.kind ?? ui.kind.value;
    const target=active?.fixture ?? diagnosticFixture;
    const from=kind==="grant"?0:2, to=kind==="grant"?1:3;
    const viewportPx=backingViewport();
    if(!viewportPx.every(v=>Number.isFinite(v)&&v>0))return [];
    return [from,to].flatMap(role => {
      const projection=target?.roles[role];
      if (!projection || !Effect.roleActive(role,drawAge)) return [];
      const safe=backingProjection(projection);
      if (!safe) return [];
      const rect=Effect.boundsFor(safe);
      const uniforms=Effect.packUniform64({viewportPx,ageMs:drawAge,role,projection:safe,
        reducedMotion:ui.reducedMotion.checked,sourceOn:mainOn,observerBloomOn:ui.observer.checked,sparkleOn:ui.sparkle.checked});
      if(!rect||!uniforms||![...uniforms].every(Number.isFinite)||
        ![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite))return [];
      const roleName=Object.keys(ROLE).find(name=>ROLE[name]===role);
      return [{role:roleName,uniforms,rect,ageMs:drawAge}];
    });
  };
  const sourceDrawable = draw => {
    const v=renderer?.snapshot?.().viewport;
    if(!draw || !v || !(v.backingWidth>0) || !(v.backingHeight>0))return false;
    const H=Number(draw.uniforms[6]), fx=Number(draw.uniforms[4]), fy=Number(draw.uniforms[5]);
    const x=Math.floor(fx-.92*H), y=Math.floor(fy-1.22*H);
    const right=Math.ceil(fx+.92*H), bottom=Math.ceil(fy+.18*H);
    return Math.max(0,Math.min(v.backingWidth,right)-Math.max(0,x))>0 &&
      Math.max(0,Math.min(v.backingHeight,bottom)-Math.max(0,y))>0;
  };
  const frame = async t => {
    if (creationClosed || dead || hidden || !renderer) return;
    const thisActive=active, thisGen=generation, thisMode=mode, thisMain=mainOn;
    const startedAt=thisActive?.startedAt, submittedAgeMs=Math.fround(currentAge(t));
    const fixtureSafe=(thisActive || thisMode==="diagnostic") ? projectionsFor() : null;
    const roles=currentRoles(t);
    const kind=thisActive?.kind ?? (thisMode==="diagnostic"?ui.kind.value:null);
    const sourceRole=kind==="grant"?0:2;
    const sourceRoleName=kind==="grant"?"grantSource":"triggerOrigin";
    const sourceRoleDraw=roles.find(draw=>draw.role===sourceRoleName);
    const sourceVisible=!!fixtureSafe?.roles[sourceRole];
    const eligibleAge=age=>Number.isFinite(age)&&age>0&&age<(kind==="grant"?820:1200)&&
      Effect.sourceEmissionEligible(kind,age);
    const sourceEligible=!!thisActive && thisMode==="playing" && thisMain && sourceVisible &&
      sourceDrawable(sourceRoleDraw) && eligibleAge(submittedAgeMs);
    const receipt=await render({
      draws:roles,baselineActors:baselineActors(),causeId:thisActive?.id??0,generation:thisGen,
      ageMs:submittedAgeMs,sourceEligible,mode:thisMode,mainOn:thisMain
    });
    const completedAt=now();
    const currentAgeMs=Math.fround(thisActive&&thisMode==="playing" ?
      Math.max(0,completedAt-startedAt) : currentAge(completedAt));
    const canvas=documentRef.querySelector("canvas"),canvasRect=canvas?.getBoundingClientRect?.();
    const targetGeneration=renderer.snapshot?.()?.targetGeneration;
    const visible=!hidden&&visibility()!=="hidden";
    const current=active===thisActive&&generation===thisGen&&mode===thisMode&&mainOn===thisMain&&
      !dead&&visible&&canvas?.isConnected===true&&
      Number.isFinite(canvasRect?.width)&&canvasRect.width>0&&
      Number.isFinite(canvasRect?.height)&&canvasRect.height>0&&
      targetGeneration!=null&&receipt?.targetGeneration===targetGeneration&&receipt.current===true;
    const drawable=!!sourceRoleDraw&&sourceDrawable(sourceRoleDraw);
    const state={kind,submittedAgeMs,currentAgeMs,current,playing:thisMode==="playing",
      mainOn:thisMain,visible,canvasConnected:canvas?.isConnected===true,
      canvasWidth:canvasRect?.width??0,canvasHeight:canvasRect?.height??0,
      sourceVisible,sourceOn:thisMain,sourceDrawable:drawable,causeId:thisActive?.id,
      generation:thisGen,targetGeneration,observerOn:ui.observer.checked};
    const canReady=!!(current&&thisActive&&sourceEligible&&drawable&&eligibleAge(currentAgeMs)&&
      receipt?.submittedAgeMs===submittedAgeMs&&isReadyFrameValid(receipt,state));
    if(receipt?.status==="completed"&&receipt.completed===true)renderSerial++;
    emit("frame",{causeId:thisActive?.id??null,generation:thisGen,submittedAgeMs,currentAgeMs,
      sourceVisible,sourceEligible:canReady,drawRoles:roles.map(draw=>draw.role),
      receipt:receipt?compact(receipt):null});
    if(!current)return;
    if(canReady) {
      protocol.ready(receipt,state);
      const isCurrent=()=>active===thisActive&&generation===thisGen&&mode==="playing"&&
        mainOn===thisMain&&mainOn===true&&!dead&&!hidden&&visibility()!=="hidden";
      try {
        const pending=audio?.cue({kind:thisActive.kind,causeId:thisActive.id,ageMs:currentAgeMs,
          sourceEligible:canReady===true,visible:sourceVisible,mainOn:thisMain,playing:true,
          fresh:current===true,isCurrent,enabled:ui.audio.checked&&thisActive.id>=audioFirstCause});
        Promise.resolve(pending).catch(audioError);
      } catch(error) { audioError(error); }
    }
    if(thisActive&&thisMode==="playing"&&currentAgeMs>=DURATION[thisActive.kind])
      finishCause(thisActive,thisGen);
  };
  const compact = r => ({status:r.status,recorded:r.recorded,submitted:r.submitted,completed:r.completed,
    serial:r.serial,passes:r.passes,drawCalls:r.drawCalls,causeId:r.causeId,generation:r.generation,
    submittedAgeMs:r.submittedAgeMs,submittedMode:r.submittedMode,mainOn:r.mainOn,
    sourceEligible:r.sourceEligible,current:r.current,targetGeneration:r.targetGeneration,
    scopeResults:Array.isArray(r.scopeResults)?r.scopeResults.slice(0,8).map(entry=>({
      kind:entry?.kind==null?null:String(entry.kind).slice(0,64),
      error:entry?.error==null?null:String(entry.error?.message||entry.error).slice(0,160)
    })):null,
    uncapturedErrors:Array.isArray(r.uncapturedErrors)?r.uncapturedErrors.slice(0,4).map(e=>String(e?.message||e).slice(0,160)):null,
    viewport:r.viewport?{width:r.viewport.width,height:r.viewport.height,
      cssWidth:r.viewport.cssWidth,cssHeight:r.viewport.cssHeight,dpr:r.viewport.dpr}:null,
    queueFence:!!r.queueFence,queueFenceResult:r.queueFenceResult?{
      completed:r.queueFenceResult.completed,serial:r.queueFenceResult.serial,
      targetGeneration:r.queueFenceResult.targetGeneration}:null});
  const finishCause=(c,g) => { if (active===c && generation===g) { active=null; mode="idle"; invalidateAudio(); } };
  const invalidateAudio=()=>{
    try { Promise.resolve(audio?.stop()).catch(audioError); } catch(error) { audioError(error); }
  };
  const freshCause = () => {
    if (creationClosed || dead || hidden || !renderer) return false;
    generation++; invalidateAudio(); lastReadyCause=null;
    active={ id:nextCause++, generation, kind:ui.kind.value, fixture:sanitizeFixture(makeFixture(ui.fixture.value,ui.kind.value)),
      startedAt:now(), heldAge:0 };
    mode="playing"; schedule(); return true;
  };
  controls.play=freshCause;
  controls.hold=()=>{if(creationClosed||dead)return;if(active&&mode==="playing"){active.heldAge=currentAge(now());generation++;mode="held";invalidateAudio();schedule();}};
  controls.resume=()=>{if(creationClosed||dead)return;if(active&&mode==="held"){generation++;active.startedAt=now()-active.heldAge;mode="playing";schedule();}};
  controls.stop=()=>{if(creationClosed||dead)return;generation++;active=null;diagnosticFixture=null;mode="idle";invalidateAudio();schedule();};
  controls.diagnostic=()=>{if(creationClosed||dead)return;generation++;active=null;invalidateAudio();lastReadyCause=null;
    diagnosticFixture=sanitizeFixture(makeFixture(ui.fixture.value,ui.kind.value));mode="diagnostic";schedule();};
  const retire=()=>{
    if(retirementPromise)return retirementPromise;
    creationClosed=true;
    dead=true;
    mode="retired";
    generation++;
    const failures=[];
    const recordCleanupError=(stage,error)=>{
      failures.push(error);
      let message="Cleanup failed";
      try { message=String(error?.message||error); } catch {}
      cleanupErrors.push({stage,message});
    };
    // Defer work until the shared retirement promise has been installed.
    retirementPromise=Promise.resolve().then(async()=>{
      if(rafId){
        try { cancelRaf(rafId);rafId=0; }
        catch(error) { recordCleanupError("cancel-raf",error); }
      }
      let stopPromise=Promise.resolve();
      if(audio){
        try { stopPromise=Promise.resolve(audio.stop()); }
        catch(error) { recordCleanupError("audio-stop",error); }
      }
      // Attach the rejection handler immediately, even while initialization settles.
      stopPromise=stopPromise.catch(error=>recordCleanupError("audio-stop",error));
      // A failed start is settled initialization, not a reason to skip disposal.
      if(startPromise)await Promise.allSettled([startPromise]);
      await stopPromise;
      try { await serialized; }
      catch(error) { recordCleanupError("frame-chain",error); }
      // Promise callbacks also turn synchronous dispose throws into settled outcomes.
      const outcomes=await Promise.allSettled([
        Promise.resolve().then(()=>renderer ? renderer.dispose() : undefined),
        Promise.resolve().then(()=>audio ? audio.dispose() : undefined)
      ]);
      for(let i=0;i<outcomes.length;i++){
        if(outcomes[i].status==="rejected")
          recordCleanupError(i===0?"renderer-dispose":"audio-dispose",outcomes[i].reason);
      }
      const gpuDisposal=outcomes[0].status==="fulfilled" ? outcomes[0].value : undefined;
      const audioDisposal=outcomes[1].status==="fulfilled" ? outcomes[1].value : undefined;
      let audioSnapshot;
      try { audioSnapshot=audio?.snapshot?.(); }
      catch(error) { recordCleanupError("audio-snapshot",error); }
      // Neither an absent resource nor a fulfilled void disposal proves closure.
      // Preserve missing evidence as missing: the protocol must reject it.
      const lifecycle={
        retired:dead&&mode==="retired",
        closed:dead&&creationClosed,
        creationClosed,
        initSettled,
        loopStopped:dead&&creationClosed&&mode==="retired",
        rafPending:rafId!==0,
        pendingRender,
        cleanupErrors:cleanupErrors.slice(),
        gpu:{
          status:gpuDisposal?.status,
          serial:gpuDisposal?.serial,
          completedSerial:gpuDisposal?.completedSerial,
          errors:gpuDisposal?.errors
        },
        audio:{
          closed:audioSnapshot?.closed,
          closeSettled:audioSnapshot?.closeSettled,
          activeVoices:audioSnapshot?.activeVoices,
          pending:audioSnapshot?.pending,
          contextState:audioSnapshot?.contextState,
          errors:audioSnapshot?.errors,
          cleanupErrors:audioSnapshot?.cleanupErrors
        }
      };
      // If disposal itself reports failed audio closure, a later snapshot cannot
      // turn that result into successful proof. Void returns remain permissible
      // only when the post-dispose snapshot supplies all required evidence.
      if(audioDisposal && typeof audioDisposal==="object"){
        if(audioDisposal.closed===false)lifecycle.audio.closed=false;
        if(audioDisposal.closeSettled===false)lifecycle.audio.closeSettled=false;
        for(const key of ["errors","cleanupErrors"]){
          if(Array.isArray(audioDisposal[key])&&audioDisposal[key].length){
            const observed=lifecycle.audio[key];
            lifecycle.audio[key]=Array.isArray(observed)
              ? [...observed,...audioDisposal[key]] : audioDisposal[key];
          }
        }
      }
      if(failures.length)throw new AggregateError(failures,"終了処理に失敗しました");
      return lifecycle;
    });
    return retirementPromise;
  };
  const onVisibility=()=>{
    if(creationClosed||dead)return;
    const ageBeforeChange=active && mode==="playing" ? currentAge(now()) : active?.heldAge ?? 0;
    hidden=visibility()==="hidden";
    if(hidden){ generation++;if(active)active.heldAge=ageBeforeChange;mode=active?"held":mode==="diagnostic"?"diagnostic":"idle";if(rafId)cancelRaf(rafId);rafId=0;invalidateAudio(); }
    else { schedule(); } // Explicit resume is required.
  };
  const retireLocally=()=>{
    // Local cleanup never sends or fabricates a parent retirement ACK.
    void retire().catch(error=>{
      try { emit("cleanup-error",{message:String(error?.message||error)}); } catch {}
    });
  };
  const onPageHide=()=>{retireLocally();};
  const unlock=()=>{
    if(creationClosed||dead)return Promise.resolve(false);
    audioFirstCause=nextCause;
    try { return Promise.resolve(audio?.unlock()).catch(error=>{audioError(error);return false;}); }
    catch(error) { audioError(error);return Promise.resolve(false); }
  };
  const fatal=error=>{emit("error",{message:String(error?.message||error)});documentRef.querySelector("#status").textContent=String(error?.message||error);protocol.error(String(error?.message||error));retireLocally();};
  const ui = {};
  const bindUi=()=>{
    if(creationClosed||dead)return;
    ui.kind=documentRef.querySelector("#kind");ui.fixture=documentRef.querySelector("#fixture");
    ui.observer=documentRef.querySelector("#observer");ui.sparkle=documentRef.querySelector("#sparkle");
    ui.reducedMotion=documentRef.querySelector("#reduced-motion");ui.audio=documentRef.querySelector("#audio");ui.zoom=documentRef.querySelector("#zoom");
    mainOn=documentRef.querySelector("#main-on").checked;
    documentRef.querySelector("#play").addEventListener("click",controls.play);
    documentRef.querySelector("#hold").addEventListener("click",controls.hold);
    documentRef.querySelector("#resume").addEventListener("click",controls.resume);
    documentRef.querySelector("#stop").addEventListener("click",controls.stop);
    documentRef.querySelector("#diagnostic").addEventListener("click",controls.diagnostic);
    ui.diagnosticAge=documentRef.querySelector("#diagnostic-age");
    ui.diagnosticAge.addEventListener("input",()=>{if(mode==="diagnostic")schedule();});
    documentRef.querySelector("#unlock-audio").addEventListener("click",unlock);
    for(const el of [ui.kind,ui.fixture,ui.observer,ui.sparkle,ui.reducedMotion,ui.audio,ui.zoom])
      el.addEventListener("change",()=>{if(creationClosed||dead)return;generation++;lastReadyCause=null;invalidateAudio();schedule();});
    documentRef.querySelector("#main-on").addEventListener("change",event=>{if(creationClosed||dead)return;mainOn=event.target.checked;generation++;lastReadyCause=null;invalidateAudio();schedule();});
    windowRef.addEventListener("resize",()=>{if(creationClosed||dead)return;renderer?.resize().then(()=>schedule()).catch(fatal);});
    documentRef.addEventListener("visibilitychange",onVisibility);
    windowRef.addEventListener("pagehide",onPageHide,{once:true});
  };
  return Object.freeze({start,bindUi,retire,controls,protocol,getSnapshot:()=>({version:VERSION,mode,generation,causeId:active?.id??null,renderSerial,authMode:auth.mode,verify})});
}
export async function boot() {
  const panel=document.querySelector("#diagnostics");
  const runtime=createPreviewRuntime({onDiagnostic:entry=>{panel.textContent=JSON.stringify(entry,null,2);}});

  runtime.bindUi();
  const live=runtime.getSnapshot;
  const status=document.querySelector("#status");
  try { await runtime.start(); status.textContent="準備完了"; }
  catch(error){ status.textContent=String(error.message||error); panel.textContent=JSON.stringify(live()); runtime.protocol.error(status.textContent); }
  return runtime;
}
if (typeof document!=="undefined" && document.documentElement?.dataset?.autoboot==="true") boot();
