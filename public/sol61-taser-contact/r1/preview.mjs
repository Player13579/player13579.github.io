import { DURATION_MS, admitContact } from './geometry.mjs';
import { createContactRenderer } from './runtime.mjs';
import { createTaserContactSfxBridge } from './taser-contact-sfx.mjs';

const VERSION = 'taser-contact-sol61-r1';
const LOOP_GAP_MS = 900;
const LOOP_PERIOD_MS = DURATION_MS + LOOP_GAP_MS;
const params = new URLSearchParams(location.search);
const verify = params.has('verify');
const embedded = params.has('embed');
const rawPresentation = params.has('viewRaw');
if (embedded) document.body.dataset.embed = 'true';
if (embedded) document.body.dataset.viewScale = rawPresentation ? '1' : 'fit';
const canvas = document.getElementById('surface');

export function computeGalleryDisplayScale(cssWidth, cssHeight, { embedded = false, rawPresentation = false } = {}) {
  if (!embedded || rawPresentation) return 1;
  if (!Number.isFinite(cssWidth) || !Number.isFinite(cssHeight) || cssWidth <= 0 || cssHeight <= 0) return 1;
  return Math.max(1, Math.min(16, Math.min(cssWidth, cssHeight) * 0.72 / 48));
}

let displayScale = 1;
function updateGalleryDisplayScale() {
  displayScale = computeGalleryDisplayScale(canvas.clientWidth, canvas.clientHeight, { embedded, rawPresentation });
  if (embedded) document.body.style.setProperty('--gallery-display-scale', String(displayScale));
  return displayScale;
}
updateGalleryDisplayScale();
const status = document.getElementById('status');
const errorNode = document.getElementById('error');
const sourceInput = document.getElementById('source');
const observerInput = document.getElementById('observer');

const startup = {
  schema: 'dva-gallery-startup/v1', token: params.get('galleryStartupToken'),
  versionId: params.get('galleryVersionId'), attemptEpoch: Number(params.get('galleryAttemptEpoch')),
  sequence: 0, stage: 'child-document', status: 'pending', ready: false
};
let startupValid = false;
try {
  startupValid = window.parent !== window && /^[0-9a-f]{32}$/.test(startup.token || '') &&
    startup.versionId === VERSION && Number.isSafeInteger(startup.attemptEpoch) && startup.attemptEpoch > 0 &&
    location.origin === window.parent.location.origin;
} catch { startupValid = false; }

let renderer = null, sfxBridge = null, disposed = false, failed = false, ready = false;
let rafId = 0, rendererBusy = false, pendingDraw = null, disposePromise = null;
let running = true, lastWall = 0, simTime = 0, activeCause = null, nextCauseAt = 0, causeNumber = 0;
let controlsRevision = 0, sourceEnabled = true, observerEnabled = true;
let lastReceipt = null, frameRecords = [], causeHistory = [], errors = [], audioContext = null, audioMaster = null;
let audioUnlockedAt = null, userMuted = false;
let startupEnvelope = null, stage = 'child-document';
let canvasSizeDirty = false, sizeObserver = null;

// The preview fixture is intentionally generic. This metadata is only used by the
// root-owned WebGPU sample, is never accepted from callers, and is not exposed.
const VIEWER = 'preview-viewer';
const TARGET = Object.freeze({ id: 'preview-target', visible: true, hidden: false, inVent: false, ejected: false, invisible: false });
const NO_REDUCED_MOTION = false;

function report(nextStage, nextStatus, extra = {}) {
  stage = nextStage;
  startupEnvelope = Object.freeze({ schema: startup.schema, token: startup.token,
    versionId: VERSION, attemptEpoch: startup.attemptEpoch, sequence: ++startup.sequence,
    stage: nextStage, status: nextStatus, ...extra });
  startup.status = nextStatus;
  startup.ready = nextStatus === 'ready';
  if (startupValid && window.parent !== window) {
    try { window.parent.postMessage(startupEnvelope, location.origin); }
    catch (error) { recordError('startup-postmessage', error); }
  }
  return startupEnvelope;
}

function recordError(stageName, error) {
  const row = { stage: stageName, message: String(error?.message ?? error).slice(0, 1000), at: performance.now() };
  errors.push(row);
  if (errors.length > 24) errors.shift();
  errorNode.hidden = false;
  errorNode.textContent = `${stageName}: ${row.message}`;
}

