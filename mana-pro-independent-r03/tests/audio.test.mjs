import test from 'node:test';import assert from 'node:assert/strict';import {ManaAudio} from '../src/audio.mjs';import {synthesize} from '../src/sfx-synth.mjs';import {DURATION} from '../src/contract.mjs';
function mock(state='running'){
 const calls=[],listeners=new Map(),param=()=>({value:0,setValueAtTime:(value,time)=>calls.push({kind:'param',value,time})});
 const node=()=>({connect(){},disconnect(){},gain:param()});
 const c={state,currentTime:0,sampleRate:48000,destination:{},createGain:node,createWaveShaper:node,createBuffer:(channels,len,rate)=>({channels,len,rate,copyToChannel(){}}),createBufferSource:()=>({...node(),playbackRate:param(),start(time,offset){calls.push({kind:'start',time,offset,node:this});},stop(){calls.push({kind:'stop'});}}),addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
 return {c,calls,listeners};
}
const opts={eventId:'e',epoch:1,age:0,rate:1,ownerWallMs:1000};
test('単発SFXは同じevent keyで一度だけ',()=>{const m=mock(),a=new ManaAudio(m.c);assert.equal(a.playOnce('k',opts),true);assert.equal(a.playOnce('k',opts),false);assert.equal(m.calls.filter(x=>x.kind==='start').length,1);assert.equal(m.calls.find(x=>x.kind==='start').node.loop,false);});
test('速度切替は同じsourceの再生位置を保つ操作だけ',()=>{const m=mock(),a=new ManaAudio(m.c);a.playOnce('k',opts);m.c.currentTime=.4;a.setRate('k',2,1400);m.c.currentTime=.6;a.setRate('k',1,1600);assert.equal(m.calls.filter(x=>x.kind==='start').length,1);assert.deepEqual(a.audit.filter(x=>x.kind==='rate').map(x=>x.rate),[2,1]);});
test('AudioContext未稼働では発音・遅延再発音しない',()=>{const m=mock('suspended'),a=new ManaAudio(m.c);assert.equal(a.playOnce('k',opts),false);m.c.state='running';assert.equal(a.playOnce('k',opts),false);assert.equal(m.calls.filter(x=>x.kind==='start').length,0);});
test('suspendは全声を止め、resumeしても勝手に鳴らさない',()=>{const m=mock(),a=new ManaAudio(m.c);a.playOnce('k',opts);m.c.state='suspended';m.listeners.get('statechange')();assert.equal(a.voices.size,0);m.c.state='running';m.listeners.get('statechange')();assert.equal(m.calls.filter(x=>x.kind==='start').length,1);});
test('ルーム切替で声・ID台帳を捨てる',()=>{const m=mock(),a=new ManaAudio(m.c);a.playOnce('k',opts);a.resetSession();assert.equal(a.voices.size,0);assert.equal(a.seen.size,0);});
test('異なる3件の声とevent idは独立',()=>{const m=mock(),a=new ManaAudio(m.c);for(let i=0;i<3;i++)a.playOnce('k'+i,{...opts,eventId:'e'+i});assert.equal(a.voices.size,3);assert.deepEqual(a.audit.map(x=>x.eventId),['e0','e1','e2']);a.stop('k1');assert.deepEqual([...a.voices.keys()],['k0','k2']);});
for(const opts2 of [{age:DURATION},{age:-1},{rate:0},{rate:3}])test(`無効音声条件 ${JSON.stringify(opts2)}`,()=>{const m=mock(),a=new ManaAudio(m.c);assert.equal(a.playOnce('k',{...opts,...opts2}),false);assert.equal(m.calls.filter(x=>x.kind==='start').length,0);});
for(const rate of [44100,48000])test(`SFX ${rate}Hz長さ/有限値/ピーク/端点`,()=>{const p=synthesize(rate);assert.equal(p.length,Math.round(DURATION*rate));let peak=0,sum=0;for(const v of p){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));sum+=v*v;}assert.ok(peak<=.721&&peak>.1);assert.ok(sum/p.length>.001);assert.equal(p[0],0);assert.equal(p.at(-1),0);});
test('SFXは決定的な独自波形',()=>{assert.deepEqual(synthesize(8000),synthesize(8000));});
