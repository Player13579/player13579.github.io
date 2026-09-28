import { PickupRenderer, createTestInputs } from './src/renderer.mjs';
import { PickupController, SeenLedger } from './src/receipt-controller.mjs';
import { PickupSound } from './src/sfx.mjs';
import { PRESENTATION_MS } from './src/timeline.mjs';

const verify = new URLSearchParams(location.search).has('verify');
const status = document.querySelector('#status');
const width = 128, height = 64, periodMs = PRESENTATION_MS + 400;
const controller = new PickupController({ ledger: new SeenLedger() });
const sound = verify ? null : new PickupSound();
let dark, light, inputs = [], raf = 0, origin = 0, loopId = 0, audioContext = null;
let ready = false, disposed = false, fault = null, loops = 0;

function fail(error) {
  fault = String(error?.stack || error);
  document.body.dataset.previewStatus = 'failed';
  status.textContent = `WebGPU再生に失敗 · ${fault}`;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

function frame(now, age) {
  return {
    authorityNowMs: 1_000_000 + age,
    monotonicNowMs: now,
    roomId: 'item-pickup-gallery-only',
    streamGeneration: 1,
    width, height,
    worldToScreen: [30 / 84, 0, 0, -30 / 84, width / 2, height / 2],
    roomClip: [0, 0, width, height],
    documentVisible: !document.hidden,
    canvasVisible: true,
    resolveActor: id => ({ id, roomId: 'item-pickup-gallery-only', visible: true }),
    isAnchorVisible: () => true
  };
}

function startCause(now) {
  loopId++;
  loops++;
  origin = now;
  controller.cancelAll('gallery_loop_boundary');
  sound?.stopAll();
  const f = frame(now, 0);
  const receipt = Object.freeze({
    type: 'action-item-pickup', id: `gallery-item-pickup:${loopId}`,
    source: 'player', playerId: 'gallery-preview-actor', x: 0, y: 0,
    radius: 84, variant: 'asset', durationMs: 0, at: f.authorityNowMs
  });
  const result = controller.ingest(receipt,
    { authoritative: true, roomId: f.roomId, streamGeneration: f.streamGeneration }, f);
  if (!result.accepted) throw new Error(`gallery receipt rejected: ${result.reason}`);
}

function tick(now) {
  if (disposed || fault) return;
  try {
    if (now - origin >= periodMs) startCause(now);
    const age = Math.max(0, now - origin);
    const f = frame(now, age);
    const draws = controller.collect(f);
    sound?.stopExcept(draws.map(d => d.id));
    const submitted = dark.render(draws, { ...inputs[0], kernelPx: 1.15 });
    sound?.stopExcept(submitted.audioEligibleIds || []);
    const events = controller.commitVisibleSubmission(submitted,
      { ...f, monotonicNowMs: performance.now() });
    for (const event of events) sound?.consume(event,
      { nowMonoMs: performance.now(), documentVisible: !document.hidden });
    light.render(draws, { ...inputs[1], kernelPx: 1.15 });
    status.textContent = `WebGPU · ${Math.min(PRESENTATION_MS, Math.round(age))} ms / ${PRESENTATION_MS} ms · ${verify ? 'verify: SFX無音' : '品質未審査・本編未接続'}`;
    document.body.dataset.previewStatus = 'ready';
    document.body.dataset.gpu = 'active';
    document.body.dataset.ageMs = String(Math.round(age));
    document.body.dataset.loops = String(loops);
    raf = requestAnimationFrame(tick);
  } catch (error) { fail(error); }
}

function countChangedPixels(active, idle) {
  let changed = 0;
  for (let i = 0; i < active.pixels.length; i += 4) {
    if (Math.abs(active.pixels[i] - idle.pixels[i]) +
        Math.abs(active.pixels[i + 1] - idle.pixels[i + 1]) +
        Math.abs(active.pixels[i + 2] - idle.pixels[i + 2]) > 4) changed++;
  }
  return changed;
}

async function verifyGPU() {
  const draw = [{ id: 'verify-active-sample', ageMs: 420, reducedMotion: false,
    origin: [width / 2, height / 2], axisX: [30, 0], axisY: [0, -30], clip: [0, 0, width, height] }];
  const results = [];
  for (let i = 0; i < 2; i++) {
    const renderer = i === 0 ? dark : light;
    const input = inputs[i];
    renderer.render([], { ...input, kernelPx: 1.15 });
    const idle = await renderer.readback('output');
    renderer.render(draw, { ...input, kernelPx: 1.15 });
    const active = await renderer.readback('output');
    results.push(countChangedPixels(active, idle));
  }
  const gpuErrors = dark.errors.length + light.errors.length;
  const pixelViews = results.filter(n => n > 0).length;
  const report = { mode: 'verify', webgpu: true, audioForcedOff: true,
    shaderCompilations: dark.compilation.length, shaderErrors: dark.compilation
      .flatMap(c => c.messages).filter(m => m.type === 'error').length,
    uncapturedGpuErrors: gpuErrors, activePixelViews: pixelViews, activePixelsByView: results,
    h64: { backing: [width, height], css: [width, height] },
    fullLifetimeMs: PRESENTATION_MS, authorityDurationMs: 0 };
  window.__itemPickupProR01 = { ready, verify: report, dark, light, controller };
  document.body.dataset.verifyActivePixelViews = String(pixelViews);
  document.body.dataset.shaderErrors = String(report.shaderErrors);
  document.body.dataset.gpuErrors = String(gpuErrors);
  if (pixelViews !== 2 || report.shaderErrors || gpuErrors) throw new Error(`verify failed: ${JSON.stringify(report)}`);
}

async function unlockAudioFromGesture() {
  if (!sound || audioContext || disposed) return;
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) return;
  try {
    audioContext = new Audio();
    await audioContext.resume();
    if (audioContext.state !== 'running') throw new Error('AudioContext did not start');
    sound.attachRunningContext(audioContext);
    sound.setMuted(false);
    document.body.dataset.audio = 'unmuted-for-future-causes';
  } catch (error) {
    document.body.dataset.audio = `unavailable:${String(error)}`;
    await audioContext?.close().catch(() => {});
    audioContext = null;
  }
}

function dispose() {
  if (disposed) return;
  disposed = true;
  if (raf) cancelAnimationFrame(raf);
  controller.dispose();
  sound?.dispose();
  for (const input of inputs) input.dispose();
  dark?.dispose(); light?.dispose();
  dark?.device.destroy();
  if (!verify) void audioContext?.close().catch(() => {});
}

if (!verify) {
  addEventListener('pointerdown', unlockAudioFromGesture, { once: true, passive: true });
  addEventListener('keydown', unlockAudioFromGesture, { once: true });
}
addEventListener('visibilitychange', () => {
  if (document.hidden) { controller.cancelAll('document_hidden'); sound?.stopAll(); }
  else if (ready) startCause(performance.now());
});
addEventListener('pagehide', dispose, { once: true });

try {
  dark = await PickupRenderer.create({ canvas: document.querySelector('#dark'), width, height });
  light = await PickupRenderer.create({ canvas: document.querySelector('#light'), device: dark.device, width, height });
  inputs = [
    createTestInputs(dark.device, width, height, [16 / 255, 21 / 255, 31 / 255], { receiver: true }),
    createTestInputs(dark.device, width, height, [236 / 255, 239 / 255, 243 / 255], { receiver: true })
  ];
  ready = true;
  window.__itemPickupProR01 = { ready, verify: null, dark, light, controller };
  if (verify) await verifyGPU();
  startCause(performance.now());
  raf = requestAnimationFrame(tick);
} catch (error) { fail(error); }
