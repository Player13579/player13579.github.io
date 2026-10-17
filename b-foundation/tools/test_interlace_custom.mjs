import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
const TAU = 2 * Math.PI;
const H = 0.21;
const clone = (value) => JSON.parse(JSON.stringify(value));
const close = (actual, expected, tolerance = 2e-13) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};
const sourceX = (strand, y) => A * Math.sin((TAU * y) / P + (TAU * strand) / 3);
const mapPoint = ([x, y], sourceLength) => {
  const theta = (TAU * y) / sourceLength - Math.PI / 2;
  return [(RING_RADIUS + x) * Math.cos(theta), (RING_RADIUS + x) * Math.sin(theta)];
};
const serialize = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');

const oldOpen = await import(new URL(
  '../../../b-interlaced-bands-20261017/accepted-sources/interlace-geometry.mjs',
  import.meta.url,
));
const oldRingPath = new URL(
  '../../../b-interlaced-ring-20261017/accepted-sources/interlace-ring.mjs',
  import.meta.url,
);
const oldRingGeometryPath = new URL(
  '../../../b-interlaced-ring-20261017/inputs/interlace-geometry.mjs',
  import.meta.url,
);
const oldRingSource = await readFile(oldRingPath, 'utf8');
const oldRingImport = `from '${oldRingGeometryPath.href}'`;
const oldRingBoundSource = oldRingSource.replace("from './interlace-geometry.mjs'", oldRingImport);
assert.notEqual(oldRingBoundSource, oldRingSource, 'frozen ring snapshot must bind to its frozen geometry snapshot');
const oldRing = await import(`data:text/javascript;base64,${Buffer.from(oldRingBoundSource).toString('base64')}`);

function assertCrossingRolesEqual(actual, expected) {
  assert.equal(actual.index, expected.index);
  assert.deepEqual(actual.pair, expected.pair);
  assert.deepEqual(actual.point, expected.point);
  assert.equal(actual.over, expected.over);
  assert.equal(actual.under, expected.under);
}

function assertMasksFollowActualOver(model, svg, prefix) {
  const masks = [...svg.matchAll(new RegExp(`<mask id="${prefix}-mask-(\\d+)"[^>]*>(.*?)</mask>`, 'g'))];
  assert.equal(masks.length, 3);
  for (const [, strandText, content] of masks) {
    const strand = Number(strandText);
    const paths = [...content.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);
    const expected = model.crossings
      .filter((crossing) => crossing.under === strand)
      .map((crossing) => serialize(crossing.maskPoints));
    assert.deepEqual(paths, expected, `mask ${strand} must be regenerated from each actual over strand`);
  }
}

test('empty overrides preserve frozen open and ring model JSON and SVG bytes', () => {
  for (let periods = 1; periods <= 4; periods += 1) {
    for (const pattern of ['alternating', 'stacked']) {
      for (const invert of [false, true]) {
        for (const monochrome of [false, true]) {
          const settings = {
            ...DEFAULT_SETTINGS,
            periods,
            pattern,
            invert,
            monochrome,
            width: periods % 2 ? 0.08 : 0.18,
            clearance: invert ? 0.04 : 0,
          };
          assert.equal(
            JSON.stringify(constructInterlace(settings)),
            JSON.stringify(oldOpen.constructInterlace(settings)),
          );
          assert.equal(interlaceSvg(settings), oldOpen.interlaceSvg(settings));
          assert.equal(
            JSON.stringify(constructInterlaceRing(settings)),
            JSON.stringify(oldRing.constructInterlaceRing(settings)),
          );
          assert.equal(interlaceRingSvg(settings), oldRing.interlaceRingSvg(settings));
        }
      }
    }
  }
});

test('an empty explicit override array is byte-identical to omitting the optional argument', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 3, pattern: 'stacked', invert: true };
  assert.equal(JSON.stringify(constructInterlace(settings, [])), JSON.stringify(constructInterlace(settings)));
  assert.equal(interlaceSvg(settings, 'same-prefix', []), interlaceSvg(settings, 'same-prefix'));
  assert.equal(JSON.stringify(constructInterlaceRing(settings, [])), JSON.stringify(constructInterlaceRing(settings)));
  assert.equal(interlaceRingSvg(settings, 'same-prefix', []), interlaceRingSvg(settings, 'same-prefix'));
  assert.equal(constructInterlace(settings, []).version, 1);
  assert.equal(constructInterlaceRing(settings, []).version, 1);
});

