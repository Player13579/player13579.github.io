const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const FieldStatic = require('../webgpu-field-static.js');
const stationMap = require(path.resolve(__dirname, '../../../../../../data/map-station-v302.json'));

// Frozen copy of createGeometryMask before the row-difference optimization.
// Keep this independent of the production function so the exact r8 result is
// checked against the pre-change pixel-by-pixel interior accumulation.
function originalAreas(map) {
  return [...map.rooms, ...map.corridors.flatMap(c =>
    Array.isArray(c.renderSegments) && c.renderSegments.length ? c.renderSegments : [c]), ...map.doors];
}

function createGeometryMaskReference(map) {
  if (!Number.isInteger(map.width) || !Number.isInteger(map.height) || map.width <= 0 || map.height <= 0)
    throw Error('Invalid map geometry');
  const width = map.width, height = map.height, samples = 16, edges = [];
  for (const a of originalAreas(map)) {
    const points = Array.isArray(a.polygon) && a.polygon.length >= 3 ? a.polygon :
      [[a.x, a.y], [a.x + a.w, a.y], [a.x + a.w, a.y + a.h], [a.x, a.y + a.h]];
    for (let i = 0; i < points.length; i++) {
      const p = points[i], q = points[(i + 1) % points.length];
      if (![p[0], p[1], q[0], q[1]].every(x => typeof x === 'number' && Number.isFinite(x)))
        throw Error('Invalid map geometry');
      if (p[1] === q[1]) continue;
      edges.push({ x: p[0], y: p[1], minimum: Math.min(p[1], q[1]), maximum: Math.max(p[1], q[1]),
        slope: (q[0] - p[0]) / (q[1] - p[1]), winding: q[1] > p[1] ? 1 : -1 });
    }
  }
  const coverage = new Uint16Array(width * height), intersections = [];
  const addSpan = (row, left, right) => {
    let first = Math.max(0, Math.ceil(left * samples - .5));
    const last = Math.min(width * samples, Math.ceil(right * samples - .5));
    if (first >= last) return;
    const firstPixel = Math.floor(first / samples), lastPixel = Math.floor((last - 1) / samples);
    if (firstPixel === lastPixel) { coverage[row + firstPixel] += last - first; return; }
    coverage[row + firstPixel] += samples - first % samples;
    for (let pixel = firstPixel + 1; pixel < lastPixel; pixel++) coverage[row + pixel] += samples;
    coverage[row + lastPixel] += ((last - 1) % samples) + 1;
  };
  for (let subY = 0; subY < height * samples; subY++) {
    const y = (subY + .5) / samples, row = Math.floor(subY / samples) * width;
    intersections.length = 0;
    for (const edge of edges) if (y >= edge.minimum && y < edge.maximum)
      intersections.push({ x: edge.x + (y - edge.y) * edge.slope, winding: edge.winding });
    intersections.sort((a, b) => a.x - b.x);
    let winding = 0, start = 0;
    for (const crossing of intersections) {
      if (winding !== 0) addSpan(row, start, crossing.x);
      winding += crossing.winding; start = crossing.x;
    }
  }
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < coverage.length; i++) alpha[i] = Math.round(coverage[i] * 255 / (samples * samples));
  return alpha;
}

