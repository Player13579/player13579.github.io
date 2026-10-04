import { VERSION, DURATIONS, sampleEvent, SHADER } from './effect.mjs';
import { createActivationAudio } from './audio.mjs';

export const FRAME_ID = 'alchemy-cannon-fixture-frame-1';
export const GALLERY_VERSION_ID = 'alchemy-cannon-sol61-r10';
export const EXPECTED_SOURCE_PINS = Object.freeze({
  version: 'alchemy-cannon-new-e-sol61-r10',
  effectModuleSha256: 'a532bbefe31fa73c04c3f8bb66ce1d8dc83e21a61423c4d7b5bc33c56b1cc3b4',
  audioModuleSha256: '683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a',
  shaderSha256: 'bbbcf682cbd43de7b221ff164973ccf81606ac8fb6bd4634c15754a6c3edac20'
});
const hex = bytes => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
async function sha256(bytes, cryptoImpl) {
  if (!cryptoImpl?.subtle) throw new Error('Web Crypto SHA-256 is unavailable');
  return hex(await cryptoImpl.subtle.digest('SHA-256', bytes));
}
export async function verifyRuntimeSourcePins({ fetchImpl = globalThis.fetch, cryptoImpl = globalThis.crypto } = {}) {
  if (VERSION !== EXPECTED_SOURCE_PINS.version) throw new Error('R10 runtime version does not match frozen source pin');
  if (typeof fetchImpl !== 'function') throw new Error('source pin fetch is unavailable');
  for (const [file, expected] of [['effect.mjs', EXPECTED_SOURCE_PINS.effectModuleSha256],
    ['audio.mjs', EXPECTED_SOURCE_PINS.audioModuleSha256]]) {
    const response = await fetchImpl(new URL(`./${file}`, import.meta.url), { cache: 'no-store' });
    if (!response?.ok) throw new Error(`${file} source pin fetch failed`);
    const actual = await sha256(await response.arrayBuffer(), cryptoImpl);
    if (actual !== expected) throw new Error(`${file} source pin mismatch`);
  }
  const shaderSha256 = await sha256(new TextEncoder().encode(SHADER), cryptoImpl);
  if (shaderSha256 !== EXPECTED_SOURCE_PINS.shaderSha256) throw new Error('R10 imported shader export pin mismatch');
  return Object.freeze({ ...EXPECTED_SOURCE_PINS, verifiedAt: new Date().toISOString() });
}
export const FRAME_VERTEX_FLOATS = 8;
const WIDTH = 960;
const HEIGHT = 540;
const FIELD_MS = 3000;
const PULSE_OFFSETS = Object.freeze([300, 600, 900, 1200, 1500, 1800]);
const PLAYER_ID = 'fixture-player';
const HAND = Object.freeze({ x: 160, y: 270 });
const ENDPOINT = Object.freeze({ x: 760, y: 270 });
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

export function createStartupReporter(params, postMessage) {
  const token = String(params?.galleryStartupToken || '');
  const versionId = String(params?.galleryVersionId || '');
  const attemptEpoch = Number(params?.galleryAttemptEpoch);
  const enabled = Boolean(/^[a-f0-9]{32}$/i.test(token) && versionId === GALLERY_VERSION_ID &&
    Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0 && typeof postMessage === 'function');
  let sequence = 0;
  let latest = null;
  return Object.freeze({
    enabled,
    send(stage, status, extra = {}) {
      if (!enabled) return null;
      const message = Object.freeze({ ...extra, schema: 'dva-gallery-startup/v1', token, versionId,
        attemptEpoch, sequence: ++sequence, stage, status });
      latest = message;
      postMessage(message);
      return message;
    },
    snapshot() { return latest; }
  });
}

export function createFirstFrameProof({ submitted, completed, canvas, passes }) {
  return Object.freeze({ recorded: true, submitted: submitted === true,
    completed: completed === true, canvasConnected: canvas?.isConnected === true,
    passes: Number.isSafeInteger(passes) ? passes : 0,
    viewportWidth: Number.isSafeInteger(canvas?.width) ? canvas.width : 0,
    viewportHeight: Number.isSafeInteger(canvas?.height) ? canvas.height : 0 });
}

