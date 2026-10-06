import { createIaiHost } from './package/renderer.mjs';
import { createIaiGallerySfxApi } from './package/gallery-sfx-api.mjs';
import { createSerialRaf } from './package/serial-raf.mjs';

const $ = id => document.getElementById(id);
const canvas = $('field');
const params = new URLSearchParams(location.search);
const verify = params.has('verify');
const embedded = parent !== window;
document.body.classList.toggle('embed', params.get('embed') === '1');
$('mode').textContent = verify ? 'Verification mode: audio forced off' : 'Normal preview: sound requires explicit user-gesture unlock';

function createStartup() {
  const token = String(params.get('galleryStartupToken') || '');
  const versionId = String(params.get('galleryVersionId') || '');
  const attemptEpoch = Number(params.get('galleryAttemptEpoch'));
  const valid = !embedded || (!!token && versionId === 'iai-result-zero-sol61-r1' && Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0);
  let sequence = 0, terminal = false, readySent = false, cleanup = () => {};
  const forwardedPhases = new Set();
  function emit(stage, status = 'pending', extra = {}) {
    if (!valid || terminal && !['error', 'cancelled'].includes(status) || readySent && !['error', 'cancelled'].includes(status)) return false;
    const message = { schema: 'dva-gallery-startup/v1', token, versionId, attemptEpoch, sequence: ++sequence, stage, status,
      startedAtMs, elapsedMs: Math.max(0, performance.now() - startedAtMs), ...extra };
    if (embedded) parent.postMessage(message, location.origin);
    return true;
  }
  const startedAtMs = performance.now();
  const onRetire = event => {
    const d = event.data;
    if (embedded && event.source === parent && event.origin === location.origin && d?.schema === 'dva-gallery-startup/v1' &&
        d.action === 'retire' && d.token === token && d.versionId === versionId && d.attemptEpoch === attemptEpoch) {
      terminal = true; cleanup(); emit('playing', 'cancelled');
    }
  };
  if (embedded) addEventListener('message', onRetire);
  addEventListener('pagehide', () => { terminal = true; cleanup(); }, { once: true });
  if (valid) emit('child-document');
  return {
    get enabled() { return valid && !terminal; },
    setCleanup(fn) { cleanup = fn; },
    advance(stage) { if (forwardedPhases.has(stage)) return false; forwardedPhases.add(stage); return emit(stage); },
    ready(proof) { if (readySent || !this.enabled) return false; const sent = emit('playing', 'ready', { firstFrame: proof }); if (sent) readySent = true; return sent; },
    fail(error, code = 'IAI_PREVIEW_ERROR') { if (terminal) return; terminal = true; cleanup(); emit('playing', 'error', { error: { code, message: String(error?.message ?? error).slice(0, 500) } }); }
  };
}
const startup = createStartup();
if (embedded && !startup.enabled) throw new Error('Missing legitimate gallery attempt identity');

