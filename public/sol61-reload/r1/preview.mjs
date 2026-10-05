import { createReloadRenderer, planReloadInput } from './runtime.mjs';
import { planReloadFrame, packReloadUniform, SHADER_ENTRIES, UNIFORM_BYTES } from './creative/reload-e-sol61-r1.mjs';
import { createReloadSfx } from './creative/reload-e-sfx-sol61-r1.mjs';
import { createReloadGallerySfxApi } from './gallery-sfx-api.mjs';
import { createReloadFrameDiagnostic } from './frame-diagnostic.mjs';

const canvas = document.querySelector('#reload');
const status = document.querySelector('#status');
const startup = window.__reloadGalleryStartup;
const urlParams = new URL(location.href).searchParams;
const verify = urlParams.has('verify');
const embedded = window.parent !== window || urlParams.has('embed');
if (embedded) document.documentElement.classList.add('embedded');
let renderer = null, sfx = null, audioContext = null, frameId = 0, previousSize = '', serial = 0, current = null, cleaned = false;
const byId = id => document.getElementById(id);
const setStatus = value => { status.textContent = String(value); };
const frameDiagnostic = createReloadFrameDiagnostic({
  env: window,
  enabled: urlParams.has('frame-diagnostic'),
  live: () => {
    let startupState = null, rendererState = null;
    try { startupState = startup?.snapshot?.() || null; } catch {}
    try { rendererState = renderer?.snapshot?.() || null; } catch {}
    const ageMs = current ? Math.max(0, performance.now() - current.startedAt) : null;
    return {
      controls: { mainOn: byId('main')?.checked ?? null, obsOn: byId('obs')?.checked ?? null, visibility: byId('visibility')?.value ?? null },
      current: current ? { causeId: current.causeId, startedAt: current.startedAt, phase: current.phase, sourceOn: current.sourceOn, ageMs } : null,
      startup: { active: Boolean(startup?.isActive?.()), state: startupState },
      renderer: rendererState,
    };
  }
});
Object.defineProperty(window, '__reloadFrameDiagnostic', { value: frameDiagnostic, enumerable: false, configurable: false, writable: false });
let probeSequence = 0, pendingGpuProbe = null, activeGpuProbe = null, lastGpuProbeRequest = null;
const probeEnabled = urlParams.has('gpu-probe');
const probeSnapshot = () => ({ schema: 'reload-e-one-shot-gpu-probe/v1', enabled: probeEnabled, pending: pendingGpuProbe ? { id: pendingGpuProbe.id, epoch: pendingGpuProbe.epoch, causeId: pendingGpuProbe.causeId } : null, request: lastGpuProbeRequest, renderer: renderer?.snapshot?.() || null });
Object.defineProperty(window, '__reloadGpuProbe', { value: Object.freeze({ snapshot: probeSnapshot }), enumerable: false, configurable: false, writable: false });
if (probeEnabled) byId('gpuProbeControls')?.classList.remove('hidden');
byId('gpuProbeButton')?.addEventListener('click', () => {
  if (!window.__reloadFirstFrameSent || !renderer || renderer.state !== 'ready') { setStatus('GPU probe requires a completed initial frame.'); return; }
  if (pendingGpuProbe || renderer.snapshot().diagnosticProbePending) { setStatus('GPU probe already pending.'); return; }
  const snap = startup?.snapshot?.() || {};
  const epoch = `${String(snap.token || 'standalone')}:${String(snap.attemptEpoch ?? 'local')}`;
  const request = { id: `gpu-probe-${++probeSequence}`, epoch, causeId: current?.causeId || '', requestedAt: performance.now() };
  if (!request.causeId) { setStatus('GPU probe requires a current cause.'); return; }
  lastGpuProbeRequest = request;
  pendingGpuProbe = request;
  activeGpuProbe = request;
  setStatus(`One-shot GPU probe queued for ${request.causeId}.`);
});
function fixture(phase) {
  const h = Number(byId('height').value);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  return planReloadInput({
    causeId: current?.causeId || `fixture:reload-${serial}`,
    clockKind: 'fixture', phase, weaponId: byId('weapon').value,
    ageMs: current ? performance.now() - current.startedAt : 10000,
    pending: phase === 'start', viewport: [width, height],
    anchor: [width / 2, height * 0.58], heightPx: h * dpr,
    sourceOn: Boolean(current?.sourceOn), obsOn: byId('obs').checked, mainOn: byId('main').checked,
    visibility: Number(byId('visibility').value), strength: 1, angleRad: 0.18,
    reducedMotion: byId('reduced').checked
  }, planReloadFrame);
}
async function initAudioFromGesture() {
  if (!audioContext && !verify) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) { audioContext = new AudioContextClass(); sfx = createReloadSfx({ context: audioContext, verify }); }
  }
  if (audioContext?.state === 'suspended') await audioContext.resume();
}
const gallerySfxApi = createReloadGallerySfxApi({
  verify,
  activate: () => {
    if (!audioContext && !verify) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) { audioContext = new AudioContextClass(); sfx = createReloadSfx({ context: audioContext, verify }); }
    }
    // resume() is invoked synchronously before its promise is awaited.
    const resume = audioContext?.state === 'suspended' ? audioContext.resume() : Promise.resolve();
    const event = current;
    return Promise.resolve(resume).then(() => {
      if (event?.sourceOn && current?.causeId === event.causeId && current.phase === event.phase) requestEventAudio(event, false);
      return { state: verify ? 'silent' : 'active' };
    });
  }
});
window.__gallerySfx = gallerySfxApi;
function setFixtureEvent(phase, { enableAudio = false } = {}) {
  if (current) sfx?.cancel(current.causeId);
  current = { causeId: `fixture:reload-${serial}:${phase}`, startedAt: performance.now(), sourceOn: true, phase };
  if (enableAudio) requestEventAudio(current, true);
  else if (audioContext?.state === 'running' && !verify) requestEventAudio(current, false);
}
function beginFixtureCycle({ enableAudio = false } = {}) { serial++; setFixtureEvent('start', { enableAudio }); }
function requestEventAudio(event, needsGesture) {
  const { causeId, phase, startedAt } = event;
  const ready = needsGesture ? initAudioFromGesture() : Promise.resolve();
  ready.then(() => {
    const latest = current;
    if (!latest || latest.causeId !== causeId || latest.phase !== phase || !latest.sourceOn) return;
    const visible = document.visibilityState === 'visible' && Number(byId('visibility').value) > 0;
    if (!visible) return;
    const ageMs = Math.max(0, performance.now() - latest.startedAt);
    return sfx?.play({ causeId, phase, visible, distance: 0, pan: 0, ageMs });
  }).catch(error => setStatus(`Audio remains unavailable: ${error.message}`));
}
function startFixture(phase) {
  if (phase === 'start') beginFixtureCycle({ enableAudio: true });
  else setFixtureEvent('complete', { enableAudio: true });
}
function stopFixture() {
  if (current) sfx?.cancel(current.causeId);
  current = { causeId: `fixture:reload-${serial}:off`, startedAt: performance.now(), sourceOn: false, phase: 'start' };
}
function advanceFixtureLoop(now) {
  if (!embedded || !current) return;
  const ageMs = now - current.startedAt;
  if (current.sourceOn && current.phase === 'start' && ageMs >= 2200) setFixtureEvent('complete');
  else if (current.sourceOn && current.phase === 'complete' && ageMs >= 620) stopFixture();
  else if (!current.sourceOn && ageMs >= 700) beginFixtureCycle();
}
if (!embedded) {
  serial = 1;
  current = { causeId: 'fixture:reload-1:start', startedAt: performance.now() - 40, sourceOn: true, phase: 'start' };
}

