const SCHEMA = 'dva-gallery-startup/v1';
const PHASES = Object.freeze(['child-document', 'adapter', 'device', 'assets', 'pipelines', 'first-frame', 'playing']);
const STATUSES = Object.freeze(['pending', 'delayed', 'ready', 'error', 'cancelled', 'unsupported']);

/** Gallery startup signaler. It owns protocol state and cleanup registration, not effect state. */
export function createGalleryStartup(env = globalThis) {
  const params = new URLSearchParams(env.location?.search || '');
  const token = String(params.get('galleryStartupToken') || '').slice(0, 128);
  const versionId = String(params.get('galleryVersionId') || '').slice(0, 160);
  const attemptEpoch = Number(params.get('galleryAttemptEpoch'));
  const parent = env.parent || env;
  const embedded = parent !== env;
  let sequence = 0;
  let terminal = false;
  let readySent = false;
  let cleanup = null;
  let removeMessageListener = () => {};
  let firstFrame = null;
  const startedAtMs = env.performance?.now?.() ?? 0;
  const identityValid = !embedded || Boolean(token && versionId && Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0);
  const state = { schema: SCHEMA, token, versionId, attemptEpoch, sequence: 0, stage: 'child-document', status: identityValid ? 'pending' : 'unsupported', startedAtMs, elapsedMs: 0 };

  function snapshot() {
    return Object.freeze({ ...state, ...(firstFrame ? { firstFrame: Object.freeze({ ...firstFrame }) } : {}) });
  }
  function emit(stage, status = 'pending', extra = {}) {
    if (!PHASES.includes(stage) || !STATUSES.includes(status)) return false;
    if (terminal && !['error', 'cancelled', 'unsupported'].includes(status)) return false;
    if (readySent && !['error', 'cancelled'].includes(status)) return false;
    if (status === 'ready' && !firstFrame) return false;
    const now = env.performance?.now?.() ?? startedAtMs;
    Object.assign(state, { stage, status, sequence: ++sequence, elapsedMs: Math.max(0, now - startedAtMs) });
    const message = Object.freeze({ ...state, ...extra, ...(firstFrame ? { firstFrame: { ...firstFrame } } : {}) });
    try {
      if (embedded && identityValid && env.location?.origin && env.location.origin !== 'null') parent.postMessage(message, env.location.origin);
    } catch { /* Parent may have retired the attempt. */ }
    return true;
  }
  function setCleanup(fn) { cleanup = typeof fn === 'function' ? fn : null; }
  function runCleanup() { const fn = cleanup; cleanup = null; try { fn?.(); } catch { /* Keep original terminal cause. */ } }
  function fail(error, code = 'PREVIEW_ERROR', status = 'error') {
    if (terminal) return false;
    terminal = true;
    removeMessageListener();
    runCleanup();
    return emit(state.stage, status === 'unsupported' ? 'unsupported' : 'error', { error: { code, message: String(error?.message || error || code) } });
  }
  function cancel() {
    if (terminal) return false;
    terminal = true;
    removeMessageListener();
    runCleanup();
    return emit(state.stage, 'cancelled');
  }
  function recordFirstFrame(proof, current = true) {
    const requiredPassOrder = ['world+emission', 'blur-x', 'blur-y', 'composite'];
    const emission = proof?.emissionReadback;
    const region = emission?.region;
    if (terminal || readySent || !current || !identityValid || !proof || proof.recorded !== true || proof.submitted !== true || proof.completed !== true || proof.nonzeroEmission !== true || !emission || !Number.isSafeInteger(emission.positiveRgbComponents) || emission.positiveRgbComponents < 1 || !Number.isSafeInteger(emission.finiteRgbComponents) || emission.finiteRgbComponents < 1 || !Number.isSafeInteger(emission.nonFiniteRgbComponents) || !Array.isArray(emission.maxRgb) || emission.maxRgb.length !== 3 || !emission.maxRgb.every(Number.isFinite) || !emission.maxRgb.some(value => value > 0) || !region || !Number.isSafeInteger(region.x) || region.x < 0 || !Number.isSafeInteger(region.y) || region.y < 0 || !Number.isSafeInteger(region.width) || region.width < 1 || region.width > 256 || !Number.isSafeInteger(region.height) || region.height < 1 || region.height > 256 || !Number.isSafeInteger(region.bytesPerRow) || region.bytesPerRow < region.width * 8 || region.bytesPerRow % 256 !== 0 || emission.finiteRgbComponents + emission.nonFiniteRgbComponents !== region.width * region.height * 3 || proof.canvasConnected !== true || typeof proof.causeId !== 'string' || !proof.causeId || !Number.isSafeInteger(proof.submitId) || proof.submitId < 1 || !['start', 'complete'].includes(proof.phase) || !Number.isFinite(proof.ageMs) || !Array.isArray(proof.passOrder) || proof.passOrder.length !== requiredPassOrder.length || proof.passOrder.some((name, i) => name !== requiredPassOrder[i]) || proof.passes !== requiredPassOrder.length || !Number.isSafeInteger(proof.generation) || proof.generation < 1 || !Number.isSafeInteger(proof.targetGeneration) || proof.targetGeneration < 1 || !(proof.viewportWidth > 0) || !(proof.viewportHeight > 0) || region.x + region.width > proof.viewportWidth || region.y + region.height > proof.viewportHeight) return false;
    firstFrame = Object.freeze({ ...proof, versionId, attemptEpoch });
    return emit('first-frame', 'pending');
  }
  function ready(proof, current = true) {
    if (readySent) return false;
    if (!firstFrame && !recordFirstFrame(proof, current)) return false;
    if (terminal || !current) return false;
    const sent = emit('playing', 'ready');
    if (sent) readySent = true;
    return sent;
  }
  function advance(stage, status = 'pending', extra = {}) { return identityValid && !terminal && !readySent && emit(stage, status, extra); }
  function acceptRetirement(event) {
    if (!embedded || !identityValid || event?.source !== parent || event?.origin !== env.location?.origin) return false;
    const m = event.data;
    if (m?.schema !== SCHEMA || m?.action !== 'retire' || m.token !== token || m.versionId !== versionId || m.attemptEpoch !== attemptEpoch) return false;
    return cancel();
  }
  if (embedded && typeof env.addEventListener === 'function') {
    const listener = event => { acceptRetirement(event); };
    env.addEventListener('message', listener);
    removeMessageListener = () => { try { env.removeEventListener?.('message', listener); } catch {} };
  }
  return Object.freeze({ advance, cancel, fail, isActive: () => !terminal && identityValid, ready, recordFirstFrame, setCleanup, snapshot, acceptRetirement, identityValid });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const startup = createGalleryStartup(window);
  window.__reloadGalleryStartup = startup;
  window.__reloadGalleryStartupSnapshot = startup.snapshot;
  addEventListener('error', event => {
    if (!event.target || event.target === window || event.target instanceof HTMLScriptElement) startup.fail(event.message || 'Preview module/runtime error', 'MODULE_OR_RUNTIME_ERROR');
  }, true);
  addEventListener('unhandledrejection', event => startup.fail(event.reason, event.reason?.code || 'UNHANDLED_REJECTION'));
}


