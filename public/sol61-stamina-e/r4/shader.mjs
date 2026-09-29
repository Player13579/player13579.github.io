import {DESIGN} from './design.mjs';
const parts=DESIGN.pressureParts.map(p=>`Part(vec2f(${p.a.map(x=>Number(x).toFixed(5)).join(',')}),vec2f(${p.b.map(x=>Number(x).toFixed(5)).join(',')}),vec4f(${p.radius.join(',')},${p.depth},${p.arrival}),vec4f(${p.full},${p.accept},${p.release},${p.a[0]===0?0:p.a[0]<0?-1:1}))`).join(',\n');
export const shader=`
struct Params{view:vec4f,actor:vec4f,flags:vec4f};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var bodyTex:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let xy=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(xy[i],0.,1.);}
struct Scene{p:vec2f,ms:f32,h:f32,bg:f32,stars:f32,obs:f32,main:f32};
fn scene(pos:vec2f)->Scene{
 var q=pos;var ms=u.view.z;var h=u.actor.z;var bg=u.actor.w;var stars=u.flags.x;var obs=u.flags.y;var main=u.flags.z;var ax=u.actor.x;var fy=u.actor.y;
 if(u.view.w>.5){let col=u32(floor(q.x/120.));let row=u32(floor(q.y/116.));let times=array<f32,11>(0.,80.,170.,300.,470.,660.,840.,1070.,1260.,1450.,1600.);ms=times[min(col,10u)];q=vec2f(q.x-f32(col)*120.,q.y-f32(row)*116.);ax=60.;fy=91.;h=64.;bg=f32(row%2u);stars=select(1.,0.,row>=2u);obs=select(1.,0.,row>=4u);}
 return Scene(vec2f((q.x-ax)/h,1.-(fy-q.y)/h),ms,h,bg,stars,obs,main);
}
fn actor(p:vec2f)->vec4f{let uv=vec2f((p.x+.30)/.60,p.y);if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec4f(0.);}return textureSampleLevel(bodyTex,samp,vec2f((62.+uv.x*136.)/768.,(15.+uv.y*225.)/512.),0.);}
@fragment fn fsBody(@builtin(position) pos:vec4f)->@location(0) vec4f{let s=scene(pos.xy);let a=actor(s.p);let bg=mix(vec3f(.12,.16,.20),vec3f(.97,.97,.95),s.bg);return vec4f(mix(bg,a.rgb,a.a),1.);}
struct Part{a:vec2f,b:vec2f,shape:vec4f,clock:vec4f};
const parts=array<Part,5>(
${parts}
);
struct State{radius:f32,supply:f32,strain:f32,returning:f32};
fn state(part:Part,t:f32)->State{
 let filled=smoothstep(part.shape.w,part.clock.x,t);let accepted=smoothstep(part.clock.x,part.clock.y,t);let end=1.-smoothstep(part.clock.z,1.45,t);
 let radius=mix(part.shape.x,part.shape.y,filled)*mix(1.,.75,accepted)*mix(1.,.60,1.-end);
 return State(radius,filled*end,filled*(1.-accepted)*end,accepted);
}
struct Volume{density:f32,white:f32,colour:f32,receiver:f32,near:f32};
// 一つの身体形の充填圧。3D横断容積の視線積分は楕円断面の深さを解析的に解く。
fn volume(p:vec2f,part:Part,st:State,h:f32)->Volume{
 let axis=part.b-part.a;let q=clamp(dot(p-part.a,axis)/dot(axis,axis),0.,1.);let center=part.a+axis*q;
 let taper=sin(3.141593*(.12+.76*q));let radius=st.radius*(.86+.14*taper);let v=p-center;
 let r=length(v)/radius;let aa=1.1/(radius*h);let support=1.-smoothstep(1.-aa,1.+aa,r);
 let zdepth=sqrt(max(0.,1.-r*r))*part.shape.z*2.;let density=(1.-exp(-zdepth*5.4))*support*st.supply;
 // 移動峰は周回せず各部位の法線へ張り出し、受納時に内側へ戻る。
 let normal=normalize(vec2f(-axis.y,axis.x));let outward=normal*select(1.,-1.,dot(normal,vec2f(part.clock.w,0.))<0.);
 let signed=dot(v,outward)/radius;let front=mix(.68,.10,st.returning);let peak=exp(-pow((signed-front)/.29,2.));
 let white=density*peak*(.52+st.strain*.90);let colour=density*(.28+st.strain*.19);
 return Volume(density,white,colour,density*.105,exp(-pow(r/1.32,2.))*st.supply*.055);
}
fn glint(p:vec2f,c:vec2f,h:f32)->f32{
 let q=(p-c)*h;let angle=${DESIGN.sparkle.longAxisDegFromScreenX}.*.0174532925;let x=dot(q,vec2f(cos(angle),sin(angle)));let y=dot(q,vec2f(-sin(angle),cos(angle)));
 return exp(-abs(y)*4.5)*pow(max(0.,1.-abs(x)/${DESIGN.sparkle.longAxisPx.toFixed(1)}),2.)+exp(-abs(x)*5.0)*pow(max(0.,1.-abs(y)/${DESIGN.sparkle.shortAxisPx.toFixed(1)}),2.)+exp(-dot(q,q)*2.6);
}
struct Effect{material:vec4f,emission:vec3f};
fn effect(s:Scene)->Effect{
 let t=s.ms*.001;let p=s.p;if(t<=0.||t>=1.45||abs(p.x)>.60||p.y<.29||p.y>1.22||s.main<.5){return Effect(vec4f(0.),vec3f(0.));}
 let a=actor(p);var tau=0.;var white=0.;var body=0.;var receiving=0.;var near=0.;var stars=0.;
 for(var i:u32=0u;i<5u;i++){
  let part=parts[i];let st=state(part,t);let v=volume(p,part,st,s.h);tau+=v.density;white+=v.white;body+=v.colour;receiving+=v.receiver*a.a;near+=v.near;
  let side=part.clock.w;let peak=part.clock.x;let flash=smoothstep(peak-.09,peak-.015,t)*(1.-smoothstep(peak+.06,peak+.18,t));
  if(i>0u){let axis=part.b-part.a;let normal=normalize(vec2f(-axis.y,axis.x));let outward=normal*select(1.,-1.,dot(normal,vec2f(side,0.))<0.);let source=part.b+outward*st.radius*mix(.68,.10,st.returning);let centre=source+outward*3.5/s.h;let sourceState=volume(source,part,st,s.h);stars+=glint(p,centre,s.h)*flash*sourceState.density*(.52+st.strain*.90);}
  else{let flashSource=smoothstep(.065,.095,t)*(1.-smoothstep(.19,.27,t));let source=vec2f(.16,.59);stars+=glint(p,source+vec2f(3./s.h,0.),s.h)*flashSource*volume(source,part,st,s.h).density;}
 }
 let density=1.-exp(-tau);let alpha=density*.25*(1.-a.a*.92);
 let apricot=vec3f(.96,.37,.075);let material=vec4f(apricot*alpha,alpha);
 let emission=(vec3f(1.,.95,.79)*white+vec3f(1.,.50,.13)*body)*(1.-a.a*.38);
 let received=vec3f(.94,.65,.30)*receiving;
 let optics=vec3f(1.,.52,.18)*near*s.obs;
 let sparkle=vec3f(1.,.96,.84)*stars*1.18*s.stars*s.obs;
 return Effect(material,emission+received+optics+sparkle);
}
@fragment fn fsMaterial(@builtin(position) pos:vec4f)->@location(0) vec4f{return effect(scene(pos.xy)).material;}
@fragment fn fsLight(@builtin(position) pos:vec4f)->@location(0) vec4f{return vec4f(effect(scene(pos.xy)).emission,0.);}
`;
