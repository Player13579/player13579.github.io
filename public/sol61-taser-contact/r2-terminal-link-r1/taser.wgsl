struct Params { viewport: vec2f, center: vec2f, observer: f32, source: f32, pad: vec2f };
@group(0) @binding(0) var<uniform> p: Params;
struct VertexOut { @builtin(position) position: vec4f, @location(0) local: vec2f, @location(1) length: f32, @location(2) width: f32, @location(3) energy: f32 };
@vertex fn channelVertex(@builtin(vertex_index) id:u32, @location(0) a:vec2f, @location(1) b:vec2f, @location(2) width:f32, @location(3) energy:f32) -> VertexOut {
  let corners=array<vec2f,6>(vec2f(0,-1),vec2f(1,-1),vec2f(0,1),vec2f(0,1),vec2f(1,-1),vec2f(1,1));
  let delta=b-a; let len=max(length(delta),0.01); let tangent=delta/len; let normal=vec2f(-tangent.y,tangent.x);
  let c=corners[id]; let edge=width+2.0;
  let pos=p.center+a+tangent*(c.x*(len+4.0)-2.0)+normal*c.y*edge;
  var o:VertexOut; o.position=vec4f(pos/p.viewport*vec2f(2,-2)+vec2f(-1,1),0,1);
  o.local=vec2f(c.x*(len+4.0)-2.0,c.y*edge); o.length=len; o.width=width; o.energy=energy; return o;
}
@fragment fn channelFragment(v:VertexOut)->@location(0) vec4f {
  let distance=length(vec2f(max(max(-v.local.x,v.local.x-v.length),0),v.local.y));
  let aa=max(fwidth(distance),.35);
  let core=1.0-smoothstep(v.width-aa,v.width+aa,distance);
  // Ionised core and lower-radiance sheath have distinct spatial support.
  let sheath=exp(-distance*distance/2.5)*.28;
  let radiance=(vec3f(.76,.95,1.0)*core+vec3f(.08,.42,1.0)*sheath)*v.energy*p.source;
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
@fragment fn observerFragment(v:FullOut)->@location(0) vec4f {
  let direct=textureSampleLevel(inputTexture,linearSampler,v.uv,0).rgb;
  let scatter=sampleVertical(v.uv);
  // Preserve the direct source term exactly; only add normalized, local scatter.
  let hdr=direct+scatter*(0.44*p.observer);
  let display=encodeSRGB(vec3f(1)-exp(-hdr*.72));
  return vec4f(display,1);
}
