import * as Plan from './source/plan.mjs';
import { WORLD_WGSL, POST_WGSL } from './source/shader.mjs';
import { measureExtent, extentMatches } from './host-contract.mjs';
import { createGenerationGuard } from './runtime-lifecycle.mjs';

const FORMAT = 'rgba16float';
const UNIFORM_BYTES = 160;
const alignUniform = bytes => (bytes + 255) & ~255;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

export function formatShaderDiagnostics(messages = []) {
  return Object.freeze(messages.map(message => Object.freeze({
    type: message.type,
    message: message.message,
    lineNum: message.lineNum,
    linePos: message.linePos,
    offset: message.offset,
    length: message.length,
  })));
}

function normalizedExtent(measurement, generation) {
  return Object.freeze({
    valid: true, connected: true,
    cssWidth: measurement.cssWidth, cssHeight: measurement.cssHeight,
    clientWidth: measurement.clientWidth, clientHeight: measurement.clientHeight,
    rawDpr: measurement.rawDpr, usedDpr: measurement.usedDpr,
    backingWidth: measurement.backingWidth, backingHeight: measurement.backingHeight,
    actualBackingWidth: measurement.backingWidth, actualBackingHeight: measurement.backingHeight,
    layoutGeneration: generation,
  });
}

export class HoverSprintBlueRuntime {
  constructor(canvas, { onFailure = () => {}, onRecord = () => {} } = {}) {
    this.canvas = canvas;
    this.onFailure = onFailure;
    this.onRecord = onRecord;
    this.device = null;
    this.context = null;
    this.resources = null;
    this.frameId = 0;
    this.completedFrameId = 0;
    this.disposed = false;
    this.generation = 1;
    this.resourceGeneration = 0;
    this.layoutGeneration = 0;
    this.generationGuard = createGenerationGuard();
    this.lastExtent = null;
    this.failure = null;
    this.last = null;
    this.shaderDiagnostics = Object.freeze([]);
  }

