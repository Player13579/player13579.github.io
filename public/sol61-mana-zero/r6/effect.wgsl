struct Params{size:vec2f,time:f32,stars:f32,obs:f32,actor:f32,light:f32,reduced:f32,source:f32};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
struct Out{@builtin(position) p:vec4f};
@vertex fn vs(@builtin(vertex_index) n:u32)->Out{let triangle=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var result:Out;result.p=vec4f(triangle[n],0,1);return result;}
fn ease(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn envelope(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return ease(a,b,t)*(1-ease(c,d,t));}
fn phaseAt(t:f32)->f32{return ease(.12,1.02,t);}
// One recipient-born refocusing volume. Two broad overlapping lobes share the same source.
fn densityAt(point:vec3f,t:f32)->f32{
 let phase=phaseAt(t);
 let right=point-vec3f(8,0,0);
 let left=point-vec3f(-4,-4,1);
 let r=vec3f(right.x/12.0,(right.y+.35*right.x)/13.0,right.z/7.0);
 let l=vec3f(left.x/(10+8*phase),(left.y-.24*left.x)/12.0,(left.z+.15*left.x)/7.0);
 let radialRight=dot(r,r);let radialLeft=dot(l,l);
 let dR=pow(max(1-radialRight,0.0),1.35);
 let dL=pow(max(1-radialLeft,0.0),1.35)*(.46+.54*phase);
 // Smooth union avoids two detached objects or additive overlap seams.
 return 1-(1-dR)*(1-dL);
}
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
 let life=envelope(t,0,.09,1.37,1.7);let phase=phaseAt(t);
 if(q.x> -26 && q.x<24 && q.y> -19 && q.y<18){
  var integrated=vec3f(0);var opticalDepth=0.0;
  let frontX=13.0-21.0*phase;
  let crest=ease(frontX-8,frontX-1,q.x)*(1-ease(frontX+3,frontX+10,q.x));
  let settled=ease(.42,1.02,t)*(1-ease(-14,-7,q.x));
  for(var step=0u;step<28u;step++){
   let z=10-f32(step)*.8;let point=vec3f(q,z);let density=densityAt(point,t);
   let saddle=3.1-.030*q.x*q.x+.045*q.y*q.y;
   let depthFocus=exp(-pow((z-saddle)/2.5,2.0));
   let causticY=-4.5+.026*q.x*q.x;
   let upper=exp(-pow((q.y-causticY)/3.9,2.0));
   let lower=exp(-pow((q.y-causticY-6.0)/4.7,2.0))*.53;
   let broadWhite=(upper+lower)*depthFocus*density;
   let receiving=.26+.66*crest+.36*settled;
   let hue=mix(vec3f(.035,.095,.34),vec3f(.05,.44,.72),ease(-16,16,q.x));
   integrated+=(hue*density*.27+vec3f(.63,.93,1.19)*broadWhite*.76)*receiving*.12;
   opticalDepth+=density*.067;
  }
  // Recipient response extends outside the original silhouette; no actor-shaped clothing fill.
  let coverage=(1-exp(-opticalDepth))*.36*life;
  rgb=mix(rgb,integrated*.78,coverage)+integrated*1.02*life;
  rgb+=vec3f(.045,.18,.31)*opticalDepth*.12*life*u.obs;
 }
 if(u.stars>.5){rgb+=benefitStar(q,vec2f(13,3),envelope(t,.04,.12,.25,.34),4.3);rgb+=benefitStar(q,vec2f(0,-4),envelope(t,.51,.63,.76,.87),4.4);rgb+=benefitStar(q,vec2f(-10,-7),envelope(t,1.00,1.12,1.28,1.41),4.8);}
 return vec4f(rgb,1);
}
