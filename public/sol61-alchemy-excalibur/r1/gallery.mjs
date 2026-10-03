import { DURATION_MS, VARIANTS, makeFixture, sample } from './plan.mjs';
import { createExcaliburRenderer } from './runtime.mjs';
import { createExcaliburSfx } from './sfx.mjs';

const VERSION = 'alchemy-excalibur-new-e-sol61-r1';
const GALLERY_VERSION_ID = 'alchemy-excalibur-sol61-r1';
const CYCLE_MS = 1700;
const params = new URLSearchParams(location.search);
const verify = params.has('verify');
const canvas = document.querySelector('#preview');
const status = document.querySelector('#status');
const errorNode = document.querySelector('#error');
const dprNode = document.querySelector('#dpr');
let renderer = null;
let frameId = null;
let disposed = false;
let drawChain = Promise.resolve();
let sequence = 0;
let cycle = 0;
let receipt = makeFixture({ id: `${VERSION}:gallery-cycle-0` });
let options = { main: true, obs: true, reducedMotion: params.has('reducedMotion'), variant:
  VARIANTS.includes(params.get('variant')) ? params.get('variant') : 'forward-half-map',
  distance: params.get('range') === 'tenfold' ? 6200 : 620 };
let heldPhase = parsePhase(params.get('phase'));
let lastEffectAge = heldPhase ?? 0;
let lastSubmit = null;
let audio = null;

function parsePhase(text) {
  if (text == null || text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= DURATION_MS ? n : null;
}

function handshake() {
  const token = params.get('galleryStartupToken') || '';
  const versionId = params.get('galleryVersionId') || '';
  const attemptEpoch = Number(params.get('galleryAttemptEpoch'));
  if (!/^[0-9a-f]{32}$/i.test(token) || versionId !== GALLERY_VERSION_ID || !Number.isSafeInteger(attemptEpoch) || attemptEpoch <= 0)
    return null;
  return { token, versionId, attemptEpoch };
}
const startup = handshake();
let startupSnapshot = Object.freeze({ schema: 'dva-gallery-startup/v1', stage: 'child-document', status: 'pending',
  versionId: GALLERY_VERSION_ID, sequence: 0, firstFrame: null });
function report(stage, state, detail = {}) {
  if (!startup) return;
  const record = Object.freeze({ schema: 'dva-gallery-startup/v1', ...startup, stage, status: state,
    sequence: ++sequence, ...detail });
  startupSnapshot = record;
  try { window.parent.postMessage(record, location.origin); } catch (error) { throw new Error(`startup message failed: ${error.message}`); }
}
window.__dvaGalleryStartupSnapshot = () => startupSnapshot;
report('child-document', 'pending');

function renderNowMs(timestamp) {
  return heldPhase ?? (timestamp - loopOrigin) % CYCLE_MS;
}
let loopOrigin = performance.now();
function currentEffectAge() { return lastEffectAge; }
function newReceipt(nextCycle) {
  cycle = nextCycle;
  receipt = makeFixture({ id: `${VERSION}:gallery-cycle-${cycle}`, variant: options.variant, distance: options.distance, startedAt: 0 });
}
function showError(error) {
  const message = error?.stack || error?.message || String(error);
  errorNode.textContent = message;
  errorNode.hidden = false;
  status.textContent = '描画エラー';
  report('playing', 'error', { error: { code: 'WEBGPU_RENDER_ERROR', message: String(error?.message || error).slice(0, 600) } });
}

async function drawCore(timestamp, first = false) {
  if (disposed || !renderer) return;
  try {
    const age = renderNowMs(timestamp);
    const nextCycle = heldPhase === null ? Math.floor((timestamp - loopOrigin) / CYCLE_MS) : cycle;
    if (heldPhase === null && nextCycle !== cycle) {
      newReceipt(nextCycle);
      if (audio?.snapshot.enabled) audio.play(receipt.id);
    }
    lastEffectAge = Math.min(DURATION_MS, Math.max(0, age));
    const frame = await renderer.render(receipt, lastEffectAge, options);
    lastSubmit = { ...frame, completion: undefined };
    status.textContent = `WebGPU ${frame.submitted ? 'submit' : 'pending'} ${renderer.snapshot.submittedFrames} · E ${Math.floor(lastEffectAge)} ms / 1200 ms`;
    dprNode.textContent = `target ${frame.width}×${frame.height} · DPR ${window.devicePixelRatio || 1}`;
    if (first) report('first-frame', 'delayed');
    await frame.completion;
    lastSubmit = renderer.snapshot.lastFrame;
    if (first) {
      const proof = Object.freeze({ recorded: true, submitted: true, completed: true, canvasConnected: canvas.isConnected,
        passes: 2, viewportWidth: canvas.width, viewportHeight: canvas.height,
        submissionCount: renderer.snapshot.submittedFrames, completionCount: renderer.snapshot.completedFrames });
      report('first-frame', 'ready', { firstFrame: proof });
      report('playing', 'ready', { firstFrame: proof });
      status.textContent = 'WebGPU描画開始（視覚品質は未判定）';
    }
  } catch (error) { showError(error); disposed = true; }
  if (!disposed && heldPhase === null) frameId = requestAnimationFrame(tick);
}
function draw(timestamp, first = false) {
  const current = drawChain.then(() => drawCore(timestamp, first), () => drawCore(timestamp, first));
  drawChain = current.catch(() => {});
  return current;
}
function tick(timestamp) { frameId = null; void draw(timestamp); }

async function setPhase(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value < 0 || value > DURATION_MS) throw new Error('phase must be within 0..1200 ms');
  heldPhase = value;
  if (frameId != null) cancelAnimationFrame(frameId);
  frameId = null;
  await draw(performance.now());
  return snapshot();
}

