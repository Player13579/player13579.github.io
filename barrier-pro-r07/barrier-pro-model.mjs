export const VERSION = 'barrier-pro-r0.7';
export const EVENTS = {
  create: { durationMs: 650 },
  absorb: { durationMs: 650 },
  fracture: { durationMs: 480 },
  bust: { durationMs: 480 }
};

export const DESIGN = {
  fieldWidthH: 1.56,
  fieldHeightH: 1.78,
  frontPlaneOffsetPxAtH64: { x: -3.0, y: -1.5 },
  rearPlaneOffsetPxAtH64: { x: 3.0, y: 1.8 },
  contourThicknessPxAtH64: 5.3,
  connectorThicknessPxAtH64: 4.0,
  haloThreshold: 0.95,
  maxAlpha: 0.90
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a * (1 - t) + b * t;
const length2 = (x, y) => Math.hypot(x, y);
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

const BASE_OCTAGON = [
  { x: -0.28, y: -0.78 },
  { x:  0.28, y: -0.78 },
  { x:  0.60, y: -0.46 },
  { x:  0.60, y:  0.46 },
  { x:  0.28, y:  0.78 },
  { x: -0.28, y:  0.78 },
  { x: -0.60, y:  0.46 },
  { x: -0.60, y: -0.46 }
];

const CREATE_ORDER = [7, 0, 1, 2, 3, 4, 5, 6];
const BUST_GROUP = [0, 0, 1, 2, 3, 3, 2, 1];
const CONNECTOR_INDEX = [0, 2, 4, 6];

function segDistance(p, a, b) {
  const pa = sub(p, a);
  const ba = sub(b, a);
  const h = clamp(dot(pa, ba) / dot(ba, ba));
  const q = { x: pa.x - ba.x * h, y: pa.y - ba.y * h };
  return Math.hypot(q.x, q.y);
}

function polygonPoints({ scale = 1, shift = { x: 0, y: 0 }, skew = 0 }) {
  return BASE_OCTAGON.map(v => ({ x: v.x * scale + shift.x + skew * v.y, y: v.y * scale + shift.y }));
}

function nodeGlow(p, c, r) {
  return Math.exp(-Math.pow(dist2(p, c) / r, 2.0));
}

function lineGlow(p, a, b, width) {
  return Math.exp(-Math.pow(segDistance(p, a, b) / width, 2.0));
}

function eventState(event, p, t) {
  const o = { pFront: { ...p }, pRear: { ...p }, createSweep: 0, impact: 0, crack: 0, crackCut: 0, bustMask: 0, bustAlpha: 1 };
  if (event === 'create') {
    o.createSweep = 1;
    return o;
  }
  if (event === 'absorb') {
    const impact = { x: 0.65, y: -0.06 };
    const g = Math.exp(-(((p.x - impact.x) ** 2) / 0.022 + ((p.y - impact.y) ** 2) / 0.085));
    o.pFront = { x: p.x - 0.090 * g, y: p.y + 0.020 * g };
    o.pRear = { x: p.x - 0.052 * g, y: p.y + 0.010 * g };
    o.impact = g * clamp(1 - Math.abs(t - 0.27) / 0.23);
    return o;
  }
  if (event === 'fracture') {
    const crackD = p.y - (0.58 * p.x + 0.02);
    const side = crackD >= 0 ? 1 : -1;
    o.pFront = { x: p.x + side * (0.06 + 0.09 * t), y: p.y - side * (0.03 + 0.05 * t) };
    o.pRear = { x: p.x + side * (0.04 + 0.07 * t), y: p.y - side * (0.02 + 0.03 * t) };
    o.crack = Math.exp(-Math.pow(Math.abs(crackD) / 0.040, 2.0));
    o.crackCut = smoothstep(0.032, 0.0, Math.abs(crackD));
    return o;
  }
  if (event === 'bust') {
    const sign = p.x >= 0 ? 1 : -1;
    const span = 0.06 + 0.15 * t;
    o.pFront = { x: p.x + sign * span, y: p.y - 0.02 * Math.sign(p.y) * t };
    o.pRear = { x: p.x + sign * span * 0.72, y: p.y - 0.016 * Math.sign(p.y) * t };
    o.bustMask = smoothstep(0.00, 0.28, 0.30 - Math.abs(p.x));
    o.bustAlpha = 1 - 0.68 * t;
    return o;
  }
  return o;
}

function createSegmentActivation(segmentIndex, t) {
  const order = CREATE_ORDER[segmentIndex];
  const threshold = order / 8 * 0.58;
  const end = threshold + 0.17;
  return smoothstep(threshold, end, t);
}

function bustSegmentActivation(segmentIndex, t) {
  const group = BUST_GROUP[segmentIndex];
  const threshold = group * 0.18;
  return 1 - smoothstep(threshold, threshold + 0.24, t);
}

function contourContribution(p, points, event, t, thickness) {
  let cov = 0;
  let railGlow = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const d = segDistance(p, a, b);
    let active = 1;
    if (event === 'create') active = createSegmentActivation(i, t);
    if (event === 'bust') active = bustSegmentActivation(i, t);
    cov = Math.max(cov, smoothstep(thickness, 0.0, d) * active);
    railGlow += Math.exp(-Math.pow(d / (thickness * 1.25), 2.0)) * active;
  }
  return { cov, railGlow };
}

