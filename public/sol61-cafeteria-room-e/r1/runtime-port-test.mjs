import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile as readBytes } from 'node:fs/promises';
import { ROOM, fitRoom, stateAt, uniformsAt } from './scene.mjs';
import { drawPlan } from './draw-plan.mjs';
import { supportRects } from './projection.mjs';
import { CUES, SCORE } from './sfx-score.mjs';
import { RoomSfx } from './sfx.mjs';

const root = new URL('./', import.meta.url);
const read = path => readBytes(new URL(path, root));
const bitmap = await read(ROOM.bitmap);
assert.equal(createHash('sha256').update(bitmap).digest('hex'), ROOM.bitmapHash, 'source bitmap frozen hash');

const views = [[980, 620], [930, 860], [465, 430], [400, 300], [1200, 500]];
for (const [width, height] of views) {
  const fit = fitRoom(width, height);
  assert.ok(fit.scale > 0 && fit.extent[0] <= width + 1e-9 && fit.extent[1] <= height + 1e-9);
  assert.ok(Math.abs(fit.extent[0] - ROOM.width * fit.scale) < 1e-9);
  assert.ok(Math.abs(fit.extent[1] - ROOM.height * fit.scale) < 1e-9);
  for (const dpr of [1, 2]) {
    const uniforms = uniformsAt(width * dpr, height * dpr, 500, { dpr });
    assert.equal(uniforms.length, 24);
    assert.ok([...uniforms].every(Number.isFinite));
    assert.ok(Math.abs(uniforms[6] - fit.scale * dpr) < 1e-6);
  }
}

for (const age of [0, 160, 500, 1200, 2800, 2860, 3400, 4200, 4460, 7200, 8000, 8600, 8860, 10000, 11500, 11900]) {
  const plan = drawPlan(age, {});
  assert.ok(plan.length <= 32, `draw cap at ${age}ms`);
  assert.equal(plan[0].kind, 0, `bitmap first at ${age}ms`);
  for (const draw of plan) {
    assert.equal(draw.bounds.length, 4);
    assert.ok(draw.bounds.every(Number.isFinite));
  }
}
assert.equal(drawPlan(12000, {}).length, 1, 'episode expires at exact endpoint');
assert.equal(drawPlan(500, { active: false }).length, 1, 'active off retains bitmap only');
assert.equal(drawPlan(500, { bitmapOnly: true }).length, 1, 'bitmap-only retains base pass');
assert.equal(drawPlan(1200, {}).filter(draw => draw.kind === 3).length, stateAt(1200).plumes.length);
assert.equal(drawPlan(3400, {}).filter(draw => draw.kind === 4).length, stateAt(3400).purges.length);
assert.ok(supportRects().some(rect => rect.id === 'purge'));

class FakeAudioContext {
  static created = 0;
  constructor() { FakeAudioContext.created++; this.state = 'running'; this.destination = {}; this.sources = []; }
  resume() { return Promise.resolve(); }
  decodeAudioData(encoded) {
    const kind = ['vent', 'steam', 'purge'][new Uint8Array(encoded)[0]];
    return Promise.resolve({ length: Math.round(SCORE[kind].duration * 48000), numberOfChannels: 1, sampleRate: 48000 });
  }
  createBufferSource() {
    const source = { connect(target) { return target; }, start() { source.started = true; }, stop() {}, disconnect() {}, onended: null };
    this.sources.push(source);
    return source;
  }
  createGain() { return { gain: {}, connect() { return this; }, disconnect() {} }; }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
globalThis.AudioContext = FakeAudioContext;
const originalFetch = globalThis.fetch;
globalThis.fetch = async url => {
  const kind = Object.entries({ vent: 'cafeteria-vent-r1.wav', steam: 'cafeteria-steam-r1.wav', purge: 'cafeteria-purge-r1.wav' })
    .find(([, file]) => String(url).includes(file))?.[0];
  assert.ok(kind, `known score request ${url}`);
  return { ok: true, arrayBuffer: async () => { const bytes = new Uint8Array(44); bytes[0] = ['vent', 'steam', 'purge'].indexOf(kind); return bytes.buffer; } };
};

let clock = { cycle: 0, ageMs: 0 };
const muted = new RoomSfx({ verify: true, clock: () => clock });
await muted.activateFromGesture();
assert.equal(FakeAudioContext.created, 0, 'verify never constructs AudioContext');
assert.equal(muted.snapshot().audioGain, 0);
await muted.dispose();

const sfx = new RoomSfx({ clock: () => clock });
await sfx.activateFromGesture();
sfx.update(0, 0, { active: true, visible: true });
assert.deepEqual(sfx.snapshot().playedCauseIds, ['0:room-entry']);
sfx.update(0, 600, { active: true, visible: true });
assert.deepEqual(sfx.snapshot().playedCauseIds, ['0:room-entry', '0:hot-food']);
sfx.update(0, 600, { active: true, visible: true });
assert.equal(sfx.snapshot().playedCauseIds.length, 2, 'same cue does not replay');
sfx.update(0, 2900, { active: false, visible: true });
sfx.update(0, 3000, { active: true, visible: true });
assert.ok(!sfx.snapshot().playedCauseIds.includes('0:purge-0'), 'inactive interval advances cutoff');
sfx.update(1, 0, { active: true, visible: true });
assert.deepEqual(sfx.snapshot().playedCauseIds, ['1:room-entry'], 'cycle resets cue dedupe');
await sfx.dispose();
assert.equal(sfx.snapshot().audioState, 'not-created', 'dispose closes owned context');

globalThis.fetch = originalFetch;
console.log(JSON.stringify({ ok: true, cases: { viewports: views.length, dpr: 2, drawTimes: 16, verifyMuted: true, cueDedupe: true, inactiveCutoff: true, loopReset: true }, bitmapSha256: ROOM.bitmapHash, cues: CUES.length }));
