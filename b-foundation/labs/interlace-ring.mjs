import { DEFAULT_SETTINGS, constructInterlace } from './interlace-geometry.mjs';

export const RING_RADIUS = 3;

const AMPLITUDE = 0.6;
const SOURCE_PERIOD = 3;
const SAMPLES_PER_PERIOD = 256;
const MASK_HALF_WINDOW = 0.21;
const ANGLE_START = -Math.PI / 2;
const VIEW_BOX = Object.freeze([-3.9, -3.9, 7.8, 7.8]);
const OUTPUT_SIZE = Object.freeze({ width: 1024, height: 1024 });
const ID_PREFIX_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;

function finitePoint(point) {
  return point.length === 2 && point.every(Number.isFinite);
}

function mapPoint(point, sourceLength) {
  const [x, y] = point;
  const theta = (2 * Math.PI * y) / sourceLength + ANGLE_START;
  const radius = RING_RADIUS + x;
  return [radius * Math.cos(theta), radius * Math.sin(theta)];
}

function pathData(points, close = false) {
  const commands = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`);
  if (close) commands.push('Z');
  return commands.join(' ');
}

function buildRing(source) {
  const sourceLength = SOURCE_PERIOD * source.settings.periods;
  const angularRate = (2 * Math.PI) / sourceLength;
  const strands = source.strands.map((strand) => {
    const points = strand.points.map((point) => mapPoint(point, sourceLength));
    points[points.length - 1] = [...points[0]];
    return {
      index: strand.index,
      color: strand.color,
      closed: true,
      points,
    };
  });
  const crossings = source.crossings.map((crossing) => ({
    index: crossing.index,
    pair: [...crossing.pair],
    point: mapPoint(crossing.point, sourceLength),
    over: crossing.over,
    under: crossing.under,
    sourceY: crossing.point[1],
    maskPoints: crossing.maskPoints.map((point) => mapPoint(point, sourceLength)),
  }));
  const maximumYStep = SOURCE_PERIOD / SAMPLES_PER_PERIOD;
  const h = maximumYStep;
  const omega = (2 * Math.PI) / SOURCE_PERIOD;
  const kappa = angularRate;
  const chordBound = (h * h / 8) * (
    AMPLITUDE * omega * omega
      + (RING_RADIUS + AMPLITUDE) * kappa * kappa
      + 2 * AMPLITUDE * omega * kappa
  );
  const model = {
    version: 1,
    kind: 'interlaced_band_ring',
    settings: { ...source.settings },
    constants: {
      amplitude: AMPLITUDE,
      period: SOURCE_PERIOD,
      samplesPerPeriod: SAMPLES_PER_PERIOD,
      crossingMaskHalfWindow: MASK_HALF_WINDOW,
    },
    ringConstruction: {
      radius: RING_RADIUS,
      sourceLength,
      angularRate,
      startAngle: ANGLE_START,
      mapping: 'theta=2*pi*y/sourceLength-pi/2; (x,y) maps to ((radius+x)*cos(theta),(radius+x)*sin(theta))',
    },
    viewBox: [...VIEW_BOX],
    outputSize: { ...OUTPUT_SIZE },
    strands,
    crossings,
    approximation: {
      maximumUniformYStep: maximumYStep,
      uniformSamplesPerPeriod: SAMPLES_PER_PERIOD,
      analyticCrossingYIncluded: true,
      centerlineChordPositionBound: chordBound,
      boundScope: '等間隔標本を直線で結ぶ環状中心線の弦誤差に対する厳密算術上の位置上界。交点標本も追加される。浮動小数点・三角関数誤差、帯幅、マスク・ストローク、SVGやラスター化、知覚は上界の対象外。',
      diagramScope: '開いた三本の帯の局所的な上下関係を円環状の平面図に写す。元の長さ・面積・曲率・角度は保存しない。物理的な編組、布の挙動、結び目分類、知覚や美的効果を表すものではない。',
    },
  };
  if (strands.some((strand) => strand.points.some((point) => !finitePoint(point)))
      || crossings.some((crossing) => !finitePoint(crossing.point)
        || crossing.maskPoints.some((point) => !finitePoint(point)))
      || !Number.isFinite(chordBound)) {
    throw new RangeError('constructed ring geometry is not finite');
  }
  return model;
}

export function constructInterlaceRing(settings = DEFAULT_SETTINGS) {
  // Delegate exact six-key, accessor, type, and range validation to the established source API.
  const source = constructInterlace(settings);
  return buildRing(source);
}

export function interlaceRingSvg(settings = DEFAULT_SETTINGS, idPrefix = 'weave-ring') {
  // Always reconstruct from validated settings; no precomputed model text enters the serializer.
  const model = constructInterlaceRing(settings);
  if (typeof idPrefix !== 'string' || !ID_PREFIX_PATTERN.test(idPrefix)) {
    throw new TypeError('idPrefix must match [A-Za-z][A-Za-z0-9_-]{0,31}');
  }
  const [x, y, width, height] = model.viewBox;
  const strokeWidth = model.settings.width + 2 * model.settings.clearance;
  const masks = model.strands.map((strand) => {
    const underEvents = model.crossings.filter((crossing) => crossing.under === strand.index);
    const paths = underEvents.map((crossing) => `<path d="${pathData(crossing.maskPoints)}" fill="none" stroke="black" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    return `<mask id="${idPrefix}-mask-${strand.index}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" mask-type="luminance" x="${x}" y="${y}" width="${width}" height="${height}"><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white"/>${paths}</mask>`;
  }).join('');
  const strands = model.strands.map((strand) => `<path data-strand="${strand.index}" d="${pathData(strand.points, true)}" fill="none" stroke="${strand.color}" stroke-width="${model.settings.width}" stroke-linecap="round" stroke-linejoin="round" mask="url(#${idPrefix}-mask-${strand.index})"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${model.outputSize.width}" height="${model.outputSize.height}" viewBox="${model.viewBox.join(' ')}"><defs>${masks}</defs>${strands}</svg>`;
}

