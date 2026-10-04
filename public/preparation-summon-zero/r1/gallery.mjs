import * as Plan from './source/plan.mjs';
import { PreparationSummonZeroRuntime } from './runtime.mjs';
import { VERSION, startupIdentity, makeFirstFrameReceipt, makePreviewSnapshot } from './host-contract.mjs';
import { createSfxBridge } from './audio-bridge.mjs';

const params = new URLSearchParams(location.search);
const verify = params.has('verify');
document.documentElement.classList.toggle('embed', params.get('embed') === '1');
if (verify) document.documentElement.classList.add('verify');
const $ = id => document.getElementById(id), canvas = $('preview');
const token = params.get('galleryStartupToken') || '', versionId = params.get('galleryVersionId') || '';
const epoch = Number(params.get('galleryAttemptEpoch'));
const startup = startupIdentity(params, window.__dvaGalleryStartup, window);
const bridgeEnabled = startup.enabled;
const autoLoop = params.get('embed') === '1' && params.get('galleryAutoLoop') === '1';
const LOOP_GAP_MS = 500;
const finite = Number.isFinite;
let runtime = null, disposed = false, failed = false, job = false, raf = 0, loopTimer = 0, heldPhaseMs = null;
let origin = performance.now(), controlEpoch = 0, pendingRequest = null, currentCauseGeneration = 0;
let receipt = null, last = null;
const sourcePositions = Object.freeze({ a: Plan.FIXTURE.footSourceWorld, b: [256, Plan.FIXTURE.footSourceWorld[1]] });
const backdrops = Object.freeze({ dark: [0.014, 0.021, 0.034, 1], light: [0.74, 0.76, 0.79, 1] });

function current() {
  if (disposed || failed || window.__dvaGalleryStartup?.isActive?.() === false) return false;
  if (!bridgeEnabled) return true;
  const q = new URLSearchParams(location.search), snapshot = window.__dvaGalleryStartup?.snapshot?.();
  return q.get('galleryStartupToken') === token && q.get('galleryVersionId') === VERSION &&
    Number(q.get('galleryAttemptEpoch')) === epoch &&
    (!snapshot || snapshot.token === token && snapshot.versionId === VERSION &&
      Number(snapshot.attemptEpoch) === epoch);
}
function report(stage, status, extra = {}) {
  if (!current()) return false;
  window.__dvaGalleryStartup.advance(stage, status, extra);
  return true;
}
function showError(error, code = 'PREPARATION_SUMMON_ZERO_FAILURE') {
  if (!current()) return;
  failed = true;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  stopVoice();
  $('status').textContent = `Replay failed: ${error?.message || error}`;
  window.__dvaGalleryStartup?.fail?.(error, code);
}
function backgroundValue() { return backdrops[$('background').value] || backdrops.dark; }
function sourcePosition() { return sourcePositions[$('sourcePosition').value] || sourcePositions.a; }
function phaseNow(now = performance.now()) {
  return heldPhaseMs === null ? Math.max(0, now - origin) : heldPhaseMs;
}
function makeJoin() {
  currentCauseGeneration++;
  origin = performance.now();
  const position = sourcePosition();
  receipt = Plan.freezeReceipt({ causeId: `${VERSION}:synthetic-human-join-${currentCauseGeneration}`,
    playerId: 'synthetic-human-player', sessionKey: `${VERSION}:gallery-session-${currentCauseGeneration}`,
    startedAtMs: origin, sourceWorld: [...position], isBot: false, ejected: false, spriteReady: true });
}
function audioEligibility() {
  return last ? { causeId: last.causeId, ageMs: last.submittedAgeMs,
    held: last.held, hidden: document.visibilityState === 'hidden',
    sourceEnabled: last.controls.sourceEnabled, layoutCurrent: last.proof.layoutCurrent } : null;
}
const sfxBridge = createSfxBridge({ windowRef: window, verify, isCurrent: current,
  currentEligibility: audioEligibility });
