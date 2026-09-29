import {DESIGN} from './design.mjs';
export const shader=`
struct Params{view:vec4f,actor:vec4f,flags:vec4f};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
struct Scene{p:vec2f,ms:f32,h:f32,bg:f32,stars:f32,obs:f32};
fn scene(pos:vec2f)->Scene{
 var px=pos;var ms=u.view.z;var h=u.actor.z;var bg=u.actor.w;var stars=u.flags.x;var obs=u.flags.y;var ax=u.actor.x;var fy=u.actor.y;
 if(u.view.w>.5){let col=u32(floor(px.x/120.));let row=u32(floor(px.y/116.));let times=array<f32,11>(0.,80.,180.,350.,600.,810.,1000.,1180.,1350.,1450.,1600.);ms=times[min(col,10u)];px=vec2f(px.x-f32(col)*120.,px.y-f32(row)*116.);ax=60.;fy=91.;h=64.;bg=f32(row%2u);stars=select(1.,0.,row>=2u);obs=select(1.,0.,row>=4u);}
 return Scene(vec2f((px.x-ax)/h,1.-(fy-px.y)/h),ms,h,bg,stars,obs);
}
fn actor(p:vec2f)->vec4f{let suv=vec2f((p.x+.30)/.60,p.y);if(any(suv<vec2f(0.))||any(suv>vec2f(1.))){return vec4f(0.);}return textureSampleLevel(actorTex,samp,vec2f((62.+suv.x*136.)/768.,(15.+suv.y*225.)/512.),0.);}
@fragment fn fsBody(@builtin(position) pos:vec4f)->@location(0) vec4f{
 let s=scene(pos.xy);let a=actor(s.p);let background=mix(vec3f(.25,.32,.37),vec3f(.97,.97,.95),s.bg);return vec4f(mix(background,a.rgb,a.a),1.);
}
fn envelope(a:f32,b:f32,c:f32,d:f32,t:f32)->f32{return smoothstep(a,b,t)*(1.-smoothstep(c,d,t));}
fn star(p:vec2f,c:vec2f,h:f32)->f32{
 let q=(p-c)*h;let a=${DESIGN.sparkleAngleDeg}.*.0174532925;let v=vec2f(q.x*cos(a)+q.y*sin(a),-q.x*sin(a)+q.y*cos(a));
 return exp(-abs(v.x)*5.)*pow(max(0.,1.-abs(v.y)/5.),2.)+exp(-abs(v.y)*6.)*pow(max(0.,1.-abs(v.x)/3.),2.2)+exp(-dot(q,q)*3.);
}
struct Vol {density:f32,light:f32,near:f32};
// 厚い楕円断面の法線を光学へ使う。ノイズや色違いのコピーで多層を作らない。
fn volume(p:vec2f,c:vec2f,r:vec2f,side:f32,fill:f32)->Vol{
 let q=(p-c)/r;let d=dot(q,q);let aa=max(1.5/(u.actor.z*min(r.x,r.y)),.04);let support=1.-smoothstep(1.-aa,1.+aa,d);
 let z=sqrt(max(0.,1.-d));let normal=normalize(vec3f(q.x*.60,q.y*.60,z+.12));
 let lighting=.20+.60*max(0.,dot(normal,normalize(vec3f(-.45,-.30,1.))));
 let inner=pow(z,3.)*max(0.,1.-side*q.x*.65);
 return Vol(support*fill, support*(lighting*.18+inner*.58)*fill, exp(-max(0.,d)*.6)*fill);
}
fn path(a:vec2f,b:vec2f,c:vec2f,t:f32)->vec2f{return mix(mix(a,b,t),mix(b,c,t),t);}
struct Effect{material:vec4f,emission:vec3f};
fn effect(s:Scene)->Effect{
 let p=s.p;let t=s.ms*.001;
 if(t<=0.||t>=1.45||abs(p.x)>.49||p.y<.33||p.y>1.06){return Effect(vec4f(0.),vec3f(0.));}
 let bodyAlpha=actor(p).a;let sourceEnv=envelope(0.,.11,.38,.65,t);
 let source=volume(p,vec2f(0.,.57),vec2f(mix(.14,.09,smoothstep(.06,.34,t)),.115),1.,sourceEnv);
 var density=source.density;var radiance=source.light;var lightNear=source.near*.09;var glints=star(p,vec2f(.205,.54),s.h)*envelope(.06,.13,.24,.34,t);
 for(var i:u32=0u;i<4u;i++){
  let side=select(-1.,1.,i%2u==1u);let arms=i>=2u;let start=select(.14,.36,arms);let arrive=select(.53,.79,arms);
  let progress=smoothstep(start,arrive,t);let settle=smoothstep(arrive,arrive+.34,t);let stop=1.-smoothstep(1.15,1.45,t);
  let sourcePoint=vec2f(side*.025,.58);let control=vec2f(side*select(.035,.09,arms),select(.73,.43,arms));
  let end=vec2f(side*select(.105,.218,arms),select(.94,.565,arms));
  let center=path(sourcePoint,control,end,progress)+vec2f(-side*.050*settle,0.);
  // 球群ではなく、先細りの連続体積。各断面のmax密度で一つの主面を再構築。
  let r=vec2f(select(.056,.049,arms),select(.067,.057,arms))*mix(1.,.45,smoothstep(1.18,1.45,t));
  let fill=smoothstep(start,start+.13,t)*stop;var conduitDensity=0.;var conduitLight=0.;var conduitNear=0.;
  let drain=smoothstep(arrive+.15,1.20,t)*.73;
  for(var k:u32=0u;k<9u;k++){
   let along=f32(k)/8.;let centerline=path(sourcePoint,control,end,along)+vec2f(-side*.05*settle*along,0.);
   let fed=1.-smoothstep(progress-.08,progress+.08,along);let consumed=smoothstep(drain-.12,drain+.02,along);
   let thickness=mix(1.28,.88,along);let v=volume(p,centerline,r*thickness,side,fill*fed*consumed);
   conduitDensity=max(conduitDensity,v.density);conduitLight=max(conduitLight,v.light);conduitNear=max(conduitNear,v.near);
  }
  let rear=select(1.,1.-bodyAlpha*.65,progress<.52);
  density+=conduitDensity*rear;radiance+=conduitLight*rear;lightNear+=conduitNear*.08;
  // 到達の前縁から、源外の光条へ同じ中心を写す。受益者から独立しない。
  let flash=envelope(arrive-.11,arrive-.02,arrive+.16,arrive+.30,t);
  glints+=star(p,center+vec2f(side*(r.x+2.5/s.h),-.035),s.h)*flash;
 }
 // Eは原画RGBを入力にしない。受益者の色は独立fsBodyだけで描く。
 let opacity=min(.32,density*.16);let amber=vec3f(.98,.38,.025);
 let lit=vec3f(1.,.77,.33)*radiance*.9;
 let near=vec3f(.76,.30,.045)*lightNear*s.obs;
 let spark=vec3f(1.,.94,.71)*glints*.90*s.stars*s.obs;
 return Effect(vec4f(amber*opacity,opacity),lit+near+spark);
}
@fragment fn fsMaterial(@builtin(position) pos:vec4f)->@location(0) vec4f{return effect(scene(pos.xy)).material;}
@fragment fn fsLight(@builtin(position) pos:vec4f)->@location(0) vec4f{let e=effect(scene(pos.xy));return vec4f(e.emission,0.);}
`;
