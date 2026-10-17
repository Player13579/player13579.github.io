const TAU = 2 * Math.PI;
const LENGTH = 6;
const BOUND_SCOPE = 'Exact-arithmetic local Euclidean position bound for midpoint source quadrature plus linear interpolation of the variable-normal-width boundaries; excludes floating-point rounding, phase/trigonometric/normal/width evaluation, projection, rasterization, and perception; not an interval certificate.';
const SETTING_KEYS = ['profile', 'strength', 'flip', 'widthStart', 'widthEnd'];

export const DEFAULT_SETTINGS = Object.freeze({
  profile: 'tighten', strength: 60, flip: false, widthStart: 1.2, widthEnd: 0,
});

export const BASE_SETTINGS = Object.freeze({
  profile: 'uniform', strength: 60, flip: false, widthStart: 1.2, widthEnd: 1.2,
});

function finite(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  return value;
}

function product(name, a, b) {
  const result = a * b;
  if (!Number.isFinite(result)) throw new RangeError(`${name} exceeds finite numeric range`);
  if (a !== 0 && b !== 0 && result === 0) throw new RangeError(`${name} underflows numeric range`);
  return result;
}

function sum(name, ...values) {
  const result = values.reduce((total, value) => total + value, 0);
  if (!Number.isFinite(result)) throw new RangeError(`${name} exceeds finite numeric range`);
  return result;
}

function quotient(name, numerator, denominator) {
  const result = numerator / denominator;
  if (!Number.isFinite(result)) throw new RangeError(`${name} exceeds finite numeric range`);
  if (numerator !== 0 && result === 0) throw new RangeError(`${name} underflows numeric range`);
  return result;
}

function checkedSettings(settings) {
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new TypeError('settings must be a plain object');
  }
  const prototype = Object.getPrototypeOf(settings);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('settings must be a plain object');
  const keys = Reflect.ownKeys(settings).sort();
  const expectedKeys = [...SETTING_KEYS].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new TypeError('settings must contain exactly profile, strength, flip, widthStart, widthEnd');
  }
  const { profile, strength, flip, widthStart, widthEnd } = settings;
  if (!['uniform', 'tighten', 'relax', 's'].includes(profile)) throw new RangeError('profile is unsupported');
  finite('strength', strength);
  if (strength < 0 || strength > 100 || (strength !== 0 && strength < 0.01)) {
    throw new RangeError('strength must be 0 or within 0.01 through 100');
  }
  if (typeof flip !== 'boolean') throw new TypeError('flip must be boolean');
  for (const [name, width] of [['widthStart', widthStart], ['widthEnd', widthEnd]]) {
    finite(name, width);
    if (width !== 0 && (width < 0.05 || width > 1.6)) throw new RangeError(`${name} must be 0 or within 0.05 through 1.6`);
  }
  if (widthStart === 0 && widthEnd === 0) throw new RangeError('at least one endpoint width must be positive');
  return { profile, strength, flip, widthStart, widthEnd };
}

export function deriveCurve(settings) {
  const value = checkedSettings(settings);
  const alpha = product('turn strength', value.strength / 100, (8 * Math.PI) / 9);
  const sign = value.flip ? -1 : 1;
  let kappaStart;
  let kappaEnd;
  switch (value.profile) {
    case 'uniform':
      kappaStart = kappaEnd = quotient('uniform curvature', product('signed turn', sign, alpha), LENGTH);
      break;
    case 'tighten':
      kappaStart = 0;
      kappaEnd = quotient('tighten curvature', product('signed turn', product('double turn', sign, 2 * alpha), 1), LENGTH);
      break;
    case 'relax':
      kappaStart = quotient('relax curvature', product('signed turn', product('double turn', sign, 2 * alpha), 1), LENGTH);
      kappaEnd = 0;
      break;
    case 's':
      kappaStart = quotient('S start curvature', product('S signed curvature', sign, -2 * alpha), LENGTH);
      kappaEnd = quotient('S end curvature', product('S signed curvature', sign, 2 * alpha), LENGTH);
      break;
    default:
      throw new RangeError('profile is unsupported');
  }
  return {
    length: LENGTH,
    kappaStart,
    kappaEnd,
    widthStart: value.widthStart,
    widthEnd: value.widthEnd,
  };
}

function halfWidth(t, h0, h1) {
  if (t === 0) return h0;
  if (t === 1) return h1;
  const oneMinus = 1 - t;
  const g = product('g(t)', product('t squared', t, t), 3 - 2 * t);
  const r = product('R(t)', product('(1-t)^2', oneMinus, oneMinus), 1 + 2 * t);
  const left = h0 === 0 ? 0 : product('h0*R(t)', h0, r);
  const right = h1 === 0 ? 0 : product('h1*g(t)', h1, g);
  const result = sum('half-width profile', left, right);
  if (!(result > 0)) throw new RangeError('positive interior width underflows numeric range');
  return result;
}

