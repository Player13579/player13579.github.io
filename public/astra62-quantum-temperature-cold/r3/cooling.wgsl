struct Params {
  size: vec2f,
  age: f32,
  scale: f32,
  reduced: f32,
  live: f32,
  pad: vec2f,
}
@group(0) @binding(0) var<uniform> u: Params;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var corners = array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
  return vec4f(corners[i],0.0,1.0);
}

const slate = vec3f(0.019,0.030,0.039);
const fillLight = vec3f(0.143,0.184,0.204);
const stripLight = vec3f(10.6,10.4,9.55);
const waterAbs = vec3f(0.0105,0.0038,0.0028);
const iceAbs = vec3f(0.0045,0.0028,0.0021);
const waterSc = vec3f(0.009,0.013,0.016);
const iceSc = vec3f(0.037,0.041,0.044);
const rimHeight = 4.0;
const incline = 0.84;
const halfZone = 3.1;
const kAxis = vec3f(1.0,0.14,incline);
const apertureR = vec2f(14.0,8.0);
const endKey = 62.0;

fn finite32(x: f32) -> bool {
  return (bitcast<u32>(x) & 0x7f800000u) != 0x7f800000u;
}
fn displayColor(lin: vec3f) -> vec4f {
  let x = clamp(lin,vec3f(0.0),vec3f(1.0));
  let upper = 1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055);
  return vec4f(select(upper,12.92*x,x<=vec3f(0.0031308)),1.0);
}

struct Crown {
  edge: f32,
  h: f32,
  tilt: vec2f,
}
fn lowerPlane(c: Crown, edgeD: f32, h: f32, tilt: vec2f) -> Crown {
  let k = 0.80;
  let w = clamp(0.5+0.5*(c.h-h)/k,0.0,1.0);
  return Crown(max(c.edge,edgeD),mix(c.h,h,w)-k*w*(1.0-w),mix(c.tilt,tilt,w));
}
fn flank(c: Crown, q: vec2f, dir: vec2f, limitD: f32, pitch: f32) -> Crown {
  let axis = normalize(dir);
  let d = dot(q,axis)-limitD;
  return lowerPlane(c,d,rimHeight-pitch*d,pitch*axis);
}
fn crownAt(q: vec2f) -> Crown {
  let tableTilt = vec2f(0.038,0.090);
  let shoulderTilt = vec2f(-0.090,-0.390);
  var c = Crown(-1000.0,24.5-dot(tableTilt,q),tableTilt);
  c = lowerPlane(c,-1000.0,27.2-dot(shoulderTilt,q),shoulderTilt);
  c = flank(c,q,vec2f(1.0,0.0),83.0,1.43);
  c = flank(c,q,vec2f(-1.0,0.0),80.0,1.54);
  c = flank(c,q,vec2f(0.05,-1.0),32.5,1.40);
  c = flank(c,q,vec2f(-0.016,1.0),34.0,1.23);
  c = flank(c,q,vec2f(0.76,-0.65),64.0,1.29);
  c = flank(c,q,vec2f(0.61,0.79),60.0,1.51);
  c = flank(c,q,vec2f(-0.60,-0.80),59.0,1.32);
  return flank(c,q,vec2f(-0.72,0.69),60.0,1.26);
}

struct Lens {
  edge: f32,
  h: f32,
  n: vec3f,
}
fn lensAt(q: vec2f, age: f32, reduced: f32) -> Lens {
  let t = clamp(age/1180.0,0.0,1.0);
  let rem = 1.0-t;
  let phi = 5.8*(1.0-rem*rem*rem);
  let amp = (1.0-smoothstep(0.0,1.0,t))*(1.0-reduced);
  let a = 0.056*q.x-phi;
  let b = 0.092*q.x+0.58*phi+0.6;
  let warp = amp*(3.5*sin(a)+1.45*sin(b));
  let gradWarp = amp*(0.196*cos(a)+0.1334*cos(b));
  let v = vec2f(q.x/82.0,(q.y-warp)/32.5);
  let g = vec2f(v.x/82.0-gradWarp*v.y/32.5,v.y/32.5);
  let s = dot(v,v);
  let d = (s-1.0)/max(0.0002,2.0*length(g));
  let z = sqrt(max(0.0,1.0-s));
  return Lens(d,rimHeight+24.0*z,normalize(vec3f(24.0*g,max(0.045,z))));
}

