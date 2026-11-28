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

export function selectFixtureBaselineActors(target, project) {
  if(!target || !Array.isArray(target.roles) || typeof project!=="function")return [];
  let roles;
  if(target.kind==="grant")roles=[target.roles[0],target.roles[1]];
  else if(target.kind==="trigger")roles=[target.roles[3]];
  else return [];
  const seen=new Set(), out=[];
  for(const role of roles){
    if(!role)continue;
    const p=project(role);
    if(!p)continue;
    const k=p.footX+":"+p.footY+":"+p.actorHeightPx;
    if(seen.has(k))continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

export function createPreviewRuntime({ windowRef=globalThis.window, documentRef=globalThis.document,
  rendererFactory=createGpuRenderer, audioFactory=createAudioHost, now=()=>performance.now(),
  raf=cb=>requestAnimationFrame(cb), cancelRaf=id=>cancelAnimationFrame(id),
  fetcher=fetch, visibility=()=>documentRef.visibilityState, onDiagnostic=()=>{} } = {}) {
  const auth = parseGalleryAuth(windowRef.location.search);
  let renderer=null, audio=null, rafId=0, dead=false, hidden=false, mode="idle", mainOn=true;
  let generation=0, nextCause=1, active=null, diagnosticFixture=null, lastReadyCause=null, serialized=Promise.resolve();
  let renderSerial=0, audioFirstCause=1, abortReason=null;
  let startPromise=null, startState="not-started", retirePromise=null, retireState="active";
  let pendingRenders=0, uiBound=false;
  let rendererCreationAttempted=false, audioCreationAttempted=false, parentRetireRequested=false;
  const runtimeListeners=[];
  const listen=(target,type,listener,options)=>{
    // Register ownership first so even an exceptional add is covered by teardown.
    const capture=typeof options==="boolean"?options:options?.capture===true;
    if(runtimeListeners.some(x=>x.target===target && x.type===type && x.listener===listener && x.capture===capture))return;
    runtimeListeners.push({target,type,listener,capture});
    target.addEventListener(type,listener,options);
  };
  const removeRuntimeListeners=failures=>{
    for(let i=runtimeListeners.length-1;i>=0;i--){
      const {target,type,listener,capture}=runtimeListeners[i];
      try {
        if(typeof target?.removeEventListener!=="function")throw new Error("Listener removal is unavailable: "+type);
        target.removeEventListener(type,listener,capture);
        runtimeListeners.splice(i,1);
      } catch(error) { failures.push(error); }
    }
    if(runtimeListeners.length)failures.push(new Error("Runtime-owned listeners remain after retirement."));
  };
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
  const cleanupError = error => {
    let message="終了処理に失敗しました";
    try { message=String(error?.message||error).slice(0,240); } catch {}
    try { emit("retire-error",{message}); } catch {}
  };
  const protocol = createGalleryProtocol({windowRef,auth,onCommand:command => controls[command]?.(),onRetire:()=>{
    parentRetireRequested=true;
    return retire();
  }});
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
  const baselineActors = () => selectFixtureBaselineActors(active?.fixture ?? diagnosticFixture, cssProjection);
  const stageNames = Object.freeze({
    initializing:"device",
    "target-configured":"assets",
    ready:"pipelines",
    submitted:"first-frame",
    completed:"first-frame"
  });
  const reportStage = (entry,detail={}) => {
    const objectEntry=entry!==null && typeof entry==="object";
    const name=objectEntry?entry.name:entry;
    const facts=objectEntry?entry:detail;
    const mapped=typeof name==="string" && Object.prototype.hasOwnProperty.call(stageNames,name)
      ? stageNames[name] : null;
    try {
      if(!dead && mapped) {
        const safe={};
        if(typeof facts?.progress==="number" && Number.isFinite(facts.progress))
          safe.progress=Math.min(1,Math.max(0,facts.progress));
        if(typeof facts?.completed==="boolean")safe.completed=facts.completed;
        protocol.stage(mapped,safe);
      }
    } finally {
      emit(name,objectEntry?entry:detail);
    }
  };
  const render = async input => {
    if(dead || !renderer)return null;
    const target=renderer;
    pendingRenders++;
    try { return await target.render(input); }
    finally { pendingRenders--; }
  };
  const start = () => {
    if(dead)return Promise.reject(new Error("終了処理が開始されています"));
    if(startPromise)return startPromise;
    startState="pending";
    startPromise=Promise.resolve().then(async()=>{
      if(dead)return false;
      if (auth.mode==="rejected") throw new Error("ギャラリー認証が不正です");
      // The host creates no context until an explicit unlock, but supplies real
      // disposal evidence even if fetching or GPU initialization fails.
      audioCreationAttempted=true;
      audio=audioFactory({verify});
      if(dead)return false;
      const [effect,baseline] = await Promise.all([ownText(fetcher,url("./creative/effect.wgsl")),ownText(fetcher,url("./fixture-baseline.wgsl"))]);
      if(dead)return false;
      if (!windowRef.navigator?.gpu) throw new Error("WebGPUが利用できません");
      rendererCreationAttempted=true;
      renderer=rendererFactory({canvas:documentRef.querySelector("canvas"),effectWgsl:effect.text,baselineWgsl:baseline.text,reportStage});
      await renderer.ready;
      if(dead)return false;
      const warm = await render({draws:[],baselineActors:[],causeId:0,generation:0,ageMs:0,sourceEligible:false,mode:"warmup",mainOn:false});
      if(dead)return false;
      if (warm?.status!=="completed" || warm.completed!==true) throw new Error("描画準備を完了できません");
      const shaderSha256=await sha256(effect.bytes);
      if(dead)return false;
      const baselineSha256=await sha256(baseline.bytes);
      if(dead)return false;
      emit("warmup-complete",{shaderSha256,baselineSha256});
      return true;
    }).then(value=>{
      startState=value===true?"fulfilled":"cancelled";
      return value;
    },error=>{
      startState="rejected";
      throw error;
    });
    return startPromise;
  };
  const schedule = () => {
    if (dead || hidden || rafId) return;
    rafId=raf(tick);
  };
  const tick = timestamp => {
    rafId=0;
    if (dead || hidden) return;
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
    if (dead || hidden || !renderer) return;
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
    if(dead)return;
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
    if (dead || hidden || !renderer) return false;
    generation++; invalidateAudio(); lastReadyCause=null;
    active={ id:nextCause++, generation, kind:ui.kind.value, fixture:sanitizeFixture(makeFixture(ui.fixture.value,ui.kind.value)),
      startedAt:now(), heldAge:0 };
    mode="playing"; schedule(); return true;
  };
  controls.play=freshCause;
  controls.hold=()=>{if(dead)return false;if(active&&mode==="playing"){active.heldAge=currentAge(now());generation++;mode="held";invalidateAudio();schedule();}};
  controls.resume=()=>{if(dead)return false;if(active&&mode==="held"){generation++;active.startedAt=now()-active.heldAge;mode="playing";schedule();}};
  controls.stop=()=>{if(dead)return false;generation++;active=null;diagnosticFixture=null;mode="idle";invalidateAudio();schedule();};
  controls.diagnostic=()=>{if(dead)return false;generation++;active=null;invalidateAudio();lastReadyCause=null;
    diagnosticFixture=sanitizeFixture(makeFixture(ui.fixture.value,ui.kind.value));mode="diagnostic";schedule();};
  const retire = () => {
    if(retirePromise)return retirePromise;
    dead=true;
    retireState="pending";
    mode="retired";
    generation++;
    // Publish the single flight before invoking any external cleanup operations.
    retirePromise=Promise.resolve().then(async()=>{
      const failures=[];
      removeRuntimeListeners(failures);
      const pendingRaf=rafId;
      if(pendingRaf) {
        try { cancelRaf(pendingRaf); rafId=0; }
        catch(error) { failures.push(error); }
      }
      let stopSettlement=Promise.resolve({status:"fulfilled"});
      if(audio) {
        try {
          stopSettlement=Promise.resolve(audio.stop()).then(
            ()=>({status:"fulfilled"}),
            reason=>({status:"rejected",reason})
          );
        } catch(reason) {
          stopSettlement=Promise.resolve({status:"rejected",reason});
        }
      }
      // Initialization failure is not disposal evidence. Wait for initialization
      // and all runtime frame work before taking final resource references.
      if(startPromise) {
        try { await startPromise; } catch {}
      }
      try { await serialized; }
      catch(error) { failures.push(error); }
      const stopped=await stopSettlement;
      if(stopped.status==="rejected")failures.push(stopped.reason);
      const targetRenderer=renderer, targetAudio=audio;
      const outcomes=await Promise.allSettled([
        Promise.resolve().then(()=>{
          if(!targetRenderer && !rendererCreationAttempted)
            return {status:"disposed",noDevice:true,serial:0,completedSerial:0,errors:[]};
          if(!targetRenderer || typeof targetRenderer.dispose!=="function")
            throw new Error("Renderer disposal evidence is unavailable.");
          return targetRenderer.dispose();
        }),
        Promise.resolve().then(()=>{
          if(!targetAudio && !audioCreationAttempted)return;
          if(!targetAudio || typeof targetAudio.dispose!=="function")
            throw new Error("Audio disposal evidence is unavailable.");
          return targetAudio.dispose();
        })
      ]);
      for(const outcome of outcomes)
        if(outcome.status==="rejected")failures.push(outcome.reason);
      const gpu=outcomes[0].status==="fulfilled"?outcomes[0].value:undefined;
      let audioSnapshot;
      try {
        if(!targetAudio && !audioCreationAttempted) {
          // No host was constructed, so no context or voices could be created.
          audioSnapshot={closed:true,closeSettled:true,contextState:"absent",activeVoices:0,pending:0,cleanupErrors:[],errors:[]};
        } else {
          if(!targetAudio || typeof targetAudio.snapshot!=="function")
            throw new Error("Post-dispose audio snapshot is unavailable.");
          audioSnapshot=await targetAudio.snapshot();
        }
      } catch(error) { failures.push(error); }
      if(!gpu || gpu.status!=="disposed")
        failures.push(new Error("Renderer did not return disposed evidence."));
      if(Array.isArray(gpu?.errors) && gpu.errors.length)
        failures.push(new Error("Renderer disposal reported errors."));
      if(!Array.isArray(gpu?.errors))
        failures.push(new Error("Renderer disposal error evidence is unavailable."));
      const safeNonnegative=n=>Number.isSafeInteger(n)&&n>=0;
      if(!gpu || !((safeNonnegative(gpu.serial) && safeNonnegative(gpu.completedSerial) && gpu.completedSerial>=gpu.serial) ||
        (gpu.noDevice===true && gpu.serial===0 && gpu.completedSerial===0)))
        failures.push(new Error("Renderer disposal completion evidence is invalid."));
      if(!audioSnapshot || typeof audioSnapshot!=="object")
        failures.push(new Error("Post-dispose audio snapshot is invalid."));
      if(Array.isArray(audioSnapshot?.errors) && audioSnapshot.errors.length)
        failures.push(new Error("Audio disposal reported errors."));
      if(!Array.isArray(audioSnapshot?.errors) ||
        audioSnapshot?.closed!==true || audioSnapshot?.closeSettled!==true ||
        audioSnapshot?.activeVoices!==0 || audioSnapshot?.pending!==0 ||
        (audioSnapshot?.contextState!=="absent" && audioSnapshot?.contextState!=="closed") ||
        !Array.isArray(audioSnapshot?.cleanupErrors) || audioSnapshot.cleanupErrors.length!==0)
        failures.push(new Error("Audio disposal lifecycle evidence is invalid."));
      if(pendingRenders!==0)
        failures.push(new Error("Renderer calls remain pending after disposal."));
      const closed=dead && retireState==="pending" && mode==="retired";
      const creationClosed=dead;
      const initSettled=!startPromise || ["fulfilled","cancelled","rejected"].includes(startState);
      const rafPending=rafId!==0;
      const loopStopped=dead && !rafPending;
      if(!closed || !creationClosed || !initSettled || !loopStopped || rafPending)
        failures.push(new Error("Runtime retirement lifecycle evidence is invalid."));
      if(failures.length)
        throw new AggregateError(failures,"終了処理に失敗しました");
      // Existing hosts supply their actual evidence. The gallery protocol alone
      // owns its message listener and the native retirement ACK/error.
      return {
        retired:closed,
        closed,
        creationClosed,
        initSettled,
        loopStopped,
        rafPending,
        pendingRender:pendingRenders,
        cleanupErrors:failures,
        gpu,
        audio:audioSnapshot
      };
    }).then(result=>{
      retireState="fulfilled";
      return result;
    },error=>{
      retireState="rejected";
      throw error;
    });
    return retirePromise;
  };
  const onVisibility=()=>{
    if(dead)return;
    const ageBeforeChange=active && mode==="playing" ? currentAge(now()) : active?.heldAge ?? 0;
    hidden=visibility()==="hidden";
    if(hidden){ generation++;if(active)active.heldAge=ageBeforeChange;mode=active?"held":mode==="diagnostic"?"diagnostic":"idle";if(rafId)cancelRaf(rafId);rafId=0;invalidateAudio(); }
    else { schedule(); } // Explicit resume is required.
  };
  const onPageHide=()=>{
    // Local teardown only. A requested protocol retirement owns its own disposal.
    void retire().catch(cleanupError).finally(()=>{
      if(!parentRetireRequested) {
        try { protocol.dispose(); } catch(error) { cleanupError(error); }
      }
    });
  };
  const unlock=()=>{
    if(dead)return Promise.resolve(false);
    audioFirstCause=nextCause;
    try { return Promise.resolve(audio?.unlock()).catch(error=>{audioError(error);return false;}); }
    catch(error) { audioError(error);return Promise.resolve(false); }
  };
  const fatal=error=>{
    if(dead)return;
    try {
      emit("error",{message:String(error?.message||error)});
      documentRef.querySelector("#status").textContent=String(error?.message||error);
      protocol.error(String(error?.message||error));
    } finally {
      // Do not await retirement from the frame chain that retirement must drain.
      void retire().catch(cleanupError);
    }
  };
  const ui = {};
  const bindUi=()=>{
    if(dead || uiBound)return;
    uiBound=true;
    ui.kind=documentRef.querySelector("#kind");ui.fixture=documentRef.querySelector("#fixture");
    ui.observer=documentRef.querySelector("#observer");ui.sparkle=documentRef.querySelector("#sparkle");
    ui.reducedMotion=documentRef.querySelector("#reduced-motion");ui.audio=documentRef.querySelector("#audio");ui.zoom=documentRef.querySelector("#zoom");
    mainOn=documentRef.querySelector("#main-on").checked;
    listen(documentRef.querySelector("#play"),"click",controls.play);
    listen(documentRef.querySelector("#hold"),"click",controls.hold);
    listen(documentRef.querySelector("#resume"),"click",controls.resume);
    listen(documentRef.querySelector("#stop"),"click",controls.stop);
    listen(documentRef.querySelector("#diagnostic"),"click",controls.diagnostic);
    ui.diagnosticAge=documentRef.querySelector("#diagnostic-age");
    listen(ui.diagnosticAge,"input",()=>{if(!dead && mode==="diagnostic")schedule();});
    listen(documentRef.querySelector("#unlock-audio"),"click",unlock);
    for(const el of [ui.kind,ui.fixture,ui.observer,ui.sparkle,ui.reducedMotion,ui.audio,ui.zoom])
      listen(el,"change",()=>{if(dead)return;generation++;lastReadyCause=null;invalidateAudio();schedule();});
    listen(documentRef.querySelector("#main-on"),"change",event=>{if(dead)return;mainOn=event.target.checked;generation++;lastReadyCause=null;invalidateAudio();schedule();});
    listen(windowRef,"resize",()=>{
      if(dead || !renderer)return;
      try { Promise.resolve(renderer.resize()).then(()=>schedule()).catch(fatal); }
      catch(error) { fatal(error); }
    });
    listen(documentRef,"visibilitychange",onVisibility);
    listen(windowRef,"pagehide",onPageHide,{once:true});
  };
  return Object.freeze({start,bindUi,retire,controls,protocol,getSnapshot:()=>({version:VERSION,mode,generation,causeId:active?.id??null,renderSerial,authMode:auth.mode,verify,startState,retireState,pendingRenders})});
}
export async function boot() {
  const panel=document.querySelector("#diagnostics");
  const runtime=createPreviewRuntime({onDiagnostic:entry=>{panel.textContent=JSON.stringify(entry,null,2);}});
  const live=runtime.getSnapshot;
  const status=document.querySelector("#status");
  try {
    runtime.bindUi();
    const started=await runtime.start();
    if(started===true)status.textContent="準備完了";
  } catch(error) {
    try {
      const message=String(error?.message||error);
      runtime.protocol.error(message);
      if(status)status.textContent=message;
      if(panel)panel.textContent=JSON.stringify(live());
    } finally {
      // Local cleanup must not retire/dispose the protocol: a later parent
      // request must observe this same fulfillment or rejection natively.
      try { await runtime.retire(); }
      catch(cleanupFailure) {
        try {
          if(panel)panel.textContent=JSON.stringify({...live(),cleanupError:String(cleanupFailure?.message||cleanupFailure)});
        } catch {}
      }
    }
  }
  return runtime;
}
if (typeof document!=="undefined" && document.documentElement?.dataset?.autoboot==="true") boot();
