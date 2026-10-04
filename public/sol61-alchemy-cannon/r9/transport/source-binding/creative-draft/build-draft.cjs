const fs=require('node:fs'),path=require('node:path');
const root=__dirname,prior=path.join(root,'../finish-cannon-r8-creative-sol61-root-r1');
let source=fs.readFileSync(path.join(prior,'effect.mjs'),'utf8');
source=source.replace('// GPT-6.1-Sol R8: a rotating two-state charged transport cross-section; R7 preserved.','// GPT-6.1-Sol R9 draft: connected transported charge rolls; exact R8 event/sampler contract.')
 .replace("'alchemy-cannon-new-e-sol61-r8'","'alchemy-cannon-new-e-sol61-r9'");
const begin=source.indexOf('// Projected optical model'),end=source.indexOf('export function sampleEvent');
if(begin<0||end<=begin)throw Error('cpu-replacement-boundary');
const cpu=`// Authored charge-roll representation, not a calibrated physical fluid solver.
// One parcel coordinate q advances monotonically from source to endpoint.
export function sampleTransportGeometry(u,ageMs,{reducedMotion=false}={}) {
  if(!finite(u)||u<0||u>1||!finite(ageMs))throw Error('invalid-material-geometry');
  const axial=smooth(u/.06)*(1-smooth((u-.86)/.14));
  const phaseTime=reducedMotion?0:ageMs/420;
  const q=u-1.22*phaseTime;
  const radius=(18+3*Math.cos(15*q))*axial;
  const center=2*axial*Math.sin(8*q);
  return {radius,center,q,axial,phaseTime};
}
export function sampleTransportMaterial(u,r,ageMs,{reducedMotion=false,power=1,integrate=true,steps=16}={}) {
  if(!finite(u)||!finite(r)||!finite(ageMs)||!finite(power)||u<0||u>1||Math.abs(r)>1||power<0||power>1||!Number.isInteger(steps)||steps<1||steps>512)throw Error('invalid-material-sample');
  const g=sampleTransportGeometry(u,ageMs,{reducedMotion}),{radius,center,q}=g;
  const compressed=.5+.5*Math.cos(15*q),wake=0;
  if(!integrate||radius<1e-7||Math.abs(r)>=1||power===0)return {radius,center,color:[0,0,0],alpha:0,emission:0,compressed,wake};
  const step=2*radius/steps;
  let transmission=1,red=0,green=0,blue=0;
  for(let i=0;i<steps;i++){
    const z=-1+2*(i+.5)/steps;
    const edge=Math.max(0,1-r*r)*Math.max(0,1-z*z);
    let rho=0,sr=0,sg=0,sb=0;
    // The three rolls overlap; no separate rail meshes or independently fading lobes.
    // Helical placement AND folded excitation share q; neither is a static decoration.
    for(let roll=0;roll<3;roll++){
      const phi=roll*2.0943951023931953;
      const theta=9*q+phi+.30*Math.sin(15*q+phi);
      const cy=.34*Math.cos(theta),cz=.34*Math.sin(theta);
      const rollRadius=.64+.06*Math.cos(15*q+phi);
      const py=(r-cy)/rollRadius,pz=(z-cz)/rollRadius;
      const d=py*py+pz*pz,body=Math.max(0,1-d);
      const mass=body*body;
      const density=.18*mass*edge;
      const interior=Math.max(0,1-d/.62);
      const crest=.5+.5*Math.cos(15*q+phi+.75*py);
      // White charge occupies a moving folded interior within the shared body;
      // the outward-facing return material retains a resolved colored shoulder.
      const charge=interior*interior*(.30+.70*crest*crest);
      const facing=smooth((pz+.85)/1.7);
      const hot=[.08+13.5*charge,.72+7.5*charge,.46+2.1*charge];
      const cool=[.03,.22,.88];
      rho+=density;
      sr+=density*mix(cool[0],hot[0],facing);
      sg+=density*mix(cool[1],hot[1],facing);
      sb+=density*mix(cool[2],hot[2],facing);
    }
    const loss=Math.exp(-rho*step),absorbed=transmission*(1-loss);
    if(rho>1e-10){red+=absorbed*sr/rho*2.6;green+=absorbed*sg/rho*2.6;blue+=absorbed*sb/rho*2.6;}
    transmission*=loss;
  }
  const opacity=1-transmission,color=opacity>1e-7?[red/opacity,green/opacity,blue/opacity]:[0,0,0];
  return {radius,center,color,alpha:opacity*power,emission:0,compressed,wake};
}
`;
source=source.slice(0,begin)+cpu+source.slice(end);
const shaderStart=source.indexOf(' // GPU projected optical profile'),shaderEnd=source.indexOf('\n}`;',shaderStart);
if(shaderStart<0||shaderEnd<=shaderStart)throw Error('shader-replacement-boundary');
const shader=` // One source-advected bundle of overlapping charge rolls; artistic material model.
 let u=clamp(o.color.x,0.0,1.0);let localY=o.color.y;
 if(u<=0.0||u>=1.0){return vec4f(0.0);}
 let reduced=o.color.z<0.0;let age=select(o.color.z,-1.0-o.color.z,reduced);let power=o.color.w;
 let axial=smooth01(u/0.06)*(1.0-smooth01((u-0.86)/0.14));
 let phaseTime=select(age/420.0,0.0,reduced);let q=u-1.22*phaseTime;
 let radius=(18.0+3.0*cos(15.0*q))*axial;
 let center=2.0*axial*sin(8.0*q);
 if(radius<0.0000001||power<=0.0){return vec4f(0.0);}
 if(o.emission> -1.5){
   let r=(localY-center)/(radius+4.0*axial);
   let alpha=pow(max(0.0,1.0-r*r),0.65)*power*0.075;
   return vec4f(vec3f(0.08,0.86,0.75)*2.2*alpha,alpha);
 }
 let r=(localY-center)/radius;if(abs(r)>=1.0){return vec4f(0.0);}
 let step=2.0*radius/16.0;
 var transmission=1.0;var radiance=vec3f(0.0);
 for(var i:u32=0u;i<16u;i++){
   let z= -1.0+(f32(i)+0.5)/8.0;
   let edge=max(0.0,1.0-r*r)*max(0.0,1.0-z*z);
   var rho=0.0;var weightedMaterial=vec3f(0.0);
   for(var roll:u32=0u;roll<3u;roll++){
     let phi=f32(roll)*2.0943951023931953;
     let theta=9.0*q+phi+0.30*sin(15.0*q+phi);
     let cy=0.34*cos(theta);let cz=0.34*sin(theta);
     let rollRadius=0.64+0.06*cos(15.0*q+phi);
     let py=(r-cy)/rollRadius;let pz=(z-cz)/rollRadius;
     let d=py*py+pz*pz;let body=max(0.0,1.0-d);let mass=body*body;
     let density=0.18*mass*edge;
     let interior=max(0.0,1.0-d/0.62);
     let crest=0.5+0.5*cos(15.0*q+phi+0.75*py);
     let charge=interior*interior*(0.30+0.70*crest*crest);
     let facing=smooth01((pz+0.85)/1.7);
     let hot=vec3f(0.08+13.5*charge,0.72+7.5*charge,0.46+2.1*charge);
     let cool=vec3f(0.03,0.22,0.88);
     rho+=density;weightedMaterial+=density*mix(cool,hot,facing);
   }
   let loss=exp(-rho*step);let absorbed=transmission*(1.0-loss);
   if(rho>0.0000000001){radiance+=absorbed*weightedMaterial/rho*2.6;}
   transmission*=loss;
 }
 return vec4f(radiance*power,(1.0-transmission)*power);`;
source=source.slice(0,shaderStart)+shader+source.slice(shaderEnd);
fs.writeFileSync(path.join(root,'effect.mjs'),source);
fs.copyFileSync(path.join(prior,'audio.mjs'),path.join(root,'audio.mjs'));
console.log('R9 unsealed source written; sampler unchanged');
