struct View {
  size: vec2f,
  ageMs: f32,
  scale: f32,
  reduced: f32,
  activeFlag: f32,
  pad: vec2f,
}

@group(0) @binding(0) var<uniform> view: View;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var vertices = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  return vec4f(vertices[i], 0, 1);
}

fn srgb(c: vec3f) -> vec3f {
  let x = clamp(c, vec3f(0), vec3f(1));
  return select(12.92 * x, 1.055 * pow(x, vec3f(1.0 / 2.4)) - vec3f(0.055), x > vec3f(0.0031308));
}

fn coverage(d: f32, aa: f32) -> f32 {
  return 1.0 - smoothstep(-aa, aa, d);
}

fn chargeAt(ms: f32) -> f32 {
  return 1.0 - clamp((ms - 180.0) / 180.0, 0.0, 1.0);
}

// A leaky optical guide fed by the iris. Less charge sustains a shorter
// coupled length. At any fixed point the response can only hold or fall.
fn guideAt(ax: f32, charge: f32, reduced: f32) -> f32 {
  let reach = mix(4.0, 40.0, charge);
  let coupled = 1.0 - smoothstep(reach - 5.0, reach + 5.0, ax);
  let loss = 1.0 / (1.0 + 0.017 * max(ax - 7.0, 0.0));
  return smoothstep(0.0, 1.0, charge) * loss * mix(coupled, 1.0, reduced);
}

// v=0 faces the glass; v=1 is the matte outer shoulder. The rolled cut
// sees a nearby patch of the pane, not just a point source at its centre.
fn cutColor(x: f32, dy: f32, slope: f32, side: f32, v: f32, shut: f32,
            direct: f32, bonded: f32, seated: f32) -> vec3f {
  let inward = normalize(vec2f(side * slope, -side));
  let bank = mix(1.60, 0.14, smoothstep(0.0, 1.0, v)) * (1.0 - 0.32 * shut);
  let n = normalize(vec3f(inward * bank, 1.0));
  let toPane = normalize(vec3f(-0.18 * x, -dy, 4.5));
  let halfDir = normalize(toPane + vec3f(0, 0, 1));
  let lobe = pow(max(dot(n, halfDir), 0.0), 6.0);
  let cutBand = 1.0 - smoothstep(0.22, 0.96, v);
  let facing = max(dot(n, normalize(vec3f(-0.28, 0.54, 0.78))), 0.0);
let shoulder = 1.0 - 0.58 * smoothstep(0.52, 1.0, v);
let groove = 1.0 - 0.48 * seated * (1.0 - smoothstep(0.0, 0.44, v));
let skin = vec3f(0.096, 0.167, 0.201) * (0.30 + 0.70 * facing);
// The common spanwise taper cancels in the ratio of added to base depth.
let baseDepth = select(mix(4.4, 1.65, shut), mix(5.4, 2.35, shut), side < 0.0);
let addedDepth = select(2.3, 2.8, side < 0.0) * (4.0 * shut * (1.0 - shut));
let spread = smoothstep(0.0, 0.72, addedDepth / baseDepth);
let cheek = spread * spread * (1.0 - smoothstep(0.42 * spread, 0.65 + 0.35 * spread, v));
let diffuse = (0.24 + 0.76 * facing) * (0.58 + 0.42 * n.z * n.z);
let nearCut = 1.0 - smoothstep(0.0, 5.0, 2.0 * abs(dy));
let skyAccess = 1.0 - 0.72 * nearCut * (1.0 - smoothstep(0.0, 0.60, v));
let groundFace = vec3f(0.310, 0.365, 0.390) * diffuse * skyAccess;
let satin = mix(skin, groundFace, cheek) * shoulder * groove;
  let reflection = vec3f(0.33, 0.48, 0.37) * direct * lobe * cutBand;
  let film = vec3f(0.055, 0.275, 0.244) * bonded * (0.12 + 0.88 * cutBand);
  return satin + reflection + film;
}

