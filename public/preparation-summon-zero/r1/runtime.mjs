import * as Plan from './source/plan.mjs';
import { WORLD_WGSL, POST_WGSL, TARGET_FORMAT } from './source/shader.mjs';
import { measureExtent, extentMatches } from './host-contract.mjs';
import { ACTOR_FIXTURE, ACTOR_ALPHA_HEIGHT } from './actor-fixture.mjs';

const WIDTH = 384, HEIGHT = 320, ACTOR_CELL = ACTOR_FIXTURE.idleCell;
const finite = Number.isFinite;
const assert = (value, message) => { if (!value) throw new Error(message); };
const blend = Object.freeze({
  color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
});
const premultipliedBlend = Object.freeze({
  color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
});

function frozenExtent(measured, layoutGeneration) {
  return Object.freeze({ ...measured, valid: true, connected: true,
    actualBackingWidth: measured.backingWidth, actualBackingHeight: measured.backingHeight,
    layoutGeneration });
}

export class PreparationSummonZeroRuntime {
  constructor(canvas, { gpu = globalThis.navigator?.gpu, actorImage = null,
    actorImageLoader = loadActorImage, onFailure = () => {} } = {}) {
    this.canvas = canvas;
    this.gpu = gpu;
    this.actorImage = actorImage;
    this.actorImageLoader = actorImageLoader;
    this.onFailure = onFailure;
    this.device = null;
    this.context = null;
    this.resources = null;
    this.frameId = 0;
    this.completedFrameId = 0;
    this.disposed = false;
    this.generation = 1;
    this.resourceGeneration = 0;
    this.layoutGeneration = 0;
    this.lastExtent = null;
    this.failure = null;
    this.last = null;
  }

