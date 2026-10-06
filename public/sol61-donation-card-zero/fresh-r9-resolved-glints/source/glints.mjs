// R9 adequately sampled surface clusters, not screen symbols or detached particles.
export const RAY_EXTENT=8;
export const RECONSTRUCTION_WIDTH=.65;
export const RECONSTRUCTION_FLOOR=.85;
export const GLINT_PATCHES=Object.freeze([
 [6.1,0,.32,.05],[3.05,5.28,.16,.30],[-3.05,5.28,-.22,.28],
 [-6.1,0,-.35,-.03],[-3.05,-5.28,-.18,-.32],[3.05,-5.28,.25,-.28],
 [2.35,0,.20,.03],[-1.175,2.035,-.14,.19],[-1.175,-2.035,-.12,-.18]
].map(Object.freeze));
export const patchRadius=j=>.66+.035*(j%3);
export function facetPulse(localAgeMs,coinIndex,j){
 const age=Math.max(0,localAgeMs/1000),cadence=.24+.006*j+.008*coinIndex;
 const phase=((age+.043*j+.029*coinIndex)/cadence)%1,duty=.46+.02*(j%3);
 return phase<duty?Math.sin(Math.PI*phase/duty)**2:0;
}
export function glintSupportContains(p,coins,scale,rayExtent=8,nearOn=true,rayOn=true){
 if(!rayOn&&!nearOn)return false;
 const b=9.2*scale+(rayOn?rayExtent*scale:0)+(nearOn?Math.max(.6,.30*scale):0)+2;
 return coins.some(c=>c.alpha>0&&Math.abs(p.x-c.x)<=b&&Math.abs(p.y-c.y)<=b);
}
const vec=p=>`vec4f(${p.map(x=>Number.isInteger(x)?x+'.0':String(x)).join(',')})`;
export const GLINT_WGSL=/* wgsl */ `
struct FacetSample { reflectionDelta:vec3f, emission:vec3f }
fn surfaceGlints(hit:SurfaceHit,coin:vec4f,coinIndex:u32,v:vec3f,l:vec3f,baseReflection:vec3f)->FacetSample {
 let patches=array<vec4f,9>(${GLINT_PATCHES.map(vec).join(',')});
 var out:FacetSample;out.reflectionDelta=vec3f(0.0);out.emission=vec3f(0.0);
 let cap=smoothstep(1.35,1.85,abs(hit.localPosition.z));
 let signZ=select(-1.0,1.0,hit.localPosition.z>=0.0);
 let releases=array<f32,5>(280.0,390.0,500.0,610.0,720.0);
 let age=max(0.0,(u.view.w-releases[coinIndex])/1000.0);
 let c=cos(coin.z);let s=sin(coin.z);
 for(var j=0u;j<9u;j=j+1u){
  let region=patches[j];let radius=0.66+0.035*f32(j%3u);
  let delta=hit.localPosition.xy-region.xy;let d2=dot(delta,delta);
  if(d2<radius*radius && cap>0.0){
   let mask=(1.0-smoothstep(radius*0.35,radius,sqrt(d2)))*cap;
   let localFacet=normalize(vec3f(region.z,region.w,signZ));
   let facet=vec3f(c*localFacet.x+s*localFacet.z,localFacet.y,-s*localFacet.x+c*localFacet.z);
   let reflection=goldReflection(facet,v,l,0.29+0.018*f32(j%4u),u.light.w);
   // Emission follows the actual visible cap normal; tiny selected BRDF facet
   // normals are not treated as an unrelated emitter orientation.
   let facing=smoothstep(0.02,0.18,dot(hit.worldNormal,v));
   let cadence=0.24+0.006*f32(j)+0.008*f32(coinIndex);
   let phase=fract((age+0.043*f32(j)+0.029*f32(coinIndex))/cadence);
   let duty=0.46+0.02*f32(j%3u);let wave=sin(3.14159265*phase/duty);
   let pulse=select(0.0,wave*wave,phase<duty);
   let digital=goldFresnel(1.0)*(24.0+3.0*f32(j%4u))*pulse*facing;
   out.reflectionDelta=(reflection-baseReflection)*mask*u.toggles.x;
   out.emission=digital*mask*u.toggles.x;
   break;
  }
 }
 return out;
}
`;
export const GLINT_OPTICS_WGSL=/* wgsl */ `
@group(0) @binding(5) var glintRadiators:texture_2d<f32>;
fn glintSource(uv:vec2f)->vec3f {
 if(any(uv<vec2f(0.0)) || any(uv>vec2f(1.0))){return vec3f(0.0);}
 return textureSampleLevel(glintRadiators,linearSampler,uv,0.0).rgb;
}
fn inGlintSupport(p:vec2f)->bool {
 let rays=u.optics.z>0.0;let near=u.toggles.z>0.5;
 if(!rays && !near){return false;}
 let radius=9.2*u.view.z+select(0.0,u.optics.y*u.view.z,rays)+select(0.0,max(0.6,0.30*u.view.z),near)+2.0;
 for(var i=0u;i<5u;i=i+1u){
  if(u.coins[i].w>0.0 && all(abs(p-u.coins[i].xy)<=vec2f(radius))){return true;}
 }
 return false;
}
fn glintNearResponse(uv:vec2f)->vec3f {
 let step=vec2f(max(0.6,0.30*u.view.z))/u.view.xy;var sum=vec3f(0.0);var total=0.0;
 for(var y=-1;y<=1;y=y+1){for(var x=-1;x<=1;x=x+1){
  let weight=exp(-0.5*f32(x*x+y*y));total+=weight;
  sum+=glintSource(uv+vec2f(f32(x),f32(y))*step)*weight;
 }}return sum/total;
}
fn glintCrossResponse(uv:vec2f)->vec3f {
 // Same observer/pupil orientation and normalized continuous decay as broad
 // sources. Full-resolution source sampling retains distinct small peaks.
 let a=u.optics.w;let axis0=vec2f(sin(a),-cos(a));let axis1=vec2f(cos(a),sin(a));
 var sum=vec3f(0.0);var total=0.0;
 for(var axis=0u;axis<2u;axis=axis+1u){
  let direction=select(axis0,axis1,axis>0u);
  for(var k=-16;k<=16;k=k+1){
   let along=f32(k)*u.optics.y/16.0;
   let weight=exp(-abs(along)/2.3)/(1.0+pow(along/3.1,2.0));
   sum+=glintSource(uv+direction*along*u.view.z/u.view.xy)*weight;total+=weight;
  }
 }return sum/total;
}
fn localGlintCorrection(uv:vec2f,nearFraction:f32,rayFraction:f32)->vec3f {
 // Expensive PSF evaluated once per covered pixel, shared across every local
 // source. Five cheap support tests, no whole optical convolution per facet.
 if(!inGlintSupport(uv*u.view.xy)){return vec3f(0.0);}
 var sum=vec3f(0.0);
 if(nearFraction>0.0){sum+=glintNearResponse(uv)*nearFraction;}
 if(rayFraction>0.0){sum+=glintCrossResponse(uv)*rayFraction;}
 return sum;
}
`;
