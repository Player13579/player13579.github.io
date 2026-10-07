import { VERSION, AUTHOR, DURATION_MS, FIXTURE, plan, phaseAt, createRenderer } from './effect.mjs';
import { createSound } from './sound.mjs';

const query = new URLSearchParams(location.search);
const verify = query.has('verify');
const canvas = document.getElementById('surface');
const failure = document.getElementById('error');
const soundButton = document.getElementById('sound');
const selectedHeightName = query.has('reviewH') ? 'reviewH' : query.has('height') ? 'height' : null;
const reviewHeight = selectedHeightName === null ? null : Number(query.get(selectedHeightName));
const receiverId = 'stamina-preview-sophia';
const sound = createSound({ verify });
const errors = [];
let renderer = null;
let ageMs = 0;
let lastFrame = null;
let loop = 0;
let currentCauseId = `${VERSION}:${loop}`;
let audioEnabled = false;
let raf = null;
let rafEpoch = 0;
let disposed = false;
let failed = false;
let resizeObserver = null;
let proofEpoch = 0;
let startupPending = null;
let startupCompleted = false;
let startupReadyDelivered = false;
let startupFailureDelivered = false;
let startupEvidence = null;
let lastRenderedReceipt = null;
let restorationBaseline = null;
let awaitingRestoredFrame = false;
let restorationEvidence = null;
let startupStage = 'child-document';
const startupAttempt = (() => {
  const token = query.get('galleryStartupToken');
  const versionId = query.get('galleryVersionId');
  const attemptEpoch = Number(query.get('galleryAttemptEpoch'));
  if (window.parent === window || !/^[0-9a-f]{32}$/.test(token || '') || versionId !== VERSION ||
      !Number.isSafeInteger(attemptEpoch) || attemptEpoch <= 0) return null;
  try { if (window.parent.location.origin !== location.origin) return null; } catch { return null; }
  return Object.freeze({ token, versionId, attemptEpoch });
})();
let startupSequence = 0;
let startupSnapshot = null;
const startupListener = event => {
  if (!startupAttempt || event.origin !== location.origin || event.source !== window.parent) return;
  const data = event.data;
  if (data?.schema !== 'dva-gallery-startup/v1' || data.action !== 'retire' ||
      data.token !== startupAttempt.token || data.versionId !== startupAttempt.versionId ||
      data.attemptEpoch !== startupAttempt.attemptEpoch) return;
  startupEmit(startupStage, 'cancelled');
  dispose();
};
function startupEmit(stage, status, extra = {}) {
  if (!startupAttempt || disposed && status !== 'cancelled') return;
  const envelope = Object.freeze({ schema: 'dva-gallery-startup/v1', token: startupAttempt.token,
    versionId: VERSION, attemptEpoch: startupAttempt.attemptEpoch, sequence: ++startupSequence,
    stage, status, ...extra });
  startupStage = stage;
  try { window.parent.postMessage(envelope, location.origin); }
  catch (error) {
    startupSnapshot = Object.freeze(status === 'ready'
      ? { ...envelope, status: 'error', error: Object.freeze({ code: 'STARTUP_STATUS_DELIVERY_FAILED', message: error?.message || String(error) }) }
      : envelope);
    return false;
  }
  startupSnapshot = envelope;
  return true;
}
if (startupAttempt) {
  window.__dvaGalleryStartupSnapshot = () => startupSnapshot;
  window.addEventListener('message', startupListener);
  startupEmit('child-document', 'pending');
}
function startupError(error) {
  if (startupAttempt && !disposed && !startupFailureDelivered) {
    const stage = startupStage === 'child-document' ? 'assets' : startupStage;
    startupFailureDelivered = startupEmit(stage, 'error', { error: Object.freeze({ code: 'PREVIEW_STARTUP_ERROR', message: error?.message || String(error) }) });
  }
}
function bumpProofEpoch() {
  proofEpoch += 1;
  if (startupEvidence?.status === 'completed-current') {
    startupEvidence = Object.freeze({ ...startupEvidence, status: 'lifecycle-invalidated', invalidatedAtEpoch: proofEpoch });
  }
}


function currentSize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  if (![rect.width, rect.height, dpr].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0 || dpr <= 0) return null;
  return { rect, dpr };
}

function cancelScheduledFrame() {
  if (raf !== null) cancelAnimationFrame(raf);
  raf = null;
  rafEpoch += 1;
}

