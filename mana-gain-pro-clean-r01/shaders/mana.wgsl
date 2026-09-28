// 手続き的形状のみ。外部画像・ノイズ画像・sprite・Canvas2Dを使用しない。
struct Frame { size: vec2<f32>, duration: f32, background: f32 };
struct Effect {
  placement: vec4<f32>, // pixel足元xy, px/world-unit, owner-effective seconds
  receiver: vec4<f32>,  // local center xy, half size xy
  options: vec4<f32>,   // reducedMotion, gain, reserved, reserved
};
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> effects: array<Effect>;
struct VOut {
  @builtin(position) position: vec4<f32>,
  @location(0) local: vec2<f32>,
  @location(1) @interpolate(flat) index: u32,
};
@vertex fn vs(@builtin(vertex_index) vi:u32, @builtin(instance_index) ii:u32) -> VOut {
  let corners = array<vec2<f32>,6>(vec2(-66.,-127.),vec2(66.,-127.),vec2(-66.,13.),vec2(-66.,13.),vec2(66.,-127.),vec2(66.,13.));
  let p = corners[vi]; let e = effects[ii]; let pixel = e.placement.xy + p * e.placement.z;
  var o: VOut;
  o.position = vec4(pixel.x/frame.size.x*2.-1., 1.-pixel.y/frame.size.y*2.,0.,1.);
  o.local = p; o.index = ii; return o;
}
fn ease(a:f32,b:f32,x:f32)->f32 { let t=clamp((x-a)/(b-a),0.,1.); return t*t*(3.-2.*t); }
fn edge(d:f32,aa:f32)->f32 { return 1.-smoothstep(-aa,aa,d); }
fn ellipse(p:vec2<f32>,r:vec2<f32>)->f32 { return (length(p/r)-1.)*min(r.x,r.y); }
fn diamond(p:vec2<f32>,r:vec2<f32>)->f32 { return (abs(p.x)/r.x + abs(p.y)/r.y - 1.)*min(r.x,r.y)*.71; }
struct Field {
  source:f32, transport:f32, receiving:f32, core:f32,
  sourceLight:f32, bodyLight:f32, face:f32, fill:f32,
  sourceBloom:f32, bodyBloom:f32,
};
// PH1: 足元の一つの源と、それから離脱せず進展する厚い有色の輸送本体。
// PH2: 実受け手に固定された受領域。到着以後だけ内部占有量が増す。
fn sampleField(p:vec2<f32>,t:f32,e:Effect,aa:f32)->Field {
  var f:Field;
  let live = 1.-ease(.93,1.,t);
  let launch = .35+.65*ease(0.,.10,t);
  // 質量ではなく、E内の規格化した表示量。source+inflight+deposit=1（消失前）。
  let released=ease(.13,.51,t);
  let deposited=ease(.45,.73,t);
  let inTransit=max(0.,released-deposited);
  let sourceEnergy = launch*(1.-released);
  let srcP=p-vec2(0.,-8.);
  let srcR=vec2(15.,7.)*(.76+.24*sourceEnergy);
  f.source=edge(ellipse(srcP,srcR),aa)*sourceEnergy;
  let prog=ease(.13,.51,t);
  let lengthY=mix(3.,55.,prog);
  let q=clamp((-p.y-8.)/max(lengthY,1.),0.,1.);
  let bend=mix(8.,2.,e.options.x)*sin(q*3.14159265)*sin(prog*2.3);
  let halfWidth=(6.+7.*sin(q*3.14159265))*(.7+.3*ease(.13,.3,t));
  let side=abs(p.x-bend)-halfWidth;
  let top=(-8.-lengthY)-p.y;
  let bottom=p.y+8.;
  let tailClear=ease(.51,.73,t);
  let tailBoundary=-8.-lengthY*tailClear;
  let tubeD=max(side,max(top,max(bottom,p.y-tailBoundary)));
  let transportLife=ease(.12,.20,t)*clamp(inTransit*3.,0.,1.);
  f.transport=edge(tubeD,aa)*transportLife;
  // 先端は線でなく、長い菱状断面を持つ。一つの輸送体に連続。
  let head=vec2(mix(0.,bend,.6),-8.-lengthY);
  let headD=diamond(p-head,vec2(13.,15.));
  f.transport=max(f.transport,edge(headD,aa)*transportLife);
  let collapse=1.-ease(.83,1.,t);
  let growth=.27+.73*deposited;
  let rr=e.receiver.zw*growth*max(collapse,.025);
  let rp=p-e.receiver.xy;
  let recD=diamond(rp,rr);
  let recAlpha=ease(.445,.50,t)*live;
  f.receiving=edge(recD,aa)*recAlpha;
  // 下から満ちる色面。層数や粒子数ではなく蓄積体の体積増加を読ませる。
  let fillLine=mix(rr.y,-rr.y,deposited);
  f.fill=ease(fillLine-2.,fillLine+2.,rp.y);
  f.face=clamp(.55+(rp.x/ max(rr.x,1.))*.32-(rp.y/max(rr.y,1.))*.22,0.,1.);
  let central=diamond(rp-vec2(-2.,-1.),rr*vec2(.34,.68));
  let srcCore=ellipse(srcP-vec2(-2.,-1.5),srcR*vec2(.45,.38));
  f.core=max(edge(srcCore,aa)*sourceEnergy,edge(central,aa)*recAlpha*(.15+.65*deposited));
  // PH3: 個別sourceの位置・供給に束縛した有限範囲の放射／散乱分布。
  let sourceDistance=length(srcP/vec2(33.,18.));
  let bodyDistance=length(rp/vec2(41.,44.));
  f.sourceLight=pow(max(0.,1.-sourceDistance),2.)*sourceEnergy;
  // OBS1: 発光形状から約1 H64 pixelだけ広がる解析的PSF近似。
  // 本体、面積coverage、広域放射場とは別の低強度成分。レンズghostではない。
  let sd=max(0.,ellipse(srcP,srcR));
  let rd=max(0.,recD);
  f.sourceBloom=exp(-sd*sd/(2.6*2.6))*sourceEnergy*.045;
  f.bodyBloom=exp(-rd*rd/(2.4*2.4))*recAlpha*deposited*.055;
  f.bodyLight=pow(max(0.,1.-bodyDistance),2.)*deposited*collapse*recAlpha;
  return f;
}
@fragment fn body(i:VOut)->@location(0) vec4<f32> {
  let e=effects[i.index]; let t=e.placement.w/frame.duration;
  let aa=max(.6,length(fwidth(i.local))*.52);
  let f=sampleField(i.local,t,e,aa);
  if (t<0. || t>=1.) { discard; }
  let coverage=max(f.source,max(f.transport,f.receiving));
  if (coverage<.005) { discard; }
  // 暗背景の有色明部＋明背景の濃い外側断面。発光と不透明度を別に扱う。
  let ink=vec3(.012,.043,.10);
  let teal=vec3(.018,.48,.53);
  let cyan=vec3(.13,.90,.89);
  let warm=vec3(1.,.61,.18);
  let pearl=vec3(1.,.94,.70);
  var color=teal;
  let center=1.-ease(2.,9.,abs(i.local.x-4.));
  color=mix(ink,cyan,clamp(.20+.72*center,0.,1.));
  if (f.source>f.transport && f.source>f.receiving) {
    color=mix(ink,warm,.4+.6*(1.-ease(1.,12.,abs(i.local.x))));
  }
  if (f.receiving>f.transport) {
    let r=i.local-e.receiver.xy;
    color=mix(ink,mix(teal,cyan,f.face),.3+.7*f.fill);
    let seam=ease(-1.,1.,r.x+r.y*.26);
    color=mix(color,color*.42,seam*.42);
    color=mix(color,warm,f.fill*.17);
  }
  color=mix(color,pearl,clamp(f.core*.90,0.,.93));
  let a=clamp(coverage*(.96+f.receiving*.04)*e.options.y,0.,1.);
  return vec4(color*a,a); // premultiplied-linear; source-over
}
@fragment fn radiance(i:VOut)->@location(0) vec4<f32> {
  let e=effects[i.index]; let t=e.placement.w/frame.duration;
  let aa=max(.6,length(fwidth(i.local))*.52);
  let f=sampleField(i.local,t,e,aa);
  if (t<0. || t>=1.) { discard; }
  // 異なる二つの時空間支持域。単一の全面glowではない。輸送源の放射強度へ従属。
  let illumination=vec3(1.,.43,.08)*f.sourceLight*.36 + vec3(.055,.72,.65)*f.bodyLight*.42;
  let sensorSpread=vec3(1.,.79,.39)*f.sourceBloom + vec3(.28,.91,.82)*f.bodyBloom;
  let color=(illumination+sensorSpread)*e.options.y;
  if (max(color.x,max(color.y,color.z))<.0003) { discard; }
  return vec4(color,0.); // light-only additive。coverageはbody passの別契約。
}
struct BGOut { @builtin(position) position:vec4<f32>, @location(0) uv:vec2<f32> };
@vertex fn bgVS(@builtin(vertex_index) i:u32)->BGOut {
  let q=array<vec2<f32>,3>(vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
  var o:BGOut; o.position=vec4(q[i],0.,1.); o.uv=q[i]*.5+.5; return o;
}
@fragment fn bgFS(i:BGOut)->@location(0) vec4<f32> {
  // 検査用の表示背景。床、人物、ゲーム地形とは主張しない。
  var c=vec3(.012,.019,.034);
  if (frame.background>.5) { c=vec3(.78,.81,.76); }
  return vec4(c,1.);
}
