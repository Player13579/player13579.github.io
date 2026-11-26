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
const waterMu = vec3f(0.0105,0.0038,0.0028);
const solidMu = 0.039;
const rimHeight = 4.0;
const incline = 0.84;
const halfZone = 3.1;
const psfRadius = 2.4;

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
  past: vec3f,
  lead: f32,
  width: f32,
  drive: f32,
}
fn frontAt(t: f32) -> f32 { return -98.0+214.0*smoothstep(700.0,2240.0,t); }
fn exposureAt(age: f32) -> Exposure {
  // Hold the final optical instant, not just the mesh.
  let t = min(age,2240.0);
  let f = frontAt(t);
  let lead = max(0.0,31.0-0.62*(f+98.0));
  let past = vec3f(frontAt(t-280.0),frontAt(t-470.0),frontAt(t-620.0));
  return Exposure(t,f,past,lead,mix(9.0,23.0,lead/31.0),0.68+0.32*smoothstep(0.0,900.0,t));
}
fn sourceDensity(k: f32, e: Exposure) -> vec3f {
  let s = e.front-k;
  let core = e.drive*(1.0-smoothstep(0.0,e.width,abs(s+e.lead)));
  // Differences in occupancy count only material converted within each lag.
  let pastLock = smoothstep(vec3f(-halfZone),vec3f(halfZone),e.past-vec3f(k));
  let recent = max(0.0,phaseAt(s)-dot(vec3f(0.35,0.43,0.22),pastLock));
  return vec3f(0.009,0.074,0.069)*core+vec3f(0.006,0.030,0.063)*recent;
}

fn sectionColor(q: vec2f, c: Crown, w: Lens, e: Exposure) -> vec3f {
  let hRef = max(rimHeight,c.h);
  let nearK = keyXY(q)+incline*hRef;
  let lock = phaseAt(e.front-nearK);
  let n = normalize(mix(w.n,normalize(vec3f(c.tilt,1.0)),lock));
  let h = mix(w.h,hRef,lock);
  let eta = mix(0.750,0.763,lock);
  let ray = refract(vec3f(0.0,0.0,-1.0),n,eta);
  let dist = h/max(0.25,-ray.z);
  let foot = q+dist*ray.xy;
  let farK = keyXY(foot);
  let ds = dist/6.0;
  let incidentMean = fillLight+0.021*stripLight;
  var throughput = vec3f(1.0);
  var radiance = vec3f(0.0);
  var k0 = nearK;
  for (var i = 1u; i<=6u; i++) {
    let k1 = mix(nearK,farK,f32(i)/6.0);
    let ice = pathPart(e.front-k0,e.front-k1);
    let mu = mix(waterMu,vec3f(solidMu),ice);
    let trans = exp(-ds*mu);
    let effLength = (vec3f(1.0)-trans)/mu;
    let redirected = ice*solidMu*incidentMean;
    let emitted = sourceDensity(0.5*(k0+k1),e);
    radiance += throughput*effLength*(redirected+emitted);
    throughput *= trans;
    k0 = k1;
  }
  radiance += throughput*rearField(foot);
  let r0 = (1.0-eta)/(1.0+eta);
  let fres = r0*r0+(1.0-r0*r0)*pow(1.0-clamp(n.z,0.0,1.0),5.0);
  return mix(radiance,reflectedField(n),fres);
}
fn sceneAt(q: vec2f, aa: f32, e: Exposure) -> vec3f {
  let w = lensAt(q,e.age,u.reduced);
  let c = crownAt(q);
  let rimPart = phaseAt(e.front-keyXY(q)-incline*rimHeight);
  let d = mix(w.edge,c.edge,rimPart);
  let cover = 1.0-smoothstep(-aa,aa,d);
  if (cover<=0.0) { return slate; }
  return mix(slate,sectionColor(q,c,w,e),cover);
}

// OBS: move a fraction of the bright, covered image; do not mint it again.
fn spreadPart(light: vec3f) -> vec3f {
  let y = dot(light,vec3f(0.2126,0.7152,0.0722));
  return light*(0.14*smoothstep(0.34,0.78,y));
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
  if (abs(q.x)>87.0+2.0*aa+psfRadius || abs(q.y)>41.0+2.0*aa+psfRadius) { return idle; }
  let e = exposureAt(u.age);
  let center = sceneAt(q,aa,e);
  let a = vec2f(psfRadius,0.0);
  let b = psfRadius*vec2f(0.5,0.8660254);
  let c = psfRadius*vec2f(-0.5,0.8660254);
  let gather = spreadPart(sceneAt(q+a,aa,e))+spreadPart(sceneAt(q-a,aa,e))
             + spreadPart(sceneAt(q+b,aa,e))+spreadPart(sceneAt(q-b,aa,e))
             + spreadPart(sceneAt(q+c,aa,e))+spreadPart(sceneAt(q-c,aa,e));
  let image = shoulder(center-spreadPart(center)+gather/6.0);
  let show = 1.0-smoothstep(3010.0,3370.0,u.age);
  return displayColor(mix(slate,image,show));
}