function audioState() {
  return { context: audioContext, master: audioMaster, verify,
    muted: verify || userMuted, hidden: document.hidden,
    unlocked: !verify && audioContext?.state === 'running' && audioUnlockedAt !== null };
}

async function activateAudioFromGesture() {
  if (verify || disposed || failed || document.hidden) return false;
  try {
    if (!audioContext) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return false;
      audioContext = new AudioContextCtor();
      audioMaster = audioContext.createGain();
      audioMaster.gain.value = userMuted ? 0 : 0.38;
      audioMaster.connect(audioContext.destination);
    }
    await audioContext.resume();
    if (disposed || failed || document.hidden || audioContext.state !== 'running') return false;
    audioUnlockedAt = performance.now();
    return true;
  } catch (error) {
    recordError('sfx-unlock', error);
    return false;
  }
}

function visibleCanvasProof() {
  if (document.hidden || !canvas.isConnected) return false;
  const r = canvas.getBoundingClientRect(), style = getComputedStyle(canvas);
  return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight &&
    style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
}

// Keep currentness validation explicit while not exposing target or actor identities.
function validateVisibleCompletion(receipt) {
  const cause = activeCause;
  if (verify || disposed || failed || !ready || !running || document.hidden || !cause || !sourceEnabled || !visibleCanvasProof()) return false;
  const currentAge = simTime - cause.startedAtSim;
  return cause.id === receipt.causeId && cause.id === receipt.sourceId && causeNumber === receipt.causeOrdinal &&
    receipt.targetId === cause.target.id && receipt.frameId === `taser-contact-frame-${receipt.frame}` &&
    receipt.controlRevision === controlsRevision && receipt.sourceEnabled === true &&
    receipt.completed === true && receipt.visible === true && receipt.gpuCompletion?.status === 'completed' &&
    receipt.gpuCompletion.completedAtMs <= receipt.gpuCompletion.visibleAtMs &&
    receipt.sourceAgeAtVisibleMs <= 34 && currentAge >= 0 && currentAge < DURATION_MS &&
    lastReceipt?.frame === receipt.frame && lastReceipt?.causeOrdinal === causeNumber && lastReceipt?.completed === true;
}

sfxBridge = createTaserContactSfxBridge({
  isCurrentVisibleCompletion: validateVisibleCompletion,
  getAudioState: audioState,
  activateAudioFromGesture
});
window.__dvaGallerySfx = window.__gallerySfx = Object.freeze({
  activateFromGesture: () => sfxBridge.activateFromGesture(),
  snapshot: () => sfxBridge.snapshot(),
  setMuted(value) {
    userMuted = verify || Boolean(value);
    if (audioMaster) audioMaster.gain.value = userMuted ? 0 : 0.38;
    if (userMuted) stopVoices();
    return sfxBridge.snapshot();
  },
  stop: () => stopVoices()
});

const voices = new Set();
function stopVoices() {
  for (const voice of voices) {
    try { voice.source.stop(); } catch { /* already stopped */ }
    try { voice.source.disconnect(); } catch { /* cleanup */ }
    try { voice.gain.disconnect(); } catch { /* cleanup */ }
  }
  voices.clear();
}

function beginCause(atSimTime, atWallTime) {
  causeNumber++;
  const id = `${VERSION}-preview-${causeNumber}`;
  activeCause = { id, startedAtSim: atSimTime, startedAtWall: atWallTime,
    event: { kind: 'action-taser', variant: null, id, startedAt: atSimTime,
      x: canvas.width / 2, y: canvas.height / 2, targetId: TARGET.id }, target: TARGET };
  causeHistory.push(Object.freeze({ ordinal: causeNumber, startedAtMonotonicMs: atWallTime,
    startedAtSimulationMs: atSimTime, authoredDurationMs: DURATION_MS, authoredGapMs: LOOP_GAP_MS }));
  if (causeHistory.length > 16) causeHistory.shift();
  nextCauseAt = atSimTime + LOOP_PERIOD_MS;
}

function stepClock(now) {
  if (!Number.isFinite(now)) return;
  if (lastWall !== 0 && running && !document.hidden) simTime += Math.max(0, now - lastWall);
  lastWall = now;
  if (activeCause && simTime - activeCause.startedAtSim >= DURATION_MS) activeCause = null;
  if (running && !document.hidden && !activeCause && simTime >= nextCauseAt) beginCause(simTime, now);
}

