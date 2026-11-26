struct View {
  size: vec2f,
  ageMs: f32,
  scale: f32,
  reduced: f32,
  activeFlag: f32,
  facing: f32,
  visibleFlag: f32,
}
@group(0) @binding(0) var<uniform> view: View;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var xy = vec2f(-1.0, -1.0);
  if (i == 1u) { xy = vec2f(3.0, -1.0); }
  if (i == 2u) { xy = vec2f(-1.0, 3.0); }
  return vec4f(xy, 0.0, 1.0);
}

fn srgb(c: vec3f) -> vec3f {
  let x = clamp(c, vec3f(0.0), vec3f(1.0));
  return select(12.92 * x, 1.055 * pow(x, vec3f(1.0 / 2.4)) - vec3f(0.055), x > vec3f(0.0031308));
}
fn cv(d: f32, w: f32) -> f32 { return 1.0 - smoothstep(-w, w, d); }
fn foot2(p: vec2f, a: vec2f, b: vec2f) -> vec2f {
  let v = b - a;
  return a + v * clamp(dot(p - a, v) / max(dot(v, v), 0.0001), 0.0, 1.0);
}
fn seg(p: vec2f, a: vec2f, b: vec2f) -> f32 { return length(p - foot2(p, a, b)); }
fn wedge(x: vec2f, y: vec2f) -> f32 { return x.x * y.y - x.y * y.x; }
fn triangle(p: vec2f, a: vec2f, b: vec2f, c: vec2f) -> f32 {
  let ab = wedge(b-a, p-a);
  let bc = wedge(c-b, p-b);
  let ca = wedge(a-c, p-c);
  let within = (ab >= 0.0 && bc >= 0.0 && ca >= 0.0) || (ab <= 0.0 && bc <= 0.0 && ca <= 0.0);
  return select(1.0, -1.0, within) * min(seg(p,a,b), min(seg(p,b,c), seg(p,c,a)));
}
fn softBox(p: vec2f, h: vec2f, r: f32) -> f32 {
  let e = abs(p) - h + vec2f(r);
  return length(max(e, vec2f(0.0))) + min(max(e.x, e.y), 0.0) - r;
}
fn pose(t: f32) -> f32 {
  let coil = mix(-1.12, -1.63, smoothstep(12.0, 165.0, t));
  let swing = mix(coil, 0.61, smoothstep(165.0, 443.0, t));
  return mix(swing, -1.12, smoothstep(552.0, 900.0, t));
}

