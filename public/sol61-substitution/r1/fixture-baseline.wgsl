// Technical-only GPU reference silhouette. This is a fixture, not game art.
struct U { viewport: vec2f, ageRole: vec2f, foot: vec2f, height: f32, flags: f32, rest: array<vec4f, 2> };
@group(0) @binding(0) var<uniform> u: U;

struct VOut { @builtin(position) pos: vec4f, @location(0) px: vec2f };
@vertex fn vsMain(@builtin(vertex_index) i: u32) -> VOut {
  var p = array<vec2f, 3>(vec2f(-1.0,-1.0), vec2f(3.0,-1.0), vec2f(-1.0,3.0));
  var o: VOut;
  o.pos = vec4f(p[i],0.0,1.0);
  o.px = vec2f((p[i].x+1.0)*0.5*u.viewport.x, (1.0-p[i].y)*0.5*u.viewport.y);
  return o;
}
fn box(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  return select(0.0,1.0, all(p >= a) && all(p <= b));
}
@fragment fn fsMain(v: VOut) -> @location(0) vec4f {
  let h = max(24.0,u.height);
  let local = vec2f(v.px.x-u.foot.x, v.px.y-(u.foot.y-h));
  let head = 1.0-smoothstep(h*0.17,h*0.19,length(local-vec2f(0.0,h*0.16)));
  let torso = box(local,vec2f(-h*0.14,h*0.25),vec2f(h*0.14,h*0.62));
  let legs = box(local,vec2f(-h*0.18,h*0.62),vec2f(h*0.18,h*0.96));
  let body = max(head,max(torso,legs));
  let shade = vec3f(0.47,0.52,0.58);
  return vec4f(shade*body,body);
}
