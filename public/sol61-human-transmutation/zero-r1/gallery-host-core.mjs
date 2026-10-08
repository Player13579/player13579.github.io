// Technical-only adapter around the immutable Human Transmutation Zero R1 runtime.
// It does not change renderer inputs, phase boundaries, shaders, or authored audio.
export const STARTUP_SCHEMA = 'dva-gallery-startup/v1';
export const DURATION_MS = 3400;

function readAttempt(locationRef) {
  const query = new URLSearchParams(locationRef.search || '');
  const token = query.get('galleryStartupToken');
  const versionId = query.get('galleryVersionId');
  const attemptEpoch = Number(query.get('galleryAttemptEpoch'));
  const bound = Boolean(token && versionId && Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0);
  return { query, token, versionId, attemptEpoch, bound };
}

function validCompletedReceipt(receipt, runtimeSnapshot, canvas) {
  if (!receipt || receipt.completed !== true || receipt.version !== runtimeSnapshot.version) return false;
  if (receipt.causeId !== runtimeSnapshot.causeId || receipt.generation !== runtimeSnapshot.generation) return false;
  if (!Number.isSafeInteger(receipt.submission) || receipt.submission < 1) return false;
  if (runtimeSnapshot.completed < receipt.submission || runtimeSnapshot.submitted < receipt.submission) return false;
  if (!Number.isSafeInteger(receipt.width) || receipt.width < 1 || receipt.width !== canvas.width) return false;
  if (!Number.isSafeInteger(receipt.height) || receipt.height < 1 || receipt.height !== canvas.height) return false;
  if (canvas.isConnected !== true) return false;
  const rect = canvas.getBoundingClientRect?.();
  return Boolean(rect && Number.isFinite(rect.width) && rect.width > 0 &&
    Number.isFinite(rect.height) && rect.height > 0);
}

function makeFirstFrameProof(receipt, canvas) {
  const rect = canvas.getBoundingClientRect();
  return Object.freeze({
    recorded: true,
    submitted: true,
    completed: true,
    canvasConnected: true,
    passes: 2,
    viewportWidth: rect.width,
    viewportHeight: rect.height,
    version: receipt.version,
    causeId: receipt.causeId,
    generation: receipt.generation,
    submission: receipt.submission,
    ageMs: receipt.ageMs,
    target: Object.freeze({ width: receipt.width, height: receipt.height }),
    sourceReceipt: receipt
  });
}

function bridgeSfx(windowRef, verify) {
  const authored = windowRef.__gallerySfx;
  if (!authored || typeof authored.activateFromGesture !== 'function') return false;
  const activate = async (...args) => {
    if (verify) return { state: 'silent', reason: 'verification mode' };
    try {
      // Invoke immediately so the authored AudioContext sees the trusted parent gesture.
      const pending = authored.activateFromGesture(...args);
      const result = await pending;
      if (result?.enabled === true && result?.verify !== true && result?.closed !== true) {
        return { state: 'active', reason: 'using the preview’s authored SFX' };
      }
      if (result?.verify === true) return { state: 'silent', reason: 'verification mode' };
      return { state: 'unsupported', reason: 'preview did not enable authored SFX' };
    } catch (_) {
      return { state: 'unsupported', reason: 'preview audio activation was rejected' };
    }
  };
  const hook = (...args) => activate(...args);
  hook.activateFromGesture = activate;
  hook.setMuted = value => authored.setMuted?.(verify ? true : Boolean(value));
  hook.snapshot = () => authored.snapshot?.();
  windowRef.__gallerySfx = hook;
  if (verify) hook.setMuted(true);
  return true;
}

