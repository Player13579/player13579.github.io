import test from 'node:test';import assert from 'node:assert/strict';
import {ContactSound,synthesizeContact} from '../src/sound.js';
class FakeContext{
 constructor(){this.sampleRate=48000;this.state='suspended';this.currentTime=0;this.destination={};this.sources=[];}
 createGain(){return {gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}};}
 createBuffer(ch,n,sr){return {duration:n/sr,copyToChannel(p){assert.equal(p.length,n);}};}
 createBufferSource(){const s={loop:true,connect(){},disconnect(){},start(){this.started=(this.started||0)+1;},stop(){this.stopped=true;}};this.sources.push(s);return s;}
 async resume(){this.state='running';}async close(){this.state='closed';}
}
test('verifyはAudioContextを作らず、unlockも無効',async()=>{const s=new ContactSound({verify:true,contextFactory:FakeContext});assert.equal(await s.unlockFromGesture(),false);s.playOnce('a',{authorized:true});assert.equal(s.diagnostics().contextsCreated,0);assert.equal(s.diagnostics().started,0);});
test('unlock以前のIDを後から鳴らさず、新IDだけを一回再生',async()=>{const s=new ContactSound({verify:false,contextFactory:FakeContext});assert.equal(s.playOnce('before',{authorized:true}),false);await s.unlockFromGesture();assert.equal(s.playOnce('before',{authorized:true}),false);assert.equal(s.playOnce('after',{authorized:true}),true);assert.equal(s.playOnce('after',{authorized:true}),false);assert.equal(s.context.sources.length,1);assert.equal(s.context.sources[0].started,1);assert.equal(s.context.sources[0].loop,false);assert.equal(s.context.sources[0].buffer.duration,.42);});
test('100ms超の受信遅延は無音。後日の再要求も鳴らさない',async()=>{const s=new ContactSound({verify:false,contextFactory:FakeContext});await s.unlockFromGesture();assert.equal(s.playOnce('late',{authorized:true,ageMs:101}),false);assert.equal(s.playOnce('late',{authorized:true,ageMs:0}),false);assert.equal(s.context.sources.length,0);});
test('未許可音を開始しない',async()=>{const s=new ContactSound({verify:false,contextFactory:FakeContext});await s.unlockFromGesture();assert.equal(s.playOnce('secret',{authorized:false}),false);assert.equal(s.context.sources.length,0);});
test('8声上限で待機キューを作らない',async()=>{const s=new ContactSound({verify:false,contextFactory:FakeContext});await s.unlockFromGesture();for(let i=0;i<8;i++)assert.equal(s.playOnce(i,{authorized:true}),true);assert.equal(s.playOnce(8,{authorized:true}),false);s.cancel(0);assert.equal(s.playOnce(8,{authorized:true}),false);assert.equal(s.context.sources.length,8);});
test('privacy cancelはdisconnect+stop、同じIDは再開始不可',async()=>{const s=new ContactSound({verify:false,contextFactory:FakeContext});await s.unlockFromGesture();s.playOnce('a',{authorized:true});s.cancel('a');assert.equal(s.activeVoices,0);assert.equal(s.context.sources[0].stopped,true);assert.equal(s.playOnce('a',{authorized:true}),false);});
test('normal→verifyで既存声を即時停止',async()=>{const s=new ContactSound({verify:false,contextFactory:FakeContext});await s.unlockFromGesture();s.playOnce('a',{authorized:true});s.setVerify(true);assert.equal(s.activeVoices,0);assert.equal(s.playOnce('b',{authorized:true}),false);});
for(const sr of [8000,44100,48000,96000])test(`PCM ${sr}Hz: 有限、端点ゼロ、peak0.5、420ms`,()=>{const p=synthesizeContact(sr);assert.equal(p.length,Math.ceil(sr*.42));assert.equal(p[0],0);assert.equal(p.at(-1),0);let peak=0,sum=0;for(const v of p){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));sum+=v;}assert.ok(peak<=.500001);assert.ok(peak>.49);assert.ok(Math.abs(sum/p.length)<.01);});
test('PCMは再現可能。乱数をゲームに依存させない',()=>{assert.deepEqual(synthesizeContact(48000),synthesizeContact(48000));});
test('音量上限で8声最悪同相の理論サンプルpeak<=0.72',()=>assert.ok(.5*.18*8<=.72+1e-12));
test('不正sampleRateを拒否',()=>{for(const n of [0,NaN,7999,192001,44100.1])assert.throws(()=>synthesizeContact(n),RangeError);});
