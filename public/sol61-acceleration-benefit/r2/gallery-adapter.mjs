import { VERSION, DURATION_MS, sampleTimeline, createAccelerationBenefitRenderer, createSound } from './effect.mjs';

const canvas = document.getElementById('surface');
const failure = document.getElementById('error');
const params = new URLSearchParams(location.search);
const verify = params.has('verify');
const ACTOR_SCALE = 2;
const LOOP_GAP_MS = 600;
const RECEIVER_ID = 'acceleration-benefit-gallery-actor';
const EFFECT_ID_PREFIX = 'acceleration-benefit-gallery-receipt';
const BODY_RECT = Object.freeze({ x: 62, y: 15, width: 136, height: 225 });
const BODY_HEIGHT_CSS_PX = 64;
const LINEAR_BACKGROUND = Object.freeze({ r: 0.00605, g: 0.01096, b: 0.0185, a: 1 });
const asset = new URL('./body.png', import.meta.url);

const startup = (() => {
  const token = params.get('galleryStartupToken');
  const versionId = params.get('galleryVersionId');
  const attemptEpoch = Number(params.get('galleryAttemptEpoch'));
  if (window.parent === window || !/^[0-9a-f]{32}$/.test(token || '') || versionId !== VERSION ||
      !Number.isSafeInteger(attemptEpoch) || attemptEpoch <= 0) return null;
  try { if (window.parent.location.origin !== location.origin) return null; } catch { return null; }
  return Object.freeze({ token, versionId, attemptEpoch });
})();

let startupSequence = 0;
let startupSnapshot = null;
let startupStage = 'child-document';
let retired = false;
let disposed = false;
let failureText = null;
let renderer = null;
let actorTexture = null;
let device = null;
let canvasColorFormat = null;
let audioContext = null;
let sound = null;
let raf = null;
let rafEpoch = 0;
let lastClockSample = null;
let elapsedMs = 0;
let gapStartedAt = null;
let loop = 0;
let frameCount = 0;
let queueFence = null;
let verificationHold = false;
let verificationOptions = null;
let lastVerificationFrame = null;
let initializationTask = null;
let disposalTask = null;

function emit(stage, status, extra = {}) {
  if (!startup || (disposed && status !== 'cancelled')) return false;
  const envelope = Object.freeze({ schema: 'dva-gallery-startup/v1', token: startup.token,
    versionId: VERSION, attemptEpoch: startup.attemptEpoch, sequence: ++startupSequence,
    stage, status, ...extra });
  startupStage = stage;
  try { window.parent.postMessage(envelope, location.origin); }
  catch (error) {
    startupSnapshot = status === 'ready'
      ? Object.freeze({ ...envelope, status: 'error', error: { code: 'STARTUP_STATUS_DELIVERY_FAILED', message: error?.message || String(error) } })
      : envelope;
    return false;
  }
  startupSnapshot = envelope;
  return true;
}

function invalidateFrames() {
  rafEpoch += 1;
  if (raf !== null) cancelAnimationFrame(raf);
  raf = null;
}

function stop() {
  invalidateFrames();
  lastClockSample = null;
  sound?.updateClock(DURATION_MS, ACTOR_SCALE);
}

function onRetire(event) {
  if (!startup || event.origin !== location.origin || event.source !== window.parent) return;
  const data = event.data;
  if (data?.schema !== 'dva-gallery-startup/v1' || data.action !== 'retire' ||
      data.token !== startup.token || data.versionId !== startup.versionId || data.attemptEpoch !== startup.attemptEpoch) return;
  retired = true;
  emit(startupStage, 'cancelled');
  void dispose();
}

if (startup) {
  window.__dvaGalleryStartupSnapshot = () => startupSnapshot;
  window.addEventListener('message', onRetire);
  emit('child-document', 'pending');
}