export function createCanvasFrameProof(canvas, view, dpr = globalThis.devicePixelRatio || 1) {
  const rect = canvas?.getBoundingClientRect?.();
  const cssRect = rect ? Object.freeze({ left: rect.left, top: rect.top,
    width: rect.width, height: rect.height }) : null;
  const view16 = new Float32Array(view);
  return Object.freeze({ cssRect,
    cssClient: Object.freeze({ width: canvas?.clientWidth ?? null, height: canvas?.clientHeight ?? null }),
    backing: Object.freeze({ width: canvas?.width ?? null, height: canvas?.height ?? null }),
    devicePixelRatio: Number.isFinite(dpr) && dpr > 0 ? dpr : null,
    view16: Object.freeze(Array.from(view16)), view16Bytes: view16.byteLength,
    worldToScreen: Object.freeze({ x: 'cssRect.left + worldX / view16[0] * cssRect.width',
      y: 'cssRect.top + worldY / view16[1] * cssRect.height' }) });
}

export function createGallerySfxHandler({ audio, verify, getRun, now,
  start, isRetired = () => false, onAudioEnabled = () => {} }) {
  const unlock = () => audio.unlockFromGesture().then(enabled => {
    if (enabled) onAudioEnabled();
    return enabled;
  });
  const play = () => audio.playActivation().then(played => {
    if (played) onAudioEnabled();
    return played;
  });
  return Object.freeze({
    activateFromGesture(item) {
      if (verify || audio?.muted || item?.id !== GALLERY_VERSION_ID || isRetired()) return false;
      const current = getRun();
      if (current?.mode === 'pulses') return unlock();
      const activationAge = current ? now() - current.startedAt : Infinity;
      if (activationAge >= DURATIONS['alchemy-particle-cannon']) {
        return unlock().then(unlocked => unlocked
          ? start('sequence', { sound: true }) : false);
      }
      return play();
    }
  });
}

const pageParams = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const startup = createStartupReporter({ galleryStartupToken: pageParams.get('galleryStartupToken'),
  galleryVersionId: pageParams.get('galleryVersionId'),
  galleryAttemptEpoch: pageParams.get('galleryAttemptEpoch') }, message =>
  window.parent.postMessage(message, location.origin));
let startupStage = 'child-document';
let retired = false;
let retireCleanup = null;
if (typeof window !== 'undefined') {
  window.__dvaGalleryStartupSnapshot = () => startup.snapshot();
  if (startup.enabled) startup.send('child-document', 'ready');
  window.addEventListener('message', event => {
    const data = event?.data;
    if (event.source === window.parent && event.origin === location.origin &&
        data?.schema === 'dva-gallery-startup/v1' && data.action === 'retire' &&
        data.token === pageParams.get('galleryStartupToken') &&
        data.versionId === GALLERY_VERSION_ID &&
        Number(data.attemptEpoch) === Number(pageParams.get('galleryAttemptEpoch'))) {
      retired = true;
      startup.send(startupStage, 'cancelled');
      retireCleanup?.();
    }
  });
}

export function fixtureBodyVertices({ activationAgeMs = null, pulseAgesMs = [], sourceEnabled = true } = {}) {
  let power = 0;
  if (sourceEnabled && Number.isFinite(activationAgeMs) && activationAgeMs >= 0 && activationAgeMs < 900)
    power = smooth(activationAgeMs / 55) * (1 - smooth((activationAgeMs - 520) / 380));
  if (sourceEnabled) for (const age of pulseAgesMs) {
    if (Number.isFinite(age) && age >= 0 && age < 420)
      power = Math.max(power, smooth(age / 28) * (1 - smooth((age - 330) / 90)));
  }
  const hand = HAND;
  const vertices = [];
  const baseline = [.20, .25, .30];
  const head = Array.from({ length: 16 }, (_, index) => {
    const angle = index / 16 * Math.PI * 2;
    return [146 + Math.cos(angle) * 7, 245 + Math.sin(angle) * 7];
  });
  const polygons = [
    { points: head, lit: false },
    { points: [[137,252],[153,252],[155,280],[139,280]], lit: false },
    { points: [[137,280],[143,280],[142,302],[137,302]], lit: false },
    { points: [[149,280],[155,280],[160,302],[154,302]], lit: false },
    { points: [[152,255],[160,264],[160,270],[151,261]], lit: true },
    { points: [[149,261],[155,261],[155,280],[150,280]], lit: true }
  ];
  const emit = (point, lit) => {
    const distance = Math.hypot(point[0] - hand.x, point[1] - hand.y);
    const reach = lit ? Math.max(0, 1 - distance / 32) * power : 0;
    const color = [baseline[0] + .04 * reach, baseline[1] + .28 * reach,
      baseline[2] + .20 * reach];
    vertices.push(point[0], point[1], ...color, 1, 0, 0);
  };
  for (const polygon of polygons) {
    const [first, ...rest] = polygon.points;
    for (let index = 0; index < rest.length - 1; index++) {
      emit(first, polygon.lit); emit(rest[index], polygon.lit); emit(rest[index + 1], polygon.lit);
    }
  }
  return new Float32Array(vertices);
}