function currentAdmission(now) {
  const cause = activeCause;
  if (!cause || !admitContact(cause.event, simTime, VIEWER, cause.target)) return null;
  return { cause, ageMs: simTime - cause.startedAtSim };
}

// Bind evidence to the immutable state captured when the GPU submission was made.
// The helper is pure so CPU tests can exercise hold/replay/control/dispose races.
export function bindSubmissionReceipt(receipt, submitted, current) {
  const sameControls = current.controlsRevision === submitted.controlRevision &&
    current.sourceEnabled === submitted.sourceEnabled && current.observerEnabled === submitted.observerEnabled;
  const sameCause = submitted.admitted
    ? current.causeOrdinal === submitted.causeOrdinal && current.causeId === submitted.causeId
    : current.causeOrdinal === null && current.causeId === null;
  const receiptAgeMatchesSubmission = Number.isFinite(receipt?.ageMs) && receipt.ageMs === submitted.ageMs;
  const currentAtCompletion = receipt?.completed === true && !current.disposed && !current.failed &&
    sameControls && sameCause && receiptAgeMatchesSubmission;
  return Object.freeze({
    causeOrdinal: submitted.causeOrdinal,
    submittedAgeMs: submitted.ageMs,
    receiptAgeMs: receipt?.ageMs ?? null,
    receiptAgeMatchesSubmission,
    admitted: submitted.admitted,
    sourceEnabled: submitted.sourceEnabled,
    observerEnabled: submitted.observerEnabled,
    controlRevision: submitted.controlRevision,
    controlRevisionMatchedAtCompletion: sameControls,
    causeMatchedAtCompletion: sameCause,
    currentAtCompletion
  });
}

function immutableSample(receipt, admission, now) {
  const proof = admission && receipt.currentAtCompletion && receipt.sourceEnabled && visibleCanvasProof();
  if (!proof) return null;
  const visibleAtMs = performance.now();
  const cause = admission.cause;
  return Object.freeze({
    eventType: 'action-taser', initialSeed: false, failed: false, duplicate: false,
    causeId: cause.id, sourceId: cause.id, targetId: cause.target.id,
    frameId: `taser-contact-frame-${receipt.frame}`, frame: receipt.frame,
    causeOrdinal: receipt.causeOrdinal, controlRevision: receipt.controlRevision,
    sourceEnabled: receipt.sourceEnabled, observerEnabled: receipt.observerEnabled,
    controlRevisionMatchedAtCompletion: receipt.controlRevisionMatchedAtCompletion,
    causeMatchedAtCompletion: receipt.causeMatchedAtCompletion,
    receiptAgeMatchesSubmission: receipt.receiptAgeMatchesSubmission,
    currentAtCompletion: receipt.currentAtCompletion,
    visible: true, completed: receipt.completed === true,
    sourceAgeAtVisibleMs: Math.max(0, Number.isFinite(receipt.receiptAgeMs) ? receipt.receiptAgeMs : admission.ageMs),
    gpuCompletion: Object.freeze({ status: receipt.completed === true ? 'completed' : 'unknown',
      completedAtMs: now, visibleAtMs }),
    segmentCount: receipt.segments, submittedAgeMs: receipt.ageMs
  });
}

function sanitizedReceipt(receipt) {
  if (!receipt) return null;
  return Object.freeze({ frame: receipt.frame, causeOrdinal: receipt.causeOrdinal,
    ageMs: receipt.submittedAgeMs, receiptAgeMs: receipt.receiptAgeMs,
    receiptAgeMatchesSubmission: receipt.receiptAgeMatchesSubmission,
    completed: receipt.completed, visible: receipt.visible,
    sourceEnabled: receipt.sourceEnabled, observerEnabled: receipt.observerEnabled,
    controlRevision: receipt.controlRevision,
    controlRevisionMatchedAtCompletion: receipt.controlRevisionMatchedAtCompletion,
    causeMatchedAtCompletion: receipt.causeMatchedAtCompletion,
    receiptAgeMatchesSubmission: receipt.receiptAgeMatchesSubmission,
    currentAtCompletion: receipt.currentAtCompletion,
    segments: receipt.segmentCount, completedAtMs: receipt.gpuCompletion?.completedAtMs ?? null,
    sourceAgeAtVisibleMs: receipt.sourceAgeAtVisibleMs ?? null, audioStarted: receipt.audioStarted === true });
}

