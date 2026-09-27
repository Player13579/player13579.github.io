export const VERSION = 'barrier-pro-r0.6';
export const EVENTS = {
  create: { durationMs: 650 },
  absorb: { durationMs: 650 },
  fracture: { durationMs: 480 },
  bust: { durationMs: 480 }
};

export const DESIGN = {
  receiverHeightPx: { H64: 64, H100: 100 },
  fieldWidthH: 1.42,
  fieldHeightH: 1.68,
  frontDepthPxAtH64: 3.5,
  rearDepthPxAtH64: -3.5,
  ringThicknessH: 0.11,
  connectorThicknessH: 0.065,
  coreAirspaceMinAlpha: 0.0,
  haloRadiusH: 0.22,
  eventLensThreshold: 1.04
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a * (1 - t) + b * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const length2 = (x, y) => Math.hypot(x, y);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const max3 = (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
const mul3v = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];

function sdDigitalField(p, sx = 0.58, sy = 0.72, bevel = 0.20) {
  const ax = Math.abs(p.x), ay = Math.abs(p.y);
  const rect = Math.max(ax - sx, ay - sy);
  const diag = ax + bevel * ay - (sx + bevel * 0.40);
  return Math.max(rect, diag);
}

function sdSegment(p, a, b) {
  const pa = sub(p, a);
  const ba = sub(b, a);
  const h = clamp(dot(pa, ba) / dot(ba, ba));
  const q = { x: pa.x - ba.x * h, y: pa.y - ba.y * h };
  return length2(q.x, q.y);
}

function bandCoverage(p, shift, scale, thickness) {
  const q = { x: (p.x - shift.x) / scale.x, y: (p.y - shift.y) / scale.y };
  const outer = sdDigitalField(q, 0.60, 0.76, 0.22);
  const inner = sdDigitalField(q, 0.48, 0.63, 0.22);
  return smoothstep(0.06, 0.0, outer) * smoothstep(-0.01, 0.05, inner);
}

function connectorCoverage(p, signX, signY) {
  const a = { x: 0.42 * signX - 0.10, y: 0.52 * signY - 0.02 };
  const b = { x: 0.50 * signX + 0.10, y: 0.60 * signY + 0.03 };
  const d = sdSegment(p, a, b);
  return smoothstep(0.055, 0.0, d);
}

function nodeGlow(p, x, y, r = 0.095) {
  const d = length2(p.x - x, p.y - y);
  return Math.exp(-Math.pow(d / r, 2.0));
}

function lineGlow(p, a, b, width = 0.07) {
  const d = sdSegment(p, a, b);
  return Math.exp(-Math.pow(d / width, 2.0));
}

function sweepMask(p, s) {
  const edge = -0.95 + 1.9 * s;
  const basis = 0.58 * p.x - 0.82 * p.y;
  return smoothstep(-0.03, 0.03, edge - basis);
}

function eventDeform(event, p, t) {
  const out = { ...p, crack: 0, impact: 0, gate: 1, bustKill: 0 };
  if (event === 'create') {
    out.gate = sweepMask(p, t);
    const build = clamp(t);
    out.outlineBoost = build;
    return out;
  }
  if (event === 'absorb') {
    const c = { x: 0.50, y: -0.04 };
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const g = Math.exp(-((dx * dx) / 0.020 + (dy * dy) / 0.060));
    out.x = p.x - 0.075 * g;
    out.y = p.y + 0.018 * g;
    out.impact = g;
    out.localPulse = clamp(1.0 - Math.abs(t - 0.269) / 0.23);
    return out;
  }
  if (event === 'fracture') {
    const side = p.y - (0.36 * p.x + 0.03) > 0 ? 1 : -1;
    out.x = p.x + side * (0.05 + 0.07 * t);
    out.y = p.y - side * (0.02 + 0.02 * t);
    const crackD = Math.abs(p.y - (0.36 * p.x + 0.03));
    out.crack = Math.exp(-Math.pow(crackD / 0.045, 2.0));
    out.cut = smoothstep(0.020, 0.0, crackD);
    return out;
  }
  if (event === 'bust') {
    const side = p.x >= 0 ? 1 : -1;
    out.x = p.x + side * (0.10 + 0.14 * t);
    out.y = p.y - 0.03 * Math.sign(p.y) * t;
    out.bustKill = smoothstep(-0.02, 0.10, 0.22 - Math.abs(p.x));
    out.fadeSplit = 1 - 0.72 * clamp(t);
    return out;
  }
  return out;
}

export function getEventDurationMs(event) {
  if (!EVENTS[event]) throw new Error(`Unknown event: ${event}`);
  return EVENTS[event].durationMs;
}

export function sampleBarrier({ event = 'create', tMs = 0, receiverHeightPx = 64, uv = { x: 0.5, y: 0.5 }, background = 'dark', coreLightEnabled = true }) {
  const H = receiverHeightPx;
  const dur = getEventDurationMs(event);
  const t = clamp(tMs / dur, 0, 1);
  const wPx = DESIGN.fieldWidthH * H;
  const hPx = DESIGN.fieldHeightH * H;
  const p = {
    x: (uv.x - 0.5) * (2.0 / (wPx / H)),
    y: (uv.y - 0.5) * (2.0 / (hPx / H))
  };

  const d = eventDeform(event, p, t);
  const frontCov = bandCoverage(d, { x: -0.10, y: -0.02 }, { x: 1.0, y: 1.0 }, 0.11);
  const rearCov = bandCoverage(d, { x: 0.10, y: 0.04 }, { x: 1.04, y: 1.02 }, 0.11);
  const connCov = Math.max(
    connectorCoverage(d, 1, 1), connectorCoverage(d, -1, 1),
    connectorCoverage(d, 1, -1), connectorCoverage(d, -1, -1)
  );

  let gate = d.gate ?? 1;
  let fractureCut = 1;
  if (event === 'fracture') fractureCut = 1 - 0.94 * d.cut;
  if (event === 'bust') fractureCut = 1 - 0.86 * d.bustKill;

  let front = frontCov * gate * fractureCut;
  let rear = rearCov * gate * fractureCut;
  let conn = connCov * gate * (event === 'bust' ? d.fadeSplit : 1) * fractureCut;

  // Ensure central airspace remains open.
  const airspaceMask = 1 - smoothstep(0.16, 0.42, Math.abs(sdDigitalField(p, 0.42, 0.56, 0.20)));
  const shellAlpha = clamp(0.58 * front + 0.38 * rear + 0.26 * conn);
  let alpha = shellAlpha * (1 - 0.84 * airspaceMask);

  const baseFront = [0.18, 0.86, 1.00];
  const baseRear = [0.12, 0.48, 0.93];
  const connColor = [0.22, 0.96, 1.00];

  let transmittanceColor = [0, 0, 0];
  transmittanceColor = add3(transmittanceColor, mul3(baseRear, 0.42 * rear));
  transmittanceColor = add3(transmittanceColor, mul3(baseFront, 0.60 * front));
  transmittanceColor = add3(transmittanceColor, mul3(connColor, 0.32 * conn));

  // Local sources.
  let radiance = [0, 0, 0];
  const nodeFront = [
    nodeGlow(p, -0.48, -0.59), nodeGlow(p, 0.48, -0.59),
    nodeGlow(p, -0.52, 0.56), nodeGlow(p, 0.52, 0.56)
  ];
  const nodeRear = [
    nodeGlow(p, -0.32, -0.46, 0.08), nodeGlow(p, 0.36, -0.46, 0.08),
    nodeGlow(p, -0.35, 0.43, 0.08), nodeGlow(p, 0.39, 0.43, 0.08)
  ];
  const nodeFrontSum = nodeFront.reduce((a, b) => a + b, 0);
  const nodeRearSum = nodeRear.reduce((a, b) => a + b, 0);
  radiance = add3(radiance, mul3([0.18, 0.82, 1.28], 0.18 * nodeFrontSum * gate));
  radiance = add3(radiance, mul3([0.08, 0.42, 0.88], 0.10 * nodeRearSum * gate));

  const topRail = lineGlow(p, { x: -0.42, y: -0.51 }, { x: 0.42, y: -0.51 }, 0.06);
  const botRail = lineGlow(p, { x: -0.45, y: 0.49 }, { x: 0.45, y: 0.49 }, 0.06);
  radiance = add3(radiance, mul3([0.10, 0.66, 1.05], 0.14 * (topRail + botRail) * (front + rear > 0 ? 1 : 0)));

  if (event === 'create') {
    const frontWave = lineGlow(p, { x: -0.56 + 1.12 * t, y: -0.74 }, { x: -0.28 + 1.12 * t, y: 0.74 }, 0.10);
    radiance = add3(radiance, mul3([0.22, 1.06, 1.30], 0.36 * frontWave));
    alpha += 0.06 * frontWave;
  }
  if (event === 'absorb') {
    const ring = Math.exp(-Math.pow((length2(p.x - 0.48, (p.y + 0.04) * 0.8) - 0.18) / 0.05, 2.0));
    const impactCore = d.impact * (d.localPulse ?? 1);
    radiance = add3(radiance, mul3([0.55, 1.28, 1.40], 0.60 * impactCore));
    radiance = add3(radiance, mul3([0.24, 0.94, 1.12], 0.24 * ring));
    alpha += 0.08 * impactCore;
  }
  if (event === 'fracture') {
    const crackEdge = d.crack;
    radiance = add3(radiance, mul3([0.44, 1.16, 1.26], 0.34 * crackEdge));
    alpha = alpha * (1 - 0.44 * d.cut) + 0.08 * crackEdge;
  }
  if (event === 'bust') {
    const release = lineGlow(p, { x: -0.18, y: -0.12 }, { x: 0.18, y: -0.12 }, 0.09) + lineGlow(p, { x: -0.20, y: 0.11 }, { x: 0.20, y: 0.11 }, 0.09);
    radiance = add3(radiance, mul3([0.26, 0.94, 1.30], 0.14 * release));
    alpha *= (d.fadeSplit ?? 1);
  }

  if (!coreLightEnabled) {
    radiance = mul3(radiance, 0.86);
  }

  alpha = clamp(alpha, 0, 0.96);
  const premulBase = mul3(transmittanceColor, alpha);
  let rgb = add3(premulBase, radiance);

  // Source-bound local lens/halo response only around bright emitters.
  const sourceEnergy = Math.max(radiance[0], radiance[1], radiance[2]);
  const halo = sourceEnergy > DESIGN.eventLensThreshold
    ? smoothstep(DESIGN.eventLensThreshold, DESIGN.eventLensThreshold + 0.8, sourceEnergy) * 0.18
    : 0;
  const localHalo = halo * (0.35 * nodeFrontSum + 0.22 * topRail + 0.22 * botRail + 0.55 * (d.impact || 0));
  rgb = add3(rgb, mul3([0.10, 0.36, 0.56], localHalo));

  const bg = background === 'light' ? [0.92, 0.96, 1.00] : [0.03, 0.07, 0.11];
  const composed = add3(mul3(bg, 1 - alpha), rgb);

  const centerCoverage = smoothstep(0.12, 0.50, Math.abs(sdDigitalField(p, 0.36, 0.48, 0.20)));
  const receiverAirspaceFilled = alpha > 0.26 && centerCoverage < 0.33;

  return {
    alpha,
    premul: rgb,
    composed,
    radiance,
    transmittanceColor,
    shell: { front, rear, conn },
    diagnostics: {
      receiverAirspaceFilled,
      shellAlpha,
      sourceEnergy,
      halo,
      impact: d.impact || 0,
      crack: d.crack || 0
    }
  };
}
