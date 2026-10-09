@group(0) @binding(1) var image:texture_2d<f32>;
fn load(p:vec2i)->vec4f {let hi=vec2i(textureDimensions(image))-vec2i(1);return textureLoad(image,clamp(p,vec2i(0),hi),0);}
fn reconstruct(p:vec2f)->vec3f {
 // Texel centers are n+.5. Fractional reconstruction avoids shifted hard copies.
 let q=p-vec2f(.5);let lo=vec2i(floor(q));let a=fract(q);
 return mix(mix(load(lo).rgb,load(lo+vec2i(1,0)).rgb,a.x),mix(load(lo+vec2i(0,1)).rgb,load(lo+vec2i(1,1)).rgb,a.x),a.y);
}
fn encode(c:vec3f)->vec3f {return select(12.92*c,1.055*pow(c,vec3f(1./2.4))-.055,c>vec3f(.0031308));}
fn taperedRay(q:vec2f,len:f32,width:f32)->f32 {
 let along=abs(q.x)/len;
 if(along>=1.){return 0.;}
 let taper=1.-along;
 // Smoothly taper width AND intensity to a pointed finite tip.
 return exp(-pow(q.y/(width*(.16+.84*taper)),2.))*taper*taper;
}
@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let background=vec3f(.007,.012,.022);let rel=pixel.xy-f.anchor.xy;
 let margin=12.*max(1.,f.anchor.w);
 if(abs(rel.x)>.9*f.anchor.z+margin||rel.y < -2.*f.anchor.z-margin||rel.y>.4*f.anchor.z+margin){return vec4f(encode(1.-exp(-background)),1.);}
 let p=vec2i(pixel.xy);var radiance=load(p).rgb;
 if(f.flags.y>.5&&f.flags.x>.5&&f.viewport.z<1.8){
  var scatter=vec3f(0.);var normalization=0.;
  let pitch=max(.65,.8*f.anchor.w);
  for(var y=-3;y<=3;y++){for(var x=-3;x<=3;x++){
   let q=vec2f(f32(x),f32(y));let weight=exp(-dot(q,q)/4.5);
   scatter+=reconstruct(pixel.xy+q*pitch)*weight;normalization+=weight;
  }}
  // Normalized finite Gaussian PSF, additive energy, never a source fade.
  radiance+=scatter/normalization*.62;
  if(f.flags.z>.5){
   let local=vec2f(rel.x,-rel.y)/f.anchor.z;
   for(var k=0;k<32;k++){
    let e=emitter(f.viewport.z,k);
    if(e.flux>0.){
     let q=local-e.center;
     // Chosen fixed aperture axes: vertical/horizontal for every point, no random angles.
     let lengthH=.045+f32(k%3)*.006;
     let lengthV=lengthH*1.35;
     let width=max(.0045,.4/f.anchor.z);
     let cross=max(taperedRay(q,lengthH,width),taperedRay(q.yx,lengthV,width));
     let halo=exp(-dot(q,q)/(.00055))*.12;
     radiance+=vec3f(1.,.92,.43)*e.flux*(cross*.62+halo);
    }
   }
  }
 }
 // One final display transform after HDR source and source-bound OBS composition.
 return vec4f(encode(1.-exp(-(background+radiance))),1.);
}
