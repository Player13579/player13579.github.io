struct Uniforms { viewport:vec4f, metric:vec4f, enabled:vec4f, reserved:vec4f }
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var world:texture_2d<f32>;
@group(0) @binding(2) var source:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
struct Vertex { @builtin(position) position:vec4f }
@vertex fn vertex(@builtin(vertex_index) i:u32)->Vertex {let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Vertex;o.position=vec4f(p[i],0,1);return o;}
@fragment fn fragment(@builtin(position) p:vec4f)->@location(0) vec4f {
 let uv=p.xy/u.viewport.xy;let base=textureSampleLevel(world,linearSampler,uv,0).rgb;
 var diffuse=vec3f(0);var weights=0.;
 // Compact normalized PSF approximation: only visible emitter radiance can scatter.
 // In a production host source must be depth/actor-occluded BEFORE this pass.
 for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){let weight=exp(-.5*f32(x*x+y*y));
   let offset=vec2f(f32(x),f32(y))*max(1.,u.metric.x*.035)/u.viewport.xy;
   diffuse+=textureSampleLevel(source,linearSampler,uv+offset,0).rgb*weight;weights+=weight;}}
 let directSource=textureSampleLevel(source,linearSampler,uv,0).rgb;
 let linear=base+(diffuse/weights-directSource)*.20*u.enabled.z;
 // Exposure response; no background sampling, global wash, flare, ghost, or automatic tint.
 return vec4f(vec3f(1)-exp(-linear*u.metric.w),1.);
}
