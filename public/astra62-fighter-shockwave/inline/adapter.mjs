const SCHEMA = 'dva-gallery-startup/v1';
const ROOT = '/public/astra62-fighter-shockwave/';
const ALLOW = [
  { id: 'fighter-shockwave-astra62-r1', base: ROOT + 'r1/', pins: [
    ['version.json', 1835, 'd690f9ecfc7c072d9ff03ebd6324b0f5c0c85773ecb94320b7cb9b9de0c93881'],
    ['index.html', 1155, '12df083a23fa2e47e0d7f60467e568cebb1464c5ddf506595a002d7ae0aadbeb'],
    ['preview.mjs', 6872, '3cd30f35977007cae6d00e0cf4af16fa5d796bb7b45f7deb35cbe3fce1e07003'],
    ['field.wgsl', 4084, 'dcc8a4f0a420de52ebd7b6326087938fda003fa55faf1e6575294005a7757073']
  ] },
  { id: 'fighter-shockwave-astra62-r2', base: ROOT + 'r2/', pins: [
    ['version.json', 2489, '9580a21c461b920339d9224fac7c811987c693961de7a5b50d47377f8dce6c37'],
    ['index.html', 1127, '32567b1a9803730cddfd49346a47a686d5ea8b6393d602c893e0ab4ab4e4bf3d'],
    ['preview.mjs', 6872, '3cd30f35977007cae6d00e0cf4af16fa5d796bb7b45f7deb35cbe3fce1e07003'],
    ['field.wgsl', 4676, 'cc8afdaa13215838a479e272ff1618e15affcc786fca2ec7cbaa2932628c523e']
  ] }
];
const canvas = document.getElementById('canvas');
const statusNode = document.getElementById('status');
const audioButton = document.getElementById('audio');
let config, binding, session;
try {
  config = ALLOW.find(v => location.pathname === v.base + 'inline/index.html');
  if (!config || parent === window || location.origin === 'null') throw Error('Use a registered same-origin inline route');
  const q = new URLSearchParams(location.search);
  const fields = ['galleryStartupToken', 'galleryVersionId', 'galleryAttemptEpoch'];
  if (fields.some(k => q.getAll(k).length !== 1)) throw Error('Startup binding must be explicit');
  const [token, versionId, raw] = fields.map(k => q.get(k));
  const attemptEpoch = Number(raw);
  if (versionId !== config.id || !/^[0-9a-f]{32}$/.test(token) || !/^\d+$/.test(raw) || !Number.isSafeInteger(attemptEpoch) || attemptEpoch < 1) throw Error('Invalid startup binding');
  binding = Object.freeze({ token, versionId, attemptEpoch });
  session = crypto.randomUUID();
} catch (error) {
  if (statusNode) statusNode.textContent = String(error.message || error);
  throw error;
}
const origin = location.origin;
let sequence = 0, stage = 'child-document';
function emit(data) {
  parent.postMessage({ ...data, schema: SCHEMA, ...binding, adapterSessionId: session, sequence: ++sequence }, origin);
}
function progress(next, status = 'pending', extra = {}) {
  stage = next;
  emit({ stage, status, ...extra });
}
progress('child-document', 'pending', { sourcePins: null });

