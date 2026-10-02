import { planSecurityRoomR05Visual } from './visual-clock.mjs';
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
  reducedMotion: document.querySelector('#reducedMotion')
};
const state = { rate: 1, elapsedSeconds: 0, lastWall: 0, authEvent: null,
  monitor: true, auth: true, rack: true, visibility: 1, near: true, flare: true,
  centerX: 670, centerY: 587, pupil: -0.1745329252, shiftX: 0, shiftY: 0,
  reducedMotion: false, exposure: 1, rimSourceOn: true, rimObserverOn: true, disposed: false };
let adapter, device, context, canvasFormat, baseTexture, worldTexture, sourceTexture, receivedTexture, observationTexture, zeroTexture, rimTexture, samplers, pipelines, groups;
let rimPipeline, rimBindGroup, rimUniformBuffer, rimShaderHash = null;
let uniformBuffer, lost = false, firstGPUFrameSubmitted = false;
let objectPipeline, objectBindGroup, objectUniformBuffer, objectShaderHash;
const objectActor = [670, 680], objectReceipts = [], pressedKeys = new Set();
const objectCauseIds = new Set();
let previewSuccessCount = 0;
let pointerGoal = null, previousNearbyObjectId = null, compareOriginal = false, compareSavedRate = 1, objectDiagnostic = 0, objectLayerEnabled = true, objectShift = [0,0];
const objectCanvas = canvas;
let frameSerial = 0, frameBusy = false, matrixRunning = false;
const frameIdleWaiters = [];
let embedFixtureCycle = 0, nextEmbedFixtureAt = Infinity;
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
    rimSourceOn: state.rimSourceOn, rimObserverOn: state.rimObserverOn };
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
    const name = ['world', 'source', 'received', 'observation', 'final'][targetIndex];
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
    const uniformState = {
      ...capturedState, near: capturedState.near !== false, flare: capturedState.flare !== false,
      monitor: capturedState.monitor !== false, auth: capturedState.auth !== false,
      rack: capturedState.rack !== false, visibility: capturedState.visibility ?? 1,
      exposure: capturedState.exposure ?? 1,
      shiftX: capturedState.sourceShift?.[0] ?? 0, shiftY: capturedState.sourceShift?.[1] ?? 0,
      centerX: capturedState.observer?.[0] ?? 670, centerY: capturedState.observer?.[1] ?? 587,
      pupil: capturedState.pupilRadians ?? -0.1745329252
    };
    const uniform = writeUniforms(visual, uniformState);
    let visualReceipts = [], liveIds = new Set(), ages = [-1, -1, -1, -1];
  if (objectPipeline && presentation === 'combined') {
    visualReceipts = validateReceipts(objectReceipts, { elapsedSeconds: capturedGameE.elapsedSeconds, causeIds: objectCauseIds });
    liveIds = new Set(visualReceipts.map(r => r.objectId));
    ages = OBJECTS.map(o => visualReceipts.find(r => r.objectId === o.id)?.ageMs ?? -1);
    for (let i = objectReceipts.length - 1; i >= 0; i--) {
      if ((capturedGameE.elapsedSeconds * 1000 - objectReceipts[i].issuedAt) >= 1800) objectReceipts.splice(i, 1);
    }
  }
  const encoder = device.createCommandEncoder({ label: `security-r08-frame-${frameSerial + 1}` });
    renderPass(encoder, pipelines.source, groups.source,
      [worldTexture.createView(), sourceTexture.createView()], 'r05-sourceWorld');
    renderPass(encoder, pipelines.receive, groups.receive, [receivedTexture.createView()], 'r05-worldReceive-received-only');
    renderPass(encoder, pipelines.observation, groups.observation, [observationTexture.createView()], 'r05-observationOnly-HDR');
    const outputTexture = context.getCurrentTexture();
    const finalGroup = compareOriginal ? groups.finalOriginal : presentation === 'sourceOnly' ? groups.finalSourceOnly :
      presentation === 'receiverOnly' ? groups.finalReceiverOnly : groups.final;
    const rimValues = new Float32Array([W, H, objectShift[0], objectShift[1],
      ages[0], ages[1], ages[2], ages[3], capturedState.rimSourceOn ? 1 : 0, capturedState.rimObserverOn ? 1 : 0,
      objectLayerEnabled && !compareOriginal ? 1 : 0, objectDiagnostic]);
    device.queue.writeBuffer(rimUniformBuffer, 0, rimValues);
    const rimPass = encoder.beginRenderPass({ label: 'r08-common-rim-accent-clear-and-draw', colorAttachments: [{
      view: rimTexture.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    if (presentation === 'combined' && !compareOriginal && objectLayerEnabled) {
      rimPass.setPipeline(rimPipeline); rimPass.setBindGroup(0, rimBindGroup); rimPass.draw(3);
    }
    rimPass.end();
    renderPass(encoder, pipelines.final, finalGroup, [outputTexture.createView()], `r08-finalObserve-${presentation}`, canvas.width, canvas.height);
    if (objectPipeline && presentation === 'combined') {
      const values = new Float32Array([canvas.width, canvas.height, objectActor[0], objectActor[1],
        ages[0], ages[1], ages[2], ages[3], 1, 1, 1, 1,
        objectLayerEnabled && !compareOriginal ? 1 : 0, compareOriginal ? 0 : 1,
        objectDiagnostic, visual.motionScale, objectShift[0], objectShift[1], 0, 0]);
      device.queue.writeBuffer(objectUniformBuffer, 0, values);
      const pass = encoder.beginRenderPass({ label: 'r06-gallery-object-E-overlay', colorAttachments: [{
        view: outputTexture.createView(), loadOp: 'load', storeOp: 'store' }] });
      pass.setPipeline(objectPipeline); pass.setBindGroup(0, objectBindGroup); pass.draw(3); pass.end();
      void liveIds;
    }
    const probeBuffer = probes ? device.createBuffer({ size: 5 * testPoints.length * 256,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: 'r05 native HDR and final probes' }) : null;
    if (probeBuffer) {
      addProbeCopies(encoder, worldTexture, probeBuffer, 0);
      addProbeCopies(encoder, sourceTexture, probeBuffer, testPoints.length);
      addProbeCopies(encoder, receivedTexture, probeBuffer, testPoints.length * 2);
      addProbeCopies(encoder, observationTexture, probeBuffer, testPoints.length * 3);
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
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: 'r05 actual configured canvas surface PNG' });
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
      const captureWidth = canvas.width, captureHeight = canvas.height;
      const rgba = new Uint8Array(captureWidth * captureHeight * 4), isBgra = /bgra/.test(uniform.format);
      for (let y = 0; y < captureHeight; y++) for (let x = 0; x < captureWidth; x++) {
        const src = y * pngRowBytes + x * 4, dst = (y * captureWidth + x) * 4;
        if (isBgra) { rgba[dst] = padded[src + 2]; rgba[dst + 1] = padded[src + 1]; rgba[dst + 2] = padded[src]; }
        else { rgba[dst] = padded[src]; rgba[dst + 1] = padded[src + 1]; rgba[dst + 2] = padded[src + 2]; }
        rgba[dst + 3] = padded[src + 3];
      }
      pngBuffer.unmap();
      const png = await buildPNG(rgba, captureWidth, captureHeight);
      if (artifactName) await postArtifact(artifactName, png, 'image/png');
      pngBuffer.destroy();
    }
    probeBuffer?.destroy();
    const rect = canvas.getBoundingClientRect();
    const result = { submittedFrame, confirmedBy: 'device.queue.onSubmittedWorkDone',
      sourceHash: wgslHash, originalHash: initialPNGHash, uniform, visual,
       presentation, state: capturedState, captureUploadWarnings: [...captureUploadWarnings], canvas: { width: canvas.width, height: canvas.height,
        cssRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        dpr: devicePixelRatio, textureFormat: uniform.format, context: 'webgpu' },
      targets: readbacks };
    if (artifactName) await postArtifact(artifactName.replace(/\.png$/i, '.json'),
      JSON.stringify(result, null, 2), 'application/json');
    overlay.textContent = `WebGPU ${uniform.format} · ${submittedFrame} · fixture only · visual E clock`;
    return result;
  } finally {
    frameBusy = false;
    for (const resolve of frameIdleWaiters.splice(0)) resolve();
  }
}
async function initialize() {
  assert('gpu' in navigator, 'navigator.gpu is unavailable');
  adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  assert(adapter, 'WebGPU adapter unavailable');
  device = await adapter.requestDevice();
  device.lost.then(info => { lost = true; status(`GPU device lost: ${info.reason} ${info.message}`); });
  device.addEventListener('uncapturederror', event => {
    const error = { type: event.error?.constructor?.name || 'unknown', message: event.error?.message || String(event.error) };
    postArtifact(`uncaptured-gpu-error-${Date.now()}.json`, JSON.stringify(error, null, 2), 'application/json');
    console.error('uncaptured WebGPU error', error);
  });
  const originalResponse = await fetch('./security-room-r01-original.png', { cache: 'no-store' });
  assert(originalResponse.ok, `original PNG HTTP ${originalResponse.status}`);
  const originalBytes = await originalResponse.arrayBuffer();
  initialPNGHash = await sha256(originalBytes);
  assert(initialPNGHash === 'b13814c922b644ef1c29929c7604df8e9e5f5980ef32c9fe466335e57d01ea64', 'original artwork hash differs from frozen input');
  const originalBlob = new Blob([originalBytes], { type: 'image/png' });
  const bitmap = await createImageBitmap(originalBlob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  assert(bitmap.width === W && bitmap.height === H, `original PNG dimensions are ${bitmap.width}x${bitmap.height}`);
  baseTexture = device.createTexture({ label: 'unchanged r01 base PNG', size: [W, H, 1],
    format: 'rgba8unorm-srgb', usage: GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT });
  device.queue.copyExternalImageToTexture({ source: bitmap },
    { texture: baseTexture, colorSpace: 'srgb', premultipliedAlpha: false }, { width: W, height: H });
  bitmap.close();
  const baseProbe = device.createBuffer({ size: 256, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    label: 'diagnostic source PNG upload raw pixel' });
  const baseProbeEncoder = device.createCommandEncoder({ label: 'diagnose original texture upload' });
  baseProbeEncoder.copyTextureToBuffer({ texture: baseTexture, origin: { x: 670, y: 587, z: 0 } },
    { buffer: baseProbe, bytesPerRow: 256, rowsPerImage: 1 }, { width: 1, height: 1, depthOrArrayLayers: 1 });
  device.queue.submit([baseProbeEncoder.finish()]); await device.queue.onSubmittedWorkDone();
  await baseProbe.mapAsync(GPUMapMode.READ);
  const uploadedCenterPixel = [...new Uint8Array(baseProbe.getMappedRange().slice(0, 4))];
  baseProbe.unmap(); baseProbe.destroy();
  const response = await fetch('./security-room-r05.wgsl', { cache: 'no-store' });
  assert(response.ok, `WGSL HTTP ${response.status}`);
  const wgslBytes = await response.arrayBuffer(); wgslHash = await sha256(wgslBytes);
  assert(wgslHash === '98d595984858055dd7a3cd40e2e72eda14545c92d816b2236c9765bd0c34b4f6', 'R8 artist adapter WGSL hash mismatch');
  const module = device.createShaderModule({ label: 'R8 finalObserve adapter over frozen R05 environment WGSL', code: new TextDecoder().decode(wgslBytes) });
  const rimResponse = await fetch('./common-rim.wgsl', { cache: 'no-store' });
  assert(rimResponse.ok, `common rim WGSL HTTP ${rimResponse.status}`);
  const rimBytes = await rimResponse.arrayBuffer(); rimShaderHash = await sha256(rimBytes);
  assert(rimShaderHash === '7db35e6a8c3d18579dff71d19e17958d281c9908c9b88b8ba857cefe2df37951', 'R8 common rim WGSL hash mismatch');
  const rimModule = device.createShaderModule({ label: 'R8 common activation-rim accent', code: new TextDecoder().decode(rimBytes) });
  const rimDiagnostics = (await rimModule.getCompilationInfo()).messages.filter(x => x.type === 'error');
  assert(!rimDiagnostics.length, `R8 rim WGSL compile failed: ${formatGPUCompilationMessages(rimDiagnostics)}`);
  const info = await module.getCompilationInfo();
  const diagnostics = info.messages.map(message => ({ type: message.type, lineNum: message.lineNum,
    linePos: message.linePos, message: message.message }));
  await postArtifact('gpu-compile-diagnostics.json', JSON.stringify({ wgslHash, diagnostics }, null, 2), 'application/json');
  const errors = diagnostics.filter(item => item.type === 'error');
  assert(!errors.length, `WGSL compile failed: ${formatGPUCompilationMessages(errors)}`);
  device.pushErrorScope('validation');
  pipelines = {
    source: device.createRenderPipeline({ label: 'r05 sourceWorld MRT pipeline', layout: 'auto',
      vertex: { module, entryPoint: 'fullScreen' },
      fragment: { module, entryPoint: 'sourceWorld', targets: [{ format: F16 }, { format: F16 }] },
      primitive: { topology: 'triangle-list' } }),
    receive: device.createRenderPipeline({ label: 'r05 worldReceive received-only rgba16float pipeline', layout: 'auto',
      vertex: { module, entryPoint: 'fullScreen' },
      fragment: { module, entryPoint: 'worldReceive', targets: [{ format: F16 }] },
      primitive: { topology: 'triangle-list' } }),
    observation: device.createRenderPipeline({ label: 'r05 observationOnly source-bound HDR pipeline', layout: 'auto',
      vertex: { module, entryPoint: 'fullScreen' },
      fragment: { module, entryPoint: 'observationOnly', targets: [{ format: F16 }] },
      primitive: { topology: 'triangle-list' } }),
    final: device.createRenderPipeline({ label: 'r08 finalObserve with linear rim accent binding 6', layout: 'auto',
      vertex: { module, entryPoint: 'fullScreen' },
      fragment: { module, entryPoint: 'finalObserve', targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] },
      primitive: { topology: 'triangle-list' } })
  };
  rimPipeline = device.createRenderPipeline({ label: 'r08 common rim linear rgba16float accent pipeline', layout: 'auto',
    vertex: { module: rimModule, entryPoint: 'rimVertex' },
    fragment: { module: rimModule, entryPoint: 'rimFragment', targets: [{ format: F16 }] },
    primitive: { topology: 'triangle-list' } });
  const pipelineValidationError = await device.popErrorScope();
  assert(!pipelineValidationError, `pipeline validation failed: ${pipelineValidationError?.message || 'unknown validation error'}`);
  canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context = canvas.getContext('webgpu');
  assert(context, 'webgpu canvas context unavailable');
  context.configure({ device, format: canvasFormat, alphaMode: 'opaque',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
  samplers = device.createSampler({ label: 'artist linear bitmap sampler', magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'nearest' });
  worldTexture = createTexture('r05 sourceWorld RGBA16float world');
  sourceTexture = createTexture('r05 sourceWorld RGBA16float source');
  receivedTexture = createTexture('r05 worldReceive received-only RGBA16float alpha-zero');
  observationTexture = createTexture('r05 observationOnly source-bound HDR RGBA16float alpha-zero');
  zeroTexture = createTexture('r05 source-isolation zero RGBA16float');
  rimTexture = createTexture('r08 common-rim linear RGBA16float accent');
  const zeroEncoder = device.createCommandEncoder({ label: 'r05 initialize-zero-isolation-target' });
  const zeroPass = zeroEncoder.beginRenderPass({ colorAttachments: [{ view: zeroTexture.createView(),
    loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
  zeroPass.end(); device.queue.submit([zeroEncoder.finish()]); await device.queue.onSubmittedWorkDone();
  uniformBuffer = device.createBuffer({ label: 'r05 state 16 floats 64 bytes', size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  rimUniformBuffer = device.createBuffer({ label: 'r08 rim params 12 floats 48 bytes', size: 48,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  rimBindGroup = device.createBindGroup({ layout: rimPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: rimUniformBuffer } }] });
  groups = {
    source: makeGroup(pipelines.source, [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: baseTexture.createView() },
      { binding: 2, resource: samplers }]),
    receive: makeGroup(pipelines.receive, [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 4, resource: sourceTexture.createView() }]),
    observation: makeGroup(pipelines.observation, [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 2, resource: samplers },
      { binding: 4, resource: sourceTexture.createView() }]),
    final: null, finalSourceOnly: null, finalReceiverOnly: null
  };
  // r05 binding 5 is received-only RGBA16float; it must never be an old lit-world target.
  const finalEntries = (sourceView, receiveView, rimView) => [
    { binding: 0, resource: { buffer: uniformBuffer } },
    { binding: 1, resource: baseTexture.createView() },
    { binding: 2, resource: samplers },
    { binding: 4, resource: sourceView },
    { binding: 5, resource: receiveView },
    { binding: 6, resource: rimView }];
  groups.final = makeGroup(pipelines.final, finalEntries(sourceTexture.createView(), receivedTexture.createView(), rimTexture.createView()));
  groups.finalSourceOnly = makeGroup(pipelines.final, finalEntries(sourceTexture.createView(), zeroTexture.createView(), zeroTexture.createView()));
  groups.finalReceiverOnly = makeGroup(pipelines.final, finalEntries(zeroTexture.createView(), receivedTexture.createView(), zeroTexture.createView()));
  groups.finalOriginal = makeGroup(pipelines.final, finalEntries(zeroTexture.createView(), zeroTexture.createView(), zeroTexture.createView()));
  const objectResponse = await fetch('./object-e.wgsl', { cache: 'no-store' });
  assert(objectResponse.ok, `object E WGSL HTTP ${objectResponse.status}`);
  const objectBytes = await objectResponse.arrayBuffer(); objectShaderHash = await sha256(objectBytes);
  assert(objectShaderHash === '15975adcfe8ef2e66c371dd496d854be1f96810452361e7a0dfff60482488de5', 'R8 object action shader hash mismatch');
  const objectModule = device.createShaderModule({ label: 'R8 preserved material-action overlay without obsolete final rim', code: new TextDecoder().decode(objectBytes) });
  const objectDiagnostics = (await objectModule.getCompilationInfo()).messages.filter(x => x.type === 'error');
  assert(!objectDiagnostics.length, `r06 WGSL compile failed: ${formatGPUCompilationMessages(objectDiagnostics)}`);
  device.pushErrorScope('validation');
  objectPipeline = device.createRenderPipeline({ label: 'r06 WebGPU object E alpha overlay', layout: 'auto',
    vertex: { module: objectModule, entryPoint: 'vs' }, fragment: { module: objectModule, entryPoint: 'fs', targets: [{ format: canvasFormat, blend: {
      color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }] },
    primitive: { topology: 'triangle-list' } });
  const objectPipelineError = await device.popErrorScope(); assert(!objectPipelineError, `object E pipeline validation failed: ${objectPipelineError?.message}`);
  objectUniformBuffer = device.createBuffer({ label: 'r06 object fixture uniforms', size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  objectBindGroup = device.createBindGroup({ layout: objectPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: objectUniformBuffer } }] });
  apiReady = true;
  const features = { adapter: adapter.info?.description || adapter.info?.vendor || 'WebGPU adapter',
    device: 'requestDevice success', limits: { maxTextureDimension2D: device.limits.maxTextureDimension2D },
    canvasFormat, rgba16floatAttachment: true, requiredFeatures: [...device.features],
    textureFormatFeatureQuery: F16, formatCapabilities: adapter.getFormatFeatures?.(F16) || null,
    unsupportedCanvas2DUsed: false, hdrPipeline: ['sourceWorld:rgba16float×2', 'worldReceive:rgba16float', 'rimAccent:rgba16float-pre-final', `finalObserve:${canvasFormat}`] };
  await postArtifact('gpu-initialization.json', JSON.stringify({ wgslHash, originalHash: initialPNGHash, uploadedCenterPixel,
    shaderDiagnostics: diagnostics, pipelineValidation: { status: 'PASS', error: null },
    bindGroupValidation: { status: 'PASS', error: null }, features,
          sourceGroups: 3, sourceFaces: 19, monitorSourceFaces: 6, compactSourceFaces: 13, receiverPlanes: 4, occupancySilhouettes: 10,
      targetContract: { sourceWorld: ['world:rgba16float','source:rgba16float'],
        worldReceive: 'received-only:rgba16float:alpha=0', observationOnly: 'source-bound HDR rgba16float',
        rimAccent: { format: F16, size: [W,H], clearBeforeFinalObserve: true, finalBinding: 6 },
        finalObserve: canvasFormat, passes: ['sourceWorld','worldReceive','observationOnly','rimAccent','finalObserve'],
        draw: {vertexCount: 3, instanceCount: 1}, uniformBytes: 64 }, canvas: { width: W, height: H,
      cssWidth: canvas.getBoundingClientRect().width, cssHeight: canvas.getBoundingClientRect().height,
      dpr: devicePixelRatio, context: 'webgpu' } }, null, 2), 'application/json');
  state.rate = Number(input.rate.value);
  status(`WebGPU ready · ${canvasFormat} · R8 finalObserve adapter and common rim compiled; sourceHash=${wgslHash.slice(0, 12)} · visual-only E`);
  await draw({}, { probes: true });
  if (EMBED) {
    issueEmbedFixture();
    await draw({}, { probes: false });
  }
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
    if (EMBED && !compareOriginal && state.elapsedSeconds >= nextEmbedFixtureAt) issueEmbedFixture();
  }
  if (!document.hidden && !matrixRunning && !diagnosticQueue.active && !frameBusy && apiReady) {
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
  const [cx, cy, pupil] = input.observer.value.split(',').map(Number);
  const [sx, sy] = input.shift.value.split(',').map(Number);
  Object.assign(state, { centerX: cx, centerY: cy, pupil, shiftX: sx, shiftY: sy });
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
function fixtureAuth() {
  state.authEvent = makeFixtureReceipt(`manual-${crypto.randomUUID()}`);
  state.auth = true; input.auth.checked = true;
  status(`Synthetic fixture receipt ${state.authEvent.id}; not a game receipt`);
  if (!frameBusy) draw({}, { probes: true, presentation: input.presentation.value }).catch(error => status(error.message));
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
    document.querySelector('#compare').textContent = 'Resume same r05 environment E';
    status('Original comparison · environment E paused · object receipts and input cleared');
  } else {
    compareOriginal = false; state.rate = compareSavedRate; input.rate.value = String(state.rate); state.lastWall = 0;
    document.querySelector('#compare').textContent = 'Compare original';
    status('r05 environment E resumed · old object receipts remain cleared');
  }
  state.lastWall = 0;
  if (!frameBusy) draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message));
}
function pointerPosition(event) {
  const rect = objectCanvas.getBoundingClientRect();
  return [(event.clientX-rect.left)*W/rect.width,(event.clientY-rect.top)*H/rect.height];
}
function makeFixtureReceipt(id) {
  return Object.freeze({ id: `fixture-auth-r05-${id}`, atESeconds: state.elapsedSeconds,
    fixtureOnly: true });
}
function issueEmbedFixture() {
  if (!EMBED || !apiReady || state.disposed || lost) return null;
  embedFixtureCycle++;
  state.authEvent = makeFixtureReceipt(`cycle-${embedFixtureCycle}`);
  state.auth = true; input.auth.checked = true;
  nextEmbedFixtureAt = state.elapsedSeconds + 5;
  return state.authEvent;
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
async function runStaticMatrix() {
  while (frameBusy) await new Promise(resolve => setTimeout(resolve, 0));
  matrixRunning = true;
  try {
  const rows = [], baseline = { monitor: true, auth: true, rack: true, visibility: 1, exposure: 1,
    near: true, flare: true, sourceShift: [0, 0], observer: [670, 587], pupilRadians: -0.1745329252,
    rate: 1, elapsedSeconds: 4, authEvent: null };
  const authPeak = .08;
  const run = async (name, patch = {}, cssWidth = W, age = 0, id = name, presentation = 'combined') => {
    const event = age === null ? null : Object.freeze({ id: `fixture-${id}`, atESeconds: 4 - age, fixtureOnly: true });
    const result = await renderCase({ name, cssWidth, state: { ...baseline, ...patch,
      elapsedSeconds: 4, rate: patch.rate ?? 1, authEvent: event }, capture: true, probes: true, presentation });
    rows.push({ name, cssWidth, age, presentation, targets: result.targets, uniform: result.uniform,
      visual: result.visual, canvas: result.canvas, file: `${name}.png` });
  };
  await run('all-flags-off-exposure-zero-full', { monitor: false, auth: false, rack: false,
    visibility: 0, exposure: 0, near: false, flare: false }, W, null);
  await run('source-only-auth-peak', { near: false, flare: false }, W, authPeak, 'sourceonly', 'sourceOnly');
  await run('receiver-only-auth-peak', { near: false, flare: false }, W, authPeak, 'receiveronly', 'receiverOnly');
  await run('combined-auth-peak', {}, W, authPeak, 'combinedpeak');
  await run('all-flags-off-auth-peak', { monitor: false, auth: false, rack: false,
    visibility: 0, exposure: 1, near: false, flare: false }, W, authPeak, 'alloffpeak');
  await run('exposure-off-independent', { exposure: 0 }, W, authPeak, 'exposureoff');
  await run('near-only-observation-hdr', { near: true, flare: false, monitor: true, auth: true, rack: true }, W, authPeak, 'nearonly');
  await run('flare-on-near-off-combined-probe', { near: false, flare: true, monitor: true, auth: true, rack: true }, W, authPeak, 'flareonly');
  await run('combined-idle-full', {}, W, null);
  await run('combined-idle-half', {}, W / 2, null);
  for (const age of [0, .04, .08, .15, .35, .75, 1.249, 1.25, 2]) {
    const label = `auth-${String(age).replace('.', 'p')}`;
    await run(`${label}-full`, {}, W, age, label);
    await run(`${label}-half`, {}, W / 2, age, label);
  }
  for (const group of ['monitor', 'auth', 'rack'])
    await run(`source-off-${group}`, { [group]: false }, W, authPeak, `off-${group}`);
  await run('all-sources-off-visibility-zero', { monitor: false, auth: false,
    rack: false, visibility: 0 }, W, authPeak, 'alloff');
  await run('near-off', { near: false }, W, authPeak, 'nearoff');
  await run('flare-off', { flare: false }, W, authPeak, 'flareoff');
  await run('near-and-flare-off', { near: false, flare: false }, W, authPeak, 'bothoptics');
  await run('near-and-flare-off-half', { near: false, flare: false }, W / 2, authPeak, 'bothopticshalf');
  await run('source-shift-plus24-minus12', { sourceShift: [24, -12] }, W, authPeak, 'shift');
  await run('partial-clip-source-shift', { sourceShift: [24, -12], monitor: true }, W, null, 'partialclip');
  await run('observer-center-600-530', { observer: [600, 530] }, W, authPeak, 'observer600');
  await run('observer-center-760-640', { observer: [760, 640] }, W, authPeak, 'observer760');
  await run('pupil-angle-zero', { pupilRadians: 0 }, W, authPeak, 'pupil0');
  await run('pupil-angle-pi-over-six', { pupilRadians: Math.PI / 6 }, W, authPeak, 'pupil30');
  await run('reduced-motion', { reducedMotion: true }, W, authPeak, 'reduced');
  await run('rate-zero-silent', { rate: 0 }, W, authPeak, 'ratezero');
  await run('rate-two', { rate: 2 }, W, authPeak, 'ratetwo');
  await run('restored-combined-after-off-full', { ...baseline, authEvent: null }, W, null, 'restored');
  const matrix = { schema: 'security-room-r05-native-static-matrix/v1', fixtureOnly: true,
    sourceHash: wgslHash, originalHash: initialPNGHash,
    noPerformanceMeasurement: true, captureUploadWarnings: [...captureUploadWarnings], cases: rows };
  await postArtifact('native-static-matrix.json', JSON.stringify(matrix, null, 2), 'application/json');
  return matrix;
  } finally { matrixRunning = false; }
}

for (const element of document.querySelectorAll('.controls input,.controls select'))
  element.addEventListener('change', () => element === input.rate ? setRate(input.rate.value) :
    element === input.size ? queueCanvasResize(input.size.value, { probes: true }).catch(error => status(error.message)) : updateUIState());
document.querySelector('#auth').addEventListener('click', fixtureAuth);
document.querySelector('#compare').addEventListener('click', toggleOriginalComparison);
document.querySelector('#objectLayer').addEventListener('change', event => { objectLayerEnabled = event.target.checked; if (!frameBusy) draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message)); });
document.querySelector('#objectDiagnostic').addEventListener('change', event => { objectDiagnostic = Number(event.target.value); if (!frameBusy) draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message)); });
document.querySelector('#objectShift').addEventListener('change', event => { objectShift=event.target.value.split(',').map(Number); if (!frameBusy) draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message)); });
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
document.querySelector('#matrix').addEventListener('click', async event => { const button = event.currentTarget; button.disabled = true; try { const m = await runStaticMatrix(); status(`Static matrix saved: ${m.cases.length} fixture states; not cadence/performance proof.`); } catch (error) { status(`Matrix stopped: ${error.stack || error}`); } finally { button.disabled = false; } });
document.addEventListener('visibilitychange', () => handleVisibility().catch(error => status(error.message)));
window.addEventListener('pagehide', () => { void disposeRuntime(); }, { once: true });
window.securityR05 = Object.freeze({ renderCase, readNativeDiagnostics, runStaticMatrix,
  sourceHash: () => wgslHash, originalHash: () => initialPNGHash,
  status: () => ({ apiReady, lost, frameSerial, firstGPUFrameSubmitted, verify: VERIFY,
    sourceHash: wgslHash, originalHash: initialPNGHash, state: stateFlags(), visualOnly: true,
    embed: EMBED, embedFixtureCycle, objectShaderHash, objectActor: [...objectActor], objectReceipts: objectReceipts.length,
    compareOriginal, previewSuccessCount, rimShaderHash, rimControls: { sourceOn: state.rimSourceOn, observerOn: state.rimObserverOn, diagnosticMode: objectDiagnostic },
    rimProfile: Object.freeze({"durationMs":1800,"coreHalfWidthPx":1.7,"coreFadeEndPx":2.5,"shoulderStartPx":4.3,"shoulderEndPx":5.4,"colorLinearRgb":[0.3,0.72,1],"peakLinearEmission":4.8,"envelopeMs":[0,105,1120,1800],"shoulderGain":0.2,"sweepStartMs":95,"sweepDurationMs":540,"sweepHalfWidth":0.035,"sweepGateMs":[95,125,565,635],"sweepCoreStartPx":2.7,"sweepCoreEndPx":4.9,"sweepColorLinearRgb":[0.55,0.9,1],"sweepGain":0.7,"receiverMaxDistancePx":5,"nearGlowRadiusPx":11,"nearGlowClipPx":12,"nearGlowGain":0.32}) }) });
window.securityR08 = Object.freeze({
  rimControls: () => Object.freeze({ sourceOn: state.rimSourceOn, observerOn: state.rimObserverOn, diagnosticMode: objectDiagnostic }),
  setRimControls: ({ sourceOn = state.rimSourceOn, observerOn = state.rimObserverOn } = {}) => {
    if (typeof sourceOn !== 'boolean' || typeof observerOn !== 'boolean') throw new TypeError('rim controls must be boolean');
    state.rimSourceOn = input.rimSource.checked = sourceOn; state.rimObserverOn = input.rimObserver.checked = observerOn;
    if (!frameBusy) draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message));
    return Object.freeze({ sourceOn, observerOn });
  }, rimShaderHash: () => rimShaderHash });
initialize().catch(error => { status(`WebGPU initialization failed: ${error.stack || error}`); console.error(error); });
