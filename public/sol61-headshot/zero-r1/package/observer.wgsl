@group(0) @binding(1) var image:texture_2d<f32>;
fn load(p:vec2i)->vec3f {let hi=vec2i(textureDimensions(image))-vec2i(1);return textureLoad(image,clamp(p,vec2i(0),hi),0).rgb;}
fn reconstruct(p:vec2f)->vec3f {
 let q=p-vec2f(.5);let lo=vec2i(floor(q));let a=fract(q);
 return mix(mix(load(lo),load(lo+vec2i(1,0)),a.x),mix(load(lo+vec2i(0,1)),load(lo+vec2i(1,1)),a.x),a.y);
}
fn encode(c:vec3f)->vec3f {return select(12.92*c,1.055*pow(c,vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let rel=pixel.xy-f.anchor.xy;let local=vec2f(rel.x,-rel.y)/f.anchor.z;
 var background=vec3f(.009,.014,.020);
 if(f.flags.z>.5){
  // Non-character diagnostic head-location disc; not a rendered game actor/material.
  let head=1.-smoothstep(.083,.091,length(local));
  background=mix(background,vec3f(.075,.085,.095),head);
 }
 var radiance=load(vec2i(pixel.xy));
 if(f.flags.y>.5&&f.flags.x>.5&&f.viewport.z<1.25&&abs(rel.x)<.55*f.anchor.z+12.&&rel.y>-.65*f.anchor.z-12.&&rel.y<.25*f.anchor.z+12.){
  var scatter=vec3f(0.);var total=0.;let pitch=max(.55,.7*f.anchor.w);
  for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){
   let q=vec2f(f32(x),f32(y));let w=exp(-dot(q,q)/2.);scatter+=reconstruct(pixel.xy+q*pitch)*w;total+=w;
  }}
  // Local source-derived scattering; no ghost, flare, global grading or arbitrary rays.
  radiance+=scatter/total*.35;
 }
 return vec4f(encode(1.-exp(-(background+radiance))),1.);
}
