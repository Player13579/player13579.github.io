import { SPEC, resolveReceipt, actorVisible } from './phenomenon.mjs';
import { pcm, AUDIO_PROTOCOL } from './acoustic.mjs';

const PHYSICAL_SCALE = 1.65;
const finitePositive = value => Number.isFinite(value) && value > 0;
const VERIFY_QUERY = 'verify';
const EVENT_SEEN_LIMIT = 2048;
const PCM_CACHE_LIMIT = 8;
const DEFAULT_GATES = Object.freeze({ rear: true, front: true, source: true, coverage: true, incident: true, near: true, stars: true });
const TARGET_BLEND = Object.freeze({ color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } });

const BODY_ENTRYPOINTS = `
struct ActorVertex { @builtin(position) clip:vec4f, @location(0) local:vec3f, @location(1) uv:vec2f };
@group(0) @binding(1) var actorImage:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
@vertex fn actorVertex(@builtin(vertex_index)index:u32)->ActorVertex {
 let corners=array<vec2f,6>(vec2f(-.5,-.5),vec2f(.5,-.5),vec2f(-.5,.5),vec2f(-.5,.5),vec2f(.5,-.5),vec2f(.5,.5));
 let c=corners[index];let local=vec3f(c.x*1.65*(136./225.),c.y*1.65,0.);
 let pixel=frame.anchor.xy+vec2f(local.x*frame.anchor.z,-local.y)*frame.viewport.z;
 var out:ActorVertex;out.local=local;out.uv=vec2f(c.x+.5,.5-c.y);out.clip=vec4f(2.*pixel.x/frame.viewport.x-1.,1.-2.*pixel.y/frame.viewport.y,.25,1.);return out;
}
struct ActorOutput { @location(0) colour:vec4f, @location(1) emission:vec4f };
@fragment fn actorFragment(v:ActorVertex)->ActorOutput {
 let texel=textureSample(actorImage,actorSampler,v.uv);let alpha=texel.a;
 let linearRGB=pow(max(texel.rgb,vec3f(0.)),vec3f(2.2));
 let lit=(linearRGB+receiverLight(v.local))*alpha;
 var out:ActorOutput;out.colour=vec4f(lit,alpha);out.emission=vec4f(0.,0.,0.,alpha);return out;
}
`;

function isVerifyLocation(location = globalThis.location) {
  try { return new URLSearchParams(location?.search || '').has(VERIFY_QUERY); }
  catch { return false; }
}

function actorSnapshot(actor) {
  if (!actor || typeof actor.id !== 'string' || !actor.id) return null;
  return Object.freeze({ id: actor.id, alive: actor.alive, ejected: actor.ejected,
    inVent: actor.inVent, visible: actor.visible !== false, mirror: actor.mirror === -1 ? -1 : 1,
    centerPxX: actor.centerPxX, centerPxY: actor.centerPxY,
    bodyHphysical: actor.bodyHphysical, canvasWidthPx: actor.canvasWidthPx,
    canvasHeightPx: actor.canvasHeightPx, dpr: actor.dpr });
}

export class StaminaRuntime {
  constructor({ canvas, verify, gpu = globalThis.navigator?.gpu, fetchImpl = globalThis.fetch?.bind(globalThis),
    createImageBitmapImpl = globalThis.createImageBitmap?.bind(globalThis), AudioContextImpl = globalThis.AudioContext,
    documentRef = globalThis.document, windowRef = globalThis.window, locationRef = globalThis.location,
    assetUrl = new URL('../../../../public/assets/generated/sophia-front-five-v753.png', import.meta.url),
    autoStart = true, preview = false } = {}) {
    if (!canvas) throw new TypeError('canvas is required');
    this.canvas = canvas;
    this.verify = Boolean(verify === true || isVerifyLocation(locationRef));
    this.gpu = gpu;
    this.fetchImpl = fetchImpl;
    this.createImageBitmapImpl = createImageBitmapImpl;
    this.AudioContextImpl = AudioContextImpl;
    this.document = documentRef;
    this.window = windowRef;
    this.location = locationRef;
    this.assetUrl = assetUrl;
    this.autoStart = autoStart;
    this.preview = Boolean(preview);
    this.context = null;
    this.device = null;
    this.adapter = null;
    this.format = null;
    this.ready = false;
    this.failed = false;
    this.failure = '';
    this.disposed = false;
    this.frameNo = 0;
    this.firstSubmitted = false;
    this.lastSubmitAt = null;
    this.compilationMessages = [];
    this.submittedActor = null;
    this.activeReceipt = null;
    this.previewStartAt = null;
    this.previewCycle = -1;
    this.gates = { ...DEFAULT_GATES };
    this.verifySilence = this.verify;
    this.verifyBackgroundLinear = [0, 0, 0];
    this.audioContext = null;
    this.audioMaster = null;
    this.audioUnlocked = false;
    this.audioVoices = new Map();
    this.audioSeen = new Set();
    this.audioSeenOrder = [];
    this.pcmCache = new Map();
    this.audioStartRecords = [];
    this.audioContextCount = 0;
    this.receiptSeen = new Set();
    this.receiptSeenOrder = [];
    this.raf = 0;
    this.resizeObserver = null;
    this._boundResize = () => this.resize();
    this._boundVisibility = () => { if (this.document?.hidden) this.cancelAllVoices(); };
    this._boundPageHide = () => this.dispose();
    this.window?.addEventListener?.('pagehide', this._boundPageHide, { once: true });
    this.renderedFrame = null;
    if (this.verify) this.gates = { ...DEFAULT_GATES };
  }