test('individual overrides flip only the selected crossing relative to preset and inversion', () => {
  for (const pattern of ['alternating', 'stacked']) {
    for (const invert of [false, true]) {
      const settings = { ...DEFAULT_SETTINGS, periods: 2, pattern, invert };
      const base = constructInterlace(settings);
      const overrides = [7, 1];
      const model = constructInterlace(settings, overrides);
      assert.equal(model.version, 2);
      assert.deepEqual(model.crossingOverrides, [1, 7]);
      assert.deepEqual(overrides, [7, 1]);
      assert.deepEqual(model.settings, base.settings);
      assert.deepEqual(model.strands, base.strands);
      assert.deepEqual(model.viewBox, base.viewBox);
      assert.deepEqual(model.outputSize, base.outputSize);
      for (let i = 0; i < base.crossings.length; i += 1) {
        const before = base.crossings[i];
        const after = model.crossings[i];
        assert.equal(after.index, before.index);
        assert.deepEqual(after.pair, before.pair);
        assert.deepEqual(after.point, before.point);
        if (overrides.includes(i)) {
          assert.equal(after.over, before.under);
          assert.equal(after.under, before.over);
        } else {
          assert.equal(after.over, before.over);
          assert.equal(after.under, before.under);
        }
        assert.ok(after.maskPoints.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
        assert.ok(after.maskPoints.every(([x, y]) => Math.abs(x - sourceX(after.over, y)) < 2e-14));
      }
    }
  }
});

test('all 64 one-period override subsets work in both layouts, presets, and global inversions', () => {
  for (const pattern of ['alternating', 'stacked']) {
    for (const invert of [false, true]) {
      const settings = { ...DEFAULT_SETTINGS, periods: 1, pattern, invert };
      const baseOpen = constructInterlace(settings);
      const baseRing = constructInterlaceRing(settings);
      for (let bitset = 0; bitset < 64; bitset += 1) {
        const overrides = Array.from({ length: 6 }, (_, i) => i).filter((i) => bitset & (1 << i));
        const open = constructInterlace(settings, overrides);
        const ring = constructInterlaceRing(settings, overrides);
        assert.equal(open.version, overrides.length ? 2 : 1);
        assert.equal(ring.version, open.version);
        if (overrides.length) {
          assert.deepEqual(open.crossingOverrides, overrides);
          assert.deepEqual(ring.crossingOverrides, overrides);
        } else {
          assert.equal(Object.hasOwn(open, 'crossingOverrides'), false);
          assert.equal(Object.hasOwn(ring, 'crossingOverrides'), false);
        }
        assert.deepEqual(open.strands, baseOpen.strands);
        assert.deepEqual(ring.strands, baseRing.strands);
        for (let q = 0; q < 6; q += 1) {
          const expectedOver = overrides.includes(q) ? baseOpen.crossings[q].under : baseOpen.crossings[q].over;
          const expectedUnder = overrides.includes(q) ? baseOpen.crossings[q].over : baseOpen.crossings[q].under;
          assert.equal(open.crossings[q].over, expectedOver);
          assert.equal(open.crossings[q].under, expectedUnder);
          assert.equal(ring.crossings[q].over, expectedOver);
          assert.equal(ring.crossings[q].under, expectedUnder);
          assert.deepEqual(ring.crossings[q].point, mapPoint(open.crossings[q].point, P));
          assert.deepEqual(
            ring.crossings[q].maskPoints,
            open.crossings[q].maskPoints.map((point) => mapPoint(point, P)),
          );
        }
      }
    }
  }
});

test('open SVG masks remove the actual over strand at each custom crossing', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 3, pattern: 'alternating', invert: true };
  const overrides = [0, 4, 11, 17];
  const model = constructInterlace(settings, overrides);
  const svg = interlaceSvg(settings, 'custom-open', overrides);
  assert.match(svg, /<svg[^>]*width="640"/);
  assertMasksFollowActualOver(model, svg, 'custom-open');
});

