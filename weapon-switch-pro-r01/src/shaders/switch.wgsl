// 折光転位 / v1.0.0。解析的な帯面と局所媒体。texture/sampler/readbackなし。
struct Globals { viewport: vec4<f32> };
struct Effect {
  center: vec4<f32>,    // CSS x,y, CSS pixels/world-unit, age milliseconds
  envelope: vec4<f32>,  // source, medium, geometric opening, source-bound lens response
  flags: vec4<f32>,     // variant, reduced motion, overlap display budget, reserved
  source: vec4<f32>     // exact peak-source CSS x,y, reserved, reserved
};
@group(0) @binding(0) var<uniform> globals: Globals;
@group(0) @binding(1) var<storage, read> effects: array<Effect>;
struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) local: vec2<f32>,
  @location(1) @interpolate(flat) eventIndex: u32,
  @location(2) @interpolate(flat) part: u32
};
fn corner(i: u32) -> vec2<f32> {
  let points = array<vec2<f32>,6>(vec2(-1.,-1.),vec2(1.,-1.),vec2(-1.,1.),vec2(-1.,1.),vec2(1.,-1.),vec2(1.,1.));
  return points[i];
}
fn clipPosition(pixel: vec2<f32>) -> vec4<f32> {
  let n = pixel/globals.viewport.xy;
  return vec4(n.x*2.-1.,1.-n.y*2.,0.,1.);
}
@vertex fn vsWorld(@builtin(vertex_index) vi: u32, @builtin(instance_index) ei: u32) -> VertexOut {
  let e = effects[ei]; let q = corner(vi); let halfExtent = 64.8*e.center.z;
  var o: VertexOut;
  o.position = clipPosition(e.center.xy+q*halfExtent);
  o.local = q*1.6; o.eventIndex = ei; o.part = 0u;
  return o;
}
fn segment(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
  let ab = b-a; let h = clamp(dot(p-a,ab)/max(dot(ab,ab),0.00001),0.,1.);
  return length(p-a-ab*h);
}
fn quadraticPoint(a: vec2<f32>, b: vec2<f32>, c: vec2<f32>, t: f32) -> vec2<f32> {
  let u = 1.-t; return u*u*a+2.*u*t*b+t*t*c;
}
fn curve(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>, c: vec2<f32>) -> f32 {
  var d = 10.; var last = a;
  // 世界内curveの区分近似。AAとは別。最小表示で分割頂点を強調しない。
  for (var i=1u; i<=16u; i=i+1u) {
    let point = quadraticPoint(a,b,c,f32(i)/16.);
    d = min(d,segment(p,last,point)); last = point;
  }
  return d;
}
fn primaryDistance(p: vec2<f32>, kind: u32) -> f32 {
  var d = 10.;
  switch kind {
    case 0u: {
      d = min(curve(p,vec2(-0.32,-0.62),vec2(-1.10,-0.62),vec2(-0.56,0.45)),
              curve(p,vec2(0.32,0.62),vec2(1.10,0.62),vec2(0.56,-0.45)));
    }
    case 1u: {
      for (var j=0u;j<3u;j=j+1u) {
        let y = -0.40+f32(j)*0.40;
        d = min(d,curve(p,vec2(-0.30,y-0.20),vec2(-0.80,y-0.08),vec2(-0.42,y+0.15)));
        d = min(d,curve(p,vec2(0.30,y+0.20),vec2(0.80,y+0.08),vec2(0.42,y-0.15)));
      }
    }
    case 2u: {
      let q = vec2(abs(p.x),p.y+select(0.,0.06,p.x>0.));
      d = min(segment(q,vec2(0.32,-0.64),vec2(0.82,-0.12)),segment(q,vec2(0.82,-0.12),vec2(0.35,0.58)));
    }
    case 3u: {
      d = min(curve(p,vec2(0.,-0.88),vec2(-0.72,-0.02),vec2(-0.14,0.85)),
              curve(p,vec2(0.14,-0.72),vec2(0.66,0.10),vec2(0.,0.92)));
    }
    default: {
      for (var j=0u;j<2u;j=j+1u) {
        let q = p*select(1.,-1.,j==1u);
        let upper = curve(q,vec2(-0.23,-0.70),vec2(-0.90,-0.72),vec2(-0.48,-0.03));
        let lower = curve(q,vec2(-0.48,-0.03),vec2(-0.10,0.57),vec2(-0.66,0.66));
        d = min(d,min(upper,lower));
      }
    }
  }
  return d;
}
fn sourcePoint(kind: u32) -> vec2<f32> {
  switch kind {
    case 0u: { return vec2(-0.32,-0.62); }
    case 1u: { return vec2(-0.30,-0.60); }
    case 2u: { return vec2(-0.82,-0.12); }
    case 3u: { return vec2(-0.27875,-0.449375); }
    default: { return vec2(-0.23,-0.70); }
  }
}
fn baseColor(kind: u32) -> vec3<f32> {
  switch kind {
    case 0u: { return vec3(0.025,0.46,0.32); }
    case 1u: { return vec3(0.045,0.32,0.42); }
    case 2u: { return vec3(0.08,0.25,0.53); }
    case 3u: { return vec3(0.31,0.12,0.56); }
    default: { return vec3(0.18,0.49,0.08); }
  }
}
fn edgeColor(kind: u32) -> vec3<f32> {
  switch kind {
    case 0u: { return vec3(0.75,0.48,0.12); }
    case 1u: { return vec3(0.74,0.29,0.12); }
    case 2u: { return vec3(0.81,0.51,0.08); }
    case 3u: { return vec3(0.16,0.63,0.68); }
    default: { return vec3(0.12,0.38,0.75); }
  }
}
fn coverage(d: f32, width: f32, aa: f32) -> f32 { return 1.-smoothstep(width-aa,width+aa,d); }
fn shoulder(x: vec3<f32>) -> vec3<f32> { return vec3(1.)-exp(-max(x,vec3(0.))); }
@fragment fn fsWorld(o: VertexOut) -> @location(0) vec4<f32> {
  let e = effects[o.eventIndex]; let kind = u32(e.flags.x+0.5);
  let p = o.local/e.envelope.z;
  // derivatives はuniformな制御フローに置く。解像度/縮尺を世界内幅と混同しない。
  let aa = max(max(fwidth(p.x),fwidth(p.y))*0.70,0.0001);
  let cssPixel = 1./max(40.5*e.center.z,0.001);
  let d = primaryDistance(p,kind);
  let panelWidth = select(0.067,0.096,kind==2u);
  let panel = coverage(d,panelWidth,aa);
  let rim = coverage(d,panelWidth+1.1*cssPixel,aa)-panel;
  let ridge = coverage(d,max(0.012,0.68*cssPixel),aa);
  let shapeFade = smoothstep(0.,0.15,e.envelope.x+e.envelope.y)*(1.-smoothstep(850.,1200.,e.center.w));
  // PH2：媒体層の密度・光学厚さを、PH1放射強度とは別に計算。
  let density = exp(-pow(d/0.11,2.))*e.envelope.y;
  let opticalDepth = density*0.32;
  let scattering = (1.-exp(-opticalDepth))*(0.22*e.envelope.y+0.78*e.envelope.x);
  let densityColor = mix(baseColor(kind),edgeColor(kind),smoothstep(-0.7,0.65,p.y));
  let sourceSpot = exp(-dot(p-sourcePoint(kind),p-sourcePoint(kind))/0.020)*panel;
  let normalSide = smoothstep(-0.015,0.12,p.x*0.1+p.y*0.07+d);
  let bodyColor = mix(baseColor(kind),edgeColor(kind),normalSide*0.57);
  let core = vec3(0.93,0.98,0.84);
  let exposureBudget = e.flags.z;
  // OBS1：解析source肩部。主形はpanel/ridgeで既に成立。ぼかしで輪郭を作らない。
  let narrowDiffusion = exp(-pow(d/0.070,2.))*e.envelope.x*0.12;
  let radiance = (bodyColor*panel*(0.55+1.1*e.envelope.x)
    + core*ridge*(0.55+2.0*e.envelope.x)
    + core*sourceSpot*e.envelope.x*3.3
    + densityColor*scattering*1.4 + core*narrowDiffusion)*exposureBudget;
  let colored = shoulder(radiance);
  // 暗い縁はworld吸収帯。screen全体の暗化/疑似接触影ではない。
  let rimAlpha = rim*0.72;
  let panelAlpha = panel*(0.74+0.20*e.envelope.x);
  let mediumAlpha = scattering*0.54+narrowDiffusion*0.45;
  let alpha = clamp((rimAlpha+panelAlpha+mediumAlpha)*shapeFade,0.,0.985);
  let darkEdge = vec3(0.013,0.025,0.031);
  let color = mix(darkEdge,colored,clamp(panel+scattering*3.+narrowDiffusion*3.,0.,1.));
  return vec4(color*alpha,alpha);
}

