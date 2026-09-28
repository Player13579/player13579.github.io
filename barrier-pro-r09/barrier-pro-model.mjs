export const VERSION = 'barrier-pro-r0.9';

export const EVENTS = {
  create: { durationMs: 650 },
  absorb: { durationMs: 650 },
  fracture: { durationMs: 480 },
  bust: { durationMs: 480 }
};

export const DESIGN = {
  fieldWidthH: 1.92,
  fieldHeightH: 2.18,
  frontCenter: { x: -0.18, y: -0.03 },
  rearCenter: { x: 0.18, y: 0.08 },
  frontHalf: { x: 0.35, y: 0.56 },
  rearHalf: { x: 0.30, y: 0.48 },
  contourPxAtH64: 4.4,
  beamPxAtH64: 3.4,
  nodePxAtH64: 5.2,
  maxAlpha: 0.88,
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a * (1 - t) + b * t;
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const len2 = (x, y) => Math.hypot(x, y);
const sq = x => x * x;
const gauss = (d, sigma) => Math.exp(-sq(d / sigma));

function point(x, y) { return { x, y }; }
function toLocal(uv) { return { x: (uv.x - 0.5) * 2, y: (uv.y - 0.5) * 2 }; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function sdSegment(p, a, b) {
  const pax = p.x - a.x, pay = p.y - a.y;
  const bax = b.x - a.x, bay = b.y - a.y;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay));
  return len2(pax - bax * h, pay - bay * h);
}
function segCov(p, a, b, halfW) { return smooth(halfW, 0, sdSegment(p, a, b)); }
function nodeCov(p, c, r) {
  const dx = Math.abs(p.x - c.x), dy = Math.abs(p.y - c.y);
  return smooth(r, r * 0.28, Math.max(dx, dy));
}

function corners(c, h) {
  return {
    tl: point(c.x - h.x, c.y - h.y),
    tr: point(c.x + h.x, c.y - h.y),
    br: point(c.x + h.x, c.y + h.y),
    bl: point(c.x - h.x, c.y + h.y),
    lm: point(c.x - h.x, c.y),
    rm: point(c.x + h.x, c.y),
    tm: point(c.x, c.y - h.y),
    bm: point(c.x, c.y + h.y),
  };
}

function bracketSegments(c, h, leg) {
  const k = corners(c, h);
  return [
    [k.tl, point(k.tl.x + leg, k.tl.y)], [k.tl, point(k.tl.x, k.tl.y + leg)],
    [k.tr, point(k.tr.x - leg, k.tr.y)], [k.tr, point(k.tr.x, k.tr.y + leg)],
    [k.br, point(k.br.x - leg, k.br.y)], [k.br, point(k.br.x, k.br.y - leg)],
    [k.bl, point(k.bl.x + leg, k.bl.y)], [k.bl, point(k.bl.x, k.bl.y - leg)],
  ];
}

function connectorSegments(fc, rc, fh, rh) {
  const f = corners(fc, fh), r = corners(rc, rh);
  return [
    [f.tl, r.tl], [f.tr, r.tr], [f.br, r.br], [f.bl, r.bl],
    [f.lm, r.lm], [f.rm, r.rm]
  ];
}

function ribbonCoverage(p, a, b, width) {
  return gauss(sdSegment(p, a, b), width) * smooth(0.82, 0.16, Math.abs(p.y - (a.y + b.y) * 0.5));
}

function createActivation(kind, t) {
  if (kind === 'rear') return smooth(0.00, 0.16, t);
  if (kind === 'beam') return smooth(0.12, 0.30, t);
  if (kind === 'front') return smooth(0.26, 0.52, t);
  if (kind === 'sweep') return smooth(0.08, 0.68, t) * (1 - smooth(0.74, 0.92, t));
  return 1;
}

function bustMask(p, t) {
  const centerOff = smooth(0.08, 0.42, t) * smooth(0.30, 0.0, Math.abs(p.x));
  const bands = (gauss(p.y + 0.22 - 0.14 * t, 0.055) + gauss(p.y, 0.050) + gauss(p.y - 0.22 + 0.14 * t, 0.055));
  const sideHold = 1 - centerOff;
  const fade = 1 - smooth(0.56, 1.0, t);
  return clamp(sideHold * fade, 0, 1), bands;
}

