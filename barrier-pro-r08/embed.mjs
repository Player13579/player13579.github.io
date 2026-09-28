// Gallery-only technical wrapper. Pro r0.8 owns the model, renderer, shader, and SFX.
import { createBarrierRenderer } from './barrier-pro-renderer.mjs?adapter=r08-gallery-loop1';
import { EVENTS } from './barrier-pro-model.mjs';
import { createSfxBank } from './barrier-pro-sfx.mjs';
import { createReplayAudioGate } from './embed-audio.mjs';

const verifyMode = new URLSearchParams(location.search).has('verify');
const audioErrors = [];
const audioGate = createReplayAudioGate({ verifyMode, sfx: createSfxBank(), onError: error => audioErrors.push(String(error?.stack || error)) });
const audioButton = document.getElementById('enable-audio');
const status = document.getElementById('status');
const errors = [];
const state = {
  version: 'barrier-pro-r0.8', verifyMode, ready: false, drawCount: 0,
  errors, audioErrors, eventCycles: Object.fromEntries(Object.keys(EVENTS).map(event => [event, 0])),
  submitted: Object.fromEntries(Object.keys(EVENTS).map(event => [event, 0]))
};
window.__barrierProR08Embed = state;
if (!verifyMode) {
  audioButton.hidden = false;
  audioButton.addEventListener('click', async () => {
    audioButton.disabled = true;
    const enabled = await audioGate.unlock();
    status.textContent = enabled ? 'SFX enabled for event transitions.' : 'Could not enable SFX. Try again.';
    if (!enabled) audioButton.disabled = false;
  });
}

const events = ['create', 'absorb', 'fracture', 'bust'];
const padMs = 220;
const panels = events.flatMap(event => ['dark', 'light'].map(background => ({ id: `${event}-${background}`, event, background, H: 64 })));
const eventSegments = events.map(event => EVENTS[event].durationMs + padMs);
const globalCycleMs = eventSegments.reduce((sum, duration) => sum + duration, 0);
let readyPanels = [];
let raf = 0;
let origin = 0;
let lastStatusAt = -Infinity;

function fail(error) {
  errors.push(String(error?.stack || error));
  document.getElementById('error').textContent = errors.at(-1);
  document.body.dataset.previewStatus = 'failed';
  state.ready = false;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

function frame(now) {
  try {
    const elapsed = Math.max(0, now - origin);
    for (const event of events) state.eventCycles[event] = Math.floor(elapsed / (EVENTS[event].durationMs + padMs));
    for (const panel of readyPanels) {
      const duration = EVENTS[panel.event].durationMs;
      const segment = duration + padMs;
      const age = elapsed % segment;
      panel.renderer.render({ event: panel.event, tMs: Math.min(age, duration), receiverHeightPx: panel.H, background: panel.background, coreLightEnabled: true });
      state.submitted[panel.event]++;
      state.drawCount++;
    }
    let cyclePosition = elapsed % globalCycleMs;
    let activeEvent = events[0];
    for (let index = 0; index < events.length; index++) {
      if (cyclePosition < eventSegments[index]) { activeEvent = events[index]; break; }
      cyclePosition -= eventSegments[index];
    }
    audioGate.enter(activeEvent);
    if (audioErrors.length) state.audioErrors = audioErrors.slice();
    state.audioEnabled = audioGate.enabled;
    state.ready = true;
    document.body.dataset.previewStatus = 'ready';
    if (now - lastStatusAt >= 750) {
      lastStatusAt = now;
      status.textContent = `WebGPU replay ready · frames ${state.drawCount} · loops ${events.map(event => `${event} ${state.eventCycles[event]}`).join(' / ')} · GPU errors 0.`;
    }
    raf = requestAnimationFrame(frame);
  } catch (error) { fail(error); }
}

try {
  readyPanels = await Promise.all(panels.map(async panel => ({
    ...panel,
    renderer: await createBarrierRenderer(document.getElementById(panel.id), { scale: 2 })
  })));
  for (const panel of readyPanels) {
    panel.renderer.device.addEventListener('uncapturederror', event => fail(event.error));
    panel.renderer.device.lost.then(info => {
      if (info.reason !== 'destroyed') fail(new Error(`WebGPU device lost (${panel.event}/${panel.background}): ${info.message || info.reason}`));
    });
  }
  origin = performance.now();
  raf = requestAnimationFrame(frame);
} catch (error) { fail(error); }

window.addEventListener('pagehide', () => {
  if (raf) cancelAnimationFrame(raf);
  for (const panel of readyPanels) panel.renderer.device.destroy();
}, { once: true });
