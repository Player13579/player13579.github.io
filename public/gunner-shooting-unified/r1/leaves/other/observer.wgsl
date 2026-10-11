struct Params { surface:vec4f, controls:vec4f }
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var world:texture_2d<f32>;
@group(0) @binding(2) var emission:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
struct Vertex { @builtin(position) pos:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->Vertex{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Vertex;o.pos=vec4f(p[i],0,1);return o;}
fn displayEncode(c:vec3f)->vec3f{return mix(c*12.92,1.055*pow(max(c,vec3f(0)),vec3f(1.0/2.4))-.055,step(vec3f(.0031308),c));}
@fragment fn fs(v:Vertex)->@location(0) vec4f{
 let uv=v.pos.xy/u.surface.xy;let direct=textureSampleLevel(world,linearSampler,uv,0);var spread=vec3f(0);var weights=0.0;
 // OBS1: continuous, compact Gaussian PSF sampled at every pixel offset, not sparse duplicated source images.
 for(var y=-3;y<=3;y++){for(var x=-3;x<=3;x++){
  let offset=vec2f(f32(x),f32(y));let w=exp(-dot(offset,offset)/4.5);
  spread+=textureSampleLevel(emission,linearSampler,uv+offset/u.surface.xy,0).rgb*w;weights+=w;
 }}
 let halo=spread/weights*.16*u.controls.z;
 let back=vec3f(u.surface.z);let radiance=direct.rgb+halo+back*(1-direct.a);
 let mapped=radiance/(vec3f(1)+radiance);
 return vec4f(displayEncode(mapped),1);
}
