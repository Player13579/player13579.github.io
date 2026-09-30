struct Params{size:vec2f,time:f32,stars:f32,obs:f32,actor:f32,light:f32,reduced:f32,source:f32};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
@group(0) @binding(3) var<storage,read> foldNodes:array<vec4f,49>;
struct Out{@builtin(position) p:vec4f};
@vertex fn vs(@builtin(vertex_index) n:u32)->Out{let triangle=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var result:Out;result.p=vec4f(triangle[n],0,1);return result;}
fn ease(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
// One open concave 3D receiving sheet: broad cross-section, finite edges, real depth.
fn foldDistance(point:vec3f)->f32{
 var distance=1000.0;
 for(var i=0u;i<48u;i++){
  let a=foldNodes[i];let b=foldNodes[i+1u];let edge=b.xyz-a.xyz;let span=length(edge);let tangent=edge/span;
  let normal=normalize(vec3f(0,0,1)-tangent*tangent.z);let across=normalize(cross(normal,tangent));
  let q=point-(a.xyz+b.xyz)*.5;let side=dot(q,across);let face=dot(q,normal)-.060*side*side;
  let thickness=abs(face)-.95;let lateral=abs(side)-(a.w+b.w)*.5;let terminal=abs(dot(q,tangent))-span*.5-.25;
  distance=min(distance,max(thickness,max(lateral,terminal)));
 }
 return distance;
}
fn receivingDistance(point:vec3f,t:f32)->f32{return foldDistance(point);}
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
 let life=envelope(t,0,.09,1.37,1.7);let phase=ease(.12,1.03,t);let hue=mix(vec3f(.075,.54,.40),vec3f(.10,.82,.60),phase);
 if(q.x> -14 && q.x<48 && q.y> -12 && q.y<31){
  var z=13.0;var hit=false;var closest=100.0;
  for(var iteration=0u;iteration<56u;iteration++){let d=receivingDistance(vec3f(q,z),t);closest=min(closest,d);if(d<.025){hit=true;break;}z-=max(d*.55,.065);if(z< -8.0){break;}}
  // source-bound observation glow follows the current open receiving fold, not a uniform clothing mask.
  let glow=exp(-max(closest,0.0)*max(closest,0.0)/7.0)*.12*life*u.obs;
  rgb+=hue*glow;
  if(hit){let point=vec3f(q,z);let normal=normalAt(point,t);let facing=max(dot(normal,normalize(vec3f(-.34,-.47,.81))),0.0);let silhouette=.58+.42*max(normal.z,0.0);
   let wrist=length(point.xy-vec2f(13,3));let leading=exp(-wrist*wrist/22.0)*envelope(t,.22,.48,.91,1.16);
   let fold=pow(max(normal.z,0.0),7.0);let medium=hue*(.39+.63*facing)+vec3f(.72,1.04,.82)*(fold*.55+leading*.55);
   // Intake throat is visible at the actual wrist, torso part respects existing actor alpha.
   let bodyMask=mix(actor.a,1.0,ease(7,12,q.x));let coverage=.50*silhouette*life*bodyMask;
   rgb=mix(rgb,medium,coverage)+medium*.62*life*bodyMask;
  }
 }
 if(u.stars>.5){rgb+=benefitStar(q,vec2f(14,2),envelope(t,.04,.12,.25,.34),4.3);rgb+=benefitStar(q,vec2f(1,6),envelope(t,.51,.63,.76,.87),4.4);rgb+=benefitStar(q,vec2f(-2,13),envelope(t,1.00,1.12,1.28,1.41),4.8);}
 return vec4f(rgb,1);
}

