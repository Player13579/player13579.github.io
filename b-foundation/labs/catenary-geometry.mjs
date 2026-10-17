const SETTINGS_KEYS = ['span', 'height', 'slack'];
const BOUND_SCOPE = 'Exact-arithmetic same-x vertical interpolation bound to the fitted continuous catenary only; excludes parameter-root residual, floating-point and hyperbolic-function evaluation, coordinate rounding, projection, rasterization, and perception; not an interval certificate and not a bound to the exact requested-length catenary.';
const MODEL_ASSUMPTIONS = Object.freeze({
  model: 'uniform_inextensible_flexible_cable_static',
  gravity: 'uniform_downward',
  otherLoads: 'none',
  otherContacts: 'none',
});

function finite(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}

function product(name, a, b) {
  const result = a * b;
  if (!Number.isFinite(result)) throw new RangeError(`${name} exceeds finite numeric range`);
  if (a !== 0 && b !== 0 && result === 0) throw new RangeError(`${name} underflows finite numeric range`);
  return result;
}

function quotient(name, numerator, denominator) {
  const result = numerator / denominator;
  if (!Number.isFinite(result)) throw new RangeError(`${name} exceeds finite numeric range`);
  if (numerator !== 0 && result === 0) throw new RangeError(`${name} underflows finite numeric range`);
  return result;
}

function sum(name, ...values) {
  const result = values.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(result)) throw new RangeError(`${name} exceeds finite numeric range`);
  return result;
}

