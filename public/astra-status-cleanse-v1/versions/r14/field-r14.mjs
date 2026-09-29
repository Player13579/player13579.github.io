// Astra r14: four angular adherent plates, explicit side faces, advancing fracture contact and body response.
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
fn plateDistance(p:vec2f,points:array<vec2f,6>)->f32 {
 var d=10.;var inside=false;
 for(var i=0;i<6;i++){
  let a=points[i];let b=points[(i+1)%6];
  d=min(d,segmentDistance(p,a,b));
  if((a.y>p.y)!=(b.y>p.y)){
   if(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x){inside=!inside;}
  }
 }
 return select(d,-d,inside);
}
fn platePoints(t0:f32,t1:f32,side:f32,r:f32)->array<vec2f,6> {
 let mid=(t0+t1)*.5;let a=bindingPoint(t0,side,r);let b=bindingPoint(t1,side,r);let c=bindingPoint(mid,side,r);
 let tangent=normalize(b-a);let normal=vec2f(-tangent.y,tangent.x);
 let release=max(0.,r-mid);let w=.105*(.38+.62*abs(cos(release*5.3)));
 return array<vec2f,6>(a-normal*w*.35,a+normal*w*.62,c+normal*w,b+normal*w*.45,b-normal*w*.77,c-normal*w*.89);
}
@fragment fn fs(@builtin(position) pix:vec4f)->@location(0) vec4f {
 let bg=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),u.light);
 let uv=(pix.xy-u.center)/u.height;let p=u.phase;
 if(abs(uv.x)>1.20||abs(uv.y)>1.20){return vec4f(bg,1.);}
 let spr=actorSample(uv);
 if(p<0.||p>=1.){return vec4f(mix(bg,spr.rgb,spr.a),1.);}
 let aa=max(.005,.70/u.height);
 var rear=bg;var front=vec3f(0.);var frontA=0.;var receiver=vec3f(0.);
 for(var n=0;n<2;n++){
  let side=select(-1.,1.,n==1);let start=select(.10,.22,n==1);let finish=select(.73,.85,n==1);let r=ease(start,finish,p);
  let fade=1.-ease(.84,1.,r);
  // Two broad irregular plates per binding. Thin connecting adhesion stays subordinate.
  for(var k=0;k<2;k++){
   let t0=select(.0,.49,k==1);let t1=select(.54,1.,k==1);let mid=(t0+t1)*.5;
   let points=platePoints(t0,t1,side,r);let d=plateDistance(uv,points);
   let released=max(0.,r-mid);let roll=ease(.015,.25,released);
   let thick=vec2f(side*.030,.026)*(1.-roll*.25);
   let ds=plateDistance(uv-thick,points);
   let surface=(1.-ease(-aa,aa,d))*fade*(1.-face(uv));
   let sideAlpha=(1.-ease(-aa,aa,ds))*fade*(1.-face(uv));
   let center=bindingPoint(mid,side,r);let axis=normalize(points[3]-points[0]);let normal=vec2f(-axis.y,axis.x);
   let across=dot(uv-center,normal);
   let facet=ease(-.009,.009,across+dot(uv-center,axis)*.27);
   let bevel=1.-ease(-.030,-.012,d);
   var material=mix(vec3f(.44,.29,.49),vec3f(.17,.075,.23),facet);
   material=mix(material,vec3f(.105,.04,.15),bevel*.73);
   material=mix(material,vec3f(.22,.16,.27),roll*.6);
   let contact=bindingPoint(r,side,r);
   let breaking=exp(-pow(length(uv-contact)/.064,2.))*ease(.01,.10,r)*(1.-ease(.86,1.,r));
   material+=vec3f(.59,.45,.56)*breaking*bevel;
   let coverage=max(surface,sideAlpha);
   let color=mix(vec3f(.065,.022,.105),material,surface/max(.001,coverage));
   let behind=select(0.,roll,n==1);
   rear=mix(rear,color,coverage*behind);
   let fa=coverage*(1.-behind);front=front*(1.-fa)+color*fa;frontA=frontA+(1.-frontA)*fa;
  }
  let contact=bindingPoint(r,side,r);
  let contactGlow=exp(-pow(length(uv-contact)/.115,2.))*ease(.01,.1,r)*(1.-ease(.84,1.,r));
  receiver+=vec3f(1.10,.89,.51)*contactGlow*bodyZone(uv);
 }
 let pulseRadius=.05+.56*ease(.34,.83,p);
 let wave=exp(-pow((length((uv-vec2f(0.,.12))*vec2f(1.,.86))-pulseRadius)/.065,2.))*ease(.32,.48,p)*(1.-ease(.73,.88,p));
 receiver+=vec3f(.78,.64,.36)*wave*bodyZone(uv);
 var color=mix(rear,spr.rgb+receiver,spr.a);color=color*(1.-frontA)+front;
 let step=1.8/u.height;
 let expanded=max(max(actorSample(uv+vec2f(step,0.)).a,actorSample(uv-vec2f(step,0.)).a),max(actorSample(uv+vec2f(0.,step)).a,actorSample(uv-vec2f(0.,step)).a));
 let rim=max(0.,expanded-spr.a)*bodyZone(uv);
 color+=vec3f(.72,.57,.29)*rim*ease(.48,.66,p)*(1.-ease(.72,.89,p));
 return vec4f(color,1.);
}`;
