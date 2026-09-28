export const VERSION = 'barrier-pro-r0.8';
export const EVENTS = {
  create: { durationMs: 650 },
  absorb: { durationMs: 650 },
  fracture: { durationMs: 480 },
  bust: { durationMs: 480 }
};

export const DESIGN = {
  fieldWidthH: 1.78,
  fieldHeightH: 2.00,
  maxAlpha: 0.90,
  haloThreshold: 0.92,
  frontCenter: { x: -0.12, y: -0.05 },
  rearCenter: { x: 0.16, y: 0.10 },
  frontHalf: { x: 0.40, y: 0.62 },
  rearHalf: { x: 0.34, y: 0.53 },
  frontRadius: 0.13,
  rearRadius: 0.11,
  contourThicknessPxAtH64: 4.8,
  connectorThicknessPxAtH64: 3.8,
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a * (1 - t) + b * t;
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const dot2 = (a, b) => a.x * b.x + a.y * b.y;

function sdRoundRect(p, c, h, r) {
  const qx = Math.abs(p.x - c.x) - h.x + r;
  const qy = Math.abs(p.y - c.y) - h.y + r;
  const ex = Math.max(qx, 0);
  const ey = Math.max(qy, 0);
  return Math.hypot(ex, ey) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdSegment(p, a, b) {
  const pax = p.x - a.x, pay = p.y - a.y;
  const bax = b.x - a.x, bay = b.y - a.y;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay));
  return Math.hypot(pax - bax * h, pay - bay * h);
}
function segmentCoverage(d, halfWidth) {
  return smoothstep(halfWidth, 0, d);
}
function gaussianDistance(d, sigma) {
  return Math.exp(-Math.pow(d / sigma, 2));
}
function roundedRectContour(p, c, h, r, thick) {
  const sd = sdRoundRect(p, c, h, r);
  const cov = segmentCoverage(Math.abs(sd), thick);
  const rail = gaussianDistance(Math.abs(sd), thick * 1.2);
  const band = smoothstep(-0.015, -0.055, sd) * (1 - smoothstep(-0.11, -0.18, sd));
  return { sd, cov, rail, band };
}
function point(x, y) { return { x, y }; }
function cornerPoints(c, h, inset = 0.02) {
  return {
    tl: point(c.x - h.x + inset, c.y - h.y + inset),
    tr: point(c.x + h.x - inset, c.y - h.y + inset),
    br: point(c.x + h.x - inset, c.y + h.y - inset),
    bl: point(c.x - h.x + inset, c.y + h.y - inset),
    lm: point(c.x - h.x + inset, c.y),
    rm: point(c.x + h.x - inset, c.y),
    tm: point(c.x, c.y - h.y + inset),
    bm: point(c.x, c.y + h.y - inset),
  };
}

function createActivation(kind, t) {
  if (kind === 'rear') return smoothstep(0.00, 0.18, t);
  if (kind === 'connectors') return smoothstep(0.14, 0.34, t);
  if (kind === 'front') return smoothstep(0.26, 0.56, t);
  if (kind === 'sweep') return smoothstep(0.05, 0.70, t) * (1 - smoothstep(0.74, 0.92, t));
  return 1;
}

function bustStateMask(p, t) {
  // Orderly deauthorization: center authorization zone empties first, then side structure fades.
  const centerOff = smoothstep(0.10, 0.48, t) * smoothstep(0.36, 0.00, Math.abs(p.x));
  const stripe = 0.55 + 0.45 * Math.cos((p.y + 0.7) * 23.0);
  const striped = smoothstep(0.30, 0.85, stripe);
  const sideRemain = 1 - centerOff;
  const laterFade = 1 - smoothstep(0.56, 1.00, t);
  return clamp(sideRemain * mix(1.0, striped, smoothstep(0.18, 0.66, t)) * laterFade, 0, 1);
}

function eventDeformation(event, p, t) {
  let pf = { ...p }, pr = { ...p };
  let impact = 0, impactRing = 0, transmit = 0;
  let crack = 0, crackCut = 0, crackSide = 0;
  let bustCenter = 0;

  if (event === 'absorb') {
    const impactPt = point(0.37, -0.12);
    const dx = p.x - impactPt.x, dy = p.y - impactPt.y;
    const g = Math.exp(-(dx * dx / 0.020 + dy * dy / 0.070));
    pf = { x: p.x - 0.11 * g, y: p.y + 0.015 * g };
    pr = { x: p.x - 0.065 * g, y: p.y + 0.010 * g };
    impact = g * clamp(1 - Math.abs(t - 0.27) / 0.23);
    impactRing = Math.exp(-Math.pow((Math.hypot(dx * 1.05, dy * 0.78) - 0.12) / 0.045, 2));
    transmit = gaussianDistance(sdSegment(p, impactPt, point(0.18, -0.05)), 0.065) * smoothstep(0.08, 0.22, t);
  } else if (event === 'fracture') {
    const crackD = p.y - (0.74 * p.x + 0.03);
    const side = crackD >= 0 ? 1 : -1;
    crackSide = side;
    pf = { x: p.x + side * (0.08 + 0.11 * t), y: p.y - side * (0.05 + 0.06 * t) };
    pr = { x: p.x + side * (0.05 + 0.08 * t), y: p.y - side * (0.03 + 0.04 * t) };
    crack = gaussianDistance(Math.abs(crackD), 0.040);
    crackCut = smoothstep(0.045, 0.0, Math.abs(crackD));
  } else if (event === 'bust') {
    const sign = p.x >= 0 ? 1 : -1;
    const peel = smoothstep(0.04, 0.52, t);
    pf = { x: p.x + sign * 0.08 * peel, y: p.y - 0.02 * Math.sign(p.y) * peel };
    pr = { x: p.x + sign * 0.05 * peel, y: p.y - 0.012 * Math.sign(p.y) * peel };
    bustCenter = smoothstep(0.10, 0.42, t) * smoothstep(0.34, 0.0, Math.abs(p.x));
  }
  return { pf, pr, impact, impactRing, transmit, crack, crackCut, crackSide, bustCenter };
}

