// Security room r05 optical derivative artist. B197ca58. Generated from hand-traced original geometry.
// World PH emitter/receiver -> chosen telecentric virtual-camera OBS. No new textures.
struct State {clock:vec4f,sourceGroups:vec4f,display:vec4f,observer:vec4f};
// clock=(Eseconds,authAge,nearEnabled,flareEnabled)
// sourceGroups=(monitor,auth,rack,visibility); display=(outputIsSrgb,motionScale,sourceShiftX,Y)
// observer=(centerX,centerY,pupilRotationRadians,exposure), uniform64 bytes.
@group(0) @binding(0) var<uniform> state:State;
@group(0) @binding(1) var baseTex:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
@group(0) @binding(3) var worldTex:texture_2d<f32>;
@group(0) @binding(4) var sourceTex:texture_2d<f32>;
@group(0) @binding(5) var receivedTex:texture_2d<f32>;
@group(0) @binding(6) var rimAccentTex:texture_2d<f32>;
struct VOut{@builtin(position)position:vec4f,@location(0)uv:vec2f};
@vertex fn fullScreen(@builtin(vertex_index)i:u32)->VOut{let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.))[i];var o:VOut;o.position=vec4f(q,0.,1.);o.uv=vec2f((q.x+1.)*.5,(1.-q.y)*.5);return o;}
fn polyDistance(p:vec2f,a:array<vec2f,20>,count:u32)->f32{
 var d=1e9;var interior=false;
 for(var i=0u;i<count;i++){let q=a[i];let r=a[(i+1u)%count];let e=r-q;let t=clamp(dot(p-q,e)/max(dot(e,e),.0001),0.,1.);d=min(d,length(p-q-e*t));
  if((q.y>p.y)!=(r.y>p.y)){let x=q.x+(r.x-q.x)*(p.y-q.y)/(r.y-q.y);if(p.x<x){interior=!interior;}}}
 return select(-d,d,interior);
}
fn authEnvelope(age:f32)->f32{if(age<0.||age>=1.25){return 0.;}if(age<.08){let a=sin(1.570796327*age/.08);return a*a;}let a=cos(1.570796327*(age-.08)/1.17);return a*a;}
fn sourceMask0(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(524.,142.),vec2f(633.,131.),vec2f(636.,172.),vec2f(528.,181.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.),vec2f(524.,142.)),4u));}
fn sourceMask1(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(653.,132.),vec2f(790.,132.),vec2f(785.,171.),vec2f(653.,172.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.),vec2f(653.,132.)),4u));}
fn sourceMask2(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(810.,135.),vec2f(920.,146.),vec2f(914.,181.),vec2f(806.,171.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.),vec2f(810.,135.)),4u));}
fn sourceMask3(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(528.,199.),vec2f(635.,188.),vec2f(637.,228.),vec2f(531.,235.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.),vec2f(528.,199.)),4u));}
fn sourceMask4(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(653.,186.),vec2f(786.,186.),vec2f(784.,225.),vec2f(652.,226.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.),vec2f(653.,186.)),4u));}
fn sourceMask5(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(807.,186.),vec2f(915.,195.),vec2f(910.,233.),vec2f(804.,225.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.),vec2f(807.,186.)),4u));}
fn sourceMask6(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(1189.,404.),vec2f(1202.,404.),vec2f(1204.,436.),vec2f(1191.,436.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.),vec2f(1189.,404.)),4u));}
fn sourceMask7(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1190.,298.))/vec2f(3.,1.5)));}
fn sourceMask8(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1157.,367.))/vec2f(2.,5.)));}
fn sourceMask9(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1189.,461.))/vec2f(2.,2.)));}
fn sourceMask10(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1143.,696.))/vec2f(3.,1.2)));}
fn sourceMask11(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1195.,735.))/vec2f(1.5,1.6)));}
fn sourceMask12(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1193.,743.))/vec2f(1.5,1.6)));}
fn sourceMask13(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1191.,752.))/vec2f(1.5,1.6)));}
fn sourceMask14(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1188.,782.))/vec2f(1.5,1.6)));}
fn sourceMask15(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1186.,790.))/vec2f(1.5,1.6)));}
fn sourceMask16(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1184.,810.))/vec2f(1.5,1.6)));}
fn sourceMask17(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1182.,818.))/vec2f(1.5,1.6)));}
fn sourceMask18(p:vec2f)->f32{return 1.-smoothstep(.85,1.15,length((p-vec2f(1180.,825.))/vec2f(1.5,1.6)));}
fn receiverMask0(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(428.,248.),vec2f(494.,235.),vec2f(916.,244.),vec2f(989.,254.),vec2f(990.,290.),vec2f(427.,292.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.),vec2f(428.,248.)),6u));}
fn receiverMask1(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(434.,299.),vec2f(510.,299.),vec2f(511.,355.),vec2f(438.,355.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.),vec2f(434.,299.)),4u));}
fn receiverMask2(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(912.,300.),vec2f(978.,300.),vec2f(976.,356.),vec2f(911.,358.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.),vec2f(912.,300.)),4u));}
fn receiverMask3(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(182.,384.),vec2f(409.,384.),vec2f(409.,299.),vec2f(989.,299.),vec2f(1013.,284.),vec2f(1124.,284.),vec2f(1128.,564.),vec2f(1080.,568.),vec2f(1065.,849.),vec2f(764.,849.),vec2f(764.,944.),vec2f(575.,944.),vec2f(575.,849.),vec2f(182.,849.),vec2f(182.,384.),vec2f(182.,384.),vec2f(182.,384.),vec2f(182.,384.),vec2f(182.,384.),vec2f(182.,384.)),14u))*(1.-max(receiverMask0(p),max(receiverMask1(p),receiverMask2(p))));}
fn occupancyMask0(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(656.,309.),vec2f(679.,304.),vec2f(725.,307.),vec2f(743.,319.),vec2f(737.,363.),vec2f(723.,370.),vec2f(670.,365.),vec2f(655.,351.),vec2f(656.,309.),vec2f(656.,309.),vec2f(656.,309.),vec2f(656.,309.),vec2f(656.,309.),vec2f(656.,309.),vec2f(656.,309.),vec2f(656.,309.),vec2f(656.,309.),vec2f(656.,309.),vec2f(656.,309.),vec2f(656.,309.)),8u));}
fn occupancyMask1(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(632.,298.),vec2f(646.,297.),vec2f(655.,347.),vec2f(645.,351.),vec2f(636.,332.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.),vec2f(632.,298.)),5u));}
fn occupancyMask2(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(761.,297.),vec2f(775.,299.),vec2f(770.,333.),vec2f(758.,351.),vec2f(747.,347.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.),vec2f(761.,297.)),5u));}
fn occupancyMask3(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(651.,352.),vec2f(740.,353.),vec2f(746.,371.),vec2f(725.,381.),vec2f(668.,377.),vec2f(651.,367.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.),vec2f(651.,352.)),6u));}
fn occupancyMask4(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(694.,373.),vec2f(705.,377.),vec2f(669.,398.),vec2f(661.,402.),vec2f(651.,401.),vec2f(647.,391.),vec2f(654.,384.),vec2f(660.,387.),vec2f(694.,373.),vec2f(694.,373.),vec2f(694.,373.),vec2f(694.,373.),vec2f(694.,373.),vec2f(694.,373.),vec2f(694.,373.),vec2f(694.,373.),vec2f(694.,373.),vec2f(694.,373.),vec2f(694.,373.),vec2f(694.,373.)),8u));}
fn occupancyMask5(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(701.,370.),vec2f(713.,371.),vec2f(760.,387.),vec2f(763.,396.),vec2f(757.,403.),vec2f(748.,401.),vec2f(746.,392.),vec2f(701.,370.),vec2f(701.,370.),vec2f(701.,370.),vec2f(701.,370.),vec2f(701.,370.),vec2f(701.,370.),vec2f(701.,370.),vec2f(701.,370.),vec2f(701.,370.),vec2f(701.,370.),vec2f(701.,370.),vec2f(701.,370.),vec2f(701.,370.)),7u));}
fn occupancyMask6(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(696.,360.),vec2f(710.,360.),vec2f(714.,383.),vec2f(703.,389.),vec2f(693.,383.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.),vec2f(696.,360.)),5u));}
fn occupancyMask7(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(657.,244.),vec2f(742.,244.),vec2f(742.,276.),vec2f(657.,276.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.),vec2f(657.,244.)),4u));}
fn occupancyMask8(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(780.,242.),vec2f(816.,246.),vec2f(819.,278.),vec2f(781.,277.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.),vec2f(780.,242.)),4u));}
fn occupancyMask9(p:vec2f)->f32{return smoothstep(-.75,.75,polyDistance(p,array<vec2f,20>(vec2f(751.,247.),vec2f(769.,247.),vec2f(772.,270.),vec2f(748.,270.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.),vec2f(751.,247.)),4u));}
fn foregroundOccupancy(p:vec2f)->f32{var o=0.;o=max(o,occupancyMask0(p));o=max(o,occupancyMask1(p));o=max(o,occupancyMask2(p));o=max(o,occupancyMask3(p));o=max(o,occupancyMask4(p));o=max(o,occupancyMask5(p));o=max(o,occupancyMask6(p));o=max(o,occupancyMask7(p));o=max(o,occupancyMask8(p));o=max(o,occupancyMask9(p));return o;}
struct SourceOut{@location(0)world:vec4f,@location(1)source:vec4f};
@fragment fn sourceWorld(in:VOut)->SourceOut{
 let actual=in.uv*vec2f(1340.,1174.);let p=actual-state.display.zw;
 let base=textureSample(baseTex,linearSampler,in.uv).rgb;
 // Texture luminance modulates emitted detail only; coverage is entirely authored geometry.
 let pattern=.55+.45*clamp(dot(base,vec3f(.2126,.7152,.0722))*3.,0.,1.);
 var energy=vec3f(0.);var coverage=0.;
  {let m=sourceMask0(p)*state.sourceGroups[0]*state.sourceGroups.w;let duty=.90;let e=vec3f(0.18,0.62,1.55)*2.15*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask1(p)*state.sourceGroups[0]*state.sourceGroups.w;let duty=.90;let e=vec3f(0.18,0.62,1.55)*2.15*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask2(p)*state.sourceGroups[0]*state.sourceGroups.w;let duty=.90;let e=vec3f(0.18,0.62,1.55)*2.15*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask3(p)*state.sourceGroups[0]*state.sourceGroups.w;let duty=.90;let e=vec3f(0.18,0.62,1.55)*2.15*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask4(p)*state.sourceGroups[0]*state.sourceGroups.w;let duty=.90;let e=vec3f(0.18,0.62,1.55)*2.15*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask5(p)*state.sourceGroups[0]*state.sourceGroups.w;let duty=.90;let e=vec3f(0.18,0.62,1.55)*2.15*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask6(p)*state.sourceGroups[1]*state.sourceGroups.w;let duty=(.74+1.4*authEnvelope(state.clock.y));let e=vec3f(0.12,0.75,1.35)*2.*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask7(p)*state.sourceGroups[1]*state.sourceGroups.w;let duty=(.74+1.4*authEnvelope(state.clock.y));let e=vec3f(0.1,1.18,0.6)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask8(p)*state.sourceGroups[1]*state.sourceGroups.w;let duty=(.74+1.4*authEnvelope(state.clock.y));let e=vec3f(0.1,1.18,0.6)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask9(p)*state.sourceGroups[1]*state.sourceGroups.w;let duty=(.74+1.4*authEnvelope(state.clock.y));let e=vec3f(0.1,1.18,0.6)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask10(p)*state.sourceGroups[2]*state.sourceGroups.w;let duty=.88;let e=vec3f(0.1,1.18,0.6)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask11(p)*state.sourceGroups[2]*state.sourceGroups.w;let duty=.88;let e=vec3f(0.14,0.5,1.35)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask12(p)*state.sourceGroups[2]*state.sourceGroups.w;let duty=.88;let e=vec3f(0.14,0.5,1.35)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask13(p)*state.sourceGroups[2]*state.sourceGroups.w;let duty=.88;let e=vec3f(0.14,0.5,1.35)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask14(p)*state.sourceGroups[2]*state.sourceGroups.w;let duty=.88;let e=vec3f(0.14,0.5,1.35)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask15(p)*state.sourceGroups[2]*state.sourceGroups.w;let duty=.88;let e=vec3f(0.14,0.5,1.35)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask16(p)*state.sourceGroups[2]*state.sourceGroups.w;let duty=.88;let e=vec3f(0.14,0.5,1.35)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask17(p)*state.sourceGroups[2]*state.sourceGroups.w;let duty=.88;let e=vec3f(0.14,0.5,1.35)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
  {let m=sourceMask18(p)*state.sourceGroups[2]*state.sourceGroups.w;let duty=.88;let e=vec3f(0.14,0.5,1.35)*2.3*duty*pattern*m;energy+=e;coverage=max(coverage,m);}
 var o:SourceOut;o.world=vec4f(base,1.);o.source=vec4f(energy,coverage);return o;
}
fn sourceEnergy(c:vec2f)->vec3f{return textureLoad(sourceTex,clamp(vec2i(c),vec2i(0),vec2i(1339,1173)),0).rgb;}
fn lobe(p:vec2f,c:vec2f,reach:vec2f,source:vec2f,normal:vec2f)->f32{
 let delta=p-c;let q=length(delta/reach);let toward=normalize(p-source+vec2f(.001,.001));
 // Projected incidence is explicitly an artist surface proxy, not a recovered 3D normal map.
 let incidence=max(0.,dot(toward,normalize(normal)));return exp(-q*q*2.)*(1.-smoothstep(.85,1.2,q))*incidence;
}
fn surfaceResponse(p:vec2f,c:vec2f,normal:vec3f,rough:f32,albedo:vec3f)->vec3f{
 // Dry hard-surface GGX/Fresnel closure with declared projected-geometry proxy.
 // .006 original-pixel/metre conversion and .9m local height gap are artist calibration.
 let N=normalize(normal);let L=normalize(vec3f((c-p)*.006,.9));let V=normalize(vec3f(0.,-.5,.8660254));let H=normalize(L+V);
 let nl=max(dot(N,L),0.);let nv=max(dot(N,V),.001);let nh=max(dot(N,H),0.);let vh=max(dot(V,H),0.);
 let a=rough*rough;let a2=a*a;let den=nh*nh*(a2-1.)+1.;let D=a2/(3.14159265*den*den);
 let k=(rough+1.)*(rough+1.)/8.;let G=(nl/(nl*(1.-k)+k))*(nv/(nv*(1.-k)+k));
 let F=.04+.96*pow(1.-vh,5.);let spec=D*G*F/max(4.*nl*nv,.001);
 // Radiance calibration is pi-normalized; reflected diffuse and specular share energy.
 return ((1.-F)*albedo+vec3f(spec*3.14159265))*nl;
}
@fragment fn worldReceive(in:VOut)->@location(0)vec4f{
 let p=in.uv*vec2f(1340.,1174.);var received=vec3f(0.);
 received+=sourceEnergy(vec2f(580.,155.)+state.display.zw)*lobe(p,vec2f(580.,155.)+state.display.zw+vec2f(0.,102.),vec2f(84.,62.),vec2f(580.,155.)+state.display.zw,vec2f(0.,1.))*receiverMask0(p)*surfaceResponse(p,vec2f(580.,155.)+state.display.zw,vec3f(0.,0.,1.),0.68,vec3f(0.22,0.24,0.26))*0.16;
  received+=sourceEnergy(vec2f(580.,155.)+state.display.zw)*lobe(p,vec2f(580.,155.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(580.,155.)+state.display.zw,vec2f(0.,1.))*receiverMask1(p)*surfaceResponse(p,vec2f(580.,155.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(580.,155.)+state.display.zw)*lobe(p,vec2f(580.,155.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(580.,155.)+state.display.zw,vec2f(0.,1.))*receiverMask2(p)*surfaceResponse(p,vec2f(580.,155.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(580.,155.)+state.display.zw)*lobe(p,vec2f(580.,155.)+state.display.zw+vec2f(0.,270.),vec2f(100.,170.),vec2f(580.,155.)+state.display.zw,vec2f(0.,1.))*receiverMask3(p)*surfaceResponse(p,vec2f(580.,155.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(720.,151.)+state.display.zw)*lobe(p,vec2f(720.,151.)+state.display.zw+vec2f(0.,102.),vec2f(84.,62.),vec2f(720.,151.)+state.display.zw,vec2f(0.,1.))*receiverMask0(p)*surfaceResponse(p,vec2f(720.,151.)+state.display.zw,vec3f(0.,0.,1.),0.68,vec3f(0.22,0.24,0.26))*0.16;
  received+=sourceEnergy(vec2f(720.,151.)+state.display.zw)*lobe(p,vec2f(720.,151.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(720.,151.)+state.display.zw,vec2f(0.,1.))*receiverMask1(p)*surfaceResponse(p,vec2f(720.,151.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(720.,151.)+state.display.zw)*lobe(p,vec2f(720.,151.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(720.,151.)+state.display.zw,vec2f(0.,1.))*receiverMask2(p)*surfaceResponse(p,vec2f(720.,151.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(720.,151.)+state.display.zw)*lobe(p,vec2f(720.,151.)+state.display.zw+vec2f(0.,270.),vec2f(100.,170.),vec2f(720.,151.)+state.display.zw,vec2f(0.,1.))*receiverMask3(p)*surfaceResponse(p,vec2f(720.,151.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(863.,158.)+state.display.zw)*lobe(p,vec2f(863.,158.)+state.display.zw+vec2f(0.,102.),vec2f(84.,62.),vec2f(863.,158.)+state.display.zw,vec2f(0.,1.))*receiverMask0(p)*surfaceResponse(p,vec2f(863.,158.)+state.display.zw,vec3f(0.,0.,1.),0.68,vec3f(0.22,0.24,0.26))*0.16;
  received+=sourceEnergy(vec2f(863.,158.)+state.display.zw)*lobe(p,vec2f(863.,158.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(863.,158.)+state.display.zw,vec2f(0.,1.))*receiverMask1(p)*surfaceResponse(p,vec2f(863.,158.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(863.,158.)+state.display.zw)*lobe(p,vec2f(863.,158.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(863.,158.)+state.display.zw,vec2f(0.,1.))*receiverMask2(p)*surfaceResponse(p,vec2f(863.,158.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(863.,158.)+state.display.zw)*lobe(p,vec2f(863.,158.)+state.display.zw+vec2f(0.,270.),vec2f(100.,170.),vec2f(863.,158.)+state.display.zw,vec2f(0.,1.))*receiverMask3(p)*surfaceResponse(p,vec2f(863.,158.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(581.,211.)+state.display.zw)*lobe(p,vec2f(581.,211.)+state.display.zw+vec2f(0.,102.),vec2f(84.,62.),vec2f(581.,211.)+state.display.zw,vec2f(0.,1.))*receiverMask0(p)*surfaceResponse(p,vec2f(581.,211.)+state.display.zw,vec3f(0.,0.,1.),0.68,vec3f(0.22,0.24,0.26))*0.16;
  received+=sourceEnergy(vec2f(581.,211.)+state.display.zw)*lobe(p,vec2f(581.,211.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(581.,211.)+state.display.zw,vec2f(0.,1.))*receiverMask1(p)*surfaceResponse(p,vec2f(581.,211.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(581.,211.)+state.display.zw)*lobe(p,vec2f(581.,211.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(581.,211.)+state.display.zw,vec2f(0.,1.))*receiverMask2(p)*surfaceResponse(p,vec2f(581.,211.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(581.,211.)+state.display.zw)*lobe(p,vec2f(581.,211.)+state.display.zw+vec2f(0.,270.),vec2f(100.,170.),vec2f(581.,211.)+state.display.zw,vec2f(0.,1.))*receiverMask3(p)*surfaceResponse(p,vec2f(581.,211.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(719.,205.)+state.display.zw)*lobe(p,vec2f(719.,205.)+state.display.zw+vec2f(0.,102.),vec2f(84.,62.),vec2f(719.,205.)+state.display.zw,vec2f(0.,1.))*receiverMask0(p)*surfaceResponse(p,vec2f(719.,205.)+state.display.zw,vec3f(0.,0.,1.),0.68,vec3f(0.22,0.24,0.26))*0.16;
  received+=sourceEnergy(vec2f(719.,205.)+state.display.zw)*lobe(p,vec2f(719.,205.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(719.,205.)+state.display.zw,vec2f(0.,1.))*receiverMask1(p)*surfaceResponse(p,vec2f(719.,205.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(719.,205.)+state.display.zw)*lobe(p,vec2f(719.,205.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(719.,205.)+state.display.zw,vec2f(0.,1.))*receiverMask2(p)*surfaceResponse(p,vec2f(719.,205.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(719.,205.)+state.display.zw)*lobe(p,vec2f(719.,205.)+state.display.zw+vec2f(0.,270.),vec2f(100.,170.),vec2f(719.,205.)+state.display.zw,vec2f(0.,1.))*receiverMask3(p)*surfaceResponse(p,vec2f(719.,205.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(860.,210.)+state.display.zw)*lobe(p,vec2f(860.,210.)+state.display.zw+vec2f(0.,102.),vec2f(84.,62.),vec2f(860.,210.)+state.display.zw,vec2f(0.,1.))*receiverMask0(p)*surfaceResponse(p,vec2f(860.,210.)+state.display.zw,vec3f(0.,0.,1.),0.68,vec3f(0.22,0.24,0.26))*0.16;
  received+=sourceEnergy(vec2f(860.,210.)+state.display.zw)*lobe(p,vec2f(860.,210.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(860.,210.)+state.display.zw,vec2f(0.,1.))*receiverMask1(p)*surfaceResponse(p,vec2f(860.,210.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(860.,210.)+state.display.zw)*lobe(p,vec2f(860.,210.)+state.display.zw+vec2f(0.,175.),vec2f(110.,115.),vec2f(860.,210.)+state.display.zw,vec2f(0.,1.))*receiverMask2(p)*surfaceResponse(p,vec2f(860.,210.)+state.display.zw,vec3f(0.,-0.95,0.31),0.72,vec3f(0.14,0.15,0.17))*0.065;
  received+=sourceEnergy(vec2f(860.,210.)+state.display.zw)*lobe(p,vec2f(860.,210.)+state.display.zw+vec2f(0.,270.),vec2f(100.,170.),vec2f(860.,210.)+state.display.zw,vec2f(0.,1.))*receiverMask3(p)*surfaceResponse(p,vec2f(860.,210.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1196.,420.)+state.display.zw)*lobe(p,vec2f(1196.,420.)+state.display.zw+vec2f(-95.,110.),vec2f(82.,95.),vec2f(1196.,420.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1196.,420.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1190.,298.)+state.display.zw)*lobe(p,vec2f(1190.,298.)+state.display.zw+vec2f(-95.,110.),vec2f(82.,95.),vec2f(1190.,298.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1190.,298.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1157.,367.)+state.display.zw)*lobe(p,vec2f(1157.,367.)+state.display.zw+vec2f(-95.,110.),vec2f(82.,95.),vec2f(1157.,367.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1157.,367.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1189.,461.)+state.display.zw)*lobe(p,vec2f(1189.,461.)+state.display.zw+vec2f(-95.,110.),vec2f(82.,95.),vec2f(1189.,461.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1189.,461.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1143.,696.)+state.display.zw)*lobe(p,vec2f(1143.,696.)+state.display.zw+vec2f(-74.,45.),vec2f(66.,90.),vec2f(1143.,696.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1143.,696.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1195.,735.)+state.display.zw)*lobe(p,vec2f(1195.,735.)+state.display.zw+vec2f(-74.,45.),vec2f(66.,90.),vec2f(1195.,735.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1195.,735.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1193.,743.)+state.display.zw)*lobe(p,vec2f(1193.,743.)+state.display.zw+vec2f(-74.,45.),vec2f(66.,90.),vec2f(1193.,743.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1193.,743.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1191.,752.)+state.display.zw)*lobe(p,vec2f(1191.,752.)+state.display.zw+vec2f(-74.,45.),vec2f(66.,90.),vec2f(1191.,752.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1191.,752.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1188.,782.)+state.display.zw)*lobe(p,vec2f(1188.,782.)+state.display.zw+vec2f(-74.,45.),vec2f(66.,90.),vec2f(1188.,782.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1188.,782.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1186.,790.)+state.display.zw)*lobe(p,vec2f(1186.,790.)+state.display.zw+vec2f(-74.,45.),vec2f(66.,90.),vec2f(1186.,790.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1186.,790.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1184.,810.)+state.display.zw)*lobe(p,vec2f(1184.,810.)+state.display.zw+vec2f(-74.,45.),vec2f(66.,90.),vec2f(1184.,810.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1184.,810.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1182.,818.)+state.display.zw)*lobe(p,vec2f(1182.,818.)+state.display.zw+vec2f(-74.,45.),vec2f(66.,90.),vec2f(1182.,818.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1182.,818.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
  received+=sourceEnergy(vec2f(1180.,825.)+state.display.zw)*lobe(p,vec2f(1180.,825.)+state.display.zw+vec2f(-74.,45.),vec2f(66.,90.),vec2f(1180.,825.)+state.display.zw,vec2f(-1.,0.5))*receiverMask3(p)*surfaceResponse(p,vec2f(1180.,825.)+state.display.zw,vec3f(0.,0.,1.),0.82,vec3f(0.25,0.26,0.28))*0.12;
 // Every material receiver contribution is combined BEFORE actual foreground occupancy.
 // r04 target is E-only reflected radiance; never base+E and never lit-world minus base.
 return vec4f(received*(1.-foregroundOccupancy(p)),0.);
}
fn nearResponse(p:vec2i)->vec3f{var e=vec3f(0.);var w=0.;for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){let k=exp(-f32(x*x+y*y)*.72);e+=textureLoad(sourceTex,clamp(p+vec2i(x,y)*2,vec2i(0),vec2i(1339,1173)),0).rgb*k;w+=k;}}return e/w*.16;}
fn flareAt(p:vec2f,c:vec2f,e:vec3f,reach:f32)->vec3f{
 let delta=p-c;let theta=state.observer.z;let axis=vec2f(cos(theta),sin(theta));let other=vec2f(-axis.y,axis.x);let x=dot(delta,axis);let y=dot(delta,other);
 let offAxis=length((c-state.observer.xy)/vec2f(1340.,1174.));let radius=reach*(1.+.4*offAxis);
 let ray1=exp(-y*y/2.25)*pow(max(0.,1.-abs(x)/radius),2.);
 let ray2=exp(-x*x/2.25)*pow(max(0.,1.-abs(y)/(radius*.62)),2.);
 let hollow=1.-exp(-dot(delta,delta)/3.);return e*(ray1+ray2)*hollow*.055*(1.+.4*offAxis);
}
// r05: actual extended-monitor source field; empty/offscreen locations contribute exactly zero.
fn monitorSourceOptical(p:vec2f)->vec3f{
 let local=p-state.display.zw;
 if(any(local<vec2f(523.,130.))||any(local>vec2f(921.,236.))||any(p<vec2f(0.))||any(p>=vec2f(1340.,1174.))){return vec3f(0.);}
 return textureSampleLevel(sourceTex,linearSampler,(p+vec2f(.5))/vec2f(1340.,1174.),0.).rgb;
}
fn monitorFlareResponse(p:vec2f)->vec3f{
 let local=p-state.display.zw;
 if(any(local<vec2f(489.,96.))||any(local>vec2f(955.,270.))){return vec3f(0.);}
 let theta=state.observer.z;let axis=vec2f(cos(theta),sin(theta));let other=vec2f(-axis.y,axis.x);
 let field=min(length((p-state.observer.xy)/vec2f(1340.,1174.)),1.);
 let reach=24.*(1.+.4*field);var radiance=vec3f(0.);var weight=0.;
 for(var i=1u;i<=4u;i++){
  let f=f32(i)*.2;let w=(1.-f)*(1.-f);let d=reach*f;
  radiance+=(monitorSourceOptical(p-axis*d)+monitorSourceOptical(p+axis*d))*w;
  radiance+=(monitorSourceOptical(p-other*d*.62)+monitorSourceOptical(p+other*d*.62))*w*.62;
  weight+=2.*w*(1.+.62);
 }
 return radiance/max(weight,.0001)*.055;
}
fn flareResponse(p:vec2f)->vec3f{var out=monitorFlareResponse(p);
  out+=flareAt(p,vec2f(1196.,420.)+state.display.zw,sourceEnergy(vec2f(1196.,420.)+state.display.zw),18.);
  out+=flareAt(p,vec2f(1190.,298.)+state.display.zw,sourceEnergy(vec2f(1190.,298.)+state.display.zw),12.);
  out+=flareAt(p,vec2f(1157.,367.)+state.display.zw,sourceEnergy(vec2f(1157.,367.)+state.display.zw),12.);
  out+=flareAt(p,vec2f(1189.,461.)+state.display.zw,sourceEnergy(vec2f(1189.,461.)+state.display.zw),12.);
  out+=flareAt(p,vec2f(1143.,696.)+state.display.zw,sourceEnergy(vec2f(1143.,696.)+state.display.zw),12.);
  out+=flareAt(p,vec2f(1195.,735.)+state.display.zw,sourceEnergy(vec2f(1195.,735.)+state.display.zw),12.);
  out+=flareAt(p,vec2f(1193.,743.)+state.display.zw,sourceEnergy(vec2f(1193.,743.)+state.display.zw),12.);
  out+=flareAt(p,vec2f(1191.,752.)+state.display.zw,sourceEnergy(vec2f(1191.,752.)+state.display.zw),12.);
  out+=flareAt(p,vec2f(1188.,782.)+state.display.zw,sourceEnergy(vec2f(1188.,782.)+state.display.zw),12.);
  out+=flareAt(p,vec2f(1186.,790.)+state.display.zw,sourceEnergy(vec2f(1186.,790.)+state.display.zw),12.);
  out+=flareAt(p,vec2f(1184.,810.)+state.display.zw,sourceEnergy(vec2f(1184.,810.)+state.display.zw),12.);
  out+=flareAt(p,vec2f(1182.,818.)+state.display.zw,sourceEnergy(vec2f(1182.,818.)+state.display.zw),12.);
  out+=flareAt(p,vec2f(1180.,825.)+state.display.zw,sourceEnergy(vec2f(1180.,825.)+state.display.zw),12.);
 return out;
}
// Diagnostic only: same source-bound OBS, no base/receiver/direct-source and no altered coefficients.
// Render to rgba16float, read back alongside combined native; this does not prove combined readability.
@fragment fn observationOnly(in:VOut)->@location(0)vec4f{
 let p=clamp(vec2i(in.uv*vec2f(1340.,1174.)),vec2i(0),vec2i(1339,1173));
 return vec4f(nearResponse(p)*state.clock.z+flareResponse(vec2f(p))*state.clock.w,0.);
}
fn linearToSrgb(v:vec3f)->vec3f{return select(1.055*pow(max(v,vec3f(0.)),vec3f(1./2.4))-.055,v*12.92,v<=vec3f(.0031308));}
@fragment fn finalObserve(in:VOut)->@location(0)vec4f{
 let p=clamp(vec2i(in.uv*vec2f(1340.,1174.)),vec2i(0),vec2i(1339,1173));
 // Read base directly from original sRGB texture, avoiding an rgba16float base round-trip.
 let base=textureSample(baseTex,linearSampler,in.uv).rgb;
 let received=textureLoad(receivedTex,p,0).rgb;let source=textureLoad(sourceTex,p,0).rgb;
 let optics=nearResponse(p)*state.clock.z+flareResponse(vec2f(p))*state.clock.w;
 // Display-referred base is already authored. Expose/map only new scene-linear E radiance.
 // Identity F(base,0)=base. No headroom/background weighting or global base adaptation.
 let hdrE=max(received+source+optics,vec3f(0.))*max(state.observer.w,0.);
 let response=vec3f(1.)-exp(-hdrE);let rimAccent=max(textureLoad(rimAccentTex,p,0).rgb,vec3f(0.));let mapped=clamp(base+response+rimAccent,vec3f(0.),vec3f(1.));
 return vec4f(select(linearToSrgb(mapped),mapped,state.display.x>.5),1.);
}

// Candidate-only scene staging entries. Existing finalObserve remains byte-for-byte in the base donor.
@fragment fn missingSceneLinear(in:VOut)->@location(0)vec4f{
 let p=clamp(vec2i(in.uv*vec2f(1340.,1174.)),vec2i(0),vec2i(1339,1173));
 let base=textureSample(baseTex,linearSampler,in.uv).rgb;
 let received=textureLoad(receivedTex,p,0).rgb;let source=textureLoad(sourceTex,p,0).rgb;
 let optics=nearResponse(p)*state.clock.z+flareResponse(vec2f(p))*state.clock.w;
 let hdrE=max(received+source+optics,vec3f(0.))*max(state.observer.w,0.);
 let response=vec3f(1.)-exp(-hdrE);
 return vec4f(clamp(base+response,vec3f(0.),vec3f(1.)),1.);
}
@group(0) @binding(7) var missingSceneTex:texture_2d<f32>;
@fragment fn missingFinalTransfer(in:VOut)->@location(0)vec4f{
 let p=clamp(vec2i(in.uv*vec2f(1340.,1174.)),vec2i(0),vec2i(1339,1173));
 let mapped=clamp(textureLoad(missingSceneTex,p,0).rgb+max(textureLoad(rimAccentTex,p,0).rgb,vec3f(0.)),vec3f(0.),vec3f(1.));
 return vec4f(select(linearToSrgb(mapped),mapped,state.display.x>.5),1.);
}
