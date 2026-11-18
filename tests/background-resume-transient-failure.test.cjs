'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function extract(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `function boundaries missing: ${start}`);
  return source.slice(from, to);
}
const code = [
  extract('async function request(path,', '\nfunction delay('),
  extract('function returnExpiredOnlineRoomToMatchmaking(', '\nasync function rebuildExpiredOfflineRoom('),
  extract('async function resumeRoomAfterBackground()', '\nasync function recoverRoomInteractionAfterBackground()')
].join('\n');
function harness({ offline = false, mode = 'success' } = {}) {
  const events = [];
  let timeout;
  const payload = { ok: true, roomId: 'live-room', selfId: 'player', phase: 'playing' };
  const state = { roomId: 'live-room', playerId: 'player', roomSessionGeneration: 7,
    offlineMode: offline, backgroundResume: { inFlight: false, serial: 0, queued: false },
    data: { phase: 'playing' }, lastMovementServerNow: 9, lastStateServerNow: 9 };
  const context = {
    AbortController, document: { hidden: false }, state,
    window: { setTimeout(callback) { timeout = callback; return 1; }, clearTimeout() {} },
    apiUrl: value => value, onlineApiHeaders: value => value, clientId: () => 'device',
    queueMicrotask, showToast: text => events.push(['toast', text]),
    resetLocalSession() { events.push(['reset']); state.roomId = ''; state.playerId = ''; state.data = null; state.roomSessionGeneration++; },
    deactivateOfflineMode() {}, setScreen: value => events.push(['screen', value]),
    isCurrentRoomSession: (room, player, generation) => state.roomId === room && state.playerId === player && state.roomSessionGeneration === generation,
    ensureRealtimeConnection: () => events.push(['realtime']),
    applyState: result => { events.push(['apply', result]); state.data = result; },
    rebuildExpiredOfflineRoom: async () => { events.push(['rebuild']); return true; },
    applyOnlineAvailabilityUi() {}, API_BASE_URL: '',
    fetch: async (_, options) => {
      if (mode === 'network') throw new Error('temporary network failure');
      if (mode === 'abort') { timeout(); assert.equal(options.signal.aborted, true); throw new Error('AbortError'); }
      const status = mode === '404' ? 404 : mode === '500' ? 500 : 200;
      return { ok: status === 200, status,
        json: async () => status === 200 ? payload : { ok: false, error: `HTTP ${status}` } };
    }
  };
  state.offlineClient = { start: async () => true, request: async () => mode === 'null' ? null :
    mode === '404' || mode === '500' ? { ok: false, status: Number(mode), error: mode } : payload };
  vm.createContext(context); vm.runInContext(code, context);
  return { context, state, events, payload };
}
function eventCount(h, name) { return h.events.filter(event => event[0] === name).length; }
for (const mode of ['network', '500', 'abort']) {
  test(`online ${mode} preserves a live session after focus recovery`, async () => {
    const h = harness({ mode }), initial = h.state.data;
    assert.equal(await h.context.resumeRoomAfterBackground(), false);
    assert.equal(h.state.roomId, 'live-room'); assert.equal(h.state.playerId, 'player');
    assert.equal(h.state.roomSessionGeneration, 7); assert.strictEqual(h.state.data, initial);
    assert.equal(eventCount(h, 'reset'), 0); assert.equal(eventCount(h, 'apply'), 0);
    assert.equal(h.state.backgroundResume.inFlight, false);
  });
}
test('online 404 resets the expired session', async () => {
  const h = harness({ mode: '404' });
  assert.equal(await h.context.resumeRoomAfterBackground(), true);
  assert.equal(eventCount(h, 'reset'), 1); assert.equal(h.state.roomId, '');
});
test('online 200 applies the current authoritative state', async () => {
  const h = harness();
  assert.equal(await h.context.resumeRoomAfterBackground(), true);
  assert.equal(eventCount(h, 'apply'), 1); assert.strictEqual(h.state.data, h.payload);
  assert.equal(eventCount(h, 'reset'), 0); assert.equal(eventCount(h, 'realtime'), 1);
});
for (const mode of ['null', '500']) {
  test(`offline ${mode} preserves the session without rebuilding`, async () => {
    const h = harness({ offline: true, mode }), initial = h.state.data;
    assert.equal(await h.context.resumeRoomAfterBackground(), false);
    assert.equal(h.state.roomId, 'live-room'); assert.strictEqual(h.state.data, initial);
    assert.equal(eventCount(h, 'rebuild'), 0); assert.equal(eventCount(h, 'apply'), 0);
    assert.equal(h.state.backgroundResume.inFlight, false);
  });
}
test('offline 404 invokes expired-room rebuilding', async () => {
  const h = harness({ offline: true, mode: '404' });
  assert.equal(await h.context.resumeRoomAfterBackground(), true);
  assert.equal(eventCount(h, 'rebuild'), 1); assert.equal(eventCount(h, 'apply'), 0);
});
for (const offline of [false, true]) {
  test(`default ${offline ? 'offline' : 'online'} request failure remains null`, async () => {
    const h = harness({ offline, mode: '500' });
    assert.equal(await h.context.request('/api/state', {}, { quiet: true, attempts: 1 }), null);
  });
}