test('ring SVG masks remove the mapped actual over strand at each custom crossing', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 4, pattern: 'stacked', invert: true, width: 0.18, clearance: 0.04 };
  const overrides = [0, 7, 12, 23];
  const model = constructInterlaceRing(settings, overrides);
  const svg = interlaceRingSvg(settings, 'custom-ring', overrides);
  assert.match(svg, /<svg[^>]*width="1024" height="1024"/);
  assertMasksFollowActualOver(model, svg, 'custom-ring');
});

test('ring custom masks and crossing roles are direct mappings of the overridden open model', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 2, pattern: 'alternating', invert: false };
  const overrides = [10, 2, 6];
  const open = constructInterlace(settings, overrides);
  const ring = constructInterlaceRing(settings, overrides);
  assert.equal(ring.version, open.version);
  assert.deepEqual(ring.crossingOverrides, open.crossingOverrides);
  assert.deepEqual(ring.strands.map(({ index, color }) => [index, color]), open.strands.map(({ index, color }) => [index, color]));
  for (let q = 0; q < open.crossings.length; q += 1) {
    const source = open.crossings[q];
    const mapped = ring.crossings[q];
    assert.equal(mapped.index, source.index);
    assert.deepEqual(mapped.pair, source.pair);
    assert.equal(mapped.over, source.over);
    assert.equal(mapped.under, source.under);
    assert.equal(mapped.sourceY, source.point[1]);
    assert.deepEqual(mapped.point, mapPoint(source.point, P * settings.periods));
    assert.deepEqual(mapped.maskPoints, source.maskPoints.map((point) => mapPoint(point, P * settings.periods)));
  }
});

test('adjacent and ring-seam overrides recompute neighboring masks from each selected over strand', () => {
  const cases = [
    { settings: { ...DEFAULT_SETTINGS, periods: 1, pattern: 'alternating' }, overrides: [0, 1], ring: false },
    { settings: { ...DEFAULT_SETTINGS, periods: 1, pattern: 'stacked', invert: true }, overrides: [0, 5], ring: true },
    { settings: { ...DEFAULT_SETTINGS, periods: 2, pattern: 'alternating', invert: true }, overrides: [0, 11], ring: true },
  ];
  for (const { settings, overrides, ring } of cases) {
    const base = constructInterlace(settings);
    const model = ring
      ? constructInterlaceRing(settings, overrides)
      : constructInterlace(settings, overrides);
    const svg = ring
      ? interlaceRingSvg(settings, 'adjacent-seam', overrides)
      : interlaceSvg(settings, 'adjacent-seam', overrides);
    for (const index of overrides) {
      const crossing = model.crossings[index];
      assert.equal(crossing.over, base.crossings[index].under);
      assert.equal(crossing.under, base.crossings[index].over);
      assert.ok(crossing.maskPoints.every((point) => point.every(Number.isFinite)));
    }
    assertMasksFollowActualOver(model, svg, 'adjacent-seam');
  }
});

test('overrides are copied, sorted, independent, and never mutate caller inputs', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 2 };
  const supplied = [8, 0, 4];
  const before = clone(supplied);
  const first = constructInterlace(settings, supplied);
  assert.deepEqual(supplied, before);
  assert.deepEqual(first.crossingOverrides, [0, 4, 8]);
  supplied[0] = 1;
  supplied.push(2);
  assert.deepEqual(first.crossingOverrides, [0, 4, 8]);
  const second = constructInterlace(settings, [8, 0, 4]);
  assert.notEqual(first.crossingOverrides, second.crossingOverrides);
  first.crossingOverrides[0] = 11;
  assert.deepEqual(second.crossingOverrides, [0, 4, 8]);
});

