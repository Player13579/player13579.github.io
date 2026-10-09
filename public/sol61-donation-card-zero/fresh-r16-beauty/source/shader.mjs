import {ENGRAVING_WGSL} from './engraving.mjs';
import {MATERIAL_WGSL} from './material.mjs';
import {GLINT_WGSL,GLINT_OPTICS_WGSL,RECONSTRUCTION_WIDTH,RECONSTRUCTION_FLOOR,SPACE_GLINT_WGSL} from './glints.mjs';
// R16 coherent metallic relief and source-normalized optics; flower/hex retained;
// two perimeter sites and twelve drifting medium sites remain independent.
// Physical source visibility remains in WORLD; OBS acts over detector pixels.
// Gold conductor, trajectories and six-pass causal observer pipeline remain.
// Creative ABI: thirteen vec4f = 208 bytes; caller submits the pinned planner.
const COMMON = /* wgsl */ `
struct Params {
  view:vec4f, state:vec4f, card:vec4f, result:vec4f,
  coins:array<vec4f,5>, optics:vec4f, toggles:vec4f, light:vec4f, backdrop:vec4f
}
@group(0) @binding(0) var<uniform> u:Params;
struct ScreenVertex { @builtin(position) p:vec4f, @location(0) uv:vec2f }
@vertex fn vs(@builtin(vertex_index) i:u32)->ScreenVertex {
  let corners=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
  var v:ScreenVertex;v.p=vec4f(corners[i],0.0,1.0);
  v.uv=vec2f((corners[i].x+1.0)*0.5,(1.0-corners[i].y)*0.5);return v;
}
fn ease(a:f32,b:f32,x:f32)->f32 {return smoothstep(a,b,x);}
`;
export const WORLD_WGSL=COMMON+MATERIAL_WGSL+ENGRAVING_WGSL+/* wgsl */ `
struct Outputs { @location(0) world:vec4f, @location(1) source:vec4f, @location(2) glint:vec4f }
struct MetalSample { rgb:vec3f, observerRadiance:vec3f, glintRadiance:vec3f, coverage:f32 }
struct SurfaceHit { worldNormal:vec3f, localPosition:vec3f, found:f32 }
fn roundedBox(p:vec2f,b:vec2f,r:f32)->f32 {
  let q=abs(p)-b+vec2f(r);return length(max(q,vec2f(0.0)))+min(max(q.x,q.y),0.0)-r;
}
// Rounded minted cap/rim/side: outer radius 8, base half depth 1.6,
// bevel .65. Four subpixel rays integrate silhouette coverage at display size.
fn coinDistance(p:vec3f,radius:f32,halfDepth:f32)->f32 {
  let bevel=0.65;let radial=length(p.xy);
  // Shallow minted cap: broad convex field and one raised circular shoulder.
  // This alters the hit surface and finite-difference normal, not a decal.
  let capDome=0.68*max(0.0,1.0-pow(radial/radius,2.0));
  let shoulder=0.16*exp(-pow((radial-6.5)/0.55,2.0));
  let engraving=engravingDepth(p.xy);
  let capDepth=halfDepth+capDome+shoulder-engraving;
  let marchSafety=mix(1.25,4.80,smoothstep(0.0,0.01,engraving));
  let d=vec2f(radial-(radius-bevel),abs(p.z)-(capDepth-bevel));
  return (length(max(d,vec2f(0.0)))+min(max(d.x,d.y),0.0)-bevel)/marchSafety;
}
fn cylinderHit(q:vec2f,angle:f32,radius:f32,halfDepth:f32)->SurfaceHit {
  var hit:SurfaceHit;hit.worldNormal=vec3f(0.0);hit.localPosition=vec3f(0.0);hit.found=0.0;
  let c=cos(angle);let s=sin(angle);
  let view=materialView();let right=normalize(cross(vec3f(0.0,1.0,0.0),view));let up=cross(view,right);
  let worldOrigin=right*q.x+up*q.y+view*16.0;let worldRay=-view;
  // Inverse rigid coin rotation; the silhouette ray and BRDF share this eye.
  let origin=vec3f(c*worldOrigin.x-s*worldOrigin.z,worldOrigin.y,s*worldOrigin.x+c*worldOrigin.z);
  let ray=vec3f(c*worldRay.x-s*worldRay.z,worldRay.y,s*worldRay.x+c*worldRay.z);var t=0.0;var at=origin;var found=false;
  // Deep relief at tilted grazing views can converge slowly; extra tail steps
  // retain the same subpixel hit tolerance, rather than flattening the groove.
  for(var step=0u;step<192u;step=step+1u){
    at=origin+ray*t;let d=coinDistance(at,radius,halfDepth);
    if(d<0.005){found=true;break;}
    t+=max(d,0.005);if(t>32.0){break;}
  }
  if(!found){return hit;}
  let e=0.01;
  let normal=normalize(vec3f(
    coinDistance(at+vec3f(e,0.0,0.0),radius,halfDepth)-coinDistance(at-vec3f(e,0.0,0.0),radius,halfDepth),
    coinDistance(at+vec3f(0.0,e,0.0),radius,halfDepth)-coinDistance(at-vec3f(0.0,e,0.0),radius,halfDepth),
    coinDistance(at+vec3f(0.0,0.0,e),radius,halfDepth)-coinDistance(at-vec3f(0.0,0.0,e),radius,halfDepth)));
  let worldNormal=vec3f(c*normal.x+s*normal.z,normal.y,-s*normal.x+c*normal.z);
  hit.worldNormal=worldNormal;hit.localPosition=at;hit.found=1.0;return hit;
}
${GLINT_WGSL}
${SPACE_GLINT_WGSL}
fn goldRay(p:vec2f,coin:vec4f,coinIndex:u32)->MetalSample {
  var out:MetalSample;out.rgb=vec3f(0.0);out.observerRadiance=vec3f(0.0);out.glintRadiance=vec3f(0.0);out.coverage=0.0;
  if(coin.w<=0.0){return out;}
  let q=(p-coin.xy)/u.view.z;let radius=8.0;let halfDepth=1.6;
  if(length(q)>9.2){return out;}
  let hit=cylinderHit(q,coin.z,radius,halfDepth);
  if(hit.found<0.5){return out;}
  let n=hit.worldNormal;let l=normalize(u.light.xyz);let v=materialView();let nv=max(0.0,dot(n,v));
  let localNormalZ=sin(coin.z)*n.x+cos(coin.z)*n.z;
  // The engraved geometry and its actual hit normal provide metallic relief.
  // No pattern-only dark cavity multiplier or forced matte groove finish.
  let roughness=goldSurfaceRoughness(u.backdrop.w,localNormalZ);
  let reflected=goldReflection(n,v,l,roughness,u.light.w)*u.toggles.x;
  // Receipt-driven digital body emission is separate from reflected highlights.
  // Bright moving sparkles arise from actual curved-metal BRDF maxima; the
  // compact continuous optical kernel spreads their outgoing radiance.
  // Digital body emission is modest; high radiance is concentrated in recurrent
  // surface events above, so moving reflective bands can be read on the cap.
  let emissive=goldFresnel(1.0)*0.10*u.toggles.x;
  let glints=surfaceGlints(hit,coin,coinIndex,v,l,reflected);
  let ambient=goldStudioEnvironment(n,v,roughness,u.light.w);
  // Passive broad environment material support remains in world; selected
  // active E illumination and emission feed the source-bound observer field.
  out.coverage=coin.w;// Broad polished metal is reflected material, not an array of optical emitters.
  out.observerRadiance=vec3f(0.0);
  out.glintRadiance=glints.emission*coin.w;
  out.rgb=(ambient+reflected+glints.reflectionDelta+emissive+glints.emission)*coin.w;return out;
}
fn goldCoin(p:vec2f,coin:vec4f,coinIndex:u32)->MetalSample {
  var out:MetalSample;out.rgb=vec3f(0.0);out.observerRadiance=vec3f(0.0);out.glintRadiance=vec3f(0.0);out.coverage=0.0;
  if(coin.w<=0.0){return out;}
  let screenBound=9.2*u.view.z+0.3535534;
  let coordinateMagnitude=max(max(abs(p.x),abs(p.y)),max(abs(coin.x),abs(coin.y)));
  let fpSlack=0.01+0.000002*(coordinateMagnitude+abs(screenBound));
  let conservativeBound=screenBound+fpSlack;
  let centerDelta=p-coin.xy;
  if(dot(centerDelta,centerDelta)>conservativeBound*conservativeBound){return out;}
  for(var y=0u;y<2u;y=y+1u){for(var x=0u;x<2u;x=x+1u){
    let offset=vec2f(f32(x)*0.5-0.25,f32(y)*0.5-0.25);
    let rayMaterial=goldRay(p+offset,coin,coinIndex);out.rgb+=rayMaterial.rgb*0.25;
    out.observerRadiance+=rayMaterial.observerRadiance*0.25;out.glintRadiance+=rayMaterial.glintRadiance*0.25;out.coverage+=rayMaterial.coverage*0.25;
  }}return out;
}
@fragment fn fs(v:ScreenVertex)->Outputs {
  let p=v.uv*u.view.xy;var out:Outputs;
  out.world=vec4f(u.backdrop.rgb,1.0);out.source=vec4f(0.0);out.glint=vec4f(0.0);
  if(u.state.x<0.5 || u.toggles.w<0.5){return out;}
  var rgb=u.backdrop.rgb;var sources=vec3f(0.0);var glintSources=vec3f(0.0);var metalCoverage=0.0;
  // Opaque card, receiver, later coins and receiver lip occlude this transfer
  // medium through the same WORLD/source compositing masks.
  for(var i=0u;i<5u;i=i+1u){glintSources+=surroundingGlintRadiance(p,u.coins[i],i);}
  rgb+=glintSources;
  if(u.state.y>0.0 && u.toggles.y>0.5){
    let q=(p-u.card.xy)/u.view.z;let sd=roundedBox(q,u.card.zw,3.0);
    let aa=max(0.25,0.70/u.view.z);let cover=(1.0-ease(-aa,aa,sd))*u.state.y;
    let upper=clamp(q.y/max(u.card.w,0.001),-1.0,1.0);
    let albedo=mix(vec3f(0.026,0.080,0.14),vec3f(0.060,0.15,0.24),0.5-0.5*upper);
    let chip=roundedBox(q+vec2f(u.card.z*0.49,0.0),vec2f(5.0,3.4),0.7);
    let chipCover=1.0-ease(-aa,aa,chip);
    // Two existing contact grooves use a shallow local-occlusion approximation.
    let contact=max(1.0-ease(0.20,0.50,abs(q.x+u.card.z*0.49)),1.0-ease(0.20,0.50,abs(q.y)));
    let border=(1.0-ease(-1.6,-0.45,sd))*ease(-2.3,-1.5,sd);
    if(cover>0.0){
      // Card proxy is a camera-facing laminated/plastic panel, not gold.
      let observer=materialView();let light=normalize(u.light.xyz);
      var material=dielectricSurface(albedo+vec3f(0.07,0.15,0.22)*border,observer,observer,light,0.55,u.light.w);
      var chipReflection=vec3f(0.0);
      if(chipCover>0.0){
        let chipRoughness=clamp(u.backdrop.w*1.35,0.20,0.65);
        chipReflection=goldReflection(observer,observer,light,chipRoughness,u.light.w)*u.toggles.x;
        let chipMaterial=(goldStudioEnvironment(observer,observer,chipRoughness,u.light.w)+chipReflection)*(1.0-0.45*contact);
        material=mix(material,chipMaterial,chipCover);
      }
      let chipRadiation=goldFresnel(1.0)*0.72*chipCover*cover*u.toggles.x;
      rgb=mix(rgb,material,cover)+chipRadiation;
      glintSources*=1.0-cover;
      sources=chipRadiation+chipReflection*(1.0-0.45*contact)*chipCover*cover;
    }
  }
  // Explicit app-level donation intake, not an inferred game beneficiary.
  // A recessed receiver plate is present before transfer; arrivals fill it.
  if(u.result.w>0.0){
    let q=(p-u.result.xy)/u.view.z;let aa=max(0.25,0.70/u.view.z);
    let sd=roundedBox(q,vec2f(16.0,8.5),2.0);
    let cover=(1.0-ease(-aa,aa,sd))*u.result.w;
    let groove=1.0-ease(-aa,aa,roundedBox(q,vec2f(11.0,3.1),1.1));
    var receiver=mix(vec3f(0.045,0.105,0.15),vec3f(0.011,0.022,0.029),groove);
    let filled=(1.0-ease(-aa,aa,roundedBox(q,vec2f(10.3,2.4),0.7)))*(1.0-ease(-0.5,0.5,q.x-(-10.3+20.6*u.result.z)))*select(0.0,1.0,u.result.z>0.0);
    receiver=mix(receiver,vec3f(0.34,0.38,0.40),filled);
    let receivedRadiation=goldFresnel(1.0)*1.18*filled*u.result.z*cover*u.toggles.x;
    let observer=materialView();
    if(cover>0.0){receiver=dielectricSurface(receiver,observer,observer,normalize(u.light.xyz),0.48,u.light.w);}
    rgb=mix(rgb,receiver,cover)+receivedRadiation;
    sources=sources*(1.0-cover)+receivedRadiation;
    glintSources*=1.0-cover;
  }
  for(var i=0u;i<5u;i=i+1u){
    let m=goldCoin(p,u.coins[i],i);rgb=rgb*(1.0-m.coverage)+m.rgb;
    metalCoverage=metalCoverage*(1.0-m.coverage)+m.coverage;
    // Later opaque coins occlude earlier source radiation using the same mask.
    sources=sources*(1.0-m.coverage)+m.observerRadiance;
    glintSources=glintSources*(1.0-m.coverage)+m.glintRadiance;
  }
  // The receiver's lower lip occludes only coins settling at the intake.
  if(u.result.w>0.0){
    let q=(p-u.result.xy)/u.view.z;let aa=max(0.25,0.70/u.view.z);
    let lip=(1.0-ease(-aa,aa,roundedBox(q-vec2f(0.0,5.7),vec2f(14.0,1.7),0.8)))*u.result.w;
    if(lip>0.0){let observer=materialView();let lipMaterial=dielectricSurface(vec3f(0.14,0.24,0.29),observer,observer,normalize(u.light.xyz),0.48,u.light.w);rgb=mix(rgb,lipMaterial,lip);}
    sources*=1.0-lip;glintSources*=1.0-lip;metalCoverage*=1.0-lip;
  }
  out.world=vec4f(rgb,metalCoverage);out.source=vec4f(sources,0.0);out.glint=vec4f(glintSources,0.0);return out;
}
`;
const RESPONSE_WGSL=/* wgsl */ `
@group(0) @binding(1) var radiators:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
fn source(uv:vec2f)->vec3f {
  if(any(uv<vec2f(0.0)) || any(uv>vec2f(1.0))){return vec3f(0.0);}
  return textureSampleLevel(radiators,linearSampler,uv,0.0).rgb;
}
fn nearResponse(uv:vec2f)->vec3f {
  let step=vec2f(u.optics.x*u.view.z)/u.view.xy;var sum=vec3f(0.0);var total=0.0;
  for(var y=-2;y<=2;y=y+1){for(var x=-2;x<=2;x=x+1){
    let weight=exp(-0.5*f32(x*x+y*y));total+=weight;
    sum+=source(uv+vec2f(f32(x),f32(y))*step)*weight;
  }}return sum/total;
}
fn crossResponse(uv:vec2f)->vec3f {
  // Two pupil-bound orthogonal directions, one constant angle for this E.
  // Continuous positive decaying kernel; no polygon-star or triangular arms.
  let a=u.optics.w;let axis0=vec2f(sin(a),-cos(a));let axis1=vec2f(cos(a),sin(a));
  var sum=vec3f(0.0);var total=0.0;
  for(var axis=0u;axis<2u;axis=axis+1u){
    let direction=select(axis0,axis1,axis>0u);
    for(var k=-16;k<=16;k=k+1){
      let along=f32(k)*u.optics.y/16.0;
      let weight=exp(-abs(along)/2.3)/(1.0+pow(along/3.1,2.0));
      sum+=source(uv+direction*along*u.view.z/u.view.xy)*weight;total+=weight;
    }
  }return sum/total;
}
`;
export const OPTICAL_WGSL=COMMON+RESPONSE_WGSL+/* wgsl */ `
@fragment fn fs(v:ScreenVertex)->@location(0) vec4f {
  var correction=vec3f(0.0);
  if(u.state.x>0.5 && u.toggles.x>0.5 && u.toggles.w>0.5){
    let nearFraction=select(0.0,0.065,u.toggles.z>0.5);
    let rayFraction=u.optics.z;
    if(nearFraction>0.0){correction+=nearResponse(v.uv)*nearFraction;}
    if(rayFraction>0.0){correction+=crossResponse(v.uv)*rayFraction;}
  }
  return vec4f(correction,0.0);
}
`;
export const POST_WGSL=COMMON+/* wgsl */ `
@group(0) @binding(1) var world:texture_2d<f32>;
@group(0) @binding(2) var correction:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
@group(0) @binding(4) var rawRadiators:texture_2d<f32>;
${GLINT_OPTICS_WGSL}
fn goldDisplayRadiance(rgb:vec3f)->vec3f {
 let peak=max(rgb.r,max(rgb.g,rgb.b));let knee=0.82;
 if(peak<=knee){return rgb;}
 // A common RGB multiplier preserves conductor chromatic ratios in highlights.
 // Upstream HDR reflection/emission and causal optical energy are not clamped.
 let mapped=knee+(1.0-knee)*(peak-knee)/(peak-knee+1.0-knee);
 return rgb*(mapped/peak);
}
fn display(linear:vec3f)->vec3f {
  return select(12.92*linear,1.055*pow(max(linear,vec3f(0.0)),vec3f(1.0/2.4))-vec3f(0.055),linear>vec3f(0.0031308));
}
@fragment fn fs(v:ScreenVertex)->@location(0) vec4f {
  let worldSample=textureSampleLevel(world,linearSampler,v.uv,0.0);
  let direct=worldSample.rgb;
  let s=textureSampleLevel(rawRadiators,linearSampler,v.uv,0.0).rgb;var response=direct;
  if(u.state.x>0.5 && u.toggles.x>0.5 && u.toggles.w>0.5){
    let nearFraction=select(0.0,0.065,u.toggles.z>0.5);
    let rayFraction=u.optics.z;
    let g=glintSource(v.uv);
    response=max(vec3f(0.0),direct-(s+g)*(nearFraction+rayFraction));
    response+=textureSampleLevel(correction,linearSampler,v.uv,0.0).rgb;
    response+=localGlintCorrection(v.uv,nearFraction,rayFraction);
  }
  // Same visible-source budget reaches every detector pixel, including caps.
  // This observer convolution does not alter physical metal coverage or motif geometry.
  return vec4f(display(goldDisplayRadiance(response)),1.0);
}
`;

