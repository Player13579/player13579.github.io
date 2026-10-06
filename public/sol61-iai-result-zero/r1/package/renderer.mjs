import { createReceipt, planIai, packUniforms, sourceKey, createIaiAudio } from './iai-model.mjs';
import { WORLD_WGSL, OBSERVER_WGSL } from './iai-shaders.mjs';

const MRT = 'rgba16float';
const SCOPE_NAMES = ['validation', 'internal', 'out-of-memory'];
const thenable = x => x !== null && (typeof x === 'object' || typeof x === 'function') && typeof x.then === 'function';
const gpuTextureUsage = () => globalThis.GPUTextureUsage ?? { RENDER_ATTACHMENT: 16, TEXTURE_BINDING: 4 };
const gpuBufferUsage = () => globalThis.GPUBufferUsage ?? { UNIFORM: 64, COPY_DST: 8 };
const snapshot = x => JSON.parse(JSON.stringify(x));
let nextOwnerSerial = 0;
const STARTUP_SHADER_HASHES = Object.freeze({
  worldWgslSha256: 'fd92b1d925cdf73fde35a5b696157fb33410e571eca06fc1e9e26949a079e606',
  observerWgslSha256: '6bd4757d75d1d069c52d32a2ce384947674fa25a226bc2ca8fdbbf1fa10103fa',
});

export function cssRadiusToBacking(cssRadius, backingWidth, cssWidth) {
  if (![cssRadius, backingWidth, cssWidth].every(Number.isFinite) || cssRadius < 0 || backingWidth <= 0 || cssWidth <= 0) return null;
  return cssRadius * backingWidth / cssWidth;
}

