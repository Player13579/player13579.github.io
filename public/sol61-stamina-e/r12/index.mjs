import { StaminaRuntime } from './runtime.mjs';

const canvas = document.querySelector('#stamina');
const status = document.querySelector('#status');
const verify = new URLSearchParams(location.search).has('verify');
const runtime = new StaminaRuntime({ canvas, verify, preview: true, assetUrl: new URL('./assets/sophia-front-five-v753.png', import.meta.url) });
window.__staminaR12Runtime = runtime;
window.__gallerySfx = Object.freeze({ activateFromGesture: item => runtime.activateFromGesture(item) });

const refreshStatus = () => {
  const snapshot = runtime.snapshot();
  if (snapshot.gpuReady) status.textContent = snapshot.verify
    ? 'WebGPU ready · verify mode is silent.'
    : 'WebGPU ready · visual preview loops automatically; interact once to enable its sound.';
  else status.textContent = snapshot.error || 'Waiting for WebGPU.';
  status.dataset.error = String(Boolean(snapshot.error));
};
refreshStatus();
canvas.addEventListener('pointerdown', () => { if (!verify) void runtime.activateFromGesture(); }, { passive: true });
canvas.addEventListener('keydown', () => { if (!verify) void runtime.activateFromGesture(); }, { passive: true });
canvas.tabIndex = 0;
await runtime.boot();
refreshStatus();

