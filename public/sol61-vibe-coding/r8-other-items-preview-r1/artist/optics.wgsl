// SourceSignal-only observer response. Geometry is created by world.wgsl, never bloom.
struct Optics { size:vec2u, axis:vec2i, hPixels:f32,gain:f32,spreadH:f32,pad1:f32 };
@group(0) @binding(0) var<uniform> optics:Optics;
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
struct Vary { @builtin(position) p:vec4f,@location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) vi:u32)->Vary {
  let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[vi];var o:Vary;
  o.p=vec4f(p,0,1);o.uv=p*vec2f(.5,-.5)+vec2f(.5);return o;
}
@fragment fn blur(v:Vary)->@location(0) vec4f {
  let texel=1.0/vec2f(optics.size); let axis=vec2f(optics.axis)*texel;
  let spread=max(.75,optics.hPixels*optics.spreadH);
  let weights=array<f32,5>(.227027,.194595,.121622,.054054,.016216);
  var result=textureSampleLevel(source,linearSampler,clamp(v.uv,texel*.5,1-texel*.5),0).rgb*weights[0];
  for(var i=1;i<5;i++) {
    let offset=axis*f32(i)*spread;
    result+=weights[i]*(textureSampleLevel(source,linearSampler,clamp(v.uv+offset,texel*.5,1-texel*.5),0).rgb+
      textureSampleLevel(source,linearSampler,clamp(v.uv-offset,texel*.5,1-texel*.5),0).rgb);
  }
  return vec4f(result,0);
}
@fragment fn observe(v:Vary)->@location(0) vec4f {
  return vec4f(textureSampleLevel(source,linearSampler,v.uv,0).rgb*optics.gain,0);
}
