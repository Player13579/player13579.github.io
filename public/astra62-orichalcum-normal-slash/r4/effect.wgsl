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
  return select(12.92*x, 1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055), x > vec3f(0.0031308));
}
fn displayLin(c: vec3f) -> vec3f {
  let h = max(c-vec3f(0.62),vec3f(0.0));
  return min(c,vec3f(0.62)) + 0.38*h/(vec3f(0.38)+h);
}
fn cv(d: f32, w: f32) -> f32 { return 1.0-smoothstep(-w,w,d); }
fn foot2(p: vec2f, a: vec2f, b: vec2f) -> vec2f {
  let e = b-a;
  return a + e*clamp(dot(p-a,e)/max(dot(e,e),0.0001),0.0,1.0);
}
fn seg(p: vec2f, a: vec2f, b: vec2f) -> f32 { return length(p-foot2(p,a,b)); }
fn wedge(a: vec2f, b: vec2f) -> f32 { return a.x*b.y-a.y*b.x; }
fn tri(p: vec2f, a: vec2f, b: vec2f, c: vec2f) -> f32 {
  let d = min(seg(p,a,b),min(seg(p,b,c),seg(p,c,a)));
  if (abs(wedge(b-a,c-a)) < 0.0001) { return d; }
  let u = wedge(b-a,p-a);
  let v = wedge(c-b,p-b);
  let w = wedge(a-c,p-c);
  return select(d,-d,(u>=0.0 && v>=0.0 && w>=0.0) || (u<=0.0 && v<=0.0 && w<=0.0));
}
fn boxD(p: vec2f, halfSize: vec2f, radius: f32) -> f32 {
  let e = abs(p)-halfSize+vec2f(radius);
  return length(max(e,vec2f(0.0)))+min(max(e.x,e.y),0.0)-radius;
}
fn pose(t: f32) -> f32 {
  let coil = mix(-1.12,-1.63,smoothstep(12.0,165.0,t));
  let swing = mix(coil,0.61,smoothstep(165.0,443.0,t));
  return mix(swing,-1.12,smoothstep(552.0,900.0,t));
}

// Blade coordinates: +x toward tip, +z toward viewer. A fixed inclined amber window.
const lampX: f32 = 22.0;
const lipX: f32 = 17.95;
const lipEnd: f32 = 6.35;
const slotHalf: f32 = 1.68;
const amberL: vec3f = vec3f(9.2,3.05,0.38);
// Offline same-frame control: set only this constant to zero.
const receiveGain: f32 = 1.0;
fn overlapLen(a: f32, b: f32, c: f32, d: f32) -> f32 {
  return max(0.0,min(b,d)-max(a,c));
}
fn returnedLight(v: vec2f, z: f32, nr: vec3f, slotY: f32, power: f32) -> vec3f {
  if (power <= 0.0 || v.x >= lipX-0.01) { return vec3f(0.0); }
  let ns = normalize(vec3f(-1.12,0.0,1.0));
  var irradiance = 0.0;
  // 2 x 4 area cells. Integrate the visible y-fraction of each cell at the lip;
  // the penumbra comes from the extent of the window, not a screen blur.
  for (var ix = 0u; ix < 2u; ix = ix+1u) {
    let sx = lampX + select(-0.90,0.90,ix==1u);
    let sz = 5.4+1.12*(sx-lampX);
    let k = clamp((lipX-v.x)/max(0.001,sx-v.x),0.0,1.0);
    let zLip = mix(z,sz,k);
    for (var iy = 0u; iy < 4u; iy = iy+1u) {
      let sy = -2.70+1.80*f32(iy);
      let delta = vec3f(vec2f(sx,sy)-v,sz-z);
      let r2 = max(dot(delta,delta),0.01);
      let l = delta*inverseSqrt(r2);
      let midY = mix(v.y,sy,k);
      let lo = midY-0.90*k;
      let hi = midY+0.90*k;
      var aperture = 1.0;
      if (zLip >= 0.0 && zLip <= 6.8) {
        let blocked = overlapLen(lo,hi,-lipEnd,slotY-slotHalf) + overlapLen(lo,hi,slotY+slotHalf,lipEnd);
        aperture = clamp(1.0-blocked/max(0.00001,hi-lo),0.0,1.0);
      }
      irradiance += aperture*max(dot(nr,l),0.0)*max(dot(ns,-l),0.0)/r2;
    }
  }
  // Cell area on the inclined face divided by pi, for a diffuse receiver.
  return amberL*(power*receiveGain*1.5487*irradiance);
}

