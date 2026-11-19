struct U{ time:f32, zoom:f32, width:f32,height:f32, cx:f32,cy:f32, source:f32,near:f32 };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> lights:array<vec4f>;
@group(0) @binding(2) var scene:texture_2d<f32>;
struct V{@builtin(position) clip:vec4f,@location(0) p:vec3f,@location(1) n:vec3f,@location(2) info:vec4f,@location(3) local:vec3f,@location(4) eyeLocal:vec3f,@location(5) localFace:vec4f};
fn project(p:vec3f)->vec4f{let px=64.0/(1.778*.92)*u.zoom;return vec4f((p.x-u.cx)*px/(u.width*.5),(p.y*.92-p.z*.39191836-u.cy)*px/(u.height*.5),.5-(p.y*.39191836+p.z*.92)*.008,1);}
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)info:vec4f,@location(3)local:vec3f,@location(4)eyeLocal:vec3f,@location(5)localFace:vec4f)->V{var o:V;o.clip=project(p);o.p=p;o.n=n;o.info=info;o.local=local;o.eyeLocal=eyeLocal;o.localFace=localFace;return o;}

const outer=array<vec4f,17>(vec4f(1.000000,0.130000,0.130000,0.500000),vec4f(-1.000000,0.130000,-0.150000,0.500000),vec4f(0.060000,1.000000,-0.100000,0.205000),vec4f(-0.020000,-1.000000,0.028000,0.173000),vec4f(0.055000,0.065000,1.000000,0.322000),vec4f(-0.085000,0.080000,-1.000000,0.368000),vec4f(0.830000,0.200000,0.620000,0.471000),vec4f(-0.560000,0.170000,0.820000,0.399000),vec4f(-0.900000,0.180000,-0.670000,0.492000),vec4f(0.660000,0.140000,-0.850000,0.445000),vec4f(0.140000,0.880000,0.710000,0.294000),vec4f(-0.320000,1.000000,-0.530000,0.309000),vec4f(0.240000,-0.940000,0.660000,0.266000),vec4f(-0.240000,-1.000000,-0.620000,0.283000),vec4f(-0.330000,0.810000,0.740000,0.293000),vec4f(0.510000,0.790000,-0.330000,0.292000),vec4f(0.630000,-0.550000,-0.650000,0.356000));
const planes=array<vec4f,4>(vec4f(-0.060000,-1.000000,-0.550000,-0.078000),vec4f(1.000000,-0.260000,0.300000,-0.178000),vec4f(1.000000,0.420000,-0.260000,0.193000),vec4f(1.000000,0.160000,0.430000,0.071000));
const counts=array<u32,5>(2,3,2,2,2);
const paths=array<vec3i,5>(vec3i(1,2,0),vec3i(1,-2,3),vec3i(1,-3,0),vec3i(-1,4,0),vec3i(-1,-4,0));