const cellX: f32 = 20.9;
const cellZ: f32 = 4.45;
const cantY: f32 = 0.36;
// Production value. An offline equal-age control can zero just the received term.
const receiveGain: f32 = 1.0;
fn glazeInk(h: f32) -> vec3f {
  return mix(vec3f(0.98, 0.29, 0.048), vec3f(1.0, 0.84, 0.49), smoothstep(-0.12, 1.12, h));
}
// Four equal-area samples of the canted glaze face. +x is blade-ward, +z is out of the image.
fn glazeAt(v: vec2f, z: f32, nr: vec3f, cy: f32, drive: f32) -> vec3f {
  let ns = normalize(vec3f(-1.0, 0.0, 0.36));
  var flux = vec3f(0.0);
  for (var k: u32 = 0u; k < 4u; k = k + 1u) {
    let sx = select(-0.84, 0.84, (k & 1u) != 0u);
    let h = select(-1.22, 1.22, k >= 2u);
    let delta = vec3f(vec2f(cellX + sx, cy + cantY*sx + h) - v, cellZ - z);
    let r2 = max(dot(delta, delta), 0.001);
    let l = delta * inverseSqrt(r2);
    let cones = max(dot(ns, -l), 0.0) * max(dot(nr, l), 0.0);
    flux += glazeInk(h) * (cones / (1.0 + r2 / 59.0));
  }
  return flux * (0.25 * drive * receiveGain);
}
fn figure(p: vec2f, aa: f32, bg: vec3f) -> vec3f {
  let t = select(0.0, clamp(view.ageMs, 0.0, 980.0), view.activeFlag > 0.5);
  let theta = pose(t);
  let d = vec2f(cos(theta), sin(theta));
  let n = vec2f(-d.y, d.x);
  let shoulder = vec2f(-15.0, -3.0);
  let q = p - shoulder;
  let v = vec2f(dot(q,d), dot(q,n));
  let rm = clamp(view.reduced, 0.0, 1.0);
  let f = clamp((t - 165.0) / 278.0, 0.0, 1.0);
  let rate = 4.0 * f * (1.0 - f);
  let drive = rate * rate;
  let traverse = mix(-2.30, 2.30, smoothstep(0.12, 0.88, f));
  let cy = mix(traverse, -2.30, smoothstep(552.0, 900.0, t));
  var col = bg;
  let rr = length(q);
  if (t > 172.0 && t < 468.0 && rr > 24.0) {
    let prev = pose(max(0.0, t - mix(75.0, 32.0, rm)));
    let a = atan2(q.y, q.x);
    let u = clamp((a-prev) / max(theta-prev, 0.0001), 0.0, 1.0);
    let inner = mix(44.0, 28.0, u);
    let outer = mix(44.3, 48.0, u);
    let aw = aa / rr;
    let arc = cv(max(inner-rr, rr-outer), aa) * smoothstep(prev-aw, prev+aw, a) * (1.0-smoothstep(theta-aw, theta+aw, a));
    let fade = smoothstep(172.0, 222.0, t) * (1.0-smoothstep(425.0, 468.0, t));
    col = mix(col, vec3f(0.49, 0.245, 0.089), arc*fade*(0.10+0.55*u));
  }
  let hip = vec2f(-20.0, 13.0);
  let rear = seg(p, hip, vec2f(-29.0,29.0)) - 3.5;
  let front = seg(p, hip+vec2f(2.0,0.0), vec2f(-8.0,29.0)) - 3.7;
  col = mix(col, vec3f(0.105,0.145,0.17), cv(rear,aa));
  col = mix(col, vec3f(0.21,0.265,0.28), cv(front,aa));
  let coat = min(seg(p,hip,vec2f(-19.0,-5.0))-6.2, triangle(p,vec2f(-23.0,-4.0),vec2f(-12.0,14.0),vec2f(-27.0,16.0)));
  col = mix(col, vec3f(0.18,0.27,0.285), cv(coat,aa));
  let hood = length((p-vec2f(-19.0,-17.6))/vec2f(7.3,9.4))-1.0;
  col = mix(col, vec3f(0.32,0.405,0.41), cv(hood,aa/8.0));
  let visor = seg(p,vec2f(-17.0,-18.0),vec2f(-12.5,-18.0))-1.25;
  col = mix(col, vec3f(0.60,0.57,0.47), cv(visor,aa));

  let elbowV = vec2f(7.0,3.4);
  let handV = vec2f(15.0,0.0);
  let r0 = v-foot2(v,vec2f(0.0),elbowV);
  let r1 = v-foot2(v,elbowV,handV);
  let s0 = length(r0)-3.5;
  let s1 = length(r1)-2.65;
  let sleeve = min(s0,s1);
  if (sleeve < aa) {
    let rad = select(r0/3.5, r1/2.65, s1<s0);
    let nz = sqrt(max(0.0,1.0-dot(rad,rad)));
    let li = glazeAt(v, 0.35+1.15*nz, normalize(vec3f(rad,max(0.18,nz))), cy, drive);
    let cloth = vec3f(0.205,0.275,0.29);
    col = mix(col, cloth + cloth*li*3.0, cv(sleeve,aa));
  }
  let gripDist = seg(v,vec2f(11.0,0.0),vec2f(21.0,0.0))-1.5;
  if (gripDist < aa) {
    let ny = clamp(v.y/1.5,-1.0,1.0);
    let nz = sqrt(max(0.0,1.0-ny*ny));
    let li = glazeAt(v, 0.65+nz, normalize(vec3f(0.0,ny,max(0.18,nz))), cy, drive);
    let wrapCol = vec3f(0.26,0.16,0.10);
    col = mix(col, wrapCol + wrapCol*li*3.3, cv(gripDist,aa));
  }
  let spine = vec2f(22.0,0.0);
  let tip = vec2f(48.0,0.0);
  let top = triangle(v,spine,vec2f(22.0,-3.15),tip);
  let bottom = triangle(v,spine,tip,vec2f(22.0,2.2));
  col = mix(col,vec3f(0.68,0.47,0.245),cv(top,aa));
  col = mix(col,vec3f(0.40,0.258,0.155),cv(bottom,aa));

  // One bronze guard. The dark margin is deliberately not a luminous outline.
  let gv = v-vec2f(cellX,0.0);
  let guardCov = cv(softBox(gv,vec2f(2.65,6.35),1.65),aa);
  let wellCov = guardCov * cv(softBox(gv,vec2f(1.97,5.58),1.10),aa);
  col = mix(col,vec3f(0.53,0.315,0.15),guardCov);
  col = mix(col,vec3f(0.066,0.036,0.028),wellCov);
  let gh = gv.y-cy-cantY*gv.x;
  let tileCov = wellCov * cv(softBox(vec2f(gv.x,gh),vec2f(1.67,2.48),0.85),aa);
  col = mix(col,vec3f(0.205,0.087,0.040),tileCov);
  col += glazeInk(gh) * (drive*tileCov);

  // A single bent fold in the existing glove: the two planes do not share an outline light.
  let g = v-vec2f(13.0,0.1);
  let glove = softBox(vec2f(g.x+0.16*g.y,g.y),vec2f(4.12,3.58),1.85);
  if (glove < aa) {
    let crease = g.x-0.32*g.y+0.42;
    let leaf = smoothstep(-aa,aa,crease);
    let gy = clamp(g.y/3.58,-1.0,1.0);
    let nr = normalize(vec3f(mix(-0.88,0.79,leaf),0.64*gy,0.56+0.18*(1.0-abs(gy))));
    let z = 1.62+max(0.0,1.0-0.23*abs(crease));
    let li = glazeAt(v,z,nr,cy,drive);
    let hideCol = mix(vec3f(0.090,0.14,0.162),vec3f(0.135,0.192,0.206),leaf);
    let dyed = hideCol + vec3f(0.27,0.30,0.30)*li*4.15;
    col = mix(col,dyed,cv(glove,aa));
  }
  return col;
}

@fragment fn fs(@builtin(position) screen: vec4f) -> @location(0) vec4f {
  let bg = vec3f(0.016,0.023,0.032);
  var col = bg;
  if (view.visibleFlag >= 0.5) {
    let sc = max(view.scale,0.001);
    let center = (screen.xy-view.size*0.5)/sc;
    col = figure(vec2f(center.x*view.facing,center.y),0.65/sc,bg);
  }
  return vec4f(srgb(col),1.0);
}