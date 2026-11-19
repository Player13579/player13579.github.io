struct U{ time:f32, zoom:f32, width:f32,height:f32, cx:f32,cy:f32, source:f32,near:f32 };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> lights:array<vec4f>;
@group(0) @binding(2) var scene:texture_2d<f32>;
struct V{@builtin(position) clip:vec4f,@location(0) p:vec3f,@location(1) n:vec3f,@location(2) info:vec4f,@location(3) local:vec3f,@location(4) eyeLocal:vec3f,@location(5) localFace:vec4f};
fn project(p:vec3f)->vec4f{let px=64.0/(1.778*.92)*u.zoom;return vec4f((p.x-u.cx)*px/(u.width*.5),(p.y*.92-p.z*.39191836-u.cy)*px/(u.height*.5),.5-(p.y*.39191836+p.z*.92)*.008,1);}
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)info:vec4f,@location(3)local:vec3f,@location(4)eyeLocal:vec3f,@location(5)localFace:vec4f)->V{var o:V;o.clip=project(p);o.p=p;o.n=n;o.info=info;o.local=local;o.eyeLocal=eyeLocal;o.localFace=localFace;return o;}

const outer=array<vec4f,26>(vec4f(0.0000000,-0.1600000,-1.0000000,0.3480000),vec4f(0.0000000,-0.1600000,1.0000000,0.3480000),vec4f(0.0000000,-1.0000000,0.0000000,0.2390000),vec4f(0.0000000,-0.8202439,-0.7071068,0.3715793),vec4f(0.0000000,-0.8202439,0.7071068,0.3715793),vec4f(0.0000000,1.0000000,0.0000000,0.2390000),vec4f(0.0000000,0.5939697,-0.7071068,0.3715793),vec4f(0.0000000,0.5939697,0.7071068,0.3715793),vec4f(-1.0000000,-0.1500000,0.0000000,0.4850000),vec4f(-0.7071068,-0.2192031,-0.7071068,0.5455275),vec4f(-0.7071068,-0.2192031,0.7071068,0.5455275),vec4f(-0.7071068,-0.8131728,0.0000000,0.4684529),vec4f(-0.5773503,-0.7563289,-0.5773503,0.5420542),vec4f(-0.5773503,-0.7563289,0.5773503,0.5420542),vec4f(-0.7071068,0.6010408,0.0000000,0.4684529),vec4f(-0.5773503,0.3983717,-0.5773503,0.5420542),vec4f(-0.5773503,0.3983717,0.5773503,0.5420542),vec4f(1.0000000,-0.1500000,0.0000000,0.4850000),vec4f(0.7071068,-0.2192031,-0.7071068,0.5455275),vec4f(0.7071068,-0.2192031,0.7071068,0.5455275),vec4f(0.7071068,-0.8131728,0.0000000,0.4684529),vec4f(0.5773503,-0.7563289,-0.5773503,0.5420542),vec4f(0.5773503,-0.7563289,0.5773503,0.5420542),vec4f(0.7071068,0.6010408,0.0000000,0.4684529),vec4f(0.5773503,0.3983717,-0.5773503,0.5420542),vec4f(0.5773503,0.3983717,0.5773503,0.5420542));
const planes=array<vec4f,4>(vec4f(-0.0780000,-1.0000000,-0.1600000,0.0320000),vec4f(1.0000000,-0.3200000,0.2700000,-0.2250000),vec4f(1.0000000,0.1900000,-0.3500000,0.2150000),vec4f(1.0000000,-0.1400000,0.5800000,0.0820000));
const counts=array<u32,5>(2,3,2,2,2);
const paths=array<vec3i,5>(vec3i(1,2,0),vec3i(1,-2,3),vec3i(1,-3,0),vec3i(-1,4,0),vec3i(-1,-4,0));