async function frame(viaRaf = false) {
  frameDiagnostic.frameStart(viaRaf);
  try {
    if (!renderer || !startup?.isActive()) return;
    advanceFixtureLoop(performance.now());
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    const sizeKey = `${width}x${height}`;
    if (sizeKey !== previousSize) {
      canvas.width = width; canvas.height = height;
      await renderer.resize({ width, height }); previousSize = sizeKey;
    }
    const phase = current?.phase === 'complete' ? 'complete' : 'start';
    const input = fixture(phase);
    frameDiagnostic.plan(input);
    const firstFrame = !window.__reloadFirstFrameSent;
    const probeRequest = pendingGpuProbe;
    const diagnosticProbe = probeRequest && probeRequest.causeId === input.causeId ? {
      ...probeRequest, phase: input.phase, ageMs: input.ageMs,
      isCurrent: () => activeGpuProbe === probeRequest && startup?.isActive?.() === true && current?.causeId === probeRequest.causeId
    } : null;
    if (probeRequest && !diagnosticProbe) { pendingGpuProbe = null; lastGpuProbeRequest = { ...probeRequest, discarded: 'cause-changed-before-submit' }; }
    frameDiagnostic.renderEnter();
    let result;
    try { result = await renderer.render(input, { awaitCompletion: firstFrame, verifyEmission: firstFrame, diagnosticProbe }); }
    catch (error) { frameDiagnostic.renderExit({ submitted: false, error: String(error?.message || error) }); throw error; }
    if (diagnosticProbe && result.submitted) { pendingGpuProbe = null; lastGpuProbeRequest = { ...probeRequest, submitted: true, submitId: result.diagnosticProbe?.submitId }; }
    else if (diagnosticProbe && !result.submitted) { pendingGpuProbe = null; lastGpuProbeRequest = { ...probeRequest, discarded: result.reason || 'not-submitted' }; }
    frameDiagnostic.renderExit(result);
    if (result.submitted && result.completed && !window.__reloadFirstFrameSent) {
      if (result.emissionNonzero !== true) throw new Error('Completed first four-pass frame has no positive source emission in the actor-field region');
      window.__reloadFirstFrameSent = true;
      const ready = startup.ready({ recorded: true, submitted: true, completed: true, nonzeroEmission: result.emissionNonzero, canvasConnected: canvas.isConnected, passes: result.passes, viewportWidth: result.width, viewportHeight: result.height, generation: result.generation, targetGeneration: result.targetGeneration });
      if (!ready) throw new Error('Current attempt did not accept the submitted-frame proof');
      setStatus(`Ready · ${result.width}×${result.height} · ${result.passes} passes${verify ? ' · verify audio hard-zero' : ''}`);
    }
    frameDiagnostic.rafRequested();
    frameId = requestAnimationFrame(() => { frameDiagnostic.rafStarted(); frame(true).catch(error => { frameDiagnostic.error(error); startup.fail(error, 'RELOAD_FRAME_FAILED'); }); });
  } finally { frameDiagnostic.frameEnd(); }
}
async function cleanup() {
  if (cleaned) return; cleaned = true;
  gallerySfxApi.dispose();
  cancelAnimationFrame(frameId); current = null;
  try { sfx?.stopAll(); sfx?.dispose(); } catch {}
  try { await renderer?.dispose(); } catch {}
  try { await audioContext?.close(); } catch {}
}

