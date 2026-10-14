import { createRuntime, THROW_EVENT } from './runtime.mjs';
import { createThrowSfx } from './sfx.mjs';

export function createGalleryAdapter({
  canvas, params = new URLSearchParams(globalThis.location?.search || ''),
  runtimeFactory = createRuntime, sfxFactory = createThrowSfx,
  now = () => globalThis.performance.now(), requestFrame = cb => globalThis.requestAnimationFrame(cb),
  cancelFrame = id => globalThis.cancelAnimationFrame(id), setTimer = (cb, ms) => globalThis.setTimeout(cb, ms),
  clearTimer = id => globalThis.clearTimeout(id), post = message => globalThis.parent?.postMessage(message, globalThis.location.origin),
  status = () => {}, verify = params.has('verify'), autoLoop = params.get('galleryAutoLoop') === '1',
  onStatus = () => {},
} = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('WebGPU canvas required');
  const token = params.get('galleryStartupToken'), versionId = params.get('galleryVersionId');
  const attemptEpoch = Number(params.get('galleryAttemptEpoch'));
  const parentHandshake = params.has('embed') && token && versionId === 'ordinary-item-throw-sol61-r5' && Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0;
  const startup = { schema: 'dva-gallery-startup/v1', token, versionId, attemptEpoch, sequence: 0, stage: 'child-document', ready: false };
  let runtime, sfx, disposed = false, raf = 0, timer = 0, busy = false, cycle = 0, event = null, lastFrameReceipt = null, activeTick=Promise.resolve(), retirementPromise=null;
  let heldAge = null, sourceEnabled = true, observerEnabled = true, sfxEnabled = false, frameCount = 0, initializing=false, initializationSettled=Promise.resolve(), finishInitialization=null;
  const played = new Set(), errors = [], sfxFailures = [], durationMs = 600;
  const lifecycle = { value: 1 };
  const ownOrigin = globalThis.location?.origin;

  function report(value) {
    const record = { at: now(), ...value };
    onStatus(record); status(record); return record;
  }
  function send(stage, state, extra = {}) {
    if (!parentHandshake || disposed) return;
    startup.sequence++; startup.stage = stage;
    post({ schema: startup.schema, token, versionId, attemptEpoch, sequence: startup.sequence, stage, status: state, ...extra });
  }
  function beginCycle(startAt = now()) {
    if (disposed) return false;
    if (raf) cancelFrame(raf); raf = 0;
    if (timer) clearTimer(timer); timer = 0;
    heldAge = null;
    sfx?.stopAll();
    const serial = ++cycle;
    event = Object.freeze({ id: `ordinary-throw-r5-preview-cause-${serial}`, type: THROW_EVENT,
      variant: 'flight:ordinary-probe', playerId: 'preview-owner', success: true,
      x: 205, y: 390, targetX: 775, targetY: 290, startedAt: startAt, duration: durationMs });
    report({ type: 'cycle-start', eventId: event.id, startedAt: event.startedAt, durationMs });
    schedule(); return true;
  }
  function currentAge(at = now()) {
    if (!event) return null;
    return Math.max(0, Math.min(durationMs, heldAge == null ? at - event.startedAt : heldAge));
  }
  function schedule() {
    if (!disposed && !raf && !busy) raf = requestFrame(timestamp => {
      raf=0; const running=tick(timestamp); activeTick=running;
      void running.finally(()=>{if(activeTick===running)activeTick=Promise.resolve();});
      return running;
    });
  }
  async function tick(timestamp) {
    raf = 0;
    if (disposed || busy || !runtime) return;
    busy = true;
    const lease = lifecycle.value, liveEvent = event;
    let ageMs;
    try {
      await runtime.resize();
      if (disposed || lease !== lifecycle.value || liveEvent !== event) return;
      ageMs = currentAge(now());
      const size = runtime.size;
      const width = Math.max(1, size?.width || canvas.width || Math.round(canvas.clientWidth || 980));
      const height = Math.max(1, size?.height || canvas.height || Math.round(canvas.clientHeight || 620));
      const worldToPixel = width / 980;
      const receipt = await runtime.render({ event: liveEvent, nowMs: liveEvent.startedAt + ageMs,
        sourceEnabled, observerEnabled, width, height, worldToPixel,
        project: point => ({ x:point.x*worldToPixel, y:point.y*worldToPixel }) });
      if (disposed || lease !== lifecycle.value || liveEvent !== event) return;
      const completed = await receipt.completed;
      if (disposed || lease !== lifecycle.value || liveEvent !== event) return;
      lastFrameReceipt = Object.freeze({ status:receipt.status,eventId:receipt.eventId,ageMs:receipt.ageMs,
        durationMs:receipt.durationMs,sourceEnabled:receipt.sourceEnabled,observerEnabled:receipt.observerEnabled,
        submitted:receipt.submitted===true,completed:completed===true,width:receipt.width,height:receipt.height,
        targetFormats:receipt.targetFormats,frameUniformBytes:receipt.frameUniformBytes,worldSourceSha256:runtime.worldSourceSha256 });
      frameCount++;
      const state = { eventId: liveEvent.id, ageMs, durationMs, sourceEnabled, observerEnabled,
        submitted: receipt.submitted === true, completed: completed === true, width: receipt.width, height: receipt.height,
        status: receipt.status, frameCount, errors: [...errors] };
      report({ type: 'frame', ...state });
      if (receipt.status === 'active' && completed === true && sourceEnabled && sfxEnabled && !verify && !played.has(liveEvent.id)) {
        const speed = Math.hypot(liveEvent.targetX - liveEvent.x, liveEvent.targetY - liveEvent.y) / liveEvent.duration;
        try {
          const result = sfx.play({ causeId: liveEvent.id, speedWorldPerMs: speed, durationMs,
            ageMs: currentAge(now()), verify, enabled: true, visibleFrameComplete: true });
          if (result?.status === 'started') played.add(liveEvent.id);
          else if (result?.status === 'retryable-failure' || result?.status === 'await-running') {
            const failure = { eventId: liveEvent.id, stage: result.stage || 'unknown', message: result.message || 'audio setup failed' };
            sfxFailures.push(failure);
            report({ type: 'sfx-retryable-failure', ...failure });
          }
        } catch (error) {
          // Audio failure is not a render failure. Leave this event eligible for
          // retry after the next completed visible frame and keep the RAF alive.
          const failure = { eventId: liveEvent.id, stage: 'play-call', message: String(error?.message || error) };
          sfxFailures.push(failure);
          report({ type: 'sfx-retryable-failure', ...failure });
        }
      }
      if (ageMs >= durationMs) {
        report({ type: 'cycle-expired', eventId: liveEvent.id, ageMs, durationMs });
        if (autoLoop && heldAge == null) { timer = setTimer(() => { timer = 0; beginCycle(now()); }, 180); }
        return;
      }
      if (parentHandshake && !startup.ready && receipt.status === 'active' && receipt.submitted === true && completed === true) {
        startup.ready = true;
        send('playing', 'ready', { firstFrame: { recorded: true, submitted: true, completed: true,
          canvasConnected: canvas.isConnected !== false, passes: Array.isArray(receipt.targetFormats) ? receipt.targetFormats.length : 1,
          viewportWidth: receipt.width || width, viewportHeight: receipt.height || height, eventId: liveEvent.id,
          ageMs, durationMs, sourceEnabled, observerEnabled } });
      }
    } catch (error) {
      errors.push(String(error?.message || error));
      report({ type: 'error', message: String(error?.stack || error) });
      send(startup.ready ? 'playing' : startup.stage, 'error', { error: { code: 'THROW_R5_PREVIEW_ERROR', message: String(error?.message || error).slice(0, 500) } });
      await retire(true); return;
    } finally {
      busy = false;
      if (!disposed && liveEvent !== event) schedule();
    }
    schedule();
  }
  function setPhase(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('phase must be in [0,1]');
    if (!event) beginCycle();
    heldAge = value * durationMs;
    report({ type: 'hold', eventId: event.id, ageMs: heldAge, durationMs }); schedule();
  }
  function hold() { if (!event) return setPhase(0); setPhase(currentAge() / durationMs); }
  function resume() { if (heldAge != null && event) event=Object.freeze({...event,startedAt:now()-heldAge}); heldAge = null; report({ type: 'resume', eventId: event?.id, ageMs: currentAge() }); schedule(); }
  function setSource(enabled) {
    sourceEnabled = Boolean(enabled); if (!sourceEnabled) sfx?.stopAll();
    report({ type: 'source-control', sourceEnabled, eventId: event?.id }); schedule();
  }
  function setObserver(enabled) {
    observerEnabled = Boolean(enabled); report({ type: 'observer-control', observerEnabled, eventId: event?.id }); schedule();
  }
  async function enableSfx() {
    if (verify || disposed) return { status: 'silent-gated' };
    const lease=lifecycle.value;
    sfx ??= sfxFactory();
    try { const result=await sfx.unlock();
      if(disposed || lease!==lifecycle.value) return {status:'disposed'};
      if(result?.status!=='running') { sfxEnabled=false; report({type:'sfx-await-running'}); return {status:'await-running'}; }
      sfxEnabled=true;
    } catch(error) { sfxEnabled=false; report({type:'sfx-retryable-failure',stage:'unlock',message:String(error?.message||error)}); return {status:'retryable-failure'}; }
    report({ type: 'sfx-unlocked', verify: false }); schedule(); return { status: 'enabled' };
  }
  async function retire(fromTick=false) {
    if(retirementPromise)return retirementPromise;
    retirementPromise=(async()=>{
      send(startup.stage, 'cancelled'); disposed = true; lifecycle.value++;
      if (raf) cancelFrame(raf); raf = 0;
      if (timer) clearTimer(timer); timer = 0;
      if(!fromTick) { if(initializing) await initializationSettled; const running=activeTick; if(running) try{await running;}catch(error){errors.push('in-flight frame: '+String(error?.message||error));} }
      try{sfx?.stopAll();}catch(error){errors.push('SFX stop cleanup: '+String(error?.message||error));}
      let audioProof;
      try { if(sfx){await sfx.dispose();audioProof=sfx.retirement;} else audioProof={settled:true,contextState:'absent',voicesRemaining:0,pendingCount:0,errors:[]}; }
      catch(error){errors.push('SFX cleanup: '+String(error?.message||error));audioProof=sfx?.retirement??null;}
      let gpuProof;
      try { if(runtime){gpuProof=await runtime.dispose();} } catch(error){errors.push('GPU cleanup: '+String(error?.message||error));gpuProof=runtime?.retirement??null;}
      const noErrors=errors.length===0&&Array.isArray(gpuProof?.cleanupErrors)&&gpuProof.cleanupErrors.length===0&&Array.isArray(audioProof?.errors)&&audioProof.errors.length===0;
      const queueDrained=gpuProof?.queueDrained===true&&gpuProof?.pendingSubmissions===0&&gpuProof?.submissionCallbackCount===0&&gpuProof?.submittedCount===gpuProof?.completedCount&&gpuProof?.noNewSubmissionsAfterDispose===true;
      const sameOwnedDevice=gpuProof?.sameDevice===true&&gpuProof?.deviceIdentity===runtime?.device;
      const deviceDestroyed=gpuProof?.destroyed===true&&gpuProof?.contextUnconfigured===true&&gpuProof?.deviceDestroyCalls===1&&gpuProof?.lostSettled===true&&gpuProof?.lostReason==='destroyed';
      const audioRetired=audioProof?.settled===true&&['absent','closed'].includes(audioProof?.contextState)&&audioProof?.voicesRemaining===0&&audioProof?.pendingCount===0;
      const adapterQuiescent=!initializing&&!busy&&raf===0&&timer===0;
      const valid=Boolean(runtime)&&noErrors&&queueDrained&&sameOwnedDevice&&deviceDestroyed&&audioRetired&&adapterQuiescent;
      const lifecycleReceipt={disposeSettled:true,teardown:valid?'disposed':'unknown',deviceLifecycle:valid?'destroyed-loss-settled':'unknown',pendingTasks:gpuProof?.pendingSubmissions??null,
        noNewSubmissions:gpuProof?.noNewSubmissionsAfterDispose===true,queueCompleted:queueDrained,submittedCount:gpuProof?.submittedCount??null,completedCount:gpuProof?.completedCount??null,
        callbackCount:gpuProof?.submissionCallbackCount??null,contextUnconfigured:gpuProof?.contextUnconfigured===true,adapterQuiescent,
        renderer:{pendingSettled:adapterQuiescent&&queueDrained,pendingCount:adapterQuiescent?0:null,queueDrained,disposed:gpuProof?.destroyed===true,resourcesDisposed:deviceDestroyed&&sameOwnedDevice&&queueDrained,contextUnconfigured:gpuProof?.contextUnconfigured===true,cleanupErrors:[...(gpuProof?.cleanupErrors??[])],submittedCount:gpuProof?.submittedCount??null,completedCount:gpuProof?.completedCount??null,callbackCount:gpuProof?.submissionCallbackCount??null,noNewSubmissions:gpuProof?.noNewSubmissionsAfterDispose===true},
        cleanupErrors:[...errors,...(gpuProof?.cleanupErrors??[]),...(audioProof?.errors??[])],
        device:{status:deviceDestroyed&&sameOwnedDevice&&queueDrained?'destroyed-loss-settled':'unknown',drained:queueDrained,destroyCalled:gpuProof?.deviceDestroyCalls===1,lostReason:gpuProof?.lostReason??null,sameDevice:sameOwnedDevice},
        audio:{disposeSettled:audioProof?.settled===true,...(audioProof??{settled:false,contextState:'unknown',voicesRemaining:null,pendingCount:null,errors:['missing audio retirement evidence']})}};
      report({type:'retired',frameCount,errors:[...errors],lifecycle:lifecycleReceipt});
      if(parentHandshake){
        startup.sequence++;startup.stage='retired';
        const message={schema:'dva-gallery-startup/v1',action:valid?'retired':'retire-error',token,versionId,attemptEpoch,sequence:startup.sequence,stage:'retired',status:valid?'ready':'error',teardown:valid?'disposed':'unknown',lifecycle:lifecycleReceipt};
        post(message);
      }
      return Object.freeze({status:valid?'retired':'retire-error',lifecycle:lifecycleReceipt});
    })();
    return retirementPromise;
  }
  async function initialize() {
    if (disposed) throw new Error('gallery attempt already retired');
    if(initializing) return api;
    initializing=true; initializationSettled=new Promise(resolve=>{finishInitialization=resolve;});
    if (parentHandshake) send('child-document', 'pending');
    if (parentHandshake) send('adapter', 'pending');
    try {
      runtime = await runtimeFactory({ canvas, shaderUrl: './world.wgsl', onStatus: message => {
        if ((message.type === 'device-lost' && !(disposed && message.reason==='destroyed')) || message.type === 'uncaptured-gpu-error' || message.type === 'queue-fence-error') {
          const reason = String(message.message || message.type);
          errors.push(reason); report({ type: message.type, message });
          send(startup.ready ? 'playing' : startup.stage, 'error', { error:{code:String(message.type).toUpperCase().replaceAll('-','_'),message:reason.slice(0,500)} });
          void retire();
        }
      } });
      if (disposed) { await runtime.dispose(); return api; }
      if (parentHandshake) send('first-frame', 'pending');
      beginCycle(now());
      return api;
    } catch (error) {
      errors.push(String(error?.message || error));
      report({ type: 'startup-error', message: String(error?.stack || error) });
      send('adapter', 'error', { error: { code: 'THROW_R5_STARTUP_ERROR', message: String(error?.message || error).slice(0, 500) } });
      await retire(true); throw error;
    } finally { initializing=false; finishInitialization?.(); finishInitialization=null; }
  }
  function snapshot() { return Object.freeze({ version: 'ordinary-item-throw-sol61-r5', ready: startup.ready,
    startup: Object.freeze({ ...startup }), frameCount, event: event && { ...event }, frame: lastFrameReceipt, ageMs: currentAge(), durationMs,
    sourceEnabled, observerEnabled, sfxEnabled: sfxEnabled && !verify, verify, autoLoop, held: heldAge != null,
    errors: [...errors], sfxFailures: [...sfxFailures], runtimeReady: Boolean(runtime), disposed }); }
  const api = Object.freeze({ initialize, replay: () => beginCycle(now()), hold, setPhase, resume, setSource, setObserver,
    enableSfx, retire: () => retire(false), snapshot, get runtime() { return runtime; } });
  return api;
}

