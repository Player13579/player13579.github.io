import assert from 'node:assert/strict';
import { sampleBarrier, EVENTS } from './barrier-pro-model.mjs';

function probe(event, tMs, bg, H, uv = { x: 0.5, y: 0.5 }) {
  return sampleBarrier({ event, tMs, background: bg, receiverHeightPx: H, uv });
}

for (const [event, meta] of Object.entries(EVENTS)) {
  const s = probe(event, meta.durationMs * 0.5, 'dark', 64);
  assert(Number.isFinite(s.alpha), `${event} alpha finite`);
  assert(s.composed.every(Number.isFinite), `${event} composed finite`);
  assert(s.radiance.every(Number.isFinite), `${event} radiance finite`);
}

// Main readability probes at representative times.
const centerCreateDark = probe('create', 300, 'dark', 64);
const centerAbsorbDark = probe('absorb', 175, 'dark', 64);
const centerCreateLight = probe('create', 300, 'light', 64);
assert.equal(centerCreateDark.diagnostics.receiverAirspaceFilled, false, 'create dark center airspace open');
assert.equal(centerAbsorbDark.diagnostics.receiverAirspaceFilled, false, 'absorb dark center airspace open');
assert.equal(centerCreateLight.diagnostics.receiverAirspaceFilled, false, 'create light center airspace open');
assert(centerCreateDark.alpha < 0.24, 'create dark center alpha low enough');
assert(centerAbsorbDark.alpha < 0.26, 'absorb dark center alpha low enough');

// Action points differ.
const rightImpact = probe('absorb', 175, 'dark', 64, { x: 0.74, y: 0.48 });
const centerImpact = probe('absorb', 175, 'dark', 64);
assert(rightImpact.radiance[1] > centerImpact.radiance[1], 'absorb impact source stronger at action point');

const crackProbe = probe('fracture', 240, 'dark', 64, { x: 0.52, y: 0.52 });
const bustProbe = probe('bust', 240, 'dark', 64, { x: 0.52, y: 0.52 });
assert(crackProbe.alpha !== bustProbe.alpha, 'fracture and bust differ');

console.log('barrier-pro-tests: PASS');
