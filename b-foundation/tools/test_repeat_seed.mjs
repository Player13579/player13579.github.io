import assert from 'node:assert/strict';
import test from 'node:test';

import { constructBand, DEFAULT_SETTINGS as BAND_DEFAULT_SETTINGS } from '../labs/band-geometry.mjs';
import { DEFAULT_SETTINGS as REPEAT_DEFAULT_SETTINGS, constructRepeat, sharedViewBox } from '../labs/curve-repeat-geometry.mjs';
import { constructSeedRepeat, DEFAULT_SEED, parseBandSeed } from '../labs/repeat-seed.mjs';

function producerFixture(settings = BAND_DEFAULT_SETTINGS, overrides = {}) {
  const model = constructBand(settings);
  return JSON.stringify({
    version: 1,
    kind: 'planar_band_geometry',
    settings: model.settings,
    source: model.source,
    units: 'local length units',
    limits: model.bounds,
    geometry: {
      points: model.points,
      leftPoints: model.leftPoints,
      rightPoints: model.rightPoints,
      polygon: model.polygon,
      arcLengths: model.arcLengths,
      tangentAngles: model.tangentAngles,
      widths: model.widths,
      steps: model.steps,
      bounds: model.bounds,
      localFactorBound: model.localFactorBound,
      caps: model.caps,
      globalOverlap: model.globalOverlap,
    },
    ...overrides,
  });
}

function distance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

function area(polygon) {
  let twice = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    twice += a[0] * b[1] - b[0] * a[1];
  }
  return twice / 2;
}

function assertNear(actual, expected, tolerance = 1e-14) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}

test('default diamond exactly preserves the old repeat model within floating tolerance', () => {
  const oldModel = constructRepeat({ ...REPEAT_DEFAULT_SETTINGS });
  const seeded = constructSeedRepeat({ ...REPEAT_DEFAULT_SETTINGS }, { ...DEFAULT_SEED });
  assert.equal(seeded.marks.length, oldModel.marks.length);
  assert.deepEqual(seeded.curve, oldModel.curve);
  assert.deepEqual(seeded.pathPoints, oldModel.pathPoints);
  for (let i = 0; i < oldModel.marks.length; i += 1) {
    assert.deepEqual(seeded.marks[i].point, oldModel.marks[i].point);
    assert.equal(seeded.marks[i].orientationAngle, oldModel.marks[i].orientationAngle);
    seeded.marks[i].polygon.forEach((point, j) => {
      assertNear(point[0], oldModel.marks[i].polygon[j][0], 1e-15);
      assertNear(point[1], oldModel.marks[i].polygon[j][1], 1e-15);
    });
  }
  assert.equal(seeded.seed.scale, 1);
  assert.deepEqual(seeded.seed.anchor, [0, 0]);
});

test('actual band producer JSON parses only normalized settings and permits one leading BOM', () => {
  const settings = { profile: 's', strength: 44, flip: true, widthStart: 0.38, widthEnd: 0.91 };
  const json = producerFixture(settings);
  assert.deepEqual(parseBandSeed(json), settings);
  assert.deepEqual(parseBandSeed(`\uFEFF${json}`), settings);
  const alteredMetadata = producerFixture(settings, {
    geometry: { polygon: [[999, -999]], steps: -200, html: '<script>throw 1</script>' },
    source: 'untrusted metadata', units: null, limits: { position: Infinity },
  });
  assert.deepEqual(parseBandSeed(alteredMetadata), settings);
});

