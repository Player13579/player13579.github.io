import { DURATION_MS, dischargeChannels } from './channels.mjs';
import { PSF_RADIUS, PSF_SIGMA, PSF_GAIN, PSF_WEIGHTS as DESIGN_PSF_WEIGHTS } from './optical-design.mjs';

const GPU_FORMAT = 'rgba16float';
const PSF_WEIGHTS = Object.freeze([...DESIGN_PSF_WEIGHTS]);
const PSF_WGSL = PSF_WEIGHTS.map(weight => Number(weight).toPrecision(12)).join(', ');

const SOURCE_SHADER = /* wgsl */`
struct U { size: vec2f, count: f32, sourceOn: f32, observerOn: f32, sourceX: f32, sourceY: f32, pad: f32 };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> seg: array<vec4f>;
struct V { @builtin(position) p: vec4f, @location(0) local: vec2f, @location(1) power: f32, @location(2) width: f32 };
@vertex fn vs(@builtin(vertex_index) vi:u32, @builtin(instance_index) ii:u32) -> V {
  let ends = seg[ii * 2u];
  let segmentMeta = seg[ii * 2u + 1u];
  let d = ends.zw - ends.xy;
  let n = normalize(vec2f(-d.y, d.x));
  let side = select(-1.0, 1.0, (vi & 1u) == 1u);
  let end = select(0.0, 1.0, (vi & 2u) != 0u);
  let pos = mix(ends.xy, ends.zw, end) + n * side * max(segmentMeta.x, 0.3) * 2.4;
  var o: V;
  o.p = vec4f(pos.x / u.size.x * 2.0 - 1.0, 1.0 - pos.y / u.size.y * 2.0, 0.0, 1.0);
  o.local = vec2f(end, side);
  o.power = segmentMeta.y;
  o.width = segmentMeta.x;
  return o;
}
@fragment fn fs(i: V) -> @location(0) vec4f {
  let edge = abs(i.local.y);
  let sheath = exp(-edge * edge * 2.2);
  let core = exp(-edge * edge * 22.0);
  let radiance = (vec3f(0.22, 0.16, 1.0) * sheath * 0.46 +
    vec3f(1.0, 0.96, 0.86) * core) * i.power * u.sourceOn;
  return vec4f(radiance, max(max(radiance.r, radiance.g), radiance.b));
}`;

const BLUR_SHADER = /* wgsl */`
struct Blur { size: vec2f, enabled: f32, pad0: f32, axis: vec2f, pad1: vec2f };
@group(0) @binding(0) var<uniform> blur: Blur;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
const PSF_WEIGHTS: array<f32, 17> = array<f32, 17>(${PSF_WGSL});
@vertex fn blurVs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}
@fragment fn blurFs(@builtin(position) p: vec4f) -> @location(0) vec4f {
  let dims = vec2i(textureDimensions(sourceTexture));
  let hi = max(dims - vec2i(1), vec2i(0));
  let center = clamp(vec2i(p.xy), vec2i(0), hi);
  let step = vec2i(round(blur.axis));
  var sum = vec4f(0.0);
  for (var tap: i32 = -${PSF_RADIUS}; tap <= ${PSF_RADIUS}; tap += 1) {
    let at = clamp(center + step * tap, vec2i(0), hi);
    sum += textureLoad(sourceTexture, at, 0) * PSF_WEIGHTS[u32(tap + ${PSF_RADIUS})];
  }
  return sum * blur.enabled;
}`;

const DISPLAY_SHADER = /* wgsl */`
struct U { size: vec2f, count: f32, sourceOn: f32, observerOn: f32, sourceX: f32, sourceY: f32, pad: f32 };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> seg: array<vec4f>;
struct Display { observerOn: f32, scatterGain: f32, pad0: f32, pad1: f32 };
@group(1) @binding(0) var<uniform> display: Display;
@group(1) @binding(1) var directEmission: texture_2d<f32>;
@group(1) @binding(2) var scatteredEmission: texture_2d<f32>;
@vertex fn screenVs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}
@fragment fn screenFs(@builtin(position) p: vec4f) -> @location(0) vec4f {
  let dims = min(vec2i(textureDimensions(directEmission)), vec2i(u.size));
  let at = clamp(vec2i(p.xy), vec2i(0), max(dims - vec2i(1), vec2i(0)));
  let direct = textureLoad(directEmission, at, 0).rgb;
  let scatter = textureLoad(scatteredEmission, at, 0).rgb;
  let radiance = max(direct + display.scatterGain * scatter * display.observerOn, vec3f(0.0));
  let mapped = radiance / (vec3f(1.0) + radiance);
  let encoded = select(12.92 * mapped,
    1.055 * pow(mapped, vec3f(1.0 / 2.4)) - 0.055, mapped > vec3f(0.0031308));
  return vec4f(encoded, 1.0);
}`;

