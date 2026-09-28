// B: recyclingUnit/credits。矩形の圧縮と3つの受領区画。Aの形状・色・時間関数は使わない。
struct Event { ends:vec4f, timing:vec4f, bounds:vec4f, options:vec4f }
struct View { extent:vec2f, pad:vec2f }
@group(0) @binding(0) var<uniform> view:View;
@group(0) @binding(1) var<storage,read> events:array<Event>;
struct Output { @builtin(position) position:vec4f, @location(0) pixel:vec2f, @location(1) @interpolate(flat) index:u32 }
@vertex fn vs(@builtin(vertex_index) n:u32,@builtin(instance_index) instance:u32)->Output {
  let corner=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let bounds=events[instance].bounds;
  let p=mix(max(bounds.xy,vec2f(0)),min(bounds.zw,view.extent),corner[n]);
  var out:Output;out.position=vec4f(2*p.x/view.extent.x-1,1-2*p.y/view.extent.y,0,1);out.pixel=p;out.index=instance;return out;
}
fn easeCos(x:f32)->f32{return .5-.5*cos(3.14159265*clamp(x,0,1));}
fn boxSDF(p:vec2f,halfExtent:vec2f)->f32{let d=abs(p)-halfExtent;return length(max(d,vec2f(0)))+min(max(d.x,d.y),0);}
fn ink(d:f32)->f32{return 1-smoothstep(-.65,.65,d);}
fn segmentDistance(p:vec2f,a:vec2f,b:vec2f)->f32{let v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),.0001),0,1));}
@fragment fn fs(input:Output)->@location(0) vec4f {
  let e=events[input.index];let H=e.timing.x;let t=e.timing.y;let has=e.timing.z;let reduced=e.timing.w;
  if(t<0||t>=2.2){discard;}
  let s=H/64;let p=input.pixel;let origin=e.ends.xy;let receiver=e.ends.zw;
  let direction=(receiver-origin)/max(length(receiver-origin),.0001);
  let axis=select(vec2f(1,0),direction,has>.5&&length(direction)>.1);let perpendicular=vec2f(-axis.y,axis.x);
  let delta=p-origin;let q=vec2f(dot(delta,axis),dot(delta,perpendicular));
  let crush=easeCos(t/.28)*(1-easeCos((t-.43)/.29));
  let sourceLife=(1-easeCos((t-.56)/.24))*easeCos(t/.07);
  // PH1 二つの境界が締まる。素材や破片を足さず既存機器の作用域だけを反応させる。
  let gap=(10-5.3*crush*(1-.45*reduced))*s;
  let top=boxSDF(q-vec2f(-5*s,-gap),vec2f(12*s,3.2*s));
  let bottom=boxSDF(q-vec2f(-5*s,gap),vec2f(12*s,3.2*s));
  let jamb=boxSDF(q-vec2f(-17*s,0),vec2f(2.3*s,13*s));
  let sourceDistance=min(min(top,bottom),jamb);
  let sourceInk=ink(sourceDistance)*sourceLife;
  let sourceEdge=ink(abs(sourceDistance)-.9*s)*sourceLife;
  var alpha=ink(sourceDistance-1.8*s)*sourceLife*.91;
  var rgb=alpha*vec3f(.036,.009,.006)+sourceInk*vec3f(.29,.045,.018);
  let pressureWave=sin(3.14159265*clamp(t/.44,0,1));
  let pressurePower=1+5.4*pressureWave*pressureWave;
  rgb+=sourceEdge*pressurePower*vec3f(.93,.24,.038);
  var halo=exp(-max(sourceDistance,0)/(1.25*s))*sourceLife*pressurePower*vec3f(.93,.24,.038);
  let close=1-easeCos((t-1.82)/.38);
  // PH2 3個の搬送区画。粒子系ではなく同じfieldの3つの有限な状態区画。
  // PH3 各区画の着座後だけ結果を保持。送出時点から+3完了を先取りしない。
  for(var j=0u;j<3u;j++){
    let lane=f32(j)-1;let launch=.36+.18*f32(j);let arrival=.92+.18*f32(j);
    let travel=clamp((t-launch)/(arrival-launch),0,1);
    let source=origin+axis*7*s+perpendicular*lane*5*s;
    let destination=receiver+vec2f(20*s,lane*10*s);
    let packetPosition=mix(source,destination,travel);
    let d=p-packetPosition;
    let moving=select(0.0,1.0,t>=launch&&t<arrival)*has;
    let packet=boxSDF(vec2f(dot(d,axis),dot(d,perpendicular)),vec2f(6.5*s,2.7*s));
    let movingInk=ink(packet)*moving;let movingBorder=ink(packet-1.4*s)*moving;
    let slot=boxSDF(p-destination,vec2f(7*s*close,3.3*s));
    let seated=easeCos((t-arrival)/.12)*has*close;
    let resultInk=ink(slot)*seated;let resultBorder=ink(slot-1.6*s)*seated;
    let segment=segmentDistance(p,source,packetPosition);
    let guide=ink(segment-1.0*s)*moving*.27;
    // 暗い母材と明るい切断縁を分離。3区画の隙間はglowを切っても残る。
    let localA=clamp(max(max(movingBorder,resultBorder),guide)*.90,0,1);
    rgb=rgb*(1-localA)+vec3f(.048,.012,.006)*localA;
    rgb+=movingInk*vec3f(.49,.070,.015)+resultInk*vec3f(.43,.13,.021);
    let seal=ink(abs(slot)-.7*s)*seated;
    rgb+=movingInk*.95*vec3f(.94,.36,.065)+seal*3.8*vec3f(1,.70,.29);
    alpha=localA+alpha*(1-localA);
    halo+=exp(-max(packet,0)/(1.15*s))*moving*.75*vec3f(.94,.36,.065)
      +exp(-abs(slot)/(1.20*s))*seated*1.1*vec3f(1,.70,.29);
  }
  // OBS1: 圧縮縁と着座縁だけに束縛した応答。輪や全画面白幕を追加しない。
  if(e.options.x>.5){rgb+=halo*.14;}
  return vec4f(rgb,clamp(alpha,0,1));
}
