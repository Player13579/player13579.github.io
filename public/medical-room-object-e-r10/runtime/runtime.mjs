import {
  ID,
  ORIGINAL,
  acceptedFrameInput,
  clothState,
  fluidState,
  uniforms,
} from '../artist.mjs';
import { shader as objectEShader, uniforms as objectEUniforms, responseChannels } from './object-e.mjs';
import {
  ACTOR_ID, BASIS_HASH, MedicalObjectFixture, imageToScreen, screenToImage,
} from './object-fixture.mjs';

const canvas = document.querySelector('#scene');
const controls = document.querySelector('#controls');
const effectButton = document.querySelector('#effect');
const waterButton = document.querySelector('#water');
const clothButton = document.querySelector('#cloth');
const obsButton = document.querySelector('#obs');
const proofButton = document.querySelector('#proof');
const originalOnlyButton = document.querySelector('#original-only');
const objectSourceButton = document.querySelector('#object-source');
const objectObsButton = document.querySelector('#object-obs');
const resetSessionButton = document.querySelector('#reset-session');
const readiness = document.querySelector('#readiness');
const objectStatus = document.querySelector('#object-status');
const diagnostics = document.querySelector('#diagnostics');
const errorBox = document.querySelector('#error');
const query = new URLSearchParams(location.search);
const verify = query.has('verify');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (query.get('ui') === 'off') {
  controls.hidden = true;
  diagnostics.hidden = true;
}

const initialSeconds = query.has('t') ? Number(query.get('t')) : null;
const state = {
  effect: query.get('effect') !== 'off',
  fluid: query.get('water') !== 'off',
  cloth: query.get('cloth') !== 'off',
  obs: query.get('obs') !== 'off',
  sourceVisibility: query.get('light') === 'off' ? 0 : 1,
  originalOnly: false,
  objectSource: query.get('object-source') !== 'off',
  objectObs: query.get('object-obs') !== 'off',
  fixedTimeMs: Number.isFinite(initialSeconds) && initialSeconds >= 0 ? initialSeconds * 1000 : null,
};
const objectFixture = new MedicalObjectFixture();
const heldKeys = new Set();
let objectTimeMs = 0;
let lastObjectTimestamp = null;
const evidence = {
  id: ID,
  version: 'r10-water-restore',
  preservedEnvironmentVersion: 'r7',
  status: 'initializing',
  verify,
  audioGain: 0,
  audio: 'disabled_map_sfx_exception',
  sourceMode: 'gallery-demo',
  basisHash: ORIGINAL.sha256,
  adapter: null,
  format: null,
  originalSha256: null,
  originalSize: [ORIGINAL.width, ORIGINAL.height],
  fit: null,
  viewport: null,
  dpr: null,
  timeMs: null,
  stage: null,
  fluidTimelineStage: null,
  clothStage: null,
  fluid: state.fluid,
  cloth: state.cloth,
  effect: state.effect,
  obs: state.obs,
  sourceVisibility: state.sourceVisibility,
  reducedMotion,
  frames: 0,
  submittedFrame: 0,
  completedFrame: 0,
  settingsVersion: 0,
  deviceGeneration: 0,
  targetGeneration: 0,
  shaderMessages: {},
  errors: [],
  proofResults: [],
  objectE: { basisHash: BASIS_HASH, audioGain: 0, localUseCount: 0, activeReceiptCount: 0, actorId: ACTOR_ID },
  originalOnly: state.originalOnly,
};

let device;
let context;
let canvasFormat;
let originalTexture;
let worldPipeline;
let blurPipeline;
let postPipeline;
let objectPipeline;
let worldGroup0;
let worldGroup1;
let worldGroup2;
let postGroup;
let objectGroup;
let lightUniform;
let waterUniform;
let clothUniform;
let objectUniform;
let blurUniformX;
let blurUniformY;
let sampler;
let targets;
let raf = 0;
let active = false;
let disposed = false;
let lastVisibleTimestamp = null;
let environmentTimeMs = 0;
let queuedProofs = [];
let inFlightProofs = 0;
const MAX_PROOFS = 3;

