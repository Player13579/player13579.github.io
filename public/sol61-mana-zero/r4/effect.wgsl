struct Params{size:vec2f,time:f32,stars:f32,obs:f32,actor:f32,light:f32,reduced:f32,source:f32};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
struct Out{@builtin(position) p:vec4f};
@vertex fn vs(@builtin(vertex_index) n:u32)->Out{let triangle=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var result:Out;result.p=vec4f(triangle[n],0,1);return result;}
fn ease(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn envelope(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return ease(a,b,t)*(1-ease(c,d,t));}
// An open, doubly curved optical front develops on the recipient.
// The spatial support remains fixed; its intake crease advances across that support.
fn phaseAt(t:f32)->f32{return ease(.18,1.02,t);}
fn frontAt(y:f32,t:f32)->f32{return 15.5-16.5*phaseAt(t)+4.2*sin((y-1.0)/8.8);}
fn receivingDistance(point:vec3f,t:f32)->f32{
 let phase=phaseAt(t);let transverse=point.x-frontAt(point.y,t);
 let halfHeight=mix(10.0,17.0,ease(.08,.56,t));
 let halfWidth=mix(3.6,4.8,phase);
 let depth=3.4-.034*point.y*point.y+.115*transverse*transverse;
 let zDistance=(abs(point.z-depth)-1.15)*.55;
 let support=max(abs(transverse)-halfWidth,abs(point.y+1.0)-halfHeight);
 return max(zDistance,support);
}
fn normalAt(p:vec3f,t:f32)->vec3f{let e=.12;return normalize(vec3f(receivingDistance(p+vec3f(e,0,0),t)-receivingDistance(p-vec3f(e,0,0),t),receivingDistance(p+vec3f(0,e,0),t)-receivingDistance(p-vec3f(0,e,0),t),receivingDistance(p+vec3f(0,0,e),t)-receivingDistance(p-vec3f(0,0,e),t)));}
fn benefitStar(q:vec2f,center:vec2f,life:f32,size:f32)->vec3f{
 let v=q-center;let r=vec2f(dot(v,vec2f(.8571673,.5150381)),dot(v,vec2f(-.5150381,.8571673)));
 let rays=exp(-abs(r.x)/size-pow(r.y/.45,2.0))+exp(-abs(r.y)/(size*.70)-pow(r.x/.45,2.0));
 let core=exp(-dot(v,v)/1.1);let nearby=exp(-dot(v,v)/(size*size*.5));return life*(vec3f(1.30,1.52,1.13)*(rays+core)+vec3f(.11,.33,.19)*nearby*u.obs);
}
@fragment fn fs(v:Out)->@location(0) vec4f{
 let screen=v.p.xy;let q=screen-vec2f(128,66);let t=u.time;
 var rgb=mix(vec3f(.045,.055,.085),vec3f(.84,.86,.88),u.light);
 let xy=(screen-vec2f(91.1,27))/73.8;var actor=vec4f(0);
 if(all(xy>=vec2f(0))&&all(xy<=vec2f(1))){actor=textureSampleLevel(actorTex,actorSampler,xy*vec2f(1.0/3.0,.5),0);}
 rgb=mix(rgb,actor.rgb,actor.a*u.actor);
 if(u.source<.5 || t<=0 || t>=1.7){return vec4f(rgb,1);}
 let life=envelope(t,0,.09,1.37,1.7);let phase=phaseAt(t);let hue=mix(vec3f(.075,.54,.40),vec3f(.10,.82,.60),phase);
 if(q.x> -11 && q.x<28 && q.y> -20 && q.y<20){
  var z=10.0;var hit=false;var closest=100.0;
  for(var iteration=0u;iteration<60u;iteration++){let d=receivingDistance(vec3f(q,z),t);closest=min(closest,d);if(d<.025){hit=true;break;}z-=max(d*.8,.06);if(z< -10.0){break;}}
  let endFade=1.0-ease(mix(8.0,14.0,ease(.08,.56,t)),mix(10.0,17.0,ease(.08,.56,t)),abs(q.y+1.0));
  let recipientRegistration=mix(actor.a,1.0,ease(7,12,q.x));
  let bodyRespect=mix(.65,1.0,recipientRegistration);
  let glow=exp(-max(closest,0.0)*max(closest,0.0)/8.0)*.13*life*endFade*u.obs;
  rgb+=hue*glow*bodyRespect;
  if(hit){
   let point=vec3f(q,z);let normal=normalAt(point,t);let transverse=q.x-frontAt(q.y,t);
   let facing=max(dot(normal,normalize(vec3f(-.34,-.47,.81))),0.0);
   let fold=exp(-pow((transverse+.8)/1.9,2.0));
   let broadFace=.60+.40*facing;
   let field=hue*broadFace+vec3f(.90,1.22,1.06)*fold*.95;
   // Light develops across a fixed open support, rather than a transported solid object.
   let coverage=.19*life*endFade*bodyRespect;
   rgb=mix(rgb,field,coverage)+field*.65*life*endFade*bodyRespect;
  }
 }
 if(u.stars>.5){
  rgb+=benefitStar(q,vec2f(frontAt(3,t),3),envelope(t,.04,.12,.25,.34),4.3);
  rgb+=benefitStar(q,vec2f(frontAt(-7,t),-7),envelope(t,.51,.63,.76,.87),4.4);
  rgb+=benefitStar(q,vec2f(frontAt(5,t),5),envelope(t,1.00,1.12,1.28,1.41),4.8);
 }
 return vec4f(rgb,1);
}
