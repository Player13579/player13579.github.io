// One authentic white-hood front-idle body draw using its exact atlas crop.
// The source atlas upload is legacy encoded premultiplied rgba8unorm; undo that
// numeric premultiplication, decode once, then return linear premultiplied RGB.
struct ActorView { viewport:vec4f, actor:vec4f };
@group(0) @binding(0) var<uniform> view:ActorView;
@group(0) @binding(1) var bodyAtlas:texture_2d<f32>;
@group(0) @binding(2) var bodySampler:sampler;
struct VOut { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vertex(@builtin(vertex_index)i:u32)->VOut {
  let points=array<vec2f,6>(vec2f(0.,0.),vec2f(256.,0.),vec2f(256.,256.),
    vec2f(0.,0.),vec2f(256.,256.),vec2f(0.,256.));
  let local=points[i];
  let foot=view.actor.xy;
  let center=vec2f(1340.,1174.)*.5;
  let q=foot+vec2f((local.x-128.)*.315,(local.y-240.)*.315+31.);
  let pixel=vec2f(view.viewport.x,view.viewport.y)*.5+(q-center)*view.viewport.z;
  var o:VOut;o.position=vec4f(pixel.x/view.viewport.x*2.-1.,1.-pixel.y/view.viewport.y*2.,0.,1.);
  o.uv=local/768.;return o;
}
fn srgbToLinear(encoded:vec3f)->vec3f {
  return select(encoded/12.92,pow((encoded+vec3f(.055))/1.055,vec3f(2.4)),encoded>vec3f(.04045));
}
struct BodyOut { @location(0) scene:vec4f, @location(1) coverage:vec4f };
@fragment fn fragment(in:VOut)->BodyOut {
  let premultEncoded=textureSampleLevel(bodyAtlas,bodySampler,in.uv,0.);
  let alpha=clamp(premultEncoded.a,0.,1.);
  if(alpha<=0.00001){discard;}
  let straightEncoded=select(vec3f(0.),premultEncoded.rgb/alpha,alpha>0.00001);
  let linearPremult=srgbToLinear(straightEncoded)*alpha;
  var out:BodyOut;out.scene=vec4f(linearPremult,alpha);out.coverage=vec4f(0.,0.,0.,alpha);return out;
}
