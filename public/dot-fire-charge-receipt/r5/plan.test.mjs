import assert from 'node:assert/strict';
import {TYPE,receipt,envelope,VISUAL_MS} from './plan.mjs';
const at=1780000000000, clock={selfId:'p1',serverNow:at+136};
const base={type:TYPE,variant:'vending',id:'magic_fixture',playerId:'p1',x:7,y:11,at,radius:124};
for(const variant of ['vending','mystery-box'])assert.equal(receipt({...base,variant},clock).causeId,base.id);
for(const variant of ['hacker','acquired','hacker:fire',''])assert.equal(receipt({...base,variant},clock),null);
for(const type of ['action-vending','fire','fire-activation','ability-entitlement','instant-heal-acquired'])assert.equal(receipt({...base,type},clock),null);
for(const o of [{playerId:'p2'},{radius:90},{id:'naked'},{at:at-900},{at:at+270},{x:Infinity}])assert.equal(receipt({...base,...o},clock),null);
assert.equal(receipt(base,{...clock,serverNow:at-5}).active,false);
assert.equal(envelope(-1).phase,'off');
assert.equal(envelope(VISUAL_MS).phase,'off');
assert(envelope(95).lineProgress<envelope(210).lineProgress);
assert(envelope(162,{reduced:true}).lineProgress===1);
assert(envelope(185).soundBand);
assert(envelope(575).heat<envelope(240).heat);
console.log('receipt, four source negatives, five other event negatives, owner, age and envelope passed');
const {buildCharge,Mesh,fillSfx}=await import('./effect.mjs');
let phases=0;
const xy=(mesh)=>Array.from({length:mesh.length/8},(_,i)=>[mesh.data[i*8],mesh.data[i*8+1]]);
for(const reduced of [false,true]){
 const baseline=new Mesh();assert.equal(buildCharge(baseline,base,240,{reduced}).triangles,24);
 for(let t=-2;t<=VISUAL_MS+2;t++){
   const mesh=new Mesh(), pose=buildCharge(mesh,base,t,{reduced});
   assert(mesh.data.subarray(0,mesh.length).every(Number.isFinite));
   if(t<0||t>=VISUAL_MS) assert.equal(pose.triangles,0);
   else{
     assert.deepEqual(xy(mesh),xy(baseline),'no silhouette movement');
     for(const [x,y] of xy(mesh))assert(Math.hypot(x-pose.contact[0],y-pose.contact[1])<=.315);
     const counter=new Mesh();buildCharge(counter,{...base,variant:'mystery-box',quantity:300,targetId:'p8'},t,{reduced});
     assert.deepEqual(mesh.data,counter.data,'outcome, target and price independent');
   }
   phases++;
 }
}
for(const rate of [8000,22050,24000,44100,48000,96000]){
 const {data,peak}=fillSfx(rate,'vending',17);
 assert(data.every(Number.isFinite)); assert.equal(data[0],0); assert.equal(data.at(-1),0);assert(peak>.01&&peak<.9);
 assert.deepEqual(data,fillSfx(rate,'mystery-box',17).data);
}
console.log({fixedMeshPhases:phases,triangles:24,audioRates:6});
const {textileSignal}=await import('./effect.mjs');
assert(textileSignal(96,0).mask>textileSignal(96,1).mask);
assert(textileSignal(330,1).mask>.7);
assert.equal(textileSignal(96,.1,{reduced:true}).mask,textileSignal(96,.9,{reduced:true}).mask);