export function createIaiHost({ canvas, audio = null, verify = false, now = () => performance.now(), deviceFactory = null, report = () => {}, startupTrace = false, attemptIdentity = null } = {}) {
  if (!canvas) throw new TypeError('canvas is required');
  const ownerSerial = ++nextOwnerSerial;
  const traceAttemptIdentity = attemptIdentity ? Object.freeze({ ...attemptIdentity }) : null;
  const state = {
    device: null, context: null, format: null, world: null, observer: null, uniform: null, sampler: null, targets: null,
    targetGeneration: 0, generation: 1, lease: 1, ticketSequence: 0, currentTicket: null, inFlight: null, queued: null, renderEpoch: 0,
    disposed: false, lost: false, protocolFailed: false, queueDrained: true, lastFailure: null,
    lastScopeErrors: null, maxInFlight: 0, receipt: null, receiptKey: null, originalReceivedAtEms: null,
    actualClock: null, currentCause: null, audio, startupClear: null, mutedByCaller: false, audioPlayedForSource: false,
    disposeTask: null, firstActiveTraceCaptured: false,
  };
  const traceState = startupTrace ? { sequence: 0, recent: [], firstByOperation: Object.create(null), pending: Object.create(null) } : null;
  const traceSnapshot = () => startupTrace ? snapshot({ enabled: true, ownerSerial, attemptIdentity: traceAttemptIdentity, sourceHashes: STARTUP_SHADER_HASHES,
    retired: state.disposed, recent: traceState.recent, firstByOperation: traceState.firstByOperation,
    pending: Object.fromEntries(Object.entries(traceState.pending).map(([k, v]) => [k, { ...v, retired: state.disposed, current: !state.disposed }])) }) : null;
  const trace = (operation, status, detail = {}) => {
    if (!startupTrace) return;
    const row = { sequence: ++traceState.sequence, atMs: now(), ownerSerial, operation, status,
      attemptIdentity: traceAttemptIdentity ? { ...traceAttemptIdentity } : null, generation: state.generation,
      targetGeneration: state.targetGeneration, lease: state.lease, retired: state.disposed, current: !state.disposed,
      ...detail };
    if (!traceState.firstByOperation[operation]) traceState.firstByOperation[operation] = row;
    if (status === 'start') traceState.pending[operation] = row;
    else if (['resolve', 'reject', 'throw', 'absent', 'retire'].includes(status)) delete traceState.pending[operation];
    traceState.recent.push(row);
    if (traceState.recent.length > 256) traceState.recent.shift();
    try { report({ diagnostic: row, trace: traceSnapshot() }); } catch {}
  };
  const errorDetail = error => ({ error: { name: String(error?.name ?? 'Error').slice(0, 100), message: String(error?.message ?? error).slice(0, 500) } });
  const currentOwner = () => !state.disposed && !state.lost;
  const ensureCurrent = operation => { if (!currentOwner()) throw new Error(`Iai initialization retired before ${operation}`); };
  const stage = (name, detail = {}) => { const t = traceSnapshot(); report({ stage: name, ...detail, ...(t ? { trace: t } : {}) }); };
  const tracedSync = (operation, fn, detail = {}) => {
    trace(operation, 'start', detail);
    try { const value = fn(); trace(operation, 'resolve', { ...detail, returned: value !== undefined }); return value; }
    catch (error) { trace(operation, 'throw', { ...detail, ...errorDetail(error) }); throw error; }
  };
  const tracedAsync = async (operation, fn, detail = {}) => {
    trace(operation, 'start', detail);
    let raw;
    try { raw = fn(); trace(operation, 'returned', detail); }
    catch (error) { trace(operation, 'throw', { ...detail, ...errorDetail(error) }); throw error; }
    try { const value = await raw; trace(operation, 'resolve', detail); return value; }
    catch (error) { trace(operation, 'reject', { ...detail, ...errorDetail(error) }); throw error; }
  };
  const dimensions = () => ({ width: Math.max(1, canvas.width | 0), height: Math.max(1, canvas.height | 0) });

  function makeTargets(width, height) {
    const usage = gpuTextureUsage().RENDER_ATTACHMENT | gpuTextureUsage().TEXTURE_BINDING;
    const descriptor = { size: [width, height], format: MRT, usage };
    const main = tracedSync('targets.main.create', () => state.device.createTexture(descriptor), { width, height });
    let source;
    try {
      ensureCurrent('source target creation');
      source = tracedSync('targets.source.create', () => state.device.createTexture(descriptor), { width, height });
      ensureCurrent('target assignment');
    } catch (error) { main?.destroy?.(); source?.destroy?.(); throw error; }
    const next = { main, source, width, height, generation: ++state.targetGeneration };
    const old = state.targets; state.targets = next; state.lease++;
    old?.main.destroy(); old?.source.destroy();
    return next;
  }

  function resize(cssWidth = canvas.clientWidth || canvas.width || 1, cssHeight = canvas.clientHeight || canvas.height || 1, backingScale = canvas.width / (canvas.getBoundingClientRect?.().width || cssWidth || 1)) {
    if (!state.device || state.disposed || state.lost) return false;
    const width = Math.max(1, Math.round(cssWidth * backingScale));
    const height = Math.max(1, Math.round(cssHeight * backingScale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    if (state.targets?.width === width && state.targets?.height === height) return false;
    state.audio?.reconcile?.([]);
    state.lease++;
    if (state.inFlight) { state.resizePending = { width, height }; return true; }
    makeTargets(width, height); return true;
  }

  function applyPendingResize() {
    if (!state.resizePending || state.disposed || state.lost) return;
    const { width, height } = state.resizePending; state.resizePending = null;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    makeTargets(width, height);
  }

  function current(c) {
    return !state.disposed && !state.lost && state.device === c.device && state.context === c.context && state.targets === c.targets &&
      state.generation === c.generation && state.targetGeneration === c.targetGeneration && state.lease === c.lease && state.renderEpoch === c.epoch &&
      canvas.width === c.width && canvas.height === c.height && state.currentTicket === c.ticket &&
      c.ticket?.commandBuffer === c.commandBuffer && c.ticket?.presentation === c.presentation && c.ticket?.causeId === c.causeId &&
      c.ticket?.clockId === c.clockId && c.ticket?.clockKind === c.clockKind && c.ticket?.clockOwnerId === c.clockOwnerId &&
      c.ticket?.roomId === c.roomId && c.ticket?.receivedAtEms === c.receivedAtEms &&
      state.currentCause === c.causeId;
  }

  async function popAll(count) {
    const pending = [];
    for (let i = count - 1; i >= 0; i--) {
      let raw;
      try { raw = state.device.popErrorScope(); }
      catch (error) { pending.push(Promise.resolve({ ok: false, kind: 'throw', error })); continue; }
      if (!thenable(raw)) { pending.push(Promise.resolve({ ok: false, kind: 'non-promise', value: raw })); continue; }
      pending.push(Promise.resolve(raw).then(value => ({ ok: value === null, kind: 'value', value }), error => ({ ok: false, kind: 'reject', error })));
    }
    const settled = await Promise.allSettled(pending);
    const results = settled.map(r => r.status === 'fulfilled' ? r.value : ({ ok: false, kind: 'reject', error: r.reason }));
    return results.length === SCOPE_NAMES.length && results.every(x => x.ok) ? { clean: true, results } : { clean: false, results };
  }

  async function submit(plan, receipt, ageAtStart, startup = false, startClock = null, epoch = state.renderEpoch) {
    const d = state.device, targets = state.targets;
    if (!d || !targets || state.disposed || state.lost || state.protocolFailed) return null;
    const { width, height } = dimensions();
    if (width !== targets.width || height !== targets.height || plan.viewport?.width !== width || plan.viewport?.height !== height) return null;
    const causeId = startup || !plan.active ? null : plan.causeId;
    const firstActiveTrace = startupTrace && !startup && !!plan?.active && !state.firstActiveTraceCaptured;
    if (firstActiveTrace) state.firstActiveTraceCaptured = true;
    const capture = { device: d, context: state.context, targets, generation: state.generation, targetGeneration: targets.generation, lease: state.lease,
      width, height, causeId, epoch, clockId: startup ? null : plan.clockId, clockKind: startup ? null : plan.clockKind,
      clockOwnerId: startup ? null : (plan.clockOwnerId ?? null), roomId: startup ? null : plan.roomId,
      receivedAtEms: startup ? null : receipt?.receivedAtEms };
    let pushed = 0;
    try {
      for (const name of SCOPE_NAMES) { d.pushErrorScope(name); pushed++; }
    } catch (error) {
      const unwind = await popAll(pushed);
      state.protocolFailed = true; state.lastFailure = { reason: 'partial-error-scope-push', message: String(error?.message ?? error), pushed, unwind: unwind.results };
      stage('proof-rejected', state.lastFailure); return null;
    }
    const operation = startup ? 'startup-clear' : firstActiveTrace ? 'first-active-frame' : null;
    if (operation) trace(`${operation}.encode`, 'start', { ticketId: null, causeId, active: !!plan?.active });
    let commandBuffer = null, presentation = null, encodeError = null;
    try {
      const packed = packUniforms(plan ?? { viewport: { width, height }, active: false });
      if (!(packed instanceof Float32Array) || packed.byteLength !== 128) throw new Error('Iai uniforms must be 128 bytes');
      d.queue.writeBuffer(state.uniform, 0, packed);
      const worldGroup = d.createBindGroup({ layout: state.world.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: state.uniform } }] });
      const observerGroup = d.createBindGroup({ layout: state.observer.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer: state.uniform } }, { binding: 1, resource: targets.main.createView() },
        { binding: 2, resource: targets.source.createView() }, { binding: 3, resource: state.sampler },
      ] });
      const encoder = d.createCommandEncoder({ label: startup ? 'Iai transparent startup clear' : 'Iai two-pass frame' });
      const world = encoder.beginRenderPass({ colorAttachments: [
        { view: targets.main.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } },
        { view: targets.source.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } },
      ] });
      world.setPipeline(state.world); world.setBindGroup(0, worldGroup); world.draw(3); world.end();
      presentation = state.context.getCurrentTexture();
      const composite = encoder.beginRenderPass({ colorAttachments: [{ view: presentation.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      composite.setPipeline(state.observer); composite.setBindGroup(0, observerGroup); composite.draw(3); composite.end();
      commandBuffer = encoder.finish();
      if (operation) trace(`${operation}.encode`, 'resolve', { causeId, active: !!plan?.active });
    } catch (error) { encodeError = error; if (operation) trace(`${operation}.encode`, 'throw', { causeId, active: !!plan?.active, ...errorDetail(error) }); }
    const ticket = commandBuffer && presentation ? Object.freeze({ id: ++state.ticketSequence, device: d, context: state.context, targets, commandBuffer, presentation,
      generation: state.generation, targetGeneration: targets.generation, lease: state.lease, width, height, causeId,
      clockId: capture.clockId, clockKind: capture.clockKind, clockOwnerId: capture.clockOwnerId, roomId: capture.roomId, receivedAtEms: capture.receivedAtEms }) : null;
    capture.ticket = ticket; capture.commandBuffer = commandBuffer; capture.presentation = presentation;
    if (ticket) state.currentTicket = ticket;
    const frameDetail = { ticketId: ticket?.id ?? null, causeId, generation: capture.generation, targetGeneration: capture.targetGeneration, lease: capture.lease,
      width, height, active: !!plan?.active, startup };
    if (operation) trace(`${operation}.submit`, 'start', frameDetail);
    let rawQueue, queueResult, queueCompletionFinished = false;
    state.queueDrained = false;
    try {
      if (!encodeError) {
        try { d.queue.submit([commandBuffer]); if (operation) trace(`${operation}.queue-submit`, 'resolve', frameDetail); }
        catch (error) { if (operation) trace(`${operation}.queue-submit`, 'throw', { ...frameDetail, ...errorDetail(error) }); throw error; }
      }
      if (operation) trace(`${operation}.queue-completion`, 'start', frameDetail);
      rawQueue = d.queue.onSubmittedWorkDone();
      if (operation) trace(`${operation}.queue-completion`, 'returned', frameDetail);
      if (!thenable(rawQueue)) throw new TypeError('queue completion must return a promise');
      queueResult = Promise.resolve(rawQueue).then(value => { queueCompletionFinished = true; state.queueDrained = true; if (operation) trace(`${operation}.queue-completion`, 'resolve', frameDetail); return { ok: true, value }; }, error => { queueCompletionFinished = true; if (operation) trace(`${operation}.queue-completion`, 'reject', { ...frameDetail, ...errorDetail(error) }); return { ok: false, error }; });
    } catch (error) { if (operation && !queueCompletionFinished) trace(`${operation}.queue-completion`, 'throw', { ...frameDetail, ...errorDetail(error) }); queueResult = Promise.resolve({ ok: false, error }); state.protocolFailed = true; }
    if (operation) trace(`${operation}.error-scopes`, 'start', { ...frameDetail, pushed });
    const scopeTask = popAll(pushed);
    const [queue, scopes] = await Promise.all([queueResult, scopeTask]);
    state.lastScopeErrors = scopes.clean ? null : scopes.results;
    if (!queue.ok || !scopes.clean || encodeError || !ticket || !current(capture)) {
      const reason = encodeError ? 'encode-failed' : !queue.ok ? 'queue-completion-failed' : !scopes.clean ? 'error-scope-protocol-or-error' : 'stale-ticket';
      state.lastFailure = { reason, message: String(encodeError?.message ?? queue.error?.message ?? reason), ticketId: ticket?.id ?? null, scopeErrors: state.lastScopeErrors };
      if (encodeError || !scopes.clean || !queue.ok) state.protocolFailed = true;
      if (operation) { trace(`${operation}.submit`, 'reject', { ...frameDetail, reason }); trace(`${operation}.error-scopes`, scopes.clean ? 'resolve' : 'reject', { ...frameDetail, scopeErrors: state.lastScopeErrors }); trace(`${operation}.settlement`, 'reject', { ...frameDetail, reason, message: state.lastFailure.message, scopeErrors: state.lastScopeErrors, queueOk: queue.ok, current: current(capture) }); }
      if (firstActiveTrace) stage('first-frame', { kind: 'active-frame-rejected', ...frameDetail, reason });
      stage('proof-rejected', state.lastFailure); return null;
    }
    if (operation) { trace(`${operation}.submit`, 'resolve', frameDetail); trace(`${operation}.error-scopes`, 'resolve', { ...frameDetail, scopeErrors: null }); }
    if (startup) { trace('startup-clear.settlement', 'resolve', { ...frameDetail, submitted: true, cleared: true, current: true, scopeErrors: null, passes: 2 }); stage('first-frame', { kind: 'startup-clear-complete', active: false, ...frameDetail }); return { submitted: true, cleared: true, current: true, scopeErrors: null, passes: 2, width, height }; }
    if (firstActiveTrace) { trace('first-active-frame.settlement', 'resolve', { ...frameDetail, submitted: true, completed: true, current: true, scopeErrors: null, passes: 2 }); stage('first-frame', { kind: 'active-frame-complete', ...frameDetail }); }
    const clock = state.actualClock?.() ?? null;
    if (!clock || clock.clockId !== plan.clockId || clock.clockKind !== plan.clockKind || (clock.clockOwnerId ?? null) !== plan.clockOwnerId ||
      !Number.isFinite(clock.eNowMs) || !Number.isFinite(clock.eTimeScale) || clock.eTimeScale !== plan.eTimeScale ||
      (startClock && (clock.eNowMs < startClock.eNowMs || clock.clockId !== startClock.clockId || clock.clockKind !== startClock.clockKind ||
        (clock.clockOwnerId ?? null) !== (startClock.clockOwnerId ?? null) || clock.eTimeScale !== startClock.eTimeScale))) return null;
    const ageEms = clock.eNowMs - receipt.receivedAtEms;
    if (!plan.active || plan.held || ageEms < 0 || ageEms >= 900) return null;
    state.lastFailure = null;
    return { submitted: true, completed: true, current: true, active: true, scopeErrors: null, passes: 2, ticketId: ticket.id,
      causeId, roomId: plan.roomId, generation: plan.generation, targetGeneration: plan.targetGeneration, lease: plan.lease,
      clockId: plan.clockId, width, height, ageEms };
  }

  async function drain() {
    if (!state.device || state.queueDrained || state.lost) return true;
    try {
      const raw = state.device.queue.onSubmittedWorkDone();
      if (!thenable(raw)) return false;
      try { await raw; } catch { return false; }
      state.queueDrained = true; return true;
    } catch { return false; }
  }

  async function initialize() {
    stage('adapter');
    const adapter = await tracedAsync('requestAdapter', () => deviceFactory ? deviceFactory() : globalThis.navigator?.gpu?.requestAdapter());
    ensureCurrent('requestDevice');
    if (!adapter) throw new Error('WebGPU adapter unavailable');
    stage('device'); const device = await tracedAsync('requestDevice', () => adapter.requestDevice());
    if (state.disposed) { device.destroy?.(); throw new Error('host disposed during device creation'); }
    state.device = device;
    device.lost?.then?.(info => { state.lost = true; state.generation++; state.lease++; state.audio?.reconcile?.([]); state.audio?.stop?.(); stage('device-lost', { message: info?.message ?? 'unknown' }); }).catch?.(() => {});
    stage('shader');
    const worldModule = tracedSync('shader.world.create', () => device.createShaderModule({ code: WORLD_WGSL, label: 'Iai world' }));
    ensureCurrent('observer shader creation');
    const observerModule = tracedSync('shader.observer.create', () => device.createShaderModule({ code: OBSERVER_WGSL, label: 'Iai observer' }));
    ensureCurrent('compilation info');
    const infoPromises = [];
    const compilationInfo = (module, name) => {
      const infoMethod = module.getCompilationInfo;
      if (typeof infoMethod !== 'function') {
        trace(`shader.${name}.info`, 'absent', { source: name, method: 'getCompilationInfo' });
        throw new TypeError('getCompilationInfo is not available');
      }
      trace(`shader.${name}.info`, 'start', { source: name });
      let raw;
      try { raw = infoMethod.call(module); trace(`shader.${name}.info`, 'returned', { source: name }); }
      catch (error) { trace(`shader.${name}.info`, 'throw', { source: name, ...errorDetail(error) }); throw error; }
      const pending = Promise.resolve(raw).then(value => {
        trace(`shader.${name}.info`, 'resolve', { source: name, messageCount: value?.messages?.length ?? null,
          errorCount: Array.isArray(value?.messages) ? value.messages.filter(x => x?.type === 'error').length : null });
        return value;
      }, error => { trace(`shader.${name}.info`, 'reject', { source: name, ...errorDetail(error) }); throw error; });
      infoPromises.push(pending);
      return pending;
    };
    let worldInfo, observerInfo;
    try { worldInfo = compilationInfo(worldModule, 'world'); observerInfo = compilationInfo(observerModule, 'observer'); }
    catch (error) { await Promise.allSettled(infoPromises); throw error; }
    let compilation;
    try { compilation = await Promise.all([worldInfo, observerInfo]); }
    catch (error) { await Promise.allSettled(infoPromises); throw error; }
    ensureCurrent('pipeline layouts');
    const errors = compilation.filter(Boolean).flatMap(x => x.messages ?? []).filter(x => x.type === 'error');
    if (errors.length) throw new Error(`Iai WGSL compile error: ${errors.map(x => x.message).join('; ')}`);
    state.format = tracedSync('canvas.preferred-format', () => globalThis.navigator?.gpu?.getPreferredCanvasFormat?.() ?? 'bgra8unorm');
    ensureCurrent('pipeline layouts');
    if (/srgb$/i.test(state.format)) throw new Error(`Iai contract requires a non-sRGB presentation format, received ${state.format}`);
    const fragment = globalThis.GPUShaderStage?.FRAGMENT ?? 2;
    stage('pipeline');
    const worldLayout = tracedSync('layout.world.bind-group', () => device.createBindGroupLayout({ entries: [{ binding: 0, visibility: fragment, buffer: { type: 'uniform', minBindingSize: 128 } }] }));
    ensureCurrent('observer bind-group layout');
    const observerLayout = tracedSync('layout.observer.bind-group', () => device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: fragment, buffer: { type: 'uniform', minBindingSize: 128 } },
      { binding: 1, visibility: fragment, texture: { sampleType: 'float' } }, { binding: 2, visibility: fragment, texture: { sampleType: 'float' } },
      { binding: 3, visibility: fragment, sampler: { type: 'filtering' } },
    ] }));
    ensureCurrent('world pipeline layout');
    const worldPipelineLayout = tracedSync('layout.world.pipeline', () => device.createPipelineLayout({ bindGroupLayouts: [worldLayout] }));
    ensureCurrent('world pipeline');
    const world = await tracedAsync('pipeline.world', () => device.createRenderPipelineAsync({ layout: worldPipelineLayout, vertex: { module: worldModule, entryPoint: 'vs' }, fragment: { module: worldModule, entryPoint: 'fs', targets: [{ format: MRT }, { format: MRT }] }, primitive: { topology: 'triangle-list' } }));
    ensureCurrent('observer pipeline'); state.world = world;
    const observerPipelineLayout = tracedSync('layout.observer.pipeline', () => device.createPipelineLayout({ bindGroupLayouts: [observerLayout] }));
    ensureCurrent('observer pipeline');
    const observer = await tracedAsync('pipeline.observer', () => device.createRenderPipelineAsync({ layout: observerPipelineLayout, vertex: { module: observerModule, entryPoint: 'vs' }, fragment: { module: observerModule, entryPoint: 'fs', targets: [{ format: state.format, blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }] }, primitive: { topology: 'triangle-list' } }));
    ensureCurrent('pipeline assignment'); state.observer = observer;
    const uniform = tracedSync('resource.uniform.create', () => device.createBuffer({ size: 128, usage: gpuBufferUsage().UNIFORM | gpuBufferUsage().COPY_DST }));
    if (!currentOwner()) { uniform?.destroy?.(); throw new Error('Iai initialization retired before uniform assignment'); }
    state.uniform = uniform;
    ensureCurrent('sampler creation');
    const sampler = tracedSync('resource.sampler.create', () => device.createSampler({ magFilter: 'linear', minFilter: 'linear' }));
    ensureCurrent('sampler assignment'); state.sampler = sampler;
    ensureCurrent('canvas context');
    const context = tracedSync('canvas.context', () => canvas.getContext('webgpu')); ensureCurrent('context assignment');
    state.context = context; if (!state.context) throw new Error('WebGPU context unavailable');
    ensureCurrent('canvas configure');
    tracedSync('canvas.configure', () => state.context.configure({ device, format: state.format, alphaMode: 'premultiplied' }));
    ensureCurrent('startup targets');
    const rect = canvas.getBoundingClientRect?.() ?? { width: canvas.clientWidth || canvas.width || 1, height: canvas.clientHeight || canvas.height || 1 };
    const actualScale = canvas.width / (rect.width || canvas.width || 1);
    resize(rect.width || canvas.width || 1, rect.height || canvas.height || 1, actualScale);
    ensureCurrent('startup clear');
    const clearPlan = { active: false, viewport: dimensions(), causeId: null };
    stage('first-frame', { kind: 'startup-clear-pending', active: false, ownerSerial });
    trace('startup-clear.pending', 'start', { active: false, ownerSerial });
    let clear;
    try { clear = await submit(clearPlan, null, 0, true); }
    catch (error) { trace('startup-clear.pending', 'reject', errorDetail(error)); throw error; }
    if (!clear) { const error = new Error(`Iai startup transparent clear failed: ${JSON.stringify(state.lastFailure)}`); trace('startup-clear.pending', 'reject', errorDetail(error)); throw error; }
    ensureCurrent('startup clear completion');
    state.startupClear = clear; trace('startup-clear.pending', 'resolve', { active: false, clear }); return api;
  }

  async function executeRender(source, frame, context, epoch) {
    await api.ready;
    if (state.disposed || state.lost || state.protocolFailed) return { plan: null, receipt: null, soundStarted: false, reason: 'host-unavailable' };
    const measured = canvas.getBoundingClientRect?.() ?? { width: canvas.clientWidth || canvas.width, height: canvas.clientHeight || canvas.height };
    if (state.targets && (canvas.width !== state.targets.width || canvas.height !== state.targets.height)) {
      const ratio = canvas.width / (measured.width || canvas.width || 1);
      resize(measured.width || canvas.width, measured.height || canvas.height, ratio);
    }
    const key = sourceKey(source);
    const clearOnly = async reason => {
      state.currentCause = null; state.audio?.reconcile?.([]);
      const p = { active: false, causeId: null, viewport: dimensions(), observerEnabled: true };
      await submit(p, null, 0, false, null, epoch);
      return { plan: null, receipt: null, soundStarted: false, reason };
    };
    if (!key) return clearOnly('invalid-source');
    const clock = { clockId: frame.clockId, clockKind: frame.clockKind, clockOwnerId: frame.clockOwnerId ?? null, eNowMs: frame.eNowMs, eTimeScale: frame.eTimeScale };
    state.actualClock = () => frame.readClock?.() ?? clock;
    const firstClock = state.actualClock();
    if (!firstClock?.clockId || !Number.isFinite(firstClock.eNowMs) || !Number.isFinite(firstClock.eTimeScale) || firstClock.eTimeScale <= 0 || firstClock.eTimeScale > 4) return clearOnly('clock-unavailable');
    const identityChanged = state.receiptKey !== key || state.receipt?.roomId !== context.roomId;
    if (identityChanged) {
      state.originalReceivedAtEms = context.receivedAtEms;
      state.receiptKey = key;
      state.audioPlayedForSource = false;
    }
    const receiptContext = { ...context, generation: frame.generation, targetGeneration: state.targets?.generation ?? frame.targetGeneration, lease: state.lease,
      clockId: frame.clockId, clockKind: frame.clockKind, clockOwnerId: frame.clockOwnerId ?? null,
      receivedAtEms: identityChanged ? context.receivedAtEms : state.originalReceivedAtEms };
    try {
      if (identityChanged || !state.receipt || state.receipt.generation !== receiptContext.generation || state.receipt.targetGeneration !== receiptContext.targetGeneration || state.receipt.lease !== receiptContext.lease || state.receipt.clockId !== receiptContext.clockId) {
        state.receipt = createReceipt(source, receiptContext);
      }
    } catch { return clearOnly('source-admission-rejected'); }
    const rect = measured;
    const backingScale = canvas.width / (rect.width || canvas.width || 1);
    const userProject = frame.project;
    const hostFrame = { ...frame, viewport: dimensions(), targetGeneration: state.targets.generation, lease: state.lease,
      project: (x, y) => { const p = userProject(x, y); return { ...p, x: p.x * backingScale, y: p.y * backingScale, scale: p.scale * backingScale }; } };
    const plan = planIai(source, state.receipt, hostFrame);
    state.currentCause = plan.active ? plan.causeId : null;
    state.audio?.setMuted?.(verify || state.mutedByCaller || plan.held === true);
    state.audio?.reconcile?.(plan.active && !plan.held ? [plan] : []);
    state.maxInFlight = Math.max(state.maxInFlight, 1);
    const beforeClock = state.actualClock();
    const operation = (async () => {
      try {
        const proof = await submit(plan, state.receipt, beforeClock?.eNowMs ?? frame.eNowMs, false, beforeClock, epoch);
        const afterClock = state.actualClock();
        const soundStarted = proof && plan.active && !plan.held && !state.audioPlayedForSource && afterClock?.clockId === plan.clockId &&
          afterClock?.clockKind === plan.clockKind && (afterClock?.clockOwnerId ?? null) === plan.clockOwnerId && afterClock?.eTimeScale === plan.eTimeScale &&
          state.audio?.completed?.(plan, proof) === true;
        if (soundStarted) state.audioPlayedForSource = true;
        if (!proof || !plan.active || plan.held) state.audio?.reconcile?.([]);
        return { plan, receipt: proof, soundStarted: !!soundStarted, reason: plan.reason };
      } finally { applyPendingResize(); }
    })();
    return operation;
  }

  function render(source, frame, context) {
    const epoch = ++state.renderEpoch;
    let resolve;
    const result = new Promise(r => { resolve = r; });
    const job = { source, frame, context, epoch, resolve };
    const launch = next => {
      const task = executeRender(next.source, next.frame, next.context, next.epoch).catch(error => {
        state.audio?.reconcile?.([]);
        state.lastFailure = { reason: 'render-handler-threw', message: String(error?.message ?? error) };
        stage('proof-rejected', state.lastFailure); return { plan: null, receipt: null, soundStarted: false, reason: 'render-handler-threw' };
      });
      state.inFlight = task;
      task.then(next.resolve, () => next.resolve(null)).finally(() => {
        if (state.inFlight === task) state.inFlight = null;
        applyPendingResize();
        const queued = state.queued; state.queued = null;
        if (queued && !state.disposed) launch(queued); else queued?.resolve(null);
      });
    };
    if (state.inFlight) {
      state.queued?.resolve(null);
      state.queued = job;
    } else launch(job);
    return result;
  }

  const api = {
    ready: null,
    resize,
    render,
    unlockAudio() { return state.audio?.unlock?.() ?? Promise.resolve(false); },
    setMuted(value) { state.mutedByCaller = !!value; state.audio?.setMuted?.(state.mutedByCaller || verify); },
    get diagnostics() { const value = { targetGeneration: state.targetGeneration, generation: state.generation, lease: state.lease, inFlight: !!state.inFlight, queued: !!state.queued, maxInFlight: state.maxInFlight, protocolFailed: state.protocolFailed, queueDrained: state.queueDrained, lastFailure: state.lastFailure, scopeErrors: state.lastScopeErrors, lost: state.lost, disposed: state.disposed }; if (startupTrace) value.startupTrace = traceSnapshot(); return Object.freeze(snapshot(value)); },
    async dispose() {
      if (state.disposeTask) return state.disposeTask;
      state.disposed = true; state.generation++; state.lease++; state.renderEpoch++; state.currentCause = null;
      trace('renderer.retirement', 'retire', { reason: 'dispose' });
      state.queued?.resolve(null); state.queued = null;
      state.disposeTask = (async () => {
        await state.readyTask?.catch(() => {}); await state.inFlight?.catch(() => {});
        const canDestroy = await drain(); await state.audio?.dispose?.(); state.currentTicket = null;
        if (canDestroy) { state.targets?.main.destroy(); state.targets?.source.destroy(); state.uniform?.destroy(); if (!state.lost) state.device?.destroy?.(); }
        trace('renderer.disposal', canDestroy ? 'resolve' : 'reject', { drained: canDestroy, deviceDestroyed: !!canDestroy && !state.lost, pending: Object.keys(traceState?.pending ?? {}) });
        stage(canDestroy ? 'disposed' : 'dispose-blocked-undrained');
      })();
      return state.disposeTask;
    },
  };
  state.audio ??= createIaiAudio({ verify });
  api.ready = (state.readyTask = initialize());
  return api;
}
