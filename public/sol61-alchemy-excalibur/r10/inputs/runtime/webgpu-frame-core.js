/* Shared WebGPU frame owner. No Canvas 2D context or fallback is created here.
 * Callers supply ordered render-pass commands; material pipelines live in other modules. */
(function (root) {
  'use strict';

  const r9CurrentnessObserver = root && root.__DVA_EXCALIBUR_TERMINAL_NATIVE_OBSERVER__;
  const r9CoreLeasePaths = ['lease.core-ready','lease.core-target-registry','lease.core-target-device','lease.core-device-pointer',
    'lease.core-device-epoch','lease.core-target-device-generation','lease.core-target-generation','lease.core-target-width',
    'lease.core-target-height','lease.core-canvas-width','lease.core-canvas-height'];
  const r9EncoderLeasePaths = ['lease.encoder-ready','lease.encoder-target-registry','lease.encoder-target-device',
    'lease.encoder-device-pointer','lease.encoder-device-epoch','lease.encoder-device-generation','lease.encoder-texture',
    'lease.encoder-generation','lease.encoder-width','lease.encoder-height'];
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
    try { r9CurrentnessObserver?.({kind:'r9-currentness-trace',site:'lease.core-summary',outcome:firstFailure?'first-failure':'complete',
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

  // A device epoch exists only for a real successfully-created GPUDevice pointer.
  // The WeakMap survives renderer recreation within this owning module instance.
  const deviceEpochs = new WeakMap();
  let lastDeviceCreationEpoch = 0;
  function registerCreatedDevice(device) {
    if (!device || (typeof device !== 'object' && typeof device !== 'function'))
      throw new TypeError('requestDevice returned an invalid device identity');
    let epoch = deviceEpochs.get(device);
    if (epoch === undefined) {
      if (lastDeviceCreationEpoch >= Number.MAX_SAFE_INTEGER)
        throw new RangeError('WebGPU device creation epoch exhausted');
      epoch = ++lastDeviceCreationEpoch;
      deviceEpochs.set(device, epoch);
    }
    return epoch;
  }

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
    // This is the only minting point: requestDevice has successfully resolved.
    const deviceGeneration = registerCreatedDevice(device);
    const format = options.format || gpu.getPreferredCanvasFormat();
    const coreDevice = device;
    const targets = new Map();
    const materials = new Map();
    const lastSubmitted = new WeakMap();
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
      materials.clear();
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
      if (typeof id !== 'string' || !id || targets.has(id) || materials.has(id)) throw new Error('Invalid or duplicate WebGPU target');
      if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('WebGPU target requires a canvas');
      const context = canvas.getContext('webgpu');
      if (!context) throw new Error('WebGPU presentation context unavailable');
      const width = settings.width ?? canvas.width;
      const height = settings.height ?? canvas.height;
      dimensions(width, height);
      const configuration = { device, format: settings.format || format, alphaMode: settings.alphaMode || 'opaque' };
      if (settings.sampleable !== undefined && typeof settings.sampleable !== 'boolean') throw new TypeError('sampleable must be a boolean');
      const sampleable = settings.sampleable === true;
      if (sampleable) {
        const usage = root.GPUTextureUsage;
        if (!usage || !Number.isInteger(usage.RENDER_ATTACHMENT) || !Number.isInteger(usage.TEXTURE_BINDING)) throw new Error('Sampleable presentation texture usage is unavailable');
        configuration.usage = usage.RENDER_ATTACHMENT | usage.TEXTURE_BINDING;
      }
      canvas.width = width;
      canvas.height = height;
      context.configure(configuration);
      const generation = settings.generation ?? 1;
      if (!Number.isSafeInteger(generation) || generation < 1) throw new RangeError('Target generation must be a positive safe integer');
      const target = { id, targetId: id, identity: Object.freeze({}), canvas, context, configuration, width, height, sampleable,
        encoderOnly: false, generation, device, deviceGeneration };
      targets.set(id, target);
      return Object.freeze({
        get width() { return target.width; },
        get height() { return target.height; },
        get format() { return target.configuration.format; },
        get generation() { return target.generation; },
        get encoderOnly() { return target.encoderOnly; },
        captureLease(logicalWidth = target.width, logicalHeight = target.height) {
          if (!Number.isFinite(logicalWidth) || logicalWidth <= 0 ||
              !Number.isFinite(logicalHeight) || logicalHeight <= 0)
            throw new RangeError('Target lease logical dimensions must be positive');
          const captured = Object.freeze({ id, targetId: id, targetIdentity: target.identity,
            device: target.device, deviceGeneration: target.deviceGeneration,
            generation: target.generation, width: target.width, height: target.height,
            logicalWidth, logicalHeight });
          return Object.freeze({ ...captured, isCurrent() {
            const previous = r9BeginLeaseTerms(); let current;
            try { current = r9LeaseTerm('lease.core-ready', () => (state === 'ready')) &&
              r9LeaseTerm('lease.core-target-registry', () => (targets.get(id) === target)) &&
              r9LeaseCompare('lease.core-target-device', () => (target.device), () => (device)) &&
              r9LeaseCompare('lease.core-device-pointer', () => (device), () => (coreDevice)) &&
              r9LeaseCompare('lease.core-device-epoch', () => (deviceEpochs.get(device)), () => (captured.deviceGeneration)) &&
              r9LeaseCompare('lease.core-target-device-generation', () => (target.deviceGeneration), () => (captured.deviceGeneration)) &&
              r9LeaseCompare('lease.core-target-generation', () => (target.generation), () => (captured.generation)) &&
              r9LeaseCompare('lease.core-target-width', () => (target.width), () => (captured.width)) &&
              r9LeaseCompare('lease.core-target-height', () => (target.height), () => (captured.height)) &&
              r9LeaseCompare('lease.core-canvas-width', () => (target.canvas.width), () => (captured.width)) &&
              r9LeaseCompare('lease.core-canvas-height', () => (target.canvas.height), () => (captured.height)); }
            finally { r9FinishLeaseTerms(previous, r9CoreLeasePaths); }
            return current;
          } });
        },
        resize(nextWidth, nextHeight) {
          requireReady();
          if (activeFrame) throw new Error('Cannot resize a target during a frame');
          dimensions(nextWidth, nextHeight);
          if (nextWidth === target.width && nextHeight === target.height) return false;
          target.canvas.width = nextWidth;
          target.canvas.height = nextHeight;
          target.width = nextWidth;
          target.height = nextHeight;
          target.generation += 1;
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
      if (typeof id !== 'string' || !id || targets.has(id) || materials.has(id)) throw new Error('Invalid or duplicate WebGPU target');
      if (!texture || typeof texture.createView !== 'function') throw new TypeError('Sampleable target requires a GPU texture');
      const { width, height } = settings;
      dimensions(width, height);
      const targetFormat = settings.format || format;
      const encoderOnly = settings.encoderOnly === true;
      if (encoderOnly && (targetFormat !== 'rgba16float' || targetFormat === format))
        throw new Error('Encoder-only target must be a foreign rgba16float target');
      if (settings.device !== undefined && settings.device !== device)
        throw new Error('Texture target belongs to another device');
      const generation = settings.generation ?? 1;
      if (!Number.isSafeInteger(generation) || generation < 1) throw new RangeError('Target generation must be a positive safe integer');
      const target = { id, targetId: id, identity: Object.freeze({}), texture, width, height, sampleable: true, encoderOnly,
        generation, device, deviceGeneration, configuration: { format: targetFormat } };
      targets.set(id, target);
      return Object.freeze({
        get width() { return width; },
        get height() { return height; },
        get format() { return target.configuration.format; },
        get generation() { return target.generation; },
        get encoderOnly() { return target.encoderOnly; },
        get texture() { return texture; },
        captureLease(logicalWidth = width, logicalHeight = height) {
          if (!Number.isFinite(logicalWidth) || logicalWidth <= 0 ||
              !Number.isFinite(logicalHeight) || logicalHeight <= 0)
            throw new RangeError('Target lease logical dimensions must be positive');
          const captured = Object.freeze({ id, targetId: id, targetIdentity: target.identity,
            texture, device: target.device, deviceGeneration: target.deviceGeneration,
            generation: target.generation, width, height, logicalWidth, logicalHeight });
          return Object.freeze({ ...captured, isCurrent() {
            const previous = r9BeginLeaseTerms(); let current;
            try { current = r9LeaseTerm('lease.encoder-ready', () => state === 'ready') &&
              r9LeaseTerm('lease.encoder-target-registry', () => targets.get(id) === target) &&
              r9LeaseCompare('lease.encoder-target-device', () => (target.device), () => (device)) &&
              r9LeaseCompare('lease.encoder-device-pointer', () => (device), () => (coreDevice)) &&
              r9LeaseCompare('lease.encoder-device-epoch', () => (deviceEpochs.get(device)), () => (captured.deviceGeneration)) &&
              r9LeaseCompare('lease.encoder-device-generation', () => (target.deviceGeneration), () => (captured.deviceGeneration)) &&
              r9LeaseCompare('lease.encoder-texture', () => (target.texture), () => (texture)) &&
              r9LeaseCompare('lease.encoder-generation', () => (target.generation), () => (captured.generation)) &&
              r9LeaseCompare('lease.encoder-width', () => (target.width), () => (width)) &&
              r9LeaseCompare('lease.encoder-height', () => (target.height), () => (height)); }
            finally { r9FinishLeaseTerms(previous, r9EncoderLeasePaths); }
            return current;
          } });
        },
        unregister() {
          if (activeFrame) throw new Error('Cannot unregister a target during a frame');
          if (targets.get(id) !== target) return false;
          targets.delete(id);
          return true;
        }
      });
    }

    function registerMaterial(id, texture, settings = {}) {
      requireReady();
      if (activeFrame) throw new Error('Cannot register a material during a frame');
      if (typeof id !== 'string' || !id || targets.has(id) || materials.has(id))
        throw new Error('Invalid or duplicate sampled material');
      if (!texture || typeof texture.createView !== 'function' || settings.device !== device ||
          !settings.image || typeof settings.assetPath !== 'string' || !settings.assetPath ||
          !/^[a-f0-9]{64}$/i.test(settings.sourceSha256 || '') ||
          !Number.isSafeInteger(settings.cacheEpoch) || settings.cacheEpoch < 1 ||
          typeof settings.isCurrent !== 'function' ||
          !Number.isSafeInteger(settings.width) || settings.width < 1 ||
          !Number.isSafeInteger(settings.height) || settings.height < 1 ||
          settings.image.naturalWidth !== settings.width || settings.image.naturalHeight !== settings.height)
        throw new TypeError('Sampled material needs current device, pinned image, dimensions, cache epoch and source hash');
      const material = Object.freeze({ id, texture, view: texture.createView(), image: settings.image,
        assetPath: settings.assetPath, sourceSha256: settings.sourceSha256.toLowerCase(),
        width: settings.width, height: settings.height, cacheEpoch: settings.cacheEpoch,
        device, isCurrent: settings.isCurrent });
      materials.set(id, material);
      return Object.freeze({ id, texture, image: material.image, assetPath: material.assetPath,
        sourceSha256: material.sourceSha256, width: material.width, height: material.height,
        cacheEpoch: material.cacheEpoch, device,
        unregister() {
          if (activeFrame) throw new Error('Cannot unregister a material during a frame');
          if (materials.get(id) !== material) return false;
          materials.delete(id);
          return true;
        } });
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
        const materialIds = command.materials === undefined ? [] : command.materials.slice();
        const initializes = command.initializes === undefined ? [] : command.initializes.slice();
        if (!Array.isArray(materialIds) || !Array.isArray(initializes))
          throw new TypeError('Encoder materials and initializations must be arrays');
        if (!writes.length || new Set([...reads, ...writes]).size !== reads.length + writes.length ||
          [...reads, ...writes].some(id => !targets.has(id)) || reads.some(id => !targets.get(id).sampleable)) {
          throw new Error('Encoder command needs distinct registered targets and sampleable reads');
        }
        if (new Set(materialIds).size !== materialIds.length || materialIds.some(id => !materials.has(id)) ||
            [...reads, ...writes, ...initializes].some(id => materialIds.includes(id)))
          throw new Error('Encoder immutable materials must be separately registered and declared');
        if (new Set(initializes).size !== initializes.length ||
            initializes.some(id => !writes.includes(id) || !targets.get(id)?.encoderOnly ||
              targets.get(id)?.configuration.format !== 'rgba16float'))
          throw new Error('Only declared foreign rgba16float encoder-only writes may initialize');
        if (initializes.length && (!Number.isSafeInteger(command.targetGeneration) ||
            initializes.some(id => targets.get(id).generation !== command.targetGeneration)))
          throw new Error('Initialized writes must match the registered target generation');
        if (command.completedFrameTarget !== undefined &&
            (!writes.includes(command.completedFrameTarget) || typeof command.onSubmitted !== 'function'))
          throw new TypeError('Completed-frame target requires a written registered target and observer');
        if (command.onRetire !== undefined && typeof command.onRetire !== 'function')
          throw new TypeError('GPU retirement observer must be a function');
        if (command.onSubmitted !== undefined && typeof command.onSubmitted !== 'function')
          throw new TypeError('Encoder submission observer must be a function');
        if (command.onProofError !== undefined && typeof command.onProofError !== 'function')
          throw new TypeError('Encoder proof error observer must be a function');
        if (command.onAbandon !== undefined && typeof command.onAbandon !== 'function')
          throw new TypeError('Encoder abandon observer must be a function');
        commands.push({ kind: 'encoder', label: String(command.label || ''), reads, writes,
          materials: materialIds, initializes, targetGeneration: command.targetGeneration,
          encode: command.encode, onSubmitted: command.onSubmitted,
          completedFrameTarget: command.completedFrameTarget, onRetire: command.onRetire,
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
        const textures = new Map();
        const targetLeases = new Map();
        const retirees = commands.filter(command => command.onRetire);
        const painted = new Set();
        const view = id => {
          if (!views.has(id)) {
            const target = targets.get(id);
            const texture = target.texture || target.context.getCurrentTexture();
            textures.set(id, texture);
            targetLeases.set(id, { target, generation: target.generation,
              width: target.width, height: target.height });
            views.set(id, texture.createView());
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
              if (command.materials.some(id => {
                const material = materials.get(id);
                return !material || material.device !== device || !material.isCurrent();
              })) throw new Error('Encoder immutable material is stale or belongs to another device/cache');
              for (const id of command.initializes) {
                const target = targets.get(id);
                if (!target || painted.has(id) || !target.encoderOnly ||
                    target.configuration.format !== 'rgba16float' ||
                    target.generation !== command.targetGeneration)
                  throw new Error('First-write initialization target is stale, painted or not encoder-only HDR');
              }
              for (const id of command.writes) {
                if (!painted.has(id) && !command.initializes.includes(id))
                  throw new Error('Encoder cannot write an unpainted target without same-pass initialization');
              }
              const allowed = new Set([...command.reads, ...command.writes]);
              const allowedMaterials = new Set(command.materials);
              const info = Object.freeze({
                device, format, frameId, encoder, view(id) {
                  if (!allowed.has(id)) throw new Error('Undeclared encoder target');
                  return view(id);
                },
                size(id) {
                  if (!allowed.has(id)) throw new Error('Undeclared encoder target');
                  const target = targets.get(id);
                  return { width: target.width, height: target.height };
                },
                targetFormat(id) {
                  if (!allowed.has(id)) throw new Error('Undeclared encoder target');
                  return targets.get(id).configuration.format;
                },
                material(id) {
                  if (!allowedMaterials.has(id)) throw new Error('Undeclared immutable material');
                  const item = materials.get(id);
                  if (!item || item.device !== device || !item.isCurrent())
                    throw new Error('Immutable material cache epoch changed');
                  return Object.freeze({ view: item.view, image: item.image,
                    assetPath: item.assetPath, sourceSha256: item.sourceSha256,
                    width: item.width, height: item.height, cacheEpoch: item.cacheEpoch });
                }
              });
              if (command.initializes.length) {
                const initSet = new Set(command.initializes);
                let passCount = 0, passEnded = false, livePass = null;
                const restrictedEncoder = Object.freeze({
                  beginInitializedRenderPass(descriptor) {
                    if (passCount) throw new Error('One initialized render pass is permitted per command');
                    const attachments = descriptor?.colorAttachments;
                    if (!Array.isArray(attachments) || attachments.length !== initSet.size)
                      throw new Error('Initialized pass must attach every declared first write');
                    const attached = new Set();
                    const colorAttachments = attachments.map(item => {
                      const id = item?.target;
                      if (!initSet.has(id) || attached.has(id) || item?.loadOp !== 'clear' ||
                          item?.storeOp !== 'store' ||
                          ![item.clearValue?.r, item.clearValue?.g,
                            item.clearValue?.b, item.clearValue?.a].every(Number.isFinite))
                        throw new Error('Initialized attachment must be a declared clear/store write');
                      attached.add(id);
                      return { view: view(id), loadOp: 'clear',
                        clearValue: item.clearValue, storeOp: 'store' };
                    });
                    if (attached.size !== initSet.size || [...initSet].some(id => !attached.has(id)))
                      throw new Error('Initialized attachment set differs from declared writes');
                    const pass = encoder.beginRenderPass({
                      label: String(descriptor.label || command.label), colorAttachments });
                    passCount += 1;
                    let ended = false;
                    livePass = {
                      facade: Object.freeze({
                        setPipeline: (...args) => pass.setPipeline(...args),
                        setBindGroup: (...args) => pass.setBindGroup(...args),
                        draw: (...args) => pass.draw(...args),
                        drawIndexed: (...args) => pass.drawIndexed(...args),
                        end() {
                          if (ended) throw new Error('Initialized pass already ended');
                          pass.end(); ended = true; passEnded = true;
                        }
                      }), close() { if (!ended) { pass.end(); ended = true; } }
                    };
                    return livePass.facade;
                  }
                });
                try {
                  command.encode(restrictedEncoder, Object.freeze({ ...info, encoder: undefined,
                    initializedWrites: Object.freeze(command.initializes.slice()) }));
                } finally {
                  if (livePass && !passEnded) livePass.close();
                }
                if (passCount !== 1 || !passEnded)
                  throw new Error('Initialized writes lack one observed successful clear/store pass end');
              } else {
                command.encode(encoder, info);
              }
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
          // Only an actual successful queue submission replaces a target frame.
          for (const command of commands) {
            for (const id of command.kind === 'encoder' ? command.writes : [command.target])
              lastSubmitted.set(targets.get(id), frameId);
          }
          let retirementDone = null;
          if (observers.length || retirees.length) {
            try {
              retirementDone = device.queue.onSubmittedWorkDone();
              if (!retirementDone || typeof retirementDone.then !== 'function')
                throw new TypeError('WebGPU queue completion must be a Promise');
              void retirementDone.catch(() => {});
            } catch (_) { retirementDone = null; }
          }
          for (const command of retirees) {
            try {
              const result = command.onRetire(Object.freeze({ frameId, done: retirementDone }));
              if (result?.then) void result.catch(error => root.console?.error?.('GPU retirement failed', error));
            } catch (error) { root.console?.error?.('GPU retirement failed', error); }
          }
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
            let validation, errorScopes, done;
            try {
              for (let index = 0; index < 3; index++) {
                const check = device.popErrorScope();
                scopeCount -= 1;
                checks.push(check);
              }
              // Preserve the actual three LIFO pops separately. The legacy
              // aggregate remains compatible, but cannot establish strict
              // Excalibur release acceptance by itself.
              errorScopes = Promise.all(checks);
              validation = errorScopes.then(errors => errors.find(Boolean) || null);
              if (observers.some(observer => observer.completedFrameTarget !== undefined))
                void validation.catch(() => {});
              done = retirementDone;
              if (!done || typeof done.then !== 'function')
                throw new TypeError('WebGPU queue completion must be a Promise');
            } catch (error) {
              for (const check of checks) void Promise.resolve(check).catch(() => {});
              if (validation) void validation.catch(() => {});
              drainScopes();
              proofError(error);
              return commands.length;
            }
            const proof = Object.freeze({ frameId, encoder, validation, errorScopes, done });
            for (const observer of observers) {
              try {
                let observerProof = proof;
                if (observer.completedFrameTarget !== undefined) {
                  const id = observer.completedFrameTarget;
                  const captured = targetLeases.get(id);
                  if (!captured || !views.has(id)) throw new Error('Completed-frame target was not actually encoded');
                  const current = () => state === 'ready' && targets.get(id) === captured.target &&
                    captured.target.device === device && captured.target.generation === captured.generation &&
                    captured.target.width === captured.width && captured.target.height === captured.height &&
                    (!captured.target.canvas || (captured.target.canvas.width === captured.width &&
                      captured.target.canvas.height === captured.height)) &&
                    lastSubmitted.get(captured.target) === frameId;
                  const completedFrame = Object.freeze({ targetId: id, device, frameId,
                    generation: captured.generation, width: captured.width, height: captured.height,
                    texture: textures.get(id), view: views.get(id), isCurrent: current,
                    async accept(liveGuard) {
                      if (typeof liveGuard !== 'function') return false;
                      try {
                        const [scopes] = await Promise.all([errorScopes, done]);
                        return Array.isArray(scopes) && scopes.length === 3 &&
                          scopes.every(scope => scope === null) && current() && liveGuard() === true && current();
                      } catch (_) { return false; }
                    }
                  });
                  observerProof = Object.freeze({ ...proof, completedFrame });
                }
                const result = observer.onSubmitted(observerProof);
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
      get frameOpen() { return activeFrame !== null; },
      get device() { requireReady(); return device; },
      get deviceGeneration() { requireReady(); return deviceGeneration; },
      get format() { return format; },
      get gpuTimingStatus() { return gpuTimingStatus; },
      registerTarget,
      registerTextureTarget,
      registerMaterial,
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
