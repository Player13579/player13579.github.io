// Astra r24: one open 3D transmission path, with receiver light retained after passage.
export const shader=/*wgsl*/`
struct Frame { viewport:vec2f, center:vec2f, height:f32, phase:f32, light:f32, reduced:f32 };
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let vertices=array<vec2f,6>(vec2f(-.84,-.975),vec2f(.84,-.975),vec2f(-.84,.775),vec2f(-.84,.775),vec2f(.84,-.975),vec2f(.84,.775));
 let px=frame.center+vertices[i]*frame.height;
 return vec4f(px.x/frame.viewport.x*2.-1.,1.-px.y/frame.viewport.y*2.,0.,1.);
}
fn ease(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn artAt(q:vec2f)->vec4f {
 let s=q*116.+vec2f(63.5);
 if(any(s<vec2f(0.))||any(s>=vec2f(128.))){return vec4f(0.);}
 return textureSampleLevel(actor,linearSampler,s/vec2f(2560.,1536.),0.);
}
fn face(q:vec2f)->f32{return 1.-ease(.82,1.14,length((q-vec2f(0.,-.205))/vec2f(.19,.19)));}
fn path(t:f32)->vec3f {
 let angle=-3.14+t*6.28;let radius=.49*(1.-frame.reduced*.15);
 let z=sin(angle)*radius;
 return vec3f(cos(angle)*radius,.48-.55*t+z*.24,z);
}
struct Flow { back:vec4f, fore:vec4f };
fn flow(q:vec2f,p:f32)->Flow {
 var backDistance=100.;var foreDistance=100.;var backAt=0.;var foreAt=0.;
 for(var i=0;i<24;i++) {
  let t=f32(i)/24.;let a=path(t);let b=path(t+1./24.);let segment=b.xy-a.xy;
  let f=clamp(dot(q-a.xy,segment)/dot(segment,segment),0.,1.);let delta=q-(a.xy+segment*f);
  let d=dot(delta,delta);let z=mix(a.z,b.z,f);let at=t+f/24.;
  if(z<0.&&d<backDistance){backDistance=d;backAt=at;}
  if(z>=0.&&d<foreDistance){foreDistance=d;foreAt=at;}
 }
 let center=mix(.07,1.47,ease(.015,.68,p));
 let envelope=ease(.015,.075,p)*(1.-ease(.66,.75,p));
 let backDelta=backAt-center;
 let backSpan=ease(-.51,-.39,backDelta)*(1.-ease(.01,.13,backDelta))*envelope;
 let foreDelta=foreAt-center;
 let foreSpan=ease(-.51,-.39,foreDelta)*(1.-ease(.01,.13,foreDelta))*envelope;
 let width=.093;
 let backMass=exp2(-backDistance/(width*width)*1.5)*backSpan;
 let foreMass=exp2(-foreDistance/(width*width)*1.5)*foreSpan;
 let backCore=exp2(-backDistance/(width*width)*5.0)*backSpan;
 let foreCore=exp2(-foreDistance/(width*width)*5.0)*foreSpan;
 return Flow(vec4f(vec3f(.14,.66,.79)+vec3f(.31,.24,.18)*backCore,backMass*.84),vec4f(vec3f(.31,.85,.73)+vec3f(.42,.24,.25)*foreCore,foreMass*.88));
}
@fragment fn fs(@builtin(position) position:vec4f)->@location(0) vec4f {
 let q=(position.xy-frame.center)/frame.height;let p=frame.phase;
 let bg=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),frame.light);let art=artAt(q);
 if(p<=0.||p>=.96){return vec4f(mix(bg,art.rgb,art.a),1.);}
 let f=flow(q,p);let protect=face(q);
 let passingHeight=.48-.55*ease(.05,.62,p);
 let received=ease(passingHeight-.13,passingHeight+.10,q.y);
 let warmup=ease(.08,.22,p);let settle=1.-ease(.77,.95,p);
 let whole=ease(.60,.69,p);
 let receiver=max(received*warmup*.55,whole*.82)*settle;
 let directional=.76+.24*ease(-.28,.28,q.x);
 let light=vec3f(.61,.98,.80)*receiver*directional*(1.-protect*.98);
 let lit=art.rgb+(vec3f(1.)-art.rgb)*light;
 var color=mix(mix(bg,f.back.rgb,f.back.a),lit,art.a);
 color=mix(color,f.fore.rgb,f.fore.a*(1.-protect*.995));
 let offset=2.0/frame.height;
 let nearby=max(max(artAt(q+vec2f(offset,0.)).a,artAt(q-vec2f(offset,0.)).a),max(artAt(q+vec2f(0.,offset)).a,artAt(q-vec2f(0.,offset)).a));
 color+=vec3f(.15,.45,.32)*max(0.,nearby-art.a)*whole*settle*.32*(1.-protect);
 return vec4f(color,1.);
}
`;
