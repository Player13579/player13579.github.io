const TAU = 2 * Math.PI;
const AMPLITUDE = 0.6;
const PERIOD = 3;
const SAMPLES_PER_PERIOD = 256;
const MASK_HALF_WINDOW = 0.21;
const VIEW_BOX = Object.freeze([-0.9, -0.3, 1.8, 3.6]);
const OUTPUT_WIDTH = 640;
const SETTING_KEYS = Object.freeze([
  'periods', 'width', 'clearance', 'pattern', 'invert', 'monochrome',
]);
const BASE_PALETTE = Object.freeze(['#147d78', '#b87625', '#b34c64']);
const PAIR_CYCLE = Object.freeze([[0, 1], [1, 2], [0, 2]]);

export const DEFAULT_SETTINGS = Object.freeze({
  periods: 2,
  width: 0.14,
  clearance: 0.025,
  pattern: 'alternating',
  invert: false,
  monochrome: false,
});

function validateSettings(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('settings must be a plain object');
  }

  let prototype;
  let keys;
  try {
    prototype = Object.getPrototypeOf(input);
    keys = Reflect.ownKeys(input);
  } catch {
    throw new TypeError('settings must be a readable plain object');
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('settings must be a plain object');
  }
  if (keys.length !== SETTING_KEYS.length || SETTING_KEYS.some((key) => !keys.includes(key))) {
    throw new TypeError('settings must contain exactly the six supported keys');
  }

  const values = {};
  for (const key of SETTING_KEYS) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, key);
    } catch {
      throw new TypeError(`settings.${key} must be a data property`);
    }
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`settings.${key} must be a data property`);
    }
    values[key] = descriptor.value;
  }

  if (!Number.isInteger(values.periods) || values.periods < 1 || values.periods > 4) {
    throw new RangeError('periods must be an integer from 1 through 4');
  }
  if (typeof values.width !== 'number' || !Number.isFinite(values.width) || values.width < 0.08 || values.width > 0.18) {
    throw new RangeError('width must be finite and between 0.08 and 0.18');
  }
  if (typeof values.clearance !== 'number' || !Number.isFinite(values.clearance) || values.clearance < 0 || values.clearance > 0.04) {
    throw new RangeError('clearance must be finite and between 0 and 0.04');
  }
  if (values.pattern !== 'alternating' && values.pattern !== 'stacked') {
    throw new RangeError('pattern must be alternating or stacked');
  }
  if (typeof values.invert !== 'boolean' || typeof values.monochrome !== 'boolean') {
    throw new TypeError('invert and monochrome must be booleans');
  }
  return values;
}

function validateCrossingOverrides(input, periods) {
  if (!Array.isArray(input)) {
    throw new TypeError('crossingOverrides must be an array');
  }

  let prototype;
  let keys;
  let lengthDescriptor;
  try {
    prototype = Object.getPrototypeOf(input);
    keys = Reflect.ownKeys(input);
    lengthDescriptor = Object.getOwnPropertyDescriptor(input, 'length');
  } catch {
    throw new TypeError('crossingOverrides must be a readable plain array');
  }
  if (prototype !== Array.prototype || !lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value')) {
    throw new TypeError('crossingOverrides must be a plain array');
  }

  const length = lengthDescriptor.value;
  const maximum = 6 * periods;
  if (!Number.isInteger(length) || length < 0 || length > maximum) {
    throw new RangeError(`crossingOverrides length must be from 0 through ${maximum}`);
  }
  if (keys.length !== length + 1 || !keys.includes('length')) {
    throw new TypeError('crossingOverrides must be dense and contain no extra properties');
  }

  const values = [];
  const seen = new Set();
  for (let i = 0; i < length; i += 1) {
    const key = String(i);
    if (!keys.includes(key)) {
      throw new TypeError('crossingOverrides must not be sparse');
    }
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, key);
    } catch {
      throw new TypeError(`crossingOverrides[${i}] must be a data property`);
    }
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`crossingOverrides[${i}] must be a data property`);
    }
    const value = descriptor.value;
    if (!Number.isInteger(value)) {
      throw new TypeError(`crossingOverrides[${i}] must be an integer`);
    }
    if (value < 0 || value >= maximum) {
      throw new RangeError(`crossingOverrides[${i}] must identify a crossing in this model`);
    }
    if (seen.has(value)) {
      throw new TypeError('crossingOverrides must not contain duplicate indices');
    }
    seen.add(value);
    values.push(value === 0 ? 0 : value);
  }
  return values.sort((a, b) => a - b);
}

function strandX(index, y) {
  return AMPLITUDE * Math.sin((TAU * y) / PERIOD + (TAU * index) / 3);
}