function deform(event, p, t) {
  let pf = { ...p }, pr = { ...p };
  let absorbImpact = 0, absorbPulse = 0, absorbTile = 0;
  let fracLine = 0, fracCut = 0;
  let bustCenter = 0;
  const impactPt = point(0.33, -0.08);
  if (event === 'absorb') {
    const dx = p.x - impactPt.x, dy = p.y - impactPt.y;
    const lobe = Math.exp(-(dx * dx / 0.018 + dy * dy / 0.060));
    pf = { x: p.x - 0.10 * lobe, y: p.y + 0.01 * lobe };
    pr = { x: p.x - 0.05 * lobe, y: p.y + 0.006 * lobe };
    absorbImpact = lobe * clamp(1 - Math.abs(t - 0.26) / 0.22);
    absorbPulse = gauss(sdSegment(p, impactPt, point(0.02, -0.03)), 0.06) * smooth(0.10, 0.26, t);
    absorbTile = Math.max(
      segCov(p, point(0.24, -0.18), point(0.24, 0.02), 0.028),
      segCov(p, point(0.24, -0.18), point(0.40, -0.18), 0.028),
      segCov(p, point(0.24, 0.02), point(0.40, 0.02), 0.028),
      segCov(p, point(0.40, -0.18), point(0.40, 0.02), 0.028)
    ) * smooth(0.10, 0.22, t);
  }
  if (event === 'fracture') {
    const d = p.y - (0.78 * p.x + 0.00);
    const s = d >= 0 ? 1 : -1;
    pf = { x: p.x + s * (0.09 + 0.08 * t), y: p.y - s * (0.05 + 0.05 * t) };
    pr = { x: p.x + s * (0.06 + 0.05 * t), y: p.y - s * (0.03 + 0.04 * t) };
    fracLine = gauss(Math.abs(d), 0.040);
    fracCut = smooth(0.042, 0.0, Math.abs(d));
  }
  if (event === 'bust') {
    const sign = p.x >= 0 ? 1 : -1;
    const peel = smooth(0.06, 0.44, t);
    pf = { x: p.x + sign * 0.085 * peel, y: p.y - 0.018 * Math.sign(p.y || 1) * peel };
    pr = { x: p.x + sign * 0.050 * peel, y: p.y - 0.010 * Math.sign(p.y || 1) * peel };
    bustCenter = smooth(0.10, 0.42, t) * smooth(0.34, 0.0, Math.abs(p.x));
  }
  return { pf, pr, absorbImpact, absorbPulse, absorbTile, fracLine, fracCut, bustCenter };
}

function evaluateStructure(event, p, t, H) {
  const thick = DESIGN.contourPxAtH64 / H;
  const beamW = DESIGN.beamPxAtH64 / H;
  const nodeR = DESIGN.nodePxAtH64 / H;
  const legF = 0.16, legR = 0.13;
  const { pf, pr, absorbImpact, absorbPulse, absorbTile, fracLine, fracCut, bustCenter } = deform(event, p, t);

  const frontBr = bracketSegments(DESIGN.frontCenter, DESIGN.frontHalf, legF);
  const rearBr = bracketSegments(DESIGN.rearCenter, DESIGN.rearHalf, legR);
  const beams = connectorSegments(DESIGN.frontCenter, DESIGN.rearCenter, DESIGN.frontHalf, DESIGN.rearHalf);
  const frontNodes = Object.values(corners(DESIGN.frontCenter, DESIGN.frontHalf)).slice(0, 6);
  const rearNodes = Object.values(corners(DESIGN.rearCenter, DESIGN.rearHalf)).slice(0, 6);

  let frontCov = 0, rearCov = 0, beamCov = 0, nodeFront = 0, nodeRear = 0;
  let sideL = 0, sideR = 0;

  for (const [a, b] of frontBr) frontCov = Math.max(frontCov, segCov(pf, a, b, thick));
  for (const [a, b] of rearBr) rearCov = Math.max(rearCov, segCov(pr, a, b, thick * 0.88));
  for (const [a, b] of beams) beamCov = Math.max(beamCov, segCov(p, a, b, beamW));
  for (const n of frontNodes) nodeFront += nodeCov(pf, n, nodeR);
  for (const n of rearNodes) nodeRear += nodeCov(pr, n, nodeR * 0.9);

  const fC = corners(DESIGN.frontCenter, DESIGN.frontHalf), rC = corners(DESIGN.rearCenter, DESIGN.rearHalf);
  sideL = ribbonCoverage(p, fC.lm, rC.lm, 0.10);
  sideR = ribbonCoverage(p, fC.rm, rC.rm, 0.10);

  const actFront = event === 'create' ? createActivation('front', t) : 1;
  const actRear = event === 'create' ? createActivation('rear', t) : 1;
  const actBeam = event === 'create' ? createActivation('beam', t) : 1;

  frontCov *= actFront;
  rearCov *= actRear;
  beamCov *= actBeam;
  nodeFront *= actFront;
  nodeRear *= actRear;
  sideL *= actBeam;
  sideR *= actBeam;

  if (event === 'fracture') {
    const keep = 1 - 0.98 * fracCut;
    frontCov *= keep; rearCov *= keep; beamCov *= keep;
    sideL *= keep; sideR *= keep;
  }
  let bustBands = 0;
  if (event === 'bust') {
    const centerOff = smooth(0.08, 0.42, t) * smooth(0.30, 0.0, Math.abs(p.x));
    const fade = 1 - smooth(0.56, 1.0, t);
    const sideMask = (1 - centerOff) * fade;
    bustBands = (gauss(p.y + 0.22 - 0.14 * t, 0.055) + gauss(p.y, 0.050) + gauss(p.y - 0.22 + 0.14 * t, 0.055)) * (1 - smooth(0.58, 0.96, t));
    frontCov *= sideMask; rearCov *= sideMask; beamCov *= sideMask;
    nodeFront *= sideMask; nodeRear *= sideMask;
    sideL *= sideMask; sideR *= sideMask;
  }

  const alpha = clamp(
    0.34 * rearCov + 0.56 * frontCov + 0.22 * beamCov + 0.14 * (sideL + sideR) + 0.05 * (nodeFront + nodeRear),
    0,
    DESIGN.maxAlpha
  );

  return {
    alpha,
    frontCov, rearCov, beamCov, sideL, sideR, nodeFront, nodeRear,
    absorbImpact, absorbPulse, absorbTile, fracLine, fracCut, bustCenter, bustBands,
  };
}

