// GPT-6-Astra r15: body-local refraction resolves to the unchanged actor image.
export const shader=/*wgsl*/`
struct Uniforms { viewport:vec2f, center:vec2f, height:f32, phase:f32, light:f32, reduced:f32 };
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(v[i],0.,1.);
}
fn ease(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn actorSample(uv:vec2f)->vec4f {
 let xy=uv*116.+vec2f(63.5,63.5);
 if(any(xy<vec2f(0.))||any(xy>=vec2f(128.))){return vec4f(0.);}
 return textureSampleLevel(actor,samp,xy/vec2f(2560.,1536.),0.);
}
fn face(uv:vec2f)->f32 {
 return (1.-ease(.13,.23,abs(uv.x)))*ease(-.44,-.32,uv.y)*(1.-ease(-.02,.085,uv.y));
}
@fragment fn fs(@builtin(position) pix:vec4f)->@location(0) vec4f {
 let bg=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),u.light);
 let uv=(pix.xy-u.center)/u.height;
 let original=actorSample(uv);let p=u.phase;
 if(original.a<.001||face(uv)>.025||p<0.||p>=.90){return vec4f(mix(bg,original.rgb,original.a),1.);}
 // Three asymmetric internal regions. Alpha and screen position never move.
 var region=-1;var distance=0.;var shift=vec2f(0.);var start=0.;var finish=1.;var seam=0.;
 if(uv.y>=.075&&uv.y<.285&&uv.x>=-.115&&uv.x<.145-.12*uv.y){
  region=0;distance=clamp(abs(uv.x+.01)/.145,0.,1.);shift=vec2f(.078125,0.);start=.12;finish=.66;
  seam=exp(-pow((uv.x-(.145-.12*uv.y))/.016,2.));
 }else if(uv.y>=.07&&uv.y<.32&&uv.x>=-.34&&uv.x<-.115){
  region=1;distance=clamp((-uv.x-.115)/.225,0.,1.);shift=vec2f(.070,.040);start=.20;finish=.73;
  seam=exp(-pow((uv.x+.115)/.016,2.));
 }else if(uv.y>=.285&&uv.y<.49&&abs(uv.x)<.27){
  region=2;distance=clamp((uv.y-.285)/.205,0.,1.);shift=vec2f(-.078125,-.015);start=.28;finish=.80;
  seam=exp(-pow((uv.y-.285)/.018,2.));
 }
 if(region<0){return vec4f(mix(bg,original.rgb,original.a),1.);}
 let progress=ease(start,finish,p);
 // Initial image is stably misregistered. No shake, looping jitter or ghost copy.
 let remaining=ease(progress-.10,progress+.10,distance)*(1.-ease(.92,1.,progress));
 var displacement=shift*remaining*(1.-u.reduced*.35);
 var refracted=actorSample(uv+displacement);
 // Do not pull transparent atlas background or the protected face into the body.
 for(var i=0;i<4;i++){
  if(refracted.a<.75||face(uv+displacement)>.025){displacement*=.5;refracted=actorSample(uv+displacement);}
 }
 if(refracted.a<.75){refracted=original;}
 var color=refracted.rgb;
 // Open internal refraction boundaries; never a closed container around the actor.
 color+=vec3f(.075,.018,.13)*seam*remaining;
 let frontLife=ease(0.,.09,progress)*(1.-ease(.88,1.,progress));
 let releaseFront=exp(-pow((distance-progress)/.11,2.))*frontLife;
 color+=vec3f(.75,.88,.79)*releaseFront;
 // Brief light stays on the registered side of the front, then exact original hold.
 let registered=1.-remaining;
 color+=vec3f(.12,.20,.16)*registered*ease(.1,.28,progress)*(1.-ease(.63,.86,p));
 return vec4f(mix(bg,color,original.a),1.);
}`;

