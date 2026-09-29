const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const start = app.indexOf('function createWebGPUStartupAttempt(');
const end = app.indexOf('\nif (WEBGPU_MAIN_VERIFY_ROUTE)', start);
assert.ok(start >= 0 && end > start);

function harness() {
  let now = 100;
  const context = {
    WEBGPU_MAIN_VERIFY_ROUTE: true,
    webgpuStartupTiming: { nextAttemptId: 0, current: null,
      preDriver: null, firstPumpAfterPlayAtMs: null },
    webgpuMainApp: { generation: 7 },
    state: { roomId: 'room-a', roomSessionGeneration: 3,
      data: { map: { id: 'station' } } },
    window: {},
    performance: { now: () => now++ }
  };
  vm.runInNewContext(`${app.slice(start, end)}\nthis.create = createWebGPUStartupAttempt;\nthis.markDriver = markWebGPUStartupDriver;\nthis.complete = completeWebGPUStartupAttempt;`, context);
  return context;
}

function complete(context, trace, atMs = 180) {
  return context.complete(trace, trace, { appGeneration: trace.appGeneration,
    roomId: trace.roomId, roomSessionGeneration: trace.roomSessionGeneration,
    mapId: trace.mapId }, atMs);
}

test('cold Play records a new driver and Play-to-first-visible timing', () => {
  const h = harness();
  const trace = h.create('play', 110);
  assert.equal(h.window.__dvaStartupPassTiming, trace);
  h.markDriver(trace, 'new', 130);
  assert.equal(complete(h, trace, 180), true);
  assert.equal(trace.driverStatus, 'new');
  assert.equal(trace.driverToFirstVisibleMs, 50);
  assert.equal(trace.playToFirstVisibleMs, 70);
});

test('Title return then Play reuses retained driver without creation duration', () => {
  const h = harness();
  const previous = h.create('play', 20);
  previous.frozen = true;
  const replay = h.create('play', 120);
  assert.notEqual(replay.attemptId, previous.attemptId);
  h.markDriver(replay, 'reused', 140);
  assert.equal(complete(h, replay, 190), true);
  assert.equal(replay.driverStatus, 'reused');
  assert.ok(Number.isFinite(replay.driverReusedAtMs));
  assert.ok(Number.isFinite(replay.firstVisibleAtMs));
  assert.equal(replay.playToFirstVisibleMs, 70);
  assert.equal(Object.hasOwn(replay, 'driverStartedAtMs'), false);
  assert.equal(Object.hasOwn(replay, 'driverToFirstVisibleMs'), false);
});

test('map change attaches new-driver timing to the current Play attempt', () => {
  const h = harness();
  const trace = h.create('play', 100);
  h.state.data.map.id = 'harbor';
  trace.mapId = 'harbor';
  h.markDriver(trace, 'new', 145);
  assert.equal(complete(h, trace, 200), true);
  assert.equal(trace.mapId, 'harbor');
  assert.equal(trace.driverStatus, 'new');
  assert.equal(trace.driverToFirstVisibleMs, 55);
});

test('no-Play auto-resume has its own origin and no Play timing label', () => {
  const h = harness();
  const trace = h.create('auto-resume');
  h.markDriver(trace, 'reused', 140);
  assert.equal(complete(h, trace, 190), true);
  assert.equal(trace.origin, 'auto-resume');
  assert.ok(Number.isFinite(trace.firstVisibleAtMs));
  assert.equal(Object.hasOwn(trace, 'playClickedAtMs'), true);
  assert.equal(trace.playClickedAtMs, null);
  assert.equal(Object.hasOwn(trace, 'playToFirstVisibleMs'), false);
  assert.equal(Object.hasOwn(trace, 'driverToFirstVisibleMs'), false);
});

test('late receipt from an earlier app generation cannot complete the new attempt', () => {
  const h = harness();
  const old = h.create('play', 80);
  const requestIdentity = { appGeneration: old.appGeneration, roomId: old.roomId,
    roomSessionGeneration: old.roomSessionGeneration, mapId: old.mapId };
  old.frozen = true;
  h.webgpuMainApp.generation += 1;
  const current = h.create('play', 130);
  assert.equal(h.complete(current, old, requestIdentity, 170), false);
  assert.equal(Object.hasOwn(current, 'firstVisibleAtMs'), false);
  assert.equal(Object.hasOwn(old, 'firstVisibleAtMs'), false);
});
