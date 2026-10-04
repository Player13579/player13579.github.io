// GPT-6.1-Sol R16 UNSEALED. Offset hot path in broad charge body; independent emission/extinction.
export const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function section(u,age,{reducedMotion=false}={}){
 const t=reducedMotion?210:Math.max(0,age),front=.08+.92*smooth(t/210);
 const q=(u-(1.5*t/420-.25))/.18,pulse=Math.exp(-q*q);
 const envelope=smooth(u/.04)*smooth((front-u)/.055);
 const span=Math.sin(Math.PI*Math.max(0,Math.min(1,u/front)));
 return {front,pulse,envelope,bodyY:(-7+2*pulse)*envelope,bodyR:(14+3*span)*envelope,
  coreY:(7+1.5*pulse)*envelope,coreR:(4.5+.5*pulse)*envelope,
  nearY:(2+2*pulse)*envelope,nearR:10*envelope,nearWeight:.12+.88*pulse};
}
const cloud=(y,z,cy,cz,ry,rz)=>ry<.001?0:smooth(1-((y-cy)/ry)**2-((z-cz)/rz)**2);
export function opticalSample(u,y,z,age,options={}){
 const g=section(u,age,options);
 if(u<=0||u>=g.front||g.envelope<=0)return {extinction:0,emission:[0,0,0],body:0,core:0,near:0};
 const body=cloud(y,z,g.bodyY,9,g.bodyR,9);
 const core=cloud(y,z,g.coreY,1,g.coreR,4);
 const near=cloud(y,z,g.nearY,-9,g.nearR,7)*g.nearWeight;
 const extinction=.14*body+.12*core+3.8*near;
 const emission=[.035*body+35.308*core+.20*near,.20*body+21.372*core+1.50*near,.52*body+6.656*core+2.50*near];
 return {extinction,emission,body,core,near};
}
export function sampleTransportMaterial(u,y,age,{reducedMotion=false,power=1,steps=24}={}){
 let trans=1,rgb=[0,0,0];const ds=48/steps*.24;
 for(let i=0;i<steps;i++){
  const p=opticalSample(u,y,-24+(i+.5)*48/steps,age,{reducedMotion});
  const opacity=1-Math.exp(-p.extinction*ds);
  // Exact constant-cell source integral: j*(1-exp(-sigma ds))/sigma.
  const path=p.extinction>1e-6?opacity/p.extinction:ds;
  rgb=rgb.map((v,j)=>v+trans*path*p.emission[j]);trans*=1-opacity;
 }
 return {rgb:rgb.map(v=>v*power),alpha:(1-trans)*power};
}
export const MATERIAL_WGSL=/*wgsl*/`
fn smooth01(v:f32)->f32 {let q=clamp(v,0.0,1.0);return q*q*(3.0-2.0*q);}
struct ChargeSection { envelope:f32,pulse:f32,bodyY:f32,bodyR:f32,coreY:f32,coreR:f32,nearY:f32,nearR:f32,nearWeight:f32, }
fn chargeSection(u:f32,t:f32,front:f32)->ChargeSection {
 let q=(u-(1.5*t/420.0-0.25))/0.18;let pulse=exp(-q*q);
 let envelope=smooth01(u/0.04)*smooth01((front-u)/0.055);
 let span=sin(3.14159265359*clamp(u/front,0.0,1.0));
 return ChargeSection(envelope,pulse,(-7.0+2.0*pulse)*envelope,(14.0+3.0*span)*envelope,
  (7.0+1.5*pulse)*envelope,(4.5+0.5*pulse)*envelope,(2.0+2.0*pulse)*envelope,
  10.0*envelope,0.12+0.88*pulse);
}
fn chargeCloud(y:f32,z:f32,cy:f32,cz:f32,ry:f32,rz:f32)->f32 {
 if(ry<0.001){return 0.0;}
 let q=vec2f((y-cy)/ry,(z-cz)/rz);return smooth01(1.0-dot(q,q));
}
fn chargeSample(y:f32,z:f32,g:ChargeSection)->vec4f {
 let body=chargeCloud(y,z,g.bodyY,9.0,g.bodyR,9.0);
 let core=chargeCloud(y,z,g.coreY,1.0,g.coreR,4.0);
 let near=chargeCloud(y,z,g.nearY,-9.0,g.nearR,7.0)*g.nearWeight;
 let sigma=body*0.14+core*0.12+near*3.8;
 let j=vec3f(0.035,0.20,0.52)*body+vec3f(35.308,21.372,6.656)*core+vec3f(0.20,1.50,2.50)*near;
 return vec4f(j,sigma);
}
fn chargeRadiance(y:f32,g:ChargeSection)->vec4f {
 var trans=1.0;var rgb=vec3f(0.0);
 for(var i=0u;i<24u;i=i+1u){
  let p=chargeSample(y,-24.0+(f32(i)+0.5)*2.0,g);
  let opacity=1.0-exp(-p.a*0.48);
  var path=0.48;if(p.a>0.000001){path=opacity/p.a;}
  rgb=rgb+trans*path*p.rgb;trans=trans*(1.0-opacity);
 }
 return vec4f(rgb,1.0-trans);
}
fn chargeSpread(y:f32,cy:f32,r:f32)->f32 {
 if(r<0.001){return 0.0;}
 let q=(y-cy)/(r+4.0);return smooth01(1.0-q*q);
}
@fragment fn fs(o:Output)->@location(0) vec4f {
 if(o.emission>=0.0){return vec4f(o.color.rgb*(1.0+o.emission)*o.color.a,o.color.a);}
 let u=o.color.x;let y=o.color.y;
 let age=select(o.color.z,-1.0-o.color.z,o.color.z<0.0);
 let t=select(max(0.0,age),210.0,o.color.z<0.0);
 let front=0.08+0.92*smooth01(t/210.0);let power=o.color.w;
 if(u<=0.0||u>=front||power<=0.0){return vec4f(0.0);}
 let g=chargeSection(u,t,front);
 if(g.envelope<=0.0){return vec4f(0.0);}
 if(o.emission > -1.5){
  let body=chargeSpread(y,g.bodyY,g.bodyR)*0.028;
  let core=chargeSpread(y,g.coreY,g.coreR)*0.065;
  let near=chargeSpread(y,g.nearY,g.nearR)*g.nearWeight*0.02;
  let a=(body+core+near)*g.envelope*power;
  let rgb=(vec3f(0.08,0.65,1.4)*body+vec3f(1.5,1.15,0.7)*core+vec3f(0.07,0.6,0.9)*near)*g.envelope*power;
  return vec4f(rgb,a);
 }
 return chargeRadiance(y,g)*power;
}
`;
