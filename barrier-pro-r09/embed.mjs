import { EVENTS } from './barrier-pro-model.mjs';
import { createBarrierRenderer } from './barrier-pro-browser-renderer.mjs';
import { createSfxBank } from './barrier-pro-sfx.mjs';

const verifyMode = new URLSearchParams(location.search).has('verify');
const events = ['create', 'absorb', 'fracture', 'bust'];
const panels = events.flatMap(event => ['dark', 'light'].map(background => ({ event, background, H: 64, id: `${event}-${background}` })));
const gallery = document.getElementById('gallery');
gallery.innerHTML = panels.map(({ event, background, id }) => `<section class="${background}"><h2>H64 / ${background} · ${event}</h2><div class="surface"><canvas id="${id}" aria-label="H64 ${background} ${event} barrier"></canvas></div></section>`).join('');
const state = { ready: false, verifyMode, audioEnabled: false, activeByEvent: {}, drawCount: 0, errors: [], soundEvents: [] };
window.__barrierProR09Embed = state;
const audio = verifyMode ? null : createSfxBank();
let audioReady = false, renderers = [], raf = 0, origin = 0;
const cycleMs = Object.fromEntries(events.map(event => [event, EVENTS[event].durationMs + 220]));
const seenCycles = Object.create(null);
function unlockFromGesture() {
  if (!audio || audioReady) return;
  audio.ensure().then(() => { audioReady = true; state.audioEnabled = true; }).catch(error => state.errors.push(String(error)));
}
if (!verifyMode) {
  addEventListener('pointerdown', unlockFromGesture, { passive: true });
  addEventListener('keydown', unlockFromGesture);
}
function fail(error) {
  state.errors.push(String(error?.stack || error));
  document.getElementById('error').textContent = state.errors.at(-1);
  document.body.dataset.previewStatus = 'failed';
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}
function frame(now) {
  try {
    const elapsed = Math.max(0, now - origin);
    for (const panel of renderers) {
      const eventCycle = Math.floor(elapsed / cycleMs[panel.event]);
      const eventAge = elapsed % cycleMs[panel.event];
      const tMs = Math.min(eventAge, EVENTS[panel.event].durationMs);
      panel.renderer.render({ event: panel.event, tMs, receiverHeightPx: panel.H, background: panel.background });
      state.activeByEvent[`${panel.event}-${panel.background}`] = { cycle: eventCycle, ageMs: Math.round(tMs) };
    }
    for (const event of events) {
      const cycle = Math.floor(elapsed / cycleMs[event]);
      if (seenCycles[event] === undefined) seenCycles[event] = cycle;
      else if (cycle !== seenCycles[event]) {
        seenCycles[event] = cycle;
        if (audioReady) { audio.play(event); state.soundEvents.push({ event, cycle }); }
      }
    }
    state.drawCount++;
    if (!state.ready) { state.ready = true; document.body.dataset.previewStatus = 'ready'; }
    raf = requestAnimationFrame(frame);
  } catch (error) { fail(error); }
}
try {
  renderers = await Promise.all(panels.map(async panel => ({ ...panel, renderer: await createBarrierRenderer(document.getElementById(panel.id), { scale: 2 }) })));
  origin = performance.now();
  raf = requestAnimationFrame(frame);
} catch (error) { fail(error); }
addEventListener('pagehide', () => { if (raf) cancelAnimationFrame(raf); for (const panel of renderers) panel.renderer.device.destroy(); }, { once: true });
