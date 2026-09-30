import { makeReceiptEvent, fixtureLayout, resetFixture, makeUniformPair, acceptReceipt, eventAge, FLAGS_ON, FLAGS_MAIN_ONLY, assertOnMeasurementGate } from './runtime-evidence/runtime-core.mjs';
import { visibleOwner } from './artist.mjs';
import { synthesize } from './acoustic.mjs';

const query = new URLSearchParams(location.search);
const verify = query.has('verify');
if (query.has('embed')) document.body.classList.add('embedded');

const canvas = document.querySelector('#stage');
const status = document.querySelector('#status');
const inputNames = Object.keys(FLAGS_ON);
const inputs = Object.fromEntries(inputNames.map(name => [name, document.querySelector(`#${name}`)]));
const phaseInput = document.querySelector('#phase');
const phaseReadout = document.querySelector('#phase-readout');
const durationInput = document.querySelector('#duration');
const listeners = [];
const faults = [];
const addListener = (target, type, listener, options) => {
  target.addEventListener(type, listener, options);
  listeners.push([target, type, listener, options]);
};

let adapter;
let device;
let surface;
let canvasFormat;
let sampler;
let observeSampler;
let originalTexture;
let sceneTexture;
let emissionTexture;
let worldModule;
let observeModule;
let backgroundModule;
let volumeLayout;
let bodyLayout;
let observeLayout;
let backgroundLayout;
let rearPipeline;
let bodyPipeline;
let frontPipeline;
let observePipeline;
let backgroundPipeline;
let backgroundGroup;
let lightBackgroundUniform;
let fixtures = [];
let fixtureBindings = [];
let durationMs = 1500;
let epochStart = performance.now();
let pausedU = null;
let lastNow = 0;
let ageMs = 0;
let cycle = 0;
let frameCount = 0;
let submittedFrames = 0;
let renderDraws = 0;
let firstSubmit = false;
let gpuReady = false;
let disposed = false;
let dimensionsKey = '';
let animation = 0;
let measuring = false;
let imageOffset = [0, 0];
let previewGeneration = 0;
let cycleKey = '0:0';
let adapterFeatures = [];
const seenReceipts = new Map();
const receiptByFixture = new Map();

function readFlags() {
  return Object.fromEntries(Object.entries(inputs).map(([name, input]) => [name, !!input?.checked]));
}

function setStatus(text) {
  if (status) status.textContent = String(text);
}

function fault(error) {
  const message = error?.message || String(error);
  faults.push(message);
  gpuReady = false;
  setStatus(`WebGPU error · ${message}`);
}

function hexSha(bytes) {
  return crypto.subtle.digest('SHA-256', bytes).then(digest => [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, '0')).join(''));
}

async function fetchOriginalCrop() {
  const sourceUrl = new URL('./body.png', import.meta.url);
  const response = await fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Original actor atlas HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  const hash = await hexSha(bytes);
  if (hash !== 'cf3df51d88129ad51e175dd894ef2c269626a2d60fec912289789e099d8fcb8f') throw new Error(`Actor atlas hash mismatch ${hash}`);
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), 62, 15, 136, 225, {
    colorSpaceConversion: 'none', premultiplyAlpha: 'none',
  });
  if (bitmap.width !== 136 || bitmap.height !== 225) {
    bitmap.close();
    throw new Error(`Actor crop dimensions ${bitmap.width}x${bitmap.height}`);
  }
  return { bitmap, hash, sourcePath: sourceUrl.pathname };
}

async function checkedShader(code, label) {
  const module = device.createShaderModule({ label: `stamina-r13-${label}`, code });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter(message => message.type === 'error')
    .map(message => `${message.lineNum}:${message.linePos} ${message.message}`);
  if (errors.length) throw new Error(`${label} WGSL compilation failed: ${errors.join(' | ')}`);
  return { module, warnings: info.messages.filter(message => message.type === 'warning').map(message => message.message) };
}

const backgroundWGSL = `struct U { colour:vec4f }; @group(0) @binding(0) var<uniform> u:U;
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f {let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
@fragment fn fs()->@location(0)vec4f{return u.colour;}`;

function createLayouts() {
  const visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
  volumeLayout = device.createBindGroupLayout({ label: 'r13-world-80B-only', entries: [
    { binding: 0, visibility, buffer: { type: 'uniform', minBindingSize: 80 } },
  ] });
  bodyLayout = device.createBindGroupLayout({ label: 'r13-body-original-crop', entries: [
    { binding: 0, visibility, buffer: { type: 'uniform', minBindingSize: 80 } },
    { binding: 1, visibility, texture: { sampleType: 'float', viewDimension: '2d' } },
    { binding: 2, visibility, sampler: { type: 'filtering' } },
  ] });
  const sampleType = adapterFeatures.includes('float16-filterable') ? 'float' : 'unfilterable-float';
  const samplerType = adapterFeatures.includes('float16-filterable') ? 'filtering' : 'non-filtering';
  observeLayout = device.createBindGroupLayout({ label: `r13-observer-${sampleType}`, entries: [
    { binding: 0, visibility, buffer: { type: 'uniform', minBindingSize: 80 } },
    { binding: 1, visibility, texture: { sampleType, viewDimension: '2d' } },
    { binding: 2, visibility, texture: { sampleType, viewDimension: '2d' } },
    { binding: 3, visibility, sampler: { type: samplerType } },
  ] });
  backgroundLayout = device.createBindGroupLayout({ label: 'r13-light-panel-background', entries: [
    { binding: 0, visibility, buffer: { type: 'uniform', minBindingSize: 16 } },
  ] });
  sampler = device.createSampler({ label: 'r13-original-body-linear', magFilter: 'linear', minFilter: 'linear' });
  observeSampler = adapterFeatures.includes('float16-filterable') ? sampler : device.createSampler({ label: 'r13-hdr-nonfiltering', magFilter: 'nearest', minFilter: 'nearest' });
}

