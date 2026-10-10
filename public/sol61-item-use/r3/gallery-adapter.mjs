const STARTUP_SCHEMA='dva-gallery-startup/v1';
const STARTUP_PHASES=new Set(['child-document','adapter','device','assets','pipelines','first-frame','playing']);
const STARTUP_STATUSES=new Set(['pending','delayed','ready','error','cancelled','unsupported']);
const SOURCE_VERSION='item-use-e-zero-sol61-r3';
const finitePositiveRgb = p => {
  const e=p?.emissionReadback;
  return e?.positive===true && e.finitePositiveRgb===true &&
    Number.isSafeInteger(e.width) && e.width>0 && e.width<=128 &&
    Number.isSafeInteger(e.height) && e.height>0 && e.height<=128 &&
    Number.isSafeInteger(e.pixelsSampled) && e.pixelsSampled>0 && e.pixelsSampled<=16384 &&
    Array.isArray(e.channelMax) && e.channelMax.length===3 &&
    e.channelMax.every(v=>Number.isFinite(v)&&v>=0) && e.channelMax.some(v=>v>0);
};

/** Fail-closed gallery first-visible proof validator. */
export function validateFirstVisibleProof(p, expected={}) {
  if(!p || p.version!==SOURCE_VERSION || p.submitted!==true || p.completed!==true ||
     p.firstSourceGateActiveSubmit!==true || p.sourceGateActive!==true || p.recorded!==true || !finitePositiveRgb(p)) return false;
  if(!Array.isArray(p.passOrder)||p.passOrder.length===0||!p.passOrder.every(x=>typeof x==='string'&&x.length>0)||
     !Number.isSafeInteger(p.passes)||p.passes!==p.passOrder.length) return false;
  if(!Array.isArray(p.dimensions)||p.dimensions.length!==2||p.viewportWidth!==p.dimensions[0]||p.viewportHeight!==p.dimensions[1]) return false;
  if(!Number.isSafeInteger(p.viewportWidth)||p.viewportWidth<=0||!Number.isSafeInteger(p.viewportHeight)||p.viewportHeight<=0) return false;
  for(const [actual,source] of [['causeId','sourceCauseId'],['itemId','sourceItemId'],['playerId','sourcePlayerId']])
    if(typeof expected[actual]!=='string'||!expected[actual]||p[source]!==expected[actual]) return false;
  for(const k of ['deviceGeneration','targetGeneration','generation']) if(!Number.isSafeInteger(p[k])||p[k]<1) return false;
  if(p.deviceGeneration!==p.generation || p.targetGeneration!==expected.targetGeneration) return false;
  if(expected.deviceGeneration!==undefined && p.deviceGeneration!==expected.deviceGeneration) return false;
  if(expected.ownerId!==undefined && p.ownerId!==expected.ownerId) return false;
  if(expected.token!==undefined && p.token!==expected.token) return false;
  if(expected.canvasConnected!==true) return false;
  if(expected.canvasWidth!==undefined&&p.viewportWidth!==expected.canvasWidth) return false;
  if(expected.canvasHeight!==undefined&&p.viewportHeight!==expected.canvasHeight) return false;
  return true;
}

/** Map only a completed renderer receipt's recorded pass order and actual target dimensions. */
export function mapCompletedFirstVisibleProof(p,expected={}) {
  if(!p||p.submitted!==true||p.completed!==true||!Array.isArray(p.passOrder)||!p.passOrder.length||
     !Array.isArray(p.dimensions)||p.dimensions.length!==2) return null;
  const [width,height]=p.dimensions;
  if(!Number.isSafeInteger(width)||width<=0||!Number.isSafeInteger(height)||height<=0||
     p.passOrder.some(x=>typeof x!=='string'||!x)||expected.canvasConnected!==true||
     width!==expected.canvasWidth||height!==expected.canvasHeight) return null;
  const mapped={...p,recorded:true,recordedPassOrder:[...p.passOrder],passes:p.passOrder.length,viewportWidth:width,viewportHeight:height,canvasConnected:true};
  return validateFirstVisibleProof(mapped,expected)?mapped:null;
}

