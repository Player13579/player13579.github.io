import assert from 'node:assert/strict';
import { sampleBarrier, EVENTS } from './barrier-pro-model.mjs';

function s(event, tMs, H, bg, uv = { x: 0.5, y: 0.5 }) {
  return sampleBarrier({ event, tMs, receiverHeightPx: H, background: bg, uv });
}
function maxMetric(event, tMs, H, bg, metricFn, x0 = 0, x1 = 1, y0 = 0, y1 = 1, step = 0.04) {
  let best = -Infinity;
  for (let y = y0; y <= y1 + 1e-9; y += step) {
    for (let x = x0; x <= x1 + 1e-9; x += step) {
      best = Math.max(best, metricFn(s(event, tMs, H, bg, { x, y })));
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
const contourCreate = maxMetric('create', 300, 64, 'dark', q => q.alpha, 0.12, 0.88, 0.04, 0.96);
assert(contourCreate > centerCreate + 0.08, 'create contour stronger than center');

const absorbRight = maxMetric('absorb', 175, 64, 'dark', q => q.radiance[1], 0.55, 0.95, 0.18, 0.70);
const absorbLeft = maxMetric('absorb', 175, 64, 'dark', q => q.radiance[1], 0.05, 0.45, 0.18, 0.70);
assert(absorbRight > absorbLeft + 0.06, 'absorb impact stronger on action side');

const fractureCrack = maxMetric('fracture', 240, 64, 'dark', q => q.diagnostics.crack, 0.28, 0.72, 0.18, 0.82);
const bustCenter = maxMetric('bust', 240, 64, 'dark', q => q.diagnostics.bustCenter, 0.35, 0.65, 0.20, 0.80);
assert(fractureCrack > 0.7, 'fracture has clear crack state');
assert(bustCenter > 0.2, 'bust has clear deauthorization center state');

console.log('barrier-pro-tests: PASS');
