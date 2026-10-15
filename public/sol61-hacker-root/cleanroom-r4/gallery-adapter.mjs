import { VERSION as EFFECT_VERSION, DURATION_MS as EFFECT_DURATION_MS, SFX_OFFSET_MS as EFFECT_SFX_OFFSET_MS, VARIANTS, durationForVariant, phaseAt, frameState, synthesizeSfx, planSfxCue, createRenderer } from './effect.mjs';
import { VERSION, DURATION_MS, LOOP_GAP_MS, SFX_OFFSET_MS, SFX_DURATION_MS, SFX_ONSET_WINDOW_MS, DEMO_ACTIVE_FOR_MS,
  parseStartupIdentity, parsePackagePins, RUNTIME_CLOSURE, verifyPackageClosure,
  validateRetireMessage, RootDemoClock, completionStillCurrent, rootCauseStillCurrent, AudioVoiceGate } from './host-core.mjs';

if (EFFECT_VERSION !== VERSION || EFFECT_DURATION_MS !== DURATION_MS || JSON.stringify(VARIANTS) !== JSON.stringify(['all-operators','active-state','release']) ||
    durationForVariant('all-operators') !== 1100 || durationForVariant('active-state') !== null || durationForVariant('release') !== 760 ||
    EFFECT_SFX_OFFSET_MS !== SFX_OFFSET_MS) { throw new Error('Hacker Root effect and neutral-host contract pins do not match'); }

const canvas = document.getElementById('surface');
const errorNode = document.getElementById('error');
const stateNode = document.getElementById('state');
const params = new URLSearchParams(location.search);
const verify = params.has('verify');
const actorAsset = new URL('./body.png', import.meta.url);
const ACTOR_CELL = Object.freeze({ x: 60, y: 18, width: 134, height: 222 });
const EXPECTED_BODY_SHA256 = 'cf3df51d88129ad51e175dd894ef2c269626a2d60fec912289789e099d8fcb8f';
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
let rendererDisposeInfo = null;
let actorTexture = null;
let actorBitmap = null;
let actorPipeline = null;
let actorUniform = null;
let actorBindGroup = null;
let actorSampler = null;
let actorPassCount = 0;
let format = null;
let audioContext = null;
let audioBuffers = new Map();
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
let uncapturedErrorHandler = null;
let startupSnapshot = null;
let packageClosure = null;
let firstFramePending = false;
let holdRequestSerial = 0;
let firstFrame = null;
let lastVerificationFrame = null;
let lastReceipt = null;
let lastFrame = null;
let currentCauseId = null;
let causeGeneration = 0;
let causeStartedAt = null;
let causeCompletionSeen = new Set();
let latestControls = Object.freeze({ sourceOn: true, mainOn: true, observerOn: true });
let verificationHold = false;
let verificationOptions = null;
const clock = new RootDemoClock();
const startedAt = performance.now();

const ACTOR_SHADER = `struct Params { actor: vec4f, viewport: vec2f, pad: vec2f };
@group(0) @binding(0) var bodyTexture: texture_2d<f32>;
@group(0) @binding(1) var bodySampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;
struct Out { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) index: u32) -> Out {
 var positions = array<vec2f,6>(vec2f(-0.5,-0.5),vec2f(0.5,-0.5),vec2f(-0.5,0.5),vec2f(-0.5,0.5),vec2f(0.5,-0.5),vec2f(0.5,0.5));
 var uvs = array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));
 let px = params.actor.xy + positions[index] * params.actor.zw;
 var out: Out; out.position = vec4f(px.x / params.viewport.x * 2. - 1., 1. - px.y / params.viewport.y * 2., 0., 1.); out.uv = uvs[index]; return out;
}
@fragment fn fs(in: Out) -> @location(0) vec4f { return textureSample(bodyTexture,bodySampler,in.uv); }`;

async function createActorDrawer() {
  const module=device.createShaderModule({label:VERSION+' neutral registered-character fixture shader',code:ACTOR_SHADER});
  const info=await module.getCompilationInfo();
  const messages=Array.from(info.messages||[]); if(messages.some(m=>m.type==='error'))throw new Error('Neutral registered-character fixture WGSL diagnostics failed: '+JSON.stringify(messages));
  const pipeline=device.createRenderPipeline({label:VERSION+' neutral registered-character fixture',layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
  actorSampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
  actorUniform=device.createBuffer({label:VERSION+' neutral registered-character fixture uniform',size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  actorBindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:actorTexture.createView()},{binding:1,resource:actorSampler},{binding:2,resource:{buffer:actorUniform}}]});
  actorPipeline=pipeline;
}

