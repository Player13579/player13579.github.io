import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_SETTINGS, constructInterlace, interlaceSvg } from '../labs/interlace-geometry.mjs';

const A = 0.6;
const P = 3;
const N = 256;
const H = 0.21;
const PALETTE = ['#147d78', '#b87625', '#b34c64'];
const PAIRS = [[0, 1], [1, 2], [0, 2]];
const clone = (value) => JSON.parse(JSON.stringify(value));
const xAt = (strand, y) => A * Math.sin((2 * Math.PI * y) / P + (2 * Math.PI * strand) / 3);
const close = (actual, expected, tolerance = 2e-14) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test('defaults are exact and immutable', () => {
  assert.deepEqual(DEFAULT_SETTINGS, {
    periods: 2,
    width: 0.14,
    clearance: 0.025,
    pattern: 'alternating',
    invert: false,
    monochrome: false,
  });
  assert.equal(Object.isFrozen(DEFAULT_SETTINGS), true);
  assert.throws(() => { DEFAULT_SETTINGS.periods = 3; }, TypeError);
});

test('default model has three finite open centerlines, six crossings per period, and declared bounds', () => {
  const model = constructInterlace();
  assert.equal(model.version, 1);
  assert.equal(model.kind, 'interlaced_band_diagram');
  assert.deepEqual(model.settings, DEFAULT_SETTINGS);
  assert.deepEqual(model.constants, {
    amplitude: A,
    period: P,
    samplesPerPeriod: N,
    crossingMaskHalfWindow: H,
  });
  assert.deepEqual(model.viewBox, [-0.9, -0.3, 1.8, 6.6]);
  assert.deepEqual(model.outputSize, { width: 640, height: 2347 });
  assert.equal(model.strands.length, 3);
  assert.equal(model.crossings.length, 12);
  assert.equal(model.approximation.uniformSamplesPerPeriod, N);
  assert.equal(model.approximation.analyticCrossingYIncluded, true);
  close(model.approximation.maximumUniformYStep, P / N);
  close(model.approximation.centerlineChordPositionBound, (A * (2 * Math.PI) ** 2) / (8 * N ** 2), 1e-18);
  assert.match(model.approximation.boundScope, /厳密算術上/);
  assert.match(model.approximation.boundScope, /ラスター化、知覚/);
  assert.match(model.approximation.diagramScope, /物理挙動/);
  for (const strand of model.strands) {
    assert.deepEqual(strand.color, PALETTE[strand.index]);
    assert.ok(strand.points.length >= N * model.settings.periods + 1);
    assert.ok(strand.points.every((point) => point.length === 2 && point.every(Number.isFinite)));
    assert.ok(strand.points.every((point, index, all) => index === 0 || point[1] > all[index - 1][1]));
    close(strand.points[0][1], 0);
    close(strand.points.at(-1)[1], P * model.settings.periods);
  }
});

test('analytic crossing sequence, center coordinates, and transverse pair geometry are correct for every supported period', () => {
  for (let periods = 1; periods <= 4; periods += 1) {
    const model = constructInterlace({ ...DEFAULT_SETTINGS, periods });
    assert.equal(model.crossings.length, 6 * periods);
    for (let q = 0; q < model.crossings.length; q += 1) {
      const crossing = model.crossings[q];
      const y = (2 * q + 1) / 4;
      const expectedPair = PAIRS[q % 3];
      assert.equal(crossing.index, q);
      assert.deepEqual(crossing.pair, expectedPair);
      close(crossing.point[1], y, 0);
      close(crossing.point[0], (q % 2 === 0 ? 1 : -1) * A / 2, 0);
      for (const strand of expectedPair) {
        const sampled = model.strands[strand].points.find((point) => point[1] === y);
        assert.ok(sampled, `strand ${strand} omits analytic crossing y=${y}`);
        close(sampled[0], crossing.point[0]);
      }
      for (const strand of model.strands) {
        assert.ok(strand.points.some((point) => point[1] === y), `strand ${strand.index} omits analytic crossing y=${y}`);
      }
      const third = [0, 1, 2].find((strand) => !expectedPair.includes(strand));
      assert.ok(Math.abs(xAt(third, y) - crossing.point[0]) > 0.1);
      const omega = (2 * Math.PI) / P;
      const slopeA = A * omega * Math.cos(omega * y + (2 * Math.PI * expectedPair[0]) / 3);
      const slopeB = A * omega * Math.cos(omega * y + (2 * Math.PI * expectedPair[1]) / 3);
      assert.ok(Math.abs(slopeA - slopeB) > 1);
    }
  }
});

test('alternating roles cycle through all three strands and alternate at each strand', () => {
  const model = constructInterlace({ ...DEFAULT_SETTINGS, periods: 4 });
  for (const strand of model.strands) {
    const events = model.crossings.filter((crossing) => crossing.pair.includes(strand.index));
    assert.ok(events.length > 1);
    for (let i = 1; i < events.length; i += 1) assert.notEqual(events[i].over, events[i - 1].over);
  }
  assert.deepEqual(model.crossings.slice(0, 3).map(({ over, under }) => [over, under]), [[0, 1], [1, 2], [2, 0]]);
});

