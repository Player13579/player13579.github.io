// R2 — ordinary match-opening pennant. The host owns the event gate and PCM.
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
  let v = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  return vec4f(v[i], 0, 1);
}

fn srgb(c: vec3f) -> vec3f {
  let x = clamp(c, vec3f(0), vec3f(1));
  return select(12.92*x, 1.055*pow(x, vec3f(1.0/2.4))-vec3f(0.055), x>vec3f(0.0031308));
}

fn cov(d: f32, aa: f32) -> f32 {
  return 1.0 - smoothstep(-aa, aa, d);
}

fn line(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let v = b - a;
  return length(p - a - v * clamp(dot(p-a, v)/dot(v, v), 0.0, 1.0));
}

struct Section {
  mid: f32,
  halfH: f32,
  feed: f32,
}

fn sectionAt(u: f32, pull: f32, t: f32, reduced: f32) -> Section {
  let lag = t - 185.0 - 255.0*u;
  let v = max(lag, 0.0)/158.0;
  let wave = select(0.0, 4.7*exp(-v*0.71)*sin(v*3.25), lag > 0.0) * u*(1.0-reduced);
  let drop = mix(20.0, 0.0, pull) * (1.0-0.65*reduced)*u;

  // A broad backlit face is exposed as each fold opens. Only the first
  // release has extra transmission; the seated face holds a steady level.
  let opened = mix(smoothstep(0.0, 110.0, lag), pull, reduced);
  let release = smoothstep(0.0, 85.0, lag) * (1.0-smoothstep(105.0, 305.0, lag));
  let feed = 0.49 + 0.32*pull + 0.13*opened + 0.12*release*(1.0-reduced);
  return Section(9.0-4.5*u+drop+wave, 10.2*(1.0-u)+0.85, feed);
}

fn foldFace(u: f32, y: f32, pull: f32) -> f32 {
  return 0.5 + 0.5*cos(6.283185*(u-0.16*pull) + 0.95*y);
}

// Integral of a finite, smooth display-space kernel over [lo, hi].
fn litInterval(x: f32, lo: f32, hi: f32, radius: f32) -> f32 {
  return smoothstep(-radius, radius, x-lo) - smoothstep(-radius, radius, x-hi);
}

// Spread from an area, not from the contour: a furled panel or a narrow
// tip contributes less light. Integrate the dyed interval separately.
fn nearbyLight(q: vec2f, spread: f32, pull: f32, t: f32, reduced: f32) -> f32 {
  let dx = spread / 12.0;
  let rx = 8.0 + 0.10*spread;
  var lightSum = 0.0;
  for (var j = 0u; j < 12u; j += 1u) {
    let left = f32(j)*dx;
    let wx = litInterval(q.x, left, left+dx, rx);
    if (wx > 0.0) {
      let u = (f32(j)+0.5)/12.0;
      let s = sectionAt(u, pull, t, reduced);
      let ry = 9.0 + 0.26*s.halfH;
      let h = s.halfH;
      let whole = litInterval(q.y, s.mid-0.90*h, s.mid+0.88*h, ry);
      let dyeLo = clamp((0.35-u)/0.15, -0.90, 0.88);
      let dyeHi = clamp((0.53-u)/0.15, -0.90, 0.88);
      let dyed = litInterval(q.y, s.mid+h*dyeLo, s.mid+h*dyeHi, ry);
      let face = 0.68 + 0.32*foldFace(u, -0.1, pull);
      lightSum += wx * s.feed * face * (whole-0.84*dyed);
    }
  }
  return lightSum;
}

@fragment fn fs(@builtin(position) screen: vec4f) -> @location(0) vec4f {
  let bg = vec3f(0.015, 0.022, 0.035);
  if (view.activeFlag < 0.5 || view.ageMs >= 1270.0) {
    return vec4f(srgb(bg), 1);
  }
  let p = (screen.xy-view.size*0.5)/view.scale;
  let aa = 0.68/view.scale;
  let q = p-vec2f(-25, -16);
  // Nothing outside this box can receive the finite panel light.
  if (q.x < -16.0-aa || q.x > 73.0+aa || q.y < -20.0-aa || q.y > 46.0+aa) {
    return vec4f(srgb(bg), 1);
  }

  let t = view.ageMs;
  let pull = smoothstep(130.0, 490.0, t);
  let spread = mix(mix(7.0, 31.0, view.reduced), 58.0, pull);
  let spill = nearbyLight(q, spread, pull, t, view.reduced);
  var col = bg + vec3f(0.34, 0.55, 0.40)*spill;

  // The staff occludes the soft field. Its cloth-facing side picks it up.
  let mast = line(q, vec2f(-1.6, -5), vec2f(-1.6, 42));
  let facing = smoothstep(-3.1, -0.15, q.x);
  let metal = vec3f(0.27, 0.35, 0.37)*(0.72+0.28*facing);
  col = mix(col, metal + vec3f(0.46, 0.67, 0.52)*spill*facing, cov(mast-1.5, aa));
  let cap = length(q-vec2f(-1.6, -5.5));
  let brass = vec3f(0.73, 0.52, 0.24) + vec3f(0.25, 0.31, 0.16)*spill*facing;
  col = mix(col, brass, cov(cap-2.5, aa));

  let u = clamp(q.x/spread, 0.0, 1.0);
  let s = sectionAt(u, pull, t, view.reduced);
  let d = max(max(-q.x, q.x-spread), abs(q.y-s.mid)-s.halfH);
  let fabric = cov(d, aa);
  let y = clamp((q.y-s.mid)/s.halfH, -1.0, 1.0);
  let band = cov(abs(u+0.15*y-0.44)-0.09, aa/spread);

  // Reflected cloth colour and backlight transmission are independent
  // of silhouette coverage. The turned hem has a second thickness.
  let ridge = foldFace(u, y, pull);
  let hem = smoothstep(0.72, 0.98, abs(y));
  let windowFace = 1.0-smoothstep(0.0, 1.30, abs(y+0.28-0.22*(1.0-ridge)));
  let relief = 0.73 + 0.25*ridge - 0.10*hem;
  let pigment = mix(vec3f(0.27, 0.34, 0.29), vec3f(0.047, 0.061, 0.15), band);
  let transmission = mix(vec3f(0.54, 0.63, 0.52), vec3f(0.056, 0.082, 0.18), band);
  let litFace = (0.58+0.42*ridge)*(0.73+0.27*windowFace)*(1.0-0.42*hem);
  col = mix(col, pigment*relief + transmission*(litFace*s.feed), fabric);

  let tieMask = cov(abs(q.x-0.8)-0.85, aa)*fabric;
  let tieEdge = smoothstep(0.25, 1.60, q.x);
  let tie = vec3f(0.19, 0.30, 0.30) + vec3f(0.43, 0.59, 0.47)*spill*tieEdge;
  col = mix(col, tie, tieMask);

  let alpha = smoothstep(0.0, 88.0, t)*(1.0-smoothstep(915.0, 1234.0, t));
  return vec4f(srgb(mix(bg, col, alpha)), 1);
}
