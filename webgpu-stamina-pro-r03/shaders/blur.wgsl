struct BlurParameters { direction: vec4f, }
struct VertexOutput { @builtin(position) position: vec4f, @location(0) uv: vec2f, }
@group(0) @binding(0) var sourceTexture: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> parameters: BlurParameters;
@vertex fn fullscreenVertex(@builtin(vertex_index) index: u32) -> VertexOutput {
  let vertices = array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
  let xy = vertices[index]; var result: VertexOutput;
  result.position = vec4f(xy,0.0,1.0); result.uv = xy * vec2f(0.5,-0.5) + vec2f(0.5); return result;
}
@fragment fn blurFragment(input: VertexOutput) -> @location(0) vec4f {
  let delta = parameters.direction.xy * parameters.direction.z;
  var value = textureSampleLevel(sourceTexture,linearSampler,input.uv,0.0) * 0.40;
  value += textureSampleLevel(sourceTexture,linearSampler,input.uv+delta,0.0) * 0.24;
  value += textureSampleLevel(sourceTexture,linearSampler,input.uv-delta,0.0) * 0.24;
  value += textureSampleLevel(sourceTexture,linearSampler,input.uv+delta*2.0,0.0) * 0.06;
  value += textureSampleLevel(sourceTexture,linearSampler,input.uv-delta*2.0,0.0) * 0.06;
  return value;
}
