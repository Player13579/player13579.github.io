struct U{ time:f32, zoom:f32, width:f32,height:f32, cx:f32,cy:f32, source:f32,near:f32 };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> lights:array<vec4f>;
@group(0) @binding(2) var scene:texture_2d<f32>;
struct V{@builtin(position) clip:vec4f,@location(0) p:vec3f,@location(1) n:vec3f,@location(2) info:vec4f,@location(3) local:vec3f,@location(4) eyeLocal:vec3f,@location(5) localFace:vec4f};
fn project(p:vec3f)->vec4f{let px=64.0/(1.778*.92)*u.zoom;return vec4f((p.x-u.cx)*px/(u.width*.5),(p.y*.92-p.z*.39191836-u.cy)*px/(u.height*.5),.5-(p.y*.39191836+p.z*.92)*.008,1);}
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)info:vec4f,@location(3)local:vec3f,@location(4)eyeLocal:vec3f,@location(5)localFace:vec4f)->V{var o:V;o.clip=project(p);o.p=p;o.n=n;o.info=info;o.local=local;o.eyeLocal=eyeLocal;o.localFace=localFace;return o;}

const hull=array<vec4f,54>(vec4f(0.000000,-1.000000,0.000000,0.000000),vec4f(0.044000,1.000000,0.070000,0.610000),vec4f(-0.150000,1.000000,-0.205000,0.660000),vec4f(0.285000,1.000000,0.135000,0.710000),vec4f(-0.320000,1.000000,0.220000,0.776000),vec4f(-0.065000,-0.140000,1.000000,0.355000),vec4f(0.090000,0.290000,1.000000,0.494000),vec4f(-0.200000,-0.190000,-1.000000,0.375000),vec4f(-0.210000,0.380000,-1.000000,0.547000),vec4f(-1.000000,0.060000,0.240000,0.738000),vec4f(-0.770000,0.290000,0.850000,0.654000),vec4f(-0.720000,-0.240000,-0.800000,0.646000),vec4f(1.000000,0.040000,-0.110000,0.829000),vec4f(0.770000,0.130000,0.810000,0.728000),vec4f(0.740000,-0.200000,-0.840000,0.724000),vec4f(0.350000,-0.820000,0.490000,0.360000),vec4f(-0.380000,-0.850000,0.440000,0.355000),vec4f(1.000000,-0.780000,0.290000,-0.095000),vec4f(0.000000,-1.000000,0.000000,0.000000),vec4f(0.044000,1.000000,0.070000,0.610000),vec4f(-0.150000,1.000000,-0.205000,0.660000),vec4f(0.285000,1.000000,0.135000,0.710000),vec4f(-0.320000,1.000000,0.220000,0.776000),vec4f(-0.065000,-0.140000,1.000000,0.355000),vec4f(0.090000,0.290000,1.000000,0.494000),vec4f(-0.200000,-0.190000,-1.000000,0.375000),vec4f(-0.210000,0.380000,-1.000000,0.547000),vec4f(-1.000000,0.060000,0.240000,0.738000),vec4f(-0.770000,0.290000,0.850000,0.654000),vec4f(-0.720000,-0.240000,-0.800000,0.646000),vec4f(1.000000,0.040000,-0.110000,0.829000),vec4f(0.770000,0.130000,0.810000,0.728000),vec4f(0.740000,-0.200000,-0.840000,0.724000),vec4f(0.350000,-0.820000,0.490000,0.360000),vec4f(-0.380000,-0.850000,0.440000,0.355000),vec4f(-1.000000,0.780000,-0.290000,0.095000),vec4f(0.000000,-1.000000,0.000000,0.000000),vec4f(0.044000,1.000000,0.070000,0.610000),vec4f(-0.150000,1.000000,-0.205000,0.660000),vec4f(0.285000,1.000000,0.135000,0.710000),vec4f(-0.320000,1.000000,0.220000,0.776000),vec4f(-0.065000,-0.140000,1.000000,0.355000),vec4f(0.090000,0.290000,1.000000,0.494000),vec4f(-0.200000,-0.190000,-1.000000,0.375000),vec4f(-0.210000,0.380000,-1.000000,0.547000),vec4f(-1.000000,0.060000,0.240000,0.738000),vec4f(-0.770000,0.290000,0.850000,0.654000),vec4f(-0.720000,-0.240000,-0.800000,0.646000),vec4f(1.000000,0.040000,-0.110000,0.829000),vec4f(0.770000,0.130000,0.810000,0.728000),vec4f(0.740000,-0.200000,-0.840000,0.724000),vec4f(0.350000,-0.820000,0.490000,0.360000),vec4f(-0.380000,-0.850000,0.440000,0.355000),vec4f(0.000000,1.000000,0.000000,5.000000));
fn exitRay(P:vec3f,d:vec3f,id:u32)->vec4f{var hi=3.;var N=vec3f(0,1,0);for(var j=0u;j<18u;j++){let a=hull[id*18u+j];let den=dot(a.xyz,d);if(den>.00001){let t=(a.w-dot(a.xyz,P))/den;if(t>.00008&&t<hi){hi=t;N=normalize(a.xyz);}}}return vec4f(N,hi);}
fn mapSky(d:vec3f)->vec3f{
 let sky=smoothstep(-.16,.78,d.y);
 let ridge=exp(-pow((d.y-.36-.10*d.x)/.19,2.0))*(.19+.81*smoothstep(-.68,.15,-d.x+.35*d.z));
 let soft=pow(max(0.,dot(d,normalize(vec3f(-.55,.76,.34)))),8.);
 return mix(vec3f(.017,.041,.059),vec3f(.87,1.07,1.15),sky)+vec3f(.98,1.12,1.17)*ridge+vec3f(.55,.58,.59)*soft;
}
fn rotq(q:vec4f,v:vec3f)->vec3f{let t=2.*cross(q.xyz,v);return v+q.w*t+cross(q.xyz,t);}
@fragment fn fs(v:V)->@location(0)vec4f{
 if(v.info.x< -3.5){let a=v.info.y*clamp(v.local.x,.0,1.);let c=mix(vec3f(.51,.86,.93),vec3f(1.65,1.95,2.00),v.local.y);return vec4f(c*a,a);}
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
 // Clear congelation ice: sky transmitted through the real opposite hull, plus blue multiple scattering.
 // The partial return from the bed is preserved in the thinnest windows; this is not an alpha overlay.
 let absorption=exp(-vec3f(4.15,1.25,.39)*thick);
 let water=internal*absorption*.73+vec3f(.005,.118,.33)*(1.-absorption)
   +vec3f(.001,.033,.078)*(1.-exp(-4.2*thick))*(.61+.39*key);
 var ice=water;
 // Entrained air at three uneven freezing fronts. Each individual trapped lens is a detached finite
 // ellipsoid *inside* the old parent (not a white band drawn on an outer polygon). Analytic intersection
 // makes upper and lower bubble images slide relative as the block pitches and its exit faces change.
 var optical=0.;var rimLight=0.;var darkest=1.;
 // A sparse set of small non-uniform gas trails, embedded within (not replacing) the broken cloudy beds.
 // No entire bubble coins in silhouette: neighbouring traces accumulate optical depth instead of drawing discs.
 for(var i=0u;i<23u;i++){
  let k=f32(i);let row=f32(i%3u);let col=f32(i/3u);
  let X=-.69+col*.196+.095*sin(k*26.13);let Z=.01+.26*sin(k*11.83+1.5);
  let H=.12+.145*row-.082*X+.051*Z+.034*sin(4.*X+2.3*Z+.72*row);
  let C=vec3f(X,H,Z);let R=vec3f(.026+.07*pow(.5+.5*cos(k*9.77),1.4),.004+.010*(.5+.5*cos(k*4.15)),.021+.036*(.5+.5*sin(k*8.37)));
  let c0=P-C;let q0=vec3f(c0.x+.19*c0.z,c0.y+.14*c0.x-.072*c0.z,c0.z)/R;
  let qd=vec3f(d.x+.19*d.z,d.y+.14*d.x-.072*d.z,d.z)/R;
  let AA=dot(qd,qd);let B=dot(qd,q0);let closest=-B/AA;let disc=1.-dot(q0+qd*closest,q0+qd*closest);
  if(disc>0.){let halfSpan=sqrt(disc/AA);let t0=max(0.,closest-halfSpan);let t1=min(thick,closest+halfSpan);
   let seg=max(0.,t1-t0);let seen=smoothstep(.0001,.011,seg)*exp(-.90*t0);
   optical+=seg*(13.2+row*1.7);rimLight=max(rimLight,seen*.14*(.45+.55*key)*(1.-.67*sqrt(disc)));}
 }
 // Sub-pixel aeration diffuses light *behind* the individually resolved chambers. Broad non-uniform
 // inclusions interrupt the beds, leaving thick areas of clear water-blue material between pockets.
 for(var j=0u;j<18u;j++){let zt=(f32(j)+.5)/18.;let h=P+d*thick*zt;
  let H=h.y+.11*h.x-.08*h.z-.035*sin(5.*h.x+3.3*h.z)-.012*sin(15.*h.x-8.2*h.z);
  let rough=.5+.5*sin(19.*h.x-13.*h.z+1.3*sin(31.*h.z+23.*h.x));
  let broken=.5+.5*cos(5.0*h.x-6.1*h.z+.85*sin(5.*h.x+8.0*h.z));
  let bedA=exp(-pow((H-.13-.023*cos(7.*h.x+3.*h.z))/(.013+.022*rough),2.))*(.06+.94*smoothstep(.18,.77,broken));
  let bedB=exp(-pow((H-.385+.033*cos(5.9*h.x-4.5*h.z))/(.016+.024*rough),2.))*(.04+.96*smoothstep(.22,.78,1.-broken));
  let thread=exp(-pow((H-.322-.021*sin(9.*h.x+4.*h.z))/.010,2.))*(.10+.9*smoothstep(.42,.82,1.-broken));
  // Successive freezing fronts leave short nested, wandering brine laminae, not evenly wrapped stripes.
  let unroll=h.y+.075*h.x-.045*h.z-.021*sin(5.*h.x+4.*h.z)-.012*sin(11.*h.z-3.*h.x);
  let shell=exp(-pow((unroll-.24)/.078,2.))*smoothstep(.02,.89,.5+.5*cos(3.9*h.x-6.7*h.z+.8*sin(9.*h.z)));
  let stripe=.5+.5*cos(190.*unroll+1.3*sin(10.*h.x+8.*h.z)+1.3*rough);
  optical+=2.8*thick/18.*shell*pow(stripe,4.)*(.23+.77*rough);
  optical+=(5.8*bedA+6.2*bedB+2.8*thread)*thick/18.;
 }
 let air=vec3f(1.10,1.43,1.66)*(.57+.43*key);
 ice=mix(water*darkest,air,1.-exp(-optical*.85))+vec3f(.53,.67,.69)*rimLight;
 // Three shallow feather breaks trap tilted AIR SHEETS: a bright sky-reflecting branch adjoins
 // a dark transmitted step. All masks are evaluated at real refracted intersections in the parent,
 // with active spatial footprints; no hand-painted diagonal lines or polygons attached to the viewport.
 for(var fi=0u;fi<3u;fi++){
 let k=f32(fi);let ce=array<vec3f,3>(vec3f(-.55,.22,.18),vec3f(.18,.295,.14),vec3f(-.10,.41,-.13))[fi];
 let nn=array<vec3f,3>(normalize(vec3f(-.48,.73,.49)),normalize(vec3f(.37,.57,-.73)),normalize(vec3f(-.20,.81,-.46)))[fi];
 let tc=dot(ce-P,nn)/(dot(d,nn)+.000001);let h=P+d*tc-ce;let side=select(1.,-1.,fi==1u);
 let span=h.x*side+.12;let V=h.z+.23*h.x-.048*sin(5.*span);
 let arrest=(.013+.27*clamp(span,0.,.6))*(.82+.18*cos(22.*span+.7*k));
 let gate=smoothstep(-.02,.036,span)*(1.-smoothstep(.30+.04*k,.47+.02*k,span))*step(.001,tc)*step(tc,thick);
 let leaf=(1.-smoothstep(arrest-.01,arrest+.012,abs(V)))*gate;
 let ridge=exp(-pow((abs(V)-arrest)/.009,2.))*gate;
 let stria=.5+.5*cos(55.*atan2(V,span+.08)+12.*span+1.5*sin(14.*span+k));
 let leafMirror=mapSky(rotq(qmat,reflect(d,nn)));let airReflect=dot(refract(d,nn,1.31),refract(d,nn,1.31))<.001;
 let rc=mix(leafMirror*.25,leafMirror*.55+vec3f(.006,.075,.11),select(.24,.91,airReflect));
 ice=mix(ice,rc,leaf*(.24+.38*stria)*exp(-.8*max(0.,tc)));ice+=vec3f(.47,.71,.81)*ridge*(.26+.67*stria)*exp(-.8*max(0.,tc));
 }
 let fault=P.x-.78*P.y+.29*P.z+.095;
 let fresh=select(0.,1.,abs(face-1.)<.2);
 let damp=mix(1.,.80+.16*cos(21.*P.y+10.*P.z),fresh*.59);
 let gleam=pow(max(0.,dot(reflect(-l,n),eye)),58.);
 // Flat exposed face is actually broken on this plane: tiny aligned roughness there, no global snow cap.
 let distortion=.034*sin(4.7*P.x+6.*P.z+2.3*P.y)+.017*cos(10.*P.z-6.*P.x);
 let ns=normalize(n+vec3f(distortion,distortion*1.3,-distortion*.53));
 let facetReturn=mapSky(reflect(-eye,ns))*(.021+.45*F);
 let rip=.5+.5*cos(49.*P.y-29.*P.z+2.8*sin(9.*P.z+6.*P.y));
 let serration=fresh*pow(rip,9.)*(.19+.32*smoothstep(.1,.48,P.y));
 let u=clamp(age/(14./240.),0.,1.);let front=.07+.45*u;
 let wave=exp(-pow(fault/.027,2.)-pow((P.y-front)/.083,2.))*smoothstep(.015,.12,u)*(1.-smoothstep(.80,1.,u));
 let emission=vec3f(.35,1.15,1.42)*wave;
 let c=ice*damp+facetReturn+vec3f(.64,.81,.83)*gleam+vec3f(.20,.35,.40)*serration+emission;
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