/** c409 gallery direct-call bridge. The return shape matches asset-gallery-sfx-bridge.js. */
export function createItemUseGallerySfx({window:win=globalThis,verify=false,itemIds=[],currentCue,makeAudioContext}={}) {
  const allowed=new Set(itemIds);let disposed=false,context=null,unlocked=false,resumePending=false;
  const seenCauses=new Set(),blockedCauses=new Set(),activeCauses=new Map();
  const now=()=>Number.isFinite(win.performance?.now?.())?win.performance.now():Date.now();
  const state={lastUnlock:'locked',lastPlayback:null,completedFrameCount:0};
  const visible=()=>win.document?.visibilityState!=='hidden';
  const cancel=(causeId,host)=>{if(!causeId)return;try{host?.cancelReceipt?.(causeId);}catch{}activeCauses.delete(causeId);};
  const cancelAll=()=>{for(const [causeId,host] of activeCauses)cancel(causeId,host);};
  const onVisibilityChange=()=>{if(!visible())cancelAll();};
  win.document?.addEventListener?.('visibilitychange',onVisibilityChange);
  function noteCauseStart(causeId,host){if(typeof causeId!=='string'||!causeId)return false;activeCauses.set(causeId,host);if(!unlocked||resumePending)blockedCauses.add(causeId);return true;}
  function activateFromGesture(item) {
    if(disposed) return Promise.resolve({state:'stale',reason:'retired'});
    if(verify || new URLSearchParams(win.location?.search||'').has('verify')) return Promise.resolve({state:'silent',reason:'verify-zero'});
    if(!item || typeof item.id!=='string' || !allowed.has(item.id)) return Promise.resolve({state:'unsupported',reason:'item-id-not-pinned'});
    if(resumePending)return Promise.resolve({state:'unlocking',reason:'resume-pending'});
    try { context=context||makeAudioContext?.(); } catch { state.lastUnlock='failed';return Promise.resolve({state:'unavailable',reason:'audio-context-unavailable'}); }
    if(!context) return Promise.resolve({state:'unavailable',reason:'audio-context-unavailable'});
    for(const causeId of activeCauses.keys())blockedCauses.add(causeId);
    resumePending=true;state.lastUnlock='unlocking';
    // Invoke resume synchronously in the trusted gesture stack before observing its promise.
    let resumed;
    try { resumed=context.state==='running' ? Promise.resolve() : context.resume(); }
    catch { resumePending=false;state.lastUnlock='failed';return Promise.resolve({state:'unavailable',reason:'audio-context-resume-failed'}); }
    return Promise.resolve(resumed).then(()=>{
      resumePending=false;
      if(disposed)return {state:'stale',reason:'retired'};
      if(context.state!=='running'){unlocked=false;state.lastUnlock='failed';return {state:'unavailable',reason:'audio-context-not-running'};}
      unlocked=true;state.lastUnlock='active';
      return {state:'active'};
    },()=>{resumePending=false;unlocked=false;state.lastUnlock='failed';return {state:'unavailable',reason:'audio-context-resume-failed'};});
  }
  function observeCompletedFrame(result,fixture,{host,canvas,expectedTargetGeneration,completedAt=now(),submittedAt=completedAt}={}) {
    state.completedFrameCount++;
    const proof=result?.proof,causeId=fixture?.causeId,itemId=fixture?.itemId,playerId=fixture?.playerId;
    if(typeof causeId==='string'&&causeId){
      activeCauses.set(causeId,host);
      if(resumePending)blockedCauses.add(causeId);
    }
    const ageMs=Number.isFinite(fixture?.ageMs)?fixture.ageMs+Math.max(0,completedAt-submittedAt):NaN;
    const invalidReason=()=>{
      if(disposed)return 'retired';
      if(verify||new URLSearchParams(win.location?.search||'').has('verify'))return 'verify-zero';
      if(!unlocked||!context||context.state!=='running')return 'audio-context-not-running';
      if(!visible())return 'document-hidden';
      if(fixture?.sourceOn!==true||fixture?.mainOn!==true||fixture?.visibility!==1)return 'source-not-visible';
      if(!Number.isFinite(ageMs)||ageMs<=0||ageMs>=560)return ageMs>=560?'expired':'invalid-age';
      if(!result?.submitted||!proof?.submitted||!proof?.completed||result?.retired||proof?.retired)return 'gpu-frame-incomplete';
      if(proof.sourceGateActive!==true)return 'source-gate-inactive';
      if(proof.sourceCauseId!==causeId||proof.sourceItemId!==itemId||proof.sourcePlayerId!==playerId)return 'proof-source-mismatch';
      if(!host||host.state?.()!=='ready'||proof.ownerId!==host.ownerId||proof.token!==host.token||proof.generation!==host.generation?.()||proof.deviceGeneration!==host.generation?.())return 'stale-host-generation';
      if(!Number.isSafeInteger(expectedTargetGeneration)||proof.targetGeneration!==expectedTargetGeneration)return 'stale-target-generation';
      if(canvas?.isConnected!==true||!Array.isArray(proof.dimensions)||proof.dimensions[0]!==canvas.width||proof.dimensions[1]!==canvas.height)return 'stale-viewport';
      if(!fixture?.receipt||fixture.receipt.type!=='action-item-use'||fixture.receipt.id!==causeId||fixture.receipt.playerId!==playerId||fixture.receipt.variant!==itemId)return 'receipt-mismatch';
      return '';
    };
    if(context&&context.state!=='running'){unlocked=false;state.lastUnlock='locked';}
    const reason=invalidReason();
    if(reason){state.lastPlayback={causeId,played:false,reason};if(reason==='expired'||reason==='source-not-visible'||reason==='document-hidden'||reason==='retired')cancel(causeId,host);if(ageMs>=780){blockedCauses.delete(causeId);seenCauses.delete(causeId);activeCauses.delete(causeId);}return state.lastPlayback;}
    if(blockedCauses.has(causeId)){state.lastPlayback={causeId,played:false,reason:'cause-precedes-unlock'};if(ageMs>=780){blockedCauses.delete(causeId);seenCauses.delete(causeId);activeCauses.delete(causeId);}return state.lastPlayback;}
    if(seenCauses.has(causeId)){state.lastPlayback={causeId,played:false,reason:'duplicate-frame'};return state.lastPlayback;}
    let resultSfx;
    try { resultSfx=host.playSuccessfulReceipt?.({receipt:fixture.receipt,ageMs,sourceOn:true,mainOn:true,visibility:fixture.visibility,
      sourceCauseId:causeId,sourcePlayerId:playerId,visibilityCauseId:causeId,gestureGranted:true,audioContext:context}); }
    catch(error){state.lastPlayback={causeId,played:false,reason:'playback-error',error:String(error?.message??error)};return state.lastPlayback;}
    state.lastPlayback={causeId,played:resultSfx?.played===true,reason:resultSfx?.reason||'',offset:resultSfx?.offset};
    if(resultSfx?.played===true&&resultSfx.causeId===causeId)seenCauses.add(causeId);
    return state.lastPlayback;
  }
  const api=Object.freeze({activateFromGesture});
  try { win.__gallerySfx=api; } catch {}
  return Object.freeze({activateFromGesture,noteCauseStart,observeCompletedFrame,snapshot:()=>Object.freeze({...state,unlocked,contextState:context?.state||'absent'}),dispose(){if(disposed)return;disposed=true;cancelAll();blockedCauses.clear();seenCauses.clear();unlocked=false;win.document?.removeEventListener?.('visibilitychange',onVisibilityChange);if(win.__gallerySfx===api)try{delete win.__gallerySfx;}catch{}}});
}

