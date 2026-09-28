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

struct VSOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

fn clamp01(x : f32) -> f32 { return clamp(x, 0.0, 1.0); }
fn smooth3(a : f32, b : f32, x : f32) -> f32 {
  let t = clamp01((x - a) / (b - a));
  return t * t * (3.0 - 2.0 * t);
}
fn segDistance(p : vec2<f32>, a : vec2<f32>, b : vec2<f32>) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
fn nodeGlow(p : vec2<f32>, c : vec2<f32>, r : f32) -> f32 {
  let d = distance(p, c);
  return exp(-pow(d / r, 2.0));
}
fn lineGlow(p : vec2<f32>, a : vec2<f32>, b : vec2<f32>, width : f32) -> f32 {
  let d = segDistance(p, a, b);
  return exp(-pow(d / width, 2.0));
}
fn basePoint(i : i32) -> vec2<f32> {
  switch i {
    case 0: { return vec2<f32>(-0.28, -0.78); }
    case 1: { return vec2<f32>( 0.28, -0.78); }
    case 2: { return vec2<f32>( 0.60, -0.46); }
    case 3: { return vec2<f32>( 0.60,  0.46); }
    case 4: { return vec2<f32>( 0.28,  0.78); }
    case 5: { return vec2<f32>(-0.28,  0.78); }
    case 6: { return vec2<f32>(-0.60,  0.46); }
    default: { return vec2<f32>(-0.60, -0.46); }
  }
}
fn polyPoint(i : i32, scale : f32, shift : vec2<f32>, skew : f32) -> vec2<f32> {
  let b = basePoint(i);
  return vec2<f32>(b.x * scale + shift.x + skew * b.y, b.y * scale + shift.y);
}
fn createOrder(i : i32) -> f32 {
  switch i {
    case 0: { return 0.125; }
    case 1: { return 0.25; }
    case 2: { return 0.375; }
    case 3: { return 0.5; }
    case 4: { return 0.625; }
    case 5: { return 0.75; }
    case 6: { return 0.875; }
    default: { return 0.0; }
  }
}
fn bustGroup(i : i32) -> f32 {
  switch i {
    case 0: { return 0.0; }
    case 1: { return 0.0; }
    case 2: { return 1.0; }
    case 3: { return 2.0; }
    case 4: { return 3.0; }
    case 5: { return 3.0; }
    case 6: { return 2.0; }
    default: { return 1.0; }
  }
}
fn connectorIndex(j : i32) -> i32 {
  switch j {
    case 0: { return 0; }
    case 1: { return 2; }
    case 2: { return 4; }
    default: { return 6; }
  }
}

struct Eval {
  premul : vec3<f32>,
  alpha : f32,
};

