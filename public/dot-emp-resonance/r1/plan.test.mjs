import a from 'node:assert/strict';
import {admit,stateAt} from './plan.mjs';
import {buildRibbon} from './mesh.mjs';
import {fillSfx} from './sfx.mjs';
const e={id:'magic_a',at:100,x:100,y:200,resolvedEmpPulseIds:['first','second'],type:'emp-resonance',variant:'positive',radius:520,durationMs:0,empSourceAxis:-2.48};
const input={source:'visible-magic-event-replay',stale:false,observedAt:170,phase:'playing',event:e};
a.ok(admit(input));
a.deepEqual(admit(input),admit({...input,event:{...e,empSourceAxis:e.empSourceAxis+Math.PI,resolvedEmpPulseIds:['second','first'],playerId:'hidden',targetId:'unseen',targetX:99,damage:400,variant:"negative"}}));
for(const mod of [{type:'emp-cancel'},{variant:'opposite'},{radius:260},{durationMs:1600},{resolvedEmpPulseIds:['first','first']},{at:171},{x:NaN},{empSourceAxis:7}])
 a.equal(admit({...input,event:{...e,...mod}}),null);
let shapes=0;
for(const reduced of [false,true]){
 for(let t=-1;t<=1001;t++)a.ok(Object.values(stateAt(t,{reduced})).every(x=>x>=0&&x<=1));
 a.equal(stateAt(330,{reduced}).contact,1);a.deepEqual(stateAt(1000,{reduced}),stateAt(0,{reduced}));
 for(const axis of [0,.4,1,2,3])for(let t=5;t<1000;t+=7){
  const v=buildRibbon({axis},t,{reduced});a.equal(v.length,4032);a.ok(v.every(Number.isFinite));
  for(let i=0;i<v.length;i+=8){a.ok(Math.hypot(v[i],v[i+1])<1.95);a.ok(v[i+5]>=0&&v[i+5]<=1)}
  shapes++;
 }
}
for(const rate of [8000,22050,24000,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);
 a.ok(data.every(Number.isFinite));a.equal(data[0],0);a.equal(data.at(-1),0);a.ok(peak>=.025&&peak<=.09);
}
console.log({shapes,states:2006,negative:8,audioRates:6,swapInvariant:true});
