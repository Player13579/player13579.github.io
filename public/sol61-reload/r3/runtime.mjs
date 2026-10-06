const UNIFORM_BYTES = 128;

const FORMAT = 'rgba16float';
const TEXTURE_USAGE = (globalThis.GPUTextureUsage?.RENDER_ATTACHMENT ?? 0x10) | (globalThis.GPUTextureUsage?.TEXTURE_BINDING ?? 0x04) | (globalThis.GPUTextureUsage?.COPY_SRC ?? 0x01);
const BUFFER_USAGE = (globalThis.GPUBufferUsage?.UNIFORM ?? 0x40) | (globalThis.GPUBufferUsage?.COPY_DST ?? 0x08);
const READBACK_BUFFER_USAGE = (globalThis.GPUBufferUsage?.MAP_READ ?? 0x01) | (globalThis.GPUBufferUsage?.COPY_DST ?? 0x08);

function assert(condition, message) { if (!condition) throw new Error(message); }
const approvedPlans = new WeakSet();

/** Require authoritative gates explicitly before invoking the creative planner. */
export function planReloadInput(input, planner) {
  assert(input && typeof input === 'object', 'Reload frame input required');
  assert(typeof planner === 'function', 'Frozen Reload planner required');
  for (const key of ['sourceOn', 'obsOn', 'mainOn']) assert(Object.prototype.hasOwnProperty.call(input, key) && typeof input[key] === 'boolean', `Reload ${key} must be supplied explicitly`);
  assert(Object.prototype.hasOwnProperty.call(input, 'visibility') && Number.isFinite(input.visibility) && input.visibility >= 0 && input.visibility <= 1, 'Reload visibility must be supplied explicitly in [0,1]');
  const plan = planner(input);
  assert(plan && typeof plan === 'object' && plan.clockKind === input.clockKind && (input.sourceOn || plan.sourceOn === false) && plan.obsOn === input.obsOn && plan.mainOn === input.mainOn && plan.visibility === input.visibility, 'Reload planner changed or omitted an explicit source/OBS/visibility gate');
  approvedPlans.add(plan);
  return plan;
}

function checkedSize(value, max) {
  const width = Math.floor(Number(value.width)), height = Math.floor(Number(value.height));
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > max || height > max) throw new RangeError('Reload render target size is invalid for this device');
  return { width, height };
}

/**
 * Four-pass Reload E host. Device/canvas may be supplied by an existing owner;
 * this renderer destroys only resources it creates.
 */