fn evalBarrier(uv : vec2<f32>) -> Eval {
  let H = U.receiver_height_px;
  let thickness = 5.3 / H;
  let connThickness = 4.0 / H;
  var p = vec2<f32>((uv.x - 0.5) * 2.0, (uv.y - 0.5) * 2.0);
  let t = clamp01(U.time_norm);

  let frontShift = vec2<f32>(-3.0 / H, -1.5 / H);
  let rearShift = vec2<f32>(3.0 / H, 1.8 / H);

  var pFront = p;
  var pRear = p;
  var impact = 0.0;
  var crack = 0.0;
  var crackCut = 0.0;
  var bustMask = 0.0;
  var bustAlpha = 1.0;
  if (U.event_kind == 1u) {
    let impactPt = vec2<f32>(0.65, -0.06);
    let dx = p.x - impactPt.x;
    let dy = p.y - impactPt.y;
    let g = exp(-((dx * dx) / 0.022 + (dy * dy) / 0.085));
    pFront = vec2<f32>(p.x - 0.090 * g, p.y + 0.020 * g);
    pRear = vec2<f32>(p.x - 0.052 * g, p.y + 0.010 * g);
    impact = g * clamp01(1.0 - abs(t - 0.27) / 0.23);
  }
  if (U.event_kind == 2u) {
    let crackD = p.y - (0.58 * p.x + 0.02);
    let side = select(-1.0, 1.0, crackD >= 0.0);
    pFront = vec2<f32>(p.x + side * (0.06 + 0.09 * t), p.y - side * (0.03 + 0.05 * t));
    pRear = vec2<f32>(p.x + side * (0.04 + 0.07 * t), p.y - side * (0.02 + 0.03 * t));
    crack = exp(-pow(abs(crackD) / 0.040, 2.0));
    crackCut = smooth3(0.032, 0.0, abs(crackD));
  }
  if (U.event_kind == 3u) {
    let side = select(-1.0, 1.0, p.x >= 0.0);
    let span = 0.06 + 0.15 * t;
    pFront = vec2<f32>(p.x + side * span, p.y - 0.02 * sign(p.y) * t);
    pRear = vec2<f32>(p.x + side * span * 0.72, p.y - 0.016 * sign(p.y) * t);
    bustMask = smooth3(0.00, 0.28, 0.30 - abs(p.x));
    bustAlpha = 1.0 - 0.68 * t;
  }

  var frontCov = 0.0;
  var rearCov = 0.0;
  var connCov = 0.0;
  var frontRail = 0.0;
  var rearRail = 0.0;
  var connGlow = 0.0;

  for (var i : i32 = 0; i < 8; i = i + 1) {
    let fA = polyPoint(i, 1.0, frontShift, -0.018);
    let fB = polyPoint((i + 1) % 8, 1.0, frontShift, -0.018);
    let rA = polyPoint(i, 0.93, rearShift, 0.015);
    let rB = polyPoint((i + 1) % 8, 0.93, rearShift, 0.015);
    let dF = segDistance(pFront, fA, fB);
    let dR = segDistance(pRear, rA, rB);
    var segmentActive = 1.0;
    if (U.event_kind == 0u) {
      let threshold = createOrder(i) * 0.58;
      segmentActive = smooth3(threshold, threshold + 0.17, t);
    }
    if (U.event_kind == 3u) {
      let threshold = bustGroup(i) * 0.18;
      segmentActive = 1.0 - smooth3(threshold, threshold + 0.24, t);
    }
    frontCov = max(frontCov, smooth3(thickness, 0.0, dF) * segmentActive);
    rearCov = max(rearCov, smooth3(thickness * 0.95, 0.0, dR) * segmentActive);
    frontRail += exp(-pow(dF / (thickness * 1.25), 2.0)) * segmentActive;
    rearRail += exp(-pow(dR / (thickness * 1.25), 2.0)) * segmentActive;
  }

  for (var j : i32 = 0; j < 4; j = j + 1) {
    let idx = connectorIndex(j);
    let a = polyPoint(idx, 1.0, frontShift, -0.018);
    let b = polyPoint(idx, 0.93, rearShift, 0.015);
    let d = segDistance(p, a, b);
    var segmentActive = 1.0;
    if (U.event_kind == 0u) {
      segmentActive = smooth3(0.12, 0.36, t) * smooth3(0.02, 0.18, t);
    }
    if (U.event_kind == 3u) {
      segmentActive = 1.0 - smooth3(0.08, 0.42, t);
    }
    connCov = max(connCov, smooth3(connThickness, 0.0, d) * segmentActive);
    connGlow += exp(-pow(d / (connThickness * 1.10), 2.0)) * segmentActive;
  }

  if (U.event_kind == 2u) {
    let cut = 1.0 - 0.98 * crackCut;
    frontCov *= cut; rearCov *= cut; connCov *= (1.0 - 0.95 * crackCut);
  }
  if (U.event_kind == 3u) {
    let cut = 1.0 - 0.88 * bustMask;
    frontCov *= cut * bustAlpha;
    rearCov *= cut * bustAlpha;
    connCov *= (1.0 - 0.95 * t) * bustAlpha;
  }

  var alpha = clamp(0.52 * frontCov + 0.36 * rearCov + 0.24 * connCov, 0.0, 0.90);
  let baseFront = vec3<f32>(0.20, 0.83, 0.98);
  let baseRear = vec3<f32>(0.10, 0.42, 0.92);
  let baseConn = vec3<f32>(0.24, 0.96, 1.00);
  var premul = vec3<f32>(0.0);
  premul += baseRear * (rearCov * 0.42 * alpha);
  premul += baseFront * (frontCov * 0.62 * alpha);
  premul += baseConn * (connCov * 0.36 * alpha);

  var nodeFront = 0.0;
  var nodeRear = 0.0;
  for (var k : i32 = 0; k < 4; k = k + 1) {
    let idx = connectorIndex(k);
    nodeFront += nodeGlow(p, polyPoint(idx, 1.0, frontShift, -0.018), 0.095);
    nodeRear += nodeGlow(p, polyPoint(idx, 0.93, rearShift, 0.015), 0.080);
  }

  var radiance = vec3<f32>(0.0);
  radiance += vec3<f32>(0.16, 0.85, 1.28) * (0.17 * nodeFront);
  radiance += vec3<f32>(0.08, 0.40, 0.92) * (0.11 * nodeRear);
  radiance += vec3<f32>(0.12, 0.70, 1.06) * (0.08 * frontRail);
  radiance += vec3<f32>(0.06, 0.36, 0.88) * (0.05 * rearRail);
  radiance += vec3<f32>(0.14, 0.86, 1.16) * (0.08 * connGlow);

  if (U.event_kind == 0u) {
    let sweepA = vec2<f32>(-0.72 + 1.40 * t, -0.76);
    let sweepB = vec2<f32>(-0.28 + 1.40 * t, 0.82);
    let sweep = lineGlow(p, sweepA, sweepB, 0.11);
    radiance += vec3<f32>(0.28, 1.10, 1.32) * (0.34 * sweep);
    alpha = clamp(alpha + 0.05 * sweep, 0.0, 0.90);
  }
  if (U.event_kind == 1u) {
    let impactPt = vec2<f32>(0.65, -0.06);
    let rearPt = vec2<f32>(0.32, -0.02);
    let brace = lineGlow(p, impactPt, rearPt, 0.07);
    let impactRing = exp(-pow((length(vec2<f32>(p.x - impactPt.x, (p.y - impactPt.y) * 0.85)) - 0.17) / 0.05, 2.0));
    radiance += vec3<f32>(0.58, 1.30, 1.44) * (0.62 * impact);
    radiance += vec3<f32>(0.20, 0.90, 1.12) * (0.24 * impactRing);
    radiance += vec3<f32>(0.22, 1.02, 1.24) * (0.20 * brace);
    alpha = clamp(alpha + 0.07 * impact, 0.0, 0.90);
  }
  if (U.event_kind == 2u) {
    radiance += vec3<f32>(0.42, 1.08, 1.22) * (0.34 * crack);
    alpha = clamp(alpha * (1.0 - 0.32 * crackCut) + 0.07 * crack, 0.0, 0.90);
  }
  if (U.event_kind == 3u) {
    let shut1 = lineGlow(p, vec2<f32>(-0.20, -0.08), vec2<f32>(0.20, -0.08), 0.08);
    let shut2 = lineGlow(p, vec2<f32>(-0.22, 0.10), vec2<f32>(0.22, 0.10), 0.08);
    radiance += vec3<f32>(0.22, 0.92, 1.18) * (0.13 * (shut1 + shut2));
  }

  if (U.core_light_enabled == 0u) {
    radiance *= 0.84;
  }
  premul += radiance;

  let sourceEnergy = max(radiance.r, max(radiance.g, radiance.b));
  let haloWeight = select(0.0, smooth3(0.95, 1.65, sourceEnergy), sourceEnergy > 0.95);
  let haloShape = 0.32 * nodeFront + 0.20 * nodeRear + select(0.0, 0.55 * impact, U.event_kind == 1u) + select(0.0, 0.38 * crack, U.event_kind == 2u);
  let localHalo = haloWeight * haloShape * 0.18;
  premul += vec3<f32>(0.09, 0.32, 0.54) * localHalo;
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

@group(1) @binding(0) var barrierTex : texture_2d<f32>;

@fragment
fn fsComposite(in : VSOut) -> @location(0) vec4<f32> {
  let size = vec2<i32>(i32(U.resolution.x), i32(U.resolution.y));
  let px = clamp(vec2<i32>(vec2<f32>(f32(size.x) * in.uv.x, f32(size.y) * in.uv.y)), vec2<i32>(0, 0), size - vec2<i32>(1, 1));
  let src = textureLoad(barrierTex, px, 0);
  let bgDark = vec3<f32>(0.03, 0.07, 0.11);
  let bgLight = vec3<f32>(0.92, 0.96, 1.0);
  let bg = select(bgDark, bgLight, U.background_mode == 1u);
  let outRgb = src.rgb + bg * (1.0 - src.a);
  return vec4<f32>(outRgb, 1.0);
}

