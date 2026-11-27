// Orichalcum Sword Normal Slash — creative edition R10.
// Derived from exact pinned public R9; prior editions and authorship
// remain historical. This is the final added creative edition, 5/5.
//
// Public R9 HEAD:
// 7e812eba34dca9dda743f672260066e55832cd90
// Public R9 manifest SHA:
// 14f7c8f97d5e7ded4e1aa29aec17b8db7b2d067c520040cdb01f074c56005b16
// Public R9 effect SHA:
// a0b6df5ef49e32ce1d9731563b312ed385bb963296623ad797518cc51fad29cf
// Historical R8 WGSL SHA:
// 6b71ed6d57bb370a2296d014541c38e777b75cb87d8db89f04011e6fdb69230e
//
// One physical blade, one blade-following trace, two existing roof facets.
// R10 changes source spectrum, filtered trace radiance, and material response.
// Source geometry, receiver geometry, clipping, controls, and gates remain.
// No added emitter, halo, target, contact, guard event, or shockwave.

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
  return select(
    12.92*x,
    1.055*pow(x, vec3f(1.0/2.4))-vec3f(0.055),
    x > vec3f(0.0031308)
  );
}

fn displayLin(c: vec3f) -> vec3f {
  let h = max(c-vec3f(0.62), vec3f(0.0));
  return min(c, vec3f(0.62))+0.38*h/(vec3f(0.38)+h);
}

fn cv(d: f32, w: f32) -> f32 {
  return 1.0-smoothstep(-w, w, d);
}

// Box-filtered interval coverage. Nested intervals below partition the
// existing trace's material; they do not add another contour or emitter.
fn bandCoverage(x: f32, lo: f32, hi: f32, aa: f32) -> f32 {
  let width = max(2.0*aa, 0.0002);
  let enter = clamp((x-lo+aa)/width, 0.0, 1.0);
  let leave = clamp((x-hi+aa)/width, 0.0, 1.0);
  return max(enter-leave, 0.0);
}

fn foot2(p: vec2f, a: vec2f, b: vec2f) -> vec2f {
  let e = b-a;
  return a+e*clamp(dot(p-a, e)/max(dot(e, e), 0.0001), 0.0, 1.0);
}

fn seg(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  return length(p-foot2(p, a, b));
}

fn wedge(a: vec2f, b: vec2f) -> f32 {
  return a.x*b.y-a.y*b.x;
}

fn tri(p: vec2f, a: vec2f, b: vec2f, c: vec2f) -> f32 {
  let d = min(seg(p, a, b), min(seg(p, b, c), seg(p, c, a)));
  if (abs(wedge(b-a, c-a)) < 0.0001) { return d; }
  let u = wedge(b-a, p-a);
  let v = wedge(c-b, p-b);
  let w = wedge(a-c, p-c);
  return select(
    d,
    -d,
    (u >= 0.0 && v >= 0.0 && w >= 0.0) ||
    (u <= 0.0 && v <= 0.0 && w <= 0.0)
  );
}

fn boxD(p: vec2f, halfSize: vec2f, radius: f32) -> f32 {
  let e = abs(p)-halfSize+vec2f(radius);
  return length(max(e, vec2f(0.0)))+min(max(e.x, e.y), 0.0)-radius;
}

fn pose(t: f32) -> f32 {
  let coil = mix(-1.12, -1.63, smoothstep(12.0, 165.0, t));
  let swing = mix(coil, 0.61, smoothstep(165.0, 443.0, t));
  return mix(swing, -1.12, smoothstep(552.0, 900.0, t));
}

