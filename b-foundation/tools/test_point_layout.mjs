import assert from 'node:assert/strict';
import test from 'node:test';

import { BASE_SETTINGS, DEFAULT_SETTINGS, constructLayout } from '../labs/point-layout.mjs';

function independentRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function independentMetrics(points) {
  const nearest = [];
  let minimum = Infinity;
  let pair = null;
  for (let i = 0; i < points.length; i += 1) {
    let local = Infinity;
    for (let j = 0; j < points.length; j += 1) {
      if (i === j) continue;
      const d = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
      if (d < local) local = d;
      if (j > i && d < minimum) {
        minimum = d;
        pair = [i, j];
      }
    }
    nearest.push(local);
  }
  return { nearest, minimum, pair, mean: nearest.reduce((a, b) => a + b, 0) / points.length };
}

test('defaults and revision metadata match the fixed-count contract', () => {
  assert.deepEqual(DEFAULT_SETTINGS, { method: 'best-candidate', count: 64, seed: 1 });
  assert.deepEqual(BASE_SETTINGS, { method: 'uniform', count: 64, seed: 1 });
  const layout = constructLayout({ ...DEFAULT_SETTINGS });
  assert.equal(layout.algorithmRevision, 1);
  assert.equal(layout.points.length, 64);
  assert.equal(layout.selection.method, 'best-candidate');
  assert.equal(layout.selection.candidatesPerPoint, 32);
  assert.equal(layout.selection.prefixStable, true);
  assert.equal(layout.guarantees.minimumDistance, 'measured_not_prescribed');
  assert.equal(layout.guarantees.coverage, 'not_certified');
  assert.equal(layout.guarantees.spectral, 'not_checked');
  assert.equal(layout.guarantees.tileability, 'not_guaranteed');
  assert.equal(layout.guarantees.beauty, 'not_checked');
});

test('seed-one uniform stream starts with the prescribed known point pair', () => {
  const layout = constructLayout({ method: 'uniform', count: 8, seed: 1 });
  assert.deepEqual(layout.points[0], [0.6270739405881613, 0.002735721180215478]);
  assert.deepEqual(layout.points[1], [0.5274470399599522, 0.9810509674716741]);
  assert.deepEqual(layout.points[2], [0.9683778982143849, 0.281103502959013]);
});

test('uniform and best-candidate share their first point and candidate winner is reproducible', () => {
  const uniform = constructLayout({ method: 'uniform', count: 8, seed: 1 });
  const best = constructLayout({ method: 'best-candidate', count: 8, seed: 1 });
  assert.deepEqual(uniform.points[0], best.points[0]);
  assert.deepEqual(best.points[1], [0.2384942057542503, 0.9893774879164994]);

  // Independently replay one stage: consume exactly 32 x/y pairs and retain the earliest maximal score.
  const random = independentRandom(1);
  const first = [random(), random()];
  let expected = null;
  let expectedScore = -Infinity;
  for (let i = 0; i < 32; i += 1) {
    const point = [random(), random()];
    const score = (point[0] - first[0]) ** 2 + (point[1] - first[1]) ** 2;
    if (score > expectedScore) {
      expectedScore = score;
      expected = point;
    }
  }
  assert.deepEqual(best.points[0], first);
  assert.deepEqual(best.points[1], expected);
});

test('same seed is deterministic and seed changes produce a different stream', () => {
  for (const seed of [0, 1, 0xffffffff]) {
    const first = constructLayout({ method: 'best-candidate', count: 32, seed });
    const second = constructLayout({ method: 'best-candidate', count: 32, seed });
    assert.deepEqual(first.points, second.points);
  }
  const zero = constructLayout({ method: 'uniform', count: 8, seed: 0 });
  const one = constructLayout({ method: 'uniform', count: 8, seed: 1 });
  assert.notDeepEqual(zero.points, one.points);
});

test('count increase preserves exact prefixes for both placement methods', () => {
  for (const method of ['uniform', 'best-candidate']) {
    const short = constructLayout({ method, count: 8, seed: 345678 });
    const medium = constructLayout({ method, count: 64, seed: 345678 });
    const long = constructLayout({ method, count: 128, seed: 345678 });
    assert.deepEqual(medium.points.slice(0, 8), short.points);
    assert.deepEqual(long.points.slice(0, 64), medium.points);
  }
});

test('uniform method consumes exactly one pair per appended point', () => {
  const random = independentRandom(9);
  const expected = Array.from({ length: 11 }, () => [random(), random()]);
  const actual = constructLayout({ method: 'uniform', count: 11, seed: 9 });
  assert.deepEqual(actual.points, expected);
});

test('returned point domain, count, and normalized-axis metadata are exact', () => {
  for (const method of ['uniform', 'best-candidate']) {
    const layout = constructLayout({ method, count: 128, seed: 0xffffffff });
    assert.equal(layout.points.length, 128);
    assert.deepEqual(layout.domain, {
      xMin: 0, xMax: 1, yMin: 0, yMax: 1, upperExclusive: true,
      axes: 'x_right_y_down', metric: 'euclidean_nonperiodic',
    });
    for (const [x, y] of layout.points) {
      assert.ok(Number.isFinite(x) && x >= 0 && x < 1);
      assert.ok(Number.isFinite(y) && y >= 0 && y < 1);
    }
  }
});

test('nearest-distance summaries agree with independent pairwise calculation', () => {
  for (const method of ['uniform', 'best-candidate']) {
    const layout = constructLayout({ method, count: 37, seed: 0x12345678 });
    const expected = independentMetrics(layout.points);
    assert.equal(layout.nearestDistances.length, layout.points.length);
    for (let i = 0; i < expected.nearest.length; i += 1) {
      assert.ok(Math.abs(layout.nearestDistances[i] - expected.nearest[i]) < 1e-15);
    }
    assert.ok(Math.abs(layout.minimumDistance - expected.minimum) < 1e-15);
    assert.ok(Math.abs(layout.meanNearestDistance - expected.mean) < 1e-15);
    assert.deepEqual(layout.closestPair, expected.pair);
  }
});

test('settings are cloned and caller input remains unchanged', () => {
  const settings = { method: 'uniform', count: 12, seed: 0x80000000 };
  const before = { ...settings };
  const layout = constructLayout(settings);
  assert.deepEqual(settings, before);
  assert.deepEqual(layout.settings, before);
  assert.notEqual(layout.settings, settings);
  layout.settings.seed = 1;
  assert.equal(settings.seed, before.seed);
});

test('invalid methods, counts, seeds, plain-object shape, and symbol extras reject', () => {
  const valid = { method: 'uniform', count: 8, seed: 1 };
  const invalid = [
    null, [], { ...valid, extra: 1 }, { ...valid, method: 'poisson' }, { ...valid, count: 7 },
    { ...valid, count: 8.5 }, { ...valid, count: 129 }, { ...valid, seed: -1 },
    { ...valid, seed: 0x100000000 }, { ...valid, seed: NaN }, { ...valid, seed: 1.25 },
    { ...valid, [Symbol('extra')]: true },
  ];
  for (const settings of invalid) assert.throws(() => constructLayout(settings));
  const hidden = { ...valid };
  Object.defineProperty(hidden, 'hidden', { value: 1, enumerable: false });
  assert.throws(() => constructLayout(hidden));
  assert.throws(() => constructLayout(Object.assign(Object.create({ inherited: 1 }), valid)));
});

