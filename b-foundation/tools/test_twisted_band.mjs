import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASELINE_SETTINGS,
  DEFAULT_SETTINGS,
  REFLECTANCE,
  VIEW_BOX,
  constructTwistedBand,
  sampleSurface,
  validateSettings,
} from '../labs/twisted-band-geometry.mjs';

const PI = Math.PI;

function close(actual, expected, tolerance = 2e-14) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}

function normalized(vector) {
  const length = Math.hypot(...vector);
  return vector.map((value) => value / length);
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function srgb(linear) {
  return linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
}

function crossings(settings) {
  if (settings.twist === 0) return [];
  const end = settings.phase + settings.twist;
  const min = Math.min(settings.phase, end), max = Math.max(settings.phase, end);
  const result = [];
  for (let k = Math.ceil((min - 90) / 180); k <= Math.floor((max - 90) / 180); k += 1) {
    const t = (90 + 180 * k - settings.phase) / settings.twist;
    if (t > 0 && t < 1) result.push(t);
  }
  return result;
}

test('settings defaults, baseline, exact keys, and inclusive domain boundaries', () => {
  assert.deepEqual(DEFAULT_SETTINGS, { twist: 180, phase: 0, width: 1.2, light: 0.8 });
  assert.deepEqual(BASELINE_SETTINGS, { twist: 0, phase: 0, width: 1.2, light: 0.8 });
  assert.deepEqual(VIEW_BOX, [-3.5, -1.6, 7, 3.2]);
  const atLimits = { twist: -360, phase: 90, width: 0.4, light: 0 };
  assert.deepEqual(validateSettings(atLimits), atLimits);
  assert.deepEqual(validateSettings({ twist: 360, phase: -90, width: 2, light: 1 }), {
    twist: 360, phase: -90, width: 2, light: 1,
  });
  assert.notEqual(validateSettings(atLimits), atLimits);
});

test('surface position and source normal agree with independent cross partials', () => {
  const settings = { twist: 237, phase: -23, width: 1.7, light: 0.73 };
  const t = 0.37, v = -0.41;
  const sample = sampleSurface(settings, t, v);
  const theta = (settings.phase + settings.twist * t) * PI / 180;
  const a = settings.twist * PI / 180 / 6;
  const expectedPosition = [-3 + 6 * t, v * Math.cos(theta), v * Math.sin(theta)];
  const rx = [1, -v * a * Math.sin(theta), v * a * Math.cos(theta)];
  const rv = [0, Math.cos(theta), Math.sin(theta)];
  const expectedNormal = normalized(cross(rx, rv));
  assert.equal(sample.theta, theta);
  sample.position.forEach((value, i) => close(value, expectedPosition[i]));
  sample.normal.forEach((value, i) => close(value, expectedNormal[i]));
  assert.deepEqual(sample.projected, [expectedPosition[0], expectedPosition[1]]);
  assert.ok(Math.abs(Math.hypot(...sample.normal) - 1) < 2e-15);
  assert.equal(sample.face, 'front');
  close(sample.cosine, Math.abs(expectedNormal[2]));
  sample.linearRGB.forEach((channel, i) => close(channel, REFLECTANCE.front[i] * settings.light * Math.abs(expectedNormal[2])));
});

test('exact quarter turns and globally edge-on geometry use exact trigonometric values', () => {
  const sample = sampleSurface({ twist: 180, phase: 0, width: 1.2, light: 1 }, 0.5, 0.4);
  assert.equal(sample.theta, PI / 2);
  assert.equal(sample.position[1], 0);
  assert.equal(sample.position[2], 0.4);
  assert.equal(sample.cosine, 0);
  assert.equal(sample.face, 'edge');
  assert.deepEqual(sample.linearRGB, [0, 0, 0]);
  assert.deepEqual(sample.rgb, [0, 0, 0]);

  const edgeOn = constructTwistedBand({ twist: 0, phase: -90, width: 2, light: 1 });
  assert.equal(edgeOn.limits.edgeOn, true);
  assert.ok(edgeOn.silhouette.every(([, y]) => y === 0));
  assert.ok(edgeOn.cells.every((cell) => cell.sample.face === 'edge' && cell.sample.rgb.every((c) => c === 0)));
  const ordinary = constructTwistedBand({ twist: 0, phase: 90 - Number.EPSILON * 64, width: 2, light: 1 });
  assert.equal(ordinary.limits.edgeOn, false);
});

test('positive and negative twist reverse depth while preserving expected face progression', () => {
  const positive = sampleSurface({ twist: 180, phase: 0, width: 1, light: 0.8 }, 0.25, 0.4);
  const negative = sampleSurface({ twist: -180, phase: 0, width: 1, light: 0.8 }, 0.25, 0.4);
  assert.ok(positive.position[2] > 0);
  assert.ok(negative.position[2] < 0);
  assert.equal(positive.face, 'front');
  assert.equal(negative.face, 'front');
  close(positive.position[1], negative.position[1]);
  close(positive.normal[1], -negative.normal[1]);
  const back = sampleSurface({ twist: 360, phase: 0, width: 1, light: 0.8 }, 0.5, 0.4);
  assert.equal(back.face, 'back');
  assert.ok(back.linearRGB[0] > positive.linearRGB[0]);
});

test('critical front/back crossings become stations and do not lie inside any cell', () => {
  const settings = { twist: 133.9, phase: 0.1, width: 1.2, light: 0.8 };
  const model = constructTwistedBand(settings);
  const critical = crossings(settings);
  assert.equal(critical.length, 1);
  const tCross = critical[0];
  assert.ok(model.stations.includes(tCross));
  assert.ok(model.stations.length === 129 + critical.length);
  assert.ok(model.stations.every((t, i, values) => i === 0 || t > values[i - 1]));
  assert.ok(model.cells.every((cell) => !critical.some((t) => t > cell.t0 && t < cell.t1)));
  const crossingCells = model.cells.filter((cell) => cell.t0 === tCross || cell.t1 === tCross);
  assert.equal(crossingCells.length, 24);
  for (const cell of crossingCells) {
    const crossingIndices = cell.t0 === tCross ? [0, 3] : [1, 2];
    for (const index of crossingIndices) {
      assert.equal(cell.vertices[index][1], 0);
      const expectedV = index === 0 || index === 1 ? cell.v0 : cell.v1;
      assert.equal(cell.vertices[index][2], expectedV);
    }
  }
  // The exact critical t reconstructs to 90.00000000000001 degrees; public samples use exact equality only.
  assert.notEqual(settings.phase + settings.twist * tCross, 90);
  assert.equal(sampleSurface(settings, tCross, 0.4).face, 'back');
  assert.ok(model.cells.every((cell) => cell.sample.face !== 'edge'));
});

test('rows, cell order, vertices, silhouette, and output metadata match the contract', () => {
  const settings = { twist: -247, phase: 41, width: 1.6, light: 0.3 };
  const model = constructTwistedBand(settings);
  assert.equal(model.rows.length, 13);
  assert.equal(model.rows[0], -settings.width / 2);
  assert.equal(model.rows.at(-1), settings.width / 2);
  assert.equal(model.cells.length, (model.stations.length - 1) * 12);
  assert.deepEqual(model.viewBox, [-3.5, -1.6, 7, 3.2]);
  let cellIndex = 0;
  for (let i = 0; i < model.stations.length - 1; i += 1) {
    for (let j = 0; j < model.rows.length - 1; j += 1) {
      const cell = model.cells[cellIndex++];
      assert.equal(cell.t0, model.stations[i]);
      assert.equal(cell.t1, model.stations[i + 1]);
      assert.equal(cell.v0, model.rows[j]);
      assert.equal(cell.v1, model.rows[j + 1]);
      assert.equal(cell.vertices.length, 4);
      assert.deepEqual(cell.vertices[0], sampleSurface(settings, cell.t0, cell.v0).position);
      assert.deepEqual(cell.vertices[1], sampleSurface(settings, cell.t1, cell.v0).position);
      assert.deepEqual(cell.vertices[2], sampleSurface(settings, cell.t1, cell.v1).position);
      assert.deepEqual(cell.vertices[3], sampleSurface(settings, cell.t0, cell.v1).position);
      assert.deepEqual(cell.projected, cell.vertices.map(([x, y]) => [x, y]));
      assert.equal(cell.sample.t, (cell.t0 + cell.t1) / 2);
      assert.equal(cell.sample.v, (cell.v0 + cell.v1) / 2);
    }
  }
  const expectedOutline = [
    ...model.stations.map((t) => sampleSurface(settings, t, model.rows[0]).projected),
    ...[...model.stations].reverse().map((t) => sampleSurface(settings, t, model.rows.at(-1)).projected),
  ];
  assert.equal(model.silhouette.length, expectedOutline.length);
  model.silhouette.forEach((point, i) => point.forEach((value, axis) => close(value, expectedOutline[i][axis])));
  assert.ok(model.silhouette.flat().every(Number.isFinite));
  assert.ok(model.source.coordinateUnit.length > 0);
  assert.ok(model.source.model.includes('r(x,v)'));
  assert.ok(model.source.cellShade.includes('Analytical source normal'));
  assert.deepEqual(model.source.longitudinalDomain, { xStart: -3, xEnd: 3, length: 6 });
  assert.equal(model.source.width, settings.width);
  assert.equal(model.source.sampling.transverseRows, 13);
  assert.deepEqual(model.limits.camera.towardScene, [0, 0, -1]);
  assert.deepEqual(model.limits.light.incomingUnitVector, [0, 0, 1]);
  assert.deepEqual(model.limits.reflectance.front, REFLECTANCE.front);
  assert.deepEqual(model.limits.reflectance.back, REFLECTANCE.back);
  assert.equal(model.limits.reflectance.measuredMaterialData, false);
  assert.equal(model.limits.stationCount, model.stations.length);
  assert.equal(model.limits.rowCount, 13);
  assert.equal(model.limits.cellCount, model.cells.length);
  assert.deepEqual(JSON.parse(JSON.stringify(model.source)), model.source);
  assert.deepEqual(JSON.parse(JSON.stringify(model.limits)), model.limits);
  assert.equal(REFLECTANCE.front.length, 3);
  assert.equal(REFLECTANCE.back.length, 3);
});

test('Lambert output, zero/maximum light, and both sides of the sRGB threshold are explicit', () => {
  const noLight = sampleSurface({ twist: 0, phase: 0, width: 1.2, light: 0 }, 0.2, 0.3);
  assert.deepEqual(noLight.linearRGB, [0, 0, 0]);
  assert.deepEqual(noLight.rgb, [0, 0, 0]);
  const full = sampleSurface({ twist: 0, phase: 0, width: 1.2, light: 1 }, 0.2, 0);
  assert.deepEqual(full.linearRGB, REFLECTANCE.front);
  assert.deepEqual(full.rgb, REFLECTANCE.front.map((channel) => Math.round(255 * srgb(channel))));
  for (const multiplier of [1 - 1e-6, 1 + 1e-6]) {
    const light = 0.0031308 * multiplier / REFLECTANCE.front[0];
    const sample = sampleSurface({ twist: 0, phase: 0, width: 1.2, light }, 0.2, 0);
    assert.equal(sample.linearRGB[0] < 0.0031308, multiplier < 1);
    assert.equal(sample.rgb[0], Math.round(255 * srgb(sample.linearRGB[0])));
  }
});

test('malformed settings and out-of-domain surface coordinates are rejected', () => {
  const valid = { ...DEFAULT_SETTINGS };
  const badSettings = [
    null, [], { ...valid, extra: 1 }, { ...valid, twist: NaN }, { ...valid, phase: Infinity },
    { ...valid, width: 0.39 }, { ...valid, width: 2.01 }, { ...valid, light: -0.01 },
    { ...valid, twist: 361 }, { ...valid, phase: -91 }, { twist: 180, phase: 0, width: 1.2 },
    { ...valid, [Symbol('extra')]: true },
  ];
  for (const settings of badSettings) {
    assert.throws(() => validateSettings(settings));
    assert.throws(() => sampleSurface(settings, 0.5, 0));
    assert.throws(() => constructTwistedBand(settings));
  }
  assert.throws(() => validateSettings(Object.assign(Object.create({ inherited: true }), valid)));
  assert.throws(() => sampleSurface(valid, -Number.EPSILON, 0));
  assert.throws(() => sampleSurface(valid, 1 + Number.EPSILON, 0));
  assert.throws(() => sampleSurface(valid, 0.5, 0.6000000000001));
  assert.throws(() => sampleSurface(valid, 0.5, NaN));
  assert.throws(() => sampleSurface(valid, 0.5, '0'));
});

test('construction is deterministic and leaves settings untouched', () => {
  const settings = { twist: 272, phase: -46, width: 1.3, light: 0.66 };
  const before = { ...settings };
  const first = constructTwistedBand(settings);
  const second = constructTwistedBand(settings);
  assert.deepEqual(first, second);
  assert.deepEqual(settings, before);
  assert.deepEqual(first.settings, before);
  assert.ok(first.stations[0] === 0 && first.stations.at(-1) === 1);
});
