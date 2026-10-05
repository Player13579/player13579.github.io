// Fresh Donation r1, GPT-6.1-Sol. No old Donation shader/design input.
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
// Orthographic ray against a real finite capped cylinder, not an ellipse icon.
// Local axis z; rotating around y changes cap/edge visibility and normals.
fn cylinderHit(q:vec2f,angle:f32,radius:f32,halfDepth:f32)->vec4f {
  let c=cos(angle);let s=sin(angle);
  let origin=vec3f(c*q.x-s*80.0,q.y,s*q.x+c*80.0);
  let ray=vec3f(s,0.0,-c);var best=10000.0;var normal=vec3f(0.0);
  if(abs(ray.z)>0.00001){
    for(var side=-1;side<=1;side=side+2){
      let t=(f32(side)*halfDepth-origin.z)/ray.z;
      let at=origin+ray*t;
      if(t>0.0 && t<best && dot(at.xy,at.xy)<=radius*radius){best=t;normal=vec3f(0.0,0.0,f32(side));}
    }
  }
  let aa=dot(ray.xy,ray.xy);let bb=2.0*dot(origin.xy,ray.xy);
  let cc=dot(origin.xy,origin.xy)-radius*radius;let disc=bb*bb-4.0*aa*cc;
  if(aa>0.00001 && disc>=0.0){
    for(var side=-1;side<=1;side=side+2){
      let t=(-bb+f32(side)*sqrt(disc))/(2.0*aa);let at=origin+ray*t;
      if(t>0.0 && t<best && abs(at.z)<=halfDepth){best=t;normal=normalize(vec3f(at.xy,0.0));}
    }
  }
  if(best>9999.0){return vec4f(0.0);}
  let worldNormal=vec3f(c*normal.x+s*normal.z,normal.y,-s*normal.x+c*normal.z);
  return vec4f(worldNormal,1.0);
}
fn goldCoin(p:vec2f,coin:vec4f)->MetalSample {
  var out:MetalSample;out.rgb=vec3f(0.0);out.emission=vec3f(0.0);out.coverage=0.0;
  if(coin.w<=0.0){return out;}
  let q=(p-coin.xy)/u.view.z;let radius=8.0;let halfDepth=1.0;
  if(length(q)>9.2){return out;}
  let hit=cylinderHit(q,coin.z,radius,halfDepth);
  if(hit.w<0.5){return out;}
  let n=hit.xyz;let l=normalize(u.light.xyz);let v=vec3f(0.0,0.0,1.0);let h=normalize(l+v);
  let nl=max(0.0,dot(n,l));let nv=max(0.001,dot(n,v));let nh=max(0.0,dot(n,h));
  let vh=max(0.0,dot(v,h));let roughness=0.22;let a2=pow(roughness,4.0);
  let nd=a2/(3.14159265*pow(nh*nh*(a2-1.0)+1.0,2.0));
  let kk=pow(roughness+1.0,2.0)/8.0;
  let masking=nl/(nl*(1.0-kk)+kk)*nv/(nv*(1.0-kk)+kk);
  let f0=vec3f(1.0,0.71,0.25);let fresnel=f0+(vec3f(1.0)-f0)*pow(1.0-vh,5.0);
  let reflected=fresnel*nd*masking/(4.0*max(nl*nv,0.001))*nl*u.light.w*u.toggles.x;
  // Source radiation is the finite visible coin surface, not independent stars.
  let emissive=vec3f(1.05,0.50,0.065)*(0.42+0.16*nv)*u.toggles.x;
  let ambient=vec3f(0.16,0.063,0.007)*(0.4+0.6*nv);
  out.coverage=coin.w;out.emission=(emissive+reflected)*coin.w;
  out.rgb=(ambient+reflected+emissive)*coin.w;return out;
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
  for(var i=0u;i<5u;i=i+1u){
    let m=goldCoin(p,u.coins[i]);rgb=rgb*(1.0-m.coverage)+m.rgb;
    // Later opaque coins occlude earlier source radiation using the same mask.
    sources=sources*(1.0-m.coverage)+m.emission;
  }
  out.world=vec4f(rgb,1.0);out.source=vec4f(sources,0.0);return out;
}
`;
export const POST_WGSL=COMMON+/* wgsl */ `
@group(0) @binding(1) var world:texture_2d<f32>;
@group(0) @binding(2) var radiators:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
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
    for(var k=-20;k<=20;k=k+1){
      let along=f32(k)*u.optics.y/20.0;
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
  let s=source(v.uv);var response=direct;
  if(u.state.x>0.5 && u.toggles.x>0.5 && u.toggles.w>0.5){
    let nearFraction=select(0.0,0.045,u.toggles.z>0.5);
    let rayFraction=u.optics.z;
    response=max(vec3f(0.0),direct-s*(nearFraction+rayFraction));
    if(nearFraction>0.0){response+=nearResponse(v.uv)*nearFraction;}
    if(rayFraction>0.0){response+=crossResponse(v.uv)*rayFraction;}
  }
  return vec4f(display(response),1.0);
}
`;
