import { ABI, buildFrame, validateScissor } from './artist/artist.mjs';
import { VibeCauses, DURATION_E_MS } from './artist/lifecycle.mjs';
import { programFor, PROGRAMS } from './artist/programs.mjs';
import { eligibleCues, renderCue, SCORE } from './artist/sfx.mjs';

const WORLD = await fetch(new URL('./artist/world.wgsl', import.meta.url)).then(r => {
  if (!r.ok) throw new Error(`Vibe r2 world shader fetch failed (${r.status})`);
  return r.text();
});
const OPTICS = await fetch(new URL('./artist/optics.wgsl', import.meta.url)).then(r => {
  if (!r.ok) throw new Error(`Vibe r2 optics shader fetch failed (${r.status})`);
  return r.text();
});

const TARGET_FORMAT = 'rgba16float';
const BLEND_OVER = Object.freeze({
  color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
});
const BLEND_ADD = Object.freeze({
  color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
  alpha: { srcFactor: 'zero', dstFactor: 'one', operation: 'add' }
});

function requireFinite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}
function requireSize(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 || width > 0xffffffff || height > 0xffffffff)
    throw new RangeError('Vibe r2 attachment dimensions must be positive UInt32 integers');
}
function makeModule(device, label, code) {
  return device.createShaderModule({ label, code });
}

function createBodyShaders() {
  return `
struct BodyFrame { viewport:vec2f, origin:vec2f, axisX:vec2f, axisY:vec2f, crop:vec4f, misc:vec4f };
@group(0) @binding(0) var<uniform> u:BodyFrame;
@group(0) @binding(1) var atlas:texture_2d<f32>;
@group(0) @binding(2) var atlasSampler:sampler;
@group(0) @binding(3) var transport:texture_2d<f32>;
@group(0) @binding(4) var transportSampler:sampler;
struct VOut { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {
  let q=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1))[i];
  let p=u.origin+q.x*u.axisX+q.y*u.axisY; var o:VOut;
  o.position=vec4f(p/u.viewport*vec2f(2,-2)+vec2f(-1,1),0,1); o.uv=u.crop.xy+q*u.crop.zw; return o;
}
struct Out { @location(0) scene:vec4f, @location(1) source:vec4f };
@fragment fn fs(v:VOut)->Out {
  let texel=textureSampleLevel(atlas,atlasSampler,v.uv,0); let a=texel.a*u.misc.x;
  let received=textureSampleLevel(transport,transportSampler,v.position.xy/u.viewport,0).rgb*a;
  var o:Out; o.scene=vec4f(texel.rgb*a+received,a); o.source=vec4f(0,0,0,a); return o;
}
@fragment fn mask(v:VOut)->Out {
  let a=textureSampleLevel(atlas,atlasSampler,v.uv,0).a*u.misc.x;
  var o:Out; o.scene=vec4f(0,0,0,0); o.source=vec4f(0,0,0,a); return o;
}`;
}

function createCopyShader() {
  return `
@group(0) @binding(0) var source:texture_2d<f32>;
@group(0) @binding(1) var linearSampler:sampler;
struct Vary { @builtin(position) p:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Vary {
  let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[i]; var o:Vary;
  o.p=vec4f(p,0,1); o.uv=p*vec2f(.5,-.5)+vec2f(.5); return o;
}
fn encode(x:vec3f)->vec3f {
  let c=clamp(x,vec3f(0),vec3f(1));
  return select(c*12.92,1.055*pow(c,vec3f(1.0/2.4))-vec3f(.055),c>vec3f(.0031308));
}
@fragment fn fs(v:Vary)->@location(0) vec4f {
  let c=textureSampleLevel(source,linearSampler,v.uv,0).rgb;
  return vec4f(encode(c),1);
}`;
}

function bindPipeline(device, layout, shader, vertex, fragment, formats, blend = BLEND_OVER) {
  const module = makeModule(device, shader, vertex);
  const entries = formats.map(format => ({ format, blend }));
  return device.createRenderPipelineAsync({
    label: shader,
    layout,
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: fragment, targets: entries },
    primitive: { topology: 'triangle-list' }
  });
}

