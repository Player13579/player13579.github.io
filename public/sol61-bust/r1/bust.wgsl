struct Params { viewport:vec2f, center:vec2f, height:f32, age:f32, kind:f32, source:f32, observer:f32, reduced:f32, pad:vec2f }
@group(0) @binding(0) var<uniform> u:Params;
struct Vertex { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->Vertex {
  var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return Vertex(vec4f(p[i],0,1));
}
fn box(p:vec2f,b:vec2f)->f32 { let q=abs(p)-b; return length(max(q,vec2f(0)))+min(max(q.x,q.y),0.0); }
fn interval(a:f32,b:f32,x:f32)->f32 { return smoothstep(a,b,x); }
// Returns signed distance to the active world field; no observation makes shape.
fn field(p:vec2f,t:f32)->f32 {
  var d=10.0;
  let motion=mix(1.0,0.35,u.reduced);
  if(u.kind<0.5) {
    let close=interval(0.0,0.12,t);
    let erase=interval(0.47,0.65,t);
    for(var i=0;i<3;i++) {
      let row=f32(i);
      let y=(row-1.0)*0.16;
      let inward=0.22*(1.0-close)*motion;
      // Broad paired teeth with offset tips. Central negative space remains.
      let side=0.24+inward+erase*0.09;
      let left=box(p-vec2f(-side,y),vec2f(0.15*(1.0-erase),0.047));
      let right=box(p-vec2f(side,y+0.06),vec2f(0.15*(1.0-erase),0.047));
      let tipL=box(p-vec2f(-side+0.14,y-0.026),vec2f(0.055*(1.0-erase),0.021));
      let tipR=box(p-vec2f(side-0.14,y+0.086),vec2f(0.055*(1.0-erase),0.021));
      d=min(d,min(min(left,right),min(tipL,tipR)));
    }
  } else {
    let open=interval(0.035,0.28,t);
    for(var i=0;i<6;i++) {
      let row=f32(i/2)-1.0;
      let side=select(-1.0,1.0,i%2==1);
      let offset=vec2f(side*0.25*open*motion,row*0.10*open*motion);
      let q=p-offset;
      // Finite field sectors; center split widens irreversibly after contact.
      let ellipse=(length(q/vec2f(0.48,0.58))-1.0)*0.42;
      let shell=abs(ellipse)-0.043;
      let split=0.018+0.15*open;
      let sideClip=split-side*q.x;
      let rowClip=abs(q.y-row*0.35)-0.145;
      d=min(d,max(max(shell,sideClip),rowClip));
    }
  }
  return d;
}
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f {
  let t=u.age*0.001;
  let duration=select(0.65,0.48,u.kind>0.5);
  if(t<0.0 || t>=duration || u.source<0.5) { return vec4f(0); }
  let p=vec2f(frag.x-u.center.x,u.center.y-frag.y)/u.height;
  let d=field(p,t);
  let aa=max(fwidth(d),0.6/u.height);
  let coverage=1.0-smoothstep(-aa,aa,d);
  let onset=smoothstep(0.0,0.026,t);
  let end=1.0-smoothstep(duration-0.16,duration,t);
  let envelope=onset*end;
  let edge=exp(-abs(d)*u.height/1.15)*coverage;
  // Registered inner contact is brighter; no common fixed full-body rim.
  let contact=exp(-abs(p.x)*9.0)*(0.45+0.55*smoothstep(0.12,0.30,t));
  let base=select(vec3f(0.10,0.75,1.0),vec3f(1.0,0.29,0.055),u.kind>0.5);
  let emission=base*coverage*(1.1+contact)*envelope;
  let core=vec3f(0.87,0.97,1.0)*edge*3.2*envelope;
  // OBS1 local PSF of the same source. Source OFF also zeros this response.
  let halo=exp(-pow(max(d,0.0)*u.height/4.0,2.0))*0.35*envelope*u.observer;
  let radiance=emission+core+base*halo;
  let mapped=vec3f(1.0)-exp(-radiance);
  let display=pow(mapped,vec3f(1.0/2.2));
  let alpha=clamp(coverage*envelope+halo,0.0,1.0);
  return vec4f(display,alpha);
}