// This prototype downsamples only the optical source, then runs the same
// separable kernel at one quarter linear resolution.
const FILTER_COMMON=COMMON+/* wgsl */ `
@group(0) @binding(1) var inputRadiators:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
fn reconstruct(uv:vec2f,axis:vec2f)->vec4f {
  let pixel=1.0/vec2f(textureDimensions(inputRadiators));
  // Observer width follows the same display projection as the ray kernel.
  // R8 chosen compact observer reconstruction: .65 world units, .85 pixel floor.
  let sigma=max(${RECONSTRUCTION_FLOOR},${RECONSTRUCTION_WIDTH}*u.view.z)/4.0;
  let radius=i32(min(128.0,ceil(3.0*sigma)));
  var sum=vec3f(0.0);var total=0.0;
  for(var k=-radius;k<=radius;k=k+1){
    let weight=exp(-0.5*pow(f32(k)/sigma,2.0));
    let sampleUv=uv+axis*f32(k)*pixel;total+=weight;
    // Zero extension: never wrap a source from the opposite screen edge.
    if(all(sampleUv>=vec2f(0.0)) && all(sampleUv<=vec2f(1.0))){
      sum+=textureSampleLevel(inputRadiators,linearSampler,sampleUv,0.0).rgb*weight;
    }
  }return vec4f(sum/total,0.0);
}
`;
export const FILTER_X_WGSL=FILTER_COMMON+/* wgsl */ `
@fragment fn fs(v:ScreenVertex)->@location(0) vec4f {return reconstruct(v.uv,vec2f(1.0,0.0));}
`;
export const FILTER_Y_WGSL=FILTER_COMMON+/* wgsl */ `
@fragment fn fs(v:ScreenVertex)->@location(0) vec4f {return reconstruct(v.uv,vec2f(0.0,1.0));}
`;
export const DOWNSAMPLE_WGSL=COMMON+/* wgsl */ `
@group(0) @binding(1) var rawRadiators:texture_2d<f32>;
@fragment fn fs(v:ScreenVertex)->@location(0) vec4f {
  // ScreenVertex carries the fragment position builtin exactly once as v.p.
  let fullDims=textureDimensions(rawRadiators);let lowPixel=vec2u(v.p.xy);let base=lowPixel*4u;
  var sum=vec3f(0.0);
  for(var y=0u;y<4u;y=y+1u){for(var x=0u;x<4u;x=x+1u){
    let at=base+vec2u(x,y);
    if(all(at<fullDims)){sum+=textureLoad(rawRadiators,vec2i(at),0).rgb;}
  }}
  return vec4f(sum/16.0,0.0);
}
`;
// ABI discovery marker. R4 has no single-pass FILTER_WGSL compatibility alias:
// a R3 caller must be updated and cannot silently omit the Y reconstruction.
export const FILTER_PASSES=Object.freeze(['x','y']);