fn keyXY(q: vec2f) -> f32 { return q.x+0.14*q.y; }
fn phaseAt(s: f32) -> f32 { return smoothstep(-halfZone,halfZone,s); }
fn phaseIntegral(s: f32) -> f32 {
  let t = clamp((s+halfZone)/(2.0*halfZone),0.0,1.0);
  return 2.0*halfZone*t*t*t*(1.0-0.5*t)+max(0.0,s-halfZone);
}
fn pathPart(a: f32,b: f32) -> f32 {
  let lo = min(a,b);
  let hi = max(a,b);
  if (hi<=-halfZone) { return 0.0; }
  if (lo>=halfZone) { return 1.0; }
  if (hi-lo<0.01) { return phaseAt(0.5*(lo+hi)); }
  return clamp((phaseIntegral(hi)-phaseIntegral(lo))/(hi-lo),0.0,1.0);
}
fn muAt(ice: f32) -> vec3f {
  return mix(waterAbs+waterSc,iceAbs+iceSc,ice);
}
fn reflectedField(n: vec3f) -> vec3f {
  let r = reflect(vec3f(0.0,0.0,-1.0),n);
  let across = abs(r.y+0.66-0.12*r.x);
  let strip = (1.0-smoothstep(0.070,0.20,across))*(1.0-smoothstep(0.45,0.93,abs(r.x+0.14)))*smoothstep(0.08,0.38,r.z);
  return fillLight*(0.72+0.28*r.z)+stripLight*strip;
}
fn rearField(q: vec2f) -> vec3f {
  return mix(vec3f(0.163,0.249,0.267),vec3f(0.053,0.104,0.132),smoothstep(-3.2,3.2,q.y-0.13*q.x-1.0));
}

struct Exposure {
  age: f32,
  front: f32,
  sheetK: f32,
  center: vec3f,
  le: vec3f,
}
fn exposureAt(age: f32) -> Exposure {
  let t = min(age,2240.0);
  let f = -98.0+214.0*smoothstep(700.0,2240.0,t);
  let lead = max(0.0,59.0-0.80*(f+98.0));
  let k = min(endKey,f+lead);
  // Invert the monotone smoothstep once for the last driven interior address.
  let hitT = 700.0+1540.0*(0.5-sin(asin(1.0-2.0*(endKey+98.0)/214.0)/3.0));
  let lag = max(0.0,t-hitT);
  let rgb = mix(vec3f(0.40,3.75,2.96),vec3f(0.34,2.25,3.95),smoothstep(0.0,165.0,lag));
  let power = (0.80+0.20*smoothstep(0.0,900.0,t))*exp(-lag/640.0);
  return Exposure(t,f,k,vec3f(k-incline*9.5,0.0,9.5),rgb*power);
}
fn sheetUV(v: vec3f) -> vec2f {
  let ax = normalize(vec3f(-0.14,1.0,0.0));
  let ay = cross(normalize(kAxis),ax);
  return vec2f(dot(v,ax),dot(v,ay));
}
fn aperture(uv: vec2f) -> f32 {
  let v = uv/apertureR;
  return 1.0-smoothstep(0.24,1.0,dot(v,v));
}
fn directImage(top: vec3f, bottom: vec3f, dist: f32, e: Exposure) -> vec3f {
  let k0 = dot(kAxis,top);
  let dk = dot(kAxis,bottom-top);
  if (abs(dk)<0.0001) { return vec3f(0.0); }
  let t = (e.sheetK-k0)/dk;
  if (t<=0.0 || t>=1.0) { return vec3f(0.0); }
  let uv = sheetUV(mix(top,bottom,t)-e.center);
  let occ = pathPart(e.front-k0,e.front-e.sheetK);
  return e.le*aperture(uv)*exp(-dist*t*muAt(occ));
}

// Only relay through the common interior in material coordinates. Both the
// conservative wet footprint and the under-crown section are convex there.
fn relaySupport(p: vec3f) -> f32 {
  let wet = vec2f(p.x/82.0,(abs(p.y)+4.95)/32.5);
  let inset = 1.0-dot(wet,wet);
  if (inset<=0.0) { return 0.0; }
  let c = crownAt(p.xy);
  return smoothstep(0.0,0.08,inset)*smoothstep(0.0,1.5,min(-c.edge,c.h-p.z));
}
fn cornerAngle(x: f32,y: f32,h: f32) -> f32 {
  return atan2(x*y,h*sqrt(x*x+y*y+h*h));
}
fn relayMean(p: vec3f, k: f32, e: Exposure) -> vec3f {
  let support = relaySupport(p);
  if (support<=0.0) { return vec3f(0.0); }
  let delta = p-e.center;
  let uv = sheetUV(delta);
  let h = abs(dot(delta,normalize(kAxis)));
  // Equal Le-weighted area: integral of the radial window = pi*a*b*0.62.
  let boxR = apertureR*sqrt(3.14159265*0.62/4.0);
  let lo = -boxR-uv;
  let hi = boxR-uv;
  let dh = max(0.025,h);
  let omega = cornerAngle(hi.x,hi.y,dh)-cornerAngle(lo.x,hi.y,dh)
            -cornerAngle(hi.x,lo.y,dh)+cornerAngle(lo.x,lo.y,dh);
  let fraction = mix(0.5*aperture(uv),clamp(omega/12.5663706,0.0,0.5),smoothstep(0.0,4.0,h));
  // One representative in-aperture endpoint for extinction. Near the plane
  // use the projected interior; at distance approach a centroid path.
  let dest = uv/(max(1.0,length(uv/apertureR))*(1.0+h/12.0));
  let lateral = uv-dest;
  let travel = sqrt(h*h+dot(lateral,lateral));
  let icePath = pathPart(e.front-k,e.front-e.sheetK);
  return e.le*(fraction*support)*exp(-travel*muAt(icePath));
}