async function createRendererWithDiagnostics(options) {
  let pushed = false, scopeError = null, scopePopFailure = null, created = null;
  try {
    if (typeof device.pushErrorScope !== 'function' || typeof device.popErrorScope !== 'function') throw new Error('WebGPU validation error scopes are required');
    device.pushErrorScope('validation'); pushed = true;
    created = await createRenderer(options);
    if (created?.diagnosticsReady && typeof created.diagnosticsReady.then === 'function') await created.diagnosticsReady;
    const d = created?.diagnostics;
    if (d?.status === 'FAILED' || d?.status === 'failed' || d?.error || d?.messageError || d?.messages?.some(m => m?.type === 'error')) throw new Error('Renderer compilation diagnostics failed: '+JSON.stringify(d));
    await createActorDrawer();
  } catch (error) {
    try { await created?.destroy?.(); } catch (disposeError) { retirementErrors.push('failed renderer cleanup: '+String(disposeError?.message || disposeError)); }
    throw error;
  } finally { if (pushed) { try { scopeError = await device.popErrorScope(); } catch (error) { scopePopFailure = error; } } }
  if (scopeError || scopePopFailure) { try { await created?.destroy?.(); } catch (error) { retirementErrors.push('validation-failed renderer cleanup: '+String(error?.message || error)); } throw new Error(scopePopFailure ? 'WebGPU validation scope did not settle: '+String(scopePopFailure?.message || scopePopFailure) : 'WebGPU validation scope reported: '+(scopeError.message || String(scopeError))); }
  renderer = created;
  if (typeof device.addEventListener === 'function') {
    uncapturedErrorHandler = event => { if (!disposed && !disposing && !retired) showFailure(event.error || new Error(event.message || 'uncaptured WebGPU error'), 'uncaptured-error'); };
    device.addEventListener('uncapturederror', uncapturedErrorHandler);
  }
  return renderer;
}

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

function showFailure(error, stage = startupStage) {
  if (failureText || disposed) return;
  failureText = `${stage}: ${error?.message || String(error)}`;
  firstFramePending = false;
  errorNode.textContent = failureText;
  errorNode.hidden = false;
  stateNode.value = 'failed';
  invalidateFrames();
  audioGate?.stopAll('failure');
  if (startup) message(stage, 'error', { error: { code: 'GRAVITY_TEMPO_CLEANROOM_HOST_FAILURE', message: failureText } });
}

function diagnosticsSnapshot() {
  try { return renderer?.diagnostics ? JSON.parse(JSON.stringify(renderer.diagnostics)) : null; } catch (error) { return { snapshotError: String(error?.message || error) }; }
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
  for (const key of ['sourceOn', 'mainOn', 'observerOn']) {
    if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new TypeError(`${key} must be boolean`);
    if (options[key] !== undefined) result[key] = options[key];
  }
  return Object.freeze(result);
}

function currentEpisode(ageMs, inGap, variantIndex = clock.variantIndex, durationMs = clock.durationMs) {
  const loop = clock.loop;
  const causeId = `${VERSION}:synthetic-demo-root-${loop}-${VARIANTS[variantIndex]}`;
  if (causeId !== currentCauseId) {
    currentCauseId = causeId; causeGeneration += 1;
    causeStartedAt = performance.now() - Math.max(0, Number.isFinite(durationMs) ? Math.min(durationMs, ageMs) : ageMs);
    audioGate?.stopAll('root-cause-switch');
  }
  const sourceOn = latestControls.sourceOn && !inGap && (durationMs === null || ageMs < durationMs);
  const snapshot = clock.snapshot();
  return { causeId, loop, variantIndex, variant: VARIANTS[variantIndex], durationMs, sourceOn, mainOn: latestControls.mainOn && sourceOn, sourcePositive: true, rootActive: snapshot.rootActive, stateElapsedMs: snapshot.stateElapsedMs, synthetic: true };
}

