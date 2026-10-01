struct FinalState { canvas:vec4f, rect:vec4f };
@group(0) @binding(0) var<uniform> state:FinalState;
@group(0) @binding(1) var sceneTexture:texture_2d<f32>;
@group(0) @binding(2) var ambientObsDelta:texture_2d<f32>;
@group(0) @binding(3) var bloomTexture:texture_2d<f32>;
@group(0) @binding(4) var original:texture_2d<f32>;
@group(0) @binding(5) var linearSampler:sampler;
struct VOut { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vertex(@builtin(vertex_index)i:u32)->VOut {
  let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.))[i];
  var o:VOut;o.position=vec4f(q,0.,1.);o.uv=vec2f((q.x+1.)*.5,(1.-q.y)*.5);return o;
}
fn linearToSrgb(x:vec3f)->vec3f {
  return select(1.055*pow(max(x,vec3f(0.)),vec3f(1./2.4))-.055,x*12.92,x<=vec3f(.0031308));
}
@fragment fn fragment(in:VOut)->@location(0)vec4f {
  let pixel=in.uv*state.canvas.xy;
  let uv=(pixel-state.canvas.zw)/state.rect.xy;
  if(any(pixel<state.canvas.zw)||any(pixel>state.canvas.zw+state.rect.xy)) { return vec4f(0.,0.,0.,1.); }
  if(state.rect.z>.5) {
    let base=textureSampleLevel(original,linearSampler,uv,0.).rgb;
    return vec4f(select(linearToSrgb(base),base,state.rect.w>.5),1.);
  }
  let scene=textureSampleLevel(sceneTexture,linearSampler,uv,0.).rgb;
  let obs=textureSampleLevel(ambientObsDelta,linearSampler,uv,0.).rgb;
  let bloom=textureSampleLevel(bloomTexture,linearSampler,uv,0.).rgb*.16;
  let result=clamp(scene+obs+bloom,vec3f(0.),vec3f(1.));
  return vec4f(select(linearToSrgb(result),result,state.rect.w>.5),1.);
}
