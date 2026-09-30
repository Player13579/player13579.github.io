// OBS1のみ。実source MRTに束縛し、world PHへ混ぜない。
struct Observation { pixels:vec4f, controls:vec4f };
@group(0) @binding(0) var<uniform> observe:Observation;
@group(0) @binding(1) var worldImage:texture_2d<f32>;
@group(0) @binding(2) var sourceImage:texture_2d<f32>;
@vertex fn fullscreen(@builtin(vertex_index)index:u32)->@builtin(position)vec4f {
 let triangle=array<vec2f,3>(vec2f(-1,-1),vec2f(-1,3),vec2f(3,-1));return vec4f(triangle[index],0,1);
}
fn photons(pixel:vec2i)->vec3f {
 let extent=vec2i(textureDimensions(sourceImage));return textureLoad(sourceImage,clamp(pixel,vec2i(0),extent-vec2i(1)),0).rgb;
}
fn sourceWhite(pixel:vec2i)->vec3f {
 let light=photons(pixel);let strength=max(0.,min(light.x,min(light.y,light.z))-1.70);
 return vec3f(1.07,1.10,.98)*strength;
}
fn neighbouringLight(pixel:vec2i)->vec3f {
 var answer=vec3f(0.);var divisor=0.;
 for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){
  let weight=exp(-f32(x*x+y*y)/2.25);let offset=vec2i(round(vec2f(f32(x),f32(y))*2.*observe.pixels.z));
  answer+=photons(pixel+offset)*weight;divisor+=weight;
 }}return answer/divisor*.22;
}
fn fixedSparkle(pixel:vec2i)->vec3f {
 let major=vec2f(.970295726,.241921896);let minor=vec2f(-major.y,major.x);var answer=vec3f(0.);var divisor=0.;
 for(var k=-4;k<=4;k++){
  let t=f32(k)/4.;let weight=1.-.75*abs(t);
  answer+=sourceWhite(pixel+vec2i(round(major*(8.*t*observe.pixels.z))))*weight;
  answer+=sourceWhite(pixel+vec2i(round(minor*(4.5*t*observe.pixels.z))))*weight*.82;
  divisor+=weight*1.82;
 }return answer/divisor*.38;
}
@fragment fn observeComposite(@builtin(position)position:vec4f)->@location(0)vec4f {
 let pixel=vec2i(position.xy);let world=textureLoad(worldImage,pixel,0).rgb;
 let near=neighbouringLight(pixel)*observe.controls.x;
 let sparkle=fixedSparkle(pixel)*observe.controls.x*observe.controls.y;
 return vec4f(pow(max(vec3f(0.),world+near+sparkle),vec3f(1./2.2)),1.);
}
