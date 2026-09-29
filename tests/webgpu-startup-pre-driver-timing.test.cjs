const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const start = app.indexOf('function recordWebGPUPreDriverState(');
const end = app.indexOf('\nfunction recordWebGPUStartupRequest(', start);
assert.ok(start >= 0 && end > start);

function harness() {
  let now = 100;
  const trace = { events: [], dropped: 0, lastStatus: null,
    lastKey: null, lastObservedAtMs: null, pumpCount: 0 };
  const context = {
    WEBGPU_MAIN_VERIFY_ROUTE: true,
    webgpuStartupTiming: { preDriver: trace, current: null },
    state: { screen: 'game', roomId: 'room-a', roomSessionGeneration: 2,
      data: { map: { id: 'station' } } },
    window: { innerWidth: 1024, innerHeight: 768, devicePixelRatio: 2,
      visualViewport: { width: 1024, height: 700, scale: 1 } },
    independentGameplayViewportRootSize: () => ({ width: 1024, height: 768 }),
    performance: { now: () => now++ }
  };
  vm.runInNewContext(`${app.slice(start, end)}\nthis.record = recordWebGPUPreDriverState;`, context);
  return { context, trace, record: context.record };
}

test('records first pre-driver wait and transitions with viewport evidence', () => {
  const h = harness();
  h.record('waiting:viewport-sample');
  h.record('waiting:viewport-sample');
  h.record('waiting:map-image');
  assert.equal(h.trace.events.length, 2);
  assert.equal(h.trace.pumpCount, 3);
  assert.equal(h.trace.lastObservedAtMs, 102);
  assert.equal(h.trace.events[0].status, 'waiting:viewport-sample');
  assert.equal(h.trace.events[0].viewport.visualHeight, 700);
  assert.equal(h.trace.events[0].viewport.rootHeight, 768);
  assert.equal(h.trace.events[1].status, 'waiting:map-image');
  assert.ok(h.trace.events[1].atMs > h.trace.events[0].atMs);
  h.context.window.visualViewport.height = 695;
  h.record('waiting:map-image');
  assert.equal(h.trace.events.length, 3,
    'viewport drift during one wait is retained');
});

test('stops after first visible frame and excludes non-game route', () => {
  const h = harness();
  h.context.state.screen = 'title';
  h.record('waiting:viewport-sample');
  assert.equal(h.trace.events.length, 0);
  h.context.state.screen = 'game';
  h.record('startup:pending');
  h.context.webgpuStartupTiming.current = { frozen: true };
  h.record('driver:ready');
  assert.equal(h.trace.events.length, 1);
});

test('Play trace survives driver timing creation for full Play-to-frame attribution', () => {
  assert.match(app, /window\.__dvaStartupPreDriverTiming = webgpuStartupTiming\.preDriver/);
  assert.match(app, /startupTiming = \{ attemptId,[\s\S]*?preDriver: webgpuStartupTiming\.preDriver/);
  assert.match(app, /recordWebGPUPreDriverState\(!sample \? 'waiting:viewport-sample'/);
});
