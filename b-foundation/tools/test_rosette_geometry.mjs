import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASE_SETTINGS,
  DEFAULT_SETTINGS,
  constructRosette,
  sharedViewBox,
} from '../labs/rosette-geometry.mjs';

const EPS = 2e-12;

function rotation(angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[c, -s], [s, c]];
}

function multiply(a, b) {
  return a.map((row, i) => b[0].map((_, j) => row[0] * b[0][j] + row[1] * b[1][j]));
}

function apply(matrix, point) {
  return [matrix[0][0] * point[0] + matrix[0][1] * point[1], matrix[1][0] * point[0] + matrix[1][1] * point[1]];
}

function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }

function closePoint(actual, expected, tolerance = EPS) {
  assert.ok(Math.hypot(actual[0] - expected[0], actual[1] - expected[1]) <= tolerance,
    `expected ${JSON.stringify(actual)} close to ${JSON.stringify(expected)}`);
}

function signedArea(points) {
  let total = 0;
  for (let i = 0; i + 1 < points.length; i += 1) total += points[i][0] * points[i + 1][1] - points[i + 1][0] * points[i][1];
  return total / 2;
}

function distanceMatrix(points) {
  return points.map((p) => points.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])));
}

function baseSettings(overrides = {}) {
  return {
    group: 'cyclic', sectors: 5, radius: 1.1, tilt: 27, orientation: 43,
    seed: { ...BASE_SETTINGS.seed, strength: 43, widthStart: 0.3, widthEnd: 0.8 },
    ...overrides,
  };
}

test('default settings and deterministic instance ordering match the contract', () => {
  assert.deepEqual(DEFAULT_SETTINGS, {
    group: 'dihedral', sectors: 6, radius: 0.5, tilt: 0, orientation: 0,
    seed: { ...DEFAULT_SETTINGS.seed },
  });
  assert.equal(BASE_SETTINGS.group, 'cyclic');
  assert.deepEqual(BASE_SETTINGS.seed, DEFAULT_SETTINGS.seed);
  assert.deepEqual({ ...BASE_SETTINGS, group: DEFAULT_SETTINGS.group }, DEFAULT_SETTINGS);
  const cyclic = constructRosette(baseSettings({ sectors: 4, orientation: 0, tilt: 0 }));
  assert.equal(cyclic.groupOrder, 4);
  assert.equal(cyclic.instanceCount, 4);
  assert.deepEqual(cyclic.instances.map(({ index, sector, reflected }) => [index, sector, reflected]), [
    [0, 0, false], [1, 1, false], [2, 2, false], [3, 3, false],
  ]);
  const dihedral = constructRosette(baseSettings({ group: 'dihedral', sectors: 3, orientation: 0, tilt: 0 }));
  assert.deepEqual(dihedral.instances.map(({ index, sector, reflected }) => [index, sector, reflected]), [
    [0, 0, false], [1, 1, false], [2, 2, false], [3, 0, true], [4, 1, true], [5, 2, true],
  ]);
  assert.equal(dihedral.groupOrder, 6);
  assert.equal(dihedral.globalOverlap, 'not_checked');
  assert.equal(dihedral.distinctMotifs, 'not_checked');
});

test('zero and quarter-turn matrices and translations are explicit', () => {
  const model = constructRosette(baseSettings({
    sectors: 4, radius: 1, tilt: 0, orientation: 0,
    seed: { ...BASE_SETTINGS.seed, profile: 'uniform', strength: 0, widthStart: 0.4, widthEnd: 0.4 },
  }));
  closePoint(model.instances[0].groupMatrix[0], [1, 0]);
  closePoint(model.instances[0].groupMatrix[1], [0, 1]);
  closePoint(model.instances[0].translation, [1, 0]);
  closePoint(model.instances[1].translation, [0, 1]);
  closePoint(model.instances[1].groupMatrix[0], [0, -1]);
  closePoint(model.instances[1].groupMatrix[1], [1, 0]);
  closePoint(model.instances[0].points[0], [1, 0]);
  closePoint(model.instances[1].points[0], [0, 1]);
});

