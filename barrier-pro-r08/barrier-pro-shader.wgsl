struct Uniforms {
  resolution : vec2<f32>,
  receiver_height_px : f32,
  time_norm : f32,
  event_kind : u32,
  background_mode : u32,
  core_light_enabled : u32,
  _pad : u32,
};

@group(0) @binding(0) var<uniform> U : Uniforms;
@group(1) @binding(0) var barrierTex : texture_2d<f32>;

struct VSOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) uv : vec2<f32>,
};
struct Eval {
  premul : vec3<f32>,
  alpha : f32,
};

fn clamp01(x : f32) -> f32 { return clamp(x, 0.0, 1.0); }
fn smooth3(a : f32, b : f32, x : f32) -> f32 {
  let t = clamp01((x - a) / (b - a));
  return t * t * (3.0 - 2.0 * t);
}
fn sdRoundRect(p : vec2<f32>, c : vec2<f32>, h : vec2<f32>, r : f32) -> f32 {
  let q = abs(p - c) - h + vec2<f32>(r, r);
  return length(max(q, vec2<f32>(0.0, 0.0))) + min(max(q.x, q.y), 0.0) - r;
}
fn sdSegment(p : vec2<f32>, a : vec2<f32>, b : vec2<f32>) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
fn segmentCoverage(d : f32, halfWidth : f32) -> f32 { return smooth3(halfWidth, 0.0, d); }
fn gauss(d : f32, sigma : f32) -> f32 { return exp(-pow(d / sigma, 2.0)); }
fn pointDist(a : vec2<f32>, b : vec2<f32>) -> f32 { return length(a - b); }

struct RectEval {
  sd : f32,
  cov : f32,
  rail : f32,
  band : f32,
};
fn rectEval(p : vec2<f32>, c : vec2<f32>, h : vec2<f32>, r : f32, thick : f32) -> RectEval {
  let sd = sdRoundRect(p, c, h, r);
  let cov = segmentCoverage(abs(sd), thick);
  let rail = gauss(abs(sd), thick * 1.2);
  let band = smooth3(-0.015, -0.055, sd) * (1.0 - smooth3(-0.11, -0.18, sd));
  return RectEval(sd, cov, rail, band);
}

fn frontCenter() -> vec2<f32> { return vec2<f32>(-0.12, -0.05); }
fn rearCenter() -> vec2<f32> { return vec2<f32>(0.16, 0.10); }
fn frontHalf() -> vec2<f32> { return vec2<f32>(0.40, 0.62); }
fn rearHalf() -> vec2<f32> { return vec2<f32>(0.34, 0.53); }
fn frontRadius() -> f32 { return 0.13; }
fn rearRadius() -> f32 { return 0.11; }

fn cornerPoint(c : vec2<f32>, h : vec2<f32>, which : i32) -> vec2<f32> {
  let inset = 0.03;
  switch which {
    case 0: { return vec2<f32>(c.x - h.x + inset, c.y - h.y + inset); } // tl
    case 1: { return vec2<f32>(c.x + h.x - inset, c.y - h.y + inset); } // tr
    case 2: { return vec2<f32>(c.x + h.x - inset, c.y + h.y - inset); } // br
    case 3: { return vec2<f32>(c.x - h.x + inset, c.y + h.y - inset); } // bl
    case 4: { return vec2<f32>(c.x + h.x - inset, c.y); } // rm
    case 5: { return vec2<f32>(c.x - h.x + inset, c.y); } // lm
    default: { return c; }
  }
}
fn createActivation(which : i32, t : f32) -> f32 {
  switch which {
    case 0: { return smooth3(0.26, 0.56, t); } // front
    case 1: { return smooth3(0.00, 0.18, t); } // rear
    case 2: { return smooth3(0.14, 0.34, t); } // connectors
    case 3: { return smooth3(0.05, 0.70, t) * (1.0 - smooth3(0.74, 0.92, t)); } // sweep
    default: { return 1.0; }
  }
}
fn bustStateMask(p : vec2<f32>, t : f32) -> f32 {
  let centerOff = smooth3(0.10, 0.48, t) * smooth3(0.36, 0.0, abs(p.x));
  let stripe = 0.55 + 0.45 * cos((p.y + 0.7) * 23.0);
  let striped = smooth3(0.30, 0.85, stripe);
  let sideRemain = 1.0 - centerOff;
  let laterFade = 1.0 - smooth3(0.56, 1.00, t);
  return clamp(sideRemain * mix(1.0, striped, smooth3(0.18, 0.66, t)) * laterFade, 0.0, 1.0);
}

