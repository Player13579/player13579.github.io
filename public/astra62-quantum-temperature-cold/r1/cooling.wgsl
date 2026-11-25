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
fn finite32(x: f32) -> bool {
  return (bitcast<u32>(x) & 0x7f800000u) != 0x7f800000u;
}
fn displayColor(lin: vec3f) -> vec4f {
  let x = clamp(lin,vec3f(0.0),vec3f(1.0));
  let upper = 1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055);
  return vec4f(select(upper,12.92*x,x<=vec3f(0.0031308)),1.0);
}

// The clipped solid and its inset bevels use the same eight half-planes.
struct Cut {
  edge: f32,
  bevel: f32,
  tilt: vec2f,
}
fn trim(old: Cut, q: vec2f, dir: vec2f, offset: f32, width: f32, pitch: f32) -> Cut {
  let axis = normalize(dir);
  let dist = dot(q,axis)-offset;
  let level = 1.0+dist/width;
  return Cut(max(old.edge,dist),max(old.bevel,level),select(old.tilt,axis*pitch,level>old.bevel));
}
fn carve(q: vec2f) -> Cut {
  var f = Cut(-1000.0,0.0,vec2f(0.0));
  f = trim(f,q,vec2f(1.0,0.0),83.0,13.0,0.72);
  f = trim(f,q,vec2f(-1.0,0.0),80.0,12.0,0.42);
  f = trim(f,q,vec2f(0.05,-1.0),32.5,9.5,0.46);
  f = trim(f,q,vec2f(-0.016,1.0),34.0,14.0,0.69);
  f = trim(f,q,vec2f(0.76,-0.65),64.0,11.0,0.53);
  f = trim(f,q,vec2f(0.61,0.79),60.0,11.5,0.60);
  f = trim(f,q,vec2f(-0.60,-0.80),59.0,10.0,0.56);
  return trim(f,q,vec2f(-0.72,0.69),60.0,14.0,0.57);
}

// A reflected strip and a broad transmitted dark division, not painted contours.
fn sash(n: vec3f) -> f32 {
  let r = reflect(vec3f(0.0,0.0,-1.0),n);
  let band = 1.0-smoothstep(0.056,0.22,abs(r.y+0.80-0.14*r.x));
  return band*(1.0-smoothstep(0.45,1.0,abs(r.x+0.16)))*smoothstep(-0.40,0.05,r.z);
}
fn throughPoint(q: vec2f,n: vec3f,eta: f32,depth: f32) -> vec2f {
  let ray = refract(vec3f(0.0,0.0,-1.0),n,eta);
  return q+depth*ray.xy/max(0.42,-ray.z);
}
fn division(v: vec2f) -> f32 {
  return 1.0-smoothstep(3.2,9.0,abs(v.y+0.18*v.x-8.0));
}
fn liquidColor(q: vec2f,n: vec3f,z: f32) -> vec3f {
  let v = throughPoint(q,n,0.750,20.0+18.0*z);
  let trans = vec3f(0.061,0.193,0.217)*(0.71+0.29*z)*(1.0-0.57*division(v));
  let grazing = (1.0-z)*(1.0-z);
  return trans+vec3f(0.61,0.59,0.50)*sash(n)*(0.57+0.25*grazing)+vec3f(0.071,0.108,0.118)*grazing;
}
fn iceColor(q: vec2f,f: Cut,aa: f32) -> vec3f {
  // A very short roll at the table/bevel hinge, then a constant plane normal.
  let slope = vec2f(-0.055,-0.085)+f.tilt*smoothstep(0.0,0.13,f.bevel);
  let n = normalize(vec3f(slope,1.0));
  let v = throughPoint(q,n,0.763,40.0);
  let sky = max(dot(n,normalize(vec3f(-0.38,-0.72,0.56))),0.0);
  let body = vec3f(0.191,0.356,0.395)*(0.41+0.70*sky)*(1.0-0.46*division(v));
  let fold = v.y-(5.0+0.10*v.x-0.34*abs(v.x+13.0));
  let pocket = (1.0-smoothstep(23.0,57.0,abs(v.x+9.0)))*(1.0-smoothstep(0.35,1.0,f.bevel));
  let veil = pocket*(0.54*exp2(-0.25*abs(fold-2.5))+0.46*(1.0-smoothstep(0.40,1.1+aa,abs(fold))));
  let lip = smoothstep(-3.1,-0.8,f.edge)*max(0.0,-n.y);
  return body+vec3f(0.184,0.216,0.195)*veil+vec3f(0.44,0.43,0.375)*sash(n)+vec3f(0.19,0.21,0.20)*lip;
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

  let t = clamp(u.age/1180.0,0.0,1.0);
  let rem = 1.0-t;
  let phi = 5.8*(1.0-rem*rem*rem);
  let bend = (1.0-smoothstep(0.0,1.0,t))*(1.0-u.reduced);
  let a = 0.056*q.x-phi;
  let b = 0.092*q.x+0.58*phi+0.6;
  let dy = bend*(3.5*sin(a)+1.45*sin(b));
  let v = vec2f(q.x/82.0,(q.y-dy)/32.5);
  let len = length(v);
  let waterD = (len-1.0)*max(len,0.01)/max(length(v/vec2f(82.0,32.5)),0.0002);
  let z = sqrt(max(0.0,1.0-dot(v,v)));
  let nWater = normalize(vec3f(0.63*v.x-bend*0.11*cos(a)*v.y,v.y+bend*(0.19*cos(a)+0.085*cos(b)),max(0.065,z)));
  let cut = carve(q);
  let key = q.x+0.46*abs(q.y+5.0)-0.12*q.y;
  let front = -98.0+214.0*smoothstep(700.0,2240.0,u.age);
  let frozen = 1.0-smoothstep(-3.2,3.2,key-front);
  let d = mix(waterD,cut.edge,frozen);
  let cover = 1.0-smoothstep(-aa,aa,d);
  if (cover<=0.0) { return idle; }
  let sampleColor = mix(liquidColor(q,nWater,z),iceColor(q,cut,aa),frozen);
  let cloud = 4.0*frozen*(1.0-frozen);
  let local = sampleColor+vec3f(0.165,0.191,0.172)*cloud;
  let show = 1.0-smoothstep(3010.0,3370.0,u.age);
  return displayColor(mix(slate,local,cover*show));
}
