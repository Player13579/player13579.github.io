import { VERSION_ID as EFFECT_VERSION, DURATION_MS as EFFECT_DURATION_MS, SFX_OFFSET_MS as EFFECT_SFX_OFFSET_MS,
  SFX_DURATION_MS as EFFECT_SFX_DURATION_MS, synthesizeSfx, createRenderer } from './effect.mjs';
import { VERSION, DURATION_MS, LOOP_GAP_MS, SFX_OFFSET_MS, SFX_DURATION_MS,
  parseStartupIdentity, parsePackagePins, RUNTIME_CLOSURE, verifyPackageClosure,
  validateRetireMessage, EpisodeClock, completionStillCurrent, eligibleFirstFrame, AudioVoiceGate } from './host-core.mjs';

if (EFFECT_VERSION !== VERSION || EFFECT_DURATION_MS !== DURATION_MS ||
    EFFECT_SFX_OFFSET_MS !== SFX_OFFSET_MS || EFFECT_SFX_DURATION_MS !== SFX_DURATION_MS) {
  throw new Error('Effect and neutral-host contract pins do not match');
}

const canvas = document.getElementById('surface');
const errorNode = document.getElementById('error');
const stateNode = document.getElementById('state');
const params = new URLSearchParams(location.search);
const verify = params.has('verify');
const actorAsset = new URL('./body.png', import.meta.url);
const ACTOR_CELL = Object.freeze({ x: 60, y: 18, width: 134, height: 222 });
const EXPECTED_BODY_SHA256 = 'cf3df51d88129ad51e175dd894ef2c269626a2d60fec912289789e099d8fcb8f';
const SOURCE_VERSION_ID = 'overheal-benefit-cleanroom-sol61-r5';
const BG_CLEAR = Object.freeze({ r: 0, g: 0, b: 0, a: 0 });
let canvasContext = null;

const startup = parseStartupIdentity({ search: location.search, origin: location.origin, parentIsSelf: window.parent === window });
let sequence = 0;
let parentControlSequence = 0;
let startupStage = 'child-document';
let startupReady = false;
let retired = false;
let disposing = false;
let disposed = false;
let failureText = null;
let device = null;
let deviceLostInfo = null;
let deviceLostPromise = null;
let deviceDestroyCalled = false;
let renderer = null;
let actorTexture = null;
let actorBitmap = null;
let format = null;
let audioContext = null;
let audioBuffer = null;
let audioGate = null;
let lastAudioActivation = null;
let rafId = null;
let generation = 0;
let submissions = 0;
let completions = 0;
let clearPassCount = 0;
let effectPassCount = 0;
let pendingWork = 0;
let queueFence = Promise.resolve();
let initializationTask = null;
let disposalTask = null;
let retirementErrors = [];
let contextConfigured = false;
let startupSnapshot = null;
let packageClosure = null;
let firstFramePending = false;
let holdRequestSerial = 0;
let firstFrame = null;
let lastVerificationFrame = null;
let lastReceipt = null;
let lastFrame = null;
let currentCauseId = null;
let causeStartedAt = null;
let causeCompletionSeen = new Set();
let latestControls = Object.freeze({ sourceOn: true, mainOn: true, observerOn: true, showActor: true, reducedMotion: false, direction: 1 });
let verificationHold = false;
let verificationOptions = null;
const clock = new EpisodeClock();
const startedAt = performance.now();

function message(stage, status, extra = {}) {
  startupStage = stage;
  if (!startup) return false;
  const payload = { schema: 'dva-gallery-startup/v1', token: startup.token,
    versionId: VERSION, attemptEpoch: startup.attemptEpoch, sequence: ++sequence,
    stage, status, ...extra };
  startupSnapshot = Object.freeze(payload);
  try { window.parent.postMessage(payload, startup.origin); return true; }
  catch (error) { retirementErrors.push(`startup message failed: ${String(error?.message || error)}`); return false; }
}

function invalidateFrames() {
  generation += 1;
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}

