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
  let xy = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(xy*2.0-vec2f(1.0),0.0,1.0);
}

const pi: f32 = 3.14159265359;
const tau: f32 = 6.28318530718;
const fieldColor: vec3f = vec3f(0.004,0.011,0.019);
fn finiteVal(v: f32) -> bool {
  return (bitcast<u32>(v) & 0x7f800000u) != 0x7f800000u;
}
fn displayColor(c: vec3f) -> vec4f {
  let m = c/(1.0+max(c.r,max(c.g,c.b)));
  let enc = select(1.055*pow(m,vec3f(1.0/2.4))-vec3f(0.055),12.92*m,m<=vec3f(0.0031308));
  return vec4f(enc,1.0);
}
fn bell(x: f32) -> f32 { return exp(-x*x); }

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  if (!finiteVal(u.age) || !finiteVal(u.scale) || !finiteVal(u.size.x) || !finiteVal(u.size.y) || !finiteVal(u.reduced) || !finiteVal(u.live) || !finiteVal(u.pad.x) || !finiteVal(u.pad.y)) { return displayColor(fieldColor); }
  if (u.live != 1.0 || u.age < 0.0 || u.age >= 4000.0 || any(u.size<=vec2f(0.0)) || u.scale<=0.0 || (u.reduced!=0.0 && u.reduced!=1.0) || any(u.pad!=vec2f(0.0))) { return displayColor(fieldColor); }
  let fit = min(u.size.x/292.0,u.size.y/135.0);
  if (u.scale > fit*1.00001) { return displayColor(fieldColor); }
  let t = 0.001*u.age;
  let opening = smoothstep(0.0,0.24,t)*(1.0-smoothstep(3.45,3.94,t));
  let p = clamp((pos.xy-0.5*u.size)/u.scale,vec2f(-160.0),vec2f(160.0));
  let guardMask = (1.0-smoothstep(111.0,113.0,abs(p.x)))*(1.0-smoothstep(62.0,64.0,abs(p.y)));
  let recoil = smoothstep(2.55,3.32,t);
  let span = mix(110.0,16.0,recoil);
  let q = p.x/span;
  let s = clamp(0.5+0.5*q,0.0,1.0);
  let profile = sqrt(max(0.0,1.0-q*q));
  let delay = t-(0.48+1.92*s);
  let slit = 1.0-smoothstep(-0.17,0.0,delay);
  let twin = 1.0-smoothstep(0.0,0.14,delay);
  let foldWave = sin(4.0*pi*s);
  let belly = foldWave*foldWave;
  let wetRadius = mix(10.0,18.0,recoil)*(1.0-0.5*twin);
  let parting = profile*twin*wetRadius + slit*(4.0+profile*(3.0+18.0*belly));
  let sway = (1.0-u.reduced)*1.4*sin(pi*s)*sin(tau*(1.35*s-0.65*t))*(1.0-smoothstep(-0.19,0.12,delay));
  let arc = 24.0-18.0*s-24.0*sin(pi*s)+6.0*sin(tau*s);
  let mid = mix(arc+sway,2.0,recoil);
  let dy = p.y-mid;
  let side = select(-1.0,1.0,dy>=0.0);
  let k = (dy-side*parting)/wetRadius;
  let implicitVal = q*q+k*k-1.0;
  let aa = clamp(0.5*fwidth(implicitVal),0.0001,0.62);
  let film = (1.0-smoothstep(-aa,aa,implicitVal))*guardMask;
  let slope = (dpdx(mid)+side*dpdx(parting))*u.scale;
  let z = sqrt(clamp(-implicitVal,0.0,1.0));
  let norm = normalize(vec3f(q*wetRadius/span-k*slope,k,max(0.015,z)));
  let key = normalize(vec3f(-0.42,-0.83,0.61));
  let halfVec = normalize(key+vec3f(0.0,0.0,1.0));
  let lit = max(0.0,dot(norm,key));
  let glint = pow(max(0.0,dot(norm,halfVec)),52.0);
  let graze = pow(1.0-clamp(norm.z,0.0,1.0),2.7);
  let under = bell((norm.y-0.76)/0.16)*(0.32+0.68*z);
  let brine = vec3f(0.009,0.054,0.083)+lit*vec3f(0.024,0.215,0.228)+glint*vec3f(0.48,0.81,0.77)+graze*vec3f(0.063,0.15,0.16)+under*vec3f(0.025,0.145,0.10);
  let burn = smoothstep(0.0,0.042,delay)*(1.0-smoothstep(0.09,0.66,delay))*(0.63+0.37*belly)*profile;
  let filament = bell(dy/(1.25+0.85*profile));
  let transmitted = bell(dy/(3.2+5.0*profile));
  let weld = burn*(vec3f(3.9,1.34,0.18)*filament+vec3f(0.93,0.205,0.032)*transmitted+under*vec3f(0.48,0.153,0.022));
  return displayColor(mix(fieldColor,brine+weld,film*opening));
}
