// OBS1 source-bound有限bloom、OBS2受光面への局所光統合、OBS3表示符号化。
// 背景色から強度・露光・寿命を分岐しない。履歴バッファも持たない。
struct CompositeFrame { viewport: vec2<f32>, kernel_px: f32, debug_channel: f32, clip: vec4<f32> }
@group(0) @binding(0) var<uniform> frame: CompositeFrame;
@group(0) @binding(1) var linear_sampler: sampler;
@group(0) @binding(2) var body_texture: texture_2d<f32>;
@group(0) @binding(3) var emission_texture: texture_2d<f32>;
@group(0) @binding(4) var light_texture: texture_2d<f32>;
@group(0) @binding(5) var scene_texture: texture_2d<f32>;
@group(0) @binding(6) var visibility_mask: texture_2d<f32>;
@group(0) @binding(7) var receiver_mask: texture_2d<f32>;
struct Out { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }
@vertex fn composite_vertex(@builtin(vertex_index) vertex: u32) -> Out {
  let points = array<vec2<f32>,3>(vec2<f32>(-1.0,-1.0),vec2<f32>(3.0,-1.0),vec2<f32>(-1.0,3.0));
  let p = points[vertex]; var out: Out;
  out.position = vec4<f32>(p,0.0,1.0); out.uv = vec2<f32>((p.x+1.0)*0.5,(1.0-p.y)*0.5); return out;
}
fn load_mask(tex: texture_2d<f32>, uv: vec2<f32>) -> f32 {
  let dimensions = textureDimensions(tex);
  let coord = vec2<i32>(clamp(uv*vec2<f32>(dimensions),vec2<f32>(0.0),vec2<f32>(dimensions)-vec2<f32>(1.0)));
  return textureLoad(tex,coord,0).r;
}
fn source_bloom(uv: vec2<f32>) -> vec3<f32> {
  let d = vec2<f32>(frame.kernel_px) / frame.viewport;
  // 正規化された有限kernel。エネルギー係数0.16は背景とは独立。
  var sum = textureSampleLevel(emission_texture,linear_sampler,uv,0.0).rgb * 0.20;
  sum += textureSampleLevel(emission_texture,linear_sampler,uv+vec2<f32>( d.x,0.0),0.0).rgb * 0.12;
  sum += textureSampleLevel(emission_texture,linear_sampler,uv+vec2<f32>(-d.x,0.0),0.0).rgb * 0.12;
  sum += textureSampleLevel(emission_texture,linear_sampler,uv+vec2<f32>(0.0, d.y),0.0).rgb * 0.12;
  sum += textureSampleLevel(emission_texture,linear_sampler,uv+vec2<f32>(0.0,-d.y),0.0).rgb * 0.12;
  sum += textureSampleLevel(emission_texture,linear_sampler,uv+vec2<f32>( d.x, d.y)*1.6,0.0).rgb * 0.08;
  sum += textureSampleLevel(emission_texture,linear_sampler,uv+vec2<f32>(-d.x, d.y)*1.6,0.0).rgb * 0.08;
  sum += textureSampleLevel(emission_texture,linear_sampler,uv+vec2<f32>( d.x,-d.y)*1.6,0.0).rgb * 0.08;
  sum += textureSampleLevel(emission_texture,linear_sampler,uv+vec2<f32>(-d.x,-d.y)*1.6,0.0).rgb * 0.08;
  return sum * 0.16;
}
fn linear_to_srgb(value: vec3<f32>) -> vec3<f32> {
  let x = max(value,vec3<f32>(0.0));
  return select(1.055*pow(x,vec3<f32>(1.0/2.4))-vec3<f32>(0.055),12.92*x,x<=vec3<f32>(0.0031308));
}
@fragment fn composite_fragment(in: Out) -> @location(0) vec4<f32> {
  let uv = in.uv;
  let scene = textureSampleLevel(scene_texture,linear_sampler,uv,0.0).rgb;
  let body = textureSampleLevel(body_texture,linear_sampler,uv,0.0);
  let emission = textureSampleLevel(emission_texture,linear_sampler,uv,0.0).rgb;
  let light = textureSampleLevel(light_texture,linear_sampler,uv,0.0).rgb;
  let bloom = source_bloom(uv);
  let visible = load_mask(visibility_mask,uv) >= 0.5 && in.position.x >= frame.clip.x && in.position.y >= frame.clip.y && in.position.x < frame.clip.z && in.position.y < frame.clip.w;
  let receiver = clamp(load_mask(receiver_mask,uv),0.0,1.0);
  // 既存受光pixelのみ。scene色は反射応答に使うが、Eの強度を変える条件には使わない。
  let lit_scene = scene + scene*light*receiver;
  var result = (lit_scene+bloom)*(1.0-body.a) + body.rgb + emission;
  if (!visible) { result = scene; }
  // 診断表示はsampler専用。runtimeの既定は0で、形状の別案ではない。
  if (frame.debug_channel > 0.5 && frame.debug_channel < 1.5) { result = body.rgb; }
  if (frame.debug_channel >= 1.5 && frame.debug_channel < 2.5) { result = emission; }
  if (frame.debug_channel >= 2.5 && frame.debug_channel < 3.5) { result = light; }
  if (frame.debug_channel >= 3.5) { result = bloom; }
  // 固定SDR符号化。自動露光、Reinhard等の一律減光、背景別係数なし。
  return vec4<f32>(linear_to_srgb(result),1.0);
}