function isSupersededHeldFrame(error) { return error?.code === 'DVA_HELD_FRAME_SUPERSEDED'; }

function supersededHeldFrameError(messageText) { const error = new Error(messageText); error.code = 'DVA_HELD_FRAME_SUPERSEDED'; return error; }

function showFailure(error, stage = startupStage) {
  if (failureText || disposed) return;
  failureText = `${stage}: ${error?.message || String(error)}`;
  firstFramePending = false;
  errorNode.textContent = failureText;
  errorNode.hidden = false;
  stateNode.value = 'failed';
  invalidateFrames();
  audioGate?.stopAll('failure');
  if (startup) message(stage, 'error', { error: { code: 'OVERHEAL_HOST_FAILURE', message: failureText } });
}

function viewport() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  if (![rect.width, rect.height, dpr].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0 || dpr <= 0) return null;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  return Object.freeze({ width, height, dpr, cssWidth: rect.width, cssHeight: rect.height });
}

function surfaceIsCurrent() {
  const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio;
  return Number.isFinite(rect.width) && Number.isFinite(rect.height) && Number.isFinite(dpr) && rect.width > 0 && rect.height > 0 && dpr > 0 &&
    canvas.width === Math.max(1, Math.round(rect.width * dpr)) && canvas.height === Math.max(1, Math.round(rect.height * dpr));
}

function normalizeOptions(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  const result = { ...latestControls };
  for (const key of ['sourceOn', 'mainOn', 'observerOn', 'showActor', 'reducedMotion']) {
    if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new TypeError(`${key} must be boolean`);
    if (options[key] !== undefined) result[key] = options[key];
  }
  if (options.direction !== undefined && options.direction !== 1 && options.direction !== -1) throw new RangeError('direction must be 1 or -1');
  if (options.direction !== undefined) result.direction = options.direction;
  return Object.freeze(result);
}

function currentEpisode(ageMs, inGap) {
  const loop = clock.loop;
  const causeId = `${VERSION}:positive-preview-${loop}`;
  if (causeId !== currentCauseId) {
    currentCauseId = causeId;
    causeStartedAt = performance.now() - Math.max(0, Math.min(DURATION_MS, ageMs));
  }
  const sourceOn = latestControls.sourceOn && !inGap && ageMs < DURATION_MS;
  return { causeId, sourceOn, mainOn: latestControls.mainOn && sourceOn, sourcePositive: true };
}

function clearThenRender(size, ageMs, controls, episode) {
  const encoder = device.createCommandEncoder({ label: `${VERSION} frame ${submissions + 1}` });
  const view = canvasContext.getCurrentTexture().createView();
  const clear = encoder.beginRenderPass({ colorAttachments: [{ view, clearValue: BG_CLEAR, loadOp: 'clear', storeOp: 'store' }] });
  clear.end();
  clearPassCount += 1;
  const effect = renderer.render({ encoder, view, width: size.width, height: size.height, dpr: size.dpr,
    actorCenterCss: [490, 380], actorHeightCss: 64, ageMs,
    sourceOn: episode.sourceOn, mainOn: episode.mainOn, observerOn: controls.observerOn,
    showActor: controls.showActor, reducedMotion: controls.reducedMotion, direction: controls.direction });
  if (!effect || !Number.isSafeInteger(effect.passes) || effect.passes < 0 || typeof effect.active !== 'boolean' || typeof effect.phase !== 'string') {
    throw new Error('Renderer returned an invalid frame receipt');
  }
  effectPassCount += effect.passes;
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
  const submissionId = ++submissions;
  const frame = Object.freeze({ recorded: true, submitted: true, completed: false, sourceVersionId: SOURCE_VERSION_ID, submissionId,
    causeId: episode.causeId, ageMs, phase: effect.phase, active: effect.active,
    sourceOn: episode.sourceOn, mainOn: episode.mainOn, observerOn: controls.observerOn,
    showActor: controls.showActor, reducedMotion: controls.reducedMotion, direction: controls.direction,
    clearPasses: 1, effectPasses: effect.passes, passes: 1 + effect.passes,
    viewportWidth: size.width, viewportHeight: size.height, dpr: size.dpr,
    cssWidth: size.cssWidth, cssHeight: size.cssHeight, canvasConnected: canvas.isConnected === true,
    generation, sourcePositive: episode.sourcePositive, fixtureKind: 'positive-overheal-gallery-preview' });
  lastFrame = frame;
  return { frame, effect };
}

