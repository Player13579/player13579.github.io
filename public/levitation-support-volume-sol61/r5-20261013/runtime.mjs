import { VERSION, ONSET_MS, validateSource } from './model.mjs';
import { createLevitationRenderer } from './renderer.mjs';
import { createLevitationAudio } from './audio.mjs';
import { synthesize, acousticPlan, AUDIO } from './sfx.mjs';

const STARTUP_SCHEMA = 'dva-gallery-startup/v1';
const ownLocation = new URL(location.href);
const params = ownLocation.searchParams;
const verify = params.has('verify');
const embedded = params.get('embed') === '1';
const galleryAutoLoop = params.get('galleryAutoLoop') !== '0';
const versionId = VERSION;
const token = params.get('galleryStartupToken');
const attemptEpoch = Number(params.get('galleryAttemptEpoch'));
const validIdentity = !embedded || (params.get('galleryVersionId') === versionId && /^[0-9a-f]{32}$/.test(token ?? '') && Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0);
const nowClock = () => performance.now();
const finiteNonNegative = (value, name) => {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and nonnegative`);
  return value;
};

export async function createLevitationRuntime({ canvas = document.querySelector('#effect'), onStatus = () => {} } = {}) {
  if (!validIdentity) throw new Error('invalid gallery version/token/attempt epoch');
  let renderer = null, audio = null, ready = false, disposed = false, retiring = false;
  let partialDevice = null, partialContext = null, releaseStartup;
  const startupSettled = new Promise(resolve => { releaseStartup = resolve; });
  let running = false, heldAge = null, heldSince = null, source = null, mode = 'loading';
  let generation = 0, sequence = 0, raf = 0, stopPromise = null, stopResolve = null, frameTail = Promise.resolve();
  let sourceOn = true, observerOn = true, reducedMotion = false, brightBackground = false;
  let fixtureH = Number(params.get('height') ?? 64);
  if (!Number.isFinite(fixtureH) || fixtureH < 16 || fixtureH > 256) throw new RangeError('height query must be 16..256 CSS pixels');
  const errors = [];
  let lastFrameReceipt = null, retireRequest = null, blankUntil = 0, phase = 'child-document';
  function isTerminalStopReceipt(receipt, expectedSource = source) {
    return Boolean(expectedSource && !expectedSource.active && expectedSource.endedAt !== null && receipt &&
      receipt.sourceId === expectedSource.id && receipt.causeId === expectedSource.causeId &&
      receipt.generation === expectedSource.generation && receipt.stage === 'expired' &&
      receipt.completed === true && receipt.queueCompleted === true && Number.isFinite(receipt.sourceAgeMs) &&
      receipt.sourceAgeMs >= expectedSource.endedAt - expectedSource.startedAt + 420);
  }
  const sourceStart = () => {
    const startedAt = nowClock();
    stopPromise = null; stopResolve = null;
    generation = Math.max(1, generation + 1);
    const id = `levitation-support-${generation}`;
    const rect = canvas.getBoundingClientRect();
    const centerX = Math.max(1, rect.width) * 0.5, bodyY = Math.max(1, rect.height) * (150 / 360);
    source = { type: 'gravity-levitation', id, playerId: 'synthetic-diagnostic-player',
      causeId: `${id}@${Math.trunc(startedAt)}`, generation, active: true, startedAt, endedAt: null,
      bodyWorld: { x: centerX, y: bodyY }, feetWorld: { x: centerX, y: bodyY + fixtureH / 2 }, synthetic: true };
    mode = 'playing'; heldAge = null; heldSince = null; blankUntil = 0;
    return source;
  };
  const currentNow = () => heldAge === null ? nowClock() : source.startedAt + heldAge;
  function send(status, stage, extra = {}) {
    onStatus({ status, stage, sequence: ++sequence, ...extra });
    if (!embedded || window.parent === window) return;
    const message = { schema: STARTUP_SCHEMA, status, stage, sequence,
      token, versionId, attemptEpoch, ...extra };
    window.parent.postMessage(message, location.origin);
  }
  const audioSnapshot = () => audio?.snapshot?.() ?? { verify, muted: true, voices: 0, errors: [] };
  function firstFrame(receipt) {
    return Object.freeze({ recorded: true, submitted: true, completed: receipt.completed === true,
      canvasConnected: canvas.isConnected, passes: 4, viewportWidth: receipt.pixelWidth, viewportHeight: receipt.pixelHeight,
      source: receipt.source, observer: receipt.observer, sameEncoder: receipt.sameEncoder,
      queueCompleted: receipt.queueCompleted, uniformByteLength: receipt.uniformByteLength,
      sourceId: receipt.sourceId, causeId: receipt.causeId, generation: receipt.generation,
      sourceAgeMs: receipt.sourceAgeMs, stage: receipt.stage, bodyWorld: receipt.bodyWorld, feetWorld: receipt.feetWorld,
      pixelRatio: receipt.pixelRatio, fixtureHeightCss: receipt.fixtureHeightCss, syntheticFixture: receipt.syntheticFixture,
      sourceEnabled: receipt.sourceEnabled, observerEnabled: receipt.observerEnabled, verify: receipt.verify,
      submission: receipt.submission, versionId: receipt.versionId });
  }
  function handleDeviceLost(info) {
    if (!info || info.reason === 'destroyed') return;
    errors.push({ kind: 'device-lost', ...info }); mode = 'error';
    send('error', phase, { error: `WebGPU device lost: ${info.reason}` });
  }

  async function performRenderFrame() {
    if (disposed || !renderer || !source) return null;
    const nowMs = currentNow();
    if (!source.active && source.endedAt !== null && nowMs >= source.endedAt + 420 && mode === 'stopping') {
      const receipt = await renderer.render({ actor: source, nowMs, sourceOn, observerOn, reducedMotion, brightBackground });
      lastFrameReceipt = receipt;
      if (isTerminalStopReceipt(receipt) && stopResolve) {
        const resolve = stopResolve; stopResolve = null; resolve(receipt);
        mode = 'stopped'; running = false;
      }
      return receipt;
    }
    const receipt = await renderer.render({ actor: source, nowMs, sourceOn, observerOn, reducedMotion, brightBackground });
    lastFrameReceipt = receipt;
    if (!ready && receipt.completed && receipt.queueCompleted) {
      ready = true; phase = 'playing'; mode = 'playing';
      send('ready', 'playing', { firstFrame: firstFrame(receipt) });
    }
    if (source.active && heldAge === null && nowMs - source.startedAt >= 1800) {
      source = { ...source, active: false, endedAt: source.startedAt + 1800 };
      mode = 'ending';
      audio?.update?.(source, nowMs);
    }
    if (!source.active && source.endedAt !== null && nowMs >= source.endedAt + 420 && mode !== 'stopping' && mode !== 'stopped') {
      mode = 'blank'; blankUntil ||= nowClock() + 160;
    }
    if (mode === 'blank' && galleryAutoLoop && heldAge === null && !retiring && nowClock() >= blankUntil) {
      sourceStart(); audio?.update?.(source, nowClock()); mode = 'playing';
    }
    return receipt;
  }
  async function renderFrame() {
    const work = frameTail.then(() => performRenderFrame());
    frameTail = work.catch(() => null);
    return await work;
  }
  async function tick() {
    if (!running || disposed) return;
    try {
      const nowMs = currentNow();
      audio?.update?.(source, nowMs);
      const receipt = await renderFrame();
      if (source && source.active && heldAge === null && nowClock() - source.startedAt >= 1800) {
        source = { ...source, active: false, endedAt: source.startedAt + 1800 };
        mode = 'ending'; audio?.update?.(source, nowClock());
      }
      if (!running || disposed) return;
      if (mode === 'stopping' && isTerminalStopReceipt(receipt)) {
        const resolve = stopResolve; stopResolve = null; mode = 'stopped'; running = false;
        if (resolve) resolve(receipt); return;
      }
      raf = requestAnimationFrame(tick);
    } catch (error) {
      errors.push({ kind: 'render', message: String(error?.stack ?? error) });
      mode = 'error'; running = false; send('error', phase, { error: String(error?.message ?? error) });
      if (stopResolve) { const resolve = stopResolve; stopResolve = null; resolve(null); }
    }
  }
  function ensureRunning() {
    if (!running && !disposed) { running = true; raf = requestAnimationFrame(tick); }
  }
  async function stop() {
    if (disposed) return lastFrameReceipt;
    if (mode === 'stopped') return lastFrameReceipt;
    if (mode === 'stopping' && stopPromise) return await stopPromise;
    const logicalNow = currentNow();
    retiring = true; heldAge = null; heldSince = null;
    if (!source) { mode = 'stopped'; running = false; cancelAnimationFrame(raf); return null; }
    const endNow = nowClock();
    if (source.active) {
      source = { ...source, active: false, endedAt: endNow };
    } else if (source.endedAt !== null && logicalNow >= source.endedAt + 420 &&
        lastFrameReceipt?.completed === true && lastFrameReceipt?.queueCompleted === true &&
        lastFrameReceipt?.causeId === source.causeId && lastFrameReceipt?.generation === source.generation &&
        lastFrameReceipt?.stage === 'expired') {
      // An already-fenced terminal frame is the flush; never restart its 420ms collapse.
      mode = 'stopped'; running = false; cancelAnimationFrame(raf); return lastFrameReceipt;
    }
    mode = 'stopping'; blankUntil = 0;
    audio?.update?.(source, endNow);
    ensureRunning();
    if (!stopPromise) stopPromise = new Promise(resolve => { stopResolve = resolve; });
    return await stopPromise;
  }
  async function dispose() {
    if (disposed) return { disposeCompleted: false, deviceLifecycle: renderer?.deviceStatus ?? 'unknown' };
    if (mode !== 'stopped') await stop();
    running = false; cancelAnimationFrame(raf);
    await renderer?.fence?.();
    await audio?.stop?.();
    await audio?.dispose?.();
    const gpu = await renderer?.dispose?.();
    disposed = true; mode = 'disposed';
    return { disposeCompleted: true, deviceLifecycle: renderer?.deviceStatus ?? 'destroyed-loss-settled', device: gpu };
  }
  async function retire() {
    if (retireRequest) return retireRequest;
    retiring = true;
    retireRequest = (async () => {
      if (!ready && !disposed) await startupSettled;
      if (disposed) return { disposeCompleted: true, deviceLifecycle: renderer?.deviceStatus ?? 'unknown' };
      await stop();
      const disposal = await dispose();
      const receipt = lastFrameReceipt;
      if (embedded) send('retired', 'playing', { action: 'retired', lifecycle: {
        disposeSettled: disposal.disposeCompleted === true, teardown: 'disposed', deviceLifecycle: disposal.deviceLifecycle,
        device: { status: disposal.deviceLifecycle, drained: true, destroyCalled: true,
          lostReason: disposal.device?.deviceStatus ?? 'destroyed' },
        sourceId: receipt?.sourceId ?? source?.id, causeId: receipt?.causeId ?? source?.causeId,
        generation: receipt?.generation ?? source?.generation, finalSubmission: receipt?.submission ?? null,
        queueCompleted: receipt?.queueCompleted === true
      } });
      return disposal;
    })();
    return retireRequest;
  }
  function onMessage(event) {
    if (!embedded || event.origin !== location.origin || event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.action !== 'retire' || data.token !== token || data.versionId !== versionId || data.attemptEpoch !== attemptEpoch) return;
    retire().catch(error => { errors.push({ kind: 'retire', message: String(error) }); });
  }
  window.addEventListener('message', onMessage);
  try {
    phase = 'child-document'; send(embedded ? 'pending' : 'delayed', 'child-document');
    renderer = await createLevitationRenderer({ canvas, verify, onDeviceLost: handleDeviceLost,
      onDeviceCreated(device, context) { partialDevice = device; partialContext = context; },
      onProgress(stage) { phase = stage; send(embedded ? 'pending' : 'delayed', stage); } });
    phase = 'first-frame'; send(embedded ? 'pending' : 'delayed', 'first-frame');
    audio = createLevitationAudio({ verify, pcm: synthesize, plan: acousticPlan, audio: AUDIO, transitionMs: ONSET_MS,
      validateSource, clockNow: nowClock, onNaturalEnd: () => {} });
    sourceStart();
    if (embedded) send('pending', 'first-frame');
    running = true;
    await tick();
    releaseStartup();
  } catch (error) {
    errors.push({ kind: 'startup', message: String(error?.stack ?? error) }); mode = 'error'; running = false;
    send('error', phase, { error: String(error?.message ?? error) });
    try { await audio?.dispose?.(); } catch { /* preserve startup error */ }
    try { await renderer?.dispose?.(); } catch { /* preserve startup error */ }
    if (!renderer && partialDevice) {
      try { partialContext?.unconfigure(); } catch { /* preserve startup error */ }
      try { partialDevice.destroy(); await partialDevice.lost; } catch { /* preserve startup error */ }
    }
    releaseStartup();
    throw error;
  }
  const api = Object.freeze({
    snapshot() { return Object.freeze({ ready, versionId, mode, causeId: source?.causeId ?? null, generation: source?.generation ?? 0,
      lastReceipt: lastFrameReceipt && firstFrame(lastFrameReceipt), verify, muted: verify || Boolean(audioSnapshot().muted),
      activeVoices: audioSnapshot().activeVoices ?? audioSnapshot().voiceCount ?? (Array.isArray(audioSnapshot().voices) ? audioSnapshot().voices.length : 0), disposeCompleted: disposed,
      deviceLifecycle: renderer?.deviceStatus ?? 'unknown', sourceOn, observerOn, syntheticFixture: Boolean(source?.synthetic),
      fixtureHeightCss: fixtureH, errors: [...errors] }); },
    async hold(sourceAgeMs, endedAtAgeMs = null) {
      finiteNonNegative(sourceAgeMs, 'sourceAgeMs');
      if (endedAtAgeMs !== null) { finiteNonNegative(endedAtAgeMs, 'endedAtAgeMs'); if (endedAtAgeMs > sourceAgeMs) throw new RangeError('endedAtAgeMs must not exceed sourceAgeMs'); }
      if (!source) sourceStart();
      const now = nowClock(); heldAge = sourceAgeMs; heldSince = now;
      source = { ...source, startedAt: now - sourceAgeMs, active: endedAtAgeMs === null,
        endedAt: endedAtAgeMs === null ? null : now - sourceAgeMs + endedAtAgeMs };
      mode = 'holding'; audio?.hold?.(); ensureRunning();
      const receipt = await renderFrame(); return receipt;
    },
    async fence() { const receipt = await renderer?.fence?.(); return receipt && firstFrame(receipt); },
    async resume() {
      if (heldAge === null || !source) { ensureRunning(); return false; }
      const current = nowClock(), age = heldAge;
      source = { ...source, startedAt: current - age, endedAt: source.endedAt === null ? null : current - age + (source.endedAt - (source.startedAt ?? 0)), active: source.endedAt === null };
      heldAge = null; heldSince = null; mode = source.active ? 'playing' : 'ending'; audio?.resume?.(); audio?.update?.(source, current); ensureRunning();
      return true;
    },
    async setOptions(options = {}) {
      if ('fixtureH' in options) {
        const h = finiteNonNegative(options.fixtureH, 'fixtureH'); if (h < 16 || h > 256) throw new RangeError('fixtureH must be 16..256 CSS pixels'); fixtureH = h;
        if (source?.synthetic) source = { ...source, feetWorld: { x: source.bodyWorld.x, y: source.bodyWorld.y + h / 2 } };
      }
      if ('sourceOn' in options) { if (typeof options.sourceOn !== 'boolean') throw new TypeError('sourceOn boolean required'); sourceOn = options.sourceOn; }
      if ('source' in options && typeof options.source === 'boolean') sourceOn = options.source;
      if ('observerOn' in options) { if (typeof options.observerOn !== 'boolean') throw new TypeError('observerOn boolean required'); observerOn = options.observerOn; }
      if ('observer' in options) { if (typeof options.observer !== 'boolean') throw new TypeError('observer boolean required'); observerOn = options.observer; }
      if ('brightBackground' in options) { if (typeof options.brightBackground !== 'boolean') throw new TypeError('brightBackground boolean required'); brightBackground = options.brightBackground; }
      if ('reducedMotion' in options) { if (typeof options.reducedMotion !== 'boolean') throw new TypeError('reducedMotion boolean required'); reducedMotion = options.reducedMotion; }
      if ('pixelRatio' in options) throw new TypeError('pixelRatio is measured from the actual device, not overridden');
      if ('sourceActor' in options) source = validateSource(options.sourceActor);
      if ('sourceActor' in options) audio?.update?.(source, currentNow());
      const receipt = await renderFrame(); return receipt && firstFrame(receipt);
    },
    replay() { if (disposed) throw new Error('runtime disposed'); retiring = false; sourceStart(); audio?.resume?.(); audio?.update?.(source, nowClock()); ensureRunning(); return source; },
    stop,
    dispose,
    enableAudio() { if (verify) return false; return audio?.enable?.() ?? false; },
    async retire() { return retire(); }
  });
  window.__levitation = api;
  return api;
}

export async function bootLevitation() {
  const runtime = await createLevitationRuntime({ canvas: document.querySelector('#effect') });
  const button = document.querySelector('#enable-audio');
  if (button) {
    button.disabled = verify;
    button.hidden = verify;
    button.addEventListener('click', async () => {
      try { const result = await runtime.enableAudio(); button.textContent = result?.ok === true ? 'Sound enabled' : 'Sound unavailable'; }
      catch (error) { button.textContent = `Sound unavailable: ${error.message}`; }
    });
  }
  document.querySelector('#source-toggle')?.addEventListener('change', e => runtime.setOptions({ sourceOn: e.target.checked }));
  document.querySelector('#observer-toggle')?.addEventListener('change', e => runtime.setOptions({ observerOn: e.target.checked }));
  document.querySelector('#background-toggle')?.addEventListener('change', e => runtime.setOptions({ brightBackground: e.target.checked }));
  return runtime;
}