struct EventDef {
  pf : vec2<f32>,
  pr : vec2<f32>,
  impact : f32,
  impactRing : f32,
  transmit : f32,
  crack : f32,
  crackCut : f32,
  bustCenter : f32,
};
fn eventDef(p : vec2<f32>, t : f32) -> EventDef {
  var pf = p;
  var pr = p;
  var impact = 0.0;
  var impactRing = 0.0;
  var transmit = 0.0;
  var crack = 0.0;
  var crackCut = 0.0;
  var bustCenter = 0.0;
  if (U.event_kind == 1u) {
    let impactPt = vec2<f32>(0.37, -0.12);
    let d = p - impactPt;
    let g = exp(-((d.x * d.x) / 0.020 + (d.y * d.y) / 0.070));
    pf = vec2<f32>(p.x - 0.11 * g, p.y + 0.015 * g);
    pr = vec2<f32>(p.x - 0.065 * g, p.y + 0.010 * g);
    impact = g * clamp01(1.0 - abs(t - 0.27) / 0.23);
    impactRing = exp(-pow((length(vec2<f32>(d.x * 1.05, d.y * 0.78)) - 0.12) / 0.045, 2.0));
    transmit = gauss(sdSegment(p, impactPt, vec2<f32>(0.18, -0.05)), 0.065) * smooth3(0.08, 0.22, t);
  }
  if (U.event_kind == 2u) {
    let crackD = p.y - (0.74 * p.x + 0.03);
    let side = select(-1.0, 1.0, crackD >= 0.0);
    pf = vec2<f32>(p.x + side * (0.08 + 0.11 * t), p.y - side * (0.05 + 0.06 * t));
    pr = vec2<f32>(p.x + side * (0.05 + 0.08 * t), p.y - side * (0.03 + 0.04 * t));
    crack = gauss(abs(crackD), 0.040);
    crackCut = smooth3(0.045, 0.0, abs(crackD));
  }
  if (U.event_kind == 3u) {
    let side = select(-1.0, 1.0, p.x >= 0.0);
    let peel = smooth3(0.04, 0.52, t);
    pf = vec2<f32>(p.x + side * 0.08 * peel, p.y - 0.02 * sign(p.y) * peel);
    pr = vec2<f32>(p.x + side * 0.05 * peel, p.y - 0.012 * sign(p.y) * peel);
    bustCenter = smooth3(0.10, 0.42, t) * smooth3(0.34, 0.0, abs(p.x));
  }
  return EventDef(pf, pr, impact, impactRing, transmit, crack, crackCut, bustCenter);
}

