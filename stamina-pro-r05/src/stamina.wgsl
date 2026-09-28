// PH2=内向補給片、PH3=身体内蓄勢。OBS1=局所境界、OBS2=source-bound拡散、OBS3=肩圧縮。
// 画像・sampler・sampled textureを持たない。位置と身体maskは受益actorの投影から供給。
struct Frame { viewport:vec2f, count:u32, passKind:u32 };
struct Item {
  f0:vec4f, // origin.xy / axisX.xy
  f1:vec4f, // axisY.xy / phase / reducedMotion
  f2:vec4f, // lane / capsuleCount / occluderCount / fixtureBackground
  f3:vec4f,
  caps:array<vec4f,12>,
  radii:array<vec4f,3>,
  occluders:array<vec4f,4>
};
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var<storage,read> items:array<Item>;
struct VertexOut { @builtin(position) pos:vec4f, @location(0) local:vec2f, @location(1) @interpolate(flat) instance:u32 };
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32)->VertexOut {
  let corners=array<vec2f,6>(vec2f(-.57,-.02),vec2f(.57,-.02),vec2f(-.57,1.04),vec2f(-.57,1.04),vec2f(.57,-.02),vec2f(.57,1.04));
  let p=corners[vi];let it=items[ii];let screen=it.f0.xy+it.f0.zw*p.x+it.f1.xy*p.y;
  var o:VertexOut;o.pos=vec4f(screen.x/frame.viewport.x*2.-1.,1.-screen.y/frame.viewport.y*2.,0.,1.);o.local=p;o.instance=ii;return o;
}
fn capsuleDistance(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let ab=b-a;let h=clamp(dot(p-a,ab)/max(dot(ab,ab),.000001),0.,1.);return length(p-a-ab*h);
}
fn bodyDistance(p:vec2f,ii:u32)->f32 {
  var d=100.;let count=u32(items[ii].f2.y);
  for(var n=0u;n<count;n++){let c=items[ii].caps[n];let r=items[ii].radii[n/4u][n%4u];d=min(d,capsuleDistance(p,c.xy,c.zw)-r);}
  return d;
}
fn occulted(screen:vec2f,ii:u32)->bool {
  for(var n=0u;n<u32(items[ii].f2.z);n++){let r=items[ii].occluders[n];if(all(screen>=r.xy)&&all(screen<=r.zw)){return true;}}
  return false;
}
// 厚みのある開いた二本の補給路。弧長方向の密度frontで内向輸送を読む。
fn supply(p:vec2f,t:f32,rm:f32,h:f32)->vec2f {
  let q=smoothstep(.08,620./1500.,t);let motionProgress=mix(q,.66,rm);var nearest=1.;var along=0.;
  for(var side=-1.;side<=1.;side+=2.){
    let a=vec2f(side*(.265-.095*motionProgress),.805);
    let b=vec2f(side*(.485-.19*motionProgress),.592);
    let c=vec2f(side*.063,.417);
    var previous=a;
    for(var i=1u;i<=14u;i++){
      let v=f32(i)/14.;let point=(1.-v)*(1.-v)*a+2.*(1.-v)*v*b+v*v*c;
      let mid=(f32(i)-.5)/14.;let width=.014+.044*pow(sin(mid*3.14159265),.75);
      let d=capsuleDistance(p,previous,point)-width;
      if(d<nearest){nearest=d;along=mid;}previous=point;
    }
  }
  let appear=smoothstep(0.,.045,t)*(1.-smoothstep(.38,.68,t));
  let flowCenter=mix(.10,.90,q);let packet=exp(-pow((along-flowCenter)/.25,2.));
  let density=.40+.60*packet;
  let coverage=1.-smoothstep(-.65/h,.65/h,nearest);
  return vec2f(coverage*appear*density,nearest);
}
// 腰→胸下の容量が満ち、細い連結部を通して連続した蓄勢へ移る。
fn reserve(p:vec2f,t:f32,h:f32)->vec2f {
  let fill=smoothstep(.025,620./1500.,t);let y0=.398;let y1=mix(.42,.751,fill);
  let appear=smoothstep(.025,.13,t)*(1.-smoothstep(1120./1500.,1.,t));
  let center=vec2f(abs(p.x)-.061,p.y);
  let d=capsuleDistance(center,vec2f(0.,y0),vec2f(0.,max(y0+.001,y1)))-.043;
  let phase=(p.y-.404)/.086;
  let gap=abs(fract(phase)-.5);
  let chambers=1.-.56*smoothstep(.37,.48,gap);
  let bridge=(1.-smoothstep(.012,.024,abs(p.x)))*(1.-smoothstep(.71,.752,p.y))*smoothstep(.39,.42,p.y);
  let coverage=1.-smoothstep(-.6/h,.6/h,d);
  let vertical=smoothstep(.40,.74,p.y);
  return vec2f(max(coverage*chambers,bridge*.52)*appear,.72+.28*vertical);
}
fn worldFields(p0:vec2f,t:f32,rm:f32,h:f32,ii:u32)->vec4f {
  // 同時原因には小さい固定laneを割当。ID間で状態・音を統合しない。
  let lane=items[ii].f2.x;let laneShift=select(0.,select(-1.,1.,u32(lane)%2u==0u)*min(ceil(lane/2.),3.)*.018,lane>0.);
  let p=p0-vec2f(laneShift,0.);let s=supply(p,t,rm,h);let r=reserve(p,t,h);
  let receiver=1.-smoothstep(-.6/h,.6/h,bodyDistance(p0,ii));
  let intake=s.x;let store=r.x*receiver;
  return vec4f(intake,store,r.y,receiver);
}
fn energyColor(w:vec4f)->vec3f {
  // 三つの色域を源・移送・容量へ束縛。光量・coverage・密度を同一値にしない。
  let transport=mix(vec3f(1.00,.18,.012),vec3f(1.00,.52,.028),clamp(w.x,0.,1.));
  let stored=mix(vec3f(1.00,.46,.025),vec3f(1.00,.90,.27),clamp(w.z,0.,1.));
  return transport*(3.4*w.x)+stored*(4.6*w.y);
}
fn compress(e:vec3f)->vec3f { let peak=max(e.x,max(e.y,e.z));return e/(1.+peak); }
fn linearToSrgb(c:vec3f)->vec3f {
  return select(12.92*c,1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c>vec3f(.0031308));
}
@fragment fn fs(in:VertexOut)->@location(0) vec4f {
  let ii=in.instance;let it=items[ii];if(occulted(in.pos.xy,ii)){discard;}
  let h=max(1.,min(length(it.f0.zw),length(it.f1.xy)));let t=it.f1.z;
  if(frame.passKind==1u){
    let d=bodyDistance(in.local,ii);let a=1.-smoothstep(-.6/h,.6/h,d);if(a<=0.){discard;}
    let edge=1.-smoothstep(.0,1.4/h,-d);
    let bg=it.f2.w;let col=mix(mix(vec3f(.22,.26,.32),vec3f(.42,.46,.51),bg),vec3f(.11,.13,.17),edge*.6);
    return vec4f(col*a,a);
  }
  if(t<=0.||t>=1.){discard;}
  let w=worldFields(in.local,t,it.f1.w,h,ii);let e=energyColor(w);
  let cov=clamp(max(w.x,w.y),0.,1.);
  // OBS2: source形状を入力とする狭い九点PSF近似。光源なしのglowを作らない。
  let off=1.35/h;var scatter=vec3f(0.);var around=0.;
  for(var y=-1.;y<=1.;y+=1.){for(var x=-1.;x<=1.;x+=1.){
    let v=worldFields(in.local+vec2f(x,y)*off,t,it.f1.w,h,ii);
    let weight=select(.075,.40,x==0.&&y==0.);scatter+=energyColor(v)*weight;around=max(around,max(v.x,v.y));
  }}
  let edgeAlpha=clamp(around-cov*.80,0.,1.)*.72; // OBS1の幅はH64で約1–2画素。
  let glowAlpha=clamp(max(scatter.x,max(scatter.y,scatter.z))*.08,0.,.34);
  let a=clamp(cov+edgeAlpha*(1.-cov)+glowAlpha*(1.-cov)*(1.-edgeAlpha),0.,1.);
  if(a<.001){discard;}
  let source=linearToSrgb(compress(e+scatter*.16));
  let dark=vec3f(.17,.052,.018);let ec=edgeAlpha*(1.-cov);
  let glow=linearToSrgb(compress(scatter*.30));
  let rgb=source*cov+dark*ec+glow*glowAlpha*(1.-cov)*(1.-edgeAlpha);
  return vec4f(min(rgb,vec3f(a)),a); // premultiplied alpha。全背景を持ち上げない。
}
