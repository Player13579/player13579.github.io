// Candidate: limit-break-passive-onset-sol61-r7
// R7 visual-lighting revision: GPT-6.1-Sol.
// Based on the complete limit-break-passive-onset-sol61-r6 shader.
// R6 creative authorship: GPT-6.1-Sol.
// Historical R1-R5 creative authorship remains GPT-6.2-Astra.
// Historical editions and published R6 are not modified by this proposal.
//
// Authoritative public HEAD:
// 5f106feaaeaa0ab121df683ba373d87ef866328a
// R6 source:
// /public/astra62-limit-break-passive-onset/r6/effect.wgsl
// R6 Git blob:
// e997f385e41150d663e5e122643982afeabb40dc
// R6 SHA-256:
// c868c893e139666c4677eab6e62c0e92da2ccf6f539a91b123c110ab093faf35
//
// Additional improvement allowance: edition 2/5; 3 remain after R7.
// Changes are confined to source-driven received-light/material response.
// Source geometry, ray samples, blockers, source radiance, timing,
// compositing geometry, and output encoding are retained.

struct Params {
  size: vec2f,
  age: f32,
  scale: f32,
  reduced: f32,
  live: f32,
  pad: vec2f,
}
@group(0) @binding(0) var<uniform> u: Params;

@vertex fn vs(@builtin(vertex_index) k: u32) -> @builtin(position) vec4f {
  var xy = vec2f(-1.0, -1.0);
  if (k == 1u) { xy = vec2f(3.0, -1.0); }
  if (k == 2u) { xy = vec2f(-1.0, 3.0); }
  return vec4f(xy, 0.0, 1.0);
}

fn boxD(p: vec2f, e: vec2f, r: f32) -> f32 {
  let d = abs(p) - e + vec2f(r);
  return length(max(d, vec2f(0.0))) +
    min(max(d.x, d.y), 0.0) - r;
}

fn skin(d: f32, w: f32) -> f32 {
  return 1.0 - smoothstep(-w, w, d);
}

fn rodD(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let v = b - a;
  return length(
    p - a -
    clamp(dot(p - a, v) / max(0.000001, dot(v, v)), 0.0, 1.0) * v
  );
}

fn heartD(p: vec2f) -> f32 {
  let v = vec2f(abs(p.x) - 4.0, p.y + 3.0);
  if (v.y < 0.0) { return length(v) - 5.0; }
  if (v.y < 3.535534) {
    return length(vec2f(max(v.x, 0.0), v.y)) - 5.0;
  }
  return (abs(p.x) + p.y - 8.071068) * 0.7071068;
}

fn code1(v: f32) -> f32 {
  let x = clamp(v, 0.0, 1.0);
  if (x <= 0.0031308) { return 12.92 * x; }
  return 1.055 * pow(x, 1.0 / 2.4) - 0.055;
}

fn shoulder(v: vec3f) -> vec3f {
  let k = vec3f(0.75);
  let hi = max(v - k, vec3f(0.0));
  return min(v, k) + 0.25 * hi / (vec3f(0.25) + hi);
}

// A bent prism seated in the lower return of the contact casting.
const TIP = vec2f(-62.8, 29.5);
const ELBOW = vec2f(-22.0, 29.5);
const ROOT = vec2f(-7.3, 23.0);

fn railD(p: vec2f) -> f32 {
  return min(rodD(p, TIP, ELBOW), rodD(p, ELBOW, ROOT));
}

fn railY(x: f32) -> f32 {
  return mix(
    ELBOW.y,
    ROOT.y,
    clamp((x - ELBOW.x) / (ROOT.x - ELBOW.x), 0.0, 1.0)
  );
}

fn toeAt(x: f32) -> vec2f {
  return vec2f(x, railY(x) + 7.1);
}

// For a ray from a tray point to the lower prism face, test just the
// part of its projection that is below the top of the retaining toe.
fn toeVisibility(p: vec2f, s: vec2f, toe: vec2f) -> f32 {
  let radii = vec2f(2.25, 2.05);
  let a = (p - toe) / radii;
  let b = (mix(p, s, 0.70) - toe) / radii;
  return smoothstep(0.86, 1.16, rodD(vec2f(0.0), a, b));
}

