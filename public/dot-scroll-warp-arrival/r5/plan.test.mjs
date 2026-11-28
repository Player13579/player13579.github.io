import assert from 'node:assert/strict';
import { TYPE,LIFE,admit } from './plan.mjs';
import { Mesh, buildReceipt, registration, fillSfx } from './effect.mjs';
const e={type:TYPE,id:'magic_a',variant:'arrival',x:12,y:34,at:1795794000000,targetId:'',targetX:null,targetY:null,playerId:'fixture',radius:125,durationMs:0};
const ctx={owner:'fixture',now:e.at}, hit=admit(e,ctx); assert.ok(hit);
assert.deepEqual(admit({...e,sourceX:80,sourceY:-33,remainingCharges:99},ctx),hit);
for(const p of [{variant:'departure'},{variant:'grant'},{type:'teleport-map-scroll-acquired'},{type:'action-teleport'},{type:'action-heart-teleport'},{playerId:'other'},{targetX:0},{targetY:3},{targetId:'other'},{radius:124},{durationMs:200},{id:'abc'},{at:e.at-920},{at:e.at+126}])assert.equal(admit({...e,...p},ctx),null);
assert.ok(admit({...e,at:e.at-919},ctx));
let geometry;
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const m=new Mesh(),v=buildReceipt(m,hit,t,{reduced});
 const d=m.data.subarray(0,m.length);
 assert.ok(d.every(Number.isFinite));
 if(t===0||t===LIFE){assert.equal(v.triangles,0);continue}
 assert.equal(v.triangles,96);
 const xy=[...d].filter((_,i)=>i%8<2);
 if(reduced&&t===1)geometry=xy;
 if(!geometry)geometry=xy;else if(reduced&&t>1)assert.deepEqual(xy,geometry);
 const other=new Mesh();
 buildReceipt(other,{...hit,x:999,y:-5,sourceX:209,remainingCharges:66},t,{reduced});
 assert.deepEqual(other.data.subarray(0,other.length),d);
}
assert.ok(registration(155).gap>registration(260).gap);
assert.equal(registration(360).gap,0);
assert.equal(registration(155,{reduced:true}).gap,0);
for(const f of [8000,16000,22050,44100,48000,96000]){const {data,peak}=fillSfx(f);assert.ok(data.every(Number.isFinite)&&peak>0&&peak<.15);assert.equal(Math.abs(data[0]),0);assert.equal(Math.abs(data.at(-1)),0)}
console.log('1402 finite frames; 14 rejected event cases; fixed reduced geometry; private-field invariance; six audio rates');