fn wall(i:u32,id:u32)->vec4f{if(i<17u){return outer[i];}let slot=paths[id][i-17u];return f32(sign(slot))*planes[u32(abs(slot))-1u];}
fn exitSingle(p:vec3f,d:vec3f,id:u32,whole:bool)->vec4f{var best=3.;var N=vec3f(0,0,1);for(var i=0u;i<17u+select(counts[id],0u,whole);i++){let pl=wall(i,id);let dn=dot(pl.xyz,d);if(dn>.00001){let t=(pl.w-dot(pl.xyz,p))/dn;if(t>.00015&&t<best){best=t;N=normalize(pl.xyz);}}}return vec4f(N,best);}
const releaseTime=array<f32,5>(.1125,.1875,.225,.14166667,.20);
fn insidePart(p:vec3f,id:u32)->bool{for(var j=0u;j<counts[id];j++){let pl=wall(17u+j,id);if(dot(pl.xyz,p)>pl.w+.000025){return false;}}return true;}
fn exitRay(p:vec3f,d:vec3f,id:u32,stage:u32,age:f32)->vec4f{
 if(stage!=2u){return exitSingle(p,d,id,stage==1u);}
 // During the 112 ms staged detachment, rays can cross a still-bonded neighbour.
 // Evaluate bounded line intervals once and follow only intervals joined to the current solid.
 let h=exitSingle(p,d,id,true);var ranges:array<vec2f,5>;var ns:array<vec3f,5>;
 for(var k=0u;k<5u;k++){var lo=-3.;var hi=h.w;var nn=h.xyz;
 if(age+0.000001>=releaseTime[k]){ranges[k]=vec2f(4.,-1.);continue;}
 for(var j=0u;j<counts[k];j++){let pl=wall(17u+j,k);let den=dot(pl.xyz,d);let b=pl.w-dot(pl.xyz,p);
 if(abs(den)<.000001){if(b<-.000025){lo=4.;}}else if(den>0.){let t=b/den;if(t<hi){hi=t;nn=normalize(pl.xyz);}}else{lo=max(lo,b/den);}}
 ranges[k]=vec2f(lo,hi);ns[k]=nn;}
 var stop=.0002;var nn=h.xyz;for(var j=0u;j<5u;j++){for(var k=0u;k<5u;k++){if(ranges[k].x<=stop+.00015&&ranges[k].y>stop){stop=ranges[k].y;nn=ns[k];}}}
 return vec4f(nn,stop);
}
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
 if(v.info.x< -1.5){let a=v.info.y*v.info.z;return vec4f(vec3f(.17,.28,.32)*a,a);}
 if(v.info.x<-.5){return vec4f(.55,.55,.55,1);}
 let n=normalize(v.n);let eye=normalize(vec3f(0,.39191836,.92));let qmat=normalize(vec4f(v.eyeLocal,v.info.w));let E=rotq(vec4f(-qmat.xyz,qmat.w),eye);let nl=normalize(v.localFace.xyz);let id=u32(v.localFace.w)%5u;let stage=u32(v.localFace.w)/5u;let age=v.info.z;
 if(stage==2u&&v.info.x>.5){for(var j=0u;j<5u;j++){if(j!=id&&age+.000001<releaseTime[j]&&insidePart(v.local+nl*.00035,j)){discard;}}}
 let d=refract(-E,nl,1./1.31);let xit=exitRay(v.local,d,id,stage,age);let thick=min(1.1,xit.w);let hit=v.local+d*thick;
 let ndv=clamp(dot(n,eye),0.,1.);let f0=.018;let F=f0+(1.-f0)*pow(1.-ndv,5.);
 let dims=vec2f(textureDimensions(scene));let scale=64./(1.778*.92)*u.zoom*dims.x/u.width;
 let bend=refract(-eye,n,1./1.31)+eye;let offset=vec2f(bend.x,-bend.y*.92+bend.z*.39191836)*thick*scale;
 let coord=clamp(vec2i(v.clip.xy+offset),vec2i(0),vec2i(dims)-vec2i(1));let bg=textureLoad(scene,coord,0).rgb;
 let l=normalize(vec3f(-.46,.79,.39));let key=.36+.64*max(0.,dot(n,l));
 let absorption=vec3f(2.94,.83,.38);let T=exp(-absorption*thick);

 let tail=clamp(dot(xit.xyz,d),0.,1.);let fexit=f0+(1.-f0)*pow(1.-tail,5.);
 let tir=select(0.,1.,1.31*1.31*(1.-tail*tail)>=1.);
 let sky=mapSky(reflect(-eye,n));
 let out1=rotq(qmat,refract(d,-xit.xyz,1.31));let exitLit=mix(bg,mapSky(out1),smoothstep(-.015,.13,out1.y));
 let dr=reflect(d,xit.xyz);let bx=exitRay(hit+dr*.001,dr,id,stage,age);let hit2=hit+dr*min(.9,bx.w);
 let secondCos=clamp(dot(bx.xyz,dr),0.,1.);let total2=1.31*1.31*(1.-secondCos*secondCos)>=1.;
 let out2=rotq(qmat,refract(dr,-bx.xyz,1.31));let exit2=mix(bg,mapSky(out2),smoothstep(-.015,.13,out2.y));
 let bounced=mix(exit2,vec3f(.028,.077,.115),select(0.,1.,total2));
 let secondRime=rime(hit2);let under=mix(bounced,vec3f(.65,.92,.99)*(.57+.43*key),secondRime*.67);
 let reflected=mix(exitLit,under,clamp(fexit+tir,0.,1.));
 // A broad shell-like stress feather lives INSIDE the upper leaf and shares parent-local coordinates on cut sides.
 // Exact quadratic ray / parabolic lamella contact, bounded to an asymmetric oval; no screen decal or detached bubble.
 let x=v.local.x+.155;let z=v.local.z-.018;
 let off=v.local.y-(.048+.18*x-.19*z+.70*x*x+.34*z*z);
 let A=-.70*d.x*d.x-.34*d.z*d.z;
 let B=d.y-.18*d.x+.19*d.z-1.4*x*d.x-.68*z*d.z;
 let discriminant=B*B-4.*A*off;
 let rootA=(-B-sqrt(max(0.,discriminant)))/(2.*min(-.000001,A));
 let rootB=(-B+sqrt(max(0.,discriminant)))/(2.*min(-.000001,A));
 let k=select(rootB,rootA,rootA>.002&&rootA<thick);
 let fe=v.local+d*k;let fp=vec2f((fe.x+.16)/.385,(fe.z-.018)/.235);
 let ellipse=dot(fp,fp)+.085*sin(5.*fp.x+3.*fp.y);
 let mask=select(0.,1.,discriminant>=0.&&k>.002&&k<thick-.001)*(1.-smoothstep(.83,1.02,ellipse));
 let nf=normalize(vec3f(-.18-1.4*(fe.x+.155),1.,.19-.68*(fe.z-.018)));
 let an=abs(dot(nf,d));let critical=1.31*1.31*(1.-an*an);
 let feather=(.10+.81*smoothstep(.62,1.02,critical))*(.3+.70*smoothstep(.2,1.0,ellipse))*mask;
 let planeLight=mapSky(rotq(qmat,reflect(d,nf)))*vec3f(.80,.95,.995);
 let core=mix(reflected,planeLight,feather);

 // Neither the porous snow-ice layer nor the submerged glass-clear heel is a surface decal.
 // Integrate directional trapped platelet strata at four depths; the cap carries a ragged thickness wedge.
 let loc=v.local;
 var inclusions=0.;var snow=0.;
 for(var k=0u;k<4u;k++){
  let p=loc+d*thick*(.125+.25*f32(k));
  let ledge=.04+.112*p.x-.15*p.z+.026*sin(9.*p.z+5.*p.x)+.016*sin(17.*p.x-6.*p.z);
  let beds=p.y-ledge;
  let fingers=sin(23.*p.x-11.*p.z+2.4*sin(9.*p.z+7.*p.x));
  let runs=.5+.5*sin(49.*beds+2.2*sin(5.*p.x-7.*p.z)+.45*fingers);
  let flecks=smoothstep(-.48,.76,fingers)*smoothstep(.42,.97,runs)*exp(-abs(beds-.006)*8.);
  inclusions+=flecks*.25;
  snow+=smoothstep(-.023,.081,beds+.025*fingers)*.25;
 }
 let cut=step(.5,v.info.x);
 // Actual bonds of the partition: the oblique parent seam and its three finite intersecting branches.
 let P=loc;let s0=dot(P,planes[0].xyz)-planes[0].w;
 let s1=dot(P,planes[1].xyz)-planes[1].w;let s2=dot(P,planes[2].xyz)-planes[2].w;let s3=dot(P,planes[3].xyz)-planes[3].w;
 let main=abs(s0)/length(planes[0].xyz);
 let seamX=P.x-.18*(P.y-.15);
 let fw=clamp((age-.008)/.158,0.,1.);
 let front=-.50+.99*fw + .012*sin(9.*fw);
 let built=smoothstep(seamX-.023,seamX+.021,front)*smoothstep(.008,.022,age);
 let branchDist=select(abs(s3),min(abs(s1),abs(s2)),s0<0.);
 let branchTime=select(.083,select(.129,.053,abs(s1)<abs(s2)),s0<0.);
 let branchAdvance=smoothstep(abs(s0)-.02,abs(s0)+.02,(age-branchTime)*3.7);
 let rough=.007+.006*sin(26.*seamX+21.*P.y)+.004*sin(45.*seamX-18.*P.z);
 let outerFace=1.-cut;
 let pre=outerFace*max(exp(-pow(main/(.018+rough),2.))*built,
             exp(-pow(branchDist/.019,2.))*branchAdvance*built);
 let lead=exp(-pow((seamX-front)/.088,2.))*built*(1.-smoothstep(.13,.196,age));
 // Narrow dark discontinuity bracketed by a chalky wedge, with brightness confined to the advancing crushed core.
 let rim=outerFace*exp(-pow((s0-.033-rough)/.033,2.))*built;
 let veil=(.39*snow+.36*inclusions)*thick+.12*rime(P);
 let shear=exp(-pow((P.y-(.035+.13*P.x-.08*P.z+.022*sin(15.*P.x)))/.058,2.));
 let fresh=cut*(.22+.50*shear)*(.44+.56*inclusions);
 let frost=clamp(1.-exp(-4.8*veil)+fresh+.61*rim,0.,.91);
 // Pressure ridges leave a scalloped line of minute elongated cells within the opaque seam,
 // clearly bounded by a broad untouched transmission window, not painted-over full faces.
 let ridge=P.y+.06*P.x+.14*P.z-.035-.018*sin(11.*P.x);
 let cells=.5+.5*sin(57.*P.x+19.*P.z+4.4*sin(11.*P.y+6.*P.x)+1.8*sin(21.*P.x+13.*P.z));
 let comb=exp(-pow((ridge-.023*cells)/(.009+.012*cells),2.))*smoothstep(-.23,.20,P.z-.16*P.x);
 let flake=cut*(.37+.63*smoothstep(.12,.8,cells))*exp(-pow((s0+.043*cells)/.074,2.));
 let film=clamp(frost+.23*comb+.16*flake,0.,.93);
 let diffuse=vec3f(.68,.99,1.14)*(.37+.64*key)+vec3f(.032,.09,.13)*(1.-key);
 // scatter within low rime rather than mirror-coating even the rough, crushed faces
 let interior=mix(T*core+vec3f(.022,.108,.154)*(vec3f(1.)-T),diffuse,film);
 let slab=mix(interior,sky,F*(1.-.62*frost));
 let spec=pow(max(0.,dot(reflect(-l,n),eye)),mix(55.,11.,frost))*(1.-.76*frost);
 let emission=vec3f(.28,.86,1.09)*lead*(1.62*pre+.57*rim);
 var c=mix(slab,vec3f(.012,.044,.067),pre*.93)+spec*vec3f(.65,.72,.75)+emission;
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