fn figure(p: vec2f, aa: f32, bg: vec3f) -> vec3f {
  var t = 0.0;
  if (view.activeFlag > 0.5 && view.ageMs >= 0.0) { t = min(view.ageMs,980.0); }
  let theta = pose(t);
  let d = vec2f(cos(theta),sin(theta));
  let n = vec2f(-d.y,d.x);
  let q = p-vec2f(-15.0,-3.0);
  let v = vec2f(dot(q,d),dot(q,n));
  let rm = select(0.0,min(view.reduced,1.0),view.reduced>=0.0);
  let power = smoothstep(165.0,221.0,t)*(1.0-smoothstep(387.0,443.0,t));
  let forwardY = mix(-2.32,2.32,smoothstep(235.0,373.0,t));
  let slotY = mix(forwardY,-2.32,smoothstep(552.0,900.0,t));
  var col = bg;
  let rr = length(q);
  if (t > 172.0 && t < 468.0 && rr > 24.0) {
    let prev = pose(max(0.0,t-mix(75.0,32.0,rm)));
    let a = atan2(q.y,q.x);
    let u = clamp((a-prev)/max(theta-prev,0.0001),0.0,1.0);
    let inner = mix(44.0,28.0,u);
    let outer = mix(44.3,48.0,u);
    let aw = max(0.00001,aa/rr);
    let arc = cv(max(inner-rr,rr-outer),aa)*smoothstep(prev-aw,prev+aw,a)*(1.0-smoothstep(theta-aw,theta+aw,a));
    let fade = smoothstep(172.0,222.0,t)*(1.0-smoothstep(425.0,468.0,t));
    col = mix(col,vec3f(0.55,0.215,0.061),arc*fade*(0.10+0.55*u));
  }
  let hip = vec2f(-20.0,13.0);
  col = mix(col,vec3f(0.105,0.145,0.17),cv(seg(p,hip,vec2f(-29.0,29.0))-3.5,aa));
  col = mix(col,vec3f(0.21,0.265,0.28),cv(seg(p,hip+vec2f(2.0,0.0),vec2f(-8.0,29.0))-3.7,aa));
  let coat = min(seg(p,hip,vec2f(-19.0,-5.0))-6.2,tri(p,vec2f(-23.0,-4.0),vec2f(-12.0,14.0),vec2f(-27.0,16.0)));
  col = mix(col,vec3f(0.18,0.27,0.285),cv(coat,aa));
  col = mix(col,vec3f(0.32,0.405,0.41),cv(length((p-vec2f(-19.0,-17.6))/vec2f(7.3,9.4))-1.0,aa/8.0));
  col = mix(col,vec3f(0.60,0.57,0.47),cv(seg(p,vec2f(-17.0,-18.0),vec2f(-12.5,-18.0))-1.25,aa));

  let elbowV = vec2f(7.0,3.4);
  let handV = vec2f(15.0,0.0);
  let r0 = v-foot2(v,vec2f(0.0),elbowV);
  let r1 = v-foot2(v,elbowV,handV);
  let s0 = length(r0)-3.5;
  let s1 = length(r1)-2.65;
  let sleeve = min(s0,s1);
  if (sleeve < aa) {
    let rad = select(r0/3.5,r1/2.65,s1<s0);
    let nz = sqrt(max(0.0,1.0-dot(rad,rad)));
    let li = returnedLight(v,0.35+1.15*nz,normalize(vec3f(rad,max(nz,0.18))),slotY,power);
    col = mix(col,vec3f(0.205,0.275,0.29)+vec3f(0.27,0.32,0.33)*li,cv(sleeve,aa));
  }
  let grip = seg(v,vec2f(11.0,0.0),vec2f(21.0,0.0))-1.5;
  col = mix(col,vec3f(0.23,0.145,0.09),cv(grip,aa));
  let rootV = vec2f(22.0,0.0);
  let tipV = vec2f(48.0,0.0);
  col = mix(col,vec3f(0.68,0.47,0.245),cv(tri(v,rootV,vec2f(22.0,-3.15),tipV),aa));
  col = mix(col,vec3f(0.40,0.258,0.155),cv(tri(v,rootV,tipV,vec2f(22.0,2.2)),aa));

  // A single ash-coloured chamois inset on the moving glove. Its seam is pigment,
  // so it modulates both ambient and returned light and stays with the leather.
  let g = v-vec2f(12.2,0.15);
  let glove = boxD(g,vec2f(5.12,4.60),1.95);
  if (glove < aa) {
    let pad = cv(boxD(g-vec2f(0.40,0.0),vec2f(4.40,3.97),1.48),aa);
    let seam = cv(seg(g,vec2f(-2.85,2.92),vec2f(-1.62,-2.90))-0.28,aa);
    let rho = mix(vec3f(0.21,0.24,0.245),vec3f(0.60,0.55,0.45),pad)*(1.0-0.46*seam);
    let gy = clamp(g.y/4.6,-1.0,1.0);
    let z = 2.36-0.26*g.x-0.74*gy*gy;
    let nr = normalize(vec3f(0.26,0.322*gy,1.0));
    let li = returnedLight(v,z,nr,slotY,power);
    col = mix(col,rho*(vec3f(0.255,0.32,0.36)+li),cv(glove,aa));
  }

  // Two short end bridges fasten the sliding lips to the back of the one guard.
  let yRail = abs(v.y);
  let railD = seg(vec2f(v.x,yRail),vec2f(lipX,5.88),vec2f(20.5,5.88))-0.63;
  col = mix(col,vec3f(0.34,0.21,0.115),cv(railD,aa));
  let h0 = slotY-slotHalf;
  let h1 = slotY+slotHalf;
  let jaw0 = boxD(v-vec2f(lipX,(h0-lipEnd)*0.5),vec2f(0.63,(h0+lipEnd)*0.5),0.20);
  let jaw1 = boxD(v-vec2f(lipX,(h1+lipEnd)*0.5),vec2f(0.63,(lipEnd-h1)*0.5),0.20);
  col = mix(col,vec3f(0.185,0.118,0.076),cv(min(jaw0,jaw1),aa));
  let gv = v-vec2f(lampX,0.0);
  let brass = cv(boxD(gv,vec2f(2.97,6.35),1.20),aa);
  let recess = brass*cv(boxD(gv,vec2f(2.37,4.55),0.60),aa);
  let windowCov = recess*cv(boxD(gv,vec2f(1.80,3.60),0.0),aa);
  col = mix(col,vec3f(0.49,0.30,0.15),brass);
  col = mix(col,vec3f(0.051,0.034,0.028),recess);
  col = mix(col,vec3f(0.235,0.106,0.041),windowCov);
  return col + amberL*(power*windowCov);
}

@fragment fn fs(@builtin(position) screen: vec4f) -> @location(0) vec4f {
  let bg = vec3f(0.016,0.023,0.032);
  var col = bg;
  if (view.visibleFlag >= 0.5 && all(view.size > vec2f(0.0)) && all(view.size < vec2f(1.0e7))) {
    let sc = select(0.001,min(view.scale,1.0e5),view.scale>=0.001);
    let center = (screen.xy-view.size*0.5)/sc;
    let side = select(1.0,-1.0,view.facing<0.0);
    col = figure(vec2f(center.x*side,center.y),max(0.0001,0.65/sc),bg);
  }
  return vec4f(srgb(displayLin(col)),1.0);
}