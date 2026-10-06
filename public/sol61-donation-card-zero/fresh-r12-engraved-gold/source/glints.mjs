// R11 final 5/5: short visible source-bound optical glints, no polygon/star symbols.
export const RAY_EXTENT=8; // Existing broad card/receiver/material response unchanged.
export const LOCAL_RAY_EXTENT=4.1;
export const LOCAL_DECAY_SCALE=1.65;
export const LOCAL_TAIL_SCALE=2.2;
export const RECONSTRUCTION_WIDTH=.65;
export const RECONSTRUCTION_FLOOR=.85;
export const GLINT_PATCHES=Object.freeze([
 [
  0.86447,
  0.18425,
  0.0389,
  0.04829
 ],
 [
  -1.31964,
  0.77609,
  -0.01972,
  0.04562
 ],
 [
  0.57942,
  -1.88958,
  0.01585,
  -0.11931
 ],
 [
  1.00472,
  2.1117,
  0.00818,
  0.06599
 ],
 [
  -2.45747,
  -0.99604,
  -0.09082,
  -0.02608
 ],
 [
  2.74713,
  -1.02324,
  0.15556,
  -0.00698
 ],
 [
  -1.45072,
  2.83755,
  -0.09328,
  0.12985
 ],
 [
  -0.90985,
  -3.30014,
  -0.06567,
  -0.18642
 ],
 [
  3.0874,
  1.93629,
  0.1733,
  0.06469
 ],
 [
  -3.78949,
  0.69537,
  -0.15466,
  0.0572
 ],
 [
  2.44382,
  -3.23017,
  0.07152,
  -0.10906
 ],
 [
  0.39763,
  4.22027,
  0.01193,
  0.18343
 ],
 [
  -3.27779,
  -2.96434,
  -0.10751,
  -0.17316
 ],
 [
  4.5927,
  -0.02941,
  0.20233,
  -0.01611
 ],
 [
  -3.48911,
  3.23765,
  -0.19588,
  0.17755
 ],
 [
  0.39884,
  -4.90507,
  0.03231,
  -0.1889
 ],
 [
  3.11511,
  4.00966,
  0.17535,
  0.16561
 ],
 [
  -5.15492,
  -0.87782,
  -0.2554,
  -0.07927
 ],
 [
  4.51784,
  -2.91469,
  0.17417,
  -0.13761
 ],
 [
  -1.39881,
  5.33967,
  -0.03201,
  0.2766
 ],
 [
  -2.64067,
  -5.00581,
  -0.09767,
  -0.19938
 ],
 [
  5.45694,
  1.95335,
  0.20918,
  0.06543
 ],
 [
  -5.46609,
  2.29741,
  -0.25776,
  0.06549
 ],
 [
  2.53313,
  -5.50472,
  0.15342,
  -0.24552
 ],
 [
  1.8895,
  5.89161,
  0.08666,
  0.30419
 ]
].map(Object.freeze));
export const patchRadius=j=>.58+.03*(j%3);
export function facetPulse(localAgeMs,coinIndex,j){
 const age=Math.max(0,localAgeMs/1000),cadence=.185+.007*(j%7)+.011*coinIndex;
 const phase=((age+.127*j+.037*coinIndex)/cadence)%1,duty=.36+.025*(j%4);
 return phase<duty?Math.sin(Math.PI*phase/duty)**2:0;
}
export function glintSupportContains(p,coins,scale,rayExtent=LOCAL_RAY_EXTENT,nearOn=true,rayOn=true){
 if(!rayOn&&!nearOn)return false;
 const b=9.2*scale+(rayOn?rayExtent*scale:0)+(nearOn?Math.max(.6,.30*scale):0)+2;
 return coins.some(c=>c.alpha>0&&Math.abs(p.x-c.x)<=b&&Math.abs(p.y-c.y)<=b);
}
const vec=p=>`vec4f(${p.map(x=>Number.isInteger(x)?x+'.0':String(x)).join(',')})`;
export const GLINT_WGSL=/* wgsl */ `
struct FacetSample { reflectionDelta:vec3f, emission:vec3f }
fn surfaceGlints(hit:SurfaceHit,coin:vec4f,coinIndex:u32,v:vec3f,l:vec3f,baseReflection:vec3f)->FacetSample {
 let patches=array<vec4f,25>(${GLINT_PATCHES.map(vec).join(',')});
 var out:FacetSample;out.reflectionDelta=vec3f(0.0);out.emission=vec3f(0.0);
 let cap=smoothstep(1.35,1.85,abs(hit.localPosition.z));
 let signZ=select(-1.0,1.0,hit.localPosition.z>=0.0);
 let releases=array<f32,5>(280.0,390.0,500.0,610.0,720.0);
 let age=max(0.0,(u.view.w-releases[coinIndex])/1000.0);
 let c=cos(coin.z);let s=sin(coin.z);
 for(var j=0u;j<25u;j=j+1u){
  let region=patches[j];let radius=0.58+0.03*f32(j%3u);
  let delta=hit.localPosition.xy-region.xy;let d2=dot(delta,delta);
  if(d2<radius*radius && cap>0.0){
   let mask=(1.0-smoothstep(radius*0.35,radius,sqrt(d2)))*cap;
   let localFacet=normalize(vec3f(region.z,region.w,signZ));
   let facet=vec3f(c*localFacet.x+s*localFacet.z,localFacet.y,-s*localFacet.x+c*localFacet.z);
   let reflection=goldReflection(facet,v,l,0.29+0.018*f32(j%4u),u.light.w);
   // Emission follows the actual visible cap normal; tiny selected BRDF facet
   // normals are not treated as an unrelated emitter orientation.
   let facing=smoothstep(0.02,0.18,dot(hit.worldNormal,v));
   let cadence=0.185+0.007*f32(j%7u)+0.011*f32(coinIndex);
   let phase=fract((age+0.127*f32(j)+0.037*f32(coinIndex))/cadence);
   let duty=0.36+0.025*f32(j%4u);let wave=sin(3.14159265*phase/duty);
   let pulse=select(0.0,wave*wave,phase<duty);
   let digital=goldFresnel(1.0)*(72.0+8.0*f32(j%4u))*pulse*facing;
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
 let radius=9.2*u.view.z+select(0.0,${LOCAL_RAY_EXTENT}*u.view.z,rays)+select(0.0,max(0.6,0.30*u.view.z),near)+2.0;
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
   let along=f32(k)*${LOCAL_RAY_EXTENT}/16.0;
   let weight=exp(-abs(along)/${LOCAL_DECAY_SCALE})/(1.0+pow(along/${LOCAL_TAIL_SCALE},2.0));
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