export function createPulseReviewEvent({ causeId, frameId = FRAME_ID, startedAt = 0, variant = 'continuous' } = {}) {
  if (typeof causeId !== 'string' || !/^[a-z0-9][a-z0-9._:-]{0,95}$/i.test(causeId))
    throw new Error('invalid-native-review-cause-id');
  const id = `alchemy-cannon-review:${causeId}`;
  return { id, type: 'alchemy-particle-beam', startedAt, playerId: PLAYER_ID,
    variant, handWorld: { ...HAND, eventId: id, playerId: PLAYER_ID, frameId },
    targetX: ENDPOINT.x, targetY: ENDPOINT.y };
}

export function parsePulseReviewRequest(params) {
  if (!params?.has('pulsePhase') && !params?.has('causeId')) return null;
  const phaseMs = Number(params.get('pulsePhase'));
  const causeId = params.get('causeId') || '';
  const durationMs = DURATIONS['alchemy-particle-beam'];
  if (!Number.isFinite(phaseMs) || phaseMs < 0 || phaseMs > durationMs)
    throw new Error(`pulsePhase must be within 0..${durationMs}ms`);
  const variant = params.get('variant') || 'continuous';
  if (!['continuous','gbo-tenfold'].includes(variant)) throw new Error('unsupported-variant');
  const event = createPulseReviewEvent({ causeId, variant });
  return Object.freeze({ phaseMs, causeId, eventId: event.id, expiry: phaseMs === durationMs, variant });
}

export function createNativePulseProof({ request, frameId, sample, submittedFrames, lastDraw, queue }) {
  if (!request?.causeId || !request.eventId || !Number.isFinite(request.phaseMs))
    throw new Error('native pulse proof is missing its requested cause or age');
  const expiry = request.expiry === true;
  if (expiry) {
    if (request.phaseMs !== DURATIONS['alchemy-particle-beam'] || sample != null)
      throw new Error('native pulse expiry proof must request the exact deadline with no sample');
    if (lastDraw?.activeEvents?.length !== 0 || lastDraw?.expiredEventCount !== 1 ||
        lastDraw?.reviewCapture?.eventId !== request.eventId ||
        lastDraw?.reviewCapture?.causeId !== request.causeId ||
        lastDraw?.reviewCapture?.requestedAgeMs !== request.phaseMs ||
        lastDraw?.reviewCapture?.expiry !== true || lastDraw?.elapsedMs !== request.phaseMs)
      throw new Error('native pulse expiry proof does not match the submitted deadline draw');
  } else {
    if (!sample || sample.id !== request.eventId || sample.type !== 'alchemy-particle-beam')
      throw new Error('native pulse proof is not bound to the requested sampled cause');
    if (!lastDraw?.activeEvents?.some(event => event.id === request.eventId &&
        event.type === sample.type && event.ageMs === request.phaseMs))
      throw new Error('native pulse proof does not match the submitted draw cause and age');
  }
  if (!submittedFrames || lastDraw?.submitSequence !== submittedFrames || !queue?.completedAt || queue.error)
    throw new Error('native pulse proof is not bound to a completed submitted frame');
  return Object.freeze({ kind: expiry ? 'native-pulse-expiry' : 'native-pulse-phase', versionId: GALLERY_VERSION_ID,
    causeId: request.causeId, eventId: request.eventId, frameId, requestedAgeMs: request.phaseMs,
    sampledAgeMs: expiry ? null : sample.ageMs, phase: expiry ? 'expired' : sample.phase,
    endpoint: expiry ? null : sample.endpoint, variant: request.variant || 'continuous', vertexCount: expiry ? 0 : sample.vertices.length / 8,
    activeEventCount: lastDraw.activeEvents.length, expiredEventCount: lastDraw.expiredEventCount,
    display: lastDraw.display || null, submitted: true, submittedFrameSequence: submittedFrames,
    submittedSample: expiry ? null : Object.freeze({ ...lastDraw.activeEvents.find(event => event.id === request.eventId) }),
    submittedDraw: Object.freeze({ elapsedMs: lastDraw.elapsedMs, reviewCapture: lastDraw.reviewCapture,
      activeEventCount: lastDraw.activeEvents.length, expiredEventCount: lastDraw.expiredEventCount }),
    completed: true, queue: Object.freeze({ ...queue }) });
}

