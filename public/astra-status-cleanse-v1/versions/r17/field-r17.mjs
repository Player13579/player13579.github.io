// Astra r17: positive arrival, body-wide luminous response, source-bound sparse glints.
export const shader=/*wgsl*/`
struct Frame { viewport:vec2f, center:vec2f, height:f32, phase:f32, light:f32, reduced:f32, controls:vec4f };
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let corners=array<vec2f,6>(vec2f(-.75,-.975),vec2f(.75,-.975),vec2f(-.75,.775),vec2f(-.75,.775),vec2f(.75,-.975),vec2f(.75,.775));
 let screen=frame.center+corners[i]*frame.height;
 return vec4f(screen.x/frame.viewport.x*2.-1.,1.-screen.y/frame.viewport.y*2.,0.,1.);
}
fn ease(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn actorAt(q:vec2f)->vec4f {
 let s=q*116.+vec2f(63.5);
 if(any(s<vec2f(0.))||any(s>=vec2f(128.))){return vec4f(0.);}
 return textureSampleLevel(actor,linearSampler,s/vec2f(2560.,1536.),0.);
}
fn faceGuard(q:vec2f)->f32{return 1.-ease(.82,1.14,length((q-vec2f(0.,-.205))/vec2f(.19,.19)));}
fn bodyResponse(q:vec2f,p:f32)->f32 {
 let fromCore=length((q-vec2f(0.,.09))/vec2f(.43,.65));
 let reach=1.55*ease(.16,.43,p);
 let filled=1.-ease(reach-.16,reach+.16,fromCore);
 let supply=ease(.14,.33,p)*(1.-ease(.67,.93,p+.075*(q.y+.5)));
 return filled*supply;
}
fn bezier(a:vec2f,b:vec2f,c:vec2f,t:f32)->vec2f{return a*(1.-t)*(1.-t)+b*2.*t*(1.-t)+c*t*t;}
fn arrival(q:vec2f,a:vec2f,b:vec2f,c:vec2f,p:f32,start:f32,finish:f32)->vec3f {
 let travel=ease(start,finish,p);let envelope=ease(start,start+.035,p)*(1.-ease(finish,finish+.06,p));
 var broad=0.;var core=0.;
 for(var i=0;i<11;i++){
  let t=f32(i)/10.;let center=bezier(a,b,c,t);
  let size=.047+.021*sin(t*3.14159);
  let d=length(q-center)/size;
  let along=exp2(-pow((t-travel)/.24,2.)*2.);
  broad=max(broad,exp2(-d*d*1.5)*along);
  core=max(core,exp2(-d*d*6.)*along);
 }
 return (vec3f(.13,.55,.70)*broad+vec3f(.57,.68,.65)*core)*envelope;
}
fn recoveryGlint(q:vec2f,source:vec2f,p:f32,begin:f32,end:f32,size:f32)->vec3f {
 let t=clamp((p-begin)/(end-begin),0.,1.);
 let pulse=sin(t*3.14159)*sin(t*3.14159)*bodyResponse(source,p)*actorAt(source).a;
 let d=abs(q-source);let axis=max(d.x,d.y);let across=min(d.x,d.y);
 let fourTips=pow(max(0.,1.-axis/size-across/(size*.30)),1.5);
 let nucleus=exp2(-dot(d,d)/(.012*.012)*3.);
 return vec3f(.95,1.,1.)*(fourTips*.90+nucleus*.40)*pulse*frame.controls.x;
}
@fragment fn fs(@builtin(position) position:vec4f)->@location(0) vec4f {
 let background=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),frame.light);
 let q=(position.xy-frame.center)/frame.height;let p=frame.phase;let original=actorAt(q);
 let pristine=mix(background,original.rgb,original.a);
 if(p<=0.||p>=.94){return vec4f(pristine,1.);}
 let reduced=1.-frame.reduced*.40;
 // First light travels behind the shoulder; second reaches the torso from below/front.
 let back=arrival(q,vec2f(-.45,-.55)*reduced,vec2f(-.40,-.02)*reduced,vec2f(-.025,.075),p,.02,.20);
 let fore=arrival(q,vec2f(.53,.31)*reduced,vec2f(.32,.48)*reduced,vec2f(.025,.11),p,.10,.31);
 let response=bodyResponse(q,p);let protect=faceGuard(q);
 let lit=original.rgb+(vec3f(1.)-original.rgb)*vec3f(.72,.96,.94)*response*.80*(1.-protect*.95);
 var color=mix(background+back,lit,original.a);
 color+=fore*(1.-protect*.98);
 // Emission follows the real silhouette and the same arriving body response.
 // The body interior carries most of the recovery area; this is supporting light.
 let small=2.0/frame.height;let large=4.7/frame.height;
 let nearA=max(max(actorAt(q+vec2f(small,0.)).a,actorAt(q-vec2f(small,0.)).a),max(actorAt(q+vec2f(0.,small)).a,actorAt(q-vec2f(0.,small)).a));
 let farA=(actorAt(q+vec2f(large,0.)).a+actorAt(q-vec2f(large,0.)).a+actorAt(q+vec2f(0.,large)).a+actorAt(q-vec2f(0.,large)).a)*.25;
 let nearGlow=max(0.,nearA-original.a)*response;
 let broadGlow=max(0.,farA-original.a)*response;
 color+=vec3f(.23,.63,.66)*nearGlow*.60+vec3f(.10,.29,.35)*broadGlow*.60;
 color+=recoveryGlint(q,vec2f(-.23,.085),p,.34,.52,.042);
 color+=recoveryGlint(q,vec2f(.26,.20),p,.49,.69,.047);
 color+=recoveryGlint(q,vec2f(.035,.455),p,.65,.84,.035);
 return vec4f(color,1.);
}`;
