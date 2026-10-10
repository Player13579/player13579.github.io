import { EDITION, sample } from './model.mjs';
import { createSfxPlayer } from './sfx.mjs';
import { createEventController } from './controller.mjs';
import { prepareUniformFrame } from './frame.mjs';
import { isStartupSourceProofValid } from './startup-proof.mjs';

const $ = (id) => document.getElementById(id);
const canvas = $('surface');
const status = $('state');
const gpuInfo = $('gpuInfo');
const receiptView = $('receipts');
const verify = new URL(location.href).searchParams.has('verify');
const params = new URL(location.href).searchParams;
const embed = params.get('embed') === '1';
const cycleVariants = params.get('cycleVariants') === '1';
const galleryStartup = { token: params.get('galleryStartupToken'), versionId: params.get('galleryVersionId'), attemptEpoch: Number(params.get('galleryAttemptEpoch')) };
const galleryBound = !!galleryStartup.token && !!galleryStartup.versionId && Number.isSafeInteger(galleryStartup.attemptEpoch) && galleryStartup.attemptEpoch > 0;
let gallerySequence = 0, galleryStage = 'child-document', galleryStatus = 'pending', galleryFirstFrame = null, galleryRetired = false;
function notifyGallery(stage, status = 'pending', detail = {}) {
  if (!galleryBound || galleryRetired) return;
  galleryStage = stage; galleryStatus = status;
  const message = { schema: 'dva-gallery-startup/v1', token: galleryStartup.token, versionId: galleryStartup.versionId,
    attemptEpoch: galleryStartup.attemptEpoch, sequence: ++gallerySequence, stage, status, ...detail };
  if (status === 'ready') galleryFirstFrame = message.firstFrame;
  try { window.parent.postMessage(message, location.origin); } catch (error) { console.warn('Gallery startup notice failed', error); }
}
notifyGallery('child-document');
if (embed) document.documentElement.classList.add('gallery-embed');
$('verifyBanner').hidden = !verify;

const variantIndicator = $('gallery-variant');
const controller = createEventController({ onEvent: (event) => { if (audioPlayer) audioPlayer.cancel(activeEvent); activeEvent = event; if (variantIndicator) variantIndicator.textContent = `Effect variant: ${event.variant}`; } });
let activeEvent = null;
let gpu = null;
let audioContext = null;
let audioPlayer = null;
let audioMutedByUi = false;
let audioUnlocked = false;
let background = 'dark';
let disposed = false;
let frameSerial = 0;
const receiptLog = [];
let lastGpuCompletion = Promise.resolve();
let diagnosticHold = false;
let lastDiagnosticReceipt = null;
let autoLoop = false;
let loopTimer = null;
let galleryProofAttempted = false;
let pendingStartupProofBuffer = null;
const timestamp = () => performance.now();

function destroyPendingStartupProofBuffer() {
  const buffer = pendingStartupProofBuffer;
  pendingStartupProofBuffer = null;
  if (buffer) { try { buffer.destroy(); } catch {} }
}

function showError(where, error) {
  const message = `${where}: ${error?.stack || error?.message || String(error)}`;
  status.textContent = `error — ${message}`;
  gpuInfo.textContent = message;
  console.error(message);
  if (galleryStatus !== 'unsupported' && galleryStatus !== 'error') notifyGallery(galleryStage, 'error', { error: { code: 'WEBGPU_HOST_ERROR', message: String(error?.message || error).slice(0, 1000) } });
}

function formatReceipts() {
  receiptView.textContent = JSON.stringify(receiptLog.slice(-24), null, 2);
}

function appendReceipt(receipt) {
  receiptLog.push(receipt);
  if (receiptLog.length > 96) receiptLog.splice(0, receiptLog.length - 96);
  controller.record(receipt);
  formatReceipts();
}

