export const shader=/*wgsl*/`
struct Params{size:vec2f,ms:f32,audit:f32,foot:vec2f,h:f32,light:f32,stars:f32,obs:f32,main:f32,reduced:f32};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
fn gauss(x:f32,w:f32)->f32{return exp(-x*x/(w*w));}
fn gate(x:f32,a:f32,b:f32)->f32{return smoothstep(a,a+.05,x)*(1.-smoothstep(b-.05,b,x));}
fn actor(p:vec2f)->vec4f{let suv=vec2f((p.x+.30)/.60,p.y);if(any(suv<vec2f(0.))||any(suv>vec2f(1.))){return vec4f(0.);}return textureSampleLevel(actorTex,samp,vec2f((62.+suv.x*136.)/768.,(15.+suv.y*225.)/512.),0.);}
struct Field{coverage:f32,density:f32,edge:f32,behind:f32,receive:f32};
// PH2: two body-attached volumetric fronts joined to the visible receiver surface.
fn fields(p:vec2f,t:f32,body:f32,reduced:f32)->Field{
 let envelope=smoothstep(0.,.085,t)*(1.-smoothstep(1.42,1.75,t));
 let advance=smoothstep(.10,1.03,t);let front=mix(.94,.36,advance);
 let settle=smoothstep(.99,1.44,t);let outward=mix(1.,.70,settle);
 let shape=.245+.100*gauss(p.y-.67,.25)-.067*gauss(p.y-.38,.18);
 let side=select(-1.,1.,p.x>=0.);let delay=select(.018,-.018,side>0.);
 let cx=shape*outward;let yfront=front+delay;
 let span=.165*(1.-.23*settle);let breadth=.10+.035*gauss(p.y-.62,.19);
 let dist=abs(p.x)-cx;
 let depth=gauss(dist,breadth)*gauss(p.y-yfront,span)*gate(p.y,.27,1.03);
 let behind=gauss(dist+.029,breadth*.78)*gauss(p.y-yfront+.030,span*.95)*(1.-body*.90);
 let edge=gauss(dist-.014,.029)*gauss(p.y-yfront-.015,.105)*gate(p.y,.27,1.03);
 // Broad continuous response on actual body, not a free horizontal band.
 let curved=front+.09*(p.x*p.x/.09)-.018*p.x;
 let coat=body*gauss(p.y-curved,.145)*gate(p.y,.26,.98);
 let edgeOn=body*gauss(p.y-curved+.025,.027)*(.32+.68*gauss(p.x,.24))*gate(p.y,.27,.98);
 let received=body*smoothstep(curved-.03,curved+.12,p.y)*gate(p.y,.26,.98)*(1.-smoothstep(1.02,1.72,t));
 let chest=body*gauss(p.x,.205)*gauss(p.y-.38,.105)*smoothstep(.95,1.20,t)*(1.-smoothstep(1.37,1.75,t));
 let density=(depth*.80+coat*.65+chest*.76)*envelope;
 let coverage=min(.70,(depth*.53+coat*.36+chest*.39)*envelope);
 return Field(coverage,density,(edge*.92+edgeOn*.72+chest*.25)*envelope,behind*envelope,received*.20*envelope+chest*.32);
}
fn sparkle(p:vec2f,center:vec2f,strength:f32)->vec3f{
 let a=.34906585;let d=p-center;let q=vec2f(d.x*cos(a)+d.y*sin(a),-d.x*sin(a)+d.y*cos(a))*64.;
 let axis=gauss(q.y,.42)*gauss(q.x,3.9)+gauss(q.x,.42)*gauss(q.y,2.2);
 let core=gauss(length(q),.65);return vec3f(1.05,1.18,1.40)*(axis*.72+core*.95)*strength;
}
struct Effect{material:vec4f,emission:vec3f};
fn effect(p:vec2f,t:f32,b:vec4f,stars:f32,obs:f32,main:f32,reduced:f32)->Effect{
 if(t<=0.||t>=1.75){return Effect(vec4f(0.),vec3f(0.));}
 let f=fields(p,t,b.a,reduced);let coverage=f.coverage*main;
 let shade=clamp(.5+(p.x*.70)-.40*(p.y-.58),0.,1.);
 let blue=mix(vec3f(.028,.16,.54),vec3f(.055,.40,.88),shade);
 let thickness=blue*coverage+vec3f(.025,.09,.21)*f.behind*.32*main;
 let radiant=(vec3f(.20,.57,1.05)*f.density*.28+vec3f(.68,1.02,1.44)*f.edge*1.25)*main;
 let receive=vec3f(.10,.34,.79)*f.receive*main*obs;
 // Source-bound broad local optical spill. Same source trajectory; no detached halo.
 let front=mix(.94,.36,smoothstep(.10,1.03,t));let cx=(.245+.10*gauss(front-.67,.25)-.067*gauss(front-.38,.18))*mix(1.,.70,smoothstep(.99,1.44,t));
 let env=smoothstep(0.,.085,t)*(1.-smoothstep(1.42,1.75,t));
 let local=(gauss(p.x-cx,.17)+gauss(p.x+cx,.17))*gauss(p.y-front,.19)*env*main*obs*.10;
 var spark=vec3f(0.);
 let a=gauss(t-.26,.095)*env;let c=gauss(t-.66,.105)*env;let d=gauss(t-.99,.13)*env;let e=gauss(t-1.29,.14)*env;
 spark+=sparkle(p,vec2f(-.29,.90),a);
 spark+=sparkle(p,vec2f(.34,.66),c);
 spark+=sparkle(p,vec2f(-.20,.39),d);
 spark+=sparkle(p,vec2f(.12,.38),e);
 return Effect(vec4f(thickness,coverage),radiant+receive+vec3f(.10,.33,.79)*local+spark*stars*main);
}
fn scene(pos:vec2f,ms:f32,foot:vec2f,h:f32,light:f32,stars:f32,obs:f32,main:f32,reduced:f32)->vec3f{
 let p=vec2f((pos.x-foot.x)/h,1.+(pos.y-foot.y)/h);
 let bg=mix(vec3f(.028,.045,.075),vec3f(.88,.88,.86),light);
 let b=actor(p);let col=b.rgb*b.a+bg*(1.-b.a);let e=effect(p,ms*.001,b,stars,obs,main,reduced);
 return col*(1.-e.material.a)+e.material.rgb+e.emission;
}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f{
 if(u.audit>0.5){let cell=vec2f(120.,116.);let ij=floor(pos.xy/cell);let local=pos.xy-ij*cell;let times=array<f32,11>(0.,80.,180.,350.,550.,750.,950.,1150.,1370.,1580.,1780.);let col=min(u32(ij.x),10u);let row=u32(ij.y);let light=f32(row%2u);var stars=1.;var obs=1.;var main=1.;var reduced=0.;if(row>=2u&&row<4u){stars=0.;}if(row>=4u&&row<6u){obs=0.;}if(row>=6u&&row<8u){main=0.;}if(row>=8u){reduced=1.;}return vec4f(scene(local,times[col],vec2f(60.,94.),64.,light,stars,obs,main,reduced),1.);}
 return vec4f(scene(pos.xy,u.ms,u.foot,u.h,u.light,u.stars,u.obs,u.main,u.reduced),1.);
}
`;
