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
  return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0) - r;
}
fn skin(d: f32, w: f32) -> f32 { return 1.0 - smoothstep(-w, w, d); }
fn rodD(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let v = b - a;
  return length(p - a - clamp(dot(p - a, v) / dot(v, v), 0.0, 1.0) * v);
}
fn heartD(p: vec2f) -> f32 {
  let v = vec2f(abs(p.x) - 4.0, p.y + 3.0);
  if (v.y < 0.0) { return length(v) - 5.0; }
  if (v.y < 3.535534) { return length(vec2f(max(v.x, 0.0), v.y)) - 5.0; }
  return (abs(p.x) + p.y - 8.071068) * 0.7071068;
}
fn code1(v: f32) -> f32 {
  let x = clamp(v, 0.0, 1.0);
  if (x <= 0.0031308) { return 12.92 * x; }
  return 1.055 * pow(x, 1.0 / 2.4) - 0.055;
}

// Project one strip of the lens through the hood onto the inclined shoe.
// Aperture and ear coordinates are in the same frame used to draw the metal.
fn stripFlux(m: vec2f, sy: f32) -> f32 {
  let v = m - vec2f(1.0, sy);
  if (v.x <= 0.01) { return 0.0; }
  let slopeY = v.y / v.x;
  let atBrow = sy + (4.8 - 1.0) * slopeY;
  let atSill = sy + (3.4 - 1.0) * slopeY;
  var thru = smoothstep(-2.95, -2.45, atBrow) * (1.0 - smoothstep(2.45, 2.95, atSill));
  if (m.x > 10.4) {
    let atEar = sy + (10.4 - 1.0) * slopeY;
    let blocked = smoothstep(0.55, 1.05, atEar) * (1.0 - smoothstep(4.65, 5.15, atEar));
    thru *= 1.0 - blocked;
  }
  let d2 = dot(v, v);
  let ca = v.x * inverseSqrt(max(0.0001, d2));
  return thru * ca * ca / (1.0 + d2 / 305.0);
}

