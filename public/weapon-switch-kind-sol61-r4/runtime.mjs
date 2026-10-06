import {
  ABI, PASS_PLAN, VERSION, EDITION, TIMING, planFrame, planObserver, worldProjection, gunDistance
} from './source/per-kind-model.mjs';
import { playWeaponSwitchCue } from './source/sfx.mjs';
import {
  ACTIVE_LIFETIME_SECONDS, PREVIEW_RECEIPT_INTERVAL_MS, VERSION_ID,
  drawReceiptAddedWhileHeld, effectiveReceiptAge, holdReceiptSet,
  isSuccessfulWeaponSwitchReceipt, projectFixtureWorldPoint, receiptIsLive,
  resumeReceiptSet
} from './host-contract.mjs';

const VERSION_NAME = VERSION_ID;
const SOURCE_PINS = Object.freeze({
  world: '91f119d8b2068a5531a5751eea29ebf3d9214051b9f6fc5a99c90240647fec71',
  observer: 'ec62dc51a1b5558a46f60a29e823ac45d236067e4c4b9708ba840e477268b31e',
  model: '8a76bd6dc816bf0d6fc9deb5c45803551b40241fb8f6c36cbce7efa033fd0b2e',
  sfx: 'c0e1c2c0547587a70aa598a92b58cd108f74a96c63d2597cb5fb202a5825c1c5',
  contact: 'c7325262912a2fab6ccbdb99b4d6c4a43d19e75adad8f9665c833bd03c5e7a7e'
});
if (TIMING.visualEnd !== ACTIVE_LIFETIME_SECONDS || TIMING.soundEnd !== .58) throw new Error('Frozen visual/audio timing contract mismatch.');
const MAX_CAUSES = 4, MAX_UNIFORM_BUFFERS = 24, MAX_EVENTS = 300;
const SCOPE_KINDS = ['validation', 'internal', 'out-of-memory'];
const params = new URL(location.href).searchParams;
const verify = params.has('verify');
const token = params.get('galleryStartupToken');
const versionId = params.get('galleryVersionId') || VERSION;
const epoch = Number(params.get('galleryAttemptEpoch'));
const embedded = params.has('embed');
const canvas = document.querySelector('#view'), status = document.querySelector('#status');
const selection = document.querySelector('#variant');
const controls = Object.fromEntries(['main', 'dock', 'source', 'observer', 'extra', 'motionDetail', 'face', 'reducedMotion']
  .map(key => [key, document.querySelector(`#${key}`)]));
const shaderUrls = {
  world: new URL('./source/weapon-switch.wgsl', import.meta.url),
  observer: new URL('./source/observer.wgsl', import.meta.url),
  model: new URL('./source/per-kind-model.mjs', import.meta.url),
  sfx: new URL('./source/sfx.mjs', import.meta.url),
  contact: new URL('./source/contact-model.mjs', import.meta.url)
};
const sourceHashes = Object.create(null), events = [];
const active = new Set(), seen = new Set(), proofWaiters = new Set(), owned = new Set();
const localScope = Object.freeze({
  roomId: `gallery-room-${crypto.randomUUID()}`,
  ownerId: `gallery-owner-${crypto.randomUUID()}`,
  leaseId: `gallery-lease-${crypto.randomUUID()}`
});
const state = {
  phase: 'child-document', sequence: 0, frameSerial: 0, submittedFrames: 0, passes: 0,
  generation: 0, deviceGeneration: 0, targetGeneration: 0,
  initialized: false, ready: false, held: false, disposed: false, lost: false,
  resizePending: true, frameBusy: false, framePending: false, clearPending: false,
  loop: false, ticking: false, heldFramePending: false, device: null, context: null, audio: null, audioEnabled: false,
  muted: verify || params.get('mute') === '1', cause: null, latestError: null,
  inFlightUniformBuffers: 0, owned, active, seen, proofWaiters, scopeIds: localScope
};
const live = () => !state.disposed && !state.lost;
const isThenable = value => value !== null && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function';
const event = (kind, details = {}) => {
  events.push({ at: performance.now(), kind, ...details });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
};
function emit(stage, result, extra = {}) {
  state.phase = stage;
  const msg = { schema: 'dva-gallery-startup/v1', token, versionId, attemptEpoch: epoch,
    sequence: ++state.sequence, stage, status: result, ...extra };
  if (token && versionId && Number.isSafeInteger(epoch)) parent.postMessage(msg, location.origin);
  event('startup', msg);
}
function snapshot() {
  return Object.freeze({ schema: 'dva-weapon-switch-snapshot/v1', version: VERSION,
    creativeEdition: EDITION.number, phase: state.phase, initialized: state.initialized,
    ready: state.ready, generation: state.generation, deviceGeneration: state.deviceGeneration,
    targetGeneration: state.targetGeneration, frameSerial: state.frameSerial,
    submittedFrames: state.submittedFrames, passes: state.passes,
    cause: state.cause && { id: state.cause.id, variant: state.cause.variant, x: state.cause.x, y: state.cause.y,
      generation: state.cause.generation, receivedAt: state.cause.receivedAt, startedAt: state.cause.startedAt,
      scope: { ...state.cause.scope }, held: state.held, sfxAttempted: state.cause.sfxAttempted,
      completedGpuProof: state.cause.completedGpuProof && { ticketId: state.cause.completedGpuProof.ticketId,
        completed: state.cause.completedGpuProof.completed, scopeErrors: state.cause.completedGpuProof.scopeErrors,
        targetGeneration: state.cause.completedGpuProof.targetGeneration, pixelMeasured: false } },
    activeCount: active.size, sourceHashes: { ...sourceHashes }, inFlightUniformBuffers: state.inFlightUniformBuffers,
    latestError: state.latestError, resizePending: state.resizePending, targetCount: state.owned.size,
    held: state.held, verify, audioEnabled: state.audioEnabled, audioState: state.audio?.state || null,
    events: events.slice() });
}
window.__weaponSwitchSnapshot = snapshot;

