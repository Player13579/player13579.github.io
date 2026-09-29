struct Settings { time:f32, stars:f32, glow:f32, reduced:f32, width:f32, height:f32, single:f32, pad:f32, source:vec2f, receiver:vec2f }
@group(0) @binding(0) var<uniform> u:Settings;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var smp:sampler;
struct SceneOut { @builtin(position) position:vec4f, @location(0) p:vec2f, @location(1) @interpolate(flat) bright:f32 }
@vertex fn vsBackground(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(q[i],0,1);}
@fragment fn fsBackground(@builtin(position) f:vec4f)->@location(0) vec4f {return vec4f(select(vec3f(.029,.04,.065),vec3f(.77,.785,.81),f.x>=u.width*.5),1);}
@vertex fn vs(@builtin(vertex_index) i:u32,@builtin(instance_index) instance:u32)->SceneOut {
 let q=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
 let col=f32(instance%2u);let lower=instance>=2u;
 let sc=select(1.0,2.0,lower);
 let origin=vec2f(u.width*(.28+col*.5),select(select(u.height*.31,u.height*.9,lower),u.height*.73,u.single>.5));
 let lo=min(vec2f(-38,-74),min(u.source,u.receiver)-vec2f(21,21));
 let hi=max(vec2f(38,12),max(u.source,u.receiver)+vec2f(21,21));
 let p=mix(lo,hi,q[i]);let pixel=origin+p*sc;
 var o:SceneOut;o.position=vec4f(pixel.x/u.width*2-1,1-pixel.y/u.height*2,0,1);o.p=p;o.bright=col;return o;
}
fn pulse(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return smoothstep(a,b,t)*(1-smoothstep(c,d,t));}
fn actorSample(p:vec2f)->vec4f {let xy=vec2f(128,240)+p*(225.0/64.0);if(any(xy<vec2f(0))||any(xy>=vec2f(256))){return vec4f(0);}return textureSampleLevel(actor,smp,xy/768.0,0);}
// Curved compact section with a broad leading shoulder and trailing taper.
// Surface coverage, optical density and luminous leading fold are independent.
fn mass(p:vec2f,c:vec2f,d:vec2f,r:vec2f)->vec4f {
 let x=p-c;let q=vec2f(dot(x,d),dot(x,vec2f(-d.y,d.x)))/r;
 let curve=.23*(1-q.x*q.x);
 let y=(q.y-curve)/(1+.26*q.x);
 let radial=q.x*q.x+y*y;let cover=1-smoothstep(.72,1.0,radial);
 let thickness=sqrt(max(0.0,1-radial));
 let ridge=exp(-pow((q.x-.1)/.6,2.0)-pow((y+.26)/.28,2.0))*cover;
 let cavity=exp(-pow((q.x+.05)/.43,2.0)-pow((y-.28)/.3,2.0));
 let density=cover*(1-.52*cavity);
 let emission=vec3f(.15,.15,.72)*density*thickness+vec3f(.62,.69,1.26)*ridge;
 return vec4f(emission,density*.38);
}
fn sparkle(p:vec2f,c:vec2f,r:f32)->f32 {let x=p-c;let q=vec2f(.924909*x.x-.380188*x.y,.380188*x.x+.924909*x.y);return exp(-q.x*q.x/(r*r)-q.y*q.y/.22)+exp(-q.y*q.y/(r*r*.42)-q.x*q.x/.22);}
@fragment fn fs(v:SceneOut)->@location(0) vec4f {
 let p=v.p;let t=u.time;let source=u.source;let receiver=u.receiver;
 let base=select(vec3f(.029,.04,.065),vec3f(.77,.785,.81),v.bright>.5);
 let a=actorSample(p);var rgb=mix(base,a.rgb,a.a);
 if(t<0||t>=1.4||p.y< -43){return vec4f(rgb,1);}
 let delta=receiver-source;let len=length(delta);let d=select(vec2f(-1,0),delta/max(len,.0001),len>.0001);
 let visible=1-a.a;var light=vec3f(0);var stars=0.0;
 // The source is in front of the right cloak; the actual palm is an intake
 // boundary. Do not hide incoming mass behind the cloak before it reaches skin.
 let intake=1-smoothstep(-.5,1.1,dot(p-receiver,d));
 let feed=pulse(t,0,.11,.43,.67);let supply=mass(p,source,d,vec2f(9,6)*(1-.46*smoothstep(.15,.63,t)))*feed;
 rgb=rgb*(1-supply.a*visible)+supply.rgb*visible;
 light+=vec3f(.13,.18,.5)*exp(-dot(p-source,p-source)/93.0)*feed*.52;
 for(var i=0u;i<3u;i++){
  let n=f32(i);let arrival=.56+n*.2;let start=arrival-.43;
  let k=clamp((t-start)/.43,0,1);let absorb=clamp((t-arrival)/.22,0,1);let travel=k*k*(3-2*k);
  let c=mix(source,receiver,travel)+d*12*absorb-vec2f(0,select(5.0,1.5,u.reduced>.5)*sin(3.14159265*k));
  let envelope=pulse(t,start,start+.05,arrival+.13,arrival+.22);
  let radius=vec2f(8.5+3*absorb,5.3*(1-.62*absorb));
  let packet=mass(p,c,d,radius)*envelope;
  rgb=rgb*(1-packet.a*intake)+packet.rgb*intake;
  light+=vec3f(.13,.2,.53)*exp(-dot(p-c,p-c)/80.0)*envelope*.35;
  let contact=pulse(t,arrival-.03,arrival+.01,arrival+.06,arrival+.22);
  let q=p-receiver;let depth=dot(q,-d);let side=dot(q,vec2f(-d.y,d.x));
  let press=exp(-pow((depth-1.5)/3.3,2.0)-pow(side/4.6,2.0))*contact;
  rgb+=vec3f(.54,.64,1.3)*press*intake;
  stars+=sparkle(p,receiver+vec2f(7,-3),3.8)*pulse(t,arrival-.01,arrival+.035,arrival+.085,arrival+.2);
 }
 stars+=sparkle(p,source+vec2f(4,-3),3.2)*pulse(t,.045,.115,.18,.28);
 stars+=sparkle(p,receiver+vec2f(5,-2),3.8)*pulse(t,1.11,1.18,1.25,1.39);
 rgb+=visible*smoothstep(-43.0,-40.0,p.y)*(light*u.glow+vec3f(1.65,1.5,1.9)*stars*u.stars);
 return vec4f(rgb,1);
}
