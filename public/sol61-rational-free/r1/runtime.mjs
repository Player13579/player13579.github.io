import { CONTRACT, EVENT_TYPE, LIFETIME_MS, createReceiptStore, uniforms, phaseAt } from './artist.mjs';
import { FiniteSfxGate } from './sfx-runtime.mjs';

const WIDTH = 980, HEIGHT = 620, H64 = 64;
const DEFAULT_SETTINGS = Object.freeze({ main: true, receive: true, source: true,
  stars: true, post: true, back: true, front: true, reducedMotion: false });
const SOPHIA = Object.freeze({ atlasWidth: 768, atlasHeight: 512,
  cell: [256, 0, 512, 256], alphaCrop: [319, 16, 456, 240], visibleWidth: 137,
  visibleHeight: 224, actorHeightH: 64, actorWidthH: 137 * 64 / 224,
  atlasUv: [319 / 768, 16 / 512, 456 / 768, 240 / 512] });
const actorRectH = Object.freeze([-SOPHIA.actorWidthH / 2, -64,
  SOPHIA.actorWidthH / 2, 0]);
const FIXTURE_URL = new URL('./sophia-front-five-v753.png', import.meta.url);
const query = new URLSearchParams(location.search);
const verify = query.has('verify');
const embedded = query.has('embed');
if (embedded) document.body.classList.add('embedded');
const canvas = document.querySelector('#stage');
const statusElement = document.querySelector('#status');
const soundButton = document.querySelector('#sound');
const backgroundButton = document.querySelector('#background');
const receiveButton = document.querySelector('#receive');
const checkbox = Object.fromEntries(['main','receiveLayer','source','stars','post','back','front']
  .map(id => [id, document.querySelector(`#${id}`)]));

const ACTOR_WGSL = `
struct ActorView { view:vec4f,actorRectH:vec4f,actorHeight:vec4f };
@group(0) @binding(0) var<uniform> u:ActorView;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
struct V { @builtin(position) clip:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
  let q=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));
  let uv=q[i];let p=mix(u.actorRectH.xy,u.actorRectH.zw,uv);let px=u.view.zw+p*u.actorHeight.x;
  var o:V;o.clip=vec4f(px.x/u.view.x*2.-1.,1.-px.y/u.view.y*2.,0.,1.);o.uv=uv;return o;
}
@fragment fn fs(v:V)->@location(0) vec4f {let c=textureSample(actorTex,actorSampler,mix(vec2f(319./768.,16./512.),vec2f(456./768.,240./512.),v.uv));return vec4f(c.rgb*c.a,c.a);}
`;
const DISPLAY_WGSL = `
@group(0) @binding(0) var scene:texture_2d<f32>;
struct V { @builtin(position) clip:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
 const p=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));
 let q=p[i];var o:V;o.clip=vec4f(q,0.,1.);return o;
}
fn srgb(x:f32)->f32 {let c=clamp(x,0.,1.);if(c<=.0031308){return 12.92*c;}return 1.055*pow(c,1./2.4)-.055;}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {let c=textureLoad(scene,vec2i(p.xy),0).rgb;return vec4f(srgb(c.r),srgb(c.g),srgb(c.b),1.);}
`;

function fail(message, error) {
  console.error(message, error);
  if (statusElement) statusElement.textContent = `${message}: ${error?.message || error}`;
}
function alignTo(value, alignment) { return Math.ceil(value / alignment) * alignment; }
function makeView(viewportPx, settings, pass = 1, actorHeightPx = H64) {
  return { viewportPx, anchorPx: [viewportPx[0] * .5, viewportPx[1] * .75],
    actorHeightPx, actorRectH, atlasUv: SOPHIA.atlasUv,
    sourceVisibility: settings.source ? 1 : 0, pass,
    mainEnabled: settings.main ? 1 : 0, receiveEnabled: settings.receive ? 1 : 0,
    starsEnabled: settings.stars ? 1 : 0, postEnabled: settings.post ? 1 : 0,
    reducedMotion: settings.reducedMotion };
}
async function compilationErrors(module, label) {
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter(message => message.type === 'error');
  if (errors.length) throw new Error(`${label} WGSL: ${errors.map(e => `${e.lineNum}:${e.linePos} ${e.message}`).join('; ')}`);
  return info.messages.filter(message => message.type === 'warning').map(message => message.message);
}

