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

fn axisAt(a: f32) -> vec2f { return vec2f(cos(a), sin(a)); }
fn across(v: vec2f) -> vec2f { return vec2f(-v.y, v.x); }
fn turn(q: vec2f, ax: vec2f) -> vec2f { return ax * q.x + across(ax) * q.y; }
fn localAxes(v: vec2f, ax: vec2f) -> vec2f { return vec2f(dot(v, ax), dot(v, across(ax))); }

// center is the image of pivot (a point in the uncut gem).
struct Piece {
  center: vec2f, pivot: vec2f, axis: vec2f,
  side: f32, bank: f32, coverage: f32, tint: vec3f,
  longLip: f32, crossLip: f32, reach: f32, share: f32,
}
fn onScreen(q: vec2f, s: Piece) -> vec2f { return s.center + turn(q - s.pivot, s.axis); }
fn pieceAt(i: i32, t: f32, rm: f32) -> Piece {
  let origin = vec2f(0., -7.);
  let rootAngle = -0.17;
  let rootAxis = axisAt(rootAngle);
  let sea = vec3f(0.09, 1.23, 1.41);
  let lilac = vec3f(0.69, 0.40, 1.60);
  if (i == 0) {
    let cov = smoothstep(0., 80., t) * (1. - smoothstep(290., 343., t));
    return Piece(origin, vec2f(0.), rootAxis, 0., 0., cov, mix(sea, lilac, 0.18),
                 0.12 + 1.7 * smoothstep(50., 286., t), 0., 0., 1.);
  }
  let left = i == 1 || i == 3 || i == 4;
  let side = select(1., -1., left);
  let fork = select(670., 590., left);
  let tint = select(lilac, sea, left);
  let stride = mix(1., 0.86, rm);
  let twist = mix(1., 0.46, rm);
  let halfPivot = vec2f(8. * side, 0.);
  let halfEnd = origin + stride * vec2f(32. * side, select(3., -5., left));
  let halfAngle = mix(rootAngle, side * 0.50, twist);
  if (i <= 2) {
    let travel = smoothstep(290., fork - 55., t);
    let cov = smoothstep(290., 343., t) * (1. - smoothstep(fork, fork + 32., t));
    let hand = smoothstep(290., fork - 115., t);
    let load = 0.63 + 0.90 * smoothstep(fork - 115., fork, t);
    let home = origin + turn(halfPivot, rootAxis);
    return Piece(mix(home, halfEnd, travel), halfPivot, axisAt(mix(rootAngle, halfAngle, travel)),
                 side, 0., cov, tint, load * (1. - hand), load * hand, mix(3., 15., hand),
                 mix(0.5, 1., travel));
  }
  let high = i == 3 || i == 5;
  let bank = select(1., -1., high);
  let endPivot = halfPivot + vec2f(0., 9. * bank);
  let home = halfEnd + turn(endPivot - halfPivot, axisAt(halfAngle));
  let endPos = halfEnd + stride * vec2f(side * select(20., 43., high), select(16., -19., high));
  let endAngle = mix(rootAngle, side * (0.44 + select(-0.54, 0.77, high)), twist);
  let early = smoothstep(fork, fork + 76., t);
  let full = smoothstep(fork, fork + 294., t);
  let travel = mix(full, early, mix(0.58, 0.48, rm));
  let cov = smoothstep(fork, fork + 32., t) * (1. - smoothstep(1000., 1280., t));
  let load = 1.34 - 0.87 * smoothstep(fork + 75., 1230., t);
  return Piece(mix(home, endPos, travel), endPivot, axisAt(mix(halfAngle, endAngle, travel)),
               side, bank, cov, tint, 0., load, 15., mix(0.5, 1., travel));
}

