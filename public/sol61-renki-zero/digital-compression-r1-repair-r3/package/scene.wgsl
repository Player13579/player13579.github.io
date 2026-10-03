struct U{view:vec4f,body:vec4f,clock:vec4f,flags:vec4f};
@group(0) @binding(0)var<uniform>u:U;
@group(0) @binding(1)var bodyTex:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
fn e(x:f32)->f32{let a=clamp(x,0.,1.);return a*a*(3.-2.*a);}
fn sq(x:f32)->f32{return x*x;}
fn compression(t:f32)->f32{return 1.-.06*e((t-748.)/32.)-.08*e((t-828.)/32.)-.08*e((t-908.)/32.);}
struct Cell{centre:vec3f,radii:vec3f,connected:f32,cellPresent:f32,progress:f32};
fn cellAt(i:u32,t:f32,ten:f32,motion:f32)->Cell{
 let lane=i/4u;let j=i%4u;
 let starts=array<vec2f,2>(vec2f(-.83,-.10),vec2f(.79,.28));
 let bends=array<vec2f,2>(vec2f(.08,-.20),vec2f(-.16,-.13));
 let births=array<f32,2>(40.,165.);let arrivals=array<f32,2>(560.,740.);
 let born=births[lane];let arrival=arrivals[lane];let p=e((t-born)/(arrival-born));
 let axis=normalize(-starts[lane]);let cross=vec2f(-axis.y,axis.x);
 // Four finite compartments of the SAME inbound field, not ornament particles.
 let phaseOffset=(f32(j)-1.5)*.18;
 let side=select(-1.,1.,j%2u==1u);
 let start=starts[lane]+axis*phaseOffset+cross*side*.095;
 let row=select(-1.,1.,j/2u==1u);
 let z=select(-.11,.11,lane==1u);
 let f=compression(t);let wide=1.+ten*.10;
 let settledCellCentre=vec3f(side*.15*wide,row*.12,z)*f;
 let centreXY=start*(1.-p)+bends[lane]*sin(3.14159265*p)*motion+settledCellCentre.xy*p;
 let connected=e((t-arrival)/28.);
 var out:Cell;out.centre=vec3f(centreXY,mix(z*.60,settledCellCentre.z,p));
 out.radii=mix(vec3f(.090*wide,.077,.074),vec3f(.15*wide,.12,.11)*f,e((p-.58)/.42));
 out.connected=connected;out.cellPresent=e((t-born)/65.);out.progress=p;return out;
}
struct Matter{density:f32,source:vec3f};
fn matterAt(v:vec3f,t:f32,cells:array<Cell,8>)->Matter{
 var density=0.;var weighted=vec3f(0.);var weight=0.;
 let f=compression(t);
 let frontZ=mix(.22,-.22,e((t-740.)/200.))*f;
 for(var i=0u;i<8u;i++){
  let cell=cells[i];
  let local=(v-cell.centre)/cell.radii;
  if(cell.cellPresent==0.||any(abs(local)>vec3f(1.15))){continue;}
  let metric=max(max(abs(local.x),abs(local.y)),abs(local.z));
  // At a shared committed face the union has full density: no fake grid seam.
  let bulk=1.-smoothstep(mix(.76,1.01,cell.connected),mix(1.,1.14,cell.connected),metric);
  let apertureMetric=sq(v.x/(.11*f))+sq((v.y+.045*f)/(.23*f));
  let aperture=(1.-smoothstep(.72,1.,apertureMetric))*e((v.z+.015)/.09)*cell.connected;
  let d=bulk*(1.-.985*aperture)*cell.cellPresent;
  // A single broad causal compression front sweeps into the connected matter.
  let plane=exp(-sq((v.z-frontZ)/(.052*f)))*cell.connected;
  let intake=exp(-sq((local.x-.36)/.34))*(1.-cell.connected);
  let depth=clamp((v.z+.32)/.64,0.,1.);
  let source=vec3f(.06,.95,2.30)*(.58+.38*depth)+vec3f(3.6,4.6,5.1)*(intake*.36+plane*.52);
  density=max(density,d);weighted+=source*d;weight+=d;
 }
 var out:Matter;out.density=density;out.source=weighted/max(weight,.00001);return out;
}
struct Field{front:vec3f,back:vec3f,alphaFront:f32,alphaBack:f32};
fn fieldAt(q:vec2f,t:f32,ten:f32,motion:f32)->Field{
 var out:Field;out.front=vec3f(0.);out.back=vec3f(0.);out.alphaFront=0.;out.alphaBack=0.;
 if(abs(q.x)>1.55||abs(q.y)>.95){return out;}
 var cells:array<Cell,8>;
 for(var i=0u;i<8u;i++){cells[i]=cellAt(i,t,ten,motion);}
 var tf=1.;var tb=1.;let step=.64/20.;
 for(var k=0u;k<20u;k++){
  let z=.32-(f32(k)+.5)*step;
  // Oblique finite depth projection: front/back edges differ at H64.
  let v=vec3f(q-vec2f(.44,-.28)*z,z);
  let m=matterAt(v,t,cells);let absorb=1.-exp(-m.density*step*14.);
  if(z>=0.){out.front+=tf*absorb*m.source;tf*=1.-absorb;}
  else{out.back+=tb*absorb*m.source;tb*=1.-absorb;}
 }
 out.alphaFront=1.-tf;out.alphaBack=1.-tb;return out;
}
struct Out{@location(0)scene:vec4f,@location(1)emission:vec4f};
@fragment fn fs(o:O)->Out{
 let px=o.uv*u.view.xy;let h=u.body.z;let foot=u.body.xy;let q=(px-vec2f(foot.x,foot.y-.37*h))/h;
 let t=u.clock.x;let life=e(t/65.)*(1.-e((t-1080.)/120.));let live=select(0.,life,t>0.&&t<1200.);let ten=u.clock.y;let motion=mix(1.,.35,u.clock.z);
 let quadH=h*1024./839.;let quadW=quadH*.5;let uv=(px-vec2f(foot.x-quadW*238./512.,foot.y-938./1024.*quadH))/vec2f(quadW,quadH);
 let valid=all(uv>=vec2f(0.))&&all(uv<=vec2f(1.));let body=textureSample(bodyTex,smp,vec2f((2.+clamp(uv.x,0.,1.))/3.,clamp(uv.y,0.,1.)))*select(0.,1.,valid);
 let field=fieldAt(q,t,ten,motion);
 var radFront=field.front*live;var radBack=field.back*live;
 let coverFront=field.alphaFront*live*.28;let coverBack=field.alphaBack*live*.30;
 var received=vec3f(0.);
 for(var i=0u;i<8u;i++){
  let c=cellAt(i,t,ten,motion);let centre=c.centre.xy+vec2f(.44,-.28)*c.centre.z;
  received+=vec3f(.16,1.10,2.25)*c.cellPresent*live*.00325/(dot(q-centre,q-centre)+.16*.16+.06);
 }
 // Existing local conversion source remains secondary and at the actual abdomen.
 let lock=e((t-430.)/400.)*live;
 let arrivalPressure=exp(-sq((t-560.)/70.))*.25+exp(-sq((t-740.)/75.))*.24;
 let sourceSupport=exp(-dot(q/vec2f(.065,.052),q/vec2f(.065,.052))*1.7)*body.a;
 radFront+=vec3f(5.4,6.5,7.2)*sourceSupport*lock*(.78+arrivalPressure);
 received+=vec3f(.32,1.55,2.55)*lock*.029/(dot(q,q)+.075);
 let on=u.flags.x;radFront*=on;radBack*=on;received*=on*u.flags.y;
 let floor=vec3f(.070,.084,.110)+vec3f(.020)*smoothstep(foot.y-15.,foot.y+50.,px.y);let floorNormal=max(0.,.37/sqrt(dot(q,q)+.37*.37));let floorLight=received*floorNormal*.13*smoothstep(foot.y-3.,foot.y+14.,px.y);
 let receiverBody=body.rgb*(vec3f(1.)+received*.25);let base=floor+floorLight;
 let background=base*(1.-coverBack*.15)+radBack;let scene=mix(background,receiverBody,body.a)*(1.-coverFront*.10)+radFront;
 let emission=radBack*(1.-body.a)+radFront;var out:Out;out.scene=vec4f(scene,1.);out.emission=vec4f(emission,1.);return out;
}
