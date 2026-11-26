struct Uniforms { viewport:vec4f,clock:vec4f,controls:vec4f,fixture:vec4f,diagnostics:vec4f };
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var radiance:texture_2d<f32>;
@group(0) @binding(3) var medium:texture_2d<f32>;
@group(0) @binding(4) var linearSampler:sampler;
struct VertexOutput {@builtin(position) position:vec4f,@location(0) uv:vec2f};
@vertex fn vertexMain(@builtin(vertex_index) i:u32)->VertexOutput {var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VertexOutput;o.position=vec4f(p[i],0,1);o.uv=p[i]*vec2f(.5,-.5)+vec2f(.5);return o;}
@fragment fn fragmentMain(o:VertexOutput)->@location(0) vec4f {
  let sampleMedium=textureSample(medium,linearSampler,o.uv);let own=textureSample(radiance,linearSampler,o.uv);
  let px=1/u.viewport.xy;let obs=u.controls.y*(1-u.controls.w);
  let heatGradient=vec2f(textureSample(medium,linearSampler,o.uv+vec2f(px.x*2,0)).x-textureSample(medium,linearSampler,o.uv-vec2f(px.x*2,0)).x,textureSample(medium,linearSampler,o.uv+vec2f(0,px.y*2)).x-textureSample(medium,linearSampler,o.uv-vec2f(0,px.y*2)).x);
  let displaced=o.uv+heatGradient*px*4*obs*u.clock.w;
  let background=textureSample(scene,linearSampler,displaced).rgb;
  var spread=vec3f(0);
  let radius=u.viewport.z*.115;
  for(var i=0;i<8;i++) {let angle=f32(i)*.785398;let offset=vec2f(cos(angle),sin(angle))*px*radius;spread+=textureSample(radiance,linearSampler,o.uv+offset).rgb*.045;}
  let total=background*sampleMedium.z+own.rgb+spread*obs*u.fixture.w;
  // Display exposure response followed by one linear-to-sRGB encoding; HDR world remains unchanged.
  let mapped=vec3f(1)-exp(-total);let encoded=select(mapped*12.92,1.055*pow(mapped,vec3f(1/2.4))-.055,mapped>vec3f(.0031308));
  return vec4f(encoded,1);
}
