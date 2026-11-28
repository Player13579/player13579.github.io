import assert from 'node:assert/strict';
import {TYPE,LIFE,admit} from './plan.mjs';
import {Mesh,buildReceipt,fillSfx,absence} from './effect.mjs';
const e={type:TYPE,id:'magic_source',variant:'',x:12,y:34,at:1795792500000,targetId:'',targetX:700,targetY:400,playerId:'fixture',radius:125,durationMs:0},ctx={owner:'fixture',now:e.at};
const raw=admit(e,ctx),changed=admit({...e,targetX:25,targetY:-48,remainingCharges:77,distance:2542},ctx);assert.deepEqual(raw,changed);
assert.ok(admit({...e,at:e.at-919},ctx));
for(const p of [{variant:'arrival'},{variant:'grant'},{type:'teleport-map-scroll-acquired'},{type:'action-teleport'},{type:'action-heart-teleport'},{playerId:'other'},{targetX:null},{targetY:Infinity},{targetId:'other'},{radius:124},{durationMs:200},{id:'abc'},{at:e.at-920},{at:e.at+126}])assert.equal(admit({...e,...p},ctx),null);
let outer, reducedShape;
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const m=new Mesh(),n=new Mesh(),s=buildReceipt(m,raw,t,{reduced}),u=buildReceipt(n,changed,t,{reduced});
 const a=m.data.subarray(0,m.length);
 assert.equal(s.triangles,u.triangles);assert(a.every(Number.isFinite));assert.deepEqual(a,n.data.subarray(0,n.length));
 if(t===0||t===LIFE){assert.equal(s.triangles,0);continue}
 assert.equal(s.triangles,96);
 const c=[],xy=[];
 for(let i=0;i<a.length;i+=8){xy.push(a[i],a[i+1]);if(i%144===128||i%144===136)c.push(a[i],a[i+1]);}
 outer??=c;assert.deepEqual(c,outer);
 if(reduced){reducedShape??=xy;assert.deepEqual(xy,reducedShape)}
}
assert(absence(160).hole<absence(430).hole);assert.equal(absence(160,{reduced:true}).hole,absence(430,{reduced:true}).hole);
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);assert.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));assert.equal(Math.abs(data[0]),0);assert.equal(Math.abs(data.at(-1)),0);
}
console.log('1522 CPU phases; 14 rejects; outer stationary; 96 triangles; no destination dependence; six rates.');
