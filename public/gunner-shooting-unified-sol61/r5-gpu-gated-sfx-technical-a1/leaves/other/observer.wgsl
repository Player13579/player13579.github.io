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
 // OBS1: a continuous normalized Gaussian sensor PSF, every backing-pixel offset in a 17x17 support.
 // Sigma=3 backing pixels; the support is resolved rather than sparse duplicate source images.
 if(u.controls.z>0){
  for(var y=-8;y<=8;y++){for(var x=-8;x<=8;x++){
   let offset=vec2f(f32(x),f32(y));let weight=exp(-dot(offset,offset)/18.0);
   spread+=textureSampleLevel(emission,linearSampler,uv+offset/u.surface.xy,0).rgb*weight;weights+=weight;
  }}
 }
 let halo=spread/max(weights,1.0)*.32*u.controls.z;
 let back=vec3f(u.surface.z);let radiance=direct.rgb+halo+back*(1-direct.a);
 let mapped=radiance/(vec3f(1)+radiance);
 return vec4f(displayEncode(mapped),1);
}
