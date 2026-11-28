import assert from 'node:assert/strict';
import {TYPE,receipt as admit,VISUAL_MS} from './plan.mjs';
import {buildScroll,fixtureReceipt,receipt,Mesh,wrap,fillSfx} from './effect.mjs';
const at=1780000000000,selfId='p1',ctx={selfId,serverNow:at+136};
const base={type:TYPE,variant:'vending',id:'magic_fixture',playerId:selfId,x:7,y:11,at,radius:124};
for(const variant of ['vending','mystery-box'])assert.equal(admit({...base,variant},ctx).causeId,base.id);
for(const o of [
 {variant:'hacker'},{variant:'hacker-fire'},{variant:'acquired'},{variant:''},{type:'action-warp'},
 {type:'action-teleport'},{type:'instant-fire-acquired'},{type:'action-vending'},
 {playerId:'p2'},{radius:90},{id:'naked'},{at:at-1000},{at:at+270},{x:Infinity}
])assert.equal(admit({...base,...o},ctx),null);
assert.ok(receipt(fixtureReceipt('self','mystery-box')));
let fixed;
for(let t=-1;t<=VISUAL_MS;t++)for(const reduced of [false,true]){
 const a=new Mesh(), b=new Mesh();
 const ma=buildScroll(a,base,t,{reduced});
 const mb=buildScroll(b,{...base,variant:'mystery-box',quantity:500,targetX:17,targetY:-220,price:30,success:false},t,{reduced});
 assert.equal(ma.triangles,mb.triangles); assert.deepEqual(a.data.subarray(0,a.length),b.data.subarray(0,b.length));
 assert(a.data.subarray(0,a.length).every(Number.isFinite));
 if(t<0||t>=VISUAL_MS){assert.equal(ma.triangles,0);continue}
 assert.equal(ma.triangles,66);
 const xy=[...a.data.subarray(0,a.length)].filter((_,i)=>i%8<2);
 if(reduced){fixed??=xy;assert.deepEqual(xy,fixed)}
}
assert(wrap(150)<wrap(365)); assert.equal(wrap(475),wrap(800));
for(const rate of [8000,22050,24000,44100,48000,96000]){
 const {data,peak}=fillSfx(rate,'vending',17);
 assert(data.every(Number.isFinite)); assert.equal(Math.abs(data[0]),0);assert.equal(Math.abs(data.at(-1)),0);assert(peak>.01&&peak<.9);
 assert.deepEqual(data,fillSfx(rate,'mystery-box',17).data);
}
console.log('1804 sampled cases; 14 negative cases; fixed reduced geometry; 66 triangles; private-field invariance; six audio rates.');
