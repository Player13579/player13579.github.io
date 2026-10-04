// Root-owned creative derivative; sealed R7 inputs are read-only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const out=__dirname,input=path.resolve(out,'../finish-cannon-r7-creative-sol61-r1');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const original=fs.readFileSync(path.join(input,'effect.mjs'));
assert.equal(sha(original),'8c20b6c16e89318f9c415871dfb3fc0d62de2079508cd0a655fb65fc15aee130');
let effect=original.toString().replace('alchemy-cannon-new-e-sol61-r7','alchemy-cannon-new-e-sol61-r8');
const cpu=`export function sampleTransportMaterial(u,r,ageMs,{reducedMotion=false,power=1,integrate=true,steps=16}={}) {
  if(!Number.isFinite(u)||!Number.isFinite(r)||!Number.isFinite(ageMs)||!Number.isFinite(power)||u<0||u>1||Math.abs(r)>1||power<0||power>1||!Number.isInteger(steps)||steps<1||steps>512)throw Error('invalid-material-sample');
  const axial=smooth(u/.06)*(1-smooth((u-.86)/.14));
  const travel=reducedMotion?.48:smooth((ageMs-28)/302),phaseTime=reducedMotion?0:ageMs/420;
  const compression=Math.exp(-(((u-travel)/.15)**2)),wake=1-smooth((u-travel+.20)/.20);
  const radius=(8+12*compression+.9*wake)*axial,center=3*axial*Math.sin(6*u-2*phaseTime);
  if(!integrate||radius<1e-7||Math.abs(r)>=1||power===0)return {radius,center,color:[0,0,0],alpha:0,emission:0,compressed:compression,wake};
  const twist=5*u-2*phaseTime,cs=Math.cos(twist),sn=Math.sin(twist),step=2*radius/steps;
  let transmission=1,red=0,green=0,blue=0;
  for(let i=0;i<steps;i++){
    const z=-1+2*(i+.5)/steps,p=cs*r-sn*z,q=sn*r+cs*z;
    const first=Math.max(0,1-((p-.31)/.63)**2-((q-.23)/.56)**2);
    const returning=Math.max(0,1-((p+.30)/.70)**2-((q+.20)/.57)**2);
    const edge=Math.max(0,1-r*r)*Math.max(0,1-z*z);
    const active=first*first,quiet=returning*returning;
    const rho=edge*(.22*active+.17*quiet+.024*edge)*(1+.7*compression);
    const loss=Math.exp(-rho*step),absorbed=transmission*(1-loss);
    const front=Math.max(0,1-((u-travel+.06*p-.04*q)/.12)**2);
    const pressure=front*front*compression;
    const core=active/(active+quiet+.00001),curl=quiet/(active+quiet+.00001);
    const excitation=(.45+.55*(1-wake))*(.70+.30*core);
    const sr=.028*curl+.05*core*excitation+13.5*pressure*core;
    const sg=.14*curl+1.22*core*excitation+7.5*pressure*core;
    const sb=.72*curl+.55*core*excitation+2.1*pressure*core;
    red+=absorbed*sr*2.6;green+=absorbed*sg*2.6;blue+=absorbed*sb*2.6;transmission*=loss;
  }
  const opacity=1-transmission,color=opacity>1e-7?[red/opacity,green/opacity,blue/opacity]:[0,0,0];
  return {radius,center,color,alpha:opacity*power,emission:0,compressed:compression,wake};
}
`;
const start=effect.indexOf('export function sampleTransportMaterial('),end=effect.indexOf('export function sampleEvent(',start);assert(start>=0&&end>start);effect=effect.slice(0,start)+cpu+effect.slice(end);
const shaderStart=effect.indexOf(' let axial=pow('),shaderEnd=effect.indexOf(' // Integrated radiance',shaderStart);assert(shaderStart>=0&&shaderEnd>shaderStart);
const wgsl=` let axial=smooth01(u/0.06)*(1.0-smooth01((u-0.86)/0.14));
 let travel=select(smooth01((age-28.0)/302.0),0.48,reduced);
 let phaseTime=select(age/420.0,0.0,reduced);
 let axialDistance=(u-travel)/0.15;let compression=exp(-axialDistance*axialDistance);
 let wake=1.0-smooth01((u-travel+0.20)/0.20);
 let radius=(8.0+12.0*compression+0.9*wake)*axial;
 let center=3.0*axial*sin(6.0*u-2.0*phaseTime);
 if(radius<0.0000001||power<=0.0){return vec4f(0.0);}
 if(o.emission> -1.5){
   let r=(localY-center)/(radius+4.0*axial);
   let alpha=pow(max(0.0,1.0-r*r),0.65)*power*0.075;
   return vec4f(vec3f(0.08,0.86,0.75)*2.2*alpha,alpha);
 }
 let r=(localY-center)/radius;if(abs(r)>=1.0){return vec4f(0.0);}
 let twist=5.0*u-2.0*phaseTime;let cs=cos(twist);let sn=sin(twist);let step=2.0*radius/16.0;
 var transmission=1.0;var radiance=vec3f(0.0);
 for(var i:u32=0u;i<16u;i++){
   let z= -1.0+(f32(i)+0.5)/8.0;let p=cs*r-sn*z;let q=sn*r+cs*z;
   let a=(p-0.31)/0.63;let b=(q-0.23)/0.56;
   let c=(p+0.30)/0.70;let d=(q+0.20)/0.57;
   let first=max(0.0,1.0-a*a-b*b);let returning=max(0.0,1.0-c*c-d*d);
   let edge=max(0.0,1.0-r*r)*max(0.0,1.0-z*z);
   let excitedLobe=first*first;let quiet=returning*returning;
   let rho=edge*(0.22*excitedLobe+0.17*quiet+0.024*edge)*(1.0+0.7*compression);
   let loss=exp(-rho*step);let absorbed=transmission*(1.0-loss);
   let frontDistance=(u-travel+0.06*p-0.04*q)/0.12;
   let front=max(0.0,1.0-frontDistance*frontDistance);let pressure=front*front*compression;
   let core=excitedLobe/(excitedLobe+quiet+0.00001);let curl=quiet/(excitedLobe+quiet+0.00001);
   let excitation=(0.45+0.55*(1.0-wake))*(0.70+0.30*core);
   let material=vec3f(0.028*curl+0.05*core*excitation+13.5*pressure*core,
      0.14*curl+1.22*core*excitation+7.5*pressure*core,
      0.72*curl+0.55*core*excitation+2.1*pressure*core);
   radiance+=absorbed*material*2.6;transmission*=loss;
 }
`;
effect=effect.slice(0,shaderStart)+wgsl+effect.slice(shaderEnd);
effect=effect.replace('// GPT-6.1-Sol R7: compact folded mass, distinct calm/active emissivity and one transported pressure face; R6 preserved.','// GPT-6.1-Sol R8: a rotating two-state charged transport cross-section; R7 preserved.');
fs.writeFileSync(path.join(out,'effect.mjs'),effect);
const audio=fs.readFileSync(path.join(input,'audio.mjs'));fs.writeFileSync(path.join(out,'audio.mjs'),audio);
fs.writeFileSync(path.join(out,'INPUT-PINS.json'),JSON.stringify({derivativeOf:'finish-cannon-r7-creative-sol61-r1',effect:sha(original),audio:sha(audio),instruction:'Creative composition revision; no old quality or native acceptance transferred.'},null,2)+'\n');
console.log(JSON.stringify({effect:sha(Buffer.from(effect)),audio:sha(audio)}));