function sourceAngle(a, d, t) {
  if (t === 0) return 0;
  const linear = product('a*t', a, t);
  const quadratic = product('(d/2)*t^2', quotient('d/2', d, 2), product('t squared', t, t));
  return sum('source angle', linear, quadratic);
}

function boundParts(curve, h0, h1) {
  const a = product('L*kappaStart', curve.length, curve.kappaStart);
  const b = product('L*kappaEnd', curve.length, curve.kappaEnd);
  const d = sum('scaled curvature difference', b, -a);
  const k = Math.max(Math.abs(a), Math.abs(b));
  const kSquared = product('K squared', k, k);
  const H = Math.hypot(d, kSquared);
  if (!Number.isFinite(H)) throw new RangeError('H exceeds finite numeric range');
  const H0 = Math.max(h0, h1);
  const delta = sum('half-width difference', h1, -h0);
  const H1 = product('1.5*abs(width difference)', 1.5, Math.abs(delta));
  const H2 = product('6*abs(width difference)', 6, Math.abs(delta));
  const first = sum(
    'first B2 component',
    product('2*H1*K', 2, product('H1*K', H1, k)),
    product('H0*abs(d)', H0, Math.abs(d)),
  );
  const second = sum(
    'second B2 component',
    product('(L+H0*K)*K', sum('L+H0*K', curve.length, product('H0*K', H0, k)), k),
    H2,
  );
  const B2 = Math.hypot(first, second);
  if (!Number.isFinite(B2)) throw new RangeError('B2 exceeds finite numeric range');
  const Cq = product('L*(H/24)', curve.length, quotient('H/24', H, 24));
  const Ci = B2 / 8;
  if (!Number.isFinite(Ci) || (B2 > 0 && Ci === 0)) throw new RangeError('Ci exceeds supported numeric range');
  const Cb = sum('band bound coefficient', Cq, Ci);
  return { a, b, d, k, Cq, Ci, Cb };
}

function selectSteps(qCoefficient, iCoefficient, coefficient, maxError, maxSteps) {
  if (coefficient === 0) return 1;
  const maxBound = quotient('bound at maxSteps', coefficient, maxSteps * maxSteps);
  const required = Math.sqrt(coefficient) / Math.sqrt(maxError);
  if (!Number.isFinite(required) || maxBound > maxError || required > maxSteps) {
    throw new RangeError('maxSteps is insufficient for maxError');
  }
  let n = Math.max(1, Math.ceil(required));
  const currentBound = () => sum(
    'selected position bound',
    quotient('selected quadrature bound', qCoefficient, n * n),
    quotient('selected interpolation bound', iCoefficient, n * n),
  );
  while (currentBound() > maxError) {
    n += 1;
    if (n > maxSteps) throw new RangeError('maxSteps is insufficient for maxError');
  }
  return n;
}

