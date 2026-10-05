// Donation fresh R4, GPT-6.1-Sol. Permitted improvement of sealed fresh R3.
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
export const WORLD_WGSL=COMMON+/* wgsl */ `
struct Outputs { @location(0) world:vec4f, @location(1) source:vec4f }
struct MetalSample { rgb:vec3f, emission:vec3f, coverage:f32 }
fn roundedBox(p:vec2f,b:vec2f,r:f32)->f32 {
  let q=abs(p)-b+vec2f(r);return length(max(q,vec2f(0.0)))+min(max(q.x,q.y),0.0)-r;
}
// Rounded minted cap/rim/side: outer radius 8, base half depth 1.6,
// bevel .65. Four subpixel rays integrate silhouette coverage at display size.
fn coinDistance(p:vec3f,radius:f32,halfDepth:f32)->f32 {
  let bevel=0.65;let radial=length(p.xy);
  // Shallow minted cap: broad convex field and one raised circular shoulder.
  // This alters the hit surface and finite-difference normal, not a decal.
  let capDome=0.32*max(0.0,1.0-pow(radial/radius,2.0));
  let shoulder=0.22*exp(-pow((radial-5.2)/0.90,2.0));
  let capDepth=halfDepth+capDome+shoulder;
  let d=vec2f(radial-(radius-bevel),abs(p.z)-(capDepth-bevel));
  return (length(max(d,vec2f(0.0)))+min(max(d.x,d.y),0.0)-bevel)/1.25;
}
fn cylinderHit(q:vec2f,angle:f32,radius:f32,halfDepth:f32)->vec4f {
  let c=cos(angle);let s=sin(angle);
  let origin=vec3f(c*q.x-s*16.0,q.y,s*q.x+c*16.0);
  let ray=vec3f(s,0.0,-c);var t=0.0;var at=origin;var found=false;
  for(var step=0u;step<64u;step=step+1u){
    at=origin+ray*t;let d=coinDistance(at,radius,halfDepth);
    if(d<0.005){found=true;break;}
    t+=max(d,0.005);if(t>32.0){break;}
  }
  if(!found){return vec4f(0.0);}
  let e=0.01;
  let normal=normalize(vec3f(
    coinDistance(at+vec3f(e,0.0,0.0),radius,halfDepth)-coinDistance(at-vec3f(e,0.0,0.0),radius,halfDepth),
    coinDistance(at+vec3f(0.0,e,0.0),radius,halfDepth)-coinDistance(at-vec3f(0.0,e,0.0),radius,halfDepth),
    coinDistance(at+vec3f(0.0,0.0,e),radius,halfDepth)-coinDistance(at-vec3f(0.0,0.0,e),radius,halfDepth)));
  let worldNormal=vec3f(c*normal.x+s*normal.z,normal.y,-s*normal.x+c*normal.z);
  return vec4f(worldNormal,1.0);
}
fn goldRay(p:vec2f,coin:vec4f)->MetalSample {
  var out:MetalSample;out.rgb=vec3f(0.0);out.emission=vec3f(0.0);out.coverage=0.0;
  if(coin.w<=0.0){return out;}
  let q=(p-coin.xy)/u.view.z;let radius=8.0;let halfDepth=1.6;
  if(length(q)>9.2){return out;}
  let hit=cylinderHit(q,coin.z,radius,halfDepth);
  if(hit.w<0.5){return out;}
  let n=hit.xyz;let l=normalize(u.light.xyz);let v=vec3f(0.0,0.0,1.0);let h=normalize(l+v);
  let nl=max(0.0,dot(n,l));let nv=max(0.001,dot(n,v));let nh=max(0.0,dot(n,h));
  let vh=max(0.0,dot(v,h));let roughness=0.24;let a2=pow(roughness,4.0);
  let nd=a2/(3.14159265*pow(nh*nh*(a2-1.0)+1.0,2.0));
  let kk=pow(roughness+1.0,2.0)/8.0;
  let masking=nl/(nl*(1.0-kk)+kk)*nv/(nv*(1.0-kk)+kk);
  let f0=vec3f(1.0,0.71,0.25);let fresnel=f0+(vec3f(1.0)-f0)*pow(1.0-vh,5.0);
  let reflected=fresnel*nd*masking/(4.0*max(nl*nv,0.001))*nl*u.light.w*u.toggles.x;
  // Source radiation is the finite visible coin surface, not independent stars.
  // Preserve R1 face emission; add a tightly source-bound bevel glint.
  // The curved bevel's normal creates the compact radiator, not a drawn star.
  let localNormalZ=abs(sin(coin.z)*n.x+cos(coin.z)*n.z);
  let bevelBand=(1.0-ease(0.96,0.999,localNormalZ))*ease(0.03,0.20,localNormalZ);
  let glint=bevelBand*pow(nh,96.0)*38.0;
  let emissive=(vec3f(1.05,0.50,0.065)*(0.42+0.16*nv)+vec3f(2.2,1.45,0.40)*glint)*u.toggles.x;
  let fill=max(0.0,dot(n,normalize(vec3f(0.75,0.25,0.40))));
  let ambient=vec3f(0.16,0.063,0.007)*(0.32+0.68*nv)+vec3f(0.045,0.028,0.012)*fill;
  out.coverage=coin.w;out.emission=(emissive+reflected)*coin.w;
  out.rgb=(ambient+reflected+emissive)*coin.w;return out;
}
fn goldCoin(p:vec2f,coin:vec4f)->MetalSample {
  var out:MetalSample;out.rgb=vec3f(0.0);out.emission=vec3f(0.0);out.coverage=0.0;
  for(var y=0u;y<2u;y=y+1u){for(var x=0u;x<2u;x=x+1u){
    let offset=vec2f(f32(x)*0.5-0.25,f32(y)*0.5-0.25);
    let rayMaterial=goldRay(p+offset,coin);out.rgb+=rayMaterial.rgb*0.25;
    out.emission+=rayMaterial.emission*0.25;out.coverage+=rayMaterial.coverage*0.25;
  }}return out;
}
@fragment fn fs(v:ScreenVertex)->Outputs {
  let p=v.uv*u.view.xy;var out:Outputs;
  out.world=vec4f(u.backdrop.rgb,1.0);out.source=vec4f(0.0);
  if(u.state.x<0.5 || u.toggles.w<0.5){return out;}
  var rgb=u.backdrop.rgb;var sources=vec3f(0.0);
  if(u.state.y>0.0 && u.toggles.y>0.5){
    let q=(p-u.card.xy)/u.view.z;let sd=roundedBox(q,u.card.zw,3.0);
    let aa=max(0.25,0.70/u.view.z);let cover=(1.0-ease(-aa,aa,sd))*u.state.y;
    let upper=clamp(q.y/max(u.card.w,0.001),-1.0,1.0);
    var material=mix(vec3f(0.026,0.080,0.14),vec3f(0.060,0.15,0.24),0.5-0.5*upper);
    let chip=roundedBox(q+vec2f(u.card.z*0.49,0.0),vec2f(5.0,3.4),0.7);
    let chipCover=1.0-ease(-aa,aa,chip);
    material=mix(material,vec3f(0.64,0.42,0.11),chipCover);
    // Two chip contact grooves are real surface detail, no new logo/number.
    let contact=max(1.0-ease(0.20,0.50,abs(q.x+u.card.z*0.49)),1.0-ease(0.20,0.50,abs(q.y)));
    material=mix(material,vec3f(0.24,0.12,0.025),chipCover*contact*0.50);
    let border=(1.0-ease(-1.6,-0.45,sd))*ease(-2.3,-1.5,sd);
    material+=vec3f(0.07,0.15,0.22)*border;
    let chipRadiation=vec3f(1.25,0.63,0.13)*chipCover*cover*u.toggles.x;
    rgb=mix(rgb,material,cover)+chipRadiation;
    sources=chipRadiation;
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
    receiver=mix(receiver,vec3f(0.56,0.28,0.045),filled);
    let receivedRadiation=vec3f(1.45,0.79,0.15)*filled*u.result.z*cover*u.toggles.x;
    rgb=mix(rgb,receiver,cover)+receivedRadiation;
    sources=sources*(1.0-cover)+receivedRadiation;
  }
  for(var i=0u;i<5u;i=i+1u){
    let m=goldCoin(p,u.coins[i]);rgb=rgb*(1.0-m.coverage)+m.rgb;
    // Later opaque coins occlude earlier source radiation using the same mask.
    sources=sources*(1.0-m.coverage)+m.emission;
  }
  // The receiver's lower lip occludes only coins settling at the intake.
  if(u.result.w>0.0){
    let q=(p-u.result.xy)/u.view.z;let aa=max(0.25,0.70/u.view.z);
    let lip=(1.0-ease(-aa,aa,roundedBox(q-vec2f(0.0,5.7),vec2f(14.0,1.7),0.8)))*u.result.w;
    rgb=mix(rgb,vec3f(0.14,0.24,0.29),lip);sources*=1.0-lip;
  }
  out.world=vec4f(rgb,1.0);out.source=vec4f(sources,0.0);return out;
}
`;
export const POST_WGSL=COMMON+/* wgsl */ `
@group(0) @binding(1) var world:texture_2d<f32>;
@group(0) @binding(2) var radiators:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
@group(0) @binding(4) var rawRadiators:texture_2d<f32>;
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
    for(var k=-40;k<=40;k=k+1){
      let along=f32(k)*u.optics.y/40.0;
      let weight=exp(-abs(along)/14.0)/(1.0+pow(along/18.0,2.0));
      sum+=source(uv+direction*along*u.view.z/u.view.xy)*weight;total+=weight;
    }
  }return sum/total;
}
fn display(linear:vec3f)->vec3f {
  return select(12.92*linear,1.055*pow(max(linear,vec3f(0.0)),vec3f(1.0/2.4))-vec3f(0.055),linear>vec3f(0.0031308));
}
@fragment fn fs(v:ScreenVertex)->@location(0) vec4f {
  let direct=textureSampleLevel(world,linearSampler,v.uv,0.0).rgb;
  let s=textureSampleLevel(rawRadiators,linearSampler,v.uv,0.0).rgb;var response=direct;
  if(u.state.x>0.5 && u.toggles.x>0.5 && u.toggles.w>0.5){
    let nearFraction=select(0.0,0.065,u.toggles.z>0.5);
    let rayFraction=u.optics.z;
    response=max(vec3f(0.0),direct-s*(nearFraction+rayFraction));
    if(nearFraction>0.0){response+=nearResponse(v.uv)*nearFraction;}
    if(rayFraction>0.0){response+=crossResponse(v.uv)*rayFraction;}
  }
  return vec4f(display(response),1.0);
}
`;

// Two independent full-resolution reconstruction targets are required.
// raw radiator -> X filter -> Y filter -> POST, four passes including world.
const FILTER_COMMON=COMMON+/* wgsl */ `
@group(0) @binding(1) var inputRadiators:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
fn reconstruct(uv:vec2f,axis:vec2f)->vec4f {
  let pixel=1.0/vec2f(textureDimensions(inputRadiators));
  // Observer width follows the same display projection as the ray kernel.
  // At scales >=1 this is 1.4 world units, with a 1.4-pixel floor below 1.
  let sigma=max(1.4,1.4*u.view.z);
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
// ABI discovery marker. R4 has no single-pass FILTER_WGSL compatibility alias:
// a R3 caller must be updated and cannot silently omit the Y reconstruction.
export const FILTER_PASSES=Object.freeze(['x','y']);