function suspend() {
  bumpProofEpoch();
  cancelScheduledFrame();
  lastFrame = null;
  document.body.dataset.ready = 'false';
}

function heightFor(rect) {
  return reviewHeight === null
    ? Math.min(512, Math.max(64, Math.round(Math.min(rect.height * 0.45, rect.width / 1.5))))
    : Math.min(512, Math.max(64, Math.round(reviewHeight)));
}

function showFailure(error, stage) {
  const message = error?.message || String(error);
  if (stage === 'fixture' || stage === 'webgpu') startupError(error);
  errors.push({ stage, message, at: performance.now() });
  if (errors.length > 16) errors.shift();
  failure.textContent = `${stage}: ${message}`;
  failure.hidden = false;
  document.body.dataset.failed = 'true';
  window.__dvaStaminaGalleryError?.(`${stage}: ${error?.stack || message}`);
  if (stage === 'webgpu' || stage === 'fixture') {
    failed = true;
    suspend();
    sound.stop();
  }
}

function currentPlan(age, rect) {
  const input = {
    causeId: currentCauseId,
    receiverId,
    ageMs: age,
    anchor: { x: rect.width * 0.5, y: rect.height * 0.65 },
    heightPx: heightFor(rect),
    source: true,
    receiver: true,
    cross: true,
    post: true,
    body: true,
    reducedMotion: false
  };
  const planned = age < DURATION_MS ? plan(input) : input;
  if (!planned) throw new Error('stamina planner rejected an in-lifetime preview state');
  // R2's renderer has an explicit background uniform; preserve the frozen
  // preview's dark default because this gallery adapter adds no controls.
  return { ...planned, lightBackground: false };
}

function queueFrame() {
  if (disposed || failed || !renderer || document.hidden) return;
  const size = currentSize();
  if (!size) {
    if (!document.hidden) noteZeroSize();
    suspend();
    sound.stop();
    return;
  }
  if (raf !== null) return;
  if (lastFrame === null) lastFrame = performance.now();
  const epoch = rafEpoch;
  raf = requestAnimationFrame(() => {
    if (epoch !== rafEpoch) return;
    raf = null;
    frame();
  });
}