async function configure(next = {}) {
  if (disposed) throw new Error('preview disposed');
  const candidate = { ...options, ...next };
  if (!VARIANTS.includes(candidate.variant)) throw new Error('unsupported variant');
  if (!Number.isFinite(candidate.distance) || candidate.distance < 48 || candidate.distance > 6200)
    throw new Error('distance must be within 48..6200 world units');
  if (typeof candidate.main !== 'boolean' || typeof candidate.obs !== 'boolean' || typeof candidate.reducedMotion !== 'boolean')
    throw new Error('main/obs/reducedMotion must be boolean');
  if (frameId != null) cancelAnimationFrame(frameId);
  frameId = null;
  options = candidate;
  newReceipt(cycle + 1);
  await draw(performance.now());
  return snapshot();
}

function snapshot() {
  return Object.freeze({ version: VERSION, verify, cycle, phase: lastEffectAge, heldPhase, options: Object.freeze({ ...options }),
    receipt, sampled: sample(receipt, lastEffectAge, options), submitted: Boolean(lastSubmit?.submitted),
    queueComplete: renderer?.snapshot.completedFrames > 0 && renderer?.snapshot.lastFrame?.completed === true,
    lastFrame: lastSubmit, render: renderer?.snapshot || null, audio: audio?.snapshot || null,
    startup: startupSnapshot, disposed });
}

async function dispose() {
  if (disposed && !renderer) return;
  disposed = true;
  if (frameId != null) cancelAnimationFrame(frameId);
  frameId = null;
  audio?.dispose(); audio = null;
  const active = renderer; renderer = null;
  if (active) await active.dispose();
  status.textContent = 'プレビュー終了';
}

window.__excaliburPreview = Object.freeze({ snapshot, setPhase, configure, dispose });
window.addEventListener('pagehide', () => { void dispose(); }, { once: true });

async function start() {
  report('adapter', 'pending');
  try {
    renderer = await createExcaliburRenderer(canvas);
    report('device', 'ready');
    report('assets', 'ready');
    report('pipelines', 'pending');
    report('pipelines', 'ready');
    audio = createExcaliburSfx({ verify, getCurrentCauseId: () => receipt?.id,
      getCurrentEffectAge: currentEffectAge });
    window.__gallerySfx = audio;
    if (heldPhase !== null) {
      newReceipt(0);
      await draw(performance.now(), true);
      return;
    }
    loopOrigin = performance.now();
    newReceipt(0);
    await draw(loopOrigin, true);
  } catch (error) {
    showError(error);
    if (!renderer && startup) report('adapter', 'unsupported', { error: { code: 'WEBGPU_UNAVAILABLE', message: String(error?.message || error) } });
  }
}
report('adapter', 'pending');
void start();
