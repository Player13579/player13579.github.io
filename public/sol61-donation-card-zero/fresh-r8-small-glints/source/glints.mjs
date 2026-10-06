// R8 source-space facets; all coordinates are local coin units. No screen stars.
export const RAY_EXTENT=14;
export const RECONSTRUCTION_WIDTH=.65;
export const RECONSTRUCTION_FLOOR=.85;
export const GLINT_PATCHES=Object.freeze([
 [-5,-2.6,-.72,-.21],[-2.3,-5.2,-.30,.32],[2,-5.25,.41,-.43],
 [5,-2.6,.91,.14],[5.4,1.7,.23,.47],[2.6,5,-.54,.12],
 [-1.3,5.3,.11,-.17],[-4.7,3.3,-.40,.25],[-2.6,-1.2,.19,-.12],
 [1.8,-2.1,-.27,-.35],[2.65,1.7,.52,.18],[-1.55,2.65,-.15,.38],[0,.15,.06,-.08]
].map(Object.freeze));
export const patchRadius=j=>.44+.035*(j%3);
export function facetPulse(localAgeMs,coinIndex,j){
 const age=Math.max(0,localAgeMs/1000),cadence=.19+.009*j+.007*coinIndex;
 const phase=((age+.017*j*j+.013*coinIndex)/cadence)%1,duty=.19+.015*(j%3);
 return phase<duty?Math.sin(Math.PI*phase/duty)**2:0;
}
const vector=p=>`vec4f(${p.map(x=>Number.isInteger(x)?x+'.0':String(x)).join(',')})`;
export const GLINT_WGSL=/* wgsl */ `
fn surfaceGlints(hit:SurfaceHit,coin:vec4f,coinIndex:u32,v:vec3f,l:vec3f,baseReflection:vec3f)->vec3f {
  // Thirteen disjoint small minted facet regions. One hit can shade at most one.
  // Cheap squared-distance rejection precedes BRDF, pulse and sqrt evaluation.
  let patches=array<vec4f,13>(${GLINT_PATCHES.map(vector).join(',')});
  let cap=smoothstep(1.35,1.85,abs(hit.localPosition.z));
  let signZ=select(-1.0,1.0,hit.localPosition.z>=0.0);var radiance=vec3f(0.0);
  let releases=array<f32,5>(280.0,390.0,500.0,610.0,720.0);
  let age=max(0.0,(u.view.w-releases[coinIndex])/1000.0);
  let c=cos(coin.z);let s=sin(coin.z);
  for(var j=0u;j<13u;j=j+1u){
    let region=patches[j];let radius=0.44+0.035*f32(j%3u);
    let delta=hit.localPosition.xy-region.xy;let d2=dot(delta,delta);
    if(d2<radius*radius && cap>0.0){
      let mask=(1.0-smoothstep(radius*0.35,radius,sqrt(d2)))*cap;
      let localFacet=normalize(vec3f(region.z,region.w,signZ));
      let facet=vec3f(c*localFacet.x+s*localFacet.z,localFacet.y,-s*localFacet.x+c*localFacet.z);
      let facing=smoothstep(0.02,0.20,dot(facet,v));
      let reflection=goldReflection(facet,v,l,0.29+0.018*f32(j%4u),u.light.w);
      // Receipt-powered localized digital emission; conductor reflection remains
      // view/light bound. Higher small-area peaks preserve strong emission.
      let cadence=0.19+0.009*f32(j)+0.007*f32(coinIndex);
      let phase=fract((age+0.017*f32(j*j)+0.013*f32(coinIndex))/cadence);
      let duty=0.19+0.015*f32(j%3u);let wave=sin(3.14159265*phase/duty);
      let pulse=select(0.0,wave*wave,phase<duty);
      let digital=goldFresnel(max(0.0,dot(facet,v)))*(10.0+1.0*f32(j%4u))*pulse*facing;
      radiance+=(reflection-baseReflection+digital)*mask;
      break;
    }
  }
  return radiance*u.toggles.x;
}
`;
