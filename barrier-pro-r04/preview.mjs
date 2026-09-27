import { createBarrierRenderer } from './barrier-pro-renderer.mjs';
import { DURATIONS_MS, playSFX } from './barrier-pro-sampler.mjs';

const canvas = document.querySelector('#view');
const stateLabel = document.querySelector('#state');
const soundButton = document.querySelector('#sound');
const verifyMode = new URLSearchParams(location.search).has('verify');
const events = ['create', 'absorb', 'fracture', 'bust'];
const gapMs = 180;
let renderer;
let audioContext;
let soundVoice;
let lastAudioBranch = null;
let epoch = 0;

if (new URLSearchParams(location.search).get('embed') === '1') document.body.classList.add('embed');
soundButton.hidden = verifyMode;

function frame(now) {
  if (!renderer) return;
  const cycle = events.reduce((total, event) => total + DURATIONS_MS[event] + gapMs, 0);
  const elapsed = (now - epoch) % cycle;
  let offset = elapsed;
  let branch = events[0];
  for (const event of events) {
    const span = DURATIONS_MS[event] + gapMs;
    if (offset < span) { branch = event; break; }
    offset -= span;
  }
  const duration = DURATIONS_MS[branch];
  const inGap = offset >= duration;
  const ageMs = inGap ? duration : offset;
  renderer.draw({
    branch,
    ageMs,
    hPx: 64,
    background: 0,
    authoritativeActive: branch === 'create' || branch === 'absorb',
    coreEnabled: true,
    grayscale: false,
    bandMask: 1,
    hemisphere: 0,
    diagnostic: 0,
  });
  if (!verifyMode && audioContext?.state === 'running' && !inGap && branch !== lastAudioBranch) {
    soundVoice?.cancel();
    soundVoice = playSFX(audioContext, branch, { volume: 0.35, pan: 0 });
    lastAudioBranch = branch;
  }
  stateLabel.textContent = `${branch} · ${Math.floor(ageMs)} ms${inGap ? ' · 間' : ''}`;
  requestAnimationFrame(frame);
}

async function enableSound() {
  if (verifyMode) return;
  try {
    audioContext ??= new AudioContext();
    await audioContext.resume();
    lastAudioBranch = null;
  } catch (error) {
    stateLabel.textContent = `音声を開始できません: ${error.message}`;
  }
}
soundButton.addEventListener('click', enableSound);
if (document.body.classList.contains('embed') && !verifyMode) canvas.addEventListener('pointerdown', () => {
  if (!audioContext) void enableSound();
});

try {
  renderer = await createBarrierRenderer(canvas, { width: 980, height: 620, ss: 2 });
  epoch = performance.now();
  stateLabel.textContent = verifyMode ? 'verify · audio muted' : '自動ループ';
  requestAnimationFrame(frame);
} catch (error) {
  stateLabel.textContent = `WebGPU初期化失敗 · ${error.message}`;
  stateLabel.classList.add('quality');
  soundButton.disabled = true;
}
