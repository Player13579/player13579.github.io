// GPT-6.1-Sol R14: new open swept charge medium. CPU diagnostic, not rendered proof.
export const smooth = x => {x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function section(u,age,{reducedMotion=false}={}) {
  const t=reducedMotion?210:Math.max(0,age),front=.08+.92*smooth(t/210);
  const movingCenter=1.5*t/420-.25;
  const compression=Math.exp(-(((u-movingCenter)/.15)**2));
  const source=smooth(u/.035),tip=smooth((front-u)/.024);
  return {front,center:-3+5*compression,radius:(21-4*compression)*source*tip,compression};
}
export function opticalSample(u,y,z,age,options={}) {
  const g=section(u,age,options);
  if(u<=0||u>=g.front||g.radius<.01)return {density:0,emission:[0,0,0],shell:0,core:0};
  const yn=(y-g.center)/g.radius,zn=z/15;
  const radial=Math.hypot(yn,zn);
  const shell=smooth(1-Math.abs(radial-.84)/.18);
  // A broad opening on the near upper cross-section exposes the rear material.
  const near=z<0;
  const open=near?(1-smooth((yn-.18)/.30)):0;
  const body=shell*(1-open);
  const core=smooth(1-Math.abs((y-g.center+3)/6.5))*smooth(1-Math.abs(z/5));
  const density=body*(near?1.1:.52)+core*.32;
  const turn=Math.max(0,Math.min(1,(yn+1)/2));
  const rear=[.08+.14*turn,.68-.28*turn,1.65-.5*turn];
  const returnFace=[.018,.12+.08*turn,.35+.16*turn];
  const color=near?returnFace:rear;
  const emission=color.map((v,i)=>v*body+(i===0?35.308:i===1?21.372:6.656)*core);
  return {density,emission,shell:body,core};
}
export function sampleTransportMaterial(u,y,age,{reducedMotion=false,power=1,steps=24}={}) {
  let trans=1,rgb=[0,0,0];
  for(let i=0;i<steps;i++) {
    const p=opticalSample(u,y,-24+(i+.5)*48/steps,age,{reducedMotion});
    const opacity=1-Math.exp(-p.density*48/steps*.24);
    rgb=rgb.map((v,j)=>v+trans*opacity*p.emission[j]);
    trans*=1-opacity;
  }
  return {rgb:rgb.map(v=>v*power),alpha:(1-trans)*power};
}
export const MATERIAL_WGSL = /*wgsl*/`
fn smooth01(v:f32)->f32 {let q=clamp(v,0.0,1.0);return q*q*(3.0-2.0*q);}
fn chargeSection(u:f32,t:f32,front:f32)->vec3f {
 let q=(u-(1.5*t/420.0-0.25))/0.15;
 let compression=exp(-q*q);
 let radius=(21.0-4.0*compression)*smooth01(u/0.035)*smooth01((front-u)/0.024);
 return vec3f(-3.0+5.0*compression,radius,compression);
}
fn chargeSample(y:f32,z:f32,g:vec3f)->vec4f {
 if(g.y<0.01){return vec4f(0.0);}
 let yn=(y-g.x)/g.y;let zn=z/15.0;
 let radial=length(vec2f(yn,zn));
 let shell=smooth01(1.0-abs(radial-0.84)/0.18);
 let near=z<0.0;
 let opening=select(0.0,1.0-smooth01((yn-0.18)/0.30),near);
 let body=shell*(1.0-opening);
 let core=smooth01(1.0-abs((y-g.x+3.0)/6.5))*smooth01(1.0-abs(z/5.0));
 let density=body*select(0.52,1.1,near)+core*0.32;
 let turn=clamp((yn+1.0)/2.0,0.0,1.0);
 let rear=vec3f(0.08+0.14*turn,0.68-0.28*turn,1.65-0.5*turn);
 let returnFace=vec3f(0.018,0.12+0.08*turn,0.35+0.16*turn);
 let emission=select(rear,returnFace,near)*body+vec3f(35.308,21.372,6.656)*core;
 return vec4f(emission,density);
}
fn chargeRadiance(y:f32,g:vec3f)->vec4f {
 var trans=1.0;var rgb=vec3f(0.0);
 for(var i=0u;i<24u;i=i+1u){
  let z=-24.0+(f32(i)+0.5)*2.0;
  let p=chargeSample(y,z,g);
  let opacity=1.0-exp(-p.a*0.48);
  rgb=rgb+trans*opacity*p.rgb;trans=trans*(1.0-opacity);
 }
 return vec4f(rgb,1.0-trans);
}
@fragment fn fs(o:Output)->@location(0) vec4f {
 if(o.emission>=0.0){return vec4f(o.color.rgb*(1.0+o.emission)*o.color.a,o.color.a);}
 let u=o.color.x;let y=o.color.y;
 let age=select(o.color.z,-1.0-o.color.z,o.color.z<0.0);
 let t=select(max(0.0,age),210.0,o.color.z<0.0);
 let front=0.08+0.92*smooth01(t/210.0);let power=o.color.w;
 if(u<=0.0||u>=front||power<=0.0){return vec4f(0.0);}
 let g=chargeSection(u,t,front);
 if(g.y<0.01){return vec4f(0.0);}
 if(o.emission > -1.5){
  // Finite source-shaped display spread; no filled allocation envelope.
  let outside=max(0.0,abs(y-g.x)-g.y);
  let edge=smooth01(1.0-outside/5.0);
  let bodyQ=(y-g.x)/(g.y+2.0);let coreQ=(y-g.x+3.0)/10.0;
  let bodyGlow=exp(-bodyQ*bodyQ*1.7);
  let coreGlow=exp(-coreQ*coreQ);
  let a=(0.035*bodyGlow+0.055*coreGlow)*edge*power;
  return vec4f(vec3f(0.14,0.75,1.0)*a*2.2,a);
 }
 return chargeRadiance(y,g)*power;
}
`;