function createPipelines() {
  const blend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
  const volumePipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [volumeLayout] });
  const bodyPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bodyLayout] });
  const observerPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [observeLayout] });
  const module = worldModule.module;
  const makeWorld = (label, fragment) => device.createRenderPipeline({ label, layout: volumePipelineLayout,
    vertex: { module, entryPoint: 'volumeVertex' }, fragment: { module, entryPoint: fragment,
      targets: [{ format: 'rgba16float', blend }, { format: 'rgba16float', blend }] }, primitive: { topology: 'triangle-list' } });
  rearPipeline = makeWorld('r13-rear-volume', 'rearFragment');
  frontPipeline = makeWorld('r13-front-volume', 'frontFragment');
  bodyPipeline = device.createRenderPipeline({ label: 'r13-original-body-mrt', layout: bodyPipelineLayout,
    vertex: { module, entryPoint: 'bodyVertex' }, fragment: { module, entryPoint: 'bodyFragment',
      targets: [{ format: 'rgba16float', blend }, { format: 'rgba16float', blend }] }, primitive: { topology: 'triangle-list' } });
  observePipeline = device.createRenderPipeline({ label: 'r13-fullscreen-observer', layout: observerPipelineLayout,
    vertex: { module: observeModule.module, entryPoint: 'fullVertex' },
    fragment: { module: observeModule.module, entryPoint: 'finalFragment', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list' } });
  const bgModule = backgroundModule.module;
  backgroundPipeline = device.createRenderPipeline({ label: 'r13-light-panel-fill', layout: 'auto',
    vertex: { module: bgModule, entryPoint: 'vs' }, fragment: { module: bgModule, entryPoint: 'fs', targets: [{ format: 'rgba16float' }] },
    primitive: { topology: 'triangle-list' } });
  backgroundLayout = backgroundPipeline.getBindGroupLayout(0);
}

function createUniform(label) {
  return device.createBuffer({ label, size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
}

function makeTargets() {
  const width = Math.max(1, Math.round(canvas.clientWidth * (window.devicePixelRatio || 1)));
  const height = Math.max(1, Math.round(canvas.clientHeight * (window.devicePixelRatio || 1)));
  const dpr = window.devicePixelRatio || 1;
  const key = `${width}:${height}:${dpr}`;
  if (key === dimensionsKey) return false;
  dimensionsKey = key;
  canvas.width = width;
  canvas.height = height;
  const old = [sceneTexture, emissionTexture].filter(Boolean);
  const oldBindings = fixtureBindings;
  surface.configure({ device, format: canvasFormat, alphaMode: 'opaque' });
  sceneTexture = device.createTexture({ label: 'stamina-r13-scene-rgba16float', size: [width, height], format: 'rgba16float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC });
  emissionTexture = device.createTexture({ label: 'stamina-r13-final-original-emission-rgba16float', size: [width, height], format: 'rgba16float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC });
  if (old.length || oldBindings.length) void device.queue.onSubmittedWorkDone().finally(() => {
    old.forEach(texture => texture.destroy());
    for (const binding of oldBindings) for (const buffer of [binding.rearUniform, binding.bodyUniform, binding.frontUniform, binding.observeUniform]) buffer.destroy();
  });
  fixtures = fixtureLayout(width, height, dpr).map(fixture => ({ ...fixture }));
  fixtureBindings = fixtures.map(fixture => ({
    fixture,
    rearUniform: createUniform(`${fixture.id}-world-rear-80B`),
    bodyUniform: createUniform(`${fixture.id}-world-body-80B`),
    frontUniform: createUniform(`${fixture.id}-world-front-80B`),
    observeUniform: createUniform(`${fixture.id}-observe-80B`),
  }));
  for (const binding of fixtureBindings) {
    binding.rearGroup = device.createBindGroup({ label: `${binding.fixture.id}-rear-uniform-only`, layout: volumeLayout,
      entries: [{ binding: 0, resource: { buffer: binding.rearUniform, offset: 0, size: 80 } }] });
    binding.frontGroup = device.createBindGroup({ label: `${binding.fixture.id}-front-uniform-only`, layout: volumeLayout,
      entries: [{ binding: 0, resource: { buffer: binding.frontUniform, offset: 0, size: 80 } }] });
    binding.bodyGroup = device.createBindGroup({ label: `${binding.fixture.id}-original-body`, layout: bodyLayout, entries: [
      { binding: 0, resource: { buffer: binding.bodyUniform, offset: 0, size: 80 } },
      { binding: 1, resource: originalTexture.createView() }, { binding: 2, resource: sampler },
    ] });
    binding.observeGroup = device.createBindGroup({ label: `${binding.fixture.id}-observer`, layout: observeLayout, entries: [
      { binding: 0, resource: { buffer: binding.observeUniform, offset: 0, size: 80 } },
      { binding: 1, resource: sceneTexture.createView() }, { binding: 2, resource: emissionTexture.createView() },
      { binding: 3, resource: observeSampler },
    ] });
  }
  backgroundGroup = device.createBindGroup({ label: 'stamina-r13-light-panel-background', layout: backgroundLayout,
    entries: [{ binding: 0, resource: { buffer: lightBackgroundUniform, offset: 0, size: 16 } }] });
  return true;
}

function setControlFlags(flags) {
  for (const [name, value] of Object.entries(flags)) if (inputs[name]) inputs[name].checked = !!value;
}

function resetPreview({ preserveImageCenter = true } = {}) {
  previewGeneration++;
  epochStart = performance.now();
  pausedU = null;
  cycle = 0;
  ageMs = 0;
  cycleKey = `${previewGeneration}:0`;
  seenReceipts.clear();
  receiptByFixture.clear();
  for (const fixture of fixtures) {
    const next = resetFixture(fixture, canvas.width, canvas.height);
    fixture.anchor = next.anchor;
    if (!preserveImageCenter) fixture.imageCenter = next.imageCenter;
    const event = makeReceiptEvent(fixture.id, cycleKey, epochStart, durationMs);
    const actor = { id: event.playerId, alive: true, ejected: false, inVent: false, visible: true };
    let seen = seenReceipts.get(fixture.id);
    if (!seen) { seen = new Set(); seenReceipts.set(fixture.id, seen); }
    const receipt = acceptReceipt(event, actor, seen);
    receiptByFixture.set(fixture.id, { event, actor, receipt });
  }
  audio.reset();
}

function setPhase(value) {
  const phase = Number(value);
  if (!Number.isFinite(phase)) throw new Error('phase must be finite');
  pausedU = Math.max(0, Math.min(1.001, phase));
  ageMs = pausedU * durationMs;
  cycle = 0;
}

function eventFor(fixtureId = 'dark') {
  return receiptByFixture.get(fixtureId) ?? null;
}

function moveAnchor(fixtureId, x, y) {
  const fixture = fixtures.find(item => item.id === fixtureId);
  if (!fixture || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error('invalid fixture anchor');
  fixture.anchor[0] = x; fixture.anchor[1] = y;
}

function moveImageCenter(fixtureId, x, y) {
  const fixture = fixtures.find(item => item.id === fixtureId);
  if (!fixture || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error('invalid fixture imageCenter');
  fixture.imageCenter[0] = x; fixture.imageCenter[1] = y;
}

function snapshot() {
  return { status: status?.textContent ?? '', verify, gpuReady, firstSubmit, dimensions: [canvas.width, canvas.height],
    adapter: adapter?.info ?? null, features: adapterFeatures, submittedFrames, frameCount, renderDraws, faults: [...faults],
    ageMs, durationMs, phase: durationMs ? ageMs / durationMs : null, cycle,
    flags: readFlags(), fixtures: fixtures.map(fixture => ({ ...fixture, anchor: [...fixture.anchor], imageCenter: [...fixture.imageCenter] })),
    receipts: fixtures.map(fixture => ({ fixture: fixture.id, receipt: receiptByFixture.get(fixture.id)?.receipt ?? null })),
    audio: audio.snapshot() };
}

function applyDuration() {
  durationMs = Number(durationInput?.value || 1500);
  resetPreview();
}

async function gpuCheck() {
  if (!gpuReady) throw new Error('GPU check requires ready device');
  const records = [];
  const original = readFlags();
  try {
    for (const phase of [0, .03, .085, .14, .25, .42, .57, .62, .66, .71, .78, .84, .94, .999, 1, 1.001]) {
      setControlFlags(FLAGS_ON); setPhase(phase); renderFrame(performance.now(), false);
      await device.queue.onSubmittedWorkDone();
      records.push({ phase, state: snapshot(), emission: await captureEmissionSupport() });
    }
    setControlFlags(FLAGS_MAIN_ONLY); setPhase(.42); renderFrame(performance.now(), false);
    await device.queue.onSubmittedWorkDone();
    records.push({ phase: 'main-only-.42', state: snapshot(), emission: await captureEmissionSupport() });
  } finally { setControlFlags(original); }
  const normal = records.find(item => item.phase === 0);
  const active = records.find(item => item.phase === .42);
  const tail = records.find(item => item.phase === .94);
  const ended = records.find(item => item.phase === 1.001);
  const mainOnly = records.find(item => item.phase === 'main-only-.42');
  setControlFlags(FLAGS_ON); setPhase(.42);
  const darkFixture = fixtures.find(item => item.id === 'dark');
  const anchorBefore = [...darkFixture.anchor];
  const centerBefore = [...darkFixture.imageCenter];
  const movedByPx = 64 * (window.devicePixelRatio || 1);
  moveAnchor('dark', anchorBefore[0] + movedByPx, anchorBefore[1]);
  renderFrame(performance.now(), false); await device.queue.onSubmittedWorkDone();
  const actorMoved = await captureEmissionSupport();
  const movedFixture = actorMoved.fixtures.find(item => item.id === 'dark');
  moveAnchor('dark', anchorBefore[0], anchorBefore[1]);
  moveImageCenter('dark', centerBefore[0] + movedByPx, centerBefore[1]);
  renderFrame(performance.now(), false); await device.queue.onSubmittedWorkDone();
  const cameraMoved = await captureEmissionSupport();
  const cameraFixture = cameraMoved.fixtures.find(item => item.id === 'dark');
  moveImageCenter('dark', centerBefore[0], centerBefore[1]);
  renderFrame(performance.now(), false);
  const actorShift = movedFixture.alphaBounds[0] - active.emission.fixtures[0].alphaBounds[0];
  const cameraShift = cameraFixture.alphaBounds[0] - active.emission.fixtures[0].alphaBounds[0];
  const bodyHeights = normal.emission.fixtures.map(item => item.alphaBounds ? item.alphaBounds[3] - item.alphaBounds[1] + 1 : 0);
  const assert = (condition, message) => { if (!condition) throw new Error(`GPU acceptance check: ${message}`); };
  assert(records.every(item => item.state.gpuReady && item.state.firstSubmit && item.state.faults.length === 0), 'all states compile/submit without device faults');
  assert(normal.emission.fixtures.length === 2 && normal.emission.fixtures.every(item => item.alphaPixels > 0), 'both independent actors rasterize');
  assert(normal.emission.fixtures.every(item => item.alphaBounds && item.rgbPixels === 0), 'phase zero has original body and no E radiance');
  assert(Math.max(...bodyHeights) / Math.min(...bodyHeights) < 1.03, 'two independent body raster supports match');
  assert(active.emission.fixtures.every(item => item.rgbPixels > 0 && item.maxRgb > 0.5), 'midlife source has two independent MRT supports');
  assert(tail.emission.fixtures.every(item => item.rgbPixels > 0), 'pre-expiry E support remains visible');
  assert(ended.emission.fixtures.every(item => item.maxRgb < 0.01), 'expired source radiance returns to zero');
  assert(mainOnly.emission.fixtures.every(item => item.rgbPixels > 0), 'main-only retains primary source');
  assert(Math.abs(actorShift - movedByPx) <= 1 && movedFixture.alphaBounds[1] === active.emission.fixtures[0].alphaBounds[1], 'actor/source position follows independent actor anchor');
  assert(cameraShift === 0 && JSON.stringify(centerBefore) !== JSON.stringify([centerBefore[0] + movedByPx, centerBefore[1]]), 'observer imageCenter mutation leaves world MRT unchanged');
  const audioState = audio.snapshot();
  assert(verify && audioState.audioState === 'not-created' && audioState.audioGain === 0 && audioState.voiceCount === 0 && audioState.starts.length === 0,
    'verification remains immutable and silent');
  return { version: 'r13', verify, records, bodyHeightsPhysicalPx: bodyHeights,
    bodyHeightsCssPx: bodyHeights.map(value => value / (window.devicePixelRatio || 1)),
    warnings: [worldModule.warnings, observeModule.warnings, backgroundModule.warnings], audio: audioState,
    movement: { movedByPx, actorShift, cameraShift, anchorBefore, imageCenterBefore: centerBefore, actorMovedBounds: movedFixture.alphaBounds,
      imageCenterMovedMrtBounds: cameraFixture.alphaBounds },
    acceptance: { shaderCompile: 'PASS', submittedStates: records.length, noDeviceFaults: true, distinctH64Actors: true,
      sameBodyPixelSupport: true, primaryMidlifeRadiance: true, finiteExpiry: true, mainOnlyPreservesPrimary: true,
      actorAnchorMovesWorldSupport: Math.abs(actorShift - movedByPx) <= 1,
      observerCenterIndependentOfWorldMrt: cameraShift === 0, verifySilent: true } };
}

async function fullLifeCheck() {
  const cases = [];
  for (const targetDuration of [900, 1500, 2200]) {
    durationMs = targetDuration;
    if (durationInput) durationInput.value = String(targetDuration);
    resetPreview();
    const start = epochStart;
    const waitUntil = async at => { const delay = at - performance.now(); if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      renderFrame(performance.now(), false); };
    await waitUntil(start + targetDuration * .42);
    await device.queue.onSubmittedWorkDone();
    const activeState = snapshot();
    const activeEmission = await captureEmissionSupport();
    await waitUntil(start + targetDuration + 20);
    await device.queue.onSubmittedWorkDone();
    const expiredState = snapshot();
    const expiredEmission = await captureEmissionSupport();
    cases.push({ durationMs: targetDuration, activeAgeMs: activeState.ageMs, activeSupports: activeEmission.fixtures.map(f => ({ id: f.id, rgbPixels: f.rgbPixels, maxRgb: f.maxRgb })),
      expiredAgeMs: expiredState.ageMs, expiredSupports: expiredEmission.fixtures.map(f => ({ id: f.id, rgbPixels: f.rgbPixels, maxRgb: f.maxRgb })) });
  }
  const pass = cases.every(item => item.activeAgeMs > 0 && item.activeAgeMs < item.durationMs && item.activeSupports.every(f => f.rgbPixels > 0)
    && item.expiredAgeMs >= item.durationMs && item.expiredSupports.every(f => f.maxRgb < .01));
  return { status: pass ? 'PASS' : 'FAIL', cases };
}

async function initialize() {
  if (!navigator.gpu) throw new Error('WebGPU unavailable');
  adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('WebGPU adapter unavailable');
  adapterFeatures = [...adapter.features];
  const requiredFeatures = adapter.features.has('float16-filterable') ? ['float16-filterable'] : [];
  device = await adapter.requestDevice({ requiredFeatures });
  device.addEventListener('uncapturederror', event => fault(event.error));
  surface = canvas.getContext('webgpu');
  if (!surface) throw new Error('WebGPU canvas context unavailable');
  canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  const [worldText, observeText, backgroundText, crop] = await Promise.all([
    fetch(new URL('./world.wgsl', import.meta.url), { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error(`world shader HTTP ${response.status}`); return response.text(); }),
    fetch(new URL('./observe.wgsl', import.meta.url), { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error(`observer shader HTTP ${response.status}`); return response.text(); }),
    Promise.resolve(backgroundWGSL), fetchOriginalCrop(),
  ]);
  const [world, observe, background] = await Promise.all([
    checkedShader(worldText, 'world'), checkedShader(observeText, 'observe'), checkedShader(backgroundText, 'background'),
  ]);
  worldModule = world; observeModule = observe; backgroundModule = background;
  createLayouts();
  const atlas = device.createTexture({ label: 'stamina-r13-original-crop-136x225', size: [136, 225], format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
  device.queue.copyExternalImageToTexture({ source: crop.bitmap }, { texture: atlas, premultipliedAlpha: false }, [136, 225]);
  crop.bitmap.close();
  originalTexture = atlas;
  lightBackgroundUniform = device.createBuffer({ label: 'r13-light-panel-linear-background-16B', size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(lightBackgroundUniform, 0, new Float32Array([.62, .65, .70, 1]));
  createPipelines();
  surface.configure({ device, format: canvasFormat, alphaMode: 'opaque' });
  makeTargets();
  currentVisible = !document.hidden;
  gpuReady = true;
  resetPreview();
  setStatus(`WebGPU ready · ${canvas.width}×${canvas.height} · H64 × 2 · ${verify ? 'verify silent' : 'explicit gesture audio'}`);
  animation = requestAnimationFrame(renderFrame);
  if (query.has('gpu-check')) {
    const result = await gpuCheck();
    status.dataset.gpuCheck = JSON.stringify(result);
    setStatus(`GPU check complete · ${result.records.length} states · audio context ${result.audio.audioState}`);
  }
  if (query.has('full-life-check')) {
    const result = await fullLifeCheck();
    status.dataset.fullLifeCheck = JSON.stringify(result);
    setStatus(`Full-life check ${result.status} · ${result.cases.length} durations · expiry radiance zero`);
  }
}

function dispose() {
  if (disposed) return;
  disposed = true;
  if (animation) cancelAnimationFrame(animation);
  for (const [target, type, listener, options] of listeners) target.removeEventListener(type, listener, options);
  audio.dispose();
  for (const binding of fixtureBindings) for (const buffer of [binding.rearUniform, binding.bodyUniform, binding.frontUniform, binding.observeUniform]) buffer.destroy();
  for (const texture of [sceneTexture, emissionTexture, originalTexture]) texture?.destroy();
  lightBackgroundUniform?.destroy();
  device?.destroy();
}

function bindControls() {
  for (const input of Object.values(inputs)) if (input) addListener(input, 'change', () => { if (input === inputs.source && !input.checked) audio.reset(); });
  if (durationInput) addListener(durationInput, 'change', applyDuration);
  if (phaseInput) addListener(phaseInput, 'input', () => setPhase(phaseInput.value));
  const reset = document.querySelector('#reset');
  if (reset) addListener(reset, 'click', () => { setControlFlags(FLAGS_ON); resetPreview(); });
  const mainOnly = document.querySelector('#main-only');
  if (mainOnly) addListener(mainOnly, 'click', () => { setControlFlags(FLAGS_MAIN_ONLY); resetPreview(); });
  const combined = document.querySelector('#combined');
  if (combined) addListener(combined, 'click', () => { setControlFlags(FLAGS_ON); resetPreview(); });
  const sound = document.querySelector('#sound');
  if (sound) addListener(sound, 'click', async () => { try { await audio.activateFromGesture({ id: 'stamina-r13-preview' }); setStatus(`Audio · ${audio.snapshot().status}`); } catch (error) { setStatus(`Audio · ${error.message}`); } });
  addListener(window, 'resize', () => { if (gpuReady) makeTargets(); });
  addListener(document, 'visibilitychange', () => {
    currentVisible = !document.hidden;
    if (!currentVisible) audio.reset();
    else if (gpuReady && !disposed) animation = requestAnimationFrame(renderFrame);
  });
  addListener(window, 'pagehide', dispose, { once: true });
}

globalThis.__staminaR13 = Object.freeze({ snapshot, gpuCheck, captureEmissionSupport, eventFor, moveAnchor, moveImageCenter,
  setPhase, setDuration: value => { durationMs = Number(value); resetPreview(); }, setFlags: setControlFlags,
  fullLifeCheck, reset: resetPreview, assertOnGate: () => assertOnMeasurementGate({ flags: readFlags(), receiptLive: ageMs < durationMs,
    actorVisible: fixtures.every(fixture => visibleOwner(receiptByFixture.get(fixture.id)?.actor)), firstSubmit, gpuReady }) });

bindControls();
initialize().catch(error => fault(error));

function createEventFor(fixtureId, cycleId, at, duration) {
  const event = makeReceiptEvent(fixtureId, cycleId, at, duration);
  const actor = { id: event.playerId, alive: true, ejected: false, inVent: false, visible: true };
  let seen = seenReceipts.get(fixtureId);
  if (!seen) { seen = new Set(); seenReceipts.set(fixtureId, seen); }
  const receipt = acceptReceipt(event, actor, seen);
  receiptByFixture.set(fixtureId, { event, actor, receipt });
}

function readClock(now) {
  const previewPeriod = durationMs + 650;
  if (pausedU !== null) {
    ageMs = pausedU * durationMs;
    cycle = 0;
    return;
  }
  const elapsed = Math.max(0, now - epochStart);
  cycle = Math.floor(elapsed / previewPeriod);
  cycleKey = `${previewGeneration}:${cycle}`;
  ageMs = elapsed - cycle * previewPeriod;
  for (const fixture of fixtures) {
    const current = receiptByFixture.get(fixture.id);
    if (!current || current.event.id !== `stamina-r13-preview:${fixture.id}:${cycleKey}`) {
      createEventFor(fixture.id, cycleKey, epochStart + cycle * previewPeriod, durationMs);
    }
  }
}

function writeUniformPair(binding, fixture, flags, receiptLive) {
  const uniforms = makeUniformPair({ fixture, width: canvas.width, height: canvas.height, ageMs, durationMs, receiptLive, flags });
  // Rear/front/body need independently gated world values; observe owns its separate 80-byte record.
  const rear = uniforms.world.slice();
  const body = uniforms.world.slice();
  const front = uniforms.world.slice();
  rear[12] = flags.coverage ? 1 : 0; rear[13] = flags.incident ? 1 : 0; rear[14] = 0; rear[15] = flags.rear ? 1 : 0;
  body[12] = flags.coverage ? 1 : 0; body[13] = flags.incident ? 1 : 0;
  front[12] = flags.coverage ? 1 : 0; front[13] = flags.incident ? 1 : 0; front[14] = flags.front ? 1 : 0; front[15] = 0;
  const pair = [
    [binding.rearUniform, rear], [binding.bodyUniform, body], [binding.frontUniform, front], [binding.observeUniform, uniforms.observe],
  ];
  for (const [buffer, data] of pair) device.queue.writeBuffer(buffer, 0, data.buffer, data.byteOffset, 80);
}

function setFrameUniforms(now) {
  readClock(now);
  const flags = readFlags();
  for (const binding of fixtureBindings) {
    const record = receiptByFixture.get(binding.fixture.id);
    const live = !!record?.receipt && ageMs >= 0 && ageMs < record.receipt.durationMs;
    const canSource = !!record?.receipt && visibleOwner(record.actor) && currentVisible;
    writeUniformPair(binding, binding.fixture, { ...flags, source: flags.source && canSource }, live);
  }
  if (phaseInput && pausedU === null) phaseInput.value = String(Math.max(0, Math.min(1.001, ageMs / durationMs)));
  if (phaseReadout) phaseReadout.value = `${Math.round(ageMs)} / ${durationMs} ms`;
  return flags;
}

function renderFrame(now, schedule = true) {
  if (disposed || !gpuReady || !currentVisible) return;
  if (schedule) animation = requestAnimationFrame(renderFrame);
  if (!makeTargets()) { /* dimensions and fixture bindings remain current */ }
  const flags = setFrameUniforms(now);
  const records = fixtures.map(fixture => receiptByFixture.get(fixture.id));
  const audioLive = flags.source && records.some((record, index) => record?.receipt && visibleOwner(record.actor) && fixtures[index].anchor[0] > 0);
  audio.update({ cycle, ageMs, durationMs, active: audioLive, visible: currentVisible, firstSubmit, gpuReady, rate: 1 });

  const dark = fixtures[0].background;
  const clear = device.createCommandEncoder({ label: `stamina-r13-clear-${cycle}-${Math.floor(ageMs)}` });
  const clearPass = clear.beginRenderPass({ label: 'clear-independent-fixture-scene-and-emission', colorAttachments: [
    { view: sceneTexture.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: dark[0], g: dark[1], b: dark[2], a: 1 } },
    { view: emissionTexture.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } },
  ] });
  clearPass.end();

  const backgroundEncoder = device.createCommandEncoder({ label: 'stamina-r13-light-fixture-background' });
  const light = backgroundEncoder.beginRenderPass({ label: 'light-test-panel-background', colorAttachments: [
    { view: sceneTexture.createView(), loadOp: 'load', storeOp: 'store' },
  ] });
  const middle = Math.floor(canvas.width / 2);
  light.setScissorRect(middle, 0, canvas.width - middle, canvas.height);
  light.setPipeline(backgroundPipeline);
  light.setBindGroup(0, backgroundGroup);
  light.draw(3);
  light.end();

  const worldEncoder = device.createCommandEncoder({ label: `stamina-r13-world-${cycle}-${Math.floor(ageMs)}` });
  const worldPass = worldEncoder.beginRenderPass({ label: 'rear-original-front-two-independent-H64-fixtures', colorAttachments: [
    { view: sceneTexture.createView(), loadOp: 'load', storeOp: 'store' },
    { view: emissionTexture.createView(), loadOp: 'load', storeOp: 'store' },
  ] });
  for (const binding of fixtureBindings) {
    worldPass.setPipeline(rearPipeline);
    worldPass.setBindGroup(0, binding.rearGroup);
    worldPass.draw(6);
    worldPass.setPipeline(bodyPipeline);
    worldPass.setBindGroup(0, binding.bodyGroup);
    worldPass.draw(6);
    worldPass.setPipeline(frontPipeline);
    worldPass.setBindGroup(0, binding.frontGroup);
    worldPass.draw(6);
    renderDraws += 3;
  }
  worldPass.end();

  const presentEncoder = device.createCommandEncoder({ label: `stamina-r13-observe-${cycle}-${Math.floor(ageMs)}` });
  const presentPass = presentEncoder.beginRenderPass({ label: 'full-viewport-observer-per-fixture-panel', colorAttachments: [
    { view: surface.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } },
  ] });
  presentPass.setPipeline(observePipeline);
  for (const binding of fixtureBindings) {
    const [x, y, width, height] = binding.fixture.panel;
    presentPass.setScissorRect(x, y, width, height);
    presentPass.setBindGroup(0, binding.observeGroup);
    presentPass.draw(3);
    renderDraws++;
  }
  presentPass.end();

  device.queue.submit([clear.finish(), backgroundEncoder.finish(), worldEncoder.finish(), presentEncoder.finish()]);
  submittedFrames++;
  firstSubmit = true;
  frameCount++;
  lastNow = now;
  lastFlags = flags;
}

let lastFlags = { ...FLAGS_ON };
let currentVisible = !document.hidden;

function halfToFloat(bits) {
  const sign = (bits & 0x8000) ? -1 : 1;
  const exponent = (bits >>> 10) & 0x1f;
  const fraction = bits & 0x3ff;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

async function readHalfTexture(texture) {
  await device.queue.onSubmittedWorkDone();
  const width = canvas.width, height = canvas.height, bytesPerRow = Math.ceil(width * 8 / 256) * 256;
  const buffer = device.createBuffer({ size: bytesPerRow * height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const encoder = device.createCommandEncoder({ label: 'stamina-r13-readback-support' });
  encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow, rowsPerImage: height }, [width, height]);
  device.queue.submit([encoder.finish()]);
  await buffer.mapAsync(GPUMapMode.READ);
  const bytes = buffer.getMappedRange().slice(0);
  buffer.unmap(); buffer.destroy();
  return { bytes, width, height, bytesPerRow };
}

function analyzeReadback(readback, threshold = 0.5) {
  const { bytes, width, height, bytesPerRow } = readback;
  const view = new DataView(bytes);
  const samples = fixtures.map(fixture => ({ id: fixture.id, anchor: fixture.anchor.slice(0, 2), imageCenter: fixture.imageCenter.slice(),
    alphaBounds: [Infinity, Infinity, -Infinity, -Infinity], alphaPixels: 0,
    rgbBounds: [Infinity, Infinity, -Infinity, -Infinity], rgbPixels: 0, maxRgb: 0 }));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const fixtureIndex = x < width / 2 ? 0 : 1;
      const fixture = fixtures[fixtureIndex], sample = samples[fixtureIndex];
      const offset = y * bytesPerRow + x * 8;
      const r = halfToFloat(view.getUint16(offset, true));
      const g = halfToFloat(view.getUint16(offset + 2, true));
      const b = halfToFloat(view.getUint16(offset + 4, true));
      const a = halfToFloat(view.getUint16(offset + 6, true));
      if (a > threshold) {
        sample.alphaPixels++;
        sample.alphaBounds[0] = Math.min(sample.alphaBounds[0], x); sample.alphaBounds[1] = Math.min(sample.alphaBounds[1], y);
        sample.alphaBounds[2] = Math.max(sample.alphaBounds[2], x); sample.alphaBounds[3] = Math.max(sample.alphaBounds[3], y);
      }
      const lum = Math.max(r, g, b);
      if (lum > threshold) {
        sample.rgbPixels++;
        sample.rgbBounds[0] = Math.min(sample.rgbBounds[0], x); sample.rgbBounds[1] = Math.min(sample.rgbBounds[1], y);
        sample.rgbBounds[2] = Math.max(sample.rgbBounds[2], x); sample.rgbBounds[3] = Math.max(sample.rgbBounds[3], y);
      }
      sample.maxRgb = Math.max(sample.maxRgb, lum);
    }
  }
  for (const sample of samples) {
    if (!Number.isFinite(sample.alphaBounds[0])) sample.alphaBounds = null;
    if (!Number.isFinite(sample.rgbBounds[0])) sample.rgbBounds = null;
  }
  return { width, height, threshold, fixtures: samples };
}

async function captureEmissionSupport() {
  if (!firstSubmit || !gpuReady) throw new Error('readback requires a ready, submitted GPU frame');
  return analyzeReadback(await readHalfTexture(emissionTexture), 0.25);
}

class StaminaAudio {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.voice = null;
    this.buffer = null;
    this.bufferDuration = 0;
    this.played = new Set();
    this.skipped = new Set();
    this.lastResult = verify ? 'verify-silent' : 'gesture-required';
  }

  async activateFromGesture(item) {
    if (verify) {
      this.enabled = false;
      this.lastResult = 'verify-immutable-silent';
      return this.snapshot();
    }
    if (!gpuReady || !firstSubmit) throw new Error('audio waits for GPU ready and successful first submit');
    if (!item || typeof item !== 'object') throw new Error('explicit gallery item required for gesture audio');
    this.context ??= new AudioContext();
    await this.context.resume();
    this.enabled = true;
    this.lastResult = 'enabled-by-gesture';
    this.update({ cycle, ageMs, durationMs, active: !!receiptByFixture.get('dark')?.receipt, visible: currentVisible, firstSubmit, gpuReady, rate: 1 });
    return this.snapshot();
  }

  #stopVoice() {
    const voice = this.voice;
    this.voice = null;
    if (!voice) return;
    try { voice.source.stop(); } catch { /* already ended */ }
    try { voice.source.disconnect(); } catch { /* already disconnected */ }
    try { voice.gain.disconnect(); } catch { /* already disconnected */ }
  }

  setMuted(muted) {
    if (verify) {
      this.enabled = false;
      this.#stopVoice();
      this.lastResult = 'verify-immutable-silent';
      return this.snapshot();
    }
    if (!muted) {
      this.lastResult = 'gesture-required';
      return this.snapshot();
    }
    this.enabled = false;
    this.#stopVoice();
    this.lastResult = 'muted';
    return this.snapshot();
  }

  update({ cycle: cycleNow, ageMs: ageNow, durationMs: durationNow, active, visible, firstSubmit: submitted, gpuReady: ready, rate = 1 }) {
    if (verify || !this.enabled || !this.context) return this.snapshot();
    const key = `${previewGeneration}:${cycleNow}`;
    if (!active || !visible || !submitted || !ready || ageNow < 0 || ageNow >= durationNow) {
      this.skipped.add(key);
      this.#stopVoice();
      return this.snapshot();
    }
    if (this.played.has(key) || this.skipped.has(key) || this.voice) return this.snapshot();
    if (this.bufferDuration !== durationNow || !this.buffer) {
      const pcm = synthesize(durationNow, 48000);
      const buffer = this.context.createBuffer(1, pcm.length, 48000);
      buffer.copyToChannel(pcm, 0);
      this.buffer = buffer;
      this.bufferDuration = durationNow;
    }
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffer;
    source.playbackRate.value = Number.isFinite(rate) && rate > 0 ? rate : 1;
    gain.gain.value = 1;
    source.connect(gain).connect(this.context.destination);
    const voice = { source, gain, key, offsetSeconds: ageNow / 1000, durationSeconds: Math.max(0, durationNow - ageNow) / 1000 };
    this.voice = voice;
    this.played.add(key);
    source.onended = () => {
      if (this.voice === voice) this.voice = null;
      try { source.disconnect(); } catch { /* already disconnected */ }
      try { gain.disconnect(); } catch { /* already disconnected */ }
    };
    source.start(this.context.currentTime, voice.offsetSeconds, voice.durationSeconds);
    this.lastResult = 'score-synced-to-event-age';
    return this.snapshot();
  }

  reset() {
    this.#stopVoice();
    if (!verify) this.skipped.delete(`${previewGeneration}:${cycle}`);
  }

  snapshot() {
    return {
      verify,
      enabled: this.enabled && !verify,
      audioState: verify ? 'not-created' : (this.context?.state ?? 'not-created'),
      audioGain: verify ? 0 : (this.enabled ? 'r13-score-gain-1' : 0),
      voiceCount: this.voice ? 1 : 0,
      starts: [...this.played],
      status: this.lastResult,
    };
  }

  dispose() {
    this.enabled = false;
    this.#stopVoice();
    this.played.clear();
    this.skipped.clear();
    const context = this.context;
    this.context = null;
    this.buffer = null;
    this.bufferDuration = 0;
    void context?.close();
    this.lastResult = 'disposed';
  }
}

const audio = new StaminaAudio();
globalThis.__gallerySfx = Object.freeze({
  activateFromGesture: item => audio.activateFromGesture(item),
  setMuted: muted => audio.setMuted(muted),
  stop: () => audio.setMuted(true),
  snapshot: () => audio.snapshot(),
});

