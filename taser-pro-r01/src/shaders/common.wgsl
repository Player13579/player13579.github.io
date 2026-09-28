struct Globals {
  size: vec4f, // framebuffer width,height,pixel ratio,unused
  options: vec4f, // world,glare,receiver,bench
};
struct Instance {
  geom: vec4f, // center in framebuffer pixels, scale (H64=1), age seconds
  clip: vec4f, // left,top,right,bottom in framebuffer pixels
  flags: vec4f, // reduced motion, partial occluder, target visible, effect enabled
};
@group(0) @binding(0) var<uniform> g: Globals;
@group(0) @binding(1) var<storage, read> instances: array<Instance>;
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) @interpolate(flat) index: u32,
};
fn capsule(p: vec2f, a: vec2f, b: vec2f, r: f32) -> f32 {
  let ab = b-a;
  return length(p-a-ab*clamp(dot(p-a,ab)/max(dot(ab,ab),0.00001),0.,1.))-r;
}
fn coverage(d: f32, aa: f32) -> f32 { return 1.-smoothstep(-aa,aa,d); }
fn clipped(pos: vec2f, rect: vec4f) -> bool {
  return pos.x < rect.x || pos.y < rect.y || pos.x >= rect.z || pos.y >= rect.w;
}
@vertex fn instanceVertex(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VertexOut {
  let corners = array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));
  let local = corners[vi] * vec2f(59.,52.);
  let pixel = instances[ii].geom.xy + local * instances[ii].geom.z;
  var out: VertexOut;
  out.position = vec4f(pixel/g.size.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);
  out.local = local; out.index = ii;
  return out;
}
struct FullOut { @builtin(position) position: vec4f };
@vertex fn fullVertex(@builtin(vertex_index) vi: u32) -> FullOut {
  let c = array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var out: FullOut; out.position = vec4f(c[vi],0.,1.); return out;
}
