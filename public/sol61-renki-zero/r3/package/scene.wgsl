
struct U{view:vec4f,body:vec4f,clock:vec4f,flags:vec4f};
@group(0) @binding(0)var<uniform>u:U;
@group(0) @binding(1)var bodyTex:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
fn e(x:f32)->f32{let a=clamp(x,0.,1.);return a*a*(3.-2.*a);}
fn rect(q:vec2f,s:vec2f)->f32{return max(abs(q.x)-s.x,abs(q.y)-s.y);}
fn cover(d:f32)->f32{return 1.-smoothstep(-.006,.011,d);}
struct Out{@location(0)scene:vec4f,@location(1)emission:vec4f};
@fragment fn fs(o:O)->Out{
 let px=o.uv*u.view.xy;let h=u.body.z;let foot=u.body.xy;let q=(px-vec2f(foot.x,foot.y-.37*h))/h;
 let t=u.clock.x;let life=e(t/65.)*(1.-e((t-1080.)/120.));let live=select(0.,life,t>0.&&t<1200.);let ten=u.clock.y;let motion=mix(1.,.35,u.clock.z);
 let quadH=h*1024./839.;let quadW=quadH*.5;let uv=(px-vec2f(foot.x-quadW*238./512.,foot.y-938./1024.*quadH))/vec2f(quadW,quadH);
 let valid=all(uv>=vec2f(0.))&&all(uv<=vec2f(1.));let body=textureSample(bodyTex,smp,vec2f((2.+clamp(uv.x,0.,1.))/3.,clamp(uv.y,0.,1.)))*select(0.,1.,valid);
 var radFront=vec3f(0.);var radBack=vec3f(0.);var received=vec3f(0.);var coverFront=0.;var coverBack=0.;
 let starts=array<vec2f,4>(vec2f(-.72,.10),vec2f(.78,-.14),vec2f(-.58,-.58),vec2f(.54,.49));let bends=array<vec2f,4>(vec2f(.28,-.33),vec2f(-.25,.24),vec2f(.16,.32),vec2f(-.31,-.16));let births=array<f32,4>(35.,130.,245.,350.);let ends=array<f32,4>(520.,610.,735.,860.);
 for(var i=0u;i<4u;i++){
  let progress=e((t-births[i])/(ends[i]-births[i]));
  let centre=starts[i]*(1.-progress)+bends[i]*sin(3.14159265*progress)*motion;
  let tangent=-starts[i]+bends[i]*3.14159265*cos(3.14159265*progress)*motion;
  let axis=normalize(tangent);let v=q-centre;let local=vec2f(dot(v,axis),dot(v,vec2f(-axis.y,axis.x)));
  let arrival=e((t-births[i])/85.)*(1.-e((t-ends[i]+5.)/100.))*live;
  // Three overlapping lenticular folds form ONE broad packet. They move through
  // the section instead of drawing a constant-width strip along the whole route.
  let compression=e((progress-.42)/.58);let lengthH=mix(.27,.095,compression);let widthH=mix(.145,.090,compression)*(1.+ten*.12);
  let phase=(t-births[i])*.009*motion;var density=0.;var crest=0.;
  for(var j=0u;j<3u;j++){
   let k=f32(j);let shift=vec2f(-k*lengthH*.47,(k-1.)*widthH*.36*sin(phase+k*1.4));
   let fold=local-shift;let bent=vec2f(fold.x,fold.y-widthH*.55*sin(fold.x/lengthH*2.0+phase+k));
   let lens=vec2f(bent.x/(lengthH*(1.-k*.14)),bent.y/(widthH*(1.-k*.11)));
   let r2=dot(lens,lens);let thickness=max(0.,1.-r2);
   // Broad shear fissure is visible at H64; no pixel noise or glitter field.
   let fissure=1.-.76*exp(-pow((bent.y-widthH*.20*sin(phase+fold.x/lengthH)) / (widthH*.18),2.));
   let cell=smoothstep(0.,.28,thickness)*sqrt(thickness)*fissure*(1.-k*.20);
   density=max(density,cell);crest=max(crest,exp(-pow((r2-.55)/.22,2.))*fissure*select(0.,1.,r2<1.)*(1.-k*.24));
  }
  let ca=density*arrival;
  let colour=mix(vec3f(.07,.60,1.50),vec3f(.70,2.10,2.60),compression);
  let r=(colour*(.38*density+2.25*density*density)+vec3f(2.4,3.6,4.0)*crest*.48)*arrival;
  if(i==0u||i==2u){radBack+=r;coverBack=max(coverBack,ca*.30);}else{radFront+=r;coverFront=max(coverFront,ca*.36);}
  let distance2=dot(q-centre,q-centre)+.16*.16;received+=colour*arrival*.013/(distance2+.06);
 }
 // The arriving material contracts into a compact abdominal volume. Fore and
 // far folds retain a dark shear between them; this is not a torso recolour.
 let lock=e((t-485.)/395.)*live;let settled=e((t-730.)/220.);
 let radius=mix(.178,.122,settled)*(1.+ten*.12);let flow=min(t,950.)*.010*motion;
 var stored=0.;var storedCrest=0.;
 for(var j=0u;j<2u;j++){
  let sign=select(-1.,1.,j==0u);let shifted=q-vec2f(sign*radius*.28,sign*radius*.17);
  let bent=shifted+vec2f(.24*shifted.y,radius*.18*sin(shifted.x/radius*2.4+flow)* (1.-settled*.7));
  let lens=bent/vec2f(radius*.84,radius*1.08);let r2=dot(lens,lens);let thick=max(0.,1.-r2);
  let cleft=1.-.82*exp(-pow((bent.x+.34*bent.y-radius*.10*sin(flow))/(radius*.16),2.));
  let cell=smoothstep(0.,.30,thick)*sqrt(thick)*cleft*select(.65,1.,j==0u);
  stored=max(stored,cell);storedCrest=max(storedCrest,exp(-pow((r2-.48)/.21,2.))*cleft*select(0.,1.,r2<1.)*select(.58,1.,j==0u));
 }
 let pulses=exp(-pow((t-520.)/65.,2.))*.25+exp(-pow((t-610.)/65.,2.))*.20+exp(-pow((t-735.)/65.,2.))*.18+exp(-pow((t-860.)/65.,2.))*.16;
 let coreColour=mix(vec3f(.10,.65,1.7),vec3f(.32,1.55,2.55),settled);
 let coreRad=(coreColour*(stored*.50+stored*stored*(2.2+pulses))+vec3f(2.4,3.6,4.0)*storedCrest*.52)*lock*body.a;
 radFront+=coreRad;coverFront=max(coverFront,stored*lock*body.a*.28);received+=coreColour*lock*.029/(dot(q,q)+.075);
 let on=u.flags.x;radFront*=on;radBack*=on;received*=on*u.flags.y;
 let floor=vec3f(.070,.084,.110)+vec3f(.020)*smoothstep(foot.y-15.,foot.y+50.,px.y);let floorNormal=max(0.,.37/sqrt(dot(q,q)+.37*.37));let floorLight=received*floorNormal*.13*smoothstep(foot.y-3.,foot.y+14.,px.y);
 let receiverBody=body.rgb*(vec3f(1.)+received*.25);let base=floor+floorLight;
 let background=base*(1.-coverBack*.15)+radBack;let scene=mix(background,receiverBody,body.a)*(1.-coverFront*.10)+radFront;
 let emission=radBack*(1.-body.a)+radFront;var out:Out;out.scene=vec4f(scene,1.);out.emission=vec4f(emission,1.);return out;
}