fn sectionColor(q: vec2f, c: Crown, w: Lens, e: Exposure) -> vec3f {
  let hRef = max(rimHeight,c.h);
  let top = vec3f(q,hRef);
  let nearK = dot(kAxis,top);
  let lock = phaseAt(e.front-nearK);
  let n = normalize(mix(w.n,normalize(vec3f(c.tilt,1.0)),lock));
  let h = mix(w.h,hRef,lock);
  let eta = mix(0.750,0.763,lock);
  let ray = refract(vec3f(0.0,0.0,-1.0),n,eta);
  let dist = h/max(0.25,-ray.z);
  let bottom = vec3f(q+dist*ray.xy,0.0);
  let farK = dot(kAxis,bottom);
  let ds = dist/6.0;
  let ambient = fillLight+0.021*stripLight;
  var tr = vec3f(1.0);
  var passive = vec3f(0.0);
  var received = vec3f(0.0);
  var k0 = nearK;
  for (var i=0u; i<6u; i++) {
    let k1 = mix(nearK,farK,f32(i+1u)/6.0);
    let ice = pathPart(e.front-k0,e.front-k1);
    let mu = muAt(ice);
    let stepTr = exp(-ds*mu);
    let scWeight = tr*(vec3f(1.0)-stepTr)/mu*mix(waterSc,iceSc,ice);
    let p = mix(top,bottom,(f32(i)+0.5)/6.0);
    passive += scWeight*ambient;
    received += scWeight*relayMean(p,0.5*(k0+k1),e);
    tr *= stepTr;
    k0 = k1;
  }
  passive += tr*rearField(bottom.xy);
  let core = directImage(top,bottom,dist,e);
  let r0 = (1.0-eta)/(1.0+eta);
  let fres = r0*r0+(1.0-r0*r0)*pow(1.0-clamp(n.z,0.0,1.0),5.0);
  return mix(passive+received+core,reflectedField(n),fres);
}
fn shoulder(light: vec3f) -> vec3f {
  let peak = max(light.r,max(light.g,light.b));
  if (peak<=0.64) { return light; }
  let roll = 0.64+0.36*(1.0-exp(-(peak-0.64)/0.36));
  return light*(roll/peak);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let idle = displayColor(slate);
  if (!finite32(u.size.x) || !finite32(u.size.y) || !finite32(u.age) || !finite32(u.scale) || !finite32(u.reduced) || !finite32(u.live) || !finite32(u.pad.x) || !finite32(u.pad.y)) { return idle; }
  if (u.live!=1.0 || (u.reduced!=0.0 && u.reduced!=1.0) || any(u.pad!=vec2f(0.0)) || u.age<0.0 || u.age>=3370.0 || u.scale<=0.0) { return idle; }
  if (any(u.size<vec2f(1.0)) || any(u.size>vec2f(16777216.0)) || any(floor(u.size)!=u.size)) { return idle; }
  let fit = min(u.size.x/292.0,u.size.y/135.0);
  if (u.scale<min(fit,1.0)*0.999999 || u.scale>min(fit,2.0)*1.000001) { return idle; }
  let p = (pos.xy-0.5*u.size)/u.scale;
  let q = vec2f(0.9925*p.x-0.1222*p.y,0.1222*p.x+0.9925*p.y);
  let aa = 0.70/u.scale;
  if (abs(q.x)>87.0+2.0*aa || abs(q.y)>41.0+2.0*aa) { return idle; }
  let e = exposureAt(u.age);
  let w = lensAt(q,e.age,u.reduced);
  let c = crownAt(q);
  let rimPart = phaseAt(e.front-keyXY(q)-incline*rimHeight);
  let d = mix(w.edge,c.edge,rimPart);
  let cover = 1.0-smoothstep(-aa,aa,d);
  if (cover<=0.0) { return idle; }
  let image = shoulder(mix(slate,sectionColor(q,c,w,e),cover));
  let show = 1.0-smoothstep(3010.0,3370.0,u.age);
  return displayColor(mix(slate,image,show));
}