fn traySample(p: vec2f, s: vec2f, ds: f32) -> f32 {
  let v = p - s;
  let h2 = 43.56;
  let r2 = dot(v, v) + h2;
  let vis =
    toeVisibility(p, s, toeAt(-50.2)) *
    toeVisibility(p, s, toeAt(-17.0));
  return vis * (0.5 * ds * h2) * inverseSqrt(r2) / r2;
}

fn trayFlux(p: vec2f) -> f32 {
  let face = vec2f(0.0, 3.9);
  var f = 0.0;
  for (var j = 0; j < 14; j += 1) {
    let s = mix(TIP, ELBOW, (f32(j) + 0.5) / 14.0) + face;
    f += traySample(p, s, length(ELBOW - TIP) / 14.0);
  }
  for (var j = 0; j < 6; j += 1) {
    let s = mix(ELBOW, ROOT, (f32(j) + 0.5) / 6.0) + face;
    f += traySample(p, s, length(ROOT - ELBOW) / 6.0);
  }
  return f;
}

// The same finite bent source, sampled at its upper face.
// Lower keepers remain blockers only for lower-face transport.
fn upperSample(p: vec2f, s: vec2f, ds: f32) -> f32 {
  let v = p - s;
  let h2 = 43.56;
  let r2 = dot(v, v) + h2;
  return (0.5 * ds * h2) * inverseSqrt(r2) / r2;
}

fn upperFlux(p: vec2f) -> f32 {
  let face = vec2f(0.0, -3.9);
  var f = 0.0;
  for (var j = 0; j < 14; j += 1) {
    let s = mix(TIP, ELBOW, (f32(j) + 0.5) / 14.0) + face;
    f += upperSample(p, s, length(ELBOW - TIP) / 14.0);
  }
  for (var j = 0; j < 6; j += 1) {
    let s = mix(ELBOW, ROOT, (f32(j) + 0.5) / 6.0) + face;
    f += upperSample(p, s, length(ROOT - ELBOW) / 6.0);
  }
  return f;
}

// R7 material response, not an additional light or a bloom kernel.
// Zero incident flux still produces zero return. The monotone shoulder
// gives weaker near-field samples more visible response while limiting
// the closest samples. Apply drive after this mapping so the original
// temporal envelope remains a linear factor in received radiance.
fn materialReturn(flux: f32) -> f32 {
  let f = max(flux, 0.0);
  return f / (0.16 + f);
}

