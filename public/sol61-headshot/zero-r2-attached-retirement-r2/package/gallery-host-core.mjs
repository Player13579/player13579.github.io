import { VERSION } from './model.mjs';

const STARTUP_SCHEMA = 'dva-gallery-startup/v1';
const PACKAGE_SCHEMA = 'headshot-r2-attached-retirement/v1';
const STARTUP_LIMIT_MS = 90_000;
const POLL_MS = 16;
const PHASES = Object.freeze(['child-document', 'adapter', 'device', 'assets', 'pipelines', 'first-frame', 'playing']);
const SHA256 = /^[0-9a-f]{64}$/;
const TOKEN = /^[0-9a-f]{32}$/;

function makeSessionId(win) {
  if (typeof win.crypto?.randomUUID === 'function') return win.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}

/** Parent lifecycle layer; it observes receipts but does not own rendering or synthesis. */
export function createGalleryStartupHost({
  win, doc, location: childLocation, versionId, token, attemptEpoch, packageSchema,
  packageManifestSha256, packageSealSha256, sourceManifestSha256, runtime,
  now = () => win.performance.now(),
  schedule = (fn, delay) => win.setTimeout(fn, delay),
  unschedule = id => win.clearTimeout(id),
  onDispose = () => runtime?.dispose?.()
}) {
  const origin = childLocation.origin;
  const pins = Object.freeze({ packageSchema, packageManifestSha256, packageSealSha256, sourceManifestSha256 });
  const parentOrigin = (() => { try { return win.parent.location.origin; } catch { return ''; } })();
  const valid = win.parent !== win && TOKEN.test(token || '') && versionId === VERSION &&
    Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0 && origin && parentOrigin === origin &&
    packageSchema === PACKAGE_SCHEMA && SHA256.test(packageManifestSha256 || '') &&
    SHA256.test(packageSealSha256 || '') && SHA256.test(sourceManifestSha256 || '');
  let sequence = 0;
  let controlSequence = 0;
  let timer = null;
  let startedAt = now();
  let stage = 'child-document';
  let snapshot = null;
  let disposePromise = null;
  let retirementRequested = false;
  let retiredAckSent = false;
  const adapterSessionId = makeSessionId(win);

  function emit(nextStage, status, extra = {}) {
    if (!valid || (disposePromise && status !== 'error')) return false;
    stage = nextStage;
    const envelope = Object.freeze({ schema: STARTUP_SCHEMA, token, versionId: VERSION,
      attemptEpoch, sequence: ++sequence, stage, status, ...pins, adapterSessionId, ...extra });
    try { win.parent.postMessage(envelope, origin); }
    catch (error) {
      snapshot = Object.freeze({ ...envelope, status: 'error',
        error: { code: 'STARTUP_STATUS_DELIVERY_FAILED', message: String(error?.message || error) } });
      return false;
    }
    snapshot = envelope;
    return true;
  }

  function receiptProof(state) {
    const receipt = state?.lastReceipt;
    const canvas = doc.querySelector('canvas');
    if (!receipt || receipt.completed !== true || !Number.isSafeInteger(receipt.submission) || receipt.submission < 1 ||
        !Number.isSafeInteger(receipt.cause) || !Number.isSafeInteger(receipt.generation) ||
        !Number.isSafeInteger(receipt.width) || receipt.width < 1 || !Number.isSafeInteger(receipt.height) || receipt.height < 1 ||
        receipt.cause !== state.cause || receipt.generation !== state.generation ||
        !canvas || canvas.isConnected !== true || canvas.width !== receipt.width || canvas.height !== receipt.height) return null;
    return Object.freeze({ recorded: true, submitted: true, completed: true, canvasConnected: true,
      passes: 2, viewportWidth: receipt.width, viewportHeight: receipt.height,
      submissionId: receipt.submission, causeId: `${VERSION}:${receipt.cause}`,
      target: Object.freeze({ versionId: VERSION, submissionId: receipt.submission,
        cause: receipt.cause, generation: receipt.generation,
        width: receipt.width, height: receipt.height }), ageMs: receipt.ageMs });
  }

  function fail(code, message) {
    if (disposePromise || retirementRequested || snapshot?.status === 'ready' || snapshot?.status === 'error') return;
    emit('playing', 'error', { error: Object.freeze({ code, message: String(message || code).slice(0, 1000) }) });
    void dispose().catch(() => {});
  }

  function check() {
    timer = null;
    if (disposePromise || retirementRequested || !valid) return;
    let state;
    try { state = runtime?.snapshot?.(); }
    catch (error) { fail('RUNTIME_SNAPSHOT_FAILED', error?.message || error); return; }
    if (state?.status === 'failed' || state?.gpuError || state?.fatal) {
      fail('GPU_STARTUP_FAILED', state.gpuError || state.fatal || 'WebGPU initialization or rendering failed');
      return;
    }
    const firstFrame = receiptProof(state);
    if (firstFrame) { emit('playing', 'ready', { firstFrame }); return; }
    if (now() - startedAt >= STARTUP_LIMIT_MS) {
      fail('STARTUP_TIMEOUT', 'No completed submitted frame was received before startup timeout');
      return;
    }
    timer = schedule(check, POLL_MS);
  }

  function dispose() {
    if (disposePromise) return disposePromise;
    if (timer !== null) unschedule(timer);
    timer = null;
    win.removeEventListener('message', onRetire);
    win.removeEventListener('pagehide', onPageHide);
    let resolveDisposal, rejectDisposal;
    disposePromise = new Promise((resolve, reject) => { resolveDisposal = resolve; rejectDisposal = reject; });
    try { Promise.resolve(onDispose()).then(resolveDisposal, rejectDisposal); }
    catch (error) { rejectDisposal(error); }
    return disposePromise;
  }

  function finalRetirementProof(state) {
    const canvas = doc.querySelector('canvas');
    const deviceLost = state?.deviceLost;
    return Boolean(canvas?.isConnected === true && state?.disposed === true && state?.ready === false &&
      state?.disposeCompleted === true && Number.isSafeInteger(state?.submitted) && state.submitted >= 0 &&
      Number.isSafeInteger(state?.completed) && state.completed >= 0 && state.submitted === state.completed &&
      (state.completed === 0 || (state?.lastReceipt?.completed === true && state.lastReceipt.submission === state.completed)) &&
      state?.mode === 'stopped' && state?.rafScheduled === false &&
      state?.activeVoices === 0 && state?.gpuError === null && Array.isArray(state?.retirementErrors) &&
      state.retirementErrors.length === 0 && deviceLost?.expected === true && deviceLost?.owned === true &&
      deviceLost?.reason === 'destroyed');
  }

  async function onRetire(event) {
    if (!valid || event?.origin !== origin || event?.source !== win.parent) return;
    const data = event.data;
    if (data?.schema !== STARTUP_SCHEMA || data.action !== 'retire' || data.token !== token ||
        data.versionId !== VERSION || data.attemptEpoch !== attemptEpoch ||
        !Number.isSafeInteger(data.sequence) || data.sequence <= controlSequence ||
        data.packageSchema !== pins.packageSchema || data.packageManifestSha256 !== pins.packageManifestSha256 ||
        data.packageSealSha256 !== pins.packageSealSha256 || data.sourceManifestSha256 !== pins.sourceManifestSha256) return;
    controlSequence = data.sequence;
    retirementRequested = true;
    let finalSnapshot;
    try {
      finalSnapshot = await dispose();
      if (!finalRetirementProof(finalSnapshot)) throw new Error('RUNTIME_RETIREMENT_PROOF_INCOMPLETE');
    } catch (error) {
      if (!retiredAckSent) {
        emitRetirementError(error, finalSnapshot ?? safeSnapshot());
      }
      return;
    }
    if (retiredAckSent) return;
    retiredAckSent = true;
    const receipt = Object.freeze({ schema: STARTUP_SCHEMA, action: 'retired', status: 'cancelled',
      token, versionId: VERSION, attemptEpoch, sequence: ++sequence, ...pins, adapterSessionId,
      canvasConnected: true, attached: true, runtimeSnapshot: finalSnapshot });
    try { win.parent.postMessage(receipt, origin); snapshot = receipt; }
    catch (error) { snapshot = Object.freeze({ ...receipt, status: 'error', action: 'retire-error',
      error: { code: 'RETIREMENT_STATUS_DELIVERY_FAILED', message: String(error?.message || error) } }); }
  }

  function safeSnapshot() {
    try { return runtime?.snapshot?.() ?? null; } catch { return null; }
  }

  function emitRetirementError(error, state) {
    const receipt = Object.freeze({ schema: STARTUP_SCHEMA, action: 'retire-error', status: 'error',
      token, versionId: VERSION, attemptEpoch, sequence: ++sequence, ...pins, adapterSessionId,
      canvasConnected: doc.querySelector('canvas')?.isConnected === true,
      attached: doc.querySelector('canvas')?.isConnected === true, runtimeSnapshot: state,
      error: { code: String(error?.message || error || 'RETIREMENT_FAILED').slice(0, 1000) } });
    try { win.parent.postMessage(receipt, origin); snapshot = receipt; }
    catch { snapshot = receipt; }
  }

  function onPageHide() { void dispose().catch(() => {}); }

  function start() {
    if (!valid || disposePromise) return false;
    startedAt = now();
    emit('child-document', 'pending');
    win.addEventListener('message', onRetire);
    win.addEventListener('pagehide', onPageHide, { once: true });
    check();
    return true;
  }

  function progress(nextStage) {
    const nextRank = PHASES.indexOf(nextStage);
    if (!valid || disposePromise || retirementRequested || nextRank < 0 || nextRank < PHASES.indexOf(stage) || nextStage === 'playing') return false;
    return emit(nextStage, 'pending');
  }

  return Object.freeze({ start, dispose, onRetire, progress, fail,
    get snapshot() { return snapshot; }, get phases() { return PHASES; },
    get adapterSessionId() { return adapterSessionId; } });
}

export function createGallerySfxFacade(runtime, verify) {
  const enable = () => verify ? false : runtime.enableAudio();
  const setMuted = value => runtime.setMuted(verify || Boolean(value));
  const stop = () => runtime.stop();
  const snapshot = () => {
    const state = runtime.snapshot();
    return { ...state, verify, muted: verify || state.muted };
  };
  return Object.freeze({ activateFromGesture: enable, enable, setMuted, stop, snapshot });
}



