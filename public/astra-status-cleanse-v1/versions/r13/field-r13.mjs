// Astra r13: irregular flattened adherent plates with thickness, fractures and twisted release.
export const shader=/*wgsl*/`
struct Uniforms { viewport:vec2f, center:vec2f, height:f32, phase:f32, light:f32, reduced:f32 };
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(v[i],0.,1.);
}
fn ease(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn actorSample(uv:vec2f)->vec4f {
 let xy=uv*116.+vec2f(63.5,63.5);
 if(any(xy<vec2f(0.))||any(xy>=vec2f(128.))){return vec4f(0.);}
 return textureSampleLevel(actor,samp,xy/vec2f(2560.,1536.),0.);
}
fn face(uv:vec2f)->f32 {
 return (1.-ease(.13,.23,abs(uv.x)))*ease(-.44,-.32,uv.y)*(1.-ease(-.02,.085,uv.y));
}
fn bodyZone(uv:vec2f)->f32{return ease(-.19,-.12,uv.y)*(1.-ease(.43,.51,uv.y))*(1.-face(uv));}
// The affliction is two thick thorn-bearing bindings, never a cloth silhouette.
fn segmentDistance(p:vec2f,a:vec2f,b:vec2f)->f32 {
 let v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(.00001,dot(v,v)),0.,1.));
}
fn bindingPoint(t:f32,side:f32,r:f32)->vec2f {
 let original=vec2f(side*(.27-.43*t+.065*sin(t*5.7)), -.11+.53*t);
 let root=vec2f(side*(.27-.43*r+.065*sin(r*5.7)), -.11+.53*r);
 let released=max(0.,r-t);
 let bend=1.-exp(-released*6.);
 let angle=side*1.95*bend*(1.-.35*u.reduced);
 let d=original-root;
 // The contact point remains exactly on its original body position.
 let turned=vec2f(cos(angle)*d.x-sin(angle)*d.y,sin(angle)*d.x+cos(angle)*d.y);
 return root+turned+vec2f(side*.34*bend*released*(1.-.45*u.reduced),-.12*bend*released*(1.-.45*u.reduced));
}
@fragment fn fs(@builtin(position) pix:vec4f)->@location(0) vec4f {
 let bg=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),u.light);
 let uv=(pix.xy-u.center)/u.height;let p=u.phase;
 let spr=actorSample(uv);
 if(p<0.||p>=1.){return vec4f(mix(bg,spr.rgb,spr.a),1.);}
 let aa=max(.007,1./u.height);
 var rear=bg;var front=vec3f(0.);var frontA=0.;var receiver=vec3f(0.);
 for(var n=0;n<2;n++){
  let side=select(-1.,1.,n==1);let start=select(.12,.23,n==1);let finish=select(.73,.84,n==1);
  let r=ease(start,finish,p);
  var distance=10.;var thicknessDistance=10.;var nearestT=0.;var lateral=0.;var widthAtPoint=.05;
  for(var k=0;k<20;k++){
   let t=f32(k)/20.;let tn=f32(k+1)/20.;
   let a=bindingPoint(t,side,r);let b=bindingPoint(tn,side,r);
   let axis=b-a;let q=clamp(dot(uv-a,axis)/max(.00001,dot(axis,axis)),0.,1.);
   let tt=mix(t,tn,q);let released=max(0.,r-tt);
   // Broad attached plates and narrow bridges form one irregular continuous mass.
   let plate=pow(abs(sin((tt+.075)*8.4)),3.);
   let taper=ease(-.06,.08,tt)*(1.-ease(.90,1.04,tt));
   let twist=cos(released*5.2);
   let width=(.025+.067*plate)*taper*(.34+.66*abs(twist));
   let d=segmentDistance(uv,a,b)-width;
   if(d<distance){distance=d;nearestT=tt;widthAtPoint=width;lateral=dot(uv-mix(a,b,q),normalize(vec2f(-axis.y,axis.x)));}
   let thickOffset=vec2f(side*.018,.019)*(1.+released);
   thicknessDistance=min(thicknessDistance,segmentDistance(uv,a+thickOffset,b+thickOffset)-width);
  }
  let released=max(0.,r-nearestT);
  let breakPlane=min(abs(nearestT-.30),abs(nearestT-.66));
  let crack=(1.-ease(.009,.023,breakPlane))*ease(.035,.17,released);
  let fade=1.-ease(.84,1.,r);
  let alpha=(1.-ease(-aa,aa,distance))*fade*(1.-face(uv));
  let thickAlpha=(1.-ease(-aa,aa,thicknessDistance))*fade*(1.-face(uv));
  let bevel=1.-ease(.62,1.,abs(lateral)/max(.008,widthAtPoint));
  let facet=ease(-.015,.01,lateral+sin(nearestT*8.4)*.022);
  let underside=ease(.8,2.0,released*5.2);
  var plateColor=mix(vec3f(.30,.17,.37),vec3f(.13,.055,.19),facet);
  plateColor=mix(vec3f(.075,.025,.105),plateColor,bevel);
  plateColor=mix(plateColor,vec3f(.21,.15,.27),underside*.72);
  plateColor*=1.-crack*.84;
  let brokenLip=(1.-ease(.008,.017,breakPlane))*ease(.02,.14,released)*(1.-ease(.36,.58,released));
  plateColor+=vec3f(.43,.29,.45)*brokenLip;
  let color=mix(vec3f(.055,.025,.075),plateColor,alpha/max(.001,thickAlpha+alpha));
  let coverage=max(alpha,thickAlpha);
  let rollBehind=select(0.,ease(.04,.24,released),n==1);
  rear=mix(rear,color,coverage*rollBehind);
  let fa=coverage*(1.-rollBehind);
  front=front*(1.-fa)+color*fa;frontA=frontA+(1.-frontA)*fa;
  let root=bindingPoint(r,side,r);
  let contactGlow=exp(-pow(length(uv-root)/.095,2.))*ease(.02,.1,r)*(1.-ease(.84,1.,r));
  receiver+=vec3f(1.05,.88,.55)*contactGlow*bodyZone(uv);
 }
 // Attached plate casts a tight local shadow. Separation removes it.
 let shadow=frontA*.32*(1.-ease(.27,.65,p));
 let pulseRadius=.05+.55*ease(.34,.83,p);
 let wave=exp(-pow((length((uv-vec2f(0.,.1))*vec2f(1.,.85))-pulseRadius)/.046,2.))*ease(.32,.48,p)*(1.-ease(.73,.88,p));
 receiver+=vec3f(.65,.54,.31)*wave*bodyZone(uv);
 var color=mix(rear,spr.rgb*(1.-shadow)+receiver,spr.a);
 color=color*(1.-frontA)+front;
 // A short restoration trace follows the recovered actor alpha, not a ring.
 let step=1.4/u.height;
 let expanded=max(max(actorSample(uv+vec2f(step,0.)).a,actorSample(uv-vec2f(step,0.)).a),max(actorSample(uv+vec2f(0.,step)).a,actorSample(uv-vec2f(0.,step)).a));
 let rim=max(0.,expanded-spr.a)*bodyZone(uv);
 color+=vec3f(.62,.49,.22)*rim*ease(.50,.67,p)*(1.-ease(.73,.90,p));
 return vec4f(color,1.);
}`;