function plainObject(name, value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be a plain object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${name} must be a plain object`);
}

function exactKeys(name, value, expected) {
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expected.length || keys.some((key) => typeof key !== 'string' || !expected.includes(key))) {
    throw new TypeError(`${name} must contain exactly ${expected.join(', ')}`);
  }
}

function validateSettings(settings) {
  plainObject('settings', settings);
  exactKeys('settings', settings, SETTINGS_KEYS);
  const span = finite('span', settings.span);
  const height = finite('height', settings.height);
  const slack = finite('slack', settings.slack);
  if (span < 2 || span > 10) throw new RangeError('span must be within 2 through 10');
  if (height < -3 || height > 3) throw new RangeError('height must be within -3 through 3');
  if (slack < 0.01 || slack > 0.5) throw new RangeError('slack must be within 0.01 through 0.5');
  return { span, height, slack };
}

function sinhc(u) {
  if (u === 0) return 1;
  if (Math.abs(u) < 1e-3) {
    const u2 = product('u squared', u, u);
    const u4 = product('u fourth', u2, u2);
    const u6 = product('u sixth', u4, u2);
    return sum('sinhc series', 1, u2 / 6, u4 / 120, u6 / 5040);
  }
  const result = Math.sinh(u) / u;
  if (!Number.isFinite(result)) throw new RangeError('sinhc exceeds finite numeric range');
  return result;
}

function solveU(ratio) {
  const upperValue = sinhc(4);
  if (!(ratio > 1 && ratio <= upperValue)) throw new RangeError('catenary parameter is outside the adopted [0,4] bracket');
  let lo = 0;
  let hi = 4;
  let iterations = 0;
  for (; iterations < 80; iterations += 1) {
    const mid = lo + (hi - lo) / 2;
    if (mid === lo || mid === hi) break;
    if (sinhc(mid) < ratio) lo = mid;
    else hi = mid;
  }
  const u = lo + (hi - lo) / 2;
  if (!(u > 0) || !Number.isFinite(u)) throw new RangeError('catenary root did not produce a positive finite u');
  return { u, bracket: [lo, hi], iterations, ratioResidual: sinhc(u) - ratio };
}

function fitCatenary(settings) {
  const D = settings.span;
  const H = settings.height;
  const chord = Math.hypot(D, H);
  const requestedLength = product('chord*(1+slack)', chord, 1 + settings.slack);
  const radicand = product('(L-H)*(L+H)', requestedLength - H, requestedLength + H);
  if (!(radicand > 0)) throw new RangeError('catenary horizontal-length target must be positive');
  const S = Math.sqrt(radicand);
  const ratio = quotient('S/D', S, D);
  if (!(ratio > 1)) throw new RangeError('positive slack did not produce a ratio above one');
  const solved = solveU(ratio);
  const { u } = solved;
  const a = quotient('D/(2u)', D, product('2u', 2, u));
  if (!(a > 0)) throw new RangeError('catenary scale a must be positive');
  const S_a = product('D*sinhc(u)', D, sinhc(u));
  const v = Math.asinh(quotient('H/S_a', H, S_a));
  if (!Number.isFinite(v)) throw new RangeError('catenary parameter v exceeds finite range');
  const vertexX = sum('vertex x', D / 2, -product('a*v', a, v));
  const continuousLength = Math.hypot(S_a, H);
  const lengthResidual = sum('length residual', continuousLength, -requestedLength);
  if (Math.abs(lengthResidual) > 1e-11 * Math.max(1, requestedLength)) {
    throw new RangeError('fitted catenary length residual exceeds tolerance');
  }
  return {
    requestedLength,
    source: {
      a, u, v, vertexX, span: D, height: H,
      continuousLength,
      lengthResidual,
      solver: { bracket: solved.bracket, iterations: solved.iterations, ratioResidual: solved.ratioResidual },
    },
  };
}

export const DEFAULT_SETTINGS = Object.freeze({ span: 6, height: 0, slack: 0.2 });
export const BASE_SETTINGS = Object.freeze({ span: 6, height: 0, slack: 0.05 });

export function evaluateCatenary(model, x) {
  if (!model || typeof model !== 'object' || !model.source) throw new TypeError('model must be a catenary geometry model');
  const source = model.source;
  const coordinate = finite('x', x);
  if (coordinate < 0 || coordinate > source.span) throw new RangeError('x must lie within the catenary span');
  const { a, u, v, span: D, height: H } = source;
  let y;
  if (coordinate === 0) y = 0;
  else if (coordinate === D) y = H;
  else {
    const first = quotient('x/(2a)', coordinate, 2 * a);
    const second = sum('x/(2a)+v-u', first, v, -u);
    y = product('2a*sinh(x/2a)*sinh(x/2a+v-u)',
      product('2a*sinh(x/2a)', product('2a', 2, a), Math.sinh(first)), Math.sinh(second));
  }
  const slopeArgument = sum('slope argument', quotient('x/a', coordinate, a), v, -u);
  const slope = Math.sinh(slopeArgument);
  const coshValue = Math.cosh(slopeArgument);
  const curvatureDenominator = product('a*cosh^2', a, product('cosh squared', coshValue, coshValue));
  const curvature = quotient('catenary curvature', 1, curvatureDenominator);
  for (const [name, value] of [['y', y], ['slope', slope], ['curvature', curvature]]) finite(name, value);
  return { point: [coordinate, y], slope, curvature };
}

function selectSteps(D, B2, maxError, maxSteps) {
  const coefficient = product('D^2*B2/8', product('D squared', D, D), quotient('B2/8', B2, 8));
  if (coefficient === 0) return 1;
  const maximumBound = quotient('interpolation bound at maxSteps', coefficient, maxSteps * maxSteps);
  const required = Math.sqrt(coefficient) / Math.sqrt(maxError);
  if (!Number.isFinite(required) || maximumBound > maxError || required > maxSteps) {
    throw new RangeError('maxSteps is insufficient for maxError');
  }
  let steps = Math.max(1, Math.ceil(required));
  while (quotient('selected interpolation bound', coefficient, steps * steps) > maxError) {
    steps += 1;
    if (steps > maxSteps) throw new RangeError('maxSteps is insufficient for maxError');
  }
  return steps;
}

function polylineLength(points) {
  let total = 0;
  let compensation = 0;
  for (let i = 1; i < points.length; i += 1) {
    const segment = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    finite('polyline segment length', segment);
    const adjusted = segment - compensation;
    const next = total + adjusted;
    compensation = (next - total) - adjusted;
    total = finite('polygonal length accumulation', next);
  }
  return total;
}

export function constructCatenary(settings, options = {}) {
  const normalized = validateSettings(settings);
  plainObject('options', options);
  const optionKeys = Reflect.ownKeys(options);
  if (optionKeys.some((key) => typeof key !== 'string' || (key !== 'maxError' && key !== 'maxSteps'))) throw new TypeError('options contains unknown keys');
  const maxError = options.maxError === undefined ? 1e-4 : finite('maxError', options.maxError);
  const maxSteps = options.maxSteps === undefined ? 4096 : options.maxSteps;
  if (maxError < 1e-8 || maxError > 0.01) throw new RangeError('maxError must be within 1e-8 through 0.01');
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 32768) throw new RangeError('maxSteps must be an integer from 1 through 32768');

  const fit = fitCatenary(normalized);
  const { source, requestedLength } = fit;
  const absVMinusU = Math.abs(source.v - source.u);
  const absVPlusU = Math.abs(source.v + source.u);
  const maxArg = Math.max(absVMinusU, absVPlusU);
  const B2 = quotient('cosh(maxArg)/a', Math.cosh(maxArg), source.a);
  finite('B2', B2);
  const steps = selectSteps(source.span, B2, maxError, maxSteps);
  const points = [];
  const slopes = [];
  const curvatures = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = i === 0 ? 0 : i === steps ? source.span : product('sample x', source.span, i / steps);
    const evaluated = evaluateCatenary({ source }, x);
    points.push(evaluated.point);
    slopes.push(evaluated.slope);
    curvatures.push(evaluated.curvature);
  }
  const interpolationBound = quotient(
    'interpolation bound',
    product('D^2*B2/8', product('D squared', source.span, source.span), quotient('B2/8', B2, 8)),
    steps * steps,
  );
  if (interpolationBound > maxError) throw new RangeError('selected interpolation bound exceeds maxError');

  const minimumX = Math.min(source.span, Math.max(0, source.vertexX));
  const minimum = evaluateCatenary({ source }, minimumX);
  const sagXRaw = sum('sag x', source.vertexX, product('a*asinh(H/D)', source.a, Math.asinh(quotient('H/D', source.height, source.span))));
  const roundoffWindow = 2e-12 * Math.max(1, source.span);
  let sagX = sagXRaw;
  if (sagX < 0 && sagX >= -roundoffWindow) sagX = 0;
  if (sagX > source.span && sagX <= source.span + roundoffWindow) sagX = source.span;
  if (sagX < 0 || sagX > source.span) throw new RangeError('sag maximum lies outside the support interval');
  const sagPoint = evaluateCatenary({ source }, sagX);
  const chordY = product('chord height at sag point', source.height / source.span, sagX);
  let sagValue = sum('sag value', chordY, -sagPoint.point[1]);
  if (sagValue < 0 && sagValue >= -roundoffWindow) sagValue = 0;
  if (sagValue < 0) throw new RangeError('computed chord-relative sag is negative');

  const boundCoefficient = product('D^2*B2/8', product('D squared', source.span, source.span), quotient('B2/8', B2, 8));
  return {
    settings: { ...normalized },
    endpoints: [[0, 0], [source.span, source.height]],
    requestedLength,
    source,
    points,
    slopes,
    curvatures,
    steps,
    polygonalLength: polylineLength(points),
    minimum: {
      point: minimum.point,
      vertexInSpan: source.vertexX >= 0 && source.vertexX <= source.span,
    },
    sag: { point: sagPoint.point, chordY, value: sagValue },
    bounds: {
      interpolation: quotient('interpolation bound', boundCoefficient, steps * steps),
      scope: BOUND_SCOPE,
    },
    assumptions: { ...MODEL_ASSUMPTIONS },
    actualTension: 'not_computed',
  };
}

export function sharedViewBox(models) {
  if (!Array.isArray(models) || models.length === 0) throw new TypeError('models must be a nonempty array');
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const model of models) {
    if (!model || !Array.isArray(model.points) || !Array.isArray(model.endpoints)) throw new TypeError('each model must contain points and endpoints');
    for (const point of [...model.points, ...model.endpoints]) {
      if (!Array.isArray(point) || point.length !== 2) throw new TypeError('each point must have two coordinates');
      const x = finite('viewBox x', point[0]);
      const y = -finite('viewBox y', point[1]);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const rangeX = maxX - minX, rangeY = maxY - minY;
  finite('viewBox x extent', rangeX); finite('viewBox y extent', rangeY);
  const side = Math.max(rangeX, rangeY, 1) * 1.2;
  finite('viewBox side', side);
  const centerX = minX / 2 + maxX / 2;
  const centerY = minY / 2 + maxY / 2;
  const x = centerX - side / 2;
  const y = centerY - side / 2;
  finite('viewBox origin x', x); finite('viewBox origin y', y);
  return { x, y, width: side, height: side };
}
