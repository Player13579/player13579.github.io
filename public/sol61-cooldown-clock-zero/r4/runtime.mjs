import { PLAN, receipt } from './artist.mjs';
import { FiniteSfxGate } from './sfx-runtime.mjs';

const query = new URLSearchParams(location.search);
const verify = query.has('verify');
if (query.has('embed')) document.body.classList.add('embedded');
const canvas = document.querySelector('canvas');
const label = document.querySelector('output');
const faults = [];
const uniformWorldBytes = 80, uniformObserveBytes = 96;
const defaults = Object.freeze({ actor: true, source: true, clock: true, transport: true, receiver: true,
  incident: true, points: true, back: true, front: true, near: true, flare: true, ghost: true,
  mirror: 1, background: 'dark', centerX: null, centerY: null, ageMs: null, durationMs: PLAN.durationMs });
let settings = { ...defaults };
let device, surface, canvasFormat, animation, dimensions = '', textures = [], bindGroups = {};
let worldUniform, observeUniform, originalTexture, originalSampler, pipelines = {};
let frameCount = 0, submittedFrames = 0, pausedAge = null, epoch = performance.now(), previousCycle = -1;
const seen = new Set();
let currentFixtureEvent = null;
const sfx = new FiniteSfxGate({ verify, bufferLoader: async context => context.decodeAudioData(await (await fetch('./clock-r4.wav')).arrayBuffer()) });
const hook = async value => value === false ? null : sfx.activateFromGesture();
hook.activateFromGesture = async () => sfx.activateFromGesture();
hook.setMuted = value => sfx.setMuted(Boolean(value));
hook.snapshot = () => sfx.snapshot();
globalThis.__gallerySfx = hook;

const htmlFixture = new URL('./sophia-front-five-v753.png', import.meta.url);
const compile = async code => {
  const module = device.createShaderModule({ code });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter(item => item.type === 'error');
  if (errors.length) throw Error(errors.map(item => `${item.lineNum}:${item.linePos} ${item.message}`).join('\n'));
  return module;
};
const blend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
const defaultsSnapshot = () => ({ ...defaults });
const currentDuration = () => Math.max(900, settings.durationMs ?? PLAN.durationMs);
const currentAge = now => pausedAge ?? ((now - epoch) % (currentDuration() + PLAN.gapMs));
const currentLive = age => age >= 0 && age < currentDuration();
const defaultCenter = () => [settings.centerX ?? canvas.width * .5, settings.centerY ?? canvas.height * .5];

function resize() {
  const dpr = devicePixelRatio || 1;
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (`${width}:${height}` === dimensions) return;
  dimensions = `${width}:${height}`;
  canvas.width = width; canvas.height = height;
  for (const texture of textures) texture.destroy();
  textures = Array.from({ length: 2 }, () => device.createTexture({ size: [width, height], format: 'rgba16float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING }));
  bindGroups.observe = device.createBindGroup({ layout: pipelines.observe.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: observeUniform } }, { binding: 1, resource: textures[0].createView() },
    { binding: 2, resource: textures[1].createView() }, { binding: 3, resource: device.createSampler({ minFilter: 'nearest', magFilter: 'nearest' }) }
  ] });
}

function writeUniforms(ageMs) {
  const live = currentLive(ageMs), duration = currentDuration();
  const dpr = devicePixelRatio || 1, bodyHeight = 64 * dpr;
  const anchor = defaultCenter();
  const world = new Float32Array([
    canvas.width, canvas.height, bodyHeight, dpr,
    anchor[0], anchor[1], settings.mirror, 0,
    Math.max(0, ageMs) / 1000, duration / 1000, +live, +settings.source,
    +settings.clock, +settings.transport, +settings.receiver, +settings.incident,
    +settings.actor, +settings.points, +settings.back, +settings.front
  ]);
  const observe = new Float32Array([
    canvas.width, canvas.height, bodyHeight, dpr,
    anchor[0], anchor[1], settings.mirror, 0,
    Math.max(0, ageMs) / 1000, duration / 1000, +live, +settings.source,
    +settings.near, +settings.flare, +settings.ghost, +settings.points,
    settings.centerX ?? canvas.width * .5, settings.centerY ?? canvas.height * .5, 0, 0,
    +settings.clock, +settings.transport, +settings.receiver, +settings.incident
  ]);
  device.queue.writeBuffer(worldUniform, 0, world);
  device.queue.writeBuffer(observeUniform, 0, observe);
}