const audioSnapshot = () => sfxBridge.getSnapshot();
const stopVoice = () => sfxBridge.stop();

function inputForAge(ageMs) {
  const position = sourcePosition();
  const movedReceipt = Object.freeze({ ...receipt, sourceWorld: Object.freeze([...position]) });
  const input = Plan.plan(movedReceipt, { nowMs: receipt.startedAtMs + ageMs,
    active: true, sourceEnabled: $('source').checked, nearEnabled: $('near').checked,
    reducedMotion: $('motion').value === 'reduced', intensity: Number($('intensity').value) });
  return { input, ageMs, sourceWorld: position };
}
function drawRequest(ageMs, held) {
  return Object.freeze({ ageMs, held, controlEpoch, causeId: receipt?.causeId });
}
async function submit(request) {
  if (!current() || !runtime || document.visibilityState === 'hidden') return null;
  const requestControlEpoch = controlEpoch;
  const effective = inputForAge(request.ageMs);
  const controls = Object.freeze({ sourceEnabled: $('source').checked,
    nearEnabled: $('near').checked, reducedMotion: $('motion').value === 'reduced',
    intensity: Number($('intensity').value), sourcePosition: $('sourcePosition').value,
    background: $('background').value });
  const result = await runtime.draw({ receipt: effective.input.receipt, nowMs: receipt.startedAtMs + request.ageMs,
    active: true, sourceEnabled: controls.sourceEnabled, nearEnabled: controls.nearEnabled,
    reducedMotion: controls.reducedMotion, intensity: controls.intensity,
    sourceWorld: effective.sourceWorld, background: backgroundValue() });
  if (!current() || request.causeId !== receipt?.causeId) return null;
  if (result?.deferred) {
    $('status').textContent = 'Drawing deferred until the canvas has a valid visible extent.';
    return Object.freeze({ deferred: true, proof: null });
  }
  if (!result?.proof) throw new Error('Renderer returned neither a frame proof nor an explicit deferral');
  const proof = result.proof;
  const valid = proof.completed === true && proof.submitted === true && proof.layoutCurrent === true;
  const view = result.view;
  last = Object.freeze({ requestedAgeMs: request.ageMs, submittedAgeMs: proof.effectAgeMs,
    held: request.held, causeId: request.causeId, input: effective.input, controls, view, proof });
  $('phase').value = String(Math.max(0, Math.min(980, request.ageMs)));
  $('phaseValue').textContent = `${request.held ? 'Held' : 'Live'} · ${Math.floor(request.ageMs)} ms`;
  $('status').textContent = `${valid ? 'Submitted and completed' : 'Frame completed; extent changed'} · synthetic human join · ${Math.floor(request.ageMs)} / 980 ms`;

  if (requestControlEpoch === controlEpoch) sfxBridge.tryPlay(audioEligibility());
  if (!window.__summonZeroStartupDone && valid && !request.held &&
      proof.sourceEnabled && proof.visible && request.ageMs >= 0 && request.ageMs < Plan.DURATION_MS &&
      document.visibilityState !== 'hidden') {
    report('device', 'ready'); report('assets', 'ready'); report('pipelines', 'ready');
    report('first-frame', 'pending');
    const firstFrame = makeFirstFrameReceipt({ proof, canvas, causeId: request.causeId, effectAgeMs: proof.effectAgeMs });
    if (firstFrame) {
      report('first-frame', 'ready', { firstFrame }); report('playing', 'ready', { firstFrame });
      window.__summonZeroStartupDone = true;
    }
  }
  return last;
}
async function drain(initial) {
  if (job) { pendingRequest = initial; return null; }
  job = true;
  let request = initial, lastResult = null;
  try {
    while (request && current() && document.visibilityState !== 'hidden') {
      pendingRequest = null;
      lastResult = await submit(request);
      if (lastResult?.deferred) { pendingRequest = null; break; }
      request = pendingRequest;
    }
    return lastResult;
  } catch (error) { showError(error); return null; }
  finally {
    job = false;
    if (pendingRequest && current() && document.visibilityState !== 'hidden') {
      const next = pendingRequest; pendingRequest = null; queueMicrotask(() => void drain(next));
    }
  }
}
function cancelFrame() { if (raf) cancelAnimationFrame(raf); raf = 0; }
function cancelLoopTimer() { if (loopTimer) clearTimeout(loopTimer); loopTimer = 0; }
function scheduleNextJoin() {
  if (!autoLoop || loopTimer || heldPhaseMs !== null || !current() || failed || disposed ||
      document.visibilityState === 'hidden' || phaseNow() < Plan.DURATION_MS) return false;
  loopTimer = setTimeout(() => {
    loopTimer = 0;
    if (!autoLoop || heldPhaseMs !== null || !current() || failed || disposed ||
        document.visibilityState === 'hidden') return;
    void playNewJoin();
  }, LOOP_GAP_MS);
  return true;
}
function continueLive(result) {
  if (!result?.deferred && current() && heldPhaseMs === null && document.visibilityState !== 'hidden') {
    if (phaseNow() < Plan.DURATION_MS) schedule();
    else scheduleNextJoin();
  }
  return result;
}
function schedule() {
  if (!current() || failed || disposed || heldPhaseMs !== null || raf || job || document.visibilityState === 'hidden') return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const age = Math.min(Plan.DURATION_MS, Math.max(0, performance.now() - receipt.startedAtMs));
    void drain(drawRequest(age, false)).then(result => {
      if (result?.deferred || !current() || heldPhaseMs !== null || document.visibilityState === 'hidden') return;
      if (age < Plan.DURATION_MS) schedule();
      else scheduleNextJoin();
    });
  });
}
async function renderHeld(ageMs) {
  cancelFrame(); cancelLoopTimer();
  heldPhaseMs = ageMs;
  controlEpoch++;
  stopVoice();
  const result = await drain(drawRequest(ageMs, true));
  return result;
}
function setPhase(value) {
  const age = Number(value);
  if (!finite(age) || age < 0 || age > Plan.DURATION_MS) throw new RangeError('Phase must be within 0..980 ms');
  return renderHeld(age);
}
async function playNewJoin() {
  cancelFrame(); cancelLoopTimer(); stopVoice(); controlEpoch++;
  heldPhaseMs = null; pendingRequest = null; makeJoin();
  $('phase').value = '0'; $('phaseValue').textContent = 'Live · 0 ms';
  const result = await drain(drawRequest(0, false));
  continueLive(result);
}
function holdCurrent() { return renderHeld(Math.min(Plan.DURATION_MS, Math.max(0, phaseNow()))); }
function onControlChange({ stop = false } = {}) {
  controlEpoch++;
  if (stop) stopVoice();
  const age = phaseNow();
  if (heldPhaseMs === null) { cancelFrame(); cancelLoopTimer(); return drain(drawRequest(age, false)).then(continueLive); }
  return drain(drawRequest(heldPhaseMs, true));
}
function dispose() {
  if (disposed) return;
  disposed = true; cancelFrame(); cancelLoopTimer(); pendingRequest = null; stopVoice();
  runtime?.dispose();
  sfxBridge.dispose();
  runtime = null;
}

