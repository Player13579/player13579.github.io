/* Shared WebGPU frame owner. No Canvas 2D context or fallback is created here.
 * Callers supply ordered render-pass commands; material pipelines live in other modules. */
(function (root) {
  'use strict';

  function createFailure(reason) {
    return reason instanceof Error ? reason :
      new Error(String(reason?.message || reason || 'WebGPU unavailable'));
  }

  async function create(options = {}) {
    const gpu = options.gpu || root.navigator?.gpu;
    if (!gpu) throw new Error('WebGPU unavailable');
    const adapter = await gpu.requestAdapter({ powerPreference: options.powerPreference || 'high-performance' });
    if (!adapter) throw new Error('WebGPU adapter unavailable');
    const descriptor = options.deviceDescriptor || {};
    const wantsGpuTiming = options.gpuTiming === true;
    const timestampSupported = Boolean(wantsGpuTiming && adapter.features?.has?.('timestamp-query'));
    let device;
    let gpuTimingStatus = wantsGpuTiming ? (timestampSupported ? 'initializing' : 'unavailable:timestamp-query') : 'disabled';
    if (timestampSupported) {
      try {
        device = await adapter.requestDevice({ ...descriptor,
          requiredFeatures: [...new Set([...(descriptor.requiredFeatures || []), 'timestamp-query'])] });
      } catch (_) {
        gpuTimingStatus = 'unavailable:device-feature-request';
      }
    }
    if (!device) device = await adapter.requestDevice(descriptor);
    const format = options.format || gpu.getPreferredCanvasFormat();
    const targets = new Map();
    const resources = new Set();
    let state = 'ready';
    let activeFrame = null;
    let failure = null;
    let nextFrameId = 0;
    const timingSlots = [];
    let timingQueries = null;
    if (gpuTimingStatus === 'initializing') {
      try {
        timingQueries = device.createQuerySet({ type: 'timestamp', count: 8, label: 'DVA verify GPU frame timestamps' });
        for (let i = 0; i < 4; i++) {
          const resolve = device.createBuffer({ size: 16, usage: root.GPUBufferUsage.QUERY_RESOLVE | root.GPUBufferUsage.COPY_SRC });
          const readback = device.createBuffer({ size: 16, usage: root.GPUBufferUsage.MAP_READ | root.GPUBufferUsage.COPY_DST });
          timingSlots.push({ index: i, resolve, readback, busy: false });
        }
        gpuTimingStatus = 'supported';
      } catch (_) {
        try { timingQueries?.destroy(); } catch (_) {}
        for (const slot of timingSlots) { try { slot.resolve.destroy(); slot.readback.destroy(); } catch (_) {} }
        timingSlots.length = 0;
        timingQueries = null;
        gpuTimingStatus = 'unavailable:resource-creation';
      }
    }

    function requireReady() {
      if (state !== 'ready') throw failure || new Error('WebGPU frame owner destroyed');
    }

    function stop(reason, report) {
      if (state !== 'ready') return;
      state = report ? 'failed' : 'destroyed';
      failure = report ? createFailure(reason) : null;
      try { activeFrame?.abandon?.(); } catch (_) {}
      activeFrame = null;
      for (const target of targets.values()) {
        try { target.context?.unconfigure(); } catch (_) {}
      }
      targets.clear();
      for (const resource of resources) {
        try { resource.destroy(); } catch (_) {}
      }
      resources.clear();
      try { timingQueries?.destroy(); } catch (_) {}
      for (const slot of timingSlots) { try { slot.resolve.destroy(); slot.readback.destroy(); } catch (_) {} }
      timingSlots.length = 0;
      if (wantsGpuTiming) gpuTimingStatus = 'unavailable:renderer-destroyed';
      try { device.removeEventListener?.('uncapturederror', onUncapturedError); } catch (_) {}
      try { device.destroy(); } catch (_) {}
      if (report) {
        try { options.onFailure?.(failure); } catch (error) { root.console?.error?.('WebGPU failure callback failed', error); }
      }
    }

    function onUncapturedError(event) {
      event.preventDefault?.();
      stop(event.error || 'WebGPU uncaptured error', true);
    }
    device.addEventListener?.('uncapturederror', onUncapturedError);
    device.lost.then(
      info => stop(info?.message || 'WebGPU device lost', true),
      error => stop(error || 'WebGPU device lost', true)
    );

    function dimensions(width, height) {
      const max = device.limits.maxTextureDimension2D;
      if (![width, height].every(Number.isInteger) || width < 1 || height < 1 || width > max || height > max) {
        throw new RangeError('Invalid WebGPU presentation size');
      }
    }

    function registerTarget(id, canvas, settings = {}) {
      requireReady();
      if (activeFrame) throw new Error('Cannot register a target during a frame');
      if (typeof id !== 'string' || !id || targets.has(id)) throw new Error('Invalid or duplicate WebGPU target');
      if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('WebGPU target requires a canvas');
      const context = canvas.getContext('webgpu');
      if (!context) throw new Error('WebGPU presentation context unavailable');
      const width = settings.width ?? canvas.width;
      const height = settings.height ?? canvas.height;
      dimensions(width, height);
      const configuration = { device, format: settings.format || format, alphaMode: settings.alphaMode || 'opaque' };
      canvas.width = width;
      canvas.height = height;
      context.configure(configuration);
      const target = { id, canvas, context, configuration, width, height, sampleable: false };
      targets.set(id, target);
      return Object.freeze({
        get width() { return target.width; },
        get height() { return target.height; },
        resize(nextWidth, nextHeight) {
          requireReady();
          if (activeFrame) throw new Error('Cannot resize a target during a frame');
          dimensions(nextWidth, nextHeight);
          if (nextWidth === target.width && nextHeight === target.height) return false;
          target.canvas.width = nextWidth;
          target.canvas.height = nextHeight;
          target.width = nextWidth;
          target.height = nextHeight;
          target.context.configure(target.configuration);
          return true;
        },
        unregister() {
          if (activeFrame) throw new Error('Cannot unregister a target during a frame');
          if (targets.get(id) !== target) return false;
          targets.delete(id);
          target.context.unconfigure();
          return true;
        }
      });
    }

    // The caller owns this RENDER_ATTACHMENT | TEXTURE_BINDING texture. Unlike a
    // presentation texture, it can be read by a later encoder-level composite.
    function registerTextureTarget(id, texture, settings = {}) {
      requireReady();
      if (activeFrame) throw new Error('Cannot register a target during a frame');
      if (typeof id !== 'string' || !id || targets.has(id)) throw new Error('Invalid or duplicate WebGPU target');
      if (!texture || typeof texture.createView !== 'function') throw new TypeError('Sampleable target requires a GPU texture');
      const { width, height } = settings;
      dimensions(width, height);
      const target = { id, texture, width, height, sampleable: true,
        configuration: { format: settings.format || format } };
      targets.set(id, target);
      return Object.freeze({
        get width() { return width; },
        get height() { return height; },
        get texture() { return texture; },
        unregister() {
          if (activeFrame) throw new Error('Cannot unregister a target during a frame');
          if (targets.get(id) !== target) return false;
          targets.delete(id);
          return true;
        }
      });
    }

    function beginFrame(label = 'DVA frame') {
      requireReady();
      if (activeFrame) throw new Error('A WebGPU frame is already open');
      const commands = [];
      const frame = {};
      const frameId = ++nextFrameId;
      let submitted = false, abandoned = false;
      activeFrame = frame;
      function abandon() {
        if (submitted || abandoned) return;
        abandoned = true;
        for (const command of commands) {
          try { command.onAbandon?.(); } catch (error) {
            root.console?.error?.('WebGPU frame abandon callback failed', error);
          }
        }
      }
      frame.abandon = abandon;
      function requireActive() {
        requireReady();
        if (activeFrame !== frame) throw new Error('WebGPU frame is closed');
      }
      frame.add = function (command) {
        requireActive();
        if (!command || !targets.has(command.target) || typeof command.encode !== 'function') {
          throw new TypeError('Frame command requires a registered target and encode callback');
        }
        if (command.clear && !['r', 'g', 'b', 'a'].every(key => Number.isFinite(command.clear[key]))) {
          throw new TypeError('Frame clear color must have finite RGBA values');
        }
        commands.push({ kind: 'pass', target: command.target, label: String(command.label || ''), clear: command.clear, encode: command.encode });
        return frame;
      };
      frame.addEncoder = function (command) {
        requireActive();
        if (!command || typeof command.encode !== 'function' || !Array.isArray(command.reads) || !Array.isArray(command.writes)) {
          throw new TypeError('Encoder command requires reads, writes and encode callback');
        }
        const reads = command.reads.slice(), writes = command.writes.slice();
        if (!writes.length || new Set([...reads, ...writes]).size !== reads.length + writes.length ||
          [...reads, ...writes].some(id => !targets.has(id)) || reads.some(id => !targets.get(id).sampleable)) {
          throw new Error('Encoder command needs distinct registered targets and sampleable reads');
        }
        if (command.onSubmitted !== undefined && typeof command.onSubmitted !== 'function')
          throw new TypeError('Encoder submission observer must be a function');
        if (command.onProofError !== undefined && typeof command.onProofError !== 'function')
          throw new TypeError('Encoder proof error observer must be a function');
        if (command.onAbandon !== undefined && typeof command.onAbandon !== 'function')
          throw new TypeError('Encoder abandon observer must be a function');
        commands.push({ kind: 'encoder', label: String(command.label || ''), reads, writes,
          encode: command.encode, onSubmitted: command.onSubmitted,
          onProofError: command.onProofError, onAbandon: command.onAbandon });
        return frame;
      };
      frame.discard = function () {
        requireActive();
        activeFrame = null;
        abandon();
      };
      frame.submit = function (measureGpuTime = false) {
        requireActive();
        activeFrame = null;
        if (!commands.length) return 0;
        const observers = commands.filter(command => command.onSubmitted);
        let encoder;
        const views = new Map();
        const painted = new Set();
        const view = id => {
          if (!views.has(id)) {
            const target = targets.get(id);
            views.set(id, (target.texture || target.context.getCurrentTexture()).createView());
          }
          return views.get(id);
        };
        let scopeCount = 0;
        function drainScopes() {
          for (let index = 0; index < scopeCount; index++) {
            try { void device.popErrorScope().catch(() => {}); } catch (_) {}
          }
          scopeCount = 0;
        }
        function proofError(error) {
          const failure = createFailure(error);
          const notice = Object.freeze({ frameId, encoder, error: failure });
          let reported = false;
          for (const observer of observers) {
            try {
              if (observer.onProofError) {
                observer.onProofError(notice);
                reported = true;
              }
            } catch (callbackError) {
              root.console?.error?.('WebGPU proof error observer failed', callbackError);
            }
          }
          if (!reported) root.console?.error?.('WebGPU frame submitted without a usable receipt', failure);
        }
        try {
          encoder = device.createCommandEncoder({ label });
          if (observers.length) {
            for (const kind of ['out-of-memory', 'internal', 'validation']) {
              device.pushErrorScope(kind);
              scopeCount += 1;
            }
          }
          const hasGpuWork = commands.length > 0;
          const timingSlot = hasGpuWork && measureGpuTime && gpuTimingStatus === 'supported'
            ? timingSlots.find(slot => !slot.busy) : null;
          const timedFrameId = frameId;
          if (timingSlot) {
            const start = encoder.beginComputePass({ label: 'DVA verify GPU timing start',
              timestampWrites: { querySet: timingQueries, beginningOfPassWriteIndex: timingSlot.index * 2 } });
            start.end();
          }
          for (const command of commands) {
            if (command.kind === 'encoder') {
              if (command.reads.some(id => !painted.has(id))) {
                throw new Error('Encoder cannot read a target before it is painted in this frame');
              }
              const allowed = new Set([...command.reads, ...command.writes]);
              command.encode(encoder, Object.freeze({
                device, format, frameId, encoder, view(id) {
                  if (!allowed.has(id)) throw new Error('Undeclared encoder target');
                  return view(id);
                },
                size(id) {
                  if (!allowed.has(id)) throw new Error('Undeclared encoder target');
                  const target = targets.get(id);
                  return { width: target.width, height: target.height };
                }
              }));
              for (const id of command.writes) painted.add(id);
              continue;
            }
            const target = targets.get(command.target);
            const first = !painted.has(command.target);
            if (first && !command.clear) throw new Error('First pass for each target must clear it');
            const pass = encoder.beginRenderPass({
              label: command.label,
              colorAttachments: [{
                view: view(command.target),
                loadOp: first ? 'clear' : 'load',
                clearValue: first ? command.clear : undefined,
                storeOp: 'store'
              }]
            });
            try {
              command.encode(pass, Object.freeze({
                device, target: command.target, width: target.width, height: target.height,
                format: target.configuration.format, firstPass: first
              }));
            } finally {
              pass.end();
            }
            painted.add(command.target);
          }
          if (timingSlot) {
            timingSlot.busy = true;
            const end = encoder.beginComputePass({ label: 'DVA verify GPU timing end',
              timestampWrites: { querySet: timingQueries, endOfPassWriteIndex: timingSlot.index * 2 + 1 } });
            end.end();
            encoder.resolveQuerySet(timingQueries, timingSlot.index * 2, 2, timingSlot.resolve, 0);
            encoder.copyBufferToBuffer(timingSlot.resolve, 0, timingSlot.readback, 0, 16);
          }
          device.queue.submit([encoder.finish()]);
          submitted = true;
          if (timingSlot) {
            timingSlot.readback.mapAsync(root.GPUMapMode.READ).then(() => {
              if (state !== 'ready' || timingSlots[timingSlot.index] !== timingSlot) return;
              const ticks = new BigUint64Array(timingSlot.readback.getMappedRange());
              const gpuMs = Number(ticks[1] - ticks[0]) / 1e6;
              timingSlot.readback.unmap();
              timingSlot.busy = false;
              if (Number.isFinite(gpuMs) && gpuMs >= 0) {
                try { options.onGpuTiming?.(Object.freeze({ frameId: timedFrameId, gpuMs })); } catch (_) {}
              }
            }).catch(() => {
              timingSlot.busy = false;
              if (state === 'ready') gpuTimingStatus = 'unavailable:readback';
            });
          }
          if (observers.length) {
            const checks = [];
            let validation, done;
            try {
              for (let index = 0; index < 3; index++) {
                const check = device.popErrorScope();
                scopeCount -= 1;
                checks.push(check);
              }
              validation = Promise.all(checks).then(errors => errors.find(Boolean) || null);
              done = device.queue.onSubmittedWorkDone();
              if (!done || typeof done.then !== 'function')
                throw new TypeError('WebGPU queue completion must be a Promise');
            } catch (error) {
              for (const check of checks) void Promise.resolve(check).catch(() => {});
              if (validation) void validation.catch(() => {});
              drainScopes();
              proofError(error);
              return commands.length;
            }
            const proof = Object.freeze({ frameId, encoder, validation, done });
            for (const observer of observers) {
              try {
                const result = observer.onSubmitted(proof);
                if (result && typeof result.then === 'function')
                  void result.catch(error => root.console?.error?.('WebGPU submission observer failed', error));
              } catch (error) {
                root.console?.error?.('WebGPU submission observer failed', error);
              }
            }
          }
          return commands.length;
        } catch (error) {
          drainScopes();
          abandon();
          throw createFailure(error);
        }
      };
      return frame;
    }

    return Object.freeze({
      get state() { return state; },
      get failure() { return failure; },
      get device() { requireReady(); return device; },
      get format() { return format; },
      get gpuTimingStatus() { return gpuTimingStatus; },
      registerTarget,
      registerTextureTarget,
      beginFrame,
      own(resource) {
        requireReady();
        if (!resource || typeof resource.destroy !== 'function') throw new TypeError('Owned GPU resource must be destroyable');
        resources.add(resource);
        return resource;
      },
      release(resource) { return resources.delete(resource); },
      destroy() { stop(null, false); }
    });
  }

  const api = Object.freeze({ create });
  root.DvaWebGPUFrameCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