try {
  if (!startup?.isActive()) throw new Error('Gallery attempt identity is missing or retired');
  startup.advance('adapter');
  const shaderSource = await (await fetch('./creative/reload-e-sol61-r1.wgsl')).text();
  startup.advance('device');
  renderer = await createReloadRenderer({ canvas, shaderSource, shaderEntries: SHADER_ENTRIES, uniformBytes: UNIFORM_BYTES, packReloadUniform, gpu: navigator.gpu, isCurrent: () => startup.isActive(), onFailure: error => startup.fail(error, 'WEBGPU_HOST_FAILED'), onDeviceLost: error => startup.fail(error, 'DEVICE_LOST'), outputLoadOp: 'clear' });
  startup.advance('pipelines');
  startup.setCleanup(() => { cleanup(); });
  byId('start').addEventListener('click', () => startFixture('start'));
  byId('complete').addEventListener('click', () => startFixture('complete'));
  byId('off').addEventListener('click', stopFixture);
  if (embedded) beginFixtureCycle();
  canvas.addEventListener('pointerdown', () => {
    const event = current;
    if (event?.sourceOn) requestEventAudio(event, true);
  });
  frame().catch(error => { frameDiagnostic.error(error); startup.fail(error, 'RELOAD_FRAME_FAILED'); });
} catch (error) {
  startup?.fail(error, error?.code || 'RELOAD_STARTUP_FAILED');
  setStatus(`Unavailable: ${error?.message || error}`);
}
window.addEventListener('pagehide', () => { startup?.cancel(); cleanup(); }, { once: true });