  async initialize() {
    let device = null;
    let context = null;
    let createdResources = [];
    try {
      assert(this.canvas && this.gpu?.requestAdapter, 'WebGPU unavailable');
      const adapter = await this.gpu.requestAdapter();
      assert(adapter, 'No WebGPU adapter');
      device = await adapter.requestDevice();
      assert(device, 'WebGPU device request failed');
      this.device = device;
      context = this.canvas.getContext('webgpu');
      assert(context, 'Canvas WebGPU context unavailable');
      this.context = context;
      const canvasFormat = this.gpu.getPreferredCanvasFormat();
      context.configure({ device, format: canvasFormat, alphaMode: 'opaque' });

      const stages = globalThis.GPUShaderStage;
      assert(stages?.FRAGMENT != null && stages?.VERTEX != null, 'WebGPU shader-stage constants unavailable');
      const worldModule = device.createShaderModule({ code: WORLD_WGSL, label: 'Preparation Summon Zero world MRT' });
      const postModule = device.createShaderModule({ code: POST_WGSL, label: 'Preparation Summon Zero source-local post' });
      const spriteModule = device.createShaderModule({ code: SPRITE_WGSL, label: 'Existing human actor sprite' });
      const worldLayout = device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: stages.FRAGMENT, buffer: { type: 'uniform' } }
      ] });
      const postLayout = device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: stages.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: stages.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
        { binding: 2, visibility: stages.FRAGMENT, texture: { sampleType: 'unfilterable-float' } }
      ] });
      const spriteLayout = device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: stages.VERTEX, buffer: { type: 'uniform' } },
        { binding: 1, visibility: stages.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 2, visibility: stages.FRAGMENT, sampler: { type: 'filtering' } }
      ] });
      const world = device.createRenderPipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [worldLayout] }),
        vertex: { module: worldModule, entryPoint: 'vs' },
        fragment: { module: worldModule, entryPoint: 'fs', targets: [
          { format: TARGET_FORMAT }, { format: TARGET_FORMAT }
        ] }, primitive: { topology: 'triangle-list' } });
      const post = device.createRenderPipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [postLayout] }),
        vertex: { module: postModule, entryPoint: 'vs' },
        fragment: { module: postModule, entryPoint: 'fs', targets: [{ format: canvasFormat, blend }] },
        primitive: { topology: 'triangle-list' } });
      const sprite = device.createRenderPipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [spriteLayout] }),
        vertex: { module: spriteModule, entryPoint: 'vs' },
        fragment: { module: spriteModule, entryPoint: 'fs', targets: [{ format: canvasFormat, blend: premultipliedBlend }] },
        primitive: { topology: 'triangle-list' } });
      for (const module of [worldModule, postModule, spriteModule]) {
        const info = await module.getCompilationInfo();
        const errors = info.messages.filter(message => message.type === 'error');
        if (errors.length) throw new Error(errors.map(message => message.message).join('\n'));
      }
      const image = this.actorImage || await this.actorImageLoader();
      assert(image && Number(image.width || image.naturalWidth) > 0 &&
        Number(image.height || image.naturalHeight) > 0, 'Pinned existing human actor image unavailable');
      if (this.disposed || this.device !== device) throw new Error('Runtime retired during initialization');

      const usage = globalThis.GPUBufferUsage, textureUsage = globalThis.GPUTextureUsage;
      assert(usage?.UNIFORM != null && usage?.COPY_DST != null && textureUsage?.COPY_DST != null &&
        textureUsage?.TEXTURE_BINDING != null && textureUsage?.RENDER_ATTACHMENT != null,
        'WebGPU resource usage constants unavailable');
      const uniform = device.createBuffer({ size: 64, usage: usage.UNIFORM | usage.COPY_DST, label: 'Summon Zero 64-byte plan' });
      createdResources.push(uniform);
      const spriteUniform = device.createBuffer({ size: 48, usage: usage.UNIFORM | usage.COPY_DST, label: 'Actor viewport/crop' });
      createdResources.push(spriteUniform);
      const actorTexture = device.createTexture({ size: [image.width || image.naturalWidth, image.height || image.naturalHeight],
        format: 'rgba8unorm', usage: textureUsage.COPY_DST | textureUsage.TEXTURE_BINDING |
          textureUsage.RENDER_ATTACHMENT, label: 'Pinned existing human actor image' });
      createdResources.push(actorTexture);
      device.pushErrorScope('validation');
      let uploadValidationError = null;
      try {
        device.queue.copyExternalImageToTexture({ source: image },
          { texture: actorTexture, premultipliedAlpha: true },
          [image.width || image.naturalWidth, image.height || image.naturalHeight]);
        uploadValidationError = await device.popErrorScope();
      } catch (error) {
        try { await device.popErrorScope(); } catch {}
        throw error;
      }
      if (uploadValidationError)
        throw new Error(`Pinned human actor texture upload validation failed: ${uploadValidationError.message || uploadValidationError}`);
      const spriteSampler = device.createSampler({ minFilter: 'linear', magFilter: 'linear',
        addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
      const spriteGroup = device.createBindGroup({ layout: spriteLayout, entries: [
        { binding: 0, resource: { buffer: spriteUniform, size: 48 } },
        { binding: 1, resource: actorTexture.createView() },
        { binding: 2, resource: spriteSampler }
      ] });
      this.resources = { world, post, sprite, worldLayout, postLayout, spriteLayout,
        uniform, spriteUniform, actorTexture, spriteSampler, spriteGroup, image, width: 0, height: 0,
        worldTexture: null, keyTexture: null, worldView: null, keyView: null, worldGroup: null, postGroup: null,
        canvasFormat };
      createdResources = [];
      const measured = this.measureExtent();
      if (measured.valid) this.resize(measured);
      device.lost.then(info => {
        if (this.device === device && !this.disposed) {
          const error = new Error(`WebGPU device lost: ${info.message}`);
          this.failure ||= error;
          this.onFailure(this.failure);
        }
      });
      return this;
    } catch (error) {
      this.failure ||= error;
      for (const value of createdResources) { try { value?.destroy(); } catch {} }
      try { this.releaseResources(); } catch {}
      try { context?.unconfigure?.(); } catch {}
      if (this.device === device) this.device = null;
      if (device) { try { device.destroy(); } catch {} }
      this.context = null;
      throw this.failure;
    }
  }

  measureExtent() { return measureExtent(this.canvas); }

  resize(measured = this.measureExtent()) {
    if (this.disposed || !this.device || !this.resources)
      return { valid: false, changed: false, reason: 'runtime-unavailable' };
    if (!measured?.valid) return { valid: false, changed: false,
      reason: measured?.reason || 'invalid-extent', extent: measured || null };
    const layoutChanged = !extentMatches(this.lastExtent, measured);
    if (layoutChanged) this.layoutGeneration++;
    const admitted = layoutChanged ? frozenExtent(measured, this.layoutGeneration) : this.lastExtent;
    if (this.canvas.width !== admitted.backingWidth) this.canvas.width = admitted.backingWidth;
    if (this.canvas.height !== admitted.backingHeight) this.canvas.height = admitted.backingHeight;
    const r = this.resources;
    const textureResize = r.width !== admitted.backingWidth || r.height !== admitted.backingHeight;
    if (textureResize) {
      const textureUsage = globalThis.GPUTextureUsage;
      let worldTexture = null, keyTexture = null;
      try {
        const descriptor = { size: { width: admitted.backingWidth, height: admitted.backingHeight },
          format: TARGET_FORMAT, usage: textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING };
        worldTexture = this.device.createTexture({ ...descriptor, label: 'Summon Zero radiance MRT' });
        keyTexture = this.device.createTexture({ ...descriptor, label: 'Summon Zero source-key MRT' });
        const worldView = worldTexture.createView(), keyView = keyTexture.createView();
        const worldGroup = this.device.createBindGroup({ layout: r.worldLayout, entries: [
          { binding: 0, resource: { buffer: r.uniform, size: 64 } }
        ] });
        const postGroup = this.device.createBindGroup({ layout: r.postLayout, entries: [
          { binding: 0, resource: { buffer: r.uniform, size: 64 } },
          { binding: 1, resource: worldView }, { binding: 2, resource: keyView }
        ] });
        const oldWorld = r.worldTexture, oldKey = r.keyTexture;
        Object.assign(r, { width: admitted.backingWidth, height: admitted.backingHeight,
          worldTexture, keyTexture, worldView, keyView, worldGroup, postGroup });
        this.lastExtent = admitted;
        this.resourceGeneration++;
        try { oldWorld?.destroy(); oldKey?.destroy(); } catch {}
      } catch (error) {
        try { worldTexture?.destroy(); keyTexture?.destroy(); } catch {}
        throw error;
      }
    } else if (layoutChanged) this.lastExtent = admitted;
    return { valid: true, changed: layoutChanged || textureResize, extent: this.lastExtent };
  }

  async draw({ receipt, nowMs, active = true, sourceEnabled = true, nearEnabled = true,
    reducedMotion = false, intensity = 1, sourceWorld = receipt?.sourceWorld,
    background = [0.014, 0.021, 0.034, 1] } = {}) {
    assert(!this.disposed && this.device && this.resources, 'Renderer not ready');
    if (!finite(nowMs) || !receipt) throw new TypeError('A frozen join receipt and caller clock are required');
    if (!Array.isArray(sourceWorld) || sourceWorld.length !== 2 || !sourceWorld.every(finite))
      throw new TypeError('A finite source position is required');
    if (!Array.isArray(background) || background.length !== 4 || !background.every(finite))
      throw new TypeError('An opaque RGBA background fixture is required');
    const measured = this.measureExtent();
    if (!measured.valid) return Object.freeze({ deferred: true, reason: measured.reason, extent: measured, proof: null });
    const allocation = this.resize(measured);
    if (!allocation.valid) return Object.freeze({ deferred: true, reason: allocation.reason, extent: measured, proof: null });
    const renderReceipt = Object.freeze({ ...receipt, sourceWorld: Object.freeze([...sourceWorld]) });
    const state = Plan.plan(renderReceipt, { nowMs, active, sourceEnabled, nearEnabled, reducedMotion, intensity });
    const r = this.resources, submittedExtent = allocation.extent;
    const submittedRuntimeGeneration = this.generation, submittedLayoutGeneration = this.layoutGeneration;
    const submittedResourceGeneration = this.resourceGeneration, submittedDevice = this.device;
    const fit = Math.min(r.width / WIDTH, r.height / HEIGHT);
    const origin = { x: (r.width - WIDTH * fit) / 2, y: (r.height - HEIGHT * fit) / 2 };
    const camera = [-origin.x / fit, -origin.y / fit];
    const view = Object.freeze({ logicalWidth: WIDTH, logicalHeight: HEIGHT,
      width: r.width, height: r.height, scale: fit, origin: Object.freeze(origin),
      camera: Object.freeze(camera), cssWidth: submittedExtent.cssWidth, cssHeight: submittedExtent.cssHeight,
      dpr: submittedExtent.usedDpr, backingWidth: r.width, backingHeight: r.height,
      layoutGeneration: submittedLayoutGeneration });
    const uniforms = Plan.packUniforms(state, { width: r.width, height: r.height, scale: fit, camera });
    this.device.queue.writeBuffer(r.uniform, 0, uniforms);

    const sourceX = sourceWorld[0], sourceY = sourceWorld[1];
    const actorScale = ACTOR_FIXTURE.visibleAlphaHeightWorld / ACTOR_ALPHA_HEIGHT;
    const actorFootX = sourceX, actorFootY = sourceY - ACTOR_FIXTURE.sourceOffsetBelowFootWorld;
    const actorLogical = { x: actorFootX - ACTOR_FIXTURE.anchorOrigin[0] * actorScale,
      y: actorFootY - ACTOR_FIXTURE.anchorOrigin[1] * actorScale,
      width: 256 * actorScale, height: 256 * actorScale };
    const spriteRect = new Float32Array([
      origin.x + actorLogical.x * fit, origin.y + actorLogical.y * fit,
      actorLogical.width * fit, actorLogical.height * fit,
      r.width, r.height, 0, 0,
      ACTOR_CELL.x / (r.image.width || r.image.naturalWidth),
      ACTOR_CELL.y / (r.image.height || r.image.naturalHeight),
      ACTOR_CELL.width / (r.image.width || r.image.naturalWidth),
      ACTOR_CELL.height / (r.image.height || r.image.naturalHeight)
    ]);
    this.device.queue.writeBuffer(r.spriteUniform, 0, spriteRect);

    const encoder = this.device.createCommandEncoder({ label: 'Preparation Summon Zero frame' });
    const worldPass = encoder.beginRenderPass({ colorAttachments: [
      { view: r.worldView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' },
      { view: r.keyView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }
    ] });
    worldPass.setPipeline(r.world); worldPass.setBindGroup(0, r.worldGroup); worldPass.draw(3); worldPass.end();
    const outputPass = encoder.beginRenderPass({ colorAttachments: [
      { view: this.context.getCurrentTexture().createView(),
        clearValue: { r: background[0], g: background[1], b: background[2], a: 1 },
        loadOp: 'clear', storeOp: 'store' }
    ] });
    outputPass.setPipeline(r.post); outputPass.setBindGroup(0, r.postGroup); outputPass.draw(3);
    outputPass.setPipeline(r.sprite); outputPass.setBindGroup(0, r.spriteGroup); outputPass.draw(6); outputPass.end();
    const frameId = ++this.frameId;
    this.device.queue.submit([encoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();
    this.completedFrameId = frameId;
    const completionExtent = this.measureExtent();
    const layoutCurrent = !this.disposed && this.device === submittedDevice && this.resources === r &&
      this.generation === submittedRuntimeGeneration && this.layoutGeneration === submittedLayoutGeneration &&
      this.resourceGeneration === submittedResourceGeneration && extentMatches(submittedExtent, completionExtent) &&
      completionExtent.actualBackingWidth === submittedExtent.backingWidth &&
      completionExtent.actualBackingHeight === submittedExtent.backingHeight;
    const proof = Object.freeze({ recorded: true, submitted: true, completed: true,
      canvasConnected: this.canvas.isConnected === true, passes: 2, submittedCommands: 3,
      viewportWidth: submittedExtent.cssWidth, viewportHeight: submittedExtent.cssHeight,
      backingWidth: submittedExtent.backingWidth, backingHeight: submittedExtent.backingHeight,
      dpr: submittedExtent.usedDpr, layoutGeneration: submittedLayoutGeneration,
      resourceGeneration: submittedResourceGeneration, runtimeGeneration: submittedRuntimeGeneration,
      frameId, eventId: receipt.causeId, effectAgeMs: state.ageMs,
      requestedAgeMs: nowMs, submittedAgeMs: state.ageMs, sourceEnabled: Boolean(sourceEnabled && state.visible),
      nearEnabled: state.nearEnabled, reducedMotion: state.reducedMotion, intensity: state.intensity,
      sourceWorld: Object.freeze([...sourceWorld]), sourceKey: 'floorLight',
      actorKind: ACTOR_FIXTURE.actorKind, actorBot: false,
      actorVisibleHeightWorld: ACTOR_FIXTURE.visibleAlphaHeightWorld,
      actorSourceSha256: ACTOR_FIXTURE.sourceSha256,
      actorDrawRect: Object.freeze({ ...actorLogical }),
      visible: state.visible, submittedExtent, completionExtent, layoutCurrent });
    this.last = Object.freeze({ receipt, state, uniforms: Array.from(uniforms), view, proof, background: [...background] });
    return this.last;
  }

  snapshot() {
    return Object.freeze({ version: Plan.EFFECT_ID, disposed: this.disposed, frameId: this.frameId,
      completedFrameId: this.completedFrameId, deviceGeneration: this.generation,
      resourceGeneration: this.resourceGeneration, layoutGeneration: this.layoutGeneration,
      extent: this.lastExtent, failure: this.failure?.message || null, last: this.last });
  }

  releaseResources() {
    const r = this.resources;
    this.resources = null;
    for (const value of [r?.worldTexture, r?.keyTexture, r?.actorTexture, r?.uniform, r?.spriteUniform]) {
      try { value?.destroy(); } catch {}
    }
    this.resourceGeneration++;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;
    this.releaseResources();
    try { this.context?.unconfigure?.(); } catch {}
    try { this.device?.destroy(); } catch {}
    this.context = null; this.device = null;
  }
}

async function loadActorImage() {
  const response = await fetch(new URL('./assets/philia-front-nine-v752.png', import.meta.url), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Pinned human actor art request failed: ${response.status}`);
  const blob = await response.blob();
  const bytes = await blob.arrayBuffer();
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto is required to verify pinned actor art bytes');
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  const hash = [...digest].map(value => value.toString(16).padStart(2, '0')).join('');
  if (hash !== ACTOR_FIXTURE.sourceSha256) throw new Error('Pinned existing human actor art hash mismatch');
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  try {
    image.src = objectUrl;
    if (image.decode) await image.decode();
    else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
  } finally { URL.revokeObjectURL(objectUrl); }
  return image;
}

const SPRITE_WGSL = `
struct U { rect:vec4f, viewport:vec4f, uv:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
struct V { @builtin(position) p:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
  var xy=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),
    vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));
  let q=xy[i]; let pixel=u.rect.xy+q*u.rect.zw;
  let clip=vec2f(pixel.x/u.viewport.x*2.-1.,1.-pixel.y/u.viewport.y*2.);
  var v:V; v.p=vec4f(clip,0.,1.); v.uv=u.uv.xy+q*u.uv.zw; return v;
}
@fragment fn fs(v:V)->@location(0) vec4f {
  return textureSample(actor,actorSampler,v.uv);
}`;

export const __test = Object.freeze({ WIDTH, HEIGHT, ACTOR_ALPHA_HEIGHT, ACTOR_CELL });
