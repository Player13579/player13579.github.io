export const PROTOCOL = 'dva-gallery-startup/v1';
export const VERSION = 'substitution-sol61-r1';
const ROUTE = '/public/sol61-substitution/r1-gallery-adapter-a1/index.html';
const AUTH_KEYS = ['galleryVersionId', 'galleryStartupToken', 'galleryAttemptEpoch'];
const STAGES = new Set(['child-document', 'adapter', 'device', 'assets', 'pipelines', 'first-frame', 'playing']);
const GATE_KEYS = ['authorized', 'visible', 'current', 'registered', 'sourceOn', 'sourceVisible', 'sourceDrawable', 'playing'];
const DETAIL_KEYS = ['message', 'reason', 'error', 'progress', 'completed', 'total', 'adapter', 'device', 'width', 'height'];
let lastEpoch = 0;

const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const positive = x => Number.isSafeInteger(x) && x > 0;
const nonnegative = x => Number.isSafeInteger(x) && x >= 0;
const empty = x => Array.isArray(x) && x.length === 0;
const age = x => typeof x === 'number' && Number.isFinite(x) && x > 0 && x < 1200;
const freeze = Object.freeze;
function fault(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  // Keep optional consumer promises from producing unhandled-rejection noise.
  // The original promise remains rejected for callers that await it.
  promise.catch(() => {});
  return { promise, resolve, reject };
}
function rejected(error) {
  const d = deferred();
  d.reject(error);
  return d.promise;
}
function frameCopy(f) {
  if (!record(f) || !['recorded', 'submitted', 'completed', 'canvasConnected', 'sourceOn'].every(k => f[k] === true)) return null;
  const integers = ['passes', 'viewportWidth', 'viewportHeight', 'causeId', 'generation', 'sequence', 'targetGeneration'];
  if (!integers.every(k => positive(f[k])) || !age(f.submittedAgeMs) || !age(f.currentAgeMs)) return null;
  if (!record(f.privacyGate) || !GATE_KEYS.every(k => f.privacyGate[k] === true)) return null;
  if (f.observerOn !== undefined && typeof f.observerOn !== 'boolean') return null;
  const result = {
    recorded: true, submitted: true, completed: true, canvasConnected: true,
    sourceOn: true, submittedAgeMs: f.submittedAgeMs, currentAgeMs: f.currentAgeMs,
    privacyGate: freeze(Object.fromEntries(GATE_KEYS.map(k => [k, true])))
  };
  for (const k of integers) result[k] = f[k];
  if (typeof f.observerOn === 'boolean') result.observerOn = f.observerOn;
  return freeze(result);
}
function lifecycleCopy(r) {
  if (!record(r) || !['retired', 'closed', 'creationClosed', 'initSettled', 'loopStopped'].every(k => r[k] === true) || r.rafPending !== false || r.pendingRender !== 0 || !empty(r.cleanupErrors)) return null;
  const g = r.gpu, a = r.audio;
  if (!record(g) || g.status !== 'disposed' || !empty(g.errors) || !nonnegative(g.serial) || !nonnegative(g.completedSerial) || g.completedSerial < g.serial) return null;
  if (g.noDevice !== undefined && typeof g.noDevice !== 'boolean') return null;
  if (g.noDevice === true && (g.serial !== 0 || g.completedSerial !== 0)) return null;
  if (!record(a) || a.closed !== true || a.closeSettled !== true || a.activeVoices !== 0 || a.pending !== 0 || !['absent', 'closed'].includes(a.contextState) || !empty(a.errors) || !empty(a.cleanupErrors)) return null;
  const gpu = { status: 'disposed', serial: g.serial, completedSerial: g.completedSerial, errors: freeze([]) };
  if (g.noDevice !== undefined) gpu.noDevice = g.noDevice;
  return freeze({
    retired: true, closed: true, creationClosed: true, initSettled: true,
    loopStopped: true, rafPending: false, pendingRender: 0, cleanupErrors: freeze([]),
    gpu: freeze(gpu),
    audio: freeze({ closed: true, closeSettled: true, activeVoices: 0, pending: 0,
      contextState: a.contextState, errors: freeze([]), cleanupErrors: freeze([]) })
  });
}

/**
 * TEMP-only native postMessage adapter. Does not modify child files or remove DOM.
 * start() returns ready; ready resolves to a frozen firstFrame copy.
 * retire() is idempotent once requested and resolves to a frozen lifecycle copy.
 * A pre-start retire() rejects without preventing a subsequent start().
 * onReady(frame, identity), onStage(pendingEnvelope, identity), onError(Error, identity).
 * Callback exceptions are isolated from protocol processing.
 */
