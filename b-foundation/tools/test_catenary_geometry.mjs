import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASE_SETTINGS,
  DEFAULT_SETTINGS,
  constructCatenary,
  evaluateCatenary,
  sharedViewBox,
} from '../labs/catenary-geometry.mjs';

function simpson(fn, a, b, tolerance = 2e-13, depth = 24) {
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

function interpolate(points, x) {
  const stepWidth = points[1][0] - points[0][0];
  const coordinate = x / stepWidth;
  const i = Math.min(Math.floor(coordinate), points.length - 2);
  const f = coordinate - i;
  return [
    (1 - f) * points[i][0] + f * points[i + 1][0],
    (1 - f) * points[i][1] + f * points[i + 1][1],
  ];
}

function close(a, b, tolerance = 1e-10) {
  assert.ok(Math.abs(a - b) <= tolerance, `expected ${a} ≈ ${b}`);
}

test('settings defaults establish positive slack without calling it sag', () => {
  assert.deepEqual(DEFAULT_SETTINGS, { span: 6, height: 0, slack: 0.2 });
  assert.deepEqual(BASE_SETTINGS, { span: 6, height: 0, slack: 0.05 });
  const model = constructCatenary({ ...DEFAULT_SETTINGS });
  close(model.requestedLength, 6 * 1.2, 2e-14);
  assert.ok(model.sag.value > 0);
  assert.equal(model.actualTension, 'not_computed');
});

test('known u recovers the analytic parameter, length and endpoint geometry', () => {
  const D = 6;
  const u = 0.7;
  const a = D / (2 * u);
  const length = 2 * a * Math.sinh(u);
  const settings = { span: D, height: 0, slack: length / D - 1 };
  const model = constructCatenary(settings, { maxError: 1e-5 });
  close(model.source.u, u, 2e-12);
  close(model.source.a, a, 2e-11);
  close(model.source.continuousLength, length, 2e-12);
  close(model.source.lengthResidual, 0, 2e-12);
  assert.deepEqual(model.endpoints, [[0, 0], [D, 0]]);
  assert.deepEqual(model.points[0], [0, 0]);
  assert.deepEqual(model.points.at(-1), [D, 0]);
});

test('endpoints, slope, curvature, convexity and chord relation hold for equal heights', () => {
  const model = constructCatenary({ span: 6, height: 0, slack: 0.2 });
  assert.deepEqual(evaluateCatenary(model, 0).point, [0, 0]);
  assert.deepEqual(evaluateCatenary(model, 6).point, [6, 0]);
  for (let i = 0; i <= 12; i += 1) {
    const x = 6 * i / 12;
    const value = evaluateCatenary(model, x);
    assert.ok(Number.isFinite(value.slope));
    assert.ok(value.curvature > 0);
    if (i > 0) assert.ok(value.slope > evaluateCatenary(model, 6 * (i - 1) / 12).slope);
    assert.ok(value.point[1] <= 0);
    if (i > 0 && i < 12) assert.ok(value.point[1] < 0);
  }
  assert.ok(model.minimum.vertexInSpan);
  close(model.minimum.point[0], 3, 2e-11);
});

test('unequal positive and negative heights meet exact supports and force balance', () => {
  for (const height of [2.5, -2.5]) {
    const model = constructCatenary({ span: 7, height, slack: 0.18 });
    assert.deepEqual(model.endpoints, [[0, 0], [7, height]]);
    assert.deepEqual(evaluateCatenary(model, 0).point, [0, 0]);
    assert.deepEqual(evaluateCatenary(model, 7).point, [7, height]);
    const { a, u, v, continuousLength } = model.source;
    const z0 = v - u, zD = v + u;
    close(a * (Math.sinh(zD) - Math.sinh(z0)), continuousLength, 2e-12);
    let belowLowerSupport = false;
    for (let i = 0; i <= 20; i += 1) {
      const x = 7 * i / 20;
      const y = evaluateCatenary(model, x).point[1];
      assert.ok(y <= Math.max(0, height) + 1e-13);
      assert.ok(y <= height * x / 7 + 1e-13);
      if (x > 0 && x < 7 && y < Math.min(0, height)) belowLowerSupport = true;
    }
    assert.ok(belowLowerSupport);
  }
});

test('vertical reflection plus horizontal reversal maps opposite endpoint heights', () => {
  const positive = constructCatenary({ span: 6, height: 2, slack: 0.2 });
  const negative = constructCatenary({ span: 6, height: -2, slack: 0.2 });
  for (let i = 0; i <= 20; i += 1) {
    const x = 6 * i / 20;
    close(evaluateCatenary(negative, x).point[1], evaluateCatenary(positive, 6 - x).point[1] - 2, 2e-12);
    close(evaluateCatenary(negative, x).slope, -evaluateCatenary(positive, 6 - x).slope, 2e-12);
  }
});

test('minimum reports only the visible interval and handles off-span vertex', () => {
  const model = constructCatenary({ span: 2, height: 3, slack: 0.01 });
  assert.equal(model.minimum.vertexInSpan, model.source.vertexX >= 0 && model.source.vertexX <= 2);
  close(model.minimum.point[0], Math.min(2, Math.max(0, model.source.vertexX)), 0);
  const sampledMinY = Math.min(...model.points.map((point) => point[1]));
  assert.ok(model.minimum.point[1] <= sampledMinY + model.bounds.interpolation + 1e-12);
});

test('chord-relative maximum sag satisfies its stationary slope relation', () => {
  for (const height of [0, 2.5, -2.5]) {
    const model = constructCatenary({ span: 6, height, slack: 0.2 });
    const [x, y] = model.sag.point;
    const chordSlope = height / 6;
    close(evaluateCatenary(model, x).slope, chordSlope, 2e-12);
    close(model.sag.value, chordSlope * x - y, 2e-12);
    assert.ok(x >= 0 && x <= 6);
    assert.ok(model.sag.value >= 0);
  }
});

test('continuous length matches independent arc integral and polyline length stays below it', () => {
  for (const settings of [
    { span: 6, height: 0, slack: 0.2 },
    { span: 7, height: 2.2, slack: 0.3 },
    { span: 4, height: -2.5, slack: 0.12 },
  ]) {
    const model = constructCatenary(settings, { maxError: 1e-5 });
    const integrated = simpson((x) => Math.hypot(1, evaluateCatenary(model, x).slope), 0, settings.span);
    close(integrated, model.source.continuousLength, 2e-10);
    close(model.source.continuousLength, model.requestedLength, 2e-10);
    assert.ok(model.polygonalLength <= model.source.continuousLength + 2e-12);
    assert.ok(model.polygonalLength < model.source.continuousLength);
  }
});

test('uniform-x interpolation probes stay within the reported fitted-curve bound', () => {
  for (const settings of [
    { span: 6, height: 0, slack: 0.2 },
    { span: 7, height: 2.5, slack: 0.3 },
    { span: 4, height: -2.7, slack: 0.45 },
  ]) {
    const model = constructCatenary(settings, { maxError: 2e-5 });
    for (const fraction of [0.037, 0.173, 0.419, 0.701, 0.963]) {
      const x = settings.span * fraction;
      const actual = interpolate(model.points, x);
      const exact = evaluateCatenary(model, x).point;
      assert.ok(Math.hypot(actual[0] - exact[0], actual[1] - exact[1]) <= model.bounds.interpolation + 2e-12);
    }
    assert.ok(model.bounds.interpolation <= 2e-5);
    assert.match(model.bounds.scope, /not a bound to the exact requested-length catenary/);
  }
});

test('tighter tolerance refines sampling and reports separate solve residual', () => {
  const settings = { span: 6, height: 1.5, slack: 0.2 };
  const loose = constructCatenary(settings, { maxError: 1e-3 });
  const tight = constructCatenary(settings, { maxError: 1e-5 });
  assert.ok(tight.steps >= loose.steps);
  assert.ok(loose.bounds.interpolation <= 1e-3);
  assert.ok(tight.bounds.interpolation <= 1e-5);
  assert.ok(Math.abs(tight.source.lengthResidual) <= 1e-11 * Math.max(1, tight.requestedLength));
  assert.ok(Number.isFinite(tight.source.solver.ratioResidual));
  assert.ok(tight.source.solver.iterations <= 80);
});

test('validation rejects wrong settings/options and inadequate step capacity', () => {
  const valid = { span: 6, height: 0, slack: 0.2 };
  const bad = [
    null, [], { ...valid, other: 1 }, { ...valid, span: 1.99 }, { ...valid, span: 10.01 },
    { ...valid, height: -3.01 }, { ...valid, height: NaN }, { ...valid, slack: 0 },
    { ...valid, slack: 0.51 }, { ...valid, span: '6' },
  ];
  for (const settings of bad) assert.throws(() => constructCatenary(settings));
  const hidden = { ...valid };
  Object.defineProperty(hidden, 'extra', { value: 1, enumerable: false });
  assert.throws(() => constructCatenary(hidden));
  assert.throws(() => constructCatenary({ ...valid, [Symbol('x')]: 1 }));
  assert.throws(() => constructCatenary(valid, { maxError: 1e-9 }));
  assert.throws(() => constructCatenary(valid, { maxError: 0.02 }));
  assert.throws(() => constructCatenary(valid, { maxSteps: 0 }));
  assert.throws(() => constructCatenary(valid, { maxSteps: 1.5 }));
  assert.throws(() => constructCatenary(valid, { extra: 1 }));
  assert.throws(() => constructCatenary({ span: 10, height: 3, slack: 0.5 }, { maxError: 1e-8, maxSteps: 1 }));
});

test('shared framing contains all sampled points and exact endpoints in one square box', () => {
  const a = constructCatenary({ span: 6, height: 0, slack: 0.05 });
  const b = constructCatenary({ span: 9, height: -2.7, slack: 0.4 });
  const box = sharedViewBox([a, b]);
  assert.equal(box.width, box.height);
  for (const model of [a, b]) {
    for (const [x, y] of [...model.points, ...model.endpoints]) {
      assert.ok(x >= box.x - 1e-12 && x <= box.x + box.width + 1e-12);
      assert.ok(-y >= box.y - 1e-12 && -y <= box.y + box.height + 1e-12);
    }
  }
  assert.ok(box.width >= 1.2);
  assert.throws(() => sharedViewBox([]));
  assert.throws(() => sharedViewBox([{ points: [], endpoints: [[0, 0], [1, NaN]] }]));
});
