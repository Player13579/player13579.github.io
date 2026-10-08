// R12 supplemental ONE user-directed placement: three face glints, most in adjacent space.
// Historical R11/R12 sources remain immutable inputs; no general cap reset.
export const RAY_EXTENT=8; // Existing broad card/receiver/material response unchanged.
export const LOCAL_RAY_EXTENT=4.1;
export const LOCAL_DECAY_SCALE=1.65;
export const LOCAL_TAIL_SCALE=2.2;
export const RECONSTRUCTION_WIDTH=.65;
export const RECONSTRUCTION_FLOOR=.85;
export const GLINT_PATCHES=Object.freeze([[5.965017, 2.177401, 0.07515, 0.027432], [-4.850227, 4.098512, -0.061105, 0.051635], [-1.089256, -6.255879, -0.013723, -0.078814]].map(Object.freeze));
export const patchRadius=j=>.48;
export function facetPulse(localAgeMs,coinIndex,j){
 const age=Math.max(0,localAgeMs/1000),cadence=.185+.007*(j%7)+.011*coinIndex;
 const phase=((age+.127*j+.037*coinIndex)/cadence)%1,duty=.36+.025*(j%4);
 return phase<duty?Math.sin(Math.PI*phase/duty)**2:0;
}
export function glintSupportContains(p,coins,scale,rayExtent=LOCAL_RAY_EXTENT,nearOn=true,rayOn=true){
 if(!rayOn&&!nearOn)return false;
 const b=SCATTER_SUPPORT_RADIUS*scale+(rayOn?rayExtent*scale:0)+(nearOn?Math.max(.6,.30*scale):0)+2;
 return coins.some(c=>c.alpha>0&&Math.abs(p.x-c.x)<=b&&Math.abs(p.y-c.y)<=b);
}
const vec=p=>`vec4f(${p.map(x=>Number.isInteger(x)?x+'.0':String(x)).join(',')})`;