class RationalFreePreview {
  constructor(device, context, canvasFormat, actorTexture, shaderWarnings) {
    this.device = device; this.context = context; this.canvasFormat = canvasFormat;
    this.actorTexture = actorTexture; this.shaderWarnings = shaderWarnings;
    this.sceneFormat = device.features.has('float16-blendable') ? 'rgba16float' : 'rgba8unorm';
    this.sceneTexture = device.createTexture({ label: 'rational-free-linear-scene',
      size: [WIDTH, HEIGHT], format: this.sceneFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    this.sceneView = this.sceneTexture.createView();
    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear',
      addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    this.worldModule = device.createShaderModule({ label: 'artist world.wgsl', code: this.worldCode });
    this.postModule = device.createShaderModule({ label: 'artist post.wgsl', code: this.postCode });
  }

  static async create({ device, context, format, atlas, shaderWarnings }) {
    const preview = Object.create(RationalFreePreview.prototype);
    Object.assign(preview, { device, context, canvasFormat: format, actorTexture: atlas, shaderWarnings });
    preview.worldCode = await (await fetch(new URL('./world.wgsl', import.meta.url), { cache: 'no-store' })).text();
    preview.postCode = await (await fetch(new URL('./post.wgsl', import.meta.url), { cache: 'no-store' })).text();
    preview.sceneFormat = device.features.has('float16-blendable') ? 'rgba16float' : 'rgba8unorm';
    preview.sceneTexture = device.createTexture({ label: 'rational-free-linear-scene',
      size: [WIDTH, HEIGHT], format: preview.sceneFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    preview.sceneView = preview.sceneTexture.createView();
    preview.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear',
      addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    preview.worldModule = device.createShaderModule({ label: 'artist world.wgsl', code: preview.worldCode });
    preview.postModule = device.createShaderModule({ label: 'artist post.wgsl', code: preview.postCode });
    preview.actorModule = device.createShaderModule({ label: 'fixture actor copy', code: ACTOR_WGSL });
    preview.displayModule = device.createShaderModule({ label: 'linear display conversion', code: DISPLAY_WGSL });
    preview.shaderWarnings.push(...await compilationErrors(preview.worldModule, 'world'));
    preview.shaderWarnings.push(...await compilationErrors(preview.postModule, 'post'));
    preview.shaderWarnings.push(...await compilationErrors(preview.actorModule, 'actor'));
    preview.shaderWarnings.push(...await compilationErrors(preview.displayModule, 'display'));
    await preview.createPipelines();
    return preview;
  }

  async createPipelines() {
    const device = this.device;
    const sceneBlend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
    const actorBlend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
    const additiveBlend = { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
      alpha: { srcFactor: 'zero', dstFactor: 'one', operation: 'add' } };
    const create = async (label, module, blend, format = this.sceneFormat) => device.createRenderPipelineAsync({
      label, layout: 'auto', vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format, ...(blend ? { blend } : {}) }] },
      primitive: { topology: 'triangle-list' }
    });
    this.worldPipeline = await create('rational artist six-vertex world', this.worldModule, sceneBlend);
    this.actorPipeline = await create('registered Sophia actor six-vertex sprite', this.actorModule, actorBlend);
    this.postPipeline = await create('rational artist six-vertex post', this.postModule, additiveBlend);
    this.displayPipeline = await create('linear scene to sRGB display', this.displayModule, null, this.canvasFormat);
    this.actorSampler = this.sampler;
    this.sceneDisplayBind = device.createBindGroup({ label: 'scene display sample',
      layout: this.displayPipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: this.sceneView }] });
    this.records = new Map();
    this.actorBuffer = device.createBuffer({ label: 'actor camera and H-space registration',
      size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.actorBind = null;
    this.drawCounts = { worldBack: 0, actor: 0, worldFront: 0, post: 0, display: 0 };
    this.lastFault = null;
    device.addEventListener('uncapturederror', event => {
      this.lastFault = `${event.error?.name || 'GPUError'}: ${event.error?.message || event.error}`;
      console.error('Rational Free uncaptured GPU error', this.lastFault);
    });
  }

  addRecord(record) {
    const buffer = this.device.createBuffer({ label: `receipt ${record.receiptKey} 192-byte ABI`,
      size: 192, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const worldBind = this.device.createBindGroup({ label: `world ${record.receiptKey}`,
      layout: this.worldPipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer, offset: 0, size: 192 } },
        { binding: 1, resource: this.actorTexture.createView() },
        { binding: 2, resource: this.actorSampler }] });
    const postBind = this.device.createBindGroup({ label: `post ${record.receiptKey}`,
      layout: this.postPipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer, offset: 0, size: 192 } }] });
    this.records.set(record.receiptKey, { record, buffer, worldBind, postBind });
  }

  updateRecord(record, nowMs, settings, viewportPx, actorHeightPx) {
    let gpuRecord = this.records.get(record.receiptKey);
    if (!gpuRecord) { this.addRecord(record); gpuRecord = this.records.get(record.receiptKey); }
    const data = uniforms(record, nowMs, makeView(viewportPx, settings, 1, actorHeightPx));
    if (data.byteLength !== 192 || data.length !== 48) throw new Error('artist ABI must be exactly 48 float32 / 192 bytes');
    this.device.queue.writeBuffer(gpuRecord.buffer, 0, data);
    return gpuRecord;
  }

  updateActor(record, nowMs, settings, viewportPx, actorHeightPx) {
    const view = makeView(viewportPx, settings, 1, actorHeightPx);
    const data = new Float32Array([...viewportPx, ...view.anchorPx, ...view.actorRectH, view.actorHeightPx / H64, 0, 0, 0]);
    this.device.queue.writeBuffer(this.actorBuffer, 0, data);
    if (!this.actorBind) this.actorBind = this.device.createBindGroup({ label: 'registered actor texture',
      layout: this.actorPipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer: this.actorBuffer, offset: 0, size: 48 } },
        { binding: 1, resource: this.actorTexture.createView() },
        { binding: 2, resource: this.actorSampler }] });
  }

  pass(loadOp, clearValue = undefined) {
    return this.device.createCommandEncoder().beginRenderPass({ colorAttachments: [
      { view: this.sceneView, loadOp, storeOp: 'store', ...(clearValue ? { clearValue } : {}) }] });
  }

  render({ records, allRecords, nowMs, settings, background, viewportPx, actorHeightPx, captureQueue }) {
    const device = this.device;
    const active = records.filter(record => phaseAt(record, nowMs).alive);
    const gpuRecords = active.map(record => this.updateRecord(record, nowMs, settings, viewportPx, actorHeightPx));
    const actorRecord = active[0] || { receiptKey: 'fixture-actor', receivedAtMs: nowMs };
    this.updateActor(actorRecord, nowMs, settings, viewportPx, actorHeightPx);
    const encoder = device.createCommandEncoder({ label: 'Rational Free ordered frame' });
    const bg = background === 'light' ? { r: .86, g: .87, b: .88, a: 1 } : { r: .012, g: .018, b: .027, a: 1 };
    const clear = encoder.beginRenderPass({ colorAttachments: [{ view: this.sceneView,
      loadOp: 'clear', storeOp: 'store', clearValue: bg }] }); clear.end();
    const drawScene = (pipeline, groupFor, selected, field) => {
      if (!selected.length) return;
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: this.sceneView,
        loadOp: 'load', storeOp: 'store' }] });
      pass.setPipeline(pipeline);
      for (const g of selected) { pass.setBindGroup(0, groupFor(g)); pass.draw(6, 1, 0, 0); this.drawCounts[field]++; }
      pass.end();
    };
    if (settings.back) drawScene(this.worldPipeline, g => g.worldBind,
      gpuRecords.map(g => ({ ...g, buffer: g.buffer })), 'worldBack');
    const actorPass = encoder.beginRenderPass({ colorAttachments: [{ view: this.sceneView,
      loadOp: 'load', storeOp: 'store' }] });
    actorPass.setPipeline(this.actorPipeline); actorPass.setBindGroup(0, this.actorBind);
    actorPass.draw(6, 1, 0, 0); actorPass.end(); this.drawCounts.actor++;
    if (settings.front) drawScene(this.worldPipeline, g => g.worldBind,
      gpuRecords.map(g => ({ ...g, buffer: g.buffer })), 'worldFront');
    if (gpuRecords.length && settings.post) drawScene(this.postPipeline, g => g.postBind,
      gpuRecords.map(g => ({ ...g, buffer: g.buffer })), 'post');
    const surface = this.context.getCurrentTexture();
    const displayPass = encoder.beginRenderPass({ colorAttachments: [{ view: surface.createView(),
      loadOp: 'clear', storeOp: 'store', clearValue: bg }] });
    displayPass.setPipeline(this.displayPipeline); displayPass.setBindGroup(0, this.sceneDisplayBind);
    displayPass.draw(6, 1, 0, 0); displayPass.end(); this.drawCounts.display++;
    const readbacks = captureQueue.splice(0);
    for (const request of readbacks) {
      const bytesPerRow = alignTo(WIDTH * 4, 256);
      const buffer = device.createBuffer({ label: 'rational-free actual canvas readback',
        size: bytesPerRow * HEIGHT, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      encoder.copyTextureToBuffer({ texture: surface }, { buffer, bytesPerRow, rowsPerImage: HEIGHT },
        { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 });
      request.buffer = buffer;
    }
    device.queue.submit([encoder.finish()]);
    for (const request of readbacks) this.finishReadback(request);
    return active.length;
  }

  async finishReadback(request) {
    try {
      await this.device.queue.onSubmittedWorkDone();
      await request.buffer.mapAsync(GPUMapMode.READ);
      const data = new Uint8Array(request.buffer.getMappedRange());
      let sum = 0, max = 0, nonBackground = 0, nonzeroAlpha = 0;
      const stride = alignTo(WIDTH * 4, 256);
      for (let y = 0; y < HEIGHT; y += 1) for (let x = 0; x < WIDTH; x += 1) {
        const i = y * stride + x * 4;
        const r = data[i + (this.canvasFormat.startsWith('bgra') ? 2 : 0)];
        const g = data[i + 1];
        const b = data[i + (this.canvasFormat.startsWith('bgra') ? 0 : 2)];
        const lum = .2126 * r + .7152 * g + .0722 * b;
        sum += lum; if (lum > max) max = lum; if (lum > 20) nonBackground++;
        if (data[i + 3] > 0) nonzeroAlpha++;
      }
      request.resolve({ width: WIDTH, height: HEIGHT, format: this.canvasFormat,
        averageLuma8: sum / (WIDTH * HEIGHT), maxLuma8: max,
        samplesLumaAbove20: nonBackground, nonzeroAlpha, actualGpuReadback: true });
    } catch (error) { request.reject(error); }
    finally { try { request.buffer?.unmap(); request.buffer?.destroy(); } catch {} }
  }

  destroyRecord(key) {
    const gpuRecord = this.records.get(key);
    if (!gpuRecord) return;
    this.records.delete(key);
    this.device.queue.onSubmittedWorkDone().finally(() => gpuRecord.buffer.destroy());
  }

  destroy() {
    this.sceneTexture.destroy(); this.actorBuffer.destroy();
    for (const [key] of this.records) this.destroyRecord(key);
    this.actorTexture.destroy();
  }
}