function updateDiagnostics() {
  diagnostics.textContent = [
    `status=${evidence.status} verify=${evidence.verify} audioGain=${evidence.audioGain}`,
    `source=${evidence.sourceMode} basis=${evidence.basisHash}`,
    `adapter=${evidence.adapter ?? 'pending'} format=${evidence.format ?? 'pending'}`,
    `original=${evidence.originalSize.join('x')} sha256=${evidence.originalSha256 ?? 'pending'}`,
    `backing=${evidence.viewport?.join('x') ?? 'pending'} dpr=${evidence.dpr ?? 'pending'} fit=${evidence.fit?.map(v => Number(v.toFixed(2))).join(',') ?? 'pending'}`,
    `timeMs=${evidence.timeMs ?? 'pending'} waterStage=${evidence.stage ?? 'pending'} clothStage=${evidence.clothStage ?? 'pending'} reducedMotion=${evidence.reducedMotion}`,
    `effect=${evidence.effect} water=${evidence.fluid} cloth=${evidence.cloth} obs=${evidence.obs} lightSource=${evidence.sourceVisibility}`,
    `frames=${evidence.frames} submitted=${evidence.submittedFrame} completedProof=${evidence.completedFrame}`,
    `settings=${evidence.settingsVersion} deviceGeneration=${evidence.deviceGeneration} targetGeneration=${evidence.targetGeneration}`,
    `queuedProofs=${queuedProofs.length} inFlightProofs=${inFlightProofs} errors=${evidence.errors.length}`,
  ].join('\n');
}

function noteError(error) {
  const message = String(error?.message || error || 'Unknown WebGPU error');
  evidence.errors.push(message);
  if (evidence.errors.length > 30) evidence.errors.splice(0, evidence.errors.length - 30);
  evidence.status = 'failed';
  active = false;
  cancelAnimationFrame(raf);
  raf = 0;
  readiness.textContent = 'WebGPU error';
  errorBox.hidden = false;
  errorBox.textContent = `WebGPU preview error: ${message}`;
  for (const request of queuedProofs.splice(0)) {
    request.resolve({ ...request.snapshot, completed: false, current: false, error: message });
  }
  updateDiagnostics();
}

function updateButton(button, enabled, label) {
  button.setAttribute('aria-pressed', String(enabled));
  button.textContent = `${label}: ${enabled ? 'on' : 'off'}`;
}

function settingsChanged() {
  evidence.settingsVersion++;
  evidence.effect = state.effect && !state.originalOnly;
  evidence.fluid = state.fluid && !state.originalOnly;
  evidence.cloth = state.cloth && !state.originalOnly;
  evidence.obs = state.obs;
  evidence.sourceVisibility = state.sourceVisibility;
  evidence.originalOnly = state.originalOnly;
  evidence.objectE = { ...evidence.objectE, localUseCount: objectFixture.localUseCount,
    originalOnly: state.originalOnly, effectiveEnabled: state.effect && !state.originalOnly,
    activeReceiptCount: objectFixture.visibleReceipts(objectTimeMs).length,
    response: responseChannels({ sourceOn: state.objectSource, obsOn: state.objectObs, positiveBenefit: true }) };
  updateDiagnostics();
}

function setEffect(value) {
  state.effect = !!value;
  updateButton(effectButton, state.effect, 'Effect');
  settingsChanged();
}
function setFluid(value) {
  state.fluid = !!value;
  updateButton(waterButton, state.fluid, 'Water');
  settingsChanged();
}
function setCloth(value) {
  state.cloth = !!value;
  updateButton(clothButton, state.cloth, 'Cloth');
  settingsChanged();
}
function setObs(value) {
  state.obs = !!value;
  updateButton(obsButton, state.obs, 'OBS');
  settingsChanged();
}

function setOriginalOnly(value) {
  state.originalOnly = !!value;
  objectFixture.setContext({ originalOnly: state.originalOnly });
  heldKeys.clear();
  lastVisibleTimestamp = null;
  lastObjectTimestamp = null;
  updateButton(originalOnlyButton, state.originalOnly, 'Original only');
  settingsChanged();
}

function setObjectSource(value) {
  state.objectSource = !!value;
  updateButton(objectSourceButton, state.objectSource, 'Object source');
  settingsChanged();
}

function setObjectObs(value) {
  state.objectObs = !!value;
  updateButton(objectObsButton, state.objectObs, 'Object OBS');
  settingsChanged();
}

effectButton.addEventListener('click', () => setEffect(!state.effect));
waterButton.addEventListener('click', () => setFluid(!state.fluid));
clothButton.addEventListener('click', () => setCloth(!state.cloth));
obsButton.addEventListener('click', () => setObs(!state.obs));
originalOnlyButton.addEventListener('click', () => setOriginalOnly(!state.originalOnly));
objectSourceButton.addEventListener('click', () => setObjectSource(!state.objectSource));
objectObsButton.addEventListener('click', () => setObjectObs(!state.objectObs));
resetSessionButton.addEventListener('click', () => {
  objectFixture.reset();
  objectTimeMs = 0;
  lastObjectTimestamp = null;
  objectStatus.textContent = 'プレビュー操作成功: 0';
  settingsChanged();
});
updateButton(effectButton, state.effect, 'Effect');
updateButton(waterButton, state.fluid, 'Water');
updateButton(clothButton, state.cloth, 'Cloth');
updateButton(obsButton, state.obs, 'OBS');
updateButton(originalOnlyButton, state.originalOnly, 'Original only');
updateButton(objectSourceButton, state.objectSource, 'Object source');
updateButton(objectObsButton, state.objectObs, 'Object OBS');

