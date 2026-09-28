'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const api = require(process.env.DVA_COMBAT_E_SFX_PATH ||
  path.resolve(__dirname, '../webgpu-combat-e-sfx.js'));

class Param {
  constructor(value = 0) { this.value = value; this.calls = []; }
  setValueAtTime(value, at) { this.value = value; this.calls.push([value, at]); }
  cancelScheduledValues() {}
  linearRampToValueAtTime(value, at) { this.value = value; this.calls.push([value, at]); }
}
class Node {
  constructor() { this.connections = []; this.stops = []; this.playbackRate = new Param(1); }
  connect(node) { this.connections.push(node); return node; }
  disconnect() {}
  start(...args) { this.startArgs = args; }
  stop(...args) { this.stops.push(args); }
}
const context = {
  state: 'running', sampleRate: 24000, currentTime: 4,
  buffers: [], sources: [], gains: [],
  createBuffer(channels, length, rate) {
    const buffer = { channels, length, sampleRate: rate, duration: length / rate,
      data: new Float32Array(length), copyToChannel(pcm, channel) {
        assert.equal(channel, 0); this.data.set(pcm);
      } };
    this.buffers.push(buffer); return buffer;
  },
  createBufferSource() { const node = new Node(); this.sources.push(node); return node; },
  createGain() { const node = new Node(); node.gain = new Param(1); this.gains.push(node); return node; }
};
const master = { gain: { value: 1 } };

async function main() {
  const { synthesize, SOUND_SECONDS } = await import('../astra-emp-v1/versions/v1.8/sfx.mjs');
  let synthCalls = 0;
  const player = api.createEmpPCMPlayer({ getContext: () => context,
    getMaster: () => master, isMuted: () => false, isVerify: () => false });
  const types = [
    ['emp-charge', 'negative'], ['emp', 'positive'],
    ['emp-resonance', 'positive'], ['emp-cancel', 'opposite'],
    ['emp-storage-lock', 'storage']
  ];
  const synth = (...args) => { synthCalls++; return synthesize(...args); };
  player.setSynthesizer(synth);
  for (const [index, [type, variant]] of types.entries()) {
    const event = { eventId: `pcm-${index}`, type, variant, roomId: 'room',
      roomGeneration: 2, eventAtMs: 1000 + index * 100, variant: variant };
    // charge/discharge support polarity; the other three only accept their semantic variant.
    const expectedVariant = ({ 'emp-charge': 'negative', emp: 'positive',
      'emp-resonance': 'positive', 'emp-cancel': 'opposite',
      'emp-storage-lock': 'storage' })[type];
    event.variant = expectedVariant;
    const result = player.play(event, { nowMs: event.eventAtMs, volume: .5, rate: 1.25 });
    assert.equal(result.status, 'scheduled', `${type} scheduled`);
    assert.equal(result.reason, '');
    const buffer = context.buffers.at(-1);
    const expected = synthesize(type, context.sampleRate, event.variant === 'negative');
    assert.equal(buffer.length, Math.ceil(SOUND_SECONDS[type] * context.sampleRate));
    assert.deepEqual(buffer.data, expected, `${type} PCM is the exact Astra v1.8 output`);
    const source = context.sources.at(-1);
    assert.equal(source.playbackRate.value, 1.25);
    assert.equal(source.startArgs[0], context.currentTime);
    assert.equal(source.startArgs[1], 0);
    assert.equal(context.gains.at(-1).gain.value, .11);
    assert.equal(player.play(event, { nowMs: event.eventAtMs, volume: .5 }).reason, 'duplicate');
  }
  assert.equal(synthCalls, 5, 'each admitted event synthesizes exactly once');
  assert.equal(player.active(), 5);
  assert.equal(player.setEventRate('pcm-0', 2), true);
  assert.equal(context.sources[0].playbackRate.value, 2);
  assert.equal(player.stopEvent('pcm-0'), true);
  assert.equal(context.sources[0].stops.length, 1);
  const syncPlayer = api.createEmpPCMPlayer({ getContext: () => context,
    getMaster: () => master });
  syncPlayer.setSynthesizer(synthesize);
  const syncedEvent = { eventId: 'sync-offset', type: 'emp-resonance',
    variant: 'negative', roomId: 'room', roomGeneration: 4, eventAtMs: 5000 };
  assert.equal(syncPlayer.play(syncedEvent,
    { nowMs: 5075, rate: 2 }).status, 'scheduled');
  assert.equal(context.sources.at(-1).startArgs[1], .15,
    'post-submit playback skips the elapsed visual-age audio interval at actor rate');
  syncPlayer.stopEvent('sync-offset');

  let muted = true;
  const gated = api.createEmpPCMPlayer({ getContext: () => context,
    getMaster: () => master, isMuted: () => muted });
  gated.setSynthesizer(synth);
  const gatedEvent = { eventId: 'muted', type: 'emp', variant: 'positive',
    roomId: 'room', roomGeneration: 1, eventAtMs: 2000 };
  assert.equal(gated.play(gatedEvent, { nowMs: 2000 }).reason, 'muted');
  muted = false;
  assert.equal(gated.play(gatedEvent, { nowMs: 2000 }).reason, 'duplicate',
    'muted sound is consumed and cannot backfill');

  let verifySynthCalls = 0;
  const verify = api.createEmpPCMPlayer({ getContext: () => context,
    getMaster: () => master, isVerify: () => true });
  verify.setSynthesizer((...args) => { verifySynthCalls++; return synthesize(...args); });
  const verifyEvent = { ...gatedEvent, eventId: 'verify', roomGeneration: 1 };
  assert.equal(verify.play(verifyEvent, { nowMs: 2000 }).reason, 'verification');
  assert.equal(verifySynthCalls, 0, 'verify mode does not synthesize or start audio');
  const lateEvent = { ...gatedEvent, eventId: 'late', roomGeneration: 1, eventAtMs: 3000 };
  const latePlayer = api.createEmpPCMPlayer({ getContext: () => context,
    getMaster: () => master });
  latePlayer.setSynthesizer((...args) => { verifySynthCalls++; return synthesize(...args); });
  assert.equal(latePlayer.play(lateEvent, { nowMs: 3181 }).reason, 'late');
  assert.equal(verifySynthCalls, 0, 'late events are dropped before PCM generation');

  const noSynth = api.createEmpPCMPlayer({ getContext: () => context,
    getMaster: () => master });
  assert.equal(noSynth.play({ ...gatedEvent, eventId: 'not-ready' },
    { nowMs: 2000 }).reason, 'not-ready');

  const beforeReset = context.sources.length;
  player.enterRoom('room', 3);
  assert.equal(player.active(), 0, 'new room generation stops active PCM voices');
  assert.equal(context.sources[beforeReset - 1].stops.length, 1);
  assert.equal(player.has('pcm-1'), false, 'new room generation clears dedupe state');
  assert.throws(() => player.play({ ...gatedEvent, eventId: 'bad', type: 'fire' },
    { nowMs: 2000 }), /supported event/);
  process.stdout.write('PASS: exact Astra EMP v1.8 PCM for all five event types; existing context/master only; polarity, gain/rate, dedupe, no-backfill mute, strict verify silence, not-ready/late suppression, and room cleanup.\n');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