test('band seed normalization uses the sampled polygon bounding-box center and uniform maximum extent', () => {
  const settings = { profile: 'tighten', strength: 54, flip: false, widthStart: 0.62, widthEnd: 0.14 };
  const seed = { kind: 'band', bandSettings: settings, size: 0.37 };
  const result = constructSeedRepeat({ ...REPEAT_DEFAULT_SETTINGS, count: 5 }, seed);
  const source = constructBand(settings).polygon;
  const xs = source.map(([x]) => x), ys = source.map(([, y]) => y);
  const box = result.seed.sourceBox;
  assert.equal(box.minX, Math.min(...xs));
  assert.equal(box.maxX, Math.max(...xs));
  assert.equal(box.minY, Math.min(...ys));
  assert.equal(box.maxY, Math.max(...ys));
  assert.equal(box.width, box.maxX - box.minX);
  assert.equal(box.height, box.maxY - box.minY);
  assert.deepEqual(result.seed.anchor, [(box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2]);
  assertNear(Math.max(box.width, box.height) * result.seed.scale, seed.size, 1e-15);
  assert.deepEqual(result.seed.sourcePolygon, source);
  assert.equal(result.seed.sourcePolygon.length, source.length);
  assert.deepEqual(result.seed.sourcePolygon.at(-1), result.seed.sourcePolygon[0]);
  assert.equal(result.seed.sourceApproximation.scale, result.seed.scale);
  assert.deepEqual(result.seed.sourceApproximation.bounds, constructBand(settings).bounds);
  assert.match(result.seed.sourceApproximation.scope, /excludes normalization sensitivity/);
  assert.deepEqual(result.seed.bandSettings, settings);

  const ratio = seed.size / Math.max(box.width, box.height);
  for (let i = 0; i < source.length; i += 1) {
    const expected = [(source[i][0] - result.seed.anchor[0]) * ratio, (source[i][1] - result.seed.anchor[1]) * ratio];
    assertNear(distance(result.seed.normalizedPolygon[i], expected), 0, 2e-16);
  }
});

test('changing seed preserves every repeat placement attribute and curve', () => {
  const repeatSettings = { ...REPEAT_DEFAULT_SETTINGS, count: 9, angle: -17 };
  const diamond = constructSeedRepeat(repeatSettings, { ...DEFAULT_SEED });
  const band = constructSeedRepeat(repeatSettings, {
    kind: 'band',
    bandSettings: { profile: 'uniform', strength: 33, flip: false, widthStart: 0.4, widthEnd: 0.4 },
    size: 0.3,
  });
  assert.deepEqual(diamond.curve, band.curve);
  assert.deepEqual(diamond.pathPoints, band.pathPoints);
  assert.deepEqual(diamond.arcIntervals, band.arcIntervals);
  assert.deepEqual(diamond.chordIntervals, band.chordIntervals);
  assert.deepEqual(diamond.metrics, band.metrics);
  assert.deepEqual(diamond.bounds, band.bounds);
  assert.equal(diamond.marks.length, band.marks.length);
  for (let i = 0; i < diamond.marks.length; i += 1) {
    for (const key of ['t', 's', 'point', 'tangentAngle', 'orientationAngle', 'arcResidual', 'bracketWidth']) {
      assert.deepEqual(diamond.marks[i][key], band.marks[i][key]);
    }
  }
});

test('transformed copies retain equal pairwise distances, area, and finite bounds', () => {
  const model = constructSeedRepeat({ ...REPEAT_DEFAULT_SETTINGS, count: 7 }, {
    kind: 'band',
    bandSettings: { profile: 'relax', strength: 28, flip: true, widthStart: 0.7, widthEnd: 0.2 },
    size: 0.41,
  });
  const reference = model.marks[0].polygon;
  const referenceArea = area(reference);
  for (const mark of model.marks) {
    assert.ok(mark.polygon.flat().every(Number.isFinite));
    assert.equal(mark.polygon.length, reference.length);
    assertNear(area(mark.polygon), referenceArea, 2e-14);
    for (let i = 0; i < reference.length; i += 1) {
      for (let j = 0; j < reference.length; j += 1) {
        assertNear(distance(mark.polygon[i], mark.polygon[j]), distance(reference[i], reference[j]), 2e-14);
      }
    }
    for (const [x, y] of mark.polygon) assert.ok(Number.isFinite(x) && Number.isFinite(y));
  }
  const view = sharedViewBox([model]);
  for (const mark of model.marks) for (const [x, y] of mark.polygon) {
    assert.ok(x >= view.x && x <= view.x + view.width);
    assert.ok(-y >= view.y && -y <= view.y + view.height);
  }
});

test('parser rejects malformed, wrong-kind, wrong-version, oversized, and invalid settings', () => {
  const valid = producerFixture();
  for (const input of ['', ' ', '{', '[]', 'null', '"text"', '{}',
    JSON.stringify({ version: 2, kind: 'planar_band_geometry', settings: BAND_DEFAULT_SETTINGS }),
    JSON.stringify({ version: 1, kind: 'other', settings: BAND_DEFAULT_SETTINGS }),
    JSON.stringify({ version: 1, kind: 'planar_band_geometry', settings: { ...BAND_DEFAULT_SETTINGS, unknown: 1 } }),
    JSON.stringify({ version: 1, kind: 'planar_band_geometry', settings: { ...BAND_DEFAULT_SETTINGS, strength: NaN } }),
  ]) assert.throws(() => parseBandSeed(input));
  assert.throws(() => parseBandSeed(' '.repeat(1048577)));
  assert.throws(() => parseBandSeed(new TextEncoder().encode(valid)));
  assert.deepEqual(parseBandSeed(valid), BAND_DEFAULT_SETTINGS);
  assert.throws(() => parseBandSeed({ version: 1, kind: 'planar_band_geometry', settings: BAND_DEFAULT_SETTINGS }));
});

test('seed descriptors enforce exact shape, numeric limits, and no mutation', () => {
  const settings = { ...REPEAT_DEFAULT_SETTINGS };
  const seed = { kind: 'band', bandSettings: { ...BAND_DEFAULT_SETTINGS }, size: 0.5 };
  const settingsBefore = { ...settings }, seedBefore = structuredClone(seed);
  const output = constructSeedRepeat(settings, seed);
  assert.deepEqual(settings, settingsBefore);
  assert.deepEqual(seed, seedBefore);
  assert.deepEqual(output.settings, settingsBefore);
  assert.deepEqual(output.seed.bandSettings, seedBefore.bandSettings);

  const invalid = [
    null, [], { ...DEFAULT_SEED, extra: true }, { ...DEFAULT_SEED, kind: 'other' },
    { ...DEFAULT_SEED, bandSettings: {} }, { ...DEFAULT_SEED, size: NaN },
    { ...DEFAULT_SEED, size: 0.09 }, { ...DEFAULT_SEED, size: 0.81 },
    { ...DEFAULT_SEED, [Symbol('extra')]: 1 },
  ];
  for (const value of invalid) assert.throws(() => constructSeedRepeat(settings, value));
  const hidden = { ...DEFAULT_SEED };
  Object.defineProperty(hidden, 'hidden', { value: true, enumerable: false });
  assert.throws(() => constructSeedRepeat(settings, hidden));
  assert.throws(() => constructSeedRepeat(settings, Object.assign(Object.create({ inherited: true }), DEFAULT_SEED)));
  assert.throws(() => constructSeedRepeat(settings, { kind: 'band', bandSettings: { ...BAND_DEFAULT_SETTINGS, extra: 1 }, size: 0.2 }));
  assert.throws(() => constructSeedRepeat(settings, { kind: 'band', bandSettings: { ...BAND_DEFAULT_SETTINGS, strength: '50' }, size: 0.2 }));
});
