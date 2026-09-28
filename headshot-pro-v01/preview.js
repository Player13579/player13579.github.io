import { HeadshotContactSystem, HeadshotRenderer, RateClock, ContactAudio } from './src/index.mjs';
import { DISPLAY_VARIANTS, FixtureHost, fixtureScene } from './preview/fixture-host.mjs';

const canvas = document.getElementById('native');
const status = document.getElementById('status');
const preview = { state: 'initializing', submittedFrames: 0, activeEvents: 0,
  visibleFrames: 0, cycles: Object.fromEntries(DISPLAY_VARIANTS.map(variant => [variant, 0])), errors: [] };
window.__headshotGalleryV1 = preview;

const clock = new RateClock({ sourceNow: () => performance.now() });
const host = new FixtureHost(clock);
const verifyMode = new URLSearchParams(location.search).has('verify');
let contactAudio = null;
const soundProxy = { play: request => contactAudio?.play(request), stop: id => contactAudio?.stop(id),
  setRate: rate => contactAudio?.setRate(rate), resetSession: () => contactAudio?.resetSession() };
const system = new HeadshotContactSystem({ clock,
  verifyCanonical: host.verifyCanonical,
  getPermission: host.getPermission,
  sound: verifyMode ? null : soundProxy,
  roomId: host.roomId,
  epoch: host.epoch });
const soundButton = document.createElement('button');
soundButton.type = 'button'; soundButton.textContent = '音声を有効化';
soundButton.setAttribute('aria-label', 'ヘッドショット効果音を有効化');
soundButton.style.cssText = 'position:fixed;z-index:5;top:10px;right:10px;padding:7px 10px;color:#eef2f8;background:#253144;border:1px solid #50627a;border-radius:4px;font:12px system-ui;cursor:pointer';
soundButton.hidden = verifyMode;
document.body.append(soundButton);
soundButton.addEventListener('click', async () => {
  if (verifyMode) return;
  try {
    if (!contactAudio) {
      const Audio = window.AudioContext ?? window.webkitAudioContext;
      if (!Audio) throw new Error('AudioContext unavailable');
      const context = new Audio();
      await context.resume();
      contactAudio = new ContactAudio(context, { volume: 0.72 });
      window.__headshotGalleryV1.audioContext = context;
    } else {
      await window.__headshotGalleryV1.audioContext.resume();
    }
    soundButton.textContent = '音声有効';
  } catch (error) { soundButton.textContent = `音声不可: ${error.message}`; }
});
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
  contactAudio?.dispose();
  void window.__headshotGalleryV1.audioContext?.close();
  renderer?.dispose();
});
boot().catch(stop);
