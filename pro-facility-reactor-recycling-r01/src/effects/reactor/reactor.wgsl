// A: reactorGauge/luckBoost。fieldの開口とアーチ状輸送。別Eのshaderをincludeしない。
struct Event { ends:vec4f, timing:vec4f, bounds:vec4f, options:vec4f }
struct View { extent:vec2f, pad:vec2f }
@group(0) @binding(0) var<uniform> view:View;
@group(0) @binding(1) var<storage,read> events:array<Event>;
struct VOut { @builtin(position) position:vec4f, @location(0) pixel:vec2f, @location(1) @interpolate(flat) index:u32 }
@vertex fn vs(@builtin(vertex_index) vertex:u32,@builtin(instance_index) instance:u32)->VOut {
  let corners=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let b=events[instance].bounds;
  let p=mix(max(b.xy,vec2f(0)),min(b.zw,view.extent),corners[vertex]);
  var o:VOut;o.position=vec4f(p.x/view.extent.x*2-1,1-p.y/view.extent.y*2,0,1);o.pixel=p;o.index=instance;return o;
}
fn quintic(x:f32)->f32{let u=clamp(x,0,1);return clamp(u*u*u*(u*(u*6-15)+10),0,1);}
fn lineDistance(p:vec2f,a:vec2f,b:vec2f)->f32{let d=b-a;let h=clamp(dot(p-a,d)/max(dot(d,d),0.0001),0,1);return length(p-a-d*h);}
fn coverage(distance:f32,radius:f32)->f32{return 1-smoothstep(radius-.7,radius+.7,distance);}
fn arcPoint(center:vec2f,r:f32,a:f32)->vec2f{return center+r*vec2f(cos(a),sin(a));}
fn path(s:f32,a:vec2f,b:vec2f,H:f32,reduced:f32)->vec2f{
  return mix(a,b,s)+vec2f(0,-.30*H*(1-reduced)*sin(3.14159265*s));
}
@fragment fn fs(i:VOut)->@location(0) vec4f {
  let e=events[i.index];let H=e.timing.x;let t=e.timing.y;let has=e.timing.z;let reduced=e.timing.w;
  if(t<0||t>=2.2){discard;}
  let p=i.pixel;let a=e.ends.xy;let b=e.ends.zw;let s=H/64;
  let open=quintic((t-.03)/.39);let head=quintic((t-.38)/.74);
  let tail=max(0,head-.34);let arrive=quintic((t-1.01)/.23)*has;
  let release=1-quintic((t-1.81)/.39);
  let source=(.30+.70*quintic(t/.18))*(1-quintic((t-.80)/.39));
  // PH1 既存ゲージの反応域: 開いたアーチと、長さを保つ針の回転。全面発光の円にしない。
  let center=a+vec2f(0,-5*s);var rimDistance=100000.0;
  for(var k=0u;k<16u;k++){
    let x=f32(k)/16;let y=f32(k+1u)/16;
    let pa=arcPoint(center,17*s,3.5+2.4*x);let pb=arcPoint(center,17*s,3.5+2.4*y);
    rimDistance=min(rimDistance,lineDistance(p,pa,pb));
  }
  let needleEnd=arcPoint(center,14*s,3.75+1.55*open);
  let needleDistance=lineDistance(p,center,needleEnd);
  let rim=coverage(rimDistance,1.8*s)*source;
  let needle=coverage(needleDistance,1.7*s)*source;
  let darkSource=max(coverage(rimDistance,3.2*s),coverage(needleDistance,3.0*s))*source;
  // PH2: 一つの有限な帯状field。先端/後端が世界状態。残像や露光積分ではない。
  let pathStart=a+vec2f(0,-20*s);let pathEnd=b+vec2f(0,-20*s);
  var pathDistance=100000.0;
  let transporting=step(.38,t)*(1-quintic((t-1.08)/.22))*has;
  for(var k=0u;k<20u;k++){
    let u=mix(tail,head,f32(k)/20);let v=mix(tail,head,f32(k+1u)/20);
    pathDistance=min(pathDistance,lineDistance(p,path(u,pathStart,pathEnd,H,reduced),path(v,pathStart,pathEnd,H,reduced)));
  }
  let band=coverage(pathDistance,3.1*s)*transporting;
  let channel=coverage(pathDistance,.85*s)*transporting; // 内部の低密度筋。主形の白い塊化を防ぐ構造。
  let darkPath=coverage(pathDistance,4.4*s)*transporting;
  // PH3: 受領した正の増分の有限応答。buffの20sを2.2sに書き換えず、付与も行わない。
  let width=(12+3*arrive)*s;let yTop=b.y-25*s;
  let leftBase=b+vec2f(-width,8*s);let rightBase=b+vec2f(width,8*s);
  let lp=b+vec2f(-width,-12*s);let rp=b+vec2f(width,-12*s);let crown=vec2f(b.x,yTop);
  let left=min(lineDistance(p,leftBase,lp),lineDistance(p,lp,crown));
  let right=min(lineDistance(p,rightBase,rp),lineDistance(p,rp,crown));
  let receptorDistance=min(left,right);
  let receptor=coverage(receptorDistance,2.0*s)*arrive*release;
  let darkReceptor=coverage(receptorDistance,3.7*s)*arrive*release;
  let outer=max(max(darkSource,darkPath),darkReceptor);
  let body=max(max(rim,needle),max(band,receptor));
  let density=.76;let opacity=clamp(outer*.82,0,1); // 密度/coverage/放射を別々に扱う。
  var rgb=vec3f(.009,.022,.043)*opacity;
  rgb+=rim*vec3f(.016,.22,.34)+needle*vec3f(.10,.36,.22);
  rgb+=max(0,band-channel*.74)*density*vec3f(.01,.27,.39);
  rgb+=receptor*vec3f(.08,.28,.15);
  let sourcePower=1.2+3.6*quintic((t-.13)/.20);
  let emitted=needle*sourcePower*vec3f(.35,.88,.28)+rim*.8*vec3f(.012,.19,.64)
    +max(0,band-channel*.89)*2.5*vec3f(.025,.45,.75)+receptor*(2.8-.5*quintic((t-1.42)/.3))*vec3f(.35,.82,.20);
  rgb+=emitted;
  // OBS1有限PSF: 同じ源の位置/強度/時間を参照する。視線経路用の粒子やsourceなしflareではない。
  if(e.options.x>.5){
    let gSource=exp(-max(0,needleDistance-1.7*s)/(1.4*s))*source*sourcePower;
    let gPath=exp(-max(0,pathDistance-3.1*s)/(1.5*s))*transporting;
    let gReceiver=exp(-max(0,receptorDistance-2*s)/(1.4*s))*arrive*release;
    rgb+=.12*gSource*vec3f(.35,.88,.28)+.16*gPath*vec3f(.025,.45,.75)+.19*gReceiver*vec3f(.35,.82,.20);
  }
  // 終端で源も伝達も受領形も有限。係数をゼロにするための後付け背景maskは使わない。
  return vec4f(rgb,opacity);
}
