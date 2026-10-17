const SETTING_KEYS = ['method', 'count', 'seed'];

function plainObject(name, value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be a plain object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${name} must be a plain object`);
}

function validateSettings(settings) {
  plainObject('settings', settings);
  const keys = Reflect.ownKeys(settings);
  if (keys.length !== SETTING_KEYS.length || keys.some((key) => typeof key !== 'string' || !SETTING_KEYS.includes(key))) {
    throw new TypeError('settings must contain exactly method, count, seed');
  }
  const { method, count, seed } = settings;
  if (method !== 'uniform' && method !== 'best-candidate') throw new RangeError('method must be uniform or best-candidate');
  if (!Number.isInteger(count) || count < 8 || count > 128) throw new RangeError('count must be an integer from 8 through 128');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('seed must be an unsigned 32-bit integer');
  return { method, count, seed };
}

function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function candidate(random) {
  return [random(), random()];
}

function nearestSquared(point, points) {
  let nearest = Infinity;
  for (const other of points) {
    const dx = point[0] - other[0];
    const dy = point[1] - other[1];
    const squared = dx * dx + dy * dy;
    if (squared < nearest) nearest = squared;
  }
  return nearest;
}

function place(settings) {
  const random = createRandom(settings.seed);
  const points = [candidate(random)];
  while (points.length < settings.count) {
    if (settings.method === 'uniform') {
      points.push(candidate(random));
      continue;
    }
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < 32; i += 1) {
      const current = candidate(random);
      const score = nearestSquared(current, points);
      if (score > bestScore) {
        best = current;
        bestScore = score;
      }
    }
    points.push(best);
  }
  return points;
}

function metrics(points) {
  const nearestDistances = [];
  let minimumSquaredDistance = Infinity;
  let closestPair = [0, 1];
  for (let i = 0; i < points.length; i += 1) {
    let nearestSquaredDistance = Infinity;
    for (let j = 0; j < points.length; j += 1) {
      if (i === j) continue;
      const dx = points[i][0] - points[j][0];
      const dy = points[i][1] - points[j][1];
      const squared = dx * dx + dy * dy;
      if (squared < nearestSquaredDistance) nearestSquaredDistance = squared;
      if (j > i && squared < minimumSquaredDistance) {
        minimumSquaredDistance = squared;
        closestPair = [i, j];
      }
    }
    nearestDistances.push(Math.sqrt(nearestSquaredDistance));
  }
  const meanNearestDistance = nearestDistances.reduce((sum, distance) => sum + distance, 0) / points.length;
  const minimumDistance = Math.sqrt(minimumSquaredDistance);
  if (!Number.isFinite(minimumDistance) || !Number.isFinite(meanNearestDistance) || nearestDistances.some((d) => !Number.isFinite(d))) {
    throw new RangeError('point distance metric exceeds finite range');
  }
  return { nearestDistances, minimumDistance, meanNearestDistance, closestPair };
}

export const DEFAULT_SETTINGS = Object.freeze({ method: 'best-candidate', count: 64, seed: 1 });
export const BASE_SETTINGS = Object.freeze({ method: 'uniform', count: 64, seed: 1 });

export function constructLayout(settings) {
  const normalized = validateSettings(settings);
  const points = place(normalized);
  const measured = metrics(points);
  return {
    algorithmRevision: 1,
    settings: { ...normalized },
    points,
    ...measured,
    selection: {
      method: normalized.method,
      candidatesPerPoint: normalized.method === 'best-candidate' ? 32 : 1,
      prefixStable: true,
    },
    domain: {
      xMin: 0,
      xMax: 1,
      yMin: 0,
      yMax: 1,
      upperExclusive: true,
      axes: 'x_right_y_down',
      metric: 'euclidean_nonperiodic',
    },
    guarantees: {
      count: 'exact',
      minimumDistance: 'measured_not_prescribed',
      coverage: 'not_certified',
      spectral: 'not_checked',
      tileability: 'not_guaranteed',
      beauty: 'not_checked',
    },
  };
}
