struct U{ time:f32, zoom:f32, width:f32,height:f32, cx:f32,cy:f32, source:f32,near:f32 };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> lights:array<vec4f>;
@group(0) @binding(2) var scene:texture_2d<f32>;
struct V{@builtin(position) clip:vec4f,@location(0) p:vec3f,@location(1) n:vec3f,@location(2) info:vec4f,@location(3) local:vec3f,@location(4) eyeLocal:vec3f,@location(5) localFace:vec4f};
fn project(p:vec3f)->vec4f{let px=64.0/(1.778*.92)*u.zoom;return vec4f((p.x-u.cx)*px/(u.width*.5),(p.y*.92-p.z*.39191836-u.cy)*px/(u.height*.5),.5-(p.y*.39191836+p.z*.92)*.008,1);}
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)info:vec4f,@location(3)local:vec3f,@location(4)eyeLocal:vec3f,@location(5)localFace:vec4f)->V{var o:V;o.clip=project(p);o.p=p;o.n=n;o.info=info;o.local=local;o.eyeLocal=eyeLocal;o.localFace=localFace;return o;}

const hull=array<vec4f,77>(vec4f(-0.4103647,0.0000000,-0.9119215,0.4661992),vec4f(0.9868746,0.0000000,0.1614886,-0.2748150),vec4f(-0.3643993,0.0000000,0.9312428,0.1844249),vec4f(-0.7848828,0.0000000,-0.6196443,0.6178407),vec4f(0.0000000,-1.0000000,0.0000000,0.0000000),vec4f(-0.3300000,1.0000000,0.2100000,0.5492500),vec4f(1.1000000,1.0000000,0.6000000,-0.1870000),vec4f(-0.8000000,0.6900000,-0.5800000,0.8366000),vec4f(0.3600000,0.6600000,1.2200000,0.0561000),vec4f(-0.7400000,-0.3000000,0.4100000,0.4318500),vec4f(-0.0380000,1.0000000,0.0250000,0.4146050),vec4f(-0.1447992,0.0000000,-0.9894611,0.4464281),vec4f(0.9986178,0.0000000,0.0525588,0.1759559),vec4f(0.4321202,0.0000000,0.9018160,-0.0500969),vec4f(-0.9868746,0.0000000,-0.1614886,0.2588150),vec4f(0.0000000,-1.0000000,0.0000000,-0.2770000),vec4f(-0.1900000,1.0000000,0.4200000,0.5337250),vec4f(-1.1400000,1.0000000,0.5100000,0.5486250),vec4f(-0.8000000,0.6900000,-0.5800000,0.7212000),vec4f(0.3600000,0.6600000,1.2200000,0.2538500),vec4f(-0.7400000,-0.3000000,0.4100000,0.0452750),vec4f(-0.0380000,1.0000000,0.0250000,0.5661675),vec4f(0.5079850,0.0000000,-0.8613659,0.5207461),vec4f(0.9593655,0.0000000,-0.2821663,0.6409825),vec4f(-0.3491090,0.0000000,0.9370821,-0.2024097),vec4f(-0.9986178,0.0000000,-0.0525588,-0.1919559),vec4f(0.0000000,-1.0000000,0.0000000,0.0000000),vec4f(0.3000000,1.0000000,-0.2800000,0.7021000),vec4f(0.9500000,1.0000000,-0.3700000,0.9809000),vec4f(0.8200000,0.6900000,-0.5800000,0.9104000),vec4f(0.3600000,0.6600000,1.2200000,0.3853000),vec4f(-0.7400000,-0.3000000,0.4100000,-0.1894500),vec4f(-0.0380000,1.0000000,0.0250000,0.4349750),vec4f(0.3643993,0.0000000,-0.9312428,-0.2504249),vec4f(0.9578263,0.0000000,-0.2873479,-0.3202514),vec4f(-0.3162278,0.0000000,0.9486833,0.4536925),vec4f(-0.9094745,0.0000000,0.4157598,0.6491603),vec4f(0.0000000,-1.0000000,0.0000000,0.0000000),vec4f(-0.2800000,1.0000000,-0.1900000,0.3515250),vec4f(-1.1000000,1.0000000,-0.7200000,0.6056500),vec4f(0.8200000,0.6900000,-0.5800000,-0.2424000),vec4f(0.3600000,0.6600000,1.2200000,0.2977500),vec4f(-0.7400000,-0.3000000,0.4100000,0.6224750),vec4f(-0.0380000,1.0000000,0.0250000,0.2551975),vec4f(-0.4321202,0.0000000,-0.9018160,-0.0159031),vec4f(0.9728062,0.0000000,-0.2316205,0.2023114),vec4f(0.2190383,0.0000000,0.9757163,0.3579932),vec4f(-0.9578263,0.0000000,0.2873479,0.3042514),vec4f(0.0000000,-1.0000000,0.0000000,0.0000000),vec4f(0.3200000,1.0000000,0.3000000,0.4547000),vec4f(0.8800000,1.0000000,0.8100000,0.5286500),vec4f(-0.8000000,0.6900000,-0.5800000,0.2357000),vec4f(0.3600000,0.6600000,1.2200000,0.5448000),vec4f(-0.7400000,-0.3000000,0.4100000,0.2327000),vec4f(-0.0380000,1.0000000,0.0250000,0.3517200),vec4f(0.3491090,0.0000000,-0.9370821,0.1364097),vec4f(0.7327935,0.0000000,0.6804511,0.5593915),vec4f(0.3060092,0.0000000,0.9520286,0.3758715),vec4f(-0.9728062,0.0000000,0.2316205,-0.2183114),vec4f(0.0000000,-1.0000000,0.0000000,0.0000000),vec4f(-0.2100000,1.0000000,0.2100000,0.1743750),vec4f(-0.8100000,1.0000000,0.5800000,-0.0608750),vec4f(0.8200000,0.6900000,-0.5800000,0.5168500),vec4f(0.3600000,0.6600000,1.2200000,0.5244000),vec4f(-0.7400000,-0.3000000,0.4100000,-0.0675000),vec4f(-0.0380000,1.0000000,0.0250000,0.1865000),vec4f(-0.1447992,0.0000000,-0.9894611,0.4464281),vec4f(0.9986178,0.0000000,0.0525588,0.1759559),vec4f(0.4321202,0.0000000,0.9018160,-0.0500969),vec4f(-0.9868746,0.0000000,-0.1614886,0.2588150),vec4f(0.0000000,-1.0000000,0.0000000,0.0000000),vec4f(0.0000000,1.0000000,0.0000000,0.2770000),vec4f(0.0000000,1.0000000,0.0000000,4.0000000),vec4f(0.0000000,1.0000000,0.0000000,4.0000000),vec4f(0.0000000,1.0000000,0.0000000,4.0000000),vec4f(0.0000000,1.0000000,0.0000000,4.0000000),vec4f(0.0000000,1.0000000,0.0000000,4.0000000));
fn exitRay(P:vec3f,d:vec3f,id:u32)->vec4f{var hi=3.;var N=vec3f(0,1,0);for(var j=0u;j<11u;j++){let a=hull[id*11u+j];let den=dot(a.xyz,d);if(den>.00001){let t=(a.w-dot(a.xyz,P))/den;if(t>.00008&&t<hi){hi=t;N=normalize(a.xyz);}}}return vec4f(N,hi);}
fn mapSky(d:vec3f)->vec3f{
 let sky=smoothstep(-.16,.78,d.y);
 let ridge=exp(-pow((d.y-.36-.10*d.x)/.19,2.0))*(.19+.81*smoothstep(-.68,.15,-d.x+.35*d.z));
 let soft=pow(max(0.,dot(d,normalize(vec3f(-.55,.76,.34)))),8.);
 return mix(vec3f(.017,.041,.059),vec3f(.87,1.07,1.15),sky)+vec3f(.98,1.12,1.17)*ridge+vec3f(.55,.58,.59)*soft;
}
fn bedDepth(p:vec3f)->f32{return p.y+.08*p.x-.105*p.z+.021*sin(8.*p.x+3.*p.z)+.014*sin(17.*p.z-5.*p.x);}
fn rime(p:vec3f)->f32{let y=bedDepth(p);let shift=.012*sin(38.*p.x+19.*p.z)+.006*cos(52.*p.z);let extent=smoothstep(-.22,.14,-p.x+.45*p.z);return (.19+.81*extent)*smoothstep(.055+shift,.146+shift,y);}
fn rotq(q:vec4f,v:vec3f)->vec3f{let t=2.*cross(q.xyz,v);return v+q.w*t+cross(q.xyz,t);}
@fragment fn fs(v:V)->@location(0)vec4f{
 if(v.info.x< -2.5){
  let U=v.local.x;let V=v.local.y;let packed=smoothstep(.08,.75,U)*(.71+.29*sin(22.*U+8.*V+1.2*sin(18.*V)))*
    (1.-smoothstep(.20,.68,abs(V-.44)));
  let wet=vec3f(.025,.085,.121);let corn=vec3f(.59,.89,1.02)*(.62+.38*max(0.,dot(normalize(v.n),normalize(vec3f(-.48,.74,.27)))));
  let col=mix(wet,corn,packed);let alpha=v.info.y*(.36+.45*packed);return vec4f(col*alpha,alpha);}
 if(v.info.x< -1.5){let a=v.info.y*v.info.z;return vec4f(vec3f(.17,.28,.32)*a,a);}
 if(v.info.x<-.5){return vec4f(.55,.55,.55,1);}
 let n=normalize(v.n);let eye=normalize(vec3f(0,.39191836,.92));let qmat=normalize(vec4f(v.eyeLocal,v.info.w));
 let E=rotq(vec4f(-qmat.xyz,qmat.w),eye);let nl=normalize(v.localFace.xyz);let id=u32(v.localFace.w);
 let P=v.local;let age=v.info.z;let face=v.info.x;
 let d=refract(-E,nl,1./1.31);let path=exitRay(P,d,id);let thick=min(1.5,path.w);
 let l=normalize(vec3f(-.52,.78,.36));let key=clamp(.31+.71*max(0.,dot(n,l)),.1,1.);
 let ndv=clamp(dot(n,eye),0.,1.);let F=.018+.982*pow(1.-ndv,5.);
 let dims=vec2f(textureDimensions(scene));let scale=64./(1.778*.92)*u.zoom*dims.x/u.width;
 let bend=refract(-eye,n,1./1.31)+eye;let co=clamp(vec2i(v.clip.xy+vec2f(bend.x,-bend.y*.92+bend.z*.39191836)*thick*scale),vec2i(0),vec2i(dims)-vec2i(1));
 let substrate=textureLoad(scene,co,0).rgb;let fd=refract(d,-path.xyz,1.31);
 let sky=mapSky(reflect(-eye,n));let outside=rotq(qmat,fd);let travel=mix(substrate,mapSky(outside),smoothstep(.02,.27,outside.y));
 let tir=dot(fd,fd)<.001;let internal=mix(travel,.52*mapSky(rotq(qmat,reflect(d,path.xyz))),select(.04,.88,tir));
 let absorption=exp(-vec3f(4.4,1.22,.46)*thick);
 let water=internal*absorption*.70+vec3f(.004,.172,.298)*(1.-absorption)+vec3f(.003,.065,.130)*smoothstep(.028,.24,thick);
 // Two entrained, unequal bubble strata traverse the *unsplit parent's* coordinates.
 // Their outer intercepts and the inner volume use the same coordinate, so bands sever at the fault.
 let X=P.x;let Z=P.z;let layer=P.y+.17*X-.14*Z+.031*abs(2.1*X+Z+.18)+.022*sin(7.*X+5.*Z)-.013*cos(11.*Z-4.*X);
 let grain=.52+.23*cos(34.*X+23.*Z+4.*layer)+.14*sin(43.*Z-17.*X)+.10*cos(59.*X-21.*Z);
 let bed0=exp(-pow((layer-.197)/(.024+.014*grain),2.));
 let bed1=exp(-pow((layer-.360-.018*cos(7.*X-5.*Z))/.024,2.));
 let dust=exp(-pow((layer-.137)/.010,2.))*(.25+.55*grain);
 let bank=1.-smoothstep(.08,.28,abs(Z+.08));
 var od=0.;
 for(var j=0u;j<8u;j++){let h=P+d*thick*(.0625+.125*f32(j));let y=h.y+.17*h.x-.14*h.z+.031*abs(2.1*h.x+h.z+.18)+.022*sin(7.*h.x+5.*h.z)-.013*cos(11.*h.z-4.*h.x);
 od+=thick*.125*(4.*exp(-pow((y-.197)/.041,2.))+2.3*exp(-pow((y-.36)/.028,2.)));}
 let buried=1.-exp(-od);let frost=vec3f(.92,1.22,1.30)*(.62+.38*key);
 let pulse=.52+.48*sin(160.*layer+1.7*sin(16.*X-8.*Z)+1.1*cos(19.*Z+14.*X));
 let stretch=.5+.5*sin(10.*X-9.*Z+1.5*cos(5.*X+13.*Z));
 let bedding=bed0*(.70+.20*grain+.1*pulse)*(.11+.89*smoothstep(.17,.64,stretch));
 let lens=bed1*(.5+.25*grain+.25*pulse)*(.12+.88*smoothstep(.29,.70,1.-stretch));
 let high=max(bedding,lens);
 let baseIce=mix(water,frost,clamp(buried*.37+high*.94+dust*.41,0.,.96));
 // Mesoscopic pennant-shaped air cleavages, embedded at distinct depths. Per-piece diagonals
 // do not extend outside their own 3-D hull or turn into a textured screen overlay.
 var exposed=baseIce;
 for(var sj=0u;sj<3u;sj++){
 let k=f32(sj);let C=vec3f(-.49+.46*k,.25+.097*sin(2.*k),.0+.06*k);let W=normalize(vec3f(.23*sin(1.+k),.74,-.69));let den=dot(W,d);
 let tt=dot(C-P,W)/(den+.000001);let hp=P+tt*d-C;let tu=hp.x;let tv=hp.z+.26*tu;
 let x=smoothstep(-.22,.23,tu);let rim=.010+.089*x+.023*sin(10.*tu+k);
 let fan=step(.0005,tt)*step(tt,thick-.001)*smoothstep(-.23,-.19,tu)*(1.-smoothstep(.14,.25,tu))*(1.-smoothstep(rim-.012,rim+.006,abs(tv)));
 let rib=.5+.5*cos(35.*atan2(tv,max(.039,tu+.26))+.94*cos(19.*tu)+17.*tu);
 let vis=.17+.55*smoothstep(.38,.91,rib);
 exposed=mix(exposed,mix(vec3f(.008,.069,.105),vec3f(.66,1.26,1.42),vis),fan*(.51+.29*vis));
 }
 // Hard sky planes, broken wind-packed snow *skin* on higher terraces; avoid a uniform candy bevel.
 let snowline=P.y+.21*X+.032*cos(9.*X-5.*Z)+.019*sin(15.*Z+11.*X);
 let snow=step(2.5,face)*smoothstep(.14,.50,nl.y)*smoothstep(.26,.57,snowline)*(.38+.40*grain);
 let mantle=vec3f(1.09,1.35,1.45)*(.42+.58*key);
 let facets=mix(mix(exposed,sky,F*.66),mantle,snow);
 // The discontinuous surface is dark, not an emissive strip: glancing air on the inward wall
 // belies thickness; a ragged pale lip adjoins the fault rather than drawing across the ground.
 let seamz=select(select(.12-(X+.29)*.23/.48,-.11+(X-.19)*.19/.51,X>.19),-.06+(X+.75)*.18/.46,X<-.29);
 let dist=Z-seamz;let bankBias=select(1.,.40,dist<0.);
 let crevasse=exp(-pow(dist/.041,2.))*bankBias;
 let front=-.70+1.40*clamp((age-.010)/.15,0.,1.);
 let reached=smoothstep(X-.07,X+.04,front)*smoothstep(0.,.028,age);
 let weak=smoothstep(.22,.55,abs(nl.z))*(1.-step(2.5,face))*.19;
 let mouth=clamp(max(crevasse,select(0.,.84,abs(face-1.)<.2))*(.85+.10*reached)+weak,0.,.96);
 let scab=exp(-pow((abs(dist)-.054)/.021,2.))*(.61+.29*grain)*smoothstep(.08,.30,P.y)*step(2.5,face);
 let side=mix(facets,vec3f(.006,.068,.119)+vec3f(.030,.096,.13)*high,mouth);
 let lipCol=mix(side,mantle,scab);
 let stressLip=(.86*exp(-pow((abs(dist)-.031)/.025,2.))*step(2.5,face)+.72*exp(-pow(dist/.036,2.))*bed0);
 let lead=exp(-pow((X-front)/.12,2.))*smoothstep(.002,.028,age)*(1.-smoothstep(.13,.17,age));
 let emission=vec3f(.46,1.37,1.85)*lead*stressLip;
 let spec=pow(max(0.,dot(reflect(-l,n),eye)),54.)*(1.-.84*snow);
 let transWindow=(1.-smoothstep(.10,.23,layer))*(1.-snow)*(1.-mouth)*smoothstep(.09,.39,thick);
 let deep=mix(lipCol,water*vec3f(.84,1.39,1.60)+vec3f(.0,.036,.072),.54*transWindow);
 var c=deep+spec*vec3f(.52,.73,.79)+emission;

 return vec4f(c*v.info.y,v.info.y);
}

