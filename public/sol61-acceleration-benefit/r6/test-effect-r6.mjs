import assert from 'node:assert/strict';
import {
  DURATION_MS,
  OPTICAL_MODEL,
  SOURCE_ANCHOR_FRACTIONS,
  SOURCE_COUNT,
  SOURCE_LIVES,
  SOURCE_STARTS,
  VERSION,
  WGSL,
  inspectTransport,
  packetFrame,
  sampleTimeline,
  sourceState
} from './effect.mjs';

const close = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
assert.equal(VERSION, 'acceleration-benefit-zero-sol61-r6');
assert.equal(DURATION_MS, 1000);
assert.equal(SOURCE_COUNT, 32);
assert.equal(SOURCE_STARTS.length, SOURCE_COUNT);
assert.equal(SOURCE_LIVES.length, SOURCE_COUNT);
assert.deepEqual(SOURCE_ANCHOR_FRACTIONS, [-.45, -.10, .25, .60]);

const packetStarts = [.04, .30, .56];
const packetLives = [.38, .32, .26];
for (let i = 0; i < 24; i += 1) {
  const carrier = Math.floor(i / 4);
  const packet = Math.floor(carrier / 2);
  const anchor = i % 4;
  close(SOURCE_STARTS[i], packetStarts[packet] + packetLives[packet] * (.12 + .13 * anchor));
  close(SOURCE_LIVES[i], .12 + (.04 / 3) * anchor);
}
for (let k = 0; k < 8; k += 1) {
  close(SOURCE_STARTS[24 + k], .60 + .035 * k);
  close(SOURCE_LIVES[24 + k], .12 + .01 * (k % 4));
  close(sourceState(24 + k, SOURCE_STARTS[24 + k] * 1000 + SOURCE_LIVES[24 + k] * 500).receiverRimY, -.18 + .46 * k / 7);
}

assert.equal(OPTICAL_MODEL.axisDegrees, 17.5);
assert.equal(OPTICAL_MODEL.crossWidthH, .0018);
assert.equal(OPTICAL_MODEL.rayDecayH, .018);
assert.equal(OPTICAL_MODEL.sourceRadiusH, .0024);
assert.ok(OPTICAL_MODEL.crossWidthH < .0036);
assert.ok(OPTICAL_MODEL.rayDecayH < .049);
assert.ok(OPTICAL_MODEL.sourceRadiusH < .0045);
assert.match(WGSL, /footprint\*footprint\/12\./);
assert.match(WGSL, /for\(var i=0u;i<32u;i\+\+\)/);
assert.match(WGSL, /if\(carrierGate<=0\.\) \{return 0\.\;\}/);

let peakSimultaneous = 0;
for (let ms = 0; ms < DURATION_MS; ms += 1) {
  const frame = inspectTransport(ms);
  assert.equal(frame.sources.length, 32);
  const simultaneous = frame.sources.filter(flux => flux > 0).length;
  peakSimultaneous = Math.max(peakSimultaneous, simultaneous);
}
assert.ok(peakSimultaneous >= 5, `expected at least 5 overlapping sources, got ${peakSimultaneous}`);

for (let i = 0; i < SOURCE_COUNT; i += 1) {
  const startMs = SOURCE_STARTS[i] * 1000;
  const lifeMs = SOURCE_LIVES[i] * 1000;
  assert.equal(sourceState(i, startMs - 1).flux, 0, `source ${i} is inactive before its episode`);
  assert.equal(sourceState(i, startMs + lifeMs + 1).flux, 0, `source ${i} is inactive after its episode`);
  assert.equal(sourceState(i, -1).flux, 0, `source ${i} is inactive before the timeline`);
  assert.equal(sourceState(i, DURATION_MS).flux, 0, `source ${i} is inactive after the timeline`);
}

let movingCarrierAnchors = 0;
for (let i = 0; i < 24; i += 1) {
  const midMs = (SOURCE_STARTS[i] + SOURCE_LIVES[i] * .5) * 1000;
  const a = sourceState(i, midMs);
  const b = sourceState(i, midMs + 20);
  assert.ok(a.packetGate > 0 && a.flux > 0, `source ${i} must be visible within its packet support`);
  assert.equal(a.attached, true);
  assert.equal(b.attached, true);
  const packetA = packetFrame(a.packetIndex, midMs, { side: a.side });
  const packetB = packetFrame(b.packetIndex, midMs + 20, { side: b.side });
  for (const [state, packet] of [[a, packetA], [b, packetB]]) {
    const dx = state.position[0] - state.packetCenter[0];
    const dy = state.position[1] - state.packetCenter[1];
    close((dx * packet.tangent[0] + dy * packet.tangent[1]) / packet.halfLength, state.alongFraction);
    close((dx * packet.normal[0] + dy * packet.normal[1]) / packet.halfWidth, state.normalFraction);
  }
  if (Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1]) > .001) movingCarrierAnchors += 1;
}
assert.ok(movingCarrierAnchors >= 20, `expected carrier-attached positions to move, got ${movingCarrierAnchors}`);

let inactivePacketGateFound = false;
for (let i = 0; i < 24; i += 1) {
  for (let ms = Math.ceil(SOURCE_STARTS[i] * 1000); ms < DURATION_MS; ms += 1) {
    const state = sourceState(i, ms);
    if (state.packetGate === 0) {
      inactivePacketGateFound = true;
      assert.equal(state.flux, 0, `source ${i} must stop when its carrier packet leaves support`);
      break;
    }
  }
}
assert.ok(inactivePacketGateFound, 'at least one carrier sparkle episode must be clipped by its packet support');

console.log(JSON.stringify({
  status: 'passed',
  sourceCount: SOURCE_COUNT,
  attachedCarrierSources: 24,
  receiverRimSources: 8,
  peakSimultaneous,
  movingCarrierAnchors,
  opticalModel: OPTICAL_MODEL
}, null, 2));
