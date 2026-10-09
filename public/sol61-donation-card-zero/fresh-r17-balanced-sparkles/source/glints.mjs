import {conductorReflection,unitVector} from './material.mjs';
// R17 final creative allowance: balanced, recurring cap facets and transfer glints.
export const RAY_EXTENT=8; // Existing broad card/receiver/material response unchanged.
export const LOCAL_RAY_EXTENT=4.1;
export const LOCAL_DECAY_SCALE=1.65;
export const LOCAL_TAIL_SCALE=2.2;
export const RECONSTRUCTION_WIDTH=.65;
export const RECONSTRUCTION_FLOOR=.85;
export const GLINT_PATCHES=Object.freeze([
 [5.55,.85,.12,.03],[3.45,4.25,-.07,.14],[-1.15,5.70,-.16,.02],
 [-5.10,2.65,-.08,-.13],[-4.25,-3.45,.13,-.09],[1.20,-5.55,.04,-.16]
].map(Object.freeze));
export const SURFACE_SOURCE_COUNT=6;
export const SPACE_SOURCE_COUNT=8;
export const SOURCE_SITE_COUNT=SURFACE_SOURCE_COUNT+SPACE_SOURCE_COUNT;
export const COIN_CAP_RADIUS=8;
export const SURFACE_PATCH_RADIUS=.60;
export const patchRadius=j=>SURFACE_PATCH_RADIUS;
const smooth01=x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);};
export function activeCoinCount(coins){return Math.max(1,coins.filter(c=>Number(c.alpha??c.w)>0).length);}
export function activeCoinGain(coins){return 1/Math.sqrt(activeCoinCount(coins));}
function pulse(ageMs,coinIndex,j,cadenceBase,cadenceSite,cadenceCoin,dutyBase,dutySite){
 const age=Math.max(0,ageMs/1000),cadence=cadenceBase+cadenceSite*(j%5)+cadenceCoin*coinIndex;
 const phase=((age+.127*j+.037*coinIndex)/cadence)%1,duty=dutyBase+dutySite*(j%4);
 return {value:phase<duty?Math.sin(Math.PI*phase/duty)**2:0,phase,cadence,duty,durationMs:cadence*duty*1000};
}
export function surfacePulse(ageMs,coinIndex,j){return pulse(ageMs,coinIndex,j,.31,.013,.009,.26,.025);}
export function spacePulse(ageMs,coinIndex,j){return pulse(ageMs,coinIndex,j,.22,.009,.007,.20,.025);}
export function facetPulse(localAgeMs,coinIndex,j){return surfacePulse(localAgeMs,coinIndex,j).value;}
const smoothstep=(a,b,x)=>smooth01((x-a)/(b-a));
export function sampleSurfaceGlint({localPosition,worldNormal,view=[0,0,1],light=[0.32,0.82,0.47],coinRotation=0,roughness=.24,lightIntensity=1.3,ageMs,coinIndex=0,coinAlpha=1,sourceOn=true,coins=[{alpha:coinAlpha}]}){
 const radius=Math.hypot(localPosition[0],localPosition[1]);if(radius>=COIN_CAP_RADIUS||Math.abs(localPosition[2])>1.85||coinAlpha<=0)return [];
 const nlen=Math.hypot(...worldNormal),vlen=Math.hypot(...view);if(nlen<=0||vlen<=0)return [];
 const facing=Math.max(0,worldNormal.reduce((s,x,i)=>s+x*view[i]/(nlen*vlen),0));
 const cap=smoothstep(1.35,1.85,Math.abs(localPosition[2])),gain=activeCoinGain(coins);
 return GLINT_PATCHES.map((site,j)=>{const d=Math.hypot(localPosition[0]-site[0],localPosition[1]-site[1]);const mask=d<SURFACE_PATCH_RADIUS?1-smoothstep(SURFACE_PATCH_RADIUS*.35,SURFACE_PATCH_RADIUS,d):0;const p=surfacePulse(ageMs,coinIndex,j),signZ=localPosition[2]>=0?1:-1,c=Math.cos(coinRotation),s=Math.sin(coinRotation);const raw=[site[2],site[3],signZ],facet=unitVector([c*raw[0]+s*raw[2],raw[1],-s*raw[0]+c*raw[2]]);const reflection=conductorReflection(facet,unitVector(view),unitVector(light),roughness,lightIntensity);const reflectedPeak=Math.max(...reflection);return {index:j,inside:d<SURFACE_PATCH_RADIUS&&cap>0,radius:SURFACE_PATCH_RADIUS,cap,mask,pulse:p.value,durationMs:p.durationMs,phase:p.phase,activeCoinGain:gain,reflection,reflectionDelta:reflectedPeak*mask*cap*gain*p.value,sourceRadiance:sourceOn?reflectedPeak*(72+8*(j%4))*mask*cap*facing*p.value*coinAlpha*gain:0};}).filter(s=>s.inside);
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
export const SCATTER_SITES=Object.freeze([[20,0,0,.50],[13.2,17.4,.86,.54],[-1.4,25.6,.18,.58],[-18.2,13.1,-.92,.53],[-24.2,-2.4,-.18,.50],[-14,-17,.96,.55],[2,-22.8,.34,.57],[17.4,-15.6,-.74,.52]].map(Object.freeze));
export const SCATTER_SUPPORT_RADIUS=38;
export const FACE_SOURCE_COUNT=SURFACE_SOURCE_COUNT;
export const SPACE_RADIANCE_GAIN=96;
export function sampleSpaceGlints(coin,view=[0,0,1],scale=1,sourceOn=true,coins=[coin]){
 const gain=activeCoinGain(coins);
 return SCATTER_SITES.map((site,j)=>{
  const moving=movingScatterSite(site,coin.localAgeMs,coin.index,j),offset=projectScatterSite(moving,view),p=spacePulse(coin.localAgeMs,coin.index,j+3),distance=Math.hypot(...moving),vlen=Math.hypot(...view);
  const cosine=-moving.reduce((sum,x,i)=>sum+x*view[i]/vlen,0)/distance,phaseFunction=.75*(1+cosine*cosine);
  const x=coin.x+offset[0]*scale,y=coin.y+offset[1]*scale;
  const clear=coins.every(c=>c.alpha<=0||Math.hypot(x-c.x,y-c.y)>12.5*scale);
  const travelGain=(1-smooth01((coin.localAgeMs-800)/250))*smooth01(coin.localAgeMs/100);
  return {index:j,x,y,radius:site[3]*scale,clear,travelGain,activeCoinGain:gain,
   sourceRadiance:sourceOn&&coin.alpha>0&&clear?SPACE_RADIANCE_GAIN*gain*p.value*coin.alpha*travelGain*(16.2/distance)**2*phaseFunction:0,pulse:p.value,durationMs:p.durationMs,phase:p.phase};
 });
}
export function projectScatterSite(site,view=[0,0,1]){
 const len=Math.hypot(...view),v=view.map(x=>x/len),rl=Math.hypot(v[2],v[0]);
 if(!Number.isFinite(len)||len<=0||rl<1e-6)throw new TypeError('valid camera direction');
 const right=[v[2]/rl,0,-v[0]/rl],up=[v[1]*right[2],v[2]*right[0]-v[0]*right[2],-v[1]*right[0]];
 return [site[0]*right[0]+site[2]*right[2],site[0]*up[0]+site[1]*up[1]+site[2]*up[2]];
}
// Medium packets drift relative to their moving coin; independent azimuths and
// radii avoid five identical rigid halos. They expire before intake convergence.
export function movingScatterSite(site,ageMs,coinIndex,j){
 const age=Math.max(0,ageMs/1000),turn=.73*age+.81*coinIndex;
 const radial=1+.09*Math.sin(2.4*age+.9*j+.4*coinIndex),c=Math.cos(turn),s=Math.sin(turn);
 return [(c*site[0]-s*site[1])*radial,(s*site[0]+c*site[1])*radial,site[2]+.65*Math.sin(1.7*age+j)];
}
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
export const SPACE_GLINT_WGSL=/* wgsl */ `
fn activeCoinSparkleGain()->f32 {
 var n=0.0;for(var i=0u;i<5u;i=i+1u){if(u.coins[i].w>0.0){n+=1.0;}}
 return inverseSqrt(max(1.0,n));
}
fn surroundingGlintRadiance(p:vec2f,coin:vec4f,coinIndex:u32)->vec3f {
 if(coin.w<=0.0 || u.toggles.x<0.5){return vec3f(0.0);}
 let sites=array<vec4f,8>(${SCATTER_SITES.map(vec).join(',')});
 let view=materialView();let right=normalize(cross(vec3f(0.0,1.0,0.0),view));let up=cross(view,right);
 let q=(p-coin.xy)/u.view.z;
 if(length(q)>${SCATTER_SUPPORT_RADIUS}){return vec3f(0.0);}
 // Exclude cores from every visible coin, not only the packet's owner.
 for(var k=0u;k<5u;k=k+1u){
  if(u.coins[k].w>0.0 && length((p-u.coins[k].xy)/u.view.z)<12.5){return vec3f(0.0);}
 }
 let releases=array<f32,5>(280.0,390.0,500.0,610.0,720.0);
 let localAge=u.view.w-releases[coinIndex];let age=max(0.0,localAge/1000.0);
 let travelGain=(1.0-smoothstep(800.0,1050.0,localAge))*smoothstep(0.0,100.0,localAge);
 let turn=0.73*age+0.81*f32(coinIndex);let c=cos(turn);let s=sin(turn);var outgoing=vec3f(0.0);
 let activeGain=activeCoinSparkleGain();
 for(var j=0u;j<8u;j=j+1u){
  let site=sites[j];let radial=1.0+0.09*sin(2.4*age+0.9*f32(j)+0.4*f32(coinIndex));
  let moving=vec3f((c*site.x-s*site.y)*radial,(s*site.x+c*site.y)*radial,site.z+0.65*sin(1.7*age+f32(j)));
  let projected=vec2f(dot(moving,right),dot(moving,up));let radius=site.w;let d=length(q-projected);
  if(d<radius){
   let mask=1.0-smoothstep(radius*0.35,radius,d);let sourceIndex=j+3u;
  let cadence=0.22+0.009*f32(sourceIndex%5u)+0.007*f32(coinIndex);
   let phase=fract((age+0.127*f32(sourceIndex)+0.037*f32(coinIndex))/cadence);
  let duty=0.20+0.025*f32(sourceIndex%4u);let wave=sin(3.14159265*phase/duty);
  let density=select(0.0,wave*wave,phase<duty);let cosine=dot(normalize(-moving),view);
   let phaseFunction=0.75*(1.0+cosine*cosine);let illumination=pow(16.2/length(moving),2.0);
   outgoing+=goldFresnel(1.0)*${SPACE_RADIANCE_GAIN}.0*activeGain*illumination*phaseFunction*density*mask*coin.w*travelGain;
  }
 }return outgoing;
}
`;
export const GLINT_WGSL=/* wgsl */ `
struct FacetSample { reflectionDelta:vec3f, emission:vec3f }
fn surfaceGlints(hit:SurfaceHit,coin:vec4f,coinIndex:u32,v:vec3f,l:vec3f,baseReflection:vec3f)->FacetSample {
 let patches=array<vec4f,6>(${GLINT_PATCHES.map(vec).join(',')});
 var out:FacetSample;out.reflectionDelta=vec3f(0.0);out.emission=vec3f(0.0);
 let cap=smoothstep(1.35,1.85,abs(hit.localPosition.z));
 let signZ=select(-1.0,1.0,hit.localPosition.z>=0.0);
 let releases=array<f32,5>(280.0,390.0,500.0,610.0,720.0);
 let age=max(0.0,(u.view.w-releases[coinIndex])/1000.0);
 let c=cos(coin.z);let s=sin(coin.z);
 let activeGain=activeCoinSparkleGain();
 for(var j=0u;j<6u;j=j+1u){
  let region=patches[j];let radius=0.60;
  let delta=hit.localPosition.xy-region.xy;let d2=dot(delta,delta);
  if(d2<radius*radius && cap>0.0){
   let mask=(1.0-smoothstep(radius*0.35,radius,sqrt(d2)))*cap;
   let localFacet=normalize(vec3f(region.z,region.w,signZ));
   let facet=vec3f(c*localFacet.x+s*localFacet.z,localFacet.y,-s*localFacet.x+c*localFacet.z);
   let reflection=goldReflection(facet,v,l,0.29+0.018*f32(j%4u),u.light.w);
   // Emission follows the actual visible cap normal; tiny selected BRDF facet
   // normals are not treated as an unrelated emitter orientation.
   let facing=smoothstep(0.02,0.18,dot(hit.worldNormal,v));
   let cadence=0.31+0.013*f32(j%5u)+0.009*f32(coinIndex);
   let phase=fract((age+0.127*f32(j)+0.037*f32(coinIndex))/cadence);
   let duty=0.26+0.025*f32(j%4u);let wave=sin(3.14159265*phase/duty);
   let pulse=select(0.0,wave*wave,phase<duty);
   let digital=reflection*(72.0+8.0*f32(j%4u))*activeGain*pulse*facing;
   out.reflectionDelta=(reflection-baseReflection)*mask*activeGain*pulse;
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
