import assert from 'node:assert/strict';
import test from 'node:test';

import { BASE_SETTINGS, DEFAULT_SETTINGS, constructRepeat, sharedViewBox } from '../labs/curve-repeat-geometry.mjs';

function simpson(fn, a, b, tolerance = 2e-14, depth = 22) {
  const m = (a + b) / 2;
  const fa = fn(a), fm = fn(m), fb = fn(b);
  const whole = (b - a) * (fa + 4 * fm + fb) / 6;
  function recur(left, right, f0, fmid, f1, estimate, tol, remaining) {
    const mid = (left + right) / 2;
    const lm = (left + mid) / 2, rm = (mid + right) / 2;
    const flm = fn(lm), frm = fn(rm);
    const l = (mid - left) * (f0 + 4 * flm + fmid) / 6;
    const r = (right - mid) * (fmid + 4 * frm + f1) / 6;
    const delta = l + r - estimate;
    if (remaining <= 0 || Math.abs(delta) <= 15 * tol) return l + r + delta / 15;
    return recur(left, mid, f0, flm, fmid, l, tol / 2, remaining - 1)
      + recur(mid, right, fmid, frm, f1, r, tol / 2, remaining - 1);
  }
  return recur(a, b, fa, fm, fb, whole, tolerance, depth);
}

function exactArc(t, rise) {
  return simpson((u) => Math.hypot(6, 4 * rise * (1 - 2 * u)), 0, t);
}

function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

test('default settings and endpoint/mark counts match the contract', () => {
  assert.deepEqual(DEFAULT_SETTINGS, { spacing: 'arc', orientation: 'tangent', rise: 2, count: 12, angle: 0 });
  assert.deepEqual(BASE_SETTINGS, { spacing: 'parameter', orientation: 'tangent', rise: 2, count: 12, angle: 0 });
  const model = constructRepeat({ ...DEFAULT_SETTINGS });
  assert.equal(model.marks.length, 12);
  assert.deepEqual(model.curve.controlPoints, [[0, 0], [3, 4], [6, 0]]);
  assert.deepEqual(model.marks[0].point, [0, 0]);
  assert.deepEqual(model.marks.at(-1).point, [6, 0]);
  assert.equal(model.pathPoints.length, 129);
  assert.equal(model.arcIntervals.length, 11);
  assert.equal(model.chordIntervals.length, 11);
  assert.equal(model.bounds.curveInterpolation, 2 / 128 ** 2);
});

test('straight curve has exact uniform parameter and arc positions', () => {
  const model = constructRepeat({ ...DEFAULT_SETTINGS, rise: 0, count: 7 });
  assert.equal(model.curve.length, 6);
  assert.equal(model.metrics.arcIntervalRange, 0);
  for (let i = 0; i < 7; i += 1) {
    assert.equal(model.marks[i].t, i / 6);
    assert.equal(model.marks[i].s, i);
    assert.equal(model.marks[i].point[0], i);
    assert.equal(model.marks[i].point[1], 0);
    assert.equal(model.marks[i].tangentAngle, 0);
  }
});

test('arc endpoints remain exact across the allowed rise range', () => {
  const h = -3;
  const count = 16;
  const regression = constructRepeat({ ...DEFAULT_SETTINGS, rise: h, count });
  assert.notEqual(regression.curve.length * (count - 1) / (count - 1), regression.curve.length);
  assert.equal(regression.marks[0].t, 0);
  assert.equal(regression.marks[0].s, 0);
  assert.equal(regression.marks.at(-1).t, 1);
  assert.equal(regression.marks.at(-1).s, regression.curve.length);

  for (let i = 0; i < 5000; i += 1) {
    const magnitude = 0.05 + 2.95 * i / 4999;
    const rise = i % 2 === 0 ? magnitude : -magnitude;
    const sampleCount = 3 + (i % 30);
    const model = constructRepeat({ ...DEFAULT_SETTINGS, rise, count: sampleCount });
    assert.equal(model.marks[0].t, 0);
    assert.equal(model.marks[0].s, 0);
    assert.equal(model.marks.at(-1).t, 1);
    assert.equal(model.marks.at(-1).s, model.curve.length);
  }
});

