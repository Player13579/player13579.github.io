import test from 'node:test';import assert from 'node:assert/strict';import {rig} from './helpers.mjs';
import {projectEvent} from '../src/runtime/projection.mjs';import {reactorState} from '../src/effects/reactor/state.mjs';import {recyclingState} from '../src/effects/recycling/state.mjs';
for(const effect of ['A','B'])for(const background of ['dark','light'])for(const speed of [1,2])for(const event of ['normal','duplicate','delayed','expired','offscreen','missing'])
 test(`logic matrix ${effect}/${background}/speed${speed}/${event} (not pixels)`,async()=>{
  const r=rig();const x=r.make(effect);const src=x.receipt.worldOrigin;
  r.controller.anchor=(id,now)=>event==='missing'?null:{playerId:id,world:{x:src.x+136+(now-10000)/1000*20*speed,y:src.y+5},heightWorld:64,sampledAtMonotonicMs:now};
  if(event==='delayed')r.state.now+=1300;if(event==='expired')r.state.now+=2300;
  await Promise.all(Array.from({length:event==='duplicate'?12:1},()=>r.controller.receive(x.raw)));
  const ageStart=r.state.now-10000;
  for(let age=ageStart;age<=2300;age+=20){
   r.state.now=10000+age;const frames=r.controller.sampleFrame();
   if(age>=2200||event==='expired'){assert.equal(frames.length,0);continue;}
   assert.equal(frames.length,1);assert.equal(frames[0].ageMs,age);
   const view={centerWorld:{x:src.x+145+(event==='offscreen'?2300:0),y:src.y},pixelsPerWorldUnit:1,width:704,height:320,referenceHeightWorld:64};
   const projected=projectEvent(frames[0],view);assert.equal(projected.H,64);
   if(event==='offscreen')assert.equal(projected.visible,false);
   if(event==='missing')assert.equal(projected.hasReceiver,0);
   const state=(effect==='A'?reactorState:recyclingState)(age);assert.equal(state.visible,true);
  }
  assert.equal(r.calls.audio.length,event==='expired'?0:1);assert.equal(r.calls.generic.length,0);
 });
test('different phase/state topologies, including exact end',()=>{
 assert.equal(reactorState(2200).visible,false);assert.equal(recyclingState(2200).visible,false);
 assert.equal(reactorState(1240).received,1);assert.equal(recyclingState(1280).count,3);
 assert.equal(recyclingState(900).count,0);assert.equal(recyclingState(1000).count,1);assert.equal(recyclingState(1160).count,2);
 for(let t=0;t<2200;t++){for(const fn of [reactorState,recyclingState]){const state=fn(t);assert.equal(state.visible,true);for(const x of Object.values(state))if(typeof x==='number')assert.ok(Number.isFinite(x));}}
});
test('camera re-entry keeps age instead of replaying',async()=>{const r=rig(),x=r.make();await r.controller.receive(x.raw);r.state.now+=900;const f=r.controller.sampleFrame()[0];const common={pixelsPerWorldUnit:1,width:704,height:320,referenceHeightWorld:64};assert.equal(projectEvent(f,{...common,centerWorld:{x:9999,y:9999}}).visible,false);assert.equal(projectEvent(f,{...common,centerWorld:{x:3800,y:400}}).visible,true);assert.equal(f.ageMs,900);assert.equal(r.calls.audio.length,1);});
test('a far offscreen event never suppresses visible event',()=>{const v={centerWorld:{x:0,y:0},pixelsPerWorldUnit:1,width:704,height:320,referenceHeightWorld:64};const base={targetKey:'A',ageMs:500,heightWorld:64,receiver:{x:20,y:0}};assert.equal(projectEvent({...base,origin:{x:0,y:0}},v).visible,true);assert.equal(projectEvent({...base,origin:{x:9999,y:9999},receiver:{x:10000,y:10000}},v).visible,false);});
test('reduced motion minimizes transverse motion but retains causal transport',()=>{assert.equal(reactorState(600,true).pathLift,0);assert.equal(recyclingState(600,true).transverseMotion,0);assert.equal(recyclingState(1400,true).count,3);});