function showFailure(error, stage = startupStage) {
  if (disposed || failureText) return;
  failureText = `${stage}: ${error?.message || String(error)}`;
  failure.textContent = failureText;
  failure.hidden = false;
  document.body.dataset.failed = 'true';
  stop();
  sound?.updateClock(DURATION_MS, ACTOR_SCALE);
  if (startup) emit(stage, 'error', { error: Object.freeze({ code: 'PREVIEW_STARTUP_ERROR', message: failureText }) });
  window.__dvaAccelerationBenefitError?.(error);
}

function currentViewport() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  if (![rect.width, rect.height, dpr].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0 || dpr <= 0) return null;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height, scale: dpr };
}

function canvasSurfaceIsCurrent() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  return Number.isFinite(rect.width) && Number.isFinite(rect.height) && Number.isFinite(dpr) &&
    rect.width > 0 && rect.height > 0 && dpr > 0 &&
    canvas.width === Math.max(1, Math.round(rect.width * dpr)) &&
    canvas.height === Math.max(1, Math.round(rect.height * dpr));
}

function enqueueFrame() {
  if (disposed || retired || failureText || document.hidden || !renderer || verificationHold || raf !== null || queueFence) return;
  const epoch = rafEpoch;
  raf = requestAnimationFrame(() => {
    if (epoch !== rafEpoch) return;
    raf = null;
    drawFrame(epoch);
  });
}

function renderAt(size, frameAge, options = null) {
  const actorHeight = options?.bodyHeight ?? BODY_HEIGHT_CSS_PX;
  const settings = {
    direction: options?.direction ?? 1,
    obs: options?.obs ?? true,
    sparkle: options?.sparkle ?? true,
    reducedMotion: options?.reducedMotion ?? false,
    includeActor: options?.includeActor ?? true,
    source: options?.source ?? true,
    main: options?.main ?? true,
    bodyResponse: options?.bodyResponse ?? true
  };
  const encoder = device.createCommandEncoder({ label: VERSION });
  const view = canvas.getContext('webgpu').getCurrentTexture().createView({ format: canvasColorFormat });
  const pass = encoder.beginRenderPass({ colorAttachments: [{ view, clearValue: LINEAR_BACKGROUND, loadOp: 'clear', storeOp: 'store' }] });
  const receipt = renderer.draw(pass, { width: size.width, height: size.height,
    centerX: size.width * 0.5, centerY: size.height * 0.64,
    bodyHeight: actorHeight * size.scale, bodyWidth: actorHeight * size.scale * BODY_RECT.width / BODY_RECT.height,
    elapsedMs: frameAge, actorTexture, ...settings });
  pass.end();
  device.queue.submit([encoder.finish()]);
  frameCount += 1;
  return receipt;
}

function queueVisibleReceipt(epoch, causeId, frameAge) {
  const queue = device?.queue;
  if (typeof queue?.onSubmittedWorkDone !== 'function') throw new Error('GPUQueue.onSubmittedWorkDone is unavailable');
  const capturedRenderer = renderer;
  const capturedDevice = device;
  const task = Promise.resolve(queue.onSubmittedWorkDone.call(queue)).then(() => {
    const size = canvasSurfaceIsCurrent();
    const stillVisible = !disposed && !retired && !failureText && !document.hidden &&
      renderer === capturedRenderer && device === capturedDevice && epoch === rafEpoch &&
      canvas.isConnected === true && size && frameAge < DURATION_MS &&
      sampleTimeline(elapsedMs).active && loop === Number(causeId.slice(EFFECT_ID_PREFIX.length + 1));
    if (!stillVisible || window.__dvaAccelerationBenefitGallery?.lastReceipt === causeId) return;
    if (sound) sound.triggerVisibleReceipt({ effectId: causeId, kind: 'accelerationBenefit',
      playerId: RECEIVER_ID, elapsedMs: frameAge, timeScale: ACTOR_SCALE, gain: 1, pan: 0 });
    if (window.__dvaAccelerationBenefitGallery) window.__dvaAccelerationBenefitGallery.lastReceipt = causeId;
  }).catch(error => {
    if (!disposed && !retired) showFailure(error, 'playing');
  }).finally(() => {
    if (queueFence === task) queueFence = null;
    enqueueFrame();
  });
  queueFence = task;
}

