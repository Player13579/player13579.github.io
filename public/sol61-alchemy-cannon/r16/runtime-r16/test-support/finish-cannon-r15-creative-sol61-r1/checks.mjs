import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import * as draft from './effect.mjs';import * as prior from '../finish-cannon-r14-creative-sol61-r1/effect.mjs';
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
 for(const [center,radius] of [[g.rearY,g.rearR],[g.coreY,g.coreR],[g.nearY,g.nearR]]){
  assert.ok(Math.abs(center)+radius<27);assert.ok(Math.abs(center)+radius+4<31);boundChecks++;
 }
}
const witnesses={};const u=1.5*220/420-.25,g=section(u,220);
witnesses.rear=opticalSample(u,g.rearY-g.rearR*.55,7,220);
witnesses.openNearUpper=opticalSample(u,g.rearY-g.rearR*.55,-8,220);
witnesses.frontAcrossCore=opticalSample(u,g.coreY,-8,220);
assert.ok(witnesses.rear.rear>0);assert.equal(witnesses.openNearUpper.near,0);assert.ok(witnesses.frontAcrossCore.near>0);
assert.ok(section(.08,220).nearWeight<section(u,220).nearWeight*.25);
const samples=[-26,-18,-10,-2,6,14,26].map(y=>({y,...sampleTransportMaterial(u,y,220)}));
for(const p of samples){assert.ok(p.rgb.every(Number.isFinite));assert.ok(p.alpha>=0&&p.alpha<=1);}
assert.equal(sampleTransportMaterial(.99,0,100).alpha,0);
assert.deepEqual(sampleTransportMaterial(.5,-4,28,{reducedMotion:true}),sampleTransportMaterial(.5,-4,390,{reducedMotion:true}));
assert.ok(!draft.SHADER.includes('radial-0.84')&&!draft.SHADER.includes('shell'));
const pins={effect:hash(fs.readFileSync(new URL('./effect.mjs',import.meta.url))),material:hash(fs.readFileSync(new URL('./material.mjs',import.meta.url))),shader:hash(draft.SHADER),audio:hash(fs.readFileSync(new URL('./audio.mjs',import.meta.url)))};
fs.writeFileSync(new URL('./CHECKS.json',import.meta.url),JSON.stringify({status:'CPU/source only; UNSEALED',samplerChecks,boundChecks,pins,witnesses,samples,shaderCompile:'not_run',nativeMaterial:'not_run',fullLifetime:'not_run',normalSfx:'not_run'},null,2));
console.log(JSON.stringify({samplerChecks,boundChecks,pins,nativeMaterial:'not_run'}));
