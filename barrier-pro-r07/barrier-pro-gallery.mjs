import { createBarrierRenderer } from './barrier-pro-renderer.mjs';
import { EVENTS } from './barrier-pro-model.mjs';
import { createSfxBank } from './barrier-pro-sfx.mjs';

const SPECS = [
  ['create', 'dark'], ['create', 'light'],
  ['absorb', 'dark'], ['absorb', 'light'],
  ['fracture', 'dark'], ['fracture', 'light'],
  ['bust', 'dark'], ['bust', 'light']
].map(([event, background]) => ({ event, background, H: 64, id: `${event}-${background}` }));

const renderers = [];
let sfx = null;
let raf = 0;
const verifyMode = new URLSearchParams(location.search).has('verify');

async function main() {
  const status = document.getElementById('status');
  try {
    for (const spec of SPECS) {
      const canvas = document.getElementById(spec.id);
      const renderer = await createBarrierRenderer(canvas, { scale: 2 });
      renderers.push({ ...spec, renderer, start: performance.now() });
    }
    status.textContent = 'WebGPU loop preview ready. Final visual/audio acceptance remains not_run in this package.';
  } catch (err) {
    status.textContent = `WebGPU init failed: ${err.message}`;
    console.error(err);
    return;
  }
  sfx = createSfxBank();
  if (!verifyMode) {
    document.getElementById('audio-controls').hidden = false;
    bindAudio();
  }
  tick(performance.now());
}

function bindAudio() {
  for (const event of ['create', 'absorb', 'fracture', 'bust']) {
    document.getElementById(`play-${event}`).addEventListener('click', async () => {
      await sfx.ensure();
      sfx.play(event);
    });
  }
}

function tick(now) {
  for (const item of renderers) {
    const duration = EVENTS[item.event].durationMs;
    let elapsed = now - item.start;
    if (elapsed > duration + 200) {
      item.start = now;
      elapsed = 0;
    }
    item.renderer.render({ event: item.event, tMs: Math.min(elapsed, duration), receiverHeightPx: item.H, background: item.background, coreLightEnabled: true });
    const label = document.getElementById(`${item.id}-meta`);
    label.textContent = `t=${Math.round(Math.min(elapsed, duration))}ms / ${duration}ms`;
  }
  raf = requestAnimationFrame(tick);
}

window.addEventListener('beforeunload', () => cancelAnimationFrame(raf));
main();
