// 正規化PHASE定数はshader-source.mjsが同一の実行契約から先頭へ付加する。
// PH1=有限な源、PH2=輸送体積、PH3=受領・蓄積。OBSはobserve()のみ。
struct Globals {
  screen: vec4<f32>,             // width,height,eventCount,OBS enabled
  background: vec4<f32>,         // linear RGB, alpha。透明時はworld受け手の照明を偽装しない。
  options: vec4<f32>,            // world enabled, light enabled, reserved, reserved
};
struct Event {
  placement: vec4<f32>,          // foot x,y in physical pixels; pixels/world; normalized age
  identity: vec4<f32>,           // integer token; deterministic seed; reduced motion; opacity
  receiver: vec4<f32>,           // receiver x,y relative to foot; reserved
};
@group(0) @binding(0) var<uniform> g: Globals;
@group(0) @binding(1) var<storage,read> events: array<Event>;

struct VertexOut { @builtin(position) position: vec4<f32> };
@vertex fn vertexMain(@builtin(vertex_index) i:u32) -> VertexOut {
  var p=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
  var o:VertexOut; o.position=vec4<f32>(p[i],0.,1.); return o;
}
fn ss(a:f32,b:f32,t:f32)->f32 { let x=clamp((t-a)/(b-a),0.,1.); return x*x*(3.-2.*x); }
fn ellipse(p:vec2<f32>,r:vec2<f32>)->f32 { return (length(p/max(r,vec2<f32>(.05)))-1.)*min(r.x,r.y); }
fn coverage(d:f32,aa:f32)->f32 { return 1.-ss(-aa,aa,d); }
fn boundedLobe(p:vec2<f32>,c:vec2<f32>,r:vec2<f32>)->f32 {
  let q=length((p-c)/r); return exp(-2.4*q*q)*(1.-ss(.68,1.,q));
}
struct PhaseState {
  source:f32, transit:f32, received:f32, travel:f32, shrink:f32, fade:f32,
  center:vec2<f32>,
};
fn phaseState(e:Event)->PhaseState {
  let t=clamp(e.placement.w,0.,1.);
  var s:PhaseState;
  s.source=1.-ss(P_sourceDrainStart,P_sourceDrainEnd,t);
  s.received=ss(P_receiveStart,P_receiveEnd,t);
  s.transit=max(0.,1.-s.source-s.received);
  s.travel=ss(P_travelStart,P_travelEnd,t);
  s.shrink=ss(P_settleStart,P_end,t);
  s.fade=1.-ss(P_fadeStart,P_end,t);
  let excursion=select((e.identity.y-.5)*22.*sin(3.14159265*s.travel),0.,e.identity.z>.5);
  s.center=vec2<f32>(excursion,mix(-8.,e.receiver.y,s.travel));
  return s;
}
struct Volume {
  color:vec3<f32>, opacity:f32, emission:vec3<f32>, density:f32,
};
fn emptyVolume()->Volume { return Volume(vec3<f32>(0.),0.,vec3<f32>(0.),0.); }
// PH1: 円環ではなく充実した横長の種。排出で体積が減り、最初から足元に接続する。
fn sourceField(p:vec2<f32>,s:PhaseState,t:f32,aa:f32)->Volume {
  if(s.source<=.0001 || s.fade<=0.) {return emptyVolume();}
  let r=vec2<f32>(9.+14.*sqrt(s.source),5.+7.*sqrt(s.source));
  let q=p-vec2<f32>(0.,-8.);
  let d=(abs(q.x)/r.x*.80+abs(q.y)/r.y*.84+length(q/r)*.20-1.)*r.y;
  let a=coverage(d,aa)*ss(0.,.07,s.source)*s.fade;
  let inner=coverage(d+2.6,aa);
  let core=boundedLobe(q,vec2<f32>(-4.,-1.),vec2<f32>(10.,6.));
  let facet=clamp(.45-q.y/r.y*.30-q.x/r.x*.18,0.,1.);
  let color=mix(vec3<f32>(.12,.060,.020),mix(vec3<f32>(.55,.25,.035),vec3<f32>(.92,.59,.14),facet),inner);
  let ignition=.34+.66*ss(0.,.055,t);
  let density=sqrt(s.source)*(.75+.45*core);
  let opacity=a*(1.-exp(-3.6*density));
  return Volume(color,opacity,vec3<f32>(.95,.82,.40)*core*.90*ignition*(.5+.5*density),density);
}
// PH2: 一本の太い先細り体積。点列・単なる軌跡線・残像を用いない。
fn transportField(p:vec2<f32>,s:PhaseState,aa:f32)->Volume {
  if(s.transit<=.0001 || s.fade<=0.) {return emptyVolume();}
  let q=p-s.center;
  let stretch=sin(3.14159265*s.travel);
  let r=vec2<f32>(8.+6.*sqrt(s.transit),10.+14.*stretch);
  let width=r.x*(.86+.14*ss(-r.y,r.y,q.y));
  let d=ellipse(q,vec2<f32>(width,r.y));
  let a=coverage(d,aa)*ss(0.,.09,s.transit)*s.fade;
  let inner=coverage(d+2.4,aa);
  let face=clamp(.56-q.x/width*.25-q.y/r.y*.20,0.,1.);
  let color=mix(vec3<f32>(.010,.095,.09),mix(vec3<f32>(.02,.36,.30),vec3<f32>(.20,.73,.52),face),inner);
  let core=boundedLobe(q,vec2<f32>(-2.,-r.y*.3),vec2<f32>(6.,r.y*.7));
  let density=sqrt(s.transit)*(.60+.55*core);
  let opacity=a*(1.-exp(-3.4*density));
  return Volume(color,opacity,vec3<f32>(.55,.95,.70)*core*.60*(.6+.4*density),density);
}
// PH3: 受領した分だけ腹部体積が拡大し、充実する。輸送消失後も蓄積状態を保持する。
fn receiveField(p:vec2<f32>,e:Event,s:PhaseState,aa:f32)->Volume {
  if(s.received<=.0001 || s.fade<=0.) {return emptyVolume();}
  let squeeze=1.-.90*s.shrink;
  let c=vec2<f32>(e.receiver.x,e.receiver.y+20.*(1.-s.received));
  let q=p-c;
  let r=vec2<f32>(10.+21.*s.received,6.+21.*s.received)*squeeze;
  // 面を持つ六角形に近い塊。横幅も高さも受領量へ従属し、空の輪郭を先行表示しない。
  let d=max(abs(q.x)*.85+abs(q.y)*.42-r.x*.85,abs(q.y)-r.y);
  let a=coverage(d,aa)*ss(0.,.07,s.received)*s.fade;
  let inner=coverage(d+2.6,aa);
  let elevation=clamp(.5-q.y/max(r.y,1.)*.5,0.,1.);
  let planar=ss(-r.x*.3,r.x*.7,q.x+q.y*.35);
  let body=mix(vec3<f32>(.018,.31,.23),vec3<f32>(.15,.72,.47),elevation);
  let color=mix(vec3<f32>(.012,.085,.067),body*(1.-.20*planar),inner);
  let nucleus=boundedLobe(q,vec2<f32>(-r.x*.16,-r.y*.05),max(vec2<f32>(2.),r*vec2<f32>(.32,.63)));
  let receiptPeak=.40+.60*sin(3.14159265*clamp((e.placement.w-P_receiveStart)/(.80-P_receiveStart),0.,1.));
  let density=.35+1.45*s.received*(.75+.25*elevation);
  let opacity=a*(1.-exp(-2.4*density));
  return Volume(color,opacity,vec3<f32>(.71,1.,.62)*nucleus*.86*receiptPeak,density);
}
// PHの照明出力。ここは空間への放射の設計モデル。実物理の測定値ではない。
fn lightField(p:vec2<f32>,e:Event,s:PhaseState)->vec3<f32> {
  let a=boundedLobe(p,vec2<f32>(0.,-8.),vec2<f32>(48.,27.))*s.source*.23;
  let b=boundedLobe(p,s.center,vec2<f32>(48.,39.))*s.transit*.16;
  let c=boundedLobe(p,e.receiver.xy,vec2<f32>(60.,48.))*s.received*.24;
  return (vec3<f32>(.95,.52,.13)*a+vec3<f32>(.12,.88,.60)*b+vec3<f32>(.18,.84,.55)*c)*s.fade;
}
struct Layered { color:vec3<f32>, alpha:f32 };
fn over(back:Layered,v:Volume)->Layered {
  let a=clamp(v.opacity,0.,1.);
  return Layered(back.color*(1.-a)+(v.color+v.emission)*a,back.alpha*(1.-a)+a);
}
// OBS1: source-boundで有限範囲の柔らかい拡散のみ。図形の主輪郭は上のPHが作る。
fn observe(back:Layered,light:vec3<f32>,coverageValue:f32)->Layered {
  let peak=max(light.r,max(light.g,light.b));
  let a=min(.16,peak*.50)*(1.-coverageValue*.74);
  let hue=light/vec3<f32>(max(peak,.0001));
  return Layered(back.color*(1.-a)+hue*a,back.alpha*(1.-a)+a);
}
fn srgb(c:vec3<f32>)->vec3<f32> {
  let x=clamp(c,vec3<f32>(0.),vec3<f32>(1.));
  return select(12.92*x,1.055*pow(x,vec3<f32>(1./2.4))-vec3<f32>(.055),x>vec3<f32>(.0031308));
}
struct FragmentOut { @location(0) color:vec4<f32>, @location(1) witness:u32 };
@fragment fn fragmentMain(v:VertexOut)->FragmentOut {
  var composite=Layered(g.background.rgb*g.background.a,g.background.a);
  var token=0u;
  for(var i=0u;i<u32(g.screen.z);i++) {
    let e=events[i]; let p=(v.position.xy-e.placement.xy)/vec2<f32>(e.placement.z);
    if(p.x < -66. || p.x > 66. || p.y < -127. || p.y > 13. || e.placement.w>=1.){continue;}
    let aa=max(.55,.80/e.placement.z);
    let s=phaseState(e);
    let source=sourceField(p,s,e.placement.w,aa);
    let transit=transportField(p,s,aa);
    let received=receiveField(p,e,s,aa);
    let cov=max(source.opacity,max(transit.opacity,received.opacity));
    let light=lightField(p,e,s);
    let prior=composite.color;
    // 指定された中性診断背景で入射光を表示。透明統合ではホストがsampleLightAtWorldを適用する。
    if(g.options.y>.5){ composite.color+=light*g.background.a*(vec3<f32>(.72)+.28*g.background.rgb); }
    if(g.options.x>.5) {
      composite=over(composite,source);
      composite=over(composite,transit);
      composite=over(composite,received);
    }
    if(g.screen.w>.5){composite=observe(composite,light,cov);}
    // 後段の完全遮蔽に関して保守的な最前面token。光だけでは発音許可を作らない。
    if(cov>.18 && distance(prior,composite.color)>.018 && g.options.x>.5) { token=u32(e.identity.x); }
  }
  var o:FragmentOut;
  o.color=vec4<f32>(srgb(composite.color/vec3<f32>(max(composite.alpha,.00001)))*composite.alpha,composite.alpha);
  o.witness=token;return o;
}