function queueFrameCompletion(frame, submittedAt) {
  pendingWork += 1;
  const task = Promise.resolve().then(() => device.queue.onSubmittedWorkDone()).then(() => {
    completions += 1;
    const now = performance.now();
    const completionAge = frame.ageMs + Math.max(0, now - submittedAt);
    const stillCurrent = completionStillCurrent({ generation: frame.generation, currentGeneration: generation,
      disposed, retired, hidden: document.hidden, connected: canvas.isConnected === true,
      surfaceCurrent: surfaceIsCurrent() && canvas.width === frame.viewportWidth && canvas.height === frame.viewportHeight && window.devicePixelRatio === frame.dpr, sourceOn: frame.sourceOn, mainOn: frame.mainOn,
      active: frame.active, ageMs: completionAge });
    if (!stillCurrent) return;
    const completed = Object.freeze({ ...frame, sourceVersionId: SOURCE_VERSION_ID, completed: true, completedAt: now, completedAtMs: now, ageMsAtCompletion: completionAge, sourceOriginMs: causeStartedAt, sourceDurationMs: DURATION_MS, submittedAtMs: submittedAt, viewport: Object.freeze({ width: frame.viewportWidth, height: frame.viewportHeight, dpr: frame.dpr }), canvasConnected: canvas.isConnected === true, passes: frame.passes, generation: frame.generation });
    lastReceipt = completed;
    if (startup && !startupReady && eligibleFirstFrame(completed, { currentGeneration: generation, surfaceCurrent: canvas.isConnected === true && surfaceIsCurrent() && canvas.width === frame.viewportWidth && canvas.height === frame.viewportHeight && window.devicePixelRatio === frame.dpr })) {
      startupReady = true;
      firstFramePending = false;
      firstFrame = completed;
      stateNode.value = 'ready';
      message('playing', 'ready', { firstFrame: { ...completed, recorded: true, submitted: true, completed: true, canvasConnected: true, sourceVersionId: VERSION, effectPassCompleted: frame.effectPasses > 0 } });
    }
    if (!causeCompletionSeen.has(frame.causeId)) {
      causeCompletionSeen.add(frame.causeId);
      audioGate?.acceptCompletedCause({ causeId: frame.causeId, sourcePositive: frame.sourcePositive,
        sourceOn: frame.sourceOn, mainOn: frame.mainOn, active: frame.active, ageMs: completionAge,
        generationCurrent: frame.generation === generation, hidden: document.hidden, disposed, retired });
    }
  }).catch(error => {
    if (!disposed && !retired) showFailure(error, 'playing-fence');
  }).finally(() => {
    pendingWork = Math.max(0, pendingWork - 1);
    if (queueFence === task) queueFence = Promise.resolve();
    enqueueFrame();
  });
  queueFence = task;
}

function drawFrame(frameGeneration) {
  if (disposed || disposing || retired || failureText || document.hidden || !renderer || !device) return;
  try {
    const now = performance.now();
    if (clock.lastNow === null) clock.start(now);
    const snapshot = clock.tick(now);
    const ageMs = snapshot.elapsedMs;
    const episode = currentEpisode(ageMs, snapshot.inGap);
    if (!episode.sourceOn || !episode.mainOn || ageMs >= DURATION_MS) audioGate?.stopAll('source-main-off-or-expiry');
    const size = viewport();
    if (!size) return;
    const { frame } = clearThenRender(size, ageMs, latestControls, episode);
    const tagged = Object.freeze({ ...frame, generation: frameGeneration });
    const submittedAt = performance.now();
    queueFrameCompletion(tagged, submittedAt);
  } catch (error) { showFailure(error, 'playing'); }
}