function constructGeometry(settings, options) {
  const normalized = checkedSettings(settings);
  const curve = deriveCurve(normalized);
  const maxError = options.maxError === undefined ? 1e-4 : finite('maxError', options.maxError);
  const maxSteps = options.maxSteps === undefined ? 4096 : options.maxSteps;
  if (maxError < 1e-8 || maxError > 0.01) throw new RangeError('maxError must be within 1e-8 through 0.01');
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 32768) throw new RangeError('maxSteps must be an integer from 1 through 32768');

  const h0 = normalized.widthStart / 2;
  const h1 = normalized.widthEnd / 2;
  const localProduct = product('local regularity product', Math.max(h0, h1), Math.max(Math.abs(curve.kappaStart), Math.abs(curve.kappaEnd)));
  if (localProduct >= 1) throw new RangeError('sufficient local regularity guard failed');
  const localFactorBound = 1 - localProduct;
  if (!(localFactorBound > 0)) throw new RangeError('local factor bound is not positive');

  const parts = boundParts(curve, h0, h1);
  let steps = selectSteps(parts.Cq, parts.Ci, parts.Cb, maxError, maxSteps);
  const points = [];
  const leftPoints = [];
  const rightPoints = [];
  const arcLengths = [];
  const tangentAngles = [];
  const widths = [];
  const straightSource = parts.a === 0 && parts.b === 0;
  const stepLength = quotient('source arc interval', curve.length, steps);
  let offsetX = 0;
  let offsetY = 0;
  let correctionX = 0;
  let correctionY = 0;
  for (let index = 0; index <= steps; index += 1) {
    const t = index === 0 ? 0 : index === steps ? 1 : index / steps;
    const theta = sourceAngle(parts.a, parts.d, t);
    let x;
    let y;
    if (straightSource) {
      x = product('straight source x', curve.length, t);
      y = 0;
    } else {
      x = offsetX;
      y = offsetY;
    }
    const h = halfWidth(t, h0, h1);
    const nx = -Math.sin(theta);
    const ny = Math.cos(theta);
    const ox = h === 0 || nx === 0 ? 0 : product('width normal x', h, nx);
    const oy = h === 0 || ny === 0 ? 0 : product('width normal y', h, ny);
    const left = [sum('left x', x, ox), sum('left y', y, oy)];
    const right = [sum('right x', x, -ox), sum('right y', y, -oy)];
    if (h > 0 && left[0] === right[0] && left[1] === right[1]) throw new RangeError('positive width collapses at float precision');
    if (h === 0 && index !== 0 && index !== steps) throw new RangeError('interior positive width collapsed to zero');
    points.push([x, y]);
    leftPoints.push(left);
    rightPoints.push(right);
    arcLengths.push(index === 0 ? 0 : index === steps ? curve.length : product('source arc coordinate', curve.length, t));
    tangentAngles.push(theta);
    widths.push(index === 0 ? normalized.widthStart : index === steps ? normalized.widthEnd : product('sample width', h, 2));

    if (!straightSource && index < steps) {
      const midpoint = (index + 0.5) / steps;
      const midpointAngle = sourceAngle(parts.a, parts.d, midpoint);
      const dx = product('midpoint x increment', stepLength, Math.cos(midpointAngle));
      const dy = product('midpoint y increment', stepLength, Math.sin(midpointAngle));
      const adjustedX = dx - correctionX;
      const nextX = offsetX + adjustedX;
      correctionX = (nextX - offsetX) - adjustedX;
      offsetX = finite('source x accumulation', nextX);
      const adjustedY = dy - correctionY;
      const nextY = offsetY + adjustedY;
      correctionY = (nextY - offsetY) - adjustedY;
      offsetY = finite('source y accumulation', nextY);
    }
  }
  const quadrature = quotient('quadrature bound', parts.Cq, steps * steps);
  const interpolation = quotient('interpolation bound', parts.Ci, steps * steps);
  const position = sum('position bound', quadrature, interpolation);
  if (position > maxError) throw new RangeError('selected position bound exceeds maxError');
  return {
    settings: normalized,
    source: { length: curve.length, kappaStart: curve.kappaStart, kappaEnd: curve.kappaEnd, initialHeadingRadians: 0 },
    points,
    leftPoints,
    rightPoints,
    polygon: leftPoints.concat([...rightPoints].reverse(), [leftPoints[0].slice()]),
    arcLengths,
    tangentAngles,
    widths,
    steps,
    bounds: { quadrature, interpolation, position, scope: BOUND_SCOPE },
    localFactorBound,
    caps: { start: normalized.widthStart === 0 ? 'point' : 'butt', end: normalized.widthEnd === 0 ? 'point' : 'butt' },
    globalOverlap: 'not_checked',
  };
}

export function constructBand(settings, options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  const optionKeys = Object.keys(options);
  if (optionKeys.some((key) => !['maxError', 'maxSteps'].includes(key))) throw new TypeError('options contains an unknown key');
  return constructGeometry(settings, options);
}

export function sharedViewBox(models) {
  if (!Array.isArray(models) || models.length === 0) throw new TypeError('models must be a nonempty array');
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const model of models) {
    if (!model || !Array.isArray(model.polygon) || model.polygon.length < 3) throw new TypeError('each model must contain a polygon');
    for (const point of model.polygon) {
      if (!Array.isArray(point) || point.length !== 2) throw new TypeError('polygon point must have two coordinates');
      const x = finite('polygon x', point[0]);
      const y = -finite('polygon y', point[1]);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const rangeX = maxX - minX, rangeY = maxY - minY;
  if (!Number.isFinite(rangeX) || !Number.isFinite(rangeY)) throw new RangeError('polygon extent exceeds finite numeric range');
  const side = product('shared viewBox side', Math.max(rangeX, rangeY, 1), 1.2);
  const centerX = minX / 2 + maxX / 2;
  const centerY = minY / 2 + maxY / 2;
  const x = centerX - side / 2;
  const y = centerY - side / 2;
  if (![x, y, side].every(Number.isFinite)) throw new RangeError('shared viewBox exceeds finite numeric range');
  return { x, y, width: side, height: side };
}