export function createSubstitutionAttempt({
  iframe, baseUrl, origin = globalThis.location.origin, epoch,
  onReady, onStage, onError, retireTimeoutMs = 5000, verificationMode = false
} = {}) {
  if (typeof verificationMode !== 'boolean') throw new TypeError('verificationMode must be a boolean');
  if (!iframe || !iframe.ownerDocument) throw new TypeError('An iframe with an ownerDocument is required');
  const host = iframe.ownerDocument.defaultView;
  if (!host || typeof host.addEventListener !== 'function' || typeof host.removeEventListener !== 'function') throw new TypeError('Missing parent message-event capability');
  if (typeof origin !== 'string' || origin === 'null') throw new TypeError('An explicit non-opaque parent origin is required');
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.origin !== origin || host.location?.origin !== origin) throw new TypeError('origin must exactly equal the parent origin');
  const url = new URL(baseUrl === undefined ? ROUTE : baseUrl, origin + '/');
  if (url.origin !== origin || url.pathname !== ROUTE || url.username || url.password) throw new TypeError('Only the exact same-origin technical child route is allowed');
  for (const key of AUTH_KEYS) {
    if (url.searchParams.getAll(key).length > 1) throw new TypeError('Duplicate auth query parameter: ' + key);
  }
  if (!Number.isSafeInteger(retireTimeoutMs) || retireTimeoutMs <= 0 || retireTimeoutMs > 2147483647) throw new TypeError('Invalid retirement timeout');
  for (const [name, fn] of Object.entries({ onReady, onStage, onError })) {
    if (fn !== undefined && typeof fn !== 'function') throw new TypeError(name + ' must be a function');
  }
  const nextEpoch = epoch === undefined ? lastEpoch + 1 : epoch;
  if (!positive(nextEpoch) || nextEpoch <= lastEpoch) throw new RangeError('Epoch must be a positive safe integer greater than every earlier allocated module epoch');
  const cryptoRef = host.crypto ?? globalThis.crypto;
  if (typeof cryptoRef?.getRandomValues !== 'function') throw new TypeError('Cryptographic randomness is required');
  const bytes = new Uint8Array(16);
  cryptoRef.getRandomValues(bytes);
  const token = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
  url.searchParams.set('galleryVersionId', VERSION);
  url.searchParams.set('galleryStartupToken', token);
  url.searchParams.set('galleryAttemptEpoch', String(nextEpoch));
  url.searchParams.delete('verify');
  if (verificationMode) url.searchParams.set('verify', '1');
  url.searchParams.set('galleryAutoLoop', '1');
  url.hash = '';
  lastEpoch = nextEpoch;
  const identity = freeze({ schema: PROTOCOL, versionId: VERSION, token,
    attemptEpoch: nextEpoch, origin, url: url.href });

  const readyDeferred = deferred();
  let readySettled = false, readyValue = null;
  let retirement = null, retirementSettled = false, retirementValue = null;
  let requested = false, started = false, closed = false, listening = false;
  let expectedWindow = null, listener = null, generation = 0;
  let incomingSequence = 0, outgoingSequence = 0, timer = null;
  let state = 'created', lastError = null;

  const notify = (fn, value) => { try { fn?.(value, identity); } catch {} };
  const report = error => {
    lastError = freeze({ code: error.code || 'ERROR', message: error.message });
    notify(onError, error);
  };
  const rejectReady = error => {
    if (!readySettled) { readySettled = true; readyDeferred.reject(error); }
  };
  const sameWindow = () => {
    try { return expectedWindow !== null && iframe.contentWindow === expectedWindow; }
    catch { return false; }
  };
  const detach = () => {
    generation++;
    if (listening) {
      listening = false;
      try { host.removeEventListener('message', listener); } catch {}
    }
    if (timer !== null) { globalThis.clearTimeout(timer); timer = null; }
  };
  const failRetirement = error => {
    if (!retirement || retirementSettled) return;
    retirementSettled = true;
    closed = true;
    state = 'retire-failed';
    detach();
    rejectReady(error);
    retirement.reject(error);
    report(error);
  };
  const pendingCopy = d => {
    const result = { schema: PROTOCOL, token, versionId: VERSION, attemptEpoch: nextEpoch,
      sequence: d.sequence, stage: d.stage, status: 'pending' };
    for (const key of DETAIL_KEYS) {
      const value = d[key];
      if (typeof value === 'string') result[key] = value.slice(0, 256);
      else if (typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    }
    return freeze(result);
  };
  const receive = event => {
    if (closed || !started || !listening || !sameWindow() || event.source !== expectedWindow || event.source !== iframe.contentWindow || event.origin !== origin) return;
    const d = event.data;
    if (!record(d) || d.schema !== PROTOCOL || d.token !== token || d.versionId !== VERSION || d.attemptEpoch !== nextEpoch || !positive(d.sequence) || d.sequence <= incomingSequence || !STAGES.has(d.stage)) return;
    if (d.status === 'pending' && d.action === undefined && d.type === undefined) {
      const copy = pendingCopy(d);
      incomingSequence = d.sequence;
      notify(onStage, copy);
      return;
    }
    if (d.stage !== 'playing') return;
    if (d.status === 'ready' && d.action === undefined && d.type === undefined && !requested && !readySettled) {
      const frame = frameCopy(d.firstFrame);
      if (!frame) return;
      incomingSequence = d.sequence;
      readyValue = frame;
      readySettled = true;
      state = 'ready';
      readyDeferred.resolve(frame);
      notify(onReady, frame);
      return;
    }
    if (d.status === 'cancelled' && d.action === 'retired' && d.type === 'dva-effect-retired' && requested && !retirementSettled) {
      const lifecycle = lifecycleCopy(d.lifecycle);
      if (!lifecycle) return;
      incomingSequence = d.sequence;
      retirementValue = lifecycle;
      retirementSettled = true;
      closed = true;
      state = 'retired';
      detach();
      retirement.resolve(lifecycle);
      return;
    }
    if (d.status === 'error' && d.action === 'retire-error' && d.type === 'dva-effect-retire-error' && typeof d.error === 'string' && requested && !retirementSettled) {
      incomingSequence = d.sequence;
      failRetirement(fault('RETIRE_ERROR', d.error.slice(0, 512)));
      return;
    }
    if (d.status === 'error' && d.action === undefined && d.type === undefined && typeof d.error === 'string') {
      incomingSequence = d.sequence;
      const error = fault('CHILD_ERROR', d.error.slice(0, 512));
      rejectReady(error);
      if (!requested) state = 'child-error';
      report(error);
    }
  };

  function start() {
    if (started || closed) return readyDeferred.promise;
    try {
      expectedWindow = iframe.contentWindow;
      if (!expectedWindow) throw fault('MISSING_WINDOW', 'The iframe must have a live browsing context before start');
      const capturedGeneration = ++generation;
      listener = event => {
        if (generation !== capturedGeneration) return;
        // Real MessageEvent.data is structured-cloned. Malformed test/proxy data
        // must not escape into the parent event loop either.
        try { receive(event); } catch {}
      };
      started = true;
      state = 'starting';
      host.addEventListener('message', listener);
      listening = true;
      iframe.src = identity.url;
    } catch (cause) {
      closed = true;
      state = 'start-failed';
      detach();
      const error = fault('START_FAILED', String(cause?.message || cause));
      rejectReady(error);
      report(error);
    }
    return readyDeferred.promise;
  }

  function retire() {
    if (retirement) return retirement.promise;
    if (!started) return rejected(fault('NOT_STARTED', 'Cannot retire an attempt before start'));
    if (closed) return rejected(fault('CLOSED', 'Attempt is closed'));
    retirement = deferred();
    try {
      if (!sameWindow()) throw fault('REPLACED_IFRAME', 'The iframe browsing context has been replaced');
      if (typeof expectedWindow.postMessage !== 'function') throw fault('MISSING_CAPABILITY', 'Child WindowProxy has no native postMessage capability');
      requested = true;
      state = 'retiring';
      rejectReady(fault('READY_CANCELLED', 'Retirement requested before readiness settled'));
      timer = globalThis.setTimeout(() => failRetirement(fault('RETIRE_TIMEOUT', 'No validated native retirement acknowledgement before timeout')), retireTimeoutMs);
      expectedWindow.postMessage({ schema: PROTOCOL, token, versionId: VERSION,
        attemptEpoch: nextEpoch, sequence: ++outgoingSequence, action: 'retire' }, origin);
    } catch (cause) {
      failRetirement(cause?.code ? cause : fault('RETIRE_SEND_FAILED', String(cause?.message || cause)));
    }
    return retirement.promise;
  }

  function close() {
    if (closed) { detach(); return; }
    closed = true;
    state = 'closed';
    detach();
    const error = fault('CLOSED', 'Attempt closed without synthesizing child disposal');
    rejectReady(error);
    if (retirement && !retirementSettled) {
      retirementSettled = true;
      retirement.reject(error);
    }
  }

  function snapshot() {
    return freeze({ identity, state, started, closed, listening, generation,
      readySettled, ready: readyValue !== null, retirementRequested: requested,
      retirementSettled, retired: retirementValue !== null,
      incomingSequence, outgoingSequence, firstFrame: readyValue,
      lifecycle: retirementValue, lastError });
  }

  return freeze({ identity, start, ready: readyDeferred.promise, retire, close, snapshot });
}
