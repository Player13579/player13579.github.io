import { sampleSword } from './geometry.mjs';
import { startFractureVoice } from './sfx.mjs';

export const VERSION = 'gbo-abstract-sword-weapon-destruction-sol61-luminous-r6';
export const GEOMETRY_EDITION = 6;
export const DURATION = 1.6;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const defaults = Object.freeze({ observerOn: true, emissionOn: true, reducedMotion: false, heightPx: 64, centerX: 0.5, centerY: 0.52, weaponType: 'generic' });
const normalizeSettings = (base, next = {}) => {
  const value = { ...base, ...next };
  for (const key of ['heightPx', 'centerX', 'centerY']) if (!Number.isFinite(value[key])) throw new RangeError(`INVALID_${key.toUpperCase()}`);
  value.heightPx = clamp(value.heightPx, 12, 256); value.centerX = clamp(value.centerX, 0, 1); value.centerY = clamp(value.centerY, 0, 1);
  return value;
};

export async function createGboWeaponDestruction({ canvas, verify = false, options = {}, deps = {}, onPhase } = {}) {
  if (!canvas) throw new TypeError('canvas is required');
  const gpu = deps.gpu ?? globalThis.navigator?.gpu;
  if (!gpu) throw new Error('WebGPU is unavailable');
  const now = deps.now ?? (() => globalThis.performance.now());
  const raf = deps.requestAnimationFrame ?? (fn => globalThis.requestAnimationFrame(fn));
  const caf = deps.cancelAnimationFrame ?? (id => globalThis.cancelAnimationFrame(id));
  const ctx = canvas.getContext('webgpu');
  if (!ctx) throw new Error('Canvas WebGPU context unavailable');
  let current = normalizeSettings(defaults, options);
  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new Error('WebGPU adapter unavailable');
  const device = await adapter.requestDevice();
  const format = gpu.getPreferredCanvasFormat();
  let generation = 0, cause = 0, rafId = null, disposed = false, stopped = true, fatal = null;
  let startedAt = 0, heldAge = null, lastReceipt = null, pending = null, lastSubmission = null;
  let audioContext = null, voices = new Set(), audioCause = -1, audioMuted = !!verify, audioEpoch = 0;
  let hdr = null, hdrEmission = null, hdrBind = null, uniform = null, vertex = null, capacity = 0, hdrWidth = 0, hdrHeight = 0;
  let drawing = false, drawingDone = Promise.resolve(), disposePromise = null;
  let queueFailure = null, lastQueueCompleted = true, lossInfoValue = null, lossWasExpected = false, unexpectedLoss = false;
  const disposal = { queueDrained: false, unconfigured: false, resourcesDestroyed: false, deviceDestroyCalled: false, expectedLoss: false, result: 'active', error: null };
  const notify = phase => { try { onPhase?.(phase); } catch {} };
  const recordError = error => { if (!disposal.error) disposal.error = String(error?.message ?? error); };
  const stopVoices = () => { for (const v of voices) { try { v.stop(); } catch {} try { v.disconnect(); } catch {} } voices.clear(); };
  const fail = error => {
    recordError(error);
    if (!fatal) fatal = error instanceof Error ? error : new Error(String(error));
    stopped = true; generation++;
    if (rafId !== null) caf(rafId); rafId = null; stopVoices(); notify('error');
  };
  let errorListenerAttached = false;
  const onUncapturedError = event => fail(event?.error ?? new Error('Uncaptured WebGPU error'));
  if (typeof device.addEventListener === 'function') { device.addEventListener('uncapturederror', onUncapturedError); errorListenerAttached = true; }
  const removeErrorListener = () => { if (errorListenerAttached) { try { device.removeEventListener('uncapturederror', onUncapturedError); } catch (error) { recordError(error); } errorListenerAttached = false; } };
  device.lost?.then(info => {
    lossInfoValue = info;
    lossWasExpected = info?.reason === 'destroyed' && disposal.deviceDestroyCalled;
    if (lossWasExpected) disposal.expectedLoss = true;
    else {
      const error = new Error(`Unexpected WebGPU device loss (${info?.reason ?? 'unknown'}): ${info?.message ?? ''}`);
      unexpectedLoss = true; recordError(error); fail(error);
      if (disposed) disposal.result = 'unexpected-device-loss';
    }
  }).catch(error => { recordError(error); fail(error); if (disposed) disposal.result = 'device-loss-report-failed'; });

  const loadShader = deps.loadShader ?? (async name => {
    const response = await fetch(new URL(name, import.meta.url));
    if (!response.ok) throw new Error(`Shader load failed: ${name} (${response.status})`);
    return response.text();
  });
  let worldPipeline, observerPipeline;
  const premultipliedBlend = {
    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
  };
  try {
    ctx.configure({ device, format, alphaMode: 'premultiplied' });
    const [worldCode, observerCode] = await Promise.all([loadShader('./world.wgsl'), loadShader('./observer.wgsl')]);
    const worldModule = device.createShaderModule({ code: worldCode });
    const observerModule = device.createShaderModule({ code: observerCode });
    worldPipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: worldModule, entryPoint: 'worldVS', buffers: [{ arrayStride: 40, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }, { shaderLocation: 1, offset: 8, format: 'float32x4' }, { shaderLocation: 2, offset: 24, format: 'float32x4' }] }] },
      fragment: { module: worldModule, entryPoint: 'worldFS', targets: [{ format: 'rgba16float', blend: premultipliedBlend }, { format: 'rgba16float', blend: premultipliedBlend }] },
      primitive: { topology: 'triangle-list' }
    });
    observerPipeline = device.createRenderPipeline({
      layout: 'auto', vertex: { module: observerModule, entryPoint: 'screenVS' },
      fragment: { module: observerModule, entryPoint: 'observerFS', targets: [{ format, blend: premultipliedBlend }] },
      primitive: { topology: 'triangle-list' }
    });
  } catch (error) {
    removeErrorListener();
    try { ctx.unconfigure?.(); disposal.unconfigured = typeof ctx.unconfigure === 'function'; } catch (e) { recordError(e); }
    try { device.destroy?.(); disposal.deviceDestroyCalled = typeof device.destroy === 'function'; } catch (e) { recordError(e); }
    disposal.result = 'initialization-failed'; recordError(error); throw error;
  }

  const retireHDR = async () => {
    if (!hdr) return;
    await (lastSubmission ?? Promise.resolve());
    if (queueFailure) throw queueFailure;
    const old = hdr, oldEmission = hdrEmission; hdr = null; hdrEmission = null; hdrBind = null; hdrWidth = 0; hdrHeight = 0;
    old.destroy(); oldEmission?.destroy();
  };
  const ensureTargets = async () => {
    const width = canvas.width, height = canvas.height;
    const max = device.limits?.maxTextureDimension2D ?? Number.MAX_SAFE_INTEGER;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 || width > max || height > max) throw new RangeError('INVALID_VIEWPORT');
    if (hdr && hdrWidth === width && hdrHeight === height) return { width, height };
    await retireHDR();
    uniform?.destroy?.(); uniform = null;
    hdr = device.createTexture({ size: { width, height, depthOrArrayLayers: 1 }, format: 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    hdrEmission = device.createTexture({ size: { width, height, depthOrArrayLayers: 1 }, format: 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    hdrWidth = width; hdrHeight = height;
    uniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    hdrBind = device.createBindGroup({ layout: observerPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: hdr.createView() },
      { binding: 1, resource: device.createSampler({ magFilter: 'linear', minFilter: 'linear' }) },
      { binding: 2, resource: { buffer: uniform } },
      { binding: 3, resource: hdrEmission.createView() }
    ] });
    return { width, height };
  };
  const ensureVertex = needed => {
    if (needed <= capacity) return;
    const next = Math.max(384, 2 ** Math.ceil(Math.log2(needed)));
    vertex?.destroy?.(); vertex = device.createBuffer({ size: next * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST }); capacity = next;
  };
  const ageNow = () => stopped ? (heldAge ?? 0) : clamp((now() - startedAt) / 1000, 0, DURATION);
  const launchAudio = (audioCauseId, audioGeneration, age) => {
    if (verify || audioMuted || disposed || stopped || fatal || audioCause === audioCauseId || !audioContext || audioContext.state !== 'running') return false;
    if (cause !== audioCauseId || generation !== audioGeneration) return false;
    const result = startFractureVoice(audioContext, audioCauseId, age);
    audioCause = audioCauseId;
    if (result.expired) return false;
    const { source, gain } = result;
    source.onended = () => { voices.delete(source); try { source.disconnect(); gain.disconnect(); } catch {} };
    voices.add(source);
    return true;
  };
  async function activateAudioFromGesture() {
    if (verify || audioMuted || disposed || stopped || fatal || audioCause === cause) return false;
    const requestedCause = cause, requestedGeneration = generation, requestedAudioEpoch = audioEpoch;
    try {
      if (!audioContext) {
        const Ctor = deps.AudioContext ?? globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!Ctor) return false;
        audioContext = new Ctor();
      }
      await audioContext.resume();
      if (audioContext.state !== 'running' || disposed || stopped || fatal || audioMuted || audioEpoch !== requestedAudioEpoch || cause !== requestedCause || generation !== requestedGeneration) return false;
      return launchAudio(requestedCause, requestedGeneration, ageNow());
    } catch { return false; }
  }
  const passes = Object.freeze(['PH/WORLD', 'OBS']);
  const submitFrame = async (age, gen, frameCause, force = false) => {
    if (drawing || disposed || (stopped && !force) || fatal || gen !== generation) return;
    drawing = true;
    let finishDrawing; drawingDone = new Promise(resolve => { finishDrawing = resolve; });
    try {
      if (pending) await pending;
      if (disposed || (stopped && !force) || fatal || gen !== generation) return;
      const { width, height } = await ensureTargets();
      if (disposed || (stopped && !force) || fatal || gen !== generation) return;
      const settings = Object.freeze({ ...current });
      const sample = sampleSword(age, settings, { width, height });
      const sourceReceipt = Object.freeze({ ...sample.source });
      ensureVertex(sample.vertices.length);
      if (sample.vertices.length) device.queue.writeBuffer(vertex, 0, sample.vertices);
      device.queue.writeBuffer(uniform, 0, new Float32Array([width, height, settings.observerOn ? 1 : 0, format.endsWith('-srgb') ? 0 : 1, width / (canvas.getBoundingClientRect?.().width || width), height / (canvas.getBoundingClientRect?.().height || height), 0, 0]));
      const encoder = device.createCommandEncoder();
      const worldPass = encoder.beginRenderPass({ colorAttachments: [{ view: hdr.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }, { view: hdrEmission.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
      worldPass.setPipeline(worldPipeline); if (sample.vertices.length) { worldPass.setVertexBuffer(0, vertex); worldPass.draw(sample.count); } worldPass.end();
      const observerPass = encoder.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
      observerPass.setPipeline(observerPipeline); observerPass.setBindGroup(0, hdrBind); observerPass.draw(3); observerPass.end();
      const command = encoder.finish(), submittedAt = now();
      const receipt = Object.freeze({ cause: frameCause, generation: gen, submission: ++submissionId, passes, source: sourceReceipt, viewport: Object.freeze({ width, height }), age, phase: sample.phase, settings, active: sample.active, submittedAt, completed: false });
      device.queue.submit([command]); lastQueueCompleted = false;
      const completion = Promise.resolve(device.queue.onSubmittedWorkDone()).then(() => {
        lastQueueCompleted = true;
        if (!disposed && cause === frameCause && generation === gen) lastReceipt = Object.freeze({ ...receipt, completed: true, completedAt: now() });
      }).catch(error => { queueFailure = error; lastQueueCompleted = false; if (disposed) recordError(error); else fail(error); }).finally(() => { if (pending === completion) pending = null; });
      lastSubmission = completion; pending = completion; notify(receipt.phase);
    } catch (error) { fail(error); }
    finally { drawing = false; finishDrawing(); }
  };
  let submissionId = 0;
  const frame = () => {
    rafId = null;
    if (disposed || stopped || fatal) return;
    const age = ageNow(), gen = generation, frameCause = cause;
    submitFrame(age, gen, frameCause).finally(() => {
      if (disposed || generation !== gen || cause !== frameCause || fatal) return;
      if (!stopped && age < DURATION) rafId = raf(loop);
      else if (age >= DURATION) { stopped = true; heldAge = DURATION; stopVoices(); notify('complete'); }
    });
  };
  const loop = () => frame();
  const clear = async () => {
    if (rafId !== null) caf(rafId); rafId = null;
    await drawingDone; await pending; await lastSubmission;
    if (disposed) return;
    if (queueFailure) throw queueFailure;
    const { width, height } = await ensureTargets();
    const settings = Object.freeze({ ...current }), age = heldAge ?? 0, gen = generation, frameCause = cause;
    const encoder = device.createCommandEncoder();
    const worldPass = encoder.beginRenderPass({ colorAttachments: [{ view: hdr.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }, { view: hdrEmission.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] }); worldPass.end();
    const observerPass = encoder.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] }); observerPass.end();
    const command = encoder.finish(), submittedAt = now();
    const receipt = Object.freeze({ cause: frameCause, generation: gen, submission: ++submissionId, passes, source: null, viewport: Object.freeze({ width, height }), age, phase: 'clear', settings, active: false, submittedAt, completed: false });
    device.queue.submit([command]); lastQueueCompleted = false;
    const completion = Promise.resolve(device.queue.onSubmittedWorkDone()).then(() => {
      lastQueueCompleted = true;
      if (!disposed && gen === generation && frameCause === cause) lastReceipt = Object.freeze({ ...receipt, completed: true, completedAt: now() });
    }).catch(error => { queueFailure = error; lastQueueCompleted = false; if (disposed) recordError(error); else fail(error); throw error; });
    lastSubmission = completion; pending = completion;
    await completion;
  };
  const awaitTerminal = async () => {
    if (lossInfoValue) return lossInfoValue;
    if (!device.lost) return null;
    let timer;
    try {
      return await Promise.race([device.lost, new Promise(resolve => { timer = setTimeout(() => resolve(null), deps.terminalTimeoutMs ?? 250); })]);
    } catch (error) { recordError(error); return null; }
    finally { if (timer) clearTimeout(timer); }
  };
  const runDispose = async () => {
    generation++; stopped = true; disposed = true; if (rafId !== null) caf(rafId); rafId = null; stopVoices(); removeErrorListener();
    try { await drawingDone; await pending; await lastSubmission; } catch (error) { recordError(error); }
    disposal.queueDrained = !queueFailure && lastQueueCompleted;
    try { ctx.unconfigure?.(); disposal.unconfigured = typeof ctx.unconfigure === 'function'; } catch (error) { recordError(error); }
    const resources = [hdr, hdrEmission, vertex, uniform].filter(Boolean);
    const destroyResources = () => {
      let ok = true;
      for (const resource of resources) { try { resource.destroy(); } catch (error) { ok = false; recordError(error); } }
      disposal.resourcesDestroyed = ok;
      if (ok) { hdr = null; hdrEmission = null; vertex = null; uniform = null; hdrBind = null; }
    };
    const destroyDevice = () => {
      if (typeof device.destroy !== 'function') return;
      disposal.deviceDestroyCalled = true;
      try { device.destroy(); } catch (error) { recordError(error); }
    };
    let lossInfo = null;
    if (disposal.queueDrained) {
      destroyResources(); destroyDevice(); lossInfo = await awaitTerminal();
    } else {
      destroyDevice(); lossInfo = await awaitTerminal();
      if (lossInfo) destroyResources();
      else { disposal.resourcesDestroyed = false; disposal.result = 'cleanup-incomplete'; }
    }
    if (audioContext) { try { await audioContext.close(); } catch (error) { recordError(error); } audioContext = null; }
    disposal.expectedLoss = !!(lossWasExpected && lossInfo?.reason === 'destroyed');
    if (unexpectedLoss) disposal.result = 'unexpected-device-loss';
    else if (!disposal.queueDrained) disposal.result = disposal.resourcesDestroyed ? 'queue-drain-failed' : 'cleanup-incomplete';
    else if (!disposal.unconfigured || !disposal.resourcesDestroyed || !disposal.deviceDestroyCalled) disposal.result = 'cleanup-incomplete';
    else if (!disposal.expectedLoss) disposal.result = 'device-loss-unconfirmed';
    else if (disposal.error) disposal.result = 'disposed-with-error';
    else disposal.result = 'disposed';
    lastReceipt = null; notify('disposed');
    return Object.freeze({ ...disposal });
  };
  const api = {
    replay() {
      if (disposed) throw new Error('disposed'); if (fatal) throw fatal;
      generation++; cause++; stopped = false; heldAge = null; startedAt = now(); lastReceipt = null; stopVoices(); audioCause = -1;
      if (rafId !== null) caf(rafId); rafId = raf(loop);
      try { launchAudio(cause, generation, 0); } catch {}
      return cause;
    },
    async hold(sec) {
      if (disposed) return api.snapshot();
      const requestedAge = clamp(Number(sec) || 0, 0, DURATION);
      const requestedGeneration = ++generation, requestedCause = cause;
      stopped = true; heldAge = requestedAge; lastReceipt = null; stopVoices();
      if (rafId !== null) caf(rafId); rafId = null;
      const drawingFence = drawingDone; await drawingFence;
      if (disposed || generation !== requestedGeneration || cause !== requestedCause || !stopped || heldAge !== requestedAge || fatal) return api.snapshot();
      await submitFrame(requestedAge, requestedGeneration, requestedCause, true);
      const holdSubmission = pending; if (holdSubmission) await holdSubmission;
      if (disposed || generation !== requestedGeneration || cause !== requestedCause || !stopped || heldAge !== requestedAge || fatal) return api.snapshot();
      return api.snapshot();
    },
    async stop() {
      if (disposed) return; generation++; stopped = true; heldAge = 0; lastReceipt = null; stopVoices(); await clear(); return api.snapshot();
    },
    dispose() { if (!disposePromise) disposePromise = runDispose(); return disposePromise; },
    setOptions(next = {}) {
      if (disposed) return; const wasActive = !stopped && !fatal; const normalized = normalizeSettings(current, next); generation++; current = normalized;
      lastReceipt = null; stopVoices(); audioCause = -1;
      if (wasActive) {
        const gen = generation, frameCause = cause, drawingFence = drawingDone, queueFence = pending;
        if (rafId !== null) { caf(rafId); rafId = null; }
        activeSettingsTask = activeSettingsTask.then(async () => { await drawingFence; await queueFence; if (!disposed && !stopped && !fatal && generation === gen && cause === frameCause && rafId === null) rafId = raf(loop); }).catch(error => { if (!disposed) fail(error); else recordError(error); });
      }
      if (stopped && heldAge !== null) {
        const gen = generation, frameCause = cause, age = heldAge;
        heldSettingsTask = heldSettingsTask.then(async () => {
          await drawingDone;
          if (disposed || generation !== gen || !stopped || heldAge !== age) return;
          await submitFrame(age, gen, frameCause, true); await pending;
        }).catch(error => { if (!disposed) fail(error); else recordError(error); });
      }
    },
    snapshot() {
      const r = lastReceipt, valid = !!(r && r.cause === cause && r.generation === generation && r.completed);
      const age = ageNow();
      return Object.freeze({ version: VERSION, geometryEdition: GEOMETRY_EDITION, duration: DURATION, cause, generation, ready: !disposed && !fatal, mode: disposed ? 'disposed' : !stopped ? 'playing' : heldAge !== null ? 'held' : 'stopped', age: Number.isFinite(age) ? age : 0, active: valid ? !!r.active : !stopped && age < DURATION, phase: valid ? r.phase : stopped ? 'stopped' : 'pending', completed: valid, receipt: valid ? r : null, verify: !!verify, audioEnabled: !!(!verify && audioContext?.state === 'running'), audioContextCreated: !!audioContext, activeVoices: voices.size, audio: Object.freeze({ muted: audioMuted, verify: !!verify, contextCreated: !!audioContext, contextState: audioContext?.state ?? 'none', voices: voices.size }), fatal: fatal ? String(fatal.message ?? fatal) : null, disposal: Object.freeze({ ...disposal, lossWasExpected, lossReason: lossInfoValue?.reason ?? null, lossMessage: lossInfoValue?.message ?? null }), settings: Object.freeze({ ...current }) });
    },
    setMuted(value) { const next = !!value || !!verify; if (next === audioMuted) return false; audioMuted = next; audioEpoch++; if (audioMuted) { stopVoices(); audioCause = cause; } return true; },
    activateAudioFromGesture
  };
  let heldSettingsTask = Promise.resolve();
  let activeSettingsTask = Promise.resolve();
  try { await clear(); }
  catch (error) {
    disposed = true; removeErrorListener();
    try { await pending; } catch (e) { recordError(e); }
    const resources = [hdr, hdrEmission, vertex, uniform].filter(Boolean);
    for (const resource of resources) { try { resource.destroy(); } catch {} }
    try { ctx.unconfigure?.(); } catch {}
    try { device.destroy?.(); } catch {}
    throw error;
  }
  return api;
}
