import {
  DEFAULT_SETTINGS as BAND_DEFAULT_SETTINGS,
  constructBand,
  sharedViewBox as bandSharedViewBox,
} from './band-geometry.mjs';

const TAU = 2 * Math.PI;
const SETTINGS_KEYS = ['group', 'sectors', 'radius', 'tilt', 'orientation', 'seed'];
const BOUND_SCOPE = 'Exact-arithmetic Euclidean position bound propagated through orthogonal seed placements; excludes seed floating-point error, matrix/trigonometric/coordinate rounding, projection, rasterization, and perception; not an interval certificate.';

function clonePlainObject(value) {
  const clone = Object.create(Object.getPrototypeOf(value));
  for (const key of Reflect.ownKeys(value)) Object.defineProperty(clone, key, Object.getOwnPropertyDescriptor(value, key));
  return clone;
}

function finite(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  return value;
}

function checkedSettings(settings) {
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) throw new TypeError('settings must be a plain object');
  const prototype = Object.getPrototypeOf(settings);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('settings must be a plain object');
  const keys = Reflect.ownKeys(settings).sort();
  const expected = [...SETTINGS_KEYS].sort();
  if (keys.length !== expected.length || keys.some((key, i) => key !== expected[i])) {
    throw new TypeError('settings must contain exactly group, sectors, radius, tilt, orientation, seed');
  }
  const { group, sectors, radius, tilt, orientation, seed } = settings;
  if (group !== 'cyclic' && group !== 'dihedral') throw new RangeError('group must be cyclic or dihedral');
  if (!Number.isInteger(sectors) || sectors < 2 || sectors > 16) throw new RangeError('sectors must be an integer from 2 through 16');
  finite('radius', radius);
  if (radius < 0 || radius > 6) throw new RangeError('radius must be within 0 through 6');
  finite('tilt', tilt);
  if (tilt < -180 || tilt > 180) throw new RangeError('tilt must be within -180 through 180');
  finite('orientation', orientation);
  if (orientation < 0 || orientation > 360) throw new RangeError('orientation must be within 0 through 360');
  if (seed === null || typeof seed !== 'object' || Array.isArray(seed)) throw new TypeError('seed must be a plain object');
  const seedProto = Object.getPrototypeOf(seed);
  if (seedProto !== Object.prototype && seedProto !== null) throw new TypeError('seed must be a plain object');
  return { group, sectors, radius, tilt, orientation, seed: clonePlainObject(seed) };
}

function multiply2(a, b) {
  return [
    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
  ];
}

function rotation(angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[c, -s], [s, c]];
}

function checkedMatrix(matrix, name) {
  for (const row of matrix) for (const value of row) finite(name, value);
  return matrix;
}

function matrixVector(matrix, vector, name) {
  return [
    finite(`${name} x`, matrix[0][0] * vector[0] + matrix[0][1] * vector[1]),
    finite(`${name} y`, matrix[1][0] * vector[0] + matrix[1][1] * vector[1]),
  ];
}

function transformPoint(matrix, translation, point, name) {
  const rotated = matrixVector(matrix, point, name);
  return [
    finite(`${name} translated x`, rotated[0] + translation[0]),
    finite(`${name} translated y`, rotated[1] + translation[1]),
  ];
}

function transformArray(matrix, translation, points, name) {
  if (!Array.isArray(points)) throw new TypeError(`${name} must be an array`);
  return points.map((point, index) => {
    if (!Array.isArray(point) || point.length !== 2) throw new TypeError(`${name}[${index}] must be a coordinate pair`);
    finite(`${name}[${index}].x`, point[0]);
    finite(`${name}[${index}].y`, point[1]);
    return transformPoint(matrix, translation, point, `${name}[${index}]`);
  });
}

export const DEFAULT_SETTINGS = Object.freeze({
  group: 'dihedral',
  sectors: 6,
  radius: 0.5,
  tilt: 0,
  orientation: 0,
  seed: Object.freeze({ ...BAND_DEFAULT_SETTINGS }),
});

export const BASE_SETTINGS = Object.freeze({
  group: 'cyclic',
  sectors: 6,
  radius: 0.5,
  tilt: 0,
  orientation: 0,
  seed: Object.freeze({ ...BAND_DEFAULT_SETTINGS }),
});

export function constructRosette(settings, options = {}) {
  const normalized = checkedSettings(settings);
  if (options === null || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  const seedModel = constructBand(normalized.seed, options);
  const beta = normalized.tilt * Math.PI / 180;
  const phi = normalized.orientation * Math.PI / 180;
  const Rbeta = rotation(beta);
  const Rphi = rotation(phi);
  checkedMatrix(Rbeta, 'tilt matrix');
  checkedMatrix(Rphi, 'orientation matrix');
  const groupOrder = normalized.group === 'cyclic' ? normalized.sectors : 2 * normalized.sectors;
  const instances = [];
  for (let index = 0; index < groupOrder; index += 1) {
    const reflected = normalized.group === 'dihedral' && index >= normalized.sectors;
    const sector = reflected ? index - normalized.sectors : index;
    const angle = TAU * sector / normalized.sectors;
    const Rsector = rotation(angle);
    const groupMatrix = reflected
      ? multiply2(Rsector, [[1, 0], [0, -1]])
      : Rsector;
    checkedMatrix(groupMatrix, 'group matrix');
    const matrix = checkedMatrix(multiply2(multiply2(Rphi, groupMatrix), Rbeta), 'total matrix');
    const placement = matrixVector(multiply2(Rphi, groupMatrix), [normalized.radius, 0], 'world translation');
    const instance = {
      index,
      sector,
      reflected,
      groupMatrix: groupMatrix.map((row) => row.slice()),
      matrix: matrix.map((row) => row.slice()),
      translation: placement,
      points: transformArray(matrix, placement, seedModel.points, 'points'),
      leftPoints: transformArray(matrix, placement, seedModel.leftPoints, 'leftPoints'),
      rightPoints: transformArray(matrix, placement, seedModel.rightPoints, 'rightPoints'),
      polygon: transformArray(matrix, placement, seedModel.polygon, 'polygon'),
    };
    instances.push(instance);
  }
  return {
    settings: {
      group: normalized.group,
      sectors: normalized.sectors,
      radius: normalized.radius,
      tilt: normalized.tilt,
      orientation: normalized.orientation,
      seed: { ...normalized.seed },
    },
    seed: seedModel,
    instances,
    instanceCount: groupOrder,
    groupOrder,
    bounds: { ...seedModel.bounds, scope: BOUND_SCOPE },
    globalOverlap: 'not_checked',
    distinctMotifs: 'not_checked',
  };
}

export function sharedViewBox(models) {
  if (!Array.isArray(models) || models.length === 0) throw new TypeError('models must be a nonempty array');
  const flattened = [];
  for (const model of models) {
    if (!model || !Array.isArray(model.instances) || model.instances.length === 0) throw new TypeError('each model must contain instances');
    for (const instance of model.instances) {
      if (!instance || !Array.isArray(instance.polygon)) throw new TypeError('each instance must contain a polygon');
      flattened.push({ polygon: instance.polygon });
    }
  }
  return bandSharedViewBox(flattened);
}
