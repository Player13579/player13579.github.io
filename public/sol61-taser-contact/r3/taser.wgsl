struct Params { viewport: vec2f, center: vec2f, observer: f32, source: f32, scale:f32, age:f32, flux:f32, material:f32, pressure:f32, near:f32, edition:f32, spare:f32, pad:vec2f };
@group(0) @binding(0) var<uniform> p: Params;
struct VertexOut { @builtin(position) position: vec4f, @location(0) local: vec2f, @location(1) length: f32, @location(2) width: f32, @location(3) energy: f32, @location(4) kind:f32 };
@vertex fn channelVertex(@builtin(vertex_index) id:u32, @location(0) a:vec2f, @location(1) b:vec2f, @location(2) width:f32, @location(3) energy:f32, @location(4) kind:f32) -> VertexOut {
  let corners=array<vec2f,6>(vec2f(0,-1),vec2f(1,-1),vec2f(0,1),vec2f(0,1),vec2f(1,-1),vec2f(1,1));
  let delta=b-a; let len=max(length(delta),0.01); let tangent=delta/len; let normal=vec2f(-tangent.y,tangent.x);
  let c=corners[id]; let edge=width+2.0;
  let pos=p.center+a+tangent*(c.x*(len+4.0)-2.0)+normal*c.y*edge;
  var o:VertexOut; o.position=vec4f(pos/p.viewport*vec2f(2,-2)+vec2f(-1,1),0,1);
  o.local=vec2f(c.x*(len+4.0)-2.0,c.y*edge); o.length=len; o.width=width; o.energy=energy; o.kind=kind; return o;
}
@fragment fn channelFragment(v:VertexOut)->@location(0) vec4f {
  let distance=length(vec2f(max(max(-v.local.x,v.local.x-v.length),0),v.local.y));
  let aa=max(fwidth(distance),.35);
  let core=1.0-smoothstep(v.width-aa,v.width+aa,distance);
  // Ionised core and lower-radiance sheath have distinct spatial support.
  let sheath=exp(-distance*distance/2.5)*.28;
  let coreColor=select(vec3f(.68,.93,1.0),vec3f(.95,.72,.36),v.kind>1.5);
  let radiance=(coreColor*core+vec3f(.08,.42,1.0)*sheath)*v.energy*p.source;
  return vec4f(radiance,0);
}
@group(1) @binding(0) var inputTexture: texture_2d<f32>;
@group(1) @binding(1) var linearSampler: sampler;
@group(2) @binding(0) var verticalInput: texture_2d<f32>;
@group(2) @binding(1) var verticalSampler: sampler;
struct FullOut { @builtin(position) position: vec4f, @location(0) uv:vec2f };
@vertex fn fullVertex(@builtin(vertex_index) id:u32)->FullOut {
  let xy=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  var o:FullOut; o.position=vec4f(xy[id],0,1); o.uv=xy[id]*vec2f(.5,-.5)+vec2f(.5); return o;
}
fn sampleInput(uv:vec2f)->vec3f { return textureSampleLevel(inputTexture,linearSampler,uv,0).rgb; }
fn sampleVertical(uv:vec2f)->vec3f { return textureSampleLevel(verticalInput,verticalSampler,uv,0).rgb; }
// Sigma 2.5 px, integer support [-7,+7], normalized once in 1D then separably applied.
fn gaussianWeight(index:i32)->f32 {
  let w=array<f32,8>(0.159981259,0.147681315,0.116170237,0.077871239,0.044480757,0.021651109,0.008980510,0.003174203);
  return w[abs(index)];
}
fn blur(inputUv:vec2f,axis:vec2f)->vec3f {
  let viewport=vec2f(textureDimensions(inputTexture));
  var sum=vec3f(0); var total=0.0;
  for(var offset:i32=-7;offset<=7;offset++) {
    let weight=gaussianWeight(offset); let delta=axis*f32(offset)/viewport;
    sum+=sampleInput(inputUv+delta)*weight; total+=weight;
  }
  return sum/total;
}
@fragment fn blurHorizontalFragment(v:FullOut)->@location(0) vec4f { return vec4f(blur(v.uv,vec2f(1,0)),1); }
@fragment fn blurVerticalFragment(v:FullOut)->@location(0) vec4f {
  let viewport=vec2f(textureDimensions(inputTexture));
  var sum=vec3f(0); var total=0.0;
  for(var offset:i32=-7;offset<=7;offset++) {
    let weight=gaussianWeight(offset); let delta=vec2f(0,f32(offset))/viewport;
    sum+=sampleInput(v.uv+delta)*weight; total+=weight;
  }
  return vec4f(sum/total,1);
}
fn encodeSRGB(c:vec3f)->vec3f { return select(12.92*c,1.055*pow(max(c,vec3f(0)),vec3f(1.0/2.4))-.055,c>vec3f(.0031308)); }

