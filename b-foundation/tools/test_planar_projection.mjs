import assert from 'node:assert/strict';
import test from 'node:test';

import { constructRosette, DEFAULT_SETTINGS as ROSETTE_DEFAULT_SETTINGS } from '../labs/rosette-geometry.mjs';
import {
  BASELINE_POSE,
  DEFAULT_POSE,
  DEFAULT_SOURCE_SETTINGS,
  MAX_SOURCE_BYTES,
  VIEW_BOX,
  constructPlanarProjection,
  parseRosetteSource,
  validatePose,
} from '../labs/planar-projection.mjs';

const EPS = 3e-12;

function close(a, b, tolerance = EPS) {
  assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
}

function closePoint(a, b, tolerance = EPS) {
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i += 1) close(a[i], b[i], tolerance);
}

function add(a, b) { return a.map((value, i) => value + b[i]); }
function scale(a, amount) { return a.map((value) => value * amount); }
function dot(a, b) { return a.reduce((sum, value, i) => sum + value * b[i], 0); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function distance(a, b) { return Math.hypot(...a.map((value, i) => value - b[i])); }

function assertFiniteTree(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value));
  else if (Array.isArray(value)) value.forEach(assertFiniteTree);
  else if (value && typeof value === 'object') Object.values(value).forEach(assertFiniteTree);
}

function producerJson(settings = DEFAULT_SOURCE_SETTINGS, extra = {}) {
  const model = constructRosette(settings);
  return JSON.stringify({
    version: 1,
    kind: 'radial_band_arrangement',
    settings: model.settings,
    units: 'local length units',
    model: {
      seed: model.seed,
      instances: model.instances,
      instanceCount: model.instanceCount,
      groupOrder: model.groupOrder,
      bounds: model.bounds,
      globalOverlap: model.globalOverlap,
      distinctMotifs: model.distinctMotifs,
    },
    bounds: model.bounds,
    limits: { approximation: model.bounds, globalOverlap: model.globalOverlap, distinctMotifs: model.distinctMotifs },
    ...extra,
  });
}

function sourceSettings() {
  return {
    group: 'cyclic', sectors: 5, radius: 1.1, tilt: 27, orientation: 43,
    seed: { ...ROSETTE_DEFAULT_SETTINGS.seed, profile: 'uniform', strength: 43, widthStart: 0.3, widthEnd: 0.8 },
  };
}

function explicitWorld(point, basis) {
  return add(scale(basis.u, point[0]), scale(basis.v, point[1]));
}

function explicitProject(world, pose) {
  if (pose.projection === 'orthographic') return world.slice(0, 2);
  const depth = pose.distance - world[2];
  return [pose.distance * world[0] / depth, pose.distance * world[1] / depth];
}

function homographyProject(matrix, point) {
  const [u, v] = point;
  const x = matrix[0][0] * u + matrix[0][1] * v + matrix[0][2];
  const y = matrix[1][0] * u + matrix[1][1] * v + matrix[1][2];
  const w = matrix[2][0] * u + matrix[2][1] * v + matrix[2][2];
  return [x / w, y / w];
}

test('pose/source defaults and exact validation domains', () => {
  assert.deepEqual(DEFAULT_POSE, { projection: 'perspective', tilt: 60, roll: 0, distance: 3 });
  assert.deepEqual(BASELINE_POSE, { projection: 'perspective', tilt: 0, roll: 0, distance: 3 });
  assert.deepEqual(VIEW_BOX, [-2.3, -2.3, 4.6, 4.6]);
  assert.deepEqual(DEFAULT_SOURCE_SETTINGS, ROSETTE_DEFAULT_SETTINGS);
  assert.ok(Object.isFrozen(DEFAULT_SOURCE_SETTINGS));
  assert.ok(Object.isFrozen(DEFAULT_SOURCE_SETTINGS.seed));
  const limits = { projection: 'orthographic', tilt: -80, roll: 180, distance: 2 };
  assert.deepEqual(validatePose(limits), limits);
  assert.deepEqual(validatePose({ projection: 'perspective', tilt: 80, roll: -180, distance: 8 }), {
    projection: 'perspective', tilt: 80, roll: -180, distance: 8,
  });
  assert.notEqual(validatePose(limits), limits);
});

