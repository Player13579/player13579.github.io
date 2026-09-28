import { HeartReceiptCore } from './source/src/core.mjs';
import { ReceiptLedger, WallClock } from './source/src/contract.mjs';
import { createCanvasRenderer } from './source/src/gpu.mjs';
import { createFixtureAuthority } from './source/demo/fixture.mjs';

const SOURCE = 'heart-teleport-pro-r01/source';
const SOURCE_ZIP_SHA256 = '4a4e74771b49f1c35bd2cb635e42997b0c7e528431b45c7d762e34dfbee33c33';
const QUALITY_STATUS = 'unreviewed; no artistic/quality acceptance';
const $ = id => document.getElementById(id);
const verify = new URLSearchParams(location.search).get('verify') === '1';
const canvases = [$('dark'), $('light')];
const authority = createFixtureAuthority();
const clock = new WallClock();
const ledger = new ReceiptLedger();
const renderers = [];
const state = {
  version: 'r0.1', source: SOURCE, sourceZipSha256: SOURCE_ZIP_SHA256,
  sourceStatus: 'original Pro source preserved and imported directly',
  route: location.pathname, verify, audioMode: verify ? 'silent; no audio module or audio resources created' : 'no audio module is connected',
  soundQuality: 'SFX and real listening expressly unaccepted',
  qualityStatus: QUALITY_STATUS, gameStatus: 'DVA game integration and authentication expressly unaccepted',
  replay: 'initializing', receiptCount: 0, lastReceipt: null, active: 0, ledgerSize: 0,
  renderFrames: 0, gpu: [], errors: []
};
let dead = false;
let raf = 0;
let nextReceiptAt = 0;
let lastAcceptedAt = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const core = new HeartReceiptCore({
  verifyEnvelope: authority.verifyEnvelope,
  isCanonicalId: authority.isCanonicalId,
  getContext: () => authority.scope,
  getVisibility: () => ({visible: renderers.length === 2 && renderers.every(r => r.gpu.ready), onScreen: true, occluded: false, documentVisible: !document.hidden}),
  ledger, clock,
  onStart: item => { lastAcceptedAt = item.firstReceivedAt; state.lastReceipt = item.id; state.receiptCount++; state.replay = 'accepted by local deterministic fixture'; },
  onStop: (_item, reason) => { if (reason === 'expired') state.replay = 'receipt lifetime completed'; }
});

function updateStatus() {
  const now = clock.now();
  state.active = core.stats().active;
  state.ledgerSize = ledger.size;
  state.core = core.stats();
  state.gpu = renderers.map((renderer, i) => ({background: i ? 'light' : 'dark', ready: renderer.gpu.ready, adapter: renderer.adapterInfo ?? null, errors: renderer.gpu.errors()}));
  $('phase').textContent = state.errors.length ? `描画失敗 · ${state.errors.at(-1)}` : state.active ? `再生中 · ${Math.round(now - lastAcceptedAt)} ms / 1800 ms` : `新しいfixture receiptを待機中 · ${Math.max(0, Math.round(nextReceiptAt - now))} ms`;
  $('state').textContent = JSON.stringify(state, null, 2);
}

async function issueFixtureReceipt() {
  const result = await core.receive(authority.mint());
  state.lastResult = result;
  if (!result.ok) {
    state.replay = `rejected: ${result.reason}`;
    state.errors.push(`receipt rejected: ${result.reason}`);
  }
}

function frame() {
  if (dead) return;
  const now = clock.now();
  if (document.hidden) {
    core.cancelAll('document_hidden');
    renderers.forEach(renderer => renderer.draw({items: []}));
  } else {
    if (now >= nextReceiptAt) {
      nextReceiptAt = now + 2200;
      void issueFixtureReceipt().catch(error => state.errors.push(String(error?.stack ?? error)));
    }
    const active = core.tick();
    canvases.forEach((canvas, i) => {
      const dpr = Math.min(3, devicePixelRatio || 1);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      renderers[i].draw({items: active.map(item => ({x: width / 2, y: height / 2, h: 64 * dpr, dpr, ageMs: item.ageMs})), reducedMotion: reduced.matches});
    });
    state.renderFrames++;
  }
  updateStatus();
  raf = requestAnimationFrame(frame);
}

async function dispose() {
  if (dead) return;
  dead = true;
  cancelAnimationFrame(raf);
  core.dispose();
  renderers.forEach(renderer => renderer.dispose());
  state.replay = 'disposed';
  state.gpu = renderers.map((renderer, i) => ({background: i ? 'light' : 'dark', ready: renderer.gpu.ready, errors: renderer.gpu.errors()}));
  updateStatus();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { core.cancelAll('document_hidden'); renderers.forEach(renderer => renderer.draw({items: []})); } });
window.addEventListener('pagehide', dispose, {once: true});

try {
  for (const canvas of canvases) renderers.push(await createCanvasRenderer(canvas));
  nextReceiptAt = clock.now();
  state.replay = 'ready; each loop issues a fresh deterministic fixture ID';
  frame();
} catch (error) {
  state.replay = 'failed';
  state.errors.push(String(error?.stack ?? error));
  state.gpu = renderers.map((renderer, i) => ({background: i ? 'light' : 'dark', ready: renderer.gpu.ready, errors: renderer.gpu.errors()}));
  renderers.forEach(renderer => renderer.dispose());
  $('phase').textContent = `WebGPU初期化失敗 · ${error?.message ?? error}`;
  $('state').textContent = JSON.stringify(state, null, 2);
}

window.heartTeleportProR01 = Object.freeze({state, dispose});
