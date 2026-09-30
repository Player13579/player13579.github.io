struct Params{size:vec2f,time:f32,stars:f32,obs:f32,actor:f32,light:f32,reduced:f32,source:f32};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
struct Out{@builtin(position) p:vec4f};
@vertex fn vs(@builtin(vertex_index) n:u32)->Out{let triangle=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var result:Out;result.p=vec4f(triangle[n],0,1);return result;}
fn ease(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn capsule(point:vec3f,a:vec3f,b:vec3f,r:f32)->f32{let edge=b-a;let coordinate=clamp(dot(point-a,edge)/dot(edge,edge),0,1);return length(point-a-edge*coordinate)-r;}
// One smooth analytic optical receiving volume; no sampled sheet or static filled plate.
fn ellipsoid(q:vec3f,r:vec3f)->f32{return (length(q/r)-1.0)*min(r.x,min(r.y,r.z));}
fn receivingDistance(point:vec3f,t:f32)->f32{
 let phase=ease(.18,1.02,t);let center=vec3f(25-19.5*phase,4.5-7.5*phase,0);let radii=vec3f(11-3*phase,8-1.3*phase,7-phase);
 let bulk=ellipsoid(point-center,radii);
 let crease=ellipsoid(point-center-vec3f(4,0,7),vec3f(5,9,3.5));
 let shaped=max(bulk,-crease);
 let throat=capsule(point,vec3f(13,3,2),center,3.2);
 let blend=clamp(.5+.5*(throat-shaped)/2.8,0,1);
 return mix(throat,shaped,blend)-2.8*blend*(1-blend);
}
fn normalAt(p:vec3f,t:f32)->vec3f{let e=.12;return normalize(vec3f(receivingDistance(p+vec3f(e,0,0),t)-receivingDistance(p-vec3f(e,0,0),t),receivingDistance(p+vec3f(0,e,0),t)-receivingDistance(p-vec3f(0,e,0),t),receivingDistance(p+vec3f(0,0,e),t)-receivingDistance(p-vec3f(0,0,e),t)));}
fn benefitStar(q:vec2f,center:vec2f,life:f32,size:f32)->vec3f{
 let v=q-center;let r=vec2f(dot(v,vec2f(.8571673,.5150381)),dot(v,vec2f(-.5150381,.8571673)));
 let rays=exp(-abs(r.x)/size-pow(r.y/.45,2.0))+exp(-abs(r.y)/(size*.70)-pow(r.x/.45,2.0));
 let core=exp(-dot(v,v)/1.1);let nearby=exp(-dot(v,v)/(size*size*.5));return life*(vec3f(1.30,1.52,1.13)*(rays+core)+vec3f(.11,.33,.19)*nearby*u.obs);
}
fn envelope(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return ease(a,b,t)*(1-ease(c,d,t));}
@fragment fn fs(v:Out)->@location(0) vec4f{
 let screen=v.p.xy;let q=screen-vec2f(128,66);let t=u.time;
 var rgb=mix(vec3f(.045,.055,.085),vec3f(.84,.86,.88),u.light);
 let xy=(screen-vec2f(91.1,27))/73.8;var actor=vec4f(0);
 if(all(xy>=vec2f(0))&&all(xy<=vec2f(1))){actor=textureSampleLevel(actorTex,actorSampler,xy*vec2f(1.0/3.0,.5),0);}
 rgb=mix(rgb,actor.rgb,actor.a*u.actor);
 if(u.source<.5 || t<=0 || t>=1.7){return vec4f(rgb,1);}
 let life=envelope(t,0,.09,1.37,1.7);let phase=ease(.18,1.02,t);let hue=mix(vec3f(.075,.54,.40),vec3f(.10,.82,.60),phase);
 if(q.x> -10 && q.x<44 && q.y> -13 && q.y<25){
  var z=10.0;var hit=false;var closest=100.0;
  for(var iteration=0u;iteration<42u;iteration++){let d=receivingDistance(vec3f(q,z),t);closest=min(closest,d);if(d<.025){hit=true;break;}z-=max(d*.83,.065);if(z< -8.0){break;}}
  // source-bound observation glow follows the actual receiving volume, not a uniform clothing mask.
  let glow=exp(-max(closest,0.0)*max(closest,0.0)/7.0)*.12*life*u.obs;
  rgb+=hue*glow;
  if(hit){let point=vec3f(q,z);let normal=normalAt(point,t);let facing=max(dot(normal,normalize(vec3f(-.34,-.47,.81))),0.0);let silhouette=.58+.42*max(normal.z,0.0);
   let center=vec2f(25-19.5*phase,4.5-7.5*phase);let inside=point.xy-center;
   let ridge=exp(-pow((inside.y+2.0)/3.0,2.0)-pow((inside.x-1.0)/5.4,2.0))*max(normal.z,0.0);
   let field=hue*(.39+.63*facing)+vec3f(.77,1.10,.92)*ridge*.78;
   // Intake throat is visible at the actual wrist, torso part respects existing actor alpha.
   let bodyMask=mix(actor.a,1.0,ease(5,10,q.x));let coverage=.50*silhouette*life*bodyMask;
   rgb=mix(rgb,field,coverage)+field*.62*life*bodyMask;
  }
 }
 if(u.stars>.5){rgb+=benefitStar(q,vec2f(14,2),envelope(t,.04,.12,.25,.34),4.3);rgb+=benefitStar(q,vec2f(13,3),envelope(t,.51,.63,.76,.87),4.4);rgb+=benefitStar(q,vec2f(25-19.5*phase,4.5-7.5*phase),envelope(t,1.00,1.12,1.28,1.41),4.8);}
 return vec4f(rgb,1);
}