function enqueueFrame() {
  if (disposed || disposing || retired || failureText || document.hidden || !renderer || !device || verificationHold || rafId !== null || pendingWork > 0) return;
  const frameGeneration = generation;
  const id = requestAnimationFrame(() => {
    if (rafId === id) rafId = null;
    if (frameGeneration !== generation) return;
    drawFrame(frameGeneration);
  });
  rafId = id;
}

function verificationOptionsFrom(options) { return normalizeOptions(options); }

async function holdAt(ageMs, options = {}) {
  if (!verify) throw new Error('hold is available only with ?verify');
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > DURATION_MS) throw new RangeError(`ageMs must be in 0..${DURATION_MS}`);
  if (disposed || disposing || retired || failureText || document.hidden || !renderer || !device) throw new Error('preview is unavailable');
  const ticket = ++holdRequestSerial;
  verificationOptions = verificationOptionsFrom(options);
  latestControls = verificationOptions;
  verificationHold = true;
  invalidateFrames();
  audioGate?.stopAll('verification-hold');
  await queueFence;
  await device.queue.onSubmittedWorkDone();
  if (ticket !== holdRequestSerial) throw supersededHeldFrameError('hold superseded before submission');
  if (disposed || disposing || retired || document.hidden) throw new Error('hold invalidated before submission');
  const size = viewport();
  if (!size) throw new Error('viewport has no drawable area');
  clock.hold(ageMs, performance.now());
  const snapshot = clock.snapshot();
  const episode = currentEpisode(ageMs, false);
  if (!episode.sourceOn || !episode.mainOn || ageMs >= DURATION_MS) audioGate?.stopAll('source-main-off-or-expiry');
  const { frame } = clearThenRender(size, ageMs, verificationOptions, episode);
  const frameGeneration = generation;
  const submittedAt = performance.now();
  pendingWork += 1;
  const heldFence = Promise.resolve().then(() => device.queue.onSubmittedWorkDone()).then(() => {
    completions += 1;
  }).finally(() => {
    pendingWork = Math.max(0, pendingWork - 1);
    if (queueFence === heldFence) queueFence = Promise.resolve();
  });
  queueFence = heldFence;
  await heldFence;
  if (ticket !== holdRequestSerial || frameGeneration !== generation) throw supersededHeldFrameError('held frame completed after a newer hold or generation');
  if (disposed || retired || document.hidden) throw new Error('held frame completed after preview became unavailable');
  if (!canvas.isConnected || !surfaceIsCurrent() || canvas.width !== frame.viewportWidth || canvas.height !== frame.viewportHeight || window.devicePixelRatio !== frame.dpr) throw supersededHeldFrameError('held frame completed on a stale surface or generation');
  lastVerificationFrame = Object.freeze({ ...frame, completed: true, completedAt: performance.now(),
    ageMsAtCompletion: ageMs, lifecycleEpoch: frameGeneration, sourceClock: snapshot,
    queueCompletionObserved: true, hardMuted: true, submittedAt, targetPreservedOnResize: true });
  lastFrame = lastVerificationFrame;
  return lastVerificationFrame;
}

function resumePlayback() {
  if (!verify) throw new Error('resume is available only with ?verify');
  if (disposed || disposing || retired || failureText || document.hidden || !renderer) return false;
  latestControls = verificationOptions || latestControls;
  verificationOptions = null;
  verificationHold = false;
  clock.resume(performance.now());
  enqueueFrame();
  return true;
}

function replayFromZero() {
  if (disposed || disposing || retired || failureText || document.hidden || !renderer) return false;
  invalidateFrames();
  audioGate?.stopAll('replay');
  verificationOptions = null;
  verificationHold = false;
  clock.replay(performance.now());
  currentCauseId = null;
  lastReceipt = null;
  lastVerificationFrame = null;
  enqueueFrame();
  return true;
}

