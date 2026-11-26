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

fn plate(p: vec2f, e: vec2f, r: f32) -> f32 {
  let d = abs(p) - e + vec2f(r);
  return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0) - r;
}
fn coat(d: f32, w: f32) -> f32 { return 1.0 - smoothstep(-w, w, d); }
fn wire(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let v = b - a;
  let s = clamp(dot(p - a, v) / dot(v, v), 0.0, 1.0);
  return length(p - a - s * v);
}
fn inlay(p: vec2f) -> f32 {
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

// Coordinates in the lamp's throwing frame. Intersect a lens-to-metal
// segment with the two unequal hood lips and the keeper on the rim.
fn lensRay(m: vec2f, lensY: f32, keeperAt: vec2f) -> f32 {
  let src = vec2f(0.8, lensY);
  let v = m - src;
  if (v.x <= 0.01) { return 0.0; }
  let dydx = v.y / v.x;
  let browY = lensY + (4.7 - src.x) * dydx;
  let sillY = lensY + (3.1 - src.x) * dydx;
  var vis = smoothstep(-2.95, -2.35, browY) * (1.0 - smoothstep(2.35, 2.95, sillY));
  if (m.x > keeperAt.x) {
    let ky = lensY + (keeperAt.x - src.x) * dydx - keeperAt.y;
    vis *= 1.0 - smoothstep(-0.35, 0.35, ky) * (1.0 - smoothstep(4.25, 4.95, ky));
  }
  let dsq = dot(v, v);
  let axCos = v.x * inverseSqrt(max(dsq, 0.0001));
  return vis * axCos * axCos / (1.0 + dsq / 235.0);
}

@fragment fn fs(@builtin(position) at: vec4f) -> @location(0) vec4f {
  let bgCode = vec3f(0.056, 0.075, 0.087);
  let t = u.age;
  if (u.live < 0.5 || t <= 0.0 || t >= 1310.0) { return vec4f(bgCode, 1.0); }
  let sc = max(u.scale, 0.0001);
  let p = (at.xy - 0.5 * u.size) / sc;
  let w = 0.58 / sc;
  let quiet = u.reduced >= 0.5;
  let slide = smoothstep(select(138.0, 380.0, quiet), 425.0, t);
  let turn = smoothstep(425.0, select(850.0, 495.0, quiet), t);
  let power = smoothstep(425.0, 449.0, t);
  let lipY = mix(-15.6, 14.6, slide);
  let dialC = vec2f(42.0, 0.0);
  let q = p - dialC;
  let rad = length(q);
  let rimN = q / max(rad, 0.001);
  let sky = clamp(0.5 - p.y / 60.0, 0.0, 1.0);

  // All paint, emission, reflection and retirement below are linear.
  // Each channel of this particular background code is above 0.04045.
  let bg = pow((bgCode + vec3f(0.055)) / 1.055, vec3f(2.4));
  var col = bg;
  let shellD = min(plate(p - vec2f(-17.0, 0.0), vec2f(59.5, 23.5), 6.0), rad - 34.0);
  let casting = mix(vec3f(0.045, 0.060, 0.062), vec3f(0.106, 0.132, 0.130), sky);
  col = mix(col, vec3f(0.175, 0.199, 0.190), coat(shellD, w));
  col = mix(col, casting, coat(shellD + 1.6, w));

  let raceD = plate(p - vec2f(-6.8, -0.4), vec2f(6.8, 19.1), 2.0);
  col = mix(col, vec3f(0.022, 0.032, 0.034), coat(raceD, w));
  let footD = plate(p - vec2f(-8.8, lipY - 1.7), vec2f(6.1, 1.7), 0.65);
  let footCol = mix(vec3f(0.19, 0.21, 0.20), vec3f(0.38, 0.40, 0.36), smoothstep(0.4, 2.5, lipY - p.y));
  col = mix(col, footCol, coat(footD, w));

  for (var j = 0; j < 2; j = j + 1) {
    let h = p - vec2f(-57.0 + 31.0 * f32(j), 0.0);
    let jambD = plate(h, vec2f(14.7, 15.6), 3.0);
    let wellD = plate(h, vec2f(12.8, 13.5), 1.8);
    let wellM = coat(wellD, w);
    col = mix(col, vec3f(0.235, 0.244, 0.218), coat(jambD, w));
    col = mix(col, vec3f(0.039, 0.028, 0.024), wellM);
    let heartD = inlay(h);
    let pigment = mix(vec3f(0.50, 0.108, 0.049), vec3f(0.74, 0.205, 0.081), clamp(0.5 - h.y / 18.0, 0.0, 1.0));
    col = mix(col, pigment, coat(heartD, w));
    if (j == 1) {
      let behind = wellM * coat(h.y - lipY - 1.4, w);
      col = mix(col, col * 0.46, behind);
      let shutM = wellM * coat(h.y - lipY, w);
      let steel = mix(vec3f(0.124, 0.150, 0.153), vec3f(0.248, 0.276, 0.266), clamp((lipY - h.y) / 26.0, 0.0, 1.0));
      let foldM = coat(abs(h.y - lipY + 2.05) - 0.78, w);
      col = mix(col, mix(steel, vec3f(0.378, 0.400, 0.360), foldM), shutM);
    }
  }

  // A fixed stop under the foot, and the lamp let into its right cheek.
  let stopD = plate(p - vec2f(-6.4, 18.0), vec2f(4.6, 3.4), 0.8);
  col = mix(col, vec3f(0.154, 0.157, 0.136), coat(stopD, w));
  let lampC = vec2f(0.1, 17.75);
  let axisD = normalize(vec2f(0.91, -0.415));
  let sideD = vec2f(-axisD.y, axisD.x);
  let m = vec2f(dot(p - lampC, axisD), dot(p - lampC, sideD));
  let socketD = plate(m - vec2f(-1.35, 0.0), vec2f(4.25, 4.15), 1.15);
  col = mix(col, vec3f(0.043, 0.049, 0.046), coat(socketD, w));
  let glassD = plate(m - vec2f(0.22, 0.0), vec2f(2.48, 3.02), 1.25);
  let mouth = smoothstep(-2.0, 1.7, m.x);
  let glass = vec3f(0.105, 0.051, 0.019) + power * mix(vec3f(0.52, 0.225, 0.048), vec3f(0.85, 0.56, 0.17), mouth);
  col = mix(col, glass, coat(glassD, w));
  let browD = plate(m - vec2f(0.0, -3.65), vec2f(4.7, 1.0), 0.48);
  let sillD = plate(m - vec2f(-0.8, 3.45), vec2f(3.9, 0.8), 0.42);
  col = mix(col, vec3f(0.115, 0.124, 0.115), coat(browD, w));
  col = mix(col, vec3f(0.060, 0.066, 0.060), coat(sillD, w));

  // Turned ring, interrupted only at the latch-side scarf flat.
  let room = 0.29 + 0.14 * dot(rimN, vec2f(-0.55, -0.835));
  col = mix(col, vec3f(0.036, 0.047, 0.050), coat(rad - 33.65, w));
  col = mix(col, vec3f(0.49, 0.51, 0.49) * room, coat(rad - 32.95, w));
  let rv = dot(q, -axisD);
  let rs = dot(q, sideD);
  let blankD = plate(vec2f(rv - 32.7, rs), vec2f(4.6, 10.0), 0.85);
  let cheekD = max(blankD, (rv - 37.3 + 0.68 * (abs(rs) - 7.0)) * 0.827);
  col = mix(col, vec3f(0.064, 0.077, 0.078), coat(cheekD, w));
  let lampV = dot(lampC - dialC, -axisD);
  let lampS = dot(lampC - dialC, sideD);
  let keeperAt = vec2f(lampV - 36.6, 4.0 - lampS);
  let irr = power * (lensRay(m, -1.7, keeperAt) + 2.0 * lensRay(m, 0.0, keeperAt) + lensRay(m, 1.7, keeperAt)) * 0.25;
  let rake = clamp((rv - 29.85) / 6.6, 0.0, 1.0);
  let nickel = vec3f(0.60, 0.64, 0.65);
  let localLight = vec3f(1.32, 0.56, 0.115) * (irr * (0.66 + 0.34 * rake));
  let flatCol = nickel * (vec3f(mix(0.34, 0.235, rake)) + localLight);
  col = mix(col, flatCol, coat(cheekD + 0.8, w));
  let keeperD = plate(vec2f(rv - 36.6, rs - 6.3), vec2f(1.15, 2.3), 0.42);
  col = mix(col, vec3f(0.107, 0.121, 0.118), coat(keeperD, w));

  col = mix(col, vec3f(0.055, 0.066, 0.061), coat(rad - 29.85, w));
  let paper = vec3f(0.694, 0.638, 0.477) * (0.94 + 0.06 * sky);
  col = mix(col, paper, coat(rad - 28.65, w));
  let pin = vec2f(0.0, 5.0);
  let marking = vec3f(0.057, 0.070, 0.064);
  for (var j = 0; j < 9; j = j + 1) {
    let a = 2.88 + 0.317 * f32(j);
    let v = vec2f(cos(a), sin(a));
    let tickD = wire(q, pin + v * 23.1, pin + v * 26.4) - 0.75;
    col = mix(col, marking, coat(tickD, w));
  }
  let bearing = 2.88 + 0.58 * turn;
  let arm = vec2f(cos(bearing), sin(bearing));
  let along = dot(q - pin, arm);
  let needleD = wire(q, pin - arm * 3.9, pin + arm * 23.4) - mix(1.75, 0.86, clamp(along / 23.4, 0.0, 1.0));
  col = mix(col, vec3f(0.023, 0.052, 0.065), coat(needleD, w));
  col = mix(col, marking, coat(length(q - pin) - 3.6, w));
  col = mix(col, vec3f(0.356, 0.307, 0.199), coat(length(q - pin) - 1.95, w));
  let opacity = smoothstep(0.0, 70.0, t) * (1.0 - smoothstep(1090.0, 1310.0, t));
  let outLin = mix(bg, col, opacity);
  return vec4f(code1(outLin.r), code1(outLin.g), code1(outLin.b), 1.0);
}