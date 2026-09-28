import { HeadshotContactSystem, HeadshotRenderer, RateClock, VARIANTS, ContactAudio } from './src/index.mjs';
import { FixtureHost, fixtureScene } from './preview/fixture-host.mjs';
import { PresentationTime } from './preview/loop-controller.mjs';

const canvases = [
  { element: document.getElementById('h64'), nativeSize: 64 },
  { element: document.getElementById('h32'), nativeSize: 32 },
];
const variantLabel = document.getElementById('variant');
const status = { state: 'initializing', frames: 0, cycles: 0, sequence: [], errors: [], currentVariant: null };
window.__headshotGalleryPreview = status;
let running = true;
let activeVariant = null;
let activeBornMs = null;
let variantIndex = 0;
let nextIssueAtMs = 0;
let renderers = [];
let device = null;

const time = new PresentationTime();
const clock = new RateClock({ sourceNow: time.now });
const host = new FixtureHost(clock);
const verifyMode = new URLSearchParams(location.search).has('verify');
let contactAudio = null, audioContext = null;
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
soundButton.style.cssText = 'position:fixed;z-index:5;top:10px;right:10px;padding:7px 10px;color:#d4d7da;background:#253144;border:1px solid #50627a;border-radius:4px;font:12px system-ui;cursor:pointer';
soundButton.hidden = verifyMode; document.body.append(soundButton);
soundButton.addEventListener('click', async () => {
  if (verifyMode) return;
  try {
    if (!contactAudio) {
      const Audio = window.AudioContext ?? window.webkitAudioContext;
      if (!Audio) throw new Error('AudioContext unavailable');
      audioContext = new Audio(); await audioContext.resume();
      contactAudio = new ContactAudio(audioContext, { volume: .72 });
    } else await audioContext.resume();
    soundButton.textContent = '音声有効';
  } catch (error) { soundButton.textContent = `音声不可: ${error.message}`; }
});

function projection(canvas, nativeSize) {
  return { center: [canvas.width / 2, canvas.height / 2],
    axisX: [nativeSize / 2, 0], axisY: [0, -nativeSize / 2] };
}

function fail(error) {
  running = false;
  status.state = 'failed';
  status.errors.push(String(error?.stack || error));
  document.documentElement.dataset.previewStatus = 'failed';
  console.error(error);
}

async function startVariant(now) {
  const variant = VARIANTS[variantIndex];
  const packet = host.issue(variant, { atMs: now, position: { x: 0, y: 0 } });
  const receipt = await system.accept(packet);
  if (!receipt.accepted) throw new Error(`fixture source rejected: ${receipt.reason}`);
  activeVariant = variant;
  activeBornMs = now;
  status.currentVariant = variant;
  status.sequence.push(variant);
  variantLabel.textContent = `${String(variantIndex + 1).padStart(2, '0')} / 10 · ${variant}`;
  document.documentElement.dataset.currentVariant = variant;
  return system.frame();
}

async function tick(wallNow) {
  if (!running) return;
  try {
    time.advance(wallNow);
    const now = clock.now();
    let frames = system.frame();
    if (activeVariant && frames.length === 0) {
      activeVariant = null;
      activeBornMs = null;
      variantIndex = (variantIndex + 1) % VARIANTS.length;
      if (variantIndex === 0) status.cycles += 1;
      nextIssueAtMs = now + 160;
    }
    if (!activeVariant && now >= nextIssueAtMs) frames = await startVariant(now);
    const mask = host.mask();
    for (const item of renderers) {
      const view = canvases.find(canvas => canvas.nativeSize === item.nativeSize);
      const recordList = frames.map(frame => ({ frame, projection: projection(view.element, view.nativeSize), mask }));
      item.renderer.render(recordList);
    }
    await renderers[0].renderer.submitted();
    status.frames += 1;
    status.active = frames.length;
    status.ageMs = activeBornMs === null ? null : now - activeBornMs;
    status.nativeSizes = canvases.map(view => view.nativeSize);
    status.state = 'running';
    document.documentElement.dataset.previewStatus = 'ready';
    requestAnimationFrame(tick);
  } catch (error) { fail(error); }
}

async function boot() {
  if (!navigator.gpu) throw new Error('WebGPU unavailable');
  for (const view of canvases) {
    const renderer = await HeadshotRenderer.create({ canvas: view.element, device });
    device ||= renderer.device;
    renderer.setScenePixels(fixtureScene(view.element.width, view.element.height,
      { single: true, nativeSize: view.nativeSize }));
    renderers.push({ nativeSize: view.nativeSize, renderer });
  }
  device.addEventListener('uncapturederror', event => fail(event.error));
  device.lost.then(info => { if (running) fail(new Error(`GPUDevice lost: ${info.reason} ${info.message}`)); });
  time.resetWall();
  nextIssueAtMs = clock.now();
  status.state = 'running';
  requestAnimationFrame(tick);
}

window.addEventListener('pagehide', () => {
  running = false;
  system.dispose();
  for (const item of renderers) item.renderer.dispose();
  contactAudio?.dispose();
  void audioContext?.close();
  device?.destroy();
});

boot().catch(fail);
