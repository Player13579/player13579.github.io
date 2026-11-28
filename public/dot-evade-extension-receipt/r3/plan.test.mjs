import assert from 'node:assert/strict';
import {TYPE,receipt,envelope,VISUAL_MS} from './plan.mjs';
const at=1780000000000, clock={selfId:'p1',serverNow:at+136};
const base={type:TYPE,variant:'vending',id:'magic_fixture',playerId:'p1',x:7,y:11,at,radius:124};
for(const variant of ['vending','mystery-box'])assert.equal(receipt({...base,variant},clock).causeId,base.id);
for(const variant of ['hacker','acquired','hacker:fire',''])assert.equal(receipt({...base,variant},clock),null);
for(const type of ['action-vending','action-dodge','instant-substitution-acquired','ability-entitlement','instant-fire-acquired'])assert.equal(receipt({...base,type},clock),null);
for(const o of [{playerId:'p2'},{radius:90},{id:'naked'},{at:at-1000},{at:at+270},{x:Infinity}])assert.equal(receipt({...base,...o},clock),null);
assert.equal(receipt(base,{...clock,serverNow:at-5}).active,false);
assert.equal(envelope(-1).phase,'off');
assert.equal(envelope(VISUAL_MS).phase,'off');
assert(envelope(95).lineProgress<envelope(210).lineProgress);
assert(envelope(162,{reduced:true}).lineProgress===1);
assert(envelope(248).soundBand);
assert(envelope(575).heat<envelope(240).heat);
console.log('receipt, four source negatives, five other event negatives, owner, age and envelope passed');
const {buildExtension,Mesh,fillSfx}=await import('./effect.mjs');
const sample=(age,reduced=false,ev={})=>{
 const m=new Mesh();const v=buildExtension(m,ev,age,{reduced});assert.ok(v.triangles<=128);
 assert.ok(m.data.subarray(0,m.length).every(Number.isFinite));
 return Array.from(m.data.subarray(0,m.length));};
for(const reduced of [false,true])for(let t=-1;t<=VISUAL_MS;t++){
 const d=sample(t,reduced);
 if(t<0||t>=VISUAL_MS)assert.equal(d.length,0);
 else for(let k=0;k<d.length;k+=8)assert.ok(d[k]<-.25&&d[k]>-.91&&d[k+1]>-1.3&&d[k+1]<-.64);
}
const coords=a=>a.filter((_,i)=>i%8<2);
assert.deepEqual(coords(sample(90)),coords(sample(300)));
assert.notDeepEqual(sample(110),sample(225));
for(const variant of ['mystery-box','vending'])for(const t of [90,240,600])
 assert.deepEqual(sample(t,false,receipt({...base,variant,amount:24,invincible:true,distance:30},clock)),sample(t,false));
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate,'vending',123);assert.ok(data.every(Number.isFinite)&&peak>0);
 assert.deepEqual(data,fillSfx(rate,'mystery-box',123).data);
}
console.log('1804 phase states; fixed spatial footprint; 6 data-variant invariants; 6 PCM modes');
