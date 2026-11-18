'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = app.indexOf('async function createDormantWebGPUMainAppDriver(');
const end = app.indexOf('\nfunction drawBotWalkSprite(', start);
assert.ok(start >= 0 && end > start);
const factorySource = `${app.slice(start, end)}\ncreateDormantWebGPUMainAppDriver`;
function harness() {
  const device = {};
  const mainCanvas = { getContext() {} }, expandedCanvas = { getContext() {} }, acquisitionCanvas = { getContext() {} };
  const events = { failures: [], suspended: 0, resumed: 0, destroyed: 0 };
  let releaseRuntime, runtimeFailure, current = true;
  const pendingRuntime = new Promise(resolve => { releaseRuntime = resolve; });
  const runtime = { state: 'ready', device, renderer: { device }, requestFrame() {},
    suspend() { events.suspended++; }, resume() { events.resumed++; return true; },
    destroy() { events.destroyed++; this.state = 'destroyed'; } };
  const context = { window: {
    DvaWebGPUMainRuntime: { create(options) { runtimeFailure = options.onFailure; return pendingRuntime; } },
    DvaWebGPUMainPassRegistry: { create: async () => ({ device,
      passes: { expandedMap: { canvas: expandedCanvas, target: 'main-expanded-map' },
        acquisition: { target: 'main-acquisition-overlay' }, sunbeamE: { stopAudio() {} } },
      assertFullFrameReady() {}, async destroy() {} }) },
    DvaWebGPUMainScene: { create: () => ({ device, destroy() {} }) }
  }, els: { webgpuMainCanvas: mainCanvas, expandedMapCanvas: expandedCanvas },
    state: { audio: {} }, webgpuTitlePrewarm: { current: null },
    WEBGPU_MAIN_VERIFY_ROUTE: false, IS_VERIFICATION_MODE: true };
  const createDriver = vm.runInNewContext(factorySource, context);
  const options = { mainCanvas, expandedCanvas, acquisitionCanvas,
    map: { id: 'map' }, image: { complete: true, naturalWidth: 100, naturalHeight: 100 },
    textAtlas: { ensure() {}, layout() {}, textures: [] }, atlasMetrics: { ascent: 1, pixelSize: 1 },
    headMarkerMaterials: {}, isCurrent: () => current,
    onFailure(error) { events.failures.push(error); } };
  return { events, begin: () => createDriver(options),
    revokeStartup() { current = false; }, releaseRuntime: () => releaseRuntime(runtime),
    fail: error => runtimeFailure(error) };
}
async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
async function publish(h) { const pending = h.begin(); h.releaseRuntime(); return pending; }

test('published retained driver reports runtime failure after suspend and resume revoke startup ownership', async () => {
  const h = harness(), driver = await publish(h);
  h.revokeStartup(); driver.suspend(); driver.resume();
  const failure = new Error('GPU preparation failed after foreground recovery');
  h.fail(failure); await flush();
  assert.deepEqual(h.events.failures, [failure]);
  assert.equal(h.events.resumed, 1); assert.equal(h.events.destroyed, 1);
  assert.equal(driver.state, 'destroyed');
});
test('cancelled initialization remains quiet and retires its runtime', async () => {
  const h = harness(), pending = h.begin();
  h.revokeStartup(); h.releaseRuntime();
  assert.equal(await pending, null);
  h.fail(new Error('late cancelled initialization failure')); await flush();
  assert.equal(h.events.failures.length, 0); assert.equal(h.events.destroyed, 1);
});
test('destroyed published driver ignores a late runtime failure even if startup predicate is true', async () => {
  const h = harness(), driver = await publish(h);
  await driver.destroy();
  h.fail(new Error('retired GPU callback')); await flush();
  assert.equal(h.events.failures.length, 0); assert.equal(h.events.destroyed, 1);
});
test('current published driver reports its first failure exactly once', async () => {
  const h = harness(), driver = await publish(h);
  const first = new Error('first GPU error');
  h.fail(first); h.fail(new Error('duplicate GPU error')); await flush();
  assert.deepEqual(h.events.failures, [first]);
  assert.equal(h.events.destroyed, 1); assert.equal(driver.state, 'destroyed');
});
