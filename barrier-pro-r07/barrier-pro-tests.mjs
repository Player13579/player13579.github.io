import assert from 'node:assert/strict';
import { sampleBarrier, EVENTS } from './barrier-pro-model.mjs';

function s(event, tMs, H, bg, uv = { x: 0.5, y: 0.5 }) {
  return sampleBarrier({ event, tMs, receiverHeightPx: H, background: bg, uv });
}
function maxAlphaInRegion(event, tMs, H, bg, x0, x1, y0, y1, step = 0.04) {
  let best = -1;
  for (let y = y0; y <= y1 + 1e-9; y += step) {
    for (let x = x0; x <= x1 + 1e-9; x += step) {
      best = Math.max(best, s(event, tMs, H, bg, { x, y }).alpha);
    }
  }
  return best;
}
function maxGreenRadianceInRegion(event, tMs, H, bg, x0, x1, y0, y1, step = 0.04) {
  let best = -1;
  for (let y = y0; y <= y1 + 1e-9; y += step) {
    for (let x = x0; x <= x1 + 1e-9; x += step) {
      best = Math.max(best, s(event, tMs, H, bg, { x, y }).radiance[1]);
    }
  }
  return best;
}

for (const [event, meta] of Object.entries(EVENTS)) {
  const sample = s(event, meta.durationMs * 0.5, 64, 'dark');
  assert(Number.isFinite(sample.alpha), `${event} alpha finite`);
  assert(sample.composed.every(Number.isFinite), `${event} composed finite`);
  assert(sample.premul.every(Number.isFinite), `${event} premul finite`);
}

for (const bg of ['dark', 'light']) {
  assert.equal(s('create', 300, 64, bg).diagnostics.receiverAirspaceFilled, false, `create H64 ${bg} center open`);
  assert.equal(s('absorb', 175, 64, bg).diagnostics.receiverAirspaceFilled, false, `absorb H64 ${bg} center open`);
}

const centerCreate = s('create', 300, 64, 'dark').alpha;
const contourCreate = maxAlphaInRegion('create', 300, 64, 'dark', 0.20, 0.80, 0.08, 0.92);
assert(contourCreate > centerCreate + 0.05, 'create contour stronger than center');

const absorbRight = maxGreenRadianceInRegion('absorb', 175, 64, 'dark', 0.60, 0.95, 0.30, 0.68);
const absorbLeft = maxGreenRadianceInRegion('absorb', 175, 64, 'dark', 0.05, 0.40, 0.30, 0.68);
assert(absorbRight > absorbLeft + 0.05, 'absorb impact stronger on action side');

const fractureRegion = maxGreenRadianceInRegion('fracture', 240, 64, 'dark', 0.35, 0.70, 0.25, 0.75);
const bustRegion = maxGreenRadianceInRegion('bust', 240, 64, 'dark', 0.35, 0.70, 0.25, 0.75);
assert(Math.abs(fractureRegion - bustRegion) > 0.02, 'fracture and bust diverge');

console.log('barrier-pro-tests: PASS');
