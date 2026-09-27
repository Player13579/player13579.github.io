import { HeadshotContactSystem, HeadshotRenderer, RateClock } from './src/index.mjs';
import { DISPLAY_VARIANTS, FixtureHost, fixtureScene } from './preview/fixture-host.mjs';

const canvas = document.getElementById('native');
const status = document.getElementById('status');
const preview = { state: 'initializing', submittedFrames: 0, activeEvents: 0,
  visibleFrames: 0, cycles: Object.fromEntries(DISPLAY_VARIANTS.map(variant => [variant, 0])), errors: [] };
window.__headshotGalleryV1 = preview;

const clock = new RateClock({ sourceNow: () => performance.now() });
const host = new FixtureHost(clock);
const system = new HeadshotContactSystem({ clock,
  verifyCanonical: host.verifyCanonical,
  getPermission: host.getPermission,
  roomId: host.roomId,
  epoch: host.epoch });
let renderer = null;
let running = true;
let inFlight = false;
let lastIds = new Map();

function stop(error) {
  running = false;
  preview.state = 'failed';
  preview.errors.push(String(error?.stack || error));
  status.textContent = 'WebGPU再生不可';
  document.documentElement.dataset.previewStatus = 'failed';
  system.cancelAll('preview_failure');
  console.error(error);
}

async function frame() {
  if (!running || inFlight || document.hidden) return;
  inFlight = true;
  try {
    let frames = system.frame();
    const active = new Set(frames.map(item => item.event.variant));
    const missing = DISPLAY_VARIANTS.filter(variant => !active.has(variant));
    const now = clock.now();
    const results = await Promise.all(missing.map(async variant => {
      const result = await system.accept(host.issue(variant, { atMs: now }));
      if (result.accepted) {
        const priorId = lastIds.get(variant);
        if (priorId !== result.id) preview.cycles[variant] += 1;
        lastIds.set(variant, result.id);
      }
      return result;
    }));
    preview.lastAdmission = results.filter(result => !result.accepted).map(result => result.reason);
    frames = system.frame();
    const mask = host.mask();
    renderer.render(frames.map(item => ({ frame: item, projection: host.projection(item), mask })));
    await renderer.submitted();
    preview.submittedFrames += 1;
    preview.activeEvents = frames.length;
    preview.visibleFrames += frames.some(item => item.envelope.body > 0) ? 1 : 0;
    preview.state = 'running';
    document.documentElement.dataset.previewStatus = 'ready';
  } catch (error) {
    stop(error);
  } finally {
    inFlight = false;
    if (running) requestAnimationFrame(frame);
  }
}

async function boot() {
  renderer = await HeadshotRenderer.create({ canvas });
  renderer.setScenePixels(fixtureScene(canvas.width, canvas.height));
  preview.adapter = renderer.diagnostics.adapterInfo ?? null;
  document.documentElement.dataset.previewStatus = 'ready';
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) system.cancelAll('document_hidden');
  else if (running) requestAnimationFrame(frame);
});
window.addEventListener('pagehide', () => {
  running = false;
  system.dispose();
  renderer?.dispose();
});
boot().catch(stop);
