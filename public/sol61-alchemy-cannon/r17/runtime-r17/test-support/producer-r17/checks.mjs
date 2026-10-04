import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import * as draft from './effect.mjs';import * as prior from '../finish-cannon-r16-creative-sol61-r1/effect.mjs';
import {section,packet,opticalSample,sampleTransportMaterial} from './material.mjs';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
let samplerChecks=0;
for(const type of ['alchemy-particle-beam','alchemy-particle-cannon'])for(const reducedMotion of [false,true])for(const observation of [false,true])for(const age of [-1,0,28,100,150,210,220,280,330,390,419.999,420,900]){
 const event={id:'test-cause',playerId:'test-player',startedAt:0,type,variant:'continuous',x:160,y:270,targetX:760,targetY:270,handWorld:{x:160,y:270,eventId:'test-cause',playerId:'test-player',frameId:'test-frame'}};
 assert.deepEqual(draft.sampleEvent(event,age,'test-frame',{observation,reducedMotion}),prior.sampleEvent(event,age,'test-frame',{observation,reducedMotion}));samplerChecks++;
}
assert.equal(hash(fs.readFileSync(new URL('./audio.mjs',import.meta.url))),'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
let boundChecks=0;
for(const age of [0,28,100,150,210,220,280,330,390,420])for(let index=0;index<7;index++){
 const p=packet(index,age);
 for(const [cy,r] of [[p.cy+2*p.gain,p.ry],[p.cy-3*p.gain,4+1.5*p.gain]]){
  assert.ok(Math.abs(cy)+r<27);assert.ok(Math.abs(cy)+r+4<31);boundChecks++;
 }
 assert.equal(p.birthMs,50*index);if(p.elapsed<=0)assert.equal(p.gate,0);
 assert.ok(packet(index,age+10).nose>p.nose);
}
const p=packet(2,220),head=opticalSample(p.nose-.025,p.cy-3*p.gain,-3,220),body=opticalSample(p.nose-.12,p.cy+2*p.gain,4,220);
assert.ok(head.head>.7);assert.ok(body.body>.7);assert.equal(body.head,0);
assert.equal(opticalSample(.1,0,0,0).extinction,0);assert.equal(opticalSample(1.01,0,0,220).extinction,0);
assert.deepEqual(sampleTransportMaterial(.4,-4,28,{reducedMotion:true}),sampleTransportMaterial(.4,-4,390,{reducedMotion:true}));
const samples=[];for(const [u,y,age] of [[.05,0,28],[.2,0,100],[p.nose-.12,8,220],[p.nose-.025,-4,220],[.99,0,280],[.5,0,390]]){
 const out=sampleTransportMaterial(u,y,age);assert.ok(out.rgb.every(Number.isFinite));assert.ok(out.alpha>=0&&out.alpha<=1);samples.push({u,y,age,...out});
}
assert.ok(!draft.SHADER.includes('chargeSection')&&!draft.SHADER.includes('nearWeight'));
const pins={effect:hash(fs.readFileSync(new URL('./effect.mjs',import.meta.url))),material:hash(fs.readFileSync(new URL('./material.mjs',import.meta.url))),shader:hash(draft.SHADER),audio:hash(fs.readFileSync(new URL('./audio.mjs',import.meta.url)))};
fs.writeFileSync(new URL('./CHECKS.json',import.meta.url),JSON.stringify({status:'CPU/source only; UNSEALED, particle readability unproven',samplerChecks,boundChecks,pins,witnesses:{packet:p,head,body},samples,shapeAt220:section(.5,220),shaderCompile:'not_run',nativeMaterial:'not_run',ordinaryTransport:'not_run',normalSfx:'not_run'},null,2));
console.log(JSON.stringify({samplerChecks,boundChecks,pins,nativeMaterial:'not_run'}));
