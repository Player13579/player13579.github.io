/* WebGPU-only main presentation lifecycle. The game owns its existing loop and
 * records ordered passes into this runtime's single shared renderer frame. */
(function (root) {
  'use strict';
  const rendererDefault = root.DvaWebGPURenderer || (typeof require === 'function' ? require('./webgpu-renderer.js') : null);
  const viewportDefault = root.DvaWebGPUViewport || (typeof require === 'function' ? require('./webgpu-viewport.js') : null);
  const schedulerDefault = root.DvaWebGPUMainFrameScheduler || (typeof require === 'function' ? require('./webgpu-main-frame-scheduler.js') : null);
  const DEFAULT_CLEAR = Object.freeze([0, 0, 0, 1]);

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

    function cleanup() {
      if (disposed) return;
      disposed = true;
      generation += 1;
      scheduler?.destroy();
      gate.suspend();
      try { handle?.unregister(); } catch (_) { /* A failed device may have removed targets. */ }
      try { renderer?.destroy(); } catch (_) { /* Preserve the original failure. */ }
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

    async function draw({ sample, rect, dpr = 1, camera, prepare, record,
      clearColor = DEFAULT_CLEAR, recordClears = false, isCurrent = () => true,
      onTiming } = {}) {
      const timing = typeof onTiming === 'function' ? (name, startedAt = null) => {
        try {
          const atMs = root.performance?.now?.();
          if (!Number.isFinite(atMs)) return;
          onTiming(name, startedAt === null ? null : atMs - startedAt);
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
        const frame = renderer.beginFrame('DVA main');
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
          const passes = frame.submit();
          timing?.('queueSubmitReceipt', submitStartedAt);
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
  const api = Object.freeze({ create, createRendererLease });
  root.DvaWebGPUMainRuntime = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
