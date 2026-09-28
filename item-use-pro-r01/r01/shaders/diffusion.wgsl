// OBS1: 発光源だけを入力にする有限PSF。grain/flare/世界内粒子ではない。
struct Blur { direction:vec2f, extent:vec2f };
@group(0) @binding(0) var source:texture_2d<f32>;
@group(0) @binding(1) var<uniform> b:Blur;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f{
 let weights=array<f32,5>(0.227027,0.194595,0.121622,0.054054,0.016216);
 let hi=vec2i(b.extent)-vec2i(1);let at=vec2i(p.xy);
 var v=textureLoad(source,clamp(at,vec2i(0),hi),0)*weights[0];
 for(var k=1;k<5;k++){
  let d=vec2i(round(b.direction*f32(k)));
  v+=(textureLoad(source,clamp(at+d,vec2i(0),hi),0)+textureLoad(source,clamp(at-d,vec2i(0),hi),0))*weights[k];
 }
 return v;
}
