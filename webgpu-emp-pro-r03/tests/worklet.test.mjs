import test from 'node:test';import assert from 'node:assert/strict';
import {synthesizeBank} from '../src/synthesis.js';
globalThis.sampleRate=48000;globalThis.currentTime=0;let Processor;
globalThis.AudioWorkletProcessor=class {constructor(){this.messages=[];this.port={onmessage:null,postMessage:m=>this.messages.push(m)};}};
globalThis.registerProcessor=(name,p)=>{assert.equal(name,'emp-actor-r02');Processor=p;};
await import('../src/audio-worklet.js');
const send=(p,d)=>p.port.onmessage({data:d});
test('AudioWorklet source is executable in a JS harness, not a real device/listening test',()=>{
 const p=new Processor();send(p,{type:'bank',bank:synthesizeBank('charge')});send(p,{type:'reset',serial:3});
 send(p,{type:'voice',serial:2,voice:{}});assert.equal(p.engine.voices.size,0);
 const v={id:'e',key:'cause',kind:'charge',atMs:0,deadlineMs:null,resolveMs:null,origin:{x:0,y:0},range:2200};
 send(p,{type:'voice',serial:3,voice:v});send(p,{type:'voice',serial:3,voice:v});
 let nonzero=false;const l=new Float32Array(128),r=new Float32Array(128);
 for(let i=0;i<128;i++){globalThis.currentTime=i*128/48000;send(p,{type:'clock',actorMs:globalThis.currentTime*1000,rate:1,contextTime:globalThis.currentTime});p.process([],[[l,r]]);nonzero||=l.some(x=>x!==0);assert.ok(l.every(x=>Number.isFinite(x)&&Math.abs(x)<1));}
 assert.ok(nonzero);assert.equal(p.engine.stats.started,1);assert.equal(p.engine.stats.created,1);
 send(p,{type:'resolve',serial:3,id:'e',atMs:400});globalThis.currentTime=.70;send(p,{type:'clock',actorMs:700,rate:1,contextTime:.70});p.process([],[[l,r]]);assert.equal(p.engine.voices.size,0);
 assert.equal(p.engine.stats.created,1);assert.ok(l.every(x=>x===0));
});
test('stale actor clock gates sound rather than running indefinitely',()=>{
 const p=new Processor();send(p,{type:'bank',bank:synthesizeBank('charge')});send(p,{type:'voice',voice:{id:'e',key:'k',kind:'charge',atMs:0,deadlineMs:null,resolveMs:null,origin:{x:0,y:0},range:2200}});
 send(p,{type:'clock',actorMs:1400,rate:1,contextTime:0});globalThis.currentTime=1;
 const l=new Float32Array(128),r=new Float32Array(128);for(let i=0;i<30;i++)p.process([],[[l,r]]);assert.ok(l.every(x=>Math.abs(x)<1e-15));assert.equal(p.engine.stats.started,0);
});
