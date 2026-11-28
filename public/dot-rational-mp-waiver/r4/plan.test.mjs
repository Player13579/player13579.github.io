import assert from 'node:assert/strict';
import {receipt,fixtureReceipt,buildReceipt,Mesh,fillSfx,contour,LIFE} from './effect.mjs';
const f=fixtureReceipt(3),v=receipt(f,f.observedAt);assert(v);
for(const e of [{type:'action-mana'},{radius:145.1},{playerId:'other'},{durationMs:300},{variant:'ready'}])assert.equal(receipt({...f,event:{...f.event,...e}},f.observedAt),null);
for(const x of [{stale:true},{phase:'meeting'},{source:'local-guess'},{selfId:'other'}])assert.equal(receipt({...f,...x},f.observedAt),null);
for(const reduced of [true,false]) for(let t=0;t<=LIFE;t++){
 const g=new Mesh(),r=buildReceipt(g,v,t,{reduced});assert(g.data.subarray(0,g.length).every(Number.isFinite));assert.equal(r.triangles,t===0||t===LIFE?0:96);
}
for(const rate of [22050,32000,44100,48000,88200,96000]){const {data,peak}=fillSfx(rate);assert(peak>.02&&peak<.16);assert.equal(data[0],0);assert.equal(data.at(-1),0)}
console.log('9 rejects, 1682 mesh samples and 6 audio rates passed');

const bounds=c=>[c[0][0],c[16][0],c.reduce((lo,p)=>Math.min(lo,p[1]),Infinity)];
const early=bounds(contour(0)),late=bounds(contour(1));assert(early[0]-late[0]>.36);assert.equal(early[1],late[1]);assert(late[2]<early[2]);
for(const reduced of [false,true]){
 for(const t of [24,220,660]){
  const base=new Mesh();buildReceipt(base,v,t,{reduced});
  const variant=new Mesh();buildReceipt(variant,{...v,amount:1000,damage:9,operator:'other',targetId:'other',cost:95,ability:'other'},t,{reduced});
  assert.deepEqual(base.data.subarray(0,base.length),variant.data.subarray(0,variant.length));
 }
}
console.log('unbroken anchored contour; cost, amount, ability and target metadata do not change mesh');
