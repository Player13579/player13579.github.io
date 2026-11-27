import assert from 'node:assert/strict';
import {receipt,fixtureReceipt,buildReceipt,Mesh,fillSfx,LIFE} from './effect.mjs';
const f=fixtureReceipt(3),v=receipt(f,f.observedAt);assert(v);
for(const e of [{type:'action-mana'},{radius:145.1},{playerId:'other'},{durationMs:300},{variant:'ready'}])assert.equal(receipt({...f,event:{...f.event,...e}},f.observedAt),null);
for(const x of [{stale:true},{phase:'meeting'},{source:'local-guess'},{selfId:'other'}])assert.equal(receipt({...f,...x},f.observedAt),null);
for(const reduced of [true,false]) for(let t=0;t<=LIFE;t++){
 const g=new Mesh(),r=buildReceipt(g,v,t,{reduced});assert(g.data.subarray(0,g.length).every(Number.isFinite));assert.equal(r.triangles,t===0||t===LIFE?0:240);
}
for(const rate of [22050,32000,44100,48000,88200,96000]){const {data,peak}=fillSfx(rate);assert(peak>.02&&peak<.16);assert.equal(data[0],0);assert.equal(data.at(-1),0)}
console.log('9 rejects, 1682 mesh samples and 6 audio rates passed');
