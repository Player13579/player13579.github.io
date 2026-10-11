import { createRenderer as defaultCreateRenderer } from './renderer.mjs';
import { plan as defaultPlan, normalizeRawEvent } from '../r1/plan.mjs';
import { createPlayback as defaultCreatePlayback } from '../r1/playback.mjs';
import { makeBuffer as defaultMakeBuffer } from '../r1/sfx.mjs';

let activeController = null;

export function getPreviewController() { return activeController; }

const finite = Number.isFinite;
const timeout = (fn, ms) => globalThis.setTimeout(fn, ms);
const clearTimeoutHandle = id => globalThis.clearTimeout(id);

function within(promise, ms, timer = timeout, clearTimer = clearTimeoutHandle) {
  return new Promise(resolve => {
    let settled = false;
    const id = timer(() => { if (!settled) { settled = true; resolve({ timedOut: true }); } }, ms);
    Promise.resolve(promise).then(value => {
      if (settled) return;
      settled = true; clearTimer(id); resolve({ timedOut: false, value });
    }, error => {
      if (settled) return;
      settled = true; clearTimer(id); resolve({ timedOut: false, error });
    });
  });
}

export function bootPreview(options = {}) {
  if (activeController && !activeController.isDisposed()) return activeController;
  const doc = options.document ?? globalThis.document;
  const win = options.window ?? globalThis.window;
  const nav = options.navigator ?? globalThis.navigator;
  const URLClass = options.URL ?? globalThis.URL;
  const location = options.location ?? win?.location ?? globalThis.location;
  const canvas = options.canvas ?? doc?.querySelector?.('canvas');
  if (!doc || !win || !canvas) return null;

  const status = options.status ?? doc.querySelector?.('#status');
  const startButton = options.startButton ?? doc.querySelector?.('#start');
  const stopButton = options.stopButton ?? doc.querySelector?.('#stop');
  const holdButton = options.holdButton ?? doc.querySelector?.('#hold');
  const mutedInput = options.mutedInput ?? doc.querySelector?.('#muted');
  const reducedInput = options.reducedInput ?? doc.querySelector?.('#reduced');
  const makeRenderer = options.createRenderer ?? defaultCreateRenderer;
  const makePlayback = options.createPlayback ?? defaultCreatePlayback;
  const makeBuffer = options.makeBuffer ?? defaultMakeBuffer;
  const plan = options.plan ?? defaultPlan;
  const clock = options.clock ?? (() => win.performance.now());
  const requestFrame = options.requestAnimationFrame ?? win.requestAnimationFrame?.bind(win) ?? (fn => timeout(fn, 16));
  const cancelFrame = options.cancelAnimationFrame ?? win.cancelAnimationFrame?.bind(win) ?? clearTimeoutHandle;
  const cleanupTimeoutMs = options.cleanupTimeoutMs ?? 1200;
  const verify = options.verify ?? (() => {
    try { return new URLClass(location.href).searchParams.has('verify'); } catch { return false; }
  })();

  let renderer = null, device = null, gpuContext = null, audioContext = null;
  let preparing = null, playback = null, effect = null, raf = 0, serial = 0;
  let closed = false, controlEpoch = 0, deviceEpoch = 0, frameWork = Promise.resolve();
  let activeRecord = null, firstReceipt = null, closePromise = null;
  let disposeSettled = false, teardown = 'active', lastVisualError = null, lastPlaybackEvent = null;
  const frameListeners = new Set(), stateListeners = new Set(), cleanedDevices = new WeakMap();
  const player = options.player ?? { id: 'preview-self', x: 490, y: 358, alive: true, invisible: true };
  const viewport = options.viewport ?? { kind: 'main', width: canvas.clientWidth || canvas.width, height: canvas.clientHeight || canvas.height,
    pixelWidth: canvas.width, pixelHeight: canvas.height };
  const width = options.width ?? canvas.width;
  const height = options.height ?? canvas.height;
  const camera = options.camera ?? { x: 0, y: 0 };
  const viewerId = options.viewerId ?? player.id;
  const zoom = options.zoom ?? 1;

  const reportStatus = value => { if (status) status.textContent = String(value); };
  const notify = set => {
    const value = getSnapshot();
    for (const callback of [...set]) { try { callback(value); } catch { /* observers do not control rendering */ } }
  };
  const notifyState = () => notify(stateListeners);

  function getSnapshot() {
    if (!playback) return null;
    let playbackState;
    try { playbackState = playback.snapshot(); } catch { return null; }
    const candidate = win.__floraCandidate;
    const matching = candidate && candidate.receipt?.completed === true &&
      candidate.causeId === playbackState.causeId && candidate.generation === playbackState.generation &&
      candidate.sourceOrigin === playbackState.sourceOrigin &&
      candidate.receipt.effectId === playbackState.causeId &&
      candidate.receipt.sourceOrigin === playbackState.sourceOrigin;
    const first = matching && firstReceipt && firstReceipt.causeId === playbackState.causeId && firstReceipt.generation === playbackState.generation
      ? firstReceipt : null;
    const receipt = first?.receipt;
    const audioState = audioContext?.state ?? 'unavailable';
    return {
      active: Boolean(playbackState.active),
      state: playbackState.state,
      lastVisualError,
      lastPlaybackEvent,
      causeId: playbackState.causeId,
      generation: playbackState.generation,
      sourceAgeMs: playbackState.ageMs,
      firstFrame: {
        recorded: Boolean(receipt),
        submitted: Boolean(receipt && finite(receipt.submittedAt) && receipt.submittedAt >= receipt.sourceOrigin),
        completed: Boolean(receipt?.completed === true && finite(receipt.completedAt)),
        canvasConnected: Boolean(canvas.isConnected),
        passes: receipt?.passes ?? null,
        viewportWidth: receipt?.width ?? canvas.width ?? null,
        viewportHeight: receipt?.height ?? canvas.height ?? null,
        causeId: receipt ? first.causeId : playbackState.causeId,
        generation: receipt ? first.generation : playbackState.generation,
        sourceAgeMs: receipt?.ageAtSubmit ?? null,
      },
      audio: { unlocked: audioState === 'running', contextState: audioState },
      lifecycle: { disposeSettled, teardown },
      muted: Boolean(playbackState.muted),
    };
  }

  function clearCurrentRecord() {
    activeRecord = null;
    firstReceipt = null;
    try { delete win.__floraCandidate; } catch { win.__floraCandidate = null; }
  }

  async function bounded(value) {
    if (!value) return { timedOut: false, value: undefined };
    return within(value, cleanupTimeoutMs, options.setTimeout ?? timeout, options.clearTimeout ?? clearTimeoutHandle);
  }

  function cleanupBundle(bundle) {
    const ownedDevice = bundle?.device;
    if (ownedDevice && cleanedDevices.has(ownedDevice)) return cleanedDevices.get(ownedDevice);
    const task = (async () => {
      const failures = [];
      if (bundle?.renderer) {
        const result = await bounded(Promise.resolve().then(() => bundle.renderer.dispose()));
        if (result.timedOut) failures.push(new Error('renderer retirement timed out'));
        else if (result.error) failures.push(result.error);
      }
      try { bundle?.context?.unconfigure?.(); } catch (error) { failures.push(error); }
      if (ownedDevice) {
        try { ownedDevice.destroy?.(); } catch (error) { failures.push(error); }
        const lost = ownedDevice.lost;
        if (lost && typeof lost.then === 'function') {
          const result = await bounded(lost);
          if (result.timedOut) failures.push(new Error('owned device lost notification pending after cleanup deadline'));
        }
      }
      return failures;
    })();
    if (ownedDevice) cleanedDevices.set(ownedDevice, task);
    return task;
  }

  async function prepare() {
    if (closed) throw new Error('preview disposed');
    if (renderer?.state === 'ready') return renderer;
    if (preparing) return preparing;
    const epoch = ++deviceEpoch;
    const task = (async () => {
      let localDevice = null, localContext = null, localRenderer = null;
      try {
        if (!nav?.gpu) throw new Error('WebGPU is unavailable');
        const adapter = await nav.gpu.requestAdapter();
        if (!adapter) throw new Error('GPU adapter unavailable');
        localDevice = await adapter.requestDevice();
        if (!localDevice) throw new Error('GPU device unavailable');
        if (closed || epoch !== deviceEpoch) {
          await cleanupBundle({ device: localDevice });
          return null;
        }
        localContext = canvas.getContext('webgpu');
        if (!localContext) throw new Error('WebGPU canvas context unavailable');
        const format = nav.gpu.getPreferredCanvasFormat();
        localContext.configure({ device: localDevice, format, alphaMode: 'opaque' });
        localRenderer = makeRenderer({ device: localDevice, context: localContext, format, width, height,
          deviceEpoch: epoch, clock, onDeviceLost: event => {
            if (closed || epoch !== deviceEpoch || device !== event.device || event.deviceEpoch !== epoch) return;
            lastVisualError = {message:`GPU lost: ${event.info?.message ?? event.info?.reason ?? 'unknown reason'}`};
            reportStatus(lastVisualError.message);
            notifyState();
          } });
        // Install owned handles before any asynchronous diagnostics so failure,
        // retry, and pagehide all clean this exact initialization attempt.
        device = localDevice; gpuContext = localContext; renderer = localRenderer;
        const [shaderDiagnostics, creationErrors] = await Promise.all([
          localRenderer.compilationInfo(), localRenderer.pipelineCreationErrors?.() ?? Promise.resolve([]),
        ]);
        const shaderErrors = shaderDiagnostics.flatMap(module => module.messages ?? []).filter(message => message.type === 'error');
        const scopeErrors = creationErrors.filter(scope => scope.error || scope.popFailed);
        if (localRenderer.state === 'failed' || localRenderer.initializationError || shaderErrors.length || scopeErrors.length) {
          const reasons = [localRenderer.initializationError?.message, ...shaderErrors.map(error => error.message), ...scopeErrors.map(scope => `${scope.filter}: ${scope.error?.message ?? 'scope pop failed'}`)].filter(Boolean);
          throw new Error(reasons.join('; ') || 'GPU pipeline initialization failed');
        }
        if (closed || epoch !== deviceEpoch) {
          await cleanupBundle({ renderer: localRenderer, context: localContext, device: localDevice });
          return null;
        }
        return localRenderer;
      } catch (error) {
        const failures = await cleanupBundle({ renderer: localRenderer, context: localContext, device: localDevice });
        if (renderer === localRenderer) renderer = null;
        if (device === localDevice) device = null;
        if (gpuContext === localContext) gpuContext = null;
        if (!closed && epoch === deviceEpoch) reportStatus(`GPU preparation failed: ${error?.message ?? error}`);
        if (failures.length) error.cleanupErrors = failures.map(item => item?.message ?? String(item));
        throw error;
      }
    })();
    preparing = task;
    try { return await task; }
    finally { if (preparing === task) preparing = null; }
  }

  function ensurePlayback() {
    if (playback) return playback;
    const Audio = win.AudioContext || win.webkitAudioContext;
    try { audioContext = verify || typeof Audio !== 'function' ? null : new Audio(); }
    catch (error) { audioContext = null; reportStatus(`SFX unavailable: ${error?.message ?? error} (visual playback continues)`); }
    playback = makePlayback({ clock, audioContext, createAudioBuffer: makeBuffer, verify,
      onState: event => {
        lastPlaybackEvent = event.event;
        if (event.event?.includes('error') || event.event?.includes('refused')) reportStatus(`SFX: ${event.event} (visual playback continues)`);
        notifyState();
      } });
    playback.setMuted(verify || Boolean(mutedInput?.checked));
    return playback;
  }

  function scheduleFrame() {
    if (closed || !requestFrame) return;
    raf = requestFrame(() => { raf = 0; void draw(); });
  }

  function draw() {
    if (closed) return Promise.resolve(false);
    const task = renderFrame();
    frameWork = task;
    return task;
  }

  async function renderFrame() {
    if (closed || !renderer || !playback) return false;
    const snapshot = playback.snapshot();
    if (!snapshot.active) {
      await renderer.clear();
      reportStatus('Ended');
      notifyState();
      return false;
    }
    const submittedAt = snapshot.sourceOrigin + snapshot.ageMs;
    const framePlan = plan({ effect, player, viewerId, now: submittedAt, phase: 'playing', camera, zoom, viewport,
      reducedMotion: Boolean(reducedInput?.checked) });
    if (!framePlan) return false;
    try {
      const receipt = await renderer.render(framePlan);
      const after = playback.snapshot();
      if (closed || after.generation !== snapshot.generation || after.causeId !== snapshot.causeId || after.sourceOrigin !== snapshot.sourceOrigin) return false;
      activeRecord = { causeId: snapshot.causeId, generation: snapshot.generation, sourceOrigin: snapshot.sourceOrigin,
        sourceAgeMs: receipt.ageAtSubmit, receipt };
      win.__floraCandidate = activeRecord;
      if (!firstReceipt || firstReceipt.causeId !== snapshot.causeId || firstReceipt.generation !== snapshot.generation) firstReceipt = activeRecord;
      notify(frameListeners);
      notifyState();
      if (snapshot.state === 'playing' && after.state === 'playing' && after.active) scheduleFrame();
      else if (!after.active) await renderer.clear();
      reportStatus(`${snapshot.state} ${Math.round(snapshot.ageMs)}ms; GPU frame complete`);
      return true;
    } catch (error) {
      cancelFrame(raf); raf = 0;
      if (!closed) { lastVisualError = {message:String(error?.message ?? error)}; reportStatus(`Frame failed: ${error?.message ?? error}`); notifyState(); }
      return false;
    }
  }

  async function replay() {
    if (closed) return false;
    const intent = ++controlEpoch;
    lastVisualError = null;
    cancelFrame(raf); raf = 0;
    ensurePlayback();
    // This is a user gesture path. Failure stays local to audio and never
    // blocks GPU initialization or the visual cause.
    void playback.unlockFromGesture();
    try {
      await prepare();
      await frameWork.catch(() => {});
      if (closed || intent !== controlEpoch || !renderer) return false;
      const cause = `preview-${++serial}`;
      clearCurrentRecord();
      if (!playback.begin(cause)) return false;
      const snapshot = playback.snapshot();
      effect = normalizeRawEvent({ id: cause, type: 'flora-invisible', playerId: player.id, viewerId, at: Date.now(), durationMs: 1600 }, snapshot.sourceOrigin);
      notifyState();
      await draw();
      return true;
    } catch (error) {
      if (!closed && intent === controlEpoch) { lastVisualError = {message:String(error?.message ?? error)}; reportStatus(`GPU preparation failed: ${error?.message ?? error}`); }
      notifyState();
      return false;
    }
  }

  function stop() {
    if (closed) return false;
    controlEpoch++;
    cancelFrame(raf); raf = 0;
    playback?.stop();
    notifyState();
    if (renderer) {
      const task = renderer.clear();
      frameWork = Promise.resolve(task).catch(error => { if (!closed) reportStatus(`Clear failed: ${error?.message ?? error}`); });
    }
    reportStatus('Stopped');
    return true;
  }

  async function hold(ageMs = 800) {
    if (closed || !playback) return false;
    controlEpoch++;
    cancelFrame(raf); raf = 0;
    if (!playback.hold(ageMs)) return false;
    notifyState();
    await frameWork.catch(() => {});
    if (closed || !renderer) return false;
    return draw();
  }

  function setMuted(value) {
    if (closed) return false;
    ensurePlayback();
    const result = playback.setMuted(verify || Boolean(value));
    notifyState();
    return result;
  }

  function unlockFromGesture() {
    if (closed) return Promise.resolve(false);
    ensurePlayback();
    const result = playback.unlockFromGesture();
    void Promise.resolve(result).then(notifyState, notifyState);
    return result;
  }

  function dispose() {
    if (closePromise) return closePromise;
    closed = true; teardown = 'closing'; controlEpoch++; deviceEpoch++;
    cancelFrame(raf); raf = 0;
    playback?.dispose();
    const bundle = { renderer, context: gpuContext, device };
    const audio = audioContext;
    closePromise = (async () => {
      const failures = [];
      const prep = preparing ? await bounded(preparing.catch(() => {})) : { timedOut: false };
      const gpu = await cleanupBundle(bundle);
      failures.push(...gpu);
      if (audio && audio.state !== 'closed' && typeof audio.close === 'function') {
        const result = await bounded(Promise.resolve().then(() => audio.close()));
        if (result.timedOut) failures.push(new Error('AudioContext.close timed out'));
        else if (result.error) failures.push(result.error);
      }
      if (prep.timedOut) failures.push(new Error('GPU preparation still pending; its late result remains guarded and will be cleaned on arrival'));
      renderer = null; device = null; gpuContext = null;
      disposeSettled = true;
      teardown = prep.timedOut ? 'disposed-with-pending-preparation' : failures.length ? 'disposed-with-cleanup-limit' : 'disposed';
      notifyState();
      return Object.freeze({ settled: true, teardown, failures: failures.map(error => error?.message ?? String(error)) });
    })();
    return closePromise;
  }

  function subscribe(set, callback) {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');
    set.add(callback);
    return () => set.delete(callback);
  }

  const controller = Object.freeze({
    replay, stop, hold, setMuted, unlockFromGesture, dispose,
    getSnapshot, subscribeFrame: callback => subscribe(frameListeners, callback),
    subscribeState: callback => subscribe(stateListeners, callback),
    isDisposed: () => closed,
  });
  activeController = controller;

  if (startButton) startButton.onclick = () => { void replay(); };
  if (stopButton) stopButton.onclick = stop;
  if (holdButton) holdButton.onclick = () => { void hold(800); };
  if (mutedInput) mutedInput.onchange = event => setMuted(event?.target?.checked ?? mutedInput.checked);
  if (reducedInput) reducedInput.onchange = () => { if (playback?.snapshot().state === 'held') void draw(); };
  doc.addEventListener?.('visibilitychange', () => { if (doc.hidden) stop(); });
  win.addEventListener?.('pagehide', () => { void dispose(); }, { once: true });
  notifyState();
  return controller;
}

// The standalone preview automatically owns one controller in its document.
// Importing this module in CPU fixtures remains side-effect free.
if (typeof globalThis.document !== 'undefined' && typeof globalThis.window !== 'undefined' && globalThis.document.querySelector?.('canvas')) {
  bootPreview();
}
