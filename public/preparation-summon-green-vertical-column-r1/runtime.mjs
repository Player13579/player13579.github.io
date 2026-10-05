import { DURATION, EFFECT_ID, WORLD, packUniform, project } from './source/effect.mjs';
import { playSummon } from './source/sfx.mjs';
import { createCauseLedger } from './lifecycle.mjs';

const query = new URL(location.href).searchParams;
const verify = query.has('verify');
const token = query.get('galleryStartupToken');
const versionId = query.get('galleryVersionId') || EFFECT_ID;
const epoch = Number(query.get('galleryAttemptEpoch'));
const canvas = document.querySelector('#view');
const status = document.querySelector('#status');
const shaders = Object.freeze({ world: new URL('./source/world.wgsl', import.meta.url),
  multiWorld: new URL('./source/multi-world.wgsl', import.meta.url),
  observation: new URL('./source/observation.wgsl', import.meta.url) });
const state = { phase: 'child-document', sequence: 0, initialized: false, ready: false, disposed: false,
  generation: 0, submittedFrames: 0, frameSerial: 0, activeFrames: 0, device: null, context: null,
  format: null, sampler: null, worldPipeline: null, observationPipeline: null,
  worldLayout: null, observationLayout: null, targets: null, size: [0, 0], raf: 0,
  audio: null, muted: query.get('mute') === '1', sourceHashes: Object.create(null),
  latestError: null, deviceLost: false, events: [], held: false, fixedAge: null, rejectedCauseIds: new Set(),
  buffers: new Set(), inflight: new Set(),
  retiredTargets: new Set() };
const ledger = createCauseLedger({ stopSound: sound => sound?.stop?.() });
const soundSeen = new Set();
const live = () => !state.disposed;
const fmtError = error => ({ name: error?.name || 'Error', message: String(error?.message || error),
  code: error?.code || 'WEBGPU_INIT_FAILED' });

function emit(stage, result, extra = {}) {
  state.phase = stage; state.sequence++;
  const row = { schema: 'dva-gallery-startup/v1', token, versionId, attemptEpoch: epoch,
    sequence: state.sequence, stage, status: result, ...extra };
  if (token && versionId && Number.isSafeInteger(epoch)) parent.postMessage(row, location.origin);
  state.events.push({ at: performance.now(), ...row });
}

function snapshot() {
  return Object.freeze({ schema: 'dva-summon-green-snapshot/v1', phase: state.phase,
    initialized: state.initialized, ready: state.ready, generation: state.generation, submittedFrames: state.submittedFrames,
    frameSerial: state.frameSerial, activeFrames: state.activeFrames,
    causes: [...ledger.active.values()].map(c => ({ causeId: c.causeId, x: c.x, z: c.z,
      age: ledger.age(c), sound: Boolean(c.sound) })), seenCount: ledger.seen.size,
    sourceHashes: { ...state.sourceHashes }, latestError: state.latestError,
    dimensions: [...state.size], fixedAge: state.fixedAge, verify,
    audioState: verify ? 'verification-muted' : state.audio?.state || 'not-created',
    contexts: verify ? 0 : Number(Boolean(state.audio)), events: state.events.slice() });
}

window.__summonGreenSnapshot = snapshot;
window.__summonGreenReceipt = input => acceptReceipt(input);
window.__summonGreenHold = () => {
  state.held = true; state.fixedAge = null; cancelScheduled();
  const now = performance.now();
  for (const cause of ledger.active.values()) cause.previewAge = ledger.age(cause, now);
  draw(undefined, { force: true });
};
window.__summonGreenResume = () => {
  state.held = false; state.fixedAge = null;
  for (const cause of ledger.active.values()) delete cause.previewAge;
  schedule();
};
window.__summonGreenDispose = dispose;