@vertex fn vsLens(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VertexOut {
  let ei = ii/3u; let part = ii%3u; let e = effects[ei]; let q = corner(vi);
  let opticalCenter = globals.viewport.xy*0.5; let offset = e.source.xy-opticalCenter;
  var center = e.source.xy; var radius = clamp(12.*e.center.z,5.,20.);
  if (part==1u) { center = opticalCenter-offset*0.12; radius = clamp(4.*e.center.z,2.,7.); }
  if (part==2u) { center = opticalCenter-offset*0.27; radius = clamp(6.*e.center.z,3.,9.); }
  var o: VertexOut; o.position = clipPosition(center+q*radius);
  o.local = q; o.eventIndex = ei; o.part = part; return o;
}
@fragment fn fsLens(o: VertexOut) -> @location(0) vec4<f32> {
  let e = effects[o.eventIndex]; let r = length(o.local);
  let aa = max(fwidth(r),0.002);
  let offset = (e.source.xy-globals.viewport.xy*0.5)/globals.viewport.xy;
  let incidence = clamp(1.-length(offset)*0.65,0.25,1.);
  let bound = e.envelope.w*e.flags.z*incidence;
  var shape = exp(-r*r*5.0)*(1.-smoothstep(0.80,1.,r));
  var color = vec3(0.89,0.97,0.80); var strength = bound;
  if (o.part>0u) {
    // 開口像の弱い内面反射。線/星/虹の独立装飾を足さない。
    shape = (1.-smoothstep(0.58-aa,0.58+aa,r))*0.35+exp(-pow((r-0.58)/0.18,2.))*0.25;
    color = select(vec3(0.73,0.91,0.67),vec3(0.94,0.75,0.47),o.part==2u);
    strength = bound*select(0.72,0.37,o.part==2u);
  }
  let alpha = clamp(shape*strength,0.,0.055);
  return vec4(color*alpha,alpha);
}
