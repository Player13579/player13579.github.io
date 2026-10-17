import { constructBand } from './band-geometry.mjs';
import { constructRepeat } from './curve-repeat-geometry.mjs';

const SEED_KEYS = ['kind', 'bandSettings', 'size'];
const DIAMOND = [[-0.12, 0], [0, -0.055], [0.12, 0], [0, 0.055]];
const MAX_FILE_BYTES = 1048576;
const SOURCE_BOUND_SCOPE = 'Scaled source-band quadrature/interpolation only for the chosen fixed sampled-polygon normalization; excludes normalization sensitivity, repetition root error, floating-point rounding, projection, rasterization, overlap, and perception.';

export const DEFAULT_SEED = Object.freeze({ kind: 'diamond', bandSettings: null, size: 0.24 });

function plainObject(name, value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be a plain object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${name} must be a plain object`);
}

function finite(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}

function normalizeSeed(seed) {
  plainObject('seed', seed);
  const keys = Reflect.ownKeys(seed);
  if (keys.length !== SEED_KEYS.length || keys.some((key) => typeof key !== 'string' || !SEED_KEYS.includes(key))) {
    throw new TypeError('seed must contain exactly kind, bandSettings, and size');
  }
  const { kind, bandSettings, size } = seed;
  if (kind !== 'diamond' && kind !== 'band') throw new RangeError('seed kind must be diamond or band');
  finite('seed size', size);
  if (size < 0.1 || size > 0.8) throw new RangeError('seed size must be within 0.1 through 0.8');
  if (kind === 'diamond') {
    if (bandSettings !== null) throw new TypeError('diamond seed bandSettings must be null');
    return { seed: { kind, bandSettings: null, size }, bandModel: null };
  }
  if (bandSettings === null || typeof bandSettings !== 'object' || Array.isArray(bandSettings)) {
    throw new TypeError('band seed must contain bandSettings');
  }
  const bandModel = constructBand(bandSettings);
  return { seed: { kind, bandSettings: { ...bandModel.settings }, size }, bandModel };
}

export function parseBandSeed(input) {
  if (typeof input !== 'string') throw new TypeError('band JSON must be a string');
  if (new TextEncoder().encode(input).byteLength > MAX_FILE_BYTES) throw new RangeError('band JSON exceeds 1048576 UTF-8 bytes');
  let text = input;
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  if (text.trim() === '') throw new SyntaxError('band JSON is empty');
  const document = JSON.parse(text);
  plainObject('band JSON root', document);
  if (document.version !== 1) throw new RangeError('band JSON version must be 1');
  if (document.kind !== 'planar_band_geometry') throw new RangeError('band JSON kind is unsupported');
  return { ...constructBand(document.settings).settings };
}

function sourceGeometry(seed, bandModel) {
  if (seed.kind === 'diamond') return { polygon: DIAMOND.map((point) => point.slice()), bandModel: null };
  return { polygon: bandModel.polygon.map((point) => point.slice()), bandModel };
}

function transformPoint(point, scale, anchor, angle, center) {
  const x = (point[0] - anchor[0]) * scale;
  const y = (point[1] - anchor[1]) * scale;
  const c = Math.cos(angle), s = Math.sin(angle);
  const result = [c * x - s * y + center[0], s * x + c * y + center[1]];
  if (!result.every(Number.isFinite)) throw new RangeError('transformed seed polygon exceeds finite numeric range');
  return result;
}

function normalizePolygon(polygon, size) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const point of polygon) {
    if (!Array.isArray(point) || point.length !== 2) throw new TypeError('source polygon points must have two coordinates');
    finite('source polygon x', point[0]);
    finite('source polygon y', point[1]);
    minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]);
    minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]);
  }
  const width = maxX - minX, height = maxY - minY;
  if (![width, height].every(Number.isFinite)) throw new RangeError('source polygon extent exceeds finite numeric range');
  const extent = Math.max(width, height);
  if (!(extent > 0)) throw new RangeError('source polygon must have positive extent');
  const anchor = [(minX + maxX) / 2, (minY + maxY) / 2];
  const scale = size / extent;
  if (!(scale > 0) || !Number.isFinite(scale)) throw new RangeError('source normalization scale is unsupported');
  const normalizedPolygon = polygon.map((point) => {
    const normalized = [(point[0] - anchor[0]) * scale, (point[1] - anchor[1]) * scale];
    if (!normalized.every(Number.isFinite)) throw new RangeError('normalized source polygon exceeds finite numeric range');
    return normalized;
  });
  return {
    sourceBox: { minX, maxX, minY, maxY, width, height },
    anchor,
    scale,
    normalizedPolygon,
  };
}

export function constructSeedRepeat(repeatSettings, seed) {
  const { seed: normalizedSeed, bandModel: validatedBandModel } = normalizeSeed(seed);
  const repeatModel = constructRepeat(repeatSettings);
  const { polygon: sourcePolygon, bandModel } = sourceGeometry(normalizedSeed, validatedBandModel);
  const normalized = normalizePolygon(sourcePolygon, normalizedSeed.size);
  const marks = repeatModel.marks.map((mark) => ({
    ...mark,
    polygon: normalized.normalizedPolygon.map((point) => transformPoint(
      point, 1, [0, 0], mark.orientationAngle, mark.point,
    )),
  }));
  return {
    ...repeatModel,
    marks,
    seed: {
      ...normalizedSeed,
      sourceBox: normalized.sourceBox,
      anchor: normalized.anchor,
      scale: normalized.scale,
      sourcePolygon,
      normalizedPolygon: normalized.normalizedPolygon.map((point) => point.slice()),
      sourceApproximation: bandModel === null ? null : {
        bounds: { ...bandModel.bounds },
        scale: normalized.scale,
        scope: SOURCE_BOUND_SCOPE,
      },
    },
  };
}
