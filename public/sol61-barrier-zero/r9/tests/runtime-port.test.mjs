import test from 'node:test';
import assert from 'node:assert/strict';
import { DESIGN, eventRules, defaults, uniformFloats, contactCell, receipt, authoritativeState } from '../artist.mjs';
import { sharedEClock, eventFrame, FRAME_ABI_ORDER, FRAME_BYTES } from '../runtime.mjs';
import { BarrierSfx, SFX_DURATION_MS } from '../sfx-runtime.mjs';
import { normalizeWireEvent } from '../attempts/b-expression-contract-a1/e-clock-contract.mjs';

const owner=(extra={})=>({id:'player-a',alive:true,visible:true,inVent:false,ejected:false,barrierDurability:5,...extra});
const hit=(extra={})=>({type:'preparation-barrier-hit',cause:'durability-hit',eventId:'h1',playerId:'player-a',startedAtMs:1000,durationMs:650,contact:[.50,.15,.66],...extra});

test('frozen frame ABI remains eight vec4 slots in 128 bytes with derived contact cell id',()=>{
  assert.deepEqual(FRAME_ABI_ORDER,['viewport','phase','gates','optics','frameLayout','contact','camera','bounds']);assert.equal(FRAME_BYTES,128);
  const state={stage:3,t:.055,live:true,known:true,contact:[.50,.15,.66]};
  const f=uniformFloats({width:980,height:620,H:64,dpr:1,state,settings:defaults(),dual:true,diagnostic:false});
  assert.equal(f.byteLength,128);assert.equal(f[23],contactCell(state.contact));assert.deepEqual(Array.from(f.slice(8,16)),[1,1,1,1,1,1,1,1]);assert.equal(f[16],1);
});

test('typed receipt gates cause, actual owner, event identity, age, duration and session dedupe',()=>{
  const seen=new Set(),p=owner();assert.equal(receipt(hit({cause:'wrong'}),p,1010,seen),null);assert.equal(receipt(hit({playerId:'player-b'}),p,1010,seen),null);assert.equal(receipt(hit({startedAtMs:1011}),p,1010,seen),null);assert.equal(receipt(hit(),p,1650,seen),null);assert.equal(receipt(hit({durationMs:900}),p,1010,seen),null);assert.ok(receipt(hit(),p,1010,seen));assert.equal(receipt(hit(),p,1011,seen),null);
});

test('reviewed wire normalization preserves raw ids/owners and keeps wire duration separate',()=>{
  const p=owner(),broken=owner({barrierDurability:0});
  const cases=[
    [{type:'action-stand',variant:'durability-created',id:'wire-create',targetId:'player-a',durationMs:700},p,'action-stand','durability-created','targetId','create'],
    [{type:'preparation-barrier-hit',variant:'durability-hit',id:'wire-hit',playerId:'player-a',durationMs:900},p,'preparation-barrier-hit','durability-hit','playerId','hit'],
    [{type:'preparation-barrier-hit',variant:'durability-broken',id:'wire-break',playerId:'player-a',durationMs:900},broken,'durability-broken','durability-broken','playerId','break'],
    [{type:'action-push',variant:'timed-bust-break',id:'wire-bust',targetId:'player-a',durationMs:500},broken,'action-push','timed-bust-break','targetId','break']
  ];
  for(const [raw,actualOwner,type,cause,ownerField,kind] of cases){
    const mapped=normalizeWireEvent(raw,1000);assert.equal(mapped.type,type);assert.equal(mapped.cause,cause);assert.equal(mapped.eventId,raw.id);assert.equal(mapped[ownerField],actualOwner.id);assert.equal(mapped.startedAtMs,1000);assert.equal(mapped.kind,kind);assert.equal(mapped.wireDurationMs,raw.durationMs);assert.equal('durationMs' in mapped,false);
    assert.ok(receipt(mapped,actualOwner,1000,new Set()));
  }
  assert.equal(normalizeWireEvent({type:'preparation-barrier-hit',variant:'unknown',id:'x',playerId:'player-a'},1000),null);
  assert.equal(normalizeWireEvent({type:'action-stand',variant:'durability-created',targetId:'player-a'},1000),null);
});

test('zero durability break receipt is allowed, stable is driven only by actual positive durability',()=>{
  const broken=owner({barrierDurability:0}),e={type:'durability-broken',cause:'durability-broken',eventId:'b1',playerId:'player-a',startedAtMs:1000,durationMs:480};
  assert.ok(receipt(e,broken,1100,new Set()));assert.equal(authoritativeState(broken,null,0).live,false);assert.equal(authoritativeState(owner(),null,0).stage,1);
});

test('hidden, dead, vented and ejected owners immediately stop authoritative state',()=>{
  const event={kind:'hit',durationMs:650,contact:[.50,.15,.66],ownerId:'player-a'};
  for(const p of [owner({alive:false}),owner({visible:false}),owner({inVent:true}),owner({ejected:true})])assert.equal(eventFrame({owner:p,receipt:event},100).live,false);
});

test('shared host E-clock uses absolute effectNow minus startedAt without multiplying age twice',()=>{
  const p=owner(),effect={startedAt:100},two=sharedEClock({effect,kind:'hit',effectNow:155,displayRate:2,owner:p});assert.equal(two.ageMs,55);assert.equal(two.ageSeconds,.055);assert.equal(two.rate,2);assert.equal(two.sourceSampleOffsetSeconds,.055);assert.equal(two.audioEligible,true);
  const c=sharedEClock({effect,kind:'create',effectNow:100,displayRate:1,owner:p});assert.equal(c.ageMs,0);assert.equal(c.transientActive,true);
});

