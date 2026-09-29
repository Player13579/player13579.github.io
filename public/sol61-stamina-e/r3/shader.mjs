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
 if(u.view.w>.5){let col=u32(floor(px.x/120.));let row=u32(floor(px.y/116.));let times=array<f32,11>(0.,80.,180.,350.,600.,810.,1000.,1320.,1500.,1600.,1800.);ms=times[min(col,10u)];px=vec2f(px.x-f32(col)*120.,px.y-f32(row)*116.);ax=60.;fy=91.;h=64.;bg=f32(row%2u);stars=select(1.,0.,row>=2u);obs=select(1.,0.,row>=4u);}
 return Scene(vec2f((px.x-ax)/h,1.-(fy-px.y)/h),ms,h,bg,stars,obs);
}
fn actor(p:vec2f)->vec4f{let suv=vec2f((p.x+.30)/.60,p.y);if(any(suv<vec2f(0.))||any(suv>vec2f(1.))){return vec4f(0.);}return textureSampleLevel(actorTex,samp,vec2f((62.+suv.x*136.)/768.,(15.+suv.y*225.)/512.),0.);}
@fragment fn fsBody(@builtin(position) pos:vec4f)->@location(0) vec4f{let s=scene(pos.xy);let a=actor(s.p);let bg=mix(vec3f(.12,.16,.20),vec3f(.97,.97,.95),s.bg);return vec4f(mix(bg,a.rgb,a.a),1.);}
fn env(a:f32,b:f32,c:f32,d:f32,t:f32)->f32{return smoothstep(a,b,t)*(1.-smoothstep(c,d,t));}
fn star(p:vec2f,c:vec2f,h:f32)->f32{let q=(p-c)*h;let a=${DESIGN.sparkleAngleDeg}.*.0174532925;let v=vec2f(q.x*cos(a)+q.y*sin(a),-q.x*sin(a)+q.y*cos(a));return exp(-abs(v.x)*4.5)*pow(max(0.,1.-abs(v.y)/5.0),2.)+exp(-abs(v.y)*5.5)*pow(max(0.,1.-abs(v.x)/3.0),2.0)+exp(-dot(q,q)*2.8);}
fn wavePoint(s:f32,t:f32)->vec2f{
 let accept=smoothstep(.78,1.49,t);let amplitude=mix(.44,.16,accept);
 let angle=4.712389*s+.42;
 return vec2f(amplitude*sin(angle),.55+.48*s-.35*sin(3.141593*s));
}
struct Ribbon{density:f32,emission:f32,near:f32,crest:f32};
// 連続面の最短点/接線で断面を解く。独立楕円/粒子のmax配列ではない。
fn ribbon(p:vec2f,t:f32,bodyAlpha:f32,h:f32)->Ribbon{
 var distance=10.;var along=0.;var normal=vec2f(1.,0.);var center=vec2f(0.);
 for(var i:u32=0u;i<24u;i++){
  let a=wavePoint(f32(i)/24.,t);let b=wavePoint(f32(i+1u)/24.,t);let tangent=b-a;
  let local=clamp(dot(p-a,tangent)/max(dot(tangent,tangent),.00001),0.,1.);let closest=a+tangent*local;let d=length(p-closest);
  if(d<distance){distance=d;along=(f32(i)+local)/24.;normal=normalize(vec2f(-tangent.y,tangent.x));center=closest;}
 }
 let front=smoothstep(.02,.76,t);let drained=smoothstep(.85,1.50,t)*.89;
 let fed=1.-smoothstep(front-.08,front+.035,along);let received=smoothstep(drained-.12,drained+.035,along);
 let life=smoothstep(0.,.065,t)*(1.-smoothstep(1.40,1.60,t));
 let halfWidth=(.113+.043*sin(3.141593*along))*mix(1.,.49,smoothstep(1.30,1.60,t));
 // 端点では法線投影だけでなく最短距離を使い、接線方向への無限な帯を防ぐ。
 let signedDistance=select(-distance,distance,dot(p-center,normal)>=0.);
 let cross=signedDistance/halfWidth;let aa=1.2/(halfWidth*h);
 let surface=1.-smoothstep(1.-aa,1.+aa,abs(cross));let thickness=sqrt(max(0.,1.-cross*cross));
 let rim=exp(-pow((cross+.34)/.22,2.));let transportPeak=exp(-pow((along-front+.03)/.10,2.));
 // 腰を横断する中間面は奥へ。体外の厚い面/前縁だけを先に読む。
 let behind=select(0.,.94,along>.30&&along<.72);let occlusion=1.-bodyAlpha*behind;
 let fill=fed*received*life*occlusion;
 return Ribbon(surface*thickness*fill, surface*(thickness*.29+transportPeak*.34)*fill,exp(-pow(distance/(halfWidth*1.45),2.))*fill*.085, surface*rim*(.21+transportPeak*.96)*fill);
}
fn segment(p:vec2f,a:vec2f,b:vec2f,width:f32,h:f32)->vec3f{
 let d=b-a;let s=clamp(dot(p-a,d)/max(dot(d,d),.00001),0.,1.);let dist=length(p-(a+d*s));let half=width*mix(1.,.68,s);
 let density=1.-smoothstep(half-1./h,half+1./h,dist);let core=exp(-pow(dist/(half*.45),2.));return vec3f(density,core,s);
}
struct Effect{material:vec4f,emission:vec3f};
fn effect(s:Scene)->Effect{
 let p=s.p;let t=s.ms*.001;if(t<=0.||t>=1.60||abs(p.x)>.70||p.y<.29||p.y>1.20){return Effect(vec4f(0.),vec3f(0.));}
 let alpha=actor(p).a;let main=ribbon(p,t,alpha,s.h);var density=main.density;var light=main.emission;var nearLight=main.near;var receivedLight=0.;var crest=main.crest;var glints=0.;
 for(var i:u32=0u;i<4u;i++){
  let side=select(-1.,1.,i%2u==1u);let hands=i>=2u;let begin=select(.39,.61,hands);let arrival=select(.57,.83,hands);
  let front=smoothstep(begin,arrival,t);let accept=smoothstep(arrival,1.30,t);let duration=1.-smoothstep(1.34,1.60,t);
  let source=vec2f(side*mix(.38,.24,accept),select(.80,.61,hands));let destination=vec2f(side*select(.10,.21,hands),select(.968,.555,hands));
  let head=mix(source,destination,front);let width=select(.069,.059,hands)*mix(1.,.65,accept);
  let field=segment(p,mix(source,destination,accept*.70),head,width,s.h);let gain=smoothstep(begin,begin+.09,t)*duration;
  let back=select(1.,1.-alpha*.75,front<.7);
  density+=field.x*gain*.38*back;light+=field.x*gain*.24*back;crest+=field.y*gain*.65*back;receivedLight+=field.x*gain*.11*alpha;nearLight+=field.x*gain*.025;
  let flash=env(arrival-.11,arrival-.025,arrival+.15,arrival+.32,t);
  let contactSource=segment(destination,mix(source,destination,accept*.70),head,width,s.h).x*gain;
  glints+=star(p,destination+vec2f(side*(width+2.8/s.h),-.015),s.h)*flash*contactSource;
 }
 let sourceFront=smoothstep(.02,.76,t);let sourceDrain=smoothstep(.85,1.50,t)*.89;
 let sourceGate=(1.-smoothstep(sourceFront-.08,sourceFront+.035,.08))*smoothstep(sourceDrain-.12,sourceDrain+.035,.08)*smoothstep(0.,.065,t)*(1.-smoothstep(1.40,1.60,t));
 glints+=star(p,wavePoint(.08,t)+vec2f(.07,-.012),s.h)*env(.06,.15,.28,.40,t)*sourceGate;
 let opacity=min(.32,density*.14);let amber=vec3f(.91,.41,.075);
 let bodyRadiance=vec3f(1.,.66,.23)*light*.83+vec3f(1.,.94,.77)*crest;
 let localOptics=vec3f(.72,.28,.035)*nearLight*s.obs;
 let sparkle=vec3f(1.,.94,.72)*glints*.85*s.stars*s.obs;
 return Effect(vec4f(amber*opacity,opacity),bodyRadiance+vec3f(.9,.70,.30)*receivedLight+localOptics+sparkle);
}
@fragment fn fsMaterial(@builtin(position) pos:vec4f)->@location(0) vec4f{return effect(scene(pos.xy)).material;}
@fragment fn fsLight(@builtin(position) pos:vec4f)->@location(0) vec4f{return vec4f(effect(scene(pos.xy)).emission,0.);}
`;