test('total affine transform matches independent sequential placement and matrices', () => {
  const settings = baseSettings({ group: 'dihedral', sectors: 4, radius: 1.3, tilt: -31, orientation: 72 });
  const model = constructRosette(settings);
  const beta = settings.tilt * Math.PI / 180;
  const phi = settings.orientation * Math.PI / 180;
  const p = model.seed.points[7];
  const tilted = add(apply(rotation(beta), p), [settings.radius, 0]);
  for (const instance of model.instances) {
    const groupPoint = apply(instance.groupMatrix, tilted);
    const expected = apply(rotation(phi), groupPoint);
    closePoint(instance.points[7], expected);
    const total = add(apply(instance.matrix, p), instance.translation);
    closePoint(instance.points[7], total);
    const expectedMatrix = multiply(multiply(rotation(phi), instance.groupMatrix), rotation(beta));
    for (let r = 0; r < 2; r += 1) closePoint(instance.matrix[r], expectedMatrix[r]);
  }
});

test('group matrices are orthogonal and close with expected determinants and inverses', () => {
  for (const group of ['cyclic', 'dihedral']) {
    const model = constructRosette(baseSettings({ group, sectors: 5, radius: 0.7, tilt: 19, orientation: 121 }));
    const matrices = model.instances.map((instance) => instance.groupMatrix);
    const identity = [[1, 0], [0, 1]];
    for (const [i, a] of matrices.entries()) {
      const determinant = a[0][0] * a[1][1] - a[0][1] * a[1][0];
      assert.ok(Math.abs(Math.abs(determinant) - 1) < EPS);
      assert.equal(Math.sign(determinant), model.instances[i].reflected ? -1 : 1);
      const transpose = [[a[0][0], a[1][0]], [a[0][1], a[1][1]]];
      const inverseProduct = multiply(a, transpose);
      for (let r = 0; r < 2; r += 1) closePoint(inverseProduct[r], identity[r]);
      for (const b of matrices) {
        const product = multiply(a, b);
        assert.ok(matrices.some((candidate) => candidate.every((row, ri) => row.every((value, ci) => Math.abs(value - product[ri][ci]) < EPS))));
      }
    }
  }
});

test('world symmetry acts on placements and generic dihedral generators permute the orbit', () => {
  const n = 5;
  const settings = baseSettings({ group: 'dihedral', sectors: n, radius: 1.4, tilt: 37, orientation: 58 });
  const model = constructRosette(settings);
  const phi = settings.orientation * Math.PI / 180;
  const rotationSymmetry = multiply(multiply(rotation(phi), rotation(2 * Math.PI / n)), rotation(-phi));
  const reflectionSymmetry = multiply(multiply(rotation(phi), [[1, 0], [0, -1]]), rotation(-phi));
  for (let i = 0; i < model.instances.length; i += 1) {
    const instance = model.instances[i];
    const rotatedIndex = instance.reflected ? n + (instance.sector + 1) % n : (instance.sector + 1) % n;
    const rotated = model.instances[rotatedIndex];
    const mirrorSector = (n - instance.sector) % n;
    const reflected = instance.reflected ? model.instances[mirrorSector] : model.instances[n + mirrorSector];
    const pointIndex = 4;
    closePoint(apply(rotationSymmetry, instance.points[pointIndex]), rotated.points[pointIndex]);
    closePoint(apply(reflectionSymmetry, instance.points[pointIndex]), reflected.points[pointIndex]);
  }
});