const presentationWGSL = `
struct Display { background: vec4f };
@group(0) @binding(0) var<uniform> display: Display;
@group(0) @binding(1) var emission: texture_2d<f32>;
struct VOut { @builtin(position) position: vec4f }
@vertex fn vs(@builtin(vertex_index) index:u32)->VOut {
  var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:VOut; o.position=vec4f(p[index],0.,1.); return o;
}
fn encodeSrgb(x:f32)->f32 { let v=clamp(x,0.,1.); return select(12.92*v,1.055*pow(v,1./2.4)-.055,v>.0031308); }
@fragment fn fs(in:VOut)->@location(0) vec4f {
  let dims=vec2i(textureDimensions(emission));
  let p=clamp(vec2i(in.position.xy),vec2i(0),dims-vec2i(1));
  let radiance=textureLoad(emission,p,0).rgb;
  let linear=display.background.rgb+radiance;
  return vec4f(encodeSrgb(linear.r),encodeSrgb(linear.g),encodeSrgb(linear.b),1.);
}`;

async function shaderModule(device, label, code) {
  const module = device.createShaderModule({ label, code });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((m) => m.type === 'error');
  if (errors.length) throw new Error(`${label} compile failed:\n${errors.map((e) => `${e.lineNum}:${e.linePos} ${e.message}`).join('\n')}`);
  const warnings = info.messages.filter((m) => m.type === 'warning');
  if (warnings.length) console.warn(`${label} shader warnings`, warnings);
  return module;
}

