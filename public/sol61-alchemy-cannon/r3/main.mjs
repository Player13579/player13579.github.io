import { VERSION, DURATIONS, sampleEvent, SHADER } from './effect.mjs';
import { createActivationAudio } from './audio.mjs';

export const FRAME_ID = 'alchemy-cannon-fixture-frame-1';
export const GALLERY_VERSION_ID = 'alchemy-cannon-sol61-r3';
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

export function createFixtureEvents(mode = 'sequence', frameId = FRAME_ID, startedAt = 0) {
  const events = [];
  if (mode === 'activation' || mode === 'sequence') {
    const id = 'alchemy-cannon-activation-1';
    events.push({ id, type: 'alchemy-particle-cannon', startedAt, playerId: PLAYER_ID,
      variant: 'continuous', handWorld: { ...HAND, eventId: id, playerId: PLAYER_ID, frameId },
      x: HAND.x - 14, y: HAND.y, targetX: ENDPOINT.x, targetY: ENDPOINT.y });
  }
  if (mode === 'pulses' || mode === 'sequence') {
    for (let index = 0; index < PULSE_OFFSETS.length; index++) {
      const id = `alchemy-cannon-pulse-${index + 1}`;
      events.push({ id, type: 'alchemy-particle-beam',
        startedAt: startedAt + PULSE_OFFSETS[index], playerId: PLAYER_ID,
        variant: 'continuous', handWorld: { ...HAND, eventId: id, playerId: PLAYER_ID, frameId },
        targetX: ENDPOINT.x, targetY: ENDPOINT.y });
    }
  }
  return events;
}

export function readReducedMotionPreference(matchMedia = globalThis.matchMedia) {
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

    const render = (samples, { observation, sourceEnabled, reducedMotion = false, elapsedMs, bodyVertices }) => {
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
        activeEvents: samples.map(sample => ({ id: sample.id, type: sample.type,
          ageMs: sample.ageMs, phase: sample.phase, endpoint: sample.endpoint })),
        vertexCount: vertices.length / 8 };
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
  const galleryAutoLoop = pageParams.get('galleryAutoLoop') === '1';
  if (retired) { renderer.destroy(); await audio.dispose(); return; }

  let disposed = false;
  retireCleanup = () => {
    if (disposed) return;
    disposed = true;
    retired = true;
    run = null;
    cancelAnimationFrame(animationFrame);
    renderer.destroy();
    void audio.dispose();
  };

  function publishProof(extra = {}) {
    window.__alchemyCannonProof = { version: VERSION, durations: DURATIONS,
      verify, audioMuted: audio.muted, submittedFrames: renderer.proof().submittedFrames,
      queue: { completedAt: renderer.proof().lastQueueCompletion,
        error: renderer.proof().queueCompletionError }, lastDraw: renderer.proof().lastDraw,
      shaderMessages: renderer.shaderMessages, settings: { observation: obsControl.checked,
        sourceEnabled: sourceControl.checked, reducedMotion: lastReducedMotion }, ...extra };
  }

  const frame = timestamp => {
    if (!run || retired) return;
    try {
    const elapsed = Math.max(0, timestamp - run.startedAt);
    const reducedMotion = readReducedMotionPreference();
    lastReducedMotion = reducedMotion;
    const events = createFixtureEvents(run.mode, run.frameId, run.startedAt);
    const active = collectActiveSamples(events, timestamp, run.frameId, {
      observation: obsControl.checked, sourceEnabled: sourceControl.checked, reducedMotion
    });
    const activationSample = active.find(sample => sample.type === 'alchemy-particle-cannon');
    const pulseAges = active.filter(sample => sample.type === 'alchemy-particle-beam').map(sample => sample.ageMs);
    const bodyVertices = fixtureBodyVertices({ activationAgeMs: activationSample?.ageMs ?? null,
      pulseAgesMs: pulseAges, sourceEnabled: sourceControl.checked });
    renderer.render(active, { observation: obsControl.checked,
      sourceEnabled: sourceControl.checked, reducedMotion, elapsedMs: elapsed, bodyVertices });
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
    publishProof({ mode: run.mode, frameId: run.frameId, elapsedMs: elapsed,
      timelineEvents: events.map(event => ({ id: event.id, type: event.type,
        startsAt: event.startedAt - run.startedAt, durationMs: DURATIONS[event.type] })),
      expiredEventCount: events.filter(event => timestamp - event.startedAt >= DURATIONS[event.type]).length,
      fixtureBody: { bounds: { x: 137, y: 238, width: 23, height: 64 }, hand: HAND,
        sourcePower: sourceControl.checked, litGeometryVertices: 12 } });
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
      if (startup.enabled) startup.send(startupStage, 'error', { error: {
        code: 'CANNON_PREVIEW_FRAME_ERROR', message: String(error?.message || error).slice(0, 1200) } });
    }
  };

  async function start(mode, { sound = false } = {}) {
    if (retired) return;
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
    run = { mode, startedAt: now, frameId: `${FRAME_ID}-${sequence}` };
    status.textContent = mode === 'pulses' ? 'Pulse stream running · audio silent' : 'Activation running';
    animationFrame = requestAnimationFrame(frame);
  }

  document.querySelector('#activation').addEventListener('click', () => start('activation', { sound: true }));
  document.querySelector('#pulses').addEventListener('click', () => start('pulses'));
  document.querySelector('#sequence').addEventListener('click', () => start('sequence', { sound: true }));
  obsControl.addEventListener('change', () => run ? start(run.mode) : start(lastMode));
  sourceControl.addEventListener('change', () => run ? start(run.mode) : start(lastMode));
  publishProof();
  window.__gallerySfx = createGallerySfxHandler({ audio, verify, getRun: () => run,
    now: () => performance.now(), start, isRetired: () => retired,
    onAudioEnabled: () => { audioEnabled = true; } });
  if (pendingParentGesture) {
    pendingParentGesture = false;
    void window.__gallerySfx.activateFromGesture({ id: GALLERY_VERSION_ID });
  }
  status.textContent = 'Ready · select a replay mode';
  start('sequence');
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
