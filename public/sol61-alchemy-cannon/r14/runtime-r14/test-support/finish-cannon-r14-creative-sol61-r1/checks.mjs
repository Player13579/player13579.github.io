import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import * as r14 from './effect.mjs';import * as r13 from '../finish-cannon-r13-creative-sol61-r1/effect.mjs';
import {section,opticalSample,sampleTransportMaterial} from './material.mjs';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const ageSet=[-1,0,28,100,150,210,220,280,330,390,419.999,420,900];
let samplerChecks=0;
for(const type of ['alchemy-particle-beam','alchemy-particle-cannon'])for(const reducedMotion of [false,true])for(const observation of [false,true])for(const age of ageSet){
 const event={id:'test-cause',playerId:'test-player',startedAt:0,type,variant:'continuous',x:160,y:270,targetX:760,targetY:270,handWorld:{x:160,y:270,eventId:'test-cause',playerId:'test-player',frameId:'test-frame'}};
 const a=r14.sampleEvent(event,age,'test-frame',{observation,reducedMotion});
 const b=r13.sampleEvent(event,age,'test-frame',{observation,reducedMotion});
 assert.deepEqual(a,b);samplerChecks++;
}
assert.equal(hash(fs.readFileSync(new URL('./audio.mjs',import.meta.url))),'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
const g=section(.5,220);let samples=[];
for(const y of [-20,-14,-6,0,8,14,22,27]){const p=sampleTransportMaterial(.5,y,220);assert.ok(p.rgb.every(Number.isFinite));assert.ok(p.alpha>=0&&p.alpha<=1);samples.push({y,...p});}
// Optical near opening exposes a real far/rear sample and a lower near return.
const rear=opticalSample(.5,g.center-g.radius*.6,12,220);
const opening=opticalSample(.5,g.center-g.radius*.6,-12,220);
assert.ok(rear.density>0);assert.equal(opening.density,0);
const nearReturn=opticalSample(.5,g.center+g.radius*.65,-9,220);assert.ok(nearReturn.density>0);
const beyond=sampleTransportMaterial(.9999,0,100);assert.equal(beyond.alpha,0);
for(const t of [0,28,100,150,210,220,280,330,390,420])for(const u of [.01,.1,.25,.5,.75,.99]){const s=section(u,t);assert.ok(Math.abs(s.center)+s.radius<27);assert.ok(Math.abs(s.center)+s.radius+5<31);}
const reducedA=sampleTransportMaterial(.5,-6,20,{reducedMotion:true}),reducedB=sampleTransportMaterial(.5,-6,390,{reducedMotion:true});assert.deepEqual(reducedA,reducedB);
assert.ok(!r14.SHADER.includes('fn quad(')&&!r14.SHADER.includes('fn pent('));
const pins={effect:hash(fs.readFileSync(new URL('./effect.mjs',import.meta.url))),material:hash(fs.readFileSync(new URL('./material.mjs',import.meta.url))),shader:hash(r14.SHADER),audio:hash(fs.readFileSync(new URL('./audio.mjs',import.meta.url)))};
fs.writeFileSync(new URL('./CHECKS.json',import.meta.url),JSON.stringify({status:'CPU/source only; native UNSEALED',samplerChecks,pins,materialSlices:samples,witnesses:{rear,opening,nearReturn},shaderCompile:'not_run',nativeAppearance:'not_run',normalSfx:'not_run'},null,2));
console.log(JSON.stringify({samplerChecks,pins,materialWitnesses:'pass',native:'not_run'}));