const nativeFetch = window.fetch.bind(window);
const nativeRAF = window.requestAnimationFrame.bind(window);
const nativeCancelRAF = window.cancelAnimationFrame.bind(window);
const eventAdd = EventTarget.prototype.addEventListener;
const eventRemove = EventTarget.prototype.removeEventListener;
const abort = new AbortController();
const bootOps = new Set(), proofs = new Set(), audioOps = new Set();
const scheduled = new Set(), devices = [], buffers = [], contexts = [], audios = [];
const scenes = new WeakMap(), bindGroups = new WeakMap(), commands = new WeakMap();
const views = new WeakMap(), textures = new WeakSet();
const restorations = [], listeners = [], observers = [], ownedNodes = [];
const sourceDocumentListeners = [], controlHandlers = [];
const errors = [], incompleteResources = [];
let retiring = false, retirementTask, bootTask, bootSettled = false;
let pendingDevices = 0, generation = 1, lastPhase = null;
let activeFrame = null, firstReady = false, imported = false, failed = false;
let originalSfx, exposedSfx, sfxStopTask;
let originalHide, hideDelivered = false, hideEvent;
let hooksRestored = false, listenersRemoved = false, observersDisconnected = false;
let sourceDocumentListenersRemoved = false, sourceControlHandlersRemoved = false;
let terminalScheduled = false;
let verification = new URL(location.href).searchParams.has('verify');
try { verification ||= new URL(parent.location.href).searchParams.has('verify'); } catch { /* Messages still require the bound origin and parent. */ }
class Cancelled extends Error { constructor() { super('Adapter retirement'); this.name = 'AdapterCancellation'; } }
const text = e => String(e?.message || e);
const checkpoint = () => new Promise(resolve => setTimeout(resolve, 0));
function record(label, error) { errors.push(label + ': ' + text(error)); }
function incomplete(label, error) {
  const detail = label + ': ' + text(error);
  incompleteResources.push(detail);
  errors.push(detail);
}
function fail(error) {
  if (error instanceof Cancelled) return;
  if (retiring) { record('shutdown', error); return; }
  if (!failed) {
    failed = true;
    if (statusNode) statusNode.textContent = text(error);
    progress(stage, 'error', { error: { code: 'SHOCK_ADAPTER_ERROR', message: text(error) } });
  }
  retire();
}
function guard() { if (retiring) throw new Cancelled(); }
function sameDescriptor(a, b) {
  if (!a || !b) return a === b;
  return ['configurable', 'enumerable', 'writable', 'value', 'get', 'set'].every(k => a[k] === b[k]);
}
function replaceProperty(object, key, descriptor, label = String(key)) {
  const before = Object.getOwnPropertyDescriptor(object, key);
  Object.defineProperty(object, key, descriptor);
  restorations.push({ object, key, before, installed: Object.getOwnPropertyDescriptor(object, key), label });
}
function hook(object, key, implementation) {
  const original = object[key];
  if (typeof original !== 'function') throw Error('Missing browser method: ' + key);
  replaceProperty(object, key, {
    configurable: true, writable: true,
    value: function (...args) {
      try { return implementation(original.bind(object), ...args); }
      catch (error) { if (!(error instanceof Cancelled)) fail(error); throw error; }
    }
  }, (object.constructor?.name || 'object') + '.' + key);
}
function listen(target, type, listener, options) {
  eventAdd.call(target, type, listener, options);
  listeners.push({ target, type, listener, capture: typeof options === 'boolean' ? options : !!options?.capture });
}
// Instrument only the four exact original controls, before source evaluation.
// Forward to the native IDL accessor so event dispatch and reads stay native.
function instrumentControl(element, id) {
  if (Object.getOwnPropertyDescriptor(element, 'onclick')) throw Error('Unexpected own onclick descriptor on #' + id);
  let prototype = Object.getPrototypeOf(element), descriptor;
  while (prototype && !descriptor) {
    descriptor = Object.getOwnPropertyDescriptor(prototype, 'onclick');
    prototype = Object.getPrototypeOf(prototype);
  }
  if (typeof descriptor?.get !== 'function' || typeof descriptor?.set !== 'function') throw Error('Missing native onclick accessor on #' + id);
  const entry = {
    element, id, get: descriptor.get, set: descriptor.set,
    before: descriptor.get.call(element), writes: 0, installedHandler: undefined,
    installedDescriptor: null, restored: false
  };
  replaceProperty(element, 'onclick', {
    configurable: true, enumerable: descriptor.enumerable,
    get() { return entry.get.call(this); },
    set(value) {
      entry.set.call(this, value);
      if (this === element) {
        entry.writes++;
        if (entry.writes === 1) entry.installedHandler = entry.get.call(element);
      }
    }
  }, '#' + id + '.onclick');
  entry.installedDescriptor = Object.getOwnPropertyDescriptor(element, 'onclick');
  controlHandlers.push(entry);
}
function releaseSourceHandlers() {
  let documentOK = true;
  for (const entry of sourceDocumentListeners) {
    try {
      eventRemove.call(document, entry.type, entry.listener, entry.capture);
      entry.removed = true;
    } catch (error) {
      documentOK = false;
      incomplete('source document listener ' + entry.type, error);
    }
  }
  sourceDocumentListenersRemoved = documentOK;
  let controlsOK = true;
  for (const entry of controlHandlers) {
    try {
      if (!sameDescriptor(Object.getOwnPropertyDescriptor(entry.element, 'onclick'), entry.installedDescriptor)) {
        throw Error('Handler hook ownership changed; refusing to overwrite another owner');
      }
      // The pinned source assigns each control exactly once. Any later write
      // is ambiguous ownership, even if it happens to reuse the same function.
      if (entry.writes > 1) throw Error('Observed ' + entry.writes + ' onclick writes; ownership is ambiguous');
      const expected = entry.writes === 1 ? entry.installedHandler : entry.before;
      if (entry.get.call(entry.element) !== expected) throw Error('Native onclick state changed outside the hook; refusing to overwrite another owner');
      if (entry.writes === 1) entry.set.call(entry.element, entry.before);
      if (entry.get.call(entry.element) !== entry.before) throw Error('Original onclick state was not restored');
      entry.restored = true;
    } catch (error) {
      controlsOK = false;
      incomplete('source #' + entry.id + '.onclick', error);
    }
  }
  sourceControlHandlersRemoved = controlsOK;
}
function watch(set, label, value) {
  const task = Promise.resolve(value);
  set.add(task);
  task.then(() => set.delete(task), error => {
    set.delete(task);
    if (error instanceof Cancelled) return;
    if (retiring) record(label, error); else fail(error);
  });
  return task;
}
async function settle(set) {
  // Includes the pinned initializer's await/catch continuations and browser events.
  let quiet = 0;
  while (quiet < 2) {
    if (set.size) { await Promise.allSettled([...set]); quiet = 0; }
    await checkpoint();
    quiet = set.size ? 0 : quiet + 1;
  }
}
async function capture(label, run) {
  try { return await run(); } catch (error) { if (!(error instanceof Cancelled)) record(label, error); }
}
function cancelRAFs() {
  for (const id of scheduled) nativeCancelRAF(id);
  scheduled.clear();
}
function visible() {
  if (!canvas?.isConnected || document.hidden || canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return false;
  const r = canvas.getBoundingClientRect(), s = getComputedStyle(canvas);
  return s.display !== 'none' && s.visibility === 'visible' && Number(s.opacity) > 0 && r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
}
function accepts(event) {
  const d = event.data;
  return event.origin === origin && event.source === parent && d?.schema === SCHEMA && d.action === 'retire' && d.token === binding.token && d.versionId === binding.versionId && d.attemptEpoch === binding.attemptEpoch;
}
listen(window, 'message', event => { if (accepts(event)) retire(); });
function emitRetirement(ok, lifecycle) {
  emit({ stage, status: 'cancelled', action: ok ? 'retired' : 'retire-error', type: ok ? 'dva-effect-retired' : 'dva-effect-retire-error', lifecycle });
}
function scheduleTerminal(task) {
  if (terminalScheduled) return;
  terminalScheduled = true;
  let done = false;
  const timer = setTimeout(() => {
    if (done) return;
    done = true;
    const lifecycle = snapshot();
    lifecycle.errors.push('Retirement incomplete after 15000ms; cleanup continues');
    lifecycle.incompleteResources.push('Retirement still running; see lifecycle resource states');
    emitRetirement(false, lifecycle);
  }, 15000);
  task.then(lifecycle => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    emitRetirement(mayReportRetired(lifecycle), lifecycle);
  }, error => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    incomplete('retirement task', error);
    emitRetirement(false, snapshot());
  });
}
listen(window, 'pagehide', event => {
  hideEvent ||= event;
  if (!retiring) retire();
  deliverOriginalHide();
}, { capture: true });
listen(window, 'error', event => fail(event.error || Error(event.message || 'Child runtime error')));
listen(window, 'unhandledrejection', event => {
  if (!(event.reason instanceof Cancelled)) fail(event.reason || Error('Unhandled child rejection'));
});
function deliverOriginalHide() {
  if (!originalHide || !hideEvent || hideDelivered) return;
  hideDelivered = true;
  try {
    if (typeof originalHide === 'function') originalHide.call(window, hideEvent);
    else originalHide.handleEvent(hideEvent);
  } catch (error) { record('original pagehide', error); }
}
function stopOriginalSfx() {
  if (!originalSfx || sfxStopTask) return;
  try { sfxStopTask = watch(audioOps, 'original SFX stop', originalSfx.stop()); }
  catch (error) { record('original SFX stop', error); }
}
function closeAudio(a) {
  if (a.closeTask) return a.closeTask;
  if (a.context.state === 'closed') return Promise.resolve();
  try { a.closeTask = watch(audioOps, 'AudioContext.close', a.close()); }
  catch (error) { record('AudioContext.close', error); a.closeTask = Promise.resolve(); }
  return a.closeTask;
}
function retire() {
  if (retirementTask) return retirementTask;
  retiring = true;
  generation++;
  retirementTask = Promise.resolve().then(cleanup);
  // Always publish the terminal result, including automatic failure cleanup.
  // Thus cleanup need not leave a message listener behind awaiting a later command.
  scheduleTerminal(retirementTask);
  abort.abort();
  cancelRAFs();
  if (audioButton) audioButton.disabled = true;
  // Preserve the source closure's pagehide invalidation even during module boot.
  // The resource hooks defer physical destruction until outstanding work drains.
  if (!hideEvent) {
    hideEvent = typeof PageTransitionEvent === 'function' ? new PageTransitionEvent('pagehide', { persisted: false }) : new Event('pagehide');
    window.dispatchEvent(hideEvent);
  } else deliverOriginalHide();
  stopOriginalSfx();
  for (const a of audios) closeAudio(a);
  return retirementTask;
}
function startDrain(d) {
  if (d.drainTask) return;
  try {
    d.drainTask = Promise.resolve(d.queueDone()).then(() => { d.drainCompleted = true; }, error => { record('GPU queue drain', error); });
  } catch (error) { record('GPU queue drain', error); d.drainTask = Promise.resolve(); }
}
function destroyDevice(d) {
  if (d.destroyCalled) return;
  try { d.destroy(); d.destroyCalled = true; } catch (error) { record('GPUDevice.destroy', error); }
}
function releaseInstrumentation() {
  let observerOK = true;
  for (const observer of observers) {
    try { observer.disconnect(); }
    catch (error) { observerOK = false; incomplete('MutationObserver.disconnect', error); }
  }
  observersDisconnected = observerOK;
  // Boot and resource draining have settled, including late source registration.
  // Restore native handler state before removing the reversible IDL hooks.
  releaseSourceHandlers();
  let listenerOK = true;
  for (const entry of listeners) {
    try { eventRemove.call(entry.target, entry.type, entry.listener, entry.capture); }
    catch (error) { listenerOK = false; incomplete('listener ' + entry.type, error); }
  }
  listenersRemoved = listenerOK && sourceDocumentListenersRemoved && sourceControlHandlersRemoved;
  let restoreOK = true;
  for (let i = restorations.length - 1; i >= 0; i--) {
    const r = restorations[i];
    try {
      const current = Object.getOwnPropertyDescriptor(r.object, r.key);
      if (!sameDescriptor(current, r.installed)) throw Error('Hook ownership changed; refusing to overwrite another owner');
      if (r.before) Object.defineProperty(r.object, r.key, r.before);
      else if (!Reflect.deleteProperty(r.object, r.key)) throw Error('Cannot delete instrumented own property');
      if (!sameDescriptor(Object.getOwnPropertyDescriptor(r.object, r.key), r.before)) throw Error('Original descriptor was not restored');
    } catch (error) { restoreOK = false; incomplete('restore ' + r.label, error); }
  }
  hooksRestored = restoreOK;
  for (const node of ownedNodes) {
    try { node.remove(); }
    catch (error) { incomplete('adapter module script removal', error); }
  }
}
async function cleanup() {
  await capture('boot settlement', async () => {
    // Removing an inserted module script is not a reliable cancellation mechanism.
    // Keep every hook alive until load/error and all tracked initializer edges settle.
    await Promise.resolve(bootTask).catch(() => {});
    await settle(bootOps);
    bootSettled = true;
  });
  deliverOriginalHide();
  cancelRAFs();
  await capture('draw settlement', () => settle(proofs));
  stopOriginalSfx();
  for (const a of audios) closeAudio(a);
  await capture('audio settlement', () => settle(audioOps));
  for (const d of devices) startDrain(d);
  await Promise.all(devices.map(d => d.drainTask));
  for (const b of buffers) {
    if (!b.destroyed) await capture('GPUBuffer.destroy', () => { b.destroy(); b.destroyed = true; });
  }
  for (const c of contexts) {
    if (c.configured && !c.unconfigured) await capture('GPUCanvasContext.unconfigure', () => { c.unconfigure(); c.unconfigured = true; });
  }
  for (const d of devices) destroyDevice(d);
  await Promise.all(devices.map(d => d.loss));
  // Keep error observers and the original lifecycle hooks through resource draining.
  await checkpoint();
  await checkpoint();
  if (originalHide && !hideDelivered) incomplete('original pagehide', 'Handler was not delivered');
  releaseInstrumentation();
  return snapshot();
}
function snapshot() {
  const dc = devices.length > 0, ac = audios.length > 0;
  const cc = contexts.some(c => c.configured), bc = buffers.length > 0;
  const destroyed = dc && devices.every(d => d.destroyCalled && d.lossSettled && d.lostReason === 'destroyed');
  return {
    bootSettled,
    rafStopped: retiring && scheduled.size === 0,
    drawSettled: retiring && activeFrame === null && proofs.size === 0,
    audioResumeSettled: retiring && audioOps.size === 0,
    audioCreated: ac,
    audioState: ac ? (audios.every(a => a.context.state === 'closed') ? 'closed' : 'unknown') : 'not-created',
    deviceCreated: dc,
    deviceState: dc ? (destroyed ? 'destroyed-loss-settled' : 'unknown') : 'not-created',
    noPendingAdapterDevice: bootSettled && pendingDevices === 0 && bootOps.size === 0,
    drainCompleted: dc && devices.every(d => d.drainCompleted),
    destroyCalled: dc && devices.every(d => d.destroyCalled),
    lostReason: dc ? (devices.every(d => d.lossSettled && d.lostReason === 'destroyed') ? 'destroyed' : 'unknown') : undefined,
    contextConfigured: cc,
    contextState: cc ? (contexts.every(c => !c.configured || c.unconfigured) ? 'unconfigured' : 'unknown') : 'not-configured',
    bufferCreated: bc,
    bufferState: bc ? (buffers.every(b => b.destroyed) ? 'destroyed' : 'unknown') : 'not-created',
    hooksRestored, listenersRemoved, observersDisconnected,
    sourceDocumentListenersRemoved, sourceControlHandlersRemoved,
    sourceDocumentListeners: sourceDocumentListeners.map(entry => ({ type: entry.type, capture: entry.capture, removed: entry.removed === true })),
    sourceControlHandlers: controlHandlers.map(entry => ({ id: entry.id, writes: entry.writes, restored: entry.restored })),
    incompleteResources: incompleteResources.slice(),
    errors: errors.slice()
  };
}
function mayReportRetired(l) {
  return l.bootSettled === true && l.rafStopped === true && l.drawSettled === true && l.audioResumeSettled === true &&
    ((l.audioCreated === false && l.audioState === 'not-created') || (l.audioCreated === true && l.audioState === 'closed')) &&
    ((l.deviceCreated === false && l.deviceState === 'not-created' && l.noPendingAdapterDevice === true) ||
      (l.deviceCreated === true && l.deviceState === 'destroyed-loss-settled' && l.drainCompleted === true && l.destroyCalled === true && l.lostReason === 'destroyed')) &&
    ((l.contextConfigured === false && l.contextState === 'not-configured') || (l.contextConfigured === true && l.contextState === 'unconfigured')) &&
    ((l.bufferCreated === false && l.bufferState === 'not-created') || (l.bufferCreated === true && l.bufferState === 'destroyed')) &&
    l.hooksRestored === true && l.listenersRemoved === true && l.observersDisconnected === true &&
    l.sourceDocumentListenersRemoved === true && l.sourceControlHandlersRemoved === true &&
    l.sourceDocumentListeners.every(entry => entry.removed === true) &&
    l.sourceControlHandlers.every(entry => entry.restored === true && entry.writes <= 1) &&
    l.incompleteResources.length === 0 && Array.isArray(l.errors) && l.errors.length === 0;
}

