@group(0) @binding(1) var image:texture_2d<f32>;
fn load(p:vec2i)->vec4f {let hi=vec2i(textureDimensions(image))-vec2i(1);return textureLoad(image,clamp(p,vec2i(0),hi),0);}
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
  var scatter=vec3f(0.);let stepPx=max(1,i32(round(f.anchor.w)));
  for(var j=1;j<=5;j++){
   let d=j*stepPx;let weight=exp(-f32(j)*.63)*.068;
   scatter+=(load(p+vec2i(d,0)).rgb+load(p-vec2i(d,0)).rgb+load(p+vec2i(0,d)).rgb+load(p-vec2i(0,d)).rgb)*weight;
   scatter+=(load(p+vec2i(d,d)).rgb+load(p+vec2i(-d,d)).rgb+load(p+vec2i(d,-d)).rgb+load(p-vec2i(d,d)).rgb)*weight*.35;
  }
  radiance+=scatter;
  if(f.flags.z>.5){
   let local=vec2f(rel.x,-rel.y)/f.anchor.z;
   for(var k=0;k<24;k++){
    let e=emitter(f.viewport.z,k);
    if(e.flux>0.){
     let q=local-e.center;
     // Chosen fixed aperture axes: vertical/horizontal for every point, no random angles.
     let lengthH=.042+f32(k%3)*.009;
     let lengthV=lengthH*1.35;
     let width=max(.0032,.3/f.anchor.z);
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
