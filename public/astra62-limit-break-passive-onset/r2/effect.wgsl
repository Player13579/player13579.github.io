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
  let lampPos = vec2f(3.0, 18.0);
  let q = p - vec2f(42.0, 0.0);
  let rad = length(q);
  let rimN = q / max(rad, 0.001);

  // Material swatches and lighting below are linear. The baseline is a display code.
  let bg = pow((bgCode + vec3f(0.055)) / 1.055, vec3f(2.4));
  var col = bg;
  let shellD = min(plate(p - vec2f(-17.0, 0.0), vec2f(59.5, 23.5), 6.0), rad - 34.0);
  let sky = clamp(0.5 - p.y / 60.0, 0.0, 1.0);
  let casting = mix(vec3f(0.045, 0.060, 0.062), vec3f(0.106, 0.132, 0.130), sky);
  col = mix(col, vec3f(0.175, 0.199, 0.190), coat(shellD, w));
  col = mix(col, casting, coat(shellD + 1.6, w));

  // Recess alongside the right jamb; a foot on the moving plate runs in it.
  let raceD = plate(p - vec2f(-5.7, -0.4), vec2f(7.9, 19.1), 2.0);
  col = mix(col, vec3f(0.022, 0.032, 0.034), coat(raceD, w));
  let footD = plate(p - vec2f(-6.7, lipY - 1.55), vec2f(7.6, 1.55), 0.65);
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

  // Fixed seat: its top is at the final bottom of the foot, y = 14.6.
  let seatD = plate(p - vec2f(-2.0, 18.0), vec2f(9.0, 3.4), 1.2);
  col = mix(col, vec3f(0.163, 0.159, 0.130), coat(seatD, w));
  let glassP = p - lampPos;
  let hoodD = plate(glassP, vec2f(3.65, 2.8), 1.15);
  let glassD = plate(glassP, vec2f(2.4, 1.9), 0.85);
  col = mix(col, vec3f(0.030, 0.035, 0.031), coat(hoodD, w));
  let glass = vec3f(0.109, 0.050, 0.015) + power * vec3f(0.885, 0.570, 0.160);
  col = mix(col, glass, coat(glassD, w));

  // Local illumination on the proud bezel only. No light is painted into the gap.
  let throwV = p - lampPos;
  let throwSq = dot(throwV, throwV);
  let ray = throwV * inverseSqrt(max(throwSq, 0.0001));
  let hoodGate = smoothstep(0.18, 0.90, dot(ray, vec2f(0.98058, -0.19612)));
  let facing = max(dot(rimN, -ray), 0.0) * 0.86;
  let incident = power * hoodGate * facing / (1.0 + throwSq / 170.0);
  let alloy = vec3f(0.49, 0.51, 0.49);
  let room = 0.29 + 0.14 * dot(rimN, vec2f(-0.55, -0.835));
  let chamfer = alloy * (vec3f(room) + vec3f(1.80, 0.77, 0.18) * incident);
  col = mix(col, vec3f(0.036, 0.047, 0.050), coat(rad - 33.65, w));
  col = mix(col, chamfer, coat(rad - 32.95, w));
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