canvas.addEventListener('pointerdown', (event) => {
  if (state.originalOnly || disposed) return;
  canvas.focus();
  const bounds = canvas.getBoundingClientRect();
  const backingPoint = [
    (event.clientX - bounds.left) * canvas.width / bounds.width,
    (event.clientY - bounds.top) * canvas.height / bounds.height,
  ];
  if (!targets) return;
  const imagePx = screenToImage(backingPoint, makeImageRect(canvas.width, canvas.height));
  if (imagePx[0] < 0 || imagePx[1] < 0 || imagePx[0] >= ORIGINAL.width || imagePx[1] >= ORIGINAL.height) return;
  objectFixture.setPointerTarget(imagePx);
});
canvas.addEventListener('keydown', (event) => {
  if (state.originalOnly || disposed) return;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s'].includes(event.key)) {
    event.preventDefault(); heldKeys.add(event.key);
  }
});
canvas.addEventListener('keyup', (event) => heldKeys.delete(event.key));
canvas.addEventListener('blur', () => heldKeys.clear());

function pendingProofCount() {
  return queuedProofs.length + inFlightProofs;
}

function resolveQueuedProofs(frameId, settingsVersion, deviceGeneration, targetGeneration, phaseMs, stage) {
  if (queuedProofs.length === 0) return;
  const requests = queuedProofs.splice(0);
  const snapshot = {
    frameId,
    settingsVersion,
    roomId: 'medical',
    sourceMode: 'gallery-demo',
    basisHash: ORIGINAL.sha256,
    deviceGeneration,
    targetGeneration,
    phaseMs,
    stage,
  };
  inFlightProofs++;
  // This explicit evidence path never blocks the RAF loop. Ordinary draws do
  // not claim GPU completion; only requested proofs use queue completion.
  device.queue.onSubmittedWorkDone().then(() => {
    inFlightProofs--;
    const current = !disposed && active && document.visibilityState === 'visible' &&
      evidence.settingsVersion === settingsVersion &&
      evidence.deviceGeneration === deviceGeneration &&
      evidence.targetGeneration === targetGeneration;
    evidence.completedFrame = Math.max(evidence.completedFrame, frameId);
    const result = { ...snapshot, completed: true, current, errors: [...evidence.errors] };
    evidence.proofResults.push(result);
    if (evidence.proofResults.length > 10) evidence.proofResults.shift();
    for (const request of requests) request.resolve(result);
    proofButton.textContent = current ? `Frame ${frameId} complete` : `Frame ${frameId} stale`;
    updateDiagnostics();
  }).catch(error => {
    inFlightProofs--;
    noteError(error);
    const result = { ...snapshot, completed: false, current: false, error: String(error?.message || error) };
    for (const request of requests) request.resolve(result);
  });
  updateDiagnostics();
}

function requestFrameProof() {
  if (!active || disposed || evidence.status !== 'ready') {
    return Promise.resolve({ completed: false, current: false, error: 'preview is not active and ready' });
  }
  if (pendingProofCount() >= MAX_PROOFS) {
    return Promise.resolve({ completed: false, current: false, error: 'proof capacity is full' });
  }
  proofButton.textContent = 'Waiting for next submitted frame…';
  return new Promise(resolve => {
    queuedProofs.push({ resolve, snapshot: { settingsVersion: evidence.settingsVersion } });
    updateDiagnostics();
  });
}

proofButton.addEventListener('click', () => {
  requestFrameProof().then(result => {
    if (!result.completed) proofButton.textContent = 'Proof unavailable';
  }).catch(noteError);
});

function retireTargets(oldTargets) {
  if (!oldTargets || !device) return;
  const textures = [oldTargets.scene, oldTargets.source, oldTargets.blurA, oldTargets.blurB,
    oldTargets.objectBase, oldTargets.objectScene];
  device.queue.onSubmittedWorkDone().then(() => {
    for (const texture of textures) texture.destroy();
  }).catch(error => {
    if (!disposed) noteError(error);
  });
}

