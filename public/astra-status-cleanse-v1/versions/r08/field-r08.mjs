// Original Astra r0.8: contact-bound removal, no container/ring/beam.
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
 return (1.-ease(.13,.22,abs(uv.x)))*ease(-.44,-.32,uv.y)*(1.-ease(-.02,.07,uv.y));
}
fn footprintAt(uv:vec2f,center:vec2f,size:vec2f)->f32 {
 let v=(uv-center)/size;
 let d=length(vec2f(v.x+.16*v.y,v.y));
 return 1.-ease(.74,1.,d);
}
@fragment fn fs(@builtin(position) pix:vec4f)->@location(0) vec4f {
 let bg=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),u.light);
 let uv=(pix.xy-u.center)/u.height;let p=u.phase;
 if(abs(uv.x)>.95||abs(uv.y)>1.3){return vec4f(bg,1.);}
 let spr=actorSample(uv);let keepFace=1.-face(uv);
 let isLive=select(0.,1.,p>=0.&&p<1.);let tail=1.-ease(.81,1.,p);
 var surface=spr.rgb;var detachedColor=vec3f(0.);var detachedAlpha=0.;var cleanLight=vec3f(0.);var cleanRim=0.;
 // Two broad body-bound patches. Purple is an explicitly labelled status fixture.
 for(var n=0;n<2;n++){
  let side=select(1.,-1.,n==1);
  let center=select(vec2f(.20,.26),vec2f(-.20,.075),n==1);
  let size=select(vec2f(.17,.205),vec2f(.175,.255),n==1);
  let start=select(.12,.40,n==1);let finish=select(.58,.86,n==1);
  let r=ease(start,finish,p);let relative=(uv-center)/size;
  // Peel begins at each outer edge and advances into the contact footprint.
  let contactCoord=-side*relative.x;let front=-1.10+2.20*r;
  let footprint=footprintAt(uv,center,size)*keepFace;
  let contact=footprint*ease(front-.09,front+.09,contactCoord)*isLive;
  let gray=dot(spr.rgb,vec3f(.22,.70,.08));
  let stressed=mix(vec3f(.12,.075,.18),vec3f(.47,.25,.55),ease(-.7,.6,relative.y));
  surface=mix(surface,stressed*(.52+.48*gray),contact*.82);
  // Narrow contact highlight stays on the patch edge; it never spans the body.
  let peelEdge=exp(-pow((contactCoord-front)/.26,2.))*footprint*ease(0.,.09,r)*(1.-ease(.87,1.,r))*isLive;
  surface+=vec3f(.31,.72,.51)*peelEdge*.85;
  // The released coating bends away before shrinking. Its alpha comes from its
  // original body contact footprint, so no free-standing rectangle is invented.
  let lift=ease(0.,.40,r)*(1.-ease(.85,1.,r));let movement=mix(1.,.5,u.reduced);
  let offset=vec2f(side*.235*lift,-.035*lift)*movement;
  let squeeze=1.15-.68*ease(.80,1.,r);
  let origin=center+(uv-center-offset)/vec2f(squeeze,1.-.18*ease(.80,1.,r));
  let original=actorSample(origin);
  let originalFoot=footprintAt(origin,center,size)*(1.-face(origin));
  let cut=-side*(origin.x-center.x)/size.x;
  let released=1.-ease(front+.40,front+.62,cut);
  let hold=ease(0.,.13,r)*(1.-ease(.84,1.,r));
  let cover=original.a*originalFoot*released*hold*.94*isLive;
  let foldCoordinate=(uv.x-center.x-offset.x)/max(.02,size.x*squeeze);
  let fold=.5+.5*cos(foldCoordinate*2.6+r*2.1);
  let coat=mix(vec3f(.19,.105,.25),vec3f(.65,.42,.64),pow(fold,3.));
  // Contact side is slightly lit by the local release, with a darker rolled back.
  let coatLight=coat+vec3f(.12,.27,.18)*pow(fold,9.)*lift;
  detachedColor=detachedColor*(1.-cover)+coatLight*cover;
  detachedAlpha=detachedAlpha+(1.-detachedAlpha)*cover;
  // Clean colour returns at the removed location, then briefly propagates on
  // the same body alpha. No airborne rings, extra particles or face glow.
  let spread=.12+.32*r;let field=exp(-pow(length((uv-center)/vec2f(1.,1.25))/spread,2.)*2.3);
  let clean=ease(.12,.38,r)*(1.-ease(.60,1.,p))*field*keepFace*isLive;
  cleanLight+=vec3f(.035,.085,.055)*clean;
  cleanRim+=clean*.30;
 }
 surface+=cleanLight;
 var color=mix(bg,surface,spr.a);
 let step=1.7/u.height;
 let expanded=max(max(actorSample(uv+vec2f(step,0.)).a,actorSample(uv-vec2f(step,0.)).a),max(actorSample(uv+vec2f(0.,step)).a,actorSample(uv-vec2f(0.,step)).a));
 let outline=max(0.,expanded-spr.a)*keepFace;
 color+=vec3f(.38,.72,.50)*outline*cleanRim*tail;
 color=color*(1.-detachedAlpha)+detachedColor;
 return vec4f(color,1.);
}`;


