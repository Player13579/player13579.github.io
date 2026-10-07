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
let lastFrame = null;
let loop = 0;
let currentCauseId = `${VERSION}:${loop}`;
let audioEnabled = false;
let raf = null;
let rafEpoch = 0;
let disposed = false;
let failed = false;
let resizeObserver = null;

function currentSize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  if (![rect.width, rect.height, dpr].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0 || dpr <= 0) return null;
  return { rect, dpr };
}

function cancelScheduledFrame() {
  if (raf !== null) cancelAnimationFrame(raf);
  raf = null;
  rafEpoch += 1;
}

function suspend() {
  cancelScheduledFrame();
  lastFrame = null;
  document.body.dataset.ready = 'false';
}

function heightFor(rect) {
  return reviewHeight === null
    ? Math.min(512, Math.max(64, Math.round(Math.min(rect.height * 0.45, rect.width / 1.5))))
    : Math.min(512, Math.max(64, Math.round(reviewHeight)));
}

function showFailure(error, stage) {
  const message = error?.message || String(error);
  errors.push({ stage, message, at: performance.now() });
  if (errors.length > 16) errors.shift();
  failure.textContent = `${stage}: ${message}`;
  failure.hidden = false;
  document.body.dataset.failed = 'true';
  window.__dvaStaminaGalleryError?.(`${stage}: ${error?.stack || message}`);
  if (stage === 'webgpu' || stage === 'fixture') {
    failed = true;
    suspend();
    sound.stop();
  }
}

function currentPlan(age, rect) {
  const input = {
    causeId: currentCauseId,
    receiverId,
    ageMs: age,
    anchor: { x: rect.width * 0.5, y: rect.height * 0.65 },
    heightPx: heightFor(rect),
    source: true,
    receiver: true,
    cross: true,
    post: true,
    body: true,
    reducedMotion: false
  };
  const planned = age < DURATION_MS ? plan(input) : input;
  if (!planned) throw new Error('stamina planner rejected an in-lifetime preview state');
  // R2's renderer has an explicit background uniform; preserve the frozen
  // preview's dark default because this gallery adapter adds no controls.
  return { ...planned, lightBackground: false };
}

function queueFrame() {
  if (disposed || failed || !renderer || document.hidden) return;
  const size = currentSize();
  if (!size) {
    suspend();
    sound.stop();
    return;
  }
  if (raf !== null) return;
  if (lastFrame === null) lastFrame = performance.now();
  const epoch = rafEpoch;
  raf = requestAnimationFrame(() => {
    if (epoch !== rafEpoch) return;
    raf = null;
    frame();
  });
}

function frame() {
  if (disposed || failed || !renderer) return;
  if (document.hidden) {
    suspend();
    sound.stop();
    return;
  }
  const size = currentSize();
  if (!size) {
    suspend();
    sound.stop();
    return;
  }
  try {
    // Sample at callback execution. RAF's timestamp may have been queued before
    // a visibility/layout event reset the monotonic baseline.
    const now = performance.now();
    if (lastFrame !== null) {
      const elapsed = now - lastFrame;
      if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('invalid monotonic preview clock');
      ageMs += elapsed;
    }
    lastFrame = now;
    if (ageMs >= DURATION_MS) {
      sound.stop();
      ageMs %= DURATION_MS;
      loop += 1;
      currentCauseId = `${VERSION}:${loop}`;
      if (audioEnabled && !verify && !document.hidden) {
        void sound.play(currentCauseId, { ageMs: 0, rate: 1 }).catch(error => showFailure(error, 'sfx'));
      }
    }
    const receipt = renderer.render(currentPlan(ageMs, size.rect));
    document.body.dataset.ready = 'true';
    document.body.dataset.submissions = String(receipt.submissions);
    document.body.dataset.version = VERSION;
    queueFrame();
  } catch (error) {
    showFailure(error, 'webgpu');
  }
}

function exposeObserver() {
  window.__dvaStaminaGallery = Object.freeze({
    version: VERSION,
    author: AUTHOR,
    verify,
    verifyAudioMuted: sound.verifyMuted,
    get ageMs() { return ageMs; },
    get causeId() { return currentCauseId; },
    get phase() { return phaseAt(ageMs); },
    get heightPx() { const size = currentSize(); return size ? heightFor(size.rect) : null; },
    get cssSize() { const size = currentSize(); return size ? { width: size.rect.width, height: size.rect.height, dpr: size.dpr } : null; },
    get sizeValid() { return currentSize() !== null; },
    get loop() { return loop; },
    get submissions() { return renderer?.submissions || 0; },
    get errors() { return errors.slice(); },
    get audioEnabled() { return audioEnabled; },
    get failure() { return failure.hidden ? null : failure.textContent; },
    get disposed() { return disposed; }
  });
}

async function enableAudioFromGalleryGesture() {
  if (verify || audioEnabled || disposed || document.hidden || !currentSize()) return;
  audioEnabled = true;
  try {
    await sound.activate();
    if (!disposed && !document.hidden && currentSize()) {
      void sound.play(currentCauseId, { ageMs: Math.max(0, ageMs), rate: 1 }).catch(error => showFailure(error, 'sfx'));
    }
  } catch (error) {
    showFailure(error, 'sfx');
  }
}
soundButton.addEventListener('click', enableAudioFromGalleryGesture);

function onSizeChange() {
  if (disposed || failed) return;
  if (document.hidden || !currentSize()) {
    suspend();
    sound.stop();
    return;
  }
  queueFrame();
}

function onVisibilityChange() {
  if (disposed || failed) return;
  if (document.hidden) {
    suspend();
    sound.stop();
    return;
  }
  // A visible resume starts from a new baseline; hidden time is never caught up.
  lastFrame = null;
  onSizeChange();
}

function dispose() {
  if (disposed) return;
  disposed = true;
  suspend();
  resizeObserver?.disconnect();
  window.removeEventListener('resize', onSizeChange);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', dispose);
  sound.stop();
  renderer?.dispose();
  void sound.dispose();
}

async function initialize() {
  if (reviewHeight !== null && (!Number.isFinite(reviewHeight) || reviewHeight < 64 || reviewHeight > 512)) throw new Error('invalid reviewH parameter');
  if (disposed || failed) return;
  const response = await fetch(FIXTURE.path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`body fixture HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const actualHash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  if (actualHash !== FIXTURE.sourceSha256) throw new Error(`body fixture hash mismatch: ${actualHash}`);
  if (disposed || failed) return;
  const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  if (disposed || failed) {
    image.close();
    return;
  }
  let created = null;
  try {
    created = await createRenderer(canvas, image, { onDiagnostic: entry => {
      if (disposed) return;
      if (entry?.stage === 'uncaptured' || entry?.stage === 'device-lost') showFailure(new Error(entry.message || entry.stage), 'webgpu');
    } });
  } finally {
    image.close();
  }
  if (disposed || failed) {
    created.dispose();
    return;
  }
  renderer = created;
  exposeObserver();
  onSizeChange();
}

if (typeof ResizeObserver !== 'undefined') {
  resizeObserver = new ResizeObserver(onSizeChange);
  resizeObserver.observe(canvas);
}
window.addEventListener('resize', onSizeChange, { passive: true });
document.addEventListener('visibilitychange', onVisibilityChange);
window.addEventListener('pagehide', dispose, { once: true });
initialize().catch(error => showFailure(error, 'fixture'));