export async function createReloadRenderer({ canvas, shaderSource, shaderEntries, uniformBytes, packReloadUniform, gpu = globalThis.navigator?.gpu, device: injectedDevice = null, context: injectedContext = null, isCurrent = () => true, onFailure = () => {}, onDeviceLost = () => {}, onStartupProgress = () => {}, outputLoadOp = 'clear' } = {}) {
  assert(canvas, 'Reload preview canvas required');
  assert(shaderEntries && ['vertex', 'world', 'blurX', 'blurY', 'composite'].every(key => typeof shaderEntries[key] === 'string' && shaderEntries[key]), 'Frozen Reload shader-entry map required');
  assert(Number.isSafeInteger(shaderEntries.vertices) && shaderEntries.vertices > 0, 'Frozen Reload vertex count required');
  assert(uniformBytes === UNIFORM_BYTES, 'Reload uniform ABI must be exactly 128 bytes');
  assert(typeof shaderSource === 'string' && Object.values(shaderEntries).filter(v => typeof v === 'string').every(entry => shaderSource.includes(`fn ${entry}`)), 'Frozen Reload WGSL source does not match its frozen entry map');
  assert(typeof packReloadUniform === 'function', 'Frozen Reload uniform packer required');
  assert(typeof isCurrent === 'function', 'Reload isCurrent predicate required');
  assert(outputLoadOp === 'clear' || outputLoadOp === 'load', 'Reload output loadOp must be clear or load');
  const ownsDevice = !injectedDevice;
  const ownsContext = !injectedContext;
  let context = injectedContext || null;
  let device = injectedDevice || null;
  let canvasFormat = 'bgra8unorm';
  let configuredContext = false;
  let contextUnconfigured = false;
  let deviceDestroyed = false;
  let state = 'initializing';
  let generation = 1;
  let targetGeneration = 0;
  let disposed = false;
  let disposePromise = null;
  let failure = null;
  let targets = null;
  let groups = null;
  let readbackBuffer = null;
  let readbackBytesPerRow = 0;
  let lastDiagnosticProbe = null;
  let diagnosticProbePending = false;
  let width = 0, height = 0;
  let submitCount = 0;
  let lastSubmitted = Promise.resolve();
  const pipelines = {};
  let uniformBuffer = null;
  let validationDepth = 0;
  let removeErrorListener = () => {};
  let resourcesReleased = false;
  let retirementFailure = null;
  let deviceLostError = null;
  const destroyedResources = new WeakSet();
  const emitProgress = (stage, leaf, boundary = 'phase-start') => {
    try { onStartupProgress?.(Object.freeze({ stage, leaf, boundary })); } catch { /* Observers cannot change startup behavior. */ }
  };
  const isOwnerCurrent = () => {
    try { return Boolean(isCurrent()); } catch { return false; }
  };
  const retiredError = () => {
    if (!retirementFailure) {
      retirementFailure = new Error('Reload startup owner was retired');
      retirementFailure.code = 'RELOAD_STARTUP_RETIRED';
    }
    return retirementFailure;
  };
  const ensureOwnerCurrent = () => {
    if (deviceLostError) throw deviceLostError;
    let currentOwner;
    try { currentOwner = Boolean(isCurrent()); } catch (error) { throw error; }
    if (!currentOwner || retirementFailure) {
      state = 'retired'; generation++;
      throw retiredError();
    }
  };
  const destroyOnce = resource => {
    if (!resource || (typeof resource !== 'object' && typeof resource !== 'function') || destroyedResources.has(resource)) return;
    destroyedResources.add(resource);
    try { resource.destroy?.(); } catch {}
  };
  const releaseResources = () => {
    if (resourcesReleased) return;
    resourcesReleased = true;
    if (targets) { for (const tex of Object.values(targets)) destroyOnce(tex); targets = null; }
    groups = null;
    destroyOnce(readbackBuffer); readbackBuffer = null;
    destroyOnce(uniformBuffer); uniformBuffer = null;
    removeErrorListener();
    if (ownsDevice && device && !deviceDestroyed) {
      deviceDestroyed = true;
      try { device.destroy?.(); } catch {}
    }
    if (ownsContext && configuredContext && !contextUnconfigured) {
      contextUnconfigured = true;
      try { context?.unconfigure?.(); } catch {}
    }
  };
  const retireValidationScope = () => {
    if (validationDepth < 1 || !device || typeof device.popErrorScope !== 'function') return;
    validationDepth--;
    try {
      const pending = device.popErrorScope();
      Promise.resolve(pending).then(() => {}, () => {});
    } catch { /* Preserve the first startup/retirement cause. */ }
  };
  const markDeviceLost = info => {
    if (disposed || state === 'failed' || state === 'lost' || state === 'retired') return;
    if (!isOwnerCurrent()) {
      state = 'retired'; generation++;
      retiredError();
      return;
    }
    deviceLostError = info instanceof Error ? info : new Error(info?.message || 'WebGPU device lost');
    if (!deviceLostError.code) deviceLostError.code = 'RELOAD_DEVICE_LOST';
    failure = deviceLostError;
    state = 'lost'; generation++;
    try { onDeviceLost(deviceLostError); } catch {}
  };
  const observeDeviceLoss = candidate => {
    let lost;
    try { lost = candidate?.lost; } catch (error) { markDeviceLost(error); return; }
    if (lost && typeof lost.then === 'function') Promise.resolve(lost).then(markDeviceLost, markDeviceLost);
  };
  const destroyFresh = fresh => {
    if (!fresh) return;
    for (const tex of Object.values(fresh.targets || {})) destroyOnce(tex);
    destroyOnce(fresh.readbackBuffer);
  };
  const uncaptured = event => {
    if (state === 'ready' && !disposed) fail(new Error(event.error?.message || 'Uncaptured WebGPU error'));
  };

  const fail = error => {
    if (disposed || state === 'failed' || state === 'lost' || state === 'retired') return;
    failure = error instanceof Error ? error : new Error(String(error));
    state = 'failed'; generation++;
    try { onFailure(failure); } catch {}
  };
  const current = expected => !disposed && state === 'ready' && generation === expected && isOwnerCurrent();
  const pushValidation = () => {
    assert(typeof device.pushErrorScope === 'function' && typeof device.popErrorScope === 'function', 'WebGPU validation error scopes required');
    device.pushErrorScope('validation');
    validationDepth++;
  };
  const popValidation = async () => {
    if (validationDepth < 1) throw new Error('Reload validation scope imbalance');
    const pending = device.popErrorScope();
    validationDepth--;
    const error = await pending;
    if (error) throw new Error(`Reload WebGPU validation: ${error.message || error}`);
  };
  const makeBindGroup = (pipeline, entries, label) => device.createBindGroup({ label, layout: pipeline.getBindGroupLayout(entries.group), entries: entries.items });

  try {
    ensureOwnerCurrent();
    context ||= canvas.getContext?.('webgpu');
    assert(context, 'WebGPU canvas context unavailable');
    ensureOwnerCurrent();
    if (ownsDevice) {
      emitProgress('adapter', 'requestAdapter');
      ensureOwnerCurrent();
      const adapterPromise = gpu?.requestAdapter?.();
      const adapter = await adapterPromise;
      ensureOwnerCurrent();
      assert(adapter, 'WebGPU adapter unavailable');
      emitProgress('device', 'requestDevice');
      ensureOwnerCurrent();
      const devicePromise = adapter.requestDevice();
      device = await devicePromise;
      assert(device, 'WebGPU device unavailable');
      observeDeviceLoss(device);
      ensureOwnerCurrent();
    } else {
      observeDeviceLoss(device);
      ensureOwnerCurrent();
    }
    canvasFormat = gpu?.getPreferredCanvasFormat?.() || 'bgra8unorm';
    if (ownsContext) {
      context.configure({ device, format: canvasFormat, alphaMode: 'premultiplied' });
      configuredContext = true;
    }
    ensureOwnerCurrent();
    emitProgress('pipelines', 'shader-and-pipeline-preparation');
    ensureOwnerCurrent();
    pushValidation();
    uniformBuffer = device.createBuffer({ label: 'reload-e-r2/uniform-128', size: UNIFORM_BYTES, usage: BUFFER_USAGE });
    const module = device.createShaderModule({ label: 'reload-e-r2/frozen-wgsl', code: shaderSource });
    emitProgress('pipelines', 'shader-compilation', 'leaf-start');
    const compilation = await module.getCompilationInfo?.();
    ensureOwnerCurrent();
    const shaderErrors = (compilation?.messages || []).filter(message => message.type === 'error');
    if (shaderErrors.length) throw new Error(`Reload WGSL compile error: ${shaderErrors.map(m => m.message).join('; ')}`);
    const target = (format, blend) => ({ format, ...(blend ? { blend } : {}) });
    const replaceBlend = {
      color: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
      alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }
    };
    const descriptors = {
      world: { fragment: { module, entryPoint: shaderEntries.world, targets: [target(FORMAT), target(FORMAT)] } },
      blurX: { fragment: { module, entryPoint: shaderEntries.blurX, targets: [target(FORMAT)] } },
      blurY: { fragment: { module, entryPoint: shaderEntries.blurY, targets: [target(FORMAT)] } },
      composite: { fragment: { module, entryPoint: shaderEntries.composite, targets: [target(canvasFormat, replaceBlend)] } }
    };
    for (const [name, d] of Object.entries(descriptors)) {
      ensureOwnerCurrent();
      emitProgress('pipelines', `pipeline:${name}`, 'leaf-start');
      const pipelinePromise = device.createRenderPipelineAsync({
        label: `reload-e-r2/${name}`, layout: 'auto',
        vertex: { module, entryPoint: shaderEntries.vertex },
        ...d,
        primitive: { topology: 'triangle-list' }
      });
      pipelines[name] = await pipelinePromise;
      ensureOwnerCurrent();
    }
    ensureOwnerCurrent();
    emitProgress('pipelines', 'validation-pop', 'leaf-start');
    await popValidation();
    ensureOwnerCurrent();
    state = 'ready';
    device.addEventListener?.('uncapturederror', uncaptured);
    removeErrorListener = () => { try { device.removeEventListener?.('uncapturederror', uncaptured); } catch {} };
    ensureOwnerCurrent();
  } catch (error) {
    if (validationDepth > 0) retireValidationScope();
    if (error?.code === 'RELOAD_STARTUP_RETIRED' || state === 'retired' || disposed) {
      releaseResources();
      throw retirementFailure || error;
    }
    if (error === deviceLostError || state === 'lost') {
      releaseResources();
      throw deviceLostError || error;
    }
    fail(error);
    releaseResources();
    throw failure || error;
  }

  function cleanup() { releaseResources(); }

  function allocateTargets(nextWidth, nextHeight) {
    const next = {};
    try {
      for (const name of ['world', 'emission', 'blurX', 'blurY']) {
        next[name] = device.createTexture({ label: `reload-e-r2/${name}-hdr-g${targetGeneration + 1}`, size: { width: nextWidth, height: nextHeight }, format: FORMAT, usage: TEXTURE_USAGE });
      }
      const views = Object.fromEntries(Object.entries(next).map(([name, tex]) => [name, tex.createView()]));
      const group0 = {};
      for (const name of Object.keys(pipelines)) group0[name] = makeBindGroup(pipelines[name], { group: 0, items: [{ binding: 0, resource: { buffer: uniformBuffer, offset: 0, size: UNIFORM_BYTES } }] }, `reload-e-r2/${name}-uniform-g${targetGeneration + 1}`);
      const group1 = {
        blurX: makeBindGroup(pipelines.blurX, { group: 1, items: [{ binding: 0, resource: views.emission }] }, `reload-e-r2/blur-x-input-g${targetGeneration + 1}`),
        blurY: makeBindGroup(pipelines.blurY, { group: 1, items: [{ binding: 0, resource: views.blurX }] }, `reload-e-r2/blur-y-input-g${targetGeneration + 1}`),
        composite: makeBindGroup(pipelines.composite, { group: 1, items: [{ binding: 0, resource: views.world }, { binding: 1, resource: views.blurY }, { binding: 2, resource: views.emission }] }, `reload-e-r2/composite-input-g${targetGeneration + 1}`)
      };
      const rowBytes = 256 * 8;
      const rowPitch = Math.ceil(rowBytes / 256) * 256;
      const proofBuffer = device.createBuffer({ label: `reload-e-r2/emission-proof-g${targetGeneration + 1}`, size: rowPitch * 256, usage: READBACK_BUFFER_USAGE });
      return { targets: next, views, groups: { group0, group1 }, readbackBuffer: proofBuffer, readbackBytesPerRow: rowPitch };
    } catch (error) {
      for (const tex of Object.values(next)) { try { tex.destroy(); } catch {} }
      throw error;
    }
  }

  async function resize(nextSize) {
    if (disposed || state !== 'ready') throw failure || new Error('Reload renderer is not ready');
    const ownerGeneration = generation, ownerTargetGeneration = targetGeneration;
    const size = checkedSize(nextSize, device.limits?.maxTextureDimension2D || 8192);
    if (size.width === width && size.height === height && targets) return { ...size, generation: targetGeneration };
    pushValidation();
    let fresh;
    try {
      fresh = allocateTargets(size.width, size.height);
    } catch (error) {
      if (validationDepth > 0) { try { await popValidation(); } catch (scopeError) { error = new AggregateError([error, scopeError], 'Reload resize validation failed'); } }
      destroyFresh(fresh);
      if (error?.code === 'RELOAD_STARTUP_RETIRED' || disposed || state === 'retired') throw retirementFailure || error;
      fail(error);
      throw error;
    }
    try { await popValidation(); } catch (error) {
      destroyFresh(fresh);
      if (disposed || state === 'retired' || generation !== ownerGeneration) throw retirementFailure || error;
      fail(error); throw error;
    }
    if (disposed || state !== 'ready' || generation !== ownerGeneration || targetGeneration !== ownerTargetGeneration || !isOwnerCurrent()) {
      destroyFresh(fresh);
      if (!retirementFailure) retirementFailure = retiredError();
      throw retirementFailure;
    }
    try { await lastSubmitted; } catch (error) { destroyFresh(fresh); if (disposed || state === 'retired' || generation !== ownerGeneration) throw retirementFailure || error; fail(error); throw error; }
    if (disposed || state !== 'ready' || generation !== ownerGeneration || targetGeneration !== ownerTargetGeneration || !isOwnerCurrent()) {
      destroyFresh(fresh);
      if (!retirementFailure) retirementFailure = retiredError();
      throw retirementFailure;
    }
    const old = targets;
    const oldReadbackBuffer = readbackBuffer;
    targets = fresh.targets; groups = fresh.groups; width = size.width; height = size.height; targetGeneration++;
    readbackBuffer = fresh.readbackBuffer; readbackBytesPerRow = fresh.readbackBytesPerRow;
    if (old) for (const tex of Object.values(old)) destroyOnce(tex);
    destroyOnce(oldReadbackBuffer);
    return { ...size, generation: targetGeneration };
  }

  function record(plan, { outputView, verifyEmission = false, diagnosticProbe = null, expectedGeneration = generation, expectedTargetGeneration = targetGeneration } = {}) {
    assert(current(expectedGeneration) && expectedTargetGeneration === targetGeneration, 'Reload frame belongs to a stale renderer/target generation');
    assert(targets && groups && outputView, 'Reload targets/output view must be prepared before record');
    assert(plan && approvedPlans.has(plan), 'Reload plan must pass planReloadInput with explicit authoritative gates');
    const data = packReloadUniform(plan);
    if (!(data instanceof Float32Array) || data.byteLength !== UNIFORM_BYTES || !data.every(Number.isFinite)) throw new TypeError('Reload planner must produce exactly 32 finite float32 values (128 bytes)');
    device.queue.writeBuffer(uniformBuffer, 0, data);
    const encoder = device.createCommandEncoder({ label: 'reload-e-r2/frame' });
    const passesInOrder = [];
    const pass = (label, pipelineName, attachments, bindGroupNames = []) => {
      const p = encoder.beginRenderPass({ label, colorAttachments: attachments });
      p.setPipeline(pipelines[pipelineName]); p.setBindGroup(0, groups.group0[pipelineName]);
      if (bindGroupNames.length) p.setBindGroup(1, groups.group1[pipelineName]);
      p.draw(shaderEntries.vertices, 1, 0, 0); p.end(); passesInOrder.push(label);
    };
    const clear = { loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } };
    pass('world+emission', 'world', [{ ...clear, view: targets.world.createView() }, { ...clear, view: targets.emission.createView() }]);
    pass('blur-x', 'blurX', [{ ...clear, view: targets.blurX.createView() }], ['blurX']);
    pass('blur-y', 'blurY', [{ ...clear, view: targets.blurY.createView() }], ['blurY']);
    pass('composite', 'composite', [{ view: outputView, loadOp: outputLoadOp, storeOp: 'store', ...(outputLoadOp === 'clear' ? { clearValue: { r: 0, g: 0, b: 0, a: 0 } } : {}) }], ['composite']);
    let proofRegion = null;
    if (verifyEmission) {
      if (!readbackBuffer || !encoder.copyTextureToBuffer) throw new Error('Reload active-emission readback is unavailable');
      const copyWidth = Math.min(256, width), copyHeight = Math.min(256, height);
      const originX = Math.max(0, Math.min(width - copyWidth, Math.floor((plan.anchor?.[0] ?? width / 2) - copyWidth / 2)));
      const originY = Math.max(0, Math.min(height - copyHeight, Math.floor((plan.anchor?.[1] ?? height / 2) - copyHeight / 2)));
      proofRegion = { x: originX, y: originY, width: copyWidth, height: copyHeight, bytesPerRow: readbackBytesPerRow };
      encoder.copyTextureToBuffer({ texture: targets.emission, origin: { x: originX, y: originY, z: 0 } }, { buffer: readbackBuffer, bytesPerRow: readbackBytesPerRow, rowsPerImage: copyHeight }, { width: copyWidth, height: copyHeight, depthOrArrayLayers: 1 });
    }
    let diagnostic = null;
    if (diagnosticProbe) {
      assert(!diagnosticProbePending, 'A diagnostic GPU probe is already pending');
      assert(typeof diagnosticProbe.id === 'string' && diagnosticProbe.id && typeof diagnosticProbe.epoch === 'string' && diagnosticProbe.epoch, 'Diagnostic probe id and attempt epoch required');
      assert(diagnosticProbe.causeId === plan.causeId, 'Diagnostic probe cause must match the submitted plan');
      assert(typeof diagnosticProbe.isCurrent === 'function', 'Diagnostic probe freshness predicate required');
      diagnosticProbePending = true;
      const copyWidth = Math.min(128, width), copyHeight = Math.min(128, height);
      const originX = Math.max(0, Math.min(width - copyWidth, Math.floor((plan.anchor?.[0] ?? width / 2) - copyWidth / 2)));
      const originY = Math.max(0, Math.min(height - copyHeight, Math.floor((plan.anchor?.[1] ?? height / 2) - copyHeight / 2)));
      const bytesPerRow = Math.ceil((copyWidth * 8) / 256) * 256;
      const region = { x: originX, y: originY, width: copyWidth, height: copyHeight, bytesPerRow, format: FORMAT };
      const buffers = {};
      try {
        for (const name of ['world', 'emission', 'blurY']) {
          const buffer = device.createBuffer({ label: `reload-e-diagnostic/${name}-${diagnosticProbe.id}`, size: bytesPerRow * copyHeight, usage: READBACK_BUFFER_USAGE });
          buffers[name] = buffer;
          encoder.copyTextureToBuffer({ texture: targets[name], origin: { x: originX, y: originY, z: 0 } }, { buffer, bytesPerRow, rowsPerImage: copyHeight }, { width: copyWidth, height: copyHeight, depthOrArrayLayers: 1 });
        }
      } catch (error) { for (const buffer of Object.values(buffers)) { try { buffer.destroy(); } catch {} } diagnosticProbePending = false; throw error; }
      diagnostic = { ...diagnosticProbe, region, buffers, packedByteLength: data.byteLength, lanes4to11: Array.from(data.slice(4, 12)) };
    }
    let command;
    try { command = encoder.finish(); }
    catch (error) { for (const buffer of Object.values(diagnostic?.buffers || {})) { try { buffer.destroy(); } catch {} } if (diagnostic) diagnosticProbePending = false; throw error; }
    return { command, passes: passesInOrder.length, passesInOrder, generation: expectedGeneration, targetGeneration: expectedTargetGeneration, plan, proofRegion, diagnostic };
  }

  function halfToFloat(h) {
    const sign = (h & 0x8000) ? -1 : 1, exp = (h >> 10) & 31, mantissa = h & 1023;
    if (exp === 0) return sign * (mantissa ? 2 ** -14 * mantissa / 1024 : 0);
    if (exp === 31) return mantissa ? NaN : sign * Infinity;
    return sign * 2 ** (exp - 15) * (1 + mantissa / 1024);
  }
  async function readDiagnosticTexture(buffer, region) {
    await buffer.mapAsync(globalThis.GPUMapMode?.READ ?? 0x01);
    try {
      const data = new Uint16Array(buffer.getMappedRange());
      let finiteComponents = 0, nonzeroComponents = 0, maxAbs = 0, nonFiniteComponents = 0;
      const rowStride = region.bytesPerRow / 2;
      for (let y = 0; y < region.height; y++) for (let x = 0; x < region.width; x++) for (let c = 0; c < 4; c++) {
        const value = halfToFloat(data[y * rowStride + x * 4 + c]);
        if (!Number.isFinite(value)) { nonFiniteComponents++; continue; }
        finiteComponents++; if (value !== 0) nonzeroComponents++; maxAbs = Math.max(maxAbs, Math.abs(value));
      }
      return { finiteComponents, nonzeroComponents, nonFiniteComponents, maxAbs };
    } finally { try { buffer.unmap(); } catch {} }
  }
  async function completeDiagnosticProbe(diagnostic, submitId, submittedGeneration, submittedTargetGeneration) {
    const result = { id: diagnostic.id, epoch: diagnostic.epoch, causeId: diagnostic.causeId, phase: diagnostic.phase, ageMs: diagnostic.ageMs, submitId, generation: submittedGeneration, deviceGeneration: submittedGeneration, targetGeneration: submittedTargetGeneration, region: diagnostic.region, packedByteLength: diagnostic.packedByteLength, lanes4to11: diagnostic.lanes4to11, textures: null, completion: 'queueDone-resolved' };
    try {
      const names = ['world', 'emission', 'blurY'];
      const values = await Promise.allSettled(names.map(name => readDiagnosticTexture(diagnostic.buffers[name], diagnostic.region)));
      result.textures = Object.fromEntries(names.map((name, i) => [name, values[i].status === 'fulfilled' ? values[i].value : { readbackError: String(values[i].reason?.message || values[i].reason) }]));
      const errors = values.filter(value => value.status === 'rejected');
      if (errors.length) result.readbackError = errors.map(value => String(value.reason?.message || value.reason)).join('; ');
      result.completion = 'queueDone-and-readback-resolved';
    } catch (error) { result.readbackError = String(error?.message || error); }
    finally { for (const buffer of Object.values(diagnostic.buffers)) { try { buffer.destroy(); } catch {} } diagnosticProbePending = false; }
    let stillCurrent = false;
    try { stillCurrent = generation === submittedGeneration && targetGeneration === submittedTargetGeneration && diagnostic.isCurrent() === true; } catch {}
    if (stillCurrent) lastDiagnosticProbe = result;
    return result;
  }

  async function readEmissionEvidence(buffer, region, rowPitch) {
    await buffer.mapAsync(globalThis.GPUMapMode?.READ ?? 0x01);
    try {
      const data = new Uint16Array(buffer.getMappedRange());
      const pixelStride = 4;
      const rowStride = rowPitch / 2;
      let finiteRgbComponents = 0, nonFiniteRgbComponents = 0, positiveRgbComponents = 0;
      const maxRgb = [0, 0, 0];
      for (let y = 0; y < region.height; y++) {
        for (let x = 0; x < region.width; x++) {
          const i = y * rowStride + x * pixelStride;
          for (let c = 0; c < 3; c++) {
            const bits = data[i + c], value = halfToFloat(bits);
            if (!Number.isFinite(value)) { nonFiniteRgbComponents++; continue; }
            finiteRgbComponents++; maxRgb[c] = Math.max(maxRgb[c], value);
            if ((bits & 0x8000) === 0 && (bits & 0x7c00) !== 0x7c00 && (bits & 0x7fff) !== 0) positiveRgbComponents++;
          }
        }
      }
      return { region: { ...region }, finiteRgbComponents, nonFiniteRgbComponents, positiveRgbComponents, maxRgb };
    } finally { try { buffer.unmap(); } catch {} }
  }

  async function render(plan, { currentCheck = isCurrent, awaitCompletion = true, verifyEmission = false, diagnosticProbe = null } = {}) {
    if (disposed || state !== 'ready' || !targets) return { submitted: false, reason: 'not-ready' };
    if (verifyEmission && !awaitCompletion) throw new Error('Emission proof requires completed queue work');
    const submittedGeneration = generation, submittedTargetGeneration = targetGeneration;
    if (!currentCheck()) return { submitted: false, reason: 'stale-before-record' };
    let outputTexture;
    try { outputTexture = context.getCurrentTexture(); }
    catch (error) { fail(error); throw error; }
    const recorded = record(plan, { outputView: outputTexture.createView(), verifyEmission, diagnosticProbe, expectedGeneration: submittedGeneration, expectedTargetGeneration: submittedTargetGeneration });
    if (!current(submittedGeneration) || !currentCheck() || submittedTargetGeneration !== targetGeneration) { for (const buffer of Object.values(recorded.diagnostic?.buffers || {})) { try { buffer.destroy(); } catch {} } if (recorded.diagnostic) diagnosticProbePending = false; return { submitted: false, reason: 'stale-before-submit' }; }
    device.queue.submit([recorded.command]); submitCount++;
    const submitId = submitCount;
    const queueDone = Promise.resolve(device.queue.onSubmittedWorkDone?.());
    const proofReadback = verifyEmission ? queueDone.then(() => readEmissionEvidence(readbackBuffer, recorded.proofRegion, readbackBytesPerRow)) : null;
    const diagnosticReadback = recorded.diagnostic ? queueDone.then(() => completeDiagnosticProbe(recorded.diagnostic, submitId, submittedGeneration, submittedTargetGeneration)) : null;
    lastSubmitted = Promise.all([proofReadback || queueDone, diagnosticReadback || Promise.resolve()]).catch(error => { fail(error); throw error; });
    lastSubmitted.catch(() => {});
    if (awaitCompletion) await lastSubmitted;
    const completed = awaitCompletion && current(submittedGeneration) && currentCheck() && submittedTargetGeneration === targetGeneration;
    const emissionReadback = proofReadback && completed ? await proofReadback : null;
    const emissionNonzero = emissionReadback ? emissionReadback.positiveRgbComponents > 0 : null;
    return { submitted: true, completed, canvasConnected: canvas.isConnected !== false, causeId: recorded.plan.causeId, phase: recorded.plan.phase, ageMs: recorded.plan.ageMs, submitId, passes: recorded.passes, passesInOrder: [...recorded.passesInOrder], generation: submittedGeneration, targetGeneration: submittedTargetGeneration, width, height, submitCount, emissionNonzero, emissionReadback, proofRegion: recorded.proofRegion, diagnosticProbe: recorded.diagnostic ? { id: recorded.diagnostic.id, submitId } : null };
  }

  async function dispose() {
    if (disposePromise) return disposePromise;
    disposed = true; generation++; state = 'disposed';
    disposePromise = (async () => { try { await lastSubmitted; } catch {} cleanup(); })();
    return disposePromise;
  }

  return Object.freeze({ device, context, canvasFormat, get state() { return state; }, get generation() { return generation; }, get targetGeneration() { return targetGeneration; }, get submitCount() { return submitCount; }, get failure() { return failure; }, resize, record, render, dispose, snapshot: () => ({ state, generation, targetGeneration, width, height, submitCount, format: FORMAT, canvasFormat, diagnosticProbePending, lastDiagnosticProbe }) });
}
