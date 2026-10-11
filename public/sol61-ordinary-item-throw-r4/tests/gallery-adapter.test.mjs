import test from 'node:test';
import assert from 'node:assert/strict';
import { createGalleryAdapter } from '../gallery-adapter.mjs';

function fixture({ verify = false, autoLoop = true, deferFirst = false, sfxPlay = () => ({ status:'started' }) } = {}) {
  let clock = 0, nextId = 0, frames = [], timers = [], disposed = false, runtimeDisposed = false, sfxDisposed = false;
  const renders = [], posts = [], statuses = [], sfxCalls = [];
  const canvas = { isConnected: true, width: 980, height: 620, clientWidth: 980, clientHeight: 620, getContext() {} };
  const params = new URLSearchParams({ embed:'1', galleryStartupToken:'token-r55', galleryVersionId:'ordinary-item-throw-sol61-r4', galleryAttemptEpoch:'7', ...(autoLoop ? {galleryAutoLoop:'1'} : {}) });
  if (verify) params.set('verify','1');
  const runtimeFactory = async options => {
    options.onStatus({type:'resize',width:980,height:620});
    return { resize:async()=>{}, get size(){return {width:980,height:620};}, render: async input => {
      renders.push({...input});
      const receipt={status:input.nowMs-input.event.startedAt>=input.event.duration?'expired':'active', eventId:input.event.id,
        ageMs:input.nowMs-input.event.startedAt,durationMs:input.event.duration,submitted:true,width:980,height:620,
        targetFormats:['rgba16float','rgba16float'],completed:Promise.resolve(true)};
      if(deferFirst&&renders.length===1)return await new Promise(resolve=>{releaseFirst=()=>resolve(receipt);});
      return receipt;
    }, dispose:async()=>{runtimeDisposed=true;} };
  };
  const sfxFactory = () => ({ unlock:async()=>{}, play:args=>{sfxCalls.push(args);return sfxPlay(args);}, stopAll(){}, dispose:async()=>{sfxDisposed=true;} });
  let releaseFirst=()=>{};
  const adapter = createGalleryAdapter({canvas,params,runtimeFactory,sfxFactory,now:()=>clock,
    requestFrame:cb=>{const id=++nextId;frames.push({id,cb});return id;}, cancelFrame:id=>{frames=frames.filter(row=>row.id!==id);},
    setTimer:cb=>{const id=++nextId;timers.push({id,cb});return id;},clearTimer:id=>{timers=timers.filter(row=>row.id!==id);},
    post:m=>posts.push(m),onStatus:m=>statuses.push(m),verify,autoLoop });
  async function settle() { await new Promise(resolve=>setImmediate(resolve)); await new Promise(resolve=>setImmediate(resolve)); }
  async function frame(at) { clock=at; const entry=frames.shift(); assert.ok(entry,'expected queued frame'); entry.cb(at); await settle(); }
  return {adapter,params,renders,posts,statuses,sfxCalls,get frames(){return frames;},get timers(){return timers;},canvas,
    get disposed(){return disposed;},get runtimeDisposed(){return runtimeDisposed;},get sfxDisposed(){return sfxDisposed;},
    setClock:v=>clock=v,frame,settle,fireTimer:async()=>{const row=timers.shift();assert.ok(row,'expected next-cycle timer');row.cb();await settle();},
    setDisposed:v=>disposed=v,releaseFirst:()=>releaseFirst()};
}

test('matches parent startup handshake, completed first-frame proof, autoLoop and fresh cause per natural cycle',async()=>{
  const f=fixture(); await f.adapter.initialize();
  assert.deepEqual(f.posts.slice(0,2).map(m=>[m.stage,m.status]),[['child-document','pending'],['adapter','pending']]);
  await f.frame(0);
  const ready=f.posts.at(-1);
  assert.equal(ready.schema,'dva-gallery-startup/v1'); assert.equal(ready.stage,'playing'); assert.equal(ready.status,'ready');
  assert.equal(ready.token,'token-r55'); assert.equal(ready.versionId,'ordinary-item-throw-sol61-r4'); assert.equal(ready.attemptEpoch,7);
  assert.deepEqual(ready.firstFrame,{recorded:true,submitted:true,completed:true,canvasConnected:true,passes:2,viewportWidth:980,viewportHeight:620,eventId:'ordinary-throw-r4-preview-cause-1',ageMs:0,durationMs:600,sourceEnabled:true,observerEnabled:true});
  assert.equal(f.renders[0].event.type,'action-item-throw'); assert.equal(f.renders[0].event.variant,'flight:ordinary-probe');
  assert.deepEqual([f.renders[0].event.x,f.renders[0].event.y,f.renders[0].event.targetX,f.renders[0].event.targetY],[205,390,775,290]);
  assert.equal(f.renders[0].worldToPixel,1); assert.deepEqual(f.renders[0].project({x:775,y:290}),{x:775,y:290});
  await f.frame(600); await f.fireTimer(); await f.frame(600);
  assert.equal(f.renders.at(-1).event.id,'ordinary-throw-r4-preview-cause-2');
  assert.equal(f.renders.at(-1).event.duration,600);
  assert.equal(f.posts.filter(m=>m.status==='ready').length,1,'parent receives only one startup-ready proof');
});

