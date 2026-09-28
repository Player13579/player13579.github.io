// Mana r0.2: PH1=足元の有限供給面、PH2=連続した太い輸送面、PH3=腹部の充填面。
// PHASE / GEOMETRY はsrc/contract.mjsから展開。画像素材・乱数粒子・六角形は使用しない。
struct Globals {
  screen:vec4<f32>,       // backing width,height,event count,OBS enabled
  background:vec4<f32>,   // linear RGB, alpha
  options:vec4<f32>,      // world enabled, light enabled, layer inspection selector, reserved
};
struct Event {
  placement:vec4<f32>,    // current foot physical px, pixels/wu, normalized owner phase
  identity:vec4<f32>,     // unique integer token, seed, reduced motion, opacity
  receiver:vec4<f32>,     // normalized host receiver offset, reserved
};
@group(0) @binding(0) var<uniform> g:Globals;
@group(0) @binding(1) var<storage,read> events:array<Event>;
struct VertexOut { @builtin(position) position:vec4<f32> };
@vertex fn vertexMain(@builtin(vertex_index) i:u32)->VertexOut {
  var points=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
  var o:VertexOut; o.position=vec4<f32>(points[i],0.,1.);return o;
}
fn ss(a:f32,b:f32,t:f32)->f32 {let x=clamp((t-a)/(b-a),0.,1.);return x*x*(3.-2.*x);}
fn coverage(d:f32,aa:f32)->f32 {return 1.-ss(-aa,aa,d);}
fn ellipse(p:vec2<f32>,r:vec2<f32>)->f32 {return (length(p/r)-1.)*min(r.x,r.y);}
fn boundedLobe(p:vec2<f32>,c:vec2<f32>,r:vec2<f32>)->f32 {
  let q=length((p-c)/r);return exp(-2.4*q*q)*(1.-ss(.68,1.,q));
}
fn routePoint(v:f32)->vec2<f32> {
  let t=clamp(v,0.,1.);
  return vec2<f32>(mix(G_routeStartX,G_routeEndX,t)+G_routeBend*sin(3.14159265*t),mix(G_routeStartY,G_routeEndY,t));
}
fn routeRadius(v:f32)->f32 {return G_routeRadius+G_routeSwell*sin(3.14159265*clamp(v,0.,1.));}
struct PhaseState {
  u:f32,source:f32,transit:f32,received:f32,front:f32,tail:f32,shrink:f32,fade:f32,materialLift:f32,
};
fn phaseState(e:Event)->PhaseState {
  let u=clamp(e.placement.w,0.,1.);var s:PhaseState;s.u=u;
  s.source=1.-ss(P_sourceDrainStart,P_sourceDrainEnd,u);
  s.received=ss(P_receiveStart,P_receiveEnd,u);
  s.transit=max(0.,1.-s.source-s.received);
  s.front=ss(P_travelStart,P_travelEnd,u);s.tail=ss(P_tailStart,P_tailEnd,u);
  s.shrink=ss(P_settleStart,P_end,u);s.fade=1.-ss(P_fadeStart,P_end,u);
  s.materialLift=select(.035*sin(3.14159265*u)*(.5+.5*clamp(e.identity.y,0.,1.)),0.,e.identity.z>.5);
  return s;
}
struct Volume {color:vec3<f32>,opacity:f32,emission:vec3<f32>,density:f32};
fn emptyVolume()->Volume {return Volume(vec3<f32>(0.),0.,vec3<f32>(0.),0.);}
// PH1: 小点ではなく最大86×26wuの供給面。源量とともに面積・濃度が減る。
fn sourceField(p:vec2<f32>,s:PhaseState,aa:f32)->Volume {
  if(s.source<=.00001||s.fade<=0.){return emptyVolume();}
  let size=sqrt(s.source);
  let radius=vec2<f32>(G_sourceRadiusX*(.38+.62*size),G_sourceRadiusY*(.46+.54*size));
  let q=p-vec2<f32>(G_sourceX,G_sourceY);let d=ellipse(q,radius);
  let fill=coverage(d,aa)*ss(0.,.012,s.source)*s.fade;
  let inner=coverage(d+G_edgeWidth,aa);let face=clamp(.62-q.y/radius.y*.28,0.,1.);
  // 発光の高輝度部を輸送の出入口側へ束縛する。独立した光源ではない。
  let core=boundedLobe(q,vec2<f32>(-radius.x*.37,-1.),radius*vec2<f32>(.63,.70));
  let body=mix(vec3<f32>(.45,.18,.024),vec3<f32>(.90,.53,.105),face);
  let color=mix(vec3<f32>(.12,.047,.014),body,inner);
  let density=.50+1.35*s.source;
  return Volume(color,fill*(1.-exp(-3.*density)),vec3<f32>(.94,.86,.46)*core*(.58+.30*s.source),density);
}
struct Ribbon {distance:f32,v:f32,radius:f32};
fn ribbonInfo(p:vec2<f32>,s:PhaseState)->Ribbon {
  var best=1000000.;var at=0.;
  // 区分線分は距離計算にだけ使用する。描画は幅23〜28wuを持つ一つの連続面。
  for(var i=0u;i<u32(G_routeSegments);i++){
    let a=mix(s.tail,s.front,f32(i)/G_routeSegments);
    let b=mix(s.tail,s.front,f32(i+1u)/G_routeSegments);
    let p0=routePoint(a);let delta=routePoint(b)-p0;
    let h=clamp(dot(p-p0,delta)/max(.00001,dot(delta,delta)),0.,1.);
    let t=mix(a,b,h);let dist=length(p-p0-h*delta)-routeRadius(t);
    if(dist<best){best=dist;at=t;}
  }
  return Ribbon(best,at,routeRadius(at));
}
// PH2: 源に接した前端が腹部まで進み、受領後に後端だけが源から回収される。
fn transportField(p:vec2<f32>,s:PhaseState,aa:f32)->Volume {
  if(s.front<=.00001||s.tail>=.99999||s.fade<=0.){return emptyVolume();}
  let r=ribbonInfo(p,s);let d=r.distance;
  let gate=ss(0.,.018,s.front)*(1.-ss(.95,1.,s.tail));
  let a=coverage(d,aa)*gate*s.fade;
  let inner=coverage(d+G_edgeWidth,aa);let thickness=clamp(-d/r.radius,0.,1.);
  let crestQ=(r.v-(s.front-.06))/.18;let crest=exp(-crestQ*crestQ);
  let feedQ=(r.v-mix(0.,1.,ss(.22,.64,s.u)))/.23;let feed=exp(-feedQ*feedQ);
  let body=mix(vec3<f32>(.016,.19,.24),vec3<f32>(.028,.62,.58),pow(thickness,.65));
  let color=mix(vec3<f32>(.008,.043,.085),body,inner);
  let radiance=thickness*(.09+.30*crest+.20*feed+s.materialLift);
  let density=.90+.65*s.transit;
  return Volume(color,a*(1.-exp(-3.*density)),vec3<f32>(.46,.92,.86)*radiance,density);
}
struct Receiver {distance:f32,q:vec2<f32>,width:f32,height:f32,ny:f32,nx:f32,squeeze:f32};
fn receiverShape(p:vec2<f32>,s:PhaseState)->Receiver {
  let squeeze=1.-.88*s.shrink;
  let q=(p-vec2<f32>(G_receiverX,G_receiverY))/squeeze;
  let width=mix(G_receiveHalfWidthMin,G_receiveHalfWidthMax,s.received);
  let height=mix(G_receiveHeightMin,G_receiveHeightMax,s.received);
  let ny=clamp((G_receiveBottom-q.y)/height,0.,1.);let nx=q.x/width;
  let side=abs(q.x)-width*(.88+.12*sin(3.14159265*ny));
  let bottom=q.y-G_receiveBottom+6.*nx*nx;
  let top=G_receiveBottom-height+7.*nx*nx-q.y;
  return Receiver(max(side,max(bottom,top))*squeeze,q,width,height,ny,nx,squeeze);
}
// PH3: 中央の宝石ではなく、身体位置へ広がる厚い受領面。上端がRとともに上がる。
fn receiveField(p:vec2<f32>,s:PhaseState,aa:f32)->Volume {
  if(s.received<=.00001||s.fade<=0.){return emptyVolume();}
  let r=receiverShape(p,s);let d=r.distance;
  let a=coverage(d,aa)*ss(0.,.012,s.received)*s.fade;
  let inner=coverage(d+G_edgeWidth*r.squeeze,aa);let across=1.-clamp(abs(r.nx),0.,1.);
  let color=mix(vec3<f32>(.008,.040,.075),mix(vec3<f32>(.015,.19,.24),vec3<f32>(.035,.53,.43),.3+.7*across),inner);
  let lipQ=(r.ny-.77)/.26;let lip=exp(-lipQ*lipQ);
  let inlet=boundedLobe(p,vec2<f32>(G_routeEndX,G_routeEndY),vec2<f32>(23.,19.));
  let arrival=sin(3.14159265*clamp((s.u-P_receiveStart)/(P_receiveEnd-P_receiveStart),0.,1.));
  let radiance=inner*((.12+.27*s.received)*lip*(.5+.5*across)+.29*inlet*arrival);
  let density=.75+1.30*s.received;
  return Volume(color,a*(1.-exp(-2.8*density)),vec3<f32>(.36,.92,.70)*radiance,density);
}
// 既存Eの各キャリアから出る有限な入射光。背景を実世界の床とは呼ばない。
fn lightField(p:vec2<f32>,s:PhaseState)->vec3<f32> {
  let c=routePoint((s.front+s.tail)*.5);
  let a=boundedLobe(p,vec2<f32>(G_sourceX,G_sourceY),vec2<f32>(60.,29.))*s.source*.26;
  let b=boundedLobe(p,c,vec2<f32>(40.,38.))*s.transit*.20;
  let squeeze=1.-.88*s.shrink;
  let d=boundedLobe(p,vec2<f32>(G_receiverX,G_receiverY),vec2<f32>(58.,51.)*squeeze)*s.received*.28*squeeze*squeeze;
  return (vec3<f32>(.95,.65,.21)*a+vec3<f32>(.16,.92,.95)*b+vec3<f32>(.12,.84,.74)*d)*s.fade;
}
struct Layered {color:vec3<f32>,alpha:f32};
fn over(back:Layered,v:Volume)->Layered {
  let a=clamp(v.opacity,0.,1.);
  return Layered(back.color*(1.-a)+(v.color+v.emission)*a,back.alpha*(1.-a)+a);
}
// OBS1: source-boundな拡散。輪郭・経路・受領面はPHが作り、OBSは無くても残る。
fn observe(back:Layered,light:vec3<f32>,cov:f32)->Layered {
  let peak=max(light.r,max(light.g,light.b));
  let a=min(G_observePeak,peak*.38)*(1.-cov*.86);
  return Layered(back.color*(1.-a)+(light/max(peak,.0001))*a,back.alpha*(1.-a)+a);
}
fn srgb(c:vec3<f32>)->vec3<f32> {
  let v=clamp(c,vec3<f32>(0.),vec3<f32>(1.));
  return select(12.92*v,1.055*pow(v,vec3<f32>(1./2.4))-vec3<f32>(.055),v>vec3<f32>(.0031308));
}
struct FragmentOut {@location(0) color:vec4<f32>,@location(1) witness:u32};
@fragment fn fragmentMain(v:VertexOut)->FragmentOut {
  var composite=Layered(g.background.rgb*g.background.a,g.background.a);var token=0u;
  for(var i=0u;i<u32(g.screen.z);i++){
    let e=events[i];let p=(v.position.xy-e.placement.xy)/e.placement.z;
    if(p.x< -66.||p.x>66.||p.y< -127.||p.y>13.||e.placement.w>=1.){continue;}
    let s=phaseState(e);let aa=max(.5,.65/e.placement.z);
    let source=sourceField(p,s,aa);let transport=transportField(p,s,aa);let receive=receiveField(p,s,aa);
    let cov=max(source.opacity,max(transport.opacity,receive.opacity));let light=lightField(p,s);
    let prior=composite.color;let inspect=u32(g.options.z);
    if(g.options.y>.5&&inspect==0u){composite.color+=light*g.background.a*(vec3<f32>(.72)+.28*g.background.rgb);}
    if(g.options.x>.5){
      if(inspect==0u||inspect==1u){composite=over(composite,source);}
      if(inspect==0u||inspect==2u){composite=over(composite,transport);}
      if(inspect==0u||inspect==3u){composite=over(composite,receive);}
    }
    if(g.screen.w>.5&&inspect==0u){composite=observe(composite,light,cov);}
    // 光だけ/検査用の層分解だけでは実イベントの発音を許可しない。
    if(cov>.18&&distance(prior,composite.color)>.018&&g.options.x>.5&&inspect==0u){token=u32(e.identity.x);}
  }
  var o:FragmentOut;
  o.color=vec4<f32>(srgb(composite.color/max(composite.alpha,.00001))*composite.alpha,composite.alpha);
  o.witness=token;return o;
}