async function loadActorAtlas(device) {
  const response = await fetch(FIXTURE_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Sophia atlas HTTP ${response.status}`);
  const image = new Image(); image.src = FIXTURE_URL.href; await image.decode();
  if (image.naturalWidth !== SOPHIA.atlasWidth || image.naturalHeight !== SOPHIA.atlasHeight)
    throw new Error(`Unexpected Sophia atlas ${image.naturalWidth}x${image.naturalHeight}`);
  const texture = device.createTexture({ label: 'original Sophia five-frame atlas',
    size: [image.naturalWidth, image.naturalHeight], format: 'rgba8unorm-srgb',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT });
  device.pushErrorScope('validation');
  device.queue.copyExternalImageToTexture({ source: image },
    { texture, premultipliedAlpha: false, colorSpace: 'srgb' }, [image.naturalWidth, image.naturalHeight]);
  await device.queue.onSubmittedWorkDone();
  const uploadError = await device.popErrorScope();
  if (uploadError) throw new Error(`Sophia atlas upload validation: ${uploadError.message}`);
  return texture;
}

async function start() {
  if (!canvas || !navigator.gpu) throw new Error('WebGPU is required for this preview');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter');
  const features = adapter.features.has('float16-blendable') ? ['float16-blendable'] : [];
  const device = await adapter.requestDevice({ requiredFeatures: features });
  const context = canvas.getContext('webgpu', { alphaMode: 'opaque' });
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    alphaMode: 'opaque', colorSpace: 'srgb' });
  const actorTexture = await loadActorAtlas(device);
  const shaderWarnings = [];
  device.pushErrorScope('validation');
  const renderer = await RationalFreePreview.create({ device, context, format, atlas: actorTexture, shaderWarnings });
  const pipelineError = await device.popErrorScope();
  if (pipelineError) throw new Error(`WebGPU pipeline validation: ${pipelineError.message}`);

  const receiptStore = createReceiptStore();
  const liveRecords = new Map();
  const sfx = new FiniteSfxGate({ verify });
  const viewportPx = [WIDTH, HEIGHT];
  let settings = { ...DEFAULT_SETTINGS };
  let background = 'dark', loopCounter = 0, nextLoopAt = 0, firstSubmit = false, actorHeightPx = H64;
  let testAgeMs = null, disposed = false, rafId = 0;
  const captureQueue = [];
  let latestReceipt = null;
  const drawTotals = { frames: 0, drawCalls: 0, verticesSubmitted: 0, worldBack: 0, actor: 0, worldFront: 0, post: 0, display: 0 };
  const sourceEvent = () => ({ id: `rational-free-preview-${++loopCounter}`,
    type: EVENT_TYPE, playerId: 'fixture-sophia', x: 0, y: 0, at: performance.now(),
    duration: 0, serverDurationMs: 0, cost: 'waived', noManaGain: true });
  function receiveFixture(event = sourceEvent()) {
    if (event.type !== EVENT_TYPE) throw new TypeError(`Fixture only accepts ${EVENT_TYPE}`);
    const receiveNowMs = performance.now();
    const key = `preview:${event.id}`;
    const result = receiptStore.receive(event, receiveNowMs, key);
    if (result.status !== 'accepted') return result;
    const record = result.record;
    liveRecords.set(key, record); latestReceipt = record;
    renderer.addRecord(record);
    const sfxStatus = sfx.receive(record, receiveNowMs);
    nextLoopAt = receiveNowMs + LIFETIME_MS;
    return { ...result, sfxStatus };
  }
  function resetFresh({ autoReceipt = true } = {}) {
    settings = { ...DEFAULT_SETTINGS };
    actorHeightPx = H64;
    for (const [key, el] of Object.entries(checkbox)) if (el) el.checked = settings[
      key === 'receiveLayer' ? 'receive' : key];
    background = 'dark'; backgroundButton.textContent = 'Background: dark';
    for (const key of liveRecords.keys()) renderer.destroyRecord(key);
    liveRecords.clear(); receiptStore.resetSession(); sfx.resetSession(); latestReceipt = null;
    for (const key of Object.keys(drawTotals)) drawTotals[key] = 0;
    for (const key of Object.keys(renderer.drawCounts)) renderer.drawCounts[key] = 0;
    testAgeMs = null; nextLoopAt = 0;
    if (autoReceipt) receiveFixture();
  }
  function currentNow() {
    if (testAgeMs !== null) {
      const current = [...liveRecords.values()].at(-1);
      const anchor = current || latestReceipt;
      if (anchor) return anchor.receivedAtMs + testAgeMs;
    }
    return performance.now();
  }
  function requestReadback() {
    return new Promise((resolve, reject) => captureQueue.push({ resolve, reject }));
  }
  async function readAtlasPixels(points = [[384,128],[400,220],[319,16],[455,239]]) {
    const bytesPerRow = alignTo(SOPHIA.atlasWidth * 4, 256);
    const buffer = device.createBuffer({ size: bytesPerRow * SOPHIA.atlasHeight,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const encoder = device.createCommandEncoder({ label: 'actor atlas upload verification' });
    device.pushErrorScope('validation');
    encoder.copyTextureToBuffer({ texture: actorTexture }, { buffer, bytesPerRow, rowsPerImage: SOPHIA.atlasHeight },
      { width: SOPHIA.atlasWidth, height: SOPHIA.atlasHeight, depthOrArrayLayers: 1 });
    device.queue.submit([encoder.finish()]); await device.queue.onSubmittedWorkDone();
    const validationError = await device.popErrorScope();
    if (validationError) { buffer.destroy(); throw new Error(`Atlas readback validation: ${validationError.message}`); }
    await buffer.mapAsync(GPUMapMode.READ);
    const bytes = new Uint8Array(buffer.getMappedRange());
    const samples = points.map(([x,y]) => ({ x,y,rgba:Array.from(bytes.slice(y*bytesPerRow+x*4,y*bytesPerRow+x*4+4)) }));
    buffer.unmap(); buffer.destroy();
    return { width:SOPHIA.atlasWidth,height:SOPHIA.atlasHeight,format:'rgba8unorm-srgb',samples };
  }
  function snapshot() {
    return { version: CONTRACT.version, eventType: EVENT_TYPE, verify, audioGain: verify ? 0 : null,
      audioContexts: verify ? 0 : undefined, liveReceipts: liveRecords.size,
      consumedSfxKeys: sfx.consumed.size, sfxNodes: sfx.nodes.size,
      receiveClock: 'client performance.now, fixed once per receipt',
      durationMs: LIFETIME_MS, canvas: [WIDTH, HEIGHT], actorHeightH: actorHeightPx,
      settings: { ...settings },
      actorRectH, actorAtlas: { url: FIXTURE_URL.href, width: SOPHIA.atlasWidth,
        height: SOPHIA.atlasHeight, sourceCell: SOPHIA.cell, alphaCrop: SOPHIA.alphaCrop,
        atlasUv: SOPHIA.atlasUv, aspectPreserved: true },
      sceneFormat: renderer.sceneFormat, canvasFormat: renderer.canvasFormat,
      float16Blendable: device.features.has('float16-blendable'), shaderWarnings,
      drawCounts: { ...drawTotals }, rendererDrawCounts: { ...renderer.drawCounts },
      gpuFault: renderer.lastFault, queueSubmitted: drawTotals.frames > 0 };
  }
  function setSettings(next = {}) {
    settings = { ...settings, ...next };
  }
  window.__RationalFreeTest = Object.freeze({
    ready: true,
    resetFresh,
    receive: receiveFixture,
    setSettings,
    setActorHeightPx(value) { if (!Number.isFinite(value) || value < 1 || value > 512) throw new TypeError('actor height'); actorHeightPx = value; },
    setBackground(value) { if (!['dark','light'].includes(value)) throw new TypeError('background'); background = value; backgroundButton.textContent = `Background: ${value}`; },
    setAgeMs(value) { if (!Number.isFinite(value) || value < 0) throw new TypeError('age'); testAgeMs = value; },
    capture: requestReadback,
    readAtlasPixels,
    snapshot,
    verifyAudio() { return { verify, gain: verify ? 0 : null, contexts: verify ? 0 : Number(Boolean(window.__rationalFreeAudioContextCreated)) }; },
    fixture: { sourceType: EVENT_TYPE, eventMeaning: 'cost waived; no mana gain', receiptDurationMs: LIFETIME_MS }
  });

  function syncControls() {
    settings = { ...settings, main: checkbox.main.checked,
      receive: checkbox.receiveLayer.checked, source: checkbox.source.checked,
      stars: checkbox.stars.checked, post: checkbox.post.checked,
      back: checkbox.back.checked, front: checkbox.front.checked };
  }
  for (const el of Object.values(checkbox)) el?.addEventListener('change', syncControls);
  backgroundButton?.addEventListener('click', () => {
    background = background === 'dark' ? 'light' : 'dark';
    backgroundButton.textContent = `Background: ${background}`;
  });
  receiveButton?.addEventListener('click', () => { try { receiveFixture(); } catch (error) { fail('Receipt rejected', error); } });
  soundButton.disabled = verify;
  soundButton?.addEventListener('click', async () => {
    if (verify || !firstSubmit) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) { soundButton.textContent = 'Audio unavailable'; soundButton.disabled = true; return; }
    try {
      const context = new Audio(); window.__rationalFreeAudioContextCreated = true;
      await context.resume(); sfx.connectContext(context);
      soundButton.textContent = context.state === 'running' ? 'Sound enabled' : 'Sound awaiting gesture';
      soundButton.disabled = context.state === 'running';
    } catch (error) { fail('Audio unlock failed', error); }
  });

  function frame() {
    if (disposed) return;
    const nowMs = currentNow();
    try {
      if (liveRecords.size === 0) receiveFixture();
      if (testAgeMs === null && nowMs >= nextLoopAt) receiveFixture();
      const all = [...liveRecords.values()];
      for (const record of all) if (!phaseAt(record, nowMs).alive) {
        liveRecords.delete(record.receiptKey); renderer.destroyRecord(record.receiptKey);
      }
      const active = [...liveRecords.values()];
      const before = { ...renderer.drawCounts };
      renderer.render({ records: active, allRecords: all, nowMs, settings, background,
        viewportPx, actorHeightPx, captureQueue });
      const after = renderer.drawCounts;
      const delta = Object.fromEntries(Object.keys(after).map(key => [key, after[key] - before[key]]));
      const frameDrawCalls = Object.values(delta).reduce((a,b)=>a+b,0);
      drawTotals.frames++; drawTotals.drawCalls += frameDrawCalls; drawTotals.verticesSubmitted += frameDrawCalls * 6;
      drawTotals.worldBack += delta.worldBack; drawTotals.actor += delta.actor;
      drawTotals.worldFront += delta.worldFront; drawTotals.post += delta.post;
      drawTotals.display += delta.display;
      if (!firstSubmit) {
        firstSubmit = true; soundButton.disabled = verify;
        if (liveRecords.size === 0) receiveFixture();
      }
      if (statusElement && !embedded) statusElement.textContent = `WebGPU ${renderer.sceneFormat} · ${active.length} receipt · ${verify ? 'verify silent' : 'ready'}`;
    } catch (error) { fail('Rational Free render failed', error); }
    rafId = requestAnimationFrame(frame);
  }
  renderer.render({ records: [], allRecords: [], nowMs: performance.now(), settings, background,
    viewportPx, actorHeightPx, captureQueue });
  drawTotals.frames++;
  firstSubmit = true;
  soundButton.disabled = verify;
  receiveFixture();
  rafId = requestAnimationFrame(frame);
  window.addEventListener('pagehide', () => {
    disposed = true; cancelAnimationFrame(rafId); sfx.stopAll(); renderer.destroy(); if (sfx.context && sfx.context.state !== "closed") void sfx.context.close();
  }, { once: true });
}

start().catch(error => fail('WebGPU initialization failed', error));