function setOptions(options = {}) {
  if (disposed || disposing || retired || failureText) return false;
  latestControls = normalizeOptions(options);
  if (!latestControls.sourceOn || !latestControls.mainOn) audioGate?.stopAll('source-or-main-disabled');
  invalidateFrames();
  if (verificationHold && verify) return holdAt(clock.elapsedMs, latestControls).then(() => true).catch(error => { if (!disposed && !retired && !isSupersededHeldFrame(error)) showFailure(error, 'verification-hold'); return false; });
  enqueueFrame();
  return true;
}

async function activateFromGesture(item) {
  if (verify) return Object.freeze({ state: 'silent', reason: 'verification hard-mute' });
  if (disposed || disposing || retired || failureText || document.hidden) return Object.freeze({ state: 'unavailable', reason: 'preview not active' });
  if (!audioGate) return Object.freeze({ state: 'unsupported', reason: 'audio unavailable' });
  lastAudioActivation = audioGate.activateFromGesture();
  return lastAudioActivation;
}

window.__gallerySfx = Object.freeze({ activateFromGesture });
window.__dvaOverhealGallery = {
  version: VERSION, verify, durationMs: DURATION_MS, loopGapMs: LOOP_GAP_MS,
  get frames() { return submissions; }, get completions() { return completions; },
  get elapsedMs() { return clock.elapsedMs; }, get loop() { return clock.loop; },
  get lastFrame() { return lastFrame; }, get lastReceipt() { return lastReceipt; },
  get lastVerificationFrame() { return lastVerificationFrame; }, get firstFrame() { return firstFrame; },
  get firstFramePending() { return firstFramePending; }, get startupSnapshot() { return startupSnapshot; },
  get packageClosure() { return packageClosure; },
  get failure() { return failureText; }, get disposed() { return disposed; }, get retired() { return retired; },
  get audio() { return audioGate?.snapshot() || Object.freeze({ verify, hardMuted: verify, activeVoices: 0, contextState: 'absent' }); },
  get resources() { return Object.freeze({ deviceOwned: Boolean(device), rendererOwned: Boolean(renderer), actorTextureOwned: Boolean(actorTexture), pendingWork, submissions, completions, clearPassCount, effectPassCount }); },
  hold: holdAt, resume: resumePlayback, replay: replayFromZero, setOptions, dispose
};

function onRetire(event) {
  if (!startup || event?.source !== window.parent || !validateRetireMessage(event, startup, parentControlSequence)) return;
  if (Number.isSafeInteger(event.data.sequence)) parentControlSequence = event.data.sequence;
  retired = true;
  verificationHold = true;
  void retireAndReport();
}

async function retireAndReport() {
  try {
    const lifecycle = await dispose();
    message(startupStage, 'cancelled', { action: 'retired', lifecycle });
  } catch (error) {
    retirementErrors.push(String(error?.message || error));
    message(startupStage, 'error', { action: 'retire-error', lifecycle: { disposeSettled: false,
      teardown: 'failed', deviceLifecycle: 'unconfirmed', retirementErrors: [...retirementErrors] } });
  }
}

function onVisibilityChange() {
  if (disposed || disposing || retired) return;
  if (document.hidden) {
    invalidateFrames();
    audioGate?.stopAll('hidden');
    const now = performance.now();
    clock.hold(clock.elapsedMs, now);
  } else {
    clock.resume(performance.now());
    enqueueFrame();
  }
}

function onResize() {
  if (!disposed && !disposing && !retired && !document.hidden) {
    if (verify && verificationHold) {
      void holdAt(clock.elapsedMs, verificationOptions || latestControls).catch(error => { if (!isSupersededHeldFrame(error)) showFailure(error, 'verification-resize'); });
    } else {
      invalidateFrames();
      enqueueFrame();
    }
  }
}

