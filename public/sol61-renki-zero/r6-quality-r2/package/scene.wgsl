
struct U{view:vec4f,body:vec4f,clock:vec4f,flags:vec4f};
@group(0) @binding(0)var<uniform>u:U;
@group(0) @binding(1)var bodyTex:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
fn e(x:f32)->f32{let a=clamp(x,0.,1.);return a*a*(3.-2.*a);}
fn rect(q:vec2f,s:vec2f)->f32{return max(abs(q.x)-s.x,abs(q.y)-s.y);}
fn cover(d:f32)->f32{return 1.-smoothstep(-.006,.011,d);}
// Open curved intake volume, with one finite advancing compression front.
fn sq(x:f32)->f32{return x*x;}
fn gatherDensity(v:vec3f,len:f32,width:f32,phase:f32,p:f32)->f32{
 let nx=v.x/len;let ny=(v.y+v.x*.18+v.z*.32)/width-.55*(1.-nx*nx);let nz=v.z/.13;
 let radius=(.22+.62*e((nx+1.)/.50))*(1.-.78*e((nx+.15)/1.15));
 let shape=max(abs(nx)-1.,sqrt(ny*ny+nz*nz)-radius);
 let bulk=1.-smoothstep(-.16,0.,shape);
 let wake=(1.-e((nx+.70)/.30))*e((ny+.10)/.32);
 let front=mix(-.55,.35,e(p));let close=e((p-.66)/.34);
 let cut=exp(-sq((nx-front)/.13))*e((ny+.22)/.38)*(1.-close);
 return bulk*(1.-.98*wake)*(1.-.86*cut);
}
fn gatherVolume(local:vec2f,p:f32,phase:f32,ten:f32)->vec4f{
 let compression=e((p-.40)/.60);let len=mix(.42,.16,compression);let width=mix(.23,.16,compression)*(1.+ten*.10);
 if(abs(local.x)>len*1.10||abs(local.y)>width*1.85){return vec4f(0.);}
 var light=vec3f(0.);var trans=1.;let step=.30/6.;
 for(var k=0u;k<6u;k++){
  let z=.15-(f32(k)+.5)*step;let d=gatherDensity(vec3f(local,z),len,width,phase,p);
  let absorb=1.-exp(-d*step*13.);let depth=(z+.15)/.30;
  let pressure=e((local.x/len+.08)/.62)*d;
  let carrier=vec3f(.06,.95,2.30)*(.58+.38*depth);
  let front=mix(-.55,.35,e(p));let compressionSource=exp(-sq((local.x/len-front)/.16))*(1.-e((p-.66)/.34));
  let source=carrier+vec3f(3.6,4.6,5.1)*(pressure*pressure+compressionSource*d*.26);
  light+=trans*absorb*source;trans*=1.-absorb;
 }
 return vec4f(light,1.-trans);
}
fn chamberDensity(v:vec3f,rx:f32,ry:f32,settled:f32,phase:f32)->f32{
 let xx=v.x+.18*v.y+.48*v.z;let yy=v.y-.10*v.x-.18*v.z;
 let nx=xx/rx;let ny=yy/ry;let nz=v.z/.22;
 let radial=sqrt(nx*nx+nz*nz);let radius=.72+.28*e((-ny+.20)/.90);
 let shape=max(abs(ny)-1.,radial-radius);let bulk=1.-smoothstep(-.18,0.,shape);
 let inner=.56-.18*e((ny+.05)/.70);let interior=1.-smoothstep(inner-.12,inner,radial);
 let openAbove=1.-e((ny-.05)/.50);let cavity=1.-.97*interior*openAbove;
 let front=mix(-.40,.45,settled);let signedFront=ny+.30*nz-front;
 let compress=.62+.38*e(signedFront/.22);
 return bulk*cavity*compress;
}
struct Storage{front:vec4f,back:vec4f};
fn chamberVolume(q:vec2f,settled:f32,phase:f32,ten:f32)->Storage{
 let rx=mix(.32,.27,settled)*(1.+ten*.10);let ry=mix(.33,.27,settled);
 var out:Storage;out.front=vec4f(0.);out.back=vec4f(0.);
 if(abs(q.x)>.48||abs(q.y)>.46){return out;}
 var frontLight=vec3f(0.);var backLight=vec3f(0.);var frontTrans=1.;var backTrans=1.;let step=.48/8.;
 for(var k=0u;k<8u;k++){
  let z=.24-(f32(k)+.5)*step;let d=chamberDensity(vec3f(q,z),rx,ry,settled,phase);
  let absorb=1.-exp(-d*step*14.);let depth=(z+.24)/.48;
  let yy=q.y-.10*q.x-.18*z;let front=mix(-.40,.45,settled);
  let compressionSource=exp(-sq((yy/ry+.30*z/.22-front)/.14));
  let source=vec3f(.09,1.20,2.55)*(.65+.42*depth)+vec3f(.22,.90,1.25)*d*d+vec3f(.32,1.25,1.85)*d*compressionSource*.48;
  if(z>=0.){frontLight+=frontTrans*absorb*source;frontTrans*=1.-absorb;}
  else{backLight+=backTrans*absorb*source;backTrans*=1.-absorb;}
 }
 out.front=vec4f(frontLight,1.-frontTrans);out.back=vec4f(backLight,1.-backTrans);return out;
}

