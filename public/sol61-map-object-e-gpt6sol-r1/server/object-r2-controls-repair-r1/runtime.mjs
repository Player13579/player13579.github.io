import { planSecurityRoomR05Visual } from './visual-clock.mjs';
import { buildFrame as buildR2Frame, packUniform as packR2Uniform, createKernels as createR2Kernels } from './creative.mjs';
import { OBJECTS, advanceActor, nearestUsable, proximityTransition, createFixtureReceipt, validateReceipts, commitPreviewSuccess } from './object-e.mjs';

const W = 1340, H = 1174, F16 = 'rgba16float';
const params = new URLSearchParams(location.search);
const VERIFY = params.has('verify'), EMBED = params.has('embed'), CAPTURE_ENABLED = params.has('capture');
if (EMBED) document.documentElement.classList.add('embed');
const canvas = document.querySelector('#view'), statusNode = document.querySelector('#status');
const overlay = document.querySelector('#overlay');
const input = {
  rate: document.querySelector('#rate'), size: document.querySelector('#size'),
  monitor: document.querySelector('#monitor'), auth: document.querySelector('#authSource'),
  rack: document.querySelector('#rack'), visibility: document.querySelector('#visibility'),
  near: document.querySelector('#near'), flare: document.querySelector('#flare'),
  exposure: document.querySelector('#exposure'), presentation: document.querySelector('#presentation'),
  rimSource: document.querySelector('#rimSource'), rimObserver: document.querySelector('#rimObserver'),
  observer: document.querySelector('#observer'), shift: document.querySelector('#shift'),
  reducedMotion: document.querySelector('#reducedMotion'),
  missingAmbient: document.querySelector('#missingAmbient'), missingConsole: document.querySelector('#missingConsole'),
  missingNearby: document.querySelector('#missingNearby')
};
const state = { rate: 1, elapsedSeconds: 0, lastWall: 0, authEvent: null,
  monitor: true, auth: true, rack: true, visibility: 1, near: true, flare: true,
  centerX: 670, centerY: 587, pupil: -0.1745329252, shiftX: 0, shiftY: 0,
  reducedMotion: false, exposure: 1, rimSourceOn: true, rimObserverOn: true,
  missingAmbientOn: true, missingConsoleOn: true, missingNearbyOn: true, disposed: false };