@fragment fn fs(@builtin(position) at: vec4f) -> @location(0) vec4f {
  let bgCode = vec3f(0.056, 0.075, 0.087);
  let t = u.age;
  if (u.live < 0.5 || t <= 0.0 || t >= 1310.0) { return vec4f(bgCode, 1.0); }
  let sc = max(u.scale, 0.0001);
  let p = (at.xy - u.size * 0.5) / sc;
  let w = 0.58 / sc;
  let quiet = u.reduced >= 0.5;
  let travel = smoothstep(select(138.0, 380.0, quiet), 425.0, t);
  let lift = smoothstep(425.0, select(850.0, 495.0, quiet), t);
  let seated = select(0.0, 1.0, t >= 425.0);
  let lipY = mix(-15.6, 14.6, travel);
  let q = p - vec2f(42.0, 0.0);
  let rad = length(q);
  let sky = clamp(0.5 - p.y / 64.0, 0.0, 1.0);

  // Only the background constant is display-coded. Work in linear RGB.
  let bg = pow((bgCode + vec3f(0.055)) / 1.055, vec3f(2.4));
  var c = bg;
  let bodyD = min(boxD(p - vec2f(-17.0, 0.0), vec2f(59.5, 25.0), 6.0), rad - 34.0);
  let bodyCol = mix(vec3f(0.043, 0.057, 0.059), vec3f(0.110, 0.134, 0.130), sky);
  c = mix(c, vec3f(0.161, 0.182, 0.174), skin(bodyD, w));
  c = mix(c, bodyCol, skin(bodyD + 1.5, w));

  // The foot runs behind the right jamb; its bottom is the seating edge.
  let slotD = boxD(p - vec2f(-8.9, -1.0), vec2f(4.9, 18.6), 1.7);
  c = mix(c, vec3f(0.022, 0.029, 0.031), skin(slotD, w));
  let footD = boxD(p - vec2f(-11.1, lipY - 1.9), vec2f(6.0, 1.9), 0.55);
  let footCol = mix(vec3f(0.18, 0.20, 0.20), vec3f(0.40, 0.42, 0.38), smoothstep(0.5, 2.6, lipY - p.y));
  c = mix(c, footCol, skin(footD, w));
  for (var j: i32 = 0; j < 2; j += 1) {
    let h = p - vec2f(-57.0 + 31.0 * f32(j), 0.0);
    let jambD = boxD(h, vec2f(14.7, 15.6), 3.0);
    let wellM = skin(boxD(h, vec2f(12.8, 13.5), 1.8), w);
    c = mix(c, vec3f(0.235, 0.244, 0.218), skin(jambD, w));
    c = mix(c, vec3f(0.039, 0.028, 0.024), wellM);
    let pigment = mix(vec3f(0.50, 0.108, 0.049), vec3f(0.74, 0.205, 0.081), clamp(0.5 - h.y / 18.0, 0.0, 1.0));
    c = mix(c, pigment, skin(heartD(h), w));
    if (j == 1) {
      let underM = wellM * skin(h.y - lipY - 1.35, w);
      c = mix(c, c * 0.46, underM);
      let shutterM = wellM * skin(h.y - lipY, w);
      let steel = mix(vec3f(0.125, 0.151, 0.154), vec3f(0.248, 0.276, 0.266), clamp((lipY - h.y) / 26.0, 0.0, 1.0));
      let foldM = skin(abs(h.y - lipY + 2.05) - 0.78, w);
      c = mix(c, mix(steel, vec3f(0.378, 0.400, 0.360), foldM), shutterM);
    }
  }

  // Matte dial casting. Its circumference does not respond to contact.
  let rimN = q / max(0.001, rad);
  let roomOnRim = 0.26 + 0.091 * dot(rimN, vec2f(-0.55, -0.835));
  c = mix(c, vec3f(0.041, 0.051, 0.053), skin(rad - 33.65, w));
  c = mix(c, vec3f(0.46, 0.49, 0.47) * roomOnRim, skin(rad - 32.65, w));
  c = mix(c, vec3f(0.054, 0.066, 0.062), skin(rad - 29.15, w));
  let paper = vec3f(0.694, 0.638, 0.477) * (0.94 + 0.06 * sky);
  c = mix(c, paper, skin(rad - 27.95, w));
  let pin = vec2f(0.0, 5.0);
  let ink = vec3f(0.057, 0.070, 0.064);
  for (var j: i32 = 0; j < 9; j += 1) {
    let a = 2.88 + 0.317 * f32(j);
    let v = vec2f(cos(a), sin(a));
    c = mix(c, ink, skin(rodD(q, pin + v * 22.5, pin + v * 25.6) - 0.73, w));
  }
  let bearing = 2.88 + 0.58 * lift;
  let arm = vec2f(cos(bearing), sin(bearing));
  let along = clamp(dot(q - pin, arm) / 23.4, 0.0, 1.0);
  let handD = rodD(q, pin - arm * 3.9, pin + arm * 23.4) - mix(1.75, 0.86, along);
  c = mix(c, vec3f(0.023, 0.052, 0.065), skin(handD, w));
  c = mix(c, ink, skin(length(q - pin) - 3.6, w));
  c = mix(c, vec3f(0.356, 0.307, 0.199), skin(length(q - pin) - 1.95, w));

  // The stop top is y=14.6, exactly the final bottom of the foot.
  let stopD = boxD(p - vec2f(-7.4, 18.7), vec2f(4.35, 4.1), 0.65);
  let stopCol = mix(vec3f(0.116, 0.124, 0.115), vec3f(0.275, 0.278, 0.245), 1.0 - smoothstep(14.8, 16.5, p.y));
  c = mix(c, stopCol, skin(stopD, w));
  let lampC = vec2f(-5.2, 19.4);
  let ax = normalize(vec2f(0.93, -0.37));
  let side = vec2f(-ax.y, ax.x);
  let m = vec2f(dot(p - lampC, ax), dot(p - lampC, side));
  let socketD = boxD(m - vec2f(-1.1, 0.0), vec2f(4.15, 4.05), 1.0);
  c = mix(c, vec3f(0.037, 0.044, 0.043), skin(socketD, w));
  let lensD = boxD(m - vec2f(0.05, 0.0), vec2f(2.65, 3.05), 1.1);
  let lensGain = smoothstep(-2.6, 1.5, m.x) * (1.0 - 0.22 * smoothstep(0.8, 3.0, abs(m.y)));
  let glass = vec3f(0.097, 0.045, 0.016) + seated * mix(vec3f(0.55, 0.22, 0.046), vec3f(0.90, 0.665, 0.235), lensGain);
  c = mix(c, glass, skin(lensD, w));
  let browD = boxD(m - vec2f(0.0, -3.7), vec2f(4.8, 1.0), 0.45);
  let sillD = boxD(m - vec2f(-0.6, 3.5), vec2f(4.0, 0.8), 0.4);
  c = mix(c, vec3f(0.141, 0.150, 0.139), skin(browD, w));
  c = mix(c, vec3f(0.069, 0.078, 0.074), skin(sillD, w));

  // A separate broad shoe on the dial side. Clip the two far corners;
  // neither the bed nor the face extends back across the gap to the lamp.
  let shoeBox = boxD(m - vec2f(16.2, 0.0), vec2f(7.5, 9.35), 1.05);
  let shoeD = max(shoeBox, (m.x + 0.70 * abs(m.y) - 27.4) * 0.81923);
  c = mix(c, vec3f(0.041, 0.052, 0.055), skin(shoeD - 0.85, w));
  let slopeAmt = clamp((m.x - 8.7) / 15.0, 0.0, 1.0);
  let bevelCol = mix(vec3f(0.285, 0.303, 0.292), vec3f(0.106, 0.124, 0.125), slopeAmt);
  c = mix(c, bevelCol, skin(shoeD, w));
  let flux = 0.25 * (stripFlux(m, -1.55) + 2.0 * stripFlux(m, 0.0) + stripFlux(m, 1.55));
  let roomOnShoe = mix(0.258, 0.204, slopeAmt);
  let incident = vec3f(roomOnShoe) + vec3f(1.36, 0.505, 0.082) * (seated * flux);
  let shoeCol = vec3f(0.65, 0.69, 0.70) * incident;
  c = mix(c, shoeCol, skin(shoeD + 0.95, w));
  let earD = boxD(m - vec2f(10.4, 2.85), vec2f(1.05, 2.05), 0.35);
  let earCol = mix(vec3f(0.211, 0.224, 0.216), vec3f(0.094, 0.110, 0.109), smoothstep(9.6, 10.8, m.x));
  c = mix(c, earCol, skin(earD, w));

  let opacity = smoothstep(0.0, 70.0, t) * (1.0 - smoothstep(1090.0, 1310.0, t));
  let outLin = mix(bg, c, opacity);
  return vec4f(code1(outLin.r), code1(outLin.g), code1(outLin.b), 1.0);
}