async function checkBytes(response, pin, path) {
  if (!response.ok || response.redirected || response.url !== new URL(path, origin).href) throw Error('Source fetch rejected: ' + path);
  const bytes = await response.clone().arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
  if (bytes.byteLength !== pin[1] || hash !== pin[2]) throw Error('Source integrity mismatch: ' + path);
  return response;
}
async function checkedFetch(path, pin) {
  try {
    const response = await nativeFetch(path, { signal: abort.signal, cache: 'no-store', credentials: 'same-origin', redirect: 'error', mode: 'same-origin' });
    return await checkBytes(response, pin, path);
  } catch (error) {
    if (abort.signal.aborted && error?.name === 'AbortError') throw new Cancelled();
    throw error;
  }
}
function loadPinnedModule() {
  const script = document.createElement('script');
  if (!('integrity' in script) || typeof HTMLScriptElement.supports !== 'function' || !HTMLScriptElement.supports('module')) {
    throw Error('Executing-module SRI is unavailable: module-script and integrity support are required; no import fallback is permitted');
  }
  const pin = config.pins.find(p => p[0] === 'preview.mjs');
  const binary = pin[2].match(/../g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
  script.type = 'module';
  script.integrity = 'sha256-' + btoa(binary);
  script.crossOrigin = 'anonymous';
  script.src = new URL(config.base + 'preview.mjs', origin).href;
  // SRI belongs to this executing script request, not merely the preflight fetch.
  // No Blob, URL mutation, source wrapper, dynamic-import fallback or module preload.
  ownedNodes.push(script);
  return new Promise((resolve, reject) => {
    listen(script, 'load', () => resolve(), { once: true });
    listen(script, 'error', () => reject(Error('Pinned module execution failed: SRI, CSP, network, or module evaluation rejected ' + script.src)), { once: true });
    document.head.appendChild(script);
  });
}
function ownAudio(context) {
  const a = { context, close: context.close.bind(context), closeTask: null };
  audios.push(a);
  hook(context, 'resume', raw => {
    guard();
    if (verification) throw Error('Verification audio is forbidden');
    return watch(audioOps, 'AudioContext.resume', raw());
  });
  hook(context, 'close', () => closeAudio(a));
  if (retiring) closeAudio(a);
  return context;
}
function ownContext(context) {
  if (!context || contexts.some(c => c.context === context)) return context;
  const c = { context, configured: false, unconfigured: false, device: null, unconfigure: context.unconfigure.bind(context) };
  contexts.push(c);
  hook(context, 'configure', (raw, descriptor) => {
    guard();
    c.configured = true;
    c.unconfigured = false;
    c.device = descriptor.device;
    return raw(descriptor);
  });
  hook(context, 'unconfigure', () => {
    if (!retiring) fail(Error('Original renderer unconfigured its context'));
  });
  hook(context, 'getCurrentTexture', raw => {
    guard();
    const texture = raw();
    if (!textures.has(texture)) {
      textures.add(texture);
      hook(texture, 'createView', (makeView, ...args) => {
        const view = makeView(...args);
        views.set(view, c);
        return view;
      });
    }
    return texture;
  });
  return context;
}
function ownDevice(device) {
  const queue = device.queue;
  const d = {
    device, queue, pipelines: new WeakSet(), uncaptured: false,
    destroy: device.destroy.bind(device), queueDone: queue.onSubmittedWorkDone.bind(queue),
    push: device.pushErrorScope.bind(device), pop: device.popErrorScope.bind(device),
    destroyCalled: false, drainCompleted: false, lossSettled: false, lostReason: null
  };
  devices.push(d);
  d.loss = Promise.resolve(device.lost).then(info => {
    d.lossSettled = true;
    d.lostReason = info.reason;
    if (info.reason !== 'destroyed' || !d.destroyCalled) fail(Error(info.message || 'Unexpected GPU device loss'));
    return info;
  }, error => { d.lossSettled = true; fail(error); });
  listen(device, 'uncapturederror', event => { d.uncaptured = true; fail(event.error || Error('Uncaptured GPU error')); });
  hook(device, 'destroy', () => {
    if (!retiring) fail(Error('Original renderer retired its device'));
  });
  hook(device, 'createBuffer', (raw, descriptor) => {
    guard();
    const buffer = raw(descriptor);
    const b = { buffer, device, destroyed: false, destroy: buffer.destroy.bind(buffer) };
    buffers.push(b);
    hook(buffer, 'destroy', () => {
      if (!retiring) fail(Error('Original renderer retired its buffer'));
    });
    return buffer;
  });
  hook(device, 'createShaderModule', (raw, descriptor) => {
    guard();
    const module = raw(descriptor);
    hook(module, 'getCompilationInfo', getInfo => {
      guard();
      return watch(bootOps, 'shader compilation', getInfo().then(info => {
        guard();
        if (info.messages.some(m => m.type === 'error')) throw Error(info.messages.filter(m => m.type === 'error').map(m => m.message).join('; '));
        return info;
      }));
    });
    return module;
  });
  hook(device, 'createRenderPipelineAsync', (raw, descriptor) => {
    guard();
    progress('pipelines');
    return watch(bootOps, 'render pipeline', raw(descriptor).then(pipeline => { guard(); d.pipelines.add(pipeline); return pipeline; }));
  });
  hook(device, 'createBindGroup', (raw, descriptor) => {
    guard();
    const group = raw(descriptor);
    const entry = descriptor.entries.find(e => e.binding === 0);
    bindGroups.set(group, { device, buffer: entry?.resource?.buffer });
    return group;
  });
  hook(queue, 'writeBuffer', (raw, ...args) => {
    guard();
    const result = raw(...args);
    const [buffer, offset, data] = args;
    if (args.length === 3 && offset === 0 && data instanceof Float32Array && data.length === 12) {
      const phase = data[2];
      if (Number.isFinite(phase)) {
        if (lastPhase !== null && phase < lastPhase) generation++;
        lastPhase = phase;
        scenes.set(buffer, { phase, generation, width: data[0], height: data[1], device });
      }
    }
    return result;
  });
  hook(device, 'createCommandEncoder', (raw, ...args) => {
    guard();
    const encoder = raw(...args), encoded = { device, passes: [], frame: activeFrame };
    hook(encoder, 'beginRenderPass', (begin, descriptor) => {
      guard();
      const pass = begin(descriptor);
      const attachments = descriptor.colorAttachments;
      const p = { context: attachments.length === 1 ? views.get(attachments[0]?.view) : null, draws: [], ended: false, pipeline: null, group: null };
      encoded.passes.push(p);
      hook(pass, 'setPipeline', (set, pipeline) => { const result = set(pipeline); p.pipeline = pipeline; return result; });
      hook(pass, 'setBindGroup', (set, index, group, ...rest) => { const result = set(index, group, ...rest); if (index === 0) p.group = group; return result; });
      hook(pass, 'draw', (draw, ...drawArgs) => {
        guard();
        const result = draw(...drawArgs);
        const group = bindGroups.get(p.group), scene = group && scenes.get(group.buffer);
        p.draws.push({ exact: drawArgs.length === 1 && drawArgs[0] === 3, pipeline: p.pipeline, group, scene: scene && { ...scene }, canvasConnected: canvas.isConnected, visible: visible(), viewportWidth: canvas.clientWidth, viewportHeight: canvas.clientHeight });
        return result;
      });
      hook(pass, 'end', end => { const result = end(); p.ended = true; return result; });
      return pass;
    });
    hook(encoder, 'finish', (finish, ...rest) => {
      guard();
      const command = finish(...rest);
      commands.set(command, encoded);
      return command;
    });
    return encoder;
  });
  hook(queue, 'submit', (raw, commandBuffers) => {
    guard();
    const list = Array.from(commandBuffers);
    const result = raw(list);
    const frame = activeFrame;
    if (frame && !firstReady) {
      frame.submissions++;
      const encoded = list.length === 1 && commands.get(list[0]);
      const pass = encoded && encoded.passes.length === 1 && encoded.passes[0];
      const draw = pass && pass.draws.length === 1 && pass.draws[0];
      if (encoded && encoded.device === device && encoded.frame === frame && pass.ended && pass.context?.device === device && !pass.context.unconfigured && draw?.exact && d.pipelines.has(draw.pipeline) && draw.group?.device === device && draw.scene?.device === device) {
        const scene = draw.scene;
        if (Number.isFinite(scene.phase) && scene.phase >= 0.065 && scene.phase <= 0.79 && draw.visible && draw.canvasConnected && draw.viewportWidth > 0 && draw.viewportHeight > 0) {
          // Same native queue, immediately after the original pipeline's draw(3).
          frame.receipt = {
            version: config.id, attempt: binding.attemptEpoch, generation: scene.generation,
            recorded: true, submitted: true, passes: 1, phase: scene.phase,
            canvasConnected: draw.canvasConnected, visible: draw.visible,
            viewportWidth: draw.viewportWidth, viewportHeight: draw.viewportHeight
          };
          frame.device = d;
          frame.fence = d.queueDone();
          Promise.resolve(frame.fence).catch(() => {});
        }
      }
    }
    return result;
  });
  return d;
}
function finishFrame(frame) {
  const pops = [];
  for (const scope of frame.scopes) {
    for (let i = 0; i < scope.count; i++) {
      try { pops.push(Promise.resolve(scope.device.pop())); }
      catch (error) { pops.push(Promise.reject(error)); }
    }
  }
  const job = Promise.all([Promise.all(pops), Promise.resolve(frame.fence)]).then(([scopeErrors]) => {
    if (scopeErrors.some(e => e !== null)) throw Error('GPU error scope during original render');
    const r = frame.receipt, d = frame.device;
    if (!r || !frame.fence || frame.submissions !== 1 || !frame.scopes.some(s => s.device === d && s.count === 3)) return;
    if (retiring || firstReady || !imported || failed || d.lossSettled || d.uncaptured || generation !== r.generation || !Number.isSafeInteger(r.generation) || r.generation < 1 || !visible() || !Number.isFinite(lastPhase) || lastPhase < 0.065 || lastPhase > 0.79) return;
    if (verification && audioButton.disabled !== true) throw Error('Verification requires #audio.disabled');
    firstReady = true;
    progress('playing', 'ready', { firstFrame: { ...r, completed: true, cleanScopes: true }, ...(verification ? { verification: { muted: true, audioDisabled: true } } : {}) });
  });
  watch(proofs, 'original frame proof', job);
}
function installHooks() {
  if (!canvas || !statusNode || !audioButton || ['normal', 'giant', 'light'].some(id => !document.getElementById(id))) throw Error('Required original DOM is missing');
  if (!navigator.gpu || !crypto.subtle) throw Error('WebGPU and Web Crypto are required');
  for (const id of ['normal', 'giant', 'light', 'audio']) instrumentControl(document.getElementById(id), id);
  // This child-document hook covers the pinned source's direct registration;
  // it never instruments the parent or the shared EventTarget prototype.
  hook(document, 'addEventListener', (raw, type, listener, options) => {
    if (type !== 'visibilitychange' || !listener) return raw(type, listener, options);
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    // Record before calling through so even a registration-time failure leaves
    // an exact removal attempt in the retirement path.
    sourceDocumentListeners.push({ type, listener, capture, removed: false });
    return raw(type, listener, options);
  });
  hook(window, 'addEventListener', (raw, type, listener, options) => {
    if (type !== 'pagehide') {
      const result = raw(type, listener, options);
      if (listener) listeners.push({ target: window, type, listener, capture: typeof options === 'boolean' ? options : !!options?.capture });
      return result;
    }
    if (!listener) return;
    if (originalHide) throw Error('Unexpected second original pagehide handler');
    originalHide = listener;
    // Delivery remains exactly once, including evaluation after boot-time retire.
    deliverOriginalHide();
  });
  hook(window, 'requestAnimationFrame', (raw, callback) => {
    if (retiring) return 0;
    const id = nativeRAF(now => {
      scheduled.delete(id);
      if (retiring) return;
      const frame = { submissions: 0, scopes: [], receipt: null, fence: null };
      activeFrame = frame;
      try {
        if (!firstReady) for (const d of devices) {
          if (d.destroyCalled || d.lossSettled) continue;
          const scope = { device: d, count: 0 };
          frame.scopes.push(scope);
          for (const filter of ['validation', 'out-of-memory', 'internal']) { d.push(filter); scope.count++; }
        }
        callback.call(window, now);
      } catch (error) { if (!(error instanceof Cancelled)) fail(error); }
      finally {
        activeFrame = null;
        if (frame.scopes.length || frame.fence) finishFrame(frame);
      }
    });
    scheduled.add(id);
    return id;
  });
  hook(window, 'cancelAnimationFrame', (raw, id) => { scheduled.delete(id); return nativeCancelRAF(id); });
  hook(canvas, 'getContext', (raw, type, ...args) => { guard(); return type === 'webgpu' ? ownContext(raw(type, ...args)) : raw(type, ...args); });
  const shaderPin = config.pins.find(p => p[0] === 'field.wgsl');
  hook(window, 'fetch', (raw, input, init) => {
    guard();
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
    const shaderPath = config.base + 'field.wgsl';
    if (url.origin !== origin || url.pathname !== shaderPath || url.search || url.hash || init?.method && init.method !== 'GET') throw Error('Runtime fetch is outside the exact source allowlist');
    progress('assets');
    return watch(bootOps, 'original shader fetch', checkedFetch(shaderPath, shaderPin));
  });
  hook(navigator.gpu, 'requestAdapter', (raw, ...args) => {
    guard();
    progress('adapter');
    return watch(bootOps, 'requestAdapter', Promise.resolve(raw(...args)).then(adapter => {
      guard();
      if (!adapter) throw Error('WebGPU adapter unavailable');
      hook(adapter, 'requestDevice', (request, ...options) => {
        guard();
        progress('device');
        const task = (async () => {
          pendingDevices++;
          try {
            const device = await request(...options);
            const d = ownDevice(device);
            if (retiring) {
              startDrain(d);
              // Cleanup awaits both this drain and device.lost before restoring hooks.
              await d.drainTask;
              destroyDevice(d);
              throw new Cancelled();
            }
            return device;
          } finally { pendingDevices--; }
        })();
        return watch(bootOps, 'requestDevice', task);
      });
      return adapter;
    }));
  });
  if (window.AudioContext) {
    const NativeAudio = window.AudioContext;
    replaceProperty(window, 'AudioContext', {
      configurable: true, writable: true,
      value: new Proxy(NativeAudio, { construct(target, args, newTarget) {
        guard();
        if (verification) { const error = Error('Verification audio is forbidden'); fail(error); throw error; }
        return ownAudio(Reflect.construct(target, args, newTarget));
      } })
    }, 'window.AudioContext');
  }
  replaceProperty(window, '__gallerySfx', {
    configurable: true,
    get: () => exposedSfx,
    set(value) {
      try {
        if (!value || typeof value.activateFromGesture !== 'function' || typeof value.stop !== 'function') throw Error('Unexpected original SFX interface');
        originalSfx = value;
        exposedSfx = Object.freeze({
          activateFromGesture(...args) {
            if (retiring || verification) return Promise.resolve(false);
            try { return watch(audioOps, 'original SFX activation', value.activateFromGesture(...args)); }
            catch (error) { fail(error); return Promise.reject(error); }
          },
          stop(...args) {
            try { return watch(audioOps, 'original SFX stop', value.stop(...args)); }
            catch (error) { fail(error); return Promise.reject(error); }
          }
        });
        if (retiring) stopOriginalSfx();
      } catch (error) { fail(error); throw error; }
    }
  }, 'window.__gallerySfx');
  const statusObserver = new MutationObserver(() => {
    if (!retiring && statusNode.textContent.trim()) fail(Error(statusNode.textContent));
  });
  observers.push(statusObserver);
  statusObserver.observe(statusNode, { childList: true, characterData: true, subtree: true });
  const audioObserver = new MutationObserver(() => {
    if (verification && !audioButton.disabled) {
      audioButton.disabled = true;
      fail(Error('Verification #audio.disabled was cleared'));
    }
  });
  observers.push(audioObserver);
  audioObserver.observe(audioButton, { attributes: true, attributeFilter: ['disabled'] });
}

bootTask = (async () => {
  progress('assets', 'pending', { sourcePins: null });
  await Promise.all(config.pins.map(pin => watch(bootOps, 'source integrity ' + pin[0], checkedFetch(config.base + pin[0], pin))));
  guard();
  progress('assets', 'pending', {
    sourcePins: config.pins.map(([file, bytes, sha256]) => ({ path: config.base + file, bytes, sha256 }))
  });
  installHooks();
  guard();
  await loadPinnedModule();
  imported = true;
  guard();
  if (verification && audioButton.disabled !== true) throw Error('Verification requires #audio.disabled');
  if (!firstReady) progress('first-frame', 'pending', verification ? { verification: { muted: true, audioDisabled: true } } : {});
  // Script load only proves evaluation, not async initialize() or a displayed draw.
  await settle(bootOps);
  bootSettled = true;
})();
bootTask.catch(error => { if (!(error instanceof Cancelled)) fail(error); });
