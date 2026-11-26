struct Uniforms {
  size: vec2f,
  ageMs: f32,
  scale: f32,
  reduced: f32,
  live: f32,
  padding: vec2f,
}
@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let tri = array<vec2f, 3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
  return vec4f(tri[i], 0, 1);
}

// pivot is a material coordinate; center is where that point is drawn.
// side: 0 = whole, -1/+1 = left/right. bank: 0 = uncut, -1/+1 = upper/lower.
struct Piece {
  center: vec2f, pivot: vec2f, axis: vec2f,
  side: f32, bank: f32, coverage: f32, tint: vec3f,
  longLip: f32, crossLip: f32, reach: f32,
  slateBias: f32, spillShare: f32,
}
fn axisAt(angle: f32) -> vec2f { return vec2f(cos(angle), sin(angle)); }
fn across(ax: vec2f) -> vec2f { return vec2f(-ax.y, ax.x); }
fn turn(v: vec2f, ax: vec2f) -> vec2f { return ax * v.x + across(ax) * v.y; }
fn onScreen(q: vec2f, s: Piece) -> vec2f { return s.center + turn(q - s.pivot, s.axis); }
fn inStone(p: vec2f, s: Piece) -> vec2f {
  let v = p - s.center;
  return s.pivot + vec2f(dot(v, s.axis), dot(v, across(s.axis)));
}

fn pieceAt(i: i32, t: f32, rm: f32) -> Piece {
  let origin = vec2f(0., -7.);
  let rootAngle = -0.17;
  let rootAxis = axisAt(rootAngle);
  let sea = vec3f(0.09, 1.23, 1.41);
  let lilac = vec3f(0.69, 0.40, 1.60);
  // Floor projection: screen y is compressed to 23%, then this offset is added.
  let rootBias = 0.77 * origin.y + 22.;
  if (i == 0) {
    let cov = smoothstep(0., 80., t) * (1. - smoothstep(290., 343., t));
    return Piece(origin, vec2f(0.), rootAxis, 0., 0., cov, mix(sea, lilac, 0.18),
                 0.12 + 1.7 * smoothstep(50., 286., t), 0., 0., rootBias, 1.);
  }
  let left = i == 1 || i == 3 || i == 4;
  let side = select(1., -1., left);
  let fork = select(670., 590., left);
  let tint = select(lilac, sea, left);
  let stride = mix(1., 0.72, rm);
  let twist = mix(1., 0.62, rm);
  let halfPivot = vec2f(8. * side, 0.);
  let halfEnd = origin + stride * vec2f(side * 31., select(3., -5., left));
  let halfAngle = mix(rootAngle, side * 0.50, twist);
  let halfBias = 0.77 * halfEnd.y + 21.;
  if (i <= 2) {
    let travel = smoothstep(290., fork - 55., t);
    let cov = smoothstep(288., 342., t) * (1. - smoothstep(fork, fork + 48., t));
    let hand = smoothstep(290., fork - 115., t);
    let load = 0.63 + 0.90 * smoothstep(fork - 115., fork, t);
    let home = origin + turn(halfPivot, rootAxis);
    return Piece(mix(home, halfEnd, travel), halfPivot, axisAt(mix(rootAngle, halfAngle, travel)),
                 side, 0., cov, tint, load * (1. - hand), load * hand, mix(3., 15., hand),
                 mix(rootBias, halfBias, travel), mix(0.5, 1., travel));
  }
  let high = i == 3 || i == 5;
  let bank = select(1., -1., high);
  let endPivot = halfPivot + vec2f(0., 9. * bank);
  let home = halfEnd + turn(endPivot - halfPivot, axisAt(halfAngle));
  let endPos = halfEnd + stride * vec2f(side * select(25., 38., high), select(18., -17., high));
  let endAngle = mix(rootAngle, side * (0.44 + select(-0.54, 0.77, high)), twist);
  let travel = smoothstep(fork, fork + 294., t);
  let cov = smoothstep(fork - 2., fork + 44., t) * (1. - smoothstep(1000., 1280., t));
  let load = 1.34 - 0.87 * smoothstep(fork + 75., 1230., t);
  return Piece(mix(home, endPos, travel), endPivot, axisAt(mix(halfAngle, endAngle, travel)),
               side, bank, cov, tint, 0., load, 15., mix(halfBias, 0.77 * endPos.y + 14., travel),
               mix(0.5, 1., travel));
}

