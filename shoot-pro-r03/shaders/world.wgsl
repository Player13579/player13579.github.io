// r0.3 PH1=実銃口の解放形、PH2=有色輸送殻と通過域の緩和境界、PH3=既存面の受光。
// 圧力縁はこの表示モデルの発射履歴。露光残像・命中・実弾数・実測流体とは同一視しない。
struct Globals {
  viewport:vec4f, camera:vec4f, options:vec4f, extra:vec4f,
};
struct Shot {
  origin:vec4f, motion:vec4f, shape:vec4f, depth:vec4f,
  body:vec4f, light:vec4f, world:vec4f,
};
struct Occluder { rect:vec4f, flags:vec4f };
@group(0) @binding(0) var<uniform> g:Globals;
@group(0) @binding(1) var<storage,read> shots:array<Shot>;
@group(0) @binding(2) var sceneDepth:texture_2d<f32>;
@group(0) @binding(3) var receiverMask:texture_2d<f32>;
@group(0) @binding(4) var<storage,read> occluders:array<Occluder>;
struct VOut { @builtin(position) position:vec4f, @location(0) @interpolate(flat) id:u32 };
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32)->VOut {
  let corners=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let s=shots[ii];let margin=80.0*s.depth.w;let c=corners[vi];
  let q=vec2f(mix(-margin,s.motion.x+margin,c.x),mix(-margin,margin,c.y));
  let n=vec2f(-s.origin.w,s.origin.z);let screen=s.origin.xy+s.origin.zw*q.x+n*q.y;
  var o:VOut;o.position=vec4f(screen.x/g.viewport.x*2.0-1.0,1.0-screen.y/g.viewport.y*2.0,0,1);o.id=ii;return o;
}
fn env(t:f32,a:f32,h:f32,z:f32)->f32 {
  return smoothstep(0.0,a,t)*(1.0-smoothstep(h,z,t));
}
// H64で境界を残す解析AA。source/world寸法とは別の画素幅。
fn fill(sd:f32)->f32 {return 1.0-smoothstep(-0.65,0.65,sd);}
fn oval(p:vec2f,rx:f32,ry:f32)->f32 {
  return (length(p/vec2f(max(rx,0.01),max(ry,0.01)))-1.0)*min(rx,ry);
}
fn diamond(p:vec2f,rx:f32,ry:f32)->f32 {
  return (abs(p.x)/max(rx,0.01)+abs(p.y)/max(ry,0.01)-1.0)*min(rx,ry);
}
fn box(p:vec2f,h:vec2f)->f32 {let q=abs(p)-h;return length(max(q,vec2f(0)))+min(max(q.x,q.y),0.0);}
fn petal(p:vec2f,l:f32,w:f32,sweep:f32)->f32 {
  let t=clamp(p.x/max(l,0.01),0.0,1.0);let arc=max(sin(t*3.14159265),0.0);
  return max(max(-p.x,p.x-l),abs(p.y-sweep*sin(t*2.64))-w*pow(arc,0.72));
}
fn progress(age:f32,transit:f32,kind:u32)->f32 {
  let t=clamp(age/transit,0.0,1.0);
  let powers=array<f32,5>(1.08,0.94,1.22,1.62,0.94);
  return 1.0-pow(1.0-t,powers[kind]);
}
// 各地点の通過時刻を進行関数の逆写像から取得する。露光残像ではなく同一PH2の局所履歴。
fn passageTime(x:f32,ray:f32,transit:f32,kind:u32)->f32 {
  let powers=array<f32,5>(1.08,0.94,1.22,1.62,0.94);
  let f=clamp(x/max(ray,0.001),0.0,1.0);
  return transit*(1.0-pow(1.0-f,1.0/powers[kind]));
}
fn rootEnvelope(s:Shot)->f32 {
  let kind=u32(s.shape.z);let ends=array<f32,5>(0.96,0.88,0.94,0.87,0.78);
  let attacks=array<f32,5>(0.018,0.010,0.030,0.036,0.018);
  let holds=array<f32,5>(0.26,0.16,0.32,0.18,0.24);
  return env(s.motion.y,s.motion.z*attacks[kind],s.motion.z*holds[kind],s.motion.z*ends[kind]);
}
fn transferEnvelope(s:Shot)->f32 {
  return env(s.motion.y,s.motion.z*0.025,s.motion.z*0.79,s.motion.z);
}
// L5: 主進行端までの既通過域にのみ存在する、可変断面の緩和層。
// 分離した粒子、第二弾、hit、全射線の先行描画を作らない。
struct PassageShell { coverage:f32, interior:f32, radiance:f32 };
fn passageShell(p:vec2f,s:Shot,front:f32,plen:f32)->PassageShell {
  let kind=u32(s.shape.z);let w=s.shape.x;let life=s.motion.z;
  var r:PassageShell;r.coverage=0.0;r.interior=0.0;r.radiance=0.0;
  if(kind==4u||front<=0.01){return r;} // 二導体の既存機構を保存。
  let x0=min(s.shape.y*0.20,front*0.10);
  let x1=max(x0+0.01,front-plen*0.10);
  let u=clamp((p.x-x0)/max(x1-x0,0.01),0.0,1.0);
  let arch=max(sin(u*3.14159265),0.0);
  var center=0.0;var halfWidth=0.0;var hollowRatio=0.0;var hollowShift=0.0;
  if(kind==0u){
    // 一枚の腹→くびれ→進行体。内側の偏った窪みは膜を切断しない。
    center=w*(-0.08-0.42*arch);
    let belly=(u-0.42)/0.21;
    halfWidth=w*(0.22+0.96*exp(-belly*belly)+0.34*smoothstep(0.76,1.0,u));
    hollowRatio=0.48;hollowShift=0.30*halfWidth;
  }else if(kind==1u){
    // 片側排気から反りが反転する薄層。幅・向き・回復は単発ごとに閉じる。
    center=w*(-0.32+0.54*u-0.76*arch);
    halfWidth=w*(0.22+0.90*pow(arch,4.0)*(1.0-0.50*u)+0.16*smoothstep(0.65,0.95,u));
    hollowRatio=0.25;hollowShift=-0.35*halfWidth;
  }else if(kind==2u){
    // 広い肩と狭い喉をつなぐ厚い二境界。等幅管ではない。
    center=0.0;
    halfWidth=w*(0.35+0.48*smoothstep(0.18,0.46,u)-0.32*smoothstep(0.57,0.78,u)+0.28*smoothstep(0.88,1.0,u));
    hollowRatio=0.46;
  }else{
    // 絞り腔から広がる圧力境界。灰青の面積を確保し、白い先端を孤立させない。
    center=0.0;
    halfWidth=w*(0.26+0.20*(1.0-u)+0.53*u*u*u);
    hollowRatio=0.46;
  }
  let axial=max(x0-p.x,p.x-x1);
  let side=abs(p.y-center)-halfWidth;
  let outer=fill(max(axial,side));
  let hollow=fill(abs(p.y-center-hollowShift)-halfWidth*hollowRatio);
  let ratios=array<f32,4>(1.20,0.92,1.14,1.68);
  let history=max(s.motion.y-passageTime(p.x,s.motion.x,s.motion.w,kind),0.0);
  let relaxation=exp(-history/(life*ratios[kind]));
  let onset=smoothstep(life*0.012,life*0.10,s.motion.y);
  let behind=1.0-smoothstep(front-0.20,front+0.30,p.x);
  let strength=transferEnvelope(s)*relaxation*onset*behind;
  r.coverage=outer*(1.0-0.56*hollow)*strength;
  r.interior=fill(max(axial+0.3,side+0.65))*(1.0-0.56*hollow)*strength;
  // 帯全体をglowへ送らない。局所の外側境界だけに弱い放射、主形はcoverageが担う。
  let edge=outer*(1.0-fill(side+max(0.65,0.10*w)));
  r.radiance=edge*strength*0.07;
  return r;
}
struct Shape { coverage:f32, flesh:f32, hot:f32, gas:f32, packet:f32 };
fn intrinsic(p:vec2f,s:Shot)->Shape {
  let age=s.motion.y;let life=s.motion.z;let kind=u32(s.shape.z);let unit=s.depth.w;
  let w=s.shape.x;let ray=s.motion.x;let rootEnv=rootEnvelope(s);let movingEnv=transferEnvelope(s);
  let rootGas=env(age,life*0.018,life*0.43,life);
  let spread=1.0+0.16*(1.0-g.options.x)*smoothstep(life*0.10,life*0.80,age);
  let len=min(s.shape.y*(0.88+0.12*smoothstep(0.0,life*0.1,age)),max(ray,0.01));
  let q=vec2f(p.x,p.y/spread);
  var rootD=10000.0;var rootCut=0.0;var rootHot=0.0;
  // 主形は色替えでなく、断面・空洞・支持する圧力縁の違い。
  if(kind==0u) {
    // handgun: 二股ではなく一枚の丸い圧力袋。先端の片側だけを浅く切り欠く。
    rootD=petal(q,len,1.02*w,-0.15*w);
    rootCut=fill(oval(q-vec2f(len*0.88,-0.80*w),len*0.24,0.60*w));
    rootHot=fill(oval(q-vec2f(w*0.67,0),w*0.77,w*0.38));
    rootHot=max(rootHot,fill(petal(q,len*0.51,w*0.15,-w*0.16))*0.35);
  } else if(kind==1u) {
    rootD=petal(q,len,0.81*w,-0.58*w);
    rootCut=fill(oval(q-vec2f(len*0.68,0.42*w),0.40*len,0.68*w));
    rootHot=fill(petal(q,len*0.68,0.15*w,-0.64*w))*0.68;
    rootHot=max(rootHot,fill(oval(q-vec2f(w*0.51,-0.08*w),w*0.69,w*0.50)));
  } else if(kind==2u) {
    // assault: 角張った広肩と開いた矩形の喉。丸いhandgunと初動から別の断面。
    let upper=box(q-vec2f(len*0.28,-0.80*w),vec2f(len*0.19,0.50*w));
    let lower=box(q-vec2f(len*0.28,0.80*w),vec2f(len*0.19,0.50*w));
    let taper=diamond(q-vec2f(len*0.48,0),len*0.52,1.16*w);
    rootD=min(min(upper,lower),taper);
    rootCut=fill(box(q-vec2f(len*0.66,0),vec2f(len*0.45,0.36*w)));
    rootHot=fill(oval(q-vec2f(w*0.66,0),w*0.80,w*0.45));
    rootHot=max(rootHot,fill(box(q-vec2f(len*0.29,-0.73*w),vec2f(len*0.13,w*0.13)))*0.37);
  } else if(kind==3u) {
    rootD=diamond(q-vec2f(len*0.39,0),len*0.61,1.10*w);
    rootCut=fill(diamond(q-vec2f(len*0.47,0),len*0.41,0.55*w))*0.98;
    rootHot=fill(oval(q-vec2f(w*0.50,0),w*0.77,w*0.42));
    let inner=fill(diamond(q-vec2f(len*0.39,0),len*0.58,0.83*w));
    rootHot=max(rootHot,fill(rootD)*(1.0-inner)*0.31);
  } else {
    let a=box(q-vec2f(len*0.31,-0.85*w),vec2f(len*0.27,0.43*w));
    let b=box(q-vec2f(len*0.31,0.85*w),vec2f(len*0.27,0.43*w));
    rootD=min(a,b);
    rootCut=max(fill(box(q-vec2f(len*0.37,-0.85*w),vec2f(len*0.20,0.17*w))),fill(box(q-vec2f(len*0.37,0.85*w),vec2f(len*0.20,0.17*w))))*0.82;
    rootHot=max(fill(oval(q-vec2f(len*0.15,-0.85*w),w*0.42,w*0.30)),fill(oval(q-vec2f(len*0.15,0.85*w),w*0.42,w*0.30)));
  }
  let front=ray*progress(age,s.motion.w,kind);
  let travel=vec2f(front-p.x,p.y); // xは進行端から後方への距離。前方には形を発生しない。
  let lengths=array<f32,5>(46,32,68,110,22);
  let plen=min(lengths[kind]*unit,max(front,0.02));
  var packetD=10000.0;var packetCut=0.0;var packetHot=0.0;var wakeD=10000.0;var wakeCut=0.0;
  var wire=0.0;var wireInner=0.0;
  if(kind==0u) {
    packetD=petal(travel,plen,0.84*w,0.06*w);
    packetCut=fill(petal(travel-vec2f(plen*0.26,0),plen*0.74,0.41*w,0.08*w))*0.94;
    packetHot=fill(petal(travel,plen*0.75,0.20*w,-0.34*w));
    let t=travel-vec2f(plen*0.72,0);let wl=plen*0.68;
    wakeD=min(petal(t-vec2f(0,-0.46*w),wl,0.28*w,-0.30*w),petal(t-vec2f(0,0.46*w),wl*0.91,0.23*w,0.23*w));
  } else if(kind==1u) {
    packetD=petal(travel,plen,0.89*w,-0.43*w);
    packetCut=fill(oval(travel-vec2f(plen*0.74,0.30*w),plen*0.46,0.75*w));
    packetHot=fill(petal(travel,plen*0.65,0.14*w,-0.54*w))*0.66;
    wakeD=petal(travel-vec2f(plen*0.74,-0.25*w),plen*0.52,0.32*w,0.44*w);
  } else if(kind==2u) {
    let shaft=diamond(travel-vec2f(plen*0.43,0),plen*0.43,0.70*w);
    let shoulder=diamond(travel-vec2f(plen*0.67,0),plen*0.22,1.15*w);
    packetD=min(shaft,shoulder);
    packetCut=fill(diamond(travel-vec2f(plen*0.90,0),plen*0.18,0.61*w));
    packetHot=fill(diamond(travel-vec2f(plen*0.28,0),plen*0.28,0.20*w));
    let t=travel-vec2f(plen*0.80,0);
    wakeD=min(petal(t-vec2f(0,-0.67*w),plen*0.67,0.32*w,-0.38*w),petal(t-vec2f(0,0.67*w),plen*0.60,0.32*w,0.38*w));
  } else if(kind==3u) {
    packetD=diamond(travel-vec2f(plen*0.5,0),plen*0.5,0.92*w);
    packetCut=fill(diamond(travel-vec2f(plen*0.64,0),plen*0.34,0.43*w))*0.99;
    packetHot=fill(diamond(travel-vec2f(plen*0.27,0),plen*0.15,0.11*w))*0.34;
    // 先端全面を白くせず、肩の内側に離散しない短い発光面を残す。
    packetHot=max(packetHot,fill(diamond(travel-vec2f(plen*0.49,-0.47*w),plen*0.18,0.10*w))*0.14);
    wakeD=diamond(travel-vec2f(plen*1.0,0),plen*0.52,1.08*w);
    wakeCut=fill(diamond(travel-vec2f(plen*1.0,0),plen*0.49,0.79*w));
  } else {
    // 太い端子頭+後部カラー。導体だけを主形にしない。接触火花・長い放電は無い。
    let top=travel-vec2f(plen*0.41,-1.05*w);let bottom=travel-vec2f(plen*0.41,1.05*w);
    let a=min(diamond(top,plen*0.41,0.62*w),box(top-vec2f(plen*0.22,0),vec2f(plen*0.20,0.55*w)));
    let b=min(diamond(bottom,plen*0.41,0.62*w),box(bottom-vec2f(plen*0.22,0),vec2f(plen*0.20,0.55*w)));
    packetD=min(a,b);
    packetHot=max(fill(diamond(top+vec2f(plen*0.13,0),plen*0.23,0.22*w)),fill(diamond(bottom+vec2f(plen*0.13,0),plen*0.23,0.22*w)))*0.38;
    let u=clamp(p.x/max(front,1.0),0.0,1.0);
    let n=vec2f(-s.origin.w,s.origin.z);let gravityScreen=vec2f(-g.camera.w,g.camera.z);
    let sag=dot(n,gravityScreen)*1.05*w*sin(u*3.14159265)*smoothstep(0.0,life*0.48,age);
    let d=min(abs(p.y+mix(0.85,1.05,u)*w-sag),abs(p.y-mix(0.85,1.05,u)*w-sag));
    let bounds=smoothstep(0.0,unit*2.0,p.x)*(1.0-smoothstep(max(0.0,front-plen*0.52),max(front,0.01),p.x));
    wire=fill(d-max(0.70*unit,0.70))*bounds;
    wireInner=fill(d-max(0.33*unit,0.33))*bounds;
  }
  let rootShape=fill(rootD)*(1.0-rootCut);
  let packetShape=fill(packetD)*(1.0-packetCut);
  let wake=fill(wakeD)*(1.0-wakeCut)*0.70;
  // 先に原因が通過した範囲だけに圧力縁。主進行端の先・muzzleの後方・有限境界を越えない。
  let sourceBound=smoothstep(-0.2,0.45,p.x)*(1.0-smoothstep(ray-0.25,ray+0.25,p.x));
  let travelBound=(1.0-smoothstep(front-0.20,front+0.30,p.x));
  let wakeAmplitude=movingEnv*smoothstep(life*0.01,life*0.12,age)*travelBound;
  let moving=max(packetShape*travelBound,wake*travelBound);
  let path=passageShell(p,s,front,plen);
  var r:Shape;
  r.coverage=max(rootShape*rootGas,max(max(moving*movingEnv,wire*movingEnv),path.coverage))*sourceBound;
  r.flesh=max(fill(rootD+0.9)*(1.0-rootCut)*rootGas,max(fill(packetD+0.8)*(1.0-packetCut)*movingEnv*travelBound,max(max(fill(wakeD+0.60)*(1.0-wakeCut)*wakeAmplitude*0.6,wireInner*movingEnv),path.interior)))*sourceBound;
  r.hot=(min(rootHot,rootShape)*rootEnv+min(packetHot,packetShape)*movingEnv*travelBound)*sourceBound;
  if(kind==4u){r.hot=(rootHot*rootEnv*(1.0-rootCut*0.4)+packetHot*movingEnv*travelBound)*sourceBound;}
  r.gas=(rootShape*rootEnv*0.6+wake*wakeAmplitude*0.34+path.radiance)*sourceBound;
  r.packet=packetShape*movingEnv*travelBound*sourceBound;
  return r;
}
fn worldFromScreen(p:vec2f)->vec2f {
  let v=vec2f((p.x-g.viewport.x*0.5)/g.viewport.z,-(p.y-g.viewport.y*0.5)/g.viewport.z);
  return g.camera.xy+vec2f(g.camera.z*v.x-g.camera.w*v.y,g.camera.w*v.x+g.camera.z*v.y);
}
fn segmentBlocked(a:vec2f,b:vec2f)->bool {
  for(var i=0u;i<u32(g.options.y);i++) {
    let r=occluders[i].rect;let d=b-a;var lo=0.0001;var hi=0.9999;var ok=true;
    for(var axis=0u;axis<2u;axis++) {
      if(abs(d[axis])<0.000001){if(a[axis]<r[axis]||a[axis]>r[axis+2u]){ok=false;}}
      else{let u=(r[axis]-a[axis])/d[axis];let v=(r[axis+2u]-a[axis])/d[axis];lo=max(lo,min(u,v));hi=min(hi,max(u,v));}
    }
    if(ok&&lo<=hi&&occluders[i].flags.x>0.5){return true;}
  }return false;
}
fn pointLight(p:vec2f,source:vec2f,power:f32,radius:f32)->f32 {
  let distance=length(p-source)/radius;
  if(distance>=1.0||power<=0.00001||segmentBlocked(source,p)){return 0.0;}
  let cut=1.0-distance*distance;return power*cut*cut/(1.0+5.0*distance*distance);
}
struct FOut { @location(0) body:vec4f, @location(1) emission:vec4f, @location(2) illumination:vec4f };
@fragment fn fs(vIn:VOut)->FOut {
  let s=shots[vIn.id];let p=vIn.position.xy;let n=vec2f(-s.origin.w,s.origin.z);
  let q=p-s.origin.xy;let local=vec2f(dot(q,s.origin.zw),dot(q,n));let sh=intrinsic(local,s);let xy=vec2i(p);
  let z=mix(s.depth.x,s.depth.y,clamp(local.x/max(s.motion.x,1.0),0.0,1.0));
  let visible=select(0.0,1.0,z<=textureLoad(sceneDepth,xy,0).x+0.00001);
  let alpha=clamp(sh.coverage*0.97,0.0,0.97)*visible;
  let interior=clamp(sh.flesh/max(sh.coverage,0.00001),0.0,1.0);
  // 明背景でも残る有色暗縁と、発光源の内側を分離。適応的全画面フィルターは使わない。
  let edgeFloor=select(0.28,0.18,u32(s.shape.z)==4u);
  let bodyColor=s.body.xyz*(edgeFloor+interior*(1.0-edgeFloor));
  let emissive=(sh.hot*s.body.w+sh.gas*0.25)*s.light.xyz*visible;
  let worldP=worldFromScreen(p);let kind=u32(s.shape.z);
  let t=progress(s.motion.y,s.motion.w,kind);
  let lengths=array<f32,5>(46,32,68,110,22);
  let behind=min(lengths[kind]*s.light.w*0.20,(s.motion.x/s.depth.z)*t*0.20);
  let front=s.world.xy+s.world.zw*((s.motion.x/s.depth.z)*t-behind);
  let root=s.world.xy;let worldUnit=s.light.w;
  let radii=array<f32,5>(49,28,57,66,36);
  // 移動源の放射面積を小さくしたSMG/sniperでは、受光の積分量と有限範囲も連動。
  // 高輝度ピークを全体暗化せず、主形外へ巨大な白い照射盤を作らない。
  let emittingAreas=array<f32,5>(0.72,0.30,0.75,0.22,0.88);
  let movingRadii=array<f32,5>(23.0,17.0,27.0,29.0,30.0);
  let power=pointLight(worldP,root,rootEnvelope(s)*s.body.w*2.20,radii[kind]*worldUnit)
    +pointLight(worldP,front,transferEnvelope(s)*s.body.w*emittingAreas[kind],movingRadii[kind]*worldUnit);
  let receive=textureLoad(receiverMask,xy,0).x;
  var r:FOut;r.body=vec4f(bodyColor*alpha,alpha);
  // 奥の放射も手前の有色coverageで隠す。受光の加算とは別blend。
  r.emission=vec4f(emissive,alpha);
  r.illumination=vec4f(s.light.xyz*power*receive*g.options.w,0);return r;
}
