import { EDITION, normalizeEvent, sample } from './model.mjs';
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
let retiring = false;
function notifyGallery(stage, status = 'pending', detail = {}) {
  if (!galleryBound || galleryRetired || retiring) return;
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
const controller = createEventController({ onEvent: (event) => { audioControlEpoch++; eventAudioEligibility.set(event, { audioGeneration, controlEpoch: audioControlEpoch }); if (audioPlayer) audioPlayer.cancel(activeEvent); activeEvent = event; if (variantIndicator) variantIndicator.textContent = `Effect variant: ${event.variant}`; } });
let activeEvent = null;
let gpu = null;
let audioContext = null;
let audioPlayer = null;
let audioMutedByUi = false;
let audioUnlocked = false;
let audioGeneration = 0;
let audioControlEpoch = 0;
let gpuErrorEpoch = 0;
let activeAudioStartCapture = null;
const eventAudioEligibility = new WeakMap();
let audioGesturePromise = null;
let audioSuspensionPromise = null;
let background = 'dark';
let disposed = false;
let retirementPromise = null;
let retirementRequest = null;
let retirementAckSent = false;
let retirementOutcome = null;
let teardownLifecycle = null;
let ownedDevice = null;
let deviceLostPromise = null;
let deviceLostInfo = null;
let deviceLossError = null;
let initializationError = null;
let resolveInitializationSettled;
const initializationSettled = new Promise((resolve) => { resolveInitializationSettled = resolve; });
let pendingFrames = 0;
const inFlightFrameTasks = new Set();
const gpuCompletionErrors = [];
const resourceCleanupErrors = [];
let rafId = null;
let frameSerial = 0;
let targetGeneration = 0;
const receiptLog = [];
let lastGpuCompletion = Promise.resolve();
let errorScopeOwner = null;
let diagnosticHold = false;
let lastDiagnosticReceipt = null;
let autoLoop = false;
let loopTimer = null;
let galleryProofAttempted = false;
let pendingStartupProofBuffer = null;
const timestamp = () => performance.now();

function cancelScheduledFrame() {
  if (rafId === null) return;
  try { cancelAnimationFrame(rafId); } catch (error) { resourceCleanupErrors.push(`cancelAnimationFrame: ${error?.message || error}`); }
  rafId = null;
}

function scheduleFrame() {
  if (disposed || retiring || diagnosticHold || rafId !== null) return;
  rafId = requestAnimationFrame((nowMs) => { rafId = null; renderFrame(nowMs); });
}

function suppressLoopTimer() {
  autoLoop = false;
  if (loopTimer) clearTimeout(loopTimer);
  loopTimer = null;
}

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
  if (disposed || retiring || galleryRetired) return;
  if (!adapter) {
    notifyGallery('adapter', 'unsupported', { error: { code: 'WEBGPU_ADAPTER_UNAVAILABLE', message: 'No WebGPU adapter is available.' } });
    throw new Error('navigator.gpu.requestAdapter() returned no adapter.');
  }
  const device = await adapter.requestDevice();
  ownedDevice = device;
  deviceLostPromise = Promise.resolve(device.lost).then((info) => {
    deviceLostInfo = info ?? null;
    if (!disposed && !retiring) { gpuErrorEpoch++; showError('WebGPU device lost', `${info?.reason ?? 'unknown'}: ${info?.message ?? ''}`); }
    return info;
  }, (error) => { deviceLossError = String(error?.message || error); return null; });
  if (disposed || retiring || galleryRetired) return;
  notifyGallery('device');
  device.addEventListener('uncapturederror', (event) => { gpuErrorEpoch++; if (!disposed) showError('WebGPU validation', event.error); });
  device.lost.then((info) => { gpuErrorEpoch++; if (!disposed) showError('WebGPU device lost', `${info.reason}: ${info.message}`); });
  const context = canvas.getContext('webgpu');
  if (!context) throw new Error('canvas.getContext("webgpu") failed.');
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format: canvasFormat, alphaMode: 'opaque' });

  const base = new URL('./', import.meta.url);
  const [worldCode, observerCode] = await Promise.all(['world.wgsl', 'observer.wgsl'].map(async (name) => {
    const response = await fetch(new URL(name, base));
    if (!response.ok) throw new Error(`Could not load R5 ${name}: HTTP ${response.status}`);
    return response.text();
  }));
  const [world, observer, present] = await Promise.all([
    shaderModule(device, 'R5 world', worldCode),
    shaderModule(device, 'R5 observer', observerCode),
    shaderModule(device, 'R5 presentation', presentationWGSL),
  ]);
  if (disposed || retiring || galleryRetired) return;
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
    world: await pipeline('R5 world emission', world, 'rgba16float', layouts.world),
    observer: await pipeline('R5 observer direct plus Gaussian', observer, 'rgba16float', layouts.observer),
    present: await pipeline('R5 canvas presentation', present, canvasFormat, layouts.present),
  };
  if (disposed || retiring || galleryRetired) return;
  notifyGallery('pipelines');
  const uniform = device.createBuffer({ label: 'R5 64-byte packUniform buffer', size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const displayUniform = device.createBuffer({ label: 'R5 background color', size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const resources = { device, context, canvasFormat, pipelines, layouts, uniform, displayUniform, width: 0, height: 0, source: null, observed: null, sourceView: null, observedView: null, worldBind: null, observerBind: null, presentBind: null };
  resizeTargets(resources);
  gpu = resources;
  gpuInfo.textContent = `WebGPU device created; canvas ${canvasFormat}; emission rgba16float with unfilterable textureLoad input; R5 creative edition ${EDITION.id}.`;
  status.textContent = 'device-created — pipelines initialized; no event submitted yet';
}

function resizeTargets(g) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (width === g.width && height === g.height) return;
  targetGeneration++;
  canvas.width = width;
  canvas.height = height;
  g.width = width; g.height = height;
  g.source?.destroy(); g.observed?.destroy();
  const usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
  g.source = g.device.createTexture({ label: 'R5 rgba16float source emission', size: [width, height], format: 'rgba16float', usage });
  g.observed = g.device.createTexture({ label: 'R5 observer output direct plus PSF', size: [width, height], format: 'rgba16float', usage });
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
  if (disposed || retiring || !gpu) return;
  if (diagnosticHold && !diagnostic) { if (scheduleNext) scheduleFrame(); return; }
  let startupProof = null;
  let scopeDevice = null, scopesPushed = 0, scopeSequence = null;
  const popFrameErrorScopes = async () => {
    const errors = [];
    while (scopesPushed > 0) {
      scopesPushed--;
      try { const error = await scopeDevice.popErrorScope(); if (error) errors.push(error); }
      catch (error) { errors.push(error); }
    }
    return errors;
  };
  try {
    resizeTargets(gpu);
    const naturalTime = nowMs;
    const eventBase = controller.current();
    // Keep the cause available after expiry and during diagnostic rendering.
    // The clock gates the uniform; it must not erase the event identity.
    const event = eventBase ? { ...eventBase, x: gpu.width / 2, y: gpu.height / 2 } : null;
    const actorHeightPx = event ? event.actorHeightCssPx * (canvas.width / canvas.getBoundingClientRect().width) : 64;
    const frameData = prepareUniformFrame(event, diagnostic ? nowMs : naturalTime, { diagnostic, viewport: [gpu.width, gpu.height], actorHeightPx, sourceEnabled: diagnosticOptions.sourceEnabled, observerEnabled: diagnosticOptions.observerEnabled ?? true, reducedMotion: diagnosticOptions.reducedMotion ?? false, sparklesEnabled: diagnosticOptions.sparklesEnabled ?? true });
    const { ageMs, phase, active, uniform: uniformData, uniformAgeMs } = frameData;
    const eventEligibility = eventBase ? eventAudioEligibility.get(eventBase) : null;
    const audioCapture = eventBase ? {
      eventBase, id: eventBase.id, causeId: eventBase.causeId, causeKey: normalizeEvent(eventBase)?.causeKey ?? null,
      playerId: eventBase.playerId, variant: eventBase.variant, startedAt: eventBase.startedAt,
      versionId: eventBase.creativeVersionId, gpu, device: gpu.device, source: gpu.source, observed: gpu.observed,
      targetWidth: gpu.width, targetHeight: gpu.height, targetGeneration, audioGeneration, controlEpoch: audioControlEpoch, gpuErrorEpoch,
      targetCssWidth: canvas.getBoundingClientRect().width, targetCssHeight: canvas.getBoundingClientRect().height,
      eventAudioGeneration: eventEligibility?.audioGeneration ?? null, eventControlEpoch: eventEligibility?.controlEpoch ?? null,
      sourceActive: uniformData[8] >= 0.5, observerEnabled: frameData.observerEnabled,
      diagnostic, held: diagnosticHold,
    } : null;
    const frameDevice = gpu.device;
    if (errorScopeOwner) throw new Error('R5 frame scope ownership overlap');
    errorScopeOwner = { sequence: frameSerial + 1, device: frameDevice };
    scopeDevice = frameDevice;
    scopeSequence = frameSerial + 1;
    for (const kind of ['validation', 'internal', 'out-of-memory']) { frameDevice.pushErrorScope(kind); scopesPushed++; }
    const uniformSourceActive = event ? uniformData[8] >= 0.5 : false;
    gpu.device.queue.writeBuffer(gpu.uniform, 0, uniformData);
    backgroundUniform();
    const encoder = gpu.device.createCommandEncoder({ label: `R5 frame ${frameSerial + 1}` });
    const worldPass = encoder.beginRenderPass({ label: 'R5 world source pass', colorAttachments: [{ view: gpu.sourceView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
    worldPass.setPipeline(gpu.pipelines.world); worldPass.setBindGroup(0, gpu.worldBind);
    if (event) worldPass.setScissorRect(...scissorFor(gpu, actorHeightPx, 4));
    worldPass.draw(3); worldPass.end();
    if (galleryBound && !galleryRetired && !galleryProofAttempted && event && active && ageMs >= 80 && uniformSourceActive) {
      const [x, y, width, height] = scissorFor(gpu, actorHeightPx, 4);
      const bytesPerRow = Math.ceil(width * 8 / 256) * 256;
      const buffer = gpu.device.createBuffer({ label: 'R5 bounded first-source proof', size: bytesPerRow * height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      pendingStartupProofBuffer = buffer;
      startupProof = { buffer, bytesPerRow, width, height, ageMs, sourceActive: active, causeId: event.causeId };
      encoder.copyTextureToBuffer({ texture: gpu.source, origin: { x, y, z: 0 } },
        { buffer, bytesPerRow, rowsPerImage: height }, { width, height, depthOrArrayLayers: 1 });
      galleryProofAttempted = true;
      notifyGallery('first-frame', 'pending');
    }
    const observerPass = encoder.beginRenderPass({ label: 'R5 direct plus observer PSF pass', colorAttachments: [{ view: gpu.observedView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
    observerPass.setPipeline(gpu.pipelines.observer); observerPass.setBindGroup(0, gpu.observerBind);
    if (event) observerPass.setScissorRect(...scissorFor(gpu, actorHeightPx, 8));
    observerPass.draw(3); observerPass.end();
    const presentPass = encoder.beginRenderPass({ label: 'R5 display pass', colorAttachments: [{ view: gpu.context.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
    presentPass.setPipeline(gpu.pipelines.present); presentPass.setBindGroup(0, gpu.presentBind); presentPass.draw(3); presentPass.end();
    const commands = encoder.finish();
    const sequence = ++frameSerial;
    gpu.device.queue.submit([commands]);
    pendingFrames++;
    const submittedAt = timestamp();
    const receipt = { state: 'submitted', sequence, causeId: event?.causeId ?? null, creativeVersionId: event?.creativeVersionId ?? EDITION.id, variant: event?.variant ?? null, ageMs: event ? Number(ageMs.toFixed(2)) : null, uniformAgeMs: event ? Number(uniformAgeMs.toFixed(3)) : null, phase, sourceActive: event ? uniformSourceActive : false, observerEnabled: event ? frameData.observerEnabled : false, diagnostic, frame: [gpu.width, gpu.height], actorHeightBackingPx: actorHeightPx, submittedAt: Number(submittedAt.toFixed(2)) };
    appendReceipt({ ...receipt, diagnostic });
    status.textContent = event ? `${active ? 'playing' : 'inactive/expired'} — ${event.variant}; age ${Math.max(0, ageMs).toFixed(0)} / ${event.duration} ms; frame ${sequence} submitted` : 'ready — inactive frames submitted';
    let submittedWork;
    try { submittedWork = Promise.resolve(gpu.device.queue.onSubmittedWorkDone()); }
    catch (error) { submittedWork = Promise.reject(error); }
    let completionTask;
    completionTask = submittedWork.then(async () => {
      const scopeErrors = await popFrameErrorScopes();
      if (scopeErrors.length) throw new Error(`R5 GPU error scope: ${scopeErrors.map((error) => error?.message || String(error)).join('; ')}`);
      if (errorScopeOwner?.sequence === sequence && errorScopeOwner.device === frameDevice) errorScopeOwner = null;
      const completedReceipt = { ...receipt, state: 'completed', completedAt: Number(timestamp().toFixed(2)), completion: 'queue.onSubmittedWorkDone' };
      appendReceipt(completedReceipt);
      if (audioCapture && !scopeErrors.length) attemptCapturedAudio(audioCapture);
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
      if (startupProof && !positiveSourceRecorded && !retiring) {
        notifyGallery('first-frame', 'error', { error: { code: 'FIRST_SOURCE_PROOF_EMPTY_OR_STALE', message: 'The bounded first-frame readback contained no finite positive source for the current cause.' } });
      }
      if (startupProof && positiveSourceRecorded && galleryBound && !galleryRetired && !retiring) {
        const rect = canvas.getBoundingClientRect();
        notifyGallery('playing', 'ready', { firstFrame: { recorded: true, submitted: true, completed: true,
          canvasConnected: canvas.isConnected, passes: 3, viewportWidth: rect.width, viewportHeight: rect.height,
          physicalWidth: canvas.width, physicalHeight: canvas.height, dpr: rect.width > 0 ? canvas.width / rect.width : 0,
          causeId: event.causeId, sourceOwner: 'common-action-mana-host-r5-derived-r482' } });
      }
      const latestAge = event ? timestamp() - event.startedAt : null;
      if (!retiring && !disposed) status.textContent = event ? `${latestAge >= event.duration ? 'inactive/expired' : 'playing'} — ${event.variant}; frame ${sequence} completed` : 'ready — inactive frame completed';
    }).catch(async (error) => {
      if (scopesPushed > 0) await popFrameErrorScopes();
      if (errorScopeOwner?.sequence === sequence && errorScopeOwner.device === frameDevice) errorScopeOwner = null;
      gpuCompletionErrors.push(String(error?.message || error));
      if (startupProof) {
        if (pendingStartupProofBuffer === startupProof.buffer) destroyPendingStartupProofBuffer();
        else { try { startupProof.buffer.destroy(); } catch {} }
        notifyGallery('first-frame', 'error', { error: { code: 'FIRST_SOURCE_PROOF_FAILED', message: String(error?.message || error).slice(0, 1000) } });
      }
      appendReceipt({ ...receipt, state: 'error', error: error?.message || String(error) });
    }).finally(() => { pendingFrames = Math.max(0, pendingFrames - 1); inFlightFrameTasks.delete(completionTask); if (scheduleNext) scheduleFrame(); });
    inFlightFrameTasks.add(completionTask);
    lastGpuCompletion = completionTask;
  } catch (error) {
    try { startupProof?.buffer.destroy(); } catch {}
    if (scopesPushed > 0) void popFrameErrorScopes().finally(() => { if (errorScopeOwner?.sequence === scopeSequence && errorScopeOwner.device === scopeDevice) errorScopeOwner = null; });
    else if (errorScopeOwner?.sequence === scopeSequence && errorScopeOwner.device === scopeDevice) errorScopeOwner = null;
    showError('render frame', error);
    if (scheduleNext) scheduleFrame();
  }
}

function attemptCapturedAudio(capture) {
  const now = timestamp();
  if (!isCapturedAudioCurrent(capture, now)) return false;
  activeAudioStartCapture = capture;
  try { return audioPlayer.play(controller.current(), now); }
  catch (error) { console.warn('R5 synchronized audio start failed; visual output remains active.', error); return false; }
  finally { activeAudioStartCapture = null; }
}

function isCapturedAudioCurrent(capture, now) {
  const current = controller.current(), currentGpu = gpu, rect = canvas.getBoundingClientRect();
  const stillSameCause = current === capture.eventBase && current?.id === capture.id && current?.causeId === capture.causeId &&
    current?.playerId === capture.playerId && current?.variant === capture.variant && current?.startedAt === capture.startedAt &&
    current?.creativeVersionId === capture.versionId && normalizeEvent(current)?.causeKey === capture.causeKey;
  const valid = stillSameCause && current?.soundEnabled === true && capture.sourceActive && capture.observerEnabled && !capture.diagnostic && !capture.held &&
    currentGpu === capture.gpu && currentGpu?.device === capture.device && currentGpu?.source === capture.source && currentGpu?.observed === capture.observed &&
    currentGpu?.width === capture.targetWidth && currentGpu?.height === capture.targetHeight && capture.device === ownedDevice &&
    canvas.width === capture.targetWidth && canvas.height === capture.targetHeight && rect.width === capture.targetCssWidth && rect.height === capture.targetCssHeight &&
    targetGeneration === capture.targetGeneration && gpuErrorEpoch === capture.gpuErrorEpoch &&
    !disposed && !retiring && !galleryRetired && !deviceLossError && !deviceLostInfo && !diagnosticHold &&
    audioGeneration === capture.audioGeneration && audioControlEpoch === capture.controlEpoch &&
    capture.eventAudioGeneration === capture.audioGeneration && capture.eventControlEpoch === capture.controlEpoch &&
    !verify && !documentIsHidden() && document.visibilityState !== 'hidden' && canvas.isConnected && rect.width > 0 && rect.height > 0 &&
    audioUnlocked && !audioMutedByUi && audioContext?.state === 'running' && !!audioPlayer &&
    now >= capture.startedAt && now - capture.startedAt < current.duration;
  return valid;
}

function guardedSfxContext(context) {
  return new Proxy(context, {
    get(target, property) {
      if (property === 'createBuffer') return (...args) => target.createBuffer(...args);
      if (property === 'createBufferSource') return (...args) => {
        const source = target.createBufferSource(...args);
        return new Proxy(source, {
          get(node, key) {
            if (key === 'start') return (...startArgs) => {
              const capture = activeAudioStartCapture;
              if (!capture || target.state !== 'running' || !isCapturedAudioCurrent(capture, timestamp())) throw new Error('R5 audio start invalidated before source.start');
              return node.start(...startArgs);
            };
            const value = Reflect.get(node, key, node);
            return typeof value === 'function' ? value.bind(node) : value;
          },
          set(node, key, value) { return Reflect.set(node, key, value, node); },
        });
      };
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function scissorFor(g, actorHeightPx, padding) {
  const cx = g.width / 2, cy = g.height / 2, h = actorHeightPx;
  const x0 = Math.max(0, Math.floor(cx - .5 * h - padding));
  const y0 = Math.max(0, Math.floor(cy - .45 * h - padding));
  const x1 = Math.min(g.width, Math.ceil(cx + .5 * h + padding));
  const y1 = Math.min(g.height, Math.ceil(cy + .16 * h + padding));
  return [x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)];
}

async function waitForDeviceLoss(promise, timeoutMs = 5000) {
  if (!promise) throw new Error('owned device has no loss promise');
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('device loss settlement timeout')), timeoutMs); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

function sendRetirementAck(outcome) {
  if (!retirementRequest || retirementAckSent || !galleryBound) return;
  const message = {
    schema: 'dva-gallery-startup/v1',
    action: outcome.success ? 'retired' : 'retire-failed',
    token: galleryStartup.token,
    versionId: galleryStartup.versionId,
    attemptEpoch: galleryStartup.attemptEpoch,
    sequence: ++gallerySequence,
    lifecycle: outcome.lifecycle,
  };
  window.parent.postMessage(message, location.origin);
  retirementAckSent = true;
}

async function performRetirement() {
  suppressLoopTimer();
  cancelScheduledFrame();
  diagnosticHold = false;
  audioGeneration++; gpuErrorEpoch++;
  const teardownErrors = resourceCleanupErrors;
  let queueDrained = false;
  let deviceDestroyed = false;
  let deviceLostSettled = false;
  let sameDevice = false;
  let lostWaitError = null;
  let audioContextState = audioContext?.state ?? 'absent';
  let audioSettled = false;

  try { await initializationSettled; }
  catch (error) { teardownErrors.push(`initialization: ${error?.message || error}`); }
  if (initializationError) teardownErrors.push(`initialization: ${initializationError}`);
  while (inFlightFrameTasks.size) {
    const batch = [...inFlightFrameTasks];
    const results = await Promise.allSettled(batch);
    for (const result of results) if (result.status === 'rejected') teardownErrors.push(`in-flight frame: ${result.reason?.message || result.reason}`);
  }
  if (pendingFrames !== 0) teardownErrors.push(`pending frames remain: ${pendingFrames}`);

  const device = ownedDevice;
  if (device) {
    try { await device.queue.onSubmittedWorkDone(); queueDrained = pendingFrames === 0 && gpuCompletionErrors.length === 0; }
    catch (error) { teardownErrors.push(`queue drain: ${error?.message || error}`); }
  }
  if (gpuCompletionErrors.length) teardownErrors.push(...gpuCompletionErrors.map((error) => `GPU completion: ${error}`));
  destroyPendingStartupProofBuffer();

  try { audioPlayer?.retire(); }
  catch (error) { teardownErrors.push(`audio retire: ${error?.message || error}`); }
  if (audioGesturePromise) {
    try { await waitForDeviceLoss(audioGesturePromise, 5000); }
    catch (error) { teardownErrors.push(`audio gesture settlement: ${error?.message || error}`); }
  }
  if (audioSuspensionPromise) {
    try { await audioSuspensionPromise; }
    catch (error) { teardownErrors.push(`audio suspend: ${error?.message || error}`); }
  }
  try {
    if (audioContext && audioContext.state !== 'closed') await audioContext.close();
    audioContextState = audioContext?.state ?? 'absent';
    audioSettled = audioContextState === 'closed' || audioContextState === 'absent';
  } catch (error) {
    audioContextState = audioContext?.state ?? 'unknown';
    teardownErrors.push(`audio close: ${error?.message || error}`);
  }
  if (!audioContext) audioSettled = true;
  const audioPlayerState = audioPlayer?.snapshot?.();
  const audioVoicesRemaining = audioPlayerState?.live?.length ?? 0;
  if (audioVoicesRemaining !== 0) teardownErrors.push(`audio voices remain: ${audioVoicesRemaining}`);

  if (gpu) {
    for (const [name, resource] of [['source texture', gpu.source], ['observer texture', gpu.observed], ['uniform buffer', gpu.uniform], ['display uniform buffer', gpu.displayUniform]]) {
      try { resource?.destroy(); } catch (error) { teardownErrors.push(`${name}: ${error?.message || error}`); }
    }
    try { gpu.context.unconfigure(); } catch (error) { teardownErrors.push(`context unconfigure: ${error?.message || error}`); }
  }

  if (device) {
    sameDevice = device === ownedDevice && (!gpu || gpu.device === device);
    try { device.destroy(); deviceDestroyed = true; }
    catch (error) { teardownErrors.push(`device destroy: ${error?.message || error}`); }
    try {
      const info = await waitForDeviceLoss(deviceLostPromise);
      deviceLostSettled = !!info;
      if (!deviceLostSettled) teardownErrors.push('device loss settled without loss info');
    } catch (error) { lostWaitError = String(error?.message || error); teardownErrors.push(`device loss: ${lostWaitError}`); }
  }

  disposed = true;
  galleryRetired = true;
  const lostReason = deviceLostInfo?.reason ?? null;
  const success = !!device && queueDrained && deviceDestroyed && deviceLostSettled && lostReason === 'destroyed' &&
    sameDevice && audioSettled && audioVoicesRemaining === 0 && pendingFrames === 0 && teardownErrors.length === 0 && !deviceLossError;
  const deviceLifecycle = success ? 'destroyed-loss-settled' : 'failed';
  const deviceSummary = {
    status: deviceLifecycle,
    drained: queueDrained,
    destroyCalled: deviceDestroyed,
    lostReason,
    sameDevice,
  };
  const audioSummary = {
    settled: audioSettled,
    contextState: audioContextState,
    voicesRemaining: audioVoicesRemaining,
    pendingCount: audioVoicesRemaining,
    errors: teardownErrors.filter((error) => error.startsWith('audio ')),
  };
  const lifecycle = {
    resourceState: !device ? 'not-created' : success ? 'retired' : 'retirement-failed',
    disposeSettled: true,
    teardown: 'disposed',
    deviceLifecycle,
    deviceDrained: queueDrained,
    deviceDestroyed,
    deviceLostSettled,
    deviceLoss: { reason: lostReason, expected: lostReason === 'destroyed', sameDevice },
    device: deviceSummary,
    host: {
      status: success ? 'retired' : 'failed',
      pendingFrames,
      resourceCleanupErrors: teardownErrors.slice(),
      device: deviceSummary,
      lost: { reason: lostReason, sameDevice },
    },
    audio: audioSummary,
    rawReceipts: {
      host: { state: success ? 'retired' : 'failed', pendingFrames, lost: { reason: lostReason, sameDevice } },
      hostRetiredEvent: {
        name: success ? 'retired' : 'retire-failed',
        pendingErrorCount: teardownErrors.length,
        effectError: null,
        queueError: gpuCompletionErrors[0] ?? null,
        lostWaitError,
        lost: { reason: lostReason, sameDevice },
      },
      audio: audioSummary,
    },
    errors: teardownErrors.slice(),
  };
  teardownLifecycle = lifecycle;
  return { success, lifecycle };
}

function beginRetirement(request = null) {
  if (request) retirementRequest = request;
  if (!retirementPromise) {
    retiring = true;
    audioControlEpoch++;
    suppressLoopTimer();
    cancelScheduledFrame();
    retirementPromise = performRetirement().then((outcome) => {
      retirementOutcome = outcome;
      sendRetirementAck(outcome);
      return outcome;
    });
  } else if (retirementOutcome) sendRetirementAck(retirementOutcome);
  return retirementPromise;
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
    lifecycle: teardownLifecycle,
    receipts: receiptLog.slice(),
  };
}

function documentIsHidden() { return document.hidden === true || document.visibilityState === 'hidden'; }

function muteGalleryAudio() {
  audioGeneration++;
  audioControlEpoch++;
  audioMutedByUi = true;
  audioUnlocked = false;
  try { audioPlayer?.cancel(controller.current()); }
  catch (error) { console.warn('Gallery audio cancel failed.', error); }
  if (audioContext && audioContext.state === 'running' && typeof audioContext.suspend === 'function') {
    try { audioSuspensionPromise = Promise.resolve(audioContext.suspend()).catch((error) => { resourceCleanupErrors.push(`audio suspend: ${error?.message || error}`); console.warn('Gallery audio suspend failed.', error); }); }
    catch (error) { resourceCleanupErrors.push(`audio suspend: ${error?.message || error}`); }
  }
  return { state: 'muted', reason: 'audio muted without changing the visual cause' };
}

async function enableGalleryAudioFromGesture() {
  if (retiring || disposed) return { state: 'silent', reason: 'host is retiring' };
  if (verify) return { state: 'silent', reason: 'verification mode' };
  if (documentIsHidden()) return { state: 'unavailable', reason: 'page is hidden; retry from a visible user gesture' };
  const generation = ++audioGeneration;
  audioMutedByUi = false;
  const task = (async () => {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) throw new Error('Web Audio is unavailable');
      audioContext ||= new AudioContextCtor();
      const context = audioContext;
      await context.resume();
      if (generation !== audioGeneration || retiring || disposed || documentIsHidden() || audioMutedByUi || context !== audioContext) {
        if (context.state === 'running' && typeof context.suspend === 'function') await context.suspend();
        return { state: 'unavailable', reason: 'audio unlock became stale before completion' };
      }
      if (context.state !== 'running') return { state: 'unavailable', reason: 'audio context did not enter running state' };
      audioPlayer ||= createSfxPlayer(guardedSfxContext(context), { verify: false, muted: false });
      audioUnlocked = true;
      return { state: 'active', reason: 'using the preview’s authored SFX' };
    } catch (error) {
      console.warn('Gallery audio unlock failed; retry from the next user gesture.', error);
      return { state: 'unavailable', reason: String(error?.message || error).slice(0, 300) };
    }
  })();
  audioGesturePromise = task;
  try { return await task; }
  finally { if (audioGesturePromise === task) audioGesturePromise = null; }
}
window.__manaPreview = Object.freeze({ enableAudio: enableGalleryAudioFromGesture, muteAudio: muteGalleryAudio });
document.addEventListener('visibilitychange', () => { if (documentIsHidden()) muteGalleryAudio(); });

window.dvaCommonMana = Object.freeze({
  snapshot: currentSnapshot,
  setVariant(name) {
    if (!['desire', 'grit', 'rational'].includes(name)) throw new TypeError(`unsupported variant: ${name}`);
    audioControlEpoch++;
    $('variant').value = name;
    return name;
  },
  async replay({ sound = false, variant = $('variant').value, height = Number($('height').value) } = {}) {
    if (retiring || disposed) throw new Error('host is retiring');
    diagnosticHold = false;
    cancelScheduledFrame();
    if (loopTimer) clearTimeout(loopTimer);
    loopTimer = null;
    $('variant').value = variant; $('height').value = String(height);
    await startReplay(sound, sound);
    scheduleFrame();
    return currentSnapshot();
  },
  async renderAtAge(ageMs, { variant, sourceEnabled = true, observerEnabled = true, reducedMotion = false, sparklesEnabled = true } = {}) {
    if (!gpu) throw new Error('WebGPU host is not initialized');
    if (!Number.isFinite(ageMs) || ageMs < 0) throw new RangeError('ageMs must be non-negative finite milliseconds');
    if (variant) this.setVariant(variant);
    if (!controller.current() || (variant && controller.current().variant !== variant)) controller.start($('variant').value, { actorHeightPx: Number($('height').value), startedAt: timestamp() });
    // Hold this explicitly diagnostic frame for capture. The event clock continues naturally in wall time.
    suppressLoopTimer();
    cancelScheduledFrame();
    diagnosticHold = true;
    audioControlEpoch++;
    await lastGpuCompletion;
    renderFrame(ageMs, false, true, { sourceEnabled, observerEnabled, reducedMotion, sparklesEnabled });
    await lastGpuCompletion;
    return { ...currentSnapshot(), diagnosticReceipt: lastDiagnosticReceipt };
  },
  releaseDiagnostic() {
    diagnosticHold = false;
    audioControlEpoch++;
    // Resume the same cause and selected variant; diagnostic hold intentionally suppresses auto-loop restart.
    scheduleFrame();
    return currentSnapshot();
  },
  setBackground(name) { if (!['dark', 'light'].includes(name)) throw new TypeError('background must be dark or light'); background = name; $('background').value = name; },
  dispose() { return beginRetirement(); },
});
window.__dvaGalleryStartupSnapshot = () => galleryBound ? ({
  schema: 'dva-gallery-startup/v1', token: galleryStartup.token, versionId: galleryStartup.versionId,
  attemptEpoch: galleryStartup.attemptEpoch, stage: galleryStage, status: galleryStatus,
  sequence: gallerySequence, ...(galleryFirstFrame ? { firstFrame: galleryFirstFrame } : {}),
}) : null;

async function startReplay(withSound, useUnlockedAudio = true) {
  if (retiring || disposed) return;
  if (!gpu) { status.textContent = 'starting — waiting for real WebGPU initialization'; return; }
  try {
    if (withSound && !verify && !audioUnlocked) await enableGalleryAudioFromGesture();
    const soundEnabled = !verify && useUnlockedAudio && audioUnlocked && !audioMutedByUi;
    const event = controller.start($('variant').value, { actorHeightPx: Number($('height').value), soundEnabled });
    status.textContent = `playing — ${event.variant}, cause ${event.causeId}; 1200 ms lifetime`;
    if (autoLoop) {
      if (loopTimer) clearTimeout(loopTimer);
      // Expire at 1200 ms; the next natural cause starts after a 500 ms gap.
      loopTimer = setTimeout(() => { loopTimer = null; if (!disposed && !retiring && !diagnosticHold && autoLoop) { if (cycleVariants) { const names = ['desire', 'grit', 'rational']; const i = names.indexOf($('variant').value); $('variant').value = names[(i + 1 + names.length) % names.length]; } startReplay(false); } }, 1700);
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
  galleryStatus = 'retiring';
  void beginRetirement(data).catch((error) => showError('R5 retirement failed', error));
});
window.addEventListener('pagehide', () => {
  void beginRetirement().catch((error) => console.warn('R5 pagehide retirement failed', error));
}, { once: true });

try {
  status.textContent = 'starting — requesting WebGPU adapter/device';
  const initializationRun = initGpu();
  await initializationRun;
  if (!disposed && !retiring) {
    autoLoop = params.get('galleryAutoLoop') === '1' || params.get('loop') === '1';
    const requestedVariant = params.get('variant');
    const requestedHeight = Number(params.get('height'));
    if (['desire', 'grit', 'rational'].includes(requestedVariant)) $('variant').value = requestedVariant;
    if ([64, 128].includes(requestedHeight)) $('height').value = String(requestedHeight);
    scheduleFrame();
    const autoVariant = ['desire', 'grit', 'rational'].includes(requestedVariant) ? requestedVariant : 'desire';
    if ((params.has('variant') && ['desire', 'grit', 'rational'].includes(requestedVariant)) || galleryBound) {
      controller.start(autoVariant, { actorHeightPx: Number($('height').value), soundEnabled: false });
      if (autoLoop) loopTimer = setTimeout(() => { loopTimer = null; if (!disposed && !retiring && !diagnosticHold && autoLoop) { if (cycleVariants) { const names = ['desire', 'grit', 'rational']; const i = names.indexOf($('variant').value); $('variant').value = names[(i + 1 + names.length) % names.length]; } startReplay(false); } }, 1700);
    }
  }
} catch (error) { initializationError = String(error?.message || error); showError('WebGPU initialization', error); }
finally { resolveInitializationSettled(); }