function noteZeroSize() {
  if (!startupAttempt || !startupCompleted || awaitingRestoredFrame || !lastRenderedReceipt ||
      startupEvidence?.status !== 'completed-current') return;
  restorationBaseline = Object.freeze({ causeId: lastRenderedReceipt.causeId, ageMs: lastRenderedReceipt.ageMs,
    submissionId: lastRenderedReceipt.submissions, lifecycleEpoch: proofEpoch });
  awaitingRestoredFrame = true;
  restorationEvidence = Object.freeze({ status: 'awaiting-first-restored-render', baseline: restorationBaseline });
}
function sameFiniteSize(a, b) {
  return Boolean(a && b && a.rect.width === b.rect.width && a.rect.height === b.rect.height && a.dpr === b.dpr);
}
function captureStartupFrame(receipt, size, epoch, restoreBaseline = null) {
  const startupCandidate = Boolean(startupAttempt && !startupCompleted);
  const restorationCandidate = Boolean(startupAttempt && startupCompleted && restoreBaseline);
  if ((!startupCandidate && !restorationCandidate) || startupPending || disposed || failed || !renderer) return;
  const capturedRenderer = renderer;
  const device = capturedRenderer.device;
  const queue = device?.queue;
  const completed = queue?.onSubmittedWorkDone;
  if (typeof completed !== 'function') {
    showFailure(new Error('GPUQueue.onSubmittedWorkDone is unavailable'), 'webgpu');
    return;
  }
  const frameSize = Object.freeze({ rectWidth: size.rect.width, rectHeight: size.rect.height,
    dpr: size.dpr, backingWidth: canvas.width, backingHeight: canvas.height });
  const record = { renderer: capturedRenderer, device, queue, canvas, receipt, epoch, frameSize,
    restorationCandidate,
    sourceSha256: '3c6831da67831263ca5bdc585afd9c29e277f33ac1d212d01ea378853c156538',
    errorsAtCapture: errors.length + (capturedRenderer.errors?.length || 0), completion: null, result: 'pending' };
  startupPending = record;
  if (startupCandidate) startupEvidence = Object.freeze({ status: 'pending', submissionId: receipt.submissions, causeId: receipt.causeId,
    ageMs: receipt.ageMs, viewportWidth: receipt.width, viewportHeight: receipt.height, lifecycleEpoch: epoch,
    queueIdentityCaptured: true, completionPromiseCaptured: false });
  if (restorationCandidate) restorationEvidence = Object.freeze({ status: 'pending-first-restored-completion', baseline: restoreBaseline,
    submissionId: receipt.submissions, causeId: receipt.causeId, ageMs: receipt.ageMs, lifecycleEpoch: epoch,
    viewportWidth: receipt.width, viewportHeight: receipt.height, queueIdentityCaptured: true });
  let promise;
  try { promise = completed.call(queue); }
  catch (error) {
    record.result = 'rejected'; record.error = error?.message || String(error);
    if (startupPending === record) startupPending = null;
    if (renderer === record.renderer && !disposed && !failed) showFailure(error, 'webgpu');
    if (startupCandidate && startupEvidence?.submissionId === receipt.submissions && startupEvidence?.lifecycleEpoch === epoch) {
      startupEvidence = Object.freeze({ ...startupEvidence, status: 'queue-call-threw', settled: true, error: record.error });
    }
    if (restorationCandidate) restorationEvidence = Object.freeze({ ...restorationEvidence, status: 'queue-call-threw', settled: true, error: record.error });
    return;
  }
  record.completion = promise;
  if (startupCandidate && startupEvidence?.submissionId === receipt.submissions && startupEvidence?.lifecycleEpoch === epoch) {
    startupEvidence = Object.freeze({ ...startupEvidence, completionPromiseCaptured: true });
  }
  try { promise.then(() => {
    const currentSizeNow = currentSize();
    const physicalValid = startupPending === record && renderer === record.renderer && renderer?.device === record.device &&
      renderer?.device?.queue === record.queue && canvas === record.canvas && !disposed && !failed && !document.hidden &&
      canvas.isConnected === true && proofEpoch === record.epoch && sameFiniteSize(currentSizeNow, {
        rect: { width: record.frameSize.rectWidth, height: record.frameSize.rectHeight }, dpr: record.frameSize.dpr,
        backingWidth: record.frameSize.backingWidth, backingHeight: record.frameSize.backingHeight
      }) && canvas.width === record.frameSize.backingWidth && canvas.height === record.frameSize.backingHeight &&
      Number.isInteger(canvas.width) && canvas.width > 0 && Number.isInteger(canvas.height) && canvas.height > 0 &&
      (errors.length + (renderer.errors?.length || 0)) === 0 && record.errorsAtCapture === 0 &&
      receipt.width === canvas.width && receipt.height === canvas.height;
    record.result = physicalValid ? 'completed-current' : 'completed-stale';
    if (startupCandidate && startupEvidence?.submissionId === receipt.submissions && startupEvidence?.lifecycleEpoch === record.epoch) {
      startupEvidence = Object.freeze({ ...startupEvidence, status: record.result, settled: true, guardPassed: physicalValid });
    }
    if (restorationCandidate) {
      const sameCause = restoreBaseline.causeId === receipt.causeId;
      const currentReceipt = lastRenderedReceipt === receipt;
      const currentRestoration = physicalValid && currentCauseId === receipt.causeId && currentReceipt;
      restorationEvidence = Object.freeze({ ...restorationEvidence,
        status: currentRestoration ? (sameCause ? 'completed-current-same-cause' : 'completed-current-different-cause')
          : physicalValid ? 'completed-stale-current-frame' : 'completed-stale',
        settled: true, guardPassed: currentRestoration, queueCompletionObserved: physicalValid, sameCause, baseline: restoreBaseline,
        completedSubmissionId: receipt.submissions, completedCauseId: receipt.causeId, completedAgeMs: receipt.ageMs,
        currentCauseIdAtCompletion: currentCauseId, currentRenderedSubmissionId: lastRenderedReceipt?.submissions ?? null });
    }
    if (startupPending === record) startupPending = null;
    if (!physicalValid || !startupCandidate || startupCompleted) return;
    startupCompleted = true;
    const firstFrame = Object.freeze({ recorded: true, submitted: true, completed: true, canvasConnected: true,
      passes: 2, viewportWidth: receipt.width, viewportHeight: receipt.height, sourcePasses: Object.freeze(['world', 'post']),
      sourceWitness: 'effect.mjs pinned two-pass encoder path', sourceSha256: record.sourceSha256,
      submissionId: receipt.submissions, causeId: receipt.causeId, ageMs: receipt.ageMs,
      bodyProjectedHeight: receipt.bodyProjectedHeight, postEnabled: receipt.postEnabled,
      cssWidth: frameSize.rectWidth, cssHeight: frameSize.rectHeight, dpr: frameSize.dpr,
      backingWidth: frameSize.backingWidth, backingHeight: frameSize.backingHeight, lifecycleEpoch: record.epoch });
    startupReadyDelivered = startupEmit('playing', 'ready', { firstFrame });
    if (!startupReadyDelivered) startupEvidence = Object.freeze({ ...startupEvidence, status: 'ready-message-delivery-failed' });
  }, error => {
    record.result = 'rejected'; record.error = error?.message || String(error);
    if (startupCandidate && startupEvidence?.submissionId === receipt.submissions && startupEvidence?.lifecycleEpoch === record.epoch) {
      startupEvidence = Object.freeze({ ...startupEvidence, status: 'queue-rejected', settled: true, error: record.error });
    }
    if (restorationCandidate) restorationEvidence = Object.freeze({ ...restorationEvidence, status: 'queue-rejected', settled: true, error: record.error });
    if (startupPending === record) startupPending = null;
    if (renderer === record.renderer && renderer?.device === record.device && !disposed && !failed) showFailure(error, 'webgpu');
  }); } catch (error) {
    record.result = 'rejected'; record.error = error?.message || String(error);
    if (startupCandidate && startupEvidence?.submissionId === receipt.submissions && startupEvidence?.lifecycleEpoch === epoch) {
      startupEvidence = Object.freeze({ ...startupEvidence, status: 'queue-observer-threw', settled: true, error: record.error });
    }
    if (restorationCandidate) restorationEvidence = Object.freeze({ ...restorationEvidence, status: 'queue-observer-threw', settled: true, error: record.error });
    if (startupPending === record) startupPending = null;
    if (renderer === record.renderer && !disposed && !failed) showFailure(error, 'webgpu');
  }
}

