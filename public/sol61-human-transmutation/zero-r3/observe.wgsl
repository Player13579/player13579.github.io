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
fn sparkMask(p:vec2i)->f32 {
  return textureLoad(emission,clamp(p,vec2i(0),vec2i(u.viewport.xy)-1),0).a;
}
fn loadSpark(p:vec2f)->vec3f {
  // Bilinear reconstruction avoids rounding the shared optical radius at noninteger DPR.
  // Scalar registered source radiance does not multiply unrelated main-body emission.
  let b=vec2i(floor(p)); let f=fract(p);
  let a=mix(mix(sparkMask(b),sparkMask(b+vec2i(1,0)),f.x),
    mix(sparkMask(b+vec2i(0,1)),sparkMask(b+vec2i(1,1)),f.x),f.y);
  return vec3f(1.,.94,.78)*a;
}
fn encode(x:vec3f)->vec3f {
  return select(12.92*x,1.055*pow(max(x,vec3f(0)),vec3f(1./2.4))-.055,x>vec3f(.0031308));
}
@fragment fn fs(v:V)->@location(0) vec4f {
  let p=vec2i(v.position.xy); let e=loadE(p);
  // Selected observer is a direct-view eye/display PSF. No camera ghost is asserted.
  let scale=u.viewport.z/64.;
  let r=i32(max(1.,round(scale)));
  var blur=e*.20;
  blur+=(loadE(p+vec2i(r,0))+loadE(p-vec2i(r,0))+loadE(p+vec2i(0,r))+loadE(p-vec2i(0,r)))*.12;
  blur+=(loadE(p+vec2i(r,r))+loadE(p+vec2i(-r,r))+loadE(p+vec2i(r,-r))+loadE(p-vec2i(r,r)))*.08;
  // Source-bound axial observer PSF: direct-view diffraction approximation, not world cross objects.
  // Only the registered welding emitters carry alpha; ordinary body light cannot generate these rays.
  let fp=vec2f(p);
  let rays=(loadSpark(fp+vec2f(scale,0))+loadSpark(fp-vec2f(scale,0))+loadSpark(fp+vec2f(0,scale))+loadSpark(fp-vec2f(0,scale)))*.62
    +(loadSpark(fp+vec2f(2.*scale,0))+loadSpark(fp-vec2f(2.*scale,0))+loadSpark(fp+vec2f(0,2.*scale))+loadSpark(fp-vec2f(0,2.*scale)))*.30
    +(loadSpark(fp+vec2f(3.*scale,0))+loadSpark(fp-vec2f(3.*scale,0))+loadSpark(fp+vec2f(0,3.*scale))+loadSpark(fp-vec2f(0,3.*scale)))*.09;
  // Narrow low-gain PSF keeps the attached pin cores distinct from the retained shell.
  let radiance=textureLoad(scene,p,0).rgb+e+(blur*.12+rays)*u.flags.z;
  // Monotone display shoulder retains strong white cores; it is not a background-dependent gain.
  let mapped=radiance/(vec3f(1.)+radiance*.38);
  return vec4f(encode(mapped),1.);
}
