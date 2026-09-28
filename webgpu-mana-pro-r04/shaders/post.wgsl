// Local source-bound bloom and display shoulder. Both samplers use LOD 0 explicitly.
struct PostSettings { data: vec4<f32>, extra: vec4<f32>, };
@group(0) @binding(0) var sourceTexture: texture_2d<f32>;
@group(0) @binding(1) var auxiliaryTexture: texture_2d<f32>;
@group(0) @binding(2) var coverageSampler: sampler;
@group(0) @binding(3) var<uniform> settings: PostSettings;
struct QuadOutput { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32>, };
@vertex fn vs(@builtin(vertex_index) id: u32) -> QuadOutput {
  let positions = array<vec2<f32>, 3>(vec2<f32>(-1.0,-1.0), vec2<f32>(3.0,-1.0), vec2<f32>(-1.0,3.0));
  var out: QuadOutput; out.position = vec4<f32>(positions[id],0.0,1.0);
  out.uv = vec2<f32>(positions[id].x * 0.5 + 0.5, 0.5 - positions[id].y * 0.5); return out;
}
fn readSource(uv: vec2<f32>) -> vec4<f32> { return textureSampleLevel(sourceTexture,coverageSampler,uv,0.0); }
@fragment fn fs_blur(q: QuadOutput) -> @location(0) vec4<f32> {
  let offset = settings.data.xy;
  let weights = array<f32, 5>(0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  var col = readSource(q.uv).rgb * weights[0];
  for (var i = 1u; i < 5u; i += 1u) {
    let delta = offset * f32(i);
    col += (readSource(q.uv + delta).rgb + readSource(q.uv - delta).rgb) * weights[i];
  }
  return vec4<f32>(col,0.0);
}
@fragment fn fs_surface(q: QuadOutput) -> @location(0) vec4<f32> { return readSource(q.uv); }
@fragment fn fs_emission(q: QuadOutput) -> @location(0) vec4<f32> {
  let direct = readSource(q.uv).rgb;
  let bloom = textureSampleLevel(auxiliaryTexture,coverageSampler,q.uv,0.0).rgb;
  return vec4<f32>(direct + bloom * settings.data.z,0.0);
}
fn encodeSRGB(c: vec3<f32>) -> vec3<f32> {
  let high = 1.055 * pow(max(c,vec3<f32>(0.0)),vec3<f32>(1.0 / 2.4)) - vec3<f32>(0.055);
  let low = c * 12.92;
  return select(high,low,c <= vec3<f32>(0.0031308));
}
@fragment fn fs_present(q: QuadOutput) -> @location(0) vec4<f32> {
  let hdr = max(readSource(q.uv).rgb,vec3<f32>(0.0));
  let peak = max(hdr.r,max(hdr.g,hdr.b));
  var mapped = hdr;
  // Identity below 0.82; compress ONLY HDR highlights, preserving their RGB ratios.
  if (peak > 0.82) {
    let compressed = 0.82 + 0.18 * (1.0 - exp(-(peak - 0.82) / 0.18));
    mapped = hdr * (compressed / peak);
  }
  return vec4<f32>(encodeSRGB(mapped),1.0);
}
