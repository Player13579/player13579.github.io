// 新規手続き形状のみ。画像texture、sampler、Canvas2Dを使わない。
// PH1: 有限の宣言場と放射。PH2: actor受光。OBS1/2: 入力束縛の解析PSF/表示変換。
struct Frame { view:vec4f, camera:vec4f, settings:vec4f, fixture:vec4f };
struct Effect { pos:vec4f, phase:vec4f, response:vec4f, reserved:vec4f };
struct Field { coverage:f32, body:vec3f, emission:vec3f, observation:vec3f };
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var<storage,read> effects:array<Effect>;
@vertex fn vs(@builtin(vertex_index) index:u32)->@builtin(position) vec4f {
  var vertices=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(vertices[index],0,1);
}
fn sq(x:f32)->f32 {return x*x;}
fn seg(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),0.000001),0.0,1.0));
}
fn cover(d:f32,w:f32,aa:f32)->f32 {return 1-smoothstep(w-aa,w+aa,d);}
fn gauss(p:vec2f,w:vec2f)->f32 {let q=p/w;return exp(-dot(q,q));}
fn aces(c:vec3f)->vec3f {return clamp(c*(2.51*c+vec3f(.03))/(c*(2.43*c+vec3f(.59))+vec3f(.14)),vec3f(0),vec3f(1));}
fn toSRGB(c:vec3f)->vec3f {return select(1.055*pow(max(c,vec3f(0)),vec3f(1.0/2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}
fn sourcePoint(e:Effect,i:u32)->vec2f {
  let opening=e.phase.z;
  if(e.pos.w<.5) {
    if(i==0u){return vec2f(-(.08+.20*opening),-.38);}
    return vec2f(.08+.20*opening,.36);
  }
  if(i==0u){return vec2f(-(.28+.25*sq(-.10/.66)-.15*opening),-.10);}
  return vec2f(.28+.25*sq(.19/.58)-.15*opening,.19);
}
fn sourcePower(e:Effect,i:u32)->f32 {
  if(e.pos.w<.5){return e.phase.y*(select(.55,.40,i==1u)+select(3.9,2.8,i==1u)*e.phase.w);}
  return e.phase.y*(select(.15,.10,i==1u)+select(2.9,1.9,i==1u)*e.phase.w);
}
fn sourceColor(e:Effect)->vec3f {return select(vec3f(1,.78,.34),vec3f(.57,.23,1),e.pos.w>.5);}
// PH1 — 合理オペ: 開いた通路を残す角形の解除場。射出・MP粒子ではない。
fn rational(p:vec2f,e:Effect,aa:f32)->Field {
  let opening=e.phase.z;let peak=e.phase.w;let gate=e.phase.y;
  var d=100.0;var teeth=100.0;
  for(var i=0u;i<2u;i++) {
    let side=select(-1.0,1.0,i==1u);let off=.20*opening;
    let a=vec2f(side*(.08+off),-.38);let b=vec2f(side*(.41+off),-.38);
    let c=vec2f(side*(.58+off),-.20);let h=vec2f(side*(.58+off),.21);
    let j=vec2f(side*(.43+off),.36);let k=vec2f(side*(.08+off),.36);
    d=min(d,min(min(seg(p,a,b),seg(p,b,c)),min(min(seg(p,c,h),seg(p,h,j)),seg(p,j,k))));
    for(var n=0u;n<3u;n++){
      let y=-.12+f32(n)*.14;
      teeth=min(teeth,seg(p,vec2f(side*(.54+off),y),vec2f(side*(.61+off),y)));
    }
  }
  let shell=cover(d,.043,aa)*gate;
  let rib=cover(teeth,.006,aa)*gate;
  let bevel=exp(-sq((d-.027)/.013));
  let seam=cover(seg(p,vec2f(-.08,-.38),vec2f(.08,-.38)),.019,aa)*e.response.z*gate;
  let colored=cover(d,.019,aa)*gate;
  var result:Field;
  result.coverage=clamp(shell*.91+seam*.9,0.0,.96);
  result.body=mix(vec3f(.22,.053,.008),vec3f(.82,.31,.041),bevel)*e.response.x;
  result.emission=vec3f(1,.54,.11)*colored*.65+vec3f(1,.90,.50)*rib*.4+vec3f(1,.85,.38)*seam*(1.3+peak*3);
  result.observation=vec3f(0);
  for(var i=0u;i<2u;i++){
    let delta=p-sourcePoint(e,i);let power=sourcePower(e,i);
    let core=gauss(delta,vec2f(.033,.019));
    result.emission+=vec3f(1,.98,.86)*core*power*3.0;
    // OBS1: 既存の継ぎ目sourceを横長の光学PSFで拡散。輪郭生成には使わない。
    result.observation+=vec3f(1,.79,.37)*power*(gauss(delta,vec2f(.125,.025))*.34+gauss(delta,vec2f(.061,.073))*.12);
  }
  result.observation+=vec3f(1,.49,.12)*exp(-sq(d/.092))*gate*.045;
  return result;
}
// PH1 — 忍殺準備: 二つの非閉鎖曲面が内側へ張る。刃・ヒット星・標的線はない。
fn ninjutsu(p:vec2f,e:Effect,aa:f32)->Field {
  let tension=e.phase.z;let gate=e.phase.y;let peak=e.phase.w;
  var shell=0.0;var filament=0.0;var inner=0.0;
  for(var i=0u;i<2u;i++){
    let side=select(-1.0,1.0,i==1u);let h=select(.66,.58,i==1u);
    let yn=p.y/h;let terminal=1-smoothstep(.87,1.0,abs(yn));
    let x=.28+.25*yn*yn-.15*tension;
    let signedDistance=(p.x*side-x)/sqrt(1+sq(.5*p.y/(h*h)));
    let width=.016+.052*max(0.0,1-yn*yn);
    let material=cover(abs(signedDistance),width,aa)*terminal;
    shell=max(shell,material);
    filament=max(filament,cover(abs(signedDistance+width*.64),.0085,aa)*terminal);
    inner=max(inner,exp(-sq((signedDistance-width*.22)/.029))*terminal);
  }
  var result:Field;
  result.coverage=shell*gate*.87;
  result.body=mix(vec3f(.012,.009,.055),vec3f(.19,.055,.49),inner)*e.response.x;
  result.emission=(vec3f(.33,.10,.98)*filament*(.34+.86*tension)+vec3f(.08,.045,.32)*inner*.24)*gate;
  result.observation=vec3f(0);
  for(var i=0u;i<2u;i++){
    let delta=p-sourcePoint(e,i);let power=sourcePower(e,i);
    result.emission+=vec3f(.96,.88,1)*gauss(delta,vec2f(.016,.049))*power*2.7;
    // OBS1: 張力稜線sourceの縦方向PSF。合理オペの横方向PSFとは別。
    result.observation+=vec3f(.51,.23,1)*power*(gauss(delta,vec2f(.047,.153))*.16+gauss(delta,vec2f(.093,.052))*.052);
  }
  return result;
}
fn receiverLight(point:vec2f,normal:vec3f,e:Effect)->vec3f {
  var result=vec3f(0);
  for(var i=0u;i<2u;i++){
    let s=e.pos.xy+sourcePoint(e,i)*e.pos.z;
    let ray=vec3f(s-point,e.pos.z*.20);let d2=dot(ray,ray);
    let angle=max(0.0,dot(normal,normalize(ray)));
    result+=sourceColor(e)*sourcePower(e,i)*angle*sq(e.pos.z*.12)/max(d2,.0001);
  }
  return result;
}

// PH2 rough dielectric. F0とroughnessは検査体の設計仮定であり実測値ではない。
fn receiverGloss(point:vec2f,normal:vec3f,e:Effect)->vec3f {
  let V=vec3f(0,0,1);let nv=max(dot(normal,V),.001);
  let rough=clamp(.78+.08*normal.y,.65,.9);let a2=pow(rough,4);let k=sq(rough+1)/8;
  var result=vec3f(0);
  for(var i=0u;i<2u;i++){
    let source=e.pos.xy+sourcePoint(e,i)*e.pos.z;
    let ray=vec3f(source-point,e.pos.z*.20);let d2=dot(ray,ray);let L=normalize(ray);let H=normalize(L+V);
    let nl=max(dot(normal,L),0.0);let nh=max(dot(normal,H),0.0);let vh=max(dot(V,H),0.0);
    let fresnel=.04+.96*pow(clamp(1-vh,0.0,1.0),5);let distribution=a2/(3.14159265*sq(nh*nh*(a2-1)+1));
    let geometry=(nv/(nv*(1-k)+k))*(nl/(nl*(1-k)+k));
    let brdf=distribution*fresnel*geometry/max(4*nv*nl,.0001);
    result+=sourceColor(e)*sourcePower(e,i)*sq(e.pos.z*.12)/d2*nl*brdf;
  }
  return result;
}

fn fixtureDistance(p:vec2f)->f32 {
  let q=abs(p)-vec2f(8,27);return length(max(q,vec2f(0)))+min(max(q.x,q.y),0.0)-5;
}
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f {
  let scale=frame.view.z*frame.view.w;
  let world=(pixel.xy-frame.view.xy*.5)/scale+frame.camera.xy;
  let aaWorld=1.0/scale;
  // 比較背景はdisplay fixture。床、煙、遠景など世界内物体を追加しない。
  let bright=frame.camera.z;
  var color=mix(vec3f(.013,.019,.029),vec3f(.72,.74,.78),bright);
  let grid=vec2f(abs(fract(world.x/32.0+.5)-.5),abs(fract(world.y/32.0+.5)-.5));
  let guide=1-smoothstep(.003,.018,min(grid.x,grid.y));
  color=mix(color,color*select(1.16,.97,bright>.5),guide*.32);
  var observation=vec3f(0);var lighting=vec3f(0);var gloss=vec3f(0);
  let count=u32(frame.settings.x);
  for(var i=0u;i<count;i++){
    let e=effects[i];let p=(world-e.pos.xy)/e.pos.z;
    let finiteWindow=1-smoothstep(.90,.985,length(p));
    var field:Field;
    if(e.pos.w<.5){field=rational(p,e,aaWorld/e.pos.z);}else{field=ninjutsu(p,e,aaWorld/e.pos.z);}
    let a=field.coverage*finiteWindow;
    color=color*(1-a)+field.body*a+field.emission*finiteWindow;
    observation+=field.observation*finiteWindow;
  }
  // 非人物のH64測定体。effect実装へのsprite/人体/衣装追加ではない。
  if(frame.camera.w>.5){
    let p=(world-frame.fixture.xy)*64.0/frame.fixture.z;
    let actor=1-smoothstep(-aaWorld,aaWorld,fixtureDistance(p));
    let normal=normalize(vec3f(p.x/14.0,p.y/130.0,.75));
    for(var i=0u;i<count;i++){lighting+=receiverLight(world,normal,effects[i]);gloss+=receiverGloss(world,normal,effects[i]);}
    let material=vec3f(.10,.12,.15)*(1+.22*normal.x-.09*normal.y);
    let receive=material*(vec3f(.8)+lighting*.96*2.5*frame.settings.w)+gloss*frame.settings.w;
    color=mix(color,receive,actor);
  }
  // OBSのsourceが測定体に隠れる場合はPSFも弱める。背景全体を白く持ち上げない。
  if(frame.camera.w>.5){
    let p=(world-frame.fixture.xy)*64.0/frame.fixture.z;
    observation*=mix(1.0,.18,1-smoothstep(0.0,2*aaWorld,fixtureDistance(p)));
  }
  color+=observation*frame.settings.z;
  return vec4f(toSRGB(aces(color*frame.settings.y)),1);
}
