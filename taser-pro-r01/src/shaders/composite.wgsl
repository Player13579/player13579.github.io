struct DisplayParams { options: vec4f }; // bloom coefficient,linear source coefficient,unused,unused
@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var material: texture_2d<f32>;
@group(0) @binding(2) var emission: texture_2d<f32>;
@group(0) @binding(3) var glare: texture_2d<f32>;
@group(0) @binding(4) var mask: texture_2d<f32>;
@group(0) @binding(5) var<uniform> display: DisplayParams;
struct DisplayVertex { @builtin(position) position: vec4f };
@vertex fn vertex(@builtin(vertex_index) i:u32)->DisplayVertex {
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
 var o:DisplayVertex; o.position=vec4f(p[i],0.,1.); return o;
}
fn encodeSRGB(c:vec3f)->vec3f {
  return select(12.92*c,1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c>vec3f(.0031308));
}
@fragment fn fragment(i:DisplayVertex)->@location(0) vec4f {
  let xy=vec2i(i.position.xy);
  let m=textureLoad(material,xy,0);
  let base=m.rgb+textureLoad(scene,xy,0).rgb*(1.-m.a);
  let protection=textureLoad(mask,xy,0);
  let source=textureLoad(emission,xy,0).rgb*display.options.y;
  let bloom=textureLoad(glare,xy,0).rgb*display.options.x*(1.-protection.g)*(1.-protection.b);
  // OBS2: sourceの局所shoulder。source=0なら背景は厳密に不変。
  let result=base+(vec3f(1.)-base)*(vec3f(1.)-exp(-source-bloom));
  return vec4f(encodeSRGB(clamp(result,vec3f(0.),vec3f(1.))),1.);
}
