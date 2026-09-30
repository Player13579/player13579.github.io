// GPT-6.1-Sol r1. Work in linear color. HDR premultiplied emission + coverage.
struct U { view:vec4f, time:vec4f, actorRect:vec4f, atlasUv:vec4f, flags:vec4f, layers:vec4f, spare0:vec4f,spare1:vec4f,spare2:vec4f,spare3:vec4f,spare4:vec4f,spare5:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
struct V { @builtin(position) clip:vec4f,@location(0) p:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
  let xy=array<vec2f,6>(vec2f(-.65,-1.12),vec2f(.85,-1.12),vec2f(-.65,.12),vec2f(-.65,.12),vec2f(.85,-1.12),vec2f(.85,.12));
  let p=xy[i];let pixel=u.view.zw+p*u.time.x;
  var o:V;o.clip=vec4f(pixel.x/u.view.x*2.-1.,1.-pixel.y/u.view.y*2.,0.,1.);o.p=p;return o;
}
fn ss(a:f32,b:f32,x:f32)->f32 {let q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
fn actorAlpha(p:vec2f)->f32 {
  let uv=(p-u.actorRect.xy)/(u.actorRect.zw-u.actorRect.xy);
  if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return 0.;}
  return textureSampleLevel(actorTex,actorSampler,mix(u.atlasUv.xy,u.atlasUv.zw,uv),0.).a;
}
fn gauss(p:vec2f,center:vec2f,width:vec2f)->f32 {let q=(p-center)/width;return exp(-dot(q,q));}
@fragment fn fs(v:V)->@location(0) vec4f {
  if(u.time.z<.5||u.time.y<0.||u.time.y>=1.){return vec4f(0.);}
  let t=u.time.y;let p=v.p;
  let gate=ss(0.,.045,t)*(1.-ss(.88,1.,t));
  let opening=ss(.055,.36,t)*(1.-.25*ss(.72,.88,t));
  let r=clamp((p.y+.82)/.66,0.,1.);let a=sin(3.14159265359*r);
  let center=.13+.29*a*(.34+.66*opening)-.025*r;
  let width=.035+.115*a*(.25+.75*opening);
  let edge=abs(p.x-center)-width;
  let band=(1.-ss(-.005,.012,edge))*ss(-.84,-.80,p.y)*(1.-ss(-.18,-.14,p.y));
  let lead=ss(r-.08,r+.06,ss(0.,.36,t));
  let main=band*lead*gate*u.flags.z;
  let fold=exp(-pow((p.x-center-width*.36)/.024,2.))*main;
  let sourceEnv=ss(0.,.035,t)*(1.-.60*ss(.40,.76,t))*(1.-ss(.88,1.,t));
  let source=gauss(p,vec2f(.13,-.79),vec2f(.042))*sourceEnv*u.flags.x;
  // Projected atlas alpha is actual actor registration, not a surrogate body ellipse.
  let actor=actorAlpha(p);
  let faceProtect=1.-gauss(p,vec2f(0.,-.79),vec2f(.145,.12));
  let reception=gauss(p,vec2f(.17,-.45),vec2f(.17,.24))*ss(.27,.49,t)*(1.-ss(.82,1.,t))*actor*faceProtect*u.flags.w;
  var star=0.;
  let centers=array<vec2f,3>(vec2f(.15,-.77),vec2f(.40,-.50),vec2f(.29,-.29));
  let onset=array<f32,3>(.045,.30,.51);
  for(var k=0u;k<3u;k=k+1u){
    let d=p-centers[k];let c=.9238795325;let s=.3826834324;
    let q=vec2f(c*d.x+s*d.y,-s*d.x+c*d.y);
    let env=ss(onset[k],onset[k]+.025,t)*(1.-ss(onset[k]+.11,onset[k]+.18,t))*gate;
    star+=env*(exp(-pow(q.x/.042,2.)-pow(q.y/.007,2.))+exp(-pow(q.y/.032,2.)-pow(q.x/.007,2.)));
  }
  star*=u.layers.x;
  // 0=back / 1=front. Main folds turn around actual silhouette; reception only front.
  let front=ss(-.055,.04,p.x-center);let back=1.-front;
  var visibility=front*faceProtect;var body=1.;
  if(u.flags.y<.5){visibility=back*(1.-actor);body=0.;}
  let density=main*(.30+.44*a);let coverage=(.12*density+.12*fold)*visibility;
  let hue=mix(vec3f(.055,.34,.72),vec3f(.28,.82,.96),ss(.08,.86,r));
  let emission=hue*(1.35*main+1.7*fold)*visibility+(vec3f(3.4,3.65,3.7)*source+vec3f(2.6,3.0,3.15)*star)*faceProtect*body;
  let response=vec3f(.12,.58,.70)*reception*.88*body;
  // Alpha zero outer boundary has RGB exactly zero; emission is not alpha-multiplied twice.
  let rgb=emission+response;
  return vec4f(rgb,clamp(coverage+.16*reception*body,0.,1.));
}
