import test from 'node:test';import assert from 'node:assert/strict';
globalThis.sampleRate=48000;globalThis.currentTime=0;
globalThis.AudioWorkletProcessor=class{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)};}};
let Processor;globalThis.registerProcessor=(_name,klass)=>{Processor=klass;};
await import('../src/audio-worklet.js');
const start=(key='E',phase=0)=>({type:'start',key,phase,rate:1,duration:1500,audioTime:currentTime,seed:1,pan:0});
function block(p){const out=[[new Float32Array(128),new Float32Array(128)]];p.process([],out);currentTime+=128/48000;return out[0][0];}
test('worklet starts once even with repeated start and update messages',()=>{currentTime=0;const p=new Processor();for(let i=0;i<100;i++){p.message(start());p.message({type:'update',key:'E',phase:i/1000,rate:1,audioTime:currentTime});block(p);}assert.equal(p.stats.starts,1);assert.equal(p.stats.rejectedDuplicate,99);});
test('worklet preserves two distinct voice identities',()=>{currentTime=0;const p=new Processor();p.message(start('A',.3));p.message(start('B',.18));block(p);assert.equal(p.voices.size,2);assert.equal(p.stats.starts,2);});
test('worklet cancel drains and cannot be restarted by the same ID',()=>{currentTime=0;const p=new Processor();p.message(start('A',.4));for(let i=0;i<4;i++)block(p);p.message({type:'stop',key:'A'});for(let i=0;i<5;i++)block(p);assert.equal(p.voices.size,0);p.message(start('A',.4));assert.equal(p.voices.size,0);});
test('missing frame updates do not leave indefinite audible tone',()=>{currentTime=0;const p=new Processor();p.message(start('A',.7));let last;for(let i=0;i<60;i++)last=block(p);assert.ok(last.every(x=>x===0));});