test('producer JSON import validates settings, permits one BOM, and ignores saved coordinates', () => {
  const settings = sourceSettings();
  const json = producerJson(settings);
  assert.deepEqual(parseRosetteSource(json), settings);
  assert.deepEqual(parseRosetteSource(`\uFEFF${json}`), settings);
  assert.throws(() => parseRosetteSource(`\uFEFF\uFEFF${json}`));
  const copied = parseRosetteSource(json);
  copied.seed.widthStart = 1.4;
  assert.equal(settings.seed.widthStart, 0.3);
  const tampered = producerJson(settings, {
    model: { instances: [{ polygon: [[999, -999], [1e300, 1e300]] }], bounds: { forged: true } },
    bounds: { forged: true }, units: '<svg onload="alert(1)">',
  });
  assert.deepEqual(parseRosetteSource(tampered), settings);
  assert.throws(() => parseRosetteSource(new TextEncoder().encode(json)));
});

test('source parser rejects malformed kind/version/settings/containers and oversized UTF-8', () => {
  const seed = ROSETTE_DEFAULT_SETTINGS;
  const invalid = [
    '', ' ', '{', '[]', 'null', '"text"',
    JSON.stringify({ version: 2, kind: 'radial_band_arrangement', settings: seed }),
    JSON.stringify({ version: 1, kind: 'other', settings: seed }),
    JSON.stringify({ version: 1, kind: 'radial_band_arrangement' }),
    JSON.stringify({ version: 1, kind: 'radial_band_arrangement', settings: { ...seed, unknown: 1 } }),
    JSON.stringify({ version: 1, kind: 'radial_band_arrangement', settings: { ...seed, seed: { ...seed.seed, flip: 'false' } } }),
  ];
  for (const text of invalid) assert.throws(() => parseRosetteSource(text));
  assert.throws(() => parseRosetteSource(' '.repeat(MAX_SOURCE_BYTES + 1)));
  const valid = producerJson();
  const validBytes = new TextEncoder().encode(valid).byteLength;
  const exactLimit = `${valid}${' '.repeat(MAX_SOURCE_BYTES - validBytes)}`;
  assert.equal(new TextEncoder().encode(exactLimit).byteLength, MAX_SOURCE_BYTES);
  assert.deepEqual(parseRosetteSource(exactLimit), DEFAULT_SOURCE_SETTINGS);
  assert.throws(() => parseRosetteSource(`${exactLimit} `));
  const multiByteOverLimit = `${valid}${'界'.repeat(Math.floor((MAX_SOURCE_BYTES - valid.length) / 3) + 1)}`;
  assert.ok(multiByteOverLimit.length < MAX_SOURCE_BYTES);
  assert.ok(new TextEncoder().encode(multiByteOverLimit).byteLength > MAX_SOURCE_BYTES);
  assert.throws(() => parseRosetteSource(multiByteOverLimit), /exceeds/);
  assert.throws(() => parseRosetteSource({ version: 1, kind: 'radial_band_arrangement', settings: seed }));
  assert.deepEqual(parseRosetteSource(producerJson()), DEFAULT_SOURCE_SETTINGS);
});

test('bbox normalization includes every instance and preserves plane distances uniformly', () => {
  const settings = sourceSettings();
  const source = constructRosette(settings);
  const model = constructPlanarProjection({ ...BASELINE_POSE }, settings);
  const vertices = source.instances.flatMap((instance) => instance.polygon);
  const xs = vertices.map(([x]) => x), ys = vertices.map(([, y]) => y);
  const bounds = model.normalization.bounds;
  assert.deepEqual(bounds, { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) });
  const maxEdge = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  assert.equal(model.normalization.maxEdge, maxEdge);
  assert.equal(model.normalization.scale, 2 / maxEdge);
  assert.deepEqual(model.normalization.anchor, [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2]);
  assert.equal(model.instances.length, source.instances.length);
  for (let i = 0; i < model.instances.length; i += 1) {
    const before = source.instances[i], after = model.instances[i];
    assert.deepEqual([after.index, after.sector, after.reflected], [before.index, before.sector, before.reflected]);
    assert.deepEqual(after.sourcePolygon, before.polygon);
    for (const [x, y] of after.normalizedPolygon) {
      assert.ok(Math.abs(x) <= 1 + EPS && Math.abs(y) <= 1 + EPS);
      assert.ok(Math.hypot(x, y) <= Math.SQRT2 + EPS);
    }
    for (let j = 0; j < after.normalizedPolygon.length - 1; j += 1) {
      close(distance(after.worldPolygon[j], after.worldPolygon[j + 1]), distance(after.normalizedPolygon[j], after.normalizedPolygon[j + 1]));
    }
  }
  assert.deepEqual(model.sourceSettings, source.settings);
});