test('parameter and arc spacing preserve the same curve/count but differ in intervals', () => {
  const arc = constructRepeat({ ...DEFAULT_SETTINGS, spacing: 'arc', count: 11 });
  const parameter = constructRepeat({ ...DEFAULT_SETTINGS, spacing: 'parameter', count: 11 });
  assert.deepEqual(arc.curve, parameter.curve);
  assert.deepEqual(arc.pathPoints, parameter.pathPoints);
  assert.equal(arc.marks.length, parameter.marks.length);
  assert.ok(arc.marks.some((mark, i) => Math.abs(mark.t - parameter.marks[i].t) > 1e-3));
  assert.ok(parameter.metrics.arcIntervalRange > arc.metrics.arcIntervalRange);
  assert.ok(arc.metrics.arcIntervalRange < 1e-11);
  assert.equal(arc.metrics.maxAbsArcResidual, Math.max(...arc.marks.map((mark) => Math.abs(mark.arcResidual))));
  assert.equal(parameter.metrics.maxAbsArcResidual, null);
  assert.ok(parameter.marks.every((mark) => mark.arcResidual === null && mark.bracketWidth === null));
});

test('arc integral agrees with independent quadrature and inversion brackets narrow', () => {
  for (const rise of [-2.5, -0.5, 0.75, 3]) {
    const model = constructRepeat({ ...DEFAULT_SETTINGS, rise, count: 13 });
    const independentlyIntegrated = exactArc(1, rise);
    assert.ok(Math.abs(model.curve.length - independentlyIntegrated) < 2e-13);
    for (const mark of model.marks) {
      const expected = exactArc(mark.t, rise);
      assert.ok(Math.abs(mark.s - expected) < 2e-12);
      assert.ok(mark.bracketWidth <= 1 / 2 ** 48 + Number.EPSILON);
      assert.ok(Math.abs(mark.arcResidual) < 2e-12);
    }
  }
});

test('mark count and orientation changes leave curve coordinates fixed', () => {
  const tangent = constructRepeat({ ...DEFAULT_SETTINGS, count: 17, orientation: 'tangent', angle: 0 });
  const fixed = constructRepeat({ ...DEFAULT_SETTINGS, count: 17, orientation: 'fixed', angle: 0 });
  const tilted = constructRepeat({ ...DEFAULT_SETTINGS, count: 17, orientation: 'fixed', angle: 45 });
  const fewer = constructRepeat({ ...DEFAULT_SETTINGS, count: 9, orientation: 'fixed', angle: 45 });
  assert.deepEqual(tangent.pathPoints, fixed.pathPoints);
  assert.deepEqual(fixed.pathPoints, tilted.pathPoints);
  assert.deepEqual(tilted.curve, fewer.curve);
  assert.equal(tangent.marks.length, 17);
  assert.equal(fewer.marks.length, 9);
  for (let i = 0; i < 17; i += 1) {
    assert.deepEqual(tangent.marks[i].point, fixed.marks[i].point);
    assert.deepEqual(fixed.marks[i].point, tilted.marks[i].point);
    assert.equal(fixed.marks[i].orientationAngle, 0);
    assert.equal(tilted.marks[i].orientationAngle, Math.PI / 4);
  }
});

test('tangent and fixed glyphs are rigid rotations about unchanged mark centers', () => {
  const tangent = constructRepeat({ ...DEFAULT_SETTINGS, count: 12, orientation: 'tangent', angle: 13 });
  const fixed = constructRepeat({ ...DEFAULT_SETTINGS, count: 12, orientation: 'fixed', angle: 13 });
  for (let i = 0; i < tangent.marks.length; i += 1) {
    const a = tangent.marks[i], b = fixed.marks[i];
    assert.deepEqual(a.point, b.point);
    assert.equal(a.orientationAngle, a.tangentAngle + 13 * Math.PI / 180);
    assert.equal(b.orientationAngle, 13 * Math.PI / 180);
    const centerA = a.polygon.reduce((sum, p) => [sum[0] + p[0] / 4, sum[1] + p[1] / 4], [0, 0]);
    const centerB = b.polygon.reduce((sum, p) => [sum[0] + p[0] / 4, sum[1] + p[1] / 4], [0, 0]);
    assert.ok(dist(centerA, a.point) < 2e-15);
    assert.ok(dist(centerB, b.point) < 2e-15);
    const lengthsA = a.polygon.map((p, j) => dist(p, a.polygon[(j + 1) % 4]));
    const lengthsB = b.polygon.map((p, j) => dist(p, b.polygon[(j + 1) % 4]));
    for (let j = 0; j < 4; j += 1) assert.ok(Math.abs(lengthsA[j] - lengthsB[j]) < 2e-15);
  }
});