const canvas = globalThis.document?.querySelector('#fx');
if (canvas) {
  const params = new URLSearchParams(location.search), verify = params.has('verify');
  const statusNode = document.querySelector('#status');
  const adapter = createGalleryAdapter({ canvas, params, verify, status: value => {
    if (statusNode) statusNode.textContent = JSON.stringify(value, null, 2);
  } });
  const startupSnapshot = () => ({ schema: 'dva-gallery-startup/v1', token: params.get('galleryStartupToken'),
    versionId: params.get('galleryVersionId'), attemptEpoch: Number(params.get('galleryAttemptEpoch')) });
  Object.defineProperty(globalThis, '__dvaGalleryStartupSnapshot', { value: startupSnapshot });
  Object.defineProperty(globalThis, '__throwR5Gallery', { value: adapter });
  const controls = {
    replay: document.querySelector('#replay'), hold: document.querySelector('#hold'), phase: document.querySelector('#phase'),
    resume: document.querySelector('#resume'), source: document.querySelector('#source'), observer: document.querySelector('#observer'), sfx: document.querySelector('#sfx')
  };
  controls.replay?.addEventListener('click', () => adapter.replay());
  controls.hold?.addEventListener('click', () => adapter.setPhase(Number(controls.phase.value) / 1000));
  controls.resume?.addEventListener('click', () => adapter.resume());
  controls.source?.addEventListener('change', () => adapter.setSource(controls.source.checked));
  controls.observer?.addEventListener('change', () => adapter.setObserver(controls.observer.checked));
  controls.sfx?.addEventListener('click', () => adapter.enableSfx());
  if (verify && controls.sfx) controls.sfx.disabled = true;
  const onParentMessage = event => {
    if (event.source !== parent || event.origin !== location.origin) return;
    const data = event.data;
    if (data?.schema === 'dva-gallery-startup/v1' && data.action === 'retire' &&
        data.token === params.get('galleryStartupToken') && data.versionId === params.get('galleryVersionId') &&
        data.attemptEpoch === Number(params.get('galleryAttemptEpoch'))) void adapter.retire();
  };
  addEventListener('message', onParentMessage);
  addEventListener('pagehide', () => { removeEventListener('message', onParentMessage); void adapter.retire(); }, { once: true });
  void adapter.initialize().catch(() => {});
}