export async function mountGalleryAdapter({
  windowRef,
  locationRef,
  documentRef,
  importPreview,
  requestFrame = callback => windowRef.requestAnimationFrame(callback),
  cancelFrame = id => windowRef.cancelAnimationFrame(id)
}) {
  const attempt = readAttempt(locationRef);
  const verify = attempt.query.has('verify');
  const autoLoop = attempt.query.get('galleryAutoLoop') === '1';
  const state = { sequence: 0, stage: 'child-document', disposed: false, ready: false, proof: null, raf: 0, error: null };
  let runtime = null;
  let wrapper = null;
  let lastLoopCause = '';

  const snapshot = () => Object.freeze({
    schema: STARTUP_SCHEMA,
    token: attempt.token,
    versionId: attempt.versionId,
    attemptEpoch: attempt.attemptEpoch,
    stage: state.stage,
    sequence: state.sequence,
    ready: state.ready,
    error: state.error
  });
  windowRef.__dvaGalleryStartupSnapshot = snapshot;

  function emit(stage, status, fields = {}) {
    state.stage = stage;
    state.sequence += 1;
    const message = {
      schema: STARTUP_SCHEMA,
      token: attempt.token,
      versionId: attempt.versionId,
      attemptEpoch: attempt.attemptEpoch,
      sequence: state.sequence,
      stage,
      status,
      ...fields
    };
    if (attempt.bound) {
      try { windowRef.parent?.postMessage(message, locationRef.origin); } catch (_) { /* parent may already be detached */ }
    }
    return message;
  }

  function reportError(stage, error) {
    if (state.disposed || state.error) return;
    state.error = String(error?.stack || error || 'gallery adapter failed').slice(0, 1200);
    emit(stage, 'error', { error: { code: 'HUMAN_ZERO_GALLERY_HOST', message: state.error } });
  }

  function stopFrame() {
    if (state.raf) cancelFrame(state.raf);
    state.raf = 0;
  }

  const onPageHide = () => { void dispose('pagehide'); };

  async function dispose(reason = 'disposed') {
    if (state.disposed) return false;
    state.disposed = true;
    stopFrame();
    windowRef.removeEventListener?.('message', onMessage);
    windowRef.removeEventListener?.('pagehide', onPageHide);
    try { runtime?.dispose?.(); } catch (_) { /* source disposal is idempotent and pagehide may follow */ }
    if (!state.error) emit('playing', 'cancelled', { reason });
    return true;
  }

  function matchesParentMessage(event, data) {
    return attempt.bound && event?.origin === locationRef.origin && event?.source === windowRef.parent &&
      data?.schema === STARTUP_SCHEMA && data.token === attempt.token &&
      data.versionId === attempt.versionId && data.attemptEpoch === attempt.attemptEpoch;
  }

  async function onMessage(event) {
    const data = event?.data;
    if (!matchesParentMessage(event, data) || state.disposed) return;
    if (data.action === 'retire') { await dispose('parent-retired'); return; }
    if (data.action !== 'control' || !runtime) return;
    try {
      if (data.control === 'replay') runtime.replay();
      else if (data.control === 'hold' && Number.isFinite(data.ageMs)) runtime.hold(data.ageMs);
      else if (data.control === 'resume') runtime.resume();
      else if (data.control === 'configure' && data.patch && typeof data.patch === 'object') runtime.configure(data.patch);
    } catch (error) { reportError('playing', error); }
  }

  function acceptFirstFrame(runtimeSnapshot) {
    const canvas = documentRef.querySelector('canvas');
    const receipt = runtimeSnapshot?.lastReceipt;
    if (!canvas || !validCompletedReceipt(receipt, runtimeSnapshot, canvas)) return false;
    const proof = makeFirstFrameProof(receipt, canvas);
    state.proof = proof;
    state.ready = true;
    emit('first-frame', 'ready', { firstFrame: proof });
    emit('playing', 'ready', { firstFrame: proof });
    return true;
  }

  function frameWatch() {
    state.raf = 0;
    if (state.disposed || !runtime) return;
    let runtimeSnapshot;
    try { runtimeSnapshot = runtime.snapshot(); }
    catch (error) { reportError('playing', error); return; }
    if (runtimeSnapshot?.error) { reportError(state.ready ? 'playing' : 'first-frame', runtimeSnapshot.error); return; }

    if (!state.ready) acceptFirstFrame(runtimeSnapshot);

    if (autoLoop && !documentRef.hidden && runtimeSnapshot?.heldAgeMs === null) {
      const receipt = runtimeSnapshot.lastReceipt;
      if (receipt?.completed === true && receipt.ageMs >= DURATION_MS &&
          receipt.causeId === runtimeSnapshot.causeId && receipt.generation === runtimeSnapshot.generation &&
          receipt.causeId !== lastLoopCause) {
        lastLoopCause = receipt.causeId;
        try { runtime.replay(); }
        catch (error) { reportError('playing', error); return; }
      }
    }

    if (!state.ready || autoLoop) state.raf = requestFrame(frameWatch);
  }

  windowRef.addEventListener('message', onMessage);
  windowRef.addEventListener('pagehide', onPageHide, { once: true });
  emit('child-document', 'pending');
  emit('adapter', 'pending');

  try {
    await importPreview();
    runtime = windowRef.__humanZero;
    if (state.disposed) {
      try { runtime?.dispose?.(); } catch (_) { /* imported source is retired before startup */ }
      return snapshot();
    }
    if (!runtime || typeof runtime.snapshot !== 'function' || typeof runtime.replay !== 'function') {
      throw new Error('sealed preview did not expose __humanZero runtime API');
    }
    wrapper = {
      replay: runtime.replay.bind(runtime),
      hold: runtime.hold.bind(runtime),
      resume: runtime.resume.bind(runtime),
      configure: runtime.configure.bind(runtime),
      dispose: runtime.dispose.bind(runtime),
      snapshot: () => Object.freeze({ ...runtime.snapshot(), galleryStartup: snapshot() })
    };
    windowRef.__humanZero = wrapper;
    bridgeSfx(windowRef, verify);
    emit('pipelines', 'ready');
    emit('first-frame', 'pending');
    state.raf = requestFrame(frameWatch);
  } catch (error) {
    reportError('pipelines', error);
  }

  // Keep a reference in the module lifetime and make direct CPU tests able to inspect it.
  windowRef.__humanZeroGalleryHost = Object.freeze({ snapshot, dispose, onMessage, frameWatch, ready: () => state.ready });
  return snapshot();
}