function drawFrame(epoch) {
  if (disposed || retired || failureText || !renderer || document.hidden) return;
  try {
    const size = currentViewport();
    if (!size) return;
    const now = performance.now();
    if (lastClockSample !== null) {
      const delta = now - lastClockSample;
      if (!Number.isFinite(delta) || delta < 0) throw new Error('invalid monotonic actor clock');
      if (gapStartedAt === null) elapsedMs += delta * ACTOR_SCALE;
    }
    lastClockSample = now;
    if (gapStartedAt === null && elapsedMs >= DURATION_MS) {
      elapsedMs = DURATION_MS;
      gapStartedAt = now;
      sound?.updateClock(DURATION_MS, ACTOR_SCALE);
    } else if (gapStartedAt !== null) {
      if (now - gapStartedAt >= LOOP_GAP_MS) {
        gapStartedAt = null;
        elapsedMs = 0;
        loop += 1;
        lastClockSample = now;
      }
    }

    const drawing = gapStartedAt === null;
    const frameAge = drawing ? Math.min(DURATION_MS - Number.EPSILON, elapsedMs) : DURATION_MS;
    sound?.updateClock(frameAge, ACTOR_SCALE);
    const receipt = renderAt(size, frameAge);
    if (drawing && receipt.active) {
      const causeId = `${EFFECT_ID_PREFIX}-${loop}`;
      if (!window.__dvaAccelerationBenefitGallery?.lastReceipt || window.__dvaAccelerationBenefitGallery.lastReceipt !== causeId) {
        queueVisibleReceipt(epoch, causeId, frameAge);
      } else enqueueFrame();
    } else enqueueFrame();
    if (startup && startupSnapshot?.status !== 'ready' && !window.__dvaAccelerationBenefitGallery?.firstFramePending) {
      const firstSubmission = device.queue.onSubmittedWorkDone();
      window.__dvaAccelerationBenefitGallery.firstFramePending = true;
      Promise.resolve(firstSubmission).then(() => {
        if (disposed || retired || document.hidden || !canvasSurfaceIsCurrent() || epoch !== rafEpoch || !canvas.isConnected) return;
        const firstFrame = Object.freeze({ recorded: true, submitted: true, completed: true, canvasConnected: true,
          passes: 1, viewportWidth: canvas.width, viewportHeight: canvas.height, sourcePasses: Object.freeze(['acceleration-benefit']),
          submissionId: frameCount, causeId: `${EFFECT_ID_PREFIX}-${loop}`, ageMs: frameAge,
          bodyProjectedHeight: BODY_HEIGHT_CSS_PX * size.scale, lifecycleEpoch: epoch });
        window.__dvaAccelerationBenefitGallery.firstFrame = firstFrame;
        emit('playing', 'ready', { firstFrame });
      }).catch(error => showFailure(error, 'first-frame'));
    }
  } catch (error) { showFailure(error, 'playing'); }
}

async function activateAudioFromGesture() {
  if (verify || disposed || retired || failureText || document.hidden || !audioContext) return false;
  try {
    if (audioContext.state !== 'running') await audioContext.resume();
    return audioContext.state === 'running';
  } catch (error) { showFailure(error, 'audio'); return false; }
}

function normalizeVerificationOptions(options = {}) {
  if (typeof options !== 'object' || options === null) throw new TypeError('verification options must be an object');
  const bodyHeight = options.bodyHeight ?? BODY_HEIGHT_CSS_PX;
  if (bodyHeight !== 64 && bodyHeight !== 192) throw new RangeError('bodyHeight must be 64 or 192 CSS pixels');
  for (const key of ['obs', 'sparkle', 'source', 'main', 'bodyResponse', 'includeActor', 'reducedMotion']) {
    if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new TypeError(`${key} must be boolean`);
  }
  const direction = options.direction ?? 1;
  if (direction !== 1 && direction !== -1) throw new RangeError('direction must be 1 or -1');
  return Object.freeze({ ...options, bodyHeight, direction });
}

