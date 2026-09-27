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
fn sdDigitalField(p : vec2<f32>, sx : f32, sy : f32, bevel : f32) -> f32 {
  let a = abs(p);
  let rect = max(a.x - sx, a.y - sy);
  let diag = a.x + bevel * a.y - (sx + bevel * 0.40);
  return max(rect, diag);
}
fn bandCoverage(p : vec2<f32>, shift : vec2<f32>, scale : vec2<f32>) -> f32 {
  let q = (p - shift) / scale;
  let outer = sdDigitalField(q, 0.60, 0.76, 0.22);
  let inner = sdDigitalField(q, 0.48, 0.63, 0.22);
  return smooth3(0.06, 0.0, outer) * smooth3(-0.01, 0.05, inner);
}
fn sdSegment(p : vec2<f32>, a : vec2<f32>, b : vec2<f32>) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
fn connectorCoverage(p : vec2<f32>, signX : f32, signY : f32) -> f32 {
  let a = vec2<f32>(0.42 * signX - 0.10, 0.52 * signY - 0.02);
  let b = vec2<f32>(0.50 * signX + 0.10, 0.60 * signY + 0.03);
  return smooth3(0.055, 0.0, sdSegment(p, a, b));
}
fn nodeGlow(p : vec2<f32>, c : vec2<f32>, r : f32) -> f32 {
  let d = length(p - c);
  return exp(-pow(d / r, 2.0));
}
fn lineGlow(p : vec2<f32>, a : vec2<f32>, b : vec2<f32>, width : f32) -> f32 {
  let d = sdSegment(p, a, b);
  return exp(-pow(d / width, 2.0));
}
fn sweepMask(p : vec2<f32>, s : f32) -> f32 {
  let edge = -0.95 + 1.9 * s;
  let basis = 0.58 * p.x - 0.82 * p.y;
  return smooth3(-0.03, 0.03, edge - basis);
}

struct EvalOut {
  premul : vec3<f32>,
  alpha : f32,
};