async function initGpu() {
  if (!('gpu' in navigator) || !navigator.gpu) {
    notifyGallery('adapter', 'unsupported', { error: { code: 'WEBGPU_UNAVAILABLE', message: 'WebGPU is unavailable in this browser.' } });
    throw new Error('WebGPU unavailable. Run in a WebGPU-enabled browser from localhost/HTTPS.');
  }
  notifyGallery('adapter');
  const adapter = await navigator.gpu.requestAdapter();
  if (disposed || galleryRetired) return;
  if (!adapter) {
    notifyGallery('adapter', 'unsupported', { error: { code: 'WEBGPU_ADAPTER_UNAVAILABLE', message: 'No WebGPU adapter is available.' } });
    throw new Error('navigator.gpu.requestAdapter() returned no adapter.');
  }
  const device = await adapter.requestDevice();
  if (disposed || galleryRetired) { device.destroy(); return; }
  notifyGallery('device');
  device.addEventListener('uncapturederror', (event) => { if (!disposed) showError('WebGPU validation', event.error); });
  device.lost.then((info) => { if (!disposed) showError('WebGPU device lost', `${info.reason}: ${info.message}`); });
  const context = canvas.getContext('webgpu');
  if (!context) throw new Error('canvas.getContext("webgpu") failed.');
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format: canvasFormat, alphaMode: 'opaque' });

  const base = new URL('./', import.meta.url);
  const [worldCode, observerCode] = await Promise.all(['world.wgsl', 'observer.wgsl'].map(async (name) => {
    const response = await fetch(new URL(name, base));
    if (!response.ok) throw new Error(`Could not load R446 ${name}: HTTP ${response.status}`);
    return response.text();
  }));
  const [world, observer, present] = await Promise.all([
    shaderModule(device, 'R446 world', worldCode),
    shaderModule(device, 'R446 observer', observerCode),
    shaderModule(device, 'R447 presentation', presentationWGSL),
  ]);
  if (disposed || galleryRetired) { device.destroy(); return; }
  notifyGallery('assets');
  const layouts = {
    world: device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }] }),
    observer: device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d', multisampled: false } },
    ] }),
    present: device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d', multisampled: false } },
    ] }),
  };
  const pipeline = (label, module, format, bindGroupLayout) => device.createRenderPipelineAsync({
    label,
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });
  const pipelines = {
    world: await pipeline('R446 world emission', world, 'rgba16float', layouts.world),
    observer: await pipeline('R446 observer direct plus Gaussian', observer, 'rgba16float', layouts.observer),
    present: await pipeline('R447 canvas presentation', present, canvasFormat, layouts.present),
  };
  if (disposed || galleryRetired) { device.destroy(); return; }
  notifyGallery('pipelines');
  const uniform = device.createBuffer({ label: 'R446 64-byte packUniform buffer', size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const displayUniform = device.createBuffer({ label: 'R447 background color', size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const resources = { device, context, canvasFormat, pipelines, layouts, uniform, displayUniform, width: 0, height: 0, source: null, observed: null, sourceView: null, observedView: null, worldBind: null, observerBind: null, presentBind: null };
  resizeTargets(resources);
  gpu = resources;
  gpuInfo.textContent = `WebGPU device created; canvas ${canvasFormat}; emission rgba16float with unfilterable textureLoad input; R446 edition ${EDITION.id}.`;
  status.textContent = 'device-created — pipelines initialized; no event submitted yet';
}

function resizeTargets(g) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (width === g.width && height === g.height) return;
  canvas.width = width;
  canvas.height = height;
  g.width = width; g.height = height;
  g.source?.destroy(); g.observed?.destroy();
  const usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
  g.source = g.device.createTexture({ label: 'R446 rgba16float source emission', size: [width, height], format: 'rgba16float', usage });
  g.observed = g.device.createTexture({ label: 'R446 observer output direct plus PSF', size: [width, height], format: 'rgba16float', usage });
  g.sourceView = g.source.createView(); g.observedView = g.observed.createView();
  g.worldBind = g.device.createBindGroup({ layout: g.layouts.world, entries: [{ binding: 0, resource: { buffer: g.uniform } }] });
  g.observerBind = g.device.createBindGroup({ layout: g.layouts.observer, entries: [{ binding: 0, resource: { buffer: g.uniform } }, { binding: 1, resource: g.sourceView }] });
  g.presentBind = g.device.createBindGroup({ layout: g.layouts.present, entries: [{ binding: 0, resource: { buffer: g.displayUniform } }, { binding: 1, resource: g.observedView }] });
}

function backgroundUniform() {
  const values = background === 'light' ? [0.8, 0.8, 0.8, 0] : [0.018, 0.022, 0.03, 0];
  gpu.device.queue.writeBuffer(gpu.displayUniform, 0, new Float32Array(values));
}

function renderFrame(nowMs, scheduleNext = true, diagnostic = false, diagnosticOptions = {}) {
  if (disposed || !gpu) return;
  if (diagnosticHold && !diagnostic) { if (scheduleNext) requestAnimationFrame(renderFrame); return; }
  let startupProof = null;
  try {
    resizeTargets(gpu);
    const naturalTime = nowMs;
    const eventBase = controller.current();
    // Keep the cause available after expiry and during diagnostic rendering.
    // The clock gates the uniform; it must not erase the event identity.
    const event = eventBase ? { ...eventBase, x: gpu.width / 2, y: gpu.height / 2 } : null;
    const actorHeightPx = event ? event.actorHeightCssPx * (canvas.width / canvas.getBoundingClientRect().width) : 64;
    const frameData = prepareUniformFrame(event, diagnostic ? nowMs : naturalTime, { diagnostic, viewport: [gpu.width, gpu.height], actorHeightPx, sourceEnabled: diagnosticOptions.sourceEnabled, observerEnabled: diagnosticOptions.observerEnabled ?? true });
    const { ageMs, phase, active, uniform: uniformData, uniformAgeMs } = frameData;
    if (event && event.soundEnabled && audioPlayer && !verify && !audioMutedByUi && !diagnostic) audioPlayer.play(event, nowMs);
    const uniformSourceActive = event ? uniformData[8] >= 0.5 : false;
    gpu.device.queue.writeBuffer(gpu.uniform, 0, uniformData);
    backgroundUniform();
    const encoder = gpu.device.createCommandEncoder({ label: `R447 frame ${frameSerial + 1}` });
    const worldPass = encoder.beginRenderPass({ label: 'R446 world source pass', colorAttachments: [{ view: gpu.sourceView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
    worldPass.setPipeline(gpu.pipelines.world); worldPass.setBindGroup(0, gpu.worldBind);
    if (event) worldPass.setScissorRect(...scissorFor(gpu, actorHeightPx, 4));
    worldPass.draw(3); worldPass.end();
    if (galleryBound && !galleryRetired && !galleryProofAttempted && event && active && ageMs >= 80 && uniformSourceActive) {
      const [x, y, width, height] = scissorFor(gpu, actorHeightPx, 4);
      const bytesPerRow = Math.ceil(width * 8 / 256) * 256;
      const buffer = gpu.device.createBuffer({ label: 'R457 bounded first-source proof', size: bytesPerRow * height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      pendingStartupProofBuffer = buffer;
      startupProof = { buffer, bytesPerRow, width, height, ageMs, sourceActive: active, causeId: event.causeId };
      encoder.copyTextureToBuffer({ texture: gpu.source, origin: { x, y, z: 0 } },
        { buffer, bytesPerRow, rowsPerImage: height }, { width, height, depthOrArrayLayers: 1 });
      galleryProofAttempted = true;
      notifyGallery('first-frame', 'pending');
    }
    const observerPass = encoder.beginRenderPass({ label: 'R446 direct plus observer PSF pass', colorAttachments: [{ view: gpu.observedView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
    observerPass.setPipeline(gpu.pipelines.observer); observerPass.setBindGroup(0, gpu.observerBind);
    if (event) observerPass.setScissorRect(...scissorFor(gpu, actorHeightPx, 8));
    observerPass.draw(3); observerPass.end();
    const presentPass = encoder.beginRenderPass({ label: 'R447 display pass', colorAttachments: [{ view: gpu.context.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
    presentPass.setPipeline(gpu.pipelines.present); presentPass.setBindGroup(0, gpu.presentBind); presentPass.draw(3); presentPass.end();
    const commands = encoder.finish();
    const sequence = ++frameSerial;
    gpu.device.queue.submit([commands]);
    const submittedAt = timestamp();
    const receipt = { state: 'submitted', sequence, causeId: event?.causeId ?? null, creativeVersionId: event?.creativeVersionId ?? EDITION.id, variant: event?.variant ?? null, ageMs: event ? Number(ageMs.toFixed(2)) : null, uniformAgeMs: event ? Number(uniformAgeMs.toFixed(3)) : null, phase, sourceActive: event ? uniformSourceActive : false, observerEnabled: event ? frameData.observerEnabled : false, diagnostic, frame: [gpu.width, gpu.height], actorHeightBackingPx: actorHeightPx, submittedAt: Number(submittedAt.toFixed(2)) };
    appendReceipt({ ...receipt, diagnostic });
    status.textContent = event ? `${active ? 'playing' : 'inactive/expired'} — ${event.variant}; age ${Math.max(0, ageMs).toFixed(0)} / ${event.duration} ms; frame ${sequence} submitted` : 'ready — inactive frames submitted';
    lastGpuCompletion = gpu.device.queue.onSubmittedWorkDone().then(async () => {
      if (disposed) return;
      const completedReceipt = { ...receipt, state: 'completed', completedAt: Number(timestamp().toFixed(2)), completion: 'queue.onSubmittedWorkDone' };
      appendReceipt(completedReceipt);
      if (diagnostic) lastDiagnosticReceipt = completedReceipt;
      let positiveSourceRecorded = false;
      if (startupProof) {
        await startupProof.buffer.mapAsync(GPUMapMode.READ);
        const bytes = startupProof.buffer.getMappedRange().slice(0);
        startupProof.buffer.unmap();
        if (pendingStartupProofBuffer === startupProof.buffer) pendingStartupProofBuffer = null;
        startupProof.buffer.destroy();
        positiveSourceRecorded = isStartupSourceProofValid({ ...startupProof, bytes,
          frameCauseId: startupProof.causeId, currentCauseId: controller.current()?.causeId });
      }
      if (startupProof && !positiveSourceRecorded) {
        notifyGallery('first-frame', 'error', { error: { code: 'FIRST_SOURCE_PROOF_EMPTY_OR_STALE', message: 'The bounded first-frame readback contained no finite positive source for the current cause.' } });
      }
      if (startupProof && positiveSourceRecorded && galleryBound && !galleryRetired) {
        const rect = canvas.getBoundingClientRect();
        notifyGallery('playing', 'ready', { firstFrame: { recorded: true, submitted: true, completed: true,
          canvasConnected: canvas.isConnected, passes: 3, viewportWidth: rect.width, viewportHeight: rect.height,
          physicalWidth: canvas.width, physicalHeight: canvas.height, dpr: rect.width > 0 ? canvas.width / rect.width : 0,
          causeId: event.causeId, sourceOwner: 'common-action-mana-host-r457' } });
      }
      const latestAge = event ? timestamp() - event.startedAt : null;
      status.textContent = event ? `${latestAge >= event.duration ? 'inactive/expired' : 'playing'} — ${event.variant}; frame ${sequence} completed` : 'ready — inactive frame completed';
    }).catch((error) => {
      if (startupProof) {
        if (pendingStartupProofBuffer === startupProof.buffer) destroyPendingStartupProofBuffer();
        else { try { startupProof.buffer.destroy(); } catch {} }
        notifyGallery('first-frame', 'error', { error: { code: 'FIRST_SOURCE_PROOF_FAILED', message: String(error?.message || error).slice(0, 1000) } });
      }
      appendReceipt({ ...receipt, state: 'error', error: error?.message || String(error) });
    });
  } catch (error) { try { startupProof?.buffer.destroy(); } catch {} showError('render frame', error); }
  if (scheduleNext) requestAnimationFrame(renderFrame);
}

function scissorFor(g, actorHeightPx, padding) {
  const cx = g.width / 2, cy = g.height / 2, h = actorHeightPx;
  const x0 = Math.max(0, Math.floor(cx - .5 * h - padding));
  const y0 = Math.max(0, Math.floor(cy - .45 * h - padding));
  const x1 = Math.min(g.width, Math.ceil(cx + .5 * h + padding));
  const y1 = Math.min(g.height, Math.ceil(cy + .16 * h + padding));
  return [x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)];
}

function currentSnapshot() {
  const event = controller.current();
  const latest = event && controller.sample(timestamp());
  const rect = canvas.getBoundingClientRect();
  const ageMs = latest?.ageMs ?? null;
  const causeReceipts = event ? receiptLog.filter((r) => r.causeId === event.causeId) : [];
  const submitted = causeReceipts.filter((r) => r.state === 'submitted').length;
  const completed = causeReceipts.filter((r) => r.state === 'completed').length;
  return {
    hostState: gpu ? 'device-created' : (status.textContent.startsWith('error') ? 'error' : 'starting'),
    versionId: EDITION.id,
    causeId: event?.causeId ?? null,
    event: event ? { ...event, x: gpu ? gpu.width / 2 : null, y: gpu ? gpu.height / 2 : null } : null,
    phase: latest ? (!latest.active ? 'inactive' : ageMs / (event.duration || 1200) < .18 ? 'activation' : ageMs / (event.duration || 1200) < .78 ? 'operation' : 'expiry') : 'inactive',
    mode: diagnosticHold ? 'diagnostic-hold' : 'natural',
    naturalAgeMs: ageMs,
    ageMs,
    lifetimeMs: event?.duration ?? 1200,
    sourceActive: !!latest?.active,
    canvasBacking: [canvas.width, canvas.height],
    canvasCss: [rect.width, rect.height],
    actorHeightCssPx: event?.actorHeightCssPx ?? null,
    actorHeightBackingPx: event && gpu ? event.actorHeightCssPx * gpu.width / rect.width : null,
    submitted, completed,
    naturalHistory: controller.history().map((cause) => {
      const rs = receiptLog.filter((r) => r.causeId === cause.causeId);
      const causeAgeMs = timestamp() - cause.startedAt;
      return { causeId: cause.causeId, variant: cause.variant, startedAt: cause.startedAt,
        ageMs: causeAgeMs, lifetimeMs: cause.duration,
        phase: causeAgeMs < 0 ? 'pending' : causeAgeMs < cause.duration ? 'active' : 'expired',
        submitted: rs.filter((r) => r.state === 'submitted').length,
        completed: rs.filter((r) => r.state === 'completed').length };
    }),
    lastReceipt: receiptLog.at(-1) ?? null,
    diagnosticReceipt: lastDiagnosticReceipt,
    verifyHardMute: verify,
    receipts: receiptLog.slice(),
  };
}

async function enableGalleryAudioFromGesture() {
  if (verify) return { state: 'silent', reason: 'verification mode' };
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) throw new Error('Web Audio is unavailable');
    audioContext ||= new AudioContextCtor();
    await audioContext.resume();
    if (audioContext.state !== 'running') return { state: 'unavailable', reason: 'audio context did not enter running state' };
    audioPlayer ||= createSfxPlayer(audioContext, { verify: false, muted: false });
    audioMutedByUi = false;
    audioUnlocked = true;
    return { state: 'active', reason: 'using the preview’s authored SFX' };
  } catch (error) {
    console.warn('Gallery audio unlock failed; retry from the next user gesture.', error);
    return { state: 'unavailable', reason: String(error?.message || error).slice(0, 300) };
  }
}
window.__manaPreview = Object.freeze({ enableAudio: enableGalleryAudioFromGesture });

window.dvaCommonMana = Object.freeze({
  snapshot: currentSnapshot,
  setVariant(name) {
    if (!['desire', 'grit', 'rational'].includes(name)) throw new TypeError(`unsupported variant: ${name}`);
    $('variant').value = name;
    return name;
  },
  async replay({ sound = false, variant = $('variant').value, height = Number($('height').value) } = {}) {
    diagnosticHold = false;
    if (loopTimer) clearTimeout(loopTimer);
    $('variant').value = variant; $('height').value = String(height);
    await startReplay(sound, sound);
    return currentSnapshot();
  },
  async renderAtAge(ageMs, { variant, sourceEnabled = true, observerEnabled = true } = {}) {
    if (!gpu) throw new Error('WebGPU host is not initialized');
    if (!Number.isFinite(ageMs) || ageMs < 0) throw new RangeError('ageMs must be non-negative finite milliseconds');
    if (variant) this.setVariant(variant);
    if (!controller.current() || (variant && controller.current().variant !== variant)) controller.start($('variant').value, { actorHeightPx: Number($('height').value), startedAt: timestamp() });
    // Hold this explicitly diagnostic frame for capture. The event clock continues naturally in wall time.
    diagnosticHold = true;
    renderFrame(ageMs, false, true, { sourceEnabled, observerEnabled });
    await lastGpuCompletion;
    return { ...currentSnapshot(), diagnosticReceipt: lastDiagnosticReceipt };
  },
  releaseDiagnostic() { diagnosticHold = false; return currentSnapshot(); },
  setBackground(name) { if (!['dark', 'light'].includes(name)) throw new TypeError('background must be dark or light'); background = name; $('background').value = name; },
  dispose() {
    disposed = true; autoLoop = false;
    if (loopTimer) clearTimeout(loopTimer);
    destroyPendingStartupProofBuffer();
    audioPlayer?.retire();
    if (audioContext && audioContext.state !== 'closed') audioContext.close();
    if (gpu) { gpu.source.destroy(); gpu.observed.destroy(); gpu.device.destroy(); }
  },
});
window.__dvaGalleryStartupSnapshot = () => galleryBound ? ({
  schema: 'dva-gallery-startup/v1', token: galleryStartup.token, versionId: galleryStartup.versionId,
  attemptEpoch: galleryStartup.attemptEpoch, stage: galleryStage, status: galleryStatus,
  sequence: gallerySequence, ...(galleryFirstFrame ? { firstFrame: galleryFirstFrame } : {}),
}) : null;

async function startReplay(withSound, useUnlockedAudio = true) {
  if (!gpu) { status.textContent = 'starting — waiting for real WebGPU initialization'; return; }
  try {
    if (withSound && !verify && !audioUnlocked) await enableGalleryAudioFromGesture();
    const soundEnabled = !verify && useUnlockedAudio && audioUnlocked && !audioMutedByUi;
    const event = controller.start($('variant').value, { actorHeightPx: Number($('height').value), soundEnabled });
    status.textContent = `playing — ${event.variant}, cause ${event.causeId}; 1200 ms lifetime`;
    if (autoLoop) {
      if (loopTimer) clearTimeout(loopTimer);
      // Expire at 1200 ms; the next natural cause starts after a 500 ms gap.
      loopTimer = setTimeout(() => { if (!disposed && autoLoop) { if (cycleVariants) { const names = ['desire', 'grit', 'rational']; const i = names.indexOf($('variant').value); $('variant').value = names[(i + 1 + names.length) % names.length]; } startReplay(false); } }, 1700);
    }
  } catch (error) { showError('replay', error); }
}

$('replay').addEventListener('click', () => { if (verify) { startReplay(false); return; } startReplay(true); });
$('replaySilent').addEventListener('click', () => startReplay(false));
$('background').addEventListener('change', (event) => { background = event.target.value; });
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!galleryBound || event.origin !== location.origin || event.source !== window.parent ||
      data?.schema !== 'dva-gallery-startup/v1' || data.action !== 'retire' ||
      data.token !== galleryStartup.token || data.versionId !== galleryStartup.versionId || data.attemptEpoch !== galleryStartup.attemptEpoch) return;
  galleryRetired = true; autoLoop = false; galleryStatus = 'cancelled'; disposed = true;
  if (loopTimer) clearTimeout(loopTimer);
  destroyPendingStartupProofBuffer();
  audioPlayer?.retire();
  if (audioContext && audioContext.state !== 'closed') audioContext.close();
  if (gpu) { gpu.source.destroy(); gpu.observed.destroy(); gpu.device.destroy(); }
});
window.addEventListener('pagehide', () => {
  disposed = true;
  autoLoop = false;
  if (loopTimer) clearTimeout(loopTimer);
  destroyPendingStartupProofBuffer();
  audioPlayer?.retire();
  if (audioContext && audioContext.state !== 'closed') audioContext.close();
  if (gpu) { gpu.source.destroy(); gpu.observed.destroy(); gpu.device.destroy(); }
}, { once: true });

try {
  status.textContent = 'starting — requesting WebGPU adapter/device';
  await initGpu();
  if (!disposed) {
    autoLoop = params.get('galleryAutoLoop') === '1' || params.get('loop') === '1';
    const requestedVariant = params.get('variant');
    const requestedHeight = Number(params.get('height'));
    if (['desire', 'grit', 'rational'].includes(requestedVariant)) $('variant').value = requestedVariant;
    if ([64, 128].includes(requestedHeight)) $('height').value = String(requestedHeight);
    requestAnimationFrame(renderFrame);
    const autoVariant = ['desire', 'grit', 'rational'].includes(requestedVariant) ? requestedVariant : 'desire';
    if ((params.has('variant') && ['desire', 'grit', 'rational'].includes(requestedVariant)) || galleryBound) {
      controller.start(autoVariant, { actorHeightPx: Number($('height').value), soundEnabled: false });
      if (autoLoop) loopTimer = setTimeout(() => { if (!disposed && autoLoop) { if (cycleVariants) { const names = ['desire', 'grit', 'rational']; const i = names.indexOf($('variant').value); $('variant').value = names[(i + 1 + names.length) % names.length]; } startReplay(false); } }, 1700);
    }
  }
} catch (error) { showError('WebGPU initialization', error); }

