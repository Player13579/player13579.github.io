
struct U{view:vec4f,body:vec4f,clock:vec4f,flags:vec4f};
@group(0) @binding(0)var<uniform>u:U;
@group(0) @binding(1)var bodyTex:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
fn e(x:f32)->f32{let a=clamp(x,0.,1.);return a*a*(3.-2.*a);}
fn rect(q:vec2f,s:vec2f)->f32{return max(abs(q.x)-s.x,abs(q.y)-s.y);}
fn cover(d:f32)->f32{return 1.-smoothstep(-.006,.011,d);}
// R7: short thick compression volumes, not long route extrusions or flat plates.
fn rotateY(v:vec3f,a:f32)->vec3f{return vec3f(v.x*cos(a)+v.z*sin(a),v.y,-v.x*sin(a)+v.z*cos(a));}
fn rotateX(v:vec3f,a:f32)->vec3f{return vec3f(v.x,v.y*cos(a)-v.z*sin(a),v.y*sin(a)+v.z*cos(a));}
struct Density{rho:f32,normal:vec3f};
fn pressureDensity(v:vec3f,size:vec3f,yaw:f32,tilt:f32,compression:f32)->Density{
 let w=rotateX(rotateY(v,yaw),tilt);let n=w/size;
 let xy=abs(n.x)+abs(n.y);let yz=abs(n.y)+abs(n.z);let zx=abs(n.z)+abs(n.x);
 let shape=max(xy,max(yz,zx));
 var grad=vec3f(sign(n.x),sign(n.y),0.);
 if(yz>xy&&yz>=zx){grad=vec3f(0.,sign(n.y),sign(n.z));}
 if(zx>xy&&zx>yz){grad=vec3f(sign(n.x),0.,sign(n.z));}
 grad=rotateY(rotateX(grad/size,-tilt),-yaw);
 var out:Density;out.normal=grad/max(length(grad),.0001);
 let bulk=1.-smoothstep(.80,1.04,shape);
 // One broad internal packing step, not particles, a face-outline or a cut slot.
 let packing=.72+.28*e((n.x+.28*n.z+.30+compression*.40)/.65);
 out.rho=bulk*packing;return out;
}
fn gatherVolume(local:vec2f,p:f32,phase:f32,motion:f32,ten:f32,axis:vec2f)->vec4f{
 let compression=e((p-.30)/.70);
 let size=vec3f(mix(.255,.145,compression),mix(.225,.155,compression)*(1.+ten*.10),mix(.270,.205,compression));
 let yaw=.54+.33*compression+.17*sin(phase)*motion;
 let tilt=-.22+.38*compression+.12*sin(phase*.7)*motion;
 if(length(local)>.48){return vec4f(0.);}
 var light=vec3f(0.);var trans=1.;let step=.66/6.;
 for(var k=0u;k<6u;k++){
  let z=.33-(f32(k)+.5)*step;let v=vec3f(local,z);
  let m=pressureDensity(v,size,yaw,tilt,compression);
  let normal=vec3f(axis*m.normal.x+vec2f(-axis.y,axis.x)*m.normal.y,m.normal.z);
  let facing=clamp(dot(normal,normalize(vec3f(-.42,-.56,.71))),0.,1.);
  let pressure=e((local.x/size.x+.32)/.80)*m.rho;
  let source=vec3f(.06,.95,2.30)*(.24+1.02*facing)+vec3f(3.6,4.6,5.1)*pressure*pressure;
  let absorb=1.-exp(-m.rho*step*12.);light+=trans*absorb*source;trans*=1.-absorb;
 }
 return vec4f(light,1.-trans);
}
struct Storage{front:vec4f,back:vec4f};
fn chamberVolume(q:vec2f,settled:f32,phase:f32,ten:f32)->Storage{
 // A vertically resolved skewed compact field, not a smooth waist band.
 let size=vec3f(mix(.285,.205,settled)*(1.+ten*.10),mix(.310,.245,settled),mix(.290,.230,settled));
 let yaw=-.51+.28*settled;let tilt=.34+.16*sin(phase)*(1.-settled);
 var out:Storage;out.front=vec4f(0.);out.back=vec4f(0.);
 if(abs(q.x)>.50||abs(q.y)>.50){return out;}
 var frontLight=vec3f(0.);var backLight=vec3f(0.);var frontTrans=1.;var backTrans=1.;let step=.70/8.;
 for(var k=0u;k<8u;k++){
  let z=.35-(f32(k)+.5)*step;let v=vec3f(q.x+.025,q.y+.025,z);
  let m=pressureDensity(v,size,yaw,tilt,settled);
  let facing=clamp(dot(m.normal,normalize(vec3f(-.42,-.56,.71))),0.,1.);
  let source=vec3f(.09,1.20,2.55)*(.22+1.12*facing)+vec3f(.22,.90,1.25)*m.rho*m.rho;
  let absorb=1.-exp(-m.rho*step*13.);
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
  let relative=q-centre;let local=vec2f(dot(relative,axis),dot(relative,vec2f(-axis.y,axis.x)));
  let arrival=e((t-births[i])/85.)*(1.-e((t-ends[i]+5.)/100.))*live;
  let volume=gatherVolume(local,progress,(t-births[i])*.006*motion,motion,ten,axis);let ca=volume.a*arrival;let r=volume.rgb*arrival;
  if(i==0u){radBack+=r;coverBack=max(coverBack,ca*.30);}else{radFront+=r;coverFront=max(coverFront,ca*.36);}
  received+=vec3f(.16,1.10,2.25)*arrival*.013/(dot(q-centre,q-centre)+.16*.16+.06);
 }
 let lock=e((t-430.)/400.)*live;let settled=e((t-680.)/380.);let phase=min(t,1060.)*.006*motion;
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