async function initialize() {
  report('adapter', 'ready'); report('device', 'pending');
  if (verify) { $('audio').disabled = true; $('audioStatus').textContent = 'Verify mode: audio is hard-muted; AudioContext is not created.'; }
  const requestedPhase = params.has('phase') ? Number(params.get('phase')) : null;
  if (requestedPhase !== null && finite(requestedPhase) && requestedPhase >= 0 && requestedPhase <= Plan.DURATION_MS)
    heldPhaseMs = requestedPhase;
  makeJoin();
  if (heldPhaseMs !== null) origin = receipt.startedAtMs;
  try {
    runtime = new PreparationSummonZeroRuntime(canvas, { onFailure: error => showError(error, 'WEBGPU_DEVICE_LOST') });
    report('assets', 'pending'); report('pipelines', 'pending');
    await runtime.initialize();
    if (!current()) return;
    report('device', 'ready'); report('assets', 'ready'); report('pipelines', 'ready');
    if (heldPhaseMs === null) { const result = await drain(drawRequest(0, false)); continueLive(result); }
    else await drain(drawRequest(heldPhaseMs, true));
  } catch (error) { showError(error, 'WEBGPU_STARTUP_FAILED'); }
}

$('phase').addEventListener('input', event => { void setPhase(event.target.value); });
$('hold').addEventListener('click', () => { void holdCurrent(); });
$('play').addEventListener('click', () => { void playNewJoin(); });
for (const id of ['source', 'near', 'motion', 'intensity', 'sourcePosition', 'background'])
  $(id).addEventListener('change', () => onControlChange({ stop: id !== 'background' }));
