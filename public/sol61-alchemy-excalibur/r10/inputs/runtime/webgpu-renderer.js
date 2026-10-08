/* WebGPU-only ordered field drawing seam. Load frame-core, primitives and compositor first.
 * Primitive coordinates use each target's logical size; presentation and direct
 * shader-pass dimensions use its physical backing. This module remains dormant
 * until the game frame driver calls it. */
(function (root) {
  'use strict';
  const r9CurrentnessObserver = root && root.__DVA_EXCALIBUR_TERMINAL_NATIVE_OBSERVER__;
  const r9RendererLeasePaths = ['renderer.target-registry','renderer.nested-lease','renderer.logical-width','renderer.logical-height'];
  const r9TextureLeasePaths = ['renderer.texture-target-registry','renderer.texture-nested-lease','renderer.texture-logical-width','renderer.texture-logical-height'];
  let r9ActiveLeaseTerms = null;
  function r9BeginLeaseTerms() { const previous = r9ActiveLeaseTerms; r9ActiveLeaseTerms = []; return previous; }
  function r9FinishLeaseTerms(previous, expectedPaths = []) {
    const terms = r9ActiveLeaseTerms || []; r9ActiveLeaseTerms = previous;
    let firstFailure=null;
    for (const term of terms) {
      const outcome = term.threw ? 'threw' : term.value ? 'true' : 'false';
      if(firstFailure===null&&outcome!=='true')firstFailure=term.site;
      try { r9CurrentnessObserver?.({kind:'r9-currentness-trace',site:term.site,outcome,sampleLeft:term.left,sampleRight:term.right}); } catch (_) {}
    }
    const notEvaluated=expectedPaths.filter(site=>!terms.some(term=>term.site===site));
    try { r9CurrentnessObserver?.({kind:'r9-currentness-trace',site:'lease.renderer-summary',outcome:firstFailure?'first-failure':'complete',
      path:firstFailure||'none',visitedCount:terms.length,skippedCount:notEvaluated.length,notEvaluatedPaths:notEvaluated.join(',')||'none'}); } catch (_) {}
  }
  function r9LeaseTerm(site, read) {
    try {
      const value = read();
      if (r9ActiveLeaseTerms) r9ActiveLeaseTerms.push({site,value});
      else try { r9CurrentnessObserver?.({kind:'r9-currentness-trace',site,outcome:'evaluated'}); } catch (_) {}
      return value;
    } catch (error) { if (r9ActiveLeaseTerms) r9ActiveLeaseTerms.push({site,threw:true}); throw error; }
  }
  function r9LeaseCompare(site, readLeft, readRight) {
    try {
      const left = readLeft(), right = readRight(), value = left === right;
      if (r9ActiveLeaseTerms) r9ActiveLeaseTerms.push({site,value,left,right});
      else try { r9CurrentnessObserver?.({kind:'r9-currentness-trace',site,outcome:value?'true':'false',sampleLeft:left,sampleRight:right}); } catch (_) {}
      return value;
    } catch (error) { if (r9ActiveLeaseTerms) r9ActiveLeaseTerms.push({site,threw:true}); throw error; }
  }
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
      if (settings.encoderOnly === true) throw new Error('encoderOnly is supported only for owned texture targets');
      if (settings.encoderOnly !== undefined && typeof settings.encoderOnly !== 'boolean') throw new TypeError('encoderOnly must be a boolean');
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
        get generation() { return target.generation; },
        get deviceGeneration() { return core.deviceGeneration; },
        captureLease() {
          const lease = target.captureLease(logicalWidth, logicalHeight);
          return Object.freeze({ ...lease, isCurrent() {
            const previous = r9BeginLeaseTerms(); let current;
            try { current = r9LeaseTerm('renderer.target-registry', () => targets.get(id) === handle) &&
              r9LeaseTerm('renderer.nested-lease', () => lease.isCurrent()) &&
              r9LeaseCompare('renderer.logical-width', () => (logicalWidth), () => (lease.logicalWidth)) &&
              r9LeaseCompare('renderer.logical-height', () => (logicalHeight), () => (lease.logicalHeight)); }
            finally { r9FinishLeaseTerms(previous, r9RendererLeasePaths); }
            return current;
          } });
        },
        get sampleable() { return settings.sampleable === true; },
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
      if (settings.encoderOnly !== undefined && typeof settings.encoderOnly !== 'boolean') throw new TypeError('encoderOnly must be a boolean');
      const encoderOnly = settings.encoderOnly === true;
      if (encoderOnly) {
        if (settings.format !== 'rgba16float' || settings.format === core.format) throw new Error('encoderOnly targets require a foreign rgba16float format descriptor');
        if (!Number.isFinite(settings.width) || !Number.isFinite(settings.height) || !Number.isInteger(settings.width) || !Number.isInteger(settings.height) || settings.width < 1 || settings.height < 1) throw new RangeError('encoderOnly targets require finite positive integer dimensions');
      } else if (settings.format && settings.format !== core.format) throw new Error('Target format must match shared renderer format');
      const hasLogicalSize = settings.logicalWidth !== undefined || settings.logicalHeight !== undefined;
      if (hasLogicalSize) logicalSize(settings.logicalWidth, settings.logicalHeight);
      const target = core.registerTextureTarget(id, texture, settings);
      const handle = Object.freeze({
        get width() { return target.width; },
        get height() { return target.height; },
        get format() { return target.format; },
        get generation() { return target.generation; },
        get deviceGeneration() { return core.deviceGeneration; },
        get logicalWidth() { return hasLogicalSize ? settings.logicalWidth : target.width; },
        get logicalHeight() { return hasLogicalSize ? settings.logicalHeight : target.height; },
        get texture() { return texture; },
        get encoderOnly() { return encoderOnly; },
        captureLease() {
          const logicalWidth = hasLogicalSize ? settings.logicalWidth : target.width;
          const logicalHeight = hasLogicalSize ? settings.logicalHeight : target.height;
          const lease = target.captureLease(logicalWidth, logicalHeight);
          return Object.freeze({ ...lease, isCurrent() {
            const previous = r9BeginLeaseTerms(); let current;
            try { current = r9LeaseTerm('renderer.texture-target-registry', () => targets.get(id) === handle) &&
              r9LeaseTerm('renderer.texture-nested-lease', () => lease.isCurrent()) &&
              r9LeaseCompare('renderer.texture-logical-width', () => (hasLogicalSize ? settings.logicalWidth : target.width), () => (lease.logicalWidth)) &&
              r9LeaseCompare('renderer.texture-logical-height', () => (hasLogicalSize ? settings.logicalHeight : target.height), () => (lease.logicalHeight)); }
            finally { r9FinishLeaseTerms(previous, r9TextureLeasePaths); }
            return current;
          } });
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

    function registerSampledMaterial(id, texture, settings = {}) {
      ready();
      return core.registerMaterial(id, texture, { ...settings, device: core.device });
    }

    function surfaceFor(width, height) {
      const key = `${width}x${height}`;
      if (!surfaces.has(key)) surfaces.set(key, compositing.createSurface({ width, height }));
      return surfaces.get(key);
    }

    function beginFrame(label = 'DVA WebGPU frame', diagnostics = false) {
      ready();
      if (core.frameOpen) throw new Error('A WebGPU renderer frame is already open');
      const coreFrame = core.beginFrame(label);
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
        if (handle.encoderOnly) throw new Error('Encoder-only targets reject primitive drawing');
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
          if (targets.get(command.target).encoderOnly) throw new Error('Encoder-only targets reject ordinary passes');
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
          if (!command || !Array.isArray(command.writes)) throw new Error('Encoder writes need declared targets');
          const initializes = command.initializes === undefined ? [] : command.initializes;
          if (!Array.isArray(initializes) || new Set(initializes).size !== initializes.length ||
              command.writes.some(id => !targets.has(id)) ||
              command.writes.some(id => !cleared.has(id) && !initializes.includes(id)) ||
              initializes.some(id => !command.writes.includes(id) || cleared.has(id) ||
                !targets.get(id)?.encoderOnly || targets.get(id)?.format !== 'rgba16float' ||
                targets.get(id)?.generation !== command.targetGeneration))
            throw new Error('Encoder writes need cleared targets or matching same-pass encoder-only HDR initialization');
          flush();
          coreFrame.addEncoder(command);
          for (const id of command.writes) cleared.add(id);
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
          if (source.encoderOnly || destination.encoderOnly) throw new Error('Encoder-only targets reject compositor use');
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
      get deviceGeneration() { return core.deviceGeneration; },
      get format() { return core.format; },
      get gpuTimingStatus() { return core.gpuTimingStatus; },
      get frameOpen() { return core.frameOpen; },
      registerTarget,
      registerTextureTarget,
      registerSampledMaterial,
      encodeLinearHDRLayer(encoder, options) {
        ready();
        return compositing.encodeLinearHDRLayer(encoder, options);
      },
      beginFrame,
      createGravityHazardPasses,
      own: resource => core.own(resource),
      release: resource => core.release(resource),
      destroy() {
        if (core.frameOpen && core.state === 'ready') throw new Error('Discard the active frame before destroying the renderer');
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