function clearThenRender(size, ageMs, controls, episode) {
  const encoder = device.createCommandEncoder({ label: `${VERSION} frame ${submissions + 1}` });
  const view = canvasContext.getCurrentTexture().createView();
  const clear = encoder.beginRenderPass({ colorAttachments: [{ view, clearValue: BG_CLEAR, loadOp: 'clear', storeOp: 'store' }] });
  clear.end(); clearPassCount += 1;
  const variant = episode.variant;
  const sourceEnabled = episode.sourceOn && episode.mainOn;
  const state = frameState({ elapsedMs: ageMs, variant, rootActive: episode.rootActive, stateElapsedMs: episode.stateElapsedMs, sourceEnabled, observerEnabled: controls.observerOn });
  const timing = phaseAt(ageMs, variant, { rootActive: episode.rootActive, stateElapsedMs: episode.stateElapsedMs });
  if (timing.phase !== state.phase || typeof (state.active ?? state.alive) !== 'boolean') throw new Error('Hacker Root phase/state disagreement');
  const actor = { x: size.width / 2, y: size.height / 2, height: 64 * size.dpr, width: 64 * size.dpr * 134 / 222 };
  const renderArgs = { encoder, view, width: size.width, height: size.height, elapsedMs: ageMs, variant, rootActive: episode.rootActive, stateElapsedMs: episode.stateElapsedMs, actor, sourceEnabled, observerEnabled: controls.observerOn };
  const backPasses = renderer.render({ ...renderArgs, layer: 'back' });
  if (!Number.isSafeInteger(backPasses) || backPasses < 0 || backPasses > 1) throw new Error('Invalid Hacker Root back-layer pass count');
  effectPassCount += backPasses;
  drawActorFixture(encoder, view, size, actor);
  const frontPasses = renderer.render({ ...renderArgs, layer: 'front' });
  if (!Number.isSafeInteger(frontPasses) || frontPasses < 0 || frontPasses > 1) throw new Error('Invalid Hacker Root front-layer pass count');
  effectPassCount += frontPasses;
  const commandBuffer = encoder.finish(); device.queue.submit([commandBuffer]);
  const submissionId = ++submissions;
  const frame = Object.freeze({ recorded: true, submitted: true, completed: false, submissionId,
    causeId: episode.causeId, loop: episode.loop, variantIndex: episode.variantIndex, variant, durationMs: episode.durationMs, ageMs, phase: timing.phase, active: state.active ?? state.alive, rootActive: episode.rootActive, stateElapsedMs: episode.stateElapsedMs, synthetic: true,
    sourceOn: episode.sourceOn, mainOn: episode.mainOn, observerOn: controls.observerOn,
    rootPhase: state.phase, rootClockKind: state.clockKind, envelope: state.envelope, persistent: state.persistent, suppressionReason: state.suppressionReason,
    clearPasses: 1, actorPasses: 1, effectPasses: backPasses + frontPasses, passes: 2 + backPasses + frontPasses,
    viewportWidth: size.width, viewportHeight: size.height, dpr: size.dpr, cssWidth: size.cssWidth, cssHeight: size.cssHeight,
    canvasConnected: canvas.isConnected === true, generation, causeGeneration, sourcePositive: episode.sourcePositive, fixtureKind: 'synthetic-hacker-root-gallery-demo' });
  lastFrame = frame; return { frame, state };
}

function drawActorFixture(encoder, view, size, actor) {
  if (!actorPipeline || !actorUniform || !actorBindGroup || !actorTexture) throw new Error('neutral registered-character fixture is unavailable');
  device.queue.writeBuffer(actorUniform, 0, new Float32Array([actor.x, actor.y, actor.width, actor.height, size.width, size.height, 0, 0]));
  const pass = encoder.beginRenderPass({ label: VERSION + ' registered recipient body', colorAttachments: [{ view, loadOp: 'load', storeOp: 'store' }] });
  pass.setPipeline(actorPipeline); pass.setBindGroup(0, actorBindGroup); pass.draw(6); pass.end(); actorPassCount += 1;
}

