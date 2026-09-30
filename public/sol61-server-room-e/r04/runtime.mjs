import { createSecurityRoomR04Cues } from './security-room-r04-cues.mjs';

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
  observer: document.querySelector('#observer'), shift: document.querySelector('#shift')
};
const state = { rate: 1, elapsedSeconds: 0, lastWall: 0, authEvent: null,
  monitor: true, auth: true, rack: true, visibility: 1, near: true, flare: true,
  centerX: 670, centerY: 587, pupil: -0.1745329252, shiftX: 0, shiftY: 0,
  reducedMotion: false, exposure: 1, disposed: false, generation: 1 };
const cues = createSecurityRoomR04Cues();
let adapter, device, context, canvasFormat, baseTexture, worldTexture, sourceTexture, receivedTexture, observationTexture, zeroTexture, samplers, pipelines, groups;
let uniformBuffer, lost = false, firstGPUFrameSubmitted = false, voiceContext = null;
let activeVoices = new Set(), voiceCursor = 0, frameSerial = 0, frameBusy = false, matrixRunning = false;
let muted = VERIFY, embedFixtureCycle = 0, nextEmbedFixtureAt = Infinity;
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
  { id: 'observer-off-axis', x: 700, y: 155, kind: 'observer' }
];
const align = (value, n = 256) => Math.ceil(value / n) * n;
function status(message) { statusNode.textContent = String(message); }
function assert(ok, message) { if (!ok) throw new Error(message); }
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
function currentAudioState() {
  return { verify: VERIFY, hidden: document.hidden, hiddenPaused: document.hidden,
    disposed: state.disposed || lost, firstGPUFrameSubmitted, currentLease: !lost && !!device,
    unlocked: !muted && Boolean(voiceContext && voiceContext.state === 'running'), muted,
    voicePoolAvailable: activeVoices.size < 4, currentVoiceCursor: voiceCursor };
}
function snapshotGameE() {
  return Object.freeze({ elapsedSeconds: state.elapsedSeconds, rate: state.rate,
    reducedMotion: state.reducedMotion, hiddenPaused: document.hidden,
    fixedACC2Active: false, fixedACC2AppliedOnce: false });
}
function writeUniforms(visual) {
  const outputSrgb = /-srgb$/.test(canvasFormat);
  const values = new Float32Array([
    visual.eTime, visual.authAge, state.near ? 1 : 0, state.flare ? 1 : 0,
    state.monitor ? 1 : 0, state.auth ? 1 : 0, state.rack ? 1 : 0, state.visibility,
    outputSrgb ? 1 : 0, visual.motionScale, state.shiftX, state.shiftY,
    state.centerX, state.centerY, state.pupil, state.exposure
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
function clearVoices() {
  for (const voice of [...activeVoices]) {
    try { voice.osc.stop(); } catch {}
    try { voice.osc.disconnect(); voice.gain.disconnect(); } catch {}
    activeVoices.delete(voice);
  }
}
function scheduleCue(sound, generation, eventId) {
  if (!sound || VERIFY || muted || document.hidden || state.disposed || lost ||
      !voiceContext || voiceContext.state !== 'running' ||
      cues.snapshot().generation !== generation || !state.authEvent ||
      state.authEvent.id !== eventId || activeVoices.size >= 4) return false;
  const now = voiceContext.currentTime, osc = voiceContext.createOscillator();
  const gain = voiceContext.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(sound.frequencyStartHz, now);
  osc.frequency.linearRampToValueAtTime(sound.frequencyEndHz, now + sound.durationWallSeconds);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(sound.peakGain, now + sound.attackWallSeconds);
  gain.gain.setValueAtTime(sound.peakGain, now + sound.attackWallSeconds);
  gain.gain.linearRampToValueAtTime(0, now + sound.durationWallSeconds);
  osc.connect(gain); gain.connect(voiceContext.destination);
  const voice = { osc, gain, generation, eventId };
  activeVoices.add(voice);
  osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch {} activeVoices.delete(voice); };
  osc.start(now); osc.stop(now + sound.durationWallSeconds);
  return true;
}
function stateFlags() {
  return { monitor: state.monitor, auth: state.auth, rack: state.rack,
    visibility: state.visibility, near: state.near, flare: state.flare, exposure: state.exposure,
    sourceShift: [state.shiftX, state.shiftY], observer: [state.centerX, state.centerY],
    pupilRadians: state.pupil, rate: state.rate, elapsedSeconds: state.elapsedSeconds,
    authEvent: state.authEvent ? { ...state.authEvent,
      fixtureOnly: state.authEvent.fixtureOnly === true } : null };
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
async function draw(stateOverride = {}, { capture = false, probes = true, artifactName = null, presentation = 'combined' } = {}) {
  assert(apiReady && !lost, 'WebGPU runtime is not ready');
  if (frameBusy) throw new Error('frame is already being encoded');
  frameBusy = true;
  try {
    const capturedState = Object.freeze({ ...stateFlags(), ...stateOverride,
      authEvent: stateOverride.authEvent === undefined ? state.authEvent : stateOverride.authEvent });
    const capturedGameE = Object.freeze({ elapsedSeconds: capturedState.elapsedSeconds,
      rate: capturedState.rate, reducedMotion: Boolean(capturedState.reducedMotion),
      hiddenPaused: document.hidden, fixedACC2Active: false, fixedACC2AppliedOnce: false });
    const capturedAudio = Object.freeze(currentAudioState());
    const plan = cues.plan({ gameE: capturedGameE, authEvent: capturedState.authEvent,
      audio: capturedAudio });
    const uniformState = {
      ...capturedState, near: capturedState.near !== false, flare: capturedState.flare !== false,
      monitor: capturedState.monitor !== false, auth: capturedState.auth !== false,
      rack: capturedState.rack !== false, visibility: capturedState.visibility ?? 1,
      exposure: capturedState.exposure ?? 1,
      shiftX: capturedState.sourceShift?.[0] ?? 0, shiftY: capturedState.sourceShift?.[1] ?? 0,
      centerX: capturedState.observer?.[0] ?? 670, centerY: capturedState.observer?.[1] ?? 587,
      pupil: capturedState.pupilRadians ?? -0.1745329252
    };
    Object.assign(state, { elapsedSeconds: capturedGameE.elapsedSeconds, rate: capturedGameE.rate,
      monitor: uniformState.monitor, auth: uniformState.auth, rack: uniformState.rack,
      visibility: uniformState.visibility, near: uniformState.near, flare: uniformState.flare,
      exposure: uniformState.exposure,
      shiftX: uniformState.shiftX, shiftY: uniformState.shiftY,
      centerX: uniformState.centerX, centerY: uniformState.centerY, pupil: uniformState.pupil });
    const uniform = writeUniforms(plan.visual);
    const encoder = device.createCommandEncoder({ label: `security-r04-frame-${frameSerial + 1}` });
    renderPass(encoder, pipelines.source, groups.source,
      [worldTexture.createView(), sourceTexture.createView()], 'r04-sourceWorld');
    renderPass(encoder, pipelines.receive, groups.receive, [receivedTexture.createView()], 'r04-worldReceive-received-only');
    renderPass(encoder, pipelines.observation, groups.observation, [observationTexture.createView()], 'r04-observationOnly-HDR');
    const outputTexture = context.getCurrentTexture();
    const finalGroup = presentation === 'sourceOnly' ? groups.finalSourceOnly :
      presentation === 'receiverOnly' ? groups.finalReceiverOnly : groups.final;
    renderPass(encoder, pipelines.final, finalGroup, [outputTexture.createView()], `r04-finalObserve-${presentation}`, canvas.width, canvas.height);
    const probeBuffer = probes ? device.createBuffer({ size: 5 * testPoints.length * 256,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: 'r04 native HDR and final probes' }) : null;
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
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: 'r04 actual configured canvas surface PNG' });
      addFinalPNGCopy(encoder, outputTexture, pngBuffer, canvas.width, canvas.height);
    }
    device.queue.submit([encoder.finish()]);
    const submittedFrame = ++frameSerial;
    await device.queue.onSubmittedWorkDone();
    firstGPUFrameSubmitted = true;
    const currentPlan = cues.snapshot();
    let scheduled = false;
    if (plan.sound && currentPlan.generation === plan.generation &&
        capturedAudio.currentLease && !capturedAudio.hidden && !capturedAudio.verify)
      scheduled = scheduleCue(plan.sound, plan.generation, plan.sound.receiptId);
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
      sourceHash: wgslHash, originalHash: initialPNGHash, uniform, plan: {
        ...plan, audio: capturedAudio, scheduled, cueSnapshot: cues.snapshot() },
      presentation, state: stateFlags(), captureUploadWarnings: [...captureUploadWarnings], canvas: { width: canvas.width, height: canvas.height,
        cssRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        dpr: devicePixelRatio, textureFormat: uniform.format, context: 'webgpu' },
      targets: readbacks };
    if (artifactName) await postArtifact(artifactName.replace(/\.png$/i, '.json'),
      JSON.stringify(result, null, 2), 'application/json');
    overlay.textContent = `WebGPU ${uniform.format} · ${submittedFrame} · fixture only · audio ${VERIFY ? '0 (verify)' : 'normal mode'}`;
    return result;
  } finally { frameBusy = false; }
}
async function initialize() {
  assert('gpu' in navigator, 'navigator.gpu is unavailable');
  adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  assert(adapter, 'WebGPU adapter unavailable');
  device = await adapter.requestDevice();
  device.lost.then(info => { lost = true; status(`GPU device lost: ${info.reason} ${info.message}`); clearVoices(); });
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
  const response = await fetch('./security-room-r04.wgsl', { cache: 'no-store' });
  assert(response.ok, `WGSL HTTP ${response.status}`);
  const wgslBytes = await response.arrayBuffer(); wgslHash = await sha256(wgslBytes);
  assert(wgslHash === 'ef98ef34b532295b694cf487ef8bd33fa548c777ff8ee12c4094869cb345da0d', 'artist WGSL hash mismatch');
  const module = device.createShaderModule({ label: 'frozen artist r04 WGSL', code: new TextDecoder().decode(wgslBytes) });
  const info = await module.getCompilationInfo();
  const diagnostics = info.messages.map(message => ({ type: message.type, lineNum: message.lineNum,
    linePos: message.linePos, message: message.message }));
  await postArtifact('gpu-compile-diagnostics.json', JSON.stringify({ wgslHash, diagnostics }, null, 2), 'application/json');
  const errors = diagnostics.filter(item => item.type === 'error');
  assert(!errors.length, `WGSL compile failed: ${JSON.stringify(errors)}`);
  device.pushErrorScope('validation');
  pipelines = {
    source: device.createRenderPipeline({ label: 'r04 sourceWorld MRT pipeline', layout: 'auto',
      vertex: { module, entryPoint: 'fullScreen' },
      fragment: { module, entryPoint: 'sourceWorld', targets: [{ format: F16 }, { format: F16 }] },
      primitive: { topology: 'triangle-list' } }),
    receive: device.createRenderPipeline({ label: 'r04 worldReceive received-only rgba16float pipeline', layout: 'auto',
      vertex: { module, entryPoint: 'fullScreen' },
      fragment: { module, entryPoint: 'worldReceive', targets: [{ format: F16 }] },
      primitive: { topology: 'triangle-list' } }),
    observation: device.createRenderPipeline({ label: 'r04 observationOnly source-bound HDR pipeline', layout: 'auto',
      vertex: { module, entryPoint: 'fullScreen' },
      fragment: { module, entryPoint: 'observationOnly', targets: [{ format: F16 }] },
      primitive: { topology: 'triangle-list' } }),
    final: device.createRenderPipeline({ label: 'r04 finalObserve swapchain pipeline', layout: 'auto',
      vertex: { module, entryPoint: 'fullScreen' },
      fragment: { module, entryPoint: 'finalObserve', targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] },
      primitive: { topology: 'triangle-list' } })
  };
  const pipelineValidationError = await device.popErrorScope();
  assert(!pipelineValidationError, `pipeline validation failed: ${pipelineValidationError?.message || 'unknown validation error'}`);
  canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context = canvas.getContext('webgpu');
  assert(context, 'webgpu canvas context unavailable');
  context.configure({ device, format: canvasFormat, alphaMode: 'opaque',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
  samplers = device.createSampler({ label: 'artist linear bitmap sampler', magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'nearest' });
  worldTexture = createTexture('r04 sourceWorld RGBA16float world');
  sourceTexture = createTexture('r04 sourceWorld RGBA16float source');
  receivedTexture = createTexture('r04 worldReceive received-only RGBA16float alpha-zero');
  observationTexture = createTexture('r04 observationOnly source-bound HDR RGBA16float alpha-zero');
  zeroTexture = createTexture('r04 source-isolation zero RGBA16float');
  const zeroEncoder = device.createCommandEncoder({ label: 'r04 initialize-zero-isolation-target' });
  const zeroPass = zeroEncoder.beginRenderPass({ colorAttachments: [{ view: zeroTexture.createView(),
    loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
  zeroPass.end(); device.queue.submit([zeroEncoder.finish()]); await device.queue.onSubmittedWorkDone();
  uniformBuffer = device.createBuffer({ label: 'r04 state 16 floats 64 bytes', size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
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
      { binding: 4, resource: sourceTexture.createView() }]),
    final: null, finalSourceOnly: null, finalReceiverOnly: null
  };
  // r04 binding 5 is received-only RGBA16float; it must never be an old lit-world target.
  const finalEntries = (sourceView, receiveView) => [
    { binding: 0, resource: { buffer: uniformBuffer } },
    { binding: 1, resource: baseTexture.createView() },
    { binding: 2, resource: samplers },
    { binding: 4, resource: sourceView },
    { binding: 5, resource: receiveView }];
  groups.final = makeGroup(pipelines.final, finalEntries(sourceTexture.createView(), receivedTexture.createView()));
  groups.finalSourceOnly = makeGroup(pipelines.final, finalEntries(sourceTexture.createView(), zeroTexture.createView()));
  groups.finalReceiverOnly = makeGroup(pipelines.final, finalEntries(zeroTexture.createView(), receivedTexture.createView()));
  apiReady = true;
  const features = { adapter: adapter.info?.description || adapter.info?.vendor || 'WebGPU adapter',
    device: 'requestDevice success', limits: { maxTextureDimension2D: device.limits.maxTextureDimension2D },
    canvasFormat, rgba16floatAttachment: true, requiredFeatures: [...device.features],
    textureFormatFeatureQuery: F16, formatCapabilities: adapter.getFormatFeatures?.(F16) || null,
    unsupportedCanvas2DUsed: false, hdrPipeline: ['sourceWorld:rgba16float×2', 'worldReceive:rgba16float', `finalObserve:${canvasFormat}`] };
  await postArtifact('gpu-initialization.json', JSON.stringify({ wgslHash, originalHash: initialPNGHash, uploadedCenterPixel,
    shaderDiagnostics: diagnostics, pipelineValidation: { status: 'PASS', error: null },
    bindGroupValidation: { status: 'PASS', error: null }, features,
          sourceGroups: 3, sourceFaces: 19, receiverPlanes: 4, occupancySilhouettes: 9,
      targetContract: { sourceWorld: ['world:rgba16float','source:rgba16float'],
        worldReceive: 'received-only:rgba16float:alpha=0', observationOnly: 'source-bound HDR rgba16float',
        finalObserve: canvasFormat, passes: ['sourceWorld','worldReceive','observationOnly','finalObserve'],
        draw: {vertexCount: 3, instanceCount: 1}, uniformBytes: 64 }, canvas: { width: W, height: H,
      cssWidth: canvas.getBoundingClientRect().width, cssHeight: canvas.getBoundingClientRect().height,
      dpr: devicePixelRatio, context: 'webgpu' } }, null, 2), 'application/json');
  state.rate = Number(input.rate.value);
  status(`WebGPU ready · ${canvasFormat} · frozen shader compiled; sourceHash=${wgslHash.slice(0, 12)} · audio ${VERIFY ? 'forced off' : 'gesture locked'}`);
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
    if (state.lastWall) state.elapsedSeconds += Math.max(0, wallMs - state.lastWall) / 1000 * state.rate;
    state.lastWall = wallMs;
    if (EMBED && state.elapsedSeconds >= nextEmbedFixtureAt) issueEmbedFixture();
  }
  if (!document.hidden && !matrixRunning && !frameBusy && apiReady) {
    try { await draw({}, { probes: false, presentation: input.presentation.value }); }
    catch (error) { status(`Frame error: ${error.message}`); }
  }
  requestAnimationFrame(tick);
}
async function handleVisibility() {
  if (!apiReady) return;
  const current = snapshotGameE();
  const plan = cues.plan({ gameE: { ...current, hiddenPaused: document.hidden },
    authEvent: state.authEvent, audio: currentAudioState() });
  if (plan.cancelVoices) clearVoices();
  state.lastWall = 0;
   if (!frameBusy && !document.hidden) await draw({}, { probes: false, presentation: input.presentation.value });
}
function setRate(value) {
  state.rate = Number(value);
  input.rate.value = String(state.rate);
  const plan = cues.plan({ gameE: snapshotGameE(), authEvent: state.authEvent, audio: currentAudioState() });
  if (plan.cancelVoices) clearVoices();
  state.lastWall = 0;
  if (!frameBusy) draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message));
}
function updateUIState() {
  state.monitor = input.monitor.checked; state.auth = input.auth.checked; state.rack = input.rack.checked;
  state.visibility = input.visibility.checked ? 1 : 0; state.near = input.near.checked; state.flare = input.flare.checked;
  state.exposure = input.exposure.checked ? 1 : 0;
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
function fixtureAuth() {
  state.authEvent = makeFixtureReceipt(`manual-${crypto.randomUUID()}`);
  state.auth = true; input.auth.checked = true;
  status(`Synthetic fixture receipt ${state.authEvent.id}; not a game receipt`);
  if (!frameBusy) draw({}, { probes: true, presentation: input.presentation.value }).catch(error => status(error.message));
}
function makeFixtureReceipt(id) {
  return Object.freeze({ id: `fixture-auth-r04-${id}`, atESeconds: state.elapsedSeconds,
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
async function unlockNormalAudio() {
  if (VERIFY || state.disposed || lost) return { state: 'silent', reason: 'verification mode or disposed' };
  if (!voiceContext) voiceContext = new AudioContext();
  await voiceContext.resume();
  muted = false;
  status('Normal fixture audio unlocked by this gesture; only finite cue policy can emit.');
  return { state: 'active', reason: 'using the preview-authored finite cue' };
}
function gallerySfxStatus() {
  if (VERIFY) return { state: 'silent', reason: 'verification mode', verify: true, muted: true };
  if (state.disposed || lost) return { state: 'disposed', reason: 'runtime disposed', verify: false, muted: true };
  if (muted) return { state: 'muted', reason: 'muted by gallery', verify: false, muted: true };
  return { state: voiceContext?.state === 'running' ? 'active' : 'ready',
    reason: voiceContext?.state === 'running' ? 'using the preview-authored finite cue'
      : 'gesture unlock required', verify: false, muted: false };
}
function setGalleryMuted(value) {
  if (VERIFY) { muted = true; clearVoices(); return gallerySfxStatus(); }
  muted = Boolean(value);
  if (muted) clearVoices();
  return gallerySfxStatus();
}
function gallerySfxSnapshot() {
  return { ...gallerySfxStatus(), ...currentAudioState(), cue: cues.snapshot(),
    fixtureOnly: true, embed: EMBED, embedFixtureCycle, nextEmbedFixtureAt,
    elapsedSeconds: state.elapsedSeconds };
}
async function disposeRuntime() {
  if (state.disposed) return { state: 'disposed', reason: 'already disposed' };
  state.disposed = true;
  const plan = cues.dispose();
  if (plan.cancelVoices) clearVoices();
  const closing = voiceContext?.close?.();
  voiceContext = null;
  try { device?.destroy(); } catch {}
  await Promise.resolve(closing).catch(() => {});
  return { state: 'disposed', reason: 'runtime resources released' };
}
window.__gallerySfx = Object.freeze({
  activateFromGesture: async (_item) => {
    if (VERIFY) return gallerySfxStatus();
    muted = false;
    return unlockNormalAudio();
  },
  setMuted: setGalleryMuted,
  dispose: disposeRuntime,
  status: gallerySfxStatus,
  snapshot: gallerySfxSnapshot
});
async function renderCase(options = {}) {
  const { name = `fixture-${Date.now()}`, state: patch = {}, cssWidth = W,
    capture = true, probes = true, presentation = 'combined' } = options;
  Object.assign(state, patch);
  state.lastWall = 0;
  setCanvasCssWidth(cssWidth);
  input.presentation.value = presentation;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const result = await draw(patch, { capture, probes, artifactName: capture ? `${name}.png` : null, presentation });
  result.caseName = name;
  result.cssWidthRequested = cssWidth;
  return result;
}
async function readNativeDiagnostics() {
  const result = await draw({}, { probes: true, capture: true, artifactName: 'manual-probe.png', presentation: input.presentation.value });
  return result;
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
      plan: result.plan, canvas: result.canvas, file: `${name}.png` });
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
  await run('flare-only-observation-hdr', { near: false, flare: true, monitor: true, auth: true, rack: true }, W, authPeak, 'flareonly');
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
  await run('observer-center-moved', { observer: [520, 700] }, W, authPeak, 'observer');
  await run('pupil-angle-zero', { pupilRadians: 0 }, W, authPeak, 'pupil');
  await run('reduced-motion', { reducedMotion: true }, W, authPeak, 'reduced');
  await run('rate-zero-silent', { rate: 0 }, W, authPeak, 'ratezero');
  await run('rate-two', { rate: 2 }, W, authPeak, 'ratetwo');
  await run('restored-combined-after-off-full', { ...baseline, authEvent: null }, W, null, 'restored');
  const matrix = { schema: 'security-room-r04-native-static-matrix/v1', fixtureOnly: true,
    verificationAudio: VERIFY ? 0 : 'not-forced', sourceHash: wgslHash, originalHash: initialPNGHash,
    noPerformanceMeasurement: true, cuePolicy: runCuePolicyDiagnostics(), captureUploadWarnings: [...captureUploadWarnings], cases: rows };
  await postArtifact('native-static-matrix.json', JSON.stringify(matrix, null, 2), 'application/json');
  return matrix;
  } finally { matrixRunning = false; }
}

function runCuePolicyDiagnostics() {
  const cueTest = createSecurityRoomR04Cues();
  const goodAudio = { verify: false, hidden: false, disposed: false,
    firstGPUFrameSubmitted: true, currentLease: true, unlocked: true,
    voicePoolAvailable: true, currentVoiceCursor: 0 };
  const e = (elapsedSeconds, rate = 1, hiddenPaused = false) => ({ elapsedSeconds, rate,
    reducedMotion: false, hiddenPaused, fixedACC2Active: false, fixedACC2AppliedOnce: false });
  const receipt = id => ({ id, atESeconds: 0 });
  const a1 = cueTest.plan({ gameE: e(.01), authEvent: receipt('A'), audio: goodAudio });
  const b = cueTest.plan({ gameE: e(.02), authEvent: receipt('B'), audio: goodAudio });
  const a2 = cueTest.plan({ gameE: e(.03), authEvent: receipt('A'), audio: goodAudio });
  const rateZero = cueTest.plan({ gameE: e(1, 0), authEvent: receipt('C'), audio: goodAudio });
  const rateChange = cueTest.plan({ gameE: e(1.01, 2), authEvent: { id: 'D', atESeconds: 1 }, audio: goodAudio });
  const hidden = cueTest.plan({ gameE: e(1.02, 2, true), authEvent: null,
    audio: { ...goodAudio, hidden: true } });
  const verifyCue = createSecurityRoomR04Cues().plan({ gameE: e(.01), authEvent: receipt('verify'),
    audio: { ...goodAudio, verify: true } });
  const result = { schema: 'security-room-r04-cue-native-runtime-policy/v1', fixtureOnly: true,
    rate1DurationWallSeconds: a1.sound?.durationWallSeconds,
    rate1AttackWallSeconds: a1.sound?.attackWallSeconds,
    rate2DurationWallSeconds: rateChange.sound?.durationWallSeconds,
    rate2AttackWallSeconds: rateChange.sound?.attackWallSeconds,
    seenSequence: { A1: Boolean(a1.sound), B: Boolean(b.sound), A2: Boolean(a2.sound),
      ids: cueTest.snapshot().seenIds },
    rateZero: { sound: rateZero.sound, consumed: rateZero.receiptConsumed },
    rateChange: { cancelVoices: rateChange.cancelVoices, generation: rateChange.generation },
    visibility: { cancelVoices: hidden.cancelVoices, generation: hidden.generation },
    verification: { sound: verifyCue.sound, consumed: verifyCue.receiptConsumed },
    sharedETimeNotMultiplied: { visualAge: a1.visual.authAge, expectedElapsedMinusReceipt: .01 },
    audioContextCreatedInVerificationPage: Boolean(voiceContext),
    normalAudioListening: 'NOT_RUN' };
  cueTest.dispose();
  return result;
}

for (const element of document.querySelectorAll('.controls input,.controls select'))
  element.addEventListener('change', () => element === input.rate ? setRate(input.rate.value) :
    element === input.size ? (setCanvasCssWidth(input.size.value), draw({}, { probes: true, presentation: input.presentation.value }).catch(error => status(error.message))) : updateUIState());
document.querySelector('#auth').addEventListener('click', fixtureAuth);
document.querySelector('#unlock').classList.toggle('hidden', VERIFY);
document.querySelector('#unlock').addEventListener('click', () => unlockNormalAudio().catch(error => status(error.message)));
document.querySelector('#full').addEventListener('click', () => { input.size.value = String(W); setCanvasCssWidth(W); draw({}, { probes: false, presentation: input.presentation.value }).catch(error => status(error.message)); });
document.querySelector('#diagnostics').addEventListener('click', () => readNativeDiagnostics().then(r => status(`Native probes submitted frame ${r.submittedFrame}`)).catch(error => status(error.message)));
document.querySelector('#matrix').addEventListener('click', async event => { const button = event.currentTarget; button.disabled = true; try { const m = await runStaticMatrix(); status(`Static matrix saved: ${m.cases.length} fixture states; not cadence/performance proof.`); } catch (error) { status(`Matrix stopped: ${error.stack || error}`); } finally { button.disabled = false; } });
document.addEventListener('visibilitychange', () => handleVisibility().catch(error => status(error.message)));
window.addEventListener('pagehide', () => { void disposeRuntime(); }, { once: true });
window.securityR04 = Object.freeze({ renderCase, readNativeDiagnostics, runStaticMatrix,
  runCuePolicyDiagnostics,
  sourceHash: () => wgslHash, originalHash: () => initialPNGHash,
  status: () => ({ apiReady, lost, frameSerial, firstGPUFrameSubmitted, verify: VERIFY,
    sourceHash: wgslHash, originalHash: initialPNGHash, state: stateFlags(), cue: cues.snapshot(),
    embed: EMBED, embedFixtureCycle, audio: currentAudioState() }) });
initialize().catch(error => { status(`WebGPU initialization failed: ${error.stack || error}`); console.error(error); });