async function readSource(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`);
  const source = await response.text();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  state.sourceHashes[url.pathname] = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
  return source;
}

function allocateUniform(bytes) {
  const buffer = state.device.createBuffer({ label: 'summon-green 64-byte uniform', size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  state.device.queue.writeBuffer(buffer, 0, bytes);
  state.buffers.add(buffer);
  return buffer;
}

function allocateCauseStorage(causes, at) {
  const data = new Float32Array(8 * 4);
  const [width, height] = state.size;
  const dpr = Math.max(1, globalThis.devicePixelRatio || 1);
  const ppm = (64 * dpr) / WORLD.actorHeight;
  const globalAnchor = [width * .5, height * .70];
  for (let i = 0; i < Math.min(causes.length, 8); i++) {
    const cause = causes[i];
    const anchor = project([cause.x, WORLD.planeY, cause.z], ppm, globalAnchor, WORLD.elevation);
    const age = cause.previewAge ?? ledger.age(cause, at);
    data.set([anchor[0], anchor[1], age, 1], i * 4);
  }
  const buffer = state.device.createBuffer({ label: 'summon-green eight-cause storage', size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  state.device.queue.writeBuffer(buffer, 0, data);
  state.buffers.add(buffer);
  return buffer;
}

function createTargets(width, height) {
  return {
    width, height,
    world: state.device.createTexture({ label: 'summon-green world color', size: [width, height],
      format: 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING }),
    source: state.device.createTexture({ label: 'summon-green visible source', size: [width, height],
      format: 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING })
  };
}

function retireTargets(targets) {
  if (!targets) return;
  state.retiredTargets.add(targets);
  Promise.all([...state.inflight]).then(() => {
    if (!state.retiredTargets.delete(targets)) return;
    targets.world.destroy(); targets.source.destroy();
  });
}

function syncSize() {
  if (!state.initialized || !live()) return false;
  const dpr = Math.max(1, globalThis.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (width === state.size[0] && height === state.size[1]) return false;
  state.size = [width, height]; state.generation++;
  canvas.width = width; canvas.height = height;
  retireTargets(state.targets); state.targets = createTargets(width, height);
  return true;
}

function uniformFor(age, causesCount) {
  const [width, height] = state.size;
  const dpr = Math.max(1, globalThis.devicePixelRatio || 1);
  const ppm = (64 * dpr) / WORLD.actorHeight;
  const anchor = [width * .5, height * .70];
  const packed = packUniform({ width, height, anchor, ppm, age, exposure: 1.0,
    worldOn: true, arrivalOn: true, obsOn: true });
  packed[12] = causesCount;
  return packed;
}

function submissionSettled(buffers, targets, proof) {
  const fence = state.device.queue.onSubmittedWorkDone().then(() => {
    for (const buffer of buffers) { buffer.destroy(); state.buffers.delete(buffer); }
    if (targets.retireOnCompletion) { targets.world.destroy(); targets.source.destroy(); }
    state.events.push({ at: performance.now(), kind: 'fence', ...proof });
  }, error => {
    state.latestError = { ...fmtError(error), code: 'SUBMISSION_FENCE_FAILED', phase: state.phase };
    state.events.push({ at: performance.now(), kind: 'fence-error', ...proof, error: state.latestError });
    for (const buffer of buffers) { buffer.destroy(); state.buffers.delete(buffer); }
    if (targets.retireOnCompletion) { targets.world.destroy(); targets.source.destroy(); }
  }).finally(() => state.inflight.delete(fence));
  state.inflight.add(fence);
}

function draw(ageOverride, { force = false, clearOnly = false } = {}) {
  if (!state.initialized || !live() || state.size[0] < 1 || state.size[1] < 1) return null;
  syncSize();
  const now = performance.now();
  const expired = ledger.prune(now);
  if (expired.length) state.events.push({ at: now, kind: 'expired', causes: expired.map(c => c.causeId) });
  let causes = clearOnly ? [] : [...ledger.active.values()];
  if (state.held && state.fixedAge !== null && causes.length === 1) causes[0].previewAge = state.fixedAge;
  if (ageOverride !== undefined && causes.length) {
    const selected = causes.at(-1); causes = [{ ...selected, previewAge: ageOverride }];
  }
  if (causes.length > 8) {
    const error = { code: 'CAUSE_CAPACITY_EXCEEDED', message: 'The sealed preview contract supports up to eight simultaneous causes.' };
    state.latestError = error; status.textContent = error.message;
    emit('playing', 'error', { error }); return null;
  }
  if (state.inflight.size >= 2) return null;
  const targets = state.targets;
  const frameBuffers = [];
  const encoder = state.device.createCommandEncoder({ label: `summon-green frame ${state.frameSerial + 1}` });
  const worldPass = encoder.beginRenderPass({ colorAttachments: [
    { view: targets.world.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' },
    { view: targets.source.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }
  ] });
  const age = causes.length ? (causes[0].previewAge ?? ledger.age(causes[0], now)) : 0;
  const buffer = allocateUniform(uniformFor(age, causes.length)); frameBuffers.push(buffer);
  const causeBuffer = allocateCauseStorage(causes, now); frameBuffers.push(causeBuffer);
  const bind = state.device.createBindGroup({ layout: state.worldLayout,
    entries: [{ binding: 0, resource: { buffer } }, { binding: 1, resource: { buffer: causeBuffer } }] });
  worldPass.setPipeline(state.worldPipeline); worldPass.setBindGroup(0, bind); worldPass.draw(3);
  worldPass.end();

  const obsBuffer = allocateUniform(uniformFor(age, causes.length)); frameBuffers.push(obsBuffer);
  const observationBind = state.device.createBindGroup({ layout: state.observationLayout, entries: [
    { binding: 0, resource: { buffer: obsBuffer } },
    { binding: 1, resource: targets.world.createView() },
    { binding: 2, resource: targets.source.createView() },
    { binding: 3, resource: state.sampler }
  ] });
  const output = state.context.getCurrentTexture().createView();
  const observationPass = encoder.beginRenderPass({ colorAttachments: [
    { view: output, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }
  ] });
  observationPass.setPipeline(state.observationPipeline);
  observationPass.setBindGroup(0, observationBind); observationPass.draw(3); observationPass.end();
  state.device.queue.submit([encoder.finish()]);
  const serial = ++state.frameSerial;
  if (causes.length) { state.submittedFrames++; state.activeFrames++; }
  const proof = { serial, causeId: causes[0]?.causeId || null, age, generation: state.generation,
    sourceHashes: { ...state.sourceHashes }, submittedFrames: state.submittedFrames,
    width: state.size[0], height: state.size[1], forceClear: force && !causes.length };
  submissionSettled(frameBuffers, targets, proof);
  if (expired.length) for (const cause of expired) stopCauseSound(cause);
  return proof;
}

function cancelScheduled() { if (state.raf) cancelAnimationFrame(state.raf); state.raf = 0; }
function schedule() { if (!live() || state.held || state.raf || !state.ready) return; state.raf = requestAnimationFrame(tick); }
function tick() {
  state.raf = 0;
  if (!live() || state.held) return;
  const proof = draw();
  if (ledger.active.size) schedule();
  else if (proof?.causeId) draw(undefined, { force: true });
}

function stopCauseSound(cause) {
  if (!cause?.sound) return;
  try { cause.sound.stop?.(); } finally { cause.sound = null; }
}

function tryStartSound(cause) {
  if (verify || !state.ready || state.muted || !cause || cause.sound || !state.audio || state.audio.state !== 'running') return false;
  cause.sound = playSummon(state.audio, { causeId: cause.causeId, when: state.audio.currentTime,
    verify, muted: state.muted, gain: .6, seen: soundSeen });
  return Boolean(cause.sound);
}

function acceptReceipt(input) {
  ledger.prune(performance.now());
  if (ledger.active.size >= 8) {
    const error = { code: 'CAUSE_CAPACITY_EXCEEDED', message: 'The sealed preview contract supports up to eight simultaneous causes.' };
    state.latestError = error;
    if (typeof input?.causeId === 'string' && input.causeId) state.rejectedCauseIds.add(input.causeId);
    state.events.push({ at: performance.now(), kind: 'receipt-rejected', causeId: input?.causeId, error });
    status.textContent = error.message;
    return false;
  }
  if (typeof input?.causeId === 'string' && state.rejectedCauseIds.has(input.causeId)) return false;
  const cause = ledger.admit(input);
  if (!cause) return false;
  state.generation++;
  state.latestError = null;
  state.events.push({ at: cause.startedAt, kind: 'receipt', causeId: cause.causeId, x: cause.x, z: cause.z });
  tryStartSound(cause); schedule(); return true;
}

function replaceFixtureCauses(causes, label) {
  if (!state.initialized) return false;
  state.held = false; state.fixedAge = null;
  const removed = ledger.cancelAll();
  if (removed) state.events.push({ at: performance.now(), kind: 'fixture-reset', removed, label });
  for (const cause of causes) if (!acceptReceipt(cause)) return false;
  status.textContent = verify ? `WebGPU ready · ${label} · verification audio forced silent.` : `WebGPU ready · ${label}.`;
  schedule();
  return true;
}

async function activateFromGesture() {
  if (verify) return { enabled: false, state: 'verification-muted', contexts: 0 };
    if (state.disposed || !state.ready) return { enabled: false, state: 'unavailable' };
  if (state.muted) return { enabled: false, state: 'muted' };
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) return { enabled: false, state: 'unsupported' };
  try {
    state.audio ??= new AudioContextClass();
    await state.audio.resume();
    if (state.disposed || verify || state.muted || state.audio.state !== 'running') return { enabled: false, state: 'stale' };
    const cause = [...ledger.active.values()].at(-1);
    const started = cause ? tryStartSound(cause) : false;
    return { enabled: true, state: 'running', cueStarted: started, settled: true };
  } catch (error) { return { enabled: false, state: 'rejected', error: fmtError(error) }; }
}

function setMuted(muted) {
  state.muted = Boolean(muted);
  if (state.muted) for (const cause of ledger.active.values()) stopCauseSound(cause);
  return { muted: state.muted, verify, contexts: state.audio ? 1 : 0 };
}

window.__gallerySfx = Object.freeze({ activateFromGesture, setMuted,
  stop: () => setMuted(true),
  snapshot: () => ({ verify, muted: verify || state.muted, contexts: verify ? 0 : Number(Boolean(state.audio)),
    audioState: verify ? 'verification-muted' : state.audio?.state || 'not-created',
    activeCues: [...ledger.active.values()].filter(c => c.sound).map(c => c.causeId) }) });
document.addEventListener('pointerdown', () => { if (!verify) void activateFromGesture(); }, { passive: true });
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin) return;
  if (event.data?.type === 'dva-gallery-sfx-activate' || event.data?.type === 'gallery-sfx-activate') void activateFromGesture();
  if (event.data?.schema === 'dva-gallery-startup/v1' && event.data?.action === 'retire' &&
      event.data?.token === token && event.data?.versionId === versionId && event.data?.attemptEpoch === epoch) dispose('retired');
  if (event.data?.schema === 'dva-summon-green-receipt/v1') acceptReceipt(event.data.receipt);
  if (event.data?.schema === 'dva-summon-green-cancel/v1' && typeof event.data.causeId === 'string') {
    const removed = ledger.cancel(event.data.causeId); if (removed) { state.generation++; draw(undefined, { force: true }); }
  }
});

async function boot() {
  emit('child-document', 'pending'); emit('adapter', 'pending');
  if (!navigator.gpu) {
    const error = { code: 'WEBGPU_UNAVAILABLE', message: 'This preview requires WebGPU.' };
    status.textContent = error.message; emit('device', 'unsupported', { error }); return;
  }
  try {
    emit('device', 'pending');
    const adapter = await navigator.gpu.requestAdapter();
    if (!live()) return;
    if (!adapter) throw Object.assign(new Error('No WebGPU adapter.'), { code: 'WEBGPU_ADAPTER_UNAVAILABLE' });
    const device = await adapter.requestDevice();
    if (!live()) { device.destroy(); return; }
    state.device = device;
    state.device.lost.then(info => {
      if (!live()) return;
      state.deviceLost = true;
      const error = { code: 'WEBGPU_DEVICE_LOST', message: info.message || 'WebGPU device lost.', reason: info.reason };
      state.latestError = error; status.textContent = error.message;
      dispose('device-lost');
    });
    state.device.addEventListener('uncapturederror', event => {
      const error = fmtError(event.error); state.latestError = { ...error, code: 'WEBGPU_UNCAPTURED', phase: state.phase };
      status.textContent = `WebGPU error: ${error.message}`;
      emit('playing', 'error', { error: state.latestError });
    });
    state.context = canvas.getContext('webgpu');
    if (!state.context) throw Object.assign(new Error('Canvas could not create a WebGPU context.'), { code: 'WEBGPU_CANVAS_UNAVAILABLE' });
    state.format = navigator.gpu.getPreferredCanvasFormat();
    state.context.configure({ device: state.device, format: state.format, alphaMode: 'premultiplied' });
    emit('assets', 'pending');
    const [worldCode, multiWorldCode, observationCode] = await Promise.all([
      readSource(shaders.world), readSource(shaders.multiWorld), readSource(shaders.observation)]);
    if (!live()) return;
    emit('pipelines', 'pending');
    const worldModule = state.device.createShaderModule({ label: 'summon-green-world.wgsl', code: worldCode });
    const multiWorldModule = state.device.createShaderModule({ label: 'summon-green-multi-world.wgsl', code: multiWorldCode });
    const observationModule = state.device.createShaderModule({ label: 'summon-green-observation.wgsl', code: observationCode });
    const diagnostics = await Promise.all([worldModule.getCompilationInfo(), multiWorldModule.getCompilationInfo(), observationModule.getCompilationInfo()]);
    if (!live()) return;
    for (const [module, info] of [['world.wgsl', diagnostics[0]], ['multi-world.wgsl', diagnostics[1]], ['observation.wgsl', diagnostics[2]]]) {
      for (const message of info.messages) {
        const diagnostic = { module, message: message.message, type: message.type, lineNum: message.lineNum,
          linePos: message.linePos, offset: message.offset, length: message.length };
        state.events.push({ at: performance.now(), kind: 'compilation-message', ...diagnostic });
        if (message.type === 'error') throw Object.assign(new Error(message.message), { diagnostic });
      }
    }
    const over = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
    const add = { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } };
    state.device.pushErrorScope('validation');
    let pipelineFailure = null, validationError = null;
    try {
      state.worldPipeline = await state.device.createRenderPipelineAsync({ label: 'summon-green joint MRT world',
        layout: 'auto', vertex: { module: multiWorldModule, entryPoint: 'vertex' },
        fragment: { module: multiWorldModule, entryPoint: 'fragment', targets: [
          { format: 'rgba16float', blend: over }, { format: 'rgba16float', blend: add }
        ] }, primitive: { topology: 'triangle-list' } });
      state.observationPipeline = await state.device.createRenderPipelineAsync({ label: 'summon-green OBS',
        layout: 'auto', vertex: { module: observationModule, entryPoint: 'vertex' },
        fragment: { module: observationModule, entryPoint: 'fragment', targets: [{ format: state.format }] },
        primitive: { topology: 'triangle-list' } });
    } catch (error) { pipelineFailure = error; }
    finally { try { validationError = await state.device.popErrorScope(); } catch (error) { pipelineFailure ||= error; } }
    if (!live()) return;
    if (pipelineFailure) throw pipelineFailure;
    if (validationError) throw Object.assign(new Error(validationError.message),
      { code: 'WEBGPU_PIPELINE_VALIDATION', diagnostic: { message: validationError.message, type: 'error' } });
    state.worldLayout = state.worldPipeline.getBindGroupLayout(0);
    state.observationLayout = state.observationPipeline.getBindGroupLayout(0);
    state.sampler = state.device.createSampler({ label: 'summon-green linear clamp sampler',
      minFilter: 'linear', magFilter: 'linear', mipmapFilter: 'nearest',
      addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    emit('pipelines', 'ready');
    new ResizeObserver(() => { if (syncSize()) { if (!ledger.active.size) draw(undefined, { force: true }); else schedule(); } }).observe(canvas);
    window.addEventListener('resize', () => { if (syncSize()) { if (!ledger.active.size) draw(undefined, { force: true }); else schedule(); } });
    state.initialized = true; syncSize();
    const initial = draw(undefined, { force: true, clearOnly: true });
    await state.device.queue.onSubmittedWorkDone();
    if (!live()) return;
    state.ready = true;
    state.events.push({ at: performance.now(), kind: 'initial-clear-complete', proof: initial });
    const firstFrame = { recorded: true, submitted: true, completed: true, canvasConnected: canvas.isConnected,
      passes: 1, viewportWidth: state.size[0], viewportHeight: state.size[1], frameSerial: state.frameSerial,
      activeEffectFrames: 0 };
    emit('playing', 'ready', { firstFrame });
    status.textContent = verify ? 'WebGPU ready · verification audio forced silent.' : 'WebGPU ready · click Play preview to summon.';
    if (ledger.active.size) schedule();
  } catch (error) {
    if (!live()) return;
    const formatted = fmtError(error);
    state.latestError = { ...formatted, diagnostic: error?.diagnostic || null,
      sourceHashes: { ...state.sourceHashes }, phase: state.phase };
    status.textContent = `${versionId} failed: ${formatted.message}`;
    emit(state.phase, 'error', { error: state.latestError });
  }
}

function dispose(reason = 'disposed') {
  if (state.disposed) return;
  cancelScheduled();
  if (state.initialized && state.targets) {
    ledger.cancelAll();
    if (!state.deviceLost) draw(undefined, { force: true, clearOnly: true });
  }
  ledger.dispose(); state.disposed = true; state.ready = false;
  if (!verify) { try { state.audio?.close?.(); } catch {} }
  const targets = state.targets; state.targets = null;
  const retiring = new Set([...state.retiredTargets, ...(targets ? [targets] : [])]);
  state.retiredTargets.clear();
  Promise.all([...state.inflight]).finally(() => {
    for (const target of retiring) { target.world.destroy(); target.source.destroy(); }
    for (const buffer of state.buffers) buffer.destroy(); state.buffers.clear();
    state.device?.destroy?.();
  });
  emit('playing', reason === 'device-lost' ? 'error' : 'cancelled', { error: reason === 'device-lost'
    ? state.latestError : { code: 'RETIRED', message: reason } });
}
window.addEventListener('pagehide', () => dispose('pagehide'), { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ledger.active.size) {
    ledger.cancelAll(); state.held = false; state.fixedAge = null; cancelScheduled(); draw(undefined, { force: true });
  }
});

document.querySelector('#play').addEventListener('click', async () => {
  const started = replaceFixtureCauses([{ causeId: `fixture-single-${crypto.randomUUID()}`, x: 0, z: 0 }], 'single cause');
  if (started) await activateFromGesture();
});
document.querySelector('#joint').addEventListener('click', async () => {
  const suffix = crypto.randomUUID();
  const started = replaceFixtureCauses([
    { causeId: `fixture-joint-left-${suffix}`, x: -.82, z: 0 },
    { causeId: `fixture-joint-center-${suffix}`, x: 0, z: 0 },
    { causeId: `fixture-joint-right-${suffix}`, x: .82, z: 0 }
  ], 'three independent overlapping causes');
  if (started) await activateFromGesture();
});
document.querySelector('#cancel').addEventListener('click', () => {
  const count = ledger.cancelAll();
  state.events.push({ at: performance.now(), kind: 'fixture-cancel', count });
  state.held = false; state.fixedAge = null; draw(undefined, { force: true });
});
document.querySelector('#hold').addEventListener('click', () => window.__summonGreenHold());
document.querySelector('#resume').addEventListener('click', () => window.__summonGreenResume());
boot();
