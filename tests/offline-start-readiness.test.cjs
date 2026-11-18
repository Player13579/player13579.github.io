'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '..', 'offline-runtime.js'), 'utf8');
const VERSION = 'fire-e-causal-v920-box-grenades-r1';

function harness() {
  const timers = new Map();
  const workers = [];
  const scripts = [];
  let timerId = 0;
  class Worker {
    constructor() { this.listeners = {}; this.terminated = false; workers.push(this); }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    terminate() { this.terminated = true; }
    emit(name, data) { this.listeners[name]?.({ data }); }
  }
  const context = vm.createContext({
    URL, Worker,
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    document: {
      baseURI: 'https://dva.test/?verify=offline-start-readiness',
      querySelector() { return null; },
      createElement() {
        return { dataset: {}, listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; } };
      },
      head: { append(script) { scripts.push(script); } }
    }
  });
  vm.runInContext(source, context);
  return {
    client: new context.DVAOffline.OfflineApiClient(), workers, scripts, timers,
    fireDelay(delay) {
      const entry = [...timers].find(([, timer]) => timer.delay === delay);
      assert.ok(entry, `expected timer with delay ${delay}`);
      timers.delete(entry[0]); entry[1].callback();
    },
    loadMain() {
      context.DVAOfflineMainThread = { version: VERSION, request: () => ({ ok: true }) };
      scripts[0].listeners.load();
    },
    failMain() { scripts[0].listeners.error(); }
  };
}
async function flushed() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
function observe(promise) {
  const observation = { status: 'pending' };
  promise.then(value => Object.assign(observation, { status: 'fulfilled', value }),
    error => Object.assign(observation, { status: 'rejected', error }));
  return observation;
}
function assertResult(observation, value) {
  assert.equal(observation.status, 'fulfilled', 'readiness waiter must not be orphaned');
  assert.equal(observation.value, value);
}

for (const trigger of ['error', 'timeout']) {
  test(`concurrent start shares readiness while ${trigger} fallback loads`, async () => {
    const h = harness();
    const firstPromise = h.client.start();
    const first = observe(firstPromise);
    if (trigger === 'error') h.workers[0].emit('error'); else h.fireDelay(800);
    const secondPromise = h.client.start();
    const second = observe(secondPromise);
    h.loadMain(); await flushed();
    assertResult(first, true); assertResult(second, true);
    assert.strictEqual(secondPromise, firstPromise);
    assert.equal(h.workers.length, 1, 'fallback must not create a replacement Worker');
    assert.equal(h.timers.size, 0, 'settled readiness must clear startup timers');
  });
}

test('fallback failure resolves all concurrent readiness waiters', async () => {
  const h = harness();
  const first = observe(h.client.start());
  h.workers[0].emit('error');
  const second = observe(h.client.start());
  h.failMain(); await flushed();
  assertResult(first, false); assertResult(second, false);
  assert.equal(h.workers.length, 1);
  assert.equal(h.timers.size, 0);
});

test('stop resolves all readiness waiters during fallback', async () => {
  const h = harness();
  const first = observe(h.client.start());
  h.workers[0].emit('error');
  const second = observe(h.client.start());
  h.client.stop(); await flushed();
  assertResult(first, false); assertResult(second, false);
  h.failMain(); await flushed();
  assertResult(first, false); assertResult(second, false);
  assert.equal(h.workers.length, 1);
  assert.equal(h.timers.size, 0);
});

test('normal Worker readiness is shared by concurrent starts', async () => {
  const h = harness();
  const firstPromise = h.client.start();
  const secondPromise = h.client.start();
  const first = observe(firstPromise), second = observe(secondPromise);
  h.workers[0].emit('message', { type: 'ready', version: VERSION });
  await flushed();
  assertResult(first, true); assertResult(second, true);
  assert.strictEqual(secondPromise, firstPromise);
  assert.equal(h.workers.length, 1);
  assert.equal(h.scripts.length, 0);
  assert.equal(h.timers.size, 0);
});