function frame() {
  if (disposed || failed || !renderer) return;
  if (document.hidden) {
    suspend();
    sound.stop();
    return;
  }
  const size = currentSize();
  if (!size) {
    noteZeroSize();
    suspend();
    sound.stop();
    return;
  }
  try {
    // Sample at callback execution. RAF's timestamp may have been queued before
    // a visibility/layout event reset the monotonic baseline.
    const now = performance.now();
    if (lastFrame !== null) {
      const elapsed = now - lastFrame;
      if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('invalid monotonic preview clock');
      ageMs += elapsed;
    }
    lastFrame = now;
    if (ageMs >= DURATION_MS) {
      sound.stop();
      ageMs %= DURATION_MS;
      loop += 1;
      currentCauseId = `${VERSION}:${loop}`;
      if (audioEnabled && !verify && !document.hidden) {
        void sound.play(currentCauseId, { ageMs: 0, rate: 1 }).catch(error => showFailure(error, 'sfx'));
      }
    }
    const pendingRestoration = startupPending;
    if (pendingRestoration?.result === 'pending' && pendingRestoration.renderer === renderer &&
        pendingRestoration.restorationCandidate === true) {
      queueFrame();
      return;
    }
    const beforeBacking = `${canvas.width}x${canvas.height}`;
    const receipt = renderer.render(currentPlan(ageMs, size.rect));
    if (`${canvas.width}x${canvas.height}` !== beforeBacking) bumpProofEpoch();
    const wasRestoredFrame = awaitingRestoredFrame;
    const restoreBaseline = wasRestoredFrame ? restorationBaseline : null;
    if (wasRestoredFrame) { awaitingRestoredFrame = false; restorationBaseline = null; }
    if (wasRestoredFrame && startupPending) {
      restorationEvidence = Object.freeze({ status: 'first-restored-completion-not-observed-inflight', baseline: restoreBaseline,
        submissionId: receipt.submissions, causeId: receipt.causeId, ageMs: receipt.ageMs, lifecycleEpoch: proofEpoch });
    } else {
      captureStartupFrame(receipt, size, proofEpoch, restoreBaseline);
    }
    lastRenderedReceipt = receipt;
    document.body.dataset.ready = 'true';
    document.body.dataset.submissions = String(receipt.submissions);
    document.body.dataset.version = VERSION;
    queueFrame();
  } catch (error) {
    showFailure(error, 'webgpu');
  }
}

