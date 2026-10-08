struct U { viewport: vec4f, anchor: vec4f, time: vec4f, flags: vec4f };
@group(0) @binding(0) var<uniform> u: U;
struct V { @builtin(position) position: vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
  var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  var v:V; v.position=vec4f(p[i],0,1); return v;
}
fn capsule(p:vec2f,a:vec2f,b:vec2f,r:f32)->f32 {
  let ab=b-a; let h=clamp(dot(p-a,ab)/dot(ab,ab),0.,1.);
  return length(p-a-ab*h)-r;
}
// Fixture and carrier share exactly this skeleton. Its total height is 1 body unit.
fn body(p:vec2f)->f32 {
  var d=length((p-vec2f(0.,.416))/vec2f(.066,.084))-1.; d*=.066;
  d=min(d,capsule(p,vec2f(0.,.29),vec2f(0.,.08),.115));
  d=min(d,capsule(p,vec2f(0.,.08),vec2f(0.,-.08),.095));
  d=min(d,capsule(p,vec2f(-.065,-.08),vec2f(-.085,-.28),.047));
  d=min(d,capsule(p,vec2f(.065,-.08),vec2f(.085,-.28),.047));
  d=min(d,capsule(p,vec2f(-.085,-.28),vec2f(-.10,-.45),.036));
  d=min(d,capsule(p,vec2f(.085,-.28),vec2f(.10,-.45),.036));
  d=min(d,capsule(p,vec2f(-.10,-.46),vec2f(-.13,-.475),.025));
  d=min(d,capsule(p,vec2f(.10,-.46),vec2f(.13,-.475),.025));
  d=min(d,capsule(p,vec2f(-.10,.27),vec2f(-.175,.095),.035));
  d=min(d,capsule(p,vec2f(.10,.27),vec2f(.175,.095),.035));
  d=min(d,capsule(p,vec2f(-.175,.095),vec2f(-.19,-.10),.026));
  return min(d,capsule(p,vec2f(.175,.095),vec2f(.19,-.10),.026));
}
fn spine(p:vec2f)->f32 {
  var d=capsule(p,vec2f(0.,-.08),vec2f(0.,.42),.008);
  d=min(d,capsule(p,vec2f(0.,-.08),vec2f(-.10,-.46),.008));
  d=min(d,capsule(p,vec2f(0.,-.08),vec2f(.10,-.46),.008));
  d=min(d,capsule(p,vec2f(0.,.26),vec2f(-.19,-.10),.008));
  return min(d,capsule(p,vec2f(0.,.26),vec2f(.19,-.10),.008));
}
struct W { @location(0) scene:vec4f, @location(1) emission:vec4f };
@fragment fn fs(v:V)->W {
  let p=vec2f((v.position.x-u.anchor.x)/u.viewport.z,(u.anchor.y-v.position.y)/u.viewport.z);
  let aa=1./u.viewport.z; let d=body(p); let inside=1.-smoothstep(-aa,aa,d);
  let bg=mix(vec3f(.014,.021,.032),vec3f(.72,.75,.79),u.anchor.z);
  let grad=vec2f(body(p+vec2f(aa,0))-body(p-vec2f(aa,0)),body(p+vec2f(0,aa))-body(p-vec2f(0,aa)));
  let n=normalize(vec3f(grad*24.,.8));
  let diffuse=.22+.5*max(0.,dot(n,normalize(vec3f(-.6,.7,1.))));
  let skin=vec3f(.30,.36,.43)*diffuse;
  var base=mix(bg,skin,inside);
  let t=u.time.x; let live=select(0.,1.,t>=0. && t<3.4)*u.flags.w;
  let onset=smoothstep(0.,.15,t);
  let finish=1.-smoothstep(2.9,3.4,t);
  let yFront=-.5+clamp((t-.1)/1.45,0.,1.);
  let reached=1.-smoothstep(yFront-.035,yFront+.025,p.y);
  let front=exp(-pow((p.y-yFront)/.045,2.));
  // Medial edges grow outward after the front reaches each cross-section.
  let localAge=t-(p.y+.5)*1.45-.1;
  let opening=clamp(localAge/.36,0.,1.);
  let widthGrow=mix(.015,.245,opening);
  let unfold=1.-smoothstep(widthGrow-aa,widthGrow+aa,abs(p.x));
  let core=exp(-max(0.,spine(p))*u.viewport.z*.65)*inside;
  // Unequal, broad articulated panels: cut spacing is 4.5 px at H64, never a micro-noise carpet.
  let row=floor((p.y+.5)/.07);
  let gap=abs(fract((p.y+.5)/.07)-.5);
  let panel=1.-smoothstep(.43,.50,gap);
  let sideCut=1.-smoothstep(.0,.014,abs(abs(p.x)-(.04+.025*sin(row*1.7))));
  let seam=max(smoothstep(.39,.49,gap),sideCut*.65);
  let structure=inside*reached*unfold;
  let closure=smoothstep(1.55,2.4,t);
  let boundary=exp(-abs(d)*u.viewport.z*.55)*reached;
  let density=structure*(.20+.38*panel)*mix(1.,.65,closure);
  let opacity=density*.50*onset*finish*live*u.flags.x;
  let sheetTint=mix(vec3f(.04,.42,.53),vec3f(.18,.72,.66),closure);
  // The carrier has transmission + emission, not a solid plastic reflection model.
  base=base*(1.-opacity)+sheetTint*opacity;
  let feed=core*(.45+1.65*front)*reached;
  let fold=structure*(.20+seam*(1.1-.55*closure)+front*.7);
  let settle=structure*closure*(.35+.45*exp(-pow((p.y-(.5-(t-2.4)*.95))/.13,2.)));
  var energy=(feed+fold+boundary*.65+settle)*onset*finish*live*u.flags.x;
  var glow=vec3f(.08,.72,.88)*energy;
  glow+=vec3f(.72,1.,.95)*pow(max(0.,energy-.55),2.)*.70;
  // Local response is tied to incident carrier energy and actor support, not a uniform rim.
  base+=vec3f(.02,.15,.17)*energy*inside*(.5+.5*n.z);
  var stars=vec3f(0.);
  for(var i=0u;i<24u;i++) {
    let k=f32(i); let y=-.44+floor(k/2.)*.078;
    let sign=select(-1.,1.,i%2u==1u);
    let x=sign*(.045+.055*abs(sin(k*.91)));
    let loc=vec2f(x,y); let valid=1.-smoothstep(-aa,aa,body(loc));
    let born=.14+(y+.5)*1.45+.12+fract(k*.37)*.18;
    let age=t-born; let pulse=smoothstep(0.,mix(.065,.12,u.anchor.w),age)*(1.-smoothstep(mix(.13,.22,u.anchor.w),mix(.32,.48,u.anchor.w),age));
    let q=(p-loc)*u.viewport.z;
    let cross=exp(-pow(q.x/.55,2.)-pow(q.y/2.0,2.))+exp(-pow(q.x/2.0,2.)-pow(q.y/.55,2.));
    stars+=vec3f(.72,1.,.92)*cross*pulse*valid;
  }
  // A second closure set belongs to the same settled sites, not free rising particles.
  let knot=sin((p.y+.5)*45.);
  let knotMask=pow(max(0.,knot),14.)*exp(-pow(p.x/.018,2.));
  stars+=vec3f(.50,.95,1.)*knotMask*exp(-pow((t-2.35)/.22,2.));
  glow+=stars*live*finish*u.flags.y;
  var o:W; o.scene=vec4f(base,1.); o.emission=vec4f(glow,1.); return o;
}