fn evalBarrier(uv : vec2<f32>) -> Eval {
  let H = U.receiver_height_px;
  let p = vec2<f32>((uv.x - 0.5) * 2.0, (uv.y - 0.5) * 2.0);
  let t = clamp01(U.time_norm);
  let thick = 4.8 / H;
  let connThick = 3.8 / H;
  let ed = eventDef(p, t);

  let fEval = rectEval(ed.pf, frontCenter(), frontHalf(), frontRadius(), thick);
  let rEval = rectEval(ed.pr, rearCenter(), rearHalf(), rearRadius(), thick * 0.92);

  var connCov = 0.0;
  var connGlow = 0.0;
  var sideRibbon = 0.0;
  for (var i : i32 = 0; i < 6; i = i + 1) {
    let a = cornerPoint(frontCenter(), frontHalf(), i);
    let b = cornerPoint(rearCenter(), rearHalf(), i);
    let d = sdSegment(p, a, b);
    connCov = max(connCov, segmentCoverage(d, connThick));
    connGlow += gauss(d, connThick * 1.1);
    if (i >= 4) { sideRibbon = max(sideRibbon, gauss(d, 0.11)); }
  }

  let frontAct = select(1.0, createActivation(0, t), U.event_kind == 0u);
  let rearAct = select(1.0, createActivation(1, t), U.event_kind == 0u);
  let connAct = select(1.0, createActivation(2, t), U.event_kind == 0u);

  var frontCov = fEval.cov * frontAct;
  var rearCov = rEval.cov * rearAct;
  var frontBand = fEval.band * frontAct;
  var rearBand = rEval.band * rearAct;
  connCov *= connAct;
  sideRibbon *= connAct;

  if (U.event_kind == 2u) {
    let keep = 1.0 - 0.95 * ed.crackCut;
    frontCov *= keep; rearCov *= keep; connCov *= keep;
    frontBand *= (1.0 - 0.88 * ed.crackCut);
    rearBand *= (1.0 - 0.84 * ed.crackCut);
  }
  if (U.event_kind == 3u) {
    let mask = bustStateMask(p, t);
    frontCov *= mask; rearCov *= mask; connCov *= mask;
    frontBand *= mask * (1.0 - 0.20 * ed.bustCenter);
    rearBand *= mask * (1.0 - 0.18 * ed.bustCenter);
    sideRibbon *= mask * (1.0 - 0.40 * ed.bustCenter);
  }

  var alpha = clamp(0.36 * frontBand + 0.26 * rearBand + 0.52 * frontCov + 0.30 * rearCov + 0.24 * connCov + 0.12 * sideRibbon, 0.0, 0.90);

  let colorFront = vec3<f32>(0.18, 0.83, 0.98);
  let colorRear = vec3<f32>(0.08, 0.40, 0.92);
  let colorSkin = vec3<f32>(0.10, 0.58, 0.96);
  let colorConn = vec3<f32>(0.22, 0.96, 1.00);
  var premul = vec3<f32>(0.0);
  premul += colorRear * (0.24 * rearBand);
  premul += colorSkin * (0.14 * sideRibbon);
  premul += colorFront * (0.34 * frontBand);
  premul += colorRear * (0.20 * rearCov);
  premul += colorFront * (0.32 * frontCov);
  premul += colorConn * (0.22 * connCov);
  premul *= alpha;

  var nodeFront = 0.0;
  var nodeRear = 0.0;
  for (var j : i32 = 0; j < 6; j = j + 1) {
    nodeFront += gauss(pointDist(p, cornerPoint(frontCenter(), frontHalf(), j)), 0.082);
    nodeRear += gauss(pointDist(p, cornerPoint(rearCenter(), rearHalf(), j)), 0.070);
  }

  var radiance = vec3<f32>(0.0);
  radiance += vec3<f32>(0.12, 0.74, 1.18) * (0.10 * fEval.rail * frontAct);
  radiance += vec3<f32>(0.06, 0.34, 0.90) * (0.06 * rEval.rail * rearAct);
  radiance += vec3<f32>(0.18, 0.90, 1.28) * (0.16 * nodeFront * frontAct);
  radiance += vec3<f32>(0.08, 0.40, 0.95) * (0.10 * nodeRear * rearAct);
  radiance += vec3<f32>(0.16, 0.88, 1.22) * (0.10 * connGlow * connAct);

  if (U.event_kind == 0u) {
    let sweepA = vec2<f32>(-0.58 + 1.10 * t, -0.70);
    let sweepB = vec2<f32>(-0.26 + 1.10 * t, 0.72);
    let sweep = gauss(sdSegment(p, sweepA, sweepB), 0.10) * createActivation(3, t);
    radiance += vec3<f32>(0.30, 1.10, 1.34) * (0.32 * sweep);
    alpha = clamp(alpha + 0.04 * sweep, 0.0, 0.90);
  }
  if (U.event_kind == 1u) {
    let impactPt = vec2<f32>(0.37, -0.12);
    let tile = rectEval(p, impactPt, vec2<f32>(0.07, 0.10), 0.03, 0.030);
    let tileGlow = tile.cov + 0.55 * tile.band;
    radiance += vec3<f32>(0.56, 1.30, 1.46) * (0.55 * ed.impact);
    radiance += vec3<f32>(0.24, 0.98, 1.24) * (0.26 * ed.impactRing);
    radiance += vec3<f32>(0.22, 1.02, 1.28) * (0.18 * ed.transmit);
    radiance += vec3<f32>(0.34, 1.16, 1.40) * (0.18 * tileGlow * smooth3(0.10, 0.24, t));
    alpha = clamp(alpha + 0.06 * ed.impact + 0.03 * tileGlow, 0.0, 0.90);
  }
  if (U.event_kind == 2u) {
    radiance += vec3<f32>(0.40, 1.08, 1.24) * (0.34 * ed.crack);
    alpha = clamp(alpha * (1.0 - 0.25 * ed.crackCut) + 0.07 * ed.crack, 0.0, 0.90);
  }
  if (U.event_kind == 3u) {
    let bar1 = gauss(sdSegment(p, vec2<f32>(-0.22, -0.18 + 0.14 * t), vec2<f32>(0.22, -0.18 + 0.14 * t)), 0.055);
    let bar2 = gauss(sdSegment(p, vec2<f32>(-0.26, 0.00), vec2<f32>(0.26, 0.00)), 0.050);
    let bar3 = gauss(sdSegment(p, vec2<f32>(-0.22, 0.18 - 0.14 * t), vec2<f32>(0.22, 0.18 - 0.14 * t)), 0.055);
    radiance += vec3<f32>(0.24, 0.98, 1.22) * (0.16 * (bar1 + bar2 + bar3) * (1.0 - smooth3(0.56, 0.94, t)));
  }

  if (U.core_light_enabled == 0u) { radiance *= 0.84; }
  premul += radiance;

  let sourceEnergy = max(radiance.r, max(radiance.g, radiance.b));
  let haloWeight = select(0.0, smooth3(0.92, 1.67, sourceEnergy), sourceEnergy > 0.92);
  var haloShape = 0.28 * nodeFront + 0.18 * nodeRear;
  if (U.event_kind == 1u) { haloShape += 0.55 * ed.impact; }
  if (U.event_kind == 2u) { haloShape += 0.35 * ed.crack; }
  if (U.event_kind == 3u) { haloShape += 0.18 * (1.0 - ed.bustCenter); }
  premul += vec3<f32>(0.08, 0.28, 0.50) * (0.16 * haloWeight * haloShape);

  return Eval(premul, alpha);
}

