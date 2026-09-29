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
fn mass(p:vec2f,c:vec2f,d:vec2f,r:vec2f,absorb:f32)->vec4f {
 let x=p-c;let q=vec2f(dot(x,d),dot(x,vec2f(-d.y,d.x)))/r;
 if(abs(q.x)>1.01||abs(q.y)>1.6){return vec4f(0);}
 let curve=.23*(1-q.x*q.x);
 let y=(q.y-curve)/(1+.26*q.x);
 let radial=q.x*q.x+y*y;let cover=1-smoothstep(.72,1.0,radial);
 let thickness=sqrt(max(0.0,1-radial));
 let ridge=exp(-pow((q.x-.05+.8*absorb)/.6,2.0)-pow((y+.26)/.28,2.0))*cover;
 let cavity=exp(-pow((q.x+.05)/.43,2.0)-pow((y-.28)/.3,2.0));
 let density=cover*(1-.52*cavity);
 let emission=vec3f(.15,.15,.72)*density*thickness+vec3f(.62,.69,1.26)*ridge;
 return vec4f(emission,density*.38);
}
fn sparkle(p:vec2f,c:vec2f,r:f32)->f32 {let x=p-c;let q=vec2f(.924909*x.x-.380188*x.y,.380188*x.x+.924909*x.y);return exp(-q.x*q.x/(r*r)-q.y*q.y/.22)+exp(-q.y*q.y/(r*r*.42)-q.x*q.x/.22);}
fn hermite(a:vec2f,b:vec2f,va:vec2f,vb:vec2f,k:f32,seconds:f32)->vec2f {let k2=k*k;let k3=k2*k;return a*(2*k3-3*k2+1)+va*seconds*(k3-2*k2+k)+b*(-2*k3+3*k2)+vb*seconds*(k3-k2);}
@fragment fn fs(v:SceneOut)->@location(0) vec4f {
 let p=v.p;let t=u.time;let source=u.source;let receiver=u.receiver;
 let base=select(vec3f(.029,.04,.065),vec3f(.77,.785,.81),v.bright>.5);
 let a=actorSample(p);var rgb=mix(base,a.rgb,a.a);
 if(t<0||t>=1.8||p.y< -43){return vec4f(rgb,1);}
 let delta=receiver-source;let len=length(delta);let d=select(vec2f(-1,0),delta/max(len,.0001),len>.0001);
 let visible=1-a.a;var light=vec3f(0);var stars=0.0;
 // The source is in front of the right cloak; the actual palm is an intake
 // boundary. Do not hide incoming mass behind the cloak before it reaches skin.
 let intake=1-smoothstep(1.0,5.0,dot(p-receiver,d));
 let feed=pulse(t,0,.14,.49,.76);let supply=mass(p,source,d,vec2f(9,6)*(1-.46*smoothstep(.15,.73,t)),0.0)*feed;
 rgb=rgb*(1-supply.a*visible)+supply.rgb*visible;
 light+=vec3f(.13,.18,.5)*exp(-dot(p-source,p-source)/93.0)*feed*.52;
 var received=0.0;
 for(var i=0u;i<3u;i++){
  let n=f32(i);let arrival=.60+n*.24;let start=arrival-.46;
  let k=clamp((t-start)/.46,0,1);let absorb=clamp((t-arrival)/.30,0,1);
  let velocity=vec2f(-35,-5);let body=receiver+vec2f(-11.1,-6.4);
  let before=hermite(source,receiver,vec2f(0),velocity,k,.46)-vec2f(0,select(60.0,20.0,u.reduced>.5)*k*k*(1-k)*(1-k));
  let after=hermite(receiver,body,velocity,vec2f(0),absorb,.30);
  let c=select(before,after,t>=arrival);
  let envelope=pulse(t,start,start+.09,arrival+.12,arrival+.30);
  let radius=vec2f(8.5-1.3*absorb,5.3*(1-.40*absorb));
  let packet=mass(p,c,d,radius,absorb)*envelope;
  rgb=rgb*(1-packet.a*intake)+packet.rgb*intake;
  light+=vec3f(.13,.2,.53)*exp(-dot(p-c,p-c)/80.0)*envelope*.42;
  let contact=pulse(t,arrival-.055,arrival+.035,arrival+.09,arrival+.31);
  let q=p-receiver;let depth=dot(q,-d);let side=dot(q,vec2f(-d.y,d.x));
  let press=exp(-pow((depth-1.5)/3.3,2.0)-pow(side/4.6,2.0))*contact;
  rgb+=vec3f(.54,.64,1.3)*press;
  stars+=sparkle(p,receiver+vec2f(4,-2),3.8)*pulse(t,arrival-.01,arrival+.05,arrival+.12,arrival+.29);
  received+=smoothstep(arrival,arrival+.30,t)/3.0;
 }
 // The received quantity changes the inside of the recipient. Two joined
 // folded sections progressively settle; the actor alpha is the boundary.
 let settling=received*(1-smoothstep(1.52,1.8,t));
 let local=p-receiver;
 let advance=smoothstep(.60,1.38,t);
 let r1=mass(p,receiver+vec2f(-4-6*advance,-2-4*advance),normalize(vec2f(-1,-.35)),vec2f(9.0,5.5+2.7*advance),.3*advance);
 let r2=mass(p,receiver+vec2f(-3-4*advance,2+4*advance),normalize(vec2f(-.65,.5)),vec2f(6.5,4.7),.45*advance);
 let bodyCoverage=a.a*smoothstep(-43.0,-38.0,p.y)*(1-smoothstep(-13.0,-7.0,p.y));
 let stored=(r1+r2*.65)*settling;
 rgb=rgb*(1-stored.a*bodyCoverage*.75)+stored.rgb*bodyCoverage*.85;
 let innerLight=exp(-dot(local-vec2f(-6,-3),local-vec2f(-6,-3))/95.0)*settling;
 light+=vec3f(.23,.21,.59)*innerLight*.53;
 stars+=sparkle(p,source+vec2f(4,-3),3.2)*pulse(t,.045,.115,.18,.28);
 stars+=sparkle(p,receiver+vec2f(-6,-5),3.8)*pulse(t,1.28,1.36,1.47,1.64)*a.a;
 let sourceMask=select(visible,1.0,p.y> -38.0&&p.y< -14.0);
 rgb+=sourceMask*smoothstep(-43.0,-40.0,p.y)*(light*u.glow+vec3f(1.65,1.5,1.9)*stars*u.stars);
 return vec4f(rgb,1);
}
