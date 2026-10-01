struct U { canvasWidth:f32, canvasHeight:f32, actorX:f32, actorY:f32,
  monitorAge:f32, lockerAge:f32, authAge:f32, rackAge:f32,
  monitorOn:f32, lockerOn:f32, authOn:f32, rackOn:f32,
  objectLayerOn:f32, actorOn:f32, diagnosticMode:f32, motionScale:f32,
  objectShiftX:f32, objectShiftY:f32, _pad2:f32, _pad3:f32, };
@group(0) @binding(0) var<uniform> u:U;
struct VOut { @builtin(position) pos:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {
 var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
 var o:VOut;o.pos=vec4f(p[i],0.,1.);return o;
}
fn rect(p:vec2f,b:vec4f)->f32{return select(0.,1.,p.x>=b.x&&p.x<=b.z&&p.y>=b.y&&p.y<=b.w);}
fn sdBox(p:vec2f,c:vec2f,h:vec2f)->f32{let q=abs(p-c)-h;return length(max(q,vec2f(0.)))+min(max(q.x,q.y),0.);}
fn env(age:f32)->f32 { if(age<0.||age>=1800.){return 0.;} let a=age/120.;if(age<120.){return a*a*(3.-2.*a);} if(age<=1400.){return 1.;}let t=(1800.-age)/400.;return t*t*(3.-2.*t); }
fn lineDistance(p:vec2f,a:vec2f,b:vec2f)->f32{let d=b-a;let t=clamp(dot(p-a,d)/max(dot(d,d),0.0001),0.,1.);return distance(p,a+d*t);}
fn line(p:vec2f,a:vec2f,b:vec2f,w:f32)->f32{return select(0.,1.,lineDistance(p,a,b)<=w);}
fn rim(p:vec2f,a:vec2f,b:vec2f)->f32{return 1.-smoothstep(2.,14.,lineDistance(p,a,b));}
fn pointQuad(p:vec2f,a:vec2f,b:vec2f,c:vec2f,d:vec2f)->f32{
 let s1=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);let s2=(c.x-b.x)*(p.y-b.y)-(c.y-b.y)*(p.x-b.x);
 let s3=(d.x-c.x)*(p.y-c.y)-(d.y-c.y)*(p.x-c.x);let s4=(a.x-d.x)*(p.y-d.y)-(a.y-d.y)*(p.x-d.x);
 return select(0.,1.,(s1>=0.&&s2>=0.&&s3>=0.&&s4>=0.)||(s1<=0.&&s2<=0.&&s3<=0.&&s4<=0.));
}
fn linearToSrgb(v:vec3f)->vec3f{return select(1.055*pow(max(v,vec3f(0.)),vec3f(1./2.4))-.055,v*12.92,v<=vec3f(.0031308));}
fn col(c:vec3f,a:f32)->vec4f{let response=vec3f(1.)-exp(-max(c,vec3f(0.)));return vec4f(linearToSrgb(response)*a,a);}
@fragment fn fs(i:VOut)->@location(0) vec4f{
 let screenP=vec2f(i.pos.x*1340./u.canvasWidth,i.pos.y*1174./u.canvasHeight);
 let p=screenP-vec2f(u.objectShiftX,u.objectShiftY);
 let trayY=array<f32,4>(699.5,737.,774.,812.5);let trayX0=array<f32,4>(1116.,1112.,1108.,1103.);let trayX1=array<f32,4>(1211.,1208.,1204.,1199.);
 var out=vec4f(0.);let actor=vec2f(u.actorX,u.actorY);
 if(u.actorOn>0.5){let d=distance(screenP,actor);if(d<=18.&&d>=14.){out=col(vec3f(.28,.82,1.),.98);}else if(d<12.){out=col(vec3f(.10,.38,.72),.88);}}
 if(u.objectLayerOn<.5){return out;}
 let am=env(u.monitorAge)*u.monitorOn;let al=env(u.lockerAge)*u.lockerOn;let aa=env(u.authAge)*u.authOn;let ar=env(u.rackAge)*u.rackOn;
 // Six monitor glass quads. Each advancing strip remains clipped to its source face.
 let monitorA=array<vec2f,6>(vec2f(519.,139.),vec2f(650.,130.),vec2f(808.,131.),vec2f(526.,197.),vec2f(652.,187.),vec2f(804.,185.));
 let monitorB=array<vec2f,6>(vec2f(635.,127.),vec2f(792.,131.),vec2f(925.,141.),vec2f(637.,184.),vec2f(787.,185.),vec2f(921.,196.));
 let monitorC=array<vec2f,6>(vec2f(637.,172.),vec2f(788.,175.),vec2f(918.,183.),vec2f(639.,223.),vec2f(784.,223.),vec2f(914.,238.));
 let monitorD=array<vec2f,6>(vec2f(523.,184.),vec2f(650.,173.),vec2f(803.,173.),vec2f(526.,237.),vec2f(651.,225.),vec2f(800.,226.));
 if(u.diagnosticMode!=2.&&u.diagnosticMode!=3.){
 for(var k=0;k<6;k++){
  let age=u.monitorAge;let start=120.+f32(k)*80.;let e=env(age)*u.monitorOn;let q=pointQuad(p,monitorA[k],monitorB[k],monitorC[k],monitorD[k]);
  if(e>0.&&q>0.){let travel=select(.5,clamp((age-start)/360.,0.,1.),u.motionScale>.5);let h=monitorA[k].y+(monitorD[k].y-monitorA[k].y)*travel;let band=select(0.,1.,p.y>=h&&p.y<=h+12.&&age>=start&&age<start+360.);let accepted=line(p,monitorD[k],monitorC[k],2.)*select(0.,1.,age<120.);
   let top=line(p,monitorA[k],monitorB[k],2.);let left=line(p,monitorA[k],monitorD[k],2.);let right=line(p,monitorB[k],monitorC[k],2.);
   let frame=max(max(top,left),right)*select(0.,1.,age>=900.&&age<1400.);
   out+=col(vec3f(.08,.24,.70),max(band,accepted)*e*.95);out+=col(vec3f(.18,.55,1.8),frame*e*.95);}}
 // Locker shelves join from both ends around a contracting 12 px gap.
 for(var j=0;j<3;j++){let age=u.lockerAge;let start=120.+f32(j)*140.;let e=env(age)*u.lockerOn;let cy=225.+f32(j)*50.5;let join=select(1.,clamp((age-start)/300.,0.,1.),u.motionScale>.5);let half=5.5+join*12.;
  let mask=pointQuad(p,vec2f(260.,194.),vec2f(310.,194.),vec2f(321.,365.),vec2f(275.,365.));let shelf=select(0.,1.,abs(p.y-cy)<=6.&&abs(p.x-(287.+f32(j)*4.))<=half&&((age>=start&&age<start+300.)||(age<120.&&abs(p.x-(287.+f32(j)*4.))<=6.)));
  let done=select(0.,1.,age>=900.&&age<1400.&&abs(p.y-cy)<=6.&&abs(p.x-(287.+f32(j)*4.))<=17.5);
  let v=max(shelf,done)*mask*e;if(v>0.){let color=select(vec3f(.06,.35,.16),vec3f(.20,1.2,.55),done>0.);out+=col(color,v*.90);}}
 // Authentication display: moving 14 px reception strip and connected check strokes.
 if(aa>0.){let display=pointQuad(p,vec2f(1183.,397.),vec2f(1208.,397.),vec2f(1209.,439.),vec2f(1188.,439.));
  let travel=select(.5,clamp((u.authAge-120.)/280.,0.,1.),u.motionScale>.5);let x=1188.+travel*12.;let strip=select(0.,1.,abs(p.x-x)<=7.&&u.authAge<900.);
  let a=vec2f(1188.,417.);let b=vec2f(1194.,426.);let c=vec2f(1205.,407.);
  let t1=clamp((u.authAge-400.)/250.,0.,1.);let t2=clamp((u.authAge-650.)/250.,0.,1.);
  let check=line(p,a,mix(a,b,t1),2.)*select(0.,1.,u.authAge>=400.)+line(p,b,mix(b,c,t2),2.)*select(0.,1.,u.authAge>=650.);
  if(display>0.){out+=col(vec3f(.04,.40,.34),strip*aa*.85);out+=col(vec3f(.12,1.4,1.1),check*aa*.95);}}
 // Four service packets travel only within their corresponding tray.
 for(var n=0;n<4;n++){let age=u.rackAge;let start=120.+f32(n)*150.;let e=env(age)*u.rackOn;let t=select(.5,clamp((age-start)/300.,0.,1.),u.motionScale>.5);let x=mix(trayX1[n]-19.,trayX0[n]+19.,t);
  let moving=rect(p,vec4f(x-19.,trayY[n]-5.,x+19.,trayY[n]+5.))*select(0.,1.,age>=start&&age<start+300.);
  let accepted=rect(p,vec4f(trayX1[n]-38.,trayY[n]-5.,trayX1[n],trayY[n]+5.))*select(0.,1.,age<120.);
   let done=rect(p,vec4f(trayX0[n],trayY[n]-4.,trayX0[n]+24.,trayY[n]+4.))*select(0.,1.,age>=start+300.&&age<1400.);
   if(accepted>0.||moving>0.){out+=col(vec3f(.12,.20,.55),e*.85);}if(done>0.){out+=col(vec3f(.45,.65,1.7),e*.96);}}
 }
 if(u.diagnosticMode==1.){out.a=clamp(out.a,0.,1.);return out;}
 if(u.diagnosticMode==3.){
   var halo=0.;
   for(var k=0;k<6;k++){let age=u.monitorAge-f32(k)*80.;let c=(monitorA[k]+monitorB[k]+monitorC[k]+monitorD[k])*.25;halo=max(halo,exp(-distance(p,c)*distance(p,c)/50.)*env(age)*u.monitorOn);}
   let lockerCenter=vec2f(291.,275.);halo=max(halo,exp(-distance(p,lockerCenter)*distance(p,lockerCenter)/50.)*al);
   halo=max(halo,exp(-distance(p,vec2f(1196.,418.))*distance(p,vec2f(1196.,418.))/50.)*aa);
   halo=max(halo,exp(-distance(p,vec2f(1140.,774.))*distance(p,vec2f(1140.,774.))/50.)*ar);
   out+=col(vec3f(.18,.55,1.),halo*.25);out.a=clamp(out.a,0.,1.);return out;
 }
 if(u.diagnosticMode==0.){
   var localBloom=0.;
   for(var k=0;k<6;k++){let center=(monitorA[k]+monitorB[k]+monitorC[k]+monitorD[k])*.25;let start=120.+f32(k)*80.;
    localBloom=max(localBloom,exp(-distance(p,center)*distance(p,center)/50.)*select(0.,1.,u.monitorAge>=start&&u.monitorOn>0.5)*am);}
   for(var j=0;j<3;j++){let center=vec2f(287.+f32(j)*4.,225.+f32(j)*50.5);let start=120.+f32(j)*140.;localBloom=max(localBloom,exp(-distance(p,center)*distance(p,center)/50.)*select(0.,1.,u.lockerAge>=start&&u.lockerOn>0.5)*al);}
   localBloom=max(localBloom,exp(-distance(p,vec2f(1196.,418.))*distance(p,vec2f(1196.,418.))/50.)*select(0.,1.,u.authAge>=120.&&u.authOn>0.5)*aa);
   for(var n=0;n<4;n++){let start=120.+f32(n)*150.;let center=vec2f(mix(trayX1[n],trayX0[n],clamp((u.rackAge-start)/300.,0.,1.)),trayY[n]);localBloom=max(localBloom,exp(-distance(p,center)*distance(p,center)/50.)*select(0.,1.,u.rackAge>=start&&u.rackOn>0.5)*ar);}
   out+=col(vec3f(.08,.24,.70),localBloom*.22);
 }
 // Tight material response on registered monitor desk, locker bay, auth panel and rack edges.
 for(var k=0;k<6;k++){let doneAt=480.+f32(k)*80.;let xa=431.+f32(k)*555./6.;let xb=431.+f32(k+1)*555./6.;let ya=290.+(xa-431.)*5./555.;let yb=290.+(xb-431.)*5./555.;
  let reach=rim(p,vec2f(xa,ya),vec2f(xb,yb))*select(0.,1.,u.monitorAge>=doneAt&&u.monitorAge<1400.)*am;
  if(reach>0.){out+=col(vec3f(.08,.24,.70),reach*.75);}}
 for(var j=0;j<3;j++){let doneAt=420.+f32(j)*140.;let reach=max(rim(p,vec2f(255.,194.),vec2f(270.,365.)),rim(p,vec2f(312.,194.),vec2f(327.,365.)))*select(0.,1.,u.lockerAge>=doneAt&&u.lockerAge<1400.)*al;
  if(reach>0.){out+=col(vec3f(.06,.35,.16),reach*.75);}}
 let panel=pointQuad(p,vec2f(1142.,313.),vec2f(1197.,312.),vec2f(1209.,386.),vec2f(1154.,389.));
 let authRim=max(rim(p,vec2f(1180.,397.),vec2f(1185.,440.)),panel*select(0.,1.,p.x>=1154.&&p.x<=1209.&&p.y>=360.))*select(0.,1.,u.authAge>=900.&&u.authAge<1400.)*aa;
 if(authRim>0.){out+=col(vec3f(.04,.40,.34),authRim*.75);}
 for(var n=0;n<4;n++){let doneAt=420.+f32(n)*150.;let y=trayY[n];let right=mix(1223.,1206.,(y-681.)/150.);let left=mix(1091.,1075.,(y-681.)/153.);
  let reach=max(rim(p,vec2f(right,y-12.),vec2f(right,y+12.)),rim(p,vec2f(left,y-12.),vec2f(left,y+12.)))*select(0.,1.,u.rackAge>=doneAt&&u.rackAge<1400.)*ar;
  if(reach>0.){out+=col(vec3f(.12,.20,.55),reach*.75);}}
 out.a=clamp(out.a,0.,1.);return out;
}