fn capsule(q:vec2f,a:vec2f,b:vec2f,r:f32)->f32 {let ba=b-a;let t=clamp(dot(q-a,ba)/dot(ba,ba),0.,1.);return length(q-a-ba*t)-r;}
fn edgeMask(distance:f32)->f32 {return 1.-smoothstep(-.5,.5,distance);}
fn receiverColor(q:vec2f)->vec3f{
 // H64 analytic diagnostic receiver. It is not a registered game-original support claim.
 let head=edgeMask(length(q-vec2f(0,-17))-7.);
 let torso=edgeMask(capsule(q,vec2f(0,-1),vec2f(0,17),11.));
 let legL=edgeMask(capsule(q,vec2f(-6,18),vec2f(-6,36),4.));
 let legR=edgeMask(capsule(q,vec2f(6,18),vec2f(6,36),4.));
 let cloth=vec3f(.065,.09,.12)*(1.+.1*q.x/12.);
 let n=normalize(vec3f(q.x/18.,-.10,1.));
 let fresnel=vec3f(.52,.57,.62)+(vec3f(1.)-vec3f(.52,.57,.62))*pow(1.-clamp(n.z,0.,1.),5.);
 let seam=edgeMask(abs(q.x+8.)-.65)*torso;
 let materialBase=select(cloth,mix(cloth,fresnel*.19,seam),p.material>.5 && p.edition>=4.);
 var base=head*vec3f(.27,.17,.12)+torso*materialBase+max(legL,legR)*vec3f(.04,.05,.064);
 let grip=edgeMask(max(abs(q.x+25.)-4.,abs(q.y)-5.));
 let tipA=edgeMask(capsule(q,vec2f(-21.,-5.),vec2f(-9.,-5.),.64));
 let tipB=edgeMask(capsule(q,vec2f(-21.,5.),vec2f(-9.,5.),.64));
 base=mix(base,vec3f(.04,.045,.05),grip);
 base=mix(base,vec3f(.35,.39,.43)*(0.8+0.2*n.z),max(tipA,tipB));
 // Finite PH receiving illumination stays without OBS, disappears with its source.
 let a=vec2f(-9.,-5.);let b=vec2f(-9.,5.);
 let dA=length(q-a);let dB=length(q-b);
 let falloff=(1./(1.+dA*dA*.16)+1./(1.+dB*dB*.16));
 let l=normalize(vec3f(-9.-q.x,-q.y,4.));let ndl=max(dot(n,l),0.);
 let diffuse=cloth*vec3f(.21,.55,1.0)*falloff*ndl*18.;
 let halfv=normalize(l+vec3f(0,0,1));
 let specular=fresnel*pow(max(dot(n,halfv),0.),20.)*falloff*2.2*seam;
 let response=select(diffuse,diffuse*.35+specular,p.material>.5 && p.edition>=4.);
 let pressureShade=1.-p.pressure*.18*exp(-pow(length(q-vec2f(-9.,0.))/3.,2.));
 return base*pressureShade+response*torso*p.flux*p.source*p.near;
}

@fragment fn observerFragment(v:FullOut)->@location(0) vec4f {
  let direct=textureSampleLevel(inputTexture,linearSampler,v.uv,0).rgb;
  let scatter=sampleVertical(v.uv);
  // Preserve the direct source term exactly; only add normalized, local scatter.
  let q=(v.uv*p.viewport-p.center)/p.scale;
  let hdr=receiverColor(q)+direct+scatter*(0.44*p.observer);
  let display=encodeSRGB(vec3f(1)-exp(-hdr*.72));
  return vec4f(display,1);
}
