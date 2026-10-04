// Authored blue jet volume + observer PSF, GPT-6.1-Sol, creative edition 7; explicit user extension 2/3.
// No image asset, body invention, lens ghost, background-dependent gain or 2D fallback.
const ABI = /* wgsl */ `
struct U { viewport:vec4f, clock:vec4f, state:vec4f, a0:vec4f, a1:vec4f, a2:vec4f, a3:vec4f, backdrop:vec4f, flags:vec4f, optical:vec4f }
@group(0) @binding(0) var<uniform> u:U;
struct Vertex { @builtin(position) position:vec4f, @location(0) uv:vec2f }
@vertex fn vs(@builtin(vertex_index) i:u32)->Vertex {
  var p=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
  var out:Vertex; out.position=vec4f(p[i],0.0,1.0); out.uv=vec2f((p[i].x+1.0)*0.5,(1.0-p[i].y)*0.5); return out;
}
fn ramp(a:f32,b:f32,x:f32)->f32 { return smoothstep(a,b,x); }
`;
export const WORLD_WGSL = ABI + /* wgsl */ `
struct MRT { @location(0) world:vec4f, @location(1) sources:vec4f }
fn source(i:u32)->vec4f { if(i==0u){return u.a0;} if(i==1u){return u.a1;} if(i==2u){return u.a2;} return u.a3; }
fn axis(kind:f32)->vec2f {
  if(kind<0.5){ return normalize(-0.36*u.state.xy+vec2f(0.0,1.0)); }
  return normalize(-u.state.xy+vec2f(0.0,0.30));
}
// A steady open jet receives fictional field energy/momentum at the source.
// It entrains ambient gas, broadens, advects shear cells and loses excitation.
// R is a finite cross-section. z integrates depth; density != emission != alpha.
fn plume(p:vec2f,a:vec4f)->vec3f {
  let d=axis(a.z); let n=vec2f(-d.y,d.x); let q=(p-a.xy)/u.viewport.z;
  let axial=dot(q,d); let lateral=dot(q,n);
  let fullLength=select(46.0,58.0,a.z>0.5); let L=fullLength*u.state.w;
  if(axial<0.0 || axial>L || L<=0.0){return vec3f(0.0);}
  let s=axial/max(L,0.001);
  let t=u.viewport.w*0.001;
  let reduced=select(1.0,0.24,u.clock.w>0.5);
  // Two resolved broad gas structures convect away from the registered source.
  // Cell spacing 22.4/34.9 units: no stationary diamonds or flickering particles.
  let phase=(axial-86.0*t)*0.28+a.w*1.41;
  let phase2=(axial-64.0*t)*0.18+a.w*2.07;
  let center=1.25*s*s*sin(phase2)*reduced;
  // Open shear envelope grows before its excited support tapers at the tip.
  let radius=(3.15+8.2*s)*(1.0-0.38*ramp(0.64,1.0,s))*(1.0+0.10*s*sin(phase2)*reduced);
  let rel=lateral-center;
  if(abs(rel)>radius){return vec3f(0.0);}
  let axialFade=(1.0-ramp(0.68,1.0,s))*ramp(0.0,0.024,s+0.015);
  let ds=radius*2.0/12.0;
  var result=vec3f(0.0);
  for(var k=0u;k<12u;k=k+1u){
    let z=-radius+(f32(k)+0.5)*ds;
    let r=length(vec2f(rel,z))/radius;
    // Density falls radially; excitation declines separately along the flow.
    let density=pow(max(0.0,1.0-r*r),1.2)/(1.0+0.95*s);
    let coreWidth=0.24+0.10*s;
    let core=exp(-pow(r/coreWidth,2.0))*exp(-2.4*s);
    let middle=exp(-pow((r-0.42)/0.29,2.0));
    let entrainment=exp(-pow((r-0.73)/0.21,2.0));
    let streamTransport=0.60+0.40*pow(0.5+0.5*sin(phase-r*2.0),2.0);
    let mixingTransport=0.45+0.55*pow(0.5+0.5*sin(phase2-r*3.0),2.0);
    let excitation=exp(-s*0.85);
    // Broad blue gas carries the momentum silhouette; pale light is proximal.
    let cobalt=vec3f(0.014,0.12,1.0)*density*excitation*(0.24+0.42*entrainment*mixingTransport);
    let azure=vec3f(0.035,0.46,1.0)*density*excitation*middle*streamTransport*0.72;
    let pale=vec3f(0.60,0.88,1.0)*density*core*0.82;
    result+=(cobalt+azure+pale)*ds*0.18;
  }
  return result*axialFade*u.state.z*u.flags.x;
}
fn sourceCore(p:vec2f,a:vec4f)->vec3f {
  let q=(p-a.xy)/u.viewport.z;
  let r2=dot(q,q);
  if(r2>25.0){return vec3f(0.0);}
  let shell=(1.0-ramp(3.0,5.0,sqrt(r2)))*exp(-r2/5.2);
  return vec3f(1.10,1.65,2.85)*shell*u.state.z*u.flags.y;
}
@fragment fn fs(v:Vertex)->MRT {
  var out:MRT; out.world=vec4f(0.0); out.sources=vec4f(0.0);
  if(u.clock.z<0.5 || u.state.z<=0.0){return out;}
  let p=v.uv*u.viewport.xy;
  var radiance=vec3f(0.0);
  for(var i=0u;i<4u;i=i+1u){let a=source(i); radiance+=plume(p,a)+sourceCore(p,a);}
  // Optically-thin additive radiation: alpha is not plume density.
  out.world=vec4f(radiance,0.0); out.sources=vec4f(radiance,0.0); return out;
}
`;
export const POST_WGSL = ABI + /* wgsl */ `
@group(0) @binding(1) var worldRadiance:texture_2d<f32>;
@group(0) @binding(2) var sourceRadiance:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
fn emitted(uv:vec2f)->vec3f {
  // Explicit zero border, not clamped source replication at image edges.
  if(any(uv<vec2f(0.0)) || any(uv>vec2f(1.0))){return vec3f(0.0);}
  return textureSampleLevel(sourceRadiance,linearSampler,uv,0.0).rgb;
}
fn psf(uv:vec2f,sigma:f32)->vec3f {
  // Normalized finite separable Gaussian support, +/-2 sigma in both axes.
  // World-independent PSF acts only on source radiation; no backdrop blur.
  let pixel=vec2f(sigma*u.viewport.z)/u.viewport.xy;
  var sum=vec3f(0.0); var norm=0.0;
  for(var y=-2;y<=2;y=y+1){ for(var x=-2;x<=2;x=x+1){
    let w=exp(-0.5*f32(x*x+y*y));
    sum+=emitted(uv+vec2f(f32(x),f32(y))*pixel)*w; norm+=w;
  }}
  return sum/norm;
}
fn linearToSrgb(value:vec3f)->vec3f {
  return select(12.92*value,1.055*pow(max(value,vec3f(0.0)),vec3f(1.0/2.4))-vec3f(0.055),value>vec3f(0.0031308));
}
@fragment fn fs(v:Vertex)->@location(0) vec4f {
  let direct=textureSampleLevel(worldRadiance,linearSampler,v.uv,0.0).rgb;
  var response=direct;
  if(u.clock.z>0.5 && u.state.z>0.0){
    let scatter=u.optical.w;
    // Energy-conserving scattering: selected PSF redistributes a fraction.
    // OFF is the unblurred intervention, not a dimmer version.
    if(u.flags.z>0.5){response=mix(response,psf(v.uv,u.optical.y),0.065);}
    if(u.flags.w>0.5){response=mix(response,psf(v.uv,u.optical.z),scatter);}
  }
  let linear=(u.backdrop.rgb+response)*u.optical.x;
  // Canvas attachment clips values above display range naturally. No tone
  // mapping/exposure normalization is used to remove intentional white peaks.
  return vec4f(linearToSrgb(linear),1.0);
}
`;
