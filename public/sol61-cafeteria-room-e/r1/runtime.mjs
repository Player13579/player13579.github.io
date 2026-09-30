import { ROOM, fitRoom, uniformsAt } from './scene.mjs';
import { drawPlan } from './draw-plan.mjs';
import { WORLD_SHADER } from './world-shader.mjs';
import { POST_SHADER } from './post-shader.mjs';
import { RoomSfx } from './sfx.mjs';

const query = new URLSearchParams(location.search);
const verify = query.has('verify');
if (query.has('embed')) document.body.classList.add('embedded');

const canvas = document.querySelector('#stage');
const status = document.querySelector('#status');
const controls = Object.fromEntries(['active', 'lighting', 'steam', 'purge', 'reflections', 'obs', 'cross', 'bitmapOnly', 'reducedMotion']
  .map(name => [name, document.querySelector(`#${name}`)]));
const phaseInput = document.querySelector('#phase');
const phaseReadout = document.querySelector('#phase-readout');
const listeners = [];
const faults = [];
const addListener = (target, type, listener, options) => {
  target.addEventListener(type, listener, options);
  listeners.push([target, type, listener, options]);
};
const flagValues = () => Object.fromEntries(Object.entries(controls).map(([name, input]) => [name, input.checked]));
const current = { cycle: 0, ageMs: 0, pausedAgeMs: null, visible: !document.hidden, active: true };
const audio = new RoomSfx({ verify, clock: () => ({ cycle: current.cycle, ageMs: current.ageMs }) });
const gallerySfx = Object.freeze({
  activateFromGesture: () => audio.activateFromGesture(),
  setMuted: muted => audio.setMuted(muted),
  stop: () => audio.setMuted(true),
  snapshot: () => audio.snapshot(),
});
globalThis.__gallerySfx = gallerySfx;

let device;
let adapter;
let surface;
let canvasFormat;
let bitmapTexture;
let sampler;
let roomModule;
let postModule;
let worldPipeline;
let postPipeline;
let worldLayout;
let postLayout;
let postGroup;
let worldGroups = [];
let worldUniformBuffers = [];
let postUniformBuffer;
let textures = [];
let dimensions = '';
let animation = 0;
let previousFrameTime = 0;
let frames = 0;
let renderDraws = 0;
let lastPlan = [];
let disposed = false;
const MAX_DRAWS = 32;
const UNIFORM_BYTES = 96;
const UNIFORM_SLOT_BYTES = 256;

function setStatus(text) {
  if (status) status.textContent = String(text);
}

function setFault(error) {
  faults.push(error?.message || String(error));
  setStatus(`WebGPU error: ${faults.at(-1)}`);
}

async function fetchVerifiedBitmap() {
  const response = await fetch('./inputs/public-cafeteria-attempt04.png', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Room bitmap HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  if (hash !== ROOM.bitmapHash) throw new Error(`Room bitmap hash mismatch: ${hash}`);
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), {
    colorSpaceConversion: 'none', premultiplyAlpha: 'none',
  });
  if (bitmap.width !== ROOM.width || bitmap.height !== ROOM.height) {
    bitmap.close();
    throw new Error(`Room bitmap dimensions ${bitmap.width}x${bitmap.height}`);
  }
  return bitmap;
}

function compilationErrors(info) {
  return info.messages.filter(message => message.type === 'error')
    .map(message => `${message.lineNum}:${message.linePos} ${message.message}`);
}

async function checkedShader(code, label) {
  const module = device.createShaderModule({ code });
  const info = await module.getCompilationInfo();
  const errors = compilationErrors(info);
  if (errors.length) throw new Error(`${label} WGSL compile errors:\n${errors.join('\n')}`);
  return module;
}

