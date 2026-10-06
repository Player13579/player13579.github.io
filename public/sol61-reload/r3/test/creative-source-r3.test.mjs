import test from 'node:test';
import assert from 'node:assert/strict';
import {renderReloadPcm,createReloadSfx} from '../creative/reload-e-sfx-sol61-r3.mjs';
import {contactAt,contactEvents,startContactMs} from '../creative/reload-contact-model.mjs';
import {RELOAD_VERSION,sampleReloadMechanism} from '../creative/reload-e-sol61-r2.mjs';
const peak=x=>x.reduce((p,v)=>Math.max(p,Math.abs(v)),0);
const rms=x=>Math.sqrt(x.reduce((p,v)=>p+v*v,0)/x.length);
function context({state='running',fail=false}={}){
 const log={starts:[],stops:[],nodes:[],buffers:0,closed:0};
 const param=()=>({value:1,cancelScheduledValues(){},setValueAtTime(x){this.value=x;},linearRampToValueAtTime(x){this.value=x;}});
 const node=extra=>{const n={disconnected:false,connect(){},disconnect(){this.disconnected=true;},...extra};log.nodes.push(n);return n;};
 const c={state,sampleRate:48000,currentTime:5,destination:{},createGain:()=>node({gain:param()}),createStereoPanner:()=>node({pan:param()}),createBuffer(ch,n){log.buffers++;const data=new Float32Array(n);return {getChannelData:()=>data};},createBufferSource(){return node({start(...args){if(fail)throw Error('start failed');log.starts.push(args);},stop(...args){log.stops.push(args);}});},close(){log.closed++;}};return {c,log};
}
test('actual frozen R2 geometry matches contact positions, normals of travel and latch timing',()=>{
 for(const phase of ['start','complete'])for(const reducedMotion of [false,true])for(const ageMs of [0,.1,80,160,239.9,240,260,310,380,479.9,480,619.9]){
  const actual=sampleReloadMechanism({version:RELOAD_VERSION,phase,ageMs,reducedMotion,heightPx:64,active:true});
  const m=contactAt({phase,ageMs,reducedMotion});assert.ok(Math.abs(actual.supplyCenterYH-m.centerYH)<1e-12);assert.equal(actual.latch,m.latchFraction);
  if(ageMs>1&&ageMs<239){const dt=.001,a=contactAt({phase,ageMs:ageMs-dt,reducedMotion}),b=contactAt({phase,ageMs:ageMs+dt,reducedMotion});assert.ok(Math.abs((b.centerYH-a.centerYH)/(2*dt)-m.velocityHPerMs)<1e-10);}
 }
});
test('first guide contact derives from geometry; reduced motion changes it rather than playing old onset',()=>{
 assert.ok(Math.abs(startContactMs(false)-388.4594361920075)<1e-8);assert.ok(Math.abs(startContactMs(true)-294.25769130941006)<1e-8);
 for(const reducedMotion of [false,true]){const x=renderReloadPcm({phase:'start',reducedMotion});assert.equal(peak(x.pcm.subarray(0,Math.floor(startContactMs(reducedMotion)*48))),0);assert.ok(peak(x.pcm)>0);}
 assert.deepEqual(contactEvents({phase:'complete'}).map(x=>x.atMs),[240,260,380]);
});
test('finite bounded PCM, deterministic seed and sample-rate stable modal radiation',()=>{
 const values=[];for(const sampleRate of [8000,44100,48000,96000,192000])for(const phase of ['start','complete']){
  const x=renderReloadPcm({phase,sampleRate,seed:0,frictionScale:2,impactScale:2});assert.ok(x.pcm.every(Number.isFinite));assert.ok(peak(x.pcm)<1);assert.equal(x.pcm[0],0);assert.equal(x.pcm.at(-1),0);assert.equal(x.pcm.length,Math.ceil(sampleRate*x.duration));
  if(phase==='complete'&&sampleRate>=44100)values.push(rms(x.pcm));
 }
 assert.ok(Math.max(...values)/Math.min(...values)<1.08);
 assert.deepEqual(renderReloadPcm({phase:'complete'}).pcm,renderReloadPcm({phase:'complete'}).pcm);
 assert.notDeepEqual(renderReloadPcm({phase:'complete',seed:1}).pcm,renderReloadPcm({phase:'complete',seed:2}).pcm);
});
test('source OFF is exact zero; separated friction/impact excitations linearly combine and force scales causally',()=>{
 const all=renderReloadPcm({phase:'complete'}),fr=renderReloadPcm({phase:'complete',impactScale:0}),im=renderReloadPcm({phase:'complete',frictionScale:0}),half=renderReloadPcm({phase:'complete',impactScale:.5,frictionScale:.5});
 assert.equal(peak(renderReloadPcm({phase:'complete',sourceOn:false}).pcm),0);assert.equal(peak(renderReloadPcm({phase:'complete',impactScale:0,frictionScale:0}).pcm),0);
 for(let i=0;i<all.pcm.length;i++){assert.ok(Math.abs(all.pcm[i]-fr.pcm[i]-im.pcm[i])<1e-7);assert.ok(Math.abs(all.pcm[i]*.5-half.pcm[i])<1e-7);}
 assert.equal(peak(im.pcm.subarray(0,240*48)),0);assert.ok(peak(fr.pcm.subarray(1,240*48))>0);
 assert.ok(rms(im.pcm.subarray(550*48))<rms(im.pcm.subarray(380*48,410*48))*.01);
});
test('verify remains silent, immutable and allocates no playable source; gesture ownership retained',()=>{
 const {c,log}=context(),s=createReloadSfx({context:c,verify:true});assert.equal(s.play({causeId:'a',phase:'start'}).reason,'verify-zero');s.setMuted(false);assert.equal(log.nodes[0].gain.value,0);assert.equal(log.starts.length,0);assert.equal(log.buffers,0);s.dispose();assert.equal(log.closed,0);
 const x=context({state:'suspended'}),g=createReloadSfx({context:x.c});assert.equal(g.play({causeId:'a',phase:'complete'}).reason,'gesture-required');assert.equal(x.log.starts.length,0);
});
test('late playback seeks current phase age and distinct phase causes; same cause cannot replay',()=>{
 const {c,log}=context(),s=createReloadSfx({context:c});assert.equal(s.play({causeId:'start',phase:'start',ageMs:300,reducedMotion:true,distance:2,pan:.5}).played,true);assert.deepEqual(log.starts[0],[5,.3]);assert.equal(s.play({causeId:'start',phase:'start'}).reason,'duplicate');assert.equal(s.play({causeId:'complete',phase:'complete',ageMs:260}).played,true);assert.deepEqual(log.starts[1],[5,.26]);
 s.cancel('start');assert.equal(s.snapshot().voices,1);s.stopAll();assert.equal(s.snapshot().voices,0);s.dispose();assert.equal(log.closed,0);
});
test('dynamic source/main/visibility OFF cancel active cause; expiry has finite support',()=>{
 for(const gate of ['sourceOn','mainOn','visible']){const {c,log}=context(),s=createReloadSfx({context:c});s.play({causeId:'a',phase:'complete'});assert.equal(s.play({causeId:'a',phase:'complete',[gate]:false}).played,false);assert.equal(s.snapshot().voices,0);assert.equal(log.stops.length,1);log.nodes.find(x=>x.start).onended();assert.ok(log.nodes.filter(x=>x.start||x.pan).every(x=>x.disconnected));}
 for(const [phase,ageMs] of [['start',480],['complete',620]]){const {c,log}=context(),s=createReloadSfx({context:c});assert.equal(s.play({causeId:'a',phase,ageMs}).reason,'expired');assert.equal(log.starts.length,0);}
});
test('capacity, natural cleanup, mute, idempotent disposal and failed submission do not consume a cause',()=>{
 const {c,log}=context(),s=createReloadSfx({context:c,maxVoices:1});s.play({causeId:'a',phase:'start'});assert.equal(s.play({causeId:'b',phase:'complete'}).reason,'capacity');log.nodes.find(x=>x.start).onended();assert.equal(s.snapshot().voices,0);assert.equal(s.play({causeId:'b',phase:'complete'}).played,true);s.setMuted(true);assert.equal(s.snapshot().voices,0);s.setMuted(false);s.dispose();s.dispose();assert.equal(s.play({causeId:'z',phase:'start'}).reason,'disposed');assert.equal(log.closed,0);
 const x=context({fail:true}),f=createReloadSfx({context:x.c});assert.throws(()=>f.play({causeId:'x',phase:'complete'}),/start failed/);assert.equal(f.snapshot().voices,0);assert.equal(f.snapshot().emittedCount,0);assert.ok(x.log.nodes.filter(n=>n.start||n.pan).every(n=>n.disconnected));
});
test('invalid rates, excitation scales, phases and current age are rejected',()=>{
 for(const x of [{phase:'wrong'},{phase:'start',sampleRate:7999},{phase:'complete',seed:-1},{phase:'complete',frictionScale:Infinity}])assert.throws(()=>renderReloadPcm(x));
 const {c}=context(),s=createReloadSfx({context:c});for(const x of [{causeId:'',phase:'start'},{causeId:'a',phase:'start',ageMs:-1},{causeId:'b',phase:'complete',pan:2}])assert.throws(()=>s.play(x));
});
