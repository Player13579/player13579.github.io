// Astra r12: two asymmetric thorn bindings peel from body contact, revealing the original receiver.
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
 let angle=side*1.95*bend;
 let d=original-root;
 // The contact point remains exactly on its original body position.
 let turned=vec2f(cos(angle)*d.x-sin(angle)*d.y,sin(angle)*d.x+cos(angle)*d.y);
 return root+turned+vec2f(side*.34*bend*released,-.12*bend*released);
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
  var distance=10.;var coreDistance=10.;
  for(var k=0;k<12;k++){
   let t=f32(k)/12.;let tn=f32(k+1)/12.;
   let a=bindingPoint(t,side,r);let b=bindingPoint(tn,side,r);
   let width=.049+.019*sin((t+.2)*3.14);
   distance=min(distance,segmentDistance(uv,a,b)-width);
   coreDistance=min(coreDistance,segmentDistance(uv,a+vec2f(-.013,-.007),b+vec2f(-.013,-.007))-.014);
  }
  // Only three large thorns per binding, readable at H64.
  for(var k=0;k<3;k++){
   let t=.16+f32(k)*.29;
   let a=bindingPoint(t,side,r);
   let tangent=normalize(bindingPoint(t+.015,side,r)-bindingPoint(t-.015,side,r));
   let normal=vec2f(-tangent.y,tangent.x)*side;
   let tip=a+normal*(.115-.018*f32(k));
   for(var j=0;j<4;j++){
    let q=f32(j)/4.;let qn=f32(j+1)/4.;
    distance=min(distance,segmentDistance(uv,mix(a,tip,q),mix(a,tip,qn))-.044*(1.-q));
   }
  }
  let dissolve=1.-ease(.83,1.,r);
  let alpha=(1.-ease(-aa,aa,distance))*dissolve*(1.-face(uv));
  let core=1.-ease(-aa,aa,coreDistance);
  let color=vec3f(.095,.025,.14)+vec3f(.24,.09,.31)*core;
  // Attached portions cross in front of the torso; the released right branch
  // rolls behind the actor while the released left remains in front.
  let releasedSide=select(0.,1.,n==1&&r>.20&&uv.x>.22);
  rear=mix(rear,color,alpha*releasedSide);
  let fa=alpha*(1.-releasedSide);
  front=front*(1.-fa)+color*fa;frontA=frontA+(1.-frontA)*fa;
  let root=bindingPoint(r,side,r);
  let contactGlow=exp(-pow(length(uv-root)/.095,2.))*ease(.02,.1,r)*(1.-ease(.84,1.,r));
  receiver+=vec3f(.90,.76,.40)*contactGlow*bodyZone(uv);
 }
 var color=mix(rear,spr.rgb+receiver,spr.a);
 color=color*(1.-frontA)+front;
 // A short restoration trace follows the recovered actor alpha, not a ring.
 let step=1.4/u.height;
 let expanded=max(max(actorSample(uv+vec2f(step,0.)).a,actorSample(uv-vec2f(step,0.)).a),max(actorSample(uv+vec2f(0.,step)).a,actorSample(uv-vec2f(0.,step)).a));
 let rim=max(0.,expanded-spr.a)*bodyZone(uv);
 color+=vec3f(.62,.49,.22)*rim*ease(.50,.67,p)*(1.-ease(.73,.90,p));
 return vec4f(color,1.);
}`;
