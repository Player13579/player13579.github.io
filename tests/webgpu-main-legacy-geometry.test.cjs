const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
function extractFunction(name, nextName) {
  const start = app.indexOf(`function ${name}(`);
  const end = Math.max(app.indexOf(`\nfunction ${nextName}(`, start),
    app.indexOf(`\nasync function ${nextName}(`, start));
  assert.ok(start >= 0 && end > start, `${name} source exists`);
  return app.slice(start, end);
}
function rect(left, top, width, height) { return { left, top, width, height }; }
function surface(bounds) {
  return { isConnected: true, getBoundingClientRect: () => ({ ...bounds }) };
}

const signatureSource = extractFunction('webgpuMainViewportSignature', 'captureWebGPUMainAppWorldCandidate');
const captureTailSource = extractFunction('captureWebGPUMainAppConditionalTail', 'webgpuMainViewportSignature');
const hudSource = extractFunction('hudWebGPUScene', 'minimapWebGPUScene');
const acquisitionSource = extractFunction('assertWebGPUAcquisitionCandidateGeometry', 'prepareWebGPUMainAppWorldCandidate');

function evaluate(source, context, api) {
  vm.runInNewContext(`${source}\nthis.api = { ${api} };`, context);
  return context.api;
}

test('candidate viewport signature binds the CSS DOM rectangle', () => {
  const api = evaluate(signatureSource, {}, 'signature: webgpuMainViewportSignature');
  const viewport = { kind: 'main', width: 980, height: 620, pixelWidth: 1960,
    pixelHeight: 1240, worldToLogical: [1, 0, 0, 1, 0, 0], rect: rect(8, 24, 490, 310) };
  const first = api.signature(viewport);
  viewport.rect = rect(9, 24, 490, 310);
  const moved = api.signature(viewport);
  assert.notDeepEqual(Array.from(first), Array.from(moved));
  assert.deepEqual(Array.from(first).slice(5, 9), [8, 24, 490, 310]);
});

test('HUD CSS geometry comes from the candidate WebGPU viewport and rejects absence', () => {
  const api = evaluate(hudSource, {
    state: { tabletOpen: true },
    soloMissionHudCssBottom: 310,
    estimatedServerNow: () => 100,
    displayedManaValue: value => value,
    hasDisplayedOperatorAccess: () => false
  }, 'hud: hudWebGPUScene');
  const scene = api.hud({ self: { mana: 4 } }, 980, 620,
    { rect: rect(20, 100, 420, 260) });
  assert.equal(scene.canvasCssWidth, 420);
  assert.equal(scene.canvasCssHeight, 260);
  assert.equal(scene.soloMissionHudOverlapCss, 210);
  assert.throws(() => api.hud({}, 980, 620, null), /valid candidate viewport rectangle/);
  assert.throws(() => api.hud({}, 980, 620,
    { rect: rect(0, 0, 0, 620) }), /valid candidate viewport rectangle/);
});

test('acquisition geometry validates against WebGPU target, never legacy canvas', () => {
  const mainRect = rect(10, 20, 490, 310), overlayRect = rect(0, 0, 1024, 768);
  const webgpuMainCanvas = surface(mainRect), overlay = surface(overlayRect);
  const legacyCanvas = { isConnected: true, getBoundingClientRect() {
    throw new Error('legacy geometry must not be read');
  } };
  const api = evaluate(acquisitionSource, { els: { webgpuMainCanvas, canvas: legacyCanvas } },
    'assert: assertWebGPUAcquisitionCandidateGeometry');
  const acquisition = { effects: [{ id: 'e1' }], canvas: overlay,
    canvasRect: rect(10, 20, 490, 310), overlayRect };
  assert.doesNotThrow(() => api.assert(null, acquisition));
  webgpuMainCanvas.getBoundingClientRect = () => rect(11, 20, 490, 310);
  assert.throws(() => api.assert(null, acquisition), error =>
    error.code === 'DVA_WEBGPU_STALE_SCENE');
});

test('acquisition capture snapshots the candidate main viewport and emits no fallback request', () => {
  const effect = { id: 'arrival-1', type: 'transfer-in', playerId: 'self',
    startedAt: 0, duration: 5000, x: 25, y: 30 };
  const api = evaluate(captureTailSource, {
    els: { get canvas() { throw new Error('legacy canvas must not be read'); } },
    state: { expandedMapOpen: false, frameNow: 500, magicEffects: [effect],
      screen: 'game' },
    window: {},
    performance: { now: () => 500 },
    isSensoryBlocked: () => false,
    acquisitionPhotonWindow: (value, now) => now - value.startedAt < value.duration
      ? now - value.startedAt : null
  }, 'capture: captureWebGPUMainAppConditionalTail');
  const data = { phase: 'playing', selfId: 'self', players: [] };
  const mainViewportRect = rect(12, 18, 420, 265);
  const candidate = api.capture(data, { x: 0, y: 0 }, 1,
    { rect: mainViewportRect }, {});
  assert.deepEqual({ ...candidate.acquisition.canvasRect }, mainViewportRect);
  assert.equal(candidate.acquisition.requests.length, 0);
  assert.equal(candidate.acquisition.drawFrame, null);
  assert.equal(candidate.acquisition.unsupported.length, 1);
  assert.equal(candidate.acquisition.unsupported[0].reason,
    'acquisition-shared-overlay-target-unavailable');
  const withoutViewport = api.capture(data, { x: 0, y: 0 }, 1, null, {});
  assert.equal(withoutViewport.acquisition.canvasRect, undefined);
  assert.equal(withoutViewport.acquisition.requests.length, 0);
  assert.equal(withoutViewport.acquisition.drawFrame, null);
});

test('resolved acquisition HUD geometry is revalidated against the WebGPU target', () => {
  const mainRect = rect(10, 20, 490, 310), overlayRect = rect(0, 0, 1024, 768);
  const webgpuMainCanvas = surface(mainRect), overlay = surface(overlayRect);
  const api = evaluate(acquisitionSource, { els: { webgpuMainCanvas } },
    'assert: assertWebGPUAcquisitionCandidateGeometry');
  const plan = { acquisitionHudRects: { credits: rect(40, 50, 20, 12) } };
  const candidate = { acquisitionHudPlan: plan,
    stages: { hud: { preparedPlan: plan } },
    acquisitionResolved: { overlayRect, canvasRect: rect(10, 20, 490, 310),
      hudRects: plan.acquisitionHudRects, drawFrame: { width: 1024, height: 768 } },
    conditional: { acquisition: { drawFrame: { width: 1024, height: 768 } } } };
  const acquisition = { effects: [], canvas: overlay, overlayRect };
  assert.doesNotThrow(() => api.assert(candidate, acquisition));
  webgpuMainCanvas.getBoundingClientRect = () => rect(10, 21, 490, 310);
  assert.throws(() => api.assert(candidate, acquisition), error =>
    error.code === 'DVA_WEBGPU_STALE_SCENE');
});
