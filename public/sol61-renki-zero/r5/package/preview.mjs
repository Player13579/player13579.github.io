import { create, VERSION, makeAudioGate } from './renki.mjs';

const $ = id => document.getElementById(id);
const canvas = document.querySelector('canvas');
const verify = new URL(location.href).searchParams.has('verify');
const startup = window.__dvaGalleryStartup;
const childVersionId = new URL(location.href).searchParams.get('galleryVersionId') || 'renki-sol61-zero-r5';
const childToken = new URL(location.href).searchParams.get('galleryStartupToken') || '';
const childEpoch = Number(new URL(location.href).searchParams.get('galleryAttemptEpoch')) || 0;
const PHASE_MS = Object.freeze({ adapter: 15000, device: 15000, assets: 20000,
  pipelines: 45000, 'first-frame': 10000 });
const childStartedAt = performance.now();
let api, device, context, audio, audioGate, texture, bitmap, abortAssets = null;
let running = false, start = 0, frame = 0, cycle = 0, rafId = 0;
let phase = '', phaseTimer = 0, phaseDeadline = null, terminal = false, pageHidden = false;
let firstFrameReady = false, originalError = null, cleaned = false;
const errors = [];
const isAttemptActive = () => !terminal && !pageHidden && (startup?.isActive?.() ?? true);
const safeError = (error, fallback) => error instanceof Error ? error : new Error(String(error || fallback));

function stopOwnedResources() {
  if (cleaned) return;
  cleaned = true;
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  try { abortAssets?.abort(); } catch (_) {}
  try { audioGate?.stop(); } catch (_) {}
  try { api?.destroy(); } catch (_) {}
  try { texture?.destroy(); } catch (_) {}
  try { bitmap?.close(); } catch (_) {}
  try { device?.destroy(); } catch (_) {}
}
startup?.setCleanup?.(stopOwnedResources);

function fail(error, code = error?.code || 'PREVIEW_RUNTIME_ERROR', status = 'error') {
  if (terminal || pageHidden) return;
  if (startup?.isActive && !startup.isActive()) {
    terminal = true;
    stopOwnedResources();
    return;
  }
  originalError = safeError(error, 'preview failed');
  errors.push(originalError.message.slice(0, 500));
  if (errors.length > 16) errors.shift();
  terminal = true;
  if (phaseTimer) clearTimeout(phaseTimer);
  phaseTimer = 0;
  running = false;
  startup?.fail?.(originalError, code, status);
  stopOwnedResources();
}
function enterPhase(next) {
  if (!PHASE_MS[next] || terminal) return;
  if (phase === next && phaseTimer) return;
  if (phaseTimer) clearTimeout(phaseTimer);
  phase = next;
  startup?.advance?.(next, 'pending');
  const elapsed = Math.max(0, performance.now() - childStartedAt);
  const remaining = Math.max(0, 90000 - elapsed);
  const budget = Math.min(PHASE_MS[next], remaining);
  const error = Object.assign(new Error(`この版の${next}初期化が期限内に完了しませんでした。`),
    { code: `STARTUP_TIMEOUT_${next.toUpperCase().replace('-', '_')}` });
  phaseDeadline = new Promise((_, reject) => {
    phaseTimer = setTimeout(() => reject(error), budget);
  });
  // Keep the independent deadline effective while a phase waits for a layout/RAF event.
  phaseDeadline.catch(reason => fail(reason, reason?.code || 'STARTUP_TIMEOUT'));
}
function settlePhase() {
  if (phaseTimer) clearTimeout(phaseTimer);
  phaseTimer = 0;
  phaseDeadline = null;
}
async function withinPhase(next, operation, lateCleanup = () => {}) {
  enterPhase(next);
  const deadline = phaseDeadline;
  const work = Promise.resolve(operation).then(value => {
    if (!isAttemptActive() || phase !== next) {
      try { lateCleanup(value); } catch (_) {}
      return { late: true };
    }
    return { value };
  });
  const result = await Promise.race([work, deadline]);
  if (result?.late) throw Object.assign(new Error('Preview startup owner was retired'),
    { code: 'DVA_GALLERY_STARTUP_CANCELLED' });
  settlePhase();
  return result.value;
}
function snapshot() {
  return { version: VERSION, frames: frame, age: Number($('time').dataset.age || 0), running,
    held: $('held').checked, variant: $('variant').value, source: $('source').checked,
    receiver: $('receiver').checked, post: $('post').checked, verify,
    audioZero: verify || $('mute').checked, errors: [...errors],
    startup: startup?.snapshot?.() || null, originalError: originalError?.message || null,
    body: { H: 64, atlas: [1024, 0, 512, 1024], alphaBBox: [58, 99, 415, 938], quadH: 64 * 1024 / 839 },
    nativeQuality: 'unaccepted' };
}
window.__renkiSnapshot = snapshot;

