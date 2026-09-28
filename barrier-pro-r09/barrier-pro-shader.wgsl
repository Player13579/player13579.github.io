struct Uniforms {
  resolution : vec2<f32>,
};

@group(0) @binding(0) var<uniform> U : Uniforms;
@group(0) @binding(1) var barrierTex : texture_2d<f32>;

struct VSOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

@vertex
fn vsMain(@builtin(vertex_index) index : u32) -> VSOut {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>(3.0, 1.0),
    vec2<f32>(-1.0, 1.0)
  );
  let p = positions[index];
  var out : VSOut;
  out.pos = vec4<f32>(p, 0.0, 1.0);
  out.uv = 0.5 * (p + vec2<f32>(1.0, 1.0));
  return out;
}

@fragment
fn fsMain(in : VSOut) -> @location(0) vec4<f32> {
  let size = vec2<i32>(i32(U.resolution.x), i32(U.resolution.y));
  let xy = clamp(vec2<i32>(in.uv * U.resolution), vec2<i32>(0, 0), size - vec2<i32>(1, 1));
  let src = textureLoad(barrierTex, xy, 0);
  return vec4<f32>(src.rgb, 1.0);
}