function snapshot() {
  const admission = currentAdmission(simTime);
  const sfx = sfxBridge.snapshot();
  return Object.freeze({ schema: 'dva-taser-contact-preview/v1', version: VERSION,
    ready, failed, verify, stage, status: startupEnvelope?.status ?? 'pending',
    sequence: startup.sequence, loopDurationMs: DURATION_MS, interCauseGapMs: LOOP_GAP_MS,
    causeOrdinal: causeNumber, currentCauseActive: Boolean(admission), ageMs: admission?.ageMs ?? null,
    simulationTimeMs: simTime, nextCauseInMs: nextCauseAt > simTime ? nextCauseAt - simTime : 0,
    causeHistory: causeHistory.slice(),
    backingSize: { width: canvas.width, height: canvas.height },
    cssSize: (() => { const r = canvas.getBoundingClientRect(); return { width: r.width, height: r.height, dpr: devicePixelRatio || 1 }; })(),
    displayScale,
    controls: { source: sourceEnabled, observer: observerEnabled, running },
    controlsRevision,
    lastReceipt: sanitizedReceipt(lastReceipt),
    audioContextCreated: audioContext !== null,
    frameCount: frameRecords.length, frames: frameRecords.slice(-160),
    sfx, errors: errors.slice(), nativeClaims: Object.freeze({ qualityAccepted: false, ordinaryAudioListened: false, gameIntegrated: false, modelIdentity: 'unknown' })
  });
}

function publishFirstFrame(receipt, admission, completedAt) {
  const proof = immutableSample(receipt, admission, completedAt);
  if (!proof) throw new Error('First WebGPU frame did not have a connected, visible canvas and admitted preview contact');
  lastReceipt = proof;
  const firstFrame = Object.freeze({ recorded: true, submitted: true, completed: receipt.completed === true,
    canvasConnected: canvas.isConnected === true, passes: 2, viewportWidth: canvas.width,
    viewportHeight: canvas.height, submissionId: receipt.frame,
    causeId: proof.causeId, target: Object.freeze({ versionId: VERSION, submissionId: receipt.frame,
      causeOrdinal: proof.causeOrdinal, width: canvas.width, height: canvas.height }), ageMs: proof.submittedAgeMs });
  report('playing', 'ready', { firstFrame });
  ready = true;
}

function appendFrame(receipt, admission, completedAt) {
  let proof = admission && receipt.currentAtCompletion && receipt.sourceEnabled ? immutableSample(receipt, admission, completedAt) : null;
  let audioStarted = false;
  if (proof) lastReceipt = proof;
  if (proof && sfxBridge.snapshot().ready && audioUnlockedAt !== null && admission.cause.startedAtWall >= audioUnlockedAt) {
    const result = sfxBridge.accept(proof, audioState(), performance.now());
    if (result.started) {
      const voice = { source: result.source, gain: result.gain, causeId: result.causeId };
      voices.add(voice);
      result.source.addEventListener('ended', () => { voices.delete(voice); try { result.source.disconnect(); } catch {} try { result.gain.disconnect(); } catch {} }, { once: true });
      audioStarted = true;
    }
  }
  if (proof) { proof = Object.freeze({ ...proof, audioStarted }); lastReceipt = proof; }
  const row = Object.freeze({ frame: receipt.frame, causeOrdinal: receipt.causeOrdinal,
    ageMs: receipt.submittedAgeMs, receiptAgeMs: receipt.receiptAgeMs,
    completed: receipt.completed === true, segments: receipt.segments,
    source: receipt.sourceEnabled, observer: receipt.observerEnabled,
    sourceEnabled: receipt.sourceEnabled, observerEnabled: receipt.observerEnabled,
    controlRevision: receipt.controlRevision,
    controlRevisionMatchedAtCompletion: receipt.controlRevisionMatchedAtCompletion,
    causeMatchedAtCompletion: receipt.causeMatchedAtCompletion,
    receiptAgeMatchesSubmission: receipt.receiptAgeMatchesSubmission,
    currentAtCompletion: receipt.currentAtCompletion,
    atMs: completedAt, sourceAgeAtVisibleMs: proof?.sourceAgeAtVisibleMs ?? null,
    admitted: Boolean(admission), visible: Boolean(proof), audioStarted });
  frameRecords.push(row);
  if (frameRecords.length > 2048) frameRecords.shift();
  status.textContent = `接触 ${admission ? `${Math.round(admission.ageMs)} / ${DURATION_MS} ms` : `休止 · 次の接触まで ${Math.ceil(Math.max(0, nextCauseAt - simTime))} ms`} · ` +
    `ループ ${causeNumber} · 完了GPUフレーム ${receipt.frame} · 線分 ${receipt.segments} · ${verify ? 'verify 音声0固定' : sfxBridge.snapshot().ready ? '音声解錠済み（新しい接触から）' : '通常音は操作後に解錠'}`;
}

