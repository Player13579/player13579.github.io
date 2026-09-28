// Only a freshly rendered procedural target is sampled. No file/atlas/image is loaded.
@group(0) @binding(0) var sourceTexture:texture_2d<f32>;
@group(0) @binding(1) var coverageSampler:sampler;
struct Out{@builtin(position) position:vec4<f32>,@location(0) uv:vec2<f32>};
@vertex fn vs(@builtin(vertex_index) i:u32)->Out {
 let p=array<vec2<f32>,3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));
 var o:Out;o.position=vec4<f32>(p[i],0,1);o.uv=vec2<f32>(p[i].x*0.5+0.5,0.5-p[i].y*0.5);return o;
}
@fragment fn fs(i:Out)->@location(0) vec4<f32> {return textureSampleLevel(sourceTexture,coverageSampler,i.uv,0.0);}