export function createFixtureEvents(mode = 'sequence', frameId = FRAME_ID, startedAt = 0, review = null,
    variant = 'continuous') {
  const events = [];
  if (!['continuous','gbo-tenfold'].includes(variant)) throw new Error('unsupported-variant');
  if (mode === 'pulse-review') return [createPulseReviewEvent({ ...review, frameId, startedAt,
    variant: review?.variant || variant })];
  if (mode === 'activation' || mode === 'sequence') {
    const id = 'alchemy-cannon-activation-1';
    events.push({ id, type: 'alchemy-particle-cannon', startedAt, playerId: PLAYER_ID,
      variant, handWorld: { ...HAND, eventId: id, playerId: PLAYER_ID, frameId },
      x: HAND.x - 14, y: HAND.y, targetX: ENDPOINT.x, targetY: ENDPOINT.y });
  }
  if (mode === 'pulses' || mode === 'sequence' || mode === 'normal2overlap' || mode === 'gbo10') {
    const count = mode === 'normal2overlap' ? 2 : mode === 'gbo10' ? 10 : PULSE_OFFSETS.length;
    const offsets = mode === 'normal2overlap' || mode === 'gbo10' ? Array(count).fill(0) : PULSE_OFFSETS;
    const pulseVariant = mode === 'gbo10' ? 'gbo-tenfold' : variant;
    for (let index = 0; index < count; index++) {
      const id = `alchemy-cannon-pulse-${index + 1}`;
      events.push({ id, type: 'alchemy-particle-beam', startedAt: startedAt + offsets[index],
        playerId: PLAYER_ID, variant: pulseVariant,
        handWorld: { ...HAND, eventId: id, playerId: PLAYER_ID, frameId },
        targetX: ENDPOINT.x, targetY: ENDPOINT.y });
    }
  }
  return events;
}

export function getFrameEvents(run, frameId, startedAt, review, variant) {
  if (run?.mode === 'pulse-review') {
    if (!run.reviewEvent || run.reviewEvent.id !== run.reviewRequest?.eventId ||
        run.reviewEvent.handWorld?.frameId !== run.frameId)
      throw new Error('held pulse review lost its stable event identity');
    return [run.reviewEvent];
  }
  return createFixtureEvents(run?.mode, frameId, startedAt, review, variant);
}

export function readControlQuery(params, name, fallback) {
  return params?.has(name) ? params.get(name) !== '0' : fallback;
}

export function readReducedMotionPreference(matchMedia = globalThis.matchMedia) {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('reducedMotion'))
    return new URLSearchParams(location.search).get('reducedMotion') === '1';
  return Boolean(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)')?.matches);
}

export function collectActiveSamples(events, nowMs, frameId,
    { observation = true, sourceEnabled = true, reducedMotion = false } = {}) {
  if (!sourceEnabled) return [];
  return events.map(event => sampleEvent(event, nowMs, frameId, { observation, reducedMotion }))
    .filter(sample => sample.vertices.length > 0);
}

