// Barrier Pro r0.1. Procedural vertices, no images, no sampled art assets.
// Matches barrier-pro-sampler.mjs. Uniform-only event clock; no time easing.
struct Params {
  viewport: vec4f, // width, height, target h in framebuffer px, age ms
  event: vec4f,    // branch: idle -1 create0 absorb1 fracture2 bust3; authority active; impact v (-1 unknown); yaw deg
  center: vec4f,   // center x,y; coreEnabled (0/1),unused
};
@group(0) @binding(0) var<uniform> p: Params;
struct Env {
  kind:i32, r:f32, opacity:f32, kept:f32, depth:f32, yGain:f32,
  front:f32, dent:f32, stress:f32, core:f32, visible:f32,
};
// Explicit multiplication also covers negative inputs without relying on pow domain behavior.
fn square(x:f32)->f32 {return x*x;}
fn ss(a:f32,b:f32,x:f32)->f32 { let t=clamp((x-a)/(b-a),0.,1.); return t*t*(3.-2.*t); }
fn lp(a:f32,b:f32,x:f32,lo:f32,hi:f32)->f32 {return mix(a,b,clamp((x-lo)/(hi-lo),0.,1.));}
fn widthAt(v:f32)->f32 {
  if(v<.12){return lp(.18,.36,v,0.,.12);}if(v<.30){return lp(.36,.46,v,.12,.30);}
  if(v<.70){return .46;}if(v<.90){return lp(.46,.34,v,.70,.90);}return lp(.34,.16,v,.90,1.);
}
fn keel(v:f32)->f32 {
  if(v<.33){return lp(.045,-.055,v,0.,.33);}if(v<.68){return lp(-.055,.090,v,.33,.68);}
  return lp(.090,-.040,v,.68,1.);
}
fn tooth(v:f32)->f32 {
  let xs=array<f32,12>(0.,.14,.20,.29,.38,.46,.56,.64,.73,.83,.92,1.);
  let ys=array<f32,12>(0.,0.,1.,-.5,0.,1.,-.5,0.,1.,-.5,0.,0.);
  for(var i=1u;i<12u;i++){if(v<=xs[i]){return lp(ys[i-1u],ys[i],v,xs[i-1u],xs[i]);}}
  return 0.;
}
fn envelope()->Env {
  let b=i32(p.event.x);let T=select(650.,480.,b>=2);let t=p.viewport.w;
  let r=clamp(t/T,0.,1.);let on=b>=0&&b<=3&&t>=0.&&t<T;
  var e=Env(-1,r,1.,1.,1.,1.,0.,0.,0.,0.,select(0.,1.,on||p.event.y>.5));
  if(!on){e.opacity=e.visible;return e;} e.kind=b;
  if(b==0){
    e.front=.08+.84*r;e.opacity=lp(.86,1.,r,0.,.20);e.stress=.32;
    if(r<.20){e.core=lp(.25,1.,r,0.,.20);}else if(r<.72){e.core=lp(1.,.64,r,.20,.72);}else{e.core=lp(.64,.36,r,.72,1.);}
  }else if(b==1){
    e.dent=.012+.042*exp(-5.*r);e.stress=.24+.76*exp(-3.8*r);
    if(r<.08){e.core=lp(.92,1.,r,0.,.08);}else if(r<.24){e.core=lp(1.,.34,r,.08,.24);}
    else if(r<.6){e.core=lp(.34,.08,r,.24,.6);}else{e.core=lp(.08,.04,r,.6,1.);}
  }else if(b==2){
    e.kept=.84-.60*r;e.depth=1.-.52*r;e.opacity=1.-.36*r;e.stress=.55+.45*exp(-5.*r);
    if(r<.09){e.core=lp(.82,1.,r,0.,.09);}else if(r<.28){e.core=lp(1.,.25,r,.09,.28);}
    else if(r<.65){e.core=lp(.25,.05,r,.28,.65);}else{e.core=lp(.05,0.,r,.65,1.);}
  }else{
    e.kept=.90-.76*r;e.depth=1.-.90*r;e.yGain=.98-.13*r;e.opacity=.94-.30*r;
  }
  return e;
}
fn stressAt(e:Env,v:f32)->f32 {
  if(e.kind==0){return exp(-square((v-e.front)/.047));}
  if(e.kind==1){if(p.event.z<0.){return .60+.15*cos(3.14159265*(v-.5));}
    return exp(-square((v-p.event.z)/(.065+.100*e.r)));}
  if(e.kind==2){if(p.event.z<0.){return .7;}return exp(-square((v-p.event.z)/(.07+.22*e.r)));}
  return 0.;
}
struct Out {@builtin(position) pos:vec4f,@location(0) rgba:vec4f};
// 48x80 grid; indexed-equivalent procedural triangle-list. Production may cache
// or move formulas to a compute/vertex pipeline; reference is deliberately simple.
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) instance:u32)->Out {
  let nu=48u;let nv=80u;let offsets=array<vec2u,6>(vec2u(0,0),vec2u(1,0),vec2u(0,1),vec2u(1,0),vec2u(1,1),vec2u(0,1));
  let cell=vi/6u;let grid=vec2u(cell%nu,cell/nu)+offsets[vi%6u];
  let u=f32(grid.x)/f32(nu);let v=f32(grid.y)/f32(nv);
  let side=select(-1.,1.,instance%2u==1u);let isFront=instance>=2u;
  let e=envelope();let outer=-.025+.050*v+side*widthAt(v);let seam=keel(v);let span=abs(outer-seam);
  var inner=seam;
  if(e.kind==0){inner+=side*(.005+.078*ss(e.front-.045,e.front+.045,v));}
  else if(e.kind==2){let jag=.036*tooth(v)*select(1.,-.72,side>0.);let kept=clamp(span*e.kept+jag,.025,span*.91);inner=outer-side*kept;}
  else if(e.kind==3){inner=outer-side*span*e.kept;}
  let stress=stressAt(e,v);var x=mix(inner,outer,u);let y=(v-.5)*1.18*e.yGain;
  var fold:f32;if(u<.22){fold=lp(.90,1.,u,0.,.22);}else{fold=lp(1.,0.,u,.22,1.);}
  let cap=min(1.,min(v/.12,(1.-v)/.10));let z0=select(.19,.25,isFront)*fold*cap;
  var dent=0.;if(e.kind==1){dent=e.dent*stress*(1.-u)*cap;x+=.026*e.stress*stress*(1.-u);}
  let z=select(-1.,1.,isFront)*max(0.,z0*e.depth-dent);
  let innerBand=1.-ss(.18,.31,u);let bevel=ss(.76,.91,u);let dark=1.-ss(.018,.045,u);
  var base=mix(vec3f(.080,.145,.340),vec3f(.260,.395,.700),.66*innerBand+.18*bevel);
  base=mix(base,vec3f(.009,.016,.041),.76*dark)*select(1.,.82,side>0.)*select(.67,1.,isFront);
  let panelWidth=max(.025,abs(outer-inner));let coreAcross=exp(-square(((u-.145)*panelWidth)/((1.25/64.)*.55)));
  let core=clamp(e.core*stress*coreAcross*select(.30,1.,isFront)*p.center.z,0.,1.);
  let lift=.14*e.stress*stress*innerBand;
  let rgb=clamp(mix(min(vec3f(.83),base+lift*vec3f(.7,.7,1.)),vec3f(1.,.985,.945),core),vec3f(0.),vec3f(1.));
  var alpha=mix((.30+.06*bevel)*select(.68,1.,isFront),.965,core)*e.opacity;
  alpha=clamp(alpha*e.visible,0.,1.);
  let a=p.event.w*.0174532925199;let xr=cos(a)*x+sin(a)*z;let zr=-sin(a)*x+cos(a)*z;
  let pixel=p.center.xy+vec2f(xr,-y)*p.viewport.z;
  var out:Out;out.pos=vec4f(pixel.x/p.viewport.x*2.-1.,1.-pixel.y/p.viewport.y*2.,.5-zr*.25,1.);
  out.rgba=vec4f(rgb*alpha,alpha);return out;
}
@fragment fn fs(in:Out)->@location(0) vec4f {return in.rgba;}
