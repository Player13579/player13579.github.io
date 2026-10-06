import { planPoisonField, packUniforms, createPoisonAudio } from './poison-model.mjs';
import { WORLD_WGSL, OBSERVER_WGSL } from './poison-shaders.mjs';

const FORMAT = 'rgba16float';
const targetUsage = () => (globalThis.GPUTextureUsage ?? { RENDER_ATTACHMENT: 16, TEXTURE_BINDING: 4 }).RENDER_ATTACHMENT | (globalThis.GPUTextureUsage ?? { TEXTURE_BINDING: 4 }).TEXTURE_BINDING;
const bufferUsage = () => (globalThis.GPUBufferUsage ?? { UNIFORM: 64, COPY_DST: 8 }).UNIFORM | (globalThis.GPUBufferUsage ?? { COPY_DST: 8 }).COPY_DST;
const allSettled = promises => Promise.allSettled(promises);
const isThenable = value => value !== null && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function';
const diagnosticSnapshot = value => JSON.parse(JSON.stringify(value));

export function createRenderer({ canvas, reportStage = () => {}, audio = null, now = () => performance.now(), deviceFactory = null } = {}) {
  if (!canvas) throw new TypeError('canvas is required');
  const generation = { current: 1 };
  const state = {
    device: null, context: null, format: null, worldPipeline: null, observerPipeline: null,
    uniformBuffer: null, sampler: null, targets: null, targetGeneration: 0, backing: null, resizeRequest: null,
    inFlight: null, queued: null, disposed: false, lost: false, initialization: null,
    actualLease: 1, proofCallbacks: 0, maxProofCallbacks: 0, lastErrors: [], lastFailure: null, audio, currentCause: null,
    currentTicket: null, nextTicket: 0, protocolFailed: false, scopeProtocolFailed: false, queueProtocolFailed: false, undrainable: false, queueDrained: true,
  };
  const report = (stage, detail = {}) => reportStage({ stage, ...detail });

  function resize(width = canvas.clientWidth || canvas.width || 1, height = canvas.clientHeight || canvas.height || 1, dpr = globalThis.devicePixelRatio || 1) {
    if (!state.device || state.disposed || state.lost) return false;
    const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    if (state.targets?.width === w && state.targets?.height === h) return false;
    state.actualLease++;
    if (state.inFlight) { state.resizeRequest = { width: w, height: h }; return true; }
    applyResize(w, h);
    return true;
  }

  function applyResize(w, h) {
    state.targets?.main.destroy(); state.targets?.source.destroy();
    const main = state.device.createTexture({ size: [w, h], format: FORMAT, usage: targetUsage() });
    const source = state.device.createTexture({ size: [w, h], format: FORMAT, usage: targetUsage() });
    state.targetGeneration++;
    generation.current = state.targetGeneration;
    state.targets = { main, source, width: w, height: h, generation: state.targetGeneration };
    state.backing = { width: w, height: h };
  }

  function applyPendingResize() {
    if (!state.resizeRequest || state.disposed || state.lost) return;
    const { width, height } = state.resizeRequest;
    state.resizeRequest = null;
    applyResize(width, height);
  }

  function isCurrent(capture) {
    return !state.disposed && !state.lost && generation.current === capture.generation &&
      state.device === capture.device && state.actualLease === capture.lease &&
      state.targets === capture.targets && state.targetGeneration === capture.targetGeneration &&
      canvas.width === capture.width && canvas.height === capture.height &&
      capture.targets?.width === capture.width && capture.targets?.height === capture.height &&
      capture.ticket !== null && state.currentTicket === capture.ticket && capture.ticket?.device === capture.device &&
      capture.ticket?.targets === capture.targets && capture.ticket?.generation === capture.generation &&
      capture.ticket?.targetGeneration === capture.targetGeneration && capture.ticket?.lease === capture.lease &&
      capture.ticket?.width === capture.width && capture.ticket?.height === capture.height &&
      capture.ticket?.causeId === capture.causeId && capture.ticket?.presentation === capture.presentation &&
      capture.ticket?.commandBuffer === capture.commandBuffer;
  }

  async function submit(plan, { startup = false, admittedAt = now() } = {}) {
    const d = state.device, t = state.targets;
    if (!d || !t || state.disposed || state.lost) return null;
    if (state.protocolFailed) {
      state.lastFailure ??= { reason: 'scope-protocol-poisoned', message: 'The renderer refuses further submissions after a broken GPU error-scope protocol.' };
      return null;
    }
    const width = canvas.width, height = canvas.height;
    if (width !== t.width || height !== t.height || plan?.viewport?.width !== width || plan?.viewport?.height !== height) return null;
    if (!startup && plan?.active && (!plan.causeId || !Number.isFinite(plan.endsAt) || !Number.isFinite(plan.createdAt))) return null;
    const admittedAge = startup ? 0 : Math.max(0, plan.ageMs ?? 0) + Math.max(0, now() - admittedAt);
    const alreadyExpired = !startup && plan.active && admittedAge >= plan.endsAt - plan.createdAt;
    const capture = { device: d, targets: t, generation: generation.current, targetGeneration: t.generation, lease: state.actualLease, width, height, causeId: startup ? null : plan?.causeId, presentation: null };
    const staleIdentity = !startup && plan?.active && (plan.generation !== capture.generation || plan.targetGeneration !== capture.targetGeneration || plan.generation !== plan.targetGeneration);
    const drawPlan = alreadyExpired || staleIdentity ? { ...plan, active: false } : plan;
    const scopeNames = ['validation', 'internal', 'out-of-memory'];
    let pushedCount = 0;
    let pushFailure = null;
    for (const name of scopeNames) {
      try { d.pushErrorScope(name); pushedCount++; }
      catch (error) { pushFailure = error; break; }
    }
    if (pushFailure) {
      state.protocolFailed = true; state.scopeProtocolFailed = true;
      const unwind = [];
      for (let i = pushedCount - 1; i >= 0; i--) {
        try {
          const raw = d.popErrorScope();
          if (!isThenable(raw)) {
            state.protocolFailed = true; state.scopeProtocolFailed = true;
            unwind.push({ status: 'invalid-promise', valueType: raw === null ? 'null' : typeof raw });
          } else {
            unwind.push(Promise.resolve(raw).then(value => ({ status: 'fulfilled', value }), reason => ({ status: 'rejected', reason })));
          }
        } catch (error) { unwind.push({ status: 'threw', reason: error }); }
      }
      const settledUnwind = await allSettled(unwind.map(x => x && typeof x.then === 'function' ? x : Promise.resolve(x)));
      state.lastFailure = {
        reason: 'error-scope-push-threw',
        message: String(pushFailure?.message ?? pushFailure),
        pushedCount,
        unwind: settledUnwind.map(x => x.value ?? { status: 'rejected', reason: String(x.reason?.message ?? x.reason) }),
      };
      report('frame-proof-rejected', state.lastFailure);
      return null;
    }

    let executionFailure = null;
    let commandBuffer = null;
    let presentation = null;
    try {
      const encoder = d.createCommandEncoder({ label: startup ? 'Poison Field startup clear' : 'Poison Field frame' });
      const uniform = packUniforms(drawPlan ?? { viewport: { width, height }, active: false });
      if (state.uniformBuffer.size !== uniform.byteLength) throw new Error('uniform buffer must remain exactly 128 bytes');
      d.queue.writeBuffer(state.uniformBuffer, 0, uniform);
      const worldGroup = d.createBindGroup({ layout: state.worldPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: state.uniformBuffer } }] });
      const observerGroup = d.createBindGroup({ layout: state.observerPipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer: state.uniformBuffer } }, { binding: 1, resource: t.main.createView() },
        { binding: 2, resource: t.source.createView() }, { binding: 3, resource: state.sampler },
      ] });
      const world = encoder.beginRenderPass({ colorAttachments: [
        { view: t.main.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } },
        { view: t.source.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } },
      ] });
      world.setPipeline(state.worldPipeline); world.setBindGroup(0, worldGroup); world.draw(3); world.end();
      presentation = state.context.getCurrentTexture();
      const observer = encoder.beginRenderPass({ colorAttachments: [{ view: presentation.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      observer.setPipeline(state.observerPipeline); observer.setBindGroup(0, observerGroup); observer.draw(3); observer.end();
      commandBuffer = encoder.finish();
    } catch (error) { executionFailure = error; }

    const ticket = commandBuffer && presentation ? Object.freeze({
      id: ++state.nextTicket, device: d, commandBuffer, presentation, targets: t,
      generation: generation.current, targetGeneration: t.generation, lease: state.actualLease,
      width, height, causeId: startup ? null : plan?.causeId,
    }) : null;
    capture.presentation = presentation;
    capture.commandBuffer = commandBuffer;
    capture.ticket = ticket;
    if (ticket) state.currentTicket = ticket;
    let queueObservation;
    try {
      if (!executionFailure) {
        try { d.queue.submit([commandBuffer]); }
        catch (error) { executionFailure = error; }
      }
      const rawDone = d.queue.onSubmittedWorkDone();
      if (!isThenable(rawDone)) {
        state.protocolFailed = true; state.queueProtocolFailed = true;
        state.undrainable = true;
        state.queueDrained = false;
        queueObservation = Promise.resolve({ status: 'invalid-promise', valueType: rawDone === null ? 'null' : typeof rawDone });
      } else {
        state.queueDrained = false;
        queueObservation = Promise.resolve(rawDone).then(
          value => { state.queueDrained = true; return { status: 'fulfilled', value }; },
          reason => { state.queueDrained = true; return { status: 'rejected', reason }; },
        );
      }
    } catch (error) {
      if (!executionFailure) executionFailure = error;
      state.protocolFailed = true; state.queueProtocolFailed = true;
      state.undrainable = true;
      state.queueDrained = false;
      queueObservation = Promise.resolve({ status: 'threw', reason: error });
    }

    const pendingScopes = [];
    for (let i = pushedCount - 1; i >= 0; i--) {
      try {
        const raw = d.popErrorScope();
        if (!isThenable(raw)) {
          state.protocolFailed = true; state.scopeProtocolFailed = true;
          pendingScopes.push(Promise.resolve({ status: 'invalid-promise', valueType: raw === null ? 'null' : typeof raw }));
        } else {
          pendingScopes.push(Promise.resolve(raw).then(
            value => ({ status: 'fulfilled', value }),
            reason => { state.protocolFailed = true; state.scopeProtocolFailed = true; return { status: 'rejected', reason }; },
          ));
        }
      } catch (error) {
        state.protocolFailed = true; state.scopeProtocolFailed = true;
        pendingScopes.push(Promise.resolve({ status: 'threw', reason: error }));
      }
    }
    state.proofCallbacks++;
    state.maxProofCallbacks = Math.max(state.maxProofCallbacks, state.proofCallbacks);
    const settled = await allSettled([queueObservation, ...pendingScopes]);
    state.proofCallbacks--;
    const queueResult = settled[0].value;
    const scopeResults = settled.slice(1).map(x => x.value);
    const scopeValues = scopeResults.map(result => {
      if (result?.status === 'fulfilled') {
        const value = result.value;
        return value === null ? null : value?.message ? { name: value.name ?? 'GPUError', message: String(value.message) } : value;
      }
      if (result?.reason) return { name: result.reason?.name ?? 'Error', message: String(result.reason?.message ?? result.reason) };
      return result;
    });
    const scopeErrors = scopeResults.length === 3 && scopeResults.every(result => result?.status === 'fulfilled' && result.value === null) ? null : scopeValues;
    state.lastErrors = scopeErrors;
    const freshAge = startup ? 0 : Math.max(0, plan.ageMs ?? 0) + Math.max(0, now() - admittedAt);
    const current = isCurrent(capture) && (startup || !plan.active || state.currentCause === capture.causeId);
    const unexpired = startup || !plan.active || freshAge < plan.endsAt - plan.createdAt;
    const queueDone = queueResult?.status === 'fulfilled';
    const cleanScopes = scopeErrors === null;
    const resizeRequired = startup && !state.disposed && !state.lost && state.actualLease !== capture.lease;
    if (!current || !unexpired || !queueDone || !cleanScopes || executionFailure) {
      state.lastFailure = {
        reason: executionFailure ? 'command-record-or-submit-failed' : !current ? 'stale-cause-device-target-or-backing' : !unexpired ? 'expired-before-proof-completion' : !queueDone ? (state.queueProtocolFailed || queueResult?.status === 'invalid-promise' || queueResult?.status === 'threw' ? 'queue-completion-protocol-failed' : 'queue-completion-rejected') : state.scopeProtocolFailed ? 'error-scope-protocol-failed' : 'error-scope-not-null',
        message: executionFailure ? String(executionFailure?.message ?? executionFailure) : undefined,
        queue: queueResult?.status === 'fulfilled' ? 'fulfilled' : queueResult?.reason ? { name: queueResult.reason?.name ?? 'Error', message: String(queueResult.reason?.message ?? queueResult.reason) } : queueResult,
        scopes: scopeValues,
        scopeProtocolFailed: state.scopeProtocolFailed, queueProtocolFailed: state.queueProtocolFailed,
        ageMs: freshAge, causeId: capture.causeId, generation: capture.generation, targetGeneration: capture.targetGeneration,
        retryStartupAfterResize: resizeRequired,
      };
      if (scopeResults.some(x => x?.status !== 'fulfilled')) { state.protocolFailed = true; state.scopeProtocolFailed = true; }
      report('frame-proof-rejected', state.lastFailure);
      return null;
    }
    state.lastFailure = null;
    if (startup) return { submitted: true, cleared: true, current: true, scopeErrors: null, passes: 2, width, height };
    if (!plan.active || plan.held || alreadyExpired || staleIdentity) return null;
    const receipt = {
      submitted: true, completed: true, current: true, scopeErrors: null, ageMs: freshAge,
      causeId: startup ? null : plan.causeId, generation: generation.current, targetGeneration: capture.targetGeneration,
      active: true, passes: 2, width, height,
    };
    return receipt;
  }

  function pump(plan) {
    if (state.disposed || state.lost) return Promise.resolve(null);
    let resolveTicket;
    const ticket = new Promise(resolve => { resolveTicket = resolve; });
    const job = { plan, admittedAt: now(), resolve: resolveTicket };
    if (state.inFlight) {
      if (state.queued) state.queued.resolve(null);
      state.queued = job;
      return ticket;
    }
    const run = async () => {
      let current = job;
      try {
        while (current && !state.disposed && !state.lost) {
          state.queued = null;
          let result = null;
          try { result = await submit(current.plan, { admittedAt: current.admittedAt }); } catch { result = null; }
          current.resolve(result);
          applyPendingResize();
          current = state.queued;
        }
      } finally {
        current?.resolve(null);
        if (state.queued) { state.queued.resolve(null); state.queued = null; }
      }
    };
    const task = run(); state.inFlight = task;
    task.finally(() => { if (state.inFlight === task) state.inFlight = null; }).catch(() => {});
    return ticket;
  }

  async function initialize() {
    report('adapter');
    const adapter = deviceFactory ? await deviceFactory() : await globalThis.navigator?.gpu?.requestAdapter();
    if (!adapter) throw new Error('WebGPU adapter unavailable');
    report('device');
    const device = await adapter.requestDevice();
    if (state.disposed) { await device.queue.onSubmittedWorkDone().catch(() => {}); device.destroy(); throw new Error('renderer disposed during device creation'); }
    state.device = device;
    device.lost.then(async info => {
      state.lost = true; generation.current++; state.actualLease++;
      await state.inFlight?.catch(() => {});
      report('device-lost', { reason: info?.message ?? 'unknown' });
    }).catch(() => {});
    report('shader');
    const worldModule = device.createShaderModule({ code: WORLD_WGSL, label: 'Poison Field world' });
    const observerModule = device.createShaderModule({ code: OBSERVER_WGSL, label: 'Poison Field observer' });
    const compilation = await Promise.all([worldModule.getCompilationInfo?.(), observerModule.getCompilationInfo?.()]);
    const diagnostics = compilation.filter(Boolean).flatMap(info => info.messages ?? []).filter(m => m.type === 'error');
    if (diagnostics.length) { state.lastErrors = diagnostics; throw new Error(`WGSL compilation failed: ${diagnostics.map(x => x.message).join('\n')}`); }
    state.format = globalThis.navigator?.gpu?.getPreferredCanvasFormat?.() ?? 'bgra8unorm';
    const fragmentStage = globalThis.GPUShaderStage?.FRAGMENT ?? 2;
    const worldLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: fragmentStage, buffer: { type: 'uniform', minBindingSize: 128 } }] });
    const observerLayout = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: fragmentStage, buffer: { type: 'uniform', minBindingSize: 128 } },
      { binding: 1, visibility: fragmentStage, texture: { sampleType: 'float' } },
      { binding: 2, visibility: fragmentStage, texture: { sampleType: 'float' } },
      { binding: 3, visibility: fragmentStage, sampler: { type: 'filtering' } },
    ] });
    report('pipeline');
    state.worldPipeline = await device.createRenderPipelineAsync({ layout: device.createPipelineLayout({ bindGroupLayouts: [worldLayout] }), vertex: { module: worldModule, entryPoint: 'vs' }, fragment: { module: worldModule, entryPoint: 'fs', targets: [{ format: FORMAT }, { format: FORMAT }] }, primitive: { topology: 'triangle-list' } });
    state.observerPipeline = await device.createRenderPipelineAsync({ layout: device.createPipelineLayout({ bindGroupLayouts: [observerLayout] }), vertex: { module: observerModule, entryPoint: 'vs' }, fragment: { module: observerModule, entryPoint: 'fs', targets: [{ format: state.format, blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }] }, primitive: { topology: 'triangle-list' } });
    state.uniformBuffer = device.createBuffer({ size: 128, usage: bufferUsage(), label: 'Poison Field uniforms' });
    state.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    state.context = canvas.getContext('webgpu');
    if (!state.context) throw new Error('canvas WebGPU context unavailable');
    state.context.configure({ device, format: state.format, alphaMode: 'premultiplied' });
    resize();
    let clear = null;
    let resizeRetries = 0;
    while (!clear && !state.disposed && !state.lost) {
      const clearPlan = { viewport: { width: canvas.width, height: canvas.height }, active: false, causeId: null, generation: generation.current, targetGeneration: state.targetGeneration };
      const task = submit(clearPlan, { startup: true });
      state.inFlight = task;
      try { clear = await task; }
      finally {
        if (state.inFlight === task) state.inFlight = null;
        applyPendingResize();
      }
      if (!clear && !state.disposed && !state.lost) {
        const retryResize = state.lastFailure?.retryStartupAfterResize === true && resizeRetries < 2;
        if (!retryResize) throw new Error(`initial transparent GPU clear failed: ${JSON.stringify(state.lastFailure)}`);
        resizeRetries++;
      }
    }
    if (!clear) throw new Error(`initial transparent two-pass GPU clear was not proven: ${JSON.stringify(state.lastFailure)}`);
    report('first-frame', { active: false, clear });
    return api;
  }

  const api = {
    ready: null,
    resize,
    render(plan) { state.currentCause = plan?.active === true ? plan.causeId : null; return pump(plan); },
    plan(field, frame) {
      const viewport = { width: canvas.width, height: canvas.height };
      return planPoisonField(field, { ...frame, viewport, generation: generation.current, expectedGeneration: generation.current, targetGeneration: state.targets?.generation ?? -1 });
    },
    async renderField(field, frame) {
      const p = api.plan(field, frame);
      state.currentCause = p.active === true ? p.causeId : null;
      state.audio?.reconcile(p.active && !p.held ? [p] : []);
      const started = now();
      const receipt = await pump(p);
      const fresh = receipt && { ...receipt, ageMs: p.ageMs + Math.max(0, now() - started) };
      const played = fresh && p.active && !p.held ? state.audio?.completed(p, fresh) === true : false;
      return { plan: p, receipt: fresh, soundStarted: played };
    },
    async explicitPlayUnlock() { return state.audio?.unlock() ?? false; },
    setMuted(value) { state.audio?.setMuted(value); },
    reconcileAudio(plans) { state.audio?.reconcile(plans); },
    get diagnostics() { return Object.freeze(diagnosticSnapshot({ targetGeneration: state.targetGeneration, generation: generation.current, lease: state.actualLease, inFlight: !!state.inFlight, queued: !!state.queued, proofCallbacks: state.proofCallbacks, maxProofCallbacks: state.maxProofCallbacks, lastErrors: state.lastErrors, lastFailure: state.lastFailure, protocolFailed: state.protocolFailed, scopeProtocolFailed: state.scopeProtocolFailed, queueProtocolFailed: state.queueProtocolFailed, undrainable: state.undrainable, queueDrained: state.queueDrained, lost: state.lost, disposed: state.disposed })); },
    async dispose() {
      if (state.disposed) return;
      state.disposed = true; generation.current++; state.actualLease++;
      state.queued?.resolve(null); state.queued = null;
      await state.initialization?.catch(() => {});
      await state.inFlight?.catch(() => {});
      let canDestroy = true;
      if (state.device && !state.lost && !state.queueDrained) {
        try {
          const rawDrain = state.device.queue.onSubmittedWorkDone();
          if (!isThenable(rawDrain)) throw new TypeError('dispose drain did not return a Promise');
          try { await rawDrain; } catch { /* rejection is settled; it still drains the earlier queue prefix */ }
          state.queueDrained = true; state.undrainable = false;
        } catch (error) {
          canDestroy = false; state.undrainable = true;
          state.lastFailure = { reason: 'dispose-could-not-prove-queue-drain', message: String(error?.message ?? error) };
          report('dispose-blocked-undrainable', state.lastFailure);
        }
      }
      await state.audio?.dispose?.();
      state.currentTicket = null;
      if (canDestroy) {
        state.targets?.main.destroy(); state.targets?.source.destroy();
        state.uniformBuffer?.destroy();
        if (!state.lost) state.device?.destroy();
      }
      report('disposed');
    },
  };
  state.audio ??= createPoisonAudio({});
  api.ready = (state.initialization ??= initialize());
  return api;
}
