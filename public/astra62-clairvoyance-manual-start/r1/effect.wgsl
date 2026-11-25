struct Params {
  size: vec2f, age: f32, scale: f32,
  reduced: f32, live: f32, unused: vec2f,
}
@group(0) @binding(0) var<uniform> params: Params;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let corners = array<vec2f, 3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
  return vec4f(corners[i],0,1);
}
fn lineDistance(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let v = b-a;
  return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.,1.));
}
fn fill(distance: f32, aa: f32) -> f32 {
  return 1.-smoothstep(-aa,aa,distance);
}
@fragment fn fs(@builtin(position) coord: vec4f) -> @location(0) vec4f {
  let p = (coord.xy-.5*params.size)/params.scale;
  let aa = .65/params.scale;
  let backdrop = vec3f(.048,.072,.091);
  if (params.live < .5) { return vec4f(backdrop,1); }
  let t = params.age;
  let opacity = smoothstep(0.,82.,t)*(1.-smoothstep(832.,1070.,t));
  let open = smoothstep(110.,515.,t);
  let radial = length(p);
  let metalLight = clamp(.56+dot(p,vec2f(-.009,-.012)),0.,1.);
  var color = backdrop;
  let outer = fill(radial-43.,aa);
  color = mix(color,mix(vec3f(.17,.105,.07),vec3f(.82,.69,.47),metalLight),outer);
  color = mix(color,vec3f(.072,.073,.078),fill(radial-39.,aa));
  let inner = fill(radial-36.4,aa);
  let radius = mix(.0,22.,open);
  let twist = mix(0.,.30,open)*(1.-params.reduced);
  let edge = 1.04719755;
  var insideDistance = -1000.;
  var seamDistance = 1000.;
  var vaneLight = .5;
  var nearestPlane = -1000.;
  for (var j=0; j<6; j++) {
    let angle = f32(j)*edge+twist-.5*edge;
    let normal = vec2f(cos(angle),sin(angle));
    let tangent = vec2f(-normal.y,normal.x);
    let plane = dot(normal,p);
    insideDistance = max(insideDistance,plane-radius);
    if (plane > nearestPlane) {
      nearestPlane = plane;
      vaneLight = clamp(.43+.32*dot(normal,vec2f(-.6,-.8))+.006*dot(p,tangent),0.,1.);
    }
    let joint = radius*(normal+.57735027*tangent);
    seamDistance = min(seamDistance,lineDistance(p,joint,joint+53.*tangent));
  }
  let brass = mix(vec3f(.29,.19,.12),vec3f(.79,.63,.36),vaneLight);
  let seam = fill(seamDistance-.53,aa);
  let blades = mix(brass,vec3f(.17,.12,.09),seam*.82);
  color = mix(color,blades,inner);
  let aperture = fill(insideDistance,aa)*smoothstep(0.,2.,radius);
  let glass = mix(vec3f(.16,.12,.09),vec3f(.80,.49,.15),
    (1.-smoothstep(0.,23.,radial))*open);
  color = mix(color,glass,aperture*inner);
  let catchlight = 1.-smoothstep(1.3,4.3,radial);
  let seated = smoothstep(480.,530.,t);
  color = mix(color,vec3f(1.,.89,.61),catchlight*seated*aperture);
  return vec4f(mix(backdrop,color,opacity),1.);
}
