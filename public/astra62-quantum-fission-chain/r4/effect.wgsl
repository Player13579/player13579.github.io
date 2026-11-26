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

const SEA: vec3f = vec3f(0.09, 1.23, 1.41);
const VIOLET: vec3f = vec3f(0.69, 0.40, 1.60);
const HOME: vec2f = vec2f(0., -7.);
const ROOT_ANGLE: f32 = -0.17;
const C: f32 = 0.8660254;

fn axisAt(a: f32) -> vec2f { return vec2f(cos(a), sin(a)); }
fn across(v: vec2f) -> vec2f { return vec2f(-v.y, v.x); }
fn turn(v: vec2f, ax: vec2f) -> vec2f { return ax * v.x + across(ax) * v.y; }
fn inAxes(v: vec2f, ax: vec2f) -> vec2f { return vec2f(dot(v, ax), dot(v, across(ax))); }
fn forkTime(side: f32) -> f32 { return select(670., 590., side < 0.); }
fn dyeOf(side: f32) -> vec3f { return select(VIOLET, SEA, side < 0.); }
fn halfAngle(side: f32, rm: f32) -> f32 {
  return mix(ROOT_ANGLE, side * 0.50, mix(1., 0.46, rm));
}

// All cuts are in the uncut drawing's coordinates. center is the
// screen image of pivot; changing a pivot must not move the cut at release.
struct Gem {
  center: vec2f, pivot: vec2f, axis: vec2f, side: f32, bank: f32,
}
fn imageOf(s: Gem, q: vec2f) -> vec2f { return s.center + turn(q - s.pivot, s.axis); }
fn wholeGem() -> Gem { return Gem(HOME, vec2f(0.), axisAt(ROOT_ANGLE), 0., 0.); }
fn halfGem(side: f32, t: f32, rm: f32) -> Gem {
  let pivot = vec2f(8. * side, 0.);
  let startPos = imageOf(wholeGem(), pivot);
  let endPos = HOME + mix(1., 0.86, rm) * vec2f(32. * side, select(3., -5., side < 0.));
  let h = smoothstep(290., forkTime(side) - 55., t);
  return Gem(mix(startPos, endPos, h), pivot, axisAt(mix(ROOT_ANGLE, halfAngle(side, rm), h)), side, 0.);
}
fn quarterGem(parentGem: Gem, bank: f32, t: f32, rm: f32) -> Gem {
  let side = parentGem.side;
  let fork = forkTime(side);
  let upper = bank < 0.;
  let pivot = parentGem.pivot + vec2f(0., 9. * bank);
  let startPos = imageOf(parentGem, pivot);
  let endPos = parentGem.center + mix(1., 0.86, rm) * vec2f(side * select(20., 43., upper), select(16., -19., upper));
  let endAngle = mix(ROOT_ANGLE, side * (0.44 + select(-0.54, 0.77, upper)), mix(1., 0.46, rm));
  let h = mix(smoothstep(fork, fork + 270., t), smoothstep(fork, fork + 116., t), mix(0.50, 0.45, rm));
  return Gem(mix(startPos, endPos, h), pivot, axisAt(mix(halfAngle(side, rm), endAngle, h)), side, bank);
}

fn contour(q: vec2f, s: Gem) -> f32 {
  let v = abs(q);
  var d = max(max(v.x - 16., v.y - 19.), (v.x + 0.56 * v.y - 19.) * 0.872);
  if (s.side != 0.) {
    d = max(d, -s.side * (q.x - clamp(0.5 * q.y, -2., 2.)) * 0.90);
  }
  if (s.bank != 0.) { d = max(d, -s.bank * (q.y - 0.21 * s.side * q.x) * 0.979); }
  return d;
}
struct Lip { a: vec2f, b: vec2f, }
fn segDist(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let ab = b - a;
  let h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0., 1.);
  return length(p - (a + h * ab));
}
// Signed insets use the same edge parameterization on both mates.
fn jogBand(s: Gem, inset: f32) -> Lip {
  let n = normalize(vec2f(1., -0.5)) * inset;
  return Lip(imageOf(s, vec2f(-2., -4.) + n), imageOf(s, vec2f(2., 4.) + n));
}
fn forkBand(s: Gem, inset: f32) -> Lip {
  let n = normalize(vec2f(-0.21 * s.side, 1.)) * inset;
  let alongCut = vec2f(s.side, 0.21);
  return Lip(imageOf(s, alongCut * 2. + n), imageOf(s, alongCut * 14. + n));
}

