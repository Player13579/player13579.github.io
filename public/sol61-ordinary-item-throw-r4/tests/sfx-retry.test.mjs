import test from 'node:test';
import assert from 'node:assert/strict';
import { createThrowSfx } from '../sfx.mjs';

function audioFixture(failOnceAt = null) {
  const nodes = [];
  let remaining = failOnceAt ? 1 : 0;
  let connects = 0;
  const maybeFail = stage => {
    if (remaining && (stage === failOnceAt || (failOnceAt === 'connect-2' && stage === 'connect' && connects === 2))) {
      remaining--; throw new Error(`injected ${stage}`);
    }
  };
  const node = (kind) => {
    const n = { kind, disconnects: 0, stops: 0, listeners: {},
      connect() { connects++; maybeFail(`connect-${connects}`); maybeFail('connect'); },
      disconnect() { this.disconnects++; },
      start() { maybeFail('start'); },
      stop() { this.stops++; },
      addEventListener(name, callback) { this.listeners[name] = callback; } };
    nodes.push(n); return n;
  };
  class FakeAudioContext {
    constructor() { this.sampleRate = 48000; this.currentTime = 3; this.destination = {}; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createBuffer(_channels, length) {
      maybeFail('buffer'); const samples = new Float32Array(length);
      return { getChannelData: () => samples };
    }
    createBufferSource() { maybeFail('source'); return node('source'); }
    createBiquadFilter() { maybeFail('filter'); const n = node('filter'); n.frequency = { value: 0 }; n.Q = { value: 0 }; return n; }
    createGain() {
      maybeFail('gain'); const n = node('gain');
      n.gain = { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
      return n;
    }
  }
  return { AudioContextClass: FakeAudioContext, nodes };
}

const args = { causeId: 'ordinary-throw-cause-1', speedWorldPerMs: .23, durationMs: 600, visibleFrameComplete: true };

for (const point of ['buffer', 'source', 'filter', 'gain', 'connect-1', 'connect-2', 'connect-3', 'connect-4', 'start']) {
  test(`allocation/setup failure at ${point} is cleaned and same visible cause can retry once`, () => {
    const f = audioFixture(point); const sfx = createThrowSfx({ AudioContextClass: f.AudioContextClass });
    const first = sfx.play(args);
    assert.equal(first.status, 'retryable-failure');
    assert.equal(first.causeId, args.causeId);
    assert.equal(sfx.playedCauses.length, 0, 'failed setup must not consume cause');
    assert.ok(f.nodes.every(n => n.disconnects === 1), 'all allocated nodes are detached exactly once');
    const retried = sfx.play(args);
    assert.equal(retried.status, 'started');
    assert.deepEqual(sfx.playedCauses, [args.causeId]);
    assert.equal(sfx.play(args).status, 'duplicate-suppressed');
  });
}

test('verification and invisible-frame gates remain silent and leave the cause retryable', () => {
  const f = audioFixture(); const sfx = createThrowSfx({ AudioContextClass: f.AudioContextClass });
  assert.equal(sfx.play({ ...args, verify: true }).status, 'silent-gated');
  assert.equal(sfx.play({ ...args, visibleFrameComplete: false }).status, 'await-visible-frame');
  assert.deepEqual(sfx.playedCauses, []); assert.equal(f.nodes.length, 0);
});