function makeTexture(device, label, width, height, usage) {
  return device.createTexture({ label, size: { width, height, depthOrArrayLayers: 1 }, format: TARGET_FORMAT, usage });
}

const TEX_USAGE = (globalThis.GPUTextureUsage?.RENDER_ATTACHMENT ?? 0x10) |
  (globalThis.GPUTextureUsage?.TEXTURE_BINDING ?? 0x04) |
  (globalThis.GPUTextureUsage?.COPY_SRC ?? 0x01);
const BUFFER_UNIFORM = globalThis.GPUBufferUsage?.UNIFORM ?? 0x40;
const BUFFER_STORAGE = globalThis.GPUBufferUsage?.STORAGE ?? 0x80;
const BUFFER_COPY_DST = globalThis.GPUBufferUsage?.COPY_DST ?? 0x08;

/**
 * GPU capability for the frozen r2 artist ABI. This deliberately accepts host-owned
 * scene/body callbacks; it does not guess a game renderer hook or fabricate an actor.
 * A frame is cell-local and every attachment/scissor is validated against that cell.
 */
export class VibeR2Host {
  constructor({ device, context, canvas, format, onError = console.error, audioContext = null, configureContext = true } = {}) {
    if (!device?.createCommandEncoder || !device?.queue?.submit) throw new TypeError('A live WebGPU device is required');
    if (!context?.getCurrentTexture || !canvas) throw new TypeError('A registered WebGPU canvas context is required');
    this.device = device; this.context = context; this.canvas = canvas;
    this.format = format || navigator.gpu.getPreferredCanvasFormat();
    if (configureContext) context.configure?.({ device, format: this.format, alphaMode: 'opaque' });
    this.onError = onError; this.audioContext = audioContext;
    this.causes = new VibeCauses(); this.targets = new Map(); this.generation = 1;
    this.disposed = false; this.lost = false; this.inflight = new Set(); this.maxInflight = 3;
    this.played = new Map(); this.audioNodes = new Map(); this.buffers = new Set(); this.textures = new Set();
    this.audioAllowed = !(typeof location !== 'undefined' && new URLSearchParams(location.search).has('verify'));
    this.retirements = [];
    this.status = { phase: 'initializing', submissions: 0, completedProofs: 0, lastError: null };
    this.diagnosticPromises = [];
    this._uncaptured = event => { event.preventDefault?.(); if (!this.disposed && !this.lost) this._fatal(event.error || new Error('Uncaptured WebGPU validation error')); };
    this.device.addEventListener?.('uncapturederror', this._uncaptured);
    this.device.lost?.then(info => this._deviceLost(info)).catch(error => this._fatal(error));
    this.ready = this._initialize();
  }

