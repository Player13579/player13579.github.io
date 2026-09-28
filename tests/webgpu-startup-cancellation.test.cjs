const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const start = app.indexOf('async function createDormantWebGPUMainAppDriver(');
const end = app.indexOf('\nfunction drawBotWalkSprite(', start);
assert.ok(start >= 0 && end > start);
const factorySource = `${app.slice(start, end)}\ncreateDormantWebGPUMainAppDriver`;

function harness() {
  const device = {};
  const mainCanvas = { getContext() {} };
  const expandedCanvas = { getContext() {} };
  const acquisitionCanvas = { getContext() {} };
  const events = { failures: [], suspended: 0, destroyed: 0 };
  let releaseRuntime;
  const pendingRuntime = new Promise(resolve => { releaseRuntime = resolve; });
  const runtime = { state: 'ready', device, renderer: { device },
    requestFrame() {}, suspend() { events.suspended++; },
    destroy() { events.destroyed++; } };
  const window = {
    DvaWebGPUMainRuntime: { create: () => pendingRuntime },
    DvaWebGPUMainPassRegistry: { create: async () => ({ device,
      passes: { expandedMap: { canvas: expandedCanvas, target: 'main-expanded-map' },
        acquisition: { target: 'main-acquisition-overlay' } },
      assertFullFrameReady() {}, async destroy() {} }) },
    DvaWebGPUMainScene: { create: () => ({ device, destroy() {} }) }
  };
  const context = { window, els: { webgpuMainCanvas: mainCanvas,
    expandedMapCanvas: expandedCanvas }, state: { audio: {} },
    webgpuTitlePrewarm: { current: null }, WEBGPU_MAIN_VERIFY_ROUTE: false,
    IS_VERIFICATION_MODE: true };
  const createDriver = vm.runInNewContext(factorySource, context);
  const options = { mainCanvas, expandedCanvas, acquisitionCanvas,
    map: { id: 'map' }, image: { complete: true, naturalWidth: 100,
      naturalHeight: 100 }, textAtlas: { ensure() {}, layout() {}, textures: [] },
    atlasMetrics: { ascent: 1, pixelSize: 1 }, headMarkerMaterials: {},
    onFailure(error) { events.failures.push(error); } };
  return { createDriver, options, releaseRuntime: () => releaseRuntime(runtime), events };
}

test('a revoked startup releases its GPU runtime without latching a failure', async () => {
  const h = harness();
  let current = true;
  const attempt = h.createDriver({ ...h.options, isCurrent: () => current });
  current = false;
  h.releaseRuntime();
  assert.equal(await attempt, null);
  assert.equal(h.events.failures.length, 0);
  assert.equal(h.events.suspended, 1);
  assert.equal(h.events.destroyed, 1);
  assert.match(app, /if \(!driver \|\| !sameSession\(\)\) \{\s*await driver\?\.destroy\(\);\s*return null;/);
});

test('a still-current startup can publish its driver after the runtime await', async () => {
  const h = harness();
  const attempt = h.createDriver({ ...h.options, isCurrent: () => true });
  h.releaseRuntime();
  const driver = await attempt;
  assert.equal(driver.state, 'ready');
  assert.equal(h.events.failures.length, 0);
  await driver.destroy();
  assert.equal(h.events.destroyed, 1);
});