fn contour(q: vec2f, s: Piece) -> f32 {
  let v = abs(q);
  var d = max(max(v.x - 16., v.y - 19.), (v.x + 0.56 * v.y - 19.) * 0.872);
  if (s.side != 0.) {
    let jog = clamp(0.5 * q.y, -2., 2.);
    d = max(d, -s.side * (q.x - jog) * 0.90);
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

// Orthographic drawing convention: floor axes X and depth, then height.
// Screen down = (0, .5, -C); toward the observer = (0, C, .5).
// The moving paper-cut shapes inhabit a single plane facing the observer.
const C: f32 = 0.8660254;
fn lipHeight(y: f32) -> f32 { return clamp(22.4 - C * y, 0.5, 72.); }
struct Slate {
  shiftPerHeight: vec2f, grain: vec2f, polish: f32, matte: f32,
}
fn slateAt(p: vec2f, aa: f32, tileJoint: f32) -> Slate {
  let x = abs(p.x);
  let wing = select(-1., 1., p.x >= 0.);
  let keyCut = x - (15. + 0.12 * (p.y - 41.));
  let wingCut = x - (39. - 0.17 * (p.y - 41.));
  let bankCut = p.y - (43.5 + 0.028 * (x - 55.));
  let rim = min(min(p.y - 21., 63. - p.y), 95. - x - 0.27 * abs(p.y - 42.));
  var joinDist = min(abs(keyCut), abs(wingCut));
  var tilt = vec2f(0., 0.);
  var brush = vec2f(1., 0.);
  if (keyCut >= 0.) {
    tilt = vec2f(0.038 * wing, 0.012);
    brush = normalize(vec2f(wing, -0.50));
  }
  if (wingCut >= 0.) {
    joinDist = min(joinDist, abs(bankCut));
    let farFace = bankCut >= 0.;
    tilt = vec2f(select(0.032, -0.038, farFace) * wing, select(0.016, -0.011, farFace));
    brush = normalize(vec2f(wing, select(0.68, -0.23, farFace)));
  }
  let dressed = smoothstep(0., 1.3 + aa, rim) * smoothstep(0.15, 1.45 + aa, joinDist);
  let n = normalize(vec3f(tilt, 1.));
  // From the floor back toward the lip. Drop a lip endpoint along -ray
  // by its height: the resulting screen displacement is linear in height.
  let ray = reflect(vec3f(0., -C, -0.5), n);
  let shift = -vec2f(ray.x, 0.5 * ray.y - C * ray.z) / max(ray.z, 0.25);
  return Slate(shift, brush, dressed * (1. - 0.32 * tileJoint),
               (0.73 + 0.27 * dressed) * (1. - 0.54 * tileJoint));
}

// xy result: soft incident color under this segment, observer-facing image.
fn receiptLight(p: vec2f, a: vec2f, b: vec2f, f: Slate) -> vec2f {
  let ha = lipHeight(a.y);
  let hb = lipHeight(b.y);
  let height = 0.5 * (ha + hb);
  let fa = a + vec2f(0., C * ha);
  let fb = b + vec2f(0., C * hb);
  let metric = vec2f(1., 2.);
  let footDist = segmentDist(p * metric, fa * metric, fb * metric);
  let pool = 1. - smoothstep(0., 10. + 0.50 * height, footDist);
  let soft = 0.18 * pool * pool * f.matte;
  if (f.polish <= 0.) { return vec2f(soft, 0.); }
  let ia = a + f.shiftPerHeight * ha;
  let ib = b + f.shiftPerHeight * hb;
  let grainMetric = vec2f(0.66, 1.18);
  let va = localAxes(ia - p, f.grain) * grainMetric;
  let vb = localAxes(ib - p, f.grain) * grainMetric;
  let imgDist = segmentDist(vec2f(0.), va, vb);
  let width = 1.35 + 0.043 * height;
  let core = 1. - smoothstep(0.35, width, imgDist);
  let skirt = 1. - smoothstep(0., 2.65 * width, imgDist);
  let gleam = (0.53 * core + 0.29 * skirt * skirt) * f.polish / (1. + 0.013 * height);
  return vec2f(soft, gleam);
}
struct Ink {
  paint: vec3f, outside: vec3f,
}
fn stroke(qDist: f32, floorPair: vec2f, s: Piece, aa: f32) -> Ink {
  let air = 1. - smoothstep(0., 14., qDist);
  let spill = s.tint * (0.16 * air * air + vec3f(0.71, 0.83, 0.94) * floorPair.x);
  let imageInk = (s.tint * vec3f(0.76, 0.86, 0.97) + vec3f(0.12, 0.11, 0.09)) * floorPair.y;
  return Ink(lipPaint(qDist, aa, s.tint), spill + imageInk);
}
fn displayColor(linearColor: vec3f) -> vec4f {
  let v = max(linearColor, vec3f(0.));
  let tone = v / (vec3f(1.) + v);
  let rgb = select(12.92 * tone, 1.055 * pow(tone, vec3f(1. / 2.4)) - 0.055,
                   tone > vec3f(0.0031308));
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
  if (abs(p.x) > 125. || abs(p.y) > 90.) { return displayColor(base); }
  let f = slateAt(p, aa, joint);
  let a = vec2f(-2., -14.);
  let b = vec2f(-2., -4.);
  let c = vec2f(2., 4.);
  let e = vec2f(2., 14.);
  var ground = base;
  var pigment = vec3f(0.);
  var weight = 0.;
  for (var i = 0; i < 7; i++) {
    let s = pieceAt(i, t, u.reduced);
    if (s.coverage <= 0. || abs(p.x - s.center.x) > 64.) { continue; }
    let q = s.pivot + localAxes(p - s.center, s.axis);
    let edge = contour(q, s);
    let mask = s.coverage * (1. - smoothstep(-aa, aa, edge));
    let ridge = smoothstep(-aa, aa, abs(q.x) - (7. + 0.36 * q.y));
    let roof = smoothstep(10. - aa, 10. + aa, -q.y + 0.27 * q.x);
    var paint = s.tint * (0.075 + 0.12 * ridge + 0.07 * roof);
    var spill = vec3f(0.);
    if (s.longLip > 0.) {
      let d = min(segmentDist(q, a, b), min(segmentDist(q, b, c), segmentDist(q, c, e)));
      let wa = onScreen(a, s);
      let wb = onScreen(b, s);
      let wc = onScreen(c, s);
      let we = onScreen(e, s);
      // Union the three prints of one bent stroke; do not triple-light its joints.
      let floorPair = max(receiptLight(p, wa, wb, f), max(receiptLight(p, wb, wc, f), receiptLight(p, wc, we, f)));
      let ink = stroke(d, floorPair, s, aa);
      paint += s.longLip * ink.paint;
      spill += s.longLip * ink.outside;
    }
    if (s.crossLip > 0.) {
      let toe = vec2f(s.side * s.reach, 0.21 * s.reach);
      let d = segmentDist(q, vec2f(0.), toe);
      let ink = stroke(d, receiptLight(p, onScreen(vec2f(0.), s), onScreen(toe, s), f), s, aa);
      paint += s.crossLip * ink.paint;
      spill += s.crossLip * ink.outside;
    }
    ground += spill * (s.coverage * s.share);
    pigment += mask * paint;
    weight += mask;
  }
  let art = mix(ground, pigment / max(weight, 0.00001), min(weight, 1.));
  return displayColor(art);
}