struct U{ time:f32, zoom:f32, width:f32,height:f32, cx:f32,cy:f32, source:f32,near:f32 };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> lights:array<vec4f>;
@group(0) @binding(2) var scene:texture_2d<f32>;
struct V{@builtin(position) clip:vec4f,@location(0) p:vec3f,@location(1) n:vec3f,@location(2) info:vec4f,@location(3) local:vec3f,@location(4) eyeLocal:vec3f,@location(5) localFace:vec4f};
fn project(p:vec3f)->vec4f{let px=64.0/(1.778*.92)*u.zoom;return vec4f((p.x-u.cx)*px/(u.width*.5),(p.y*.92-p.z*.39191836-u.cy)*px/(u.height*.5),.5-(p.y*.39191836+p.z*.92)*.008,1);}
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)info:vec4f,@location(3)local:vec3f,@location(4)eyeLocal:vec3f,@location(5)localFace:vec4f)->V{var o:V;o.clip=project(p);o.p=p;o.n=n;o.info=info;o.local=local;o.eyeLocal=eyeLocal;o.localFace=localFace;return o;}

// Optical path clips against the same station positions and gross front/back/top envelope as the
// tessellated body. Tiny scalloped offsets of the pressure lips are approximated optically only.
const XI=array<f32,11>(-1.04,-.96,-.80,-.60,-.44,-.30,-.06,.25,.57,.86,1.04);
const HI=array<f32,11>(.25,.34,.48,.54,.53,.43,.46,.40,.30,.22,.09);
const FR=array<f32,11>(.14,.30,.46,.54,.45,.36,.46,.41,.29,.17,.035);
const BK=array<f32,11>(.12,.32,.41,.42,.33,.33,.34,.30,.25,.17,.08);
fn sq(a:f32)->f32{return a*a;}
fn iceExit(P:vec3f,d:vec3f,id:u32)->vec4f{
 var t=0.;var norm=vec3f(0,1,0);let start=select(id*5u,0u,id==2u);let count=select(5u,10u,id==2u);
 for(var j=0u;j<count;j++){let k=start+j;let dx=XI[k+1]-XI[k];let H=(HI[k+1]-HI[k])/dx;let F=(FR[k+1]-FR[k])/dx;let B=(BK[k+1]-BK[k])/dx;
 let planes=array<vec4f,6>(vec4f(-1.,0.,0.,-XI[k]),vec4f(1.,0.,0.,XI[k+1]),vec4f(-H,1.,0.,HI[k]-H*XI[k]),vec4f(0.,-1.,0.,0.),vec4f(-F,0.,1.,FR[k]-F*XI[k]+.018),vec4f(-B,0.,-1.,BK[k]-B*XI[k]));
 var enter=-10.;var leave=10.;var n=vec3f(0,1,0);for(var i=0u;i<6u;i++){let b=planes[i];let a=dot(b.xyz,d);let s=b.w-dot(P,b.xyz);if(abs(a)<.00001){if(s<0.){leave=-10.;}}else{if(a>0.){if(s/a<leave){leave=s/a;n=normalize(b.xyz);}}else{enter=max(enter,s/a);}}}
 if(leave>max(0.,enter)&&leave>t){t=leave;norm=n;}}
 return vec4f(norm,max(.015,t));}
