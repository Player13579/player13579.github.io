import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import * as draft from './effect.mjs';import * as prior from '../finish-cannon-r15-creative-sol61-r1/effect.mjs';
import {section,opticalSample,sampleTransportMaterial} from './material.mjs';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
let samplerChecks=0;
for(const type of ['alchemy-particle-beam','alchemy-particle-cannon'])for(const reducedMotion of [false,true])for(const observation of [false,true])for(const age of [-1,0,28,100,150,210,220,280,330,390,419.999,420,900]){
 const event={id:'test-cause',playerId:'test-player',startedAt:0,type,variant:'continuous',x:160,y:270,targetX:760,targetY:270,handWorld:{x:160,y:270,eventId:'test-cause',playerId:'test-player',frameId:'test-frame'}};
 assert.deepEqual(draft.sampleEvent(event,age,'test-frame',{observation,reducedMotion}),prior.sampleEvent(event,age,'test-frame',{observation,reducedMotion}));samplerChecks++;
}
assert.equal(hash(fs.readFileSync(new URL('./audio.mjs',import.meta.url))),'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
let boundChecks=0;
for(const age of [0,28,100,150,210,220,280,330,390,420])for(const u of [.001,.02,.1,.25,.5,.75,.98,.999]){
 const g=section(u,age);
 for(const [center,radius] of [[g.bodyY,g.bodyR],[g.coreY,g.coreR],[g.nearY,g.nearR]]){
  assert.ok(Math.abs(center)+radius<27);assert.ok(Math.abs(center)+radius+4<31);boundChecks++;
 }
}
const u=1.5*220/420-.25,g=section(u,220),bodyPoint=opticalSample(u,-12,9,220);
assert.ok(bodyPoint.body>.2);assert.equal(bodyPoint.core,0);assert.equal(bodyPoint.near,0);
assert.ok(g.coreY-g.bodyY>10);assert.ok(g.coreR<g.bodyR*.4);
let nearTau=0;for(let i=0;i<24;i++){nearTau+=opticalSample(u,g.coreY,-24+(i+.5)*2,220).near*3.8*.48;}
assert.ok(Math.exp(-nearTau)<.025);
const samples=[];for(const at of [.2,u,.8])for(const y of [-24,-20,-16,-12,-8,-4,0,4,8,12,16,24]){
 const p=sampleTransportMaterial(at,y,220);assert.ok(p.rgb.every(Number.isFinite));assert.ok(p.alpha>=0&&p.alpha<=1);samples.push({u:at,y,...p});
}
assert.equal(sampleTransportMaterial(.99,0,100).alpha,0);
assert.deepEqual(sampleTransportMaterial(.5,-4,28,{reducedMotion:true}),sampleTransportMaterial(.5,-4,390,{reducedMotion:true}));
assert.ok(draft.SHADER.includes('path=opacity/p.a'));
const pins={effect:hash(fs.readFileSync(new URL('./effect.mjs',import.meta.url))),material:hash(fs.readFileSync(new URL('./material.mjs',import.meta.url))),shader:hash(draft.SHADER),audio:hash(fs.readFileSync(new URL('./audio.mjs',import.meta.url)))};
fs.writeFileSync(new URL('./CHECKS.json',import.meta.url),JSON.stringify({status:'CPU/source only; UNSEALED, no perceived-width assertion',samplerChecks,boundChecks,pins,witnesses:{section:g,bodyPoint,nearTau,nearTransmission:Math.exp(-nearTau)},samples,shaderCompile:'not_run',nativeMaterial:'not_run',fullLifetime:'not_run',normalSfx:'not_run'},null,2));
console.log(JSON.stringify({samplerChecks,boundChecks,pins,nearTau,nativeMaterial:'not_run'}));
