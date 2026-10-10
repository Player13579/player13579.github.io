import { createRuntime, THROW_EVENT } from './runtime.mjs';
import { createThrowSfx } from './sfx.mjs';

export function createGalleryAdapter({
  canvas, params = new URLSearchParams(globalThis.location?.search || ''),
  runtimeFactory = createRuntime, sfxFactory = createThrowSfx,
  now = () => globalThis.performance.now(), requestFrame = cb => globalThis.requestAnimationFrame(cb),
  cancelFrame = id => globalThis.cancelAnimationFrame(id), setTimer = (cb, ms) => globalThis.setTimeout(cb, ms),
  clearTimer = id => globalThis.clearTimeout(id), post = message => globalThis.parent?.postMessage(message, globalThis.location.origin),
  status = () => {}, verify = params.has('verify'), autoLoop = params.get('galleryAutoLoop') === '1',
  onStatus = () => {},
} = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('WebGPU canvas required');
  const token = params.get('galleryStartupToken'), versionId = params.get('galleryVersionId');
  const attemptEpoch = Number(params.get('galleryAttemptEpoch'));
  const parentHandshake = params.has('embed') && token && versionId === 'ordinary-item-throw-sol61-r3' && Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0;
  const startup = { schema: 'dva-gallery-startup/v1', token, versionId, attemptEpoch, sequence: 0, stage: 'child-document', ready: false };
  let runtime, sfx, disposed = false, raf = 0, timer = 0, busy = false, cycle = 0, event = null, lastFrameReceipt = null;
  let heldAge = null, sourceEnabled = true, observerEnabled = true, sfxEnabled = false, frameCount = 0;
  const played = new Set(), errors = [], sfxFailures = [], durationMs = 600;
  const lifecycle = { value: 1 };
  const ownOrigin = globalThis.location?.origin;

  function report(value) {
    const record = { at: now(), ...value };
    onStatus(record); status(record); return record;
  }
  function send(stage, state, extra = {}) {
    if (!parentHandshake || disposed) return;
    startup.sequence++; startup.stage = stage;
    post({ schema: startup.schema, token, versionId, attemptEpoch, sequence: startup.sequence, stage, status: state, ...extra });
  }
  function beginCycle(startAt = now()) {
    if (disposed) return false;
    if (raf) cancelFrame(raf); raf = 0;
    if (timer) clearTimer(timer); timer = 0;
    heldAge = null;
    const serial = ++cycle;
    event = Object.freeze({ id: `ordinary-throw-r3-preview-cause-${serial}`, type: THROW_EVENT,
      variant: 'flight:ordinary-probe', playerId: 'preview-owner', success: true,
      x: 205, y: 390, targetX: 775, targetY: 290, startedAt: startAt, duration: durationMs });
    report({ type: 'cycle-start', eventId: event.id, startedAt: event.startedAt, durationMs });
    schedule(); return true;
  }
  function currentAge(at = now()) {
    if (!event) return null;
    return Math.max(0, Math.min(durationMs, heldAge == null ? at - event.startedAt : heldAge));
  }
  function schedule() {
    if (!disposed && !raf && !busy) raf = requestFrame(tick);
  }
  async function tick(timestamp) {
    raf = 0;
    if (disposed || busy || !runtime) return;
    busy = true;
    const lease = lifecycle.value, liveEvent = event, ageMs = currentAge(Number.isFinite(timestamp) ? timestamp : now());
    try {
      await runtime.resize();
      const size = runtime.size;
      const width = Math.max(1, size?.width || canvas.width || Math.round(canvas.clientWidth || 980));
      const height = Math.max(1, size?.height || canvas.height || Math.round(canvas.clientHeight || 620));
      const worldToPixel = width / 980;
      const receipt = await runtime.render({ event: liveEvent, nowMs: liveEvent.startedAt + ageMs,
        sourceEnabled, observerEnabled, width, height, worldToPixel,
        project: point => ({ x:point.x*worldToPixel, y:point.y*worldToPixel }) });
      if (disposed || lease !== lifecycle.value || liveEvent !== event) return;
      const completed = await receipt.completed;
      if (disposed || lease !== lifecycle.value || liveEvent !== event) return;
      lastFrameReceipt = Object.freeze({ status:receipt.status,eventId:receipt.eventId,ageMs:receipt.ageMs,
        durationMs:receipt.durationMs,sourceEnabled:receipt.sourceEnabled,observerEnabled:receipt.observerEnabled,
        submitted:receipt.submitted===true,completed:completed===true,width:receipt.width,height:receipt.height,
        targetFormats:receipt.targetFormats,frameUniformBytes:receipt.frameUniformBytes,worldSourceSha256:runtime.worldSourceSha256 });
      frameCount++;
      const state = { eventId: liveEvent.id, ageMs, durationMs, sourceEnabled, observerEnabled,
        submitted: receipt.submitted === true, completed: completed === true, width: receipt.width, height: receipt.height,
        status: receipt.status, frameCount, errors: [...errors] };
      report({ type: 'frame', ...state });
      if (receipt.status === 'active' && completed === true && sourceEnabled && sfxEnabled && !verify && !played.has(liveEvent.id)) {
        const speed = Math.hypot(liveEvent.targetX - liveEvent.x, liveEvent.targetY - liveEvent.y) / liveEvent.duration;
        try {
          const result = sfx.play({ causeId: liveEvent.id, speedWorldPerMs: speed, durationMs,
            verify, enabled: true, visibleFrameComplete: true });
          if (result?.status === 'started') played.add(liveEvent.id);
          else if (result?.status === 'retryable-failure') {
            const failure = { eventId: liveEvent.id, stage: result.stage || 'unknown', message: result.message || 'audio setup failed' };
            sfxFailures.push(failure);
            report({ type: 'sfx-retryable-failure', ...failure });
          }
        } catch (error) {
          // Audio failure is not a render failure. Leave this event eligible for
          // retry after the next completed visible frame and keep the RAF alive.
          const failure = { eventId: liveEvent.id, stage: 'play-call', message: String(error?.message || error) };
          sfxFailures.push(failure);
          report({ type: 'sfx-retryable-failure', ...failure });
        }
      }
      if (ageMs >= durationMs) {
        report({ type: 'cycle-expired', eventId: liveEvent.id, ageMs, durationMs });
        if (autoLoop) { timer = setTimer(() => { timer = 0; beginCycle(now()); }, 0); }
        return;
      }
      if (parentHandshake && !startup.ready && receipt.status === 'active' && receipt.submitted === true && completed === true) {
        startup.ready = true;
        send('playing', 'ready', { firstFrame: { recorded: true, submitted: true, completed: true,
          canvasConnected: canvas.isConnected !== false, passes: Array.isArray(receipt.targetFormats) ? receipt.targetFormats.length : 1,
          viewportWidth: receipt.width || width, viewportHeight: receipt.height || height, eventId: liveEvent.id,
          ageMs, durationMs, sourceEnabled, observerEnabled } });
      }
    } catch (error) {
      errors.push(String(error?.message || error));
      report({ type: 'error', message: String(error?.stack || error) });
      send(startup.ready ? 'playing' : startup.stage, 'error', { error: { code: 'THROW_R3_PREVIEW_ERROR', message: String(error?.message || error).slice(0, 500) } });
      await retire(); return;
    } finally {
      busy = false;
      if (!disposed && liveEvent !== event) schedule();
    }
    schedule();
  }
  function setPhase(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('phase must be in [0,1]');
    if (!event) beginCycle();
    heldAge = value * durationMs;
    report({ type: 'hold', eventId: event.id, ageMs: heldAge, durationMs }); schedule();
  }
  function hold() { if (!event) return setPhase(0); setPhase(currentAge() / durationMs); }
  function resume() { heldAge = null; report({ type: 'resume', eventId: event?.id, ageMs: currentAge() }); schedule(); }
  function setSource(enabled) {
    sourceEnabled = Boolean(enabled); if (!sourceEnabled) sfx?.stopAll();
    report({ type: 'source-control', sourceEnabled, eventId: event?.id }); schedule();
  }
  function setObserver(enabled) {
    observerEnabled = Boolean(enabled); report({ type: 'observer-control', observerEnabled, eventId: event?.id }); schedule();
  }
  async function enableSfx() {
    if (verify || disposed) return { status: 'silent-gated' };
    sfx ??= sfxFactory(); await sfx.unlock(); sfxEnabled = true;
    report({ type: 'sfx-unlocked', verify: false }); schedule(); return { status: 'enabled' };
  }
  async function retire() {
    if (disposed) return;
    send(startup.stage, 'cancelled'); disposed = true; lifecycle.value++;
    if (raf) cancelFrame(raf); raf = 0;
    if (timer) clearTimer(timer); timer = 0;
    sfx?.stopAll(); await sfx?.dispose(); await runtime?.dispose();
    report({ type: 'retired', frameCount, errors: [...errors] });
  }
  async function initialize() {
    if (disposed) throw new Error('gallery attempt already retired');
    if (parentHandshake) send('child-document', 'pending');
    if (parentHandshake) send('adapter', 'pending');
    try {
      runtime = await runtimeFactory({ canvas, shaderUrl: './world.wgsl', onStatus: message => {
        if (message.type === 'device-lost' || message.type === 'uncaptured-gpu-error' || message.type === 'queue-fence-error') {
          const reason = String(message.message || message.type);
          errors.push(reason); report({ type: message.type, message });
          send(startup.ready ? 'playing' : startup.stage, 'error', { error:{code:String(message.type).toUpperCase().replaceAll('-','_'),message:reason.slice(0,500)} });
          void retire();
        }
      } });
      if (disposed) { await runtime.dispose(); return api; }
      if (parentHandshake) send('first-frame', 'pending');
      beginCycle(now());
      return api;
    } catch (error) {
      errors.push(String(error?.message || error));
      report({ type: 'startup-error', message: String(error?.stack || error) });
      send('adapter', 'error', { error: { code: 'THROW_R3_STARTUP_ERROR', message: String(error?.message || error).slice(0, 500) } });
      await retire(); throw error;
    }
  }
  function snapshot() { return Object.freeze({ version: 'ordinary-item-throw-sol61-r3', ready: startup.ready,
    startup: Object.freeze({ ...startup }), frameCount, event: event && { ...event }, frame: lastFrameReceipt, ageMs: currentAge(), durationMs,
    sourceEnabled, observerEnabled, sfxEnabled: sfxEnabled && !verify, verify, autoLoop, held: heldAge != null,
    errors: [...errors], sfxFailures: [...sfxFailures], runtimeReady: Boolean(runtime), disposed }); }
  const api = Object.freeze({ initialize, replay: () => beginCycle(now()), hold, setPhase, resume, setSource, setObserver,
    enableSfx, retire, snapshot, get runtime() { return runtime; } });
  return api;
}

