const SETTING_KEYS = ['spacing', 'orientation', 'rise', 'count', 'angle'];
const MARK_SHAPE = [[-0.12, 0], [0, -0.055], [0.12, 0], [0, 0.055]];
const BOUND_SCOPE = 'Exact-arithmetic Euclidean deviation of the source quadratic from its 128-segment interpolation; excludes floating-point rounding, arclength inversion, glyph geometry, projection, rasterization and perception; not an interval certificate.';

function finite(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}

function plainObject(name, value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be a plain object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${name} must be a plain object`);
}

function validateSettings(settings) {
  plainObject('settings', settings);
  const keys = Reflect.ownKeys(settings);
  if (keys.length !== SETTING_KEYS.length || keys.some((key) => typeof key !== 'string' || !SETTING_KEYS.includes(key))) {
    throw new TypeError('settings must contain exactly spacing, orientation, rise, count, angle');
  }
  const { spacing, orientation, rise, count, angle } = settings;
  if (spacing !== 'arc' && spacing !== 'parameter') throw new RangeError('spacing must be arc or parameter');
  if (orientation !== 'tangent' && orientation !== 'fixed') throw new RangeError('orientation must be tangent or fixed');
  finite('rise', rise);
  if (rise < -3 || rise > 3 || (rise !== 0 && Math.abs(rise) < 0.05)) {
    throw new RangeError('rise must be zero or have magnitude from 0.05 through 3');
  }
  if (!Number.isInteger(count) || count < 3 || count > 32) throw new RangeError('count must be an integer from 3 through 32');
  finite('angle', angle);
  if (angle < -90 || angle > 90) throw new RangeError('angle must be within -90 through 90 degrees');
  return { spacing, orientation, rise, count, angle };
}

function checked(name, value) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} exceeds finite numeric range`);
  return value;
}

function profileF(u, rise) {
  if (rise === 0) return 6 * u;
  const q = 2 * Math.abs(rise) / 3;
  const qu = q * u;
  const inside = u * Math.hypot(1, qu) + Math.asinh(qu) / q;
  return checked('arc primitive', 3 * inside);
}

function arcAt(t, rise) {
  if (rise === 0) return 6 * t;
  if (t === 0) return 0;
  if (t === 1) return profileF(1, rise);
  const total = profileF(1, rise);
  return checked('arc coordinate', (total - profileF(1 - 2 * t, rise)) / 2);
}

function pointAt(t, rise) {
  return [checked('curve x', 6 * t), checked('curve y', 4 * rise * t * (1 - t))];
}

function tangentAt(t, rise) {
  if (rise === 0) return 0;
  return Math.atan2(4 * rise * (1 - 2 * t), 6);
}

function arcParameter(target, total, rise) {
  if (target === 0) return { t: 0, bracketWidth: 0 };
  if (target === total) return { t: 1, bracketWidth: 0 };
  if (target === total / 2) return { t: 0.5, bracketWidth: 0 };
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 48; i += 1) {
    const mid = lo + (hi - lo) / 2;
    if (arcAt(mid, rise) < target) lo = mid;
    else hi = mid;
  }
  const t = lo + (hi - lo) / 2;
  return { t, bracketWidth: hi - lo };
}

function rotateAndTranslate(point, angle, origin) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const x = point[0] * c - point[1] * s + origin[0];
  const y = point[0] * s + point[1] * c + origin[1];
  return [checked('glyph x', x), checked('glyph y', y)];
}

function glyphPolygon(point, orientation) {
  return MARK_SHAPE.map((vertex) => rotateAndTranslate(vertex, orientation, point));
}