function makeUniformBuffer(label) {
  return device.createBuffer({ label, size: UNIFORM_SLOT_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
}

function resizeTargets() {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  const key = `${width}:${height}:${dpr}`;
  if (key === dimensions) return false;
  dimensions = key;
  canvas.width = width;
  canvas.height = height;
  surface.configure({ device, format: canvasFormat, alphaMode: 'opaque' });
  const old = textures;
  textures = [0, 1].map(index => device.createTexture({
    label: index === 0 ? 'room-scene-rgba16float' : 'room-bright-rgba16float',
    size: [width, height], format: 'rgba16float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  }));
  if (old.length) device.queue.onSubmittedWorkDone().finally(() => old.forEach(texture => texture.destroy()));
  postGroup = device.createBindGroup({ layout: postLayout, entries: [
    { binding: 0, resource: { buffer: postUniformBuffer, offset: 0, size: UNIFORM_BYTES } },
    { binding: 1, resource: textures[0].createView() },
    { binding: 2, resource: textures[1].createView() },
  ] });
  return true;
}

function pixelScissor(bounds, width, height, fit) {
  const left = Math.max(0, Math.floor(fit.offset[0] + bounds[0] * fit.scale));
  const top = Math.max(0, Math.floor(fit.offset[1] + bounds[1] * fit.scale));
  const right = Math.min(width, Math.ceil(fit.offset[0] + bounds[2] * fit.scale));
  const bottom = Math.min(height, Math.ceil(fit.offset[1] + bounds[3] * fit.scale));
  return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

function writeUniform(buffer, ageMs, flags, draw) {
  const values = uniformsAt(canvas.width, canvas.height, ageMs, { ...flags, dpr: window.devicePixelRatio || 1 });
  if (draw) {
    values.set([draw.kind, draw.index, draw.cycle, 0], 16);
    values.set(draw.bounds, 20);
  }
  device.queue.writeBuffer(buffer, 0, values.buffer, values.byteOffset, UNIFORM_BYTES);
}

function updatePhaseControl() {
  if (phaseInput && current.pausedAgeMs !== null) phaseInput.value = String(Math.min(ROOM.episodeMs, current.pausedAgeMs));
  if (phaseReadout) phaseReadout.value = `${Math.round(current.ageMs)} ms`;
}

function readClock(now) {
  if (current.pausedAgeMs !== null) {
    current.ageMs = current.pausedAgeMs;
    current.cycle = 0;
  } else {
    const total = Math.max(0, now - epochStart);
    current.cycle = Math.floor(total / ROOM.episodeMs);
    current.ageMs = total - current.cycle * ROOM.episodeMs;
  }
  updatePhaseControl();
}

let epochStart = performance.now();

function render(now) {
  if (disposed || !current.visible) return;
  animation = requestAnimationFrame(render);
  if (previousFrameTime && now - previousFrameTime > 250) audio.update(current.cycle, current.ageMs, { active: false, visible: true });
  previousFrameTime = now;
  resizeTargets();
  readClock(now);
  const flags = flagValues();
  current.active = flags.active;
  audio.update(current.cycle, current.ageMs, { active: flags.active, visible: current.visible });
  const plan = drawPlan(current.ageMs, flags);
  if (plan.length > MAX_DRAWS) throw new Error(`Runtime draw count ${plan.length} exceeds ${MAX_DRAWS}`);
  const fit = fitRoom(canvas.width, canvas.height);
  for (let index = 0; index < plan.length; index++) writeUniform(worldUniformBuffers[index], current.ageMs, flags, plan[index]);
  writeUniform(postUniformBuffer, current.ageMs, flags, null);

  const encoder = device.createCommandEncoder({ label: `room-E-${current.cycle}-${Math.floor(current.ageMs)}` });
  const worldPass = encoder.beginRenderPass({ label: 'room-base-and-environment-MRT', colorAttachments: textures.map(texture => ({
    view: texture.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 },
  })) });
  worldPass.setPipeline(worldPipeline);
  for (let index = 0; index < plan.length; index++) {
    const draw = plan[index];
    const clip = pixelScissor(draw.bounds, canvas.width, canvas.height, fit);
    if (!clip.width || !clip.height) continue;
    worldPass.setScissorRect(clip.x, clip.y, clip.width, clip.height);
    worldPass.setBindGroup(0, worldGroups[index]);
    worldPass.draw(6);
    renderDraws++;
  }
  worldPass.end();

  const finish = encoder.beginRenderPass({ label: 'room-display-observer-and-sRGB', colorAttachments: [{
    view: surface.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store',
    clearValue: { r: 0, g: 0, b: 0, a: 1 },
  }] });
  finish.setPipeline(postPipeline);
  finish.setBindGroup(0, postGroup);
  finish.draw(3);
  finish.end();
  device.queue.submit([encoder.finish()]);
  frames++;
  lastPlan = plan;
}

function seek(ageMs) {
  current.pausedAgeMs = Math.max(0, Math.min(ROOM.episodeMs, Number(ageMs) || 0));
  current.cycle = 0;
  current.ageMs = current.pausedAgeMs;
  audio.update(current.cycle, current.ageMs, { active: false, visible: current.visible });
  updatePhaseControl();
  return current.ageMs;
}

function resumeLoop() {
  current.pausedAgeMs = null;
  epochStart = performance.now();
  previousFrameTime = 0;
  updatePhaseControl();
}

function updateControl(name, value) {
  if (!controls[name]) return false;
  controls[name].checked = !!value;
  if (name === 'active' && !controls.active.checked) audio.update(current.cycle, current.ageMs, { active: false, visible: current.visible });
  return true;
}

function snapshot() {
  const dpr = window.devicePixelRatio || 1;
  const fit = fitRoom(canvas.width || canvas.clientWidth, canvas.height || canvas.clientHeight);
  return {
    ready: !!device && !!worldPipeline && !!postPipeline,
    compiled: !!worldPipeline && !!postPipeline,
    id: 'cafeteria-attempt04-room-e-trial-r1',
    verify,
    adapter: adapter?.info ? { vendor: adapter.info.vendor, architecture: adapter.info.architecture, device: adapter.info.device } : null,
    canvas: { width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight, dpr },
    fit: { scale: fit.scale, offset: fit.offset, extent: fit.extent },
    cycle: current.cycle,
    ageMs: current.ageMs,
    paused: current.pausedAgeMs !== null,
    active: current.active,
    controls: flagValues(),
    frames,
    renderDraws,
    lastDraws: lastPlan.map(({ kind, index, cycle, bounds }) => ({ kind, index, cycle, bounds })),
    uniformBytesPerDraw: UNIFORM_BYTES,
    uniformSlotAlignment: UNIFORM_SLOT_BYTES,
    faults: [...faults],
    audio: audio.snapshot(),
  };
}

async function disposeRuntime() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(animation);
  for (const [target, type, listener, options] of listeners) target.removeEventListener(type, listener, options);
  audio.dispose();
  if (device) {
    try { await device.queue.onSubmittedWorkDone(); } catch { /* device may already be lost */ }
  }
  textures.forEach(texture => texture.destroy());
  textures = [];
  bitmapTexture?.destroy();
  for (const buffer of worldUniformBuffers) buffer.destroy();
  worldUniformBuffers = [];
  postUniformBuffer?.destroy();
  device?.destroy();
  device = null;
}

function createDebugApi() {
  globalThis.__roomE = Object.freeze({
    ready: true,
    compiled: true,
    verify,
    adapter: adapter?.info ? { vendor: adapter.info.vendor, architecture: adapter.info.architecture, device: adapter.info.device } : null,
    faults,
    controls,
    snapshot,
    seek,
    resume: resumeLoop,
    setControl: updateControl,
    activateAudio: () => audio.activateFromGesture(),
    muteAudio: () => audio.setMuted(true),
    dispose: disposeRuntime,
  });
}

async function initialize() {
  if (!navigator.gpu) throw new Error('WebGPU is unavailable');
  adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter');
  device = await adapter.requestDevice();
  device.addEventListener('uncapturederror', event => setFault(event.error));
  device.lost.then(info => { if (!disposed) setFault(new Error(`WebGPU device lost: ${info.message || info.reason}`)); });
  surface = canvas.getContext('webgpu');
  if (!surface) throw new Error('Canvas WebGPU context unavailable');
  canvasFormat = navigator.gpu.getPreferredCanvasFormat();

  const [bitmap,] = await Promise.all([fetchVerifiedBitmap()]);
  bitmapTexture = device.createTexture({ label: 'adopted-cafeteria-bitmap-raw-srgb', size: [bitmap.width, bitmap.height],
    format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
  device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: bitmapTexture }, [bitmap.width, bitmap.height]);
  bitmap.close();
  sampler = device.createSampler({ minFilter: 'linear', magFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

  roomModule = await checkedShader(WORLD_SHADER, 'world');
  postModule = await checkedShader(POST_SHADER, 'post');
  worldLayout = device.createBindGroupLayout({ label: 'room-world-layout', entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
  ] });
  postLayout = device.createBindGroupLayout({ label: 'room-observer-layout', entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
  ] });
  const blend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
  worldPipeline = await device.createRenderPipelineAsync({ label: 'room-world-two-MRT',
    layout: device.createPipelineLayout({ bindGroupLayouts: [worldLayout] }),
    vertex: { module: roomModule, entryPoint: 'vs' },
    fragment: { module: roomModule, entryPoint: 'fs', targets: [
      { format: 'rgba16float', blend }, { format: 'rgba16float', blend },
    ] },
    primitive: { topology: 'triangle-list' },
  });
  postPipeline = await device.createRenderPipelineAsync({ label: 'room-final-display-PSF',
    layout: device.createPipelineLayout({ bindGroupLayouts: [postLayout] }),
    vertex: { module: postModule, entryPoint: 'vs' },
    fragment: { module: postModule, entryPoint: 'fs', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list' },
  });
  worldUniformBuffers = Array.from({ length: MAX_DRAWS }, (_, index) => makeUniformBuffer(`room-draw-${index}-96B-slot256`));
  worldGroups = worldUniformBuffers.map((buffer, index) => device.createBindGroup({ label: `room-world-draw-${index}`,
    layout: worldLayout, entries: [
      { binding: 0, resource: { buffer, offset: 0, size: UNIFORM_BYTES } },
      { binding: 1, resource: sampler },
      { binding: 2, resource: bitmapTexture.createView() },
    ],
  }));
  postUniformBuffer = makeUniformBuffer('room-post-96B-slot256');
  resizeTargets();
  device.queue.onSubmittedWorkDone().catch(error => setFault(error));
  createDebugApi();
  setStatus(`WebGPU ready · ${adapter.info?.vendor || 'adapter'} · ${canvasFormat}`);
  animation = requestAnimationFrame(render);
  if (query.has('gpu-check')) {
    setStatus('GPU-CHECK running');
    import('./gpu-check.mjs').then(({ runRoomGpuCheck }) => runRoomGpuCheck())
      .then(result => {
        if (status) status.dataset.gpuCheck = JSON.stringify(result);
        setStatus(`GPU-CHECK PASS · ${result.canvas.cssWidth}×${result.canvas.cssHeight} · ${result.submittedFrames} submitted frames · ${result.faults.length} faults`);
      })
      .catch(error => setFault(error));
  }
}

function onVisibilityChange() {
  current.visible = !document.hidden;
  if (!current.visible) {
    cancelAnimationFrame(animation);
    audio.update(current.cycle, current.ageMs, { active: false, visible: false });
    return;
  }
  current.pausedAgeMs = null;
  epochStart = performance.now();
  current.cycle = 0;
  current.ageMs = 0;
  previousFrameTime = 0;
  animation = requestAnimationFrame(render);
}

function bindControls() {
  for (const [name, input] of Object.entries(controls)) addListener(input, 'change', () => {
    if (name === 'active' && !input.checked) audio.update(current.cycle, current.ageMs, { active: false, visible: current.visible });
  });
  addListener(phaseInput, 'input', () => seek(Number(phaseInput.value)));
  addListener(document.querySelector('#reset'), 'click', () => seek(0));
  addListener(document.querySelector('#resume'), 'click', resumeLoop);
  addListener(document.querySelector('#sound'), 'click', () => audio.activateFromGesture().catch(setFault));
  addListener(document, 'pointerdown', event => {
    if (verify || event.target?.closest?.('#toolbar')) return;
    if (!audio.enabled) audio.activateFromGesture().catch(setFault);
  }, { capture: true });
  addListener(document, 'visibilitychange', onVisibilityChange);
  addListener(window, 'pagehide', () => { void disposeRuntime(); }, { once: true });
}

bindControls();
initialize().catch(setFault);