export function createWebGPURenderer(canvas, gpu = globalThis.navigator?.gpu, onStage = () => {}) {
  return (async () => {
    onStage('adapter', 'pending');
    if (!gpu) throw new Error('WebGPU is unavailable in this browser');
    const adapter = await gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPU adapter unavailable');
    onStage('adapter', 'ready');
    onStage('device', 'pending');
    const device = await adapter.requestDevice();
    onStage('device', 'ready');
    let deviceLoss = null;
    const runtimeErrors = [];
    device.lost.then(info => {
      deviceLoss = { reason: info?.reason || 'unknown', message: info?.message || '' };
    }).catch(error => { deviceLoss = { reason: 'lost-promise-rejected', message: String(error?.message || error) }; });
    device.addEventListener?.('uncapturederror', event => {
      runtimeErrors.push({ message: String(event?.error?.message || event?.message || 'unknown GPU error'),
        errorName: String(event?.error?.name || 'GPUError') });
      if (runtimeErrors.length > 16) runtimeErrors.shift();
    });
    const context = canvas.getContext('webgpu');
    if (!context) throw new Error('canvas webgpu context unavailable');
    const format = gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });

    onStage('assets', 'pending');
    onStage('assets', 'ready');
    onStage('pipelines', 'pending');
    const module = device.createShaderModule({ label: `${VERSION} shader`, code: SHADER });
    const shaderMessages = await module.getCompilationInfo();
    const shaderErrors = shaderMessages.messages.filter(message => message.type === 'error');
    if (shaderErrors.length) {
      const error = new Error(shaderErrors.map(message =>
        `${message.lineNum}:${message.linePos} ${message.message}`).join('\n'));
      error.diagnostics = shaderErrors.map(message => ({ type: message.type,
        lineNum: message.lineNum, linePos: message.linePos, message: message.message }));
      throw error;
    }

    device.pushErrorScope('validation');
    let pipeline;
    let pipelineThrown = null;
    try {
      pipeline = device.createRenderPipeline({
        label: `${VERSION} pipeline`, layout: 'auto',
        vertex: { module, entryPoint: 'vs', buffers: [{ arrayStride: 32, attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x2' },
          { shaderLocation: 1, offset: 8, format: 'float32x4' },
          { shaderLocation: 2, offset: 24, format: 'float32x2' }
        ] }] },
        fragment: { module, entryPoint: 'fs', targets: [{ format, blend: {
          color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
        } }] },
        primitive: { topology: 'triangle-list' }
      });
    } catch (error) { pipelineThrown = error; }
    const pipelineError = await device.popErrorScope();
    if (pipelineThrown) throw pipelineThrown;
    if (pipelineError) throw new Error(`WebGPU pipeline validation: ${pipelineError.message}`);
    onStage('pipelines', 'ready');
    const uniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: uniform } }
    ] });
    let vertexBuffer = null;
    let vertexCapacity = 0;
    let submittedFrames = 0;
    let lastDraw = null;
    let lastQueueCompletion = null;
    let queueCompletionError = null;
    const view = new Float32Array([WIDTH, HEIGHT, 0, 0]);

    const render = (samples, { observation, sourceEnabled, reducedMotion = false, elapsedMs,
      bodyVertices, reviewCapture = null, expiredEventCount = 0 }) => {
      const totalFloats = samples.reduce((sum, sample) => sum + sample.vertices.length, bodyVertices.length);
      const vertices = new Float32Array(totalFloats);
      vertices.set(bodyVertices, 0);
      let offset = bodyVertices.length;
      for (const sample of samples) {
        vertices.set(sample.vertices, offset);
        offset += sample.vertices.length;
      }
      device.queue.writeBuffer(uniform, 0, view);
      if (vertices.length && vertices.length > vertexCapacity) {
        vertexBuffer?.destroy();
        vertexCapacity = 2 ** Math.ceil(Math.log2(vertices.length));
        vertexBuffer = device.createBuffer({ size: vertexCapacity * 4,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      }
      if (vertices.length) device.queue.writeBuffer(vertexBuffer, 0, vertices);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
      if (vertices.length) {
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setVertexBuffer(0, vertexBuffer);
        pass.draw(vertices.length / 8);
      }
      pass.end();
      device.queue.submit([encoder.finish()]);
      submittedFrames++;
      lastDraw = { elapsedMs, observation, sourceEnabled, reducedMotion,
        display: createCanvasFrameProof(canvas, view),
        activeEvents: samples.map(sample => ({ id: sample.id, type: sample.type,
          ageMs: sample.ageMs, phase: sample.phase, endpoint: sample.endpoint })),
        expiredEventCount, reviewCapture: reviewCapture ? { ...reviewCapture } : null,
        vertexCount: vertices.length / 8, submitSequence: submittedFrames };
      return lastDraw;
    };

    return {
      device, shaderMessages: shaderMessages.messages.map(message => ({ type: message.type,
        lineNum: message.lineNum, linePos: message.linePos, message: message.message })),
      render,
      async finishQueue() {
        if (typeof device.queue.onSubmittedWorkDone !== 'function') return { available: false };
        try {
          await device.queue.onSubmittedWorkDone();
          lastQueueCompletion = new Date().toISOString();
        } catch (error) { queueCompletionError = String(error?.message || error); }
        return { available: true, completedAt: lastQueueCompletion, error: queueCompletionError };
      },
      proof() { return { submittedFrames, lastDraw, lastQueueCompletion, queueCompletionError,
        deviceLoss, runtimeErrors: runtimeErrors.slice() }; },
      destroy() { vertexBuffer?.destroy(); uniform.destroy(); device.destroy(); }
    };
  })();
}

