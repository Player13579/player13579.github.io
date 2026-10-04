import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import * as current from './effect.mjs';import * as prior from '../finish-cannon-r7-creative-sol61-r1/effect.mjs';
let sampler=0,support=0,integrals=0,maxRadius=0,maxError=0,peak=0;
for(const type of ['alchemy-particle-cannon','alchemy-particle-beam'])for(const variant of ['continuous','gbo-tenfold'])for(const observation of [true,false])for(const reducedMotion of [true,false])for(const age of [-1,0,28,100,150,220,280,330,419,420,520,899,900]){
 const event={id:'r8-test',type,playerId:'p',startedAt:0,variant,x:180,y:270,targetX:760,targetY:270,handWorld:{x:180,y:270,eventId:'r8-test',playerId:'p',frameId:7}};
 assert.deepEqual(current.sampleEvent(event,age,7,{observation,reducedMotion}),prior.sampleEvent(event,age,7,{observation,reducedMotion}));sampler++;
}
for(const reducedMotion of [true,false])for(const age of [0,28,100,150,220,280,330,419])for(let uIndex=0;uIndex<=60;uIndex++){
 const u=uIndex/60,g=current.sampleTransportMaterial(u,0,age,{reducedMotion,integrate:false});
 maxRadius=Math.max(maxRadius,g.radius+Math.abs(g.center));assert(g.radius>=0&&g.radius+Math.abs(g.center)<27);assert(g.radius+Math.abs(g.center)+4<31);support++;
 for(const r of [-1,-.8,-.4,0,.4,.8,1]){
  const s=current.sampleTransportMaterial(u,r,age,{reducedMotion});assert(s.color.every(Number.isFinite)&&Number.isFinite(s.alpha));assert(s.alpha>=0&&s.alpha<=1);if(Math.abs(r)===1||u===0||u===1)assert.equal(s.alpha,0);
  const hi=current.sampleTransportMaterial(u,r,age,{reducedMotion,steps:128});
  for(let i=0;i<3;i++){const error=Math.abs(s.color[i]*s.alpha-hi.color[i]*hi.alpha);maxError=Math.max(maxError,error);peak=Math.max(peak,s.color[i]*s.alpha,hi.color[i]*hi.alpha);}integrals++;
 }
}
assert.equal(current.DURATIONS['alchemy-particle-beam'],420);assert.equal(current.DURATIONS['alchemy-particle-cannon'],900);
const bytes=fs.readFileSync(new URL('./effect.mjs',import.meta.url)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={status:'pass',samplerByteAndSemanticParity:sampler,supportSamples:support,integralSamples:integrals,maxMainSupportWorld:maxRadius,depthSteps:16,referenceDepthSteps:128,maxAbsolutePremultipliedError:maxError,peakReferenceRadiance:peak,relativePeakError:maxError/peak,effectSha256:sha(bytes),shaderSha256:sha(Buffer.from(current.SHADER)),audioSha256:sha(fs.readFileSync(new URL('./audio.mjs',import.meta.url))),limitations:'CPU double reference and API parity only; not GPU float32/display, native material, motion, audio listening or performance acceptance.'};
fs.writeFileSync(new URL('./CPU-CHECKS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