const canvas = globalThis.document?.querySelector('#fx');
if (canvas) {
  const params = new URLSearchParams(location.search), verify = params.has('verify');
  const statusNode = document.querySelector('#status');
  const adapter = createGalleryAdapter({ canvas, params, verify, status: value => {
    if (statusNode) statusNode.textContent = JSON.stringify(value, null, 2);
  } });
  const startupSnapshot = () => ({ schema: 'dva-gallery-startup/v1', token: params.get('galleryStartupToken'),
    versionId: params.get('galleryVersionId'), attemptEpoch: Number(params.get('galleryAttemptEpoch')) });
  Object.defineProperty(globalThis, '__dvaGalleryStartupSnapshot', { value: startupSnapshot });
  Object.defineProperty(globalThis, '__throwR3Gallery', { value: adapter });
  const controls = {
    replay: document.querySelector('#replay'), hold: document.querySelector('#hold'), phase: document.querySelector('#phase'),
    resume: document.querySelector('#resume'), source: document.querySelector('#source'), observer: document.querySelector('#observer'), sfx: document.querySelector('#sfx')
  };
  controls.replay?.addEventListener('click', () => adapter.replay());
  controls.hold?.addEventListener('click', () => adapter.setPhase(Number(controls.phase.value) / 1000));
  controls.resume?.addEventListener('click', () => adapter.resume());
  controls.source?.addEventListener('change', () => adapter.setSource(controls.source.checked));
  controls.observer?.addEventListener('change', () => adapter.setObserver(controls.observer.checked));
  controls.sfx?.addEventListener('click', () => adapter.enableSfx());
  if (verify && controls.sfx) controls.sfx.disabled = true;
  const onParentMessage = event => {
    if (event.source !== parent || event.origin !== location.origin) return;
    const data = event.data;
    if (data?.schema === 'dva-gallery-startup/v1' && data.action === 'retire' &&
        data.token === params.get('galleryStartupToken') && data.versionId === params.get('galleryVersionId') &&
        data.attemptEpoch === Number(params.get('galleryAttemptEpoch'))) void adapter.retire();
  };
  addEventListener('message', onParentMessage);
  addEventListener('pagehide', () => { removeEventListener('message', onParentMessage); void adapter.retire(); }, { once: true });
  void adapter.initialize().catch(() => {});
}
