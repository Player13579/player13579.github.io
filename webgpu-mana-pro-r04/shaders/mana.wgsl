// r0.4 native WGSL. Geometry is a new triangle mesh, not a textured oval or a post-effect silhouette.
struct View {
  canvas: vec4<f32>, // physical width, physical height, CSS/game scale, DPR
  camera: vec4<f32>, // world camera xy, CSS origin xy
};
@group(0) @binding(0) var<uniform> view: View;
struct VertexInput {
  @location(0) point: vec2<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) base: vec4<f32>,
  @location(3) light: vec4<f32>,
  @location(4) params: vec4<f32>,
};
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) base: vec4<f32>,
  @location(2) light: vec4<f32>,
  @location(3) @interpolate(flat) params: vec4<f32>,
};
@vertex fn vs(input: VertexInput) -> VertexOutput {
  let css = (input.point - view.camera.xy) * view.canvas.z + view.camera.zw;
  let pixel = css * view.canvas.w;
  var output: VertexOutput;
  output.position = vec4<f32>(2.0 * pixel.x / view.canvas.x - 1.0, 1.0 - 2.0 * pixel.y / view.canvas.y, 0.0, 1.0);
  output.uv = input.uv;
  output.base = input.base;
  output.light = input.light;
  output.params = input.params;
  return output;
}
struct FragmentOutput {
  @location(0) surface: vec4<f32>,
  @location(1) radiance: vec4<f32>,
};
@fragment fn fs(input: VertexOutput) -> FragmentOutput {
  let role = u32(input.params.x + 0.5);
  let v = input.uv.y;
  // Evaluated outside branches; does not silence uniformity diagnostics.
  let edgeAA = max(fwidth(v), 0.015);
  var alpha = input.base.w;
  var color = input.base.xyz;
  var energy = input.light.xyz * input.light.w;
  if (role == 1u) {
    // Broad colored carrier with a dark longitudinal recess and a finite luminous crest.
    let side = 1.0 - smoothstep(0.87 - edgeAA, 1.0 + edgeAA, abs(v));
    let darkCore = 1.0 - smoothstep(0.05, 0.24, abs(v + 0.24));
    let crest = exp(-55.0 * (v - 0.40) * (v - 0.40));
    let leading = 0.28 + 0.72 * exp(-22.0 * (input.uv.x - 0.70) * (input.uv.x - 0.70));
    let face = clamp(0.70 + 0.30 * v, 0.36, 1.0);
    color *= face * (1.0 - 0.82 * darkCore);
    let keyEdge = smoothstep(0.69, 0.91, abs(v));
    color = mix(color, vec3<f32>(0.003, 0.009, 0.023), keyEdge * 0.88);
    energy *= crest * leading + 0.040;
    alpha *= side;
  } else if (role == 2u) {
    // Real transfer/filled-front support already comes from the mesh and area ledger.
    energy *= 0.92;
  } else if (role == 3u) {
    // Existing torso shape is the mask. No radial/ellipse distance is used for stored charge.
    let normalResponse = clamp(0.76 + 0.21 * input.uv.x - 0.12 * input.uv.y, 0.38, 1.0);
    color *= normalResponse;
    energy *= 0.18 + 0.82 * pow(max(0.0, 1.0 - abs(input.uv.x + 0.38) * 0.70), 2.0);
  } else if (role == 4u) {
    color *= 0.78 + 0.22 * clamp(1.0 - input.uv.y, 0.0, 1.0);
    energy *= 0.55;
  }
  var output: FragmentOutput;
  output.surface = vec4<f32>(color * alpha, alpha);
  output.radiance = vec4<f32>(energy * alpha, 0.0);
  return output;
}