fn wall(i:u32,id:u32)->vec4f{if(i<26u){return outer[i];}let slot=paths[id][i-26u];return f32(sign(slot))*planes[u32(abs(slot))-1u];}
fn exitSingle(p:vec3f,d:vec3f,id:u32,whole:bool)->vec4f{var best=3.;var N=vec3f(0,0,1);for(var i=0u;i<26u+select(counts[id],0u,whole);i++){let pl=wall(i,id);let dn=dot(pl.xyz,d);if(dn>.00001){let t=(pl.w-dot(pl.xyz,p))/dn;if(t>.00015&&t<best){best=t;N=normalize(pl.xyz);}}}return vec4f(N,best);}
const releaseTime=array<f32,5>(.025,.09166667,.06666667,.14166667,.20);
fn insidePart(p:vec3f,id:u32)->bool{for(var j=0u;j<counts[id];j++){let pl=wall(26u+j,id);if(dot(pl.xyz,p)>pl.w+.000025){return false;}}return true;}
fn exitRay(p:vec3f,d:vec3f,id:u32,stage:u32,age:f32)->vec4f{
 if(stage!=2u){return exitSingle(p,d,id,stage==1u);}
 // During the 112 ms staged detachment, rays can cross a still-bonded neighbour.
 // Evaluate bounded line intervals once and follow only intervals joined to the current solid.
 let h=exitSingle(p,d,id,true);var ranges:array<vec2f,5>;var ns:array<vec3f,5>;
 for(var k=0u;k<5u;k++){var lo=-3.;var hi=h.w;var nn=h.xyz;
 if(age+0.000001>=releaseTime[k]){ranges[k]=vec2f(4.,-1.);continue;}
 for(var j=0u;j<counts[k];j++){let pl=wall(26u+j,k);let den=dot(pl.xyz,d);let b=pl.w-dot(pl.xyz,p);
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
 if(v.info.x< -2.5){
  let U=v.local.x;let V=v.local.y;let packed=smoothstep(.08,.75,U)*(.71+.29*sin(22.*U+8.*V+1.2*sin(18.*V)))*
    (1.-smoothstep(.20,.68,abs(V-.44)));
  let wet=vec3f(.025,.085,.121);let corn=vec3f(.59,.89,1.02)*(.62+.38*max(0.,dot(normalize(v.n),normalize(vec3f(-.48,.74,.27)))));
  let col=mix(wet,corn,packed);let alpha=v.info.y*(.36+.45*packed);return vec4f(col*alpha,alpha);}
 if(v.info.x< -1.5){let a=v.info.y*v.info.z;return vec4f(vec3f(.17,.28,.32)*a,a);}
 if(v.info.x<-.5){return vec4f(.55,.55,.55,1);}
 var n=normalize(v.n);let eye=normalize(vec3f(0,.39191836,.92));let qmat=normalize(vec4f(v.eyeLocal,v.info.w));let E=rotq(vec4f(-qmat.xyz,qmat.w),eye);var nl=normalize(v.localFace.xyz);let id=u32(v.localFace.w)%5u;let stage=u32(v.localFace.w)/5u;let age=v.info.z;
 if(stage==2u&&v.info.x>.5){for(var j=0u;j<5u;j++){if(j!=id&&age+.000001<releaseTime[j]&&insidePart(v.local+nl*.00035,j)){discard;}}}
 let P=v.local;let cut=step(.5,v.info.x);
 // Plastic looking mirror facets are avoided: the outside has an eroded/rounded skin around a flat crown.
 // Internal fracture planes remain flat in position and never inherit an exterior cube bevel.
 if(cut<.5){
  let a=abs(P);let corner=max(vec3f(0.),a-vec3f(.373,.127,.236))*sign(P);
  if(length(corner)>.001){let soft=normalize(corner);nl=normalize(mix(nl,soft,.83));}
  n=rotq(qmat,nl);
 }
 // A shallow melt scallop redirects reflection on the exposed free surface; not surface decoration.
 let outerW=1.-cut;let ripple=vec3f(.030*cos(14.*P.x-7.*P.y+.8*sin(7.*P.z)),.047*sin(12.*P.z+9.*P.x),.029*cos(15.*P.y+9.*P.x));
 nl=normalize(nl+outerW*(ripple-nl*dot(nl,ripple)));n=rotq(qmat,nl);
 let d=refract(-E,nl,1./1.31);let path=exitRay(P,d,id,stage,age);let thick=min(1.2,path.w);
 let l=normalize(vec3f(-.52,.78,.36));let key=clamp(.34+.68*max(0.,dot(n,l)),.1,1.);
 let ndv=clamp(dot(n,eye),0.,1.);let F=.018+.982*pow(1.-ndv,5.);
 let dims=vec2f(textureDimensions(scene));let scale=64./(1.778*.92)*u.zoom*dims.x/u.width;
 let bend=refract(-eye,n,1./1.31)+eye;
 let co=clamp(vec2i(v.clip.xy+vec2f(bend.x,-bend.y*.92+bend.z*.39191836)*thick*scale),vec2i(0),vec2i(dims)-vec2i(1));
 let base=textureLoad(scene,co,0).rgb;let farW=rotq(qmat,refract(d,-path.xyz,1.31));
 let incidence=dot(path.xyz,d);let tir=1.31*1.31*(1.-incidence*incidence)>=1.;
 let sky=mapSky(reflect(-eye,n));let back=mix(base,mapSky(farW),smoothstep(-.03,.22,farW.y));
 let reflected=mapSky(rotq(qmat,reflect(d,path.xyz)));
 let inside=mix(back,reflected*.62,select(.025,.90,tir));
 let trans=exp(-vec3f(3.9,1.05,.53)*thick);
 let deep=vec3f(.007,.057,.117);let water=inside*trans*.61+deep*(1.-trans)
  +vec3f(.003,.088,.169)*smoothstep(.06,.40,thick);
 // Two broad buried snow-ice lobes in a mostly transparent heel, sampled in parent coordinates.
 // Their irregular outlines bend into soft nested compression leaves as rays cross the milky bed.
 var od=0.;var bias=0.;
 for(var k=0u;k<10u;k++){
  let p=P+d*thick*(.05+.1*f32(k));
  let warp=.026*sin(10.*p.x+8.1*p.z)+.014*sin(19.*p.z-9.*p.x);
  let bed=p.y+.045+.095*p.x+.11*p.z+warp; 
  let e1=length(vec3f((p.x+.19)/.31,(bed+.090)/.078,(p.z-.11)/.26));
  let e2=length(vec3f((p.x-.12)/.32,(bed+.047)/.096,(p.z+.13)/.21));
  let pore=1.-smoothstep(.66,1.21,min(e1,e2));
  let folds=.55+.45*sin(70.*bed+2.2*sin(6.5*p.x-10.*p.z));
  let high=.5+.5*sin(149.*bed+.9*sin(18.*p.x-11.*p.z)+.65*cos(31.*p.z+12.*p.x));
  let compact=exp(-pow((bed+.04-.035*sin(5.*p.x+8.*p.z))/.065,2.))*(.45+.55*folds);
  let vmin=pore*(4.6+3.1*folds+.9*high)+compact*.74; 
  od+=vmin*thick*.10;bias+=pore*thick*.10;
 }
 let odSnow=1.-exp(-od); 
 // Air cleavage in the thick undercut. When the rear bond opens, its walls become pale
 // under total reflection where crushed, but the intact unsheared window still transmits.
 let seam=dot(planes[0].xyz,P)-planes[0].w;let field=P.x+.075*sin(11.*P.z);
 let front=-.51+.99*clamp((age-.006)/.145,0.,1.);
 let built=smoothstep(field-.05,field+.045,front)*smoothstep(.004,.030,age);
 let rag=.013*sin(20.*P.x+16.*P.z)+.009*cos(33.*P.x-13.*P.z);
 let pre=(1.-cut)*exp(-pow((seam-rag)/.018,2.))*built;
 let rim=(1.-cut)*exp(-pow((seam-rag-.034)/.04,2.))*built;
 let lead=exp(-pow((field-front)/.085,2.))*(1.-smoothstep(.12,.17,age));
 let cutf=cut*(.16+.52*exp(-pow((seam-rag)/.065,2.))+.19*exp(-pow((P.y+.08+rag)/.067,2.)));
 // Saturated, dense interior stays distinctly blue in thicker paths, while retained air reflects white.
 let innerLight=clamp(.40+.60*key+.25*max(0.,-n.z),0.,1.);
 let milk=vec3f(1.24,1.55,1.64)*innerLight;
 var frozen=water;
 // Two separate internal cleavage feathers. A bounded fan of air-filled steps presents a darker
 // underside and a bright face; their sharply convergent ribs follow intersections in the bulk.
 for (var f=0u;f<2u;f++){
  let flip=select(1.,-1.,f==1u);let cen=select(vec3f(-.125,.072,.13),vec3f(.21,-.065,-.008),f==1u);
  let nf=normalize(vec3f(.30*flip,.78,-.67*flip));let ax=normalize(vec3f(1.,-.30*flip/.78,0.));let az=normalize(cross(nf,ax));
  let den=dot(d,nf);let k=dot(cen-P,nf)/(sign(den)*max(.00001,abs(den))+.000001);
  let hit=P+d*k-cen;let u=dot(hit,ax)*flip;let v=dot(hit,az);let a=clamp((u+.255)/.52,0.,1.);
  let vv=v-.054*sin(a*3.4)+.011*sin(22.*u);let width=.015+.13*sqrt(a)*(.77+.23*sin(32.*u+1.1*sin(15.*u)));
  let inner=1.-smoothstep(width-.018,width+.006,abs(vv));let ends=smoothstep(-.266,-.230,u)*(1.-smoothstep(.197,.275,u));
  let valid=select(0.,1.,k>.003&&k<thick-.001);
  let span=inner*ends*valid;
  let leafAngle=atan2(vv,max(.022,u+.28));let fork=.5+.5*cos(17.*leafAngle+12.*u+2.1*sin(16.*u+11.*vv)+1.4*sin(26.*u-18.*vv));
  let edge=exp(-pow((abs(vv)-width+.012)/.013,2.));
  let onset=smoothstep(.35,.93,fork)*(.38+.62*smoothstep(.01,.13,abs(vv)));
  let air=vec3f(.58,1.24,1.50)*(onset*.83+.13*key)+vec3f(.022,.079,.14);
  frozen=mix(frozen,air,span*(.36+.40*onset)+valid*ends*edge*.52);
 }
 // A wandering embedded rift plane splits into a softer sibling, each finite from tip to heel.
 let rN=normalize(vec3f(.18,.96,-.24));let denR=dot(d,rN);
 let tR=dot(vec3f(.00,.087,.00)-P,rN)/(denR+.000001);
 let rf=P+d*tR;let cx=rf.x+.18;let rz=rf.z-.17*rf.x;
 let profile=.02+.13*abs(cx+.05)-.20*abs(cx-.075)+.14*abs(cx-.23)+.055*sin(24.*cx)-.022*cos(47.*cx);
 let dist=rz-profile;let w=.012+.013*smoothstep(-.28,.43,cx);
 let jag=smoothstep(-.03,.018,dist)*(1.-smoothstep(.012,.012+w,dist));
 let sidep=profile+.47*(cx-.09)+.027*sin(27.*cx);let subedge=exp(-pow((rz-sidep)/.014,2.))*smoothstep(.09,.16,cx)*(1.-smoothstep(.31,.48,cx));
 let scope=select(0.,1.,tR>.002&&tR<thick-.002)*smoothstep(-.26,-.15,cx)*(1.-smoothstep(.45,.58,cx));
 let sc=scope*clamp(jag+subedge*.65,0.,1.);
 let ledgeShade=scope*exp(-pow((dist+.012)/.022,2.));
 frozen=mix(frozen,vec3f(.009,.050,.098),ledgeShade*.79);
 frozen=mix(frozen,vec3f(1.51,2.19,2.48),sc*.86);
 let encased=mix(frozen,milk,clamp(odSnow*.82+cutf*.10,0.,.92));
 // Softly chipped crust, on the exposed lip only; soft center and cold blue underside stay separate.
 let lip=(1.-cut)*smoothstep(.106,.224,P.y+.024*cos(9.*P.x+5.*P.z))
    *smoothstep(.17,.39,length(vec2f(P.x*.94,P.z*1.2))+.023*sin(13.*P.x-8.*P.z));
 let ridge=clamp(rim*.71+lip*.15+cutf*.13,0.,.94);
 let spec=pow(max(0.,dot(reflect(-l,n),eye)),mix(65.,17.,ridge))*(1.-.81*ridge);
 let slab=mix(mix(encased,milk*1.10,ridge),sky,F*(1.-.78*ridge));
 let emission=vec3f(.28,.86,1.09)*lead*(1.62*pre+.57*rim);
 var c=mix(slab,vec3f(.025,.108,.16),.68*pre)+spec*vec3f(.62,.80,.86)+emission;
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