async function clearBaselineAndDrain() {
  if (!device || !contextConfigured || !canvas.isConnected || deviceLostInfo) return;
  const size = viewport();
  if (!size) return;
  const encoder = device.createCommandEncoder({ label: `${VERSION} final baseline clear` });
  const view = canvasContext.getCurrentTexture().createView();
  const pass = encoder.beginRenderPass({ colorAttachments: [{ view, clearValue: BG_CLEAR, loadOp: 'clear', storeOp: 'store' }] });
  pass.end();
  device.queue.submit([encoder.finish()]);
  submissions += 1; clearPassCount += 1; pendingWork += 1;
  try { await device.queue.onSubmittedWorkDone(); completions += 1; }
  finally { pendingWork = Math.max(0, pendingWork - 1); }
}

function dispose() {
  if (disposalTask) return disposalTask;
  disposing = true;
  firstFramePending = false;
  invalidateFrames();
  audioGate?.stopAll(retired ? 'retired' : 'disposed');
  window.removeEventListener('message', onRetire);
  window.removeEventListener('resize', onResize);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  disposalTask = (async () => {
    try { await initializationTask; } catch {}
    try { await queueFence; } catch (error) { retirementErrors.push(`frame drain: ${String(error?.message || error)}`); }
    try { await device?.queue?.onSubmittedWorkDone?.(); } catch (error) { retirementErrors.push(`queue drain: ${String(error?.message || error)}`); }
    try { await clearBaselineAndDrain(); } catch (error) { retirementErrors.push(`baseline clear: ${String(error?.message || error)}`); }
    audioGate?.dispose();
    try { await renderer?.dispose?.(); } catch (error) { retirementErrors.push(`renderer dispose: ${String(error?.message || error)}`); }
    const rendererResources = Object.freeze({ ...(renderer?.resources || {}) });
    try { actorTexture?.destroy?.(); } catch (error) { retirementErrors.push(`actor texture destroy: ${String(error?.message || error)}`); }
    try { actorBitmap?.close?.(); } catch {}
    if (contextConfigured) { try { canvasContext.unconfigure(); contextConfigured = false; } catch (error) { retirementErrors.push(`context unconfigure: ${String(error?.message || error)}`); } }
    if (audioContext && audioContext.state !== 'closed') {
      try { await audioContext.close(); } catch (error) { retirementErrors.push(`audio close: ${String(error?.message || error)}`); }
    }
    const ownedDevice = device;
    if (ownedDevice && !deviceDestroyCalled) {
      try { ownedDevice.destroy(); deviceDestroyCalled = true; } catch (error) { retirementErrors.push(`device destroy: ${String(error?.message || error)}`); }
    }
    if (deviceLostPromise) {
      try { deviceLostInfo = await deviceLostPromise; } catch (error) { retirementErrors.push(`device loss settle: ${String(error?.message || error)}`); }
    }
    const audioSnapshot = audioGate?.snapshot() || Object.freeze({ activeVoices: 0, contextState: audioContext?.state || 'absent' });
    renderer = null; actorTexture = null; actorBitmap = null; audioBuffer = null; audioContext = null; audioGate = null;
    disposed = true;
    const reason = deviceLostInfo?.reason || null;
    const noDeviceCreated = !ownedDevice && !deviceLostPromise;
    const destroyed = reason === 'destroyed' && deviceDestroyCalled && !retirementErrors.length;
    const retirementSettled = (noDeviceCreated || destroyed) && pendingWork === 0 && !contextConfigured && !retirementErrors.length;
    const lifecycle = Object.freeze({ disposeSettled: true, teardown: 'disposed',
      deviceLifecycle: noDeviceCreated ? 'not-created-settled' : destroyed ? 'destroyed-loss-settled' : 'unconfirmed',
      device: Object.freeze({ status: noDeviceCreated ? 'not-created' : destroyed ? 'destroyed-loss-settled' : 'unconfirmed',
        drained: pendingWork === 0, destroyCalled: deviceDestroyCalled, lostReason: reason }),
      contextUnconfigured: !contextConfigured, canvasConnected: canvas.isConnected === true,
      audio: Object.freeze({ contextState: audioSnapshot.contextState || 'closed', activeVoices: audioSnapshot.activeVoices || 0,
        disposeSettled: true }), rendererResources,
      pendingWork, submitted: submissions, completed: completions,
      retirementErrors: Object.freeze([...retirementErrors]) });
    if (retired && !retirementSettled) throw new Error('Retirement did not prove queue drain and complete teardown');
    device = null;
    return lifecycle;
  })();
  return disposalTask;
}

