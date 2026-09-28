struct CompositeParameters { settings: vec4f, }
struct VertexOutput { @builtin(position) position: vec4f, @location(0) uv: vec2f, }
@group(0) @binding(0) var sceneTexture: texture_2d<f32>;
@group(0) @binding(1) var bloomTexture: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;
@group(0) @binding(3) var<uniform> parameters: CompositeParameters;
@vertex fn fullscreenVertex(@builtin(vertex_index) index: u32) -> VertexOutput {
  let vertices = array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
  let xy = vertices[index]; var result: VertexOutput;
  result.position = vec4f(xy,0.0,1.0); result.uv = xy * vec2f(0.5,-0.5) + vec2f(0.5); return result;
}
fn shoulder(x: vec3f) -> vec3f {
  let knee = vec3f(0.72);
  return select(knee + vec3f(0.28) * (vec3f(1.0) - exp(-(x-knee)/0.28)), x, x <= knee);
}
fn linearToSRGB(x: vec3f) -> vec3f {
  return select(1.055 * pow(max(x, vec3f(0.0)), vec3f(1.0/2.4)) - vec3f(0.055), 12.92*x, x <= vec3f(0.0031308));
}
@fragment fn compositeFragment(input: VertexOutput) -> @location(0) vec4f {
  let scene = textureSampleLevel(sceneTexture,linearSampler,input.uv,0.0);
  let bloom = textureSampleLevel(bloomTexture,linearSampler,input.uv,0.0).rgb;
  let protectedBloom = bloom * parameters.settings.x * (1.0-scene.a);
  let linear = shoulder(max(vec3f(0.0), scene.rgb + protectedBloom));
  return vec4f(linearToSRGB(linear),1.0);
}