struct Out{@location(0)scene:vec4f,@location(1)emission:vec4f};
@fragment fn fs(o:O)->Out{
 let px=o.uv*u.view.xy;let h=u.body.z;let foot=u.body.xy;let q=(px-vec2f(foot.x,foot.y-.37*h))/h;
 let t=u.clock.x;let life=e(t/65.)*(1.-e((t-1080.)/120.));let live=select(0.,life,t>0.&&t<1200.);let ten=u.clock.y;let motion=mix(1.,.35,u.clock.z);
 let quadH=h*1024./839.;let quadW=quadH*.5;let uv=(px-vec2f(foot.x-quadW*238./512.,foot.y-938./1024.*quadH))/vec2f(quadW,quadH);
 let valid=all(uv>=vec2f(0.))&&all(uv<=vec2f(1.));let body=textureSample(bodyTex,smp,vec2f((2.+clamp(uv.x,0.,1.))/3.,clamp(uv.y,0.,1.)))*select(0.,1.,valid);
 var radFront=vec3f(0.);var radBack=vec3f(0.);var received=vec3f(0.);var coverFront=0.;var coverBack=0.;
 let starts=array<vec2f,2>(vec2f(-.83,-.10),vec2f(.79,.28));let bends=array<vec2f,2>(vec2f(.08,-.20),vec2f(-.16,-.13));let births=array<f32,2>(40.,165.);let ends=array<f32,2>(560.,740.);
 for(var i=0u;i<2u;i++){
  let progress=e((t-births[i])/(ends[i]-births[i]));let centre=starts[i]*(1.-progress)+bends[i]*sin(3.14159265*progress)*motion;
  let tangent=-starts[i]+bends[i]*3.14159265*cos(3.14159265*progress)*motion;let axis=normalize(tangent);
  let v=q-centre;let local=vec2f(dot(v,axis),dot(v,vec2f(-axis.y,axis.x)));
  let arrival=e((t-births[i])/85.)*(1.-e((t-ends[i]+5.)/100.))*live;
  let volume=gatherVolume(local,progress,(t-births[i])*.006*motion,ten);let ca=volume.a*arrival;let r=volume.rgb*arrival;
  if(i==0u){radBack+=r;coverBack=max(coverBack,ca*.30);}else{radFront+=r;coverFront=max(coverFront,ca*.36);}
  received+=vec3f(.16,1.10,2.25)*arrival*.013/(dot(q-centre,q-centre)+.16*.16+.06);
 }
 let lock=e((t-430.)/400.)*live;let settled=e((t-680.)/260.);let phase=min(t,920.)*.006*motion;
 let storage=chamberVolume(q,settled,phase,ten);
 // Far stored energy is occluded by the actual body. The foreground field is
 // an actual finite volume centred on the abdomen, not a clothing alpha patch.
 radBack+=storage.back.rgb*lock;coverBack=max(coverBack,storage.back.a*lock*.30);
 radFront+=storage.front.rgb*lock;coverFront=max(coverFront,storage.front.a*lock*.28);
 let arrivalPressure=exp(-pow((t-560.)/70.,2.))*.25+exp(-pow((t-740.)/75.,2.))*.24;
 let sourceSupport=exp(-dot(q/vec2f(.065,.052),q/vec2f(.065,.052))*1.7)*body.a;
 radFront+=vec3f(5.4,6.5,7.2)*sourceSupport*lock*(.78+arrivalPressure);
 received+=vec3f(.32,1.55,2.55)*lock*.029/(dot(q,q)+.075);
 let on=u.flags.x;radFront*=on;radBack*=on;received*=on*u.flags.y;
 let floor=vec3f(.070,.084,.110)+vec3f(.020)*smoothstep(foot.y-15.,foot.y+50.,px.y);let floorNormal=max(0.,.37/sqrt(dot(q,q)+.37*.37));let floorLight=received*floorNormal*.13*smoothstep(foot.y-3.,foot.y+14.,px.y);
 let receiverBody=body.rgb*(vec3f(1.)+received*.25);let base=floor+floorLight;
 let background=base*(1.-coverBack*.15)+radBack;let scene=mix(background,receiverBody,body.a)*(1.-coverFront*.10)+radFront;
 let emission=radBack*(1.-body.a)+radFront;var out:Out;out.scene=vec4f(scene,1.);out.emission=vec4f(emission,1.);return out;
}