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
// Preserve the unlit R1 material colors through the new linear-light shoulder.
fn decodeSrgb(s:vec3f)->vec3f {
  return select(s/12.92,pow((s+.055)/1.055,vec3f(2.4)),s>vec3f(.04045));
}
fn expose(base:vec3f, extra:vec3f)->vec3f {
  let reference=decodeSrgb(base);
  let room=vec3f(1.)-reference;
  let linear=reference+room*(vec3f(1.)-exp(-extra/max(room,vec3f(.0001))));
  return select(12.92*linear,1.055*pow(linear,vec3f(1./2.4))-.055,linear>vec3f(.0031308));
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
  // The glass is visible only inside the moving hexagon. Its exposed area controls flux.
  let relativeArea=open*open;
  let seated=smoothstep(480.,530.,t);
  let core=exp(-.5*radial*radial/6.25)*seated;
  let glassMaterial=mix(vec3f(.13,.085,.054),vec3f(.33,.17,.061),
    1.-smoothstep(.0,24.,radial));
  color=mix(color,glassMaterial,aperture*inner);
  let glassFlux=vec3f(1.38,.51,.083)*open*(.61+.39*exp(-radial*radial/265.));
  let direct=(glassFlux+vec3f(2.1,1.55,.69)*core)*aperture*inner;

  // Inner cut edges see the glass directly. Returned light depends on distance and facet.
  let distanceToGlass=max(insideDistance,0.);
  let surfaceView=.24+.76*vaneLight;
  let bladeReturn=(1.-aperture)*inner*relativeArea*surfaceView*
    (.19*exp(-distanceToGlass/10.3)+.58*exp(-distanceToGlass/2.5))*(1.-.57*seam);
  let rimBand=outer*(1.-fill(radial-39.,aa));
  let rimView=.30+.70*clamp(dot(p,vec2f(.72,.69))/43.,0.,1.);
  let rimReturn=relativeArea*rimBand*rimView*(.08+.15*exp(-abs(radial-40.)/1.15));
  let reflected=vec3f(1.03,.45,.085)*(bladeReturn+rimReturn);

  // Analytic optical spread: tight near the aperture silhouette, broad around the emitter.
  // The outer component passes the housing edge and remains finite on the dark background.
  let width=18.+.54*radius;
  let skirt=.29*exp(-.5*radial*radial/(width*width));
  let cutoff=1.-smoothstep(61.,91.,radial);
  let near=.18*exp(-.5*distanceToGlass*distanceToGlass/38.);
  let bloom=vec3f(.97,.39,.072)*relativeArea*(near+skirt)*cutoff+
    vec3f(.69,.47,.18)*.18*seated*relativeArea*exp(-radial*radial/130.);
  let lit=expose(color,direct+reflected+bloom);
  return vec4f(mix(backdrop,lit,opacity),1.);
}
