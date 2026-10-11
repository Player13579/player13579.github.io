import { VERSION } from './model.mjs';

const STARTUP_SCHEMA = 'dva-gallery-startup/v1';
const STARTUP_LIMIT_MS = 90_000;
const POLL_MS = 16;
const PHASES = Object.freeze(['child-document', 'adapter', 'device', 'assets', 'pipelines', 'first-frame', 'playing']);

/** Parent lifecycle layer; it observes receipts but does not own rendering or synthesis. */
export function createGalleryStartupHost({
  win, doc, location: childLocation, versionId, token, attemptEpoch, runtime,
  now = () => win.performance.now(),
  schedule = (fn, delay) => win.setTimeout(fn, delay),
  unschedule = id => win.clearTimeout(id),
  onDispose = () => runtime?.dispose?.()
}) {
  const origin = childLocation.origin;
  const valid = win.parent !== win && /^[0-9a-f]{32}$/.test(token || '') &&
    versionId === VERSION && Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0 &&
    origin && (() => { try { return win.parent.location.origin === origin; } catch { return false; } })();
  let sequence = 0;
  let timer = null;
  let startedAt = now();
  let stage = 'child-document';
  let snapshot = null;
  let disposed = false;
  let retired = false;

  function emit(nextStage, status, extra = {}) {
    if (!valid || (disposed && status !== 'cancelled')) return false;
    stage = nextStage;
    const envelope = Object.freeze({ schema: STARTUP_SCHEMA, token, versionId: VERSION,
      attemptEpoch, sequence: ++sequence, stage, status, ...extra });
    try { win.parent.postMessage(envelope, origin); }
    catch (error) {
      snapshot = Object.freeze({ ...envelope, status: status === 'ready' ? 'error' : status,
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
    if (disposed || retired || snapshot?.status === 'ready' || snapshot?.status === 'error') return;
    emit('playing', 'error', { error: Object.freeze({ code, message: String(message || code).slice(0, 1000) }) });
    dispose();
  }

  function check() {
    timer = null;
    if (disposed || retired || !valid) return;
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

  async function dispose() {
    if (disposed) return;
    disposed = true;
    if (timer !== null) unschedule(timer);
    timer = null;
    win.removeEventListener('message', onRetire);
    win.removeEventListener('pagehide', dispose);
    try { await onDispose(); } catch { /* teardown cannot turn failure into success */ }
  }

  function onRetire(event) {
    if (!valid || event?.origin !== origin || event?.source !== win.parent) return;
    const data = event.data;
    if (data?.schema !== STARTUP_SCHEMA || data.action !== 'retire' || data.token !== token ||
        data.versionId !== VERSION || data.attemptEpoch !== attemptEpoch) return;
    retired = true;
    if (timer !== null) unschedule(timer);
    timer = null;
    emit(stage, 'cancelled');
    void dispose();
  }

  function start() {
    if (!valid || disposed) return false;
    startedAt = now();
    emit('child-document', 'pending');
    win.addEventListener('message', onRetire);
    win.addEventListener('pagehide', dispose, { once: true });
    check();
    return true;
  }

  function progress(nextStage) {
    const nextRank = PHASES.indexOf(nextStage);
    if (!valid || disposed || nextRank < 0 || nextRank < PHASES.indexOf(stage) || nextStage === 'playing') return false;
    return emit(nextStage, 'pending');
  }

  return Object.freeze({ start, dispose, onRetire, progress, fail,
    get snapshot() { return snapshot; }, get phases() { return PHASES; } });
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
