struct U { viewport: vec4f, anchor: vec4f, time: vec4f, flags: vec4f };
@group(0) @binding(0) var<uniform> u: U;
struct V { @builtin(position) position: vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
  var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  var v:V; v.position=vec4f(p[i],0,1); return v;
}
fn capsule(p:vec2f,a:vec2f,b:vec2f,r:f32)->f32 {
  let ab=b-a; let h=clamp(dot(p-a,ab)/max(dot(ab,ab),.00000001),0.,1.);
  return length(p-a-ab*h)-r;
}
// Fixture and carrier share the same articulated support. Its total height is 1 body unit.
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
fn carrier(p:vec2f)->f32 {
  var d=capsule(p,vec2f(0.,-.08),vec2f(0.,.42),.008);
  d=min(d,capsule(p,vec2f(0.,-.08),vec2f(-.10,-.46),.008));
  d=min(d,capsule(p,vec2f(0.,-.08),vec2f(.10,-.46),.008));
  d=min(d,capsule(p,vec2f(0.,.27),vec2f(-.10,.27),.008));
  d=min(d,capsule(p,vec2f(0.,.27),vec2f(.10,.27),.008));
  d=min(d,capsule(p,vec2f(-.10,.27),vec2f(-.175,.095),.008));
  d=min(d,capsule(p,vec2f(.10,.27),vec2f(.175,.095),.008));
  d=min(d,capsule(p,vec2f(-.175,.095),vec2f(-.19,-.10),.008));
  return min(d,capsule(p,vec2f(.175,.095),vec2f(.19,-.10),.008));
}
// Sparse nonperiodic material joins. Each pair grows toward one shared meeting point,
// then retracts into the neutral receiver behind the descending consolidation front.
// No thoracic rings, permanent medial line or closed cranial receiver.
const JOIN_PATHS=array<vec4f,12>(
  vec4f(-.135,-.460,-.082,-.445),vec4f(.085,-.460,.130,-.440),
  vec4f(-.112,-.360,-.057,-.300),vec4f(.060,-.340,.112,-.280),
  vec4f(-.096,-.180,-.036,-.120),vec4f(.035,-.220,.095,-.160),
  vec4f(-.074,-.055,.065,.018),vec4f(-.085,.120,.065,.205),
  vec4f(-.182,-.020,-.164,.075),vec4f(.167,.080,.145,.165),
  vec4f(-.080,.280,.060,.260),vec4f(-.039,.400,.034,.440)
);
const JOIN_RADII=array<f32,12>(.018,.018,.018,.018,.020,.020,.019,.019,.016,.016,.018,.018);
struct Assembly { density:f32, tips:f32, contact:f32 };
fn assembly(p:vec2f,t:f32,aa:f32)->Assembly {
  var out:Assembly;out.density=0.;out.tips=0.;out.contact=0.;
  for(var j=0u;j<12u;j++) {
    let path=JOIN_PATHS[j];let a=path.xy;let b=path.zw;let mid=mix(a,b,.55);
    let localAge=t-arrival(min(a.y,b.y))-.08;
    let growA=smoothstep(0.,.42,localAge);
    let growB=smoothstep(.08,.48,localAge);
    let settledAt=2.15+(.5-mid.y)*.65;
    let retract=smoothstep(settledAt,settledAt+.18,t);
    // Segment endpoints move, rather than leaving a fixed diagram with only luminance fade.
    let outerA=mix(a,mid,retract);let outerB=mix(b,mid,retract);
    let tipA=mix(a,mid,growA);let tipB=mix(b,mid,growB);
    let radius=JOIN_RADII[j]*mix(1.,.55,retract);
    let da=capsule(p,outerA,tipA,radius);let db=capsule(p,outerB,tipB,radius);
    let cov=1.-smoothstep(-aa*.55,aa*.55,min(da,db));
    let accepted=smoothstep(0.,.055,localAge)*(1.-retract);
    let joined=smoothstep(.30,.48,localAge);
    out.density=max(out.density,cov*accepted*mix(.55,1.,joined));
    let tipWidth=max(aa,.014);
    let tips=exp(-pow(length(p-tipA)/tipWidth,2.))+exp(-pow(length(p-tipB)/tipWidth,2.));
    out.tips=max(out.tips,tips*accepted*(1.-joined));
    out.contact=max(out.contact,cov*pulse(localAge-.36,.035,.10,.24)*(1.-retract));
  }
  return out;
}
struct W { @location(0) scene:vec4f, @location(1) emission:vec4f };
fn pulse(age:f32, rise:f32, hold:f32, end:f32)->f32 {
  return smoothstep(0.,rise,age)*(1.-smoothstep(hold,end,age));
}
// Rows only retain the R3 contact timing; material joins have their own nonperiodic paths.
// Foot, shin, thigh, pelvis, thorax, shoulders and head share an ascending driver.
fn arrival(y:f32)->f32 { return .12+(y+.5)*1.25; }
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
  if(abs(p.x)>.235 || abs(p.y)>.52){var blank:W;blank.scene=vec4f(bg,1.);blank.emission=vec4f(0.);return blank;}
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
  let medialDistance=max(0.,carrier(p));
  let core=exp(-medialDistance*u.viewport.z*.75)*inside;
  let parts=assembly(p,t,aa);
  // Sparse joined material remains body-clipped and later retracts into the receiver.
  let materialDensity=parts.density*inside;
  let opacity=materialDensity*.80*onset*finish*live*u.flags.x;
  let plateNormal=normalize(vec3f(n.xy*.8,1.));
  let light=normalize(vec3f(-.6,.7,1.));
  let facing=max(0.,dot(plateNormal,light));
  let view=vec3f(0.,0.,1.);
  let halfVector=normalize(light+view);
  let nv=max(.001,dot(plateNormal,view));
  let nh=max(0.,dot(plateNormal,halfVector));
  let vh=max(0.,dot(view,halfVector));
  let roughness=mix(.56,.38,closing)*mix(1.10,.90,parts.density);
  let alpha2=pow(roughness,4.);
  let distribution=alpha2/(3.14159265*pow(nh*nh*(alpha2-1.)+1.,2.));
  let fresnel=.04+.96*pow(1.-vh,5.);
  let smithK=pow(roughness+1.,2.)/8.;
  let geometry=(nv/(nv*(1.-smithK)+smithK))*(facing/(facing*(1.-smithK)+smithK));
  let reflected=distribution*fresnel*geometry/(4.*nv*max(.001,facing));
  let sheetTint=vec3f(.38,.48,.43)*(.28+(1.-fresnel)*facing*.72)+vec3f(.86,.92,.80)*reflected*facing;
  base=mix(base,sheetTint,opacity);
  // A short moving driver establishes continuity, then recedes locally; never a retained spine.
  let guideWindow=pulse(t-arrival(p.y),.035,.12,.46);
  let feed=core*reached*guideWindow*(.18+front*.8);
  let joint=parts.contact*inside;
  let returnFront=.5-clamp((t-2.15)/.65,0.,1.);
  let consolidation=exp(-pow((p.y-returnFront)/.055,2.))*smoothstep(2.10,2.20,t)*(1.-smoothstep(2.78,2.92,t));
  let energy=(feed+parts.tips*inside*.8+joint*.8+materialDensity*(.08+.10*facing)+consolidation*materialDensity*.5)*onset*finish*live*u.flags.x;
  var glow=vec3f(.06,.45,.57)*energy;
  glow+=vec3f(.56,.78,.70)*joint*onset*finish*live*u.flags.x;
  base+=vec3f(.015,.08,.09)*energy*inside*(.5+.5*n.z);
  var stars=vec3f(0.);
  var sparkleSource=0.;
  for(var i=0u;i<28u;i++) {
    let side=select(-1.,1.,i%2u==1u);
    // All 28 registered sites are within body support (checked by the CPU geometry regression).
    // Avoid recomputing the whole body SDF 28 times per fragment for constant positions.
    let loc=SITES[i]; let x=loc.x; let y=loc.y;
    let siteRow=floor((y+.10*abs(x)+.5)/.10);
    let born=arrival(-.45+siteRow*.10)+.25+select(0.,.07,i%2u==1u);
    let a=t-born;
    // Connected blocks travel the final short span before meeting the receiving material.
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
    // Repeated consolidation contacts require an already received local section.
    // Finite staggered trains, not global synchronous twinkle or floating particles.
    let repeatStart=max(born+.44,1.35)+f32((i*11u)%28u)*.013;
    var repeated=0.;
    for(var k=0u;k<3u;k++) {
      let contact=repeatStart+f32(k)*.43;
      repeated+=pulse(t-contact,mix(.035,.075,u.anchor.w),.095,mix(.23,.30,u.anchor.w));
    }
    repeated*=1.-smoothstep(2.68,2.90,t);
    let strength=first+second*.8+repeated*.85;
    // Body-relative optical source: H64 core is ~1.41 CSS px FWHM at DPR1 AND DPR2.
    // At H128 its CSS dimensions double with the whole phenomenon.
    let q=(p-loc)*64.;
    let pin=exp(-dot(q,q)/.72);
    stars+=mix(vec3f(.62,.92,1.),vec3f(1.,.90,.63),(second+repeated)/(first+second+repeated+.001))*pin*4.1*strength;
    sparkleSource+=pin*strength;
  }
  glow+=stars*live*finish*u.flags.y;
  var o:W; o.scene=vec4f(base,1.); o.emission=vec4f(glow,sparkleSource*live*finish*u.flags.y); return o;
}
