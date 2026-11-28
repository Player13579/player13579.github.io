import assert from 'node:assert/strict';
import {receipt,fixtureReceipt,buildReceipt,Mesh,fillSfx,LIFE} from './effect.mjs';
const f=fixtureReceipt(3),v=receipt(f,f.observedAt);assert(v);
for(const e of [{variant:'mineral-water:thrown'},{variant:'flora'},{variant:'mystery:energy-surge'},{type:'status-burn-cleared'},{type:'action-item-throw'},{effectKind:'heal'},{playerId:'other'},{durationMs:1400},{radius:135},{at:f.observedAt+8},{at:f.observedAt-5000}])assert.equal(receipt({...f,event:{...f.event,...e}},f.observedAt),null);
for(const x of [{stale:true},{phase:'meeting'},{source:'local-guess'},{selfId:'other'}])assert.equal(receipt({...f,...x},f.observedAt),null);
for(const extra of [{amount:0,sourcePlayerId:'a',targetX:125},{amount:999,sourcePlayerId:'b',targetX:-99}])assert.deepEqual(receipt({...f,event:{...f.event,...extra}},f.observedAt),v);
for(const reduced of [true,false]) for(let t=0;t<=LIFE;t++){
 const g=new Mesh(),r=buildReceipt(g,v,t,{reduced});assert(g.data.subarray(0,g.length).every(Number.isFinite));assert(t===0||t===LIFE?r.triangles===0:r.triangles===45);
}
for(const rate of [22050,32000,44100,48000,88200,96000]){const {data,peak}=fillSfx(rate);assert(peak>.02&&peak<.16);assert.equal(data[0],0);assert.equal(data.at(-1),0)}
console.log('15 rejects, 2122 mesh samples and 6 audio rates passed');

const {stateAt}=await import('./plan.mjs');
assert(stateAt(120).lift>.99&&stateAt(250).lift>.99);
assert(stateAt(400).lift>stateAt(620).lift&&stateAt(620).lift>stateAt(739).lift);
assert.equal(stateAt(400,{reduced:true}).pass,stateAt(620,{reduced:true}).pass);
for(const t of [154,390,650])for(const reduced of [true,false]){
 const a=new Mesh(),b=new Mesh();buildReceipt(a,{amount:0,cleared:true},t,{reduced});buildReceipt(b,{amount:900,cleared:false,targetId:'other'},t,{reduced});assert.deepEqual(a.data,b.data);
}
console.log('mouth hold, monotonic lowering, and outcome metadata invariant');
const {basis,drawFixture}=await import('./effect.mjs');
for(const reduced of [false,true]){
 const a=new Mesh(),b=new Mesh();
 drawFixture(a,basis(v,0,reduced),[]);drawFixture(b,basis(v,LIFE,reduced),[]);
 assert.equal(a.length,b.length);assert.deepEqual(a.data,b.data);
}
console.log('exact idle-pose geometry restored at terminal time');
