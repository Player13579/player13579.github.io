// GPT-6.1-Sol 武器切替 創作5/5。linear RGB / premultiplied。
struct Uniforms { viewport:vec4<f32>, state:vec4<f32>, options:vec4<f32>, detail:vec4<f32> }
// viewport=(width,height,centerX,centerY), state=(ageSeconds,Hphysical,variant,reducedMotion)
// options=(main,dock,source,observer), detail=(extra,motionDetail,face,reserved)
struct Out { @builtin(position) pos:vec4<f32> }
@vertex fn vs(@builtin(vertex_index) n:u32)->Out {
 let vertices=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
 var o:Out; o.pos=vec4<f32>(vertices[n],0.,1.); return o;
}
@group(0) @binding(0) var<uniform> u:Uniforms;
const COLORS=array<vec4<f32>,5>(vec4<f32>(1.8,0.82,0.18,0.0),
vec4<f32>(0.18,1.8,0.78,0.0),
vec4<f32>(0.2,0.86,1.8,0.0),
vec4<f32>(1.25,0.3,1.8,0.0),
vec4<f32>(1.8,0.4,0.55,0.0));
const MOTION=array<vec4<f32>,5>(vec4<f32>(0.12,0.22,0.255,0.0),
vec4<f32>(0.12,0.208,0.28,0.0),
vec4<f32>(0.12,0.22,0.28,0.0),
vec4<f32>(0.12,0.24,0.3,1.0),
vec4<f32>(0.12,0.224,0.26,0.0));
const DELAYS=array<vec4<f32>,5>(vec4<f32>(0.0,0.0,0.0,0.0),
vec4<f32>(0.0,0.016,0.032,0.0),
vec4<f32>(0.0,0.02,0.0,0.0),
vec4<f32>(0.0,0.0,0.0,0.0),
vec4<f32>(0.016,0.0,0.016,0.0));
fn box(p:vec2<f32>,c:vec2<f32>,r:vec2<f32>)->f32 { let d=abs(p-c)-r;return length(max(d,vec2<f32>(0.)))+min(max(d.x,d.y),0.); }
fn cover(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa,aa,d);}
fn pulse(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return smoothstep(a,b,t)*(1.-smoothstep(c,d,t));}
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