function makeTexture(width, height, label) {
  return device.createTexture({
    label,
    size: { width, height, depthOrArrayLayers: 1 },
    format: 'rgba16float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
  });
}

function makeImageRect(width, height) {
  const fit = Math.min(width / ORIGINAL.width, height / ORIGINAL.height);
  const imageWidth = ORIGINAL.width * fit;
  const imageHeight = ORIGINAL.height * fit;
  return [(width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight];
}

function makeWorldGroups() {
  worldGroup0 = device.createBindGroup({
    label: 'medical-r7-light-original-bindings',
    layout: worldPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: lightUniform } },
      { binding: 1, resource: originalTexture.createView() },
      { binding: 2, resource: sampler },
    ],
  });
  worldGroup1 = device.createBindGroup({
    label: 'medical-r7-water-bindings',
    layout: worldPipeline.getBindGroupLayout(1),
    entries: [{ binding: 0, resource: { buffer: waterUniform } }],
  });
  worldGroup2 = device.createBindGroup({
    label: 'medical-r7-cloth-bindings',
    layout: worldPipeline.getBindGroupLayout(2),
    entries: [{ binding: 0, resource: { buffer: clothUniform } }],
  });
}

function makePostGroup() {
  postGroup = device.createBindGroup({
    label: 'medical-r7-post-bindings',
    layout: postPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: lightUniform } },
      { binding: 1, resource: targets.objectScene.createView() },
      { binding: 2, resource: targets.blurB.createView() },
      { binding: 3, resource: sampler },
    ],
  });
}

function makeObjectGroup() {
  objectGroup = device.createBindGroup({
    label: 'medical-r8-object-e-current-scene-bindings',
    layout: objectPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: objectUniform } },
      { binding: 1, resource: targets.objectBase.createView() },
      { binding: 2, resource: sampler },
    ],
  });
}

function resizeTargets(width, height) {
  if (targets?.width === width && targets?.height === height) return;
  const old = targets;
  const halfWidth = Math.max(1, Math.ceil(width / 2));
  const halfHeight = Math.max(1, Math.ceil(height / 2));
  targets = {
    width,
    height,
    halfWidth,
    halfHeight,
    generation: evidence.targetGeneration + 1,
    scene: makeTexture(width, height, 'medical-r7-linear-scene'),
    source: makeTexture(width, height, 'medical-r7-source-signal'),
    objectBase: device.createTexture({ label: 'medical-r8-object-e-base-copy', size: { width, height, depthOrArrayLayers: 1 },
      format: 'rgba16float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST }),
    objectScene: makeTexture(width, height, 'medical-r8-object-e-linear-scene'),
    blurA: makeTexture(halfWidth, halfHeight, 'medical-r7-blur-horizontal'),
    blurB: makeTexture(halfWidth, halfHeight, 'medical-r7-blur-vertical'),
  };
  evidence.targetGeneration = targets.generation;
  evidence.viewport = [width, height];
  retireTargets(old);
  makePostGroup();
  makeObjectGroup();
}

function makeBlurGroup(texture, values, uniformBuffer) {
  device.queue.writeBuffer(uniformBuffer, 0, values);
  return device.createBindGroup({
    layout: blurPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: texture.createView() },
      { binding: 2, resource: sampler },
    ],
  });
}

function frameClock(now) {
  if (state.fixedTimeMs !== null) return state.fixedTimeMs;
  if (state.originalOnly) { lastVisibleTimestamp = now; return environmentTimeMs; }
  if (lastVisibleTimestamp !== null) environmentTimeMs += Math.max(0, now - lastVisibleTimestamp);
  lastVisibleTimestamp = now;
  return environmentTimeMs;
}

function finishInvalidProofs(reason) {
  for (const request of queuedProofs.splice(0)) {
    request.resolve({ ...request.snapshot, completed: false, current: false, error: reason });
  }
  updateDiagnostics();
}

function destroyOwnedGpuResources() {
  if (targets) {
    for (const texture of [targets.scene, targets.source, targets.blurA, targets.blurB, targets.objectBase, targets.objectScene]) texture.destroy();
    targets = null;
  }
  originalTexture?.destroy();
  originalTexture = null;
  for (const buffer of [lightUniform, waterUniform, clothUniform, blurUniformX, blurUniformY, objectUniform]) buffer?.destroy();
  lightUniform = null;
  waterUniform = null;
  clothUniform = null;
  blurUniformX = null;
  blurUniformY = null;
  objectUniform = null;
}

