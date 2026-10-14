struct Uniforms { viewport:vec4f, muzzle:vec4f, options:vec4f, dynamics:vec4f }
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var light:texture_2d<f32>;
struct VOut { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VOut;o.position=vec4f(p[i],0,1);return o;}
fn loadLight(p:vec2i)->vec3f {let size=vec2i(textureDimensions(light));return textureLoad(light,clamp(p,vec2i(0),size-vec2i(1)),0).rgb;}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f {
 let pixel=vec2i(pos.xy);var c=textureLoad(scene,pixel,0).rgb;
 if(u.options.x>.5){
  // Dense normalized 9x9 PSF with continuous Gaussian footprint, not sparse copies.
  var glow=vec3f(0);var total=0.;
  for(var y=-4;y<=4;y++){for(var x=-4;x<=4;x++){let w=exp(-f32(x*x+y*y)/8.);glow+=loadLight(pixel+vec2i(x,y))*w;total+=w;}}
  c+=glow/total*.16;
  let axis=u.viewport.xy*.5-u.muzzle.xy;
  let ghostCenter=u.viewport.xy*.5+axis*.42;
  let r=length((pos.xy-ghostCenter)/(14.*u.options.z));
  let offAxis=clamp(length(axis)/length(u.viewport.xy*.5),0.,1.);
  // Residual coated-lens reflection: flux/time/source position all bound to muzzle.
  let ghost=exp(-r*r*2.)*u.dynamics.x*.025*(.5+.5*offAxis)*u.viewport.w;
  c+=ghost*vec3f(1.,.63,.29);
 }
 // Fixed linear HDR display transform; never background-driven exposure.
 c=vec3f(1.)-exp(-c);c=pow(max(c,vec3f(0)),vec3f(1./2.2));return vec4f(c,1.);
}