async function boot() {
  const canvas = document.querySelector('#effect');
  const status = document.querySelector('#status');
  const modeLabel = document.querySelector('#mode');
  const obsControl = document.querySelector('#observation');
  const sourceControl = document.querySelector('#source');
  obsControl.checked = readControlQuery(pageParams, 'observation', obsControl.checked);
  sourceControl.checked = readControlQuery(pageParams, 'source', sourceControl.checked);
  const verify = new URLSearchParams(location.search).has('verify');
  const audio = createActivationAudio({ muted: verify });
  let pendingParentGesture = false;
  canvas.addEventListener('pointerdown', () => {
    if (verify) return;
    void audio.unlockFromGesture().then(unlocked => {
      if (!unlocked) return;
      if (window.__gallerySfx) {
        pendingParentGesture = false;
        void window.__gallerySfx.activateFromGesture({ id: GALLERY_VERSION_ID });
      } else pendingParentGesture = true;
    }).catch(error => {
      if (status) status.textContent = `Audio unlock error: ${error?.message || error}`;
    });
  });
  if (modeLabel) modeLabel.textContent = verify ? 'VERIFY · AUDIO HARD MUTED' : 'STANDALONE FIXTURE';
  startupStage = 'assets';
  startup.send('assets', 'pending');
  const sourcePins = await verifyRuntimeSourcePins();
  window.__cannonR10SourcePins = sourcePins;
  startup.send('assets', 'ready', { sourcePins });
  startupStage = 'adapter';
  const renderer = await createWebGPURenderer(canvas, globalThis.navigator?.gpu, (stage, state) => {
    startupStage = stage;
    startup.send(stage, state);
  });
  let sequence = 0;
  let animationFrame = 0;
  let run = null;
  let lastMode = 'sequence';
  let queueFinalized = false;
  let firstFramePending = false;
  let audioEnabled = false;
  let lastReducedMotion = false;
  let pendingNativeReviewResolve = null;
  const galleryAutoLoop = pageParams.get('galleryAutoLoop') === '1';
  const fixtureVariant = pageParams.get('variant') === 'gbo-tenfold' ? 'gbo-tenfold' : 'continuous';
  if (retired) { renderer.destroy(); await audio.dispose(); return; }

  let disposed = false;
  retireCleanup = () => {
    if (disposed) return;
    disposed = true;
    retired = true;
    run = null;
    cancelAnimationFrame(animationFrame);
    pendingNativeReviewResolve?.(null);
    pendingNativeReviewResolve = null;
    renderer.destroy();
    void audio.dispose();
  };

  function publishProof(extra = {}) {
    window.__alchemyCannonProof = { version: VERSION, sourcePins, durations: DURATIONS,
      verify, audioMuted: audio.muted, submittedFrames: renderer.proof().submittedFrames,
      queue: { completedAt: renderer.proof().lastQueueCompletion,
        error: renderer.proof().queueCompletionError }, lastDraw: renderer.proof().lastDraw,
      shaderMessages: renderer.shaderMessages, settings: { observation: obsControl.checked,
        sourceEnabled: sourceControl.checked, reducedMotion: lastReducedMotion }, ...extra };
  }

  const frame = timestamp => {
    if (!run || retired) return;
    try {
    const nativeReview = run.mode === 'pulse-review';
    const elapsed = Math.max(0, timestamp - run.startedAt);
    const sampleNowMs = nativeReview ? run.reviewRequest.phaseMs : timestamp;
    const eventStartedAt = nativeReview ? 0 : run.startedAt;
    const sampleElapsedMs = nativeReview ? run.reviewRequest.phaseMs : elapsed;
    const reducedMotion = readReducedMotionPreference();
    lastReducedMotion = reducedMotion;
    const events = getFrameEvents(run, run.frameId, eventStartedAt,
      nativeReview ? { causeId: run.reviewRequest.causeId, variant: run.reviewRequest.variant } : null,
      nativeReview ? run.reviewRequest.variant : fixtureVariant);
    const active = collectActiveSamples(events, sampleNowMs, run.frameId, {
      observation: obsControl.checked, sourceEnabled: sourceControl.checked, reducedMotion
    });
    const activationSample = active.find(sample => sample.type === 'alchemy-particle-cannon');
    const pulseAges = active.filter(sample => sample.type === 'alchemy-particle-beam').map(sample => sample.ageMs);
    const bodyVertices = fixtureBodyVertices({ activationAgeMs: activationSample?.ageMs ?? null,
      pulseAgesMs: pulseAges, sourceEnabled: sourceControl.checked });
    renderer.render(active, { observation: obsControl.checked,
      sourceEnabled: sourceControl.checked, reducedMotion, elapsedMs: sampleElapsedMs, bodyVertices,
      reviewCapture: nativeReview ? { eventId: run.reviewRequest.eventId,
        causeId: run.reviewRequest.causeId, requestedAgeMs: run.reviewRequest.phaseMs,
        expiry: run.reviewRequest.expiry } : null,
      expiredEventCount: events.filter(event => sampleNowMs - event.startedAt >= DURATIONS[event.type]).length });
    if (!firstFramePending && startup.enabled) {
      firstFramePending = true;
      startupStage = 'first-frame';
      startup.send('first-frame', 'pending');
      renderer.finishQueue().then(queue => {
        if (retired) return;
        if (!queue.completedAt || queue.error) {
          startup.send('first-frame', 'error', { error: { code: 'FIRST_FRAME_QUEUE_INCOMPLETE',
            message: queue.error || 'queue completion was not recorded' } });
          return;
        }
        const firstFrame = createFirstFrameProof({ submitted: true, completed: true,
          canvas, passes: 1 });
        startup.send('first-frame', 'ready');
        startupStage = 'playing';
        startup.send('playing', 'ready', { firstFrame });
        publishProof({ firstFrame });
      }).catch(error => {
        startup.send('first-frame', 'error', { error: { code: 'FIRST_FRAME_QUEUE_ERROR',
          message: String(error?.message || error) } });
      });
    }
    publishProof({ mode: run.mode, frameId: run.frameId, elapsedMs: sampleElapsedMs,
      timelineEvents: events.map(event => ({ id: event.id, type: event.type,
        startsAt: nativeReview ? event.startedAt : event.startedAt - run.startedAt, durationMs: DURATIONS[event.type] })),
      expiredEventCount: events.filter(event => sampleNowMs - event.startedAt >= DURATIONS[event.type]).length,
      nativeReviewRequest: nativeReview ? { ...run.reviewRequest } : undefined,
      fixtureBody: { bounds: { x: 137, y: 238, width: 23, height: 64 }, hand: HAND,
        sourcePower: sourceControl.checked, litGeometryVertices: 12 } });
    if (nativeReview) {
      if (!queueFinalized) {
        queueFinalized = true;
        const reviewRequest = run.reviewRequest;
        const reviewFrameId = run.frameId;
        const reviewSample = active.find(sample => sample.id === reviewRequest.eventId);
        renderer.finishQueue().then(queue => {
          if (retired) return;
          const proof = createNativePulseProof({ request: reviewRequest, frameId: reviewFrameId,
            sample: reviewSample, submittedFrames: renderer.proof().submittedFrames,
            lastDraw: renderer.proof().lastDraw, queue });
          status.textContent = `Pulse phase ${proof.sampledAgeMs} ms · queue ${proof.completed ? 'completed' : 'incomplete'}`;
          animationFrame = 0;
          publishProof({ mode: 'pulse-review', frameId: reviewFrameId, elapsedMs: reviewRequest.phaseMs,
            queue, timelineComplete: true, nativePulseProof: proof });
          pendingNativeReviewResolve?.(window.__alchemyCannonProof);
          pendingNativeReviewResolve = null;
        }).catch(error => {
          run = null;
          animationFrame = 0;
          const failure = { error: String(error?.message || error), frameFailure: true,
            mode: 'pulse-review', frameId: reviewFrameId, nativeReviewRequest: reviewRequest };
          publishProof(failure);
          pendingNativeReviewResolve?.(window.__alchemyCannonProof);
          pendingNativeReviewResolve = null;
        });
      }
      return;
    }
    if (elapsed >= FIELD_MS) {
      if (!queueFinalized) {
        queueFinalized = true;
        const completedMode = run.mode;
        const completedFrameId = run.frameId;
        renderer.finishQueue().then(queue => {
          status.textContent = 'Sequence complete; GPU queue ' + (queue.completedAt ? 'settled' : queue.available ? 'failed' : 'completion unavailable');
          publishProof({ mode: completedMode, frameId: completedFrameId, elapsedMs: elapsed,
            queue, timelineComplete: true });
          if (galleryAutoLoop && !retired && !run && queue.available && queue.completedAt && !queue.error) {
            void start(lastMode, { sound: audioEnabled && lastMode !== 'pulses' });
          }
        });
      }
      run = null;
      cancelAnimationFrame(animationFrame);
      return;
    }
    animationFrame = requestAnimationFrame(frame);
    } catch (error) {
      run = null;
      status.textContent = `Frame error: ${error?.message || error}`;
      publishProof({ error: String(error?.message || error), frameFailure: true });
      pendingNativeReviewResolve?.(window.__alchemyCannonProof);
      pendingNativeReviewResolve = null;
      if (startup.enabled) startup.send(startupStage, 'error', { error: {
        code: 'CANNON_PREVIEW_FRAME_ERROR', message: String(error?.message || error).slice(0, 1200) } });
    }
  };

  async function start(mode, { sound = false, phaseMs = 0, causeId = '' } = {}) {
    if (retired) return;
    if (mode === 'pulse-review') {
      const params = new URLSearchParams({ pulsePhase: String(phaseMs), causeId, variant: fixtureVariant });
      const request = parsePulseReviewRequest(params);
      if (!request) throw new Error('pulse review request is required');
      sound = false;
    }
    cancelAnimationFrame(animationFrame);
    sequence++;
    queueFinalized = false;
    audio.reset();
    if (sound && (mode === 'activation' || mode === 'sequence')) {
      try { if (await audio.playActivation()) audioEnabled = true; }
      catch (error) { status.textContent = `Audio error: ${error?.message || error}`; }
    }
    const now = performance.now();
    lastMode = mode;
    const reviewRequest = mode === 'pulse-review'
      ? parsePulseReviewRequest(new URLSearchParams({ pulsePhase: String(phaseMs), causeId, variant: fixtureVariant })) : null;
    const frameId = `${FRAME_ID}-${sequence}`;
    const reviewEvent = reviewRequest ? createPulseReviewEvent({ causeId: reviewRequest.causeId,
      frameId, startedAt: 0, variant: reviewRequest.variant }) : null;
    run = { mode, startedAt: now, frameId,
      ...(reviewRequest ? { reviewRequest, reviewEvent } : {}) };
    status.textContent = mode === 'pulse-review' ? `Pulse review ${reviewRequest.phaseMs} ms · ${reviewRequest.causeId}`
      : mode === 'pulses' ? 'Pulse stream running · audio silent' : mode === 'normal2overlap' ? 'Normal 2 overlap · audio silent' : mode === 'gbo10' ? 'GBO 10 live · audio silent' : 'Activation running';
    animationFrame = requestAnimationFrame(frame);
  }

  function capturePulsePhase({ phaseMs, causeId } = {}) {
    const request = parsePulseReviewRequest(new URLSearchParams({ pulsePhase: String(phaseMs), causeId: String(causeId || ''), variant: fixtureVariant }));
    pendingNativeReviewResolve?.(null);
    return new Promise(resolve => {
      pendingNativeReviewResolve = resolve;
      if (run?.mode === 'pulse-review' && run.reviewRequest.eventId === request.eventId &&
          run.reviewRequest.phaseMs === request.phaseMs && run.reviewRequest.variant === request.variant) {
        queueFinalized = false;
        if (!animationFrame) animationFrame = requestAnimationFrame(frame);
      } else {
        void start('pulse-review', { phaseMs, causeId }).catch(error => {
          pendingNativeReviewResolve = null;
          resolve({ error: String(error?.message || error), frameFailure: true });
        });
      }
    });
  }

  document.querySelector('#activation').addEventListener('click', () => start('activation', { sound: true }));
  document.querySelector('#pulses').addEventListener('click', () => start('pulses'));
  document.querySelector('#sequence').addEventListener('click', () => start('sequence', { sound: true }));
  document.querySelector('#normal-overlap').addEventListener('click', () => start('normal2overlap'));
  document.querySelector('#gbo-10').addEventListener('click', () => start('gbo10'));
  const restartCurrent = () => {
    if (run?.mode === 'pulse-review') {
      queueFinalized = false;
      if (!animationFrame) animationFrame = requestAnimationFrame(frame);
      return;
    }
    if (run) return start(run.mode);
    return start(lastMode);
  };
  obsControl.addEventListener('change', restartCurrent);
  sourceControl.addEventListener('change', restartCurrent);
  publishProof();
  window.__gallerySfx = createGallerySfxHandler({ audio, verify, getRun: () => run,
    now: () => performance.now(), start, isRetired: () => retired,
    onAudioEnabled: () => { audioEnabled = true; } });
  if (pendingParentGesture) {
    pendingParentGesture = false;
    void window.__gallerySfx.activateFromGesture({ id: GALLERY_VERSION_ID });
  }
  window.__alchemyCannonNativeReview = Object.freeze({ capturePulsePhase,
    snapshot: () => window.__alchemyCannonProof || null });
  status.textContent = 'Ready · select a replay mode';
  const phaseRequest = parsePulseReviewRequest(pageParams);
  if (phaseRequest) void capturePulsePhase(phaseRequest);
  else { const requestedMode = pageParams.get('mode');
    start(['activation','pulses','sequence','normal2overlap','gbo10'].includes(requestedMode) ? requestedMode : 'sequence');
  }
  window.addEventListener('pagehide', () => retireCleanup?.(), { once: true });
}

  if (typeof document !== 'undefined' && document.querySelector('#effect')) {
  boot().catch(error => {
    const status = document.querySelector('#status');
    if (status) status.textContent = `WebGPU error: ${error?.message || error}`;
    window.__alchemyCannonProof = { version: VERSION, error: String(error?.message || error),
      shaderMessages: error?.diagnostics || [], verify: new URLSearchParams(location.search).has('verify') };
    if (startup.enabled) startup.send(startupStage, 'error', { error: {
      code: 'CANNON_PREVIEW_STARTUP_ERROR', message: String(error?.message || error).slice(0, 1200),
      diagnostics: error?.diagnostics || [] } });
  });
}


