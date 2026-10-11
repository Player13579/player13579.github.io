@group(0) @binding(1) var field:texture_2d<f32>;
fn fetchLight(pixel:vec2i)->vec3f{return textureLoad(field,clamp(pixel,vec2i(0),vec2i(textureDimensions(field))-vec2i(1)),0).rgb;}
fn displayColor(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(c,vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f{
 let pos=vec2i(pixel.xy);var radiation=fetchLight(pos);let pitch=max(1.,f.extra.x/64.);
 if(f.flags.y>.5&&f.flags.x>.5){
  var shoulder=vec3f(0.);var weight=0.;
  for(var y=-1;y<=1;y++){for(var x=-1;x<=1;x++){
   let delta=vec2f(f32(x),f32(y));let w=exp(-dot(delta,delta)*.65);
   shoulder+=fetchLight(pos+vec2i(round(delta*pitch*2.3)))*w;weight+=w;
  }}
  radiation+=shoulder/weight*.30;
 }
 var base=vec3f(f.extra.y)*vec3f(.70,.85,1.);
 if(f.flags.z>.5){
  let p=weaponLocal(pixel.xy);let actor=weaponLocal(f.points.zw);
  let body=1.-smoothstep(.38,.40,length((p-actor)/vec2f(.56,1.)));
  let head=1.-smoothstep(.16,.18,length(p-actor-vec2f(0.,-.50)));
  let weapon=1.-smoothstep(.042,.056,segmentDistance(p,vec2f(-.20,0.),vec2f(1.,0.)));
  let grip=1.-smoothstep(.034,.046,segmentDistance(p,vec2f(-.04,0.),weaponLocal(f.points.xy)));
  base+=vec3f(.034,.043,.052)*(body+head)+vec3f(.060,.069,.080)*max(weapon,grip);
 }
 let mapped=1.-exp(-(base+radiation));return vec4f(displayColor(mapped),1.);
}
