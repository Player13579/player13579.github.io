struct Params{size:vec2f,time:f32,stars:f32,obs:f32,actor:f32,light:f32,reduced:f32,source:f32};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
struct Out{@builtin(position) p:vec4f};
@vertex fn vs(@builtin(vertex_index) n:u32)->Out{let triangle=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var result:Out;result.p=vec4f(triangle[n],0,1);return result;}
fn ease(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn envelope(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return ease(a,b,t)*(1-ease(c,d,t));}
// Continuous receiver-local intake arch, not transported packets or a thin surface.
fn centerAt(s:f32)->vec3f{let a=vec3f(29,9,-1);let b=vec3f(15,2,4);let c=vec3f(-3,-4,1);return (1-s)*(1-s)*a+2*s*(1-s)*b+s*s*c;}
fn tangentAt(s:f32)->vec2f{return 2*(1-s)*vec2f(-14,-7)+2*s*vec2f(-18,-6);}
fn closestAt(q:vec2f)->f32{
 var s=clamp(dot(q-vec2f(29,9),vec2f(-32,-13))/1193.0,0,1);
 for(var i=0u;i<7u;i++){let c=centerAt(s).xy;let d=tangentAt(s);let dd=vec2f(-8,2);let denom=dot(d,d)+dot(c-q,dd);s=clamp(s-dot(c-q,d)/max(denom,80.0),0,1);}return s;
}
fn widthAt(s:f32,t:f32)->f32{
 let waist=exp(-pow((s-.51)/.18,2.0));
 let inner= ease(.55,.95,s)*ease(.20,1.04,t);
 return 8.3-3.0*waist+5.0*inner;
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
 let life=envelope(t,0,.09,1.37,1.7);let phase=ease(.14,1.02,t);
 if(q.x> -19 && q.x<41 && q.y> -19 && q.y<22){
  let s=closestAt(q);let center=centerAt(s);let direction=normalize(tangentAt(s));let transverse=dot(q-center.xy,vec2f(-direction.y,direction.x));
  let r=widthAt(s,t);let endMask=ease(0,.11,s)*(1-ease(.91,1,s));
  let tipDistance=length(q-center.xy);
  let support=max(abs(transverse),tipDistance*mix(1.0,0.0,ease(.01,.05,s)*(1-ease(.95,.99,s))));
  var integrated=vec3f(0);var opticalDepth=0.0;
  let front=.05+.80*phase;
  for(var step=0u;step<28u;step++){
   let z=10.0-f32(step)*.8;let depth=(z-center.z)/6.8;
   let radial=sqrt(pow(support/r,2.0)+depth*depth);
   let density=pow(max(1.0-radial*radial,0.0),1.6)*endMask;
   let flowing=.23+.77*(1-ease(front-.12,front+.24,s));
   let intakeRidge=exp(-pow((radial-.66)/.18,2.0))*density;
   let innerResponse=ease(.53,.91,s)*ease(.27,1.05,t);
   // Two broad coherent caustic lobes, kept inside the same receiving volume.
   let fan=exp(-pow((transverse/r-.38)/.32,2.0))+exp(-pow((transverse/r+.38)/.32,2.0));
   let broadWhite=(.18+.36*innerResponse)*fan*density;
   let hue=mix(vec3f(.045,.16,.50),vec3f(.10,.72,.92),s);
   integrated+=(hue*(density*.14+intakeRidge*.33)+vec3f(.68,1.05,1.21)*broadWhite)*flowing*.115;
   opticalDepth+=density*.055;
  }
  let recipientRespect=mix(.70,1.0,mix(actor.a,1.0,ease(8,13,q.x)));
  let coverage=(1-exp(-opticalDepth))*.28*life*recipientRespect;
  rgb=mix(rgb,integrated*.8,coverage)+integrated*1.50*life*recipientRespect;
  // Observation halo is tied to the broad volume's actual optical density.
  rgb+=vec3f(.035,.20,.34)*opticalDepth*.16*life*u.obs*recipientRespect;
 }
 if(u.stars>.5){rgb+=benefitStar(q,centerAt(.42).xy,envelope(t,.04,.12,.25,.34),4.3);rgb+=benefitStar(q,centerAt(.63).xy,envelope(t,.51,.63,.76,.87),4.4);rgb+=benefitStar(q,centerAt(.82).xy,envelope(t,1.00,1.12,1.28,1.41),4.8);}
 return vec4f(rgb,1);
}
