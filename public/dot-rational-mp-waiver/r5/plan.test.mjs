import assert from 'node:assert/strict';
import {receipt,fixtureReceipt,buildReceipt,Mesh,fillSfx,arcPoint,LIFE} from './effect.mjs';
const f=fixtureReceipt(3),v=receipt(f,f.observedAt);assert(v);
for(const e of [{type:'action-mana'},{radius:145.1},{playerId:'other'},{durationMs:300},{variant:'ready'}])assert.equal(receipt({...f,event:{...f.event,...e}},f.observedAt),null);
for(const x of [{stale:true},{phase:'meeting'},{source:'local-guess'},{selfId:'other'}])assert.equal(receipt({...f,...x},f.observedAt),null);
for(const reduced of [true,false]) for(let t=0;t<=LIFE;t++){
 const g=new Mesh(),r=buildReceipt(g,v,t,{reduced});assert(g.data.subarray(0,g.length).every(Number.isFinite));assert.equal(r.triangles,t===0||t===LIFE?0:104);
}
for(const rate of [22050,32000,44100,48000,88200,96000]){const {data,peak}=fillSfx(rate);assert(peak>.02&&peak<.16);assert.equal(data[0],0);assert.equal(data.at(-1),0)}
console.log('9 rejects, 1682 mesh samples and 6 audio rates passed');

const pts=Array.from({length:101},(_,i)=>arcPoint(i/100));
assert(pts[0][1]-pts.at(-1)[1]>.67);assert(pts[50][0]>pts[0][0]+.19);
for(let i=1;i<pts.length;i++)assert(pts[i][1]<pts[i-1][1]);
for(const reduced of [false,true]){
 for(const t of [24,220,660]){
  const base=new Mesh();buildReceipt(base,v,t,{reduced});
  const variant=new Mesh();buildReceipt(variant,{...v,amount:1000,damage:9,operator:'other',targetId:'other',cost:95,ability:'other'},t,{reduced});
  assert.deepEqual(base.data.subarray(0,base.length),variant.data.subarray(0,variant.length));
 }
}
console.log('monotonic open arc; cost, amount, ability and target metadata do not change mesh');