  async initialize() {
    const generation = this.generation;
    let device = null;
    let ownsDevice = false;
    try {
      assert(this.canvas && typeof navigator !== 'undefined' && navigator.gpu, 'WebGPU unavailable');
      const adapter = await navigator.gpu.requestAdapter();
      assert(adapter, 'No WebGPU adapter');
      if (this.disposed || this.generation !== generation) throw new Error('Runtime retired before device request');
      device = await adapter.requestDevice();
      ownsDevice = true;
      if (this.disposed || this.generation !== generation) throw new Error('Runtime retired while device was requested');
      this.device = device;

      const context = this.canvas.getContext('webgpu');
      assert(context, 'Canvas WebGPU context unavailable');
      this.context = context;
      const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      context.configure({ device, format: canvasFormat, alphaMode: 'premultiplied' });

      const worldModule = device.createShaderModule({ code: WORLD_WGSL, label: 'HS Blue world radiance' });
      const postModule = device.createShaderModule({ code: POST_WGSL, label: 'HS Blue source PSF' });
      const layout = device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      ] });
      const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
      const world = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: worldModule, entryPoint: 'vs' },
        fragment: { module: worldModule, entryPoint: 'fs', targets: [{ format: FORMAT }, { format: FORMAT }] },
        primitive: { topology: 'triangle-list' },
      });
      const post = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: { module: postModule, entryPoint: 'vs' },
        fragment: { module: postModule, entryPoint: 'fs', targets: [{ format: canvasFormat }] },
        primitive: { topology: 'triangle-list' },
      });

      const shaderDiagnostics = [];
      for (const [stage, module] of [['world', worldModule], ['post', postModule]]) {
        const info = await module.getCompilationInfo();
        const messages = formatShaderDiagnostics(info.messages);
        shaderDiagnostics.push(Object.freeze({ stage, messages }));
        this.shaderDiagnostics = Object.freeze(shaderDiagnostics.slice());
        const errors = messages.filter(message => message.type === 'error');
        if (errors.length) {
          const error = new Error(`${stage} WGSL compilation failed: ${errors.map(item => item.message).join('\n')}`);
          error.diagnostics = errors;
          throw error;
        }
      }
      this.shaderDiagnostics = Object.freeze(shaderDiagnostics.slice());
      if (this.disposed || this.generation !== generation || this.device !== device) throw new Error('Runtime retired during pipeline initialization');

      const sampler = device.createSampler({ minFilter: 'linear', magFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
      const uniform = device.createBuffer({ size: alignUniform(UNIFORM_BYTES), usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: 'HS Blue 160-byte uniforms' });
      this.resources = {
        format: FORMAT, canvasFormat, world, post, layout, sampler, uniform,
        width: 0, height: 0, worldTexture: null, sourceTexture: null,
        worldView: null, sourceView: null, postGroup: null,
      };
      const initialExtent = this.measureExtent();
      if (initialExtent.valid) this.resize(initialExtent);
      device.lost.then(info => {
        if (this.device === device && !this.disposed) {
          const error = new Error(`WebGPU device lost: ${info.message}`);
          this.failure = error;
          this.onFailure(error);
        }
      });
      this.onRecord({ event: 'initialized', runtimeGeneration: this.generation, shaderDiagnostics: this.shaderDiagnostics });
      return this;
    } catch (error) {
      if (ownsDevice) {
        try { device?.destroy(); } catch { /* best effort after failed init */ }
        if (this.device === device) this.device = null;
      }
      if (!this.disposed) this.failure = error;
      throw error;
    }
  }

  measureExtent() { return measureExtent(this.canvas, Number(globalThis.devicePixelRatio)); }

  resize(measurement = this.measureExtent()) {
    if (this.disposed || !this.device || !this.resources) return { valid: false, changed: false, reason: 'runtime-unavailable' };
    if (!measurement?.valid) return { valid: false, changed: false, reason: measurement?.reason || 'invalid-extent', extent: measurement || null };

    const oldExtent = this.lastExtent;
    const layoutChanged = !extentMatches(oldExtent, measurement);
    if (layoutChanged) {
      this.layoutGeneration++;
      this.lastExtent = normalizedExtent(measurement, this.layoutGeneration);
    }
    const extent = this.lastExtent;
    if (this.canvas.width !== extent.backingWidth) this.canvas.width = extent.backingWidth;
    if (this.canvas.height !== extent.backingHeight) this.canvas.height = extent.backingHeight;

    const resources = this.resources;
    const texturesChanged = resources.width !== extent.backingWidth || resources.height !== extent.backingHeight;
    if (texturesChanged) {
      let worldTexture = null;
      let sourceTexture = null;
      try {
        const descriptor = {
          size: { width: extent.backingWidth, height: extent.backingHeight },
          format: FORMAT,
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        };
        worldTexture = this.device.createTexture({ ...descriptor, label: 'HS Blue world radiance target' });
        sourceTexture = this.device.createTexture({ ...descriptor, label: 'HS Blue source radiance target' });
        const worldView = worldTexture.createView();
        const sourceView = sourceTexture.createView();
        const postGroup = this.device.createBindGroup({
          layout: resources.layout,
          entries: [
            { binding: 0, resource: { buffer: resources.uniform, size: UNIFORM_BYTES } },
            { binding: 1, resource: worldView },
            { binding: 2, resource: sourceView },
            { binding: 3, resource: resources.sampler },
          ],
        });
        const oldWorld = resources.worldTexture;
        const oldSource = resources.sourceTexture;
        Object.assign(resources, { width: extent.backingWidth, height: extent.backingHeight, worldTexture, sourceTexture, worldView, sourceView, postGroup });
        try { oldWorld?.destroy(); oldSource?.destroy(); } catch { /* old textures are retired */ }
      } catch (error) {
        try { worldTexture?.destroy(); sourceTexture?.destroy(); } catch { /* release partial allocation */ }
        throw error;
      }
    }
    if (layoutChanged || texturesChanged) {
      const generations = this.generationGuard.resize({ layoutChanged, resourceChanged: texturesChanged });
      this.layoutGeneration = generations.layoutGeneration;
      this.resourceGeneration = generations.resourceGeneration;
      this.onRecord({ event: 'resize', layoutGeneration: this.layoutGeneration, resourceGeneration: this.resourceGeneration, width: extent.backingWidth, height: extent.backingHeight, dpr: extent.usedDpr });
    }
    return { valid: true, changed: layoutChanged || texturesChanged, extent };
  }

  async draw({ input, variant = 'normal', controls = {} } = {}) {
    assert(!this.disposed && this.device && this.resources, 'Renderer not ready');
    assert(input?.cause?.causeId && input?.clock, 'Source cause and caller-owned clocks are required');
    const measurement = this.measureExtent();
    if (!measurement.valid) return Object.freeze({ deferred: true, reason: measurement.reason, extent: measurement, proof: null });
    const allocation = this.resize(measurement);
    if (!allocation.valid) return Object.freeze({ deferred: true, reason: allocation.reason, extent: measurement, proof: null });

    const resources = this.resources;
    const submittedExtent = allocation.extent;
    const submittedLayoutGeneration = this.layoutGeneration;
    const submittedResourceGeneration = this.resourceGeneration;
    const submittedRuntimeGeneration = this.generation;
    const submittedGenerationToken = this.generationGuard.capture();
    const submittedDevice = this.device;
    const fit = Math.min(resources.width / 384, resources.height / 256);
    const origin = { x: (resources.width - 384 * fit) / 2, y: (resources.height - 256 * fit) / 2 };
    const view = {
      width: resources.width, height: resources.height, scale: fit, origin, camera: { x: 0, y: 0 },
      cssWidth: submittedExtent.cssWidth, cssHeight: submittedExtent.cssHeight, dpr: submittedExtent.usedDpr,
      backingWidth: resources.width, backingHeight: resources.height, layoutGeneration: submittedLayoutGeneration,
    };
    const uniforms = Plan.packUniforms({ ...input, reducedMotion: variant === 'reduced' }, view, {
      bodyOn: controls.bodyOn !== false,
      emitterOn: controls.emitterOn !== false,
      nearOn: controls.nearOn !== false,
      postOn: controls.postOn !== false,
    });
    assert(uniforms instanceof Float32Array && uniforms.byteLength === UNIFORM_BYTES, 'R5 plan must provide the frozen 160-byte uniform ABI');

    this.device.queue.writeBuffer(resources.uniform, 0, uniforms);
    const encoder = this.device.createCommandEncoder({ label: 'HS Blue WebGPU frame' });
    const worldPass = encoder.beginRenderPass({ colorAttachments: [
      { view: resources.worldView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' },
      { view: resources.sourceView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' },
    ] });
    worldPass.setPipeline(resources.world);
    worldPass.setBindGroup(0, this.device.createBindGroup({
      layout: resources.world.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: resources.uniform, size: UNIFORM_BYTES } }],
    }));
    worldPass.draw(3);
    worldPass.end();
    const postPass = encoder.beginRenderPass({ colorAttachments: [
      { view: this.context.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' },
    ] });
    postPass.setPipeline(resources.post);
    postPass.setBindGroup(0, resources.postGroup);
    postPass.draw(3);
    postPass.end();

    const frameId = ++this.frameId;
    this.device.queue.submit([encoder.finish()]);
    const submitRecord = {
      event: 'submit', causeId: input.cause.causeId, actorId: input.cause.actorId,
      sourceOn: input.sourceOn !== false, clock: { ...input.clock },
      expiryServerMs: input.cause.activeUntilServerMs, frameId, submitted: true,
      runtimeGeneration: submittedRuntimeGeneration, layoutGeneration: submittedLayoutGeneration,
      resourceGeneration: submittedResourceGeneration,
    };
    this.onRecord(submitRecord);
    await this.device.queue.onSubmittedWorkDone();
    this.completedFrameId = frameId;

    const completionExtent = this.measureExtent();
    const layoutCurrent = !this.disposed && this.device === submittedDevice && this.resources === resources
      && this.generation === submittedRuntimeGeneration && this.layoutGeneration === submittedLayoutGeneration
      && this.resourceGeneration === submittedResourceGeneration && this.generationGuard.isCurrent(submittedGenerationToken)
      && extentMatches(submittedExtent, completionExtent)
      && completionExtent.actualBackingWidth === submittedExtent.backingWidth
      && completionExtent.actualBackingHeight === submittedExtent.backingHeight;
    const proof = Object.freeze({
      recorded: true, submitted: true, completed: true,
      canvasConnected: this.canvas.isConnected === true, passes: 2,
      viewportWidth: submittedExtent.cssWidth, viewportHeight: submittedExtent.cssHeight,
      backingWidth: submittedExtent.backingWidth, backingHeight: submittedExtent.backingHeight,
      dpr: submittedExtent.usedDpr, layoutGeneration: submittedLayoutGeneration,
      resourceGeneration: submittedResourceGeneration, runtimeGeneration: submittedRuntimeGeneration,
      frameId, submittedCommands: 2, eventId: input.cause.causeId,
      actorId: input.cause.actorId, roomGeneration: input.cause.roomGeneration,
      sourceOn: input.sourceOn !== false, effectAgeMs: input.clock.flowAgeMs,
      localNowMs: input.clock.localNowMs, serverNowMs: input.clock.serverNowMs,
      expiryServerMs: input.cause.activeUntilServerMs,
      remainingServerMs: input.cause.activeUntilServerMs - input.clock.serverNowMs,
      submittedExtent, completionExtent, layoutCurrent,
    });
    this.onRecord({ ...submitRecord, event: 'complete', completed: true, layoutCurrent });
    this.last = Object.freeze({ input, uniforms: Array.from(uniforms), variant, controls: { ...controls }, view, proof });
    return this.last;
  }

  snapshot() {
    return Object.freeze({
      version: Plan.VERSION, disposed: this.disposed, frameId: this.frameId,
      completedFrameId: this.completedFrameId, deviceGeneration: this.generation,
      resourceGeneration: this.resourceGeneration, layoutGeneration: this.layoutGeneration,
      extent: this.lastExtent, failure: this.failure?.message || null,
      shaderDiagnostics: this.shaderDiagnostics, last: this.last, audioVoices: 0,
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const generations = this.generationGuard.cancel();
    this.generation = generations.runtimeGeneration;
    const resources = this.resources;
    this.resources = null;
    try { resources?.worldTexture?.destroy(); resources?.sourceTexture?.destroy(); resources?.uniform?.destroy(); } catch { /* release all owned GPU resources */ }
    this.resourceGeneration = generations.resourceGeneration;
    try { this.context?.unconfigure?.(); } catch { /* context already retired */ }
    try { this.device?.destroy(); } catch { /* device already retired */ }
    this.device = null;
    this.context = null;
    this.onRecord({ event: 'cancel', runtimeGeneration: this.generation, frameId: this.frameId, submitted: false });
  }
}

export const VERSION = 'hover-sprint-blue-sol61-r6';
export const __test = Object.freeze({ alignUniform, UNIFORM_BYTES });
