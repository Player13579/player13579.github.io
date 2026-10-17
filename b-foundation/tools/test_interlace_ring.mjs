import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_SETTINGS,
  constructInterlace,
  interlaceSvg,
} from '../labs/interlace-geometry.mjs';
import {
  RING_RADIUS,
  constructInterlaceRing,
  interlaceRingSvg,
} from '../labs/interlace-ring.mjs';

const A = 0.6;
const P = 3;
const N = 256;
const H = 0.21;
const PALETTE = ['#147d78', '#b87625', '#b34c64'];
const PAIRS = [[0, 1], [1, 2], [0, 2]];
const clone = (value) => JSON.parse(JSON.stringify(value));
const close = (actual, expected, tolerance = 2e-13) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const sourceX = (strand, y) => A * Math.sin((2 * Math.PI * y) / P + (2 * Math.PI * strand) / 3);
const sourceSlope = (strand, y) => A * (2 * Math.PI / P) * Math.cos((2 * Math.PI * y) / P + (2 * Math.PI * strand) / 3);
const mapPoint = ([x, y], L) => {
  const theta = 2 * Math.PI * y / L - Math.PI / 2;
  return [(RING_RADIUS + x) * Math.cos(theta), (RING_RADIUS + x) * Math.sin(theta)];
};
const chordBound = (periods) => {
  const h = P / N;
  const omega = 2 * Math.PI / P;
  const kappa = 2 * Math.PI / (P * periods);
  return h * h / 8 * (A * omega * omega + (RING_RADIUS + A) * kappa * kappa + 2 * A * omega * kappa);
};

test('ring defaults, construction metadata, view and bounded approximation are explicit', () => {
  const model = constructInterlaceRing();
  assert.equal(RING_RADIUS, 3);
  assert.equal(model.version, 1);
  assert.equal(model.kind, 'interlaced_band_ring');
  assert.deepEqual(model.settings, DEFAULT_SETTINGS);
  assert.deepEqual(model.constants, {
    amplitude: A,
    period: P,
    samplesPerPeriod: N,
    crossingMaskHalfWindow: H,
  });
  assert.deepEqual(model.ringConstruction, {
    radius: 3,
    sourceLength: 6,
    angularRate: Math.PI / 3,
    startAngle: -Math.PI / 2,
    mapping: 'theta=2*pi*y/sourceLength-pi/2; (x,y) maps to ((radius+x)*cos(theta),(radius+x)*sin(theta))',
  });
  assert.deepEqual(model.viewBox, [-3.9, -3.9, 7.8, 7.8]);
  assert.deepEqual(model.outputSize, { width: 1024, height: 1024 });
  close(model.approximation.maximumUniformYStep, P / N, 0);
  close(model.approximation.centerlineChordPositionBound, chordBound(2), 1e-18);
  assert.match(model.approximation.boundScope, /厳密算術上/);
  assert.match(model.approximation.boundScope, /浮動小数点/);
  assert.match(model.approximation.diagramScope, /長さ・面積・曲率・角度は保存しない/);
  assert.match(model.approximation.diagramScope, /結び目分類/);
});

test('all periods map every source sample and close with a fresh exact copy of the first vertex', () => {
  for (let periods = 1; periods <= 4; periods += 1) {
    const settings = { ...DEFAULT_SETTINGS, periods };
    const source = constructInterlace(settings);
    const model = constructInterlaceRing(settings);
    const sourceLength = P * periods;
    assert.equal(model.ringConstruction.sourceLength, sourceLength);
    assert.equal(model.strands.length, 3);
    for (const strand of model.strands) {
      const original = source.strands[strand.index].points;
      assert.equal(strand.closed, true);
      assert.equal(strand.points.length, original.length);
      assert.ok(strand.points.every((point) => point.length === 2 && point.every(Number.isFinite)));
      for (const i of [0, 1, Math.floor(original.length / 3), original.length - 2]) {
        const expected = mapPoint(original[i], sourceLength);
        close(strand.points[i][0], expected[0]);
        close(strand.points[i][1], expected[1]);
      }
      assert.deepEqual(strand.points.at(-1), strand.points[0]);
      assert.notEqual(strand.points.at(-1), strand.points[0]);
      assert.notEqual(strand.points.at(-1)[0], original.at(-1)[0]);
    }
  }
});

test('mapped crossings retain source event identity, sourceY, pair roles and colors', () => {
  for (let periods = 1; periods <= 4; periods += 1) {
    const settings = { ...DEFAULT_SETTINGS, periods };
    const source = constructInterlace(settings);
    const ring = constructInterlaceRing(settings);
    assert.equal(ring.crossings.length, 6 * periods);
    assert.deepEqual(ring.strands.map((strand) => strand.color), PALETTE);
    for (let q = 0; q < source.crossings.length; q += 1) {
      const before = source.crossings[q];
      const after = ring.crossings[q];
      assert.equal(after.index, q);
      assert.deepEqual(after.pair, PAIRS[q % 3]);
      assert.equal(after.over, before.over);
      assert.equal(after.under, before.under);
      assert.equal(after.sourceY, before.point[1]);
      const expected = mapPoint(before.point, P * periods);
      close(after.point[0], expected[0]);
      close(after.point[1], expected[1]);
    }
  }
});