test('all instance transforms preserve point distances and polygon absolute areas', () => {
  const model = constructRosette(baseSettings({ group: 'dihedral', sectors: 4, radius: 1, tilt: 22, orientation: 81 }));
  const sourcePoints = model.seed.points.filter((_, index) => index % 30 === 0);
  const sourceDistances = distanceMatrix(sourcePoints);
  const sourceAbsArea = Math.abs(signedArea(model.seed.polygon));
  for (const instance of model.instances) {
    const points = sourcePoints.map((point) => add(apply(instance.matrix, point), instance.translation));
    const distances = distanceMatrix(points);
    for (let i = 0; i < distances.length; i += 1) {
      for (let j = 0; j < distances.length; j += 1) assert.ok(Math.abs(distances[i][j] - sourceDistances[i][j]) < 3e-12);
    }
    assert.ok(Math.abs(Math.abs(signedArea(instance.polygon)) - sourceAbsArea) < 2e-12);
    if (instance.reflected) assert.ok(signedArea(instance.polygon) * signedArea(model.seed.polygon) < 0);
    assert.equal(instance.points.length, model.seed.points.length);
    assert.equal(instance.leftPoints.length, model.seed.leftPoints.length);
    assert.equal(instance.rightPoints.length, model.seed.rightPoints.length);
    assert.equal(instance.polygon.length, model.seed.polygon.length);
  }
});

test('orthogonal placements inherit seed bounds and disclose transform precision limits', () => {
  const model = constructRosette(baseSettings({ group: 'cyclic', sectors: 7 }));
  assert.equal(model.bounds.position, model.seed.bounds.position);
  assert.equal(model.bounds.quadrature, model.seed.bounds.quadrature);
  assert.equal(model.bounds.interpolation, model.seed.bounds.interpolation);
  assert.match(model.bounds.scope, /matrix\/trigonometric\/coordinate rounding/);
});

test('settings and seed are cloned without mutating or aliasing the caller', () => {
  const seed = { ...BASE_SETTINGS.seed, strength: 41, widthStart: 0.4, widthEnd: 0.8 };
  const input = { group: 'cyclic', sectors: 4, radius: 1, tilt: 15, orientation: 25, seed };
  const before = structuredClone(input);
  const model = constructRosette(input);
  assert.deepEqual(input, before);
  assert.notEqual(model.settings, input);
  assert.notEqual(model.settings.seed, input.seed);
  assert.notEqual(model.seed.settings, input.seed);
  model.settings.seed.widthStart = 1.1;
  assert.equal(input.seed.widthStart, before.seed.widthStart);
});

test('validation rejects invalid root settings and delegated invalid seed/options', () => {
  const valid = baseSettings();
  const invalid = [
    null,
    [],
    { ...valid, extra: true },
    { ...valid, group: 'dihedral-like' },
    { ...valid, sectors: 1 },
    { ...valid, sectors: 2.5 },
    { ...valid, sectors: 17 },
    { ...valid, radius: -0.1 },
    { ...valid, radius: Infinity },
    { ...valid, tilt: 181 },
    { ...valid, orientation: -1 },
    { ...valid, seed: null },
    { ...valid, seed: { ...valid.seed, extra: 1 } },
    { ...valid, seed: { ...valid.seed, widthStart: 0, widthEnd: 0 } },
  ];
  for (const settings of invalid) assert.throws(() => constructRosette(settings));
  const nonEnumerableUnknown = { ...valid.seed };
  Object.defineProperty(nonEnumerableUnknown, 'hidden', { value: true, enumerable: false });
  assert.throws(() => constructRosette({ ...valid, seed: nonEnumerableUnknown }));
  const symbolUnknown = { ...valid.seed, [Symbol('extra')]: true };
  assert.throws(() => constructRosette({ ...valid, seed: symbolUnknown }));
  assert.throws(() => constructRosette(valid, { maxSteps: 0 }));
});

test('sharedViewBox delegates over all instances and covers transformed points', () => {
  const a = constructRosette(baseSettings({ group: 'cyclic', sectors: 3, radius: 0.3 }));
  const b = constructRosette(baseSettings({ group: 'dihedral', sectors: 8, radius: 2, orientation: 141 }));
  const box = sharedViewBox([a, b]);
  assert.equal(box.width, box.height);
  for (const model of [a, b]) {
    for (const instance of model.instances) {
      for (const [x, y] of instance.polygon) {
        assert.ok(x >= box.x - 1e-12 && x <= box.x + box.width + 1e-12);
        assert.ok(-y >= box.y - 1e-12 && -y <= box.y + box.height + 1e-12);
      }
    }
  }
  assert.throws(() => sharedViewBox([]));
  assert.throws(() => sharedViewBox([{ instances: [] }]));
});