function queueFrameCompletion(frame, submittedAt) {
  pendingWork += 1;
  const task = Promise.resolve().then(() => device.queue.onSubmittedWorkDone()).then(() => {
    completions += 1;
    const now = performance.now();
    const completionAge = frame.ageMs + Math.max(0, now - submittedAt);
    const liveSnapshot=clock.tick(now); const liveEpisode=currentEpisode(liveSnapshot.elapsedMs,liveSnapshot.inGap,liveSnapshot.variantIndex,liveSnapshot.durationMs);
    const stillCurrent = completionStillCurrent({ generation: frame.generation, currentGeneration: generation,
      disposed, retired, hidden: document.hidden, connected: canvas.isConnected === true,
      surfaceCurrent: surfaceIsCurrent(), sourceOn: frame.sourceOn, mainOn: frame.mainOn,
      active: frame.active, ageMs: completionAge, durationMs: frame.durationMs }) && rootCauseStillCurrent({frameCauseId:frame.causeId,liveCauseId:liveEpisode.causeId,frameRootActive:frame.rootActive,liveRootActive:liveEpisode.rootActive,frameCauseGeneration:frame.causeGeneration,currentCauseGeneration:causeGeneration});
    if (!stillCurrent) return;
    const completed = Object.freeze({ ...frame, completed: true, completedAt: now, ageMsAtCompletion: completionAge });
    lastReceipt = completed;
    if (startup && !startupReady && frame.active && frame.sourceOn && frame.mainOn && frame.rootActive && completionAge > 0 && (frame.durationMs === null || completionAge < frame.durationMs)) {
      startupReady = true;
      firstFramePending = false;
      firstFrame = completed;
      stateNode.value = 'ready';
      message('playing', 'ready', { firstFrame: { ...completed, viewport: { width: frame.viewportWidth, height: frame.viewportHeight, dpr: frame.dpr }, effectPassCompleted: frame.effectPasses > 0 }, rendererDiagnostics: diagnosticsSnapshot() });
    }
    if (frame.variantIndex !== 1 && !causeCompletionSeen.has(frame.causeId)) {
      causeCompletionSeen.add(frame.causeId);
      const cue=planSfxCue({variant:frame.variant,rootActive:frame.rootActive,stateElapsedMs:frame.stateElapsedMs,elapsedMs:completionAge,sourceId:'synthetic-root-owner-'+frame.loop,causeId:frame.causeId,verify});
      if(cue) audioGate?.acceptCompletedCause({ causeId: cue.voiceKey, sourcePositive: frame.sourcePositive,
        sourceOn: frame.sourceOn, mainOn: frame.mainOn, active: frame.active, variantIndex: frame.variantIndex, ageMs: completionAge,
        generationCurrent: frame.generation === generation, hidden: document.hidden, disposed, retired });
      else audioGate?.acceptCompletedCause({causeId:frame.causeId,sourcePositive:frame.sourcePositive,sourceOn:frame.sourceOn,mainOn:frame.mainOn,active:frame.active,variantIndex:frame.variantIndex,ageMs:completionAge,generationCurrent:false,hidden:document.hidden,disposed,retired});
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
    const episode = currentEpisode(ageMs, snapshot.inGap, snapshot.variantIndex, snapshot.durationMs);
    if (!episode.sourceOn || !episode.mainOn || snapshot.inGap) audioGate?.stopAll('source-main-off-or-demo-release-or-gap');
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
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > DEMO_ACTIVE_FOR_MS) throw new RangeError(`synthetic demo sourceMs must be in 0..${DEMO_ACTIVE_FOR_MS}`);
  if (disposed || disposing || retired || failureText || document.hidden || !renderer || !device) throw new Error('preview is unavailable');
  const ticket = ++holdRequestSerial;
  verificationOptions = verificationOptionsFrom(options);
  latestControls = verificationOptions;
  verificationHold = true;
  invalidateFrames();
  audioGate?.stopAll('verification-hold');
  await queueFence;
  await device.queue.onSubmittedWorkDone();
  if (ticket !== holdRequestSerial || disposed || disposing || retired || document.hidden) throw new Error('hold invalidated before submission');
  const size = viewport();
  if (!size) throw new Error('viewport has no drawable area');
  clock.hold(ageMs, performance.now());
  const snapshot = clock.snapshot();
  const episode = currentEpisode(ageMs, false, snapshot.variantIndex, snapshot.durationMs);
  if (!episode.sourceOn || !episode.mainOn || snapshot.inGap) audioGate?.stopAll('source-main-off-or-demo-release-or-gap');
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
  if (ticket !== holdRequestSerial || disposed || retired || document.hidden || frameGeneration !== generation || !canvas.isConnected || !surfaceIsCurrent()) throw new Error('held frame completed on a stale surface or generation');
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
  if (verificationHold && verify) return holdAt(clock.elapsedMs, latestControls).then(() => true).catch(error => { if (!disposed && !retired) showFailure(error, 'verification-hold'); return false; });
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
window.__dvaHackerRootGallery = {
  version: VERSION, verify, durationMs: DURATION_MS, demoActiveForMs: DEMO_ACTIVE_FOR_MS, loopGapMs: LOOP_GAP_MS, variants: VARIANTS, syntheticDemo: true,
  get frames() { return submissions; }, get completions() { return completions; },
  get elapsedMs() { return clock.elapsedMs; }, get sourceClock() { return clock.snapshot(); }, holdSourceAt(sourceMs) { if (!verify) throw new Error('holdSourceAt requires ?verify'); if (disposed || retired || disposing) throw new Error('preview unavailable'); const snap=clock.holdSource(sourceMs,performance.now()); return holdAt(snap.elapsedMs,latestControls); }, get rootActive() { return clock.snapshot().rootActive; }, get stateElapsedMs() { return clock.snapshot().stateElapsedMs; }, get loop() { return clock.loop; }, get variantIndex() { return clock.variantIndex; }, get currentVariant() { return VARIANTS[clock.variantIndex]; }, get currentDurationMs() { return clock.durationMs; },
  get lastFrame() { return lastFrame; }, get lastReceipt() { return lastReceipt; },
  get lastVerificationFrame() { return lastVerificationFrame; }, get firstFrame() { return firstFrame; },
  get firstFramePending() { return firstFramePending; }, get startupSnapshot() { return startupSnapshot; },
  get packageClosure() { return packageClosure; },
  get rendererDiagnostics() { return diagnosticsSnapshot(); },
  get failure() { return failureText; }, get disposed() { return disposed; }, get retired() { return retired; },
  get audio() { return audioGate?.snapshot() || Object.freeze({ verify, hardMuted: verify, activeVoices: 0, contextState: 'absent' }); },
  get resources() { return Object.freeze({ deviceOwned: Boolean(device), rendererOwned: Boolean(renderer), actorTextureOwned: Boolean(actorTexture), actorPipelineOwned: Boolean(actorPipeline), actorUniformOwned: Boolean(actorUniform), pendingWork, submissions, completions, clearPassCount, actorPassCount, effectPassCount }); },
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
      void holdAt(clock.elapsedMs, verificationOptions || latestControls).catch(error => showFailure(error, 'verification-resize'));
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
    try { rendererDisposeInfo = await renderer?.destroy?.(); } catch (error) { retirementErrors.push(`renderer dispose: ${String(error?.message || error)}`); }
    const rendererResources = Object.freeze({ ...(renderer?.resources || {}), actorFixture: { textureOwned: Boolean(actorTexture), pipelineOwned: Boolean(actorPipeline), uniformOwned: Boolean(actorUniform), passes: actorPassCount } });
    try { actorTexture?.destroy?.(); } catch (error) { retirementErrors.push(`actor texture destroy: ${String(error?.message || error)}`); }
    try { actorUniform?.destroy?.(); } catch (error) { retirementErrors.push(`actor uniform destroy: ${String(error?.message || error)}`); }
    actorPipeline = null; actorUniform = null; actorBindGroup = null; actorSampler = null;
    try { actorBitmap?.close?.(); } catch {}
    if (uncapturedErrorHandler && device?.removeEventListener) { try { device.removeEventListener('uncapturederror', uncapturedErrorHandler); } catch (error) { retirementErrors.push(`uncaptured listener removal: ${String(error?.message || error)}`); } uncapturedErrorHandler = null; }
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
    renderer = null; actorTexture = null; actorBitmap = null; audioBuffers = new Map(); audioContext = null; audioGate = null;
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
        disposeSettled: true }), rendererResources, rendererDisposeInfo: rendererDisposeInfo || null,
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
  let copyFailure = null, validationError = null, scopePopFailure = null, scopePushed = false, scopePopStarted = false;
  try {
    if (typeof device.pushErrorScope !== 'function' || typeof device.popErrorScope !== 'function') throw new Error('WebGPU validation error scopes are required for actor upload');
    device.pushErrorScope('validation'); scopePushed = true;
    device.queue.copyExternalImageToTexture({ source: actorBitmap }, { texture: actorTexture, premultipliedAlpha: false }, [ACTOR_CELL.width, ACTOR_CELL.height, 1]);
  } catch (error) { copyFailure = error; }
  finally {
    if (scopePushed) {
      scopePopStarted = true;
      try { validationError = await device.popErrorScope(); } catch (error) { scopePopFailure = error; }
    }
  }
  if (copyFailure || validationError || scopePopFailure) {
    const cleanupErrors = [];
    try { actorBitmap?.close?.(); } catch (error) { cleanupErrors.push('bitmap close: ' + (error?.message || error)); }
    try { actorTexture?.destroy?.(); } catch (error) { cleanupErrors.push('texture destroy: ' + (error?.message || error)); }
    actorBitmap = null; actorTexture = null;
    const detail = copyFailure?.message || validationError?.message || scopePopFailure?.message || 'unknown validation failure';
    throw Object.assign(new Error('Neutral actor fixture upload failed: ' + detail + (scopePopStarted ? '' : ' (validation scope did not open)') + (cleanupErrors.length ? '; cleanup: ' + cleanupErrors.join(', ') : '')), { startupStage: 'assets' });
  }
  actorBitmap.close(); actorBitmap = null;
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
  const profiles = VARIANTS.flatMap((variant, variantIndex) => {
    if (variantIndex === 1) { const silent=synthesizeSfx({variant,sampleRate,verify:false}); if (silent.voiceEligible!==false || silent.durationMs!==0 || silent.channels?.[0]?.length!==0) throw new Error('Hacker Root active-state must remain voice-ineligible and silent'); return []; }
    const result = synthesizeSfx({variant,sampleRate,verify:false});
    const samples = result?.channels?.[0], expectedDuration = durationForVariant(variant);
    if (result?.muted !== false || result?.voiceEligible!==true || result?.sampleRate !== sampleRate || result?.channels?.length !== 1 || result?.durationMs !== expectedDuration || !(samples instanceof Float32Array) || samples.length !== sampleRate * expectedDuration / 1000 || [...samples].some(v => !Number.isFinite(v))) throw new Error('Hacker Root SFX must be exact finite mono PCM for finite cause variants');
    return [{ variantIndex, samples, durationMs: expectedDuration }];
  });
  audioContext = new AudioContext({ sampleRate });
  audioBuffers = new Map(profiles.map(({samples,variantIndex}) => {
    const buffer = audioContext.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    return [variantIndex, buffer];
  }));
  audioGate = new AudioVoiceGate({ verify: false, context: audioContext, buffers: audioBuffers,
    offsetMs: SFX_OFFSET_MS, durationMs: SFX_DURATION_MS, onsetWindowMs: SFX_ONSET_WINDOW_MS });
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
    renderer = await createRendererWithDiagnostics({ device, format });
    if (disposing || retired) { await renderer?.destroy?.(); renderer = null; return; }
    if (!renderer || typeof renderer.render !== 'function' || typeof renderer.destroy !== 'function') throw new Error('Renderer contract is incomplete');
    const resourceCounts = Object.freeze({ actorTextures: actorCount, creatorResources: renderer.resources || null });
    stateNode.value = 'rendering';
    if (verify) document.getElementById('enable-audio').hidden = true;
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    firstFramePending = true;
    message('first-frame', 'pending', { resourceCounts, rendererDiagnostics: diagnosticsSnapshot(), sourcePins: { versionId: VERSION, bodySha256: EXPECTED_BODY_SHA256,
      packageSchema: packageClosure.packageSchema, packageManifestSha256: packageClosure.packageManifestSha256,
      packageSealSha256: packageClosure.packageSealSha256, sourceManifestSha256: packageClosure.sourceManifestSha256 } });
    enqueueFrame();
  } catch (error) {
    if (!disposing && !retired) showFailure(error, error?.startupStage || startupStage);
  }
}

document.getElementById('replay').addEventListener('click', replayFromZero);
document.getElementById('enable-audio').addEventListener('click', () => { void activateFromGesture(); });
for (const [id, key] of [['source-on', 'sourceOn'], ['main-on', 'mainOn'], ['observer-on', 'observerOn']]) {
  document.getElementById(id).addEventListener('change', event => { void setOptions({ [key]: event.currentTarget.checked }); });
}
if (startup) window.addEventListener('message', onRetire);
window.addEventListener('resize', onResize, { passive: true });
document.addEventListener('visibilitychange', onVisibilityChange);
window.addEventListener('pagehide', () => { void dispose(); }, { once: true });
initializationTask = Promise.resolve().then(initialize).catch(error => showFailure(error, error?.startupStage || startupStage));
