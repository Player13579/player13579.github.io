import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASE_SETTINGS,
  DEFAULT_SETTINGS,
  constructBand,
  deriveCurve,
  sharedViewBox,
} from '../labs/band-geometry.mjs';

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

function angleAt(curve, t) {
  const a = curve.length * curve.kappaStart;
  const b = curve.length * curve.kappaEnd;
  return a * t + (b - a) * t * t / 2;
}

function exactCenter(curve, t) {
  const a = curve.length * curve.kappaStart;
  const b = curve.length * curve.kappaEnd;
  const d = b - a;
  const theta = (u) => a * u + d * u * u / 2;
  return [
    curve.length * simpson((u) => Math.cos(theta(u)), 0, t),
    curve.length * simpson((u) => Math.sin(theta(u)), 0, t),
  ];
}

function hAt(t, widthStart, widthEnd) {
  if (t === 0) return widthStart / 2;
  if (t === 1) return widthEnd / 2;
  const g = t * t * (3 - 2 * t);
  return widthStart / 2 * (1 - g) + widthEnd / 2 * g;
}

function interpolate(points, t) {
  const steps = points.length - 1;
  const coordinate = t * steps;
  const i = Math.min(Math.floor(coordinate), steps - 1);
  const f = coordinate - i;
  return [0, 1].map((axis) => (1 - f) * points[i][axis] + f * points[i + 1][axis]);
}

function pointDistance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

test('settings constants have the contracted values and derive selected profiles', () => {
  assert.deepEqual(DEFAULT_SETTINGS, { profile: 'tighten', strength: 60, flip: false, widthStart: 1.2, widthEnd: 0 });
  assert.deepEqual(BASE_SETTINGS, { profile: 'uniform', strength: 60, flip: false, widthStart: 1.2, widthEnd: 1.2 });
  const uniform = deriveCurve({ ...BASE_SETTINGS });
  const tighten = deriveCurve({ ...DEFAULT_SETTINGS });
  const relax = deriveCurve({ profile: 'relax', strength: 60, flip: false, widthStart: 1.2, widthEnd: 0 });
  const s = deriveCurve({ profile: 's', strength: 60, flip: false, widthStart: 1.2, widthEnd: 0 });
  const alpha = 0.6 * (8 * Math.PI / 9);
  assert.equal(uniform.length, 6);
  assert.equal(uniform.kappaStart, alpha / 6);
  assert.equal(uniform.kappaEnd, alpha / 6);
  assert.equal(tighten.kappaStart, 0);
  assert.equal(tighten.kappaEnd, 2 * alpha / 6);
  assert.equal(relax.kappaStart, 2 * alpha / 6);
  assert.equal(relax.kappaEnd, 0);
  assert.equal(s.kappaStart, -2 * alpha / 6);
  assert.equal(s.kappaEnd, 2 * alpha / 6);
  for (const profile of [uniform, tighten, relax]) {
    assert.ok(Math.abs(profile.length * (profile.kappaStart + profile.kappaEnd) / 2 - alpha) < 1e-14);
  }
  const mirrored = deriveCurve({ ...BASE_SETTINGS, flip: true });
  assert.equal(mirrored.kappaStart, -uniform.kappaStart);
  assert.equal(mirrored.kappaEnd, -uniform.kappaEnd);
});

test('straight constant-width band is exact rectangle with one interval', () => {
  const model = constructBand({ ...BASE_SETTINGS, profile: 'uniform', strength: 0 });
  assert.equal(model.steps, 1);
  assert.deepEqual(model.points, [[0, 0], [6, 0]]);
  assert.deepEqual(model.leftPoints, [[0, 0.6], [6, 0.6]]);
  assert.deepEqual(model.rightPoints, [[0, -0.6], [6, -0.6]]);
  assert.deepEqual(model.bounds, {
    quadrature: 0,
    interpolation: 0,
    position: 0,
    scope: model.bounds.scope,
  });
  assert.equal(model.globalOverlap, 'not_checked');
  assert.deepEqual(model.caps, { start: 'butt', end: 'butt' });
});

test('straight taper uses width-driven subdivision and cubic profile at off-grid points', () => {
  const settings = { ...DEFAULT_SETTINGS, profile: 'uniform', strength: 0, widthStart: 0, widthEnd: 1.2 };
  const model = constructBand(settings, { maxError: 1e-4 });
  assert.ok(model.steps > 1);
  assert.equal(model.caps.start, 'point');
  assert.equal(model.caps.end, 'butt');
  assert.deepEqual(model.points[0], [0, 0]);
  assert.deepEqual(model.points.at(-1), [6, 0]);
  for (const t of [0, 0.137, 0.491, 0.773, 0.999, 1]) {
    const h = hAt(t, 0, 1.2);
    const expectedLeft = [6 * t, h];
    const expectedRight = [6 * t, -h];
    assert.ok(pointDistance(interpolate(model.leftPoints, t), expectedLeft) <= model.bounds.position + 1e-12);
    assert.ok(pointDistance(interpolate(model.rightPoints, t), expectedRight) <= model.bounds.position + 1e-12);
  }
  assert.equal(model.widths[0], 0);
  assert.equal(model.widths.at(-1), 1.2);
});