test('custom choices do not leak into later baseline models or exports', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 2, pattern: 'stacked', invert: true };
  const baselineOpen = constructInterlace(settings);
  const baselineRing = constructInterlaceRing(settings);
  const customOpen = constructInterlace(settings, [2, 9]);
  const customRing = constructInterlaceRing(settings, [2, 9]);
  assert.equal(customOpen.version, 2);
  assert.equal(customRing.version, 2);
  assert.equal(constructInterlace(settings).version, 1);
  assert.equal(constructInterlaceRing(settings).version, 1);
  assert.deepEqual(constructInterlace(settings), baselineOpen);
  assert.deepEqual(constructInterlaceRing(settings), baselineRing);
  assert.equal(interlaceSvg(settings).includes('crossingOverrides'), false);
  assert.equal(interlaceRingSvg(settings).includes('crossingOverrides'), false);
});

test('negative zero is normalized to the canonical crossing index zero', () => {
  const model = constructInterlace({ ...DEFAULT_SETTINGS, periods: 1 }, [-0]);
  assert.equal(model.crossingOverrides[0], 0);
  assert.equal(Object.is(model.crossingOverrides[0], -0), false);
  assert.throws(() => constructInterlace({ ...DEFAULT_SETTINGS, periods: 1 }, [0, -0]));
});

test('override inputs reject wrong containers, sparse/accessor arrays, extras, duplicates and invalid indices', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 1 };
  const sparse = Array(1);
  let getterCalled = false;
  const accessor = [0];
  Object.defineProperty(accessor, '0', {
    get() { getterCalled = true; return 0; },
    enumerable: true,
  });
  const withExtra = [0];
  withExtra.extra = true;
  const withSymbol = [0];
  withSymbol[Symbol('extra')] = true;
  const badPrototype = [0];
  Object.setPrototypeOf(badPrototype, Object.create(Array.prototype));
  for (const invalid of [
    null,
    {},
    '0',
    new Set([0]),
    new Uint8Array([0]),
    sparse,
    accessor,
    withExtra,
    withSymbol,
    badPrototype,
    [0, 0],
    [-1],
    [6],
    [1.5],
    ['1'],
    [NaN],
    [Infinity],
    [1n],
    [0, 1, 2, 3, 4, 5, 0],
  ]) {
    assert.throws(() => constructInterlace(settings, invalid), undefined, 'invalid override should be rejected');
    assert.throws(() => constructInterlaceRing(settings, invalid));
    assert.throws(() => interlaceSvg(settings, 'invalid-custom', invalid));
    assert.throws(() => interlaceRingSvg(settings, 'invalid-custom-ring', invalid));
  }
  assert.equal(getterCalled, false, 'validation must inspect descriptors without invoking accessors');
});

test('override validation reads no array elements through ordinary property access', () => {
  let getCount = 0;
  const proxied = new Proxy([0, 3], {
    get(target, property, receiver) {
      if (property === '0' || property === '1' || property === 'length') getCount += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  const model = constructInterlace({ ...DEFAULT_SETTINGS, periods: 1 }, proxied);
  assert.deepEqual(model.crossingOverrides, [0, 3]);
  assert.equal(getCount, 0);
});

test('override range follows the selected period count exactly', () => {
  const settings = { ...DEFAULT_SETTINGS, periods: 4 };
  const model = constructInterlace(settings, [23]);
  assert.equal(model.crossings.at(-1).index, 23);
  assert.deepEqual(model.crossingOverrides, [23]);
  assert.throws(() => constructInterlace({ ...settings, periods: 3 }, [18]));
  assert.throws(() => constructInterlace({ ...settings, periods: 1 }, Array(7).fill(0).map((_, i) => i)));
});

test('existing settings strictness remains active in custom open and ring paths', () => {
  let getterCalled = false;
  const accessor = { ...DEFAULT_SETTINGS };
  Object.defineProperty(accessor, 'width', {
    get() { getterCalled = true; return DEFAULT_SETTINGS.width; },
    enumerable: true,
  });
  for (const create of [constructInterlace, constructInterlaceRing]) {
    assert.throws(() => create(accessor, [0]));
    assert.throws(() => create({ ...DEFAULT_SETTINGS, extra: true }, [0]));
    assert.throws(() => create({ ...DEFAULT_SETTINGS, periods: 1 }, [6]));
  }
  assert.equal(getterCalled, false);
});