async function submitFrame(now, initial = false) {
  if (!renderer || rendererBusy || disposed || failed || document.hidden) return null;
  if (canvasSizeDirty) syncCanvasBacking();
  rendererBusy = true;
  const admission = currentAdmission(now);
  const submittedAge = admission?.ageMs ?? DURATION_MS;
  const controlRevision = controlsRevision;
  const submitted = Object.freeze({ ageMs: submittedAge, seed: admission ? causeNumber : 1, actorHeight: 64,
    causeOrdinal: admission ? causeNumber : null, causeId: admission?.cause.id ?? null,
    targetId: admission?.cause.target.id ?? null, admitted: Boolean(admission),
    controlRevision, sourceEnabled, observerEnabled });
  const options = { ageMs: submitted.ageMs, seed: submitted.seed, actorHeight: submitted.actorHeight,
    source: submitted.sourceEnabled, observer: submitted.observerEnabled, reducedMotion: NO_REDUCED_MOTION,
    center: [canvas.width / 2, canvas.height / 2] };
  pendingDraw = renderer.draw(options);
  try {
    const raw = await pendingDraw;
    if (!raw || disposed || failed) return null;
    const completedAt = performance.now();
    const completionState = { controlsRevision, sourceEnabled, observerEnabled,
      causeOrdinal: activeCause ? causeNumber : null, causeId: activeCause?.id ?? null, disposed, failed };
    const receipt = Object.freeze({ ...raw, ...bindSubmissionReceipt(raw, submitted, completionState) });
    if (initial) publishFirstFrame(receipt, admission, completedAt);
    else appendFrame(receipt, admission, completedAt);
    return receipt;
  } catch (error) {
    fail(error, 'gpu-submit');
    return null;
  } finally {
    pendingDraw = null;
    rendererBusy = false;
  }
}

function animationFrame(now) {
  if (disposed || failed) return;
  stepClock(now);
  void submitFrame(now);
  rafId = requestAnimationFrame(animationFrame);
}

function fail(error, phase = stage || 'pipelines') {
  if (failed || disposed) return;
  failed = true;
  ready = false;
  running = false;
  stopVoices();
  const row = { stage: phase, message: String(error?.message ?? error).slice(0, 1000), at: performance.now() };
  errors.push(row);
  if (errors.length > 24) errors.shift();
  errorNode.hidden = false;
  errorNode.textContent = `${phase}: ${row.message}`;
  const errorStage = ['child-document','adapter','device','assets','pipelines','first-frame','playing'].includes(stage) ? stage : 'pipelines';
  report(errorStage, 'error', {
    error: { code: phase.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 64), message: row.message }
  });
  cancelAnimationFrame(rafId);
}

function setSourceObserver({ source, observer } = {}) {
  if (disposed || failed) return false;
  if (source !== undefined && typeof source !== 'boolean') throw new TypeError('source must be boolean');
  if (observer !== undefined && typeof observer !== 'boolean') throw new TypeError('observer must be boolean');
  const nextSource = source === undefined ? sourceEnabled : source;
  const nextObserver = observer === undefined ? observerEnabled : observer;
  if (nextSource !== sourceEnabled || nextObserver !== observerEnabled) {
    sourceEnabled = nextSource; observerEnabled = nextObserver; controlsRevision++;
    sourceInput.checked = sourceEnabled; observerInput.checked = observerEnabled;
    if (!sourceEnabled) stopVoices();
  }
  return true;
}

function replay() {
  if (disposed || failed) return false;
  stepClock(performance.now());
  stopVoices();
  activeCause = null; simTime = 0; nextCauseAt = 0; lastWall = performance.now();
  running = true; beginCause(simTime, lastWall);
  return true;
}

function pause() {
  if (disposed || failed) return false;
  stepClock(performance.now());
  running = !running; lastWall = performance.now();
  if (!running) stopVoices();
  document.getElementById('pause').textContent = running ? '停止' : '再開';
  return running;
}