test('parameter marks are monotone and chord intervals differ from arc intervals', () => {
  const model = constructRepeat({ ...BASE_SETTINGS, count: 15, rise: -2.4 });
  assert.equal(model.marks[0].t, 0);
  assert.equal(model.marks.at(-1).t, 1);
  for (let i = 1; i < model.marks.length; i += 1) {
    assert.ok(model.marks[i].t > model.marks[i - 1].t);
    assert.ok(model.marks[i].s > model.marks[i - 1].s);
  }
  assert.ok(model.arcIntervals.every((value) => value > 0));
  assert.ok(model.chordIntervals.every((value) => value > 0));
  assert.ok(model.arcIntervals.some((value, i) => Math.abs(value - model.chordIntervals[i]) > 1e-5));
});

test('vertical mirroring preserves lengths and negates y and tangent angles', () => {
  const positive = constructRepeat({ ...DEFAULT_SETTINGS, rise: 2.25 });
  const negative = constructRepeat({ ...DEFAULT_SETTINGS, rise: -2.25 });
  assert.equal(positive.curve.length, negative.curve.length);
  for (let i = 0; i < 129; i += 1) {
    assert.equal(positive.pathPoints[i][0], negative.pathPoints[i][0]);
    assert.equal(positive.pathPoints[i][1], -negative.pathPoints[i][1]);
  }
  for (let i = 0; i < positive.marks.length; i += 1) {
    assert.ok(Math.abs(positive.marks[i].tangentAngle + negative.marks[i].tangentAngle) < 1e-14);
    assert.ok(Math.abs(positive.marks[i].s - negative.marks[i].s) < 1e-14);
  }
});

test('invalid settings reject without coercion or mutation', () => {
  const valid = { ...DEFAULT_SETTINGS };
  const cases = [
    null, [], { ...valid, extra: 1 }, { ...valid, spacing: 'distance' },
    { ...valid, orientation: 'normal' }, { ...valid, rise: 0.01 },
    { ...valid, rise: 3.01 }, { ...valid, rise: NaN }, { ...valid, count: 2 },
    { ...valid, count: 32.5 }, { ...valid, count: 33 }, { ...valid, angle: 91 },
    { ...valid, angle: Infinity }, { ...valid, [Symbol('extra')]: 1 },
  ];
  for (const settings of cases) assert.throws(() => constructRepeat(settings));
  const hidden = { ...valid };
  Object.defineProperty(hidden, 'hidden', { value: true, enumerable: false });
  assert.throws(() => constructRepeat(hidden));
  assert.throws(() => constructRepeat(Object.assign(Object.create({ inherited: 1 }), valid)));
  const settings = { ...DEFAULT_SETTINGS };
  const before = { ...settings };
  const output = constructRepeat(settings);
  assert.deepEqual(settings, before);
  assert.deepEqual(output.settings, before);
  assert.notEqual(output.settings, settings);
});

test('shared view box includes path and every oriented glyph polygon in y-down coordinates', () => {
  const a = constructRepeat({ ...DEFAULT_SETTINGS, rise: 2, count: 12 });
  const b = constructRepeat({ ...BASE_SETTINGS, rise: -3, count: 20, angle: -45 });
  const box = sharedViewBox([a, b]);
  assert.equal(box.width, box.height);
  for (const model of [a, b]) {
    for (const point of [...model.pathPoints, ...model.marks.flatMap((mark) => mark.polygon)]) {
      assert.ok(point[0] >= box.x - 1e-12 && point[0] <= box.x + box.width + 1e-12);
      assert.ok(-point[1] >= box.y - 1e-12 && -point[1] <= box.y + box.height + 1e-12);
    }
  }
  assert.ok(box.width >= 1.2);
  assert.throws(() => sharedViewBox([]));
  assert.throws(() => sharedViewBox([{ pathPoints: [], marks: [] }]));
});
