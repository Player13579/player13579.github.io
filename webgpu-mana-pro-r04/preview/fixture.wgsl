// Preview-only neutral H64 calibration body. Not part of game effect or a supplied character skin.
struct Settings { viewport: vec4<f32>, placement: vec4<f32>, options: vec4<f32>, };
@group(0) @binding(0) var<uniform> settings: Settings;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  let p = array<vec2<f32>,3>(vec2<f32>(-1.0,-1.0),vec2<f32>(3.0,-1.0),vec2<f32>(-1.0,3.0));
  return vec4<f32>(p[i],0.0,1.0);
}
fn box(p: vec2<f32>, size: vec2<f32>, r: f32) -> f32 { let q = abs(p) - size + vec2<f32>(r); return length(max(q,vec2<f32>(0.0))) + min(max(q.x,q.y),0.0) - r; }
@fragment fn fs(@builtin(position) p: vec4<f32>) -> @location(0) vec4<f32> {
  let local = (p.xy / settings.viewport.w - settings.placement.xy) / settings.viewport.z;
  if (settings.options.x > 0.5) {
    if (settings.options.y < 0.5) { discard; }
    let d = box(local - vec2<f32>(6.0,-31.0),vec2<f32>(8.0,15.0),1.0);
    let a = 1.0 - smoothstep(-0.45,0.45,d);
    let c = mix(vec3<f32>(0.012,0.020,0.030),vec3<f32>(0.075,0.095,0.115),smoothstep(0.1,1.2,-d));
    return vec4<f32>(c*a,a);
  }
  if (settings.options.z < 0.5) { discard; }
  let head = length(local-vec2<f32>(0.0,-56.0))-8.0;
  let torso = box(local-vec2<f32>(0.0,-34.0),vec2<f32>(10.0,14.0),1.8);
  let arms = box(vec2<f32>(abs(local.x)-13.2,local.y+32.0),vec2<f32>(2.8,12.0),1.8);
  let legs = box(vec2<f32>(abs(local.x)-5.1,local.y+10.0),vec2<f32>(3.6,10.0),1.0);
  let d = min(min(head,torso),min(arms,legs));
  let aa = max(fwidth(d),0.12);let alpha = 1.0-smoothstep(-aa,aa,d);
  let inner = smoothstep(0.25,1.2,-d);
  var color = mix(vec3<f32>(0.010,0.018,0.030),vec3<f32>(0.17,0.19,0.23),inner);
  // Large existing chest facet helps distinguish illumination from an inserted closed object.
  if (abs(local.x)<7.5 && local.y > -45.0 && local.y < -32.0) { color *= 1.13; }
  return vec4<f32>(color*alpha,alpha);
}