function transformPoint(uv) {
  return { x: (uv.x - 0.5) * 2.0, y: (uv.y - 0.5) * 2.0 };
}

function buildConnectors(frontC, rearC) {
  const f = cornerPoints(frontC, DESIGN.frontHalf, 0.03);
  const r = cornerPoints(rearC, DESIGN.rearHalf, 0.03);
  return [
    [f.tl, r.tl], [f.tr, r.tr], [f.br, r.br], [f.bl, r.bl],
    [f.rm, r.rm], [f.lm, r.lm]
  ];
}

export function sampleBarrier({ event = 'create', tMs = 0, receiverHeightPx = 64, uv = { x: 0.5, y: 0.5 }, background = 'dark', coreLightEnabled = true }) {
  const H = receiverHeightPx;
  const thick = DESIGN.contourThicknessPxAtH64 / H;
  const connThick = DESIGN.connectorThicknessPxAtH64 / H;
  const t = clamp(tMs / EVENTS[event].durationMs);
  const p = transformPoint(uv);
  const def = eventDeformation(event, p, t);

  const front = roundedRectContour(def.pf, DESIGN.frontCenter, DESIGN.frontHalf, DESIGN.frontRadius, thick);
  const rear = roundedRectContour(def.pr, DESIGN.rearCenter, DESIGN.rearHalf, DESIGN.rearRadius, thick * 0.92);

  const connectors = buildConnectors(DESIGN.frontCenter, DESIGN.rearCenter);
  let connCov = 0, connGlow = 0, sideRibbon = 0;
  for (let i = 0; i < connectors.length; i++) {
    const [a, b] = connectors[i];
    const d = sdSegment(p, a, b);
    connCov = Math.max(connCov, segmentCoverage(d, connThick));
    connGlow += gaussianDistance(d, connThick * 1.1);
    if (i >= 4) sideRibbon = Math.max(sideRibbon, gaussianDistance(d, 0.11));
  }

  const frontAct = event === 'create' ? createActivation('front', t) : 1;
  const rearAct = event === 'create' ? createActivation('rear', t) : 1;
  const connAct = event === 'create' ? createActivation('connectors', t) : 1;

  let frontCov = front.cov * frontAct;
  let rearCov = rear.cov * rearAct;
  let frontBand = front.band * frontAct;
  let rearBand = rear.band * rearAct;
  connCov *= connAct;
  sideRibbon *= connAct;

  if (event === 'fracture') {
    const keep = 1 - 0.95 * def.crackCut;
    frontCov *= keep; rearCov *= keep; connCov *= keep;
    frontBand *= (1 - 0.88 * def.crackCut);
    rearBand *= (1 - 0.84 * def.crackCut);
  }
  if (event === 'bust') {
    const mask = bustStateMask(p, t);
    frontCov *= mask; rearCov *= mask; connCov *= mask;
    frontBand *= mask * (1 - 0.20 * def.bustCenter);
    rearBand *= mask * (1 - 0.18 * def.bustCenter);
    sideRibbon *= mask * (1 - 0.40 * def.bustCenter);
  }

  let alpha = clamp(
    0.36 * frontBand + 0.26 * rearBand + 0.52 * frontCov + 0.30 * rearCov + 0.24 * connCov + 0.12 * sideRibbon,
    0,
    DESIGN.maxAlpha
  );

  const colorFront = [0.18, 0.83, 0.98];
  const colorRear = [0.08, 0.40, 0.92];
  const colorSkin = [0.10, 0.58, 0.96];
  const colorConn = [0.22, 0.96, 1.00];

  let premul = [0, 0, 0];
  premul = add3(premul, mul3(colorRear, 0.24 * rearBand));
  premul = add3(premul, mul3(colorSkin, 0.14 * sideRibbon));
  premul = add3(premul, mul3(colorFront, 0.34 * frontBand));
  premul = add3(premul, mul3(colorRear, 0.20 * rearCov));
  premul = add3(premul, mul3(colorFront, 0.32 * frontCov));
  premul = add3(premul, mul3(colorConn, 0.22 * connCov));
  premul = mul3(premul, alpha);

  const nodesF = cornerPoints(DESIGN.frontCenter, DESIGN.frontHalf, 0.03);
  const nodesR = cornerPoints(DESIGN.rearCenter, DESIGN.rearHalf, 0.03);
  const nodeListF = [nodesF.tl, nodesF.tr, nodesF.br, nodesF.bl, nodesF.rm, nodesF.lm];
  const nodeListR = [nodesR.tl, nodesR.tr, nodesR.br, nodesR.bl, nodesR.rm, nodesR.lm];

  let nodeFront = 0, nodeRear = 0;
  for (const n of nodeListF) nodeFront += gaussianDistance(dist(p, n), 0.082);
  for (const n of nodeListR) nodeRear += gaussianDistance(dist(p, n), 0.070);

  let radiance = [0, 0, 0];
  radiance = add3(radiance, mul3([0.12, 0.74, 1.18], 0.10 * front.rail * frontAct));
  radiance = add3(radiance, mul3([0.06, 0.34, 0.90], 0.06 * rear.rail * rearAct));
  radiance = add3(radiance, mul3([0.18, 0.90, 1.28], 0.16 * nodeFront * frontAct));
  radiance = add3(radiance, mul3([0.08, 0.40, 0.95], 0.10 * nodeRear * rearAct));
  radiance = add3(radiance, mul3([0.16, 0.88, 1.22], 0.10 * connGlow * connAct));

  if (event === 'create') {
    const sweepA = point(-0.58 + 1.10 * t, -0.70);
    const sweepB = point(-0.26 + 1.10 * t, 0.72);
    const sweep = gaussianDistance(sdSegment(p, sweepA, sweepB), 0.10) * createActivation('sweep', t);
    radiance = add3(radiance, mul3([0.30, 1.10, 1.34], 0.32 * sweep));
    alpha = clamp(alpha + 0.04 * sweep, 0, DESIGN.maxAlpha);
  } else if (event === 'absorb') {
    const impactPt = point(0.37, -0.12);
    const tile = roundedRectContour(p, impactPt, { x: 0.07, y: 0.10 }, 0.03, 0.030);
    const tileGlow = tile.cov + 0.55 * tile.band;
    radiance = add3(radiance, mul3([0.56, 1.30, 1.46], 0.55 * def.impact));
    radiance = add3(radiance, mul3([0.24, 0.98, 1.24], 0.26 * def.impactRing));
    radiance = add3(radiance, mul3([0.22, 1.02, 1.28], 0.18 * def.transmit));
    radiance = add3(radiance, mul3([0.34, 1.16, 1.40], 0.18 * tileGlow * smoothstep(0.10, 0.24, t)));
    alpha = clamp(alpha + 0.06 * def.impact + 0.03 * tileGlow, 0, DESIGN.maxAlpha);
  } else if (event === 'fracture') {
    radiance = add3(radiance, mul3([0.40, 1.08, 1.24], 0.34 * def.crack));
    alpha = clamp(alpha * (1 - 0.25 * def.crackCut) + 0.07 * def.crack, 0, DESIGN.maxAlpha);
  } else if (event === 'bust') {
    const bar1 = gaussianDistance(sdSegment(p, point(-0.22, -0.18 + 0.14 * t), point(0.22, -0.18 + 0.14 * t)), 0.055);
    const bar2 = gaussianDistance(sdSegment(p, point(-0.26, 0.00), point(0.26, 0.00)), 0.050);
    const bar3 = gaussianDistance(sdSegment(p, point(-0.22, 0.18 - 0.14 * t), point(0.22, 0.18 - 0.14 * t)), 0.055);
    radiance = add3(radiance, mul3([0.24, 0.98, 1.22], 0.16 * (bar1 + bar2 + bar3) * (1 - smoothstep(0.56, 0.94, t))));
  }

  if (!coreLightEnabled) radiance = mul3(radiance, 0.84);
  premul = add3(premul, radiance);

  const sourceEnergy = Math.max(radiance[0], radiance[1], radiance[2]);
  const haloWeight = sourceEnergy > DESIGN.haloThreshold ? smoothstep(DESIGN.haloThreshold, DESIGN.haloThreshold + 0.75, sourceEnergy) : 0;
  const haloShape = 0.28 * nodeFront + 0.18 * nodeRear + (event === 'absorb' ? 0.55 * def.impact : 0) + (event === 'fracture' ? 0.35 * def.crack : 0) + (event === 'bust' ? 0.18 * (1 - def.bustCenter) : 0);
  premul = add3(premul, mul3([0.08, 0.28, 0.50], 0.16 * haloWeight * haloShape));

  const bg = background === 'light' ? [0.92, 0.96, 1.0] : [0.03, 0.07, 0.11];
  const composed = add3(mul3(bg, 1 - alpha), premul).map(v => Math.max(0, v));

  const receiverAirspaceFilled = alpha > 0.24 && Math.abs(p.x) < 0.18 && Math.abs(p.y) < 0.34;
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
      frontBand,
      rearBand,
      connCov,
      sideRibbon,
      event,
      t,
      impact: def.impact,
      crack: def.crack,
      bustCenter: def.bustCenter
    }
  };
}