fn evalBarrier(uv : vec2<f32>) -> EvalOut {
  let H = U.receiver_height_px;
  let fieldW = 1.42 * H;
  let fieldH = 1.68 * H;
  var p = vec2<f32>(
    (uv.x - 0.5) * (2.0 / (fieldW / H)),
    (uv.y - 0.5) * (2.0 / (fieldH / H))
  );
  let t = clamp01(U.time_norm);
  var gate = 1.0;
  var impact = 0.0;
  var crack = 0.0;
  var cut = 0.0;
  var bustKill = 0.0;
  var fadeSplit = 1.0;

  if (U.event_kind == 0u) {
    gate = sweepMask(p, t);
  } else if (U.event_kind == 1u) {
    let c = vec2<f32>(0.50, -0.04);
    let d = p - c;
    let g = exp(-((d.x * d.x) / 0.020 + (d.y * d.y) / 0.060));
    p = vec2<f32>(p.x - 0.075 * g, p.y + 0.018 * g);
    impact = g;
  } else if (U.event_kind == 2u) {
    let side = select(-1.0, 1.0, p.y - (0.36 * p.x + 0.03) > 0.0);
    p = vec2<f32>(p.x + side * (0.05 + 0.07 * t), p.y - side * (0.02 + 0.02 * t));
    let crackD = abs(p.y - (0.36 * p.x + 0.03));
    crack = exp(-pow(crackD / 0.045, 2.0));
    cut = smooth3(0.020, 0.0, crackD);
  } else if (U.event_kind == 3u) {
    let side = select(-1.0, 1.0, p.x >= 0.0);
    p = vec2<f32>(p.x + side * (0.10 + 0.14 * t), p.y - 0.03 * sign(p.y) * t);
    bustKill = smooth3(-0.02, 0.10, 0.22 - abs(p.x));
    fadeSplit = 1.0 - 0.72 * t;
  }

  var fractureCut = 1.0;
  if (U.event_kind == 2u) { fractureCut = 1.0 - 0.94 * cut; }
  if (U.event_kind == 3u) { fractureCut = 1.0 - 0.86 * bustKill; }

  let front = bandCoverage(p, vec2<f32>(-0.10, -0.02), vec2<f32>(1.0, 1.0)) * gate * fractureCut;
  let rear = bandCoverage(p, vec2<f32>(0.10, 0.04), vec2<f32>(1.04, 1.02)) * gate * fractureCut;
  let conn = max(max(connectorCoverage(p, 1.0, 1.0), connectorCoverage(p, -1.0, 1.0)), max(connectorCoverage(p, 1.0, -1.0), connectorCoverage(p, -1.0, -1.0))) * gate * select(1.0, fadeSplit, U.event_kind == 3u) * fractureCut;

  let airspaceMask = 1.0 - smooth3(0.16, 0.42, abs(sdDigitalField(p, 0.42, 0.56, 0.20)));
  let shellAlpha = clamp(0.58 * front + 0.38 * rear + 0.26 * conn, 0.0, 1.0);
  var alpha = shellAlpha * (1.0 - 0.84 * airspaceMask);

  let baseFront = vec3<f32>(0.18, 0.86, 1.00);
  let baseRear = vec3<f32>(0.12, 0.48, 0.93);
  let connColor = vec3<f32>(0.22, 0.96, 1.00);
  let transColor = baseRear * (0.42 * rear) + baseFront * (0.60 * front) + connColor * (0.32 * conn);
  var premul = transColor * alpha;

  let nf = nodeGlow(p, vec2<f32>(-0.48, -0.59), 0.095) + nodeGlow(p, vec2<f32>(0.48, -0.59), 0.095) + nodeGlow(p, vec2<f32>(-0.52, 0.56), 0.095) + nodeGlow(p, vec2<f32>(0.52, 0.56), 0.095);
  let nr = nodeGlow(p, vec2<f32>(-0.32, -0.46), 0.080) + nodeGlow(p, vec2<f32>(0.36, -0.46), 0.080) + nodeGlow(p, vec2<f32>(-0.35, 0.43), 0.080) + nodeGlow(p, vec2<f32>(0.39, 0.43), 0.080);
  let topRail = lineGlow(p, vec2<f32>(-0.42, -0.51), vec2<f32>(0.42, -0.51), 0.06);
  let botRail = lineGlow(p, vec2<f32>(-0.45, 0.49), vec2<f32>(0.45, 0.49), 0.06);
  var radiance = vec3<f32>(0.0);
  radiance += vec3<f32>(0.18, 0.82, 1.28) * (0.18 * nf * gate);
  radiance += vec3<f32>(0.08, 0.42, 0.88) * (0.10 * nr * gate);
  radiance += vec3<f32>(0.10, 0.66, 1.05) * (0.14 * (topRail + botRail) * select(0.0, 1.0, front + rear > 0.0));

  if (U.event_kind == 0u) {
    let wave = lineGlow(p, vec2<f32>(-0.56 + 1.12 * t, -0.74), vec2<f32>(-0.28 + 1.12 * t, 0.74), 0.10);
    radiance += vec3<f32>(0.22, 1.06, 1.30) * (0.36 * wave);
    alpha += 0.06 * wave;
  }
  if (U.event_kind == 1u) {
    let ring = exp(-pow((length(vec2<f32>(p.x - 0.48, (p.y + 0.04) * 0.8)) - 0.18) / 0.05, 2.0));
    let localPulse = clamp01(1.0 - abs(t - 0.269) / 0.23);
    let impactCore = impact * localPulse;
    radiance += vec3<f32>(0.55, 1.28, 1.40) * (0.60 * impactCore);
    radiance += vec3<f32>(0.24, 0.94, 1.12) * (0.24 * ring);
    alpha += 0.08 * impactCore;
  }
  if (U.event_kind == 2u) {
    radiance += vec3<f32>(0.44, 1.16, 1.26) * (0.34 * crack);
    alpha = alpha * (1.0 - 0.44 * cut) + 0.08 * crack;
  }
  if (U.event_kind == 3u) {
    let release = lineGlow(p, vec2<f32>(-0.18, -0.12), vec2<f32>(0.18, -0.12), 0.09) + lineGlow(p, vec2<f32>(-0.20, 0.11), vec2<f32>(0.20, 0.11), 0.09);
    radiance += vec3<f32>(0.26, 0.94, 1.30) * (0.14 * release);
    alpha *= fadeSplit;
  }
  if (U.core_light_enabled == 0u) {
    radiance *= 0.86;
  }

  let sourceEnergy = max(radiance.r, max(radiance.g, radiance.b));
  let halo = select(0.0, smooth3(1.04, 1.84, sourceEnergy) * 0.18, sourceEnergy > 1.04);
  let localHalo = halo * (0.35 * nf + 0.22 * topRail + 0.22 * botRail + 0.55 * impact);
  premul += radiance + vec3<f32>(0.10, 0.36, 0.56) * localHalo;
  alpha = clamp(alpha, 0.0, 0.96);
  return EvalOut(premul, alpha);
}

@vertex
fn vsMain(@builtin(vertex_index) vertexIndex : u32) -> VSOut {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>(3.0, 1.0),
    vec2<f32>(-1.0, 1.0)
  );
  let p = pos[vertexIndex];
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
@group(1) @binding(1) var barrierSampler : sampler;

@fragment
fn fsComposite(in : VSOut) -> @location(0) vec4<f32> {
  let src = textureSample(barrierTex, barrierSampler, in.uv);
  let bg = select(vec3<f32>(0.03, 0.07, 0.11), vec3<f32>(0.92, 0.96, 1.0), U.background_mode == 1u);
  let outRgb = src.rgb + bg * (1.0 - src.a);
  return vec4<f32>(outRgb, 1.0);
}
