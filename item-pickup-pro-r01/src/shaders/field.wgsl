// PH1の主形・内部・境界・局所照度を生成する。画像素材・乱数・他Eの形状を使わない。
struct Frame { viewport: vec2<f32>, pad: vec2<f32> }
struct Instance {
  origin: vec2<f32>, axis_x: vec2<f32>, axis_y: vec2<f32>,
  age_ms: f32, reduced_motion: f32, clip: vec4<f32>, reserved: vec4<f32>
}
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> instances: array<Instance>;
@group(0) @binding(2) var visibility_mask: texture_2d<f32>;

struct Varying {
  @builtin(position) position: vec4<f32>,
  @location(0) local: vec2<f32>,
  @location(1) @interpolate(flat) age_ms: f32,
  @location(2) @interpolate(flat) reduced_motion: f32,
  @location(3) @interpolate(flat) clip: vec4<f32>
}
@vertex fn field_vertex(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance_id: u32) -> Varying {
  let corners = array<vec2<f32>, 6>(
    vec2<f32>(-1.0,-1.0), vec2<f32>(1.0,-1.0), vec2<f32>(-1.0,1.0),
    vec2<f32>(-1.0,1.0), vec2<f32>(1.0,-1.0), vec2<f32>(1.0,1.0));
  let data = instances[instance_id];
  let p = corners[vertex];
  let pixel = data.origin + data.axis_x*p.x + data.axis_y*p.y;
  var out: Varying;
  out.position = vec4<f32>(2.0*pixel.x/frame.viewport.x-1.0, 1.0-2.0*pixel.y/frame.viewport.y, 0.0, 1.0);
  out.local = p; out.age_ms = data.age_ms; out.reduced_motion = data.reduced_motion; out.clip = data.clip;
  return out;
}

struct Phase { body: f32, emission: f32, seam: f32, closure: f32 }
fn phase(t: f32, reduced: f32) -> Phase {
  var result: Phase;
  result.body = smoothstep(0.0,90.0,t) * (1.0-smoothstep(900.0,1800.0,t));
  result.emission = smoothstep(0.0,210.0,t) * (1.0-smoothstep(420.0,1560.0,t));
  result.seam = smoothstep(180.0,360.0,t) * (1.0-smoothstep(620.0,1200.0,t));
  result.closure = select(smoothstep(60.0,420.0,t), 1.0, reduced > 0.5);
  return result;
}
fn mask_at(pixel: vec2<f32>) -> f32 {
  let size = textureDimensions(visibility_mask);
  let uv = pixel / frame.viewport;
  let coord = vec2<i32>(clamp(uv*vec2<f32>(size), vec2<f32>(0.0), vec2<f32>(size)-vec2<f32>(1.0)));
  return textureLoad(visibility_mask,coord,0).r;
}
struct FieldOutput {
  @location(0) body: vec4<f32>,
  @location(1) emission: vec4<f32>,
  @location(2) local_light: vec4<f32>
}
@fragment fn field_fragment(in: Varying) -> FieldOutput {
  let p = in.local;
  // 微分は一様制御フローで評価。画面周波数とworld半径を混同しない。
  let aa = max(0.002, 0.70 * max(fwidth(p.x), fwidth(p.y)));
  if (in.age_ms <= 0.0 || in.age_ms >= 1800.0) { discard; }
  if (in.position.x < in.clip.x || in.position.y < in.clip.y || in.position.x >= in.clip.z || in.position.y >= in.clip.w) { discard; }
  let visibility = mask_at(in.position.xy);
  if (visibility < 0.5 || length(p) >= 0.98) { discard; }
  let state = phase(in.age_ms, in.reduced_motion);
  let half_height = 0.86 - 0.045*state.closure;
  let v = p.y / half_height;
  let section = max(0.0, 1.0-v*v);
  let outer = 0.565*pow(section,0.63) + 0.045*section;
  let bend = 0.060*v*section*(1.0-0.72*state.closure);
  let x = p.x-bend;
  let gap = (0.130-0.077*state.closure)*section + 0.018;
  let outer_distance = outer-abs(x);
  let inner_distance = abs(x)-gap;
  let cap_distance = half_height-abs(p.y);
  let coverage = smoothstep(-aa,aa,min(min(outer_distance,inner_distance),cap_distance));
  let width = max(0.018,outer-gap);
  let cross_section = clamp((abs(x)-gap)/width,0.0,1.0);

  // L1: 一つの場の膜状域。L2: 折り返しの放射勾配。L3: 外縁は暗く、内縁は薄く明るい。
  let ridge = exp(-pow((cross_section-0.56)/0.19,2.0));
  let inner_fold = exp(-pow((cross_section-0.13)/0.12,2.0));
  let outer_border = 1.0-smoothstep(max(aa*0.55,0.015),max(aa*1.75,0.056),outer_distance);
  let end_border = 1.0-smoothstep(0.01,max(aa*1.8,0.045),cap_distance);
  let border = clamp(max(outer_border,end_border),0.0,1.0)*coverage;
  let section_tone = 0.32+0.58*ridge;
  let body_color = mix(vec3<f32>(0.014,0.22,0.25),vec3<f32>(0.060,0.69,0.52),section_tone);
  let edge_color = vec3<f32>(0.016,0.012,0.041);
  var opacity = coverage * state.body * (0.51+0.19*ridge);
  opacity = mix(opacity,0.94*state.body,border);
  var surface = mix(body_color,edge_color,border);
  var premultiplied = surface * opacity;

  // 短い綴じ目はPH1内部の境界定着。十字光条、item像、投射物ではない。
  let seam_axis = 0.010*sin(p.y*5.0);
  let seam_end = 1.0-smoothstep(0.23,0.31,abs(p.y+0.025));
  let seam_width = max(0.022,aa*0.70);
  let seam_shape = (1.0-smoothstep(seam_width,seam_width+aa,abs(p.x-seam_axis))) * seam_end * state.seam;
  let seam_opacity = 0.92*seam_shape;
  premultiplied = premultiplied*(1.0-seam_opacity) + vec3<f32>(0.98,0.63,0.23)*seam_opacity;
  opacity = opacity + seam_opacity*(1.0-opacity);

  // 不透明度、放射、場の分布は独立量。暗縁を発光強度から生成しない。
  let emitter_color = mix(vec3<f32>(0.025,0.78,0.52),vec3<f32>(0.14,0.93,0.68),inner_fold);
  let radiance = emitter_color * coverage * state.emission * (0.10+0.50*ridge+0.26*inner_fold) * (1.0-border)
    + vec3<f32>(1.35,0.88,0.31)*seam_shape;

  // L4: 同じ場からの有限な局所照度。既存受光面のmaskは合成段階で必須。
  // 仮想場の入力分布であり、熱、能力、床への衝撃を導入しない。
  let normalized_radius = length(p/vec2<f32>(0.94,0.97));
  let falloff = pow(max(0.0,1.0-normalized_radius),2.0)/(1.0+2.0*normalized_radius*normalized_radius);
  let local_irradiance = (vec3<f32>(0.05,0.46,0.30)+vec3<f32>(0.25,0.13,0.025)*state.seam) * state.emission * falloff;
  var out: FieldOutput;
  out.body = vec4<f32>(premultiplied,opacity);
  out.emission = vec4<f32>(radiance,0.0);
  out.local_light = vec4<f32>(local_irradiance,0.0);
  return out;
}