function exposeObserver() {
  window.__dvaStaminaGallery = Object.freeze({
    version: VERSION,
    author: AUTHOR,
    verify,
    verifyAudioMuted: sound.verifyMuted,
    get ageMs() { return ageMs; },
    get causeId() { return currentCauseId; },
    get phase() { return phaseAt(ageMs); },
    get heightPx() { const size = currentSize(); return size ? heightFor(size.rect) : null; },
    get cssSize() { const size = currentSize(); return size ? { width: size.rect.width, height: size.rect.height, dpr: size.dpr } : null; },
    get sizeValid() { return currentSize() !== null; },
    get loop() { return loop; },
    get submissions() { return renderer?.submissions || 0; },
    get errors() { return errors.slice(); },
    get audioEnabled() { return audioEnabled; },
    get failure() { return failure.hidden ? null : failure.textContent; },
    get disposed() { return disposed; },
    get startupProof() { return startupEvidence; },
    get restorationProof() { return restorationEvidence; }
  });
}

async function enableAudioFromGalleryGesture() {
  if (verify || audioEnabled || disposed || document.hidden || !currentSize()) return;
  audioEnabled = true;
  try {
    await sound.activate();
    if (!disposed && !document.hidden && currentSize()) {
      void sound.play(currentCauseId, { ageMs: Math.max(0, ageMs), rate: 1 }).catch(error => showFailure(error, 'sfx'));
    }
  } catch (error) {
    showFailure(error, 'sfx');
  }
}
soundButton.addEventListener('click', enableAudioFromGalleryGesture);

function onSizeChange() {
  if (disposed || failed) return;
  const size = currentSize();
  if (!document.hidden && !size) noteZeroSize();
  bumpProofEpoch();
  if (document.hidden || !size) {
    suspend();
    sound.stop();
    return;
  }
  queueFrame();
}

function onVisibilityChange() {
  if (disposed || failed) return;
  if (document.hidden) {
    suspend();
    sound.stop();
    return;
  }
  // A visible resume starts from a new baseline; hidden time is never caught up.
  lastFrame = null;
  onSizeChange();
}

function dispose() {
  if (disposed) return;
  bumpProofEpoch();
  disposed = true;
  suspend();
  resizeObserver?.disconnect();
  if (startupAttempt) window.removeEventListener('message', startupListener);
  window.removeEventListener('resize', onSizeChange);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', dispose);
  sound.stop();
  renderer?.dispose();
  void sound.dispose();
}

async function initialize() {
  if (reviewHeight !== null && (!Number.isFinite(reviewHeight) || reviewHeight < 64 || reviewHeight > 512)) throw new Error(`invalid ${selectedHeightName} parameter`);
  if (disposed || failed) return;
  startupEmit('assets', 'pending');
  const response = await fetch(FIXTURE.path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`body fixture HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const actualHash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  if (actualHash !== FIXTURE.sourceSha256) throw new Error(`body fixture hash mismatch: ${actualHash}`);
  if (disposed || failed) return;
  const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  if (disposed || failed) {
    image.close();
    return;
  }
  let created = null;
  startupEmit('pipelines', 'pending');
  try {
    created = await createRenderer(canvas, image, { onDiagnostic: entry => {
      if (disposed) return;
      if (entry?.stage === 'uncaptured' || entry?.stage === 'device-lost') showFailure(new Error(entry.message || entry.stage), 'webgpu');
    } });
  } finally {
    image.close();
  }
  if (disposed || failed) {
    created.dispose();
    return;
  }
  renderer = created;
  exposeObserver();
  startupEmit('first-frame', 'pending');
  onSizeChange();
}

if (typeof ResizeObserver !== 'undefined') {
  resizeObserver = new ResizeObserver(onSizeChange);
  resizeObserver.observe(canvas);
}
window.addEventListener('resize', onSizeChange, { passive: true });
document.addEventListener('visibilitychange', onVisibilityChange);
window.addEventListener('pagehide', dispose, { once: true });
initialize().catch(error => showFailure(error, 'fixture'));