let rect = canvas.getBoundingClientRect();
let renderer;
function resizeCanvas() {
  rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; renderer?.resize(); }
}
resizeCanvas();
let live = false, held = false, disposed = false, causeCounter = 0, cause = null, suppressCauseAudioId = null;
let startWall = 0, baseEms = 0, frozenEms = 0, rate = Number($('rate').value), expiryTimer = 0, loopTimer = 0;
renderer = createIaiHost({ canvas, verify, report: event => {
  const phases = { adapter: 'adapter', device: 'device', shader: 'assets', pipeline: 'pipelines', 'first-frame': 'first-frame' };
  if (phases[event.stage]) startup.advance(phases[event.stage]);
  if (event.trace) $('status').textContent = JSON.stringify({ startupTrace: event.trace }, null, 2);
  if (event.stage === 'proof-rejected') $('status').textContent = `Frame rejected: ${JSON.stringify(event, null, 2)}\n${JSON.stringify(renderer?.diagnostics ?? {}, null, 2)}`;
}, startupTrace: params.get('startupTrace') === '1', attemptIdentity: {
  token: params.get('galleryStartupToken') || null, versionId: params.get('galleryVersionId') || null,
  attemptEpoch: params.has('galleryAttemptEpoch') && Number.isSafeInteger(Number(params.get('galleryAttemptEpoch'))) ? Number(params.get('galleryAttemptEpoch')) : null,
} });
function eNow() { return held ? frozenEms : baseEms + Math.max(0, performance.now() - startWall) * rate; }
function readClock() { return { clockId: 'iai-preview-eclock', clockKind: 'preview', clockOwnerId: null, eNowMs: eNow(), eTimeScale: rate }; }
function projection(source) {
  rect = canvas.getBoundingClientRect();
  const cameraX = rect.width * 0.5, cameraY = rect.height * 0.52;
  const worldToCss = rect.width / 980;
  return { x: cameraX + source.targetX * worldToCss,
    y: cameraY - source.targetY * worldToCss, scale: worldToCss };
}
function frameFor(source) {
  rect = canvas.getBoundingClientRect();
  return { currentSource: source, roomCurrent: true, visible: !document.hidden, roomId: 'iai-gallery-preview-room', generation: 1,
    targetGeneration: renderer.diagnostics.targetGeneration, lease: renderer.diagnostics.lease, clockId: 'iai-preview-eclock',
    clockKind: 'preview', clockOwnerId: null, clockRoomId: 'iai-gallery-preview-room', eNowMs: eNow(), eTimeScale: rate, readClock,
    viewport: { width: canvas.width, height: canvas.height }, project: () => projection(source), sourceEnabled: $('source').checked,
    mainEnabled: $('main').checked, observerEnabled: $('observer').checked, observerGain: 0.11, held,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
}
function contextFor() { return { roomId: 'iai-gallery-preview-room', generation: 1, targetGeneration: renderer.diagnostics.targetGeneration,
  lease: renderer.diagnostics.lease, clockId: 'iai-preview-eclock', clockKind: 'preview', clockOwnerId: null, receivedAtEms: 0 }; }
function clearTimer(which) { clearTimeout(which === 'expiry' ? expiryTimer : loopTimer); if (which === 'expiry') expiryTimer = 0; else loopTimer = 0; }
function scheduleExpiry() {
  clearTimer('expiry');
  if (!live || held || disposed || document.hidden || !cause) return;
  const left = Math.max(0, 900 - eNow());
  expiryTimer = setTimeout(() => { if (!live || held || disposed) return; if (eNow() >= 900) { live = false; loop.refresh(); void observe(); if (autoLoop) loopTimer = setTimeout(startCause, 80); } else scheduleExpiry(); }, left / Math.max(rate, 0.01));
}
let startupReported = false;
async function performObserve() {
  if (disposed || held || document.hidden || !cause) return;
  await renderer.ready;
  if (disposed || held || document.hidden || !cause) return;
  const current = cause;
  const result = await renderer.render(current, frameFor(current), contextFor());
  if (disposed || current !== cause) return;
  const plan = result?.plan, proof = result?.receipt;
  if (!held && startup.enabled && !startupReported && plan?.active && proof?.submitted === true && proof?.completed === true && proof?.current === true &&
      proof?.active === true && proof?.passes === 2 && proof?.scopeErrors === null && proof?.causeId === plan.causeId && proof?.clockId === plan.clockId &&
      proof?.generation === renderer.diagnostics.generation && proof?.targetGeneration === renderer.diagnostics.targetGeneration &&
      proof?.lease === renderer.diagnostics.lease && proof?.width === canvas.width && proof?.height === canvas.height && proof?.ageEms > 0 && proof?.ageEms < 900 &&
      plan.radiusPx > 0 && canvas.isConnected && canvas.width > 0 && canvas.height > 0) {
    const firstFrame = { recorded: true, submitted: true, completed: true, current: true, active: true, passes: 2,
      scopeErrors: null, causeId: proof.causeId, ticketId: proof.ticketId,
      generation: proof.generation, targetGeneration: proof.targetGeneration, lease: proof.lease, clockId: proof.clockId,
      ageMs: proof.ageEms, radiusPx: plan.radiusPx, canvasConnected: canvas.isConnected === true,
      viewportWidth: canvas.width, viewportHeight: canvas.height };
    startupReported = startup.ready(firstFrame);
  }
  $('status').textContent = JSON.stringify({ causeId: plan?.causeId ?? null, active: plan?.active ?? false, reason: plan?.reason ?? result?.reason,
    ageEms: plan?.ageEms ?? null, radiusPx: plan?.radiusPx ?? null, receipt: proof, soundStarted: result?.soundStarted ?? false,
    targetGeneration: renderer.diagnostics.targetGeneration, canvasBacking: [canvas.width, canvas.height] }, null, 2);
  scheduleExpiry();
}
let activeObservation = Promise.resolve();
const gallerySfxApi = createIaiGallerySfxApi({ renderer, getState: () => ({ verify, disposed, live }) });
window.__gallerySfx = gallerySfxApi;
function observe() {
  const current = performObserve();
  activeObservation = current.catch(() => {});
  return current;
}
const loop = createSerialRaf({ requestFrame: cb => requestAnimationFrame(cb), cancelFrame: id => cancelAnimationFrame(id), observe,
  isCurrent: () => !disposed, isActive: () => live && !held && !document.hidden && eNow() < 900, isHeld: () => held });
function startCause() {
  clearTimer('expiry'); clearTimer('loop'); held = false; renderer.setMuted($('mute').checked || verify);
  suppressCauseAudioId = null;
  rate = Number($('rate').value); baseEms = 0; frozenEms = 0; startWall = performance.now(); live = true;
  const id = `iai-preview-${++causeCounter}`;
  cause = { id, type: 'iai-destruction-attack', x: 0, y: 0, targetX: 0, targetY: 0, radius: 148,
    playerId: `preview-player-${id}`, targetId: `preview-target-${id}`, variant: $('variant').value, durationMs: 900, at: 0 };
  loop.refresh(); scheduleExpiry();
}
startup.setCleanup(() => { disposed = true; live = false; held = false; clearTimer('expiry'); clearTimer('loop'); loop.dispose(); void renderer.dispose(); });
renderer.ready.then(() => { if (disposed) return; $('status').textContent = 'WebGPU pipelines and two-pass transparent startup clear completed; no active cause is ready yet.'; if (embedded) startCause(); })
  .catch(error => startup.fail(error, 'WEBGPU_INITIALIZATION_FAILED'));
$('start').addEventListener('click', startCause);
$('hold').addEventListener('click', async () => {
  if (!cause) return;
  if (!held) {
    frozenEms = eNow(); held = true; suppressCauseAudioId = cause.id; clearTimer('expiry'); clearTimer('loop'); loop.refresh(); renderer.setMuted(true);
    await activeObservation;
    if (!disposed && cause && held && frozenEms < 900) {
      const source = cause, frame = frameFor(source); frame.held = false;
      const heldRender = await renderer.render(source, frame, contextFor());
      $('status').textContent = JSON.stringify({ mode: 'held-preview', held: true, eNowMs: frozenEms,
        completedOneShot: heldRender?.receipt?.submitted === true && heldRender?.receipt?.completed === true && heldRender?.receipt?.current === true && heldRender?.receipt?.scopeErrors === null,
        soundStarted: heldRender?.soundStarted ?? false, receipt: heldRender?.receipt ?? null, canvasBacking: [canvas.width, canvas.height] }, null, 2);
    }
  } else { held = false; baseEms = frozenEms; startWall = performance.now(); renderer.setMuted($('mute').checked || verify || suppressCauseAudioId === cause?.id); loop.refresh(); scheduleExpiry(); }
  $('hold').textContent = held ? 'Resume' : 'Hold';
});
$('clear').addEventListener('click', async () => { const old = cause; cause = null; live = false; held = false; clearTimer('expiry'); clearTimer('loop'); loop.refresh(); if (old && !disposed) { const f = frameFor(old); f.sourceEnabled = false; await renderer.render(old, f, contextFor()); } $('hold').textContent = 'Hold'; });
$('unlock').addEventListener('click', async () => { const ok = await renderer.unlockAudio(); $('status').textContent = `Audio gesture unlock ${ok ? 'succeeded' : 'failed or disabled'}; active-cause age remains independent.\n${$('status').textContent}`; });
for (const id of ['source', 'main', 'observer']) $(id).addEventListener('input', () => { if (live && !held) loop.refresh(); });
 $('mute').addEventListener('change', () => { renderer.setMuted($('mute').checked || verify || held || suppressCauseAudioId === cause?.id); });
$('rate').addEventListener('change', () => { if (live && !held) { const current = eNow(); rate = Number($('rate').value); baseEms = current; startWall = performance.now(); scheduleExpiry(); } });
window.addEventListener('resize', () => { resizeCanvas(); if (live && !held) loop.refresh(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearTimer('expiry'); clearTimer('loop'); loop.refresh(); }
  else if (live && !held) { loop.refresh(); scheduleExpiry(); }
});
const autoLoop = params.get('galleryAutoLoop') === '1';
