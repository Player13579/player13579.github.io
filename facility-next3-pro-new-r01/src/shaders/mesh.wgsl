// 位置・coverage・発光を幾何から供給。sampler/textureを宣言しない。
struct Scene {
  world_to_clip: mat4x4<f32>,
  protected_rects: array<vec4<f32>,16>,
  params: vec4<f32>, // x=rect_count, y=reserved, z=reserved, w=reserved
};
@group(0) @binding(0) var<uniform> scene: Scene;
struct Input {
  @location(0) position: vec3<f32>,
  @location(1) color_alpha: vec4<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) style: f32,
  @location(4) space: f32,
};
struct Interpolated {
  @builtin(position) position: vec4<f32>,
  @location(0) color_alpha: vec4<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) @interpolate(flat) style: f32,
};
@vertex fn vs_main(input: Input) -> Interpolated {
  var output: Interpolated;
  if (input.space > 0.5) {
    output.position = vec4<f32>(input.position,1.0);
  } else {
    output.position = scene.world_to_clip * vec4<f32>(input.position,1.0);
  }
  output.color_alpha=input.color_alpha;
  output.uv=input.uv;
  output.style=input.style;
  return output;
}
@fragment fn fs_main(input: Interpolated) -> @location(0) vec4<f32> {
  // derivativeは非一様なdiscardより先に評価する。
  let radius=length(input.uv);
  let radial_aa=max(fwidth(radius),0.005);
  let side_aa=max(fwidth(input.uv.y),0.005);
  var coverage=1.0;
  if (input.style > 2.5) {
    let outer=1.0-smoothstep(1.0-radial_aa,1.0+radial_aa,radius);
    let inner=smoothstep(0.55,0.82,radius);
    coverage=outer*inner*(0.35+0.65*(1.0-radius));
  } else if (input.style > 1.5) {
    coverage=1.0-smoothstep(1.0-side_aa,1.0+side_aa,abs(input.uv.y));
  } else if (input.style > 0.5) {
    coverage=pow(max(0.0,1.0-radius*radius),2.0);
  }
  for(var i=0u;i<16u;i=i+1u) {
    if(i>=u32(scene.params.x)){break;}
    let r=scene.protected_rects[i];
    if(input.position.x>=r.x && input.position.x<r.z && input.position.y>=r.y && input.position.y<r.w) { discard; }
  }
  let alpha=clamp(input.color_alpha.a*coverage,0.0,1.0);
  return vec4<f32>(max(input.color_alpha.rgb,vec3<f32>(0.0))*alpha,alpha);
}
