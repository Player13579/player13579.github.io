import { metadata, plan, createQuantumPass, shader } from './artist.mjs';
import { createQuantumGallerySfx } from './gallery-sfx.mjs';
import { createQuantumDeviceAdapter } from './wgsl-compat-a1.mjs';

const canvas = document.querySelector('#surface');
const statusNode = document.querySelector('#status');
const soundButton = document.querySelector('#enable-sound');
const params = new URLSearchParams(location.search);
const verification = params.has('verify');
const BASE_WIDTH = 980;
const BASE_HEIGHT = 620;
const LOOP_MS = 4200;
const EVENT_MS = metadata.durationMs;
const gpuErrors = [];
let adapter = null;
let device = null;
let context = null;
let rendererPass = null;
let raf = 0;
let disposed = false;
let hiddenAt = null;
let autoStartedAt = performance.now();
let fixture = null;
let activeVariant = 'lead';
let lastResizeSignature = '';
let submittedFrames = 0;
let cyclesCompleted = 0;
let lastCycle = -1;
let lastSubmitted = null;
let lastError = null;
let compilation = [];
let wgslNormalization = null;
let resizeObserver = null;
const retained = new Set();

const sfx = createQuantumGallerySfx({ verification });

const clamp01 = value => Math.max(0, Math.min(1, value));
function physicalSize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Number(devicePixelRatio) || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  return { width, height, dpr, cssWidth: rect.width, cssHeight: rect.height,
    zoom: Math.min(width / BASE_WIDTH, height / BASE_HEIGHT) };
}

function resizeBacking() {
  if (disposed) return false;
  const size = physicalSize();
  const signature = `${size.width}x${size.height}@${size.dpr}`;
  if (signature === lastResizeSignature) return false;
  lastResizeSignature = signature;
  canvas.width = size.width;
  canvas.height = size.height;
  return true;
}

function makeEffect(cycle, ageMs, variant = cycle % 2 ? 'mercury' : 'lead') {
  return { id: `quantum-gallery-receipt-${cycle}`, playerId: 'gallery-hero-h64',
    type: metadata.eventType, variant, x: 0, y: 0, radius: metadata.radius,
    startedAt: performance.now() - ageMs, duration: metadata.durationMs };
}

function renderAt(now = performance.now()) {
  if (disposed || document.hidden || !device || !context || !rendererPass) return null;
  resizeBacking();
  const size = physicalSize();
  let cycle;
  let ageMs;
  let effect;
  if (fixture) {
    cycle = fixture.cycle;
    ageMs = fixture.ageMs;
    effect = makeEffect(cycle, ageMs, fixture.variant);
  } else {
    const elapsed = Math.max(0, now - autoStartedAt);
    cycle = Math.floor(elapsed / LOOP_MS);
    ageMs = elapsed - cycle * LOOP_MS;
    effect = makeEffect(cycle, ageMs);
  }
  // Fixture cycle IDs are deliberately far above the natural autoplay range;
  // count completed cycles only during natural gallery replay.
  if (!fixture && lastCycle >= 0 && cycle > lastCycle) cyclesCompleted += cycle - lastCycle;
  lastCycle = cycle;
  const command = plan({ effect, now: performance.now(), phase: 'playing', camera: { x: 0, y: 0 },
    zoom: size.zoom, viewport: { width: size.width, height: size.height },
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    alpha: 1, sourceVisible: true, world: fixture?.world ?? true,
    glow: fixture?.glow ?? true, flare: fixture?.flare ?? true });
  const encoder = device.createCommandEncoder({ label: 'Quantum Transmutation gallery frame' });
  const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(),
    loadOp: 'clear', clearValue: fixture?.background === 'light'
      ? { r: 0.91, g: 0.92, b: 0.94, a: 1 }
      : { r: 0.012, g: 0.018, b: 0.032, a: 1 }, storeOp: 'store' }] });
  try {
    if (command) rendererPass.record(pass, command, 0);
  } finally { pass.end(); }
  device.queue.submit([encoder.finish()]);
  submittedFrames += 1;
  lastSubmitted = Object.freeze({ cycle, ageMs, variant: effect.variant,
    drawn: Boolean(command), bounds: command?.bounds ?? null, width: size.width,
    height: size.height, dpr: size.dpr, zoom: size.zoom });
  if (command && ageMs <= 150) void sfx.playReceipt({ id: effect.id, variant: effect.variant, ageMs });
  if (statusNode) statusNode.textContent = disposed ? 'disposed' :
    verification ? `verify · audio 0 · ${effect.variant} · ${Math.floor(ageMs)} ms` :
      `${effect.variant} · ${Math.floor(ageMs)} ms`;
  return lastSubmitted;
}

function tick(now) {
  raf = 0;
  if (disposed || document.hidden) return;
  try { renderAt(now); } catch (error) { lastError = String(error?.stack ?? error); }
  if (!disposed && !document.hidden && !fixture) raf = requestAnimationFrame(tick);
}

function startLoop() {
  if (disposed || document.hidden || fixture || raf) return;
  raf = requestAnimationFrame(tick);
}