// Orthographic floor drawing. Screen down = (0,.5,-C), viewer = (0,C,.5).
// Matte color belongs at the foot; the polished image depends on the viewer.
struct Slate { shift: vec2f, grain: vec2f, polish: f32, matte: f32, }
fn slateAt(p: vec2f, aa: f32, joint: f32) -> Slate {
  let x = abs(p.x);
  let wing = select(-1., 1., p.x >= 0.);
  let innerCut = x - (15. + 0.12 * (p.y - 41.));
  let outerCut = x - (39. - 0.17 * (p.y - 41.));
  let endCut = p.y - (43.5 + 0.028 * (x - 55.));
  let rim = min(min(p.y - 21., 63. - p.y), 95. - x - 0.27 * abs(p.y - 42.));
  var jointDist = min(abs(innerCut), abs(outerCut));
  var tilt = vec2f(0.);
  var brush = vec2f(1., 0.);
  if (innerCut >= 0.) {
    tilt = vec2f(0.038 * wing, 0.012);
    brush = normalize(vec2f(wing, -0.50));
  }
  if (outerCut >= 0.) {
    jointDist = min(jointDist, abs(endCut));
    let farFace = endCut >= 0.;
    tilt = vec2f(select(0.032, -0.038, farFace) * wing, select(0.016, -0.011, farFace));
    brush = normalize(vec2f(wing, select(0.68, -0.23, farFace)));
  }
  let dressed = smoothstep(0., 1.3 + aa, rim) * smoothstep(0.15, 1.45 + aa, jointDist);
  let ray = reflect(vec3f(0., -C, -0.5), normalize(vec3f(tilt, 1.)));
  let shift = -vec2f(ray.x, 0.5 * ray.y - C * ray.z) / max(ray.z, 0.25);
  return Slate(shift, brush, dressed * (1. - 0.32 * joint), (0.73 + 0.27 * dressed) * (1. - 0.54 * joint));
}
fn lipHeight(y: f32) -> f32 { return clamp(22.4 - C * y, 0.5, 72.); }
fn floorReceipt(p: vec2f, line: Lip, f: Slate) -> vec2f {
  let ha = lipHeight(line.a.y);
  let hb = lipHeight(line.b.y);
  let height = 0.5 * (ha + hb);
  let fa = line.a + vec2f(0., C * ha);
  let fb = line.b + vec2f(0., C * hb);
  let metric = vec2f(1., 2.);
  let d = segDist(p * metric, fa * metric, fb * metric);
  let pool = 1. - smoothstep(0., 10. + 0.50 * height, d);
  let soft = 0.18 * pool * pool * f.matte;
  if (f.polish <= 0.) { return vec2f(soft, 0.); }
  let ia = line.a + f.shift * ha;
  let ib = line.b + f.shift * hb;
  let brushMetric = vec2f(0.66, 1.18);
  let va = inAxes(ia - p, f.grain) * brushMetric;
  let vb = inAxes(ib - p, f.grain) * brushMetric;
  let dist = segDist(vec2f(0.), va, vb);
  let width = 1.35 + 0.043 * height;
  let core = 1. - smoothstep(0.35, width, dist);
  let skirt = 1. - smoothstep(0., 2.65 * width, dist);
  return vec2f(soft, (0.53 * core + 0.29 * skirt * skirt) * f.polish / (1. + 0.013 * height));
}