function connectorContribution(p, frontPts, rearPts, event, t, thickness) {
  let cov = 0, glow = 0;
  for (const idx of CONNECTOR_INDEX) {
    const a = frontPts[idx], b = rearPts[idx];
    const d = segDistance(p, a, b);
    let active = 1;
    if (event === 'create') active = smoothstep(0.12, 0.36, t) * smoothstep(0.02, 0.18, t);
    if (event === 'bust') active = 1 - smoothstep(0.08, 0.42, t);
    cov = Math.max(cov, smoothstep(thickness, 0.0, d) * active);
    glow += Math.exp(-Math.pow(d / (thickness * 1.10), 2.0)) * active;
  }
  return { cov, glow };
}

function transformPoint(uv, H) {
  return {
    x: (uv.x - 0.5) * 2.0,
    y: (uv.y - 0.5) * 2.0
  };
}

export function sampleBarrier({ event = 'create', tMs = 0, receiverHeightPx = 64, uv = { x: 0.5, y: 0.5 }, background = 'dark', coreLightEnabled = true }) {
  const H = receiverHeightPx;
  const dur = EVENTS[event].durationMs;
  const t = clamp(tMs / dur);
  const p = transformPoint(uv, H);
  const frontShift = { x: DESIGN.frontPlaneOffsetPxAtH64.x / H, y: DESIGN.frontPlaneOffsetPxAtH64.y / H };
  const rearShift = { x: DESIGN.rearPlaneOffsetPxAtH64.x / H, y: DESIGN.rearPlaneOffsetPxAtH64.y / H };
  const thickness = DESIGN.contourThicknessPxAtH64 / H;
  const connThickness = DESIGN.connectorThicknessPxAtH64 / H;

  const state = eventState(event, p, t);
  const frontPts = polygonPoints({ scale: 1.00, shift: frontShift, skew: -0.018 });
  const rearPts = polygonPoints({ scale: 0.93, shift: rearShift, skew: 0.015 });

  const front = contourContribution(state.pFront, frontPts, event, t, thickness);
  const rear = contourContribution(state.pRear, rearPts, event, t, thickness * 0.95);
  const connectors = connectorContribution(p, frontPts, rearPts, event, t, connThickness);

  let frontCov = front.cov;
  let rearCov = rear.cov;
  let connCov = connectors.cov;
  if (event === 'fracture') {
    const cut = 1 - 0.98 * state.crackCut;
    frontCov *= cut;
    rearCov *= cut;
    connCov *= (1 - 0.95 * state.crackCut);
  }
  if (event === 'bust') {
    const cut = 1 - 0.88 * state.bustMask;
    frontCov *= cut * state.bustAlpha;
    rearCov *= cut * state.bustAlpha;
    connCov *= (1 - 0.95 * t) * state.bustAlpha;
  }

  const baseFront = [0.20, 0.83, 0.98];
  const baseRear = [0.10, 0.42, 0.92];
  const baseConn = [0.24, 0.96, 1.00];

  let alpha = clamp(0.52 * frontCov + 0.36 * rearCov + 0.24 * connCov, 0, DESIGN.maxAlpha);
  let premul = [0, 0, 0];
  premul = add3(premul, mul3(baseRear, rearCov * 0.42 * alpha));
  premul = add3(premul, mul3(baseFront, frontCov * 0.62 * alpha));
  premul = add3(premul, mul3(baseConn, connCov * 0.36 * alpha));

  // local emitters at vertices
  let nodeFront = 0, nodeRear = 0;
  for (const i of [0, 2, 4, 6]) {
    nodeFront += nodeGlow(p, frontPts[i], 0.095);
    nodeRear += nodeGlow(p, rearPts[i], 0.080);
  }

  let radiance = [0, 0, 0];
  radiance = add3(radiance, mul3([0.16, 0.85, 1.28], 0.17 * nodeFront));
  radiance = add3(radiance, mul3([0.08, 0.40, 0.92], 0.11 * nodeRear));
  radiance = add3(radiance, mul3([0.12, 0.70, 1.06], 0.08 * front.railGlow));
  radiance = add3(radiance, mul3([0.06, 0.36, 0.88], 0.05 * rear.railGlow));
  radiance = add3(radiance, mul3([0.14, 0.86, 1.16], 0.08 * connectors.glow));

  if (event === 'create') {
    const sweepA = { x: -0.72 + 1.40 * t, y: -0.76 };
    const sweepB = { x: -0.28 + 1.40 * t, y: 0.82 };
    const sweep = lineGlow(p, sweepA, sweepB, 0.11);
    radiance = add3(radiance, mul3([0.28, 1.10, 1.32], 0.34 * sweep));
    alpha = clamp(alpha + 0.05 * sweep, 0, DESIGN.maxAlpha);
  }
  if (event === 'absorb') {
    const impactPt = { x: 0.65, y: -0.06 };
    const rearPt = { x: 0.32, y: -0.02 };
    const brace = lineGlow(p, impactPt, rearPt, 0.07);
    const impactRing = Math.exp(-Math.pow((length2((p.x - impactPt.x), (p.y - impactPt.y) * 0.85) - 0.17) / 0.05, 2.0));
    radiance = add3(radiance, mul3([0.58, 1.30, 1.44], 0.62 * state.impact));
    radiance = add3(radiance, mul3([0.20, 0.90, 1.12], 0.24 * impactRing));
    radiance = add3(radiance, mul3([0.22, 1.02, 1.24], 0.20 * brace));
    alpha = clamp(alpha + 0.07 * state.impact, 0, DESIGN.maxAlpha);
  }
  if (event === 'fracture') {
    radiance = add3(radiance, mul3([0.42, 1.08, 1.22], 0.34 * state.crack));
    alpha = clamp(alpha * (1 - 0.32 * state.crackCut) + 0.07 * state.crack, 0, DESIGN.maxAlpha);
  }
  if (event === 'bust') {
    const shut1 = lineGlow(p, { x: -0.20, y: -0.08 }, { x: 0.20, y: -0.08 }, 0.08);
    const shut2 = lineGlow(p, { x: -0.22, y: 0.10 }, { x: 0.22, y: 0.10 }, 0.08);
    radiance = add3(radiance, mul3([0.22, 0.92, 1.18], 0.13 * (shut1 + shut2)));
  }

  if (!coreLightEnabled) radiance = mul3(radiance, 0.84);
  premul = add3(premul, radiance);

  // source-bound local lens response
  const sourceEnergy = Math.max(...radiance);
  const haloWeight = sourceEnergy > DESIGN.haloThreshold ? smoothstep(DESIGN.haloThreshold, DESIGN.haloThreshold + 0.7, sourceEnergy) : 0;
  const haloShape = 0.32 * nodeFront + 0.20 * nodeRear + (event === 'absorb' ? 0.55 * state.impact : 0) + (event === 'fracture' ? 0.38 * state.crack : 0);
  const localHalo = haloWeight * haloShape * 0.18;
  premul = add3(premul, mul3([0.09, 0.32, 0.54], localHalo));

  const bg = background === 'light' ? [0.92, 0.96, 1.00] : [0.03, 0.07, 0.11];
  const composed = add3(mul3(bg, 1 - alpha), premul).map(v => Math.max(0, v));

  const receiverAirspaceFilled = alpha > 0.24 && Math.abs(p.x) < 0.18 && Math.abs(p.y) < 0.30;
  return {
    alpha,
    premul,
    composed,
    radiance,
    diagnostics: {
      receiverAirspaceFilled,
      sourceEnergy,
      frontCov,
      rearCov,
      connCov,
      impact: state.impact,
      crack: state.crack,
      event,
      t
    }
  };
}