function draw(pass, pipeline, count, group = bindGroups.worldField, instances = 1) {
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, group);
  pass.draw(count, instances);
}

function render(now) {
  resize();
  const cycleMs = currentDuration() + PLAN.gapMs;
  const age = currentAge(now);
  const cycle = Math.floor((now - epoch) / cycleMs);
  if (cycle !== previousCycle && !pausedAge) {
    previousCycle = cycle;
    seen.clear();
    currentFixtureEvent = null;
  }
  const fixtureEvent = { id: `isolated-fixture:${Math.max(0, cycle)}`, playerId: 'fixture-sophia', at: now - age,
    type: 'gain-cooldownReduction', effectKind: 'cooldownReduction', durationMs: currentDuration(), variant: 'r4-technical-fixture' };
  if (currentLive(age) && !currentFixtureEvent) {
    currentFixtureEvent = receipt(fixtureEvent, { id: 'fixture-sophia', alive: true, visible: true }, seen);
  }
  const eventAgeMs = currentFixtureEvent ? Math.max(0, now - currentFixtureEvent.serverAt) : NaN;
  sfx.setEvent(currentLive(eventAgeMs) ? { eventId: currentFixtureEvent.eventId, ageMs: eventAgeMs,
    durationMs: currentFixtureEvent.durationMs } : null);
  writeUniforms(age);
  const bg = settings.background === 'light' ? [0.88, 0.9, 0.94, 1] : [0.035, 0.045, 0.075, 1];
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({ colorAttachments: textures.map((texture, index) => ({ view: texture.createView(),
    loadOp: 'clear', storeOp: 'store', clearValue: index === 0 ? { r: bg[0], g: bg[1], b: bg[2], a: bg[3] } : { r: 0, g: 0, b: 0, a: 0 } })) });
  const worldViewport = [0, 0, canvas.width, canvas.height];
  pass.setViewport(...worldViewport, 0, 1);
  pass.setScissorRect(...worldViewport);
  draw(pass, pipelines.rear, 6);
  draw(pass, pipelines.body, 6, bindGroups.worldBody);
  draw(pass, pipelines.front, 6);
  pass.end();

  const output = encoder.beginRenderPass({ colorAttachments: [{ view: surface.getCurrentTexture().createView(),
    loadOp: 'clear', storeOp: 'store', clearValue: { r: bg[0], g: bg[1], b: bg[2], a: 1 } }] });
  output.setViewport(...worldViewport, 0, 1);
  output.setScissorRect(...worldViewport);
  draw(output, pipelines.observe, 3, bindGroups.observe);
  output.end();
  device.queue.submit([encoder.finish()]);
  submittedFrames++; frameCount++;
  globalThis.__clockR4Audit.submitted = true;
  sfx.setGpuState({ ready: true, submitted: true });
  animation = requestAnimationFrame(render);
}

function setCase(name, overrides = {}) {
  pausedAge = null;
  settings = { ...defaultsSnapshot(), ...overrides };
  if (name === 'main-only') Object.assign(settings, { points: false, near: false, flare: false, ghost: false });
  if (name === 'source-off') Object.assign(settings, { source: false });
  if (name === 'expiry') Object.assign(settings, { ageMs: currentDuration() + 1 });
  if (Number.isFinite(settings.ageMs)) pausedAge = settings.ageMs;
  globalThis.__clockR4Audit.currentCase = { name, settings: { ...settings }, ageMs: pausedAge };
  return globalThis.__clockR4Audit.currentCase;
}