struct Wash { body: vec3f, cover: f32, floorInk: vec3f, }
fn surface(p: vec2f, s: Gem, dye: vec3f, aa: f32) -> Wash {
  let q = s.pivot + inAxes(p - s.center, s.axis);
  let d = contour(q, s);
  let ridge = smoothstep(-aa, aa, abs(q.x) - (7. + 0.36 * q.y));
  let roof = smoothstep(10. - aa, 10. + aa, -q.y + 0.27 * q.x);
  var value = 0.075 + 0.12 * ridge + 0.07 * roof;
  let elbow = abs(q.x - clamp(0.5 * q.y, -2., 2.));
  if (s.side == 0.) {
    value *= 1. - 0.38 * (1. - smoothstep(0.35, 1.45 + aa, elbow)) * (1. - smoothstep(12., 16., abs(q.y)));
  } else {
    value += 0.095 * (1. - smoothstep(0.5, 2.6 + aa, elbow));
  }
  if (s.bank != 0.) {
    let fresh = abs(q.y - 0.21 * s.side * q.x) * 0.979;
    value += 0.16 * (1. - smoothstep(0.65, 2.8 + aa, fresh));
  }
  return Wash(dye * value, 1. - smoothstep(-aa, aa, d), vec3f(0.));
}
fn emitLip(w: Wash, p: vec2f, line: Lip, dye: vec3f, gain: f32, f: Slate, aa: f32) -> Wash {
  if (gain <= 0.) { return w; }
  let d = segDist(p, line.a, line.b);
  let core = 1. - smoothstep(0.55, 1.15 + aa, d);
  let bevel = 1. - smoothstep(0.5, 3.7 + aa, d);
  let incision = dye * (0.50 * bevel + 0.94 * core) + vec3f(1.13, 1.03, 0.91) * core;
  let receipt = floorReceipt(p, line, f);
  let matteInk = dye * vec3f(0.71, 0.83, 0.94) * receipt.x;
  let polishInk = (dye * vec3f(0.76, 0.86, 0.97) + vec3f(0.12, 0.11, 0.09)) * receipt.y;
  return Wash(w.body + gain * incision, w.cover, w.floorInk + gain * (matteInk + polishInk));
}
// A satin return has flat ends and no white core. Test the gap at the
// corresponding point, not the distance between the two gem centers.
fn takePrint(w: Wash, p: vec2f, sender: Lip, mate: Lip, dye: vec3f, gain: f32, aa: f32) -> Wash {
  let ab = mate.b - mate.a;
  let span = max(length(ab), 0.001);
  let local = inAxes(p - mate.a, ab / span);
  let h = clamp(local.x / span, 0., 1.);
  let gap = length(mix(sender.a, sender.b, h) - mix(mate.a, mate.b, h));
  let near = 1. - smoothstep(4., 24., gap);
  let caps = smoothstep(-aa, aa, local.x) * (1. - smoothstep(span - aa, span + aa, local.x));
  let width = mix(1.6, 2.9, h);
  let satin = caps * (1. - smoothstep(width - 0.6, width + aa, abs(local.y)));
  return Wash(w.body + dye * (1.06 * gain * near * satin), w.cover, w.floorInk);
}
fn jogGain(t: f32) -> f32 {
  return (0.23 + 1.08 * smoothstep(46., 286., t)) * (1. - smoothstep(310., 438., t));
}
fn forkGain(side: f32, t: f32) -> f32 {
  let left = side < 0.;
  let rise = smoothstep(select(648., 424., left), forkTime(side) - 1., t);
  let retire = smoothstep(select(706., 608., left), select(796., 654., left), t);
  return rise * mix(1.25, 0.17, retire);
}
struct Drawing { pigment: vec3f, weight: f32, floorInk: vec3f, }
fn lay(d: Drawing, w: Wash) -> Drawing {
  return Drawing(d.pigment + w.cover * w.body, d.weight + w.cover, d.floorInk + w.floorInk);
}
fn displayColor(linearColor: vec3f) -> vec4f {
  let v = max(linearColor, vec3f(0.));
  let tone = v / (vec3f(1.) + v);
  let rgb = select(12.92 * tone, 1.055 * pow(tone, vec3f(1. / 2.4)) - vec3f(0.055), tone > vec3f(0.0031308));
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
  let uv = vec2f((p.x + 0.6 * p.y) / 46., p.y / 16.);
  let tile = floor(uv);
  let seams = abs(fract(uv) - vec2f(0.5));
  let joint = smoothstep(0.46, 0.50, max(seams.x, seams.y));
  let base = vec3f(0.009, 0.015, 0.026) * (1. + 0.04 * sin(tile.x * 1.8 + tile.y)) * (1. - 0.17 * joint);
  let t = u.ageMs;
  if (!(viewOK && u.live >= 0.5 && u.live <= 1. && u.reduced >= 0. && u.reduced <= 1. && t >= 0. && t < 1470.)) {
    return displayColor(base);
  }
  if (abs(p.x) > 125. || abs(p.y) > 90. || t >= 1280.) { return displayColor(base); }
  let rm = u.reduced;
  let f = slateAt(p, aa, joint);
  var drawing = Drawing(vec3f(0.), 0., vec3f(0.));
  let jog = jogGain(t);
  if (t < 290.) {
    let s = wholeGem();
    let w = surface(p, s, mix(SEA, VIOLET, 0.18), aa);
    drawing = lay(drawing, emitLip(w, p, jogBand(s, 1.), VIOLET, jog, f, aa));
  } else {
    for (var j = 0; j < 2; j++) {
      let side = select(1., -1., j == 0);
      let dye = dyeOf(side);
      let s = halfGem(side, t, rm);
      let fork = forkTime(side);
      let gain = forkGain(side, t);
      if (t < fork) {
        var w = surface(p, s, dye, aa);
        if (jog > 0.) {
          if (side > 0.) {
            w = emitLip(w, p, jogBand(s, 1.), VIOLET, jog, f, aa);
          } else {
            let sender = jogBand(halfGem(1., t, rm), 1.);
            w = takePrint(w, p, sender, jogBand(s, -2.25), mix(SEA, VIOLET, 0.40), jog * smoothstep(290., 322., t), aa);
          }
        }
        drawing = lay(drawing, emitLip(w, p, forkBand(s, -1.), dye, gain, f, aa));
      } else {
        let upper = quarterGem(s, -1., t, rm);
        let lower = quarterGem(s, 1., t, rm);
        let sender = forkBand(upper, -1.);
        let topWash = emitLip(surface(p, upper, dye, aa), p, sender, dye, gain, f, aa);
        let returnGain = gain * smoothstep(fork, fork + 20., t);
        let lowWash = takePrint(surface(p, lower, dye, aa), p, sender, forkBand(lower, 2.25), dye, returnGain, aa);
        drawing = lay(lay(drawing, topWash), lowWash);
      }
    }
  }
  let ground = base + drawing.floorInk;
  let body = drawing.pigment / max(drawing.weight, 0.00001);
  let art = mix(ground, body, min(drawing.weight, 1.));
  let visibility = smoothstep(0., 80., t) * (1. - smoothstep(1149., 1280., t));
  return displayColor(mix(base, art, visibility));
}