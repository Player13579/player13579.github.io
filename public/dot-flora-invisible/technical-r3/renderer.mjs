// Technical derivative of the frozen r1 renderer. Visual shaders, world,
// observer and plan inputs remain byte-for-byte imports from r1.
import { worldWGSL } from '../r1/world.mjs';
import { observerWGSL } from '../r1/observer.mjs';
import { pack } from '../r1/plan.mjs';

const vertex = `struct V{@builtin(position) position:vec4f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:V;o.position=vec4f(a[i],0,1);return o;}`;
export const shaderPrefix = `struct Params{view:vec4f,geometry:vec4f,state:vec4f,extra:vec4f};
@group(0) @binding(0) var<uniform> p:Params;`;
export const shaderSuffix = `@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f{
let q=(pixel.xy-p.view.zw)/p.geometry.xy;
return worldRadiance(q,p.state.x,p.state.z>.5)*p.state.w;}`;

const ERROR_FILTERS = ['validation', 'out-of-memory', 'internal'];
const errorText = error => error ? (error.message || String(error)) : '';

export function createRenderer({ device, context, format, width, height, deviceEpoch = 1, clock = () => performance.now(), onDeviceLost = () => {} } = {}) {
  if (!device?.queue?.onSubmittedWorkDone || !context?.getCurrentTexture || !format ||
      format.endsWith('-srgb') || ![width, height].every(n => Number.isInteger(n) && n > 0)) {
    throw new TypeError('ready device/context and positive non-sRGB backing dimensions required');
  }

  let disposed = false;
  let busy = false;
  let sequence = 0;
  let currentRender = null;
  let currentClear = null;
  let clearQueued = false;
  let retirement = null;
  let lastFence = Promise.resolve();
  let initState = 'preparing';
  let initFailure = null;
  let initScopes = [];
  let resources = { source: null, uniform: null, obs: null };
  let wm = null, om = null, world = null, observer = null, sourceView = null, wb = null, ob = null;
  const ownedDeviceEpoch = deviceEpoch;

  const destroyResources = () => {
    const failures = [];
    for (const value of [resources.source, resources.uniform, resources.obs]) {
      try { value?.destroy?.(); } catch (error) { failures.push(error); }
    }
    resources = { source: null, uniform: null, obs: null };
    return failures;
  };
  const collectScopes = async count => {
    const found = [];
    for (let i = count - 1; i >= 0; i--) {
      const filter = ERROR_FILTERS[i];
      try { found.push({ filter, error: await device.popErrorScope() }); }
      catch (error) { found.push({ filter, error, popFailed: true }); }
    }
    found.reverse();
    return found;
  };
  const pushScopes = onPushed => {
    let count = 0;
    for (const filter of ERROR_FILTERS) { device.pushErrorScope(filter); count++; onPushed?.(count); }
    return count;
  };
  const scopeFailureText = results => results.filter(item => item.error || item.popFailed)
    .map(item => `${item.filter}: ${errorText(item.error) || 'error scope pop failed'}`).join('; ');
  const createQueueFence = () => {
    try {
      const fence = device.queue.onSubmittedWorkDone();
      lastFence = Promise.resolve(fence);
      return lastFence;
    } catch (error) {
      lastFence = Promise.reject(error);
      // The rejecting promise is awaited by the active render/clear path.
      return lastFence;
    }
  };
  const settleFence = async () => {
    try { await lastFence; return null; }
    catch (error) { return error; }
  };

  const initialize = async () => {
    let scopes = 0;
    let thrown = null;
    try {
      scopes = pushScopes(count => { scopes = count; });
      resources.source = device.createTexture({ label: 'Flora private source HDR', size: [width, height], format: 'rgba16float', usage: 0x10 | 0x04 });
      resources.uniform = device.createBuffer({ label: 'Flora source uniform', size: 64, usage: 0x40 | 0x08 });
      resources.obs = device.createBuffer({ label: 'Flora observer uniform', size: 16, usage: 0x40 | 0x08 });
      wm = device.createShaderModule({ label: 'Flora private world', code: shaderPrefix + vertex + worldWGSL + shaderSuffix });
      om = device.createShaderModule({ label: 'Flora source-bound OBS', code: observerWGSL });
      const make = (module, target) => device.createRenderPipeline({ layout: 'auto', vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format: target }] }, primitive: { topology: 'triangle-list' } });
      world = make(wm, 'rgba16float');
      observer = make(om, format);
      sourceView = resources.source.createView();
      wb = device.createBindGroup({ layout: world.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: resources.uniform } }] });
      ob = device.createBindGroup({ layout: observer.getBindGroupLayout(0), entries: [
        { binding: 0, resource: sourceView },
        { binding: 1, resource: device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' }) },
        { binding: 2, resource: { buffer: resources.obs } },
      ] });
    } catch (error) { thrown = error; }

    if (scopes) initScopes = await collectScopes(scopes);
    const scopeError = scopeFailureText(initScopes);
    if (thrown || scopeError) {
      const destroyErrors = destroyResources();
      initFailure = thrown || new Error(`WebGPU pipeline creation error scope: ${scopeError}`);
      if (destroyErrors.length && !thrown) initFailure = new AggregateError([initFailure, ...destroyErrors], 'Renderer initialization and cleanup failed');
      initState = 'failed';
      throw initFailure;
    }
    initState = 'ready';
  };
  const initPromise = initialize();
  // Consume the constructor promise rejection until a public method observes it.
  void initPromise.catch(() => {});

  const lostPromise = device.lost;
  if (lostPromise && typeof lostPromise.then === 'function') {
    Promise.resolve(lostPromise).then(info => {
      if (!disposed) {
        try { onDeviceLost({ device, deviceEpoch: ownedDeviceEpoch, info }); } catch { /* reporting is non-fatal */ }
      }
    }, error => {
      if (!disposed) {
        try { onDeviceLost({ device, deviceEpoch: ownedDeviceEpoch, info: { reason: 'lost-promise-rejected', message: errorText(error) } }); } catch { /* reporting is non-fatal */ }
      }
    });
  }

  async function performRender(plan) {
    let scopes = 0, errors = [], receipt, written = false, submitted = false;
    let primaryError = null, fenceError = null;
    try {
      await initPromise;
      if (disposed) throw new Error('renderer disposed');
      if (plan?.pixelWidth !== width || plan?.pixelHeight !== height) throw new TypeError('backing dimensions mismatch');
      const values = pack(plan);
      scopes = pushScopes(count => { scopes = count; });
      device.queue.writeBuffer(resources.uniform, 0, values); written = true;
      device.queue.writeBuffer(resources.obs, 0, new Float32Array([width, height, 1, .35]));
      const encoder = device.createCommandEncoder({ label: 'Flora private two-pass frame' });
      for (const [view, pipeline, bind] of [[sourceView, world, wb], [context.getCurrentTexture().createView(), observer, ob]]) {
        const pass = encoder.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
        pass.setPipeline(pipeline); pass.setBindGroup(0, bind); pass.draw(3); pass.end();
      }
      device.queue.submit([encoder.finish()]); submitted = true;
      await createQueueFence();
      const completedAt = Number(clock());
      if (!Number.isFinite(completedAt)) throw new TypeError('renderer clock must return a finite timestamp');
      receipt = { effectId: plan.effectId, completed: true, submissionSequence: ++sequence, passes: 2, width, height,
        sourceOrigin: plan.sourceOrigin, submittedAt: plan.sourceNow, completedAt,
        ageAtSubmit: plan.sourceNow - plan.sourceOrigin };
    } catch (error) { primaryError = error; }
    finally {
      // writeBuffer is queue work too. Even when encoder creation/recording
      // throws, fence it before releasing resources or clearing busy ownership.
      if (written && !submitted) fenceError = await createQueueFence().then(() => null, error => error);
      else if (submitted) fenceError = await settleFence();
      errors = scopes ? await collectScopes(scopes) : [];
      busy = false;
      currentRender = null;
    }
    if (primaryError) throw primaryError;
    if (fenceError) throw fenceError;
    const scopeError = scopeFailureText(errors);
    if (scopeError) throw new Error(`WebGPU scoped error: ${scopeError}`);
    return Object.freeze({ ...receipt, errorScopes: errors });
  }

  function render(plan) {
    if (disposed) return Promise.reject(new Error('renderer disposed'));
    if (busy || clearQueued) return Promise.reject(new Error('renderer frame or clear still pending'));
    busy = true;
    // Keep the actual frame task until all queue fences and popErrorScope calls settle.
    const task = performRender(plan);
    currentRender = task;
    return task;
  }

  async function performClear() {
    let scopes = 0, primaryError = null, fenceError = null, errors = [], submitted = false;
    try {
      await initPromise;
      if (disposed) throw new Error('renderer disposed');
      scopes = pushScopes(count => { scopes = count; });
      const encoder = device.createCommandEncoder({ label: 'Flora terminal clear' });
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
      pass.end();
      device.queue.submit([encoder.finish()]); submitted = true;
      await createQueueFence();
    } catch (error) { primaryError = error; }
    finally {
      if (submitted) fenceError = await settleFence();
      errors = scopes ? await collectScopes(scopes) : [];
      busy = false;
    }
    if (primaryError) throw primaryError;
    if (fenceError) throw fenceError;
    const scopeError = scopeFailureText(errors);
    if (scopeError) throw new Error(`WebGPU clear scope error: ${scopeError}`);
    return Object.freeze({ blank: true, completed: true, errorScopes: errors });
  }

  function clear() {
    if (disposed) return Promise.reject(new Error('renderer disposed'));
    if (currentClear) return currentClear;
    clearQueued = true;
    const before = currentRender;
    const start = Promise.resolve(before).catch(() => {}).then(() => {
      if (disposed) throw new Error('renderer disposed');
      if (busy) throw new Error('renderer operation still pending');
      clearQueued = false;
      busy = true;
      return performClear();
    });
    currentClear = start.finally(() => { clearQueued = false; currentClear = null; });
    return currentClear;
  }

  function dispose() {
    if (retirement) return retirement;
    disposed = true;
    retirement = (async () => {
      const active = [currentRender, currentClear].filter(Boolean);
      await Promise.allSettled(active);
      // A command may have been submitted immediately before its render task
      // settled. Wait its final fence before destroying any owned GPU resource.
      const fenceError = await settleFence();
      try { await initPromise; } catch { /* initialization failure already destroys partial resources */ }
      const cleanupErrors = destroyResources();
      if (fenceError && cleanupErrors.length) throw new AggregateError([fenceError, ...cleanupErrors], 'Renderer retirement failed');
      if (fenceError) throw fenceError;
      if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Renderer resource cleanup failed');
      return true;
    })();
    return retirement;
  }

  async function compilationInfo() {
    try { await initPromise; } catch { /* modules may still have useful independent compiler diagnostics */ }
    if (!wm && !om) return [];
    return Promise.all([wm, om].filter(Boolean).map(module => module.getCompilationInfo()));
  }
  async function pipelineCreationErrors() {
    try { await initPromise; } catch { /* return actual recorded scopes separately from shader diagnostics */ }
    return initScopes.map(item => ({ filter: item.filter, error: item.error ? { name: item.error.name, message: errorText(item.error) } : null, popFailed: Boolean(item.popFailed) }));
  }

  return Object.freeze({ render, clear, dispose, compilationInfo, pipelineCreationErrors,
    get state() { return disposed ? 'disposed' : initState === 'failed' ? 'failed' : busy ? 'pending' : initState; },
    get initializationError() { return initFailure; },
    get deviceEpoch() { return ownedDeviceEpoch; },
  });
}
