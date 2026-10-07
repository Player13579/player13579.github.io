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
 return floorLight(p)*reveal*released*s.x*(1.+1.65*s.w);
}

// R3 draft: exact R2 geometry, distinct field/perimeter emission, no new objects.
fn stroke(d:f32,width:f32)->f32 {
  let aa=max(fwidth(d),.002);
  return 1.-smoothstep(width-aa,width+aa,d);
}
fn floorLight(p:vec2f)->vec3f {
  let r=length(p);let d=lattice(p);
  let primary=stroke(abs(r-1.08),.014);
  let stars=stroke(min(star(p,12u,5u,.92,.2617993878),star(p,9u,4u,.61,-1.5707963268)),.009);
  let all=stroke(d,.009);
  // Keep secondary green-channel source strength; differentiate color/width, not blanket dimming.
  let secondary=max(0.,all-max(primary,stars));
  let starOnly=max(0.,stars-primary);
  // Redistribute the former radial sheet into light near the registered lines.
  let sheet=(.10*exp(-r*r/.72)+.24*exp(-d*d/.008))*(1.-smoothstep(1.06,1.13,r));
  return vec3f(.12,2.6,.30)*sheet+vec3f(.16,5.8,.42)*secondary+
    vec3f(.50,7.2,.85)*starOnly+vec3f(1.45,9.0,1.9)*primary;
}
fn wallDensity(p:vec3f,age:f32)->f32 {
  // The activation boundary rises vertically; radius and spatial shell width never taper.
  // This is establishment of the declared fictional field, not slow propagation of photons.
  let top=1.8*smoothstep(.72,.96,age);
  let rise=1.-smoothstep(max(.008,top-.14),max(.009,top),p.y);
  let cap=1.-smoothstep(1.65,1.8,p.y);
  return exp(-pow((length(p.xz)-1.08)/.07,2.))*rise*cap;
}
fn wallEmission(p:vec3f)->vec3f {
  let theta=atan2(p.z,p.x);
  // Six broad fixed sectors correspond to the six existing geometric petal axes.
  // They remain continuous (28% floor), never become six separate beams or random flicker.
  let sector=.28+.72*pow(.5+.5*cos(6.*theta),2.);
  let h=clamp(p.y/1.8,0.,1.);
  return vec3f(.10,12.0,.48)*sector*(1.-.65*h);
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
   let dt=max(0.,tGround-tNear)/48.;
   for(var i=0u;i<48u;i++){
     let p=origin+direction*(tNear+(f32(i)+.5)*dt);let h=clamp(p.y/1.8,0.,1.);
     var totalSigma=0.;var emissivity=vec3f(0);
     for(var c=0u;c<count;c++){let item=causes[c];let s=state(item.data.z);let rr=length(p.xz-offset(item));
       let local=vec3f(p.x-offset(item).x,p.y,p.z-offset(item).y);let density=wallDensity(local,item.data.z);
       let sigma=.24*density*s.w*s.x*select(0.,1.,item.data.w>.5);
       totalSigma+=sigma;
       emissivity+=sigma*wallEmission(local)*s.x*(1.+1.65*s.w);
     }
     let absorb=1.-exp(-totalSigma*dt);
     volumeRadiance+=totalT*absorb*emissivity/max(totalSigma,.0000001);
     totalT*=1.-absorb;
   }
 }
 let radiance=floorRadiance*totalT+volumeRadiance;
 o.color=vec4f(radiance,1.-totalT);o.source=vec4f(radiance,0.);return o;
}

