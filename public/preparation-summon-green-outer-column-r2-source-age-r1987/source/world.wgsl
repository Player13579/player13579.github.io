struct Uniforms { viewport:vec4f, metric:vec4f, enabled:vec4f, reserved:vec4f }
@group(0) @binding(0) var<uniform> u:Uniforms;
struct Vertex { @builtin(position) position:vec4f }
@vertex fn vertex(@builtin(vertex_index) i:u32)->Vertex {
  let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  var o:Vertex; o.position=vec4f(p[i],0,1); return o;
}
fn segment(p:vec2f,a:vec2f,b:vec2f)->f32 { let q=b-a;return length(p-a-q*clamp(dot(p-a,q)/dot(q,q),0.,1.)); }
fn star(p:vec2f,n:u32,step:u32,r:f32,offset:f32)->f32 {
 var d=100.;for(var i=0u;i<n;i++) {let a=offset+6.28318530718*f32(i)/f32(n);let b=offset+6.28318530718*f32((i+step)%n)/f32(n);
 d=min(d,segment(p,r*vec2f(cos(a),sin(a)),r*vec2f(cos(b),sin(b))));} return d;
}
fn lattice(p:vec2f)->f32 {
 let r=length(p);var d=abs(r-.22);d=min(d,abs(r-.43));d=min(d,abs(r-.69));d=min(d,abs(r-.92));d=min(d,abs(r-1.08));
 d=min(d,star(p,12u,5u,.92,.2617993878));d=min(d,star(p,9u,4u,.61,-1.5707963268));
 for(var i=0u;i<6u;i++){let a=6.28318530718*f32(i)/6.;let c=cos(a);let s=sin(a);let q=vec2f(c*p.x+s*p.y,-s*p.x+c*p.y)-vec2f(.4,0);
   let qn=q/vec2f(.60,.26);let f=dot(qn,qn)-1.;let grad=2.*q/vec2f(.36,.0676);
   d=min(d,abs(f)/max(length(grad),.0001));}return d;
}
struct Result { @location(0) color:vec4f, @location(1) source:vec4f }
@fragment fn fragment(@builtin(position) pixel:vec4f)->Result {
 var o:Result;o.color=vec4f(0);o.source=vec4f(0);let age=u.metric.z;
 if(age<0. || age>=3.2 || u.enabled.x<.5){return o;}
 let el=u.metric.y;let ppm=u.metric.x;let screen=(pixel.xy-u.viewport.zw)/ppm;
 let point=vec2f(screen.x,(screen.y+.008*cos(el))/sin(el));let r=length(point);
 let birth=smoothstep(0.,.8,age);let release=smoothstep(2.35,3.2,age);
 let env=smoothstep(0.,.18,age)*(1.-release);
 let revealed=1.-smoothstep(1.08*birth,1.08*birth+.04,r);
 let released=1.-smoothstep(1.08*(1.-release),1.08*(1.-release)+.08,r);
 let d=lattice(point);let aa=max(fwidth(d),.002);
 let line=(1.-smoothstep(.009-aa,.009+aa,d))*revealed*released;
 // Field emission is a ground-bound luminous sheet, not a painted opaque disc.
 let sheet=exp(-r*r/.72)*.34*(1.-smoothstep(1.06,1.13,r))*revealed*released;
 let arrival=smoothstep(.72,.96,age)*(1.-smoothstep(1.35,1.72,age));
 let flux=env*(1.+1.65*arrival);
 var radiance=(vec3f(.12,2.6,.30)*sheet+vec3f(.8,5.8,1.22)*line)*flux;
 var coverage=0.;
 // Declared magic arrival medium: finite-height source-fed column with constant world-space width. No smoke/particles.
 if(u.enabled.y>.5 && arrival>0.) {
   let toward=vec3f(0,sin(el),cos(el));let up=vec3f(0,cos(el),-sin(el));
   let origin=vec3f(screen.x,0,0)-screen.y*up+3.*toward;let direction=-toward;
   let tGround=(origin.y-.008)/sin(el);let tNear=max(0.,(origin.y-1.8)/sin(el));
   let dt=max(0.,tGround-tNear)/24.;var scatter=0.;var transmission=1.;
   for(var i=0u;i<24u;i++){let p=origin+direction*(tNear+(f32(i)+.5)*dt);let h=clamp(p.y/1.8,0.,1.);
     let rr=length(p.xz);let radius=1.08;let shellWidth=.07;let density=exp(-pow((rr-radius)/shellWidth,2.))*(1.-smoothstep(1.65,1.8,p.y));
     let sigma=.62*density*arrival*env;let absorb=1.-exp(-sigma*dt);scatter+=transmission*absorb*(1.-.65*h);transmission*=1.-absorb;}
   radiance= radiance*transmission + vec3f(.10,4.2,.36)*scatter*flux;
   coverage=1.-transmission;
 }
 o.color=vec4f(radiance,coverage);o.source=vec4f(radiance,0.);return o;
}
