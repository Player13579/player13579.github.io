
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
  let p=e((t-births[i])/(ends[i]-births[i]));let center=starts[i]*(1.-p)+bends[i]*sin(3.14159265*p)*motion;
  let arrival=e((t-births[i])/60.)*(1.-e((t-ends[i]+35.)/90.))*live;
  let a=atan2(starts[i].y,starts[i].x);let v=q-center;let local=vec2f(cos(a)*v.x+sin(a)*v.y,-sin(a)*v.x+cos(a)*v.y);
  let len=mix(.16,.055,p);let wid=mix(.063,.087,p)*(1.+ten*.12);let stepped=local+vec2f(0.,floor((local.x+len)/.07)*.013);
  let d=rect(stepped,vec2f(len,wid));let packet=cover(d)*arrival;let slit=1.-cover(abs(local.x-.015)-.012)*.74;
  // A finite connected material strip follows the leading packet and is
  // progressively drawn into the body. Six contiguous cells are one path.
  let tail=min(p,e((t-ends[i]+130.)/170.));var strip=0.;var stripEdge=0.;
  for(var j=0u;j<6u;j++){
    let pa=mix(tail,p,f32(j)/6.);let pb=mix(tail,p,f32(j+1u)/6.);
    let aa=starts[i]*(1.-pa)+bends[i]*sin(3.14159265*pa)*motion;
    let bb=starts[i]*(1.-pb)+bends[i]*sin(3.14159265*pb)*motion;
    let ab=bb-aa;let f=clamp(dot(q-aa,ab)/max(dot(ab,ab),.000001),0.,1.);let delta=q-(aa+ab*f);
    let width=mix(.048,.078,(pa+pb)*.5)*(1.+ten*.12);let sd=length(delta)-width;
    let cell=cover(sd)*select(.62,1.,j%2u==0u);let seamGap=1.-exp(-pow((f-.50)/.12,2.))*.46;
    strip=max(strip,cell*seamGap);stripEdge=max(stripEdge,exp(-pow(sd/.012,2.)));
  }
  let transport=e((t-births[i])/75.)*(1.-e((t-ends[i]+25.)/100.))*live;
  let ca=max(packet,strip*transport*.74);
  let edge=exp(-pow(d/.014,2.));let core=exp(-pow(local.y/.016,2.));let colour=mix(vec3f(.07,.60,1.50),vec3f(.70,2.10,2.60),p);let r=(colour*(.50+2.1*core)+vec3f(2.4,3.6,4.0)*edge)*packet*slit+colour*(strip*.65+stripEdge*1.05)*transport;
  if(i==0u||i==2u){radBack+=r;coverBack=max(coverBack,ca*.30);}else{radFront+=r;coverFront=max(coverFront,ca*.36);}
  let distance2=dot(q-center,q-center)+.16*.16;received+=colour*arrival*.013/(distance2+.06);
 }
 // Stored energy is body-bound material with layered folds, not a floating icon.
 let lock=e((t-500.)/380.)*live;let mass=(.19+ten*.026);
 let foldQ=q+vec2f(.12*q.y,0.);let clipped=max(rect(foldQ,vec2f(mass,.18)),abs(foldQ.x)+abs(foldQ.y)-mass-.11);
 let sheet=cover(clipped)*body.a;let folds=.62+.38*cos(q.y*57.+q.x*19.);let crease=exp(-pow((q.x+.19*q.y)/.021,2.));
 let seam=1.-exp(-pow((q.y-.023)/.013,2.))*.71;let storage=e((t-730.)/180.);
 let coreColour=mix(vec3f(.10,.65,1.7),vec3f(.32,1.55,2.55),storage);
 let coreRad=(coreColour*(folds+2.2*crease)+vec3f(2.4,3.6,4.0)*exp(-pow(clipped/.012,2.)))*sheet*lock*seam;
 radFront+=coreRad;coverFront=max(coverFront,sheet*lock*.28);received+=coreColour*lock*.029/(dot(q,q)+.075);
 let on=u.flags.x;radFront*=on;radBack*=on;received*=on*u.flags.y;
 let floor=vec3f(.070,.084,.110)+vec3f(.020)*smoothstep(foot.y-15.,foot.y+50.,px.y);let floorNormal=max(0.,.37/sqrt(dot(q,q)+.37*.37));let floorLight=received*floorNormal*.13*smoothstep(foot.y-3.,foot.y+14.,px.y);
 let receiverBody=body.rgb*(vec3f(1.)+received*.25);let base=floor+floorLight;
 let background=base*(1.-coverBack*.15)+radBack;let scene=mix(background,receiverBody,body.a)*(1.-coverFront*.10)+radFront;
 let emission=radBack*(1.-body.a)+radFront;var out:Out;out.scene=vec4f(scene,1.);out.emission=vec4f(emission,1.);return out;
}