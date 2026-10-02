
struct U{view:vec4f,body:vec4f,clock:vec4f,flags:vec4f};
@group(0) @binding(0)var<uniform>u:U;
@group(0) @binding(1)var bodyTex:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
fn e(x:f32)->f32{let a=clamp(x,0.,1.);return a*a*(3.-2.*a);}
fn rect(q:vec2f,s:vec2f)->f32{return max(abs(q.x)-s.x,abs(q.y)-s.y);}
fn cover(d:f32)->f32{return 1.-smoothstep(-.006,.011,d);}
// R6: continuous curved pressure conduit, not a translated polygon parcel.
fn gatherVolume(q:vec2f,start:vec2f,bend:vec2f,p:f32,phase:f32,motion:f32,ten:f32)->vec4f{
 var s=clamp(dot(q-start,-start)/dot(start,start),0.,1.);
 // Fixed bounded closest-curve coordinate refinement, outside the depth loop.
 for(var j=0u;j<2u;j++){
  let centre=start*(1.-s)+bend*sin(3.14159265*s)*motion;
  let first=-start+bend*3.14159265*cos(3.14159265*s)*motion;
  let second=-bend*9.8696044*sin(3.14159265*s)*motion;
  let denominator=max(.08,dot(first,first)+dot(centre-q,second));
  s=clamp(s-dot(centre-q,first)/denominator,0.,1.);
 }
 let centre=start*(1.-s)+bend*sin(3.14159265*s)*motion;
 let axis=normalize(-start+bend*3.14159265*cos(3.14159265*s)*motion);
 let across=dot(q-centre,vec2f(-axis.y,axis.x));let beyond=dot(q-centre,axis);
 let tail=max(0.,p-.72);let axial=e((s-tail+.04)/.075)*(1.-e((s-p+.10)/.115));
 let cap=1.-smoothstep(.06,.16,abs(beyond));
 let pulse=e((cos(s*12.5663706-phase*3.5)+.10)/.50);
 let compression=e((p-.42)/.58);
 let radius=(.15+.045*sin(3.14159265*s)+.025*pulse)*(1.-.20*compression)*(1.+ten*.10);
 let depth=.145*(1.+ten*.10);
 if(abs(across)>radius*1.10||axial*cap<=0.){return vec4f(0.);}
 var light=vec3f(0.);var trans=1.;let step=.36/6.;
 for(var k=0u;k<6u;k++){
  let z=.18-(f32(k)+.5)*step;
  let a=across/radius;let b=z/depth;let radial=a*a+b*b;
  let bulk=1.-smoothstep(.68,1.08,radial);
  let d=bulk*axial*cap*(.55+.45*pulse);
  let rawNormal=vec3f(across/(radius*radius),-.25,z/(depth*depth));
  let normal=rawNormal/max(length(rawNormal),.0001);
  let key=clamp(dot(normal,normalize(vec3f(-.35,-.45,.82))),0.,1.);
  let pressure=e((s-p+.24)/.20)*d;
  let source=vec3f(.06,.95,2.30)*(.68+.47*key)+vec3f(3.6,4.6,5.1)*pressure*pressure;
  let absorb=1.-exp(-d*step*13.);light+=trans*absorb*source;trans*=1.-absorb;
 }
 return vec4f(light,1.-trans);
}
// Rounded asymmetric stored medium; no clip-plane waist hull or closed rim.
fn chamberDensity(v:vec3f,rx:f32,ry:f32,settled:f32,phase:f32)->f32{
 let xx=v.x+.18*v.y+.12*v.z+.035*sin(v.y*7.+phase)*(1.-settled*.55);
 let yy=v.y-.10*v.x+.018;
 let nx=(xx+.035)/rx;let ny=yy/ry;let nz=v.z/.18;
 let radial=nx*nx+ny*ny+nz*nz;
 let bulk=1.-smoothstep(.62,1.06,radial);
 let airX=.035+.20*yy;let gapCross=v.x+.18*v.y+.035*sin(v.y*7.+phase)*(1.-settled*.55);
 let gap=1.-(1.-smoothstep(.032,.060,abs(gapCross-airX)))*(1.-e((yy+.035)/.13));
 let fold=.70+.30*e((ny+.30*nz+.20*sin(phase)*(1.-settled))/.65);
 return bulk*gap*fold;
}
struct Storage{front:vec4f,back:vec4f};
fn chamberVolume(q:vec2f,settled:f32,phase:f32,ten:f32)->Storage{
 let rx=mix(.32,.25,settled)*(1.+ten*.10);let ry=mix(.23,.20,settled);
 var out:Storage;out.front=vec4f(0.);out.back=vec4f(0.);
 if(abs(q.x)>.44||abs(q.y)>.34){return out;}
 var frontLight=vec3f(0.);var backLight=vec3f(0.);var frontTrans=1.;var backTrans=1.;let step=.36/8.;
 for(var k=0u;k<8u;k++){
  let z=.18-(f32(k)+.5)*step;let v=vec3f(q,z);let d=chamberDensity(v,rx,ry,settled,phase);
  let xx=v.x+.18*v.y+.12*v.z+.035*sin(v.y*7.+phase)*(1.-settled*.55);
  let yy=v.y-.10*v.x+.018;
  let rawNormal=vec3f((xx+.035)/(rx*rx),yy/(ry*ry),z/(.18*.18));
  let normal=rawNormal/max(length(rawNormal),.0001);
  let key=clamp(dot(normal,normalize(vec3f(-.35,-.45,.82))),0.,1.);
  let source=vec3f(.09,1.20,2.55)*(.58+.62*key)+vec3f(.22,.90,1.25)*d*d;
  let absorb=1.-exp(-d*step*14.);
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
  let arrival=e((t-births[i])/85.)*(1.-e((t-ends[i]+5.)/100.))*live;
  let volume=gatherVolume(q,starts[i],bends[i],progress,(t-births[i])*.006*motion,motion,ten);let ca=volume.a*arrival;let r=volume.rgb*arrival;
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