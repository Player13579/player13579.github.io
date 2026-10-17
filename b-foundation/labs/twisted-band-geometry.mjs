const SETTING_KEYS = ['twist', 'phase', 'width', 'light'];
const QUARTER_TURN = Math.PI / 2;
const STATION_MERGE_TOLERANCE = 1e-13;
const LONGITUDINAL_INTERVALS = 128;
const TRANSVERSE_INTERVALS = 12;

export const DEFAULT_SETTINGS = Object.freeze({ twist: 180, phase: 0, width: 1.2, light: 0.8 });
export const BASELINE_SETTINGS = Object.freeze({ twist: 0, phase: 0, width: 1.2, light: 0.8 });
export const VIEW_BOX = Object.freeze([-3.5, -1.6, 7, 3.2]);
export const REFLECTANCE = Object.freeze({
  front: Object.freeze([0.06, 0.44, 0.38]),
  back: Object.freeze([0.72, 0.34, 0.08]),
});

function finite(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}

export function validateSettings(settings) {
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new TypeError('settings must be a plain object');
  }
  const prototype = Object.getPrototypeOf(settings);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('settings must be a plain object');
  const keys = Reflect.ownKeys(settings);
  if (keys.length !== SETTING_KEYS.length || keys.some((key) => typeof key !== 'string' || !SETTING_KEYS.includes(key))) {
    throw new TypeError('settings must contain exactly twist, phase, width, and light');
  }
  const { twist, phase, width, light } = settings;
  finite('twist', twist);
  finite('phase', phase);
  finite('width', width);
  finite('light', light);
  if (twist < -360 || twist > 360) throw new RangeError('twist must be within -360 through 360 degrees');
  if (phase < -90 || phase > 90) throw new RangeError('phase must be within -90 through 90 degrees');
  if (width < 0.4 || width > 2) throw new RangeError('width must be within 0.4 through 2');
  if (light < 0 || light > 1) throw new RangeError('light must be within 0 through 1');
  return { twist, phase, width, light };
}

function exactSinCos(degrees) {
  if (degrees % 90 === 0) {
    const quarter = ((degrees / 90) % 4 + 4) % 4;
    if (quarter === 0) return { sin: 0, cos: 1 };
    if (quarter === 1) return { sin: 1, cos: 0 };
    if (quarter === 2) return { sin: 0, cos: -1 };
    return { sin: -1, cos: 0 };
  }
  const radians = degrees * Math.PI / 180;
  return { sin: Math.sin(radians), cos: Math.cos(radians) };
}

function srgbEncode(linear) {
  return linear <= 0.0031308
    ? 12.92 * linear
    : 1.055 * linear ** (1 / 2.4) - 0.055;
}

function sampleNormalized(settings, t, v, forcedCriticalDegrees) {
  const degrees = settings.phase + settings.twist * t;
  const theta = degrees * Math.PI / 180;
  const trig = forcedCriticalDegrees === undefined ? exactSinCos(degrees) : exactSinCos(forcedCriticalDegrees);
  const a = settings.twist * Math.PI / 180 / 6;
  const normalLength = Math.hypot(1, v * a);
  const normal = [-v * a / normalLength, -trig.sin / normalLength, trig.cos / normalLength];
  const face = trig.cos > 0 ? 'front' : trig.cos < 0 ? 'back' : 'edge';
  const reflectance = face === 'back' ? REFLECTANCE.back : REFLECTANCE.front;
  const cosine = Math.abs(trig.cos) / normalLength;
  const scale = settings.light * cosine;
  const linearRGB = reflectance.map((channel) => channel * scale);
  const rgb = linearRGB.map((channel) => Math.round(255 * srgbEncode(channel)));
  const x = -3 + 6 * t;
  const position = [x, trig.cos === 0 ? 0 : v * trig.cos, trig.sin === 0 ? 0 : v * trig.sin];
  return {
    t,
    v,
    theta,
    position,
    normal,
    projected: [x, position[1]],
    face,
    cosine,
    linearRGB,
    rgb,
  };
}

export function sampleSurface(settings, t, v) {
  const normalized = validateSettings(settings);
  finite('t', t);
  finite('v', v);
  if (t < 0 || t > 1) throw new RangeError('t must be within 0 through 1');
  if (v < -normalized.width / 2 || v > normalized.width / 2) throw new RangeError('v is outside the band width');
  return sampleNormalized(normalized, t, v);
}

function criticalCrossings(settings) {
  if (settings.twist === 0) return [];
  const endAngle = settings.phase + settings.twist;
  const minimum = Math.min(settings.phase, endAngle);
  const maximum = Math.max(settings.phase, endAngle);
  const firstK = Math.ceil((minimum - 90) / 180);
  const lastK = Math.floor((maximum - 90) / 180);
  const crossings = [];
  for (let k = firstK; k <= lastK; k += 1) {
    const degrees = 90 + 180 * k;
    const t = (degrees - settings.phase) / settings.twist;
    if (t > 0 && t < 1) crossings.push({ t, degrees });
  }
  return crossings;
}