async function holdAt(elapsed, options = {}) {
  if (!verify) throw new Error('verification hold requires ?verify');
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > DURATION_MS) throw new RangeError(`elapsedMs must be within 0..${DURATION_MS}`);
  if (disposed || retired || failureText || document.hidden || !renderer || !device) throw new Error('preview is not available for a verification hold');
  verificationOptions = normalizeVerificationOptions(options);
  verificationHold = true;
  stop();
  const epoch = rafEpoch;
  try { await queueFence; } catch {}
  await device.queue.onSubmittedWorkDone();
  if (disposed || retired || document.hidden || epoch !== rafEpoch) throw new Error('verification hold was invalidated before submission');
  const size = currentViewport();
  if (!size) throw new Error('verification viewport has zero size');
  sound?.updateClock(DURATION_MS, ACTOR_SCALE);
  const receipt = renderAt(size, elapsed, verificationOptions);
  const submissionId = frameCount;
  await device.queue.onSubmittedWorkDone();
  if (disposed || retired || document.hidden || epoch !== rafEpoch || !canvasSurfaceIsCurrent() || !canvas.isConnected) {
    throw new Error('verification hold completed for a stale canvas or lifecycle epoch');
  }
  elapsedMs = elapsed;
  lastClockSample = performance.now();
  lastVerificationFrame = Object.freeze({ recorded: true, submitted: true, completed: true,
    canvasConnected: true, passes: 1, viewportWidth: canvas.width, viewportHeight: canvas.height,
    submissionId, causeId: `${EFFECT_ID_PREFIX}-${loop}`, ageMs: elapsed,
    bodyProjectedHeight: verificationOptions.bodyHeight * size.scale,
    bodyProjectedWidth: verificationOptions.bodyHeight * size.scale * BODY_RECT.width / BODY_RECT.height,
    lifecycleEpoch: epoch, active: receipt.active, phase: sampleTimeline(elapsed).phase,
    toggles: Object.freeze({ obs: verificationOptions.obs ?? true, sparkle: verificationOptions.sparkle ?? true,
      source: verificationOptions.source ?? true, main: verificationOptions.main ?? true,
      bodyResponse: verificationOptions.bodyResponse ?? true, includeActor: verificationOptions.includeActor ?? true }) });
  return lastVerificationFrame;
}

function resumeVerificationPlayback() {
  if (!verify) throw new Error('verification resume requires ?verify');
  if (disposed || retired || failureText || document.hidden || !renderer) return false;
  verificationOptions = null;
  verificationHold = false;
  lastClockSample = performance.now();
  enqueueFrame();
  return true;
}

function replayFromZero() {
  if (disposed || retired || failureText || document.hidden || !renderer) return false;
  verificationOptions = null;
  verificationHold = false;
  elapsedMs = 0;
  gapStartedAt = null;
  loop += 1;
  lastClockSample = performance.now();
  enqueueFrame();
  return true;
}

window.__gallerySfx = Object.freeze({ activateFromGesture: activateAudioFromGesture });
window.__dvaAccelerationBenefitGallery = {
  version: VERSION, verify, actorScale: ACTOR_SCALE, durationMs: DURATION_MS,
  get elapsedMs() { return elapsedMs; }, get loop() { return loop; }, get frames() { return frameCount; },
  get failure() { return failureText; }, get disposed() { return disposed; },
  hold: holdAt,
  setPhase: holdAt,
  resume: resumeVerificationPlayback,
  replay: replayFromZero,
  get lastVerificationFrame() { return lastVerificationFrame; },
  get lastReceipt() { return this._lastReceipt || null; }, set lastReceipt(value) { this._lastReceipt = value; },
  get firstFrame() { return this._firstFrame || null; }, set firstFrame(value) { this._firstFrame = value; },
  get firstFramePending() { return this._firstFramePending === true; }, set firstFramePending(value) { this._firstFramePending = value; },
  dispose
};