@fragment fn fs(@builtin(position) at: vec4f) -> @location(0) vec4f {
  let bgCode = vec3f(0.056, 0.075, 0.087);
  let t = u.age;
  if (u.live < 0.5 || t <= 0.0 || t >= 1310.0) {
    return vec4f(bgCode, 1.0);
  }

  let sc = max(u.scale, 0.0001);
  let p = (at.xy - u.size * 0.5) / sc;
  let w = 0.58 / sc;
  let quiet = u.reduced >= 0.5;

  let travel = smoothstep(select(138.0, 380.0, quiet), 425.0, t);
  let lift = smoothstep(425.0, select(850.0, 495.0, quiet), t);
  let drive =
    smoothstep(425.0, select(548.0, 602.0, quiet), t) *
    (1.0 - smoothstep(942.0, 1195.0, t));

  let lipY = mix(-15.6, 14.6, travel);
  let q = p - vec2f(42.0, 0.0);
  let rad = length(q);
  let sky = clamp(0.5 - p.y / 64.0, 0.0, 1.0);
  let bg = pow((bgCode + vec3f(0.055)) / 1.055, vec3f(2.4));
  var c = bg;

  let rd = railD(p);
  let row = p.y - railY(p.x);

  // Cache incident flux before drive and material response.
  // Sampling positions, source dimensions, toe visibility, and the
  // R6 spatial envelope are unchanged.
  var upperIrr = 0.0;
  var lowerIrr = 0.0;
  var lowerReady = false;
  if (drive > 0.0 && rd < 30.0) {
    if (row < 0.0) {
      upperIrr = upperFlux(p);
    }
    if (row > 4.0) {
      lowerIrr = trayFlux(p);
      lowerReady = true;
    }
  }

  let receiverReach = 1.0 - smoothstep(18.0, 30.0, rd);
  let upperLight =
    drive * materialReturn(upperIrr) * receiverReach;
  let lowerLight =
    drive * materialReturn(lowerIrr) * receiverReach;

  let wingBox =
    boxD(p - vec2f(-35.0, 32.0), vec2f(41.5, 20.0), 4.0);
  let wingD = max(
    wingBox,
    max(
      (p.y - p.x - 119.0) * 0.7071,
      (p.x + 0.62 * p.y - 34.0) * 0.85
    )
  );
  let bodyD = min(
    wingD,
    min(
      boxD(p - vec2f(-17.0, 0.0), vec2f(59.5, 25.0), 6.0),
      rad - 34.0
    )
  );
  let bodyCol = mix(
    vec3f(0.043, 0.057, 0.059),
    vec3f(0.110, 0.134, 0.130),
    sky
  );

  // Cast metal: a soft local return, with a stronger catch on the
  // existing outer bevel. Wells and dial replace this layer below.
  let supportLight =
    upperLight * vec3f(0.022, 0.50, 0.36) +
    lowerLight * vec3f(0.028, 0.48, 0.42);
  c = mix(
    c,
    vec3f(0.161, 0.182, 0.174) + supportLight * 0.78,
    skin(bodyD, w)
  );
  c = mix(c, bodyCol + supportLight, skin(bodyD + 1.5, w));

  // The existing milled recess receives the same finite-source field.
  // Its close wall response is still localized by rail distance, but
  // now also requires sampled incident light rather than drive alone.
  let cutBox =
    boxD(p - vec2f(-34.2, 33.35), vec2f(37.8, 15.65), 3.0);
  let cutD = max(
    cutBox,
    max(
      (p.y - p.x - 114.6) * 0.7071,
      (p.x + 0.62 * p.y - 30.4) * 0.85
    )
  );
  let wallReturn = exp(-max(0.0, rd - 4.9) * 0.36);
  let wallLight = max(upperLight, lowerLight);
  c = mix(c, vec3f(0.030, 0.040, 0.049), skin(cutD - 0.8, w));
  let recessCol =
    vec3f(0.015, 0.022, 0.030) +
    vec3f(0.010, 0.30, 0.24) * (wallReturn * wallLight) +
    vec3f(0.016, 0.30, 0.245) * (upperLight + lowerLight);
  c = mix(c, recessCol, skin(cutD, w));

  let trayBox =
    boxD(p - vec2f(-34.0, 34.8), vec2f(35.9, 12.6), 1.7);
  let trayD = max(
    max(trayBox, (5.85 - row) * 0.94),
    max(
      (p.y - p.x - 111.9) * 0.7071,
      (p.x + 0.62 * p.y - 27.8) * 0.85
    )
  );
  if (trayD < w + 1.0) {
    var incident = 0.0;
    if (drive > 0.0) {
      if (lowerReady) {
        incident = lowerIrr;
      } else {
        incident = trayFlux(p);
      }
    }
    let irr = drive * materialReturn(incident);
    let tilt = smoothstep(6.0, 21.0, row);
    let bed = mix(
      vec3f(0.126, 0.153, 0.165),
      vec3f(0.060, 0.080, 0.094),
      tilt
    );
    let grazing = exp(-0.095 * (row - 8.4) * (row - 8.4));

    // Satin aluminum: a broader received return, not a new emitter.
    // Lower peak coefficients pair with the material response so the
    // farther bed can read without simply increasing the near hotspot.
    // The original finite-source toe occlusion remains upstream.
    let toBed =
      vec3f(0.042, 0.96, 0.76) +
      vec3f(0.010, 0.10, 0.12) * grazing;
    let bevel =
      vec3f(0.172, 0.193, 0.197) +
      irr * vec3f(0.060, 1.16, 0.91);
    c = mix(
      c,
      vec3f(0.021, 0.031, 0.038),
      skin(trayD - 0.85, w)
    );
    c = mix(c, bevel, skin(trayD, w));
    c = mix(c, bed + irr * toBed, skin(trayD + 1.30, w));
  }

  let slotD =
    boxD(p - vec2f(-8.9, -1.0), vec2f(4.9, 18.6), 1.7);
  c = mix(c, vec3f(0.022, 0.029, 0.031), skin(slotD, w));

  let footD =
    boxD(p - vec2f(-11.1, lipY - 1.9), vec2f(6.0, 1.9), 0.55);
  let footCol = mix(
    vec3f(0.18, 0.20, 0.20),
    vec3f(0.40, 0.42, 0.38),
    smoothstep(0.5, 2.6, lipY - p.y)
  );
  let footReturn =
    upperLight *
    smoothstep(lipY - 2.8, lipY - 0.3, p.y) *
    vec3f(0.022, 0.36, 0.26);
  c = mix(c, footCol + footReturn, skin(footD, w));

  for (var j: i32 = 0; j < 2; j += 1) {
    let h = p - vec2f(-57.0 + 31.0 * f32(j), 0.0);
    let jambD = boxD(h, vec2f(14.7, 15.6), 3.0);
    let wellM = skin(boxD(h, vec2f(12.8, 13.5), 1.8), w);

    // Only the source-facing lower metal edge receives this light.
    // The independent well and heart layers below remain unchanged.
    let jambReturn =
      upperLight *
      smoothstep(5.0, 14.0, h.y) *
      vec3f(0.032, 0.82, 0.55);
    c = mix(
      c,
      vec3f(0.235, 0.244, 0.218) + jambReturn,
      skin(jambD, w)
    );
    c = mix(c, vec3f(0.039, 0.028, 0.024), wellM);

    let pigment = mix(
      vec3f(0.50, 0.108, 0.049),
      vec3f(0.74, 0.205, 0.081),
      clamp(0.5 - h.y / 18.0, 0.0, 1.0)
    );
    c = mix(c, pigment, skin(heartD(h), w));

    if (j == 1) {
      let underM = wellM * skin(h.y - lipY - 1.35, w);
      c = mix(c, c * 0.46, underM);
      let shutterM = wellM * skin(h.y - lipY, w);
      let steel = mix(
        vec3f(0.125, 0.151, 0.154),
        vec3f(0.248, 0.276, 0.266),
        clamp((lipY - h.y) / 26.0, 0.0, 1.0)
      );
      let foldM = skin(abs(h.y - lipY + 2.05) - 0.78, w);
      let shutterReturn =
        upperLight *
        smoothstep(4.0, 14.0, h.y) *
        vec3f(0.024, 0.40, 0.29);
      let shutterCol =
        mix(steel, vec3f(0.378, 0.400, 0.360), foldM) +
        shutterReturn;
      c = mix(c, shutterCol, shutterM);
    }
  }

  // The dial retains its original room-lit materials and contrast.
  let rimN = q / max(0.001, rad);
  let roomOnRim =
    0.26 + 0.091 * dot(rimN, vec2f(-0.55, -0.835));
  c = mix(c, vec3f(0.041, 0.051, 0.053), skin(rad - 33.65, w));
  c = mix(
    c,
    vec3f(0.46, 0.49, 0.47) * roomOnRim,
    skin(rad - 32.65, w)
  );
  c = mix(c, vec3f(0.054, 0.066, 0.062), skin(rad - 29.15, w));
  let paper = vec3f(0.694, 0.638, 0.477) * (0.94 + 0.06 * sky);
  c = mix(c, paper, skin(rad - 27.95, w));

  let pin = vec2f(0.0, 5.0);
  let ink = vec3f(0.057, 0.070, 0.064);
  for (var j: i32 = 0; j < 9; j += 1) {
    let a = 2.88 + 0.317 * f32(j);
    let v = vec2f(cos(a), sin(a));
    c = mix(
      c,
      ink,
      skin(
        rodD(q, pin + v * 22.5, pin + v * 25.6) - 0.73,
        w
      )
    );
  }

  let bearing = 2.88 + 0.58 * lift;
  let arm = vec2f(cos(bearing), sin(bearing));
  let along = clamp(dot(q - pin, arm) / 23.4, 0.0, 1.0);
  let handD =
    rodD(q, pin - arm * 3.9, pin + arm * 23.4) -
    mix(1.75, 0.86, along);
  c = mix(c, vec3f(0.023, 0.052, 0.065), skin(handD, w));
  c = mix(c, ink, skin(length(q - pin) - 3.6, w));
  c = mix(
    c,
    vec3f(0.356, 0.307, 0.199),
    skin(length(q - pin) - 1.95, w)
  );

  // The stop remains exposed above the root ferrule: its top is y=14.6.
  let stopD =
    boxD(p - vec2f(-7.4, 18.7), vec2f(4.35, 4.1), 0.65);
  let stopCol = mix(
    vec3f(0.116, 0.124, 0.115),
    vec3f(0.275, 0.278, 0.245),
    1.0 - smoothstep(14.8, 16.5, p.y)
  );
  let stopReturn =
    upperLight *
    smoothstep(14.6, 18.0, p.y) *
    vec3f(0.028, 0.44, 0.31);
  c = mix(c, stopCol + stopReturn, skin(stopD, w));

  let ferrule = mix(
    vec3f(0.146, 0.163, 0.169),
    vec3f(0.041, 0.057, 0.060),
    smoothstep(-3.0, 2.5, row)
  );
  let ferruleReturn =
    upperLight *
      (1.0 - smoothstep(-4.0, -0.5, row)) *
      vec3f(0.036, 0.64, 0.46) +
    lowerLight *
      smoothstep(0.0, 5.0, row) *
      vec3f(0.024, 0.44, 0.38);
  c = mix(c, ferrule + ferruleReturn, skin(rd - 6.40, w));
  c = mix(c, vec3f(0.015, 0.024, 0.027), skin(rd - 5.43, w));

  // Smoky glass in room light. The broad body, inset opal spine and
  // blue cut face share current, not a moving highlight or a flash.
  // Source radiance is unchanged from R6 and its R5 source.
  let lowerFacet = smoothstep(1.65, 3.55, row);
  let cold = mix(
    vec3f(0.036, 0.079, 0.083),
    vec3f(0.016, 0.042, 0.058),
    lowerFacet
  );
  let spineD = railD(p + vec2f(0.0, 0.9));
  let spine = skin(
    spineD -
      mix(1.05, 1.45, smoothstep(-30.0, -8.0, p.x)),
    w
  );
  let milk = exp(-0.37 * spineD * spineD);
  let silica = mix(
    vec3f(0.013, 1.58, 0.87),
    vec3f(0.005, 0.56, 1.21),
    lowerFacet
  );
  let luminous =
    silica +
    milk * vec3f(0.24, 0.52, 0.40) +
    spine * vec3f(2.05, 1.92, 2.27);
  let glass =
    cold +
    vec3f(0.024, 0.036, 0.034) * spine +
    drive * luminous;
  c = mix(c, glass, skin(rd - 4.9, w));

  // Two metal keepers grip the lower facet, with lit inner cheeks and
  // dark backs. Their feet are the blockers used by traySample.
  // Their existing direct-contact response is retained.
  for (var j = 0; j < 2; j += 1) {
    let toe = toeAt(select(-50.2, -17.0, j == 1));
    let v = p - toe;
    let tangD =
      boxD(v + vec2f(0.0, 2.6), vec2f(1.45, 2.3), 0.50);
    let toeD =
      (length(v / vec2f(2.25, 2.05)) - 1.0) * 2.05;
    let cheek = 1.0 - smoothstep(-1.8, 0.55, v.y);
    let metal = mix(
      vec3f(0.045, 0.058, 0.061),
      vec3f(0.245, 0.262, 0.255),
      cheek
    );
    c = mix(
      c,
      vec3f(0.104, 0.138, 0.146) +
        drive * vec3f(0.042, 0.46, 0.42),
      skin(tangD, w)
    );
    c = mix(
      c,
      metal + (cheek * drive) * vec3f(0.050, 0.76, 0.59),
      skin(toeD, w)
    );
  }

  let opacity =
    smoothstep(0.0, 70.0, t) *
    (1.0 - smoothstep(1090.0, 1310.0, t));
  let outLin = mix(bg, shoulder(c), opacity);
  return vec4f(
    code1(outLin.r),
    code1(outLin.g),
    code1(outLin.b),
    1.0
  );
}
