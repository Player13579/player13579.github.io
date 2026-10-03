
struct U{view:vec4f,body:vec4f,clock:vec4f,flags:vec4f};
@group(0) @binding(0)var<uniform>u:U;
@group(0) @binding(1)var bodyTex:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
fn e(x:f32)->f32{let a=clamp(x,0.,1.);return a*a*(3.-2.*a);}
fn rect(q:vec2f,s:vec2f)->f32{return max(abs(q.x)-s.x,abs(q.y)-s.y);}
fn cover(d:f32)->f32{return 1.-smoothstep(-.006,.011,d);}
// Digital energy has finite volume, transported depth and a broad shear channel.
// It is not a contour-highlighted lens or an arbitrary smoke noise field.
fn packetDensity(v:vec3f,len:f32,width:f32,phase:f32)->f32{
 let bent=v.y-width*.30*sin(v.x/len*2.2+phase)+v.z*.28;
 let n=vec3f(v.x/len,bent/width,v.z/.16);
 let front=max(0.,1.-dot(pow(abs(n),vec3f(4.)),vec3f(1.)));
 let wake=vec3f((v.x+len*.70)/(len*.58),(bent-width*.30*sin(phase+1.2))/(width*.72),(v.z+.045)/.13);
 let back=max(0.,1.-dot(pow(abs(wake),vec3f(4.)),vec3f(1.)))*.73;
 let shear=1.-.91*exp(-pow((bent+v.x*.16-width*.12*cos(phase))/(width*.22),2.));
 // A large planar cut changes section as material translates, giving a digital
 // folded front rather than decoration added to a generic fluid silhouette.
 let facet=smoothstep(-.025,.025,len*.85-v.x-.55*abs(bent));
 return max(pow(front,.72),pow(back,.72))*shear*facet;
}
fn packetVolume(local:vec2f,p:f32,phase:f32,ten:f32)->vec4f{
 let compression=e((p-.42)/.58);let len=mix(.30,.115,compression);let width=mix(.165,.110,compression)*(1.+ten*.12);
 if(abs(local.x)>len*1.65||abs(local.y)>width*1.8){return vec4f(0.);}
 var light=vec3f(0.);var trans=1.;let step=.36/8.;
 for(var k=0u;k<8u;k++){
  let z=.18-(f32(k)+.5)*step;let d=packetDensity(vec3f(local,z),len,width,phase);
  let absorb=1.-exp(-d*step*15.);
  let depth=mix(.54,1.04,(z+.18)/.36);
  let colour=mix(vec3f(.07,.60,1.50),vec3f(.70,2.10,2.60),compression);
  let source=colour*(.65+depth*.55)+vec3f(3.1,4.2,4.4)*d*d*.78;
  light+=trans*absorb*source;trans*=1.-absorb;
 }
 return vec4f(light,1.-trans);
}
fn storedDensity(v:vec3f,rx:f32,ry:f32,phase:f32,settled:f32)->f32{
 let bend=v.x+.28*v.y+.23*v.z;
 let skewY=v.y+ry*.18*sin(bend/rx*2.6+phase)*(1.-settled*.6);
 let n=vec3f(bend/rx,skewY/ry,v.z/.135);
 let mass=max(0.,1.-dot(pow(abs(n),vec3f(4.)),vec3f(1.)));
 // Through-volume shear is broad enough to divide the concentrated material;
 // its depth skew means front and far pressure faces do not coincide.
 let divide=1.-.94*exp(-pow((v.x+.28*v.y+.48*skewY+v.z*.10-rx*.10*sin(phase))/(rx*.25),2.));
 let facet=smoothstep(-.020,.020,rx*.92-bend*.55-abs(skewY)*.65);
 return pow(mass,.72)*divide*facet;
}
fn storedVolume(q:vec2f,settled:f32,phase:f32,ten:f32,pulse:f32)->vec4f{
 let rx=mix(.21,.168,settled)*(1.+ten*.10);let ry=mix(.165,.132,settled);
 if(abs(q.x)>.30||abs(q.y)>.27){return vec4f(0.);}
 var light=vec3f(0.);var trans=1.;let step=.30/10.;
 for(var k=0u;k<10u;k++){
  let z=.15-(f32(k)+.5)*step;let d=storedDensity(vec3f(q,z),rx,ry,phase,settled);
  let absorb=1.-exp(-d*step*18.);let depth=mix(.42,1.06,(z+.15)/.30);
  let colour=mix(vec3f(.10,.65,1.7),vec3f(.32,1.55,2.55),settled);
  let source=colour*(.65+depth*.65)+vec3f(3.1,4.2,4.4)*d*d*(.78+pulse);
  light+=trans*absorb*source;trans*=1.-absorb;
 }
 return vec4f(light,1.-trans);
}

