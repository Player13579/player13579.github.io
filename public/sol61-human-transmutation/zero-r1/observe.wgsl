struct U { viewport:vec4f, anchor:vec4f, time:vec4f, flags:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var emission:texture_2d<f32>;
struct V { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
  var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  var v:V; v.position=vec4f(p[i],0,1); return v;
}
fn loadE(p:vec2i)->vec3f { return textureLoad(emission,clamp(p,vec2i(0),vec2i(u.viewport.xy)-1),0).rgb; }
fn encode(x:vec3f)->vec3f {
  return select(12.92*x,1.055*pow(max(x,vec3f(0)),vec3f(1./2.4))-.055,x>vec3f(.0031308));
}
@fragment fn fs(v:V)->@location(0) vec4f {
  let p=vec2i(v.position.xy); let e=loadE(p);
  // Selected observer is a direct-view eye/display PSF. No camera ghost is asserted.
  let r=i32(max(1.,round(u.viewport.z/64.)));
  var blur=e*.20;
  blur+=(loadE(p+vec2i(r,0))+loadE(p-vec2i(r,0))+loadE(p+vec2i(0,r))+loadE(p-vec2i(0,r)))*.12;
  blur+=(loadE(p+vec2i(r,r))+loadE(p+vec2i(-r,r))+loadE(p+vec2i(r,-r))+loadE(p-vec2i(r,r)))*.08;
  let radiance=textureLoad(scene,p,0).rgb+e+blur*.26*u.flags.z;
  // Monotone display shoulder retains strong white cores; it is not a background-dependent gain.
  let mapped=radiance/(vec3f(1.)+radiance*.38);
  return vec4f(encode(mapped),1.);
}
