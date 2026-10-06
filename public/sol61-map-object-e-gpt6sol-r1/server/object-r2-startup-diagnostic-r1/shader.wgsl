struct Params{view:vec4f,fit:vec4f,clocks:vec4f,rack:vec4f,controls:vec4f,objectOn:vec4f,observer:vec4f,padding:vec4f};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var original:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
@group(0) @binding(3) var sourceMap:texture_2d<f32>;
@group(0) @binding(4) var sceneMap:texture_2d<f32>;
struct VOut{@builtin(position) pos:vec4f};
@vertex fn vs(@builtin(vertex_index)i:u32)->VOut{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:VOut;o.pos=vec4f(p[i],0.,1.);return o;}
fn modF(x:f32,m:f32)->f32{return x-m*floor(x/m);}
fn P(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return smoothstep(a,b,t)*(1.-smoothstep(c,d,t));}
fn M(p:vec2f,r:vec4f,f:f32)->f32{return smoothstep(r.x,r.x+f,p.x)*(1.-smoothstep(r.z-f,r.z,p.x))*smoothstep(r.y,r.y+f,p.y)*(1.-smoothstep(r.w-f,r.w,p.y));}
fn Q(p:vec2f,a:vec2f,b:vec2f,c:vec2f,d:vec2f)->f32{let s=vec4f((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x),(c.x-b.x)*(p.y-b.y)-(c.y-b.y)*(p.x-b.x),(d.x-c.x)*(p.y-c.y)-(d.y-c.y)*(p.x-c.x),(a.x-d.x)*(p.y-d.y)-(a.y-d.y)*(p.x-d.x));return select(0.,1.,all(s>=vec4f(0.))||all(s<=vec4f(0.)));}
const MA=array<vec2f,6>(vec2f(519.,139.),vec2f(650.,130.),vec2f(808.,131.),vec2f(526.,197.),vec2f(652.,187.),vec2f(804.,185.));
const MB=array<vec2f,6>(vec2f(635.,127.),vec2f(792.,131.),vec2f(925.,141.),vec2f(637.,184.),vec2f(787.,185.),vec2f(921.,196.));
const MC=array<vec2f,6>(vec2f(637.,172.),vec2f(788.,175.),vec2f(918.,183.),vec2f(639.,223.),vec2f(784.,223.),vec2f(914.,238.));
const MD=array<vec2f,6>(vec2f(523.,184.),vec2f(650.,173.),vec2f(803.,173.),vec2f(526.,237.),vec2f(651.,225.),vec2f(800.,226.));
const TR=array<vec4f,4>(vec4f(1116.,687.,1211.,712.),vec4f(1112.,721.,1208.,753.),vec4f(1108.,762.,1204.,786.),vec4f(1103.,796.,1199.,829.));
const LAMPS=array<vec4f,3>(vec4f(1190.,298.,3.,2.),vec4f(1157.,367.,3.,6.),vec4f(1189.,461.,3.,3.));
struct Signal{emission:vec3f,offset:vec2f};
fn signal(p:vec2f,detail:f32)->Signal{
 var o:Signal;o.emission=vec3f(0.);o.offset=vec2f(0.);let clock=u.clocks.x;let ages=vec4f(u.clocks.yzw,u.rack.x);let source=u.controls.x>.5;let material=u.controls.z>.5;let ambient=u.controls.w>.5;let motion=u.fit.w;
 let ma=select(0.,.16+.10*P(modF(clock,6500.),200.,650.,1800.,2700.),ambient&&u.objectOn.x>.5);let me=P(ages.x,0.,100.,1300.,1800.)*u.objectOn.x;
 for(var k=0u;k<6u;k++){let m=Q(p,MA[k],MB[k],MC[k],MD[k]);let v=(p.x-MA[k].x)/(MB[k].x-MA[k].x);let start=100.+70.*f32(k);let t=clamp((ages.x-start)/430.,0.,1.);let front=exp(-pow((v-t)/.12,2.))*P(ages.x,start,start+50.,start+370.,start+470.);
  if(source){o.emission+=vec3f(.10,.48,.88)*(ma*.45+me*front*2.1)*m*detail;}
  if(material){o.offset.x+=motion*me*front*2.4*sin(3.14159265*v)*m;}}
 if(material&&ambient){let t=modF(clock+1200.,16000.);let g=P(t,0.,400.,2000.,3500.)*exp(-t/1800.)*sin(t/470.);let m=M(p,vec4f(654.,309.,749.,362.),6.);o.offset.x+=5.6*g*sin(3.14159265*(p.y-309.)/53.)*m*motion;}
 if(u.objectOn.y>.5){let e=P(ages.y,0.,120.,1350.,1800.);let m=Q(p,vec2f(260.,194.),vec2f(310.,194.),vec2f(321.,365.),vec2f(275.,365.));let scan=204.+143.*clamp((ages.y-130.)/760.,0.,1.);let front=exp(-pow((p.y-scan)/14.,2.))*P(ages.y,100.,150.,870.,970.);
  if(source){o.emission+=vec3f(.12,.82,.34)*e*front*1.85*m*detail;}
  if(material){o.offset.y+=motion*e*front*2.7*sin(3.14159265*(p.x-260.)/61.)*m;}}
 if(u.objectOn.z>.5){let e=P(ages.z,0.,90.,1350.,1800.);let display=M(p,vec4f(1183.,397.,1209.,439.),2.);let fy=401.+33.*clamp((ages.z-100.)/430.,0.,1.);let band=exp(-pow((p.y-fy)/8.,2.))*P(ages.z,70.,130.,490.,590.);let accepted=P(ages.z,600.,730.,1200.,1550.);
  if(source){o.emission+=vec3f(.08,.9,.78)*display*(select(0.,.14,ambient)+e*band*2.)*detail;}
  for(var j=0u;j<3u;j++){let lamp=LAMPS[j];let m=1.-smoothstep(.6,1.,dot((p-lamp.xy)/lamp.zw,(p-lamp.xy)/lamp.zw));if(source){o.emission+=vec3f(.10,1.,.44)*(select(0.,.12,ambient)+e*accepted*2.3)*m*detail;}}
  let tap=P(ages.z,70.,120.,270.,500.)*sin(3.14159265*clamp((ages.z-70.)/430.,0.,1.));if(material){o.offset.y+=motion*2.8*tap*M(p,vec4f(1142.,313.,1209.,389.),6.);}}
 if(u.objectOn.w>.5){let e=P(ages.w,0.,110.,1360.,1800.);for(var j=0u;j<4u;j++){let r=TR[j];let m=M(p,r,3.);let start=90.+170.*f32(j);let cycle=P(ages.w,start,start+70.,start+290.,start+420.);let done=P(ages.w,900.,1050.,1350.,1720.);let amb=select(0.,.10+.07*pow(sin(clock/1200.+f32(j)*.9),2.),ambient);let status=M(p,vec4f(r.z-20.,r.y+4.,r.z-6.,r.w-4.),2.);
   if(source){o.emission+=vec3f(.11,.38,1.)*status*(amb+e*(cycle*.8+done*.36))*detail;}
   if(material){o.offset.y+=motion*m*e*cycle*3.6*sin((ages.w-start)/90.)*exp(-max(0.,ages.w-start)/430.);}}
  if(material&&ambient){let m=M(p,vec4f(1020.,585.,1063.,845.),7.);let g=P(modF(clock,4200.),0.,300.,2400.,3300.);o.offset.x+=motion*4.8*m*g*sin(2.6*(p.y-585.)/260.-clock/540.);}}
 if(material&&ambient){let t=modF(clock+4100.,13700.);let g=P(t,300.,650.,3200.,4100.);let a=M(p,vec4f(580.,936.,766.,981.),6.);let b=M(p,vec4f(72.,531.,177.,633.),6.);let front=(t-300.)/3800.;o.offset.x+=motion*6.2*g*a*exp(-pow(((p.y-936.)/45.-front)/.22,2.));o.offset.y+=motion*6.2*g*b*exp(-pow(((p.x-72.)/105.-front)/.22,2.));}
 return o;
}
struct WorldOut{@location(0)world:vec4f,@location(1)emission:vec4f};
@fragment fn world(i:VOut)->WorldOut{
 let p=(i.pos.xy-u.fit.xy)/u.fit.z;var o:WorldOut;
 if(any(p<vec2f(0.))||any(p>=u.view.zw)){o.world=vec4f(u.padding.xyz,1.);o.emission=vec4f(0.);return o;}
 let originalRGB=textureSampleLevel(original,linearSampler,p/u.view.zw,0.);let detail=.40+.60*clamp(dot(originalRGB.rgb,vec3f(.2126,.7152,.0722))*4.,0.,1.);let s=signal(p,detail);
 let moved=textureSampleLevel(original,linearSampler,(p+s.offset)/u.view.zw,0.);o.world=vec4f(moved.rgb+s.emission,moved.a);o.emission=vec4f(s.emission,0.);return o;
}
// Actual same-frame HDR source-map probes: bounded 6/1/4/4 samples, no readback.
fn sourceProbe(p:vec2f)->vec3f{let screen=u.fit.xy+p*u.fit.z;if(any(screen<vec2f(0.))||any(screen>=u.view.xy)){return vec3f(0.);}return textureLoad(sourceMap,vec2i(screen),0).rgb;}
fn received(p:vec2f)->vec3f{
 if(u.controls.x<.5||u.controls.y<.5){return vec3f(0.);}var rgb=vec3f(0.);
 var cm=max(max(M(p,vec4f(656.,242.,743.,278.),3.)*.34,M(p,vec4f(747.,243.,773.,278.),3.)*.28),max(M(p,vec4f(782.,239.,820.,277.),3.)*.31,M(p,vec4f(431.,277.,986.,295.),3.)*.22));cm=max(cm,M(p,vec4f(654.,309.,749.,362.),3.)*.19);
 let accessories=array<vec4f,7>(vec4f(431.,184.,483.,254.),vec4f(490.,228.,519.,280.),vec4f(602.,227.,636.,280.),vec4f(918.,174.,977.,256.),vec4f(434.,299.,511.,355.),vec4f(911.,300.,978.,358.),vec4f(651.,352.,746.,381.));for(var j=0u;j<7u;j++){cm=max(cm,M(p,accessories[j],3.)*.13);}
 if(cm>0.&&u.objectOn.x>.5){var radiance=vec3f(0.);for(var k=0u;k<6u;k++){let t=clamp((u.clocks.y-100.-70.*f32(k))/430.,.08,.92);let point=vec2f(mix(MA[k].x,MB[k].x,t),(MA[k].y+MB[k].y+MC[k].y+MD[k].y)*.25);radiance+=sourceProbe(point)/6.;}rgb+=radiance*cm*.85;}
 let lm=max(max(M(p,vec4f(172.,194.,252.,379.),6.),M(p,vec4f(334.,194.,398.,379.),6.)),M(p,vec4f(263.,105.,366.,170.),6.)*.14);if(lm>0.&&u.objectOn.y>.5){let y=204.+143.*clamp((u.clocks.z-130.)/760.,0.,1.);rgb+=sourceProbe(vec2f(287.+(y-225.)*.079,y))*lm*.34;}
 let am=M(p,vec4f(1137.,389.,1219.,468.),5.);if(am>0.&&u.objectOn.z>.5){let y=401.+33.*clamp((u.clocks.w-100.)/430.,0.,1.);var r=sourceProbe(vec2f(1196.,y))*.20;for(var j=0u;j<3u;j++){r+=sourceProbe(LAMPS[j].xy)*.107;}rgb+=r*am;}
 if(u.objectOn.w>.5){for(var j=0u;j<4u;j++){let r=TR[j];let side=M(p,vec4f(r.x-23.,r.y-2.,r.x-4.,r.w+3.),4.);if(side>0.){rgb+=sourceProbe(vec2f(r.z-13.,(r.y+r.w)*.5))*side*.30;}}}
 return rgb;
}
@fragment fn receiver(i:VOut)->@location(0)vec4f{let pixel=vec2i(i.pos.xy);let base=textureLoad(sceneMap,pixel,0);let localSource=textureLoad(sourceMap,pixel,0).rgb;let albedo=clamp(base.rgb-localSource,vec3f(0.),vec3f(1.));let p=(i.pos.xy-u.fit.xy)/u.fit.z;return vec4f(base.rgb+albedo*received(p)/3.14159265,base.a);}
@fragment fn observer(i:VOut)->@location(0)vec4f{if(u.controls.x<.5||u.observer.x<.5){return vec4f(0.);}var rgb=vec3f(0.);let uv=i.pos.xy/u.view.xy;for(var y=-1;y<=1;y++){for(var x=-1;x<=1;x++){let q=uv+vec2f(f32(x),f32(y))*4.*u.fit.z/u.view.xy;if(any(q<vec2f(0.))||any(q>=vec2f(1.))){continue;}let e=textureSampleLevel(sourceMap,linearSampler,q,0.).rgb;let l=dot(e,vec3f(.2126,.7152,.0722));rgb+=e*max(0.,l-.80)/max(.00001,l)/9.;}}return vec4f(rgb*.075,0.);}
// Preserve donor identity F(authoredBase,0)=authoredBase. Map only new E.
@fragment fn finalLinear(i:VOut)->@location(0)vec4f{
 let scene=textureLoad(sceneMap,vec2i(i.pos.xy),0);let p=(i.pos.xy-u.fit.xy)/u.fit.z;
 if(any(p<vec2f(0.))||any(p>=u.view.zw)){return scene;}
 let raw=textureSampleLevel(original,linearSampler,p/u.view.zw,0.);let detail=.40+.60*clamp(dot(raw.rgb,vec3f(.2126,.7152,.0722))*4.,0.,1.);let s=signal(p,detail);
 let base=textureSampleLevel(original,linearSampler,(p+s.offset)/u.view.zw,0.);let hdrE=max(scene.rgb-base.rgb,vec3f(0.));
 let response=vec3f(1.)-exp(-hdrE*max(0.,u.observer.y));return vec4f(clamp(base.rgb+response,vec3f(0.),vec3f(1.)),base.a);
}
