import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplayAdapter } from './gallery-adapter.mjs';

const origin='https://gallery.example';
const token='a'.repeat(32);
function env({search=`?galleryVersionId=substitution-sol61-r1&galleryStartupToken=${token}&galleryAttemptEpoch=7&galleryAutoLoop=1`}={}) {
  const listeners=new Map();
  const parent={};
  const win={location:{origin,search},parent,
    addEventListener(type,fn){const set=listeners.get(type)||new Set();set.add(fn);listeners.set(type,set);},
    removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
    dispatch(type,event={}){for(const fn of [...(listeners.get(type)||[])])fn(event);},
    listenerCount(type){return listeners.get(type)?.size||0;}};
  const queue=new Map();let next=1,cleared=[];
  const setTimeoutFn=(fn,ms)=>{const id=next++;queue.set(id,{fn,ms});return id;};
  const clearTimeoutFn=id=>{cleared.push(id);queue.delete(id);};
  const controls=new Map();
  const doc={getElementById(id){return {addEventListener(type,fn){assert.equal(type,'click');const a=controls.get(id)||new Set();a.add(fn);controls.set(id,a);},removeEventListener(type,fn){assert.equal(type,'click');controls.get(id)?.delete(fn);}};},click(id){for(const fn of [...(controls.get(id)||[])])fn();},listenerCount(id){return controls.get(id)?.size||0;}};
  const adapter=createReplayAdapter({windowRef:win,documentRef:doc,setTimeoutFn,clearTimeoutFn});
  const state={mode:'idle',startState:'fulfilled',retireState:'active'};let plays=0;
  const runtime={getSnapshot:()=>({...state}),controls:{play(){plays++;state.mode='playing';return true;}}};
  function tick(){const first=queue.entries().next().value;if(!first)return false;queue.delete(first[0]);first[1].fn();return true;}
  function message(action,sequence){win.dispatch('message',{source:parent,origin,data:{schema:'dva-gallery-startup/v1',versionId:'substitution-sol61-r1',token,attemptEpoch:7,action,sequence}});}
  return {adapter,win,doc,queue,cleared,runtime,state,get plays(){return plays;},tick,message};
}

test('valid gallery auth starts one replay and loops only on idle transitions',()=>{
 const e=env(); e.adapter.attach(e.runtime); assert.equal(e.plays,1); assert.equal(e.queue.size,1);
 assert.equal(e.tick(),true); assert.equal(e.plays,1);
 e.state.mode='idle'; e.tick(); assert.equal(e.plays,2); assert.equal(e.queue.size,1);
 e.adapter.stop(); assert.equal(e.queue.size,0); assert.equal(e.win.listenerCount('message'),0); assert.equal(e.win.listenerCount('pagehide'),0);
});

test('invalid, duplicate, or missing gallery loop auth never autoplays',()=>{
 for(const search of ['',`?galleryVersionId=substitution-sol61-r1&galleryStartupToken=${token}&galleryAttemptEpoch=7`,
  `?galleryVersionId=substitution-sol61-r1&galleryStartupToken=${token}&galleryAttemptEpoch=7&galleryAutoLoop=1&galleryAutoLoop=1`,
  `?galleryVersionId=substitution-sol61-r1&galleryStartupToken=${token}&galleryAttemptEpoch=7&galleryAutoLoop=true`]) {
   const e=env({search});e.adapter.attach(e.runtime);assert.equal(e.plays,0);assert.equal(e.queue.size,0);e.adapter.stop();
 }
});

test('sequenced stop pauses, later play resumes; stale commands are ignored',()=>{
 const e=env();e.adapter.attach(e.runtime);assert.equal(e.plays,1);
 e.message('stop',1);assert.equal(e.queue.size,0);e.state.mode='idle';e.tick();assert.equal(e.plays,1);
 e.message('play',1);assert.equal(e.queue.size,0);
 e.message('play',2);assert.equal(e.queue.size,1);e.tick();assert.equal(e.plays,2);
 e.adapter.stop();
});

test('local Stop during startup is remembered until attach and prevents first replay',()=>{
 const e=env();assert.equal(e.doc.listenerCount('stop'),1);e.doc.click('stop');
 e.adapter.attach(e.runtime);assert.equal(e.plays,0);assert.equal(e.queue.size,0);
 e.doc.click('play');assert.equal(e.queue.size,1);e.tick();assert.equal(e.plays,1);
 e.adapter.stop();assert.equal(e.doc.listenerCount('stop'),0);assert.equal(e.doc.listenerCount('play'),0);
});

test('local Stop pauses replay and local Play re-enables it, cleaning button listeners on stop',()=>{
 const e=env();e.adapter.attach(e.runtime);assert.equal(e.plays,1);assert.equal(e.doc.listenerCount('stop'),1);assert.equal(e.doc.listenerCount('play'),1);
 e.doc.click('stop');e.state.mode='idle';assert.equal(e.queue.size,0);assert.equal(e.plays,1);
 e.doc.click('play');assert.equal(e.queue.size,1);e.tick();assert.equal(e.plays,2);
 e.adapter.stop();assert.equal(e.doc.listenerCount('stop'),0);assert.equal(e.doc.listenerCount('play'),0);
});

test('authenticated retire and pagehide synchronously remove child-owned timer/listeners',()=>{
 const e=env();e.adapter.attach(e.runtime);assert.equal(e.queue.size,1);
 e.message('retire',1);assert.equal(e.queue.size,0);assert.equal(e.win.listenerCount('message'),0);assert.equal(e.win.listenerCount('pagehide'),0);assert.equal(e.doc.listenerCount('stop'),0);assert.equal(e.doc.listenerCount('play'),0);
 const f=env();f.adapter.attach(f.runtime);f.win.dispatch('pagehide');assert.equal(f.queue.size,0);assert.equal(f.win.listenerCount('message'),0);assert.equal(f.win.listenerCount('pagehide'),0);assert.equal(f.doc.listenerCount('stop'),0);assert.equal(f.doc.listenerCount('play'),0);
});
console.log('Child replay adapter CPU tests: loop/auth/stop/play/retire/pagehide only. No browser, GPU, audio, or parent lifecycle acceptance implied.');