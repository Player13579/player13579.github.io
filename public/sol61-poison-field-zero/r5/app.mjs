import { createRenderer } from './runtime-host.mjs';
import { createPoisonAudio } from './poison-model.mjs';
import { createSerialFrameLoop, cssRadiusToBacking, isValidPoisonReadyProof } from './gallery-loop.mjs';

const $ = id => document.getElementById(id);
const params = new URL(location.href).searchParams;
const startup = { token: params.get('galleryStartupToken'), versionId: params.get('galleryVersionId'), attemptEpoch: Number(params.get('galleryAttemptEpoch')), sequence: 0 };
const verifyMode = params.has('verify') || (() => { try { return parent !== window && new URL(parent.location.href).searchParams.has('verify'); } catch { return parent !== window; } })();
const autoLoop = params.get('galleryAutoLoop') !== '0';
const status = $('status'), startupNode = $('startup'), canvas = $('field');
let live = true, readySent = false, proofObserved = false, field = null, held = false, cycle = 0, expiryTimer = 0, restartTimer = 0;
let observeTask = null, observeAgain = false, lastStatusUpdate = 0, lastTerminalKey = '';
const validStartup = Boolean(startup.token && startup.versionId === 'poison-field-zero-sol61-r5' && Number.isSafeInteger(startup.attemptEpoch) && startup.attemptEpoch > 0 && parent !== window);
function emit(stage, statusValue, extra = {}) {
  startupNode.textContent = `Gallery startup: ${stage} (${statusValue})`;
  if (!validStartup || !live || (readySent && statusValue !== 'error')) return false;
  try { parent.postMessage({ schema: 'dva-gallery-startup/v1', token: startup.token, versionId: startup.versionId,
    attemptEpoch: startup.attemptEpoch, sequence: ++startup.sequence, stage, status: statusValue, ...extra }, location.origin); return true; }
  catch { return false; }
}
emit('child-document', 'pending');
const audio = createPoisonAudio({ verify: verifyMode });
const renderer = createRenderer({ canvas, audio, reportStage: item => {
  if (item.stage === 'adapter') emit('adapter', 'pending');
  else if (item.stage === 'device') emit('device', 'pending');
  else if (item.stage === 'shader') { emit('assets', 'ready'); emit('pipelines', 'pending'); }
  else if (item.stage === 'pipeline') emit('pipelines', 'pending');
  else if (item.stage === 'first-frame') emit('first-frame', 'pending', { clear: item.clear ?? null });
  else if (item.stage === 'device-lost' && !readySent) emit('playing', 'error', { error: { code: 'WEBGPU_DEVICE_LOST', message: String(item.reason ?? 'device lost') } });
} });
if (verifyMode) { renderer.setMuted(true); $('mute').checked = true; $('mute').disabled = true; }
const frameLoop = createSerialFrameLoop({
  requestFrame: callback => requestAnimationFrame(callback),
  cancelFrame: id => cancelAnimationFrame(id),
  isCurrent: () => live,
  isActive: () => Boolean(field),
  isHeld: () => held,
  observe: () => observe(),
});