struct Q{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn quad(@builtin(vertex_index)i:u32)->Q{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Q;o.p=vec4f(p[i],.99,1);o.uv=p[i];return o;}
@fragment fn ground(q:Q)->@location(0)vec4f{
 let px=64./(1.778*.92)*u.zoom;let x=q.uv.x*u.width*.5/px+u.cx;let z=-(q.uv.y*u.height*.5/px+u.cy)/.39191836;let p=vec3f(x,0,z);
 var occlusion=0.;var lit=vec3f(0);
 if(u.source>.5){for(var i=0u;i<64u;i++){let a=lights[i];
 if(a.w<0.){let w=-a.w;let h=max(0.,a.y);let shift=vec2f(.15*h,-.20*h);
  let d=(p.xz-a.xz-shift)/vec2f(.70*w+.35*h,.48*w+.36*h);occlusion=max(occlusion,.86*exp(-2.*dot(d,d)-3.2*h)*min(1.,3.4*w));}
 else if(a.w>0.&&u.near>.5){let d=distance(p,a.xyz);lit+=vec3f(.037,.16,.21)*a.w*max(.09,a.y)/max(.1,d)*pow(max(0.,1.-d/.70),2.)/(1.+d*d*4.);}}}
 return vec4f(vec3f(.004,.008,.014)*(1.-occlusion)+lit,1);
}