function onVisibilityChange() {
  if (disposed || retired) return;
  if (document.hidden) {
    invalidateFrames();
    lastClockSample = null;
    sound?.updateClock(DURATION_MS, ACTOR_SCALE);
  } else {
    lastClockSample = performance.now();
    enqueueFrame();
  }
}

function onResize() {
  if (!disposed && !retired && !document.hidden) enqueueFrame();
}

function dispose() {
  if (disposalTask) return disposalTask;
  disposed = true;
  invalidateFrames();
  lastClockSample = null;
  sound?.updateClock(DURATION_MS, ACTOR_SCALE);
  window.removeEventListener('message', onRetire);
  window.removeEventListener('resize', onResize);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  disposalTask = (async () => {
    try { await initializationTask; } catch {}
    try { await queueFence; } catch {}
    try { await device?.queue?.onSubmittedWorkDone?.(); } catch {}
    sound?.dispose();
    renderer?.destroy();
    actorTexture?.destroy();
    try { await audioContext?.close?.(); } catch {}
    renderer = null; actorTexture = null; sound = null; audioContext = null; device = null;
  })();
  return disposalTask;
}

async function initialize() {
  try {
    if (!navigator.gpu) throw Object.assign(new Error('WebGPU is unavailable'), { startupStage: 'adapter' });
    emit('adapter', 'pending');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Object.assign(new Error('No WebGPU adapter is available'), { startupStage: 'adapter' });
    if (disposed || retired) return;
    emit('device', 'pending');
    device = await adapter.requestDevice();
    if (disposed || retired) return;
    emit('assets', 'pending');
    const response = await fetch(asset, { cache: 'no-store' });
    if (!response.ok) throw Object.assign(new Error(`Actor fixture HTTP ${response.status}`), { startupStage: 'assets' });
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob, BODY_RECT.x, BODY_RECT.y, BODY_RECT.width, BODY_RECT.height);
    if (disposed || retired) { bitmap.close(); return; }
    actorTexture = device.createTexture({ label: 'technical actor fixture', size: [BODY_RECT.width, BODY_RECT.height, 1],
      format: 'rgba8unorm-srgb', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: actorTexture }, [BODY_RECT.width, BODY_RECT.height]);
    bitmap.close();
    const context = canvas.getContext('webgpu');
    if (!context) throw Object.assign(new Error('Canvas WebGPU context is unavailable'), { startupStage: 'device' });
    const surfaceFormat = navigator.gpu.getPreferredCanvasFormat();
    canvasColorFormat = surfaceFormat.replace(/unorm$/, 'unorm-srgb');
    if (canvasColorFormat === surfaceFormat) throw Object.assign(new Error(`No sRGB view mapping exists for ${surfaceFormat}`), { startupStage: 'device' });
    context.configure({ device, format: surfaceFormat, viewFormats: [canvasColorFormat], alphaMode: 'opaque' });
    audioContext = typeof AudioContext === 'function' ? new AudioContext() : null;
    sound = createSound(audioContext, { verify });
    emit('pipelines', 'pending');
    renderer = await createAccelerationBenefitRenderer(device, canvasColorFormat);
    if (disposed || retired) return;
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    emit('first-frame', 'pending');
    enqueueFrame();
  } catch (error) {
    if (!disposed && !retired) showFailure(error, error?.startupStage || startupStage);
  }
}

window.addEventListener('pagehide', () => { void dispose(); }, { once: true });
initializationTask = Promise.resolve().then(initialize).catch(error => showFailure(error, error?.startupStage || startupStage));