function makeStations(settings) {
  const candidates = [
    { t: 0, priority: 3, endpoint: true },
    { t: 1, priority: 3, endpoint: true },
    ...Array.from({ length: LONGITUDINAL_INTERVALS - 1 }, (_, index) => ({
      t: (index + 1) / LONGITUDINAL_INTERVALS,
      priority: 1,
      endpoint: false,
    })),
    ...criticalCrossings(settings).map((crossing) => ({ ...crossing, priority: 2, endpoint: false })),
  ].sort((a, b) => a.t - b.t);

  const groups = [];
  for (const candidate of candidates) {
    const current = groups.at(-1);
    if (current && candidate.t - current[0].t <= STATION_MERGE_TOLERANCE) current.push(candidate);
    else groups.push([candidate]);
  }

  const criticalByStation = new Map();
  const stations = groups.map((group) => {
    const selected = group.reduce((best, item) => item.priority > best.priority ? item : best);
    const crossing = group.find((item) => item.degrees !== undefined);
    if (crossing) criticalByStation.set(selected.t, crossing.degrees);
    return selected.t;
  });
  return { stations, criticalByStation };
}

function sourceAndLimits(settings, stations, rows, cells, edgeOn) {
  return {
    source: {
      coordinateUnit: 'local units',
      longitudinalDomain: { xStart: -3, xEnd: 3, length: 6 },
      model: 'r(x,v)=(x,v*cos(theta),v*sin(theta)); t=(x+3)/6; theta=(phase+twist*t)*pi/180',
      normal: 'N=(-v*a,-sin(theta),cos(theta))/hypot(1,v*a); a=(twist*pi/180)/6',
      widthIsConstant: true,
      width: settings.width,
      transverseExtent: [-settings.width / 2, settings.width / 2],
      sampling: {
        longitudinalUniformNodes: 129,
        internalFrontBackCriticalNodes: true,
        criticalStationMergeTolerance: STATION_MERGE_TOLERANCE,
        transverseRows: 13,
        transversePatches: 12,
      },
      cellShade: 'Analytical source normal and Lambert shading at each parametric cell center; uniform cell fill, not planar-facet normals or an exact smooth renderer',
    },
    limits: {
      camera: { projection: 'orthographic', towardScene: [0, 0, -1], projectionAxes: ['x', 'y'] },
      light: { kind: 'directional', incomingUnitVector: [0, 0, 1], relativeD: settings.light, relativeDRange: [0, 1] },
      reflectance: {
        colorSpace: 'linear RGB',
        front: [...REFLECTANCE.front],
        back: [...REFLECTANCE.back],
        measuredMaterialData: false,
      },
      shading: 'Lambert rho/pi with selected relative D=E_perp/pi equal to light; incidence cosine uses the normalized source normal; linear output is sRGB encoded and rounded to 8-bit RGB',
      mechanics: 'No inextensible sheet, cloth equilibrium, force, strain, support, or stress simulation',
      edgeOn,
      stationCount: stations.length,
      rowCount: rows.length,
      cellCount: cells.length,
      edgeOnNote: edgeOn ? 'The full surface projects to a line at this valid setting.' : 'Some individual sections may collapse when viewed edge-on.',
    },
  };
}

export function constructTwistedBand(settings) {
  const normalized = validateSettings(settings);
  const { stations, criticalByStation } = makeStations(normalized);
  const halfWidth = normalized.width / 2;
  const rows = Array.from({ length: TRANSVERSE_INTERVALS + 1 }, (_, index) => {
    if (index === 0) return -halfWidth;
    if (index === TRANSVERSE_INTERVALS) return halfWidth;
    return -halfWidth + normalized.width * index / TRANSVERSE_INTERVALS;
  });
  const cells = [];
  for (let i = 0; i < stations.length - 1; i += 1) {
    const t0 = stations[i], t1 = stations[i + 1];
    const critical0 = criticalByStation.get(t0), critical1 = criticalByStation.get(t1);
    const longitudinalMiddle = (t0 + t1) / 2;
    for (let j = 0; j < rows.length - 1; j += 1) {
      const v0 = rows[j], v1 = rows[j + 1];
      const vertices = [
        sampleNormalized(normalized, t0, v0, critical0).position,
        sampleNormalized(normalized, t1, v0, critical1).position,
        sampleNormalized(normalized, t1, v1, critical1).position,
        sampleNormalized(normalized, t0, v1, critical0).position,
      ];
      const projected = vertices.map(([x, y]) => [x, y]);
      const sample = sampleNormalized(normalized, longitudinalMiddle, (v0 + v1) / 2);
      cells.push({ t0, t1, v0, v1, vertices, projected, sample });
    }
  }

  const silhouette = [];
  for (const t of stations) silhouette.push(sampleNormalized(normalized, t, rows[0], criticalByStation.get(t)).projected);
  for (const t of [...stations].reverse()) silhouette.push(sampleNormalized(normalized, t, rows.at(-1), criticalByStation.get(t)).projected);

  const edgeOn = normalized.twist === 0 && Math.abs(exactSinCos(normalized.phase).cos) === 0;
  const { source, limits } = sourceAndLimits(normalized, stations, rows, cells, edgeOn);
  return {
    settings: normalized,
    viewBox: [...VIEW_BOX],
    stations,
    rows,
    cells,
    silhouette,
    source,
    limits,
  };
}