export function sampleBarrier({ event = 'create', tMs = 0, receiverHeightPx = 64, uv = { x: 0.5, y: 0.5 }, background = 'dark', coreLightEnabled = true }) {
  const H = receiverHeightPx;
  const t = clamp(tMs / EVENTS[event].durationMs);
  const p = toLocal(uv);
  const S = evaluateStructure(event, p, t, H);

  const cFront = [0.17, 0.90, 1.00];
  const cRear = [0.10, 0.45, 0.98];
  const cBeam = [0.18, 0.82, 1.00];
  const cNode = [0.62, 0.98, 1.00];

  let premul = [0, 0, 0];
  premul = add3(premul, mul3(cRear, 0.22 * S.rearCov));
  premul = add3(premul, mul3(cFront, 0.30 * S.frontCov));
  premul = add3(premul, mul3(cBeam, 0.20 * S.beamCov));
  premul = add3(premul, mul3(cBeam, 0.08 * (S.sideL + S.sideR)));
  premul = add3(premul, mul3(cNode, 0.03 * (S.nodeFront + S.nodeRear)));
  premul = mul3(premul, S.alpha);

  let radiance = [0, 0, 0];
  radiance = add3(radiance, mul3([0.08, 0.42, 1.00], 0.06 * S.rearCov));
  radiance = add3(radiance, mul3([0.10, 0.82, 1.12], 0.10 * S.frontCov));
  radiance = add3(radiance, mul3([0.12, 0.78, 1.10], 0.08 * S.beamCov));
  radiance = add3(radiance, mul3([0.30, 1.10, 1.40], 0.05 * (S.nodeFront + 0.8 * S.nodeRear)));

  if (event === 'create') {
    const xA = -0.58 + 1.18 * t;
    const sweep = gauss(sdSegment(p, point(xA, -0.74), point(xA + 0.18, 0.74)), 0.11) * createActivation('sweep', t);
    radiance = add3(radiance, mul3([0.34, 1.18, 1.46], 0.26 * sweep));
  }
  if (event === 'absorb') {
    radiance = add3(radiance, mul3([0.56, 1.22, 1.48], 0.44 * S.absorbImpact));
    radiance = add3(radiance, mul3([0.28, 1.02, 1.34], 0.24 * S.absorbPulse));
    radiance = add3(radiance, mul3([0.42, 1.24, 1.56], 0.20 * S.absorbTile));
  }
  if (event === 'fracture') {
    radiance = add3(radiance, mul3([0.30, 1.02, 1.22], 0.34 * S.fracLine));
  }
  if (event === 'bust') {
    radiance = add3(radiance, mul3([0.22, 0.92, 1.20], 0.22 * S.bustBands));
    radiance = add3(radiance, mul3([0.30, 0.98, 1.18], 0.10 * (1 - smooth(0.50, 0.90, t)) * (S.sideL + S.sideR)));
  }

  if (!coreLightEnabled) radiance = mul3(radiance, 0.84);
  premul = add3(premul, radiance);

  const sourceEnergy = Math.max(...radiance);
  const halo = sourceEnergy > 0.78 ? smooth(0.78, 1.5, sourceEnergy) : 0;
  const localHalo = 0.18 * (S.nodeFront + S.absorbImpact + S.fracLine + 0.7 * S.bustBands);
  premul = add3(premul, mul3([0.06, 0.24, 0.44], halo * localHalo));

  const bg = background === 'light' ? [0.92, 0.96, 1.0] : [0.03, 0.07, 0.11];
  const composed = add3(mul3(bg, 1 - S.alpha), premul).map(v => Math.max(0, v));

  const receiverAirspaceFilled = S.alpha > 0.22 && Math.abs(p.x) < 0.16 && Math.abs(p.y) < 0.30;
  return {
    alpha: S.alpha,
    premul,
    composed,
    radiance,
    diagnostics: {
      event, t,
      receiverAirspaceFilled,
      sourceEnergy,
      frontCov: S.frontCov,
      rearCov: S.rearCov,
      beamCov: S.beamCov,
      sideL: S.sideL,
      sideR: S.sideR,
      absorbImpact: S.absorbImpact,
      absorbPulse: S.absorbPulse,
      absorbTile: S.absorbTile,
      fracLine: S.fracLine,
      fracCut: S.fracCut,
      bustCenter: S.bustCenter,
      bustBands: S.bustBands,
    }
  };
}
