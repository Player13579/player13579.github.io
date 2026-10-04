// Authored blue jet volume + observer PSF, GPT-6.1-Sol, creative edition 8; explicit user extension 3/3; final allowed edition.
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
// Extinction affects E self-radiance only; no scene/background attenuation ABI.
fn plume(p:vec2f,a:vec4f)->vec3f {
  let d=axis(a.z); let n=vec2f(-d.y,d.x); let q=(p-a.xy)/u.viewport.z;
  let axial=dot(q,d); let lateral=dot(q,n);
  let fullLength=select(46.0,58.0,a.z>0.5); let L=fullLength*u.state.w;
  if(axial<0.0 || axial>L || L<=0.0){return vec3f(0.0);}
  let s=axial/max(L,0.001);
  let t=u.viewport.w*0.001;
  let reduced=select(1.0,0.24,u.clock.w>0.5);
  let phase=(axial-86.0*t)*0.28+a.w*1.41;
  let phase2=(axial-64.0*t)*0.18+a.w*2.07;
  // Pair-outward shear comes from actual registered source geometry. The
  // source itself stays exactly at a.xy; coincident projections get no fan.
  let pairCenter=select((u.a0.xy+u.a1.xy)*0.5,(u.a2.xy+u.a3.xy)*0.5,a.z>0.5);
  let sideCoordinate=dot((a.xy-pairCenter)/u.viewport.z,n);
  let outward=sideCoordinate/max(abs(sideCoordinate),0.25);
  let center=outward*5.0*s*s+0.55*s*s*sin(phase2)*reduced;
  // Compact continuous inlet; resolved convected lobes only after 8 units.
  let mixing=ramp(7.0,18.0,axial);
  let packet=0.5+0.5*sin(phase2);
  let taper=1.0-0.60*ramp(0.62,1.0,s);
  let radius=(1.25+5.1*ramp(0.06,0.60,s))*taper*(1.0-mixing*0.22+mixing*0.22*packet);
  let rel=lateral-center;
  if(abs(rel)>radius){return vec3f(0.0);}
  let axialFade=(1.0-ramp(0.76,1.0,s))*ramp(0.0,0.020,s+0.014);
  let ds=radius*2.0/12.0;
  var result=vec3f(0.0); var transmittance=1.0;
  for(var k=0u;k<12u;k=k+1u){
    let z=-radius+(f32(k)+0.5)*ds;
    let r=length(vec2f(rel,z))/radius;
    // Excited body has a finite shear boundary, not a Gaussian light blob.
    let density=pow(max(0.0,1.0-r*r),0.65)/(1.0+0.75*s);
    let core=exp(-pow(r/0.30,2.0))*exp(-3.0*s);
    let middle=(1.0-ramp(0.52,0.83,r))*ramp(0.13,0.33,r);
    let shear=exp(-pow((r-0.72)/0.13,2.0));
    let streamTransport=0.35+0.65*pow(0.5+0.5*sin(phase-r*1.1),2.0);
    let mixingTransport=0.25+0.75*packet;
    let excitation=exp(-s*1.10);
    let cobalt=vec3f(0.010,0.10,1.0)*density*excitation*shear*mixingTransport*0.48;
    let azure=vec3f(0.025,0.40,1.0)*density*excitation*middle*streamTransport*0.90;
    let pale=vec3f(0.65,0.90,1.0)*density*core*1.20;
    // Finite extinction and independent emissivity retain depth/boundary
    // contrast. This is a declared gas approximation, not measured plasma.
    let extinction=density*0.055;
    let segment=1.0-exp(-extinction*ds);
    result+=transmittance*(cobalt+azure+pale)*(segment/max(extinction,0.00001))*0.24;
    transmittance*=1.0-segment;
  }
  return result*axialFade*u.state.z*u.flags.x;
}
fn sourceCore(p:vec2f,a:vec4f)->vec3f {
  let q=(p-a.xy)/u.viewport.z;
  let r2=dot(q,q);
  if(r2>4.41){return vec3f(0.0);}
  let shell=(1.0-ramp(1.35,2.10,sqrt(r2)))*exp(-r2/1.20);
  return vec3f(3.0,4.7,8.0)*shell*u.state.z*u.flags.y;
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