  async _initialize() {
    try {
      const d = this.device;
      const worldModule = makeModule(d, 'Vibe r2 authored world shader', WORLD);
      const opticsModule = makeModule(d, 'Vibe r2 authored optics shader', OPTICS);
      const bodyModule = makeModule(d, 'Vibe r2 host actual-body adapter', createBodyShaders());
      const copyModule = makeModule(d, 'Vibe r2 linear output adapter', createCopyShader());
      this._observeShader(worldModule, 'world'); this._observeShader(opticsModule, 'optics');
      this._observeShader(bodyModule, 'body adapter'); this._observeShader(copyModule, 'output adapter');
      this.worldBGL = d.createBindGroupLayout({ entries: [
        { binding: 0, visibility: 3, buffer: { type: 'uniform' } },
        { binding: 1, visibility: 3, buffer: { type: 'read-only-storage' } }
      ] });
      this.opticsBGL = d.createBindGroupLayout({ entries: [
        { binding: 0, visibility: 2, buffer: { type: 'uniform' } },
        { binding: 1, visibility: 2, texture: { sampleType: 'float' } },
        { binding: 2, visibility: 2, sampler: { type: 'filtering' } }
      ] });
      this.bodyBGL = d.createBindGroupLayout({ entries: [
        { binding: 0, visibility: 3, buffer: { type: 'uniform' } },
        { binding: 1, visibility: 2, texture: { sampleType: 'float' } },
        { binding: 2, visibility: 2, sampler: { type: 'filtering' } },
        { binding: 3, visibility: 2, texture: { sampleType: 'float' } },
        { binding: 4, visibility: 2, sampler: { type: 'filtering' } }
      ] });
      this.copyBGL = d.createBindGroupLayout({ entries: [
        { binding: 0, visibility: 2, texture: { sampleType: 'float' } },
        { binding: 1, visibility: 2, sampler: { type: 'filtering' } }
      ] });
      this.worldLayout = d.createPipelineLayout({ bindGroupLayouts: [this.worldBGL] });
      this.opticsLayout = d.createPipelineLayout({ bindGroupLayouts: [this.opticsBGL] });
      this.bodyLayout = d.createPipelineLayout({ bindGroupLayouts: [this.bodyBGL] });
      this.copyLayout = d.createPipelineLayout({ bindGroupLayouts: [this.copyBGL] });
      const worldTargets = [TARGET_FORMAT, TARGET_FORMAT].map(format => ({ format, blend: BLEND_OVER }));
      const opticsTarget = [{ format: TARGET_FORMAT }];
      const bodyTargets = worldTargets;
      const copyTargets = [{ format: this.format }];
      const make = (module, fragment, layout, targets, label, blend) => d.createRenderPipelineAsync({
        label, layout, vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: fragment, targets: targets.map(target => ({ ...target, ...(blend ? { blend } : {}) })) },
        primitive: { topology: 'triangle-list' }
      });
      this.pipelines = await Promise.all([
        make(worldModule, 'fs', this.worldLayout, worldTargets, 'Vibe r2 strokes'),
        make(opticsModule, 'blur', this.opticsLayout, opticsTarget, 'Vibe r2 linear blur'),
        make(opticsModule, 'observe', this.opticsLayout, [{ format: TARGET_FORMAT, blend: BLEND_ADD }], 'Vibe r2 observer', BLEND_ADD),
        make(bodyModule, 'fs', this.bodyLayout, bodyTargets, 'Vibe r2 actual body'),
        make(bodyModule, 'mask', this.bodyLayout, bodyTargets, 'Vibe r2 body coverage'),
        make(copyModule, 'fs', this.copyLayout, copyTargets, 'Vibe r2 final output encode')
      ]);
      if (this.disposed || this.lost) throw new Error('Vibe r2 host terminated during initialization');
      this.status.phase = 'ready'; this.readyDone = true; return this;
    } catch (error) {
      this._fatal(error); throw error;
    }
  }

  accept(raw, owner, basis, origin = 'game') {
    if (this.disposed || this.lost) throw new Error('Vibe r2 host is not live');
    const cause = this.causes.accept(raw, owner, basis, origin);
    if (cause && !this.played.has(cause.key)) this.played.set(cause.key, new Set());
    return cause;
  }

  cancel(key) { this.generation++; this.causes.cancel(key); this.played.delete(key); this._stopCauseAudio(key); }
  cancelAll() { this.generation++; this.causes.cancelAll(); this.played.clear(); for (const key of this.audioNodes.keys()) this._stopCauseAudio(key); }
  setPlaybackRate(key, rate) {
    if (!Number.isFinite(rate) || rate < 0 || rate > 12) throw new RangeError('Actor playback rate must be within 0..12');
    this._setCauseRate(key, rate);
  }

  _allocate(key, width, height) {
    requireSize(width, height);
    const prev = this.targets.get(key);
    if (prev?.width === width && prev.height === height && !prev.retired) return prev;
    if (prev) this._retire(prev);
    const usage = TEX_USAGE;
    const target = { key, width, height, generation: this.generation, retired: false, textures: [] };
    const make = label => {
      const texture = makeTexture(this.device, `vibe-r2:${key}:${label}:${width}x${height}`, width, height, usage);
      target.textures.push(texture); this.textures.add(texture); return texture;
    };
    try {
      target.scene = make('scene'); target.signal = make('source-signal');
      target.preScene = make('source-prepass-scene'); target.preSignal = make('source-prepass');
      target.nearX = make('receiver-blur-x'); target.nearY = make('receiver-transport');
      target.obsX = make('observer-blur-x'); target.obsY = make('observer-output');
      target.frameUniform = this._buffer('frame-uniform', 32, BUFFER_UNIFORM | BUFFER_COPY_DST);
      target.opticsUniforms = Array.from({length:5},(_,slot)=>this._buffer(`optics-uniform-${slot}`, 32, BUFFER_UNIFORM | BUFFER_COPY_DST));
      target.bodyUniform = this._buffer('body-uniform', 64, BUFFER_UNIFORM | BUFFER_COPY_DST);
      target.rearBuffer = null; target.rearBytes = 0; target.frontBuffer = null; target.frontBytes = 0;
      target.linearSampler = this.device.createSampler({ addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge', magFilter: 'linear', minFilter: 'linear' });
      this.targets.set(key, target); return target;
    } catch (error) { this._retire(target); throw error; }
  }

  _buffer(label, size, usage) {
    const buffer = this.device.createBuffer({ label: `vibe-r2:${label}`, size, usage });
    this.buffers.add(buffer); return buffer;
  }
  _observeShader(module, label) {
    const check = Promise.resolve(module.getCompilationInfo?.()).then(info => {
      const errors = info?.messages?.filter(message => message.type === 'error') ?? [];
      if (errors.length) this._fatal(new Error(`Vibe r2 ${label} WGSL compilation failed: ${errors.map(x => x.message).join('\n')}`));
    }, error => this._fatal(new Error(`Vibe r2 ${label} shader diagnostics failed: ${error?.message || error}`)));
    this.diagnosticPromises.push(check);
  }
  _retire(target, immediate = false) {
    if (!target || target.retired) return;
    target.retired = true; this.targets.delete(target.key);
    const cleanup = () => this._destroyTarget(target);
    if (!immediate && target.lastUse) {
      const retirement = Promise.resolve(target.lastUse).then(cleanup, cleanup);
      this.retirements.push(retirement);
    } else cleanup();
  }
  _destroyTarget(target) {
    for (const texture of target.textures) { try { texture.destroy(); } catch {} this.textures.delete(texture); }
    for (const uniform of target.opticsUniforms || []) { try { uniform.destroy(); } catch {} this.buffers.delete(uniform); }
    for (const name of ['frameUniform', 'bodyUniform']) if (target[name]) {
      try { target[name].destroy(); } catch {} this.buffers.delete(target[name]);
    }
    for (const name of ['rearBuffer', 'frontBuffer']) if (target[name]) {
      try { target[name].destroy(); } catch {} this.buffers.delete(target[name]);
    }
  }

  _writeFrame(target, origin, hPixels) {
    const f = new Float32Array([target.width, target.height, origin[0], origin[1], hPixels, 0, 0, 0]);
    this.device.queue.writeBuffer(target.frameUniform, 0, f);
  }
  _writeOptics(target, axis, hPixels, gain, spreadH, slot) {
    const b = new ArrayBuffer(32); const u = new Uint32Array(b); const i = new Int32Array(b); const f = new Float32Array(b);
    u[0] = target.width; u[1] = target.height; i[2] = axis[0]; i[3] = axis[1];
    f[4] = hPixels; f[5] = gain; f[6] = spreadH; f[7] = 0;
    this.device.queue.writeBuffer(target.opticsUniforms[slot], 0, b);
  }
  _uploadStrokes(target, items, slot, label) {
    if (!items.length) return null;
    const bytes = items.byteLength;
    const bufferKey = `${slot}Buffer`, bytesKey = `${slot}Bytes`;
    if (!target[bufferKey] || target[bytesKey] < bytes) {
      const old = target[bufferKey];
      target[bufferKey] = this._buffer(`${label}-strokes`, Math.max(4, 2 ** Math.ceil(Math.log2(bytes))), BUFFER_STORAGE | BUFFER_COPY_DST);
      target[bytesKey] = Math.max(4, 2 ** Math.ceil(Math.log2(bytes)));
      if (old) Promise.resolve(this.device.queue.onSubmittedWorkDone?.()).finally(() => {
        try { old.destroy(); } catch {} this.buffers.delete(old);
      });
    }
    const buffer = target[bufferKey];
    this.device.queue.writeBuffer(buffer, 0, items);
    return { buffer, count: items.length / 12 };
  }
  _worldGroup(target, strokes) {
    return this.device.createBindGroup({ layout: this.worldBGL, entries: [
      { binding: 0, resource: { buffer: target.frameUniform } },
      { binding: 1, resource: { buffer: strokes.buffer } }
    ] });
  }
  _textureView(texture) { return texture.createView(); }
  _opticsGroup(target, source, slot) {
    return this.device.createBindGroup({ layout: this.opticsBGL, entries: [
      { binding: 0, resource: { buffer: target.opticsUniforms[slot] } },
      { binding: 1, resource: this._textureView(source) }, { binding: 2, resource: target.linearSampler }
    ] });
  }
  _bodyGroup(target, body) {
    const u = new Float32Array(16);
    u.set([target.width, target.height, ...body.originPx, ...body.axisX, ...body.axisY, ...body.crop, body.opacity]);
    this.device.queue.writeBuffer(target.bodyUniform, 0, u);
    return this.device.createBindGroup({ layout: this.bodyBGL, entries: [
      { binding: 0, resource: { buffer: target.bodyUniform } },
      { binding: 1, resource: body.view }, { binding: 2, resource: body.sampler },
      { binding: 3, resource: this._textureView(target.nearY) }, { binding: 4, resource: target.linearSampler }
    ] });
  }
  _pass(encoder, label, textures, clear = true) {
    const pass = encoder.beginRenderPass({ label, colorAttachments: textures.map(texture => ({
      view: this._textureView(texture), loadOp: clear ? 'clear' : 'load', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 }
    })) });
    pass.setViewport(0, 0, textures[0] ? textures[0].width ?? 0 : 0, textures[0] ? textures[0].height ?? 0 : 0, 0, 1);
    return pass;
  }
  _drawStrokes(pass, pipeline, target, strokes, rect, label) {
    if (!strokes?.count) return;
    const scissor = validateScissor(rect, target.width, target.height);
    pass.setPipeline(pipeline); pass.setBindGroup(0, this._worldGroup(target, strokes));
    pass.setScissorRect(...scissor); pass.draw(6, strokes.count);
    this._lastPass = { label, width: target.width, height: target.height, scissor };
  }
  _blur(encoder, target, source, dest, axis, hPixels, spreadH, gain = 1, slot) {
    this._writeOptics(target, axis, hPixels, gain, spreadH, slot);
    const pass = encoder.beginRenderPass({ label: `vibe-r2:blur:${axis.join(',')}`, colorAttachments: [{
      view: this._textureView(dest), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 }
    }] });
    pass.setPipeline(this.pipelines[1]); pass.setBindGroup(0, this._opticsGroup(target, source, slot)); pass.draw(3); pass.end();
  }

  /**
   * Record one already-admitted cause in one registered comparison cell. The caller
   * must freshness-check producer events before calling accept(); rendering never
   * promotes a late first-observation event into a live cause.
   * Required host callback: drawBase(pass,{sourceOnly,viewport,owner,cause}). It must
   * synchronously record current same-cell scene solids/background in painter order.
   * The host itself performs one actual body material draw plus a separate alpha-only
   * source-mask pass from the same registered atlas/crop/affine. Body `originPx`,
   * `axisX`, `axisY`, normalized `crop`, and `opacity` are copied from the current
   * registered body command; the affine maps the unit quad to logical device pixels.
   * `rect` and `cellRect` are UInt32 device-pixel scissors. `owner`/`basis` are sampled afresh.
   */
  recordCell(input) {
    if (!this.readyDone) return this.ready.then(() => this._recordCell(input));
    return this._recordCell(input);
  }
  _recordCell({ key, owner, basis, origin = 'game', width, height, rect = [0, 0, width, height],
    cellRect = [0, 0, width, height], originPx, cameraScale, body, reducedMotion = false,
    drawBase, currentness = () => true, onCue = null, sourceOn = true, observerOn = true }) {
    if (this.disposed || this.lost || this.status.phase === 'fatal') throw new Error('Vibe r2 host is not live');
    if (typeof drawBase !== 'function') throw new TypeError('Current scene callback is required');
    const scissor = validateScissor(rect, width, height);
    validateScissor(cellRect, this.canvas.width, this.canvas.height);
    if (width !== cellRect[2] || height !== cellRect[3]) throw new RangeError('Cell-local attachment size must exactly match its canvas cell');
    requireFinite(cameraScale, 'cameraScale'); if (cameraScale <= 0) throw new RangeError('cameraScale must be positive');
    if (!Array.isArray(originPx) || originPx.length !== 2 || !originPx.every(Number.isFinite)) throw new TypeError('Current projected actor origin is required');
    if (!body?.view || !body?.sampler || !Array.isArray(body.originPx) || body.originPx.length !== 2 ||
      !Array.isArray(body.axisX) || body.axisX.length !== 2 || !Array.isArray(body.axisY) || body.axisY.length !== 2 ||
      !Array.isArray(body.crop) || body.crop.length !== 4 ||
      ![...body.originPx, ...body.axisX, ...body.axisY, ...body.crop, body.opacity].every(Number.isFinite) ||
      (body.axisX[0] === 0 && body.axisX[1] === 0) || (body.axisY[0] === 0 && body.axisY[1] === 0) ||
      body.opacity < 0 || body.opacity > 1) throw new TypeError('Registered actual sprite affine/crop/opacity is required');
    if (Math.abs(body.axisX[0] * body.axisY[1] - body.axisX[1] * body.axisY[0]) < 1e-8)
      throw new RangeError('Registered actor pose affine is singular');
    const [u, v, uw, vh] = body.crop;
    if (Math.min(u, u + uw) < 0 || Math.max(u, u + uw) > 1 || Math.min(v, v + vh) < 0 || Math.max(v, v + vh) > 1)
      throw new RangeError('Current actor UV crop lies outside its registered atlas');
    if (!this.causes.active.has(key)) return { submitted: false, reason: 'cause-not-admitted' };
    const sample = this.causes.sample(key, owner, basis);
    if (!sample) { this.played.delete(key); this._stopCauseAudio(key); return { submitted: false, reason: 'cause-not-current' }; }
    if (sample.origin !== origin) return { submitted: false, reason: 'cause-origin-mismatch' };
    const hPixels = sample.hWorld * cameraScale;
    const generated = buildFrame({ causeKey: sample.key, programLines: sample.program.lines,
      ageMs: sample.ageMs, durationMs: DURATION_E_MS, reducedMotion });
    if(!sourceOn) { generated.rear=new Float32Array(); generated.front=new Float32Array(); }
    const target = this._allocate(key, width, height); this._writeFrame(target, originPx, hPixels);
    const rear = this._uploadStrokes(target, generated.rear, 'rear', `${key}:rear:${target.generation}`);
    const front = this._uploadStrokes(target, generated.front, 'front', `${key}:front:${target.generation}`);
    const encoder = this.device.createCommandEncoder({ label: `vibe-r2:${sample.key}:${sample.ageMs}` });
    const generation = this.generation, targetGeneration = target.generation;
    try {
      // Source-only prepass uses current solids, rear strokes and actual body alpha.
      let pass = this._pass(encoder, 'vibe-r2:source-prepass', [target.preScene, target.preSignal]);
      const sourceBaseResult = drawBase(pass, { sourceOnly: true, viewport: [width, height], owner, cause: sample });
      if (sourceBaseResult?.then) { sourceBaseResult.catch?.(() => {}); throw new TypeError('drawBase must record synchronously'); }
      this._drawStrokes(pass, this.pipelines[0], target, rear, scissor, 'rear-source-prepass');
      pass.setPipeline(this.pipelines[4]); pass.setBindGroup(0, this._bodyGroup(target, body));
      pass.setScissorRect(...scissor); pass.draw(6, 1);
      this._drawStrokes(pass, this.pipelines[0], target, front, scissor, 'front-source-prepass');
      pass.end();
      this._blur(encoder, target, target.preSignal, target.nearX, [1, 0], hPixels, .10, 1, 0);
      this._blur(encoder, target, target.nearX, target.nearY, [0, 1], hPixels, .10, 1, 1);
      // The ordinary scene is drawn with one actual body material draw between rear/front.
      pass = this._pass(encoder, 'vibe-r2:scene-and-source', [target.scene, target.signal]);
      const sceneBaseResult = drawBase(pass, { sourceOnly: false, viewport: [width, height], owner, cause: sample });
      if (sceneBaseResult?.then) { sceneBaseResult.catch?.(() => {}); throw new TypeError('drawBase must record synchronously'); }
      this._drawStrokes(pass, this.pipelines[0], target, rear, scissor, 'rear');
      pass.setPipeline(this.pipelines[3]); pass.setBindGroup(0, this._bodyGroup(target, body));
      pass.setScissorRect(...scissor); pass.draw(6, 1);
      this._drawStrokes(pass, this.pipelines[0], target, front, scissor, 'front'); pass.end();
      this._blur(encoder, target, target.signal, target.obsX, [1, 0], hPixels, .020, 1, 2);
      this._blur(encoder, target, target.obsX, target.obsY, [0, 1], hPixels, .020, .18, 3);
      pass = encoder.beginRenderPass({ label: 'vibe-r2:observer-addition', colorAttachments: [{
        view: this._textureView(target.scene), loadOp: 'load', storeOp: 'store'
      }] });
      this._writeOptics(target, [0, 0], hPixels, observerOn ? .18 : 0, .020, 4);
      pass.setPipeline(this.pipelines[2]); pass.setBindGroup(0, this._opticsGroup(target, target.obsY, 4));
      pass.setScissorRect(...scissor); pass.draw(3); pass.end();
      const output = this.context.getCurrentTexture();
      const fullOutput = cellRect[0] === 0 && cellRect[1] === 0 && cellRect[2] === this.canvas.width && cellRect[3] === this.canvas.height;
      pass = encoder.beginRenderPass({ label: 'vibe-r2:single-final-scene-encode', colorAttachments: [{
        view: output.createView(), loadOp: fullOutput ? 'clear' : 'load', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 }
      }] });
      const copyGroup = this.device.createBindGroup({ layout: this.copyBGL, entries: [
        { binding: 0, resource: this._textureView(target.scene) }, { binding: 1, resource: target.linearSampler }
      ] });
      pass.setViewport(...cellRect, 0, 1); pass.setScissorRect(...cellRect);
      pass.setPipeline(this.pipelines[5]); pass.setBindGroup(0, copyGroup); pass.draw(3); pass.end();
      this.device.queue.submit([encoder.finish()]);
      this.status.submissions++; this.status.phase = 'submitted';
    } catch (error) { this._fatal(error); throw error; }
    const fence = Promise.resolve(this.device.queue.onSubmittedWorkDone?.());
    target.lastUse = fence;
    const proof = this._trackProof({ sample, owner, basis, generation, targetGeneration, target, currentness, onCue, fence });
    return { submitted: true, phase: generated.phase, ageEms: sample.ageMs, statement: sample.program.statement,
      variant: sample.program.exactVariant, proof };
  }

  _trackProof({ sample, owner, basis, generation, targetGeneration, target, currentness, onCue, fence }) {
    if (this.inflight.size >= this.maxInflight) return Promise.resolve({ accepted: false, reason: 'proof-capacity' });
    const token = { generation, targetGeneration, key: sample.key }; this.inflight.add(token);
    const proof = fence.then(() => {
      const live = !this.disposed && !this.lost && this.generation === generation && !target.retired &&
        target.generation === targetGeneration && currentness() === true;
      if (!live) return { accepted: false, reason: 'stale' };
      const now = this.causes.sample(sample.key, owner, basis);
      if (!now) { this.played.delete(sample.key); this._stopCauseAudio(sample.key); return { accepted: false, reason: 'cause-expired' }; }
      this.status.completedProofs++;
      const played = this.played.get(sample.key) || new Set();
      const cues = eligibleCues(now.ageMs, owner.playbackRate, true, played);
      for (const cue of cues) {
        played.add(cue.id);
        const pcm = renderCue(cue, this.audioContext?.sampleRate || 48000);
        this._playCue(sample.key, cue, pcm, now.ageMs, owner.playbackRate);
        try { onCue?.({ cue, pcm, ageEms: now.ageMs, causeKey: sample.key, playbackRate: owner.playbackRate }); }
        catch (error) { this.onError(error); }
      }
      this.played.set(sample.key, played);
      this._setCauseRate(sample.key, owner.playbackRate);
      return { accepted: true, causeKey: sample.key, ageEms: now.ageMs, cues: cues.map(c => c.id) };
    }, error => { this._fatal(error); return { accepted: false, reason: 'queue-error', error }; })
      .catch(error => { this._fatal(error); return { accepted: false, reason: 'proof-error', error }; })
      .finally(() => this.inflight.delete(token));
    token.promise = proof; return proof;
  }

  _deviceLost(info) {
    if (this.disposed || this.lost) return;
    this.lost = true; this.generation++; this.status.phase = 'device-lost';
    this.status.lastError = `WebGPU device lost: ${info?.message || info?.reason || 'unknown reason'}`;
    this.cancelAll(); this._retireAll(true); this.onError(new Error(this.status.lastError));
  }
  _playCue(key, cue, pcm, ageEms, rate) {
    const context = this.audioContext;
    if (!this.audioAllowed || !context || context.state !== 'running' || !Number.isFinite(rate) || rate <= 0 || rate > 12) return;
    if (this.audioNodes.get(key)?.length) return;
    const active = [...this.audioNodes.values()].reduce((n, nodes) => n + nodes.length, 0);
    if (active >= 4) return;
    try {
      const buffer = context.createBuffer(1, pcm.length, context.sampleRate);
      buffer.copyToChannel(pcm, 0);
      const source = context.createBufferSource(); source.buffer = buffer;
      source.playbackRate.setValueAtTime(rate, context.currentTime);
      const gain = context.createGain(); gain.gain.setValueAtTime(1, context.currentTime);
      source.connect(gain); gain.connect(context.destination);
      const nodes = this.audioNodes.get(key) || [];
      nodes.push({ source, gain, buffer }); this.audioNodes.set(key, nodes);
      source.onended = () => {
        source.disconnect(); gain.disconnect(); const current = (this.audioNodes.get(key) || []).filter(node => node.source !== source);
        if (current.length) this.audioNodes.set(key, current); else this.audioNodes.delete(key);
      };
      source.start(context.currentTime, Math.max(0, (ageEms - cue.atE) / 1000));
    } catch (error) { this.onError(error); }
  }
  _setCauseRate(key, rate) {
    const context = this.audioContext; const nodes = this.audioNodes.get(key) || [];
    if (!Number.isFinite(rate) || rate <= 0 || rate > 12) { this._stopCauseAudio(key); return; }
    for (const node of nodes) {
      try { node.source.playbackRate.setValueAtTime(rate, context.currentTime); } catch {}
    }
  }
  _stopCauseAudio(key) {
    const context = this.audioContext; const nodes = this.audioNodes.get(key) || [];
    this.audioNodes.delete(key);
    for (const node of nodes) {
      try {
        if (context && node.gain?.gain) {
          node.gain.gain.cancelScheduledValues(context.currentTime);
          node.gain.gain.setValueAtTime(node.gain.gain.value, context.currentTime);
          node.gain.gain.linearRampToValueAtTime(0, context.currentTime + .005);
        }
        node.source.stop(context ? context.currentTime + .006 : undefined);
      } catch {}
    }
  }
  _fatal(error) {
    if (this.disposed || this.lost || this.status.phase === 'fatal') return;
    this.status.phase = 'fatal'; this.status.lastError = `${error?.name || 'Error'}: ${error?.message || String(error)}`;
    this.onError(error);
  }
  _retireAll(immediate = false) { for (const target of [...this.targets.values()]) this._retire(target, immediate); }
  disposeSession() { this.causes.disposeSession(); this.generation++; this.played.clear(); for (const key of [...this.audioNodes.keys()]) this._stopCauseAudio(key); }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true; this.status.phase = 'disposed'; this.disposeSession(); this._retireAll();
    await Promise.allSettled(this.retirements);
    for (const buffer of this.buffers) { try { buffer.destroy(); } catch {} }
    this.buffers.clear();
    this.device.removeEventListener?.('uncapturederror', this._uncaptured);
  }
}

export { ABI, DURATION_E_MS, PROGRAMS, SCORE, eligibleCues, programFor, renderCue, validateScissor };