async function boot() {
  if (!navigator.gpu) throw Error('WebGPU unsupported');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error('WebGPU adapter missing');
  device = await adapter.requestDevice();
  device.addEventListener('uncapturederror', event => faults.push(event.error.message));
  surface = canvas.getContext('webgpu');
  canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  surface.configure({ device, format: canvasFormat, alphaMode: 'opaque' });
  const [worldText, observeText] = await Promise.all([fetch('./world.wgsl').then(r => r.text()), fetch('./observe.wgsl').then(r => r.text())]);
  const [worldModule, observeModule] = await Promise.all([compile(worldText), compile(observeText)]);
  worldUniform = device.createBuffer({ size: uniformWorldBytes, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  observeUniform = device.createBuffer({ size: uniformObserveBytes, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const fieldBindLayout = device.createBindGroupLayout({ entries: [{ binding: 0,
    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', minBindingSize: uniformWorldBytes } }] });
  const fieldPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [fieldBindLayout] });
  const bodyBindLayout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', minBindingSize: uniformWorldBytes } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } }
  ] });
  const bodyPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bodyBindLayout] });
  const observeBindLayout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', minBindingSize: uniformObserveBytes } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d' } },
    { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'non-filtering' } }
  ] });
  const observePipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [observeBindLayout] });
  const worldTarget = { format: 'rgba16float', blend };
  for (const [name, entry] of [['rear', 'rearFragment'], ['body', 'bodyFragment'], ['front', 'frontFragment']]) {
    const vertex = name === 'body' ? 'bodyVertex' : 'fieldVertex';
    pipelines[name] = await device.createRenderPipelineAsync({ layout: name === 'body' ? bodyPipelineLayout : fieldPipelineLayout,
      vertex: { module: worldModule, entryPoint: vertex },
      fragment: { module: worldModule, entryPoint: entry, targets: [worldTarget, worldTarget] },
      primitive: { topology: 'triangle-list' } });
  }
  pipelines.observe = await device.createRenderPipelineAsync({ layout: observePipelineLayout, vertex: { module: observeModule, entryPoint: 'fullVertex' },
    fragment: { module: observeModule, entryPoint: 'finalFragment', targets: [{ format: canvasFormat }] }, primitive: { topology: 'triangle-list' } });

  const blob = await fetch(htmlFixture).then(r => { if (!r.ok) throw Error(`fixture HTTP ${r.status}`); return r.blob(); });
  const bitmap = await createImageBitmap(blob, 62, 15, 136, 225, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  if (bitmap.width !== 136 || bitmap.height !== 225) throw Error(`crop mismatch ${bitmap.width}x${bitmap.height}`);
  originalTexture = device.createTexture({ size: [136, 225], format: 'rgba8unorm',
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT });
  device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: originalTexture }, [136, 225]);
  bitmap.close();
  originalSampler = device.createSampler({ minFilter: 'linear', magFilter: 'linear' });
  bindGroups.worldField = device.createBindGroup({ layout: fieldBindLayout, entries: [{ binding: 0, resource: { buffer: worldUniform } }] });
  bindGroups.worldBody = device.createBindGroup({ layout: pipelines.body.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: worldUniform } }, { binding: 1, resource: originalTexture.createView() },
    { binding: 2, resource: originalSampler }
  ] });
  resize();
  setCase('default');
  label.textContent = '待機時間短縮・時計 zero r4 WebGPU';
  animation = requestAnimationFrame(render);
  return { adapter: adapter.info ?? {}, fixture: { url: htmlFixture.href, crop: [62, 15, 136, 225], H: 64 },
    formats: ['rgba16float', 'rgba16float', canvasFormat], vertexCounts: { field: 6, body: 6, observe: 3 },
    uniforms: { worldBytes: uniformWorldBytes, observeBytes: uniformObserveBytes } };
}

globalThis.__clockR4Audit = {
  ready: false, compiled: false, submitted: false, verify, faults, settings,
  async boot() { return this.bootInfo; },
  seek(ms) { return setCase('seek', { ageMs: ms }); },
  setCase,
  setSettings(overrides) { return setCase('custom', overrides); },
  snapshot() { return { ready: this.ready, compiled: this.compiled, submitted: submittedFrames > 0, frames: frameCount,
    submittedFrames, width: canvas?.width ?? 0, height: canvas?.height ?? 0, H: 64, dpr: devicePixelRatio || 1,
    verify, settings: { ...settings }, case: this.currentCase ?? null, faults: [...faults], audio: sfx.snapshot(),
    lastEventAgeMs: Number.isFinite(pausedAge) ? pausedAge : null, sourceFixture: 'isolated synthetic gain-cooldownReduction fixture' }; },
  close() { if (animation) cancelAnimationFrame(animation); sfx.close(); for (const texture of textures) texture.destroy();
    originalTexture?.destroy(); worldUniform?.destroy(); observeUniform?.destroy(); device?.destroy(); }
};

try {
  const info = await boot();
  globalThis.__clockR4Audit.bootInfo = info;
  globalThis.__clockR4Audit.ready = true;
  globalThis.__clockR4Audit.compiled = true;
  addEventListener('pagehide', () => globalThis.__clockR4Audit.close(), { once: true });
} catch (error) {
  faults.push(error.stack || error.message);
  label.textContent = error.message;
  globalThis.__clockR4Audit.ready = false;
}
