// Astra r19: connected sheets of positive light, two-stage body reception. No glints.
export const shader=/*wgsl*/`
struct Frame { viewport:vec2f, center:vec2f, height:f32, phase:f32, light:f32, reduced:f32 };
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
fn curve(a:vec2f,b:vec2f,c:vec2f,t:f32)->vec2f{return a*(1.-t)*(1.-t)+b*2.*t*(1.-t)+c*t*t;}
fn transfer(q:vec2f,a:vec2f,b:vec2f,c:vec2f,p:f32,start:f32,finish:f32)->vec3f {
 let head=mix(.25,1.15,ease(start,finish,p));
 let visible=ease(start,start+.045,p)*(1.-ease(finish,finish+.055,p));
 var nearest=100.;var longitudinal=0.;var signedDistance=0.;
 for(var i=0;i<12;i++) {
  let t=f32(i)/12.;let u=curve(a,b,c,t);let v=curve(a,b,c,t+1./12.);let d=v-u;
  let along=clamp(dot(q-u,d)/dot(d,d),0.,1.);let relative=q-(u+d*along);let distance=length(relative);
  if(distance<nearest){nearest=distance;longitudinal=t+along/12.;signedDistance=(d.x*relative.y-d.y*relative.x)/length(d);}
 }
 let inSheet=(longitudinal-(head-.65))/.65;
 let taper=sin(clamp(inSheet,0.,1.)*3.14159265);
 let width=.108*pow(max(taper,0.),.60)+.006;
 let extent=ease(0.,.08,inSheet)*(1.-ease(.92,1.,inSheet));
 let cross=nearest/width;
 let broad=exp2(-cross*cross*2.2);
 let fold=exp2(-pow((signedDistance-width*.33)/(width*.25),2.)*2.);
 let fill=vec3f(.38,.75,.82)*broad;
 let edge=vec3f(.72,.81,.82)*fold*broad;
 return (fill+edge)*extent*visible;
}
// Two receptions create a broad spatial front, then a quieter body-wide plateau.
fn response(q:vec2f,p:f32)->vec2f {
 let distance=length((q-vec2f(-.10,.04))/vec2f(.56,.77));
 let reach=1.48*ease(.18,.46,p);
 let arrived=1.-ease(reach-.20,reach+.20,distance);
 let first=ease(.17,.30,p);
 let second=ease(.27,.44,p);
 let lateral=mix(first,second,ease(-.15,.18,q.x));
 let settling=1.-ease(.68,.94,p+.095*(q.y+.50));
 let pulse=exp2(-pow((distance-reach)/.25,2.)*1.6)*first;
 return vec2f(arrived*lateral*settling,pulse*settling);
}
@fragment fn fs(@builtin(position) position:vec4f)->@location(0) vec4f {
 let background=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),frame.light);
 let q=(position.xy-frame.center)/frame.height;let p=frame.phase;let original=actorAt(q);
 let pristine=mix(background,original.rgb,original.a);
 if(p<=0.||p>=.94){return vec4f(pristine,1.);}
 let reduce=1.-frame.reduced*.28;
 let back=transfer(q,vec2f(-.46,-.51)*reduce,vec2f(-.53,.03)*reduce,vec2f(-.025,.13),p,.015,.235);
 let fore=transfer(q,vec2f(.52,.36)*reduce,vec2f(.28,.61)*reduce,vec2f(.02,.08),p,.11,.34);
 let received=response(q,p);let protect=faceGuard(q);
 let luminance=dot(original.rgb,vec3f(.2126,.7152,.0722));
 let materialGain=.72+.19*sqrt(luminance);
 let broadLight=received.x*materialGain;
 let wave=received.y*.22;
 let cool=vec3f(.80,.98,.94);
 let pearl=vec3f(.95,1.,.96);
 let body=(vec3f(1.)-original.rgb)*(cool*broadLight+pearl*wave)*(1.-protect*.97);
 var color=mix(background+back,original.rgb+body,original.a);
 color+=fore*(1.-protect*.995);
 // Supporting silhouette light is directional and follows the active front.
 let step=2.4/frame.height;
 let nearA=max(max(actorAt(q+vec2f(step,0.)).a,actorAt(q-vec2f(step,0.)).a),max(actorAt(q+vec2f(0.,step)).a,actorAt(q-vec2f(0.,step)).a));
 let support=max(0.,nearA-original.a);
 let lower=ease(-.08,.08,q.y);
 let sided=.25+.75*ease(-.12,.20,q.x+sin(p*7.)*.2);
 color+=vec3f(.21,.47,.52)*support*(received.x*.56+received.y*.90)*lower*sided;
 return vec4f(color,1.);
}`;