test('every pair crossing is transverse after the positive-radius polar mapping', () => {
  for (let periods = 1; periods <= 4; periods += 1) {
    const model = constructInterlaceRing({ ...DEFAULT_SETTINGS, periods });
    const rate = model.ringConstruction.angularRate;
    assert.ok(RING_RADIUS - A > 0);
    for (const crossing of model.crossings) {
      const [a, b] = crossing.pair;
      const y = crossing.sourceY;
      const x = sourceX(a, y);
      close(x, sourceX(b, y));
      const theta = rate * y - Math.PI / 2;
      const ra = RING_RADIUS + x;
      const slopeDelta = sourceSlope(a, y) - sourceSlope(b, y);
      const determinant = -ra * rate * slopeDelta;
      assert.ok(Math.abs(determinant) > 1, `crossing ${crossing.index} is not transverse`);
      const third = [0, 1, 2].find((i) => !crossing.pair.includes(i));
      assert.ok(Math.abs(sourceX(third, y) - x) > 0.1);
      assert.ok(Number.isFinite(theta));
    }
  }
});

test('alternating over-under roles alternate around each closed strand including last-to-first', () => {
  const model = constructInterlaceRing({ ...DEFAULT_SETTINGS, periods: 4 });
  for (const strand of model.strands) {
    const events = model.crossings.filter((crossing) => crossing.pair.includes(strand.index));
    assert.ok(events.length > 1);
    for (let i = 0; i < events.length; i += 1) {
      const current = events[i];
      const next = events[(i + 1) % events.length];
      assert.notEqual(current.over === strand.index, next.over === strand.index,
        `strand ${strand.index} fails to alternate between events ${current.index} and ${next.index}`);
    }
  }
});

test('pattern, inversion and monochrome alter only local roles/colors, not ring geometry', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 3 };
  const alternate = constructInterlaceRing({ ...settings, pattern: 'alternating' });
  const stacked = constructInterlaceRing({ ...settings, pattern: 'stacked' });
  assert.deepEqual(stacked.strands.map((s) => s.points), alternate.strands.map((s) => s.points));
  assert.deepEqual(stacked.crossings.map((c) => c.point), alternate.crossings.map((c) => c.point));
  assert.notDeepEqual(stacked.crossings.map((c) => [c.over, c.under]), alternate.crossings.map((c) => [c.over, c.under]));
  const inverted = constructInterlaceRing({ ...settings, invert: true });
  for (let i = 0; i < alternate.crossings.length; i += 1) {
    assert.equal(inverted.crossings[i].over, alternate.crossings[i].under);
    assert.equal(inverted.crossings[i].under, alternate.crossings[i].over);
    assert.deepEqual(inverted.crossings[i].point, alternate.crossings[i].point);
  }
  const mono = constructInterlaceRing({ ...settings, monochrome: true });
  assert.deepEqual(mono.strands.map((s) => s.points), alternate.strands.map((s) => s.points));
  assert.deepEqual(mono.crossings, alternate.crossings);
  assert.deepEqual(mono.strands.map((s) => s.color), [PALETTE[0], PALETTE[0], PALETTE[0]]);
});

test('local masks map exact source over-segments and stay inside the source domain', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 4, invert: true };
  const source = constructInterlace(settings);
  const ring = constructInterlaceRing(settings);
  for (let q = 0; q < ring.crossings.length; q += 1) {
    const actual = ring.crossings[q];
    const original = source.crossings[q];
    for (let i = 0; i < actual.maskPoints.length; i += 1) {
      const expected = mapPoint(original.maskPoints[i], 12);
      close(actual.maskPoints[i][0], expected[0], 1e-14);
      close(actual.maskPoints[i][1], expected[1], 1e-14);
    }
    assert.ok(actual.sourceY - H >= 0.04);
    assert.ok(actual.sourceY + H <= 12 - 0.04);
    assert.ok(actual.maskPoints.length >= 3);
    assert.ok(actual.maskPoints.every((point) => point.every(Number.isFinite)));
  }
});