@fragment fn fs(@builtin(position) screen: vec4f) -> @location(0) vec4f {
  let bg = vec3f(0.009, 0.019, 0.035);
  let t = view.ageMs;
  if (view.activeFlag < 0.5 || t <= 0.0 || t >= 1070.0) {
    return vec4f(srgb(bg), 1);
  }

  let p = (screen.xy - view.size * 0.5) / view.scale;
  let aa = 0.66 / view.scale;
  let halfW = 35.0;
  if (abs(p.x) > halfW + 5.0 + aa || abs(p.y) > 26.0 + aa) {
    return vec4f(srgb(bg), 1);
  }

  let reduced = clamp(view.reduced, 0.0, 1.0);
  let reveal = smoothstep(0.0, 20.0, t);
  let charge = chargeAt(t);
  let sourceLight = smoothstep(0.0, 1.0, charge);
  let ax = min(abs(p.x), halfW);
  let direct = guideAt(ax, charge, reduced);
  // Short material residence on the bonded cut only. No second emitter.
  let bonded = 0.5 * (direct + guideAt(ax, chargeAt(t - 16.0), reduced));

  let shut = smoothstep(238.0, 610.0, t);
  let halfGap = mix(13.8, 8.0, reduced) * (1.0 - shut);
  let u = clamp(p.x / halfW, -1.0, 1.0);
  let arch = 1.0 - u * u;
  let archSlope = -2.0 * u / halfW;
  let bow = 1.8 * shut;
  let joint = bow * arch;
  let gapY = halfGap * arch;
  let upperY = joint - gapY;
  let lowerY = joint + gapY;
  let roll = 4.0 * shut * (1.0 - shut);
  let taper = 0.48 + 0.52 * arch;
  let upperDepth = taper * (mix(5.4, 2.35, shut) + 2.8 * roll);
  let lowerDepth = taper * (mix(4.4, 1.65, shut) + 2.3 * roll);
  let outerTop = upperY - upperDepth;
  let outerBottom = lowerY + lowerDepth;
  let vu = clamp((upperY - p.y) / upperDepth, 0.0, 1.0);
  let vl = clamp((p.y - lowerY) / lowerDepth, 0.0, 1.0);
  let seated = smoothstep(579.0, 610.0, t);
  let upperCol = cutColor(p.x, -gapY, (bow - halfGap) * archSlope, -1.0, vu, shut, direct, bonded, seated);
  let lowerCol = cutColor(p.x, gapY, (bow + halfGap) * archSlope, 1.0, vl, shut, direct, bonded, seated);

  // The iris is behind the moving faces. Apply the opaque pupil last so
  // even the warm crown of the annulus cannot paint over its dark centre.
  let lensP = p - vec2f(0.0, joint);
  let r = length(lensP);
  let radial = lensP / max(r, 1.0);
  let crown = 0.5 + 0.5 * dot(radial, vec2f(-0.6, -0.8));
  let ring = 1.0 - smoothstep(0.65, 3.2, abs(r - 5.9));
  let irisFlux = sourceLight * (0.58 + 0.42 * ring);
  let irisCol = vec3f(0.030, 0.062, 0.074) + irisFlux *
      (vec3f(0.27, 0.65, 0.50) + vec3f(0.31, 0.18, 0.08) * crown * crown);
  let h = clamp(abs(lensP.y) / max(aa, gapY), 0.0, 1.0);
  let recess = 1.0 - 0.32 * smoothstep(0.60, 1.0, h);
  let glassCol = vec3f(0.019, 0.044, 0.060) + vec3f(0.108, 0.472, 0.414) * direct * (1.0 - 0.28 * h);
  var paneCol = mix(glassCol, irisCol, coverage(r - 8.4, aa));
  paneCol = recess * mix(paneCol, vec3f(0.009, 0.021, 0.031), coverage(r - 3.45, aa));

  // Ordered differences partition a pixel. At seating the two inner
  // ordinates coincide, so the glass term cancels even on the AA boundary.
  let aboveUpper = coverage(p.y - upperY, aa);
  let aboveLower = coverage(p.y - lowerY, aa);
  let upperArea = aboveUpper - coverage(p.y - outerTop, aa);
  let paneArea = aboveLower - aboveUpper;
  let lowerArea = coverage(p.y - outerBottom, aa) - aboveLower;
  let endHalf = mix(halfW, 2.0, smoothstep(725.0, 1002.0, t));
  let span = coverage(abs(p.x) - endHalf, aa);

  let outsideY = max(outerTop - p.y, p.y - outerBottom);
  let clearance = length(max(vec2f(abs(p.x) - halfW, outsideY), vec2f(0)));
  let scatter = (0.76 * direct + 0.24 * bonded) * (1.0 - smoothstep(0.0, 5.0, clearance));
  let backing = bg + vec3f(0.028, 0.082, 0.074) * scatter;
  let col = backing + span * (upperArea * (upperCol - backing) + paneArea * (paneCol - backing) + lowerArea * (lowerCol - backing));
  let dissolve = 1.0 - smoothstep(846.0, 1028.0, t);
  return vec4f(srgb(mix(bg, col, reveal * dissolve)), 1);
}