function currentField(createdAt = Date.now()) {
  const width = canvas.width || 1, height = canvas.height || 1, rect = canvas.getBoundingClientRect(), scale = rect.width > 0 ? width / rect.width : null;
  return { kind: 'poison', id: `poison-field-r5-${cycle}`, sourceId: 'poison-field-r5-source',
    x: width * Number($('x').value) / 100, y: height * Number($('y').value) / 100,
    radius: cssRadiusToBacking(Number($('radius').value), width, rect.width),
    strength: Number($('strength').value), createdAt, endsAt: createdAt + 12000, scale };
}
function isStrictActiveProof(receipt, plan) {
  return isValidPoisonReadyProof({ receipt, plan, field, currentTargetGeneration: renderer.diagnostics.targetGeneration,
    backingWidth: canvas.width, backingHeight: canvas.height, canvasConnected: canvas.isConnected === true, nowMs: Date.now() });
}
function firstFrameProof(receipt, plan) {
  if (!isStrictActiveProof(receipt, plan)) return null;
  return { recorded: true, submitted: receipt.submitted, completed: receipt.completed, canvasConnected: canvas.isConnected === true,
    active: receipt.active, scopeErrors: receipt.scopeErrors, passes: receipt.passes,
    viewportWidth: receipt.width, viewportHeight: receipt.height, ageMs: receipt.ageMs, build: plan.build,
    causeId: receipt.causeId, generation: receipt.generation, targetGeneration: receipt.targetGeneration,
    currentTargetGeneration: renderer.diagnostics.targetGeneration, backingWidth: canvas.width, backingHeight: canvas.height };
}
async function observeOnce() {
  if (!live) return null;
  try { await renderer.ready; } catch (error) { status.textContent = `WebGPU startup failed: ${error.stack ?? error}`; return null; }
  const nowMs = Date.now(), values = field ? currentField(field.createdAt) : null;
  const current = field ? { ...field, ...values, id: field.id, createdAt: field.createdAt, endsAt: field.endsAt } : null;
  const result = await renderer.renderField(current, { nowMs, sourceEnabled: $('source').checked, mainEnabled: $('main').checked,
    observerEnabled: $('observer').checked, visible: true, roomCurrent: true, reducedMotion: $('reduced').checked,
    held, project: (x, y) => ({ x, y, scale: 1 }) });
  const proof = firstFrameProof(result.receipt, result.plan);
  const completedAt = performance.now();
  const firstProofNow = Boolean(proof && !proofObserved);
  if (firstProofNow) { proofObserved = true; if (!readySent) readySent = emit('playing', 'ready', { firstFrame: proof }); }
  const failure = renderer.diagnostics.lastFailure;
  const terminalKey = !result.plan.active ? `inactive:${result.plan.reason}` : (result.plan.active && !result.receipt && failure ? JSON.stringify({ reason: failure.reason, message: failure.message }) : '');
  const terminalChanged = Boolean(terminalKey && terminalKey !== lastTerminalKey);
  lastTerminalKey = terminalKey;
  if (completedAt - lastStatusUpdate >= 250 || firstProofNow || terminalChanged) { lastStatusUpdate = completedAt; status.textContent = JSON.stringify({ active: result.plan.active, reason: result.plan.reason, planAgeMs: result.plan.ageMs,
    completionWallTimeMs: completedAt, completionAgeMs: result.receipt?.ageMs ?? null,
    causeId: result.plan.causeId, receipt: result.receipt, strictActiveProof: Boolean(proof), soundStarted: result.soundStarted,
    verifyMuted: verifyMode, held, radiusBacking: current?.radius, radiusCss: Number($('radius').value), backingScale: current?.scale,
    diagnostics: renderer.diagnostics }, null, 2); }
  return result;
}
function observe() {
  if (!live) return Promise.resolve(null);
  if (observeTask) { observeAgain = true; return observeTask; }
  observeTask = (async () => {
    let result = null;
    try {
      do { observeAgain = false; result = await observeOnce(); }
      while (observeAgain && live);
      return result;
    } finally { observeTask = null; }
  })();
  return observeTask;
}
function scheduleExpiry() {
  clearTimeout(expiryTimer);
  if (!field) return;
  const id = field.id, createdAt = field.createdAt, delay = Math.max(0, field.endsAt - Date.now());
  expiryTimer = setTimeout(async () => {
    if (!live || field?.id !== id || field.createdAt !== createdAt || Date.now() < field.endsAt) return;
  field = null; held = false; renderer.setMuted($('mute').checked || verifyMode); $('hold').textContent = 'Hold: off'; frameLoop.refresh();
    await observe(); // serially submit and settle the expired inactive clear before a new cause
    if (autoLoop && live) restartTimer = setTimeout(() => { restartTimer = 0; void startCycle(); }, 80);
  }, delay);
}
async function startCycle() {
  if (!live) return;
  clearTimeout(expiryTimer); clearTimeout(restartTimer); restartTimer = 0; frameLoop.refresh(); cycle++;
  const createdAt = Date.now(); field = { ...currentField(createdAt), id: `poison-field-r5-${cycle}` };
  field.endsAt = createdAt + 12000; held = false; renderer.setMuted($('mute').checked || verifyMode); $('hold').textContent = 'Hold: off';
  await observe();
  scheduleExpiry(); frameLoop.refresh();
}
renderer.ready.then(async () => {
  if (!live) return;
  emit('first-frame', 'pending', { clearOnly: true }); // startup clear never marks this version ready
  if (autoLoop) await startCycle();
  else status.textContent = 'WebGPU ready. Startup clear completed; press Start field to create a finite 12-second cause.';
}).catch(error => {
  if (live && !readySent) emit('first-frame', 'error', { error: { code: 'POISON_WEBGPU_STARTUP_FAILED', message: String(error?.message ?? error) } });
  status.textContent = `WebGPU unavailable or shader/pipeline failure: ${error.stack ?? error}`;
});
$('start').addEventListener('click', startCycle);
$('hold').addEventListener('click', async () => {
  held = !held;
  renderer.setMuted(held || $('mute').checked || verifyMode);
  $('hold').textContent = `Hold: ${held ? 'on' : 'off'}`;
  await observe(); frameLoop.refresh();
});
$('step').addEventListener('click', observe);
$('remove').addEventListener('click', async () => { clearTimeout(expiryTimer); clearTimeout(restartTimer); restartTimer = 0; field = null; held = false; renderer.setMuted($('mute').checked || verifyMode); $('hold').textContent = 'Hold: off'; frameLoop.refresh(); await observe(); });
$('unlock').addEventListener('click', async () => { const unlocked = await renderer.explicitPlayUnlock(); status.textContent = `Gesture unlock ${unlocked ? 'succeeded' : 'failed/disabled'}; unlock remains independent of field age.\n${status.textContent}`; });
$('mute').addEventListener('change', () => renderer.setMuted($('mute').checked || held || verifyMode));
for (const id of ['source','main','observer','radius','strength','x','y','reduced']) $(id).addEventListener('change', observe);
window.addEventListener('resize', () => { renderer.resize(); if (field) { void observe(); frameLoop.refresh(); } });
window.addEventListener('pagehide', () => { live = false; clearTimeout(expiryTimer); clearTimeout(restartTimer); restartTimer = 0; frameLoop.dispose(); void renderer.dispose(); }, { once: true });