test('curved constant-turn source follows analytic concentric circle offsets', () => {
  const settings = { ...BASE_SETTINGS, widthStart: 0.4, widthEnd: 0.4 };
  const model = constructBand(settings, { maxError: 1e-5 });
  const curve = deriveCurve(settings);
  const k = curve.kappaStart;
  const radius = 1 / k;
  const h = 0.2;
  for (const t of [0.123, 0.387, 0.741, 0.963]) {
    const theta = k * curve.length * t;
    const leftRadius = radius - h;
    const rightRadius = radius + h;
    const centerX = radius * Math.sin(theta);
    const centerY = radius * (1 - Math.cos(theta));
    const exactLeft = [centerX - h * Math.sin(theta), centerY + h * Math.cos(theta)];
    const exactRight = [centerX + h * Math.sin(theta), centerY - h * Math.cos(theta)];
    const circleLeft = [leftRadius * Math.sin(theta), radius - leftRadius * Math.cos(theta)];
    const circleRight = [rightRadius * Math.sin(theta), radius - rightRadius * Math.cos(theta)];
    assert.ok(pointDistance(exactLeft, circleLeft) < 1e-14);
    assert.ok(pointDistance(exactRight, circleRight) < 1e-14);
    assert.ok(pointDistance(interpolate(model.leftPoints, t), circleLeft) <= model.bounds.position + 3e-12);
    assert.ok(pointDistance(interpolate(model.rightPoints, t), circleRight) <= model.bounds.position + 3e-12);
  }
  assert.ok(model.bounds.position <= 1e-5);
});

test('signed, mirrored, and S-curved profiles have independent off-grid bounds', () => {
  const cases = [
    { profile: 'tighten', flip: false },
    { profile: 'relax', flip: true },
    { profile: 's', flip: false },
    { profile: 's', flip: true },
  ];
  for (const change of cases) {
    const settings = { ...DEFAULT_SETTINGS, ...change, strength: 48, widthStart: 0.3, widthEnd: 0.9 };
    const model = constructBand(settings, { maxError: 2e-4 });
    const curve = deriveCurve(settings);
    for (let i = 0; i <= model.steps; i += 1) {
      const theta = angleAt(curve, i / model.steps);
      const dx = model.leftPoints[i][0] - model.rightPoints[i][0];
      const dy = model.leftPoints[i][1] - model.rightPoints[i][1];
      assert.ok(Math.abs(Math.hypot(dx, dy) - model.widths[i]) < 2e-14);
      assert.ok(Math.abs(dx * Math.cos(theta) + dy * Math.sin(theta)) < 2e-14);
    }
    for (const t of [0.101, 0.317, 0.623, 0.887]) {
      const [x, y] = exactCenter(curve, t);
      const theta = angleAt(curve, t);
      const h = hAt(t, settings.widthStart, settings.widthEnd);
      const nx = -Math.sin(theta), ny = Math.cos(theta);
      const expectedLeft = [x + h * nx, y + h * ny];
      const expectedRight = [x - h * nx, y - h * ny];
      assert.ok(pointDistance(interpolate(model.leftPoints, t), expectedLeft) <= model.bounds.position + 8e-12);
      assert.ok(pointDistance(interpolate(model.rightPoints, t), expectedRight) <= model.bounds.position + 8e-12);
    }
  }
});

test('tighter tolerance refines both straight and curved changing-width branches', () => {
  for (const settings of [
    { ...DEFAULT_SETTINGS, profile: 'uniform', strength: 0, widthStart: 0, widthEnd: 1.2 },
    { ...DEFAULT_SETTINGS, profile: 's', strength: 38, widthStart: 0.2, widthEnd: 0.8 },
  ]) {
    const loose = constructBand(settings, { maxError: 1e-3 });
    const tight = constructBand(settings, { maxError: 1e-5 });
    assert.ok(loose.bounds.position <= 1e-3);
    assert.ok(tight.bounds.position <= 1e-5);
    assert.ok(tight.steps >= loose.steps);
  }
});

test('validation rejects malformed settings, invalid options, and budget overrun', () => {
  const valid = { ...BASE_SETTINGS };
  const badSettings = [
    null,
    [],
    { ...valid, extra: 1 },
    { ...valid, strength: true },
    { ...valid, strength: 0.001 },
    { ...valid, strength: 101 },
    { ...valid, profile: 'unknown' },
    { ...valid, flip: 0 },
    { ...valid, widthStart: 0.01 },
    { ...valid, widthEnd: 1.61 },
    { ...valid, widthStart: 0, widthEnd: 0 },
    { ...valid, widthStart: NaN },
  ];
  for (const settings of badSettings) assert.throws(() => deriveCurve(settings));
  assert.throws(() => deriveCurve(Object.assign(Object.create({ inherited: 1 }), valid)));
  assert.throws(() => constructBand(valid, { maxError: 1e-9 }));
  assert.throws(() => constructBand(valid, { maxError: 0.02 }));
  assert.throws(() => constructBand(valid, { maxSteps: 0 }));
  assert.throws(() => constructBand(valid, { maxSteps: 4096.5 }));
  assert.throws(() => constructBand(valid, { unknown: true }));
  assert.throws(() => constructBand({ ...valid, strength: 100 }, { maxError: 1e-8, maxSteps: 1 }));
});

test('sharedViewBox covers all transformed polygons in one square box with margins', () => {
  const a = constructBand({ ...BASE_SETTINGS, strength: 0, widthStart: 0.2, widthEnd: 0.5 });
  const b = constructBand({ ...DEFAULT_SETTINGS, strength: 85, widthStart: 0.8, widthEnd: 0.1 });
  const box = sharedViewBox([a, b]);
  assert.equal(box.width, box.height);
  const half = box.width / 2;
  for (const model of [a, b]) {
    for (const [x, y] of model.polygon) {
      assert.ok(x >= box.x - 1e-14 && x <= box.x + box.width + 1e-14);
      assert.ok(-y >= box.y - 1e-14 && -y <= box.y + box.height + 1e-14);
    }
  }
  assert.ok(box.width >= 1.2);
  assert.throws(() => sharedViewBox([]));
  assert.throws(() => sharedViewBox([{ polygon: [[0, 0], [Infinity, 1], [1, 1]] }]));
});
