// GPT-6.1-Sol 原本: receipt に束縛された有限のデジタル装備組立現象。
// ABI: 48 bytes, 3 vec4<f32>. viewport.xy=physical px, .zw=center physical px;
// state=(age seconds,H physical px,variant 0..4,reducedMotion 0/1);
// options=(main enabled,dock enabled,emission enabled,reserved).
struct Uniforms { viewport: vec4<f32>, state: vec4<f32>, options: vec4<f32> }
@group(0) @binding(0) var<uniform> u: Uniforms;
struct Out { @builtin(position) pos: vec4<f32> }
@vertex fn vs(@builtin(vertex_index) n: u32) -> Out {
  let vertices=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
  var o: Out; o.pos=vec4<f32>(vertices[n],0.,1.); return o;
}
fn box(p:vec2<f32>,c:vec2<f32>,r:vec2<f32>)->f32 {
  let d=abs(p-c)-r; return length(max(d,vec2<f32>(0.)))+min(max(d.x,d.y),0.);
}
fn cover(d:f32,aa:f32)->f32 {return 1.-smoothstep(-aa,aa,d);}
fn pulse(t:f32,a:f32,b:f32,c:f32,d:f32)->f32 {return smoothstep(a,b,t)*(1.-smoothstep(c,d,t));}
fn gun(p:vec2<f32>,v:u32)->f32 {
  // 主輪郭は銃身、機関部、握り。装備確定した variant 以外の武器を推測しない。
  var barrel=vec2<f32>(.19,.045); var receiver=vec2<f32>(.12,.08);
  var grip=vec2<f32>(.045,.105); var barrelX=.22;
  if(v==1u){barrel=vec2<f32>(.23,.05);receiver=vec2<f32>(.16,.09);barrelX=.25;}
  if(v==2u){barrel=vec2<f32>(.30,.04);receiver=vec2<f32>(.17,.085);barrelX=.29;}
  if(v==3u){barrel=vec2<f32>(.35,.028);receiver=vec2<f32>(.14,.07);barrelX=.30;}
  if(v==4u){barrel=vec2<f32>(.14,.07);receiver=vec2<f32>(.10,.09);barrelX=.17;}
  let body=min(box(p,vec2<f32>(0.,0.),receiver),box(p,vec2<f32>(barrelX,-.025),barrel));
  var shape=min(body,box(p,vec2<f32>(-.045,.135),grip));
  if(v==1u || v==2u){shape=min(shape,box(p,vec2<f32>(.09,.15),vec2<f32>(.036,.085)));}
  if(v==2u || v==3u){shape=min(shape,box(p,vec2<f32>(-.245,.01),vec2<f32>(.095,.045)));}
  if(v==3u){shape=min(shape,box(p,vec2<f32>(.075,-.105),vec2<f32>(.11,.028)));}
  return shape;
}
// R2 creative edition3/5: two registered boundaries define exactly three slices.
// The row transform and opening share these boundaries; no row-center cut.
const SLICE_BOUNDARY_0:f32=-.02;
const SLICE_BOUNDARY_1:f32=.12;
fn sliceIndex(y:f32)->f32 {
  return select(0.,select(1.,2.,y>=SLICE_BOUNDARY_1),y>=SLICE_BOUNDARY_0);
}
fn sliceGap(y:f32,t:f32)->f32 {
  let distanceToBoundary=min(abs(y-SLICE_BOUNDARY_0),abs(y-SLICE_BOUNDARY_1));
  return (1.-smoothstep(.31,.40,t))*(1.-smoothstep(.00252,.00630,distanceToBoundary));
}
@fragment fn fs(o:Out)->@location(0) vec4<f32> {
  let t=u.state.x; if(t<0. || t>=.78 || u.state.y<=0.){return vec4<f32>(0.);}
  let p=(o.pos.xy-u.viewport.zw)/u.state.y;
  if(any(abs(p)>vec2<f32>(.92,.52))){return vec4<f32>(0.);}
  let aa=max(1./u.state.y,.002);
  let v=u32(clamp(round(u.state.z),0.,4.));
  let reduced=u.state.w>.5;
  let arrival=smoothstep(.12,.36,t);
  let fade=1.-smoothstep(.57,.78,t);
  // 3 large contiguous slices converge. gaps visibly close, no random particles or scanlines.
  let row=sliceIndex(p.y);
  let dir=select(-1.,1.,row==1.);
  let displacement=select((1.-arrival)*dir*.28,(1.-arrival)*dir*.06,reduced);
  let q=p-vec2<f32>(.035+displacement,0.);
  let shape=gun(q,v);
  let onset=smoothstep(.06,.14,t);
  let seamCut=sliceGap(p.y,t);
  let coverage=cover(shape,aa)*(1.-seamCut)*onset*fade*u.options.x;
  let outline=(1.-smoothstep(0.,.019,abs(shape)))*onset*fade*(1.-seamCut)*u.options.x;
  let lock=pulse(t,.32,.37,.43,.51);
  let edgeCore=outline*(.55+1.7*lock)*u.options.z;
  let face=vec3<f32>(.025,.20,.31)*coverage;
  let emission=vec3<f32>(.20,.92,1.8)*edgeCore;
  // 入力接口退避: 中央の空域を作り新武器の確定へ引き継ぐ。旧武器種は描かない。
  let retract=smoothstep(0.,.16,t);
  let dockFade=1.-smoothstep(.13,.23,t);
  let left=box(p,vec2<f32>(-.15-.16*retract,.04),vec2<f32>(.045,.12));
  let right=box(p,vec2<f32>(.15+.16*retract,.04),vec2<f32>(.045,.12));
  let dock=cover(min(left,right),aa)*dockFade*u.options.y;
  let rgb=face+emission+vec3<f32>(.08,.40,.65)*dock;
  let alpha=max(coverage*.82,max(outline,dock*.76));
  // premultiplied color: emissive terms already multiplied by coverage/outline.
  return vec4<f32>(rgb,clamp(alpha,0.,1.));
}
