import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {eventAt,THROW_EVENT} from '../runtime.mjs';
import {createThrowSfx} from '../sfx.mjs';

const base={id:'throw:session:17',type:THROW_EVENT,variant:'flight:ordinary-water',playerId:'owner-2',x:10,y:20,targetX:310,targetY:420,startedAt:1000,duration:600};
test('uses exact successful event route, duration, projection and world-to-pixel controls',()=>{
 const p=eventAt(base,1300,{width:1960,height:1240,worldToPixel:2,project:q=>({x:q.x*2,y:q.y*2})});
 assert.equal(p.status,'active');assert.equal(p.durationMs,600);assert.equal(p.ageMs,300);assert.equal(p.eventId,base.id);
 assert.equal(p.speedWorldPerMs,Math.hypot(300,400)/600);
 assert.deepEqual([...p.uniform.slice(0,12)],[1960,1240,2,1,20,40,620,840,300,600,64,2]);
});
test('preserves authoritative non-fixture duration and distinguishes future/expired event windows',()=>{
 const event={...base,duration:275};
 assert.equal(eventAt(event,999,{width:980,height:620}).status,'not-started');
 const active=eventAt(event,1100,{width:980,height:620});assert.equal(active.durationMs,275);assert.equal(active.ageMs,100);
 assert.equal(eventAt(event,1275,{width:980,height:620}).status,'expired');
});
test('requires a successful, owned, stable-cause ordinary flight and finite projected points',()=>{
 assert.throws(()=>eventAt({...base,success:false},1100,{width:980,height:620}),/successful stable-cause/);
 assert.throws(()=>eventAt({...base,id:''},1100,{width:980,height:620}),/successful stable-cause/);
 assert.throws(()=>eventAt({...base,playerId:''},1100,{width:980,height:620}),/successful stable-cause/);
 assert.throws(()=>eventAt({...base,variant:'impact:ordinary-water'},1100,{width:980,height:620}),/ordinary action-item-throw flight/);
 assert.throws(()=>eventAt(base,1100,{width:980,height:620,project:()=>({x:NaN,y:0})}),/Projected throw route/);
});
test('verifier mute is a hard no-node gate; same stable cause starts at most one air cue',async()=>{
 class FakeAudioContext {
   constructor(){this.sampleRate=48000;this.currentTime=1;this.destination={};this.bufferCount=0;this.sources=[];}
   resume(){return Promise.resolve();} close(){return Promise.resolve();}
   createBuffer(_channels,length){this.bufferCount++;return {getChannelData:()=>new Float32Array(length)};}
   createBufferSource(){const s={stops:0,connect(){},disconnect(){},start(){},stop(){this.stops++;},addEventListener(){}};this.sources.push(s);return s;}
   createBiquadFilter(){return {type:'',frequency:{value:0},Q:{value:0},connect(){},disconnect(){}};}
   createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 const sfx=createThrowSfx({AudioContextClass:FakeAudioContext});
 assert.equal(sfx.play({causeId:base.id,speedWorldPerMs:.2,durationMs:600,verify:true}).status,'silent-gated');
 assert.equal(sfx.play({causeId:base.id,speedWorldPerMs:.2,durationMs:600}).status,'await-visible-frame');
 assert.equal(sfx.playedCauses.length,0);
 const a=sfx.play({causeId:base.id,speedWorldPerMs:.2,durationMs:600,visibleFrameComplete:true});
 assert.equal(a.status,'started');assert.equal(a.speed,.5);assert.equal(a.centerHz,1900);
 assert.equal(sfx.play({causeId:base.id,speedWorldPerMs:.9,durationMs:600,visibleFrameComplete:true}).status,'duplicate-suppressed');
 assert.deepEqual(sfx.playedCauses,[base.id]);sfx.stopAll();assert.equal(sfx.playedCauses.length,1);await sfx.dispose();
});
test('package shader is byte-identical to the Sol-authored creative source',async()=>{
 const a=await readFile(new URL('../../ordinary-item-throw-sol61-r1/world.wgsl',import.meta.url));
 const b=await readFile(new URL('../world.wgsl',import.meta.url));
 assert.equal(createHash('sha256').update(a).digest('hex'),createHash('sha256').update(b).digest('hex'));
 assert.match(b.toString(),/terminalFade/);
});