struct Out{@location(0)scene:vec4f,@location(1)emission:vec4f};
@fragment fn fs(o:O)->Out{
 let px=o.uv*u.view.xy;let h=u.body.z;let foot=u.body.xy;let q=(px-vec2f(foot.x,foot.y-.37*h))/h;
 let t=u.clock.x;let life=e(t/65.)*(1.-e((t-1080.)/120.));let live=select(0.,life,t>0.&&t<1200.);let ten=u.clock.y;let motion=mix(1.,.35,u.clock.z);
 let quadH=h*1024./839.;let quadW=quadH*.5;let uv=(px-vec2f(foot.x-quadW*238./512.,foot.y-938./1024.*quadH))/vec2f(quadW,quadH);
 let valid=all(uv>=vec2f(0.))&&all(uv<=vec2f(1.));let body=textureSample(bodyTex,smp,vec2f((2.+clamp(uv.x,0.,1.))/3.,clamp(uv.y,0.,1.)))*select(0.,1.,valid);
 var radFront=vec3f(0.);var radBack=vec3f(0.);var received=vec3f(0.);var coverFront=0.;var coverBack=0.;
 let starts=array<vec2f,4>(vec2f(-.72,.10),vec2f(.78,-.14),vec2f(-.58,-.58),vec2f(.54,.49));let bends=array<vec2f,4>(vec2f(.28,-.33),vec2f(-.25,.24),vec2f(.16,.32),vec2f(-.31,-.16));let births=array<f32,4>(35.,130.,245.,350.);let ends=array<f32,4>(520.,610.,735.,860.);
 for(var i=0u;i<4u;i++){
  let progress=e((t-births[i])/(ends[i]-births[i]));let centre=starts[i]*(1.-progress)+bends[i]*sin(3.14159265*progress)*motion;
  let tangent=-starts[i]+bends[i]*3.14159265*cos(3.14159265*progress)*motion;let axis=normalize(tangent);
  let v=q-centre;let local=vec2f(dot(v,axis),dot(v,vec2f(-axis.y,axis.x)));
  let arrival=e((t-births[i])/85.)*(1.-e((t-ends[i]+5.)/100.))*live;
  let volume=packetVolume(local,progress,(t-births[i])*.006*motion,ten);let ca=volume.a*arrival;let r=volume.rgb*arrival;
  if(i==0u||i==2u){radBack+=r;coverBack=max(coverBack,ca*.30);}else{radFront+=r;coverFront=max(coverFront,ca*.36);}
  let compression=e((progress-.42)/.58);let colour=mix(vec3f(.07,.60,1.50),vec3f(.70,2.10,2.60),compression);
  let distance2=dot(q-centre,q-centre)+.16*.16;received+=colour*arrival*.013/(distance2+.06);
 }
 let lock=e((t-485.)/395.)*live;let settled=e((t-730.)/220.);let phase=min(t,950.)*.007*motion;
 let pulses=exp(-pow((t-520.)/65.,2.))*.25+exp(-pow((t-610.)/65.,2.))*.20+exp(-pow((t-735.)/65.,2.))*.18+exp(-pow((t-860.)/65.,2.))*.16;
 let storage=storedVolume(q,settled,phase,ten,pulses);let coreRad=storage.rgb*lock*body.a;
 radFront+=coreRad;coverFront=max(coverFront,storage.a*lock*body.a*.28);
 let coreColour=mix(vec3f(.10,.65,1.7),vec3f(.32,1.55,2.55),settled);received+=coreColour*lock*.029/(dot(q,q)+.075);
 let on=u.flags.x;radFront*=on;radBack*=on;received*=on*u.flags.y;
 let floor=vec3f(.070,.084,.110)+vec3f(.020)*smoothstep(foot.y-15.,foot.y+50.,px.y);let floorNormal=max(0.,.37/sqrt(dot(q,q)+.37*.37));let floorLight=received*floorNormal*.13*smoothstep(foot.y-3.,foot.y+14.,px.y);
 let receiverBody=body.rgb*(vec3f(1.)+received*.25);let base=floor+floorLight;
 let background=base*(1.-coverBack*.15)+radBack;let scene=mix(background,receiverBody,body.a)*(1.-coverFront*.10)+radFront;
 let emission=radBack*(1.-body.a)+radFront;var out:Out;out.scene=vec4f(scene,1.);out.emission=vec4f(emission,1.);return out;
}