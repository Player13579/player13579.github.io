// Original Astra r16. Transient E mist, not an authoritative pre-existing status.
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function erf(x){const sign=x<0?-1:1,a=Math.abs(x),t=1/(1+.3275911*a);return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a));}
export function volumeParameters(phase,reduced=false){
 const p=clamp(phase),release=ease(.16,.71,p),travel=release*(reduced?.5:1);
 const life=1-ease(.28,.78,p),opening=ease(.11,.65,p);
 const nodes=[];
 // xy/radius, then rotation/density/front integral fraction/kind (0 mist, 1 clearing).
 const add=(x,y,rx,ry,angle,density,z,kind=0)=>nodes.push(x,y,rx,ry,angle,density,.5*(1+erf(z/(.42*Math.SQRT2))),kind);
 add(-.20-.13*travel,-.10-.27*travel,.28+.05*release,.35-.07*release,-.35,1.30*life,-.56);
 add(.12+.26*travel,.09-.32*travel,.32-.04*release,.30-.08*release,.48,1.18*life,.36-.70*release);
 add(.12+.14*travel,.35-.20*travel,.26+.03*release,.26-.055*release,-.22,1.20*life,.49);
 add(0,.11,.07+.32*opening,.10+.43*opening,-.08,1.12*opening,0,1);
 add(-.07+.05*opening,.10-.12*opening,.065+.25*opening,.09+.39*opening,.42,.84*opening,0,1);
 add(.35+.08*travel,-.12-.35*travel,.18,.26-.06*release,-.38,.52*ease(.27,.45,p)*(1-ease(.54,.77,p)),-.45);
 return new Float32Array(nodes);
}
export const shader=/*wgsl*/`
struct Lobe { geometry:vec4f, optical:vec4f };
struct Frame { viewport:vec2f, center:vec2f, height:f32, phase:f32, light:f32, reduced:f32, lobes:array<Lobe,6> };
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let corners=array<vec2f,6>(vec2f(-.75,-.975),vec2f(.75,-.975),vec2f(-.75,.775),vec2f(-.75,.775),vec2f(.75,-.975),vec2f(.75,.775));
 let screen=frame.center+corners[i]*frame.height;
 return vec4f(screen.x/frame.viewport.x*2.-1.,1.-screen.y/frame.viewport.y*2.,0.,1.);
}
fn rise(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn originalAt(q:vec2f)->vec4f {
 let source=q*116.+vec2f(63.5);
 if(any(source<vec2f(0.))||any(source>=vec2f(128.))){return vec4f(0.);}
 return textureSampleLevel(actor,linearSampler,source/vec2f(2560.,1536.),0.);
}
// Bounded rational transmission: artistic density, not calibrated physical radiance.
fn opacity(d:f32)->f32{return 1.-1./(1.+.80*d+.35*d*d);}
@fragment fn fs(@builtin(position) position:vec4f)->@location(0) vec4f {
 let background=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),frame.light);
 let q=(position.xy-frame.center)/frame.height;
 let actorPixel=originalAt(q);let p=frame.phase;
 let pristine=mix(background,actorPixel.rgb,actorPixel.a);
 if(p<0.||p>=.92){return vec4f(pristine,1.);}
 var clearing=0.;var frontDensity=0.;var backDensity=0.;
 var frontMaterial=vec3f(0.);var backMaterial=vec3f(0.);
 for(var i=0;i<6;i++){
  let l=frame.lobes[i];let delta=q-l.geometry.xy;let ca=cos(l.optical.x);let sa=sin(l.optical.x);
  let local=vec2f(ca*delta.x+sa*delta.y,-sa*delta.x+ca*delta.y)/l.geometry.zw;
  let field=exp2(-2.15*dot(local,local))*l.optical.y;
  if(l.optical.w>.5){clearing+=field;}
  else{
   let frontFraction=l.optical.z;
   // Broad illumination across each volume; no texture noise or bright outline.
   let shade=clamp(.52-.23*local.x-.19*local.y,0.,1.);
   let tint=mix(vec3f(.145,.10,.20),vec3f(.34,.27,.395),shade);
   frontDensity+=field*frontFraction;backDensity+=field*(1.-frontFraction);
   frontMaterial+=tint*field*frontFraction;backMaterial+=tint*field*(1.-frontFraction);
  }
 }
 let available=clamp(1.-clearing*1.28,0.,1.);
 let removed=1.-available;
 let illumination=rise(.09,.35,p)*(1.-rise(.64,.79,p));
 let faceDistance=length((q-vec2f(0.,-.205))/vec2f(.195,.205));
 let faceProtection=(1.-rise(.82,1.10,faceDistance))*actorPixel.a;
 let frontGuard=1.-faceProtection*.94;
 let frontAlpha=opacity(frontDensity*available)*frontGuard;
 let backAlpha=opacity(backDensity*available);
 let frontBase=frontMaterial/max(.00001,frontDensity);
 let backBase=backMaterial/max(.00001,backDensity);
 // Light occupies the mass being cleared, so it cannot become a separate shell.
 let pearl=vec3f(.78,.79,.65);
 let backLit=backBase+pearl*removed*illumination*.66;
 var color=mix(background,backLit,backAlpha);
 let bodyLight=clamp(clearing,0.,1.)*rise(.22,.56,p)*(1.-rise(.71,.92,p));
 let warmed=actorPixel.rgb+(vec3f(1.)-actorPixel.rgb)*vec3f(.46,.40,.255)*bodyLight*(1.-faceProtection*.97);
 color=mix(color,warmed,actorPixel.a);
 let frontLit=frontBase+pearl*removed*illumination*.82;
 color=mix(color,frontLit,frontAlpha);
 // Low-density radiance persists briefly as the same volume becomes transparent.
 let releasedLight=(frontDensity*.45+backDensity*.28)*removed*available*illumination;
 color+=vec3f(.27,.29,.235)*releasedLight*(1.-faceProtection*.97);
 // Compact support softens before the 96x112 H64 local quad boundary.
 let support=(1.-rise(.65,.75,abs(q.x)))*rise(-.975,-.865,q.y)*(1.-rise(.665,.775,q.y));
 color=mix(pristine,color,support);
 return vec4f(color,1.);
}`;