function onVisibilityChange() {
  if (document.hidden) {
    hiddenAt = performance.now();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    sfx.stopAll();
    return;
  }
  if (hiddenAt !== null) {
    const hiddenDuration = performance.now() - hiddenAt;
    if (!fixture) autoStartedAt += hiddenDuration;
    hiddenAt = null;
  }
  try { renderAt(); } catch (error) { lastError = String(error?.stack ?? error); }
  startLoop();
}

function snapshot() {
  const rect = canvas?.getBoundingClientRect();
  return Object.freeze({ ready: Boolean(rendererPass && !lastError), verification,
    format: rendererPass?.format ?? null, adapter: adapter?.info ?? null,
    wgslNormalization,
    firstSubmitted: submittedFrames > 0, submittedFrames, cyclesCompleted,
    fixture: fixture ? { ...fixture } : null, lastSubmitted,
    canvas: canvas ? { intrinsic: [canvas.width, canvas.height], css: [rect?.width, rect?.height],
      dpr: devicePixelRatio } : null,
    shaderCompilation: compilation.map(item => ({ type: item.type, message: item.message })),
    gpuErrors: gpuErrors.slice(), deviceLost: device?.lost?.status === 'fulfilled',
    disposed, hidden: document.hidden, hiddenAt, sfx: sfx.snapshot(), lastError });
}

const api = Object.freeze({
  ready: Promise.resolve().then(async () => {
    if (!navigator.gpu) throw new Error('WebGPU unavailable');
    adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('No WebGPU adapter');
    device = await adapter.requestDevice();
    device.addEventListener('uncapturederror', event => {
      event.preventDefault?.();
      gpuErrors.push(String(event.error?.message ?? event.error ?? 'uncaptured GPU error'));
    });
    device.lost.then(info => gpuErrors.push(`device lost: ${info?.reason ?? ''} ${info?.message ?? ''}`));
    context = canvas.getContext('webgpu');
    if (!context) throw new Error('WebGPU canvas context unavailable');
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });
    device.pushErrorScope('validation');
    const adapted = createQuantumDeviceAdapter(device, shader, record => { wgslNormalization = record; });
    rendererPass = createQuantumPass({ device: adapted.device, format,
      own(resource) { retained.add(resource); return resource; },
      release(resource) { return retained.delete(resource); } });
    const shaderInfo = await rendererPass.compilation;
    compilation = [...(shaderInfo?.messages ?? [])];
    const shaderErrors = compilation.filter(item => item.type === 'error');
    const validationError = await device.popErrorScope();
    if (shaderErrors.length || validationError)
      throw new Error(`Quantum pipeline validation failed: ${shaderErrors.map(x => x.message).join('; ')} ${validationError?.message ?? ''}`);
    resizeBacking();
    renderAt();
    resizeObserver = new ResizeObserver(() => {
      if (!resizeBacking()) return;
      try { renderAt(); } catch (error) { lastError = String(error?.stack ?? error); }
    });
    resizeObserver.observe(canvas);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (!verification && soundButton) {
      soundButton.hidden = false;
      soundButton.addEventListener('click', activateSound);
    }
    startLoop();
    return snapshot();
  }),
  setFixture({ ageMs, variant = 'lead', background = 'dark', world = true, glow = true, flare = true } = {}) {
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > EVENT_MS || !['lead', 'mercury'].includes(variant) ||
        !['dark', 'light'].includes(background)) throw new TypeError('Invalid Quantum fixture');
    fixture = { ageMs, cycle: 7000 + Math.floor(ageMs), variant, background,
      world: Boolean(world), glow: Boolean(glow), flare: Boolean(flare) };
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    return renderAt();
  },
  clearFixture() {
    fixture = null;
    autoStartedAt = performance.now();
    lastCycle = -1;
    startLoop();
    return true;
  },
  snapshot,
  async flush() { await device?.queue?.onSubmittedWorkDone?.(); return snapshot(); },
  sfx,
  async dispose() {
    if (disposed) return false;
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    resizeObserver?.disconnect();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (!verification && soundButton) soundButton.removeEventListener('click', activateSound);
    await sfx.dispose();
    try { await device?.queue?.onSubmittedWorkDone?.(); } catch (_) {}
    rendererPass?.destroy();
    rendererPass = null;
    try { context?.unconfigure(); } catch (_) {}
    try { device?.destroy(); } catch (_) {}
    return true;
  }
});

function onResize() {
  if (!resizeBacking()) return;
  try { renderAt(); } catch (error) { lastError = String(error?.stack ?? error); }
}

async function activateSound() {
  try {
    const ok = await sfx.activateFromGesture();
    soundButton.textContent = ok ? 'Sound enabled' : 'Sound unavailable';
    soundButton.disabled = ok;
    return ok;
  } catch (error) {
    lastError = String(error?.stack ?? error);
    return false;
  }
}

window.__quantumR1 = api;
window.__gallerySfx = Object.freeze({
  activateFromGesture: () => sfx.activateFromGesture(),
  setMuted: value => sfx.setMuted(value),
  dispose: () => sfx.dispose(),
  status: () => sfx.snapshot(),
  snapshot: () => sfx.snapshot()
});
window.__quantumR1Failure = null;
api.ready.catch(error => {
  lastError = String(error?.stack ?? error);
  window.__quantumR1Failure = lastError;
  if (statusNode) statusNode.textContent = 'WebGPU initialization failed';
});