test('stacked roles use the lower strand index as over and are globally orderable', () => {
  const model = constructInterlace({ ...DEFAULT_SETTINGS, pattern: 'stacked' });
  for (const crossing of model.crossings) {
    assert.equal(crossing.over, Math.min(...crossing.pair));
    assert.equal(crossing.under, Math.max(...crossing.pair));
  }
  const above = new Set(model.crossings.map(({ over, under }) => `${over}>${under}`));
  assert.deepEqual([...above], ['0>1', '1>2', '0>2']);
});

test('alternating roles cannot be represented by one global depth order', () => {
  const model = constructInterlace({ ...DEFAULT_SETTINGS, periods: 1 });
  const edges = new Set(model.crossings.slice(0, 3).map(({ over, under }) => `${over}>${under}`));
  assert.ok(edges.has('0>1'));
  assert.ok(edges.has('1>2'));
  assert.ok(edges.has('2>0'));
  assert.equal(edges.has('0>2'), false);
});

test('pattern changes only local over/under construction, retaining centerlines and palette', () => {
  const alternating = constructInterlace({ ...DEFAULT_SETTINGS, pattern: 'alternating' });
  const stacked = constructInterlace({ ...DEFAULT_SETTINGS, pattern: 'stacked' });
  assert.deepEqual(stacked.strands.map(({ points }) => points), alternating.strands.map(({ points }) => points));
  assert.deepEqual(stacked.strands.map(({ color }) => color), alternating.strands.map(({ color }) => color));
  assert.notDeepEqual(stacked.crossings.map(({ over, under }) => [over, under]), alternating.crossings.map(({ over, under }) => [over, under]));
});

test('invert swaps roles without changing crossing locations or centerlines', () => {
  const normal = constructInterlace({ ...DEFAULT_SETTINGS, periods: 3 });
  const inverted = constructInterlace({ ...DEFAULT_SETTINGS, periods: 3, invert: true });
  assert.deepEqual(inverted.strands.map(({ points }) => points), normal.strands.map(({ points }) => points));
  for (let i = 0; i < normal.crossings.length; i += 1) {
    const a = normal.crossings[i], b = inverted.crossings[i];
    assert.deepEqual(b.pair, a.pair);
    assert.deepEqual(b.point, a.point);
    assert.equal(b.over, a.under);
    assert.equal(b.under, a.over);
  }
});

test('monochrome changes only colors and leaves all geometry and local masks intact', () => {
  const color = constructInterlace({ ...DEFAULT_SETTINGS, periods: 3 });
  const mono = constructInterlace({ ...DEFAULT_SETTINGS, periods: 3, monochrome: true });
  assert.deepEqual(mono.strands.map(({ points }) => points), color.strands.map(({ points }) => points));
  assert.deepEqual(mono.crossings, color.crossings);
  assert.deepEqual(mono.strands.map(({ color: value }) => value), [PALETTE[0], PALETTE[0], PALETTE[0]]);
});

test('each local mask contains the analytic crossing, endpoints, and over-strand samples at bounded spacing', () => {
  const model = constructInterlace({ ...DEFAULT_SETTINGS, periods: 4, pattern: 'alternating', invert: true });
  const maxStep = P / N;
  for (const crossing of model.crossings) {
    const points = crossing.maskPoints;
    const [x, y] = crossing.point;
    assert.ok(points.length >= 3);
    assert.deepEqual(points[Math.floor(points.length / 2)][1], y);
    close(points[0][1], y - H, 0);
    close(points.at(-1)[1], y + H, 0);
    for (let i = 0; i < points.length; i += 1) {
      close(points[i][0], xAt(crossing.over, points[i][1]));
      if (i > 0) assert.ok(points[i][1] - points[i - 1][1] <= maxStep);
    }
    close(points[Math.floor(points.length / 2)][0], x, 2e-14);
  }
});

test('maximum-period geometry stays finite and within the fixed resource contract', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 4 };
  const model = constructInterlace(settings);
  const svg = interlaceSvg(settings, 'maximum-period');
  assert.equal(model.crossings.length, 24);
  assert.equal(model.strands.length, 3);
  assert.equal(model.outputSize.width, 640);
  assert.equal(model.outputSize.height, 4480);
  assert.ok(model.strands.flatMap(({ points }) => points).flat().every(Number.isFinite));
  assert.ok(svg.length < 1_000_000);
});

test('settings boundaries are accepted without clamping and caller objects are unchanged', () => {
  const input = { ...DEFAULT_SETTINGS, periods: 1, width: 0.08, clearance: 0 };
  const before = clone(input);
  assert.equal(constructInterlace(input).crossings.length, 6);
  assert.deepEqual(input, before);
  const upper = { ...DEFAULT_SETTINGS, periods: 4, width: 0.18, clearance: 0.04 };
  assert.equal(constructInterlace(upper).crossings.length, 24);
});