function formatSize(width, height) { return `${width}x${height}`; }
function destroyTargetSet(targets) {
  if (!targets) return;
  for (const texture of [targets.emission, targets.horizontal, targets.vertical]) texture?.destroy?.();
}

export class DischargeRuntime {
  #canvas; #gpu; #now; #devicePromise; #device; #context; #queue; #targets; #size = '';
  #disposed = false; #lost = false; #generation = 0; #requestSequence = 0; #cause = null;
  #sequence = 0; #lastReceipt = null; #resources = []; #renderChain = Promise.resolve();
  #disposePromise = null; #deviceLostPromise = Promise.resolve();
  #sourcePipeline; #blurPipeline; #displayPipeline; #uniform; #storage; #displayUniform;
  #horizontalUniform; #verticalUniform; #mainBindLayout; #blurBindLayout; #displayBindLayout;

  constructor({ canvas, gpu = globalThis.navigator?.gpu, now = () => performance.now() } = {}) {
    this.#canvas = canvas; this.#gpu = gpu; this.#now = now;
  }
  get ready() { return !!this.#device && !this.#disposed && !this.#lost; }
  get durationMs() { return DURATION_MS; }
  get lastReceipt() { return this.#lastReceipt; }

  async #popScope(device, open) {
    if (!open.value) return null;
    open.value = false;
    return await device.popErrorScope();
  }
  async #checkScope(device, open) {
    const error = await this.#popScope(device, open);
    if (error) throw error;
  }
  async #compilation(module, label) {
    const info = await module.getCompilationInfo();
    const errors = (info.messages || []).filter(message => message.type === 'error');
    if (errors.length) throw new Error(`${label} WGSL compilation failed: ${errors.map(message => message.message).join('; ')}`);
  }

  async #init() {
    if (this.#disposed) throw new Error('runtime disposed');
    if (this.#lost) throw new Error('WebGPU device lost');
    if (this.#devicePromise) return this.#devicePromise;
    this.#devicePromise = (async () => {
      let device = null;
      const scope = { value: false };
      let scopeError = null;
      try {
        if (!this.#gpu || !this.#canvas) throw new Error('WebGPU canvas unavailable');
        const adapter = await this.#gpu.requestAdapter();
        if (!adapter) throw new Error('WebGPU adapter unavailable');
        device = await adapter.requestDevice();
        this.#device = device; this.#queue = device.queue;
        this.#context = this.#canvas.getContext('webgpu');
        if (!this.#context) throw new Error('WebGPU context unavailable');
        if (device.lost?.then) this.#deviceLostPromise = device.lost.then(() => {
          if (!this.#disposed) { this.#lost = true; this.#generation++; this.#requestSequence++; this.#cause = null; this.#lastReceipt = null; }
        });
        device.pushErrorScope('validation'); scope.value = true;
        const sourceCode = device.createShaderModule({ code: SOURCE_SHADER });
        const blurCode = device.createShaderModule({ code: BLUR_SHADER });
        const displayCode = device.createShaderModule({ code: DISPLAY_SHADER });
        await Promise.all([
          this.#compilation(sourceCode, 'source emission'),
          this.#compilation(blurCode, 'Gaussian PSF'),
          this.#compilation(displayCode, 'display')
        ]);
        const mainVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
        this.#mainBindLayout = device.createBindGroupLayout({ entries: [
          { binding: 0, visibility: mainVisibility, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } }
        ] });
        this.#blurBindLayout = device.createBindGroupLayout({ entries: [
          { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d' } }
        ] });
        this.#displayBindLayout = device.createBindGroupLayout({ entries: [
          { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d' } },
          { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d' } }
        ] });
        const sourceLayout = device.createPipelineLayout({ bindGroupLayouts: [this.#mainBindLayout] });
        const blurLayout = device.createPipelineLayout({ bindGroupLayouts: [this.#blurBindLayout] });
        const displayLayout = device.createPipelineLayout({ bindGroupLayouts: [this.#mainBindLayout, this.#displayBindLayout] });
        this.#sourcePipeline = device.createRenderPipeline({ layout: sourceLayout,
          vertex: { module: sourceCode, entryPoint: 'vs' }, fragment: { module: sourceCode, entryPoint: 'fs', targets: [{
            format: GPU_FORMAT, blend: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'max' } }
          }] }, primitive: { topology: 'triangle-strip' } });
        this.#blurPipeline = device.createRenderPipeline({ layout: blurLayout,
          vertex: { module: blurCode, entryPoint: 'blurVs' }, fragment: { module: blurCode, entryPoint: 'blurFs',
            targets: [{ format: GPU_FORMAT }] }, primitive: { topology: 'triangle-list' } });
        this.#displayPipeline = device.createRenderPipeline({ layout: displayLayout,
          vertex: { module: displayCode, entryPoint: 'screenVs' }, fragment: { module: displayCode,
            entryPoint: 'screenFs', targets: [{ format: this.#gpu.getPreferredCanvasFormat() }] },
          primitive: { topology: 'triangle-list' } });
        this.#uniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); this.#resources.push(this.#uniform);
        this.#storage = device.createBuffer({ size: 128 * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }); this.#resources.push(this.#storage);
        this.#displayUniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); this.#resources.push(this.#displayUniform);
        this.#horizontalUniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); this.#resources.push(this.#horizontalUniform);
        this.#verticalUniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); this.#resources.push(this.#verticalUniform);
        await this.#checkScope(device, scope);
        if (this.#disposed || this.#lost) throw new Error(this.#disposed ? 'runtime disposed' : 'WebGPU device lost');
        this.#context.configure({ device, format: this.#gpu.getPreferredCanvasFormat(), alphaMode: 'premultiplied' });
        return device;
      } catch (error) {
        if (device && scope.value) { try { scopeError = await this.#popScope(device, scope); } catch { /* Preserve the first failure. */ } }
        this.#releaseOwned(device); this.#devicePromise = null;
        throw scopeError || error;
      }
    })();
    return this.#devicePromise;
  }

  #releaseOwned(device = this.#device) {
    try { this.#context?.unconfigure?.(); } catch { /* Device teardown continues. */ }
    destroyTargetSet(this.#targets); this.#targets = null; this.#size = '';
    for (const resource of this.#resources) resource.destroy?.();
    this.#resources = [];
    device?.destroy?.();
    if (this.#device === device) {
      this.#device = null; this.#queue = null; this.#context = null;
      this.#sourcePipeline = null; this.#blurPipeline = null; this.#displayPipeline = null;
      this.#uniform = null; this.#storage = null; this.#displayUniform = null;
      this.#horizontalUniform = null; this.#verticalUniform = null;
    }
  }
  #createTargetSet(device, width, height, size) {
    const textures = [];
    try {
      const create = () => {
        const texture = device.createTexture({ size: [width, height], format: GPU_FORMAT,
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
        textures.push(texture); return texture;
      };
      return { size, emission: create(), horizontal: create(), vertical: create() };
    } catch (error) {
      for (const texture of textures) texture.destroy?.();
      throw error;
    }
  }

  start(cause) {
    if (this.#disposed) throw new Error('runtime disposed');
    if (!cause || cause.id == null) throw new TypeError('cause id required');
    this.#generation++; this.#requestSequence++;
    this.#cause = { ...cause, startedAt: this.#now() }; this.#lastReceipt = null;
    return this.#generation;
  }
  stop() {
    this.#generation++; this.#requestSequence++; this.#cause = null; this.#lastReceipt = null;
  }
  render(options = {}) {
    const request = ++this.#requestSequence;
    this.#lastReceipt = null;
    const run = this.#renderChain.then(() => this.#render(options, request));
    this.#renderChain = run.catch(() => {});
    return run;
  }
  #current(request, generation, cause) {
    return !this.#disposed && !this.#lost && request === this.#requestSequence &&
      generation === this.#generation && cause === this.#cause;
  }
  async #render(options = {}, request) {
    const generation = this.#generation, cause = this.#cause, device = await this.#init();
    if (!this.#current(request, generation, cause)) { await this.#clear(device); return null; }
    const sourceVisible = options.sourceVisible === true, targetVisible = options.targetVisible === true;
    const ageMs = options.ageMs;
    const sourceEmission = options.sourceEmission !== false && options.sourceEmission !== 0;
    const observerScatter = options.observerScatter !== false && options.observerScatter !== 0;
    if (!cause || !sourceVisible || !targetVisible || !Number.isFinite(ageMs) || ageMs < 0 ||
        ageMs >= DURATION_MS || !sourceEmission) {
      this.#lastReceipt = null; await this.#clear(device); return null;
    }
    const { source, target, seed = 1, actorHeight = 64, reducedMotion = false,
      verify = false, view = 1 } = options;
    const width = Math.max(1, Math.round(this.#canvas.width));
    const height = Math.max(1, Math.round(this.#canvas.height));
    if (!Number.isFinite(view) || view <= 0) throw new RangeError('view must be positive');
    const controls = Object.freeze({ sourceVisible, targetVisible, sourceEmission: true,
      observerScatter, verify: !!verify, view });
    const channels = dischargeChannels({ ageMs, source, target, seed, actorHeight, reducedMotion,
      sourceVisible, targetVisible });
    if (!channels.length) { this.#lastReceipt = null; await this.#clear(device); return null; }
    const submission = ++this.#sequence, submittedAt = this.#now(), size = formatSize(width, height);
    const scope = { value: false };
    let pendingTargets = null, submitted = false;
    device.pushErrorScope('validation'); scope.value = true;
    try {
      if (size !== this.#size) {
        await this.#queue.onSubmittedWorkDone();
        if (!this.#current(request, generation, cause)) { await this.#clear(device); return null; }
        pendingTargets = this.#createTargetSet(device, width, height, size);
      }
      const targets = pendingTargets || this.#targets;
      if (!targets) throw new Error('render target set unavailable');
      const emissionView = targets.emission.createView();
      const horizontalView = targets.horizontal.createView();
      const verticalView = targets.vertical.createView();
      const instances = new Float32Array(128 * 8); instances.set(channels);
      this.#queue.writeBuffer(this.#storage, 0, instances);
      this.#queue.writeBuffer(this.#uniform, 0, new Float32Array([
        width, height, channels.length / 8, 1, observerScatter ? 1 : 0,
        source[0], source[1], 0
      ]));
      this.#queue.writeBuffer(this.#horizontalUniform, 0, new Float32Array([
        width, height, observerScatter ? 1 : 0, 0, 1, 0, 0, 0
      ]));
      this.#queue.writeBuffer(this.#verticalUniform, 0, new Float32Array([
        width, height, observerScatter ? 1 : 0, 0, 0, 1, 0, 0
      ]));
      this.#queue.writeBuffer(this.#displayUniform, 0, new Float32Array([
        observerScatter ? 1 : 0, PSF_GAIN, 0, 0
      ]));

      const mainGroup = device.createBindGroup({ layout: this.#mainBindLayout, entries: [
        { binding: 0, resource: { buffer: this.#uniform } },
        { binding: 1, resource: { buffer: this.#storage } }
      ] });
      const horizontalGroup = device.createBindGroup({ layout: this.#blurBindLayout, entries: [
        { binding: 0, resource: { buffer: this.#horizontalUniform } },
        { binding: 1, resource: emissionView }
      ] });
      const verticalGroup = device.createBindGroup({ layout: this.#blurBindLayout, entries: [
        { binding: 0, resource: { buffer: this.#verticalUniform } },
        { binding: 1, resource: horizontalView }
      ] });
      const displayGroup = device.createBindGroup({ layout: this.#displayBindLayout, entries: [
        { binding: 0, resource: { buffer: this.#displayUniform } },
        { binding: 1, resource: emissionView },
        { binding: 2, resource: verticalView }
      ] });

      const encoder = device.createCommandEncoder();
      const sourcePass = encoder.beginRenderPass({ colorAttachments: [{ view: emissionView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
      sourcePass.setPipeline(this.#sourcePipeline); sourcePass.setBindGroup(0, mainGroup);
      sourcePass.draw(4, channels.length / 8); sourcePass.end();
      const horizontalPass = encoder.beginRenderPass({ colorAttachments: [{ view: horizontalView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
      horizontalPass.setPipeline(this.#blurPipeline); horizontalPass.setBindGroup(0, horizontalGroup);
      horizontalPass.draw(3); horizontalPass.end();
      const verticalPass = encoder.beginRenderPass({ colorAttachments: [{ view: verticalView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
      verticalPass.setPipeline(this.#blurPipeline); verticalPass.setBindGroup(0, verticalGroup);
      verticalPass.draw(3); verticalPass.end();
      const canvasView = this.#context.getCurrentTexture().createView();
      const displayPass = encoder.beginRenderPass({ colorAttachments: [{ view: canvasView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
      displayPass.setPipeline(this.#displayPipeline); displayPass.setBindGroup(0, mainGroup);
      displayPass.setBindGroup(1, displayGroup); displayPass.draw(3); displayPass.end();
      this.#queue.submit([encoder.finish()]); submitted = true;
      const results = await Promise.allSettled([
        this.#queue.onSubmittedWorkDone(), this.#popScope(device, scope)
      ]);
      const rejected = results.find(result => result.status === 'rejected');
      if (rejected) { if (results[0].status === 'rejected') await this.#deviceLostPromise; throw rejected.reason; }
      if (results[1].value) throw results[1].value;
      if (!this.#current(request, generation, cause)) { await this.#clear(device); return null; }
      if (pendingTargets) {
        const oldTargets = this.#targets;
        this.#targets = pendingTargets; this.#size = size; pendingTargets = null;
        destroyTargetSet(oldTargets);
      }
      const receipt = Object.freeze({ causeId: cause.id, generation, submission, submitted: true,
        completed: true, mainFrameVisible: true, drawn: true, visibleToListener: true,
        sourceTargetVisible: true, submittedAt, completedAt: this.#now(), ageMs, controls });
      this.#lastReceipt = receipt;
      return receipt;
    } catch (error) {
      this.#lastReceipt = null;
      if (scope.value) { try { await this.#popScope(device, scope); } catch { /* Preserve the render error. */ } }
      if (!this.#disposed && !this.#lost) { try { await this.#clear(device); } catch { /* Preserve the render error. */ } }
      throw error;
    } finally {
      if (scope.value) { try { await this.#popScope(device, scope); } catch { /* Scope cleanup is best effort. */ } }
      destroyTargetSet(pendingTargets);
      if (submitted && this.#disposed) this.#lastReceipt = null;
    }
  }

  async #clear(device) {
    if (this.#disposed || this.#lost || !this.#context) return;
    const scope = { value: false };
    device.pushErrorScope('validation'); scope.value = true;
    try {
      const encoder = device.createCommandEncoder();
      for (const texture of [this.#targets?.emission, this.#targets?.horizontal, this.#targets?.vertical]) {
        if (!texture) continue;
        const pass = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
        pass.end();
      }
      const canvasView = this.#context.getCurrentTexture().createView();
      const display = encoder.beginRenderPass({ colorAttachments: [{ view: canvasView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
      display.end(); this.#queue.submit([encoder.finish()]);
      const results = await Promise.allSettled([
        this.#queue.onSubmittedWorkDone(), this.#popScope(device, scope)
      ]);
      const rejected = results.find(result => result.status === 'rejected');
      if (rejected) throw rejected.reason;
      if (results[1].value) throw results[1].value;
    } finally {
      if (scope.value) { try { await this.#popScope(device, scope); } catch { /* Scope cleanup is best effort. */ } }
    }
  }

  async dispose() {
    if (this.#disposePromise) return this.#disposePromise;
    this.#disposed = true; this.#generation++; this.#requestSequence++;
    this.#cause = null; this.#lastReceipt = null;
    this.#disposePromise = (async () => {
      try { await this.#renderChain; await this.#queue?.onSubmittedWorkDone(); }
      catch { try { await this.#deviceLostPromise; } catch { /* Device loss already ended queue ownership. */ } }
      this.#releaseOwned(this.#device);
    })();
    return this.#disposePromise;
  }
}

export function audioEligible(receipt, { verify = false, muted = false, played = new Set() } = {}) {
  if (verify || receipt?.controls?.verify || muted || !receipt?.completed ||
      !receipt.sourceTargetVisible || !receipt.controls?.sourceEmission || !receipt.causeId ||
      played.has(receipt.causeId)) return false;
  played.add(receipt.causeId);
  return true;
}

export const opticalContract = Object.freeze({ radius: PSF_RADIUS, sigma: PSF_SIGMA,
  gain: PSF_GAIN, weights: PSF_WEIGHTS });