function rectangle(x, y, w, h) { return { x, y, w, h }; }
function polygon(points) { return { polygon: points }; }
function reversed(points) { return points.slice().reverse(); }
function makeMap(width, height, { rooms = [], corridors = [], doors = [] } = {}) {
  return { width, height, rooms, corridors, doors };
}
function digest(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function assertSameMask(label, map) {
  const expected = createGeometryMaskReference(map);
  const actual = FieldStatic.createGeometryMask(map);
  assert.equal(actual.length, expected.length, `${label}: output length`);
  assert.ok(Buffer.from(actual).equals(Buffer.from(expected)), `${label}: optimized bytes differ from original`);
  const hash = digest(expected);
  assert.equal(digest(actual), hash, `${label}: output hash`);
  console.log(`exact ${label}: ${map.width}x${map.height} sha256=${hash}`);
}

const rectPoints = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// Wide interiors exercise the optimized path; endpoints retain partial sample counts.
assertSameMask('wide rectangles', makeMap(61, 37, {
  rooms: [rectangle(1.125, 1.25, 57.5, 34.5), rectangle(9.0625, 7.3125, 38.125, 19.875)]
}));

// Fractional slopes cross clipped edges and sample-center boundaries.
assertSameMask('fractional clipped polygons', makeMap(43, 29, {
  rooms: [polygon([[-4.75, 1.0625], [21.4375, -3.25], [49.125, 9.6875], [33.3125, 32.5], [2.125, 23.9375]])],
  doors: [rectangle(38.1875, 4.4375, 12.5, 17.125)]
}));

// Reversing contour winding must preserve a single contour and cancel opposite-wound overlap
// according to the original nonzero rule. Multiple room/corridor/door regions share row diffs.
const outer = rectPoints(2.125, 2.25, 40.5, 29.5);
const innerReverse = reversed(rectPoints(13.1875, 10.3125, 18.25, 12.75));
assertSameMask('reversed winding and opposite-wound overlap', makeMap(47, 37, {
  rooms: [polygon(reversed(outer)), polygon(innerReverse)],
  corridors: [{ x: 0, y: 0, w: 0, h: 0, renderSegments: [
    polygon(rectPoints(-5.5, 15.25, 23.75, 8.5)),
    polygon(rectPoints(28.125, -2.75, 25.5, 10.125))
  ] }],
  doors: [polygon([[18.5, 1.1875], [27.8125, 1.1875], [29.4375, 5.5], [17.125, 5.5]])]
}));

// Extremely small extents, horizontal edges, clipping on each side, and empty geometry.
assertSameMask('small clipped and empty maps', makeMap(1, 1, {
  rooms: [rectangle(-3.5, -.5, 7.25, 2.25)]
}));
assertSameMask('empty mask', makeMap(7, 5));
assertSameMask('sample-center boundary', makeMap(32, 18, {
  rooms: [polygon([[-1, 1 / 32], [31.4375, 1 / 32], [31.4375, 17.9375], [-1, 17.9375]])]
}));

for (const invalid of [makeMap(0, 1), makeMap(1.5, 3), makeMap(2, 2, { rooms: [polygon([[0, 0], [NaN, 1], [1, 0]])] })]) {
  assert.throws(() => createGeometryMaskReference(invalid), /Invalid map geometry/);
  assert.throws(() => FieldStatic.createGeometryMask(invalid), /Invalid map geometry/);
}

// Full authored station map, including all rooms, corridor render segments and doors.
const runtimeGeometry = {
  width: stationMap.width,
  height: stationMap.height,
  rooms: stationMap.rooms,
  corridors: stationMap.corridors,
  doors: stationMap.doors
};
const stationReference = createGeometryMaskReference(runtimeGeometry);
const stationOptimized = FieldStatic.createGeometryMask(runtimeGeometry);
const stationHash = digest(stationReference);
assert.ok(Buffer.from(stationOptimized).equals(Buffer.from(stationReference)),
  'station map mask must be byte-for-byte identical');
assert.equal(digest(stationOptimized), stationHash);
console.log(`exact station ${stationMap.id}: ${stationMap.width}x${stationMap.height} sha256=${stationHash}`);

function benchmark(fn, rounds = 3) {
  const ms = [], hashes = [];
  for (let i = 0; i < rounds; i++) {
    const start = performance.now();
    const result = fn(runtimeGeometry);
    ms.push(performance.now() - start);
    hashes.push(digest(result));
  }
  assert.ok(hashes.every(hash => hash === stationHash), 'benchmark output hash must match exact station mask');
  return { ms, medianMs: [...ms].sort((a, b) => a - b)[Math.floor(ms.length / 2)], hash: hashes[0] };
}

// Same Node process, same map, three runs per version; source and output hashes are logged.
const before = benchmark(createGeometryMaskReference);
const after = benchmark(FieldStatic.createGeometryMask);
console.log(`station benchmark same-process original=${before.ms.map(x => x.toFixed(1)).join(',')}ms median=${before.medianMs.toFixed(1)}ms hash=${before.hash}`);
console.log(`station benchmark same-process optimized=${after.ms.map(x => x.toFixed(1)).join(',')}ms median=${after.medianMs.toFixed(1)}ms hash=${after.hash}`);
console.log(`station benchmark median speedup=${(before.medianMs / after.medianMs).toFixed(2)}x`);