@vertex
fn vsMain(@builtin(vertex_index) index : u32) -> VSOut {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>(3.0, 1.0),
    vec2<f32>(-1.0, 1.0)
  );
  let p = positions[index];
  var out : VSOut;
  out.pos = vec4<f32>(p, 0.0, 1.0);
  out.uv = 0.5 * (p + vec2<f32>(1.0, 1.0));
  return out;
}

@fragment
fn fsBarrier(in : VSOut) -> @location(0) vec4<f32> {
  let e = evalBarrier(in.uv);
  return vec4<f32>(e.premul, e.alpha);
}

@fragment
fn fsComposite(in : VSOut) -> @location(0) vec4<f32> {
  let size = vec2<i32>(i32(U.resolution.x), i32(U.resolution.y));
  let px = clamp(vec2<i32>(vec2<f32>(f32(size.x) * in.uv.x, f32(size.y) * in.uv.y)), vec2<i32>(0, 0), size - vec2<i32>(1, 1));
  let src = textureLoad(barrierTex, px, 0);
  let bgDark = vec3<f32>(0.03, 0.07, 0.11);
  let bgLight = vec3<f32>(0.92, 0.96, 1.0);
  let bg = select(bgDark, bgLight, U.background_mode == 1u);
  return vec4<f32>(src.rgb + bg * (1.0 - src.a), 1.0);
}