try {
  try { $('mute').checked = verify || localStorage.getItem('renki-zero-preview-muted') === 'true'; }
  catch { $('mute').checked = verify; }
  if (verify) $('mute').disabled = true;
  if (!navigator.gpu) {
    const unsupported = new Error('WebGPU required');
    fail(unsupported, 'WEBGPU_UNSUPPORTED', 'unsupported');
    throw unsupported;
  }

  const adapter = await withinPhase('adapter', navigator.gpu.requestAdapter());
  if (!adapter) {
    const unsupported = new Error('No adapter');
    fail(unsupported, 'WEBGPU_UNSUPPORTED', 'unsupported');
    throw unsupported;
  }

  device = await withinPhase('device', adapter.requestDevice(), lateDevice => {
    try { lateDevice?.destroy?.(); } catch (_) {}
  });
  device.addEventListener('uncapturederror', event => {
    if (!isAttemptActive()) return;
    const error = safeError(event.error, 'WebGPU uncaptured error');
    fail(error, error.code || 'WEBGPU_UNCAPTURED_ERROR');
  });
  device.lost.then(info => {
    if (pageHidden || terminal) return;
    fail(new Error(`WebGPU device lost: ${info?.message || info?.reason || 'unknown'}`),
      'WEBGPU_DEVICE_LOST');
  }, error => {
    if (!pageHidden && !terminal) fail(error, 'WEBGPU_DEVICE_LOST_REJECTION');
  });

  const assets = await withinPhase('assets', (async () => {
    abortAssets = new AbortController();
    const response = await fetch('./body-focus-original.png', { signal: abortAssets.signal });
    if (!response.ok) throw new Error(`body image ${response.status}`);
    const decoded = await createImageBitmap(await response.blob(), { premultiplyAlpha: 'none' });
    if (!isAttemptActive()) { decoded.close(); return { bitmap: decoded, texture: null, late: true }; }
    const bodyTexture = device.createTexture({ size: [decoded.width, decoded.height], format: 'rgba8unorm-srgb',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    device.queue.copyExternalImageToTexture({ source: decoded }, { texture: bodyTexture }, [decoded.width, decoded.height]);
    await device.queue.onSubmittedWorkDone();
    return { bitmap: decoded, texture: bodyTexture };
  })(), late => {
    try { late?.bitmap?.close?.(); } catch (_) {}
    try { late?.texture?.destroy?.(); } catch (_) {}
  });
  bitmap = assets.bitmap;
  texture = assets.texture;
  bitmap.close();
  bitmap = null;

  const pipelines = await withinPhase('pipelines', (async () => {
    context = canvas.getContext('webgpu');
    if (!context) throw new Error('WebGPU canvas context unavailable');
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });
    return { format, api: await create({ device, format, width: 640, height: 360, bodyTexture: texture }) };
  })(), late => { try { late?.api?.destroy?.(); } catch (_) {} });
  // `withinPhase` returns the real completed pipeline bundle; do not infer readiness from create resolving alone.
  api = pipelines.api;

  function positiveCanvas() {
    if (!canvas?.isConnected || canvas.getContext('webgpu') !== context) return null;
    const rect = canvas.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return null;
    const style = getComputedStyle(canvas);
    const width = Number.parseFloat(style.width), height = Number.parseFloat(style.height);
    if (!(width > 0 && height > 0)) return null;
    return { width: rect.width, height: rect.height };
  }

  async function play() {
    running = true; $('held').checked = false; start = performance.now(); cycle++;
    if (!verify && !$('mute').checked) {
      try {
        audio ??= new AudioContext();
        await audio.resume();
        audioGate ??= makeAudioGate(audio, { verify: false });
        audioGate.play('preview-' + cycle, $('variant').value === 'tenfold');
      } catch (_) { /* Autoplay/audio availability is separate from visual readiness. */ }
    }
  }
  $('play').onclick = () => { void play(); };
  $('age').oninput = () => { $('held').checked = true; running = false; };
  $('held').onchange = () => {
    if (!$('held').checked) { running = true; start = performance.now() - Number($('age').value); }
  };
  $('mute').onchange = () => {
    try { if (!verify) localStorage.setItem('renki-zero-preview-muted', String($('mute').checked)); } catch (_) {}
    if ($('mute').checked) audioGate?.stop();
  };
  running = true; start = performance.now();

  let firstSubmitted = false, validationScopePushed = false;
  async function draw(now) {
    if (!isAttemptActive() || !running) return;
    const viewport = positiveCanvas();
    if (!viewport) { rafId = requestAnimationFrame(draw); return; }
    try {
      let age = $('held').checked ? Number($('age').value) : (running ? now - start : 0);
      if (age > 1700 && $('loop').checked && running) {
        start = now; age = 0; cycle++;
        if (!verify && !$('mute').checked) audioGate?.play('preview-' + cycle, $('variant').value === 'tenfold');
      }
      if (age > 1250 && !$('loop').checked) running = false;
      $('time').dataset.age = String(age); $('time').textContent = Math.round(age) + ' E ms';
      const encoder = device.createCommandEncoder();
      if (!firstSubmitted) { device.pushErrorScope('validation'); validationScopePushed = true; }
      const targetTexture = context.getCurrentTexture();
      const target = targetTexture?.createView?.();
      if (!target) throw new Error('WebGPU canvas did not provide a current presentation texture');
      const receipt = api.record({ encoder, target, age,
        // Startup readiness must cover the normal two-pass PH/OBS path.
        tenfold: firstFrameReady && $('variant').value === 'tenfold',
        reduced: $('reduced').checked, sourceOn: $('source').checked,
        receiverOn: $('receiver').checked, postOn: $('post').checked });
      if (!firstSubmitted && Number(receipt?.passes) !== 2)
        throw Object.assign(new Error(`Expected two normal PH/OBS passes, received ${receipt?.passes ?? 'unknown'}`),
          { code: 'FIRST_FRAME_PASS_INCOMPLETE' });
      device.queue.submit([encoder.finish()]);
      frame++;
      if (!firstSubmitted) {
        firstSubmitted = true;
        enterPhase('first-frame');
        const deadline = phaseDeadline;
        const validationResult = device.popErrorScope();
        validationScopePushed = false;
        const completed = await Promise.race([Promise.all([
          device.queue.onSubmittedWorkDone(), validationResult
        ]).then(values => ({ values })), deadline]);
        settlePhase();
        if (completed.values[1]) throw completed.values[1];
        if (!isAttemptActive() || device.lostState === 'destroyed') return;
        await new Promise(resolve => { rafId = requestAnimationFrame(resolve); });
        if (!isAttemptActive()) return;
        const after = positiveCanvas();
        if (!after) throw Object.assign(new Error('Canvas became disconnected or zero-sized before readiness confirmation'),
          { code: 'FIRST_FRAME_CANVAS_NOT_PRESENTABLE' });
        firstFrameReady = true;
        running = true;
        startup?.advance?.('playing', 'ready', { firstFrame: {
          recorded: true, submitted: true, completed: true, canvasConnected: true,
          viewportWidth: after.width, viewportHeight: after.height, passes: 2
        } });
      }
    } catch (error) {
      if (validationScopePushed) {
        validationScopePushed = false;
        try { void device.popErrorScope()?.catch?.(() => {}); } catch (_) {}
      }
      if (!terminal && !pageHidden) fail(error, error?.code || (firstSubmitted ? 'FIRST_FRAME_SUBMIT_ERROR' : 'FIRST_FRAME_RECORD_ERROR'));
      return;
    }
    if (isAttemptActive() && running) rafId = requestAnimationFrame(draw);
  }
  enterPhase('first-frame');
  rafId = requestAnimationFrame(draw);

} catch (error) {
  if (!terminal && !pageHidden) fail(error, error?.code || (phase ? `STARTUP_${phase.toUpperCase()}_ERROR` : 'PREVIEW_INITIALIZATION_ERROR'));
  // Inline bootstrap preserves the original message for the parent, then the module error
  // remains observable to browser tooling without creating an unhandled rejection.
}

addEventListener('pagehide', () => {
  pageHidden = true; terminal = true; running = false;
  if (phaseTimer) clearTimeout(phaseTimer);
  try { audio?.close(); } catch (_) {}
  stopOwnedResources();
}, { once: true });
