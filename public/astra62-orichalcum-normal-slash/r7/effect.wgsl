// Orichalcum Sword Normal Slash — creative edition R7, derived from R6.
// One physical blade, one blade-following trace, and local roof-source lighting.
// Blade sheen and trace visualize the existing light; neither adds an emitter.
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
  let x = clamp(c,vec3f(0.0),vec3f(1.0));
  return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));
}
fn displayLin(c: vec3f) -> vec3f {
  let h = max(c-vec3f(0.62),vec3f(0.0));
  return min(c,vec3f(0.62))+0.38*h/(vec3f(0.38)+h);
}
fn cv(d: f32, w: f32) -> f32 { return 1.0-smoothstep(-w,w,d); }
fn foot2(p: vec2f, a: vec2f, b: vec2f) -> vec2f {
  let e = b-a;
  return a+e*clamp(dot(p-a,e)/max(dot(e,e),0.0001),0.0,1.0);
}
fn seg(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  return length(p-foot2(p,a,b));
}
fn wedge(a: vec2f, b: vec2f) -> f32 { return a.x*b.y-a.y*b.x; }
fn tri(p: vec2f, a: vec2f, b: vec2f, c: vec2f) -> f32 {
  let d = min(seg(p,a,b),min(seg(p,b,c),seg(p,c,a)));
  if (abs(wedge(b-a,c-a)) < 0.0001) { return d; }
  let u = wedge(b-a,p-a);
  let v = wedge(c-b,p-b);
  let w = wedge(a-c,p-c);
  return select(d,-d,(u>=0.0 && v>=0.0 && w>=0.0)||(u<=0.0 && v<=0.0 && w<=0.0));
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

// Original local frame and physical source geometry:
// +x to the tip, +z out of the image. The low socket is below
// the optical paths. Only the transverse end cheeks stand above the roof.
const axleX: f32 = 22.5;
const ridgeHalf: f32 = 0.48;
const eaveX: f32 = 3.75;
const cheekX: f32 = 4.85;
const paneY: f32 = 3.50;
const pitchZ: f32 = 1.80;
const eaveZ: f32 = 4.10;
const lampL: vec3f = vec3f(34.0,8.8,0.30);
const receiveGain: f32 = 1.0;

fn roofReturn(v: vec2f, z: f32, nr: vec3f, yc: f32, drive: f32) -> vec3f {
  if (drive <= 0.0 || abs(v.x-axleX) < cheekX) { return vec3f(0.0); }
  let flank = select(-1.0,1.0,v.x>axleX);
  let ns = normalize(vec3f(flank*pitchZ,0.0,1.0));
  let exitX = axleX+flank*cheekX;
  let dx = (eaveX-ridgeHalf)/3.0;
  let stretch = sqrt(1.0+pitchZ*pitchZ);
  let ry = v.y-yc;
  var integral = 0.0;
  for (var ix = 0u; ix < 3u; ix = ix+1u) {
    let run = ridgeHalf+(f32(ix)+0.5)*dx;
    let sx = axleX+flank*run;
    let sz = eaveZ+(eaveX-run)*pitchZ;
    // Clip each emitting strip against the original cheek clearance.
    let k = clamp((exitX-sx)/(v.x-sx),0.0,1.0);
    let remK = max(1.0-k,0.00001);
    let lo = max(-paneY,(-paneY-k*ry)/remK);
    let hi = min( paneY,( paneY-k*ry)/remK);
    if (hi > lo) {
      let dy = (hi-lo)/4.0;
      let da = dx*dy*stretch;
      for (var iy = 0u; iy < 4u; iy = iy+1u) {
        let sy = yc+lo+(f32(iy)+0.5)*dy;
        let delta = vec3f(sx-v.x,sy-v.y,sz-z);
        let r2 = max(dot(delta,delta),0.0001);
        let l = delta*inverseSqrt(r2);
        integral += da*max(dot(ns,-l),0.0)*max(dot(nr,l),0.0)/r2;
      }
    }
  }
  return lampL*(drive*receiveGain*(integral/3.14159265));
}

fn figure(p: vec2f, aa: f32, bg: vec3f) -> vec3f {
  var t = 0.0;
  if (view.activeFlag > 0.5 && view.ageMs >= 0.0) {
    t = min(view.ageMs,980.0);
  }
  let theta = pose(t);
  let d = vec2f(cos(theta),sin(theta));
  let n = vec2f(-d.y,d.x);
  let q = p-vec2f(-15.0,-3.0);
  let v = vec2f(dot(q,d),dot(q,n));
  let rm = select(0.0,min(view.reduced,1.0),view.reduced>=0.0);
  let drive = smoothstep(165.0,221.0,t)*(1.0-smoothstep(387.0,443.0,t));
  let outY = mix(-2.9,2.9,smoothstep(235.0,373.0,t));
  let yc = mix(outY,-2.9,smoothstep(552.0,900.0,t));
  var col = bg;
  let rr = length(q);

  // One compact tip-history ribbon, behind the physical figure and sword.
  // Preserve the angular history, reduced-motion shortening, and lifetime.
  // A sharp outer shoulder carries brightness without a surrounding halo.
  if (t > 172.0 && t < 468.0 && rr > 24.0) {
    let history = mix(75.0,32.0,rm);
    let prev = pose(max(0.0,t-history));
    let a = atan2(q.y,q.x);
    let u = clamp((a-prev)/max(theta-prev,0.0001),0.0,1.0);
    let inner = mix(47.35,44.0,u);
    let outer = mix(47.65,48.0,u);
    let aw = max(0.00001,aa/rr);
    let arc = cv(max(inner-rr,rr-outer),aa)
      *smoothstep(prev-aw,prev+aw,a)
      *(1.0-smoothstep(theta-aw,theta+aw,a));
    let fade = smoothstep(172.0,222.0,t)
      *(1.0-smoothstep(425.0,468.0,t));

    // Retain the source's recent envelope rather than inventing a flash.
    // This is a temporal visualization only and illuminates no receiver.
    let sourceTime = max(0.0,t-history*(1.0-u));
    let storedDrive = smoothstep(165.0,221.0,sourceTime)
      *(1.0-smoothstep(387.0,443.0,sourceTime));
    let radial = clamp((rr-inner)/max(outer-inner,0.25),0.0,1.0);
    let shoulder = smoothstep(0.35,0.86,radial);
    let traceColor = mix(
      vec3f(0.70,0.205,0.024),
      vec3f(3.20,1.05,0.075),
      shoulder
    )*(0.30+0.70*u);
    let traceCoverage = arc*fade*storedDrive*(0.16+0.70*u);
    col = mix(col,traceColor,traceCoverage);
  }

  let hip = vec2f(-20.0,13.0);
  col = mix(col,vec3f(0.105,0.145,0.17),cv(seg(p,hip,vec2f(-29.0,29.0))-3.5,aa));
  col = mix(col,vec3f(0.21,0.265,0.28),cv(seg(p,hip+vec2f(2.0,0.0),vec2f(-8.0,29.0))-3.7,aa));
  let coat = min(
    seg(p,hip,vec2f(-19.0,-5.0))-6.2,
    tri(p,vec2f(-23.0,-4.0),vec2f(-12.0,14.0),vec2f(-27.0,16.0))
  );
  col = mix(col,vec3f(0.18,0.27,0.285),cv(coat,aa));
  col = mix(col,vec3f(0.32,0.405,0.41),cv(length((p-vec2f(-19.0,-17.6))/vec2f(7.3,9.4))-1.0,aa/8.0));
  col = mix(col,vec3f(0.60,0.57,0.47),cv(seg(p,vec2f(-17.0,-18.0),vec2f(-12.5,-18.0))-1.25,aa));

  let elbowV = vec2f(7.0,3.4);
  let handV = vec2f(15.0,0.0);
  let s0 = seg(v,vec2f(0.0),elbowV)-3.5;
  let s1 = seg(v,elbowV,handV)-2.65;
  col = mix(col,vec3f(0.205,0.275,0.29),cv(min(s0,s1),aa));
  let grip = seg(v,vec2f(2.4,0.0),vec2f(22.0,0.0))-1.55;
  col = mix(col,vec3f(0.23,0.145,0.09),cv(grip,aa));
  col = mix(col,vec3f(0.46,0.30,0.16),cv(boxD(v-vec2f(2.4,0.0),vec2f(0.90,2.03),0.58),aa));

  let tipV = vec2f(48.0,0.0);
  let steelD = tri(v,vec2f(22.0,-3.15),tipV,vec2f(22.0,2.20));
  if (steelD < aa) {
    // Preserve the exact blade outline and receiving surface.
    // Material variation follows the taper, not a screen-space overlay.
    let bevel = smoothstep(-aa,aa,v.y);
    let taper = clamp((48.0-v.x)/26.0,0.025,1.0);
    let halfWidth = select(3.15,2.20,v.y>=0.0)*taper;
    let faceY = clamp(v.y/max(halfWidth,aa),-1.0,1.0);
    let paleFace = mix(
      vec3f(0.54,0.49,0.36),
      vec3f(0.76,0.71,0.56),
      smoothstep(-1.0,-0.15,faceY)
    );
    let darkFace = mix(
      vec3f(0.24,0.28,0.29),
      vec3f(0.12,0.155,0.17),
      smoothstep(0.0,0.95,faceY)
    );
    let bronze = mix(paleFace,darkFace,bevel);
    let dzdy = select(0.50,-0.70,v.y>=0.0);
    let z = 1.0+0.066*(48.0-v.x)+dzdy*v.y;
    let nr = normalize(vec3f(0.066,-dzdy,1.0));
    let li = roofReturn(v,z,nr,yc,drive);

    // Broad traveling metal response, bounded to a maximum gain of ten.
    // The ridge is only a receiving-material response: every added
    // highlight remains multiplied by the unchanged roof-light integral.
    let travel = smoothstep(165.0,443.0,t);
    let responseX = mix(28.5,43.0,travel);
    let response = 1.0-smoothstep(3.0,11.0,abs(v.x-responseX));
    let ridge = 1.0-smoothstep(
      0.0,
      max(0.28*taper,aa)+aa,
      abs(v.y)
    );
    let faceResponse = mix(1.0,0.48,bevel)+0.48*ridge;
    let reflectionGain = min(10.0,(1.4+5.6*response)*faceResponse);
    let reflected = vec3f(0.94,0.86,0.66)*li*reflectionGain;
    col = mix(col,bronze+reflected,cv(steelD,aa));
  }

  // Original leather receiver: welt and seam remain material pigment.
  // The source's translation, not a painted highlight, moves its lighting.
  let g = v-vec2f(10.0,0.20);
  let gloveD = boxD(g,vec2f(5.9,5.65),2.18);
  if (gloveD < aa) {
    let pad = cv(boxD(g-vec2f(0.24,0.0),vec2f(5.05,4.94),1.78),aa);
    let stitch = cv(seg(g,vec2f(-2.95,4.22),vec2f(-0.62,-4.25))-0.43,aa);
    let rho = mix(vec3f(0.34,0.30,0.26),vec3f(0.70,0.61,0.49),pad)*(1.0-0.54*stitch);
    let gy = clamp(g.y/5.65,-1.0,1.0);
    let z = 2.64-0.19*g.x-0.70*gy*gy;
    let nr = normalize(vec3f(0.19,(1.40/5.65)*gy,1.0));
    let li = roofReturn(v,z,nr,yc,drive);
    col = mix(col,rho*(vec3f(0.215,0.262,0.30)+li),cv(gloveD,aa));
  }

  // Original socket, bed, moving carriage, cheeks, and two roof emitters.
  let b = v-vec2f(axleX,0.0);
  let socketD = boxD(b,vec2f(5.05,8.08),1.46);
  col = mix(col,vec3f(0.49,0.30,0.15),cv(socketD,aa));
  let bedD = boxD(b,vec2f(4.31,7.36),0.92);
  col = mix(col,vec3f(0.069,0.047,0.036),cv(bedD,aa));
  let m = v-vec2f(axleX,yc);
  let shoeD = boxD(m,vec2f(4.20,paneY+0.30),0.34);
  col = mix(col,vec3f(0.25,0.137,0.067),cv(shoeD,aa));
  let cheekD = boxD(vec2f(m.x,abs(m.y)-(paneY+0.55)),vec2f(cheekX,0.55),0.0);
  col = mix(col,vec3f(0.365,0.227,0.108),cv(cheekD,aa));
  let paneMid = 0.5*(eaveX+ridgeHalf);
  let paneD = boxD(vec2f(abs(m.x)-paneMid,m.y),vec2f(0.5*(eaveX-ridgeHalf),paneY),0.0);
  let paneCov = cv(paneD,aa);
  let enamel = select(vec3f(0.225,0.087,0.029),vec3f(0.325,0.143,0.052),m.x>0.0);
  col = mix(col,enamel+lampL*drive,paneCov);
  return col;
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
