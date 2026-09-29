struct Settings { time:f32, stars:f32, glow:f32, reduced:f32, width:f32, height:f32, single:f32, pad:f32, source:vec2f, receiver:vec2f }
@group(0) @binding(0) var<uniform> u:Settings;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var smp:sampler;
struct VOut { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut { let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VOut;o.position=vec4f(p[i],0,1);return o; }
fn pulse(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return smoothstep(a,b,t)*(1-smoothstep(c,d,t));}
fn rotate(p:vec2f,a:f32)->vec2f{return vec2f(cos(a)*p.x+sin(a)*p.y,-sin(a)*p.x+cos(a)*p.y);}
fn actorSample(p:vec2f)->vec4f {
 let xy=vec2f(128,240)+p*(225.0/64.0);
 if(any(xy<vec2f(0))||any(xy>=vec2f(256))){return vec4f(0);}
 return textureSampleLevel(actor,smp,xy/768.0,0);
}
// One asymmetric optically thick fluid cross-section. Its fold is a void
// inside the transported volume, independent of garment RGB/alpha.
fn fluid(p:vec2f,c:vec2f,r:vec2f,a:f32,fold:f32)->vec4f {
 let q=rotate(p-c,a)/r;
 let warp=vec2f(q.x+.24*q.y*q.y,q.y);
 let radial=dot(warp,warp);
 let cover=1-smoothstep(.78,1.0,radial);
 let depth=sqrt(max(0.0,1-radial));
 let hollow=exp(-dot((q-vec2f(.29,.05))/vec2f(.34,.7),(q-vec2f(.29,.05))/vec2f(.34,.7)))*fold;
 let density=cover*(1-.89*hollow);
 let core=exp(-dot((q-vec2f(-.28,-.3))/vec2f(.25,.65),(q-vec2f(-.28,-.3))/vec2f(.25,.65)))*cover;
 let emission=vec3f(.13,.15,.65)*density*depth+vec3f(.8,.62,1.25)*core+vec3f(.12,.34,.65)*density*(1-depth);
 return vec4f(emission,density*.44);
}
fn star(p:vec2f,c:vec2f,size:f32)->f32 {
 let q=abs(rotate(p-c,-.39));
 return exp(-q.x*q.x/(size*size)-q.y*q.y/.23)+exp(-q.y*q.y/(size*size*.42)-q.x*q.x/.23);
}
@fragment fn fs(@builtin(position) f:vec4f)->@location(0) vec4f {
 let bright=f.x>=u.width*.5;let lower=f.y>=u.height*.42;
 let col=select(0.0,1.0,bright);let sc=select(select(1.0,2.0,lower),1.0,u.single>.5);
 let center=select(vec2f(u.width*(.28+col*.5),select(u.height*.31,u.height*.9,lower)),vec2f(u.width*(.28+col*.5),u.height*.73),u.single>.5);
 let p=(f.xy-center)/sc;let t=u.time;
 let base=select(vec3f(.029,.04,.065),vec3f(.77,.785,.81),bright);
 let a=actorSample(p);var rgb=mix(base,a.rgb,a.a);
 let source=u.source;let receiver=u.receiver;
 if(t<0||t>=1.5||p.y< -43||p.x<min(source.x,receiver.x)-24||p.x>max(source.x,receiver.x)+30||p.y<min(source.y,receiver.y)-29||p.y>max(source.y,receiver.y)+23){return vec4f(rgb,1);}
 var obs=vec3f(0);var sparkle=0.0;
 let supply=pulse(t,0,.14,.49,.76);let shrink=1-.42*smoothstep(.2,.73,t);
 let src=fluid(p,source,vec2f(10,6)*shrink,-.6,0.0)*supply;
 rgb=rgb*(1-src.a)+src.rgb;
 obs+=vec3f(.16,.17,.49)*exp(-dot(p-source,p-source)/135.0)*supply*.5;
 var amount=0.0;
 for(var i=0u;i<3u;i++){
  let n=f32(i);let start=.17+n*.18;let arrival=.59+n*.18;
  let k=clamp((t-start)/.42,0,1);let ease=k*k*(3-2*k);
  let c=mix(source,receiver,ease)-vec2f(0,select(8.0,2.0,u.reduced>.5)*sin(3.14159265*k));
  let e=pulse(t,start,start+.055,arrival-.045,arrival+.045);
  let body=fluid(p,c,vec2f(7.6,4.8),-.5,.2)*e;
  rgb=rgb*(1-body.a)+body.rgb;
  obs+=vec3f(.15,.17,.56)*exp(-dot(p-c,p-c)/90.0)*e*.3;
  amount+=smoothstep(arrival-.025,arrival+.09,t)/3;
  let flash=pulse(t,arrival-.025,arrival+.025,arrival+.06,arrival+.17);
  sparkle+=star(p,receiver+vec2f(-11+n*13,2+n*3),3.8)*flash;
 }
 // Reception is a palm-bound volume behind the actor, not a body surface.
 let settle=smoothstep(.94,1.5,t);let receiveEnd=1-smoothstep(1.23,1.5,t);
 let c=receiver+vec2f(11*(1-settle),-4*(1-settle));
 let radius=vec2f(6+6*amount,7+6*amount)*(1-.88*settle);
 let reservoir=fluid(p,c,radius,-.5+1.0*smoothstep(.59,1.38,t),.8)*amount*receiveEnd;
 rgb=rgb*(1-reservoir.a*(1-a.a))+reservoir.rgb*(1-a.a);
 obs+=vec3f(.23,.13,.48)*exp(-dot(p-c,p-c)/160.0)*amount*receiveEnd*.32;
 sparkle+=star(p,source+vec2f(-4,-5),3.3)*pulse(t,.07,.14,.2,.31);
 sparkle+=star(p,receiver+vec2f(17,-7),4.0)*pulse(t,1.01,1.09,1.19,1.35);
 let protection=smoothstep(-43.0,-40.0,p.y);
 rgb+=protection*(1-a.a)*(obs*u.glow+vec3f(1.6,1.35,1.85)*sparkle*u.stars);
 return vec4f(rgb,1);
}