function frame(now) {
  raf = 0;
  if (!active || disposed || document.visibilityState !== 'visible') return;
  try {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      resizeTargets(width, height);
    } else if (!targets) {
      resizeTargets(width, height);
    }
    evidence.dpr = dpr;
    const rect = makeImageRect(width, height);
    evidence.fit = rect;
    const tentativeTime = frameClock(now);
    const objectDeltaMs = lastObjectTimestamp === null ? 0 : Math.max(0, now - lastObjectTimestamp);
    lastObjectTimestamp = now;
    if (!state.originalOnly) objectTimeMs += objectDeltaMs;
    objectFixture.setContext({ visible: true, roomId: 'medical', basisHash: ORIGINAL.sha256,
      originalOnly: state.originalOnly, disposed: false });
    const fixtureFrame = objectFixture.advance({ deltaMs: state.originalOnly ? 0 : objectDeltaMs,
      nowMs: objectTimeMs, keys: heldKeys, basisHash: ORIGINAL.sha256 });
    const activeReceipts = state.effect && !state.originalOnly ? objectFixture.visibleReceipts(objectTimeMs) : [];
    const input = acceptedFrameInput({
      visible: true,
      current: true,
      roomId: 'medical',
      sourceMode: 'gallery-demo',
      basisHash: ORIGINAL.sha256,
      environmentTimeMs: tentativeTime,
    });
    if (!input) throw new Error('No current visible gallery-demo lease.');
    const timeMs = input.environmentTimeMs;
    const frameData = uniforms({
      viewportPx: [width, height],
      imageRectPx: rect,
      environmentTimeMs: timeMs,
      sourceVisibility: state.sourceVisibility,
      effect: state.effect && !state.originalOnly,
      fluid: state.fluid,
      cloth: state.cloth,
      obs: state.obs,
      cancelled: false,
      reducedMotion,
    });
    device.queue.writeBuffer(lightUniform, 0, frameData.light);
    device.queue.writeBuffer(waterUniform, 0, frameData.water);
    device.queue.writeBuffer(clothUniform, 0, frameData.cloth);
    const objectParams = objectEUniforms({ viewportPx: [width, height], imageRectPx: rect,
      sourceOn: state.objectSource, obsOn: state.objectObs, actorPx: fixtureFrame.actorPx,
      actorVisible: !state.originalOnly, receipts: activeReceipts, nowMs: objectTimeMs });
    device.queue.writeBuffer(objectUniform, 0, objectParams);

    const backingFit = rect[3] / ORIGINAL.height;
    const sigmaHalf = 14 * backingFit * 0.5;
    const tapStep = sigmaHalf / 2;
    const encoder = device.createCommandEncoder({ label: 'medical-r7-frame' });

    const world = encoder.beginRenderPass({
      label: 'medical-r7-world-mrt',
      colorAttachments: [
        { view: targets.scene.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' },
        { view: targets.source.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' },
      ],
    });
    world.setPipeline(worldPipeline);
    world.setBindGroup(0, worldGroup0);
    world.setBindGroup(1, worldGroup1);
    world.setBindGroup(2, worldGroup2);
    world.draw(3, 1, 0, 0);
    world.end();

    encoder.copyTextureToTexture(
      { texture: targets.scene }, { texture: targets.objectBase },
      { width, height, depthOrArrayLayers: 1 },
    );
    const objectPass = encoder.beginRenderPass({
      label: 'medical-r10-water-restore-and-source-only-obs',
      colorAttachments: [{ view: targets.objectScene.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
    });
    objectPass.setPipeline(objectPipeline);
    objectPass.setBindGroup(0, objectGroup);
    objectPass.draw(3, 1, 0, 0);
    objectPass.end();

    const horizontal = makeBlurGroup(targets.source, new Float32Array([
      tapStep, 0, 1 / targets.halfWidth, 1 / targets.halfHeight,
    ]), blurUniformX);
    const blurX = encoder.beginRenderPass({
      label: 'medical-r7-source-blur-horizontal',
      colorAttachments: [{ view: targets.blurA.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }],
    });
    blurX.setPipeline(blurPipeline);
    blurX.setBindGroup(0, horizontal);
    blurX.draw(3, 1, 0, 0);
    blurX.end();

    const vertical = makeBlurGroup(targets.blurA, new Float32Array([
      0, tapStep, 1 / targets.halfWidth, 1 / targets.halfHeight,
    ]), blurUniformY);
    const blurY = encoder.beginRenderPass({
      label: 'medical-r7-source-blur-vertical',
      colorAttachments: [{ view: targets.blurB.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }],
    });
    blurY.setPipeline(blurPipeline);
    blurY.setBindGroup(0, vertical);
    blurY.draw(3, 1, 0, 0);
    blurY.end();

    const post = encoder.beginRenderPass({
      label: 'medical-r7-final-encode',
      colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
    });
    post.setPipeline(postPipeline);
    post.setBindGroup(0, postGroup);
    post.draw(3, 1, 0, 0);
    post.end();

    device.queue.submit([encoder.finish()]);
    evidence.frames++;
    evidence.submittedFrame = evidence.frames;
    evidence.timeMs = timeMs;
    evidence.objectE = { basisHash: BASIS_HASH, audioGain: 0, localUseCount: objectFixture.localUseCount,
      activeReceiptCount: activeReceipts.length, actorId: ACTOR_ID, sessionId: objectFixture.sessionId,
      actorPx: fixtureFrame.actorPx, objectTimeMs, response: responseChannels({ sourceOn: state.objectSource,
        obsOn: state.objectObs, positiveBenefit: activeReceipts.some((receipt) => receipt.benefitDelta > 0) }) };
    objectStatus.textContent = `プレビュー操作成功: ${objectFixture.localUseCount}`;
    evidence.fluidTimelineStage = frameData.state.stage;
    evidence.stage = frameData.water[1] >= 0.5 ? frameData.state.stage : 'off';
    evidence.clothStage = frameData.cloth[3] >= 0.5 ? frameData.clothState.stage : 'off';
    evidence.status = 'ready';
    readiness.textContent = `WebGPU ready · ${evidence.stage} · frame ${evidence.submittedFrame}`;
    resolveQueuedProofs(evidence.submittedFrame, evidence.settingsVersion, evidence.deviceGeneration, evidence.targetGeneration, timeMs, evidence.stage);
    updateDiagnostics();
  } catch (error) {
    noteError(error);
    return;
  }
  raf = requestAnimationFrame(frame);
}

function invalidateLifecycle(reason) {
  evidence.deviceGeneration++;
  evidence.targetGeneration++;
  finishInvalidProofs(reason);
  updateDiagnostics();
}

async function fetchVerified(path, expectedHash) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} fetch ${response.status}`);
  const bytes = await response.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map(value => value.toString(16).padStart(2, '0')).join('');
  if (hash !== expectedHash) throw new Error(`${path} hash mismatch: ${hash}`);
  return bytes;
}

async function verifyFrozenSources() {
  const expected = new Map([
    ['../API-RUNTIME.md', '394cd51368c39b849e88a257b61461a26e5fbcbd17644c58650a861d75cd0d8b'],
    ['../source-contract.json', '1527899e580834dfac4d2c174f4f5842ae9046deb83fc9d0142f4912ec3a828e'],
    ['../artist.mjs', '19d4e1c680308dd57cf1c39dbf95524dd2eea251e4a31c7dece8c1d2dab4ab6a'],
    ['../cloth.mjs', '0fedef0be7ce32e6d9da664eb94c5f7480cfd0627baaab0387c1c1e590da4b65'],
    ['../support-light/artist.mjs', 'faa9631d0de41eceaab63e044208dde354890b3850778147ebcfe23edf3abc11'],
    ['../world.wgsl', 'd8f2010e8868ca822223ef51a95de827fcc72fe6e39cff103a535aaa6f2302c2'],
    ['../blur.wgsl', 'cfdde22d84b2f3e2f5b75c164da2922d2c55d3e65745348fc76febed336f4370'],
    ['../post.wgsl', '7aa7485c75da97994fcabfb16bc64a558a2b7420fedff65afa5e58aad4f82915'],
    ['../medical-room-vfx-r4.png', ORIGINAL.sha256],
    ['./object-e.mjs', '8a09a3f43dea92b6d23dfd04ed2d0a9a2176b1403d3a490be786bba80af3fd58'],
    ['./object-fixture.mjs', '191d62e6bdb766800a0001266186c8645db36de011f6e923a637838c2ecf2592'],
    ['../contract.json', '166799431c7b95261383725b081ef9fe9b1f0eed643637a1fb9646957df8cd32'],
  ]);
  const hashes = {};
  const verifiedBytes = {};
  for (const [path, hash] of expected) {
    verifiedBytes[path] = await fetchVerified(path, hash);
    hashes[path] = hash;
  }
  evidence.frozenSources = hashes;
  return verifiedBytes;
}

async function shaderModule(name, code) {
  const module = device.createShaderModule({ label: `medical-r7-${name}`, code });
  const info = await module.getCompilationInfo();
  const messages = info.messages.map(({ type, message, lineNum, linePos }) => ({ type, message, lineNum, linePos }));
  evidence.shaderMessages[name] = messages;
  const errors = messages.filter(message => message.type === 'error');
  if (errors.length) throw new Error(`${name} WGSL compile failed: ${errors.map(message => message.message).join('\n')}`);
  return module;
}

async function loadOriginal(bytes) {
  const blob = new Blob([bytes], { type: 'image/png' });
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  if (bitmap.width !== ORIGINAL.width || bitmap.height !== ORIGINAL.height) {
    const size = `${bitmap.width}x${bitmap.height}`;
    bitmap.close();
    throw new Error(`Original dimensions changed: ${size}`);
  }
  evidence.originalSha256 = ORIGINAL.sha256;
  originalTexture = device.createTexture({
    label: 'medical-r7-dry-original-srgb',
    size: { width: ORIGINAL.width, height: ORIGINAL.height, depthOrArrayLayers: 1 },
    format: 'rgba8unorm-srgb',
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  device.queue.copyExternalImageToTexture(
    { source: bitmap, flipY: false },
    { texture: originalTexture, colorSpace: 'srgb', premultipliedAlpha: false },
    [ORIGINAL.width, ORIGINAL.height],
  );
  bitmap.close();
}

async function init() {
  if (!navigator.gpu) throw new Error('WebGPU is required.');
  const verifiedSources = await verifyFrozenSources();
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter.');
  device = await adapter.requestDevice();
  evidence.adapter = adapter.info?.description || adapter.info?.device || 'available';
  evidence.deviceGeneration++;
  device.addEventListener('uncapturederror', event => noteError(event.error));
  device.lost.then(info => {
    if (info.reason !== 'destroyed' && !disposed) {
      active = false;
      cancelAnimationFrame(raf);
      invalidateLifecycle('device lost');
      destroyOwnedGpuResources();
      device?.destroy();
      noteError(new Error(`WebGPU device lost: ${info.message}`));
    }
  });

  context = canvas.getContext('webgpu');
  if (!context) throw new Error('Could not create WebGPU canvas context.');
  canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  evidence.format = canvasFormat;
  context.configure({ device, format: canvasFormat, alphaMode: 'opaque', colorSpace: 'srgb' });
  await loadOriginal(verifiedSources['../medical-room-vfx-r4.png']);
  const [worldBytes, blurBytes, postBytes] = await Promise.all([
    fetchVerified('../world.wgsl', 'd8f2010e8868ca822223ef51a95de827fcc72fe6e39cff103a535aaa6f2302c2'),
    fetchVerified('../blur.wgsl', 'cfdde22d84b2f3e2f5b75c164da2922d2c55d3e65745348fc76febed336f4370'),
    fetchVerified('../post.wgsl', '7aa7485c75da97994fcabfb16bc64a558a2b7420fedff65afa5e58aad4f82915'),
  ]);
  const decoder = new TextDecoder();
  device.pushErrorScope('validation');
  let validationError;
  try {
    const [worldModule, blurModule, postModule, objectModule] = await Promise.all([
      shaderModule('world', decoder.decode(worldBytes)),
      shaderModule('blur', decoder.decode(blurBytes)),
      shaderModule('post', decoder.decode(postBytes)),
      shaderModule('object-e', objectEShader),
    ]);
    worldPipeline = await device.createRenderPipelineAsync({
      label: 'medical-r7-world-mrt-pipeline',
      layout: 'auto',
      vertex: { module: worldModule, entryPoint: 'vertex' },
      fragment: { module: worldModule, entryPoint: 'fragment', targets: [{ format: 'rgba16float' }, { format: 'rgba16float' }] },
      primitive: { topology: 'triangle-list' },
    });
    blurPipeline = await device.createRenderPipelineAsync({
      label: 'medical-r7-source-blur-pipeline',
      layout: 'auto',
      vertex: { module: blurModule, entryPoint: 'vertex' },
      fragment: { module: blurModule, entryPoint: 'gaussianBlur', targets: [{ format: 'rgba16float' }] },
      primitive: { topology: 'triangle-list' },
    });
    postPipeline = await device.createRenderPipelineAsync({
      label: 'medical-r7-final-encode-pipeline',
      layout: 'auto',
      vertex: { module: postModule, entryPoint: 'vertex' },
      fragment: { module: postModule, entryPoint: 'finalEncoded', targets: [{ format: canvasFormat }] },
      primitive: { topology: 'triangle-list' },
    });
    objectPipeline = await device.createRenderPipelineAsync({
      label: 'medical-r10-object-e-restored-water-rim-pipeline',
      layout: 'auto',
      vertex: { module: objectModule, entryPoint: 'vertex' },
      fragment: { module: objectModule, entryPoint: 'fragment', targets: [{ format: 'rgba16float' }] },
      primitive: { topology: 'triangle-list' },
    });
  } catch (error) {
    validationError = await device.popErrorScope();
    throw validationError ? new Error(`WebGPU pipeline validation: ${validationError.message}; ${error.message}`) : error;
  }
  validationError = await device.popErrorScope();
  if (validationError) throw new Error(`WebGPU pipeline validation: ${validationError.message}`);

  lightUniform = device.createBuffer({ label: 'medical-r7-light-uniform-96', size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  waterUniform = device.createBuffer({ label: 'medical-r7-water-uniform-128', size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  clothUniform = device.createBuffer({ label: 'medical-r7-cloth-uniform-64', size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  blurUniformX = device.createBuffer({ label: 'medical-r7-blur-horizontal-uniform-16', size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  blurUniformY = device.createBuffer({ label: 'medical-r7-blur-vertical-uniform-16', size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  objectUniform = device.createBuffer({ label: 'medical-r8-object-e-uniform-112', size: 112, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  sampler = device.createSampler({ minFilter: 'linear', magFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
  makeWorldGroups();

  const initialWidth = Math.max(1, Math.round(canvas.clientWidth * (window.devicePixelRatio || 1)));
  const initialHeight = Math.max(1, Math.round(canvas.clientHeight * (window.devicePixelRatio || 1)));
  canvas.width = initialWidth;
  canvas.height = initialHeight;
  resizeTargets(initialWidth, initialHeight);
  active = true;
  evidence.status = 'ready';
  readiness.textContent = 'WebGPU ready · running';
  updateDiagnostics();
  raf = requestAnimationFrame(frame);
}

function setTime(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new Error('time must be finite nonnegative milliseconds');
  state.fixedTimeMs = milliseconds;
  evidence.settingsVersion++;
  updateDiagnostics();
}

function resumeClock() {
  if (state.fixedTimeMs !== null) environmentTimeMs = state.fixedTimeMs;
  state.fixedTimeMs = null;
  lastVisibleTimestamp = null;
  evidence.settingsVersion++;
  updateDiagnostics();
}

function setVisible(visible) {
  objectFixture.setContext({ visible: !!visible });
  if (!visible) {
    heldKeys.clear();
    lastObjectTimestamp = null;
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    raf = 0;
    lastVisibleTimestamp = null;
    const old = targets;
    targets = null;
    invalidateLifecycle('preview hidden or lease cancelled');
    retireTargets(old);
    return;
  }
  if (!disposed && device && evidence.status === 'ready' && document.visibilityState === 'visible') {
    if (active) return;
    active = true;
    lastVisibleTimestamp = null;
    lastObjectTimestamp = null;
    raf = requestAnimationFrame(frame);
  }
}

async function stop() {
  if (disposed) return;
  disposed = true;
  objectFixture.setContext({ visible: false, disposed: true });
  heldKeys.clear();
  active = false;
  cancelAnimationFrame(raf);
  raf = 0;
  lastVisibleTimestamp = null;
  invalidateLifecycle('preview stopped');
  try { await device?.queue.onSubmittedWorkDone(); } catch { /* device teardown already invalidated the queue */ }
  destroyOwnedGpuResources();
  device?.destroy();
  device = null;
  evidence.status = 'stopped';
  updateDiagnostics();
}

window.__medicalR10 = {
  state,
  evidence,
  setEffect,
  setFluid,
  setWater: setFluid,
  setCloth,
  setObs,
  objectFixture,
  setOriginalOnly,
  setObjectSource,
  setObjectObs,
  resetObjectSession: () => {
    objectFixture.reset(); objectTimeMs = 0; lastObjectTimestamp = null; settingsChanged();
  },
  setActorTargetImagePx: (point) => objectFixture.setPointerTarget(point),
  setSourceVisibility(value) {
    if (!Number.isFinite(value)) throw new Error('sourceVisibility must be finite');
    state.sourceVisibility = Math.max(0, Math.min(1, value));
    settingsChanged();
  },
  setTime,
  resume: resumeClock,
  setVisible,
  proveNextFrame: requestFrameProof,
  stop,
};

document.addEventListener('visibilitychange', () => {
  setVisible(document.visibilityState === 'visible');
});
window.addEventListener('resize', () => {
  if (active && !disposed && !raf) raf = requestAnimationFrame(frame);
});
window.addEventListener('pagehide', () => { void stop(); }, { once: true });

init().catch(noteError);
