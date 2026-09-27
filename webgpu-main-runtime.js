/* WebGPU-only main presentation lifecycle. The game owns its existing loop and
 * records ordered passes into this runtime's single shared renderer frame. */
(function (root) {
  'use strict';
  const rendererDefault = root.DvaWebGPURenderer || (typeof require === 'function' ? require('./webgpu-renderer.js') : null);
  const viewportDefault = root.DvaWebGPUViewport || (typeof require === 'function' ? require('./webgpu-viewport.js') : null);
  const schedulerDefault = root.DvaWebGPUMainFrameScheduler || (typeof require === 'function' ? require('./webgpu-main-frame-scheduler.js') : null);
  const DEFAULT_CLEAR = Object.freeze([0, 0, 0, 1]);
  // Opt in with ?verify&webgpuFrameCost=1. Read samples in the browser through
  // window.__DVA_WEBGPU_FRAME_COST__.samples(); tests may set the named hook.
  const FRAME_COST_GLOBAL = '__DVA_WEBGPU_FRAME_COST__';
  const FRAME_COST_TEST_HOOK = '__DVA_WEBGPU_FRAME_COST_TEST_HOOK__';

  function frameCostRequested() {
    if (root[FRAME_COST_TEST_HOOK] === true) return true;
    try {
      const params = new URLSearchParams(root.location?.search || '');
      return params.has('verify') && params.get('webgpuFrameCost') === '1';
    } catch (_) { return false; }
  }

  function createFrameCostBuffer(capacity = 180) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('Frame cost capacity must be a positive integer');
    const slots = new Array(capacity);
    let next = 0, length = 0, sequence = 0;
    return Object.freeze({
      push(sample) {
        slots[next] = Object.freeze({ ...sample, sequence: ++sequence });
        next = (next + 1) % capacity;
        length = Math.min(capacity, length + 1);
      },
      snapshot() {
        const result = [];
        const start = (next - length + capacity) % capacity;
        for (let index = 0; index < length; index++) result.push(slots[(start + index) % capacity]);
        return Object.freeze(result);
      },
      clear() { next = 0; length = 0; sequence = 0; slots.fill(undefined); }
    });
  }

  // A prewarmed renderer has one explicit transfer boundary. Before claim,
  // dispose() is responsible for cancellation; after claim, the runtime owns
  // destruction. The renderer remains visible for identity checks by callers.
  function createRendererLease(renderer) {
    if (!renderer || renderer.state !== 'ready' || !renderer.device) {
      throw new Error('A ready WebGPU renderer with a device is required');
    }
    const device = renderer.device;
    let state = 'ready';
    return Object.freeze({
      renderer,
      device,
      get state() { return state; },
      consume(expectedDevice = device) {
        if (state !== 'ready') throw new Error(`WebGPU renderer lease is ${state}`);
        if (renderer.state !== 'ready' || !renderer.device || renderer.device !== device ||
            expectedDevice !== device) {
          throw renderer.failure || new Error('WebGPU renderer lease device mismatch or renderer unavailable');
        }
        state = 'consumed';
        return renderer;
      },
      dispose() {
        if (state !== 'ready') return false;
        state = 'disposed';
        try { renderer.destroy(); } catch (_) { /* Cancellation must remain idempotent. */ }
        return true;
      }
    });
  }

  async function create(options = {}) {
    const { canvas, target = 'main', rendererApi = rendererDefault,
      viewportApi = viewportDefault, schedulerApi = schedulerDefault, gpu,
      rendererLease = null } = options;
    if (!canvas || typeof canvas.getContext !== 'function' ||
        (!rendererLease && !rendererApi?.create) || !viewportApi?.createStableGate || !schedulerApi?.create) {
      throw new TypeError('Main WebGPU canvas and renderer/viewport/scheduler APIs required');
    }
    const gate = viewportApi.createStableGate();
    let renderer = null, handle = null, disposed = false, failure = null;
    let generation = 0, scheduler = null, hiddenSuspension = false;
    const frameCostBuffer = frameCostRequested() ? createFrameCostBuffer() : null;
    let frameCostApi = null;
    if (frameCostBuffer) {
      frameCostApi = Object.freeze({ enabled: true, capacity: 180,
        samples: () => frameCostBuffer.snapshot(), clear: () => frameCostBuffer.clear() });
      root[FRAME_COST_GLOBAL] = frameCostApi;
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      generation += 1;
      scheduler?.destroy();
      gate.suspend();
      try { handle?.unregister(); } catch (_) { /* A failed device may have removed targets. */ }
      try { renderer?.destroy(); } catch (_) { /* Preserve the original failure. */ }
      if (frameCostApi && root[FRAME_COST_GLOBAL] === frameCostApi) {
        try { delete root[FRAME_COST_GLOBAL]; } catch (_) { root[FRAME_COST_GLOBAL] = undefined; }
      }
    }
    function fail(error) {
      if (disposed) return;
      failure = error instanceof Error ? error : new Error(String(error));
      cleanup();
      try { options.onFailure?.(failure); } catch (_) { /* Preserve the GPU failure. */ }
    }
    try {
      if (rendererLease) {
        if (typeof rendererLease.consume !== 'function' || rendererLease.state !== 'ready') {
          throw new Error('Main WebGPU renderer lease is unavailable or already consumed');
        }
        // Claim immediately before target registration. No canvas context is
        // touched while a lease is merely prepared or cancelled.
        renderer = rendererLease.consume(options.expectedDevice);
      } else {
        renderer = await rendererApi.create({ gpu, onFailure: fail,
          powerPreference: options.powerPreference, deviceDescriptor: options.deviceDescriptor,
          format: options.format, maxDraws: options.maxDraws });
      }
      if (disposed || renderer.state !== 'ready') {
        throw failure || renderer.failure || new Error('Main WebGPU renderer unavailable');
      }
      // A valid initial backing is required for configuration. The stable gate
      // supplies the actual DPR-aware size before the first submitted frame.
      handle = renderer.registerTarget(target, canvas, {
        width: Math.max(1, canvas.width || 1), height: Math.max(1, canvas.height || 1),
        logicalWidth: 980, logicalHeight: 620
      });
    } catch (error) {
      cleanup();
      throw error;
    }

    async function draw({ sample, rect, dpr = 1, camera, phase = null, prepare, record,
      clearColor = DEFAULT_CLEAR, recordClears = false, isCurrent = () => true,
      onTiming } = {}) {
      const collectFrameCost = Boolean(frameCostBuffer && phase === 'playing');
      const frameCosts = collectFrameCost ? {} : null;
      const timing = (typeof onTiming === 'function' || collectFrameCost) ? (name, startedAt = null) => {
        try {
          const atMs = root.performance?.now?.();
          if (!Number.isFinite(atMs)) return;
          const durationMs = startedAt === null ? null : atMs - startedAt;
          if (collectFrameCost) {
            if (name === 'prepareEnd') frameCosts.prepareMs = durationMs;
            else if (name === 'recordEnd') frameCosts.recordMs = durationMs;
            else if (name === 'queueSubmitReceipt') frameCosts.submitMs = durationMs;
          }
          if (typeof onTiming === 'function') onTiming(name, durationMs);
        } catch (_) { /* Verification diagnostics cannot change rendering. */ }
      } : null;
      timing?.('runtimeFrameEntry');
      if (disposed) throw failure || new Error('Main WebGPU runtime destroyed');
      if (typeof isCurrent !== 'function') throw new TypeError('WebGPU isCurrent must be a function');
      if (prepare !== undefined && typeof prepare !== 'function') throw new TypeError('WebGPU prepare must be a function');
      if (record !== undefined && typeof record !== 'function') throw new TypeError('WebGPU record must be a function');
      if (typeof recordClears !== 'boolean' || (recordClears && !record)) {
        throw new TypeError('Scene-owned clear requires recordClears: true and a record callback');
      }
      // A newer observation supersedes pending async preparation, including an
      // invalid/hidden observation. It cannot submit an old scene on return.
      const drawGeneration = ++generation;
      const viewport = gate.observe(sample, { kind: 'main', rect, dpr, camera,
        maxTextureDimension2D: renderer.device.limits.maxTextureDimension2D });
      if (!viewport) return Object.freeze({ drawn: false, reason: 'unstable-layout' });
      let prepared;
      let drawError = null;
      try {
        const prepareStartedAt = timing ? root.performance.now() : null;
        timing?.('prepareBegin');
        prepared = await prepare?.({ viewport, device: renderer.device, renderer, target });
        timing?.('prepareEnd', prepareStartedAt);
        if (drawGeneration !== generation || disposed || gate.suspended || !isCurrent()) {
          return Object.freeze({ drawn: false, reason: 'superseded' });
        }
        handle.resize(viewport.pixelWidth, viewport.pixelHeight,
          { width: viewport.width, height: viewport.height });
        const frame = collectFrameCost
          ? renderer.beginFrame('DVA main', true)
          : renderer.beginFrame('DVA main');
        try {
          if (!recordClears) frame.clear(target, clearColor);
          let sceneCleared = false;
          // Renderer frames are frozen. A separate facade preserves fluent
          // recording while observing the scene's first clear without violating
          // Proxy invariants on non-configurable frame methods.
          const facade = {};
          if (recordClears) {
            for (const name of ['add', 'addEncoder', 'clear', 'stage', 'rect', 'sprite', 'composite']) {
              facade[name] = (...args) => {
                const result = frame[name](...args);
                if (name === 'clear' || (name === 'add' && args[0]?.clear)) sceneCleared = true;
                return result === frame ? facade : result;
              };
            }
            Object.freeze(facade);
          }
          const recordingFrame = recordClears ? facade : frame;
          const recordStartedAt = timing ? root.performance.now() : null;
          timing?.('recordBegin');
          const result = record?.({ frame: recordingFrame, target, viewport, renderer, prepared });
          if (result && typeof result.then === 'function') {
            throw new TypeError('WebGPU frame recording must be synchronous');
          }
          timing?.('recordEnd', recordStartedAt);
          if (recordClears && !sceneCleared) {
            throw new Error('Scene record must clear the main target before submission');
          }
          // Recording is synchronous but may re-enter lifecycle methods. Check
          // the scheduler lease again at the last point before GPU submission.
          if (drawGeneration !== generation || disposed || gate.suspended || !isCurrent()) {
            frame.discard();
            return Object.freeze({ drawn: false, reason: 'superseded' });
          }
          const submitStartedAt = timing ? root.performance.now() : null;
          timing?.('queueSubmitBegin');
          const primitiveStats = collectFrameCost ? frame.diagnostics?.() : null;
          const passes = frame.submit();
          timing?.('queueSubmitReceipt', submitStartedAt);
          if (collectFrameCost) frameCostBuffer.push({ phase, ...frameCosts,
            ...primitiveStats, passes, atMs: root.performance.now() });
          // Interaction targets belong to the submitted frame. Never expose a
          // record result from a discarded or superseded preparation.
          const receipt = Object.freeze({ drawn: true, passes, viewport, recordResult: result });
          timing?.('runtimeReceipt');
          return receipt;
        } catch (error) {
          try { frame.discard(); } catch (_) {}
          throw error;
        }
      } catch (error) {
        drawError = error;
        if (drawGeneration !== generation) {
          return Object.freeze({ drawn: false, reason: 'superseded' });
        }
        // Polls and marker lifetimes may change while GPU assets prepare.
        // Discard that candidate without destroying the shared device; the
        // next RAF will capture current data. Other preparation errors remain fatal.
        if (error?.code === 'DVA_WEBGPU_STALE_SCENE') {
          return Object.freeze({ drawn: false, reason: 'stale-scene' });
        }
        if (error?.code === 'DVA_WEBGPU_INCOMPLETE_SCENE') {
          return Object.freeze({ drawn: false, reason: 'incomplete-scene' });
        }
        fail(error);
        throw error;
      } finally {
        try { prepared?.release?.(); } catch (error) {
          if (!drawError) { fail(error); throw error; }
        }
      }
    }
    scheduler = schedulerApi.create({ draw: (scene, lease) => draw({ ...scene, isCurrent: lease.isCurrent }) });
    return Object.freeze({
      get state() { return failure || renderer.state === 'failed' ? 'failed' : disposed ? 'destroyed' : 'ready'; },
      get failure() { return failure || renderer.failure || null; },
      get viewport() { return gate.snapshot; },
      get device() { if (disposed) throw failure || new Error('Main WebGPU runtime destroyed'); return renderer.device; },
      get renderer() { if (disposed) throw failure || new Error('Main WebGPU runtime destroyed'); return renderer; },
      draw,
      requestFrame(scene, requestOptions = {}) {
        const hidden = requestOptions.hidden ?? !!scene?.sample?.hidden;
        if (hidden) hiddenSuspension = true;
        else if (hiddenSuspension && scheduler.state === 'suspended') {
          scheduler.resume();
          hiddenSuspension = false;
        }
        return scheduler.request(scene, { hidden });
      },
      get scheduler() { return scheduler; },
      suspend() { if (!disposed) { hiddenSuspension = false; scheduler.suspend(); generation += 1; gate.suspend(); } },
      resume() { hiddenSuspension = false; return !disposed && scheduler.resume(); },
      destroy: cleanup
    });
  }
  const api = Object.freeze({ create, createRendererLease, createFrameCostBuffer });
  root.DvaWebGPUMainRuntime = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
