const COMMON=/* wgsl */ `
struct U { view:vec4f, clock:vec4f, fold:vec4f, front:vec4f, amber:vec4f, warm:vec4f, coreColor:vec4f, projection:vec4f };
@group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) p:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
 let a=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var v:V;
 v.p=vec4f(a[i],0.,1.);v.uv=a[i]*vec2f(.5,-.5)+vec2f(.5);return v;
}
`;
export const WORLD_WGSL=COMMON+/* wgsl */ `
struct F { @location(0) main:vec4f, @location(1) source:vec4f };
// One target-anchored PH. These are internal energy-density folds, not blades,
// physical attackers, hit paths, death marks or independently damaging fields.
fn energy(p:vec3f)->vec3f {
 let ell=sqrt(p.x*p.x+p.y*p.y/.20+p.z*p.z/.56);
 let boundary=1.-smoothstep(.88,.94,length(p));
 var folds=0.;
 for(var k=0u;k<3u;k=k+1u){
  let r=.16+(u.fold.x-.16)*(.50+.25*f32(k));
  folds+=exp(-pow((ell-r)/.042,2.))*(1.+.15*p.z)*u.fold.y;
 }
 let q=p/vec3f(u.fold.z,u.fold.z*.53,u.fold.z*.76);
 let core=exp(-dot(q,q))*u.fold.w;
 let front=exp(-pow((ell-u.front.x)/.055,2.))*u.front.y*.72;
 return max(vec3f(0.),vec3f(folds,core,front)*boundary);
}
@fragment fn fs(v:V)->F {
 var o:F;o.main=vec4f(0.);o.source=vec4f(0.);
 if(u.clock.z<.5){return o;}
 let q=(v.p.xy-u.view.zw)/u.clock.x;
 if(any(abs(q)>vec2f(1.04))){return o;}
 var trans=1.;var rgb=vec3f(0.);var radiance=vec3f(0.);
 // Orthographic target-local volume. +y is up; symmetric compression does not
 // assume an unknown world sword/attack direction. E radius remains caller-owned.
 for(var i=0u;i<18u;i=i+1u){
  let z=.94-(f32(i)+.5)*(1.88/18.);
  let p=vec3f(q.x,(-q.y-u.projection.y*z)/u.projection.x,z);
  let e=energy(p);let rho=e.x*.85+e.y*.12+e.z*.55;
  let ds=(1.88/18.)*length(vec2f(1.,u.projection.y/u.projection.x));
  let alpha=1.-exp(-rho*ds*2.3);
  // Selected fictional energy medium: actual extinction and source radiance,
  // no conductor/water reflection shader or real heat/chemical claim.
  let emissive=u.amber.rgb*e.x*.95+u.coreColor.rgb*e.y*3.5+u.warm.rgb*e.z*.65;
  let absorbTint=mix(u.amber.rgb*.18,u.warm.rgb*.11,clamp(e.y*.25,0.,1.));
  let source=emissive*ds;
  rgb+=trans*(source+alpha*absorbTint);radiance+=trans*source;trans*=1.-alpha;
 }
 let sourceAlpha=1.-exp(-dot(radiance,vec3f(.2126,.7152,.0722))*.40);
 let alpha=max(1.-trans,sourceAlpha);
 o.main=vec4f(rgb,alpha);o.source=vec4f(radiance,0.);return o;
}
`;
export const OBSERVER_WGSL=COMMON+/* wgsl */ `
@group(0) @binding(1) var mainTexture:texture_2d<f32>;
@group(0) @binding(2) var sourceTexture:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
fn sourceAt(uv:vec2f)->vec3f {if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec3f(0.);}return textureSampleLevel(sourceTexture,linearSampler,uv,0.).rgb;}
fn encode(rgb:vec3f)->vec3f {return select(1.055*pow(max(rgb,vec3f(0.)),vec3f(1./2.4))-.055,rgb*12.92,rgb<=vec3f(.0031308));}
@fragment fn fs(v:V)->@location(0) vec4f {
 if(u.clock.z<.5){return vec4f(0.);}
 let main=textureSampleLevel(mainTexture,linearSampler,v.uv,0.);var halo=vec3f(0.);
 if(u.clock.w>.5){
  let spacing=max(.75,u.clock.x*.021)/u.view.xy;
  let offsets=array<vec2f,9>(vec2f(-1.,-1.),vec2f(0.,-1.),vec2f(1.,-1.),vec2f(-1.,0.),vec2f(0.),vec2f(1.,0.),vec2f(-1.,1.),vec2f(0.,1.),vec2f(1.,1.));
  let weights=array<f32,9>(1.,2.,1.,2.,4.,2.,1.,2.,1.);
  for(var i=0u;i<9u;i=i+1u){halo+=sourceAt(v.uv+offsets[i]*spacing)*weights[i]/16.;}
  halo*=u.front.w;
 }
 let a=main.a+(1.-main.a)*(1.-exp(-dot(halo,vec3f(.2126,.7152,.0722))*.4));
 if(a<.00001){return vec4f(0.);}
 // Preserve HDR upstream. The hue-preserving display shoulder is applied once
 // after world+source-bound OBS, not a lighting clamp or per-background gain.
 let straight=(main.rgb+halo)/a;let peak=max(max(straight.r,straight.g),straight.b);
 var mapped=peak;if(peak>.84){mapped=.84+.16*(peak-.84)/(peak-.84+.16);}
 let display=straight*mapped/max(peak,.000001);
 return vec4f(encode(display)*a,a);
}
`;