test('hold/source/observer controls affect the actual next runtime call and SFX is gated by verified visible completion',async()=>{
  const f=fixture(); await f.adapter.initialize(); await f.adapter.enableSfx(); await f.frame(0);
  assert.equal(f.sfxCalls.length,1); assert.equal(f.sfxCalls[0].causeId,'ordinary-throw-r4-preview-cause-1');
  f.adapter.setPhase(.5); await f.frame(25);
  assert.equal(f.renders.at(-1).nowMs-f.renders.at(-1).event.startedAt,300);
  f.adapter.setSource(false); f.adapter.setObserver(false); await f.frame(26);
  assert.equal(f.renders.at(-1).sourceEnabled,false); assert.equal(f.renders.at(-1).observerEnabled,false);
  assert.equal(f.adapter.snapshot().held,true); assert.equal(f.adapter.snapshot().ageMs,300);
  await f.adapter.retire(); assert.equal(f.runtimeDisposed,true); assert.equal(f.sfxDisposed,true);
});

test('verify stays silent, and parent retirement cancels future cycle scheduling and disposes once',async()=>{
  const f=fixture({verify:true}); await f.adapter.initialize();
  assert.deepEqual(await f.adapter.enableSfx(),{status:'silent-gated'}); await f.frame(0);
  assert.equal(f.sfxCalls.length,0); const n=f.renders.length;
  assert.equal(f.frames.length,1,'one next animation frame is pending before cleanup');
  await f.adapter.retire(); await f.adapter.retire();
  assert.equal(f.runtimeDisposed,true,'runtime disposed'); assert.equal(f.sfxDisposed,false,'verify never created audio');
  assert.equal(f.frames.length,0,'pending animation frame cancelled'); assert.equal(f.renders.length,n,'no render after retirement');
  assert.equal(f.posts.at(-1).status,'cancelled');
});

test('manual replay during an unresolved frame fences the stale cause and schedules the new cause',async()=>{
  const f=fixture({deferFirst:true,autoLoop:false}); await f.adapter.initialize();
  await f.frame(0);
  assert.equal(f.renders.length,1);
  assert.equal(f.renders[0].event.id,'ordinary-throw-r4-preview-cause-1');
  f.adapter.replay(); f.releaseFirst(); await f.settle();
  assert.equal(f.frames.length,1,'new replay is scheduled after the stale frame settles');
  await f.frame(10);
  assert.equal(f.renders.at(-1).event.id,'ordinary-throw-r4-preview-cause-2');
  assert.equal(f.posts.filter(m=>m.status==='ready').length,1);
  await f.adapter.retire();
});

test('gallery autoLoop is opt-in; direct preview expires once and manual replay starts a distinct cause',async()=>{
  const f=fixture({autoLoop:false}); await f.adapter.initialize(); await f.frame(0); await f.frame(600);
  assert.equal(f.timers.length,0); assert.equal(f.renders.at(-1).event.id,'ordinary-throw-r4-preview-cause-1');
  f.adapter.replay(); await f.frame(610);
  assert.equal(f.renders.at(-1).event.id,'ordinary-throw-r4-preview-cause-2');
  await f.adapter.retire();
});


test('R4 frame snapshot records only the actual submitted, completed package frame',async()=>{
 const f=fixture({verify:true});await f.adapter.initialize();await f.frame(0);
 const state=f.adapter.snapshot();
 assert.equal(state.version,'ordinary-item-throw-sol61-r4');
 assert.equal(state.frame.status,'active');assert.equal(state.frame.submitted,true);
 assert.equal(state.frame.completed,true);assert.equal(state.frame.durationMs,600);
 await f.adapter.retire();
});

test('audio allocation failure is isolated from rendering, retries on the same visible cause, and stops after retirement',async()=>{
 let attempts=0;
 const f=fixture({sfxPlay:()=>++attempts===1?{status:'retryable-failure',stage:'buffer-allocation',message:'injected'}:{status:'started'}});
 await f.adapter.initialize(); await f.adapter.enableSfx(); await f.frame(0);
 assert.equal(f.adapter.snapshot().errors.length,0,'audio setup failure is not a GPU/render fatal error');
 assert.equal(f.adapter.snapshot().sfxFailures.length,1);
 assert.equal(f.adapter.snapshot().sfxFailures[0].eventId,'ordinary-throw-r4-preview-cause-1');
 assert.equal(f.sfxCalls.length,1); assert.equal(f.frames.length,1,'RAF continues after an audio-only failure');
 await f.frame(16);
 assert.equal(f.sfxCalls.length,2,'same cause is retried after another completed visible frame');
 assert.equal(f.adapter.snapshot().sfxFailures.length,1);
 assert.equal(f.adapter.snapshot().errors.length,0);
 assert.equal(f.frames.length,1);
 await f.adapter.retire();
 assert.equal(f.sfxDisposed,true);
 assert.equal(f.frames.length,0,'retirement cancels the scheduled frame');
 await f.settle(); assert.equal(f.sfxCalls.length,2,'no late audio retry after retirement');
});
