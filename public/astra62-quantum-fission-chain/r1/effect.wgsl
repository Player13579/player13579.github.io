struct Uniforms {
  size:vec2f, age:f32, scale:f32,
  reduced:f32, live:f32, unused:vec2f,
}
@group(0) @binding(0) var<uniform> u:Uniforms;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  let tri=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(tri[i],0,1);
}
struct Stone { pos:vec2f, size:vec2f, tilt:f32, solid:f32, energy:f32, hue:vec3f }
fn makeStone(i:i32,t:f32)->Stone {
  let base=vec2f(0.,-7.);
  let stride=mix(1.,.72,u.reduced);
  let sea=vec3f(.09,1.23,1.41);
  let lilac=vec3f(.69,.40,1.60);
  if(i==0) {
    let solid=smoothstep(0.,80.,t)*(1.-smoothstep(290.,343.,t));
    let light=solid*(.12+1.7*smoothstep(50.,286.,t));
    return Stone(base,vec2f(15.,20.),-.17,solid,light,mix(sea,lilac,.24));
  }
  let left=(i==1 || i==3 || i==4);
  let side=select(1.,-1.,left);
  let a=vec2f(side*31.,select(3.,-5.,left))*stride;
  let fork=select(670.,590.,left);
  let hue=select(lilac,sea,left);
  if(i<=2){
    let progress=smoothstep(290.,fork-55.,t);
    let s=smoothstep(288.,342.,t)*(1.-smoothstep(fork,fork+48.,t));
    let core=.63+.9*smoothstep(fork-115.,fork,t);
    return Stone(base+a*progress,vec2f(10.7,14.8),side*(.13+.37*progress),s,core*s,hue);
  }
  let high=(i==3 || i==5);
  let offsetEnd=vec2f(side*select(25.,38.,high),select(18.,-17.,high))*stride;
  let progress=smoothstep(fork,fork+294.,t);
  let s=smoothstep(fork-2.,fork+44.,t)*(1.-smoothstep(1000.,1280.,t));
  let light=s*(1.34-.87*smoothstep(fork+75.,1230.,t));
  return Stone(base+a+offsetEnd*progress,vec2f(7.5,10.),side*(.44+select(-.54,.77,high)*progress),
    s,light,mix(hue,vec3f(.48,.88,1.24),select(.15,.38,high)));
}
fn local(p:vec2f,s:Stone)->vec2f {
  let d=p-s.pos;
  let c=cos(s.tilt); let sn=sin(s.tilt);
  return vec2f(c*d.x+sn*d.y,-sn*d.x+c*d.y);
}
fn smoothFilmic(v:vec3f)->vec3f {
  let tone=max(v,vec3f(0.))/(vec3f(1.)+max(v,vec3f(0.)));
  return select(12.92*tone,1.055*pow(tone,vec3f(1./2.4))-.055,tone>vec3f(.0031308));
}
@fragment fn fs(@builtin(position) coord:vec4f)->@location(0) vec4f{
  let p=(coord.xy-.5*u.size)/u.scale;
  let aa=.60/u.scale;
  // Quiet slate plane. The facets provide a surface on which local spill can be seen.
  let tile=floor(vec2f((p.x+p.y*.6)/46.,p.y/16.));
  let seam=abs(fract(vec2f((p.x+p.y*.6)/46.,p.y/16.))-.5);
  let joint=smoothstep(.46,.50,max(seam.x,seam.y));
  let base=vec3f(.009,.015,.026)*(1.+.04*sin(tile.x*1.8+tile.y))*(1.-.17*joint);
  if(u.live<.5){return vec4f(smoothFilmic(base),1);}
  let t=u.age;
  var material=base;
  var scatter=vec3f(0.);
  // A spill footprint follows each emitter on the slate; outer haze follows the fracture itself.
  for(var i=0;i<7;i++){
    let s=makeStone(i,t);
    let floorDelta=(p-s.pos-vec2f(2.5,13.))/vec2f(29.,9.);
    let spread=exp(-dot(floorDelta,floorDelta));
    material+=s.hue*s.energy*(.091+.065*(1.-joint))*spread;
    let q=local(p,s);
    let sourceDelta=q/vec2f(s.size.x*.88,s.size.y*.70);
    let k=length(sourceDelta);
    scatter+=s.hue*s.energy*(.50*exp(-k*1.05)+.105*exp(-k*.40));
  }
  for(var i=0;i<7;i++){
    let s=makeStone(i,t);
    let q=local(p,s);
    let n=q/s.size;
    let facet=abs(n.x)+abs(n.y);
    let body=(1.-smoothstep(-aa,aa,(facet-1.)*min(s.size.x,s.size.y)))*s.solid;
    let edgeSlope=abs(n.x-.18*n.y);
    let nearFace=select(.28,.63,n.x<.18*n.y);
    let facing=mix(.33,1.,clamp(.72-.50*n.y,0.,1.));
    let face=s.hue*(.035+.19*nearFace*facing);
    let seamDistance=edgeSlope*s.size.x;
    let endFade=1.-smoothstep(.58,1.,abs(n.y));
    let fissure=exp(-seamDistance*seamDistance/2.4)*endFade;
    let heat=exp(-seamDistance*.35)*endFade;
    let illuminated=face+s.energy*(s.hue*(.37*heat+1.62*fissure)+vec3f(1.30,1.16,.88)*fissure);
    material=mix(material,illuminated,body);
  }
  return vec4f(smoothFilmic(material+scatter),1.);
}
