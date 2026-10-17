import { DEFAULT_SETTINGS as ROSETTE_DEFAULT_SETTINGS, constructRosette } from './rosette-geometry.mjs';

const POSE_KEYS = ['projection', 'tilt', 'roll', 'distance'];
const SOURCE_FILL = '#147d78';

export const DEFAULT_POSE = Object.freeze({ projection: 'perspective', tilt: 60, roll: 0, distance: 3 });
export const BASELINE_POSE = Object.freeze({ projection: 'perspective', tilt: 0, roll: 0, distance: 3 });
export const VIEW_BOX = Object.freeze([-2.3, -2.3, 4.6, 4.6]);
export const MAX_SOURCE_BYTES = 8388608;

function cloneData(value) {
  if (Array.isArray(value)) return value.map(cloneData);
  if (value && typeof value === 'object') {
    const copy = {};
    for (const [key, item] of Object.entries(value)) copy[key] = cloneData(item);
    return copy;
  }
  return value;
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

export const DEFAULT_SOURCE_SETTINGS = deepFreeze(cloneData(ROSETTE_DEFAULT_SETTINGS));

function plainObject(name, value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be a plain object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${name} must be a plain object`);
}

function finite(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}

export function validatePose(pose) {
  plainObject('pose', pose);
  const keys = Reflect.ownKeys(pose);
  if (keys.length !== POSE_KEYS.length || keys.some((key) => typeof key !== 'string' || !POSE_KEYS.includes(key))) {
    throw new TypeError('pose must contain exactly projection, tilt, roll, and distance');
  }
  const { projection, tilt, roll, distance } = pose;
  if (projection !== 'perspective' && projection !== 'orthographic') throw new RangeError('projection must be perspective or orthographic');
  finite('tilt', tilt);
  finite('roll', roll);
  finite('distance', distance);
  if (tilt < -80 || tilt > 80) throw new RangeError('tilt must be within -80 through 80 degrees');
  if (roll < -180 || roll > 180) throw new RangeError('roll must be within -180 through 180 degrees');
  if (distance < 2 || distance > 8) throw new RangeError('distance must be within 2 through 8');
  return { projection, tilt, roll, distance };
}

export function parseRosetteSource(text) {
  if (typeof text !== 'string') throw new TypeError('source JSON must be a string');
  if (new TextEncoder().encode(text).byteLength > MAX_SOURCE_BYTES) throw new RangeError('source JSON exceeds 8388608 UTF-8 bytes');
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  if (text.trim() === '') throw new SyntaxError('source JSON is empty');
  const document = JSON.parse(text);
  plainObject('source JSON root', document);
  if (document.version !== 1) throw new RangeError('source JSON version must be 1');
  if (document.kind !== 'radial_band_arrangement') throw new RangeError('source JSON kind is unsupported');
  if (!Object.prototype.hasOwnProperty.call(document, 'settings')) throw new TypeError('source JSON settings are required');
  return cloneData(constructRosette(document.settings).settings);
}

function worldPoint(u, v, basis) {
  return [
    u * basis.u[0] + v * basis.v[0],
    u * basis.u[1] + v * basis.v[1],
    u * basis.u[2] + v * basis.v[2],
  ];
}

function homographyPoint(matrix, point) {
  const [u, v] = point;
  const xh = matrix[0][0] * u + matrix[0][1] * v + matrix[0][2];
  const yh = matrix[1][0] * u + matrix[1][1] * v + matrix[1][2];
  const wh = matrix[2][0] * u + matrix[2][1] * v + matrix[2][2];
  if (!(wh > 0)) throw new RangeError('homogeneous projection is outside the positive camera half-space');
  const projected = [xh / wh, yh / wh];
  if (!projected.every(Number.isFinite)) throw new RangeError('projected coordinate exceeds finite numeric range');
  return projected;
}

function explicitProjection(point, pose) {
  if (pose.projection === 'orthographic') return [point[0], point[1]];
  const depth = pose.distance - point[2];
  if (!(depth > 0) || !Number.isFinite(depth)) throw new RangeError('point is outside the positive camera half-space');
  const projected = [pose.distance * point[0] / depth, pose.distance * point[1] / depth];
  if (!projected.every(Number.isFinite)) throw new RangeError('projected coordinate exceeds finite numeric range');
  return projected;
}

function scaledApproximation(bounds, scale) {
  return {
    quadrature: bounds.quadrature * scale,
    interpolation: bounds.interpolation * scale,
    position: bounds.position * scale,
    scope: 'Inherited source-polyline position bound scaled by the chosen positive uniform bbox normalization; excludes normalization sensitivity, projection, rasterization, and perception; not an interval certificate.',
  };
}

function sourceMetadata(sourceModel, normalization) {
  return {
    kind: 'radial_band_arrangement',
    reconstruction: 'Rebuilt from validated source settings using constructRosette; saved coordinates and bounds are ignored.',
    coordinates: 'Original motif plane coordinates are normalized by its all-instance axis-aligned bounding box and one positive uniform scale.',
    normalization: 'BBox center is not an area centroid; normalized points lie in [-1,1]^2 and preserve source-plane ratios.',
    normalizationValues: {
      anchor: normalization.anchor.slice(),
      scale: normalization.scale,
      sourceMaxEdge: normalization.maxEdge,
    },
    sourcePolylineApproximation: cloneData(sourceModel.bounds),
    normalizedPolylineApproximation: scaledApproximation(sourceModel.bounds, normalization.scale),
    selectedDisplay: { fill: SOURCE_FILL, opacity: 1 },
    colorAndMaterial: 'The selected opaque teal is a display choice; no material response is modeled.',
  };
}

function limitsMetadata(pose, sourceModel, normalization) {
  const projectedRadiusBound = pose.projection === 'perspective' ? 2 : Math.SQRT2;
  return {
    poseDomain: { tiltDegrees: [-80, 80], rollDegrees: [-180, 180], distance: [2, 8], projections: ['perspective', 'orthographic'] },
    camera: {
      projection: pose.projection,
      position: [0, 0, pose.distance],
      forward: [0, 0, -1],
      focal: pose.distance,
      note: 'Perspective focal distance changes with camera distance to keep the reference-plane center scale f/d=1; not a fixed-focal-length zoom.',
    },
    plane: 'Zero-thickness mathematical plane; no thickness, material, illumination, force, support, or cloth model.',
    projection: 'Ideal pinhole perspective or orthographic projection; no focus, blur, exposure, or clipping/horizon cases in the selected domain.',
    normalizedSourceRadiusBound: Math.SQRT2,
    conservativeMinimumCameraDepth: pose.distance - Math.SQRT2,
    projectedRadiusBound,
    viewBox: [...VIEW_BOX],
    sourceApproximation: scaledApproximation(sourceModel.bounds, normalization.scale),
    imageMetricCaveat: 'Perspective projection does not generally preserve image lengths, angles, areas, or parallelism.',
    perceptualClaim: 'No perception or beauty guarantee.',
  };
}

export function constructPlanarProjection(pose, sourceSettings) {
  const normalizedPose = validatePose(pose);
  const sourceModel = constructRosette(sourceSettings);
  const normalizedSourceSettings = cloneData(sourceModel.settings);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const instance of sourceModel.instances) {
    for (const point of instance.polygon) {
      finite('source x', point[0]);
      finite('source y', point[1]);
      minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]);
    }
  }
  const width = maxX - minX, height = maxY - minY;
  if (![width, height].every(Number.isFinite)) throw new RangeError('source bounds exceed finite numeric range');
  const maxEdge = Math.max(width, height);
  if (!(maxEdge > 0)) throw new RangeError('source arrangement must have positive extent');
  const anchor = [(minX + maxX) / 2, (minY + maxY) / 2];
  const scale = 2 / maxEdge;
  const normalization = { anchor, scale, maxEdge, bounds: { minX, maxX, minY, maxY } };

  const alpha = normalizedPose.tilt * Math.PI / 180;
  const beta = normalizedPose.roll * Math.PI / 180;
  const ca = Math.cos(alpha), sa = Math.sin(alpha), cb = Math.cos(beta), sb = Math.sin(beta);
  const basis = {
    u: [cb, sb, 0],
    v: [-ca * sb, ca * cb, sa],
    normal: [sa * sb, -sa * cb, ca],
  };

  const d = normalizedPose.distance;
  const homography = normalizedPose.projection === 'perspective'
    ? [[d * cb, -d * ca * sb, 0], [d * sb, d * ca * cb, 0], [0, -sa, d]]
    : [[cb, -ca * sb, 0], [sb, ca * cb, 0], [0, 0, 1]];

  const instances = sourceModel.instances.map((instance) => {
    const sourcePolygon = instance.polygon.map((point) => point.slice());
    const normalizedPolygon = sourcePolygon.map(([x, y]) => [(x - anchor[0]) * scale, (y - anchor[1]) * scale]);
    const worldPolygon = normalizedPolygon.map(([u, v]) => worldPoint(u, v, basis));
    const projectedPolygon = normalizedPolygon.map((point) => homographyPoint(homography, point));
    for (const point of [...normalizedPolygon, ...worldPolygon, ...projectedPolygon]) {
      if (!point.every(Number.isFinite)) throw new RangeError('geometry contains a non-finite coordinate');
    }
    return {
      index: instance.index,
      sector: instance.sector,
      reflected: instance.reflected,
      sourcePolygon,
      normalizedPolygon,
      worldPolygon,
      projectedPolygon,
    };
  });

  const normalizedCorners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const worldCorners = normalizedCorners.map(([u, v]) => worldPoint(u, v, basis));
  const projectedCorners = normalizedCorners.map((point) => homographyPoint(homography, point));
  const camera = { position: [0, 0, d], forward: [0, 0, -1], focal: d, projection: normalizedPose.projection };
  return {
    pose: normalizedPose,
    sourceSettings: normalizedSourceSettings,
    normalization,
    basis,
    camera,
    homography,
    instances,
    plane: { normalizedCorners, worldCorners, projectedCorners },
    viewBox: [...VIEW_BOX],
    source: sourceMetadata(sourceModel, normalization),
    limits: limitsMetadata(normalizedPose, sourceModel, normalization),
  };
}
