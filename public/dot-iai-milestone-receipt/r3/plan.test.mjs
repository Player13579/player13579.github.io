import assert from 'node:assert/strict';
import {TYPE,receipt,envelope,VISUAL_MS} from './plan.mjs';
const at=1780000000000, clock={selfId:'p1',serverNow:at+136};
const base={type:TYPE,variant:'ec-500',id:'magic_fixture',playerId:'p1',x:7,y:11,at,radius:122};
for(const variant of ['ec-500'])assert.equal(receipt({...base,variant},clock).causeId,base.id);
for(const variant of ['hacker','acquired','mystery-box','vending','ec-499','ec-501',''])assert.equal(receipt({...base,variant},clock),null);
for(const type of ['action-vending','action-dodge','instant-substitution-acquired','ability-entitlement','instant-fire-acquired'])assert.equal(receipt({...base,type},clock),null);
for(const o of [{playerId:'p2'},{radius:90},{id:'naked'},{at:at-1000},{at:at+270},{x:Infinity}])assert.equal(receipt({...base,...o},clock),null);
assert.equal(receipt(base,{...clock,serverNow:at-5}).active,false);
assert.equal(envelope(-1).phase,'off');
assert.equal(envelope(VISUAL_MS).phase,'off');
assert(envelope(95).lineProgress<envelope(210).lineProgress);
assert(envelope(162,{reduced:true}).lineProgress===1);
assert(envelope(248).soundBand);
assert(envelope(575).heat<envelope(240).heat);
console.log('receipt, seven source negatives, five other event negatives, owner, age and envelope passed');
const {Mesh,buildReceipt,fillSfx,fixtureReceipt,receipt:fixture}=await import('./effect.mjs');
const raw=fixtureReceipt(2),v=fixture(raw,raw.at);assert.ok(v);
for(const reduced of [false,true]){
 let coords;
 for(let t=0;t<=VISUAL_MS;t++){
  const m=new Mesh(),r=buildReceipt(m,v,t,{reduced});
  assert.equal(r.triangles,t===0||t===VISUAL_MS?0:30);
  assert(m.data.subarray(0,m.length).every(Number.isFinite));
  const x=[];for(let i=0;i<m.length;i+=8){assert(m.data[i+5]>=0&&m.data[i+5]<=1);x.push(m.data[i],m.data[i+1]);}
  if(t>0&&t<VISUAL_MS){coords??=x;assert.deepEqual(x,coords);}
 }
 for(const t of [95,220,540]){
  const a=new Mesh(),b=new Mesh();buildReceipt(a,{...v,charges:0,activation:false},t,{reduced});buildReceipt(b,{...v,charges:100,activation:true,damage:42},t,{reduced});assert.deepEqual(a.data,b.data);
 }
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const s=fillSfx(rate,'ec-500',9);
 assert(s.data.every(Number.isFinite));assert.equal(Math.abs(s.data[0]),0);assert.equal(Math.abs(s.data.at(-1)),0);assert(s.peak>.03&&s.peak<.35);
}
console.log('1642 meshes, anchored geometry, 6 audio rates, outer amounts and outcomes ignored');
