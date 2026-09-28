/* WebGPU-only ordered field drawing seam. Load frame-core, primitives and compositor first.
 * Primitive coordinates use each target's logical size; presentation and direct
 * shader-pass dimensions use its physical backing. This module remains dormant
 * until the game frame driver calls it. */
(function (root) {
  'use strict';
  const frameApi = root.DvaWebGPUFrameCore || (typeof require === 'function' ? require('./webgpu-frame-core.js') : null);
  const primitiveApi = root.DvaWebGPUPrimitives || (typeof require === 'function' ? require('./webgpu-primitives.js') : null);
  const compositeApi = root.DvaWebGPUCompositing || (typeof require === 'function' ? require('./webgpu-compositing.js') : null);
  const gravityApi = root.DvaWebGPUGravityZones || (typeof require === 'function' ? require('./webgpu-gravity-zones.js') : null);
  const hazardApi = root.DvaWebGPUHazardFields || (typeof require === 'function' ? require('./webgpu-hazard-fields.js') : null);

  async function create(options = {}) {
    if (!frameApi || !primitiveApi || !compositeApi) throw new Error('WebGPU frame core, primitives and compositor must be loaded first');
    let primitives, compositing;
    let abandonFrame = null;
    const surfaces = new Map();
    const worldMaterials = new Set();
    function clearWorldMaterials() {
      for (const pass of worldMaterials) {
        try { pass.destroy(); } catch (_) {}
      }
      worldMaterials.clear();
    }
    function clearSurfaces() {
      for (const surface of surfaces.values()) {
        try { surface.destroy(); } catch (_) {}
      }
      surfaces.clear();
    }
    const core = await frameApi.create({
      gpu: options.gpu,
      powerPreference: options.powerPreference,
      deviceDescriptor: options.deviceDescriptor,
      gpuTiming: options.gpuTiming,
      onGpuTiming: options.onGpuTiming,
      format: options.format,
      onFailure(error) {
        abandonFrame?.();
        clearWorldMaterials();
        clearSurfaces();
        compositing?.destroy();
        primitives?.destroy();
        options.onFailure?.(error);
      }
    });
    try {
      primitives = primitiveApi.create({ device: core.device, format: core.format, maxDraws: options.maxDraws });
      compositing = compositeApi.create({ device: core.device, format: core.format });
    } catch (error) {
      core.destroy();
      throw error;
    }
    const targets = new Map();
    let frameOpen = false;

    function ready() {
      if (core.state !== 'ready') throw core.failure || new Error('WebGPU renderer destroyed');
    }

    function logicalSize(width, height) {
      if (![width, height].every(Number.isInteger) || width < 1 || height < 1) {
        throw new RangeError('Invalid logical WebGPU target size');
      }
    }

    function registerTarget(id, canvas, settings = {}) {
      ready();
      if (settings.format && settings.format !== core.format) throw new Error('Target format must match shared renderer format');
      let hasLogicalSize = settings.logicalWidth !== undefined || settings.logicalHeight !== undefined;
      if (hasLogicalSize) logicalSize(settings.logicalWidth, settings.logicalHeight);
      const target = core.registerTarget(id, canvas, settings);
      let logicalWidth = hasLogicalSize ? settings.logicalWidth : target.width;
      let logicalHeight = hasLogicalSize ? settings.logicalHeight : target.height;
      const handle = Object.freeze({
        get width() { return target.width; },
        get height() { return target.height; },
        get logicalWidth() { return logicalWidth; },
        get logicalHeight() { return logicalHeight; },
        resize(width, height, logical = null) {
          if (logical !== null) logicalSize(logical.width, logical.height);
          const previousLogicalWidth = logicalWidth, previousLogicalHeight = logicalHeight;
          const changed = target.resize(width, height);
          if (logical !== null) {
            hasLogicalSize = true;
            logicalWidth = logical.width;
            logicalHeight = logical.height;
          } else if (!hasLogicalSize) {
            logicalWidth = width;
            logicalHeight = height;
          }
          if (changed) clearSurfaces();
          return changed || logicalWidth !== previousLogicalWidth || logicalHeight !== previousLogicalHeight;
        },
        unregister() {
          const removed = target.unregister();
          if (removed) targets.delete(id);
          return removed;
        }
      });
      targets.set(id, handle);
      return handle;
    }

    function registerTextureTarget(id, texture, settings = {}) {
      ready();
      if (settings.format && settings.format !== core.format) throw new Error('Target format must match shared renderer format');
      const hasLogicalSize = settings.logicalWidth !== undefined || settings.logicalHeight !== undefined;
      if (hasLogicalSize) logicalSize(settings.logicalWidth, settings.logicalHeight);
      const target = core.registerTextureTarget(id, texture, settings);
      const handle = Object.freeze({
        get width() { return target.width; },
        get height() { return target.height; },
        get logicalWidth() { return hasLogicalSize ? settings.logicalWidth : target.width; },
        get logicalHeight() { return hasLogicalSize ? settings.logicalHeight : target.height; },
        get texture() { return texture; },
        unregister() {
          const removed = target.unregister();
          if (removed) targets.delete(id);
          return removed;
        }
      });
      targets.set(id, handle);
      return handle;
    }

    function surfaceFor(width, height) {
      const key = `${width}x${height}`;
      if (!surfaces.has(key)) surfaces.set(key, compositing.createSurface({ width, height }));
      return surfaces.get(key);
    }

    function beginFrame(label = 'DVA WebGPU frame', diagnostics = false) {
      ready();
      if (frameOpen) throw new Error('A WebGPU renderer frame is already open');
      const coreFrame = core.beginFrame(label);
      frameOpen = true;
      const cleared = new Set();
      const batches = [];
      const primitiveStats = diagnostics ? { commands: 0 } : null;
      let segment = null;
      let stage = 'field';
      let closed = false;
      function active() {
        ready();
        if (closed) throw new Error('WebGPU renderer frame is closed');
      }
      function flush() {
        if (!segment) return;
        const current = segment;
        segment = null;
        coreFrame.add({ target: current.target, label: current.label,
          encode(pass) { current.batch.encode(pass); } });
      }
      function recordPrimitive(target, kind, item) {
        active();
        const handle = targets.get(target);
        if (!handle) throw new Error('Unknown WebGPU presentation target');
        if (!cleared.has(target)) throw new Error('Target must be cleared before drawing');
        if (!segment || segment.target !== target || segment.label !== stage) {
          flush();
          const batch = primitives.createBatch({ width: handle.logicalWidth, height: handle.logicalHeight });
          batches.push(batch);
          segment = { target, label: stage, batch };
        }
        segment.batch[kind](item);
        return frame;
      }
      const record = diagnostics
        ? (target, kind, item) => {
          recordPrimitive(target, kind, item);
          primitiveStats.commands += 1;
          return frame;
        }
        : recordPrimitive;
      function cleanup() {
        if (closed) return;
        for (const batch of batches) batch.destroy();
        frameOpen = false;
        closed = true;
        abandonFrame = null;
      }
      abandonFrame = cleanup;
      const frame = Object.freeze({
        // Ordered shader passes (authored map, TE shapes and acquisition E)
        // share the same frame stream as sprite batches. Flush first so no
        // primitive is silently drawn above a later custom pass.
        add(command) {
          active();
          if (!command || !targets.has(command.target) || typeof command.encode !== 'function') {
            throw new TypeError('WebGPU pass needs a registered target and encoder');
          }
          const first = !cleared.has(command.target);
          if (first && !command.clear) throw new Error('First WebGPU target pass must clear');
          if (!first && command.clear) throw new Error('WebGPU target already cleared');
          flush();
          coreFrame.add(command);
          cleared.add(command.target);
          return frame;
        },
        // Encoder-level passes retain their exact place among primitive batches.
        // The core owns the encoder, its single submit, and submission proof.
        addEncoder(command) {
          active();
          if (!command || !Array.isArray(command.writes) ||
              command.writes.some(id => !targets.has(id) || !cleared.has(id))) {
            throw new Error('Encoder writes need cleared registered targets');
          }
          flush();
          coreFrame.addEncoder(command);
          return frame;
        },
        clear(target, color) {
          active();
          if (!targets.has(target)) throw new Error('Unknown WebGPU presentation target');
          if (cleared.has(target)) throw new Error('Target already cleared in this frame');
          if (!Array.isArray(color) || color.length !== 4 || color.some(value => !Number.isFinite(value) || value < 0 || value > 1)) {
            throw new RangeError('Clear color must be four finite 0..1 components');
          }
          flush();
          cleared.add(target);
          coreFrame.add({ target, label: `${stage}:clear`,
            clear: { r: color[0], g: color[1], b: color[2], a: color[3] }, encode() {} });
          return frame;
        },
        stage(name) {
          active();
          if (typeof name !== 'string' || !name) throw new TypeError('Stage name required');
          flush();
          stage = name;
          return frame;
        },
        rect(target, item) { return record(target, 'rect', item); },
        sprite(target, item) { return record(target, 'sprite', item); },
        diagnostics() {
          return primitiveStats ? Object.freeze({ primitiveBatchCount: batches.length,
            primitiveCommandCount: primitiveStats.commands }) : null;
        },
        // Ends the current primitive pass. The compositor reads a sampleable
        // scene target and replaces another target; later primitive passes load it.
        composite({ backdrop, target, operations = [] } = {}) {
          active();
          const source = targets.get(backdrop), destination = targets.get(target);
          if (!source?.texture || !destination || backdrop === target) {
            throw new Error('Composite needs distinct sampleable backdrop and registered output');
          }
          if (source.width !== destination.width || source.height !== destination.height) {
            throw new Error('Composite backdrop and output sizes must match');
          }
          if (!cleared.has(backdrop)) throw new Error('Composite backdrop must be painted in this frame');
          if (!Array.isArray(operations) || operations.some(operation =>
            !operation || !['screen', 'multiply', 'destination-in'].includes(operation.mode) ||
            !operation.texture || operation.texture === destination.texture)) {
            throw new TypeError('Invalid composite operation or feedback source');
          }
          flush();
          const surface = surfaceFor(source.width, source.height);
          coreFrame.addEncoder({ label: `${stage}:composite`, reads: [backdrop], writes: [target],
            encode(encoder, info) {
              const compositeFrame = surface.begin(info.view(backdrop));
              try {
                for (const operation of operations) compositeFrame.add(operation.mode, operation.texture);
                compositeFrame.encode(encoder, info.view(target));
              } catch (error) {
                compositeFrame.discard();
                throw error;
              }
            }
          });
          cleared.add(target);
          return frame;
        },
        submit(gpuTiming = false) {
          active();
          try {
            flush();
            return coreFrame.submit(gpuTiming);
          } catch (error) {
            try { coreFrame.discard(); } catch (_) {}
            throw error;
          } finally {
            cleanup();
          }
        },
        discard() {
          active();
          try { coreFrame.discard(); } finally { cleanup(); }
        }
      });
      return frame;
    }

    // The caller records alchemy first, then this pair, then ground items.
    // Both passes receive the same loaded scene, device and logical viewport.
    function createGravityHazardPasses({ textAtlas } = {}) {
      ready();
      if (!gravityApi?.create || !hazardApi?.create) {
        throw new Error('Gravity and hazard WebGPU passes must be loaded first');
      }
      const gravity = gravityApi.create({ device: core.device, textAtlas });
      let hazards;
      try { hazards = hazardApi.create({ device: core.device }); }
      catch (error) { gravity.destroy(); throw error; }
      let destroyed = false;
      const pair = Object.freeze({
        async prepare({ scene, camera, zoom, viewport } = {}) {
          if (destroyed) throw new Error('Gravity and hazard passes destroyed');
          ready();
          const gravityPlan = await gravity.prepare({ scene, camera, zoom, viewport });
          if (destroyed || core.state !== 'ready') throw new Error('Gravity and hazard passes unavailable');
          // Plan hazards while the caller can still abandon this frame safely.
          hazardApi.plan({ scene, camera, zoom, viewport });
          return Object.freeze({ scene, camera, zoom, viewport, gravityPlan });
        },
        record({ frame, target, prepared } = {}) {
          if (destroyed) throw new Error('Gravity and hazard passes destroyed');
          ready();
          if (!prepared?.gravityPlan || !prepared.viewport) {
            throw new TypeError('Prepare gravity and hazard passes before recording');
          }
          const { scene, camera, zoom, viewport, gravityPlan } = prepared;
          // No other owner may reorder these two stages after alchemy.
          const gravityDrawn = gravity.record({ frame, target, viewport, preparedPlan: gravityPlan });
          const hazardDrawn = hazards.record({ frame, target, viewport, scene, camera, zoom });
          return Object.freeze({ gravityDrawn, hazardDrawn });
        },
        destroy() {
          if (destroyed) return;
          destroyed = true;
          worldMaterials.delete(pair);
          gravity.destroy();
          hazards.destroy();
        }
      });
      worldMaterials.add(pair);
      return pair;
    }

    return Object.freeze({
      get state() { return core.state; },
      get failure() { return core.failure; },
      get device() { return core.device; },
      get format() { return core.format; },
      get gpuTimingStatus() { return core.gpuTimingStatus; },
      registerTarget,
      registerTextureTarget,
      beginFrame,
      createGravityHazardPasses,
      own: resource => core.own(resource),
      release: resource => core.release(resource),
      destroy() {
        if (frameOpen && core.state === 'ready') throw new Error('Discard the active frame before destroying the renderer');
        abandonFrame?.();
        clearWorldMaterials();
        clearSurfaces();
        compositing.destroy();
        primitives.destroy();
        core.destroy();
        targets.clear();
      }
    });
  }

  const api = Object.freeze({ create });
  root.DvaWebGPURenderer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