  async boot() {
    if (this.disposed) throw new Error('runtime disposed');
    try {
      if (!this.gpu || typeof this.gpu.requestAdapter !== 'function') throw new Error('WebGPU unavailable');
      if (!this.fetchImpl || !this.createImageBitmapImpl) throw new Error('shader/image loader unavailable');
      this.adapter = await this.gpu.requestAdapter();
      if (!this.adapter) throw new Error('WebGPU adapter unavailable');
      this.device = await this.adapter.requestDevice();
      this.device.lost?.then(info => this.handleDeviceLost(info));
      const context = this.canvas.getContext('webgpu');
      if (!context) throw new Error('WebGPU canvas context unavailable');
      this.context = context;
      this.format = this.gpu.getPreferredCanvasFormat?.() || 'bgra8unorm';
      this.resize();
      context.configure({ device: this.device, format: this.format, alphaMode: 'opaque' });
      const [worldText, observeText, imageResponse] = await Promise.all([
        this.fetchText(new URL('./world.wgsl', import.meta.url)),
        this.fetchText(new URL('./observe.wgsl', import.meta.url)),
        this.fetchImpl(this.assetUrl)
      ]);
      if (!imageResponse?.ok) throw new Error(`actor fixture unavailable (${imageResponse?.status ?? 'fetch'})`);
      const imageBitmap = await this.createImageBitmapImpl(await imageResponse.blob(), 62, 15, 136, 225);
      if (imageBitmap.width !== 136 || imageBitmap.height !== 225) throw new Error('actor fixture crop dimensions changed');
      this.worldModule = this.device.createShaderModule({ label: 'stamina-r12-world-source', code: worldText + BODY_ENTRYPOINTS });
      this.observeModule = this.device.createShaderModule({ label: 'stamina-r12-observation', code: observeText });
      await this.collectCompilationInfo(this.worldModule, 'world');
      await this.collectCompilationInfo(this.observeModule, 'observe');
      this.actorTexture = this.device.createTexture({ label: 'stamina-r12-original-actor-crop',
        size: [136, 225, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      this.device.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: this.actorTexture, colorSpace: 'srgb' }, [136, 225]);
      imageBitmap.close?.();
      this.actorSampler = this.device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
      this.frameBuffer = this.device.createBuffer({ label: 'stamina-r12-frame-64-byte-abi', size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      this.observeBuffer = this.device.createBuffer({ label: 'stamina-r12-observation-32-byte-abi', size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      this.createPipelines();
      this.createBindGroups();
      this.ensureTargets();
      this.ready = true;
      this.failed = false;
      this.failure = '';
      if (this.autoStart) this.start();
      return this;
    } catch (error) {
      this.failed = true;
      this.failure = error?.message || String(error);
      this.ready = false;
      if (this.autoStart) this.publishSnapshot();
      return this;
    }
  }

  async fetchText(url) {
    const response = await this.fetchImpl(url);
    if (!response?.ok) throw new Error(`shader unavailable (${url}): ${response?.status ?? 'fetch'}`);
    return response.text();
  }

  async collectCompilationInfo(module, label) {
    if (typeof module.getCompilationInfo !== 'function') return;
    const info = await module.getCompilationInfo();
    const messages = [...(info?.messages || [])].map(message => ({ type: message.type,
      message: message.message, lineNum: message.lineNum, linePos: message.linePos }));
    this.compilationMessages.push({ label, messages });
    const error = messages.find(message => message.type === 'error');
    if (error) throw new Error(`${label} WGSL compile: ${error.message}`);
  }

  createPipelines() {
    const module = this.worldModule;
    const targets = [0, 1].map(() => ({ format: 'rgba16float', blend: { color: { ...TARGET_BLEND.color }, alpha: { ...TARGET_BLEND.alpha } } }));
    this.frameGroupLayout = this.device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }
    ] });
    const fieldLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.frameGroupLayout] });
    this.fieldLayout = fieldLayout;
    this.fieldRearPipeline = this.device.createRenderPipeline({ label: 'stamina-r12-rear-volume', layout: fieldLayout,
      vertex: { module, entryPoint: 'fieldVertex' }, fragment: { module, entryPoint: 'fieldRear', targets }, primitive: { topology: 'triangle-list' } });
    this.fieldFrontPipeline = this.device.createRenderPipeline({ label: 'stamina-r12-front-volume', layout: fieldLayout,
      vertex: { module, entryPoint: 'fieldVertex' }, fragment: { module, entryPoint: 'fieldFront', targets }, primitive: { topology: 'triangle-list' } });
    const bodyGroupLayout = this.device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } }
    ] });
    const bodyLayout = this.device.createPipelineLayout({ bindGroupLayouts: [bodyGroupLayout] });
    this.bodyPipeline = this.device.createRenderPipeline({ label: 'stamina-r12-original-body-receiver', layout: bodyLayout,
      vertex: { module, entryPoint: 'actorVertex' }, fragment: { module, entryPoint: 'actorFragment', targets }, primitive: { topology: 'triangle-list' } });
    const observeGroupLayout = this.device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d' } }
    ] });
    const observeLayout = this.device.createPipelineLayout({ bindGroupLayouts: [observeGroupLayout] });
    this.observePipeline = this.device.createRenderPipeline({ label: 'stamina-r12-source-bound-observation', layout: observeLayout,
      vertex: { module: this.observeModule, entryPoint: 'fullscreen' }, fragment: { module: this.observeModule, entryPoint: 'observeComposite', targets: [{ format: this.format }] }, primitive: { topology: 'triangle-list' } });
    this.bodyGroupLayout = bodyGroupLayout;
    this.observeGroupLayout = observeGroupLayout;
  }

  createBindGroups() {
    this.frameBindGroup = this.device.createBindGroup({ layout: this.frameGroupLayout, entries: [{ binding: 0, resource: { buffer: this.frameBuffer } }] });
    this.bodyBindGroup = this.device.createBindGroup({ layout: this.bodyGroupLayout, entries: [
      { binding: 0, resource: { buffer: this.frameBuffer } }, { binding: 1, resource: this.actorTexture.createView() },
      { binding: 2, resource: this.actorSampler }
    ] });
  }

  ensureTargets() {
    const width = this.canvas.width, height = this.canvas.height;
    if (!(width > 0 && height > 0)) return false;
    if (this.targets?.width === width && this.targets?.height === height) return true;
    this.targets?.colour?.destroy?.(); this.targets?.source?.destroy?.();
    const usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
    const colour = this.device.createTexture({ label: 'stamina-r12-linear-world', size: [width, height, 1], format: 'rgba16float', usage });
    const source = this.device.createTexture({ label: 'stamina-r12-actual-emission-source', size: [width, height, 1], format: 'rgba16float', usage });
    this.targets = { width, height, colour, source };
    this.observeBindGroup = this.device.createBindGroup({ layout: this.observeGroupLayout, entries: [
      { binding: 0, resource: { buffer: this.observeBuffer } }, { binding: 1, resource: colour.createView() },
      { binding: 2, resource: source.createView() }
    ] });
    return true;
  }

  resize() {
    const dpr = finitePositive(this.window?.devicePixelRatio) ? this.window.devicePixelRatio : 1;
    const cssWidth = this.canvas.clientWidth || this.canvas.width || 0;
    const cssHeight = this.canvas.clientHeight || this.canvas.height || 0;
    if (!finitePositive(cssWidth) || !finitePositive(cssHeight)) return false;
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    let changed = false;
    if (this.canvas.width !== width) { this.canvas.width = width; changed = true; }
    if (this.canvas.height !== height) { this.canvas.height = height; changed = true; }
    if (changed && this.device && this.ready) this.ensureTargets();
    return true;
  }

  createActorFrame({ actor, centerPxX, centerPxY, bodyHphysical, canvasWidthPx, canvasHeightPx, dpr, mirror } = {}) {
    const a = actorSnapshot(actor);
    const frame = { actor: a, centerPxX, centerPxY, bodyHphysical, canvasWidthPx, canvasHeightPx, dpr, mirror: mirror === -1 ? -1 : 1 };
    if (!a || !actorVisible(a) || ![centerPxX, centerPxY, bodyHphysical, canvasWidthPx, canvasHeightPx, dpr].every(Number.isFinite) ||
        !finitePositive(bodyHphysical) || !finitePositive(canvasWidthPx) || !finitePositive(canvasHeightPx) || !finitePositive(dpr) ||
        canvasWidthPx !== this.canvas.width || canvasHeightPx !== this.canvas.height) return null;
    return Object.freeze(frame);
  }

  setSubmittedFrame(frame) {
    this.submittedActor = this.createActorFrame(frame);
    if (!this.submittedActor) this.cancelAllVoices();
    return Boolean(this.submittedActor);
  }

  applyActor(snapshot) {
    // An actor sample alone never starts a main layer or voice.
    return this.setSubmittedFrame(snapshot);
  }

  acceptEvent(event, actor, { serverNowMs = Date.now(), receivedAt = this.now() } = {}) {
    if (!Number.isFinite(serverNowMs) || !Number.isFinite(receivedAt)) return null;
    const receipt = resolveReceipt(event, actor, this.receiptSeen);
    if (!receipt) return null;
    this.receiptSeenOrder.push(`event:${receipt.eventId}`, `outcome:${receipt.outcomeId}`);
    while (this.receiptSeenOrder.length > EVENT_SEEN_LIMIT * 2) this.receiptSeen.delete(this.receiptSeenOrder.shift());
    this.activeReceipt = Object.freeze({ ...receipt, receivedAt,
      ageAtReceive: Math.max(0, (serverNowMs - receipt.at) / 1000), kind: 'game' });
    return this.activeReceipt;
  }

  setGates(gates = {}) {
    for (const name of Object.keys(DEFAULT_GATES)) if (typeof gates[name] === 'boolean') this.gates[name] = gates[name];
    return Object.freeze({ ...this.gates });
  }

  now() { return this.window?.performance?.now?.() ?? globalThis.performance?.now?.() ?? Date.now(); }

  start() {
    if (this.disposed || !this.ready || this.raf) return false;
    if (this.resizeObserver || this.window?.ResizeObserver) {
      const ResizeObserverImpl = this.window?.ResizeObserver || globalThis.ResizeObserver;
      if (ResizeObserverImpl) { this.resizeObserver = new ResizeObserverImpl(this._boundResize); this.resizeObserver.observe(this.canvas); }
    }
    this.window?.addEventListener?.('resize', this._boundResize);
    this.document?.addEventListener?.('visibilitychange', this._boundVisibility);
    const tick = time => { this.raf = 0; if (this.disposed) return; this.step(Number.isFinite(time) ? time : this.now()); this.raf = this.window?.requestAnimationFrame?.(tick) ?? 0; };
    this.raf = this.window?.requestAnimationFrame?.(tick) ?? 0;
    return true;
  }

  async activateFromGesture() {
    if (this.verify || this.disposed || !this.AudioContextImpl) return false;
    this.audioUnlocked = true;
    try {
      if (!this.audioContext) {
        this.audioContext = new this.AudioContextImpl();
        this.audioContextCount += 1;
        this.audioMaster = this.audioContext.createGain();
        this.audioMaster.gain.value = 1;
        this.audioMaster.connect(this.audioContext.destination);
      }
      if (this.audioContext.state !== 'running') await this.audioContext.resume();
      return this.audioContext.state === 'running';
    } catch { return false; }
  }

  previewState(now) {
    if (this.previewStartAt === null) this.previewStartAt = now;
    const cycleMs = SPEC.defaultDurationMs + SPEC.previewGapMs;
    const elapsed = Math.max(0, now - this.previewStartAt);
    const cycle = Math.floor(elapsed / cycleMs);
    const ageMs = elapsed - cycle * cycleMs;
    if (cycle !== this.previewCycle) this.previewCycle = cycle;
    return { cycle, ageMs, live: ageMs < SPEC.defaultDurationMs,
      durationMs: SPEC.defaultDurationMs, cause: `preview:${cycle}` };
  }

  step(now = this.now()) {
    const submittedActor = this.submittedActor;
    this.submittedActor = null;
    if (!this.ready || this.disposed || this.failed || !Number.isFinite(now)) return false;
    if (this.document?.hidden) { this.cancelAllVoices(); return false; }
    this.resize();
    if (!this.ensureTargets()) return false;
    const preview = this.preview ? this.previewState(now) : { kind: 'idle', cycle: -1, ageMs: 0,
      live: false, durationMs: SPEC.defaultDurationMs, cause: '' };
    let source = { ...preview, kind: this.preview ? 'preview' : 'idle' };
    if (this.activeReceipt?.kind === 'game') {
      source = { kind: 'game', cycle: -1, ageMs: (this.activeReceipt.ageAtReceive + Math.max(0, now - this.activeReceipt.receivedAt) / 1000) * 1000,
        live: true, durationMs: this.activeReceipt.durationMs, cause: `outcome:${this.activeReceipt.outcomeId}` };
    }
    const actorFrame = submittedActor || this.previewActorFrame();
    const sameActor = source.kind !== 'game' || actorFrame?.actor?.id === this.activeReceipt?.actorId;
    const currentDpr = this.window?.devicePixelRatio || 1;
    const sameViewport = source.kind !== 'game' || Boolean(actorFrame &&
      actorFrame.canvasWidthPx === this.canvas.width && actorFrame.canvasHeightPx === this.canvas.height && actorFrame.dpr === currentDpr);
    const visible = source.kind !== 'game' || Boolean(sameActor && sameViewport && actorFrame && actorVisible(actorFrame.actor));
    const eventLive = source.kind === 'game' ? source.ageMs < source.durationMs : source.live;
    const active = Boolean(actorFrame && visible && eventLive && source.ageMs >= 0);
    if (source.kind === 'game') source = { ...source, live: active };
    const bodyHphysical = actorFrame?.bodyHphysical ?? 64 * (this.window?.devicePixelRatio || 1);
    const dpr = actorFrame?.dpr ?? currentDpr;
    const centerX = actorFrame?.centerPxX ?? this.canvas.width / 2;
    const centerY = actorFrame?.centerPxY ?? this.canvas.height / 2;
    const mirror = actorFrame?.mirror ?? 1;
    const durationMs = source.durationMs;
    const clock = new Float32Array([Math.max(0, source.ageMs) / 1000, durationMs / 1000, active ? 1 : 0, 0]);
    const frameData = new Float32Array([
      this.canvas.width, this.canvas.height, bodyHphysical / PHYSICAL_SCALE, dpr,
      centerX, centerY, mirror, 0,
      ...clock,
      this.gates.source ? 1 : 0, this.gates.coverage ? 1 : 0, this.gates.incident ? 1 : 0, 0
    ]);
    const observeData = new Float32Array([this.canvas.width, this.canvas.height, dpr, 0,
      this.gates.near ? 1 : 0, this.gates.stars ? 1 : 0, 0, 0]);
    this.device.queue.writeBuffer(this.frameBuffer, 0, frameData);
    this.device.queue.writeBuffer(this.observeBuffer, 0, observeData);
    try {
      const encoder = this.device.createCommandEncoder({ label: 'stamina-r12-frame' });
      this.encodeWorld(encoder, this.gates);
      this.encodeObservation(encoder);
      this.device.queue.submit([encoder.finish()]);
      this.frameNo += 1;
      this.firstSubmitted = true;
      this.lastSubmitAt = now;
      this.renderedFrame = Object.freeze({ frameNo: this.frameNo, at: now, active, ageMs: source.ageMs,
        durationMs, cause: source.cause, actorId: actorFrame?.actor?.id || '' });
      try { this.syncAudioAfterSubmit(source, active, now); }
      catch (error) { this.failure = `audio runtime: ${error?.message || String(error)}`; this.cancelAllVoices(); }
      this.publishSnapshot();
      return true;
    } catch (error) {
      this.failure = error?.message || String(error);
      this.cancelAllVoices();
      this.publishSnapshot();
      return false;
    }
  }

  previewActorFrame() {
    return Object.freeze({ actor: Object.freeze({ id: 'r12-preview-actor', alive: true, visible: true, ejected: false, inVent: false }),
      centerPxX: this.canvas.width / 2, centerPxY: this.canvas.height / 2,
      bodyHphysical: 64 * (this.window?.devicePixelRatio || 1), canvasWidthPx: this.canvas.width,
      canvasHeightPx: this.canvas.height, dpr: this.window?.devicePixelRatio || 1, mirror: 1 });
  }

  setVerifyBackground(hex) {
    if (!this.verify || typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return false;
    this.verifyBackgroundLinear = [1, 3, 5].map(offset => Math.pow(parseInt(hex.slice(offset, offset + 2), 16) / 255, 2.2));
    return true;
  }

  encodeWorld(encoder, gates) {
    const views = [this.targets.colour.createView(), this.targets.source.createView()];
    const [r, g, b] = this.verify && this.verifyBackgroundLinear ? this.verifyBackgroundLinear : [0, 0, 0];
    const clear = [
      { view: views[0], loadOp: 'clear', storeOp: 'store', clearValue: { r, g, b, a: 1 } },
      { view: views[1], loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }
    ];
    let pass = encoder.beginRenderPass({ label: 'stamina-r12-clear-world', colorAttachments: clear });
    if (gates.rear) { pass.setPipeline(this.fieldRearPipeline); pass.setBindGroup(0, this.frameBindGroup); pass.draw(6); }
    pass.end();
    pass = encoder.beginRenderPass({ label: 'stamina-r12-original-body', colorAttachments: views.map(view => ({ view, loadOp: 'load', storeOp: 'store' })) });
    pass.setPipeline(this.bodyPipeline); pass.setBindGroup(0, this.bodyBindGroup); pass.draw(6); pass.end();
    if (gates.front) {
      pass = encoder.beginRenderPass({ label: 'stamina-r12-front-world', colorAttachments: views.map(view => ({ view, loadOp: 'load', storeOp: 'store' })) });
      pass.setPipeline(this.fieldFrontPipeline); pass.setBindGroup(0, this.frameBindGroup); pass.draw(6); pass.end();
    }
  }

  encodeObservation(encoder) {
    const pass = encoder.beginRenderPass({ label: 'stamina-r12-source-bound-observation', colorAttachments: [{
      view: this.context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 }
    }] });
    pass.setPipeline(this.observePipeline); pass.setBindGroup(0, this.observeBindGroup); pass.draw(3); pass.end();
  }

  pcmBuffer(durationMs, sampleRate) {
    const key = `${durationMs}:${sampleRate}`;
    if (this.pcmCache.has(key)) return this.pcmCache.get(key);
    const samples = pcm(durationMs, sampleRate);
    const buffer = this.audioContext.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    const entry = { buffer, durationSeconds: samples.length / sampleRate, samples: samples.length };
    this.pcmCache.set(key, entry);
    while (this.pcmCache.size > PCM_CACHE_LIMIT) this.pcmCache.delete(this.pcmCache.keys().next().value);
    return entry;
  }

  rememberAudioCause(cause) {
    if (this.audioSeen.has(cause)) return false;
    this.audioSeen.add(cause); this.audioSeenOrder.push(cause);
    while (this.audioSeenOrder.length > EVENT_SEEN_LIMIT) this.audioSeen.delete(this.audioSeenOrder.shift());
    return true;
  }

  syncAudioAfterSubmit(source, active, now) {
    if (this.verify) return;
    const cause = source?.cause;
    const audioAgeMs = Math.max(0, source?.ageMs || 0) + Math.max(0, this.now() - now);
    const liveAtStart = Boolean(active && audioAgeMs < source?.durationMs);
    if (!liveAtStart || !cause || !source.durationMs || this.document?.hidden) { this.cancelAllVoices(); return; }
    if (!this.audioUnlocked) return;
    if (this.audioContext?.state !== 'running') { this.cancelAllVoices(); return; }
    if (this.audioVoices.has(cause) || this.audioSeen.has(cause)) return;
    for (const [oldCause, voice] of [...this.audioVoices]) if (oldCause !== cause) this.cancelVoice(oldCause, voice);
    const entry = this.pcmBuffer(source.durationMs, this.audioContext.sampleRate);
    const startAgeMs = Math.max(0, source.ageMs || 0) + Math.max(0, this.now() - now);
    const offset = startAgeMs / 1000;
    if (!(startAgeMs < source.durationMs && offset < entry.durationSeconds)) return;
    const gain = this.audioContext.createGain();
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = entry.buffer; sourceNode.loop = false;
    gain.gain.value = 1; sourceNode.connect(gain); gain.connect(this.audioMaster);
    try {
      sourceNode.start(0, offset, Math.max(0, entry.durationSeconds - offset));
      if (!this.rememberAudioCause(cause)) { try { sourceNode.stop(); } catch {} return; }
      const voice = { source: sourceNode, gain, cause, startOffset: offset, sampleRate: this.audioContext.sampleRate };
      this.audioVoices.set(cause, voice);
      this.audioStartRecords.push(Object.freeze({ cause, offset, rate: 1, durationSeconds: entry.durationSeconds, samples: entry.samples, at: now }));
      if (this.audioStartRecords.length > EVENT_SEEN_LIMIT) this.audioStartRecords.shift();
      sourceNode.onended = () => this.releaseVoice(cause, voice);
    } catch { try { sourceNode.disconnect(); gain.disconnect(); } catch {} }
  }

  releaseVoice(cause, voice) {
    if (this.audioVoices.get(cause) === voice) this.audioVoices.delete(cause);
    try { voice.source.disconnect(); voice.gain.disconnect(); } catch {}
  }

  cancelVoice(cause, voice) {
    const context = this.audioContext;
    if (!voice || !context) return;
    const now = context.currentTime;
    if (this.audioVoices.get(cause) === voice) this.audioVoices.delete(cause);
    try { voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + .025); voice.source.stop(now + .03); }
    catch { this.releaseVoice(cause, voice); }
  }

  cancelAllVoices() { for (const [cause, voice] of [...this.audioVoices]) this.cancelVoice(cause, voice); }

  publishSnapshot() {
    const snapshot = this.snapshot();
    try { if (this.window) this.window.__staminaR12 = snapshot; } catch {}
    return snapshot;
  }

  snapshot() {
    return Object.freeze({ id: SPEC.id, verify: this.verify, gpuReady: this.ready, firstSubmitted: this.firstSubmitted,
      phase: this.activeReceipt ? 'event' : this.ready ? 'preview' : 'boot', frames: this.frameNo,
      adapter: this.adapter?.info?.description || this.adapter?.info?.device || '', error: this.failure,
      compilationMessages: this.compilationMessages.map(item => ({ label: item.label, messages: item.messages.map(m => ({ ...m })) })),
      audio: Object.freeze({ contexts: this.verify ? 0 : this.audioContextCount, starts: this.verify ? [] : this.audioStartRecords.map(item => ({ ...item })),
        activeVoices: this.verify ? 0 : this.audioVoices.size, unlocked: this.verify ? false : this.audioUnlocked, mute: this.verify }),
      current: this.renderedFrame ? { ...this.renderedFrame } : null });
  }

  handleDeviceLost(info) {
    if (this.disposed) return;
    this.ready = false; this.failed = true; this.failure = `device lost: ${info?.message || info?.reason || 'unknown'}`;
    this.cancelAllVoices(); this.publishSnapshot(); void this.dispose();
  }

  async dispose() {
    if (this.disposed) return;
    this.disposed = true; this.ready = false;
    if (this.raf) this.window?.cancelAnimationFrame?.(this.raf);
    this.raf = 0; this.resizeObserver?.disconnect?.(); this.resizeObserver = null;
    this.window?.removeEventListener?.('resize', this._boundResize);
    this.window?.removeEventListener?.('pagehide', this._boundPageHide);
    this.document?.removeEventListener?.('visibilitychange', this._boundVisibility);
    this.cancelAllVoices();
    for (const texture of [this.targets?.colour, this.targets?.source, this.actorTexture]) texture?.destroy?.();
    this.frameBuffer?.destroy?.(); this.observeBuffer?.destroy?.();
    try { this.context?.unconfigure?.(); } catch {}
    try { if (!this.verify && this.audioContext?.state !== 'closed') await this.audioContext?.close?.(); } catch {}
    try { this.device?.destroy?.(); } catch {}
    this.publishSnapshot();
  }
}

export async function createStaminaRuntime(options = {}) {
  const runtime = new StaminaRuntime(options);
  await runtime.boot();
  return runtime;
}

export const verifySilenceContract = AUDIO_PROTOCOL.verify;