test('settings require exactly six own data properties on a plain or null-prototype object', () => {
  const valid = { ...DEFAULT_SETTINGS };
  const inherited = Object.create({ extra: true });
  Object.assign(inherited, valid);
  const nullPrototype = Object.assign(Object.create(null), valid);
  assert.equal(constructInterlace(nullPrototype).crossings.length, 12);
  for (const invalid of [null, [], 'settings', 12, inherited, { ...valid, extra: 1 }]) {
    assert.throws(() => constructInterlace(invalid));
  }
  const missing = { ...valid };
  delete missing.monochrome;
  assert.throws(() => constructInterlace(missing));
  const symbolKey = { ...valid, [Symbol('extra')]: true };
  assert.throws(() => constructInterlace(symbolKey));
  let getterCalled = false;
  const accessor = { ...valid };
  Object.defineProperty(accessor, 'width', { get() { getterCalled = true; return 0.14; }, enumerable: true });
  assert.throws(() => constructInterlace(accessor));
  assert.equal(getterCalled, false);
});

test('invalid values are rejected rather than coerced or clamped', () => {
  const cases = [
    [{ periods: 0 }, 'range'],
    [{ periods: 5 }, 'range'],
    [{ periods: 2.5 }, 'range'],
    [{ periods: '2' }, 'type'],
    [{ width: 0.079 }, 'range'],
    [{ width: 0.181 }, 'range'],
    [{ width: NaN }, 'finite'],
    [{ width: Infinity }, 'finite'],
    [{ clearance: -0.001 }, 'range'],
    [{ clearance: 0.041 }, 'range'],
    [{ clearance: NaN }, 'finite'],
    [{ pattern: 'crossed' }, 'enum'],
    [{ invert: 1 }, 'boolean'],
    [{ monochrome: 'false' }, 'boolean'],
  ];
  for (const [change] of cases) assert.throws(() => constructInterlace({ ...DEFAULT_SETTINGS, ...change }));
});

test('each constructed model is independent and does not alias settings or another result', () => {
  const input = { ...DEFAULT_SETTINGS };
  const first = constructInterlace(input);
  const second = constructInterlace(input);
  assert.notEqual(first, second);
  assert.notEqual(first.settings, input);
  assert.notEqual(first.strands, second.strands);
  first.strands[0].points[0][0] = 99;
  first.crossings[0].pair[0] = 2;
  assert.notEqual(second.strands[0].points[0][0], 99);
  assert.deepEqual(second.crossings[0].pair, [0, 1]);
  assert.deepEqual(input, DEFAULT_SETTINGS);
});

test('SVG is self-contained, transparent, prefixed uniquely, and draws exactly three masked strands', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 2, clearance: 0.025 };
  const first = interlaceSvg(settings, 'preview-one');
  const second = interlaceSvg(settings, 'preview-two');
  assert.match(first, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(first, /maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" mask-type="luminance"/);
  assert.match(first, /viewBox="-0\.9 -0\.3 1\.8 6\.6"/);
  assert.equal((first.match(/data-strand=/g) ?? []).length, 3);
  assert.equal((first.match(/<mask /g) ?? []).length, 3);
  assert.equal((first.match(/<rect /g) ?? []).length, 3);
  assert.equal((first.match(/<path /g) ?? []).length, 15);
  assert.doesNotMatch(first, /<image|<filter|linearGradient|radialGradient|<text|background=/);
  const ids = [...first.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const refs = [...first.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, 3);
  assert.equal(ids.every((id) => id.startsWith('preview-one-')), true);
  assert.equal(refs.length, 3);
  assert.equal(refs.every((id) => ids.includes(id)), true);
  assert.doesNotMatch(second, /preview-one-/);
  assert.match(second, /preview-two-mask-0/);
  for (const strand of [0, 1, 2]) {
    assert.match(first, new RegExp(`data-strand="${strand}"[^>]*stroke="${PALETTE[strand]}"[^>]*mask="url\\(#preview-one-mask-${strand}\\)"`));
  }
});

test('each SVG mask removes only the matching under strand along its local over-strand crossing segments', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 3, pattern: 'alternating', invert: true };
  const model = constructInterlace(settings);
  const svg = interlaceSvg(settings, 'local-mask');
  const masks = [...svg.matchAll(/<mask id="local-mask-mask-(\d+)"[^>]*>(.*?)<\/mask>/g)];
  assert.equal(masks.length, 3);
  const serialize = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  for (const [, indexText, content] of masks) {
    const index = Number(indexText);
    const actualPaths = [...content.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);
    const expectedPaths = model.crossings
      .filter((crossing) => crossing.under === index)
      .map((crossing) => serialize(crossing.maskPoints));
    assert.deepEqual(actualPaths, expectedPaths);
  }
});

test('SVG construction rejects unsafe prefixes and never accepts a precomputed model', () => {
  for (const prefix of ['', '1bad', 'x" onload="alert(1)', 'a'.repeat(33), null, 1]) {
    assert.throws(() => interlaceSvg(DEFAULT_SETTINGS, prefix));
  }
  const model = constructInterlace();
  assert.throws(() => interlaceSvg({ ...DEFAULT_SETTINGS, model }));
});