function hold(ms) {
  if (!Number.isFinite(ms) || ms < 0 || ms >= DURATION_MS) throw new RangeError('hold age must be within the 480ms authored lifetime');
  stopVoices(); running = false; simTime = 0; lastWall = performance.now();
  beginCause(0, lastWall); simTime = ms;
  return snapshot();
}

async function dispose() {
  if (disposePromise) return disposePromise;
  disposed = true; ready = false; running = false; activeCause = null;
  cancelAnimationFrame(rafId); stopVoices();
  sizeObserver?.disconnect(); sizeObserver = null;
  disposePromise = (async () => {
    if (pendingDraw) { try { await pendingDraw; } catch {} }
    const owned = renderer; renderer = null;
    try { await owned?.dispose?.(); } catch (error) { recordError('renderer-dispose', error); }
    if (audioContext) {
      try { await audioContext.close(); } catch (error) { recordError('audio-close', error); }
    }
    report('playing', 'cancelled');
  })();
  return disposePromise;
}

window.__taserContactPreview = Object.freeze({
  snapshot,
  setSourceObserver,
  compareBothOff: () => setSourceObserver({ source: false, observer: false }),
  compareBothOn: () => setSourceObserver({ source: true, observer: true }),
  replay, pause, hold, dispose,
  // The inspector returns no action payload, actor identifier, or target identifier.
  get privacyContract() { return Object.freeze({ acceptsExternalEventPayloads: false, exposesActorOrTargetIdentity: false }); }
});
window.__dvaGalleryStartupSnapshot = () => startupEnvelope;
window.addEventListener('message', event => {
  const data = event?.data;
  if (!startupValid || event.origin !== location.origin || event.source !== window.parent ||
      data?.schema !== 'dva-gallery-startup/v1' || data.action !== 'retire' ||
      data.token !== startup.token || data.versionId !== VERSION || data.attemptEpoch !== startup.attemptEpoch) return;
  void dispose();
});
window.addEventListener('pagehide', () => { void dispose(); }, { once: true });
document.addEventListener('visibilitychange', () => {
  lastWall = performance.now();
  if (document.hidden) { running = false; activeCause = null; stopVoices(); }
  else if (!disposed && !failed) replay();
});

document.getElementById('replay').addEventListener('click', replay);
document.getElementById('pause').addEventListener('click', pause);
document.getElementById('sound').addEventListener('click', async () => {
  if (verify) return;
  const result = await sfxBridge.activateFromGesture();
  status.textContent = result.ok ? '音声を解錠しました。再生は次の新しい接触の完了フレームからです。' : `音声を開始できません: ${result.reason}`;
});
sourceInput.addEventListener('change', () => setSourceObserver({ source: sourceInput.checked }));
observerInput.addEventListener('change', () => setSourceObserver({ observer: observerInput.checked }));
document.getElementById('bothOff').addEventListener('click', () => setSourceObserver({ source: false, observer: false }));
document.getElementById('bothOn').addEventListener('click', () => setSourceObserver({ source: true, observer: true }));
if (verify) {
  const button = document.getElementById('sound'); button.disabled = true; button.textContent = 'verify: 音声0固定';
  userMuted = true;
}

async function initialize() {
  report('child-document', 'pending');
  try {
    syncCanvasBacking();
    sizeObserver = new ResizeObserver(() => { updateGalleryDisplayScale(); canvasSizeDirty = true; });
    sizeObserver.observe(canvas);
    report('adapter', 'pending');
    renderer = await createContactRenderer(canvas);
    renderer.device.addEventListener?.('uncapturederror', event => fail(event.error || 'WebGPU uncaptured error', 'gpu-error'));
    void renderer.device.lost?.then(info => { if (!disposed) fail(`WebGPU device lost (${info?.reason ?? 'unknown'}): ${info?.message ?? ''}`, 'device-lost'); });
    report('pipelines', 'pending');
    stepClock(performance.now());
    if (!activeCause) beginCause(simTime, performance.now());
    report('first-frame', 'pending');
    const first = await submitFrame(performance.now(), true);
    if (!first || failed || disposed || !startup.ready) return;
    rafId = requestAnimationFrame(animationFrame);
  } catch (error) { fail(error, 'adapter'); }
}

void initialize();

function syncCanvasBacking() {
  if (rendererBusy) { canvasSizeDirty = true; return; }
  const width = Math.round(canvas.clientWidth), height = Math.round(canvas.clientHeight);
  if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
    canvas.width = width; canvas.height = height;
  }
  canvasSizeDirty = false;
}