$('audio').addEventListener('click', async () => {
  const result = await sfxBridge.activateFromGesture({ id: VERSION });
  $('audioStatus').textContent = result.reason;
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { cancelFrame(); cancelLoopTimer(); stopVoice(); }
  else if (heldPhaseMs === null) { void drain(drawRequest(phaseNow(), false)).then(continueLive); }
  else void drain(drawRequest(heldPhaseMs, true));
});
window.addEventListener('resize', () => {
  if (!runtime || !current()) return;
  void drain(drawRequest(phaseNow(), heldPhaseMs !== null)).then(result => {
    if (heldPhaseMs === null) continueLive(result);
  });
});
function previewSnapshot() {
  const effective = receipt && inputForAge(phaseNow());
  return makePreviewSnapshot({ verify, requestedAgeMs: phaseNow(), submittedAgeMs: last?.submittedAgeMs,
    heldPhaseMs, cause: receipt ? { causeId: receipt.causeId, playerId: receipt.playerId,
      sessionKey: receipt.sessionKey, startedAtMs: receipt.startedAtMs,
      sourceWorld: [...(effective?.sourceWorld || receipt.sourceWorld)], isBot: false,
      source: 'synthetic gallery join', spriteReady: true } : null,
    input: last?.input || null,
    controls: last?.controls || { sourceEnabled: $('source').checked, nearEnabled: $('near').checked,
      reducedMotion: $('motion').value === 'reduced', intensity: Number($('intensity').value),
      sourcePosition: $('sourcePosition').value, background: $('background').value },
    view: last?.view || null, frame: last?.proof || null, audio: audioSnapshot(),
    runtime: runtime?.snapshot() || null, disposed });
}
window.__preparationSummonZeroPreview = Object.freeze({
  snapshot: previewSnapshot,
  configure: async options => {
    if (!options || typeof options !== 'object') throw new TypeError('Control options are required');
    if (options.sourceEnabled !== undefined) $('source').checked = Boolean(options.sourceEnabled);
    if (options.nearEnabled !== undefined) $('near').checked = Boolean(options.nearEnabled);
    if (options.reducedMotion !== undefined) $('motion').value = options.reducedMotion ? 'reduced' : 'normal';
    if (options.intensity !== undefined) $('intensity').value = String(options.intensity);
    if (options.sourcePosition !== undefined) $('sourcePosition').value = options.sourcePosition;
    if (options.background !== undefined) $('background').value = options.background;
    if (options.phaseMs !== undefined) return setPhase(options.phaseMs);
    return onControlChange({ stop: true });
  },
  setPhase, play: playNewJoin, hold: holdCurrent, dispose
});
window.__dvaGalleryStartup?.setCleanup?.(dispose);
window.addEventListener('pagehide', dispose, { once: true });
void initialize();