// Source sites are compact density packets in the semantic payment-transfer
// medium. They move with the coin center, not with a screen-fixed decoration.
// Coin receipt emission illuminates those packets; crossed arms exist only in
// the observer convolution. WORLD contains smooth compact cores, no star SDF.
export const SCATTER_SITES=Object.freeze([[15.908469, 3.059514, 0.667657, 0.5], [14.52866, 9.574865, 1.654102, 0.54], [10.431595, 15.39941, 1.671596, 0.58], [3.986015, 19.39463, 0.709892, 0.5], [-3.059514, 15.908469, -0.667657, 0.54], [-9.574865, 14.52866, -1.654102, 0.58], [-15.39941, 10.431595, -1.671596, 0.5], [-19.39463, 3.986015, -0.709892, 0.54], [-15.908469, -3.059514, 0.667657, 0.58], [-14.52866, -9.574865, 1.654102, 0.5], [-10.431595, -15.39941, 1.671596, 0.54], [-3.986015, -19.39463, 0.709892, 0.58], [3.059514, -15.908469, -0.667657, 0.5], [9.574865, -14.52866, -1.654102, 0.54], [15.39941, -10.431595, -1.671596, 0.58], [19.39463, -3.986015, -0.709892, 0.5]].map(Object.freeze));
export const SCATTER_SUPPORT_RADIUS=21.5;
export const FACE_SOURCE_COUNT=3;
export const SPACE_SOURCE_COUNT=16;
export const SPACE_RADIANCE_GAIN=96;
export function projectScatterSite(site,view=[0,0,1]){
 const len=Math.hypot(...view),v=view.map(x=>x/len),rl=Math.hypot(v[2],v[0]);
 if(!Number.isFinite(len)||len<=0||rl<1e-6)throw new TypeError('valid camera direction');
 const right=[v[2]/rl,0,-v[0]/rl],up=[v[1]*right[2],v[2]*right[0]-v[0]*right[2],-v[1]*right[0]];
 return [site[0]*right[0]+site[2]*right[2],site[0]*up[0]+site[1]*up[1]+site[2]*up[2]];
}
export function sampleSpaceGlints(coin,view=[0,0,1],scale=1,sourceOn=true){
 return SCATTER_SITES.map((site,j)=>{
  const offset=projectScatterSite(site,view),pulse=facetPulse(coin.localAgeMs,coin.index,j+3),distance=Math.hypot(...site.slice(0,3)),vlen=Math.hypot(...view);
  const cosine=-site.slice(0,3).reduce((sum,x,i)=>sum+x*view[i]/vlen,0)/distance,phaseFunction=.75*(1+cosine*cosine);
  return {index:j,x:coin.x+offset[0]*scale,y:coin.y+offset[1]*scale,radius:site[3]*scale,
   sourceRadiance:sourceOn&&coin.alpha>0?SPACE_RADIANCE_GAIN*pulse*coin.alpha*(16.2/distance)**2*phaseFunction:0,pulse};
 });
}
export const SPACE_GLINT_WGSL=/* wgsl */ `
fn surroundingGlintRadiance(p:vec2f,coin:vec4f,coinIndex:u32)->vec3f {
 if(coin.w<=0.0 || u.toggles.x<0.5){return vec3f(0.0);}
 let sites=array<vec4f,16>(${SCATTER_SITES.map(vec).join(',')});
 let view=materialView();let right=normalize(cross(vec3f(0.0,1.0,0.0),view));let up=cross(view,right);
 let q=(p-coin.xy)/u.view.z;
 if(length(q)>${SCATTER_SUPPORT_RADIUS}){return vec3f(0.0);}
 let releases=array<f32,5>(280.0,390.0,500.0,610.0,720.0);
 let age=max(0.0,(u.view.w-releases[coinIndex])/1000.0);var outgoing=vec3f(0.0);
 for(var j=0u;j<16u;j=j+1u){
  let site=sites[j];let projected=vec2f(dot(site.xyz,right),dot(site.xyz,up));
  let radius=site.w;let d=length(q-projected);
  if(d<radius){
   let mask=1.0-smoothstep(radius*0.35,radius,d);
   let sourceIndex=j+3u;
   let cadence=0.185+0.007*f32(sourceIndex%7u)+0.011*f32(coinIndex);
   let phase=fract((age+0.127*f32(sourceIndex)+0.037*f32(coinIndex))/cadence);
   let duty=0.36+0.025*f32(sourceIndex%4u);let wave=sin(3.14159265*phase/duty);
   let density=select(0.0,wave*wave,phase<duty);
   // Inverse-square coin-to-packet illumination and a normalized dipole
   // scattering phase. It is the declared virtual payment medium, not sparks
   // made of solid gold or unrelated autonomous lights in a vacuum.
   let incident=normalize(-site.xyz);let cosine=dot(incident,view);
   let phaseFunction=0.75*(1.0+cosine*cosine);
   let illumination=pow(16.2/length(site.xyz),2.0);
   outgoing+=goldFresnel(1.0)*${SPACE_RADIANCE_GAIN}.0*illumination*phaseFunction*density*mask*coin.w;
  }
 }
 return outgoing;
}
`;
export const GLINT_WGSL=/* wgsl */ `
struct FacetSample { reflectionDelta:vec3f, emission:vec3f }
fn surfaceGlints(hit:SurfaceHit,coin:vec4f,coinIndex:u32,v:vec3f,l:vec3f,baseReflection:vec3f)->FacetSample {
 let patches=array<vec4f,3>(${GLINT_PATCHES.map(vec).join(',')});
 var out:FacetSample;out.reflectionDelta=vec3f(0.0);out.emission=vec3f(0.0);
 let cap=smoothstep(1.35,1.85,abs(hit.localPosition.z));
 let signZ=select(-1.0,1.0,hit.localPosition.z>=0.0);
 let releases=array<f32,5>(280.0,390.0,500.0,610.0,720.0);
 let age=max(0.0,(u.view.w-releases[coinIndex])/1000.0);
 let c=cos(coin.z);let s=sin(coin.z);
 for(var j=0u;j<3u;j=j+1u){
  let region=patches[j];let radius=0.48;
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
 let radius=${SCATTER_SUPPORT_RADIUS}*u.view.z+select(0.0,${LOCAL_RAY_EXTENT}*u.view.z,rays)+select(0.0,max(0.6,0.30*u.view.z),near)+2.0;
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
