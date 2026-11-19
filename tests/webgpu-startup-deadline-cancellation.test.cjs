'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const from = app.indexOf('function startWebGPUMainAppDriverWithDeadline(');
const to = app.indexOf('\nfunction pumpWebGPUMainAppDriver()', from);
assert.ok(from >= 0 && to > from);
function harness() {
  let resolveCreation, rejectCreation, timer;
  const creation = new Promise((resolve, reject) => { resolveCreation = resolve; rejectCreation = reject; });
  const cleared = [];
  const context = { webgpuMainApp: {}, document: { body: { dataset: { webgpuMainPending: 'startup:pass-registry' } } },
    window: { setTimeout(callback) { timer = callback; return 17; }, clearTimeout(id) { cleared.push(id); } },
    startWebGPUMainAppDriver: () => creation };
  vm.createContext(context); vm.runInContext(app.slice(from, to), context);
  return { context, resolveCreation, rejectCreation, cleared, fireDeadline: () => timer() };
}
async function flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
function observe(promise) {
  const result = { status: 'pending' };
  promise.then(value => Object.assign(result, { status: 'resolved', value }),
    error => Object.assign(result, { status: 'rejected', error }));
  return result;
}
test('cancelled startup ignores deadline while retaining ownership until creation drains', async () => {
  const h = harness();
  const pending = h.context.startWebGPUMainAppDriverWithDeadline({}, {});
  const result = observe(pending);
  const token = h.context.webgpuMainApp.startToken;
  token.cancelled = true;
  h.fireDeadline(); await flush();
  assert.equal(result.status, 'pending', 'cancelled startup must not fail or free ownership before native creation drains');
  assert.strictEqual(h.context.webgpuMainApp.startToken, token);
  h.resolveCreation(null); await flush();
  assert.equal(result.status, 'resolved'); assert.equal(result.value, null);
  assert.equal(h.context.webgpuMainApp.startToken, null);
  assert.ok(h.cleared.includes(17));
});
test('current startup still rejects at its deadline', async () => {
  const h = harness();
  const result = observe(h.context.startWebGPUMainAppDriverWithDeadline({}, {}));
  const token = h.context.webgpuMainApp.startToken;
  h.fireDeadline(); await flush();
  assert.equal(result.status, 'rejected');
  assert.match(result.error.message, /WebGPU startup timed out at startup:pass-registry/);
  assert.equal(token.cancelled, true);
  assert.equal(h.context.webgpuMainApp.startToken, null);
  h.resolveCreation(null); await flush();
  assert.equal(result.status, 'rejected');
});
test('completed startup returns its driver and clears its deadline', async () => {
  const h = harness(), driver = {};
  const pending = h.context.startWebGPUMainAppDriverWithDeadline({}, {});
  h.resolveCreation(driver);
  assert.strictEqual(await pending, driver);
  assert.equal(h.context.webgpuMainApp.startToken, null);
  assert.ok(h.cleared.includes(17));
});
test('retiring old startup does not clear a newer token owner', async () => {
  const h = harness();
  const pending = h.context.startWebGPUMainAppDriverWithDeadline({}, {});
  h.context.webgpuMainApp.startToken.cancelled = true;
  const newerToken = { cancelled: false };
  h.context.webgpuMainApp.startToken = newerToken;
  h.resolveCreation(null); await pending;
  assert.strictEqual(h.context.webgpuMainApp.startToken, newerToken);
});
test('cancelled startup late rejection settles quietly after native creation drains', async () => {
  const h = harness();
  const pending = h.context.startWebGPUMainAppDriverWithDeadline({}, {});
  const result = observe(pending);
  h.context.webgpuMainApp.startToken.cancelled = true;
  h.fireDeadline(); await flush();
  assert.equal(result.status, 'pending');
  h.rejectCreation(new Error('old handoff failed after session cancellation'));
  await flush();
  assert.equal(result.status, 'resolved'); assert.equal(result.value, null);
  assert.equal(h.context.webgpuMainApp.startToken, null);
});
test('current startup native rejection remains a failure', async () => {
  const h = harness();
  const result = observe(h.context.startWebGPUMainAppDriverWithDeadline({}, {}));
  h.rejectCreation(new Error('current GPU initialization failed'));
  await flush();
  assert.equal(result.status, 'rejected');
  assert.match(result.error.message, /current GPU initialization failed/);
});
test('cancelled native rejection before deadline cannot fail a later session', async () => {
  const h = harness();
  const result = observe(h.context.startWebGPUMainAppDriverWithDeadline({}, {}));
  h.context.webgpuMainApp.startToken.cancelled = true;
  h.rejectCreation(new Error('retired handoff rejected before deadline'));
  await flush();
  assert.equal(result.status, 'resolved'); assert.equal(result.value, null);
  assert.equal(h.context.webgpuMainApp.startToken, null);
});