test('shared clock handles future, half-open expiry, durable create/hit stable fallback, and zero rate',()=>{
  const effect={startedAt:100},p=owner();assert.equal(sharedEClock({effect,kind:'hit',effectNow:99,displayRate:1,owner:p}).future,true);
  const end=sharedEClock({effect,kind:'hit',effectNow:750,displayRate:2,owner:p});assert.equal(end.expired,true);assert.equal(end.transientActive,false);assert.equal(end.stableAfterTransient,true);
  const broken=sharedEClock({effect,kind:'break',effectNow:580,displayRate:1,owner:owner({barrierDurability:0})});assert.equal(broken.transientActive,false);
  const paused=sharedEClock({effect,kind:'create',effectNow:155,displayRate:0,owner:p});assert.equal(paused.ageMs,55);assert.equal(paused.audioEligible,false);assert.equal(paused.transientActive,true);
});

test('finite WAV limits are exact source durations',()=>{assert.deepEqual(SFX_DURATION_MS,{create:650,hit:650,break:480});});

class MockContext {
  constructor(){this.state='running';this.currentTime=12;this.sources=[];this.destination={};}
  async resume(){this.state='running';} async close(){this.state='closed';} async suspend(){this.state='suspended';}
  async decodeAudioData(){return{duration:.65};}
  createBufferSource(){const node={playbackRate:{value:1},connect(){return gain;},disconnect(){},start(...args){this.started=args;},stop(){}};const gain={gain:{value:0},connect(){return this;},disconnect(){}};node.connect=()=>gain;this.sources.push(node);return node;}
  createGain(){return{gain:{value:0},connect(){return this;},disconnect(){}};}
}

test('verification SFX never constructs context or starts audio',async()=>{let contexts=0;const s=new BarrierSfx({verification:true,AudioContextImpl:class extends MockContext{constructor(...a){super(...a);contexts++;}}});assert.equal(await s.unlock(),false);assert.equal(await s.play('hit','verify-1',{offsetMs:10,submitted:true}),false);assert.equal(contexts,0);assert.equal(s.audit().gain,0);assert.equal(s.audit().contextCount,0);});

test('ordinary SFX starts only after unlock, from the accepted age/rate and once per receipt',async()=>{
  const c=new MockContext(),s=new BarrierSfx({verification:false,AudioContextImpl:class extends MockContext{constructor(){return c;}},fetchImpl:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(64)})});
  assert.equal(await s.play('hit','cause-a',{offsetMs:55,rate:2,submitted:true}),false);assert.equal(await s.unlock(),true);assert.equal(await s.sync('hit','cause-a',{ageMs:55,rate:2,submitted:true,wallNowMs:1000}),true);const first=c.sources[0];assert.deepEqual(first.started,[12,.055]);assert.equal(first.playbackRate.value,2);
  assert.equal(await s.sync('hit','cause-a',{ageMs:75,rate:2,submitted:true,wallNowMs:1010}),true);assert.equal(c.sources.length,1);assert.equal(first.playbackRate.value,2);
  assert.equal(await s.sync('hit','cause-a',{ageMs:75,rate:0,submitted:true,wallNowMs:1020}),false);assert.equal(s.audit().voices[0].ageAtSyncMs,75);
  assert.equal(await s.sync('hit','cause-a',{ageMs:75,rate:2,submitted:true,wallNowMs:1120}),true);assert.equal(c.sources.length,2);assert.deepEqual(c.sources[1].started,[12,.075]);assert.equal(c.sources[1].playbackRate.value,2);
  assert.equal(await s.sync('hit','cause-a',{ageMs:650,rate:2,submitted:true,wallNowMs:1400}),false);assert.equal(s.audit().activeVoices,0);s.dispose();
});

test('host 1→2→0→2 timeline drives the shared visual age and SFX cursor',async()=>{
  const c=new MockContext(),s=new BarrierSfx({verification:false,AudioContextImpl:class extends MockContext{constructor(){return c;}},fetchImpl:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(64)})});
  const p=owner(),effect={startedAt:1000};await s.unlock();
  const step=async(effectNow,displayRate)=>{
    const clock=sharedEClock({effect,kind:'hit',effectNow,displayRate,owner:p});
    await s.sync('hit','host-clock-hit',{ageMs:clock.ageMs,rate:clock.rate,submitted:true,wallNowMs:effectNow});
    return clock;
  };
  const atOne=await step(1055,1);assert.equal(atOne.ageMs,55);assert.equal(atOne.sourceSampleOffsetSeconds,.055);assert.equal(c.sources[0].playbackRate.value,1);
  const atTwo=await step(1075,2);assert.equal(atTwo.ageMs,75);assert.equal(atTwo.sourceSampleOffsetSeconds,.075);assert.equal(c.sources.length,1);assert.equal(c.sources[0].playbackRate.value,2);
  const paused=await step(1075,0);assert.equal(paused.ageMs,75);assert.equal(paused.audioEligible,false);assert.equal(s.audit().voices[0].ageAtSyncMs,75);
  const resumed=await step(1075,2);assert.equal(resumed.ageMs,75);assert.equal(resumed.sourceSampleOffsetSeconds,.075);assert.equal(c.sources.length,2);assert.deepEqual(c.sources[1].started,[12,.075]);assert.equal(c.sources[1].playbackRate.value,2);
  const expired=await step(1650,2);assert.equal(expired.ageMs,650);assert.equal(expired.transientActive,false);assert.equal(s.audit().activeVoices,0);s.dispose();
});

test('artist identity and event durations are not rewritten by the runtime',()=>{
  assert.equal(DESIGN.id,'sol61-barrier-zero-r9');assert.deepEqual(eventRules.map(x=>x.durationMs),[650,650,480,480]);
});