/** Gallery startup transport, distinct from the direct-call SFX API. */
export function createItemUseGalleryStartup(env=globalThis) {
  const params=new URLSearchParams(env.location?.search||''),token=(params.get('galleryStartupToken')||'').slice(0,128),
    versionId=(params.get('galleryVersionId')||'').slice(0,160),attemptEpoch=Number(params.get('galleryAttemptEpoch')),
    parent=env.parent||env,embedded=parent!==env,identityValid=!embedded||Boolean(token&&versionId&&Number.isSafeInteger(attemptEpoch)&&attemptEpoch>0);
  let sequence=0,terminal=false,readySent=false,firstFrame=null;
  const valid=identityValid&&(!embedded||(env.location?.origin&&env.location.origin!=='null'));
  function emit(stage,status,extra={}) {
    if(!valid||terminal||readySent||!STARTUP_PHASES.has(stage)||!STARTUP_STATUSES.has(status))return false;
    if(status==='ready'&&(!firstFrame||stage!=='playing'))return false;
    const message={schema:STARTUP_SCHEMA,token,versionId,attemptEpoch,sequence:++sequence,stage,status,...extra};
    try { if(embedded)parent.postMessage(message,env.location.origin); } catch { return false; }
    if(status==='ready')readySent=true;
    if(['error','cancelled','unsupported'].includes(status))terminal=true;
    return true;
  }
  function advance(stage,status='pending',extra={}) { return emit(stage,status,extra); }
  function ready(proof,expected) {
    if(readySent||!validateFirstVisibleProof(proof,expected))return false;
    firstFrame=Object.freeze({...proof});
    if(!emit('first-frame','pending',{firstFrame}))return false;
    return emit('playing','ready',{firstFrame});
  }
  function acceptRetirement(event) {
    if(!embedded||!valid||event?.source!==parent||event?.origin!==env.location.origin)return false;
    const m=event.data;
    if(m?.schema!==STARTUP_SCHEMA||m.action!=='retire'||m.token!==token||m.versionId!==versionId||m.attemptEpoch!==attemptEpoch)return false;
    emit('child-document','cancelled');terminal=true;return true;
  }
  return Object.freeze({advance,ready,acceptRetirement,isActive:()=>valid&&!terminal&&!readySent,snapshot:()=>Object.freeze({schema:STARTUP_SCHEMA,token,versionId,attemptEpoch,sequence,terminal,readySent,firstFrame})});
}