async function loadActorTexture() {
  const response = await fetch(actorAsset, { cache: 'no-store' });
  if (disposing || retired) return 0;
  if (!response.ok) throw Object.assign(new Error(`Neutral actor fixture HTTP ${response.status}`), { startupStage: 'assets' });
  const bytes = await response.arrayBuffer();
  if (disposing || retired) return 0;
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
  if (disposing || retired) return 0;
  if (digest !== EXPECTED_BODY_SHA256) throw Object.assign(new Error(`Neutral actor fixture hash mismatch: ${digest}`), { startupStage: 'assets' });
  const blob = new Blob([bytes], { type: 'image/png' });
  actorBitmap = await createImageBitmap(blob, ACTOR_CELL.x, ACTOR_CELL.y, ACTOR_CELL.width, ACTOR_CELL.height,
    { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  if (disposing || retired) { actorBitmap.close(); actorBitmap = null; return 0; }
  actorTexture = device.createTexture({ label: 'neutral registered character fixture rgba8unorm',
    size: [ACTOR_CELL.width, ACTOR_CELL.height, 1], format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
  device.pushErrorScope('validation');
  let uploadScopePopStarted = false;
  try {
    device.queue.copyExternalImageToTexture({ source: actorBitmap }, { texture: actorTexture, premultipliedAlpha: false }, [ACTOR_CELL.width, ACTOR_CELL.height, 1]);
    uploadScopePopStarted = true;
    const uploadValidationError = await device.popErrorScope();
    if (uploadValidationError) throw new Error(uploadValidationError.message || String(uploadValidationError));
  } catch (error) {
    if (!uploadScopePopStarted) { uploadScopePopStarted = true; try { await device.popErrorScope(); } catch {} }
    try { actorTexture?.destroy?.(); } catch {}
    actorTexture = null;
    throw Object.assign(new Error('Actor texture upload validation failed: ' + (error?.message || String(error))), { startupStage: 'assets' });
  } finally {
    try { actorBitmap?.close?.(); } finally { actorBitmap = null; }
  }
  return 1;
}

async function preflightPackage() {
  try {
    const pins = parsePackagePins({ search: location.search, pathname: new URL('.', import.meta.url).pathname });
    const loadBytes = async path => {
      const expectedUrl = new URL(path, import.meta.url);
      const response = await fetch(expectedUrl, { cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
      if (!response.ok) throw new Error(`${path} fetch returned HTTP ${response.status}`);
      const finalUrl = new URL(response.url);
      if (finalUrl.origin !== expectedUrl.origin || finalUrl.pathname !== expectedUrl.pathname) throw new Error(`${path} resolved to an unexpected URL`);
      return new Uint8Array(await response.arrayBuffer());
    };
    const [packageManifestBytes, sealBytes, sourceManifestBytes, ...runtimeFiles] = await Promise.all([
      loadBytes('package-manifest.json'), loadBytes('package-seal.json'), loadBytes('source-manifest.json'),
      ...RUNTIME_CLOSURE.map(async path => ({ path, bytes: await loadBytes(path) }))
    ]);
    return await verifyPackageClosure({ pins, packageManifestBytes, sealBytes, sourceManifestBytes, runtimeFiles });
  } catch (error) { throw Object.assign(new Error(`pinned package preflight failed: ${error?.message || String(error)}`), { startupStage: 'package' }); }
}

function makeAudio() {
  if (verify || typeof AudioContext !== 'function') {
    audioGate = new AudioVoiceGate({ verify, context: null, buffer: null });
    return;
  }
  const sampleRate = 48000;
  const samples = synthesizeSfx(sampleRate);
  if (!(samples instanceof Float32Array) || samples.length === 0 || [...samples].some(v => !Number.isFinite(v))) throw new Error('SFX synthesis did not return finite mono Float32Array data');
  if (Math.abs(samples.length / sampleRate * 1000 - SFX_DURATION_MS) > 1.5) throw new Error('SFX buffer does not match its finite declared duration');
  audioContext = new AudioContext({ sampleRate });
  audioBuffer = audioContext.createBuffer(1, samples.length, sampleRate);
  audioBuffer.copyToChannel(samples, 0);
  audioGate = new AudioVoiceGate({ verify: false, context: audioContext, buffer: audioBuffer,
    offsetMs: SFX_OFFSET_MS, durationMs: SFX_DURATION_MS });
}

async function initialize() {
  if (startup) message('child-document', 'pending');
  try {
    packageClosure = await preflightPackage();
    if (disposing || retired) return;
    canvasContext = canvas.getContext('webgpu');
    if (!canvasContext) throw Object.assign(new Error('WebGPU canvas context is unavailable'), { startupStage: 'adapter' });
    if (!navigator.gpu) throw Object.assign(new Error('WebGPU is unavailable'), { startupStage: 'adapter' });
    message('adapter', 'pending');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Object.assign(new Error('No WebGPU adapter is available'), { startupStage: 'adapter' });
    if (disposing || retired) return;
    message('device', 'pending');
    device = await adapter.requestDevice();
    deviceLostPromise = Promise.resolve(device.lost).then(info => {
      deviceLostInfo = info;
      if (!disposed && !disposing && !retired && info?.reason !== 'destroyed') showFailure(new Error(`WebGPU device lost: ${info?.reason || 'unknown'}`), 'device-lost');
      return info;
    });
    if (disposing || retired) { try { device.destroy(); deviceDestroyCalled = true; } catch (error) { retirementErrors.push(`early device destroy: ${String(error?.message || error)}`); } return; }
    message('assets', 'pending');
    const actorCount = await loadActorTexture();
    if (disposing || retired) return;
    format = navigator.gpu.getPreferredCanvasFormat();
    canvasContext.configure({ device, format, alphaMode: 'premultiplied' });
    contextConfigured = true;
    makeAudio();
    message('pipelines', 'pending');
    renderer = await createRenderer({ device, format, actorTexture, actorAspect: ACTOR_CELL.width / ACTOR_CELL.height });
    if (disposing || retired) { await renderer?.dispose?.(); renderer = null; return; }
    if (!renderer || typeof renderer.render !== 'function' || typeof renderer.dispose !== 'function') throw new Error('Renderer contract is incomplete');
    const resourceCounts = Object.freeze({ actorTextures: actorCount, creatorResources: renderer.resources || null });
    stateNode.value = 'rendering';
    if (verify) document.getElementById('verify-controls').hidden = false;
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    firstFramePending = true;
    message('first-frame', 'pending', { resourceCounts, sourcePins: { versionId: VERSION, bodySha256: EXPECTED_BODY_SHA256,
      packageSchema: packageClosure.packageSchema, packageManifestSha256: packageClosure.packageManifestSha256,
      packageSealSha256: packageClosure.packageSealSha256, sourceManifestSha256: packageClosure.sourceManifestSha256 } });
    enqueueFrame();
  } catch (error) {
    if (!disposing && !retired) showFailure(error, error?.startupStage || startupStage);
  }
}

document.getElementById('replay').addEventListener('click', replayFromZero);
for (const [id, key] of [['source-on', 'sourceOn'], ['main-on', 'mainOn'], ['observer-on', 'observerOn'], ['show-actor', 'showActor'], ['reduced-motion', 'reducedMotion']]) {
  document.getElementById(id).addEventListener('change', event => { void setOptions({ [key]: event.currentTarget.checked }); });
}
if (startup) window.addEventListener('message', onRetire);
window.addEventListener('resize', onResize, { passive: true });
document.addEventListener('visibilitychange', onVisibilityChange);
window.addEventListener('pagehide', () => { void dispose(); }, { once: true });
initializationTask = Promise.resolve().then(initialize).catch(error => showFailure(error, error?.startupStage || startupStage));