function distance(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export const DEFAULT_SETTINGS = Object.freeze({ spacing: 'arc', orientation: 'tangent', rise: 2, count: 12, angle: 0 });
export const BASE_SETTINGS = Object.freeze({ spacing: 'parameter', orientation: 'tangent', rise: 2, count: 12, angle: 0 });

export function constructRepeat(settings) {
  const normalized = validateSettings(settings);
  const { spacing, orientation, rise, count, angle } = normalized;
  const totalLength = rise === 0 ? 6 : profileF(1, rise);
  const marks = [];
  for (let i = 0; i < count; i += 1) {
    const target = spacing === 'arc'
      ? (i === 0 ? 0 : i === count - 1 ? totalLength : totalLength * i / (count - 1))
      : null;
    let t;
    let bracketWidth;
    if (spacing === 'parameter') {
      t = i / (count - 1);
      bracketWidth = 0;
    } else if (rise === 0) {
      t = i / (count - 1);
      bracketWidth = 0;
    } else {
      ({ t, bracketWidth } = arcParameter(target, totalLength, rise));
    }
    const s = arcAt(t, rise);
    const point = pointAt(t, rise);
    const tangentAngle = tangentAt(t, rise);
    const orientationAngle = (orientation === 'tangent' ? tangentAngle : 0) + angle * Math.PI / 180;
    const arcResidual = spacing === 'arc' ? s - target : null;
    marks.push({
      t,
      s,
      point,
      tangentAngle,
      orientationAngle,
      polygon: glyphPolygon(point, orientationAngle),
      arcResidual,
      bracketWidth: spacing === 'arc' ? bracketWidth : null,
    });
  }

  const pathPoints = Array.from({ length: 129 }, (_, j) => pointAt(j / 128, rise));
  const arcIntervals = [];
  const chordIntervals = [];
  for (let i = 0; i < count - 1; i += 1) {
    arcIntervals.push(marks[i + 1].s - marks[i].s);
    chordIntervals.push(distance(marks[i].point, marks[i + 1].point));
  }
  const minArcInterval = Math.min(...arcIntervals);
  const maxArcInterval = Math.max(...arcIntervals);
  const maxAbsArcResidual = spacing === 'arc'
    ? Math.max(...marks.map((mark) => Math.abs(mark.arcResidual)))
    : null;
  const curveInterpolation = Math.abs(rise) / (128 * 128);
  return {
    settings: { ...normalized },
    curve: {
      kind: 'quadratic_bezier',
      controlPoints: [[0, 0], [3, 2 * rise], [6, 0]],
      length: totalLength,
      domain: [0, 1],
      axes: 'x_right_y_up',
    },
    marks,
    pathPoints,
    arcIntervals,
    chordIntervals,
    metrics: {
      minArcInterval,
      maxArcInterval,
      arcIntervalRange: maxArcInterval - minArcInterval,
      minChordInterval: Math.min(...chordIntervals),
      maxChordInterval: Math.max(...chordIntervals),
      maxAbsArcResidual,
    },
    bounds: {
      curveInterpolation,
      scope: BOUND_SCOPE,
    },
  };
}

export function sharedViewBox(models) {
  if (!Array.isArray(models) || models.length === 0) throw new TypeError('models must be a nonempty array');
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const include = (point) => {
    if (!Array.isArray(point) || point.length !== 2) throw new TypeError('point must contain two coordinates');
    const x = checked('viewBox x', point[0]);
    const y = -checked('viewBox y', point[1]);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const model of models) {
    if (!model || !Array.isArray(model.pathPoints) || !Array.isArray(model.marks)) throw new TypeError('model must contain pathPoints and marks');
    for (const point of model.pathPoints) include(point);
    for (const mark of model.marks) {
      if (!mark || !Array.isArray(mark.polygon)) throw new TypeError('mark must contain a polygon');
      for (const point of mark.polygon) include(point);
    }
  }
  const rangeX = checked('viewBox x range', maxX - minX);
  const rangeY = checked('viewBox y range', maxY - minY);
  const side = checked('viewBox side', Math.max(rangeX, rangeY, 1) * 1.2);
  const centerX = minX / 2 + maxX / 2;
  const centerY = minY / 2 + maxY / 2;
  return {
    x: checked('viewBox origin x', centerX - side / 2),
    y: checked('viewBox origin y', centerY - side / 2),
    width: side,
    height: side,
  };
}