test('camera coordinates, right-handed orthonormal basis, and plane corners are explicit', () => {
  const pose = { projection: 'orthographic', tilt: 37, roll: -28, distance: 4.25 };
  const model = constructPlanarProjection(pose, sourceSettings());
  close(dot(model.basis.u, model.basis.u), 1);
  close(dot(model.basis.v, model.basis.v), 1);
  close(dot(model.basis.u, model.basis.v), 0);
  closePoint(cross(model.basis.u, model.basis.v), model.basis.normal);
  assert.deepEqual(model.camera, { position: [0, 0, pose.distance], forward: [0, 0, -1], focal: pose.distance, projection: pose.projection });
  assert.deepEqual(model.plane.normalizedCorners, [[-1, -1], [1, -1], [1, 1], [-1, 1]]);
  model.plane.normalizedCorners.forEach((point, i) => {
    closePoint(model.plane.worldCorners[i], explicitWorld(point, model.basis));
    closePoint(model.plane.projectedCorners[i], explicitProject(model.plane.worldCorners[i], pose));
  });

  const front = constructPlanarProjection({ projection: 'perspective', tilt: 0, roll: 0, distance: 3 }, sourceSettings());
  closePoint(front.basis.normal, [0, 0, 1]);
  closePoint(front.plane.projectedCorners[0], [-1, -1]);
  assert.deepEqual(front.viewBox, [-2.3, -2.3, 4.6, 4.6]);

  const knownPerspective = constructPlanarProjection({ projection: 'perspective', tilt: 60, roll: 0, distance: 3 }, sourceSettings());
  const expectedCornerWorld = [1, Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)];
  const expectedCornerProjected = expectedCornerWorld.slice(0, 2).map((value) => 3 * value / (3 - expectedCornerWorld[2]));
  closePoint(knownPerspective.plane.worldCorners[2], expectedCornerWorld);
  closePoint(knownPerspective.plane.projectedCorners[2], expectedCornerProjected);
});

test('homography equals explicit world projection for perspective and orthographic poses', () => {
  const source = sourceSettings();
  for (const pose of [
    { projection: 'perspective', tilt: 60, roll: 31, distance: 2 },
    { projection: 'perspective', tilt: -72, roll: -145, distance: 7.5 },
    { projection: 'orthographic', tilt: 53, roll: 82, distance: 3.25 },
  ]) {
    const model = constructPlanarProjection(pose, source);
    for (const instance of model.instances) {
      for (let i = 0; i < instance.normalizedPolygon.length; i += 1) {
        const q = instance.normalizedPolygon[i];
        const viaWorld = explicitProject(instance.worldPolygon[i], pose);
        const viaH = homographyProject(model.homography, q);
        closePoint(instance.projectedPolygon[i], viaWorld);
        closePoint(viaH, viaWorld);
      }
    }
    const expectedDeterminant = pose.projection === 'perspective'
      ? pose.distance ** 3 * Math.cos(pose.tilt * Math.PI / 180)
      : Math.cos(pose.tilt * Math.PI / 180);
    const h = model.homography;
    const determinant = h[0][0] * (h[1][1] * h[2][2] - h[1][2] * h[2][1])
      - h[0][1] * (h[1][0] * h[2][2] - h[1][2] * h[2][0])
      + h[0][2] * (h[1][0] * h[2][1] - h[1][1] * h[2][0]);
    close(determinant, expectedDeterminant);
    assert.ok(determinant > 0);
  }
});