// Intersect one cropped outline with complementary cut fields in rest space.
fn contour(q: vec2f, s: Piece) -> f32 {
  let v = abs(q);
  var d = max(max(v.x - 16., v.y - 19.), (v.x + 0.56 * v.y - 19.) * 0.872);
  if (s.side != 0.) {
    let stepX = clamp(0.5 * q.y, -2., 2.);
    d = max(d, -s.side * (q.x - stepX) * 0.90);
  }
  if (s.bank != 0.) { d = max(d, -s.bank * (q.y - 0.21 * s.side * q.x) * 0.979); }
  return d;
}
fn segmentDist(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let ab = b - a;
  let h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0., 1.);
  return length(p - a - h * ab);
}
fn lipPaint(d: f32, aa: f32, tint: vec3f) -> vec3f {
  let core = 1. - smoothstep(0.55, 1.12 + aa, d);
  let bevel = 1. - smoothstep(0.5, 5.4, d);
  return tint * (0.53 * bevel + 1.10 * core) + vec3f(1.16, 1.08, 0.92) * core;
}
fn airLight(d: f32) -> f32 {
  let v = 1. - smoothstep(0., 18., d);
  return 0.34 * v * v;
}
fn floorPoint(q: vec2f, s: Piece) -> vec2f {
  let w = onScreen(q, s);
  return vec2f(w.x + 1.8, w.y * 0.23 + s.slateBias);
}
fn slateLight(p: vec2f, a: vec2f, b: vec2f, s: Piece) -> f32 {
  let metric = vec2f(1., 2.45);
  let d = segmentDist(p * metric, floorPoint(a, s) * metric, floorPoint(b, s) * metric);
  let pool = 1. - smoothstep(0., 16., d);
  let lip = 1. - smoothstep(0.8, 6.5, d);
  return 0.22 * pool * pool + 0.21 * lip;
}
fn displayColor(linearColor: vec3f) -> vec4f {
  let v = max(linearColor, vec3f(0.));
  let tone = v / (vec3f(1.) + v);
  let rgb = select(12.92 * tone, 1.055 * pow(tone, vec3f(1. / 2.4)) - 0.055, tone > vec3f(0.0031308));
  return vec4f(rgb, 1.);
}

@fragment fn fs(@builtin(position) coord: vec4f) -> @location(0) vec4f {
  let viewOK = all(u.size > vec2f(0.)) && all(u.size <= vec2f(65536.)) && u.scale >= 0.00025 && u.scale <= 4096.;
  var p = vec2f(0.);
  var aa = 0.60;
  if (viewOK) {
    p = clamp((coord.xy - 0.5 * u.size) / u.scale, vec2f(-32768.), vec2f(32768.));
    aa = clamp(0.60 / u.scale, 0.04, 2.5);
  }
  let uv = vec2f((p.x + p.y * 0.6) / 46., p.y / 16.);
  let tile = floor(uv);
  let seams = abs(fract(uv) - 0.5);
  let joint = smoothstep(0.46, 0.50, max(seams.x, seams.y));
  let base = vec3f(0.009, 0.015, 0.026) * (1. + 0.04 * sin(tile.x * 1.8 + tile.y)) * (1. - 0.17 * joint);
  let t = u.ageMs;
  if (!(viewOK && u.live >= 0.5 && u.live <= 1. && u.reduced >= 0. && u.reduced <= 1. && t >= 0. && t < 1470.)) {
    return displayColor(base);
  }
  // Stationary broad planes in the slate modulate incident light only.
  let slateFace = smoothstep(0.42, 0.54, fract(uv.x) + 0.22 * fract(uv.y));
  let response = vec3f(0.71, 0.83, 0.94) * (0.63 + 0.37 * slateFace) * (1. - 0.58 * joint);
  var ground = base;
  var pigment = vec3f(0.);
  var weight = 0.;
  let a = vec2f(-2., -14.);
  let b = vec2f(-2., -4.);
  let c = vec2f(2., 4.);
  let e = vec2f(2., 14.);
  for (var i = 0; i < 7; i++) {
    let s = pieceAt(i, t, u.reduced);
    if (s.coverage <= 0. || any(abs(p - s.center) > vec2f(60., 64.))) { continue; }
    let q = inStone(p, s);
    let edge = contour(q, s);
    let mask = s.coverage * (1. - smoothstep(-aa, aa, edge));
    let ridge = smoothstep(-aa, aa, abs(q.x) - (7. + 0.36 * q.y));
    let roof = smoothstep(10. - aa, 10. + aa, -q.y + 0.27 * q.x);
    var paint = s.tint * (0.075 + 0.12 * ridge + 0.07 * roof);
    var haze = 0.;
    var incident = 0.;
    if (s.longLip > 0.) {
      let d = min(segmentDist(q, a, b), min(segmentDist(q, b, c), segmentDist(q, c, e)));
      paint += s.longLip * lipPaint(d, aa, s.tint);
      haze += s.longLip * airLight(d);
      // The small elbow is unresolved in the broad floor footprint; project its two ends.
      incident += s.longLip * slateLight(p, a, e, s);
    }
    if (s.crossLip > 0.) {
      let toe = vec2f(s.side * s.reach, 0.21 * s.reach);
      let d = segmentDist(q, vec2f(0.), toe);
      paint += s.crossLip * lipPaint(d, aa, s.tint);
      haze += s.crossLip * airLight(d);
      incident += s.crossLip * slateLight(p, vec2f(0.), toe, s);
    }
    ground += s.tint * (vec3f(haze) + response * incident) * (s.coverage * s.spillShare);
    pigment += mask * paint;
    weight += mask;
  }
  // Complementary banks and timed donor crossfades should not overprint their cores.
  let art = mix(ground, pigment / max(weight, 0.00001), min(weight, 1.));
  return displayColor(art);
}
