struct U{ time:f32, zoom:f32, width:f32,height:f32, cx:f32,cy:f32, source:f32,near:f32 };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> lights:array<vec4f>;
@group(0) @binding(2) var scene:texture_2d<f32>;
struct V{@builtin(position) clip:vec4f,@location(0) p:vec3f,@location(1) n:vec3f,@location(2) info:vec4f,@location(3) local:vec3f,@location(4) eyeLocal:vec3f,@location(5) localFace:vec4f};
fn project(p:vec3f)->vec4f{let px=64.0/(1.778*.92)*u.zoom;return vec4f((p.x-u.cx)*px/(u.width*.5),(p.y*.92-p.z*.39191836-u.cy)*px/(u.height*.5),.5-(p.y*.39191836+p.z*.92)*.008,1);}
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)info:vec4f,@location(3)local:vec3f,@location(4)eyeLocal:vec3f,@location(5)localFace:vec4f)->V{var o:V;o.clip=project(p);o.p=p;o.n=n;o.info=info;o.local=local;o.eyeLocal=eyeLocal;o.localFace=localFace;return o;}

const outer=array<vec4f,14>(vec4f(1.00000,0.08000,0.16000,0.45000),vec4f(-1.00000,0.17000,-0.08000,0.48000),vec4f(0.04000,1.00000,-0.08000,0.19000),vec4f(-0.03500,-1.00000,0.04000,0.16000),vec4f(0.08000,0.05000,1.00000,0.31000),vec4f(-0.09000,-0.01000,-1.00000,0.32000),vec4f(0.65000,0.18000,0.85000,0.43000),vec4f(-0.68000,0.10000,0.74000,0.42000),vec4f(-0.82000,0.12000,-0.61000,0.46000),vec4f(0.78000,0.15000,-0.65000,0.42000),vec4f(0.18000,1.00000,0.67000,0.30500),vec4f(-0.26000,1.00000,-0.64000,0.32000),vec4f(0.18000,-1.00000,0.54000,0.25200),vec4f(-0.20000,-1.00000,-0.60000,0.26500));
const bed=vec4f(0.17000,1.00000,-0.15000,0.03500);const lower=vec4f(0.87000,0.10000,-0.62000,-0.06500);const upper=vec4f(1.00000,-0.12000,0.36000,0.18000);
fn wall(i:u32,id:u32)->vec4f{if(i<14u){return outer[i];}if(i==14u){return select(-bed,bed,id<2u);}return select(-1.0,1.0,(id%2u)==0u)*select(upper,lower,id<2u);}
fn exitRay(p:vec3f,d:vec3f,id:u32,whole:bool)->vec4f{var best=3.;var N=vec3f(0,0,1);for(var i=0u;i<select(16u,14u,whole);i++){let pl=wall(i,id);let dn=dot(pl.xyz,d);if(dn>.00001){let t=(pl.w-dot(pl.xyz,p))/dn;if(t>.00015&&t<best){best=t;N=normalize(pl.xyz);}}}return vec4f(N,best);}
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
 if(v.info.x<-.5){return vec4f(.55,.55,.55,1);}
 let n=normalize(v.n);let eye=normalize(vec3f(0,.39191836,.92));let qmat=normalize(vec4f(v.eyeLocal,v.info.w));let E=rotq(vec4f(-qmat.xyz,qmat.w),eye);let nl=normalize(v.localFace.xyz);let id=u32(v.localFace.w)%4u;let whole=u.time<=.0001||v.localFace.w>=4.;
 let d=refract(-E,nl,1./1.31);let xit=exitRay(v.local,d,id,whole);let thick=min(1.1,xit.w);let hit=v.local+d*thick;
 let ndv=clamp(dot(n,eye),0.,1.);let f0=.018;let F=f0+(1.-f0)*pow(1.-ndv,5.);
 let dims=vec2f(textureDimensions(scene));let scale=64./(1.778*.92)*u.zoom*dims.x/u.width;
 let bend=refract(-eye,n,1./1.31)+eye;let offset=vec2f(bend.x,-bend.y*.92+bend.z*.39191836)*thick*scale;
 let coord=clamp(vec2i(v.clip.xy+offset),vec2i(0),vec2i(dims)-vec2i(1));let bg=textureLoad(scene,coord,0).rgb;
 let l=normalize(vec3f(-.46,.79,.39));let key=.36+.64*max(0.,dot(n,l));
 let absorption=vec3f(2.35,.65,.36);let T=exp(-absorption*thick);

 let tail=clamp(dot(xit.xyz,d),0.,1.);let fexit=f0+(1.-f0)*pow(1.-tail,5.);
 let tir=select(0.,1.,1.31*1.31*(1.-tail*tail)>=1.);
 let sky=mapSky(reflect(-eye,n));
 let out1=rotq(qmat,refract(d,-xit.xyz,1.31));let exitLit=mix(bg,mapSky(out1),smoothstep(-.015,.13,out1.y));
 let dr=reflect(d,xit.xyz);let bx=exitRay(hit+dr*.001,dr,id,whole);let hit2=hit+dr*min(.9,bx.w);
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
 let cloudy=(rime(v.local)*.28+rime(v.local+d*thick*.54)*.42+rime(hit)*.30);
 let iso=bedDepth(v.local);let cut=step(.5,v.info.x);
 // irregular split exposes a finite laminated tongue; not a uniformly luminous contour or global opacity boost.
 let stratum=exp(-pow((iso-.074)/.021,2.))*smoothstep(-.43,.05,-v.local.x+.50*v.local.z);
 let edgeFront=abs(dot(v.local,bed.xyz)-bed.w);
 let broken=cut*exp(-12.*edgeFront)*(.52+.48*cos(11.*v.local.x+9.*v.local.z));
 let fog=clamp(1.-exp(-thick*(.20+3.1*cloudy))+.50*rime(v.local)+cut*.57*stratum+.025*broken,0.,.91);
 let milky=vec3f(.70,1.01,1.09)*key+vec3f(.10,.22,.27)*(1.-key);
 let interior=mix(T*core+vec3f(.026,.11,.15)*(vec3f(1.)-T),milky,fog);
 let movingGlint=pow(max(0.,dot(reflect(-l,n),eye)),select(45.,17.,cut>.5));
 let emission=vec3f(.26,.76,1.05)*v.info.z*broken;
 var c=mix(interior,sky,F)+movingGlint*vec3f(.83,.92,.99)+emission;
 return vec4f(c*v.info.y,v.info.y);
}

struct Q{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn quad(@builtin(vertex_index)i:u32)->Q{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Q;o.p=vec4f(p[i],.99,1);o.uv=p[i];return o;}
@fragment fn ground(q:Q)->@location(0)vec4f{let px=64.0/(1.778*.92)*u.zoom;let x=q.uv.x*u.width*.5/px+u.cx;let z=-(q.uv.y*u.height*.5/px+u.cy)/.39191836;let p=vec3f(x,0,z);var lit=vec3f(0);if(u.source>.5&&u.near>.5){for(var i=0u;i<64u;i++){let a=lights[i];let d=distance(p,a.xyz);let lambert=max(.05,a.y)/max(.1,d);lit+=vec3f(.015,.18,.25)*a.w*lambert*pow(max(0.0,1.0-d/.72),2.0)/(1+d*d*4);}}return vec4f(vec3f(.004,.008,.014)+lit,1);}