test('camera distance is irrelevant orthographically and changes perspective scale for tilted points', () => {
  const source = sourceSettings();
  const orthoNear = constructPlanarProjection({ projection: 'orthographic', tilt: 60, roll: 25, distance: 2 }, source);
  const orthoFar = constructPlanarProjection({ projection: 'orthographic', tilt: 60, roll: 25, distance: 8 }, source);
  const perspNear = constructPlanarProjection({ projection: 'perspective', tilt: 60, roll: 25, distance: 2 }, source);
  const perspFar = constructPlanarProjection({ projection: 'perspective', tilt: 60, roll: 25, distance: 8 }, source);
  closePoint(orthoNear.instances[0].projectedPolygon[12], orthoFar.instances[0].projectedPolygon[12], 0);
  assert.ok(distance(perspNear.instances[0].projectedPolygon[12], perspFar.instances[0].projectedPolygon[12]) > 1e-4);
  for (const model of [perspNear, perspFar, orthoNear, orthoFar]) {
    for (const instance of model.instances) {
      for (const point of instance.worldPolygon) assert.ok(model.pose.distance - point[2] > 0);
      for (const point of instance.projectedPolygon) {
        assert.ok(Math.hypot(...point) <= (model.pose.projection === 'perspective' ? 2 : Math.SQRT2) + EPS);
        assert.ok(point[0] >= VIEW_BOX[0] && point[0] <= VIEW_BOX[0] + VIEW_BOX[2]);
        assert.ok(point[1] >= VIEW_BOX[1] && point[1] <= VIEW_BOX[1] + VIEW_BOX[3]);
      }
    }
  }
});

test('projective homography keeps straight source lines collinear but not their parameter midpoint', () => {
  const pose = { projection: 'perspective', tilt: 70, roll: 30, distance: 2 };
  const model = constructPlanarProjection(pose, sourceSettings());
  const a = [-0.8, -0.8], b = [0.8, 0.8], midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const projected = [a, midpoint, b].map((point) => homographyProject(model.homography, point));
  const [p, q, r] = projected;
  const area2 = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  assert.ok(Math.abs(area2) < 2e-14);
  assert.ok(distance(q, [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2]) > 1e-3);
});

test('projection deep-copies settings, is deterministic, and describes approximation and limits', () => {
  const pose = { ...DEFAULT_POSE, tilt: -44, roll: 76 };
  const source = sourceSettings();
  const poseBefore = { ...pose }, sourceBefore = structuredClone(source);
  const one = constructPlanarProjection(pose, source);
  const two = constructPlanarProjection(pose, source);
  assert.deepEqual(one, two);
  assert.deepEqual(pose, poseBefore);
  assert.deepEqual(source, sourceBefore);
  assert.notEqual(one.pose, pose);
  assert.notEqual(one.sourceSettings, source);
  const sourceApproximation = constructRosette(source).bounds;
  assert.deepEqual(one.source.sourcePolylineApproximation, sourceApproximation);
  assert.equal(one.source.normalizedPolylineApproximation.position,
    sourceApproximation.position * one.normalization.scale);
  assert.deepEqual(one.limits.sourceApproximation, one.source.normalizedPolylineApproximation);
  assert.deepEqual(one.source.normalizationValues, {
    anchor: one.normalization.anchor,
    scale: one.normalization.scale,
    sourceMaxEdge: one.normalization.maxEdge,
  });
  assert.equal(one.source.selectedDisplay.fill, '#147d78');
  assert.equal(one.limits.conservativeMinimumCameraDepth, pose.distance - Math.SQRT2);
  assert.ok(one.limits.conservativeMinimumCameraDepth > 0);
  assert.equal(one.limits.projectedRadiusBound, 2);
  assert.match(one.limits.imageMetricCaveat, /does not generally preserve/);
  assert.match(one.limits.perceptualClaim, /No perception/);
  assert.deepEqual(JSON.parse(JSON.stringify(one.source)), one.source);
  assert.deepEqual(JSON.parse(JSON.stringify(one.limits)), one.limits);
  assertFiniteTree(one.normalization);
  assertFiniteTree(one.basis);
  assertFiniteTree(one.camera);
  assertFiniteTree(one.homography);
  assertFiniteTree(one.instances);
  assertFiniteTree(one.plane);
});

test('pose validation rejects missing, extra, nonfinite, malformed, and out-of-domain inputs', () => {
  const valid = { ...DEFAULT_POSE };
  const invalid = [
    null, [], { ...valid, extra: 1 }, { projection: 'persp', tilt: 0, roll: 0, distance: 3 },
    { ...valid, tilt: NaN }, { ...valid, roll: Infinity }, { ...valid, distance: 1.99 },
    { ...valid, tilt: 80.01 }, { ...valid, roll: -180.01 },
    { projection: valid.projection, tilt: valid.tilt, roll: valid.roll },
    { ...valid, [Symbol('extra')]: true },
  ];
  for (const pose of invalid) assert.throws(() => validatePose(pose));
  assert.throws(() => validatePose(Object.assign(Object.create({ inherited: true }), valid)));
  assert.throws(() => constructPlanarProjection(valid, { ...ROSETTE_DEFAULT_SETTINGS, no: 'extra' }));
});