fn rowIndex(y:f32)->u32{return select(0u,select(1u,2u,y>=.12),y>=-.02);}
fn rowShift(v:u32,row:u32,t:f32)->f32 {
 let m=MOTION[v];let detailed=u.detail.y>.5;
 let start=select(.12,m.x+DELAYS[v][row],detailed);
 let duration=select(.24,m.y,detailed);
 let n=clamp((t-start)/duration,0.,1.);
 let cubic=n*n*(3.-2.*n);let quintic=n*n*n*(n*(n*6.-15.)+10.);
 let arrival=select(cubic,quintic,detailed && m.w>.5);
 let travel=select(select(.28,m.z,detailed),.06,u.state.w>.5);
 return select(-1.,1.,row==1u)*(1.-arrival)*travel;
}
fn seam(distance:f32,t:f32)->f32 {return (1.-smoothstep(.31,.40,t))*(1.-smoothstep(.00252,.00630,distance));}
fn project(p:vec2<f32>,v:u32,t:f32,aa:f32)->vec3<f32> {
 let dx=p.x-.035;
 if(u.detail.y<.5 || v==1u){return vec3<f32>(dx-rowShift(v,rowIndex(p.y),t),p.y,1.-seam(min(abs(p.y+.02),abs(p.y-.12)),t));}
 let m=MOTION[v];let n=clamp((t-m.x)/m.y,0.,1.);let cubic=n*n*(3.-2.*n);let quintic=n*n*n*(n*(n*6.-15.)+10.);
 let a=select(cubic,quintic,m.w>.5);let reduced=u.state.w>.5;
 if(v==0u){let angle=select(-.16*(1.-a),0.,reduced);let c=cos(angle);let s=sin(angle);let dy=p.y-select(.20,.04,reduced)*(1.-a);return vec3<f32>(c*dx+s*dy,-s*dx+c*dy,1.);}
 if(v==2u){return vec3<f32>(dx-select(-1.,1.,dx>=0.)*select(.22,.045,reduced)*(1.-a),p.y,1.-seam(abs(dx),t));}
 if(v==3u){let front=-.36+1.05*a;return vec3<f32>(dx,p.y,1.-smoothstep(front-aa,front+aa,dx));}
 return vec3<f32>(dx,p.y-select(-1.,1.,dx>=0.)*select(.16,.04,reduced)*(1.-a),1.-seam(abs(dx),t));
}
fn spot(p:vec2<f32>,c:vec2<f32>,r:vec2<f32>)->f32 {let d=(p-c)/r;return exp(-dot(d,d));}
fn extra(p:vec2<f32>,v:u32,t:f32)->f32 {
 if(v==0u){return 3.2*spot(p,vec2<f32>(-.02,.015),vec2<f32>(.065,.042))*pulse(t,.385,.400,.425,.455);}
 if(v==1u){return 2.4*(spot(p,vec2<f32>(-.045,-.02),vec2<f32>(.065,.026))*pulse(t,.37,.385,.402,.420)+spot(p,vec2<f32>(.08,.12),vec2<f32>(.065,.026))*pulse(t,.402,.416,.434,.455));}
 if(v==2u){return 2.3*(spot(p,vec2<f32>(-.22,.01),vec2<f32>(.070,.026))+spot(p,vec2<f32>(.22,-.025),vec2<f32>(.070,.024)))*pulse(t,.385,.4,.45,.49);}
 if(v==3u){let progression=smoothstep(.36,.49,t);return 3.*spot(p,vec2<f32>(.45-.36*progression,-.025),vec2<f32>(.045,.024))*pulse(t,.36,.39,.46,.505);}
 return 2.7*(spot(p,vec2<f32>(-.035,-.02),vec2<f32>(.045,.024))+spot(p,vec2<f32>(.06,.12),vec2<f32>(.045,.024)))*pulse(t,.388,.4,.43,.468);
}
struct WorldOut { @location(0) color:vec4<f32>, @location(1) emission:vec4<f32> }
@fragment fn fs(o:Out)->WorldOut {
 var result:WorldOut;result.color=vec4<f32>(0.);result.emission=vec4<f32>(0.);
 let t=u.state.x;if(t<0. || t>=.78 || u.state.y<=0.){return result;}
 let p=(o.pos.xy-u.viewport.zw)/u.state.y;if(any(abs(p)>vec2<f32>(.92,.52))){return result;}
 let v=u32(clamp(round(u.state.z),0.,4.));let tint=COLORS[v].rgb;let aa=max(1./u.state.y,.002);
 let projection=project(p,v,t,aa);let q=projection.xy;
 let shape=gun(q,v);let onset=smoothstep(.06,.14,t);let fade=1.-smoothstep(.57,.78,t);
 let coverage=cover(shape,aa)*projection.z*onset*fade*u.options.x;
 let outline=(1.-smoothstep(0.,.019,abs(shape)))*projection.z*onset*fade*u.options.x;
 let retract=smoothstep(0.,.16,t);let dockFade=1.-smoothstep(.13,.23,t);
 let left=box(p,vec2<f32>(-.15-.16*retract,.04),vec2<f32>(.045,.12));
 let right=box(p,vec2<f32>(.15+.16*retract,.04),vec2<f32>(.045,.12));
 let dock=cover(min(left,right),aa)*dockFade*u.options.y;
 let energy=(outline*(.55+1.7*pulse(t,.32,.37,.43,.51))+u.detail.x*extra(q,v,t)*coverage+.25*dock)*u.options.z;
 let emission=tint*energy;
 let face=tint*(.17*coverage*u.detail.z+.06*dock);
 let alpha=clamp(max(coverage*.82,max(outline,dock*.76)),0.,1.);
 result.color=vec4<f32>(face+emission,alpha);result.emission=vec4<f32>(emission,0.);return result;
}
