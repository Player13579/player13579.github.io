// Technical wrapper only: Pro r0.7 supplies the event model, WGSL, renderer and SFX.
import { createBarrierRenderer } from './barrier-pro-renderer.mjs?adapter=r07-reserved-word-fix1';
import { EVENTS } from './barrier-pro-model.mjs';
import { createSfxBank } from './barrier-pro-sfx.mjs';
import { createReplayAudioGate } from './embed-audio.mjs';

const verifyMode = new URLSearchParams(location.search).has('verify');
const audioErrors = [];
const audioGate = createReplayAudioGate({ verifyMode, sfx: createSfxBank(), onError: e => audioErrors.push(String(e?.stack || e)) });
const audioButton = document.getElementById('enable-audio');
const status = document.getElementById('status');
if (!verifyMode) {
  audioButton.hidden = false;
  audioButton.addEventListener('click', async () => {
    audioButton.disabled = true;
    const enabled = await audioGate.unlock();
    status.textContent = enabled ? 'SFX enabled for the next event transitions.' : 'Could not enable SFX. Try again.';
    if (!enabled) audioButton.disabled = false;
  });
}

const events = ['create', 'absorb', 'fracture', 'bust'];
const padMs = 220;
const globalSegments = events.map(event => EVENTS[event].durationMs + padMs);
const globalCycleMs = globalSegments.reduce((sum, segment) => sum + segment, 0);
const panels = events.flatMap(event => ['dark', 'light'].map(background => ({ id: `${event}-${background}`, event, background, H: 64 })));
const states = { ready: false, drawCount: 0, errors: [], audioErrors, eventCycles: Object.fromEntries(events.map(e => [e, 0])) };
window.__barrierProR07Embed = states;
let panelsReady = [];
let raf = 0;
let origin = 0;
let lastStatusAt = -Infinity;

function fail(error) {
  states.errors.push(String(error?.stack || error));
  document.getElementById('error').textContent = states.errors.at(-1);
  document.body.dataset.previewStatus = 'failed';
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}
function frame(now) {
  try {
    const elapsed = Math.max(0, now - origin);
    for (const event of events) states.eventCycles[event] = Math.floor(elapsed / (EVENTS[event].durationMs + padMs));
    for (const panel of panelsReady) {
      const duration = EVENTS[panel.event].durationMs;
      const age = elapsed % (duration + padMs);
      if (age < 17 && elapsed > 0) states.eventCycles[panel.event]++;
      panel.renderer.render({ event: panel.event, tMs: Math.min(age, duration), receiverHeightPx: panel.H, background: panel.background, coreLightEnabled: true });
      if (panel.renderer.diagnostics.length) throw new Error(panel.renderer.diagnostics.join('\n'));
    }
    states.drawCount++;
    states.audioEnabled = audioGate.enabled;
    let withinCycle = elapsed % globalCycleMs;
    let activeEvent = events[0];
    for (let i = 0; i < events.length; i++) {
      if (withinCycle < globalSegments[i]) { activeEvent = events[i]; break; }
      withinCycle -= globalSegments[i];
    }
    audioGate.enter(activeEvent);
    if (audioErrors.length) states.audioErrors = audioErrors.slice();
    if (!states.ready) { states.ready = true; document.body.dataset.previewStatus = 'ready'; }
    if (now - lastStatusAt >= 750) {
      lastStatusAt = now;
      status.textContent = `WebGPU replay ready · submitted frames ${states.drawCount} · loops ${events.map(event => `${event} ${states.eventCycles[event]}`).join(' / ')} · GPU errors ${panelsReady.reduce((sum, panel) => sum + panel.renderer.diagnostics.length, 0)}.`;
    }
    raf = requestAnimationFrame(frame);
  } catch (error) { fail(error); }
}
try {
  panelsReady = await Promise.all(panels.map(async panel => ({ ...panel, renderer: await createBarrierRenderer(document.getElementById(panel.id), { scale: 2 }) })));
  origin = performance.now();
  raf = requestAnimationFrame(frame);
} catch (error) { fail(error); }
window.addEventListener('pagehide', () => {
  if (raf) cancelAnimationFrame(raf);
  for (const panel of panelsReady) panel.renderer.device.destroy();
}, { once: true });