/** Embedded-only repeating source-owned fixture. `fixture` must supply every gate and geometry field explicitly. */
export function startItemUseFixtureLoop({host,canvas,fixture,onProof=()=>{},onFrame=()=>{},onFailure=()=>{},onStop=()=>{},onCauseStart=()=>{},startup,itemIds=[],verify=false,window:win=globalThis}={}) {
  if(!host||!canvas||typeof fixture!=='function') throw new TypeError('host, canvas, and explicit fixture factory required');
  if(!(win.parent&&win.parent!==win)) throw new Error('automatic loop is limited to an embedded gallery fixture');
  let stopped=false,raf=0,cause=null,startedAt=0,clearedAt=null,current=null,frameBusy=false,firstVisibleSent=false;
  const makeId=()=>`fixture-item-use-${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`}`;
  const expected=(p,f)=>({causeId:f.causeId,itemId:f.itemId,playerId:f.playerId,ownerId:p.ownerId,token:p.token,
    deviceGeneration:p.deviceGeneration,targetGeneration:p.targetGeneration,generation:p.generation,canvasConnected:canvas.isConnected===true,canvasWidth:canvas.width,canvasHeight:canvas.height});
  async function tick(now) {
    if(stopped)return;
    if(frameBusy){raf=win.requestAnimationFrame(tick);return;}
    frameBusy=true;
    try {
      let startedNewCause=false;
      if(!cause){cause=makeId();startedAt=now;clearedAt=null;firstVisibleSent=false;startedNewCause=true;}
      const ageMs=Math.max(0,now-startedAt);
      const active=ageMs<780;
      const input=fixture({causeId:cause,ageMs:active?ageMs:780,sourceOn:active});
      // Do not fill absent gates: validateFixture in the frozen renderer is authoritative.
      current={...input,causeId:cause,ageMs:active?ageMs:780,sourceOn:active};
      if(startedNewCause)onCauseStart(current);
      const submittedAt=win.performance?.now?.()??now;
      const result=await host.render(current);
      onFrame(result,current,{submittedAt,completedAt:win.performance?.now?.()??now});
      const proof=result?.proof;
      const id=proof&&expected(proof,current);
      const parentProof=proof&&mapCompletedFirstVisibleProof(proof,id);
      if(parentProof && parentProof.sourceCauseId===current.causeId && parentProof.sourceItemId===current.itemId && parentProof.sourcePlayerId===current.playerId) {
        const readyProof={...parentProof,causeId:parentProof.sourceCauseId,itemId:parentProof.sourceItemId,playerId:parentProof.sourcePlayerId,canvasConnected:true};
        if(!firstVisibleSent){firstVisibleSent=true;startup?.ready?.(readyProof,id);onProof(readyProof);}
      }
      if(!active && result?.submitted===true && result?.proof?.completed===true) {
        if(clearedAt===null) clearedAt=now;
        else if(now>clearedAt){cause=null;}
      }
    } catch(e) {onFailure(e);}
    finally {frameBusy=false;if(!stopped)raf=win.requestAnimationFrame(tick);}
  }
  raf=win.requestAnimationFrame(tick);
  const retirement=event=>{if(startup?.acceptRetirement?.(event))stop();};
  win.addEventListener?.('message',retirement);
  function stop(){if(stopped)return;stopped=true;win.cancelAnimationFrame?.(raf);win.removeEventListener?.('message',retirement);try{onStop();}catch{}try{host.retire?.(host.token);}catch{}void host.dispose?.();}
  return Object.freeze({stop,current:()=>current,verify:Boolean(verify),fixtureOnly:true});
}