test('boundaries for width and clearance preserve finite positive-radius ring geometry', () => {
  for (const settings of [
    { ...DEFAULT_SETTINGS, periods: 1, width: 0.08, clearance: 0 },
    { ...DEFAULT_SETTINGS, periods: 4, width: 0.18, clearance: 0.04 },
  ]) {
    const model = constructInterlaceRing(settings);
    const svg = interlaceRingSvg(settings);
    assert.ok(model.strands.flatMap((s) => s.points).flat().every(Number.isFinite));
    assert.ok(model.strands.flatMap((s) => s.points).every(([x, y]) => Math.hypot(x, y) >= RING_RADIUS - A - 1e-12));
    assert.equal(model.crossings.length, 6 * settings.periods);
    assert.ok(svg.length < 1_000_000);
  }
});

test('settings delegate unchanged strict exact-six validation, do not mutate input, and model results do not alias', () => {
  const input = { ...DEFAULT_SETTINGS };
  const before = clone(input);
  const first = constructInterlaceRing(input);
  const second = constructInterlaceRing(input);
  assert.deepEqual(input, before);
  assert.notEqual(first, second);
  assert.notEqual(first.strands, second.strands);
  assert.notEqual(first.strands[0].points, second.strands[0].points);
  assert.notEqual(first.crossings[0].pair, second.crossings[0].pair);
  first.strands[0].points[0][0] = 99;
  first.strands[0].points.at(-1)[0] = 88;
  first.crossings[0].maskPoints[0][0] = 77;
  first.settings.periods = 4;
  assert.notEqual(second.strands[0].points[0][0], 99);
  assert.notEqual(second.strands[0].points.at(-1)[0], 88);
  assert.notEqual(second.crossings[0].maskPoints[0][0], 77);
  assert.equal(second.settings.periods, 2);
  const accessor = { ...DEFAULT_SETTINGS };
  Object.defineProperty(accessor, 'width', { get() { throw new Error('must not run'); }, enumerable: true });
  assert.throws(() => constructInterlaceRing(accessor));
  assert.throws(() => constructInterlaceRing({ ...DEFAULT_SETTINGS, extra: true }));
  assert.throws(() => constructInterlaceRing({ ...DEFAULT_SETTINGS, periods: 5 }));
});

test('SVG is transparent, square, self-contained, prefix-safe, with three closed masked paths', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 2 };
  const first = interlaceRingSvg(settings, 'ring-one');
  const second = interlaceRingSvg(settings, 'ring-two');
  assert.match(first, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(first, /width="1024" height="1024" viewBox="-3\.9 -3\.9 7\.8 7\.8"/);
  assert.match(first, /maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" mask-type="luminance" x="-3\.9" y="-3\.9" width="7\.8" height="7\.8"/);
  assert.equal((first.match(/<mask /g) ?? []).length, 3);
  assert.equal((first.match(/<rect /g) ?? []).length, 3);
  const drawPaths = [...first.matchAll(/<path data-strand="(\d+)" d="([^"]+)"[^>]*stroke="([^"]+)"[^>]*mask="url\(#([^)]*)\)"\/>/g)];
  assert.equal(drawPaths.length, 3);
  assert.ok(drawPaths.every(([, , d]) => d.endsWith(' Z')));
  assert.ok(drawPaths.every(([, , , , mask]) => mask.startsWith('ring-one-mask-')));
  const ids = [...first.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const refs = [...first.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
  assert.equal(refs.length, 3);
  assert.ok(refs.every((ref) => ids.includes(ref)));
  assert.doesNotMatch(first, /<image|<filter|linearGradient|radialGradient|<text|background=/);
  assert.doesNotMatch(second, /ring-one-/);
  assert.match(second, /ring-two-mask-0/);
});

test('SVG masks contain only local over-strand mapped segments for their matching under strand', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 3, pattern: 'alternating', invert: true, width: 0.18, clearance: 0.04 };
  const model = constructInterlaceRing(settings);
  const svg = interlaceRingSvg(settings, 'mask-check');
  const masks = [...svg.matchAll(/<mask id="mask-check-mask-(\d+)"[^>]*>(.*?)<\/mask>/g)];
  assert.equal(masks.length, 3);
  const serialize = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  for (const [, indexText, content] of masks) {
    const index = Number(indexText);
    const actualPaths = [...content.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
    const expected = model.crossings.filter((c) => c.under === index).map((c) => serialize(c.maskPoints));
    assert.deepEqual(actualPaths, expected);
    assert.ok(content.includes(`stroke-width="${settings.width + 2 * settings.clearance}"`));
  }
});

test('invalid prefixes and untrusted model-like settings are rejected', () => {
  for (const prefix of ['', '1bad', 'x" onload="alert(1)', 'a'.repeat(33), null, 1]) {
    assert.throws(() => interlaceRingSvg(DEFAULT_SETTINGS, prefix));
  }
  const model = constructInterlaceRing();
  assert.throws(() => interlaceRingSvg({ ...DEFAULT_SETTINGS, model }));
  assert.throws(() => interlaceRingSvg({ ...DEFAULT_SETTINGS, width: NaN }));
});


