const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const start = app.indexOf('function webgpuMainSubmittedFrameCurrent()');
const end = app.indexOf('\nfunction activeGameInputSurface()', start);
assert.ok(start >= 0 && end > start);

function harness() {
  const liveSample = { width: 980, height: 620, visualWidth: 980,
    visualHeight: 620, rootWidth: 980, rootHeight: 620 };
  const canvas = { isConnected: true, style: { display: 'block', opacity: '1' },
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 980, height: 620 }) };
  const frame = { roomId: 'room-a', sessionGeneration: 4,
    snapshotRoomId: 'room-a', phase: 'playing', mapId: 'map-a',
    connectionMode: 'online', dpr: 2, sample: { ...liveSample },
    rect: { left: 10, top: 20, width: 980, height: 620 } };
  const context = {
    window: { devicePixelRatio: 2 },
    document: { hidden: false, documentElement: { dataset: { connectionMode: 'online' } } },
    els: { webgpuMainCanvas: canvas },
    state: { screen: 'game', roomId: 'room-a', roomSessionGeneration: 4,
      data: { roomId: 'room-a', phase: 'playing', map: { id: 'map-a' } } },
    webgpuMainApp: { visible: true, submittedFrame: frame,
      submittedHits: [{ id: 'hit' }], submittedPreparationHits: [{ id: 'prep' }],
      submittedMinimapBounds: { x: 1 } },
    visibleGameplayViewportSample: () => liveSample
  };
  vm.runInNewContext(`${app.slice(start, end)}\nthis.api = {
    current: webgpuMainSubmittedFrameCurrent,
    owned: webgpuMainSubmittedFrameOwned,
    matches: webgpuMainFrameViewportMatches,
    invalidateHits: invalidateWebGPUMainSubmittedHits
  };`, context);
  return { ...context, canvas, liveSample, frame, api: context.api };
}

test('soft viewport drift retains submitted pixels and invalidates old hit receipts', () => {
  const h = harness();
  h.liveSample.height += 3;
  assert.equal(h.api.current(), false);
  h.api.invalidateHits();
  assert.equal(h.webgpuMainApp.visible, true);
  assert.equal(h.webgpuMainApp.submittedFrame, h.frame);
  assert.equal(h.canvas.style.opacity, '1');
  assert.equal(h.webgpuMainApp.submittedHits, null);
  assert.equal(h.webgpuMainApp.submittedPreparationHits, null);
  assert.equal(h.webgpuMainApp.submittedMinimapBounds, null);
});

test('room/session/phase/map ownership changes still invalidate the old frame', () => {
  const h = harness();
  const owner = { visible: true, connected: true, display: 'block', screen: 'game',
    hidden: false, roomId: 'room-a', sessionGeneration: 4, phase: 'meeting',
    snapshotRoomId: 'room-a', mapId: 'map-a', connectionMode: 'online' };
  assert.equal(h.api.owned(h.frame, owner), false);
});

test('a newly accepted matching receipt rebinds geometry and restores current input', () => {
  const h = harness();
  h.liveSample.width += 0.5;
  assert.equal(h.api.current(), true, 'subpixel visual viewport drift is tolerated');
  h.liveSample.height += 4;
  assert.equal(h.api.current(), false);
  h.frame.sample = { ...h.liveSample };
  h.frame.rect = { left: 10, top: 20, width: 980, height: 620 };
  assert.equal(h.api.current(), true);
});
