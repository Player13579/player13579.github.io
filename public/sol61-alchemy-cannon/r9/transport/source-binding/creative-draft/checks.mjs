import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import * as current from './effect.mjs';import * as prior from '../finish-cannon-r8-creative-sol61-root-r1/effect.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(new URL(p,import.meta.url));
assert.equal(sha(read('../finish-cannon-r8-creative-sol61-root-r1/effect.mjs')),'6e6e74680426c7ddeb047afc3d42e79a8694770e53237a345b064b7db21b4839');
assert.equal(sha(Buffer.from(prior.SHADER)),'cb2178b95f9e06e38e5f45bf2f952875723d7b96ee7191a3c8286813aa20f5d1');
assert.equal(sha(read('./audio.mjs')),'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
const currentText=read('./effect.mjs').toString(),priorText=read('../finish-cannon-r8-creative-sol61-root-r1/effect.mjs').toString();
const block=(s,start,end)=>{const a=s.indexOf(start),b=s.indexOf(end,a);assert(a>=0&&b>a);return s.slice(a,b);};
assert.equal(block(currentText,'export function validateEvent','const smooth'),block(priorText,'export function validateEvent','const smooth'));
assert.equal(block(currentText,'export function sampleEvent','export const SHADER'),block(priorText,'export function sampleEvent','export const SHADER'));
assert.equal(block(currentText,'struct View',' // One source-advected'),block(priorText,'struct View',' // GPU projected optical'));
let sampler=0,support=0,integrals=0,advection=0,reduced=0,maxRadius=0,maxError=0,peak=0;
const base={id:'r9-test',playerId:'p',startedAt:70,x:180,y:270,targetX:760,targetY:270,handWorld:{x:180,y:270,eventId:'r9-test',playerId:'p',frameId:7}};
for(const type of Object.keys(prior.DURATIONS))for(const variant of ['continuous','gbo-tenfold'])for(const observation of [true,false])for(const reducedMotion of [true,false])for(const age of [-1,0,28,100,150,220,280,330,419,420,520,899,900])for(const end of [[760,270],[181,270],[180,800],[50,90]]){
 const event={...base,type,variant,targetX:end[0],targetY:end[1]};
 assert.deepEqual(current.sampleEvent(event,base.startedAt+age,7,{observation,reducedMotion}),prior.sampleEvent(event,base.startedAt+age,7,{observation,reducedMotion}));sampler++;
}
for(const bad of [{id:''},{startedAt:NaN},{variant:'wrong'},{handWorld:{...base.handWorld,frameId:8}},{targetX:180,targetY:270}]){
 const e={...base,type:'alchemy-particle-beam',variant:'continuous',...bad};
 assert.throws(()=>current.sampleEvent(e,100,7));assert.throws(()=>prior.sampleEvent(e,100,7));
}
for(const reducedMotion of [true,false])for(const age of [0,28,100,150,220,280,330,419])for(let uIndex=0;uIndex<=80;uIndex++){
 const u=uIndex/80,g=current.sampleTransportGeometry(u,age,{reducedMotion});
 maxRadius=Math.max(maxRadius,g.radius+Math.abs(g.center));assert(g.radius>=0&&g.radius+Math.abs(g.center)<=23);assert(g.radius+Math.abs(g.center)+4*g.axial<=27);support++;
 for(const r of [-1,-.85,-.65,-.4,-.2,0,.2,.4,.65,.85,1]){
  const s=current.sampleTransportMaterial(u,r,age,{reducedMotion});assert(s.color.every(Number.isFinite)&&Number.isFinite(s.alpha));assert(s.alpha>=0&&s.alpha<=1);
  if(Math.abs(r)===1||u===0||u===1)assert.equal(s.alpha,0);
  const hi=current.sampleTransportMaterial(u,r,age,{reducedMotion,steps:128});
  for(let i=0;i<3;i++){const error=Math.abs(s.color[i]*s.alpha-hi.color[i]*hi.alpha);maxError=Math.max(maxError,error);peak=Math.max(peak,s.color[i]*s.alpha,hi.color[i]*hi.alpha);}integrals++;
 }
}
for(const u of [.15,.25,.40,.55,.70])for(const age of [28,100,150,220]){
 const laterAge=age+21,laterU=u+1.22*21/420;
 const a=current.sampleTransportGeometry(u,age),b=current.sampleTransportGeometry(laterU,laterAge);
 assert(Math.abs(a.q-b.q)<1e-12);
 assert(Math.abs(a.radius/a.axial-b.radius/b.axial)<1e-10);
 assert(Math.abs(a.center/a.axial-b.center/b.axial)<1e-10);advection++;
 assert(current.sampleTransportGeometry(u,age+1).q<a.q);
}
for(const u of [.10,.30,.50,.70,.90])for(const r of [-.8,-.4,0,.4,.8])for(const age of [0,100,220,419]){
 assert.deepEqual(current.sampleTransportMaterial(u,r,age,{reducedMotion:true}),current.sampleTransportMaterial(u,r,0,{reducedMotion:true}));reduced++;
}
const widthDiagnostics=[];
for(const u of [.12,.25,.40,.55,.70,.84]){
 let lo=Infinity,hi=-Infinity,connected=true,inBody=false,leftBody=false;
 const g=current.sampleTransportGeometry(u,220);
 for(let j=0;j<=160;j++){
  const r=-1+j/80,s=current.sampleTransportMaterial(u,r,220);
  if(s.alpha>.20){if(leftBody)connected=false;inBody=true;lo=Math.min(lo,r);hi=Math.max(hi,r);}else if(inBody)leftBody=true;
 }
 assert(connected);assert(Number.isFinite(lo)&&hi>lo);
 widthDiagnostics.push({u,worldAlpha20Width:(hi-lo)*g.radius,alpha20SupportConnected:connected});
}
assert.deepEqual(current.DURATIONS,prior.DURATIONS);
const report={status:'pass',samplerByteAndSemanticParity:sampler,supportSamples:support,integralSamples:integrals,advectiveShapeInvariants:advection,reducedMotionMaterialFreezeSamples:reduced,maxMainSupportWorld:maxRadius,analyticMainBoundWorld:23,analyticObsBoundWorld:27,drawMainBoundWorld:27,drawObsBoundWorld:31,depthSteps:16,rollsPerDepth:3,referenceDepthSteps:128,maxAbsolutePremultipliedError:maxError,peakReferenceRadiance:peak,relativePeakError:maxError/peak,widthDiagnostics220:widthDiagnostics,effectSha256:sha(read('./effect.mjs')),shaderSha256:sha(Buffer.from(current.SHADER)),audioSha256:sha(read('./audio.mjs')),limitations:'CPU double model/reference, exact sampler parity and analytic support only. Shader formulas are authored in parallel, not executed GPU parity. Numeric width is not perceptual material acceptance. Native compile/display/life/performance/audio/gallery/game not_run.'};
fs.writeFileSync(new URL('./CPU-CHECKS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
