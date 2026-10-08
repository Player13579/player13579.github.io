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
fn pulse(age:f32, rise:f32, hold:f32, end:f32)->f32 {
  return smoothstep(0.,rise,age)*(1.-smoothstep(hold,end,age));
}
// Rows form broad oblique material sections, never a rectangular wireframe.
// Foot, shin, thigh, pelvis, thorax, shoulders and head share an ascending driver.
fn arrival(y:f32)->f32 { return .12+(y+.5)*1.25; }
fn weld(y:f32,t:f32)->f32 { return pulse(t-arrival(y)-.22,.06,.12,.38); }
const SITES=array<vec2f,28>(
  vec2f(-.075,-.450),vec2f(.075,-.450),vec2f(-.075,-.381),vec2f(.075,-.381),
  vec2f(-.075,-.312),vec2f(.075,-.312),vec2f(-.075,-.243),vec2f(.075,-.243),
  vec2f(-.075,-.174),vec2f(.075,-.174),vec2f(-.075,-.105),vec2f(.075,-.105),
  vec2f(-.18344,-.036),vec2f(.18344,-.036),vec2f(-.055,.033),vec2f(.055,.033),
  vec2f(-.17102,.102),vec2f(.17102,.102),vec2f(-.055,.171),vec2f(.055,.171),
  vec2f(-.115,.240),vec2f(.115,.240),vec2f(-.032,.309),vec2f(.032,.309),
  vec2f(-.032,.378),vec2f(.032,.378),vec2f(-.032,.447),vec2f(.032,.447)
);
@fragment fn fs(v:V)->W {
  let p=vec2f((v.position.x-u.anchor.x)/u.viewport.z,(u.anchor.y-v.position.y)/u.viewport.z);
  let bg=mix(vec3f(.014,.021,.032),vec3f(.72,.75,.79),u.anchor.z);
  // Bound procedural work to the body; the surrounding viewport carries no E population.
  if(abs(p.x)>.235 || abs(p.y)>.52){var blank:W;blank.scene=vec4f(bg,1.);blank.emission=vec4f(0.,0.,0.,1.);return blank;}
  let aa=1./u.viewport.z; let d=body(p); let inside=1.-smoothstep(-aa,aa,d);
  let grad=vec2f(body(p+vec2f(aa,0))-body(p-vec2f(aa,0)),body(p+vec2f(0,aa))-body(p-vec2f(0,aa)));
  let n=normalize(vec3f(grad*24.,.8));
  let diffuse=.22+.5*max(0.,dot(n,normalize(vec3f(-.6,.7,1.))));
  let skin=vec3f(.19,.24,.29)*diffuse;
  var base=mix(bg,skin,inside);
  let t=u.time.x; let live=select(0.,1.,t>=0. && t<3.4)*u.flags.w;
  let onset=smoothstep(0.,.10,t);
  let finish=1.-smoothstep(2.9,3.4,t);
  let yFront=-.5+clamp((t-.12)/1.25,0.,1.);
  let reached=1.-smoothstep(yFront-.02,yFront+.02,p.y);
  let front=exp(-pow((p.y-yFront)/.035,2.));
  let oblique=p.y+.10*abs(p.x);
  let row=floor((oblique+.5)/.10);
  let rowY=-.45+row*.10;
  let localAge=t-arrival(rowY);
  let joined=smoothstep(.16,.34,localAge);
  let closing=smoothstep(1.65,2.35,t);
  let outward=smoothstep(0.,.30,localAge);
  let medialDistance=max(0.,spine(p));
  let structuralReach=1.-smoothstep(outward*.16-aa,outward*.16+aa,medialDistance);
  let gap=abs(fract((oblique+.5)/.10)-.5);
  let plateMask=1.-smoothstep(.40,.49,gap);
  let openSeam=smoothstep(.39,.49,gap)*(1.-closing*.85);
  let core=exp(-medialDistance*u.viewport.z*.75)*inside;
  let structure=inside*reached*structuralReach;
  // Light moves into connected sections. Completed sections become calm pearl material.
  let materialDensity=structure*joined*mix(plateMask,.97,closing);
  let opacity=materialDensity*.78*onset*finish*live*u.flags.x;
  let plateNormal=normalize(vec3f(n.xy*.8,1.));
  let light=normalize(vec3f(-.6,.7,1.));
  let facing=max(0.,dot(plateNormal,light));
  let view=vec3f(0.,0.,1.);
  let halfVector=normalize(light+view);
  let nv=max(.001,dot(plateNormal,view));
  let nh=max(0.,dot(plateNormal,halfVector));
  let vh=max(0.,dot(view,halfVector));
  let roughness=mix(.56,.38,closing)*mix(1.10,.90,plateMask);
  let alpha2=pow(roughness,4.);
  let distribution=alpha2/(3.14159265*pow(nh*nh*(alpha2-1.)+1.,2.));
  let fresnel=.04+.96*pow(1.-vh,5.);
  let smithK=pow(roughness+1.,2.)/8.;
  let geometry=(nv/(nv*(1.-smithK)+smithK))*(facing/(facing*(1.-smithK)+smithK));
  let reflected=distribution*fresnel*geometry/(4.*nv*max(.001,facing));
  let sheetTint=vec3f(.10,.33,.36)*(.28+(1.-fresnel)*facing*.72)+vec3f(.70,.79,.76)*reflected*facing;
  base=mix(base,sheetTint,opacity);
  // Entry axis fades after the receiving material closes: no perpetual bright grid.
  let feed=core*reached*(.18+front*1.8)*(1.-closing*.82);
  let joint=structure*weld(rowY,t)*(openSeam*.85+.12);
  let progressingEdge=exp(-pow((medialDistance-outward*.16)/max(aa,.008),2.))*inside*reached*(1.-joined);
  let retained=structure*joined*(.055+.10*facing);
  let returnFront=.5-clamp((t-2.15)/.65,0.,1.);
  let consolidation=exp(-pow((p.y-returnFront)/.055,2.))*smoothstep(2.10,2.20,t)*(1.-smoothstep(2.78,2.92,t));
  let boundary=exp(-abs(d)*u.viewport.z*.90)*inside*reached;
  let energy=(feed+joint+progressingEdge*.85+retained+consolidation*structure*.85+boundary*(.10+.35*consolidation))*onset*finish*live*u.flags.x;
  var glow=vec3f(.06,.45,.57)*energy;
  glow+=vec3f(.56,.78,.70)*joint*onset*finish*live*u.flags.x;
  base+=vec3f(.015,.08,.09)*energy*inside*(.5+.5*n.z);
  var stars=vec3f(0.);
  var sparkleSource=0.;
  for(var i=0u;i<28u;i++) {
    let side=select(-1.,1.,i%2u==1u);
    // All 28 registered sites are within body support (checked by the CPU geometry regression).
    // Avoid recomputing the whole skeleton SDF 28 times per fragment for constant positions.
    let loc=SITES[i]; let x=loc.x; let y=loc.y;
    let siteRow=floor((y+.10*abs(x)+.5)/.10);
    let born=arrival(-.45+siteRow*.10)+.25+select(0.,.07,i%2u==1u);
    let a=t-born;
    // Connected blocks travel the final short span before welding into the broad shell.
    let transfer=clamp((a+.25)/.25,0.,1.);
    let travel=(1.-transfer)*(1.-transfer);
    let packetCenter=loc+vec2f(-side*.065,-.035)*travel;
    let pq=abs(p-packetCenter)-vec2f(.024,.018);
    let block=1.-smoothstep(-aa,aa,max(pq.x,pq.y));
    let rail=max(0.,1.-abs(p.y-packetCenter.y)/max(aa,.009))*(1.-smoothstep(.0,.07,abs(p.x-loc.x)));
    let moving=pulse(a+.25,.04,.22,.29)*(1.-joined*.3);
    glow+=vec3f(.10,.48,.66)*(block*.65+rail*.12)*moving*inside*live*finish*u.flags.x;
    let first=pulse(a,mix(.045,.08,u.anchor.w),.15,mix(.34,.42,u.anchor.w));
    let closeBorn=2.15+(.5-y)*.65;
    let second=pulse(t-closeBorn,.045,.13,.31);
    let strength=first+second*.8;
    let q=(p-loc)*u.viewport.z;
    let pin=exp(-dot(q,q)/.5);
    stars+=mix(vec3f(.45,.9,1.),vec3f(1.,.89,.55),first/(first+second+.001))*pin*2.9*strength;
    sparkleSource+=pin*strength;
  }
  glow+=stars*live*finish*u.flags.y;
  var o:W; o.scene=vec4f(base,1.); o.emission=vec4f(glow,sparkleSource*live*finish*u.flags.y); return o;
}
