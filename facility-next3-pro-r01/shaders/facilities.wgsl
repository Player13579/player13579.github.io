// PH1=既存受光面、PH2=成功の宣言場。OBS1は下記観測関数のみで追加する。
struct Frame { size:vec2<f32>, camera:vec2<f32>, scale:f32, unused0:f32, unused1:f32, unused2:f32 };
struct Event { origin:vec2<f32>, age:f32, kind:f32, radius:f32, reduced:f32, strength:f32, seed:f32 };
struct VertexOut { @builtin(position) position:vec4<f32>, @location(0) local:vec2<f32>, @location(1) @interpolate(flat) index:u32 };
struct Field { color:vec3<f32>, coverage:f32, emission:f32 };
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var<storage,read> events:array<Event>;
@group(0) @binding(2) var masks:texture_2d_array<f32>;
@group(0) @binding(3) var maskSampler:sampler;

@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32)->VertexOut {
  let positions=array<vec2<f32>,6>(vec2(-1.0,-1.0),vec2(1.0,-1.0),vec2(-1.0,1.0),vec2(-1.0,1.0),vec2(1.0,-1.0),vec2(1.0,1.0));
  let p=positions[vi]; let e=events[ii];
  let screen=(e.origin-frame.camera+e.radius*p)*frame.scale+frame.size*.5;
  var vout:VertexOut;vout.position=vec4(screen.x/frame.size.x*2.0-1.0,1.0-screen.y/frame.size.y*2.0,0.0,1.0);vout.local=p;vout.index=ii;return vout;
}
fn seg(p:vec2<f32>,a:vec2<f32>,b:vec2<f32>)->f32 {
  let ab=b-a;return length(p-a-ab*clamp(dot(p-a,ab)/max(dot(ab,ab),.000001),0.0,1.0));
}
fn sq(x:f32)->f32 {return x*x;}
fn stroke(d:f32,width:f32,aa:f32)->f32 {return 1.0-smoothstep(width,width+aa,d);}
fn cross2(a:vec2<f32>,b:vec2<f32>)->f32 {return a.x*b.y-a.y*b.x;}
fn quadDistance(p:vec2<f32>,a:vec2<f32>,b:vec2<f32>,c:vec2<f32>,d:vec2<f32>)->f32 {
  return min(min(seg(p,a,b),seg(p,b,c)),min(seg(p,c,d),seg(p,d,a)));
}
fn insideQuad(p:vec2<f32>,a:vec2<f32>,b:vec2<f32>,c:vec2<f32>,d:vec2<f32>)->f32 {
  let signs=vec4(cross2(b-a,p-a),cross2(c-b,p-b),cross2(d-c,p-c),cross2(a-d,p-d));
  return select(0.0,1.0,all(signs>=vec4(0.0))||all(signs<=vec4(0.0)));
}
fn lifecycle(t:f32,reduced:f32)->f32 {
  let attack=mix(.08,.24,reduced);return smoothstep(0.0,attack,t)*(1.0-smoothstep(1.58,2.2,t));
}
// 焦点契約: 4つの開放角。装飾粒子・リング・汎用beamへ置き換えない。
fn focusField(p:vec2<f32>,t:f32,reduced:f32,aa:f32)->Field {
  let phase=mix(t,.82,reduced);let close=smoothstep(.08,.56,phase);
  let halfExtent=vec2(mix(.78,.38,close),mix(.37,.23,close));let q=p-vec2(0.0,-.23);
  let corner=abs(q)-halfExtent;
  let d=min(seg(corner,vec2(-.19,0.0),vec2(0.0,0.0)),seg(corner,vec2(0.0,-.14),vec2(0.0,0.0)));
  let frameLine=stroke(d,.011,aa);
  let latching=smoothstep(.38,.72,phase);
  let seam=stroke(seg(q,vec2(-.28,0.0),vec2(.28,0.0)),.007,aa)*latching;
  let taper=clamp(1.0-abs(q.x)/.31,0.0,1.0);
  let focus=exp(-sq(q.y/.045))*taper*latching*.30;
  let sides=stroke(abs(abs(q.x)-.38),.028,aa)*(1.0-smoothstep(.19,.24,abs(q.y)))*.12;
  let density=max(frameLine,max(seam,focus));let peak=.66+.34*exp(-sq((t-.72)/.24));
  let tint=mix(vec3(.80,.25,.035),vec3(1.30,.93,.45),clamp(seam*.75+focus,0.0,1.0));
  return Field(tint,clamp(density*.91+sides,0.0,.97),peak*(frameLine*.95+seam*1.25+focus));
}
// 視差架構: 個別の展開位相と斜交深度を持つ三面。色違い同形の重ねではない。
fn projectorField(p:vec2<f32>,t:f32,reduced:f32,aa:f32)->Field {
  let phase=mix(t,.96,reduced);var color=vec3(0.0);var coverage=0.0;var emission=0.0;
  for(var j=0u;j<3u;j=j+1u){
    let z=f32(j);let unfold=smoothstep(.06+.10*z,.61+.10*z,phase);
    let w=(.60-.115*z)*(.10+.90*unfold);let h=.105+.075*unfold;
    let center=vec2(.032*z,-.11-.245*z*unfold);
    let a=center+vec2(-w,-.005);let b=center+vec2(.07,-h);let c=center+vec2(w,.035);let d=center+vec2(-.07,h);
    let border=stroke(quadDistance(p,a,b,c,d),.0085,aa);
    let face=insideQuad(p,a,b,c,d)*(.075+.015*z);
    let brace=stroke(seg(p,a,c),.0045,aa)*(.20+.25*unfold);
    let lift=stroke(seg(p,d,vec2(.0,.23)),.006,aa)*.26;
    let tint=mix(vec3(.035,.84,.60),vec3(.40,.20,1.05),z*.45);
    let node=exp(-sq(length(p-b)/.027))*.7;
    let cvr=clamp(border*.84+face+brace*.33+lift*.22+node*.22,0.0,.93)*unfold;
    color=color*(1.0-cvr)+(tint+vec3(.23,.32,.20)*node)*cvr;
    coverage=coverage+(1.0-coverage)*cvr;
    emission=emission+unfold*(border*.67+brace*.18+node*.35);
  }
  let base=stroke(seg(p,vec2(-.19,.23),vec2(.19,.23)),.014,aa)*smoothstep(0.0,.18,phase);
  color=color+vec3(.18,1.0,.75)*base*.4;coverage=clamp(coverage+base*.55,0.0,.98);
  let crest=.62+.26*exp(-sq((t-1.06)/.40));
  return Field(color/max(coverage,.0001),coverage,(emission+base*.45)*crest);
}
// 一滴の充填: 非液体の単一の宣言場。manaを移送するゲームロジックを持たない。
fn lampField(p:vec2<f32>,t:f32,reduced:f32,aa:f32)->Field {
  let phase=mix(t,.80,reduced);let lift=smoothstep(.08,.70,phase);let seal=smoothstep(.58,.95,phase);
  let center=vec2(0.0,mix(-.02,-.56,lift));let q=p-center;
  let height=mix(.22,.105,seal);let width=mix(.145,.075,seal);
  let taper=.72+.28*clamp(q.y/height+.45,0.0,1.0);
  let sdf=(length(vec2(q.x/(width*taper),q.y/height))-1.0)*min(width,height);
  let skin=stroke(abs(sdf),.013,aa);let body=1.0-smoothstep(-.022,.005,sdf);
  let core=exp(-sq(length(vec2(q.x,q.y*.65))/.048))*(.28+.70*seal);
  let color=mix(vec3(.38,.03,.19),vec3(1.20,.29,.14),clamp(body*.7+skin*.35,0.0,1.0));
  let tint=mix(color,vec3(1.28,.86,.66),clamp(core*.9,0.0,1.0));
  let stem=stroke(seg(p,vec2(0.0,.02),center+vec2(0.0,height)),.006,aa)*.24*(1.0-seal);
  let density=clamp(skin*.85+body*.58+core*.26+stem,0.0,.97);
  let crest=.45+.75*exp(-sq((t-.73)/.19));
  return Field(tint,density,(skin*.7+body*.25+core*.85+stem*.3)*crest);
}
fn worldField(p:vec2<f32>,e:Event,aa:f32)->Field {
  var f:Field;
  if(e.kind<.5){f=focusField(p,e.age,e.reduced,aa);}else if(e.kind<1.5){f=projectorField(p,e.age,e.reduced,aa);}else{f=lampField(p,e.age,e.reduced,aa);}
  let alive=lifecycle(e.age,e.reduced)*(1.0-smoothstep(.96,1.0,length(p)));
  f.coverage=f.coverage*alive;f.emission=f.emission*alive*e.strength;return f;
}
fn maskAt(p:vec2<f32>,index:u32)->vec4<f32>{
  if(any(abs(p)>vec2(1.0))){return vec4(0.0);}
  return textureSampleLevel(masks,maskSampler,(p+vec2(1.0))*.5,i32(index),0.0);
}
// PH2全体の放射包絡からPH1受光へ。三施設の供給・ピークの違いを保つ。
fn sourceRadiance(e:Event)->f32 {
  let t=e.age;let reduced=e.reduced;
  if(e.kind<.5){
    let phase=mix(t,.82,reduced);
    return (.30+.70*smoothstep(.08,.56,phase))*(.66+.34*exp(-sq((t-.72)/.24)));
  }
  if(e.kind<1.5){
    let phase=mix(t,.96,reduced);
    let opened=(smoothstep(.06,.61,phase)+smoothstep(.16,.71,phase)+smoothstep(.26,.81,phase))/3.0;
    return opened*(.62+.26*exp(-sq((t-1.06)/.40)));
  }
  let phase=mix(t,.80,reduced);
  return (.42+.58*smoothstep(.58,.95,phase))*(.45+.75*exp(-sq((t-.73)/.19)));
}
// OBS1: source-boundな4近傍PSF。元の世界形を作らず、入力/出力maskを両方適用。
fn observationGlow(p:vec2<f32>,e:Event,index:u32,aa:f32)->vec3<f32>{
  let offsets=array<vec2<f32>,4>(vec2(1.0,0.0),vec2(-1.0,0.0),vec2(0.0,1.0),vec2(0.0,-1.0));
  let stepSize=2.2*aa;var glow=vec3(0.0);
  for(var k=0u;k<4u;k=k+1u){
    let q=p+offsets[k]*stepSize;let f=worldField(q,e,aa);let m=maskAt(q,index);
    glow=glow+f.color*max(0.0,f.emission-.25)*f.coverage*m.r*(1.0-m.b)*.045;
  }
  return glow;
}
@fragment fn fs(vin:VertexOut)->@location(0) vec4<f32>{
  let e=events[vin.index];let p=vin.local;let mask=maskAt(p,vin.index);let visible=mask.r*(1.0-mask.b);
  let aa=1.0/max(e.radius*frame.scale,1.0);let f=worldField(p,e,aa);
  let glow=observationGlow(p,e,vin.index,aa)*visible;
  // PH1の局所受光はホストのreceiver(G)にだけ適用。仮想の床は追加しない。
  let incidence=exp(-dot(p/vec2(.44,.24),p/vec2(.44,.24)))*lifecycle(e.age,e.reduced)*sourceRadiance(e)*.075*e.strength;
  var lightColor=vec3(1.0,.42,.12);if(e.kind>.5&&e.kind<1.5){lightColor=vec3(.08,.82,.68);}else if(e.kind>1.5){lightColor=vec3(1.0,.32,.20);}
  let receiver=mask.g*visible*incidence;
  let alpha=clamp(f.coverage*visible+max(max(glow.r,glow.g),glow.b)*.26+receiver,0.0,.99);
  let rgb=f.color*(.44+f.emission*.56)*f.coverage*visible+glow+lightColor*receiver;
  return vec4(rgb,alpha);
}