function boundedError(error) {
  return { name: String(error?.name || 'Error').slice(0, 120), message: String(error?.message || error).slice(0, 1600),
    code: String(error?.code || 'WEBGPU_FRAME_FAILED').slice(0, 120) };
}
function fail(error, stage = state.phase) {
  const info = boundedError(error);
  state.latestError = info;
  status.textContent = `${stage}: ${info.name}: ${info.message}`;
  status.classList.add('is-error');
  emit(stage, 'error', { error: info });
  for (const cause of active) cancelCauseSfx(cause);
  return info;
}
async function fetchPinned(key) {
  const response = await fetch(shaderUrls[key], { cache: 'no-store' });
  if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status} loading ${key}`), { code: 'SOURCE_HTTP_ERROR' });
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
  sourceHashes[key] = hash;
  if (hash !== SOURCE_PINS[key]) throw Object.assign(new Error(`${key} source hash mismatch (${hash})`), { code: 'SOURCE_PIN_MISMATCH' });
  return { bytes, text: new TextDecoder().decode(bytes), hash };
}
const align = (n, a = 256) => Math.ceil(n / a) * a;
function resizeCanvas() {
  if (!live()) return false;
  const dpr = Math.max(1, devicePixelRatio || 1), rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr)), height = Math.max(1, Math.round(rect.height * dpr));
  state.resizePending = false;
  if (width === lastWidth && height === lastHeight) return false;
  lastWidth = width; lastHeight = height; canvas.width = width; canvas.height = height;
  state.targetGeneration++;
  retireTargets();
  refreshCauseTargetScopes();
  state.clearPending = true;
  if (state.held) state.heldFramePending = true;
  return true;
}
let lastWidth = 0, lastHeight = 0, canvasFormat = null, currentSet = null, raf = 0, resizeObserver = null;
let worldPipeline, observerPipeline, compositePipeline;
let worldLayout, observerLayout, compositeLayout;
function makeTargetSet() {
  const device = state.device, width = lastWidth, height = lastHeight;
  const usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
  const set = {
    main: device.createTexture({ label: 'weapon kind main world', size: [width, height], format: 'rgba16float', usage }),
    source: device.createTexture({ label: 'weapon kind isolated source MRT', size: [width, height], format: 'rgba16float', usage }),
    observer: device.createTexture({ label: 'weapon kind observer/composite input', size: [width, height], format: canvasFormat, usage }),
    width, height, targetGeneration: state.targetGeneration, buffers: [], lastUse: Promise.resolve(),
    useSerial: 0, retired: false, destroyed: false
  };
  owned.add(set); currentSet = set;
  return set;
}
function disposeTargetSet(set) {
  if (!set || set.destroyed) return;
  set.destroyed = true;
  for (const key of ['main', 'source', 'observer']) { try { set[key].destroy(); } catch {} }
  for (const buffer of set.buffers.splice(0)) destroyUniform(buffer);
  owned.delete(set);
  if (currentSet === set) currentSet = null;
}
function retireTargets() {
  for (const set of [...owned]) {
    set.retired = true;
    const completion = set.lastUse;
    if (isThenable(completion)) completion.then(() => disposeTargetSet(set), () => disposeTargetSet(set));
    else disposeTargetSet(set);
  }
  currentSet = null;
}
function refreshCauseTargetScopes() {
  for (const cause of active) {
    cause.receipt = { ...cause.receipt, deviceGeneration: state.deviceGeneration, targetGeneration: state.targetGeneration };
    cause.scope = { ...cause.scope, deviceGeneration: state.deviceGeneration, targetGeneration: state.targetGeneration, current: true };
    cause.completedGpuProof = null;
  }
}
function createUniform(set, values, label) {
  if (!(values instanceof Float32Array) || values.byteLength !== ABI.bytes) throw new Error('Expected the frozen 64-byte core ABI.');
  if (state.inFlightUniformBuffers >= MAX_UNIFORM_BUFFERS) throw Object.assign(new Error('GPU uniform retirement pressure.'), { code: 'GPU_RESOURCE_LIMIT' });
  const buffer = state.device.createBuffer({ label, size: ABI.bytes, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  state.device.queue.writeBuffer(buffer, 0, values);
  set.buffers.push(buffer); state.inFlightUniformBuffers++;
  return buffer;
}
function destroyUniform(buffer) {
  if (!buffer || buffer.__weaponSwitchDestroyed) return;
  buffer.__weaponSwitchDestroyed = true;
  try { buffer.destroy(); } catch {}
  state.inFlightUniformBuffers = Math.max(0, state.inFlightUniformBuffers - 1);
}
const flags = () => ({ mainOn: controls.main.checked, dockOn: controls.dock.checked,
  sourceOn: controls.source.checked, observerOn: controls.observer.checked,
  extraOn: controls.extra.checked, motionDetail: controls.motionDetail.checked,
  faceOn: controls.face.checked, reducedMotion: controls.reducedMotion.checked || matchMedia('(prefers-reduced-motion: reduce)').matches });
function liveAge(cause, now = performance.now()) { return effectiveReceiptAge(cause, now); }
function makePlan(cause, age, options = flags()) {
  const viewport = { width: lastWidth, height: lastHeight,
    centerX: lastWidth * .5 + cause.x * Math.max(1, devicePixelRatio || 1),
    centerY: lastHeight * .5 + cause.y * Math.max(1, devicePixelRatio || 1),
    h: 64 * Math.max(1, devicePixelRatio || 1) };
  const plan = planFrame({ receipt: cause.receipt, scope: cause.scope, ageSeconds: age, viewport, settings: options });
  return { plan, viewport, age };
}
const SUPPORT_POINTS = Object.freeze([
  [0, 0], [.22, -.025], [.25, -.025], [.29, -.025], [.30, -.025], [.17, -.025],
  [-.045, .135], [.09, .15], [-.245, .01], [.075, -.105]
]);
const smooth01 = x => { const v = Math.max(0, Math.min(1, x)); return v * v * (3 - 2 * v); };
function geometrySupport(cause, frame, options) {
  if (!frame.plan.active || options.mainOn === false) return null;
  const v = cause.variant, t = frame.age, h = frame.viewport.h;
  const onset = smooth01((t - .06) / .08), fade = 1 - smooth01((t - .57) / .21);
  if (!(onset > 0 && fade > 0)) return null;
  const aa = Math.max(1 / h, .002);
  for (const [x, y] of SUPPORT_POINTS) {
    const projection = worldProjection(x, y, v, t, aa, options);
    const distance = gunDistance(projection.x, projection.y, v);
    const centerX = frame.viewport.centerX + projection.x * h;
    const centerY = frame.viewport.centerY + projection.y * h;
    const inside = centerX >= 0 && centerX < lastWidth && centerY >= 0 && centerY < lastHeight;
    if (inside && projection.mask > 0 && distance <= .019) {
      return Object.freeze({ supportArea: 1 / (h * h), pixelMeasured: false, point: [x, y],
        projected: [projection.x, projection.y], signedDistance: distance, phaseAge: t });
    }
  }
  return null;
}
function scopeForCause(cause) {
  return { roomId: cause.scope.roomId, ownerId: cause.scope.ownerId, leaseId: cause.scope.leaseId,
    generation: cause.scope.generation, deviceGeneration: cause.scope.deviceGeneration,
    targetGeneration: cause.scope.targetGeneration, current: cause.scope.current === true };
}
function ticketStillCurrent(ticket) {
  return live() && state.device === ticket.device && state.context === ticket.context &&
    state.deviceGeneration === ticket.deviceGeneration && state.targetGeneration === ticket.targetGeneration &&
    currentSet === ticket.set && !ticket.set.retired && !ticket.set.destroyed &&
    ticket.set.width === lastWidth && ticket.set.height === lastHeight &&
    ticket.width === canvas.width && ticket.height === canvas.height && ticket.presentationTexture &&
    ticket.presentationView && ticket.ticketId > 0;
}
function createProof(capture, causeCapture) {
  return Object.freeze({
    ticket: capture, ticketId: capture.ticketId, completed: true, scopeErrors: null, activeDrawSubmitted: true,
    mainEnabled: causeCapture.plan.uniforms[8] === 1,
    pixelMeasured: false, causeId: causeCapture.cause.id, receiptGeneration: causeCapture.cause.generation,
    roomId: causeCapture.scope.roomId, ownerId: causeCapture.scope.ownerId, leaseId: causeCapture.scope.leaseId,
    device: capture.device, deviceGeneration: capture.deviceGeneration,
    targetGeneration: capture.targetGeneration, set: capture.set,
    sourceHash: sourceHashes.world, activeGeometrySupport: causeCapture.support,
    submittedFrame: capture.frameSerial, completedAt: performance.now(), ageAtSubmit: causeCapture.age
  });
}
function completedCauseProof(cause, proof) {
  return !!proof && proof.completed === true && proof.scopeErrors === null &&
    proof.activeDrawSubmitted === true && proof.mainEnabled === true &&
    proof.pixelMeasured === false && proof.causeId === cause.id &&
    proof.receiptGeneration === cause.scope.generation && proof.roomId === cause.scope.roomId &&
    proof.ownerId === cause.scope.ownerId && proof.leaseId === cause.scope.leaseId &&
    proof.device === state.device && proof.deviceGeneration === state.deviceGeneration &&
    proof.targetGeneration === state.targetGeneration && proof.set === currentSet &&
    proof.sourceHash === SOURCE_PINS.world && sourceHashes.world === SOURCE_PINS.world &&
    proof.activeGeometrySupport?.supportArea > 0;
}
function settleProofWaiter(waiter, proof) {
  if (waiter.done) return;
  waiter.done = true; clearTimeout(waiter.timer); proofWaiters.delete(waiter);
  if (waiter.cause.sfxWaitCancel === waiter.cancel) waiter.cause.sfxWaitCancel = null;
  waiter.resolve(proof);
}
function publishCompletedProof(cause, proof) {
  if (!cause || cause.cleared || !active.has(cause) || cause.generation !== proof.receiptGeneration ||
    !ticketStillCurrent(proof.ticket) || !completedCauseProof(cause, proof)) return false;
  cause.completedGpuProof = proof;
  for (const waiter of [...proofWaiters]) if (waiter.cause === cause) settleProofWaiter(waiter, proof);
  event('completed-proof', { causeId: cause.id, variant: cause.variant, generation: cause.generation,
    targetGeneration: proof.targetGeneration, ticketId: proof.ticketId, pixelMeasured: false });
  return true;
}
function waitForCompletedProof(cause, deadline) {
  const previous = cause.completedGpuProof;
  if (previous && completedCauseProof(cause, previous)) return { promise: Promise.resolve(previous), cancel: () => {} };
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  const waiter = { cause, resolve, done: false, timer: null, cancel: null };
  waiter.cancel = () => settleProofWaiter(waiter, null);
  waiter.timer = setTimeout(() => settleProofWaiter(waiter, null), Math.max(0, deadline - performance.now()));
  proofWaiters.add(waiter); cause.sfxWaitCancel = waiter.cancel;
  return { promise, cancel: waiter.cancel };
}
function cancelCauseSfx(cause, suppress = true) {
  if (!cause) return;
  if (suppress) cause.sfxSuppressed = true;
  if (cause.sfxWaitCancel) { try { cause.sfxWaitCancel(); } catch {} cause.sfxWaitCancel = null; }
  if (cause.sfx) { try { cause.sfx.cancel(); } catch {} cause.sfx = null; }
}
function sfxEnvironmentReady(context = state.audio) {
  return !verify && !params.has('verify') && live() && state.initialized && state.ready && !!state.device &&
    !state.muted && !state.latestError && !!context && context === state.audio && context.state === 'running';
}
function requestCauseSfx(cause, { resumePromise = Promise.resolve(), allowUnlock = false } = {}) {
  if (!cause || cause.sfxAttempted || state.held || cause.sfxSuppressed || !live() ||
    state.cause !== cause || !active.has(cause) || cause.cleared || state.muted || state.latestError || verify) return null;
  const context = state.audio;
  if (!context || (!allowUnlock && (!state.audioEnabled || context.state !== 'running'))) return null;
  const admittedAt = performance.now(), admissionAge = (admittedAt - cause.receivedAt) / 1000;
  if (!Number.isFinite(admissionAge) || admissionAge < 0 || admissionAge > .06) return null;
  cause.sfxAdmittedAt = admittedAt; cause.sfxAdmissionAge = admissionAge; cause.sfxAttempted = true;
  const deadline = cause.receivedAt + 580, proofWait = waitForCompletedProof(cause, deadline);
  cause.sfxWaitCancel = proofWait.cancel;
  cause.sfxPromise = Promise.all([Promise.resolve(resumePromise), proofWait.promise]).then(([, proof]) => {
    const playedAt = performance.now(), age = (playedAt - cause.receivedAt) / 1000;
    const admissionCurrent = cause.sfxAdmittedAt === admittedAt && cause.sfxAdmissionAge === admissionAge &&
      admissionAge >= 0 && admissionAge <= .06;
    if (!sfxEnvironmentReady(context) || state.held || state.cause !== cause || !active.has(cause) || cause.cleared ||
      cause.sfxSuppressed || cause.sfx || !admissionCurrent || !completedCauseProof(cause, proof) ||
      !Number.isFinite(age) || age < 0 || age + .004 >= .58) {
      event('sfx-suppressed', { causeId: cause.id, variant: cause.variant, age, reason: 'stale receipt or proof window closed' });
      return { state: 'stale', reason: 'same-cause current proof or 580 ms seek window expired' };
    }
    cause.sfxWaitCancel = null;
    const cue = playWeaponSwitchCue(context, context.destination, { verify: false, muted: state.muted, age, variant: cause.variant });
    if (!cue) return { state: 'stale', reason: 'sound window ended before scheduling' };
    cause.sfx = cue; event('sfx-started', { causeId: cause.id, variant: cause.variant, age, ticketId: proof.ticketId });
    return { state: 'active' };
  }, () => ({ state: 'unsupported', reason: 'AudioContext resume rejected' }));
  return cause.sfxPromise;
}

function pushFrameScopes(device) {
  let pushed = 0, failed = null;
  for (const kind of SCOPE_KINDS) {
    try { device.pushErrorScope(kind); pushed++; }
    catch (error) { failed = error; break; }
  }
  return { pushed, failed };
}
function popFrameScopes(device, count) {
  const promises = [], errors = [];
  for (let i = 0; i < count; i++) {
    try {
      const value = device.popErrorScope();
      if (!isThenable(value)) { errors.push(new Error(`popErrorScope returned a non-promise at LIFO index ${i}`)); continue; }
      promises.push(Promise.resolve(value));
    } catch (error) { errors.push(error); }
  }
  return { promises, errors };
}
function setFrameError(error, stage = 'frame') {
  fail(error, stage);
  for (const cause of active) cancelCauseSfx(cause);
}
let nextTicketId = 1;
async function drawFrame({ forceClear = false, startup = false } = {}) {
  if (!state.initialized || !live() || !lastWidth || !lastHeight) return { completed: false, reason: 'not-ready' };
  if (state.frameBusy) { state.framePending = true; return { completed: false, reason: 'already-in-flight' }; }
  const now = performance.now(), options = flags();
  const causes = forceClear ? [] : [...active].filter(c => !c.cleared && receiptIsLive(liveAge(c, now)));
  if (!causes.length && !forceClear && !state.clearPending) return { completed: false, reason: 'no-active-receipts' };
  const planned = causes.map(cause => ({ cause, ...makePlan(cause, liveAge(cause, now), options) }));
  const frames = planned.map(x => x.plan);
  const observerPlan = planObserver({ frames, viewport: { width: lastWidth, height: lastHeight,
    h: 64 * Math.max(1, devicePixelRatio || 1) }, observerOn: options.observerOn });
  if (planned.length > MAX_CAUSES) throw new Error('Core active-cause limit exceeded.');
  if (state.inFlightUniformBuffers + planned.length + 1 > MAX_UNIFORM_BUFFERS) {
    setFrameError(Object.assign(new Error('GPU uniform retirement pressure; no frame proof issued.'), { code: 'GPU_RESOURCE_LIMIT' }));
    return { completed: false, reason: 'resource-limit' };
  }
  let set = currentSet;
  if (!set || set.retired || set.targetGeneration !== state.targetGeneration) {
    if (owned.size >= 4) {
      setFrameError(Object.assign(new Error('Previous render targets have not retired.'), { code: 'GPU_RESOURCE_LIMIT' }));
      return { completed: false, reason: 'target-retire-limit' };
    }
    set = makeTargetSet();
  }
  const device = state.device, context = state.context, frameSerial = state.frameSerial + 1;
  const scopeStart = pushFrameScopes(device);
  if (scopeStart.failed) {
    const drain = popFrameScopes(device, scopeStart.pushed);
    await Promise.allSettled(drain.promises);
    setFrameError(Object.assign(scopeStart.failed, { code: 'GPU_SCOPE_PUSH_FAILED' }));
    return { completed: false, reason: 'scope-push-failed' };
  }
  state.frameBusy = true;
  const frameBuffers = [], causeCaptures = [];
  let presentationTexture = null, presentationView = null, ticket = null, submitted = false;
  let popResult = { promises: [], errors: [] }, queuePromise = null, syncError = null;
  try {
    const encoder = device.createCommandEncoder({ label: `weapon-kind-${frameSerial}` });
    const clear = { r: 0, g: 0, b: 0, a: 0 };
    const attachments = [
      { view: set.main.createView(), clearValue: clear, loadOp: 'clear', storeOp: 'store' },
      { view: set.source.createView(), clearValue: clear, loadOp: 'clear', storeOp: 'store' }
    ];
    const worldPass = encoder.beginRenderPass({ colorAttachments: attachments });
    worldPass.setPipeline(worldPipeline);
    for (const frame of planned) {
      const buffer = createUniform(set, frame.plan.uniforms, `world-uniform-${frame.cause.id}`);
      frameBuffers.push(buffer);
      const bindGroup = device.createBindGroup({ layout: worldLayout, entries: [{ binding: 0, resource: { buffer } }] });
      worldPass.setBindGroup(0, bindGroup); worldPass.draw(3);
      const support = geometrySupport(frame.cause, frame, options);
      causeCaptures.push({ cause: frame.cause, plan: frame.plan, scope: scopeForCause(frame.cause),
        age: frame.age, support });
    }
    worldPass.end();
    const observerUniform = createUniform(set, observerPlan.uniforms, 'observer-union-uniform'); frameBuffers.push(observerUniform);
    const observerGroup = device.createBindGroup({ layout: observerLayout, entries: [
      { binding: 0, resource: set.main.createView() }, { binding: 1, resource: set.source.createView() },
      { binding: 2, resource: { buffer: observerUniform } }
    ] });
    const observerPass = encoder.beginRenderPass({ colorAttachments: [
      { view: set.observer.createView(), clearValue: clear, loadOp: 'clear', storeOp: 'store' }
    ] });
    observerPass.setPipeline(observerPipeline); observerPass.setBindGroup(0, observerGroup); observerPass.draw(3); observerPass.end();
    presentationTexture = context.getCurrentTexture();
    presentationView = presentationTexture.createView();
    const compositeGroup = device.createBindGroup({ layout: compositeLayout, entries: [{ binding: 0, resource: set.observer.createView() }] });
    const compositePass = encoder.beginRenderPass({ colorAttachments: [
      { view: presentationView, clearValue: clear, loadOp: 'clear', storeOp: 'store' }
    ] });
    compositePass.setPipeline(compositePipeline); compositePass.setBindGroup(0, compositeGroup); compositePass.draw(3); compositePass.end();
    device.queue.submit([encoder.finish()]); submitted = true;
    if (typeof device.queue.onSubmittedWorkDone !== 'function') throw new Error('GPU queue completion API unavailable.');
    queuePromise = device.queue.onSubmittedWorkDone();
    if (!isThenable(queuePromise)) throw new Error('GPU queue completion did not return a promise.');
    popResult = popFrameScopes(device, scopeStart.pushed);
    const useSerial = ++set.useSerial;
    ticket = Object.freeze({ ticketId: nextTicketId++, device, context, deviceGeneration: state.deviceGeneration,
      targetGeneration: state.targetGeneration, set, width: canvas.width, height: canvas.height,
      presentationTexture, presentationView, frameSerial, causeCaptures, useSerial, scopeErrors: popResult.errors.slice() });
    const submittedBuffers = set.buffers.splice(0);
    state.submittedFrames++; state.passes += ABI.passes; state.frameSerial = frameSerial;
    set.lastUse = Promise.allSettled([queuePromise, ...popResult.promises]).then(() => undefined);
    const results = await Promise.allSettled([queuePromise, ...popResult.promises]);
    const queueResult = results[0];
    const scopeResults = results.slice(1);
    const scopeErrors = [...popResult.errors];
    for (const result of scopeResults) {
      if (result.status !== 'fulfilled') scopeErrors.push(result.reason);
      else if (result.value !== null) scopeErrors.push(result.value);
    }
    if (queueResult.status !== 'fulfilled') throw Object.assign(queueResult.reason, { code: 'GPU_SUBMISSION_FAILED' });
    if (scopeErrors.length) throw Object.assign(new Error(`GPU error scopes were not clean: ${scopeErrors.map(x => x?.message || String(x)).join('; ')}`), { code: 'GPU_SCOPE_ERROR', scopeErrors });
    ticket = Object.freeze({ ...ticket, scopeErrors: null });
    if (!ticketStillCurrent(ticket)) {
      event('stale-ticket', { ticketId: ticket.ticketId, frameSerial, targetGeneration: ticket.targetGeneration });
      return { completed: true, current: false, ticketId: ticket.ticketId };
    }
    state.latestError = null;
    if (!status.classList.contains('is-error')) status.textContent = causes.length ? 'Weapon switch preview active.' : 'WebGPU ready; waiting for a successful receipt.';
    for (const capture of causeCaptures) {
      if (!capture.support) continue;
      const proof = createProof(ticket, capture);
      if (publishCompletedProof(capture.cause, proof)) event('cause-frame-completed', {
        causeId: capture.cause.id, variant: capture.cause.variant, frameSerial,
        proof: { causeId: proof.causeId, receiptGeneration: proof.receiptGeneration,
          targetGeneration: proof.targetGeneration, activeDrawSubmitted: proof.activeDrawSubmitted,
          completed: true, scopeErrors: null, pixelMeasured: false }
      });
    }
    state.clearPending = causes.length === 0;
    return { completed: true, current: true, ticketId: ticket.ticketId, frameSerial, causeCount: causes.length, ticket };
  } catch (error) {
    syncError = error;
    if (queuePromise || popResult.promises.length || popResult.errors.length) {
      // The ticket never proves success after a synchronous submit/pop failure.
      const remaining = Math.max(0, scopeStart.pushed - popResult.promises.length - popResult.errors.length);
      if (remaining) {
        const recovery = popFrameScopes(device, remaining);
        await Promise.allSettled(recovery.promises);
      }
      if (queuePromise) await Promise.allSettled([queuePromise]);
    } else {
      popResult = popFrameScopes(device, scopeStart.pushed);
      await Promise.allSettled(popResult.promises);
    }
    setFrameError(error, 'frame-submit');
    return { completed: false, reason: 'submit-or-scope-failed' };
  } finally {
    if (submitted && ticket?.set) {
      const fence = ticket.set.lastUse;
      fence.then(() => { for (const buffer of frameBuffers) destroyUniform(buffer); if (set.retired && set.useSerial === ticket.useSerial) disposeTargetSet(set); }, () => { for (const buffer of frameBuffers) destroyUniform(buffer); });
    } else {
      for (const buffer of frameBuffers) destroyUniform(buffer);
    }
    state.frameBusy = false;
    if (syncError) event('frame-failure', { code: syncError.code || 'FRAME_FAILED', message: String(syncError.message || syncError).slice(0, 500) });
    if (state.framePending) { state.framePending = false; scheduleFrame(); }
    else if (state.heldFramePending && live()) scheduleFrame();
    else if (active.size && live() && !state.held && !state.latestError) scheduleFrame();
  }
}

function scheduleFrame() {
  if (!live() || !state.initialized || (state.held && !state.heldFramePending) || state.latestError) return;
  if (state.frameBusy) { state.framePending = true; return; }
  if (raf) return;
  if (active.size || state.clearPending || state.heldFramePending) raf = requestAnimationFrame(tick);
}
async function tick() {
  raf = 0;
  if (!live() || (state.held && !state.heldFramePending) || state.frameBusy) return;
  state.ticking = true;
  try {
    if (!state.held) {
      const now = performance.now();
      for (const cause of [...active]) if (!receiptIsLive(liveAge(cause, now))) expireCause(cause);
    }
    const forceClear = active.size === 0;
    if (!active.size && !forceClear) return;
    if (state.held) state.heldFramePending = false;
    await drawFrame({ forceClear });
  } finally { state.ticking = false; }
}
function expireCause(cause) {
  if (!cause || cause.cleared) return;
  cancelCauseSfx(cause); cause.cleared = true; cause.expiredAt = performance.now(); active.delete(cause);
  if (state.cause === cause) state.cause = [...active].sort((a, b) => a.receivedAt - b.receivedAt).at(-1) || null;
  state.clearPending = active.size === 0;
  event('receipt-expired', { id: cause.id, variant: cause.variant, generation: cause.generation });
  if (!state.ticking) scheduleFrame();
}
function scopeFromInput(input, generation, fixtureSelection) {
  if (fixtureSelection) return { roomId: localScope.roomId, ownerId: localScope.ownerId, leaseId: localScope.leaseId,
    generation, deviceGeneration: state.deviceGeneration, targetGeneration: state.targetGeneration, current: true };
  const scope = input.scope;
  if (!scope || !['roomId', 'ownerId', 'leaseId'].every(k => typeof scope[k] === 'string' && scope[k].length > 0) ||
    !['generation', 'deviceGeneration', 'targetGeneration'].every(k => Number.isSafeInteger(scope[k]) && scope[k] >= 0) ||
    scope.deviceGeneration !== state.deviceGeneration || scope.targetGeneration !== state.targetGeneration || scope.current !== true) return null;
  return { roomId: scope.roomId, ownerId: scope.ownerId, leaseId: scope.leaseId,
    generation: scope.generation, deviceGeneration: scope.deviceGeneration,
    targetGeneration: scope.targetGeneration, current: true };
}
function admitReceipt(input, receivedAt = performance.now(), fixtureSelection = false) {
  if (!live() || !isSuccessfulWeaponSwitchReceipt(input) || seen.has(input.id)) return false;
  if (embedded && params.has('galleryVersionId') && params.get('galleryVersionId') !== VERSION) return false;
  const generation = fixtureSelection ? ++state.generation : input.scope?.generation;
  if (!Number.isSafeInteger(generation) || generation < 0) return false;
  if (!fixtureSelection) state.generation = Math.max(state.generation, generation);
  const scope = scopeFromInput(input, generation, fixtureSelection);
  if (!scope) { event('receipt-rejected', { id: input.id, reason: 'scope is absent, stale, or mismatched' }); return false; }
  const receipt = fixtureSelection ? { ...input, ...scope } : { ...input, ...scope };
  const age = (performance.now() - receivedAt) / 1000;
  if (!receiptIsLive(age)) return false;
  seen.add(input.id); if (seen.size > 512) seen.delete(seen.values().next().value);
  if (fixtureSelection) {
    for (const prior of [...active]) if (prior.fixtureSelection) expireCause(prior);
  }
  if (active.size >= MAX_CAUSES) {
    const oldest = [...active].sort((a, b) => a.receivedAt - b.receivedAt)[0];
    expireCause(oldest);
  }
  const projected = projectFixtureWorldPoint(receipt.x, receipt.y, lastWidth || canvas.width, lastHeight || canvas.height,
    Math.max(1, devicePixelRatio || 1));
  const cause = {
    ...receipt, x: projected.x, y: projected.y, id: input.id, variant: input.variant, generation,
    receipt: { ...receipt, x: projected.x, y: projected.y },
    receivedAt, startedAt: receivedAt, cleared: false, fixtureSelection, scope, sfx: null, sfxAttempted: false,
    sfxSuppressed: state.held, sfxPromise: null, sfxAdmittedAt: null, sfxAdmissionAge: null,
    sfxWaitCancel: null, completedGpuProof: null
  };
  active.add(cause); state.cause = cause; state.clearPending = false;
  event('receipt', { id: cause.id, variant: cause.variant, generation, fixtureSelection,
    roomId: scope.roomId, ownerId: scope.ownerId, leaseId: scope.leaseId, targetGeneration: scope.targetGeneration });
  if (state.held) { drawReceiptAddedWhileHeld(state, cause, performance.now(), () => {}); state.heldFramePending = true; scheduleFrame(); }
  else scheduleFrame();
  if (state.audioEnabled) requestCauseSfx(cause);
  return true;
}
function cancelCurrent() {
  for (const cause of [...active]) expireCause(cause);
  for (const waiter of [...proofWaiters]) settleProofWaiter(waiter, null);
  state.cause = null; state.generation++;
  if (raf) cancelAnimationFrame(raf); raf = 0;
  state.clearPending = true;
  scheduleFrame();
}
function dispose(reason = 'disposed') {
  if (state.disposed) return;
  if (raf) cancelAnimationFrame(raf); raf = 0;
  for (const cause of [...active]) { cancelCauseSfx(cause); cause.cleared = true; active.delete(cause); }
  for (const waiter of [...proofWaiters]) settleProofWaiter(waiter, null);
  state.cause = null; state.disposed = true; state.ready = false; state.loop = false;
  resizeObserver?.disconnect(); window.removeEventListener('resize', handleResize);
  state.audio?.close?.().catch?.(() => {});
  if (reason !== 'device-lost' && reason !== 'startup-error') emit('playing', 'cancelled', { error: { code: 'RETIRED', message: reason } });
  for (const set of [...owned]) {
    set.retired = true;
    if (isThenable(set.lastUse)) set.lastUse.then(() => disposeTargetSet(set), () => disposeTargetSet(set));
    else disposeTargetSet(set);
  }
  const device = state.device, retiring = [...owned];
  Promise.all(retiring.map(set => Promise.resolve(set.lastUse).catch(() => {}))).finally(() => { try { device?.destroy?.(); } catch {} });
}
window.__weaponSwitchDispose = dispose;
window.__weaponSwitchHold = age => {
  if (!live() || state.held) return false;
  const requested = Number.isFinite(Number(age)) ? Number(age) : null;
  const didHold = holdReceiptSet(state, performance.now(), requested, () => {});
  if (didHold) { for (const cause of active) cancelCauseSfx(cause); state.heldFramePending = true; scheduleFrame(); }
  return didHold;
};
window.__weaponSwitchResume = () => {
  if (!live() || !state.held) return false;
  resumeReceiptSet(state, performance.now()); scheduleFrame(); return true;
};
function handleResize() {
  state.resizePending = true;
  if (!state.initialized) return;
  resizeCanvas(); scheduleFrame();
}
window.addEventListener('pagehide', () => dispose('pagehide'), { once: true });
window.addEventListener('resize', handleResize);
resizeObserver = new ResizeObserver(handleResize); resizeObserver.observe(canvas);

window.__weaponSwitchReceipt = (inputOrId, x, y, variant) => {
  const input = typeof inputOrId === 'object' ? inputOrId : { id: inputOrId, x, y, variant };
  return admitReceipt(input, performance.now(), false);
};
window.__weaponSwitchFixtureSelection = input => {
  if (!input || typeof input !== 'object') return false;
  return admitReceipt(input, performance.now(), true);
};
window.addEventListener('message', eventMessage => {
  if (eventMessage.source !== parent || eventMessage.origin !== location.origin) return;
  const data = eventMessage.data;
  if (data?.schema === 'dva-gallery-startup/v1' && data.action === 'retire' && data.token === token &&
    data.versionId === versionId && data.attemptEpoch === epoch) { dispose('retired'); return; }
  if (data?.schema === 'dva-weapon-switch-receipt/v1') admitReceipt(data.receipt, performance.now(), false);
});
selection?.addEventListener('change', event => {
  if (state.initialized) window.__weaponSwitchFixtureSelection({
    id: `manual-fixture-${crypto.randomUUID()}`, x: .5, y: .5, variant: Number(event.target.value)
  });
});
document.querySelector('#hold')?.addEventListener('click', () => window.__weaponSwitchHold());
document.querySelector('#resume')?.addEventListener('click', () => window.__weaponSwitchResume());
for (const input of Object.values(controls)) input?.addEventListener('change', scheduleFrame);

function isAudioEnvironmentReady(context = state.audio) {
  return !verify && live() && state.initialized && state.ready && !state.muted && !state.latestError &&
    context && context === state.audio && context.state === 'running';
}
window.__gallerySfx = Object.freeze({
  activateFromGesture() {
    if (verify || params.has('verify')) return Promise.resolve({ state: 'silent', reason: 'verification mode' });
    if (!live() || !state.initialized || !state.ready || !state.device) return Promise.resolve({ state: 'unavailable', reason: 'preview not ready' });
    if (state.latestError) return Promise.resolve({ state: 'unavailable', reason: 'preview has an active error' });
    if (state.muted) return Promise.resolve({ state: 'silent', reason: 'preview is muted' });
    if (!state.audio) { try { state.audio = new AudioContext(); } catch { return Promise.resolve({ state: 'unsupported', reason: 'AudioContext creation failed' }); } }
    const context = state.audio;
    let resumePromise;
    try { resumePromise = Promise.resolve(context.resume()); }
    catch { return Promise.resolve({ state: 'unsupported', reason: 'AudioContext resume rejected' }); }
    const cause = state.cause;
    if (!state.held && cause && !cause.cleared && !cause.sfxSuppressed && active.has(cause)) requestCauseSfx(cause, { resumePromise, allowUnlock: true });
    return resumePromise.then(() => {
      if (!live() || state.audio !== context || context.state !== 'running') return { state: 'unsupported', reason: 'AudioContext did not resume' };
      state.audioEnabled = true;
      const latest = state.cause;
      if (!state.held && latest && active.has(latest) && !latest.sfxAttempted && (performance.now() - latest.receivedAt) <= 60) {
        requestCauseSfx(latest, { allowUnlock: true });
      }
      return { state: 'active', contextState: context.state };
    }, () => ({ state: 'unsupported', reason: 'AudioContext resume rejected' }));
  },
  setMuted(value) {
    state.muted = Boolean(value) || verify;
    if (state.muted) for (const cause of active) cancelCauseSfx(cause);
    return { state: state.muted ? 'muted' : 'active' };
  }
});

async function boot() {
  if (!live()) return;
  emit('child-document', 'pending'); emit('adapter', 'pending');
  if (!navigator.gpu) throw Object.assign(new Error('This preview requires WebGPU.'), { code: 'WEBGPU_UNAVAILABLE' });
  const adapter = await navigator.gpu.requestAdapter();
  if (!live()) return;
  if (!adapter) throw new Error('No WebGPU adapter.');
  emit('device', 'pending');
  state.device = await adapter.requestDevice();
  if (!live()) { state.device.destroy(); return; }
  state.deviceGeneration++;
  const device = state.device;
  device.addEventListener('uncapturederror', eventError => {
    if (!live()) return;
    setFrameError(eventError.error || new Error(eventError.message || 'Uncaptured GPU error.'), 'uncapturederror');
  });
  device.lost.then(info => {
    if (state.disposed) return;
    state.lost = true;
    setFrameError(new Error(`GPU device lost: ${info?.reason || 'unknown'} ${info?.message || ''}`), 'device-lost');
    dispose('device-lost');
  });
  state.context = canvas.getContext('webgpu');
  if (!state.context) throw new Error('Canvas could not create a WebGPU context.');
  canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  state.context.configure({ device, format: canvasFormat, alphaMode: 'premultiplied' });
  if (embedded && versionId !== VERSION) throw Object.assign(new Error(`This preview is pinned to ${VERSION}.`), { code: 'VERSION_PIN_MISMATCH' });
  emit('assets', 'pending');
  const [world, observer, model, sfx, contact] = await Promise.all(['world', 'observer', 'model', 'sfx', 'contact'].map(fetchPinned));
  if (!live()) return;
  emit('pipelines', 'pending');
  const worldModule = device.createShaderModule({ label: `${VERSION} source world MRT`, code: world.text });
  const observerModule = device.createShaderModule({ label: `${VERSION} source-bound observer`, code: observer.text });
  const compositeCode = '@group(0) @binding(0) var src:texture_2d<f32>; struct O{@builtin(position) p:vec4<f32>}; @vertex fn vs(@builtin(vertex_index)n:u32)->O{let a=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));var o:O;o.p=vec4<f32>(a[n],0.,1.);return o;} @fragment fn fs(o:O)->@location(0) vec4<f32>{return textureLoad(src,vec2<i32>(o.p.xy),0);}';
  const compositeModule = device.createShaderModule({ label: `${VERSION} retained display composite`, code: compositeCode });
  const compilation = await Promise.all([worldModule.getCompilationInfo(), observerModule.getCompilationInfo(), compositeModule.getCompilationInfo()]);
  if (!live()) return;
  const names = ['weapon-switch.wgsl', 'observer.wgsl', 'composite'];
  for (let i = 0; i < compilation.length; i++) for (const message of compilation[i].messages) {
    event('compilation-message', { module: names[i], ...message });
    if (message.type === 'error') throw Object.assign(new Error(`${names[i]}: ${message.message}`), { code: 'WGSL_COMPILE_FAILED' });
  }
  const mainBlend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
  const sourceBlend = { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
    alpha: { srcFactor: 'zero', dstFactor: 'one', operation: 'add' } };
  worldLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }] });
  observerLayout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }
  ] });
  compositeLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } }] });
  worldPipeline = device.createRenderPipeline({ label: `${VERSION} world MRT`, layout: device.createPipelineLayout({ bindGroupLayouts: [worldLayout] }),
    vertex: { module: worldModule, entryPoint: 'vs' }, fragment: { module: worldModule, entryPoint: 'fs',
      targets: [{ format: 'rgba16float', blend: mainBlend }, { format: 'rgba16float', blend: sourceBlend }] },
    primitive: { topology: 'triangle-list' } });
  observerPipeline = device.createRenderPipeline({ label: `${VERSION} union observer 9-tap`, layout: device.createPipelineLayout({ bindGroupLayouts: [observerLayout] }),
    vertex: { module: observerModule, entryPoint: 'vs' }, fragment: { module: observerModule, entryPoint: 'fs', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list' } });
  compositePipeline = device.createRenderPipeline({ label: `${VERSION} retained display conversion`, layout: device.createPipelineLayout({ bindGroupLayouts: [compositeLayout] }),
    vertex: { module: compositeModule, entryPoint: 'vs' }, fragment: { module: compositeModule, entryPoint: 'fs', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list' } });
  emit('pipelines', 'ready', { passPlan: PASS_PLAN, abiBytes: ABI.bytes, deviceGeneration: state.deviceGeneration });
  resizeCanvas(); state.initialized = true;
  const first = await drawFrame({ forceClear: true, startup: true });
  const firstTicket = first.ticket;
  if (!first.completed || !first.current || !firstTicket || firstTicket.scopeErrors !== null ||
      !ticketStillCurrent(firstTicket) || canvas.isConnected !== true || first.causeCount !== 0 ||
      !Number.isSafeInteger(firstTicket.width) || firstTicket.width < 1 ||
      !Number.isSafeInteger(firstTicket.height) || firstTicket.height < 1) {
    throw new Error('Initial GPU clear did not complete on a current connected viewport under clean scopes.');
  }
  state.ready = true;
  emit('playing', 'ready', { firstFrame: { recorded: true, submitted: true, completed: true,
    canvasConnected: canvas.isConnected === true, viewportWidth: firstTicket.width, viewportHeight: firstTicket.height,
    clearOnly: true, activeCauseCount: first.causeCount, frameSerial: firstTicket.frameSerial,
    deviceGeneration: firstTicket.deviceGeneration, actualQueueFence: true, scopeErrors: null,
    passes: ABI.passes, backingWidth: lastWidth, backingHeight: lastHeight,
    targetGeneration: firstTicket.targetGeneration, pixelMeasured: false }, versionId: VERSION, sourcePins: { ...sourceHashes } });
  status.textContent = 'WebGPU ready; awaiting a successful version-bound receipt.';
  if (!embedded) {
    state.loop = true;
    const preview = () => {
      if (!live() || !state.loop) return;
      if (!state.held) window.__weaponSwitchFixtureSelection({ id: `fixture-${crypto.randomUUID()}`, x: 0, y: 0, variant: Number(selection.value) });
      setTimeout(preview, PREVIEW_RECEIPT_INTERVAL_MS);
    };
    setTimeout(preview, 250);
  }
}
boot().catch(error => {
  if (!live()) return;
  const info = fail(error, state.phase);
  state.latestError = { ...info, sourceHashes: { ...sourceHashes }, phase: state.phase };
  dispose('startup-error');
});
