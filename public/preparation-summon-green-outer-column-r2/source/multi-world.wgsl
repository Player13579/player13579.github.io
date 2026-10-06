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

struct Cause { data:vec4f }
// data = anchorPxX, anchorPxY, ageSeconds, active. Capacity 8, count u.reserved.x.
@group(0) @binding(1) var<storage,read> causes:array<Cause>;
fn state(age:f32)->vec4f {
 if(age<0. || age>=3.2){return vec4f(0);}
 let release=smoothstep(2.35,3.2,age);
 let env=smoothstep(0.,.18,age)*(1.-release);
 let arrival=smoothstep(.72,.96,age)*(1.-smoothstep(1.35,1.72,age));
 return vec4f(env,smoothstep(0.,.8,age),release,arrival);
}
fn offset(c:Cause)->vec2f {let delta=(c.data.xy-u.viewport.zw)/u.metric.x;return vec2f(delta.x,delta.y/sin(u.metric.y));}
fn ground(p:vec2f,s:vec4f)->vec3f {
 let r=length(p);let reveal=1.-smoothstep(1.08*s.y,1.08*s.y+.04,r);
 let released=1.-smoothstep(1.08*(1.-s.z),1.08*(1.-s.z)+.08,r);
 let d=lattice(p);let aa=max(fwidth(d),.002);
 let line=(1.-smoothstep(.009-aa,.009+aa,d))*reveal*released;
 let sheet=exp(-r*r/.72)*.34*(1.-smoothstep(1.06,1.13,r))*reveal*released;
 return (vec3f(.12,2.6,.30)*sheet+vec3f(.8,5.8,1.22)*line)*s.x*(1.+1.65*s.w);
}
struct Result { @location(0) color:vec4f, @location(1) source:vec4f }
@fragment fn fragment(@builtin(position) pixel:vec4f)->Result {
 var o:Result;o.color=vec4f(0);o.source=vec4f(0);
 if(u.enabled.x<.5){return o;}
 let count=min(min(u32(max(0.,u.reserved.x)),arrayLength(&causes)),8u);
 let el=u.metric.y;let screen=(pixel.xy-u.viewport.zw)/u.metric.x;
 let plane=vec2f(screen.x,(screen.y+.008*cos(el))/sin(el));
 var floorRadiance=vec3f(0);
 for(var c=0u;c<count;c++){let item=causes[c];let s=state(item.data.z);
   // Evaluate derivative-bearing ground() uniformly for every declared cause.
   let emission=ground(plane-offset(item),s);
   floorRadiance+=emission*select(0.,1.,item.data.w>.5);
 }
 var totalT=1.;var volumeRadiance=vec3f(0);
 if(u.enabled.y>.5){
   let toward=vec3f(0,sin(el),cos(el));let up=vec3f(0,cos(el),-sin(el));
   let origin=vec3f(screen.x,0,0)-screen.y*up+3.*toward;let direction=-toward;
   let tGround=(origin.y-.008)/sin(el);let tNear=max(0.,(origin.y-1.8)/sin(el));
   let dt=max(0.,tGround-tNear)/24.;
   for(var i=0u;i<24u;i++){
     let p=origin+direction*(tNear+(f32(i)+.5)*dt);let h=clamp(p.y/1.8,0.,1.);
     var totalSigma=0.;var emissivity=vec3f(0);
     for(var c=0u;c<count;c++){let item=causes[c];let s=state(item.data.z);let rr=length(p.xz-offset(item));
       let radius=1.08;let shellWidth=.07;let density=exp(-pow((rr-radius)/shellWidth,2.))*(1.-smoothstep(1.65,1.8,p.y));
       let sigma=.62*density*s.w*s.x*select(0.,1.,item.data.w>.5);
       totalSigma+=sigma;
       emissivity+=sigma*vec3f(.10,4.2,.36)*(1.-.65*h)*s.x*(1.+1.65*s.w);
     }
     let absorb=1.-exp(-totalSigma*dt);
     volumeRadiance+=totalT*absorb*emissivity/max(totalSigma,.0000001);
     totalT*=1.-absorb;
   }
 }
 let radiance=floorRadiance*totalT+volumeRadiance;
 o.color=vec4f(radiance,1.-totalT);o.source=vec4f(radiance,0.);return o;
}