function sortedUnique(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function sampleYs(periods, crossingYs) {
  const count = SAMPLES_PER_PERIOD * periods;
  const values = [];
  for (let i = 0; i <= count; i += 1) values.push((PERIOD * i) / SAMPLES_PER_PERIOD);
  values.push(...crossingYs);
  return sortedUnique(values);
}

function crossingRoles(q, pattern, invert) {
  const pair = [...PAIR_CYCLE[q % PAIR_CYCLE.length]];
  let over;
  if (pattern === 'alternating') {
    over = q % 3;
  } else {
    over = Math.min(...pair);
  }
  let under = pair.find((strand) => strand !== over);
  if (invert) [over, under] = [under, over];
  return { pair, over, under };
}

function maskPoints(over, crossingY) {
  const intervalsEachSide = Math.ceil(MASK_HALF_WINDOW / (PERIOD / SAMPLES_PER_PERIOD));
  const points = [];
  for (let i = -intervalsEachSide; i <= intervalsEachSide; i += 1) {
    let y;
    if (i === -intervalsEachSide) y = crossingY - MASK_HALF_WINDOW;
    else if (i === intervalsEachSide) y = crossingY + MASK_HALF_WINDOW;
    else y = crossingY + (MASK_HALF_WINDOW * i) / intervalsEachSide;
    points.push([strandX(over, y), y]);
  }
  return points;
}

function makeCrossings(periods, settings, crossingOverrides) {
  const overridden = new Set(crossingOverrides);
  const crossings = [];
  for (let q = 0; q < 6 * periods; q += 1) {
    const y = (2 * q + 1) / 4;
    const { pair, over: presetOver, under: presetUnder } = crossingRoles(q, settings.pattern, settings.invert);
    const over = overridden.has(q) ? presetUnder : presetOver;
    const under = overridden.has(q) ? presetOver : presetUnder;
    crossings.push({
      index: q,
      pair,
      point: [(q % 2 === 0 ? 1 : -1) * (AMPLITUDE / 2), y],
      over,
      under,
      maskPoints: maskPoints(over, y),
    });
  }
  return crossings;
}

function buildModel(settings, crossingOverrides) {
  const yMax = PERIOD * settings.periods;
  const crossingYs = [];
  for (let q = 0; q < 6 * settings.periods; q += 1) crossingYs.push((2 * q + 1) / 4);
  const ys = sampleYs(settings.periods, crossingYs);
  const colors = settings.monochrome ? [BASE_PALETTE[0], BASE_PALETTE[0], BASE_PALETTE[0]] : [...BASE_PALETTE];
  const crossings = makeCrossings(settings.periods, settings, crossingOverrides);
  const viewBox = [VIEW_BOX[0], VIEW_BOX[1], VIEW_BOX[2], yMax + 0.6];
  const model = {
    version: 1,
    kind: 'interlaced_band_diagram',
    settings: { ...settings },
    constants: {
      amplitude: AMPLITUDE,
      period: PERIOD,
      samplesPerPeriod: SAMPLES_PER_PERIOD,
      crossingMaskHalfWindow: MASK_HALF_WINDOW,
    },
    viewBox,
    outputSize: {
      width: OUTPUT_WIDTH,
      height: Math.round((OUTPUT_WIDTH * viewBox[3]) / viewBox[2]),
    },
    strands: [0, 1, 2].map((index) => ({
      index,
      color: colors[index],
      points: ys.map((y) => [strandX(index, y), y]),
    })),
    crossings,
    approximation: {
      maximumUniformYStep: PERIOD / SAMPLES_PER_PERIOD,
      uniformSamplesPerPeriod: SAMPLES_PER_PERIOD,
      analyticCrossingYIncluded: true,
      centerlineChordPositionBound: (AMPLITUDE * TAU ** 2) / (8 * SAMPLES_PER_PERIOD ** 2),
      boundScope: '等間隔標本を直線で結ぶ中心線の弦誤差に対する厳密算術上の位置上界。交点標本は追加される。浮動小数点丸め、帯幅、マスク・ストローク、ラスター化、知覚は上界の対象外。',
      diagramScope: '開いた平面図案の局所的な上下関係を示す。閉じた結び目、布の物理挙動、物理的な隙間、美的効果を表すものではない。',
    },
  };

  if (crossingOverrides.length > 0) {
    model.version = 2;
    model.crossingOverrides = [...crossingOverrides];
  }

  if (!Number.isFinite(yMax) || model.strands.some((strand) => strand.points.some((point) => !point.every(Number.isFinite)))) {
    throw new RangeError('constructed geometry is not finite');
  }
  return model;
}

function pathData(points, invertY = false) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${invertY ? -y : y}`).join(' ');
}

export function constructInterlace(settings = DEFAULT_SETTINGS, crossingOverrides = []) {
  const value = validateSettings(settings);
  const overrides = validateCrossingOverrides(crossingOverrides, value.periods);
  return buildModel(value, overrides);
}

export function interlaceSvg(settings = DEFAULT_SETTINGS, idPrefix = 'weave', crossingOverrides = []) {
  const value = validateSettings(settings);
  const overrides = validateCrossingOverrides(crossingOverrides, value.periods);
  if (typeof idPrefix !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(idPrefix)) {
    throw new TypeError('idPrefix must match [A-Za-z][A-Za-z0-9_-]{0,31}');
  }
  const model = buildModel(value, overrides);
  const [x, y, width, height] = model.viewBox;
  const masks = model.strands.map((strand) => {
    const underEvents = model.crossings.filter((crossing) => crossing.under === strand.index);
    const paths = underEvents.map((crossing) => `<path d="${pathData(crossing.maskPoints)}" fill="none" stroke="black" stroke-width="${value.width + 2 * value.clearance}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    return `<mask id="${idPrefix}-mask-${strand.index}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" mask-type="luminance" x="${x}" y="${y}" width="${width}" height="${height}"><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white"/>${paths}</mask>`;
  }).join('');
  const strands = model.strands.map((strand) => `<path data-strand="${strand.index}" d="${pathData(strand.points)}" fill="none" stroke="${strand.color}" stroke-width="${value.width}" stroke-linecap="round" stroke-linejoin="round" mask="url(#${idPrefix}-mask-${strand.index})"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${model.outputSize.width}" height="${model.outputSize.height}" viewBox="${model.viewBox.join(' ')}"><defs>${masks}</defs>${strands}</svg>`;
}