let adapter, device, context, canvasFormat, baseTexture, worldTexture, sourceTexture, receivedTexture, rimTexture, samplers, pipelines, groups;
let rimPipeline, rimBindGroup, rimUniformBuffer, rimShaderHash = null;
let uniformBuffer, transferUniformBuffer, lost = false, firstGPUFrameSubmitted = false;
let objectPipeline, objectBindGroup, objectUniformBuffer, objectShaderHash;
const objectActor = [670, 680], objectReceipts = [], pressedKeys = new Set();
const objectCauseIds = new Set();
let previewSuccessCount = 0;
let pointerGoal = null, previousNearbyObjectId = null, compareOriginal = false, compareSavedRate = 1, objectDiagnostic = 0, objectLayerEnabled = true, objectShift = [0,0];
const objectCanvas = canvas;
let frameSerial = 0, frameBusy = false;
const frameIdleWaiters = [];
let initialPNGHash = null, wgslHash = null, apiReady = false;
const captureUploadWarnings = [];
const testPoints = [
  { id: 'monitor-source', x: 580, y: 155, kind: 'source' },
  { id: 'auth-display-source', x: 1196, y: 420, kind: 'source' },
  { id: 'auth-ready-source', x: 1190, y: 298, kind: 'source' },
  { id: 'rack-green-source', x: 1143, y: 696, kind: 'source' },
  { id: 'desk-receiver', x: 700, y: 265, kind: 'receiver' },
  { id: 'floor-continuity-a', x: 600, y: 357, kind: 'receiver' },
  { id: 'floor-continuity-b', x: 600, y: 363, kind: 'receiver' },
  { id: 'floor-continuity-c', x: 1083, y: 470, kind: 'receiver' },
  { id: 'floor-continuity-d', x: 1087, y: 470, kind: 'receiver' },
  { id: 'cabinet-left', x: 460, y: 325, kind: 'receiver' },
  { id: 'cabinet-right', x: 940, y: 325, kind: 'receiver' },
  { id: 'caster-left', x: 654, y: 395, kind: 'occlusion' },
  { id: 'caster-right', x: 754, y: 397, kind: 'occlusion' },
  { id: 'column-occlusion', x: 702, y: 380, kind: 'occlusion' },
  { id: 'foreground-occlusion', x: 700, y: 315, kind: 'occlusion' },
  { id: 'monitor-near-edge', x: 581, y: 162, kind: 'near' },
  { id: 'monitor-flare-axis', x: 650, y: 155, kind: 'flare' },
  { id: 'auth-near-edge', x: 1197, y: 425, kind: 'near' },
  { id: 'auth-flare-axis', x: 1225, y: 420, kind: 'flare' },
  { id: 'observer-off-axis', x: 700, y: 155, kind: 'observer' },
  { id: 'monitor-wing-top-left', x: 519, y: 158, kind: 'flare' },
  { id: 'monitor-wing-inner-left', x: 646, y: 153, kind: 'flare' },
  { id: 'monitor-wing-top-right', x: 933, y: 159, kind: 'flare' },
  { id: 'monitor-wing-lower-left', x: 520, y: 218, kind: 'flare' }
];
const align = (value, n = 256) => Math.ceil(value / n) * n;
const R2_VERSION = 'server-object-e-sol61-quality-r2';
let r2ShaderHash = null;
function status(message) { statusNode.textContent = String(message); }
function assert(ok, message) { if (!ok) throw new Error(message); }
function formatGPUCompilationMessages(messages) {
  return JSON.stringify(messages.map(({ message, type, lineNum, linePos }) =>
    ({ message, type, lineNum, linePos })));
}
function createDiagnosticQueue({ isFrameBusy, waitForFrameIdle }) {
  let tail = Promise.resolve(), queued = 0;
  return Object.freeze({
    get active() { return queued > 0; },
    run(operation) {
      queued++;
      const result = tail.catch(() => {}).then(async () => {
        while (isFrameBusy()) await waitForFrameIdle();
        return operation();
      });
      tail = result.then(() => undefined, () => undefined).finally(() => { queued--; });
      return result;
    }
  });
}
function waitForFrameIdle() {
  if (!frameBusy) return Promise.resolve();
  return new Promise(resolve => frameIdleWaiters.push(resolve));
}
const diagnosticQueue = createDiagnosticQueue({ isFrameBusy: () => frameBusy, waitForFrameIdle });
function f16(value) {
  const sign = (value >>> 15) ? -1 : 1, exp = (value >>> 10) & 31, mantissa = value & 1023;
  if (exp === 0) return sign * 2 ** -14 * (mantissa / 1024);
  if (exp === 31) return mantissa ? NaN : sign * Infinity;
  return sign * 2 ** (exp - 15) * (1 + mantissa / 1024);
}
async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function snapshotGameE() {
  return Object.freeze({ elapsedSeconds: state.elapsedSeconds, rate: state.rate,
    reducedMotion: state.reducedMotion, hiddenPaused: document.hidden,
    fixedACC2Active: false, fixedACC2AppliedOnce: false });
}
function writeUniforms(visual, uniformState = state) {
  const outputSrgb = /-srgb$/.test(canvasFormat);
  const values = new Float32Array([
    visual.eTime, visual.authAge, uniformState.near ? 1 : 0, uniformState.flare ? 1 : 0,
    uniformState.monitor ? 1 : 0, uniformState.auth ? 1 : 0, uniformState.rack ? 1 : 0, uniformState.visibility,
    outputSrgb ? 1 : 0, visual.motionScale, uniformState.shiftX, uniformState.shiftY,
    uniformState.centerX, uniformState.centerY, uniformState.pupil, uniformState.exposure
  ]);
  device.queue.writeBuffer(uniformBuffer, 0, values);
  return { values: [...values], outputSrgb, format: canvasFormat };
}
function makeGroup(pipeline, entries) {
  return device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
}
function createTexture(label) {
  return device.createTexture({ label, size: [W, H, 1], format: F16,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC });
}
function beginPass(encoder, label, views, clear = [0, 0, 0, 0]) {
  return encoder.beginRenderPass({ label, colorAttachments: views.map(view => ({ view,
    loadOp: 'clear', storeOp: 'store', clearValue: { r: clear[0], g: clear[1], b: clear[2], a: clear[3] } })) });
}
function addProbeCopies(encoder, target, buffer, offsetPixels = 0) {
  for (let i = 0; i < testPoints.length; i++) encoder.copyTextureToBuffer(
    { texture: target, origin: { x: testPoints[i].x, y: testPoints[i].y, z: 0 } },
    { buffer, offset: (offsetPixels + i) * 256, bytesPerRow: 256, rowsPerImage: 1 },
    { width: 1, height: 1, depthOrArrayLayers: 1 });
}
function addFinalPNGCopy(encoder, texture, buffer, width = W, height = H) {
  const rowBytes = align(width * 4);
  encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow: rowBytes,
    rowsPerImage: height }, { width, height, depthOrArrayLayers: 1 });
  return rowBytes;
}
function stateFlags() {
  return { monitor: state.monitor, auth: state.auth, rack: state.rack,
    reducedMotion: state.reducedMotion,
    visibility: state.visibility, near: state.near, flare: state.flare, exposure: state.exposure,
    sourceShift: [state.shiftX, state.shiftY], observer: [state.centerX, state.centerY],
    pupilRadians: state.pupil, rate: state.rate, elapsedSeconds: state.elapsedSeconds,
    authEvent: state.authEvent ? { ...state.authEvent,
      fixtureOnly: state.authEvent.fixtureOnly === true } : null,
    rimSourceOn: state.rimSourceOn, rimObserverOn: state.rimObserverOn, compareOriginal,
    missingAmbientOn: state.missingAmbientOn, missingConsoleOn: state.missingConsoleOn,
    missingNearbyOn: state.missingNearbyOn };
}
function buildPNG(rgba, width = W, height = H) {
  const rows = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) rows.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  const z = new CompressionStream('deflate');
  const writer = z.writable.getWriter();
  writer.write(rows); writer.close();
  return new Response(z.readable).arrayBuffer().then(async body => {
    const crcTable = buildCrcTable();
    const u32 = value => new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
    const chunk = (name, data) => {
      const tag = new TextEncoder().encode(name), payload = new Uint8Array(tag.length + data.length);
      payload.set(tag); payload.set(data, tag.length);
      return concat([u32(data.length), payload, u32(crc32(payload, crcTable))]);
    };
    const ihdr = new Uint8Array(13); ihdr.set(u32(width), 0); ihdr.set(u32(height), 4);
    ihdr.set([8, 6, 0, 0, 0], 8);
    return new Blob([new Uint8Array([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr),
      chunk('IDAT', new Uint8Array(body)), chunk('IEND', new Uint8Array())], { type: 'image/png' });
  });
}
function concat(parts) { const n = parts.reduce((sum, part) => sum + part.length, 0), out = new Uint8Array(n); let i = 0; for (const part of parts) { out.set(part, i); i += part.length; } return out; }
function buildCrcTable() { const table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } return table; }
function crc32(bytes, table) { let c = 0xffffffff; for (const b of bytes) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
async function postArtifact(name, blobOrBuffer, type) {
  if (!CAPTURE_ENABLED) return { saved: false, skipped: 'capture-query-absent' };
  const url = new URL('/__capture', location.href); url.searchParams.set('name', name);
  const runId = new URLSearchParams(location.search).get('run');
  if (runId && runId !== 'native-01') url.searchParams.set('name', `${runId}-${name}`);
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': type }, body: blobOrBuffer });
  if (!response.ok) {
    const warning = { name, status: response.status, message: await response.text() };
    captureUploadWarnings.push(warning);
    console.warn('native evidence upload unavailable', warning);
    return { saved: false, ...warning };
  }
  return response.json();
}
async function decodeProbes(buffer) {
  await buffer.mapAsync(GPUMapMode.READ);
  const view = new DataView(buffer.getMappedRange());
  const values = {};
  for (let targetIndex = 0; targetIndex < 5; targetIndex++) {
    const name = ['world', 'source', 'received', 'rim', 'final'][targetIndex];
    values[name] = {};
    for (let i = 0; i < testPoints.length; i++) {
      const pixelIndex = targetIndex * testPoints.length + i, byteOffset = pixelIndex * 256;
      const channels = [0, 1, 2, 3].map(c => targetIndex === 4
        ? view.getUint8(byteOffset + c) / 255 : f16(view.getUint16(byteOffset + c * 2, true)));
      if (targetIndex === 4 && /bgra/.test(canvasFormat)) [channels[0], channels[2]] = [channels[2], channels[0]];
      values[name][testPoints[i].id] = channels;
    }
  }
  buffer.unmap(); return values;
}
function renderPass(encoder, pipeline, bindGroup, views, label, width = W, height = H) {
  const pass = beginPass(encoder, label, views);
  pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup);
  pass.setViewport(0, 0, width, height, 0, 1); pass.setScissorRect(0, 0, width, height);
  pass.draw(3, 1, 0, 0); pass.end();
}
function renderPassLoad(encoder, pipeline, bindGroup, view, label, width = W, height = H) {
  const pass = encoder.beginRenderPass({ label, colorAttachments: [{ view, loadOp: 'load', storeOp: 'store' }] });
  pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup);
  pass.setViewport(0, 0, width, height, 0, 1); pass.setScissorRect(0, 0, width, height);
  pass.draw(3, 1, 0, 0); pass.end();
}
async function draw(stateOverride = {}, { capture = false, probes = true, artifactName = null,
  presentation = 'combined', diagnosticCase = false } = {}) {
  assert(apiReady && !lost, 'WebGPU runtime is not ready');
  if (diagnosticQueue.active && !diagnosticCase) return null;
  if (frameBusy) throw new Error('frame is already being encoded');
  frameBusy = true;
  try {
    const capturedState = Object.freeze({ ...stateFlags(), ...stateOverride,
      authEvent: stateOverride.authEvent === undefined ? state.authEvent : stateOverride.authEvent });
    const capturedGameE = Object.freeze({ elapsedSeconds: capturedState.elapsedSeconds,
      rate: capturedState.rate, reducedMotion: Boolean(capturedState.reducedMotion),
      hiddenPaused: document.hidden, fixedACC2Active: false, fixedACC2AppliedOnce: false });
    const visual = planSecurityRoomR05Visual({ elapsedSeconds: capturedGameE.elapsedSeconds,
      rate: capturedGameE.rate, reducedMotion: capturedGameE.reducedMotion, authEvent: capturedState.authEvent });
    let visualReceipts = [], liveIds = new Set(), ages = [-1, -1, -1, -1];
    if (presentation === 'combined') {
      visualReceipts = validateReceipts(objectReceipts, { elapsedSeconds: capturedGameE.elapsedSeconds, causeIds: objectCauseIds });
      liveIds = new Set(visualReceipts.map(r => r.objectId));
      ages = OBJECTS.map(o => visualReceipts.find(r => r.objectId === o.id)?.ageMs ?? -1);
      for (let i = objectReceipts.length - 1; i >= 0; i--) {
        if ((capturedGameE.elapsedSeconds * 1000 - objectReceipts[i].issuedAt) >= 1800) objectReceipts.splice(i, 1);
      }
    }
    const controls = {
      source: capturedState.visibility !== 0,
      receiver: capturedState.near !== false,
      material: capturedState.flare !== false,
      ambient: capturedState.missingAmbientOn !== false,
      observer: capturedState.exposure !== 0,
      [OBJECTS[0].id]: capturedState.monitor !== false,
      [OBJECTS[1].id]: capturedState.missingConsoleOn !== false,
      [OBJECTS[2].id]: capturedState.auth !== false,
      [OBJECTS[3].id]: capturedState.rack !== false
    };
    if (presentation === 'sourceOnly') { controls.receiver = false; controls.observer = false; }
    if (presentation === 'receiverOnly') { controls.material = false; controls.ambient = false; controls.observer = false; }
    if (!objectLayerEnabled || capturedState.compareOriginal) {
      controls.source = controls.receiver = controls.material = controls.ambient = controls.observer = false;
      for (const object of OBJECTS) controls[object.id] = false;
    }
    const frame = buildR2Frame({ clockMs: Math.max(0, capturedGameE.elapsedSeconds * 1000),
      ages, controls, motionScale: visual.motionScale });
    const values = packR2Uniform(frame, { width: W, height: H, offset: [0, 0], scale: 1, exposure: 1 });
    device.queue.writeBuffer(uniformBuffer, 0, values);
    const transferValues = new Float32Array(16); transferValues[8] = /-srgb$/.test(canvasFormat) ? 1 : 0;
    device.queue.writeBuffer(transferUniformBuffer, 0, transferValues);

    const encoder = device.createCommandEncoder({ label: 'server-object-e-r2-frame-' + (frameSerial + 1) });
    renderPass(encoder, pipelines.world, groups.world, [worldTexture.createView(), sourceTexture.createView()], 'r2-world-material-and-source-MRT');
    renderPass(encoder, pipelines.receiver, groups.receiver, [receivedTexture.createView()], 'r2-registered-source-qualified-receiver');
    renderPassLoad(encoder, pipelines.observer, groups.observer, receivedTexture.createView(), 'r2-local-source-observer-additive');
    renderPass(encoder, pipelines.finalLinear, groups.finalLinear, [worldTexture.createView()], 'r2-final-linear-identity-preserving-map');

    const rimValues = new Float32Array([W, H, 0, 0, ages[0], ages[1], ages[2], ages[3],
      capturedState.rimSourceOn ? 1 : 0, capturedState.rimObserverOn ? 1 : 0,
      presentation === 'combined' && objectLayerEnabled && !capturedState.compareOriginal ? 1 : 0, 0]);
    device.queue.writeBuffer(rimUniformBuffer, 0, rimValues);
    const rimPass = encoder.beginRenderPass({ label: 'r08-common-rim-accent-clear-and-draw', colorAttachments: [{
      view: rimTexture.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    if (presentation === 'combined' && !capturedState.compareOriginal && objectLayerEnabled) {
      rimPass.setPipeline(rimPipeline); rimPass.setBindGroup(0, rimBindGroup); rimPass.draw(3);
    }
    rimPass.end();

    const outputTexture = context.getCurrentTexture();
    renderPass(encoder, pipelines.transfer, groups.transfer, [outputTexture.createView()],
      'r2-unchanged-rim-and-original-final-transfer', canvas.width, canvas.height);
    if (presentation === 'combined') {
      const actorValues = new Float32Array([canvas.width, canvas.height, objectActor[0], objectActor[1],
        ages[0], ages[1], ages[2], ages[3], 0, 0, 0, 0,
        0, capturedState.compareOriginal ? 0 : 1, 0, visual.motionScale, 0, 0, 0, 0]);
      device.queue.writeBuffer(objectUniformBuffer, 0, actorValues);
      const actorPass = encoder.beginRenderPass({ label: 'r2-preserved-actor-only-overlay', colorAttachments: [{
        view: outputTexture.createView(), loadOp: 'load', storeOp: 'store' }] });
      actorPass.setPipeline(objectPipeline); actorPass.setBindGroup(0, objectBindGroup);
      actorPass.setViewport(0, 0, canvas.width, canvas.height, 0, 1); actorPass.setScissorRect(0, 0, canvas.width, canvas.height);
      actorPass.draw(3); actorPass.end();
    }
    const probeBuffer = probes ? device.createBuffer({ size: 5 * testPoints.length * 256,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: 'R2 native source/receiver/rim/final probes' }) : null;
    if (probeBuffer) {
      addProbeCopies(encoder, worldTexture, probeBuffer, 0);
      addProbeCopies(encoder, sourceTexture, probeBuffer, testPoints.length);
      addProbeCopies(encoder, receivedTexture, probeBuffer, testPoints.length * 2);
      addProbeCopies(encoder, rimTexture, probeBuffer, testPoints.length * 3);
      for (let i = 0; i < testPoints.length; i++) encoder.copyTextureToBuffer(
        { texture: outputTexture, origin: { x: Math.min(canvas.width - 1, Math.floor(testPoints[i].x * canvas.width / W)),
          y: Math.min(canvas.height - 1, Math.floor(testPoints[i].y * canvas.height / H)), z: 0 } },
        { buffer: probeBuffer, offset: (testPoints.length * 4 + i) * 256,
          bytesPerRow: 256, rowsPerImage: 1 }, { width: 1, height: 1, depthOrArrayLayers: 1 });
    }
    let pngBuffer = null, pngRowBytes = 0;
    if (capture) {
      pngRowBytes = align(canvas.width * 4);
      pngBuffer = device.createBuffer({ size: pngRowBytes * canvas.height,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: 'R2 actual configured canvas PNG' });
      addFinalPNGCopy(encoder, outputTexture, pngBuffer, canvas.width, canvas.height);
    }
    device.queue.submit([encoder.finish()]);
    const submittedFrame = ++frameSerial;
    await device.queue.onSubmittedWorkDone();
    firstGPUFrameSubmitted = true;
    const readbacks = probeBuffer ? await decodeProbes(probeBuffer) : null;
    if (pngBuffer) {
      await pngBuffer.mapAsync(GPUMapMode.READ);
      const padded = new Uint8Array(pngBuffer.getMappedRange());
      const captureWidth = canvas.width, captureHeight = canvas.height, rgba = new Uint8Array(captureWidth * captureHeight * 4), isBgra = /bgra/.test(canvasFormat);
      for (let y = 0; y < captureHeight; y++) for (let x = 0; x < captureWidth; x++) {
        const src = y * pngRowBytes + x * 4, dst = (y * captureWidth + x) * 4;
        if (isBgra) { rgba[dst] = padded[src + 2]; rgba[dst + 1] = padded[src + 1]; rgba[dst + 2] = padded[src]; }
        else { rgba[dst] = padded[src]; rgba[dst + 1] = padded[src + 1]; rgba[dst + 2] = padded[src + 2]; }
        rgba[dst + 3] = padded[src + 3];
      }
      pngBuffer.unmap(); const png = await buildPNG(rgba, captureWidth, captureHeight);
      if (artifactName) await postArtifact(artifactName, png, 'image/png'); pngBuffer.destroy();
    }
    probeBuffer?.destroy();
    const rect = canvas.getBoundingClientRect();
    const r2Snapshot = { version: R2_VERSION, targets: OBJECTS.map(o => o.id),
      pass: compareOriginal ? 'source-identity' : 'r2-material-receiver-observer', clockMs: frame.clockMs,
      agesMs: [...frame.ages], controls: { source: frame.switches[0], receiver: frame.switches[1],
        material: frame.switches[2], ambient: frame.switches[3], observer: frame.switches[4], objects: [...frame.objectOn] },
      sourceBasis: initialPNGHash, intermediate: { format: F16, width: W, height: H,
        sequence: ['world MRT', 'receiver', 'observer additive load', 'finalLinear', 'unchanged common rim clear/draw', 'unchanged final transfer', 'actor-only overlay'] },
      mapSfxGain: 0, frame: frameSerial };
    const result = { submittedFrame, confirmedBy: 'device.queue.onSubmittedWorkDone',
      sourceHash: r2ShaderHash, originalHash: initialPNGHash, uniform: [...values], visual, r2: r2Snapshot,
      receipts: visualReceipts.map(r => ({ objectId: r.objectId, ageMs: r.ageMs })), presentation, state: capturedState,
      captureUploadWarnings: [...captureUploadWarnings], canvas: { width: canvas.width, height: canvas.height,
        cssRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        dpr: devicePixelRatio, textureFormat: canvasFormat, context: 'webgpu' }, targets: readbacks };
    if (artifactName) await postArtifact(artifactName.replace(/.png$/i, '.json'), JSON.stringify(result, null, 2), 'application/json');
    overlay.textContent = 'WebGPU ' + canvasFormat + ' · ' + submittedFrame + ' · R2 private candidate · quality unmet · map SFX 0';
    return result;
  } finally {
    frameBusy = false; for (const resolve of frameIdleWaiters.splice(0)) resolve();
  }
}
async function initialize() {
  assert('gpu' in navigator, 'navigator.gpu is unavailable');
  adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  assert(adapter, 'WebGPU adapter unavailable'); device = await adapter.requestDevice();
  device.lost.then(info => { lost = true; status('GPU device lost: ' + info.reason + ' ' + info.message); });
  device.addEventListener('uncapturederror', event => {
    const error = { type: event.error?.constructor?.name || 'unknown', message: event.error?.message || String(event.error) };
    postArtifact('uncaptured-gpu-error-' + Date.now() + '.json', JSON.stringify(error, null, 2), 'application/json');
    console.error('uncaptured WebGPU error', error);
  });
  const originalResponse = await fetch('./security-room-r01-original.png', { cache: 'no-store' });
  assert(originalResponse.ok, 'original PNG HTTP ' + originalResponse.status);
  const originalBytes = await originalResponse.arrayBuffer(); initialPNGHash = await sha256(originalBytes);
  assert(initialPNGHash === 'b13814c922b644ef1c29929c7604df8e9e5f5980ef32c9fe466335e57d01ea64', 'original artwork hash differs from frozen R09 input');
  const bitmap = await createImageBitmap(new Blob([originalBytes], { type: 'image/png' }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  assert(bitmap.width === W && bitmap.height === H, 'original PNG dimensions are ' + bitmap.width + 'x' + bitmap.height);
  baseTexture = device.createTexture({ label: 'unchanged R09 base PNG', size: [W,H,1], format: 'rgba8unorm-srgb',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT });
  device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: baseTexture, colorSpace: 'srgb', premultipliedAlpha: false }, { width: W, height: H }); bitmap.close();
  canvasFormat = navigator.gpu.getPreferredCanvasFormat(); context = canvas.getContext('webgpu');
  assert(context, 'webgpu canvas context unavailable');
  context.configure({ device, format: canvasFormat, alphaMode: 'opaque', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
  const shaderResponse = await fetch('./shader.wgsl', { cache: 'no-store' }); assert(shaderResponse.ok, 'R2 WGSL HTTP ' + shaderResponse.status);
  const shaderBytes = await shaderResponse.arrayBuffer(); r2ShaderHash = await sha256(shaderBytes);
  wgslHash = r2ShaderHash;
  assert(r2ShaderHash === '1aad3506811e225d62618e754a9dfffea43aca84f022dc999ad155e3cea4d497', 'frozen R2 WGSL hash mismatch');
  const shaderText = new TextDecoder().decode(shaderBytes); device.pushErrorScope('validation');
  const kernels = await createR2Kernels(device, shaderText, F16);
  const r2Errors = kernels.diagnostics.filter(m => m.type === 'error');
  const diagnostics = kernels.diagnostics.map(m => ({ type: m.type, lineNum: m.lineNum, linePos: m.linePos, message: m.message }));
  await postArtifact('r2-gpu-compile-diagnostics.json', JSON.stringify({ shaderHash: r2ShaderHash, diagnostics }, null, 2), 'application/json');
  assert(!r2Errors.length, 'R2 WGSL compilation failed: ' + formatGPUCompilationMessages(r2Errors));
  pipelines = { world: kernels.world, receiver: kernels.receiver, observer: kernels.observer, finalLinear: kernels.finalLinear };
  const transferResponse = await fetch('./security-room-r05-missing.wgsl', { cache: 'no-store' });
  assert(transferResponse.ok, 'unchanged final-transfer WGSL HTTP ' + transferResponse.status);
  const transferBytes = await transferResponse.arrayBuffer(); const transferHash = await sha256(transferBytes);
  assert(transferHash === 'eb77d6de243d2a6af2a7d6cfd739b120fa77f76fb84c244f57cbd35f02577078', 'unchanged final-transfer WGSL hash mismatch');
  const transferModule = device.createShaderModule({ label: 'preserved R09 final transfer only', code: new TextDecoder().decode(transferBytes) });
  const transferDiagnostics = (await transferModule.getCompilationInfo()).messages.filter(x => x.type === 'error');
  assert(!transferDiagnostics.length, 'preserved final-transfer WGSL failed: ' + formatGPUCompilationMessages(transferDiagnostics));
  pipelines.transfer = device.createRenderPipeline({ label: 'R2 unchanged original-transfer entry', layout: 'auto',
    vertex: { module: transferModule, entryPoint: 'fullScreen' },
    fragment: { module: transferModule, entryPoint: 'missingFinalTransfer', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list' } });
  const rimResponse = await fetch('./common-rim.wgsl', { cache: 'no-store' }); assert(rimResponse.ok, 'common-rim WGSL HTTP ' + rimResponse.status);
  const rimBytes = await rimResponse.arrayBuffer(); rimShaderHash = await sha256(rimBytes);
  assert(rimShaderHash === '7db35e6a8c3d18579dff71d19e17958d281c9908c9b88b8ba857cefe2df37951', 'common rim byte pin mismatch');
  const rimModule = device.createShaderModule({ label: 'unchanged shared activation rim', code: new TextDecoder().decode(rimBytes) });
  const rimDiagnostics = (await rimModule.getCompilationInfo()).messages.filter(x => x.type === 'error');
  assert(!rimDiagnostics.length, 'common rim WGSL failed: ' + formatGPUCompilationMessages(rimDiagnostics));
  rimPipeline = device.createRenderPipeline({ label: 'unchanged shared rim accent', layout: 'auto',
    vertex: { module: rimModule, entryPoint: 'rimVertex' }, fragment: { module: rimModule, entryPoint: 'rimFragment', targets: [{ format: F16 }] },
    primitive: { topology: 'triangle-list' } });
  const actorResponse = await fetch('./object-e.wgsl', { cache: 'no-store' }); assert(actorResponse.ok, 'actor overlay WGSL HTTP ' + actorResponse.status);
  const actorBytes = await actorResponse.arrayBuffer(); objectShaderHash = await sha256(actorBytes);
  assert(objectShaderHash === '15975adcfe8ef2e66c371dd496d854be1f96810452361e7a0dfff60482488de5', 'preserved actor overlay shader pin mismatch');
  const actorModule = device.createShaderModule({ label: 'preserved actor-only overlay; old object actions disabled', code: new TextDecoder().decode(actorBytes) });
  const actorDiagnostics = (await actorModule.getCompilationInfo()).messages.filter(x => x.type === 'error');
  assert(!actorDiagnostics.length, 'actor overlay WGSL failed: ' + formatGPUCompilationMessages(actorDiagnostics));
  objectPipeline = device.createRenderPipeline({ label: 'preserved actor-only overlay', layout: 'auto', vertex: { module: actorModule, entryPoint: 'vs' },
    fragment: { module: actorModule, entryPoint: 'fs', targets: [{ format: canvasFormat, blend: {
      color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }] },
    primitive: { topology: 'triangle-list' } });
  const validationError = await device.popErrorScope(); assert(!validationError, 'R2 pipeline validation failed: ' + validationError?.message);
  samplers = device.createSampler({ label: 'unchanged original sampling', magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'nearest' });
  worldTexture = createTexture('R2 world A rgba16float'); sourceTexture = createTexture('R2 same-frame source E rgba16float');
  receivedTexture = createTexture('R2 received B rgba16float'); rimTexture = createTexture('unchanged shared rim rgba16float');
  uniformBuffer = device.createBuffer({ label: 'R2 8 vec4 params 128 bytes', size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  transferUniformBuffer = device.createBuffer({ label: 'unchanged final transfer color-format flags', size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  rimUniformBuffer = device.createBuffer({ label: 'unchanged shared-rim params 48 bytes', size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  objectUniformBuffer = device.createBuffer({ label: 'preserved actor-only overlay params 80 bytes', size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  rimBindGroup = device.createBindGroup({ layout: rimPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: rimUniformBuffer } }] });
  objectBindGroup = device.createBindGroup({ layout: objectPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: objectUniformBuffer } }] });
  groups = {
    world: makeGroup(pipelines.world, [{ binding: 0, resource: { buffer: uniformBuffer } }, { binding: 1, resource: baseTexture.createView() }, { binding: 2, resource: samplers }]),
    receiver: makeGroup(pipelines.receiver, [{ binding: 0, resource: { buffer: uniformBuffer } }, { binding: 3, resource: sourceTexture.createView() }, { binding: 4, resource: worldTexture.createView() }]),
    observer: makeGroup(pipelines.observer, [{ binding: 0, resource: { buffer: uniformBuffer } }, { binding: 2, resource: samplers }, { binding: 3, resource: sourceTexture.createView() }]),
    finalLinear: makeGroup(pipelines.finalLinear, [{ binding: 0, resource: { buffer: uniformBuffer } }, { binding: 1, resource: baseTexture.createView() }, { binding: 2, resource: samplers }, { binding: 4, resource: receivedTexture.createView() }]),
    transfer: makeGroup(pipelines.transfer, [{ binding: 0, resource: { buffer: transferUniformBuffer } }, { binding: 6, resource: rimTexture.createView() }, { binding: 7, resource: worldTexture.createView() }])
  };
  apiReady = true;
  const features = { version: R2_VERSION, status: 'private-candidate-quality-unmet-unadopted', adapter: adapter.info?.description || adapter.info?.vendor || 'WebGPU adapter',
    device: 'requestDevice success', limits: { maxTextureDimension2D: device.limits.maxTextureDimension2D }, canvasFormat,
    originalHash: initialPNGHash, sourceShaderHash: r2ShaderHash, commonRimHash: rimShaderHash, actorOverlayHash: objectShaderHash,
    mapSfxGain: 0, targets: ['world A: rgba16float', 'source E: rgba16float', 'received B: rgba16float', 'common rim: rgba16float'],
    passes: ['world MRT', 'receiver', 'observer additive', 'finalLinear', 'unchanged rim', 'unchanged final transfer', 'actor-only overlay'],
    uniformBytes: 128, unsupportedCanvas2DUsed: false };
  await postArtifact('r2-gpu-initialization.json', JSON.stringify({ shaderDiagnostics: diagnostics, pipelineValidation: { status: 'PASS' }, features }, null, 2), 'application/json');
  state.rate = Number(input.rate.value);
  status('WebGPU ready · ' + canvasFormat + ' · R2 private candidate · quality unmet · map SFX 0');
  await draw({}, { probes: true });
  if (EMBED) await draw({}, { probes: false });
  requestAnimationFrame(tick);
}
async function tick(wallMs) {
  if (state.disposed || lost) return;
  if (document.hidden) state.lastWall = 0;
  else {
    const beforeE = state.elapsedSeconds;
    if (state.lastWall) state.elapsedSeconds += Math.max(0, wallMs - state.lastWall) / 1000 * state.rate;
    state.lastWall = wallMs;
    const deltaE = Math.max(0, state.elapsedSeconds - beforeE);
    if (deltaE > 0 && !compareOriginal) {
      const moved = advanceActor(objectActor, pressedKeys, pointerGoal, deltaE);
      objectActor[0] = moved[0]; objectActor[1] = moved[1];
      checkProximityEntry();
    }
  }
  if (!document.hidden && !diagnosticQueue.active && !frameBusy && apiReady) {
    try { await draw({}, { probes: false, presentation: input.presentation.value }); }
    catch (error) { status(`Frame error: ${error.message}`); }
  }
  requestAnimationFrame(tick);
}
async function handleVisibility() {
  if (!apiReady) return;
  if (document.hidden) { pressedKeys.clear(); pointerGoal = null; }
  state.lastWall = 0;
  if (!frameBusy && !document.hidden) await draw({}, { probes: false, presentation: input.presentation.value });
}
function setRate(value) {
  state.rate = Number(value);
  input.rate.value = String(state.rate);
  state.lastWall = 0;
  if (!frameBusy) draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message));
}
function updateUIState() {
  state.monitor = input.monitor.checked; state.auth = input.auth.checked; state.rack = input.rack.checked;
  state.visibility = input.visibility.checked ? 1 : 0; state.near = input.near.checked; state.flare = input.flare.checked;
  state.exposure = input.exposure.checked ? 1 : 0;
  state.rimSourceOn = input.rimSource.checked; state.rimObserverOn = input.rimObserver.checked;
  state.reducedMotion = input.reducedMotion.checked;
  state.missingAmbientOn = input.missingAmbient.checked;
  state.missingConsoleOn = input.missingConsole.checked;
  if (!frameBusy) draw({}, { probes: true, presentation: input.presentation.value }).catch(error => status(error.message));
}
function setCanvasCssWidth(width) {
  const nextWidth = Number(width), nextHeight = Math.round(nextWidth * H / W);
  canvas.width = nextWidth; canvas.height = nextHeight;
  canvas.style.width = `${nextWidth}px`; canvas.style.height = `${nextHeight}px`;
}
function queueCanvasResize(width, { probes = true } = {}) {
  return diagnosticQueue.run(async () => {
    input.size.value = String(width);
    setCanvasCssWidth(width);
    return draw({}, { probes, presentation: input.presentation.value, diagnosticCase: true });
  });
}
function checkProximityEntry() {
  if (compareOriginal || !apiReady) return null;
  const transition=proximityTransition(previousNearbyObjectId,objectActor), found=transition.nearby;
  previousNearbyObjectId = transition.objectId;
  if (!transition.entered || !found) return null;
  const receipt = createFixtureReceipt({ object: found.o, actor: objectActor, nowESeconds: state.elapsedSeconds });
  if (!receipt) { status(`${found.o.label} · cooldown active; exit and re-enter after it expires`); return null; }
  let commit;
  try { commit=commitPreviewSuccess(receipt,{elapsedSeconds:state.elapsedSeconds,causeIds:objectCauseIds,counter:previewSuccessCount}); }
  catch (error) { status(`Local fixture receipt rejected: ${error.message}`); return null; }
  previewSuccessCount=commit.counter;
  document.querySelector('#previewCount').textContent = `Preview successful uses: ${previewSuccessCount}`;
  objectReceipts.push(receipt);
  status(`${found.o.label} · preview successful use +1 · local counter only`);
  if (!frameBusy) draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message));
  return receipt;
}
function toggleOriginalComparison() {
  if (!compareOriginal) {
    compareSavedRate = state.rate; compareOriginal = true; objectReceipts.length = 0; pressedKeys.clear(); pointerGoal = null;
    previousNearbyObjectId = nearestUsable(objectActor)?.o.id ?? null;
    state.authEvent = null; state.rate = 0; input.rate.value = '0';
    document.querySelector('#compare').textContent = 'Resume R2 object E';
    status('Original comparison · R2 E paused · object receipts and input cleared');
  } else {
    compareOriginal = false; state.rate = compareSavedRate; input.rate.value = String(state.rate); state.lastWall = 0;
    document.querySelector('#compare').textContent = 'Compare original';
    status('R2 object E resumed · old object receipts remain cleared');
  }
  state.lastWall = 0;
  if (!frameBusy) draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message));
}
function pointerPosition(event) {
  const rect = objectCanvas.getBoundingClientRect();
  return [(event.clientX-rect.left)*W/rect.width,(event.clientY-rect.top)*H/rect.height];
}
async function disposeRuntime() {
  if (state.disposed) return { state: 'disposed', reason: 'already disposed' };
  state.disposed = true;
  try { device?.destroy(); } catch {}
  return { state: 'disposed', reason: 'runtime resources released' };
}
async function renderCase(options = {}) {
  const { name = `fixture-${Date.now()}`, state: patch = {}, cssWidth = W,
    capture = true, probes = true, presentation = 'combined' } = options;
  return diagnosticQueue.run(async () => {
    setCanvasCssWidth(cssWidth);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const result = await draw(patch, { capture, probes,
      artifactName: capture ? `${name}.png` : null, presentation, diagnosticCase: true });
    result.caseName = name;
    result.cssWidthRequested = cssWidth;
    return result;
  });
}
async function readNativeDiagnostics() {
  return diagnosticQueue.run(() => draw({}, { probes: true, capture: true,
    artifactName: 'manual-probe.png', presentation: input.presentation.value, diagnosticCase: true }));
}
for (const element of document.querySelectorAll('.controls input,.controls select'))
  element.addEventListener('change', () => element === input.rate ? setRate(input.rate.value) :
    element === input.size ? queueCanvasResize(input.size.value, { probes: true }).catch(error => status(error.message)) : updateUIState());
document.querySelector('#compare').addEventListener('click', toggleOriginalComparison);
document.querySelector('#objectLayer').addEventListener('change', event => { objectLayerEnabled = event.target.checked; if (!frameBusy) draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message)); });
objectCanvas.addEventListener('pointerdown', event => { if (compareOriginal) return; pointerGoal = pointerPosition(event); objectCanvas.setPointerCapture?.(event.pointerId); });
window.addEventListener('keydown', event => {
  if (compareOriginal) return;
  const key=event.key.length===1?event.key.toLowerCase():event.key;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(key)) { pointerGoal=null; pressedKeys.add(key); event.preventDefault(); }
});
window.addEventListener('keyup', event => { const key=event.key.length===1?event.key.toLowerCase():event.key; pressedKeys.delete(key); });
window.addEventListener('blur', () => pressedKeys.clear());
document.querySelector('#full').addEventListener('click', () => { queueCanvasResize(W, { probes: false }).catch(error => status(error.message)); });
document.querySelector('#diagnostics').addEventListener('click', () => readNativeDiagnostics().then(r => status(`Native probes submitted frame ${r.submittedFrame}`)).catch(error => status(error.message)));
document.addEventListener('visibilitychange', () => handleVisibility().catch(error => status(error.message)));
window.addEventListener('pagehide', () => { void disposeRuntime(); }, { once: true });
window.securityR2 = Object.freeze({ renderCase, readNativeDiagnostics,
  sourceHash: () => wgslHash, originalHash: () => initialPNGHash,
  status: () => ({ apiReady, lost, frameSerial, firstGPUFrameSubmitted, verify: VERIFY,
    sourceHash: wgslHash, originalHash: initialPNGHash, state: stateFlags(), visualOnly: true,
    embed: EMBED, objectShaderHash, objectActor: [...objectActor], objectReceipts: objectReceipts.length,
    compareOriginal, previewSuccessCount, rimShaderHash, rimControls: { sourceOn: state.rimSourceOn, observerOn: state.rimObserverOn, diagnosticMode: objectDiagnostic },
    rimProfile: Object.freeze({"durationMs":1800,"coreHalfWidthPx":1.7,"coreFadeEndPx":2.5,"shoulderStartPx":4.3,"shoulderEndPx":5.4,"colorLinearRgb":[0.3,0.72,1],"peakLinearEmission":4.8,"envelopeMs":[0,105,1120,1800],"shoulderGain":0.2,"sweepStartMs":95,"sweepDurationMs":540,"sweepHalfWidth":0.035,"sweepGateMs":[95,125,565,635],"sweepCoreStartPx":2.7,"sweepCoreEndPx":4.9,"sweepColorLinearRgb":[0.55,0.9,1],"sweepGain":0.7,"receiverMaxDistancePx":5,"nearGlowRadiusPx":11,"nearGlowClipPx":12,"nearGlowGain":0.32}) }) });
window.securityR2Rim = Object.freeze({
  rimControls: () => Object.freeze({ sourceOn: state.rimSourceOn, observerOn: state.rimObserverOn, diagnosticMode: objectDiagnostic }),
  setRimControls: ({ sourceOn = state.rimSourceOn, observerOn = state.rimObserverOn } = {}) => {
    if (typeof sourceOn !== 'boolean' || typeof observerOn !== 'boolean') throw new TypeError('rim controls must be boolean');
    state.rimSourceOn = input.rimSource.checked = sourceOn; state.rimObserverOn = input.rimObserver.checked = observerOn;
    if (!frameBusy) draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message));
    return Object.freeze({ sourceOn, observerOn });
  }, rimShaderHash: () => rimShaderHash });
initialize().catch(error => { status(`WebGPU initialization failed: ${error.stack || error}`); console.error(error); });