fn snowHash(p:vec3f)->f32{var v=fract(p*.1031);v+=dot(v,v.yzx+33.33);return fract((v.x+v.y)*v.z);}
fn cloudField(p:vec3f)->f32{let i=floor(p);let a=fract(p);let u=a*a*(3.-2.*a);return mix(mix(mix(snowHash(i),snowHash(i+vec3f(1,0,0)),u.x),mix(snowHash(i+vec3f(0,1,0)),snowHash(i+vec3f(1,1,0)),u.x),u.y),mix(mix(snowHash(i+vec3f(0,0,1)),snowHash(i+vec3f(1,0,1)),u.x),mix(snowHash(i+vec3f(0,1,1)),snowHash(i+vec3f(1)),u.x),u.y),u.z);}
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
 let d=refract(-E,nl,1./1.31);let path=iceExit(P,d,id);let thick=min(1.5,path.w);
 let l=normalize(vec3f(-.52,.78,.36));let key=clamp(.31+.71*max(0.,dot(n,l)),.1,1.);
 let ndv=clamp(dot(n,eye),0.,1.);let F=.018+.982*pow(1.-ndv,5.);
 let dims=vec2f(textureDimensions(scene));let scale=64./(1.778*.92)*u.zoom*dims.x/u.width;
 let bend=refract(-eye,n,1./1.31)+eye;let co=clamp(vec2i(v.clip.xy+vec2f(bend.x,-bend.y*.92+bend.z*.39191836)*thick*scale),vec2i(0),vec2i(dims)-vec2i(1));
 let substrate=textureLoad(scene,co,0).rgb;let fd=refract(d,-path.xyz,1.31);
 let sky=mapSky(reflect(-eye,n));let outside=rotq(qmat,fd);let travel=mix(substrate,mapSky(outside),smoothstep(.02,.27,outside.y));
 let tir=dot(fd,fd)<.001;let internal=mix(travel,.52*mapSky(rotq(qmat,reflect(d,path.xyz))),select(.04,.88,tir));
 let absorb=exp(-vec3f(3.88,1.29,.52)*thick);let clearIce=internal*absorb*.45+vec3f(.004,.105,.228)*(1.-absorb);
 // Irregular thick platelet beds and open brine windows: nonperiodic fields in the original parent
 // coordinates. Integrate extinction AND in-scattering along the ray, preserving depth ordering.
 var through=1.;var fog=vec3f(0);let ds=thick/14.;
 for(var j=0u;j<14u;j++){let h=P+d*(f32(j)+.5)*ds;
 let broad=cloudField(h*vec3f(4.1,3.2,4.5)+vec3f(7.,5.,3.));let billow=cloudField(h*vec3f(13.,8.,12.)+vec3f(2.,5.,7.));let pore=cloudField(h*vec3f(27.,14.,24.));
 let shift=.20*h.x*h.x+.065*h.z+.037*sin(6.2*h.x+4.7*h.z)+.033*(billow-.5);
 let bed=h.y+shift;let fat=exp(-sq((bed-(.295+.045*broad))/(.059+.042*billow)));let lower=exp(-sq((bed-.126)/(.027+.018*broad)));
 let plume=smoothstep(.30,.68,.66*broad+.34*billow);
 let grain=.55+.50*billow+.17*pore;let nested=.48+.46*sin(4.7*h.x-5.6*h.z+2.6*broad)+.14*sin(10.*h.x+7.*h.z);
 let drift=smoothstep(.22,.86,nested);let channel=smoothstep(.13,.225,bed+.027*billow);
 let sigma=(9.2*fat*(.06+1.30*drift)+4.7*lower*(.02+.85*(1.-drift))+.18*broad)*grain*(.12+.88*channel);
 let dda=1.-exp(-sigma*ds);let layer=mix(vec3f(.29,.60,.70),vec3f(1.20,1.46,1.49),smoothstep(.21,.80,.65*broad+.35*billow));
 fog+=through*dda*layer*(.45+.55*key);through*=1.-dda;}
 var ice=clearIce*through+fog;
 // Exposed chalk fracture: wider chips of crushed platelet ice nest in scallops rather than tiny
 // dots applied to the entire figure. Existing ridges have wet, subdued undersides and denser toes.
 let g=cloudField(P*vec3f(9.5,14.,10.));let coarse=cloudField(P*vec3f(4.2,7.0,6.0)+vec3f(3.,4.,2.));let grain=cloudField(P*vec3f(30.,27.,25.));
 let top=select(0.,1.,abs(face-3.)<.2);let broken=select(0.,1.,abs(face-1.)<.2);let lip=select(0.,1.,abs(face-5.)<.2);let under=select(0.,1.,abs(face-4.)<.2);
 let dust=smoothstep(.30,.71,.58*coarse+.32*g+.10*grain);let chalk=vec3f(.93,1.18,1.23)*(.55+.45*key)*(.83+.22*g+.08*grain);
 // Distinct frozen grains in a few large contact-pressed pockets; the face is not a universal noisy coat.
 let grains=cloudField(P*vec3f(32.,48.,35.)+vec3f(2.,0.,3.));let iceLens=clamp(.5+.5*sin(5.6*P.x-4.1*P.z+3.8*coarse),0.,1.);
 let press=broken*.37+lip*.58+top*.20;let husk=press*iceLens*smoothstep(.38,.73,grains);ice=mix(ice,vec3f(.79,1.16,1.24)*(.54+.46*key),husk);ice*=1.-.27*press*iceLens*(1.-smoothstep(.26,.51,grains));
 let interrupted=clamp(top*(.025+.49*dust*dust)+broken*(.11+.60*dust)+lip*(.025+.27*dust*dust),0.,.80);
 ice=mix(ice,chalk,interrupted);
 // At a recessed side a wet, sheltered lenticular layer can transmit blue before light reaches
 // the chalk farther back. Roof projections make the lip face clearly different from its undercut.
 let wet=vec3f(.005,.078,.16)+clearIce*.37;ice=mix(ice,wet,under*(.55+.29*coarse));
 let sideWindow=(1.-top)*(1.-broken)*(1.-under)*smoothstep(.07,.26,P.z)*(1.-smoothstep(.07,.18,P.y+.038*sin(6.*P.x+3.*P.z)));ice=mix(ice,clearIce*.68,sideWindow*.69);
 // Two buried nonparallel feather splits, not surface decorations. Each is trimmed by entry and exit.
 for(var ii=0u;ii<2u;ii++){let C=array<vec3f,2>(vec3f(-.64,.191,.13),vec3f(.22,.208,.16))[ii];let N=array<vec3f,2>(normalize(vec3f(-.24,.83,.51)),normalize(vec3f(.28,.65,-.71)))[ii];
 let tt=dot(C-P,N)/(dot(d,N)+.000003);let h=P+d*tt-C;let aa=h.x+.16;let vd=h.z+.19*h.x-.032*sin(6.*h.x);let w=(.017+.19*clamp(aa,0.,.59))*(.72+.28*cos(12.*h.x));let gate=smoothstep(0.,.03,aa)*(1.-smoothstep(.32,.56,aa))*step(.002,tt)*step(tt,thick);
 let edge=exp(-sq((abs(vd)-w)/.011))*gate;let spatial=1.-smoothstep(w-.006,w+.013,abs(vd));let ribs=.5+.5*cos(38.*atan2(vd,aa+.05)+11.*aa);
 ice=mix(ice,vec3f(.012,.13,.23),spatial*gate*(.12+.29*ribs));ice+=vec3f(.45,.66,.72)*edge*exp(-1.4*max(0.,tt));}
 let glint=pow(max(0.,dot(reflect(-l,n),eye)),48.);let reflectance=sky*(.025+.39*F)*(1.-interrupted*.65);
 let u0=clamp((age-.0375)/(.198-.0375),0.,1.);let dx=P.x-(.60-.63*u0);let dy=P.y-(.18+.15*u0);let reach=exp(-dx*dx/.012-dy*dy/.018)*smoothstep(.05,.34,P.z);
 let lit=vec3f(.52,1.15,1.42)*reach*max(0.,sin(3.141592*u0));
 let col=ice+reflectance+vec3f(.47,.66,.71)*glint+lit;
 return vec4f(col*v.info.y,v.info.y);
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
