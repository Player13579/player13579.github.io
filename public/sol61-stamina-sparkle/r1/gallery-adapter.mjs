import { VERSION, AUTHOR, DURATION_MS, FIXTURE, plan, phaseAt, createRenderer } from './effect.mjs';
import { createSound } from './sound.mjs';

const query = new URLSearchParams(location.search);
const verify = query.has('verify');
const canvas = document.getElementById('surface');
const failure = document.getElementById('error');
const soundButton = document.getElementById('sound');
const reviewHeight = query.has('reviewH') ? Number(query.get('reviewH')) : null;
const receiverId = 'stamina-preview-sophia';
const sound = createSound({ verify });
const errors = [];
let renderer = null;
let ageMs = 0;
let lastFrame = 0;
let loop = 0;
let currentCauseId = `${VERSION}:${loop}`;
let audioEnabled = false;
let raf = 0;
let disposed = false;

function showFailure(error, stage) {
  const message = error?.message || String(error);
  errors.push({ stage, message, at: performance.now() });
  if (errors.length > 16) errors.shift();
  failure.textContent = `${stage}: ${message}`;
  failure.hidden = false;
  document.body.dataset.failed = 'true';
  window.__dvaStaminaGalleryError?.(`${stage}: ${error?.stack || message}`);
  if (stage === 'webgpu' || stage === 'fixture') {
    cancelAnimationFrame(raf);
    sound.stop();
  }
}

async function enableAudioFromGalleryGesture() {
  if (verify || audioEnabled || disposed) return;
  audioEnabled = true;
  try {
    await sound.activate();
    void sound.play(currentCauseId, { ageMs: Math.max(0, ageMs), rate: 1 }).catch(error => showFailure(error, 'sfx'));
  } catch (error) {
    showFailure(error, 'sfx');
  }
}
soundButton.addEventListener('click', enableAudioFromGalleryGesture);

function currentPlan(age) {
  const rect = canvas.getBoundingClientRect();
  const responsiveHeight = Math.min(512, Math.max(64, Math.round(Math.min(rect.height * 0.45, rect.width / 1.5))));
  const heightPx = reviewHeight === null ? responsiveHeight : Math.min(512, Math.max(64, Math.round(reviewHeight)));
  const input = {
    causeId: currentCauseId,
    receiverId,
    ageMs: age,
    anchor: { x: rect.width * 0.5, y: rect.height * 0.65 },
    heightPx,
    source: true,
    receiver: true,
    cross: true,
    post: true,
    body: true,
    reducedMotion: false
  };
  const planned = age < DURATION_MS ? plan(input) : input;
  if (!planned) throw new Error('stamina planner rejected an in-lifetime preview state');
  // R2's renderer has an explicit background uniform; keep it fixed to the
  // frozen preview's dark default because the gallery adapter adds no controls.
  return { ...planned, lightBackground: false };
}

function frame(now) {
  if (disposed || !renderer) return;
  try {
    if (lastFrame) ageMs += Math.max(0, now - lastFrame);
    lastFrame = now;
    if (ageMs >= DURATION_MS) {
      sound.stop();
      ageMs %= DURATION_MS;
      loop += 1;
      currentCauseId = `${VERSION}:${loop}`;
      if (audioEnabled && !verify) {
        void sound.play(currentCauseId, { ageMs: 0, rate: 1 }).catch(error => showFailure(error, 'sfx'));
      }
    }
    const receipt = renderer.render(currentPlan(ageMs));
    document.body.dataset.ready = 'true';
    document.body.dataset.submissions = String(receipt.submissions);
    document.body.dataset.version = VERSION;
    raf = requestAnimationFrame(frame);
  } catch (error) {
    showFailure(error, 'webgpu');
  }
}

async function initialize() {
  if (reviewHeight !== null && (!Number.isFinite(reviewHeight) || reviewHeight < 64 || reviewHeight > 512)) throw new Error('invalid reviewH parameter');
  const response = await fetch(FIXTURE.path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`body fixture HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const actualHash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  if (actualHash !== FIXTURE.sourceSha256) throw new Error(`body fixture hash mismatch: ${actualHash}`);
  const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  try {
    renderer = await createRenderer(canvas, image, { onDiagnostic: entry => {
      if (entry?.stage === 'uncaptured' || entry?.stage === 'device-lost') showFailure(new Error(entry.message || entry.stage), 'webgpu');
    } });
  } finally {
    image.close();
  }
  window.__dvaStaminaGallery = Object.freeze({
    version: VERSION,
    author: AUTHOR,
    verify,
    verifyAudioMuted: sound.verifyMuted,
    get ageMs() { return ageMs; },
    get phase() { return phaseAt(ageMs); },
    get heightPx() { const rect = canvas.getBoundingClientRect(); return reviewHeight === null ? Math.min(512, Math.max(64, Math.round(Math.min(rect.height * 0.45, rect.width / 1.5)))) : Math.min(512, Math.max(64, Math.round(reviewHeight))); },
    get loop() { return loop; },
    get submissions() { return renderer?.submissions || 0; },
    get errors() { return errors.slice(); },
    get audioEnabled() { return audioEnabled; },
    get failure() { return failure.hidden ? null : failure.textContent; }
  });
  lastFrame = performance.now();
  raf = requestAnimationFrame(frame);
}

function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(raf);
  sound.stop();
  renderer?.dispose();
  void sound.dispose();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { lastFrame = 0; sound.stop(); }
  else lastFrame = performance.now();
});
window.addEventListener('pagehide', dispose, { once: true });
initialize().catch(error => showFailure(error, 'fixture'));