// Exact R9 drive: original source gate endpoints and plateau are unchanged.
// The same drive feeds facets, receivers, and trace history.
fn sourceDrive(t: f32) -> f32 {
  let envelope = smoothstep(165.0, 221.0, t)*
    (1.0-smoothstep(387.0, 443.0, t));
  return pow(max(envelope, 0.0), 0.72);
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

// One shared, hotter gold spectrum for the existing facets, their direct
// return, and stored trace radiance. No independent receiver light color.
const lampL: vec3f = vec3f(46.0, 18.0, 2.80);
const receiveGain: f32 = 1.0;

struct RoofSample {
  diffuse: vec3f,
  specular: vec3f,
}

// The diffuse integral retains the original strip positions, cheek clipping,
// projected areas, and inverse-square attenuation. Gloss evaluates exactly
// the same visible strips; it is a receiver response, not another source.
fn roofSample(
  v: vec2f,
  z: f32,
  nr: vec3f,
  yc: f32,
  drive: f32,
  roughness: f32
) -> RoofSample {
  var result = RoofSample(vec3f(0.0), vec3f(0.0));
  if (drive <= 0.0 || abs(v.x-axleX) < cheekX) {
    return result;
  }

  let flank = select(-1.0, 1.0, v.x > axleX);
  let ns = normalize(vec3f(flank*pitchZ, 0.0, 1.0));
  let exitX = axleX+flank*cheekX;
  let dx = (eaveX-ridgeHalf)/3.0;
  let stretch = sqrt(1.0+pitchZ*pitchZ);
  let ry = v.y-yc;

  let noV = max(nr.z, 0.08);
  let alpha = max(roughness*roughness, 0.04);
  let alpha2 = alpha*alpha;
  let gv = 2.0*noV/
    (noV+sqrt(alpha2+(1.0-alpha2)*noV*noV));
  let f0 = vec3f(0.92, 0.81, 0.58);

  var integral = 0.0;
  var glossy = vec3f(0.0);

  for (var ix = 0u; ix < 3u; ix = ix+1u) {
    let run = ridgeHalf+(f32(ix)+0.5)*dx;
    let sx = axleX+flank*run;
    let sz = eaveZ+(eaveX-run)*pitchZ;

    let k = clamp((exitX-sx)/(v.x-sx), 0.0, 1.0);
    let remK = max(1.0-k, 0.00001);
    let lo = max(-paneY, (-paneY-k*ry)/remK);
    let hi = min( paneY, ( paneY-k*ry)/remK);

    if (hi > lo) {
      let dy = (hi-lo)/4.0;
      let da = dx*dy*stretch;

      for (var iy = 0u; iy < 4u; iy = iy+1u) {
        let sy = yc+lo+(f32(iy)+0.5)*dy;
        let delta = vec3f(sx-v.x, sy-v.y, sz-z);
        let r2 = max(dot(delta, delta), 0.0001);
        let l = delta*inverseSqrt(r2);
        let noL = max(dot(nr, l), 0.0);
        let sourceCos = max(dot(ns, -l), 0.0);
        let weight = da*sourceCos*noL/r2;

        integral += weight;

        if (weight > 0.0) {
          let h = normalize(l+vec3f(0.0, 0.0, 1.0));
          let noH = clamp(dot(nr, h), 0.0, 1.0);
          let voH = clamp(h.z, 0.0, 1.0);
          let denom = max(
            noH*noH*(alpha2-1.0)+1.0,
            0.0001
          );
          let distribution = alpha2/
            (3.14159265*denom*denom);
          let gl = 2.0*noL/
            (noL+sqrt(alpha2+(1.0-alpha2)*noL*noL));
          let fresnel = f0+
            (vec3f(1.0)-f0)*pow(1.0-voH, 5.0);
          let brdf = distribution*gv*gl/
            max(4.0*noV*noL, 0.0001);

          glossy += weight*brdf*fresnel;
        }
      }
    }
  }

  let energy = lampL*(drive*receiveGain);
  result.diffuse = energy*(integral/3.14159265);
  result.specular = energy*glossy;
  return result;
}

fn roofReturn(
  v: vec2f,
  z: f32,
  nr: vec3f,
  yc: f32,
  drive: f32
) -> vec3f {
  return roofSample(v, z, nr, yc, drive, 0.55).diffuse;
}

fn figure(p: vec2f, aa: f32, bg: vec3f) -> vec3f {
  var t = 0.0;
  if (view.activeFlag > 0.5 && view.ageMs >= 0.0) {
    t = min(view.ageMs, 980.0);
  }

  let theta = pose(t);
  let d = vec2f(cos(theta), sin(theta));
  let n = vec2f(-d.y, d.x);
  let q = p-vec2f(-15.0, -3.0);
  let v = vec2f(dot(q, d), dot(q, n));
  let rm = select(0.0, min(view.reduced, 1.0), view.reduced >= 0.0);
  let drive = sourceDrive(t);
  let outY = mix(-2.9, 2.9, smoothstep(235.0, 373.0, t));
  let yc = mix(outY, -2.9, smoothstep(552.0, 900.0, t));
  var col = bg;
  let rr = length(q);

  // Original tip-history geometry, reduced-motion history, and temporal gates.
  // The radial layers are filtered inside the same narrow tapered footprint.
  // Stored source radiance is visual history only and lights no receiver.
  if (t > 172.0 && t < 468.0 && rr > 24.0) {
    let history = mix(75.0, 32.0, rm);
    let prev = pose(max(0.0, t-history));
    let a = atan2(q.y, q.x);
    let u = clamp((a-prev)/max(theta-prev, 0.0001), 0.0, 1.0);
    let inner = mix(47.35, 44.0, u);
    let outer = mix(47.65, 48.0, u);
    let aw = max(0.00001, aa/rr);

    let angular = smoothstep(prev-aw, prev+aw, a)*
      (1.0-smoothstep(theta-aw, theta+aw, a));
    let radial = bandCoverage(rr, inner, outer, aa);
    let middle = bandCoverage(
      rr,
      mix(inner, outer, 0.38),
      outer,
      aa
    );
    let shoulder = bandCoverage(
      rr,
      mix(inner, outer, 0.72),
      outer,
      aa
    );

    let fade = smoothstep(172.0, 222.0, t)*
      (1.0-smoothstep(425.0, 468.0, t));
    let sourceTime = max(0.0, t-history*(1.0-u));
    let storedDrive = sourceDrive(sourceTime);
    let traceWeight = angular*fade*storedDrive*(0.62+0.36*u);

    // Gold body, pale-gold middle, and hot outer shoulder are nested
    // material regions of the same trace, not additional outlines.
    // Filter linear radiance before display mapping so a narrow interval
    // contributes energy even when it occupies less than one pixel.
    let filteredReflectance =
      vec3f(0.065, 0.105, 0.140)*radial+
      vec3f(0.055, 0.140, 0.240)*middle+
      vec3f(0.115, 0.220, 0.450)*shoulder;
    let traceRadiance = lampL*filteredReflectance*(0.80+0.20*u);

    col = col*(1.0-radial*traceWeight)+traceRadiance*traceWeight;
  }

  let hip = vec2f(-20.0, 13.0);
  col = mix(
    col,
    vec3f(0.105, 0.145, 0.17),
    cv(seg(p, hip, vec2f(-29.0, 29.0))-3.5, aa)
  );
  col = mix(
    col,
    vec3f(0.21, 0.265, 0.28),
    cv(seg(p, hip+vec2f(2.0, 0.0), vec2f(-8.0, 29.0))-3.7, aa)
  );

  let coat = min(
    seg(p, hip, vec2f(-19.0, -5.0))-6.2,
    tri(
      p,
      vec2f(-23.0, -4.0),
      vec2f(-12.0, 14.0),
      vec2f(-27.0, 16.0)
    )
  );
  col = mix(col, vec3f(0.18, 0.27, 0.285), cv(coat, aa));
  col = mix(
    col,
    vec3f(0.32, 0.405, 0.41),
    cv(
      length((p-vec2f(-19.0, -17.6))/vec2f(7.3, 9.4))-1.0,
      aa/8.0
    )
  );
  col = mix(
    col,
    vec3f(0.60, 0.57, 0.47),
    cv(seg(p, vec2f(-17.0, -18.0), vec2f(-12.5, -18.0))-1.25, aa)
  );

  let elbowV = vec2f(7.0, 3.4);
  let handV = vec2f(15.0, 0.0);
  let s0 = seg(v, vec2f(0.0), elbowV)-3.5;
  let s1 = seg(v, elbowV, handV)-2.65;
  let armD = min(s0, s1);

  if (armD < aa) {
    let sleeveBase = vec3f(0.205, 0.275, 0.29);
    var sleeve = sleeveBase;

    // Only the sword-side forearm receives this adjacent response.
    // Torso, head, legs, background, and room receive no added light.
    if (s1 < aa) {
      let nearest = foot2(v, elbowV, handV);
      let offset = v-nearest;
      let sleeveNormal = normalize(vec3f(
        0.10*offset.x,
        0.24*offset.y,
        1.0
      ));
      let nearField = 1.0-smoothstep(
        15.0,
        22.0,
        length(v-vec2f(axleX, yc))
      );
      let forearmWeight = cv(s1, aa)*
        smoothstep(2.0, 7.0, v.x)*nearField;
      let sleeveLi = roofReturn(v, 1.15, sleeveNormal, yc, drive);
      sleeve += sleeveBase*sleeveLi*(0.82*forearmWeight);
    }

    col = mix(col, sleeve, cv(armD, aa));
  }

  let grip = seg(v, vec2f(2.4, 0.0), vec2f(22.0, 0.0))-1.55;
  if (grip < aa) {
    let gripRho = vec3f(0.23, 0.145, 0.09);
    let gripNormal = normalize(vec3f(0.03, 0.20*v.y, 1.0));
    let gripLight = roofSample(
      v,
      0.80,
      gripNormal,
      yc,
      drive,
      0.62
    );
    let gripSheen = min(
      gripLight.specular*0.45,
      gripLight.diffuse*0.90
    );
    col = mix(
      col,
      gripRho+gripRho*gripLight.diffuse*1.30+gripSheen,
      cv(grip, aa)
    );
  }

  let pommelD = boxD(
    v-vec2f(2.4, 0.0),
    vec2f(0.90, 2.03),
    0.58
  );
  if (pommelD < aa) {
    let pommelLight = roofSample(
      v,
      1.10,
      vec3f(0.0, 0.0, 1.0),
      yc,
      drive,
      0.48
    );
    let pommelReflection = min(
      vec3f(0.82, 0.70, 0.46)*pommelLight.diffuse+
        pommelLight.specular*1.50,
      pommelLight.diffuse*3.20
    );
    col = mix(
      col,
      vec3f(0.46, 0.30, 0.16)+pommelReflection,
      cv(pommelD, aa)
    );
  }

  let tipV = vec2f(48.0, 0.0);
  let steelD = tri(
    v,
    vec2f(22.0, -3.15),
    tipV,
    vec2f(22.0, 2.20)
  );

  if (steelD < aa) {
    // Exact inherited blade outline, taper, height, and receiving normals.
    let bevel = smoothstep(-aa, aa, v.y);
    let taper = clamp((48.0-v.x)/26.0, 0.025, 1.0);
    let halfWidth = select(3.15, 2.20, v.y >= 0.0)*taper;
    let faceY = clamp(v.y/max(halfWidth, aa), -1.0, 1.0);

    // Inherited material-plane shading, not an additional light.
    // The cool dark plane remains distinct from the pale polished plane.
    let paleFace = mix(
      vec3f(0.40, 0.45, 0.46),
      vec3f(0.79, 0.78, 0.67),
      smoothstep(-1.0, -0.12, faceY)
    );
    let darkFace = mix(
      vec3f(0.13, 0.18, 0.205),
      vec3f(0.027, 0.047, 0.065),
      smoothstep(0.0, 0.95, faceY)
    );
    let ridge = 1.0-smoothstep(
      0.0,
      max(0.40*taper, aa)+aa,
      abs(v.y)
    );
    let edge = smoothstep(0.76, 0.99, abs(faceY));
    let polish = mix(
      0.90,
      1.0,
      smoothstep(22.0, 48.0, v.x)
    );

    var metal = mix(paleFace, darkFace, bevel)*polish;
    metal = mix(metal, vec3f(0.78, 0.78, 0.66), 0.42*edge);
    metal = mix(metal, vec3f(0.94, 0.92, 0.78), 0.68*ridge);

    let dzdy = select(0.50, -0.70, v.y >= 0.0);
    let z = 1.0+0.066*(48.0-v.x)+dzdy*v.y;
    let nr = normalize(vec3f(0.066, -dzdy, 1.0));

    // Stationary surface finish replaces the separately timed response
    // lobe. Highlight motion now comes from the actual moving roof return.
    // The broader dark-plane finish avoids a second sharp bright plane.
    let roughness = mix(0.42, 0.56, bevel);
    let received = roofSample(v, z, nr, yc, drive, roughness);
    let longitudinalPolish = mix(
      0.78,
      1.12,
      smoothstep(24.0, 45.0, v.x)
    );
    let faceResponse = mix(1.0, 0.22, bevel);
    let metalTint = vec3f(0.95, 0.91, 0.76);

    let roughReflection = metalTint*received.diffuse*
      (4.6+1.2*longitudinalPolish);
    let glossyReflection = received.specular*
      ((7.0+4.0*ridge+2.0*edge)*longitudinalPolish);
    let ridgeReflection = metalTint*received.diffuse*
      (3.2*ridge+1.6*edge);

    // Every dynamic term shares the exact clipped roof support.
    // The darker plane has a lower bound on its maximum return, while
    // the existing ridge and edge can carry the hottest local highlights.
    let reflectionCap = received.diffuse*
      (mix(14.0, 5.5, bevel)+4.0*ridge+2.0*edge);
    let reflected = min(
      (roughReflection+glossyReflection)*faceResponse+
        ridgeReflection,
      reflectionCap
    );

    col = mix(col, metal+reflected, cv(steelD, aa));
  }

  // Original leather receiver geometry, pigment, welt, and seam.
  // A restrained rough sheen shares the same source and receiving normal.
  let g = v-vec2f(10.0, 0.20);
  let gloveD = boxD(g, vec2f(5.9, 5.65), 2.18);
  if (gloveD < aa) {
    let pad = cv(
      boxD(g-vec2f(0.24, 0.0), vec2f(5.05, 4.94), 1.78),
      aa
    );
    let stitch = cv(
      seg(g, vec2f(-2.95, 4.22), vec2f(-0.62, -4.25))-0.43,
      aa
    );
    let rho = mix(
      vec3f(0.34, 0.30, 0.26),
      vec3f(0.70, 0.61, 0.49),
      pad
    )*(1.0-0.54*stitch);
    let gy = clamp(g.y/5.65, -1.0, 1.0);
    let z = 2.64-0.19*g.x-0.70*gy*gy;
    let nr = normalize(vec3f(0.19, (1.40/5.65)*gy, 1.0));
    let gloveLight = roofSample(v, z, nr, yc, drive, 0.68);
    let gloveSheen = min(
      gloveLight.specular*0.35,
      gloveLight.diffuse*0.50
    )*(0.35+0.65*pad)*(1.0-0.70*stitch);

    col = mix(
      col,
      rho*(vec3f(0.215, 0.262, 0.30)+1.05*gloveLight.diffuse)+
        gloveSheen,
      cv(gloveD, aa)
    );
  }

  // Original socket, bed, moving carriage, cheeks, and two roof emitters.
  // Only exposed socket material receives the clipped roof light.
  let b = v-vec2f(axleX, 0.0);
  let socketD = boxD(b, vec2f(5.05, 8.08), 1.46);
  if (socketD < aa) {
    let guardLight = roofSample(
      v,
      0.80,
      vec3f(0.0, 0.0, 1.0),
      yc,
      drive,
      0.50
    );
    let guardReflection = min(
      vec3f(0.84, 0.72, 0.48)*guardLight.diffuse*2.2+
        guardLight.specular*3.4,
      guardLight.diffuse*5.2
    );
    let rim = smoothstep(2.7, 4.9, abs(b.x));
    let endPlane = smoothstep(5.8, 7.9, abs(b.y));
    let socketMetal = mix(
      vec3f(0.30, 0.18, 0.09),
      vec3f(0.69, 0.52, 0.30),
      0.88*max(rim, endPlane)
    );
    col = mix(
      col,
      socketMetal+guardReflection,
      cv(socketD, aa)
    );
  }

  let bedD = boxD(b, vec2f(4.31, 7.36), 0.92);
  col = mix(col, vec3f(0.069, 0.047, 0.036), cv(bedD, aa));

  let m = v-vec2f(axleX, yc);
  let shoeD = boxD(m, vec2f(4.20, paneY+0.30), 0.34);
  col = mix(col, vec3f(0.25, 0.137, 0.067), cv(shoeD, aa));

  let cheekD = boxD(
    vec2f(m.x, abs(m.y)-(paneY+0.55)),
    vec2f(cheekX, 0.55),
    0.0
  );
  // Material-plane separation on the existing cheeks only.
  // This adds neither illumination nor an emissive guard contour.
  let cheekMetal = mix(
    vec3f(0.28, 0.17, 0.08),
    vec3f(0.62, 0.44, 0.24),
    smoothstep(-aa, aa, m.x)
  );
  col = mix(col, cheekMetal, cv(cheekD, aa));

  let paneMid = 0.5*(eaveX+ridgeHalf);
  let paneD = boxD(
    vec2f(abs(m.x)-paneMid, m.y),
    vec2f(0.5*(eaveX-ridgeHalf), paneY),
    0.0
  );
  let paneCov = cv(paneD, aa);
  let enamel = select(
    vec3f(0.225, 0.087, 0.029),
    vec3f(0.325, 0.143, 0.052),
    m.x > 0.0
  );
  col = mix(col, enamel+lampL*drive, paneCov);

  return col;
}

@fragment fn fs(@builtin(position) screen: vec4f) -> @location(0) vec4f {
  let bg = vec3f(0.016, 0.023, 0.032);
  var col = bg;

  if (
    view.visibleFlag >= 0.5 &&
    all(view.size > vec2f(0.0)) &&
    all(view.size < vec2f(1.0e7))
  ) {
    let sc = select(0.001, min(view.scale, 1.0e5), view.scale >= 0.001);
    let center = (screen.xy-view.size*0.5)/sc;
    let side = select(1.0, -1.0, view.facing < 0.0);
    col = figure(
      vec2f(center.x*side, center.y),
      max(0.0001, 0.65/sc),
      bg
    );
  }

  return vec4f(srgb(displayLin(col)), 1.0);
}
