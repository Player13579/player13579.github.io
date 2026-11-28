import a from 'node:assert/strict';
import {admit,stateAt} from './plan.mjs';
import {buildMarker} from './mesh.mjs';
import {fillSfx} from './sfx.mjs';
const e={id:'magic_a',at:100,type:'enhance-activation',variant:'gesture:ok',markerCount:1,radius:0,durationMs:1200,playerId:'fixture'};
const actor={id:'fixture',alive:true,ejected:false,inVent:false,invisible:false};
const i={source:'visible-magic-event-replay',stale:false,observedAt:170,phase:'playing',actor,event:e};
a.ok(admit(i));a.deepEqual(admit({...i,phase:'meeting'}),admit(i));
const metamorphic=admit({...i,event:{...e,variant:'ability-hold:alternate',targetId:'hidden',damage:5,spentMana:50,x:999,y:98}});
a.deepEqual(metamorphic,admit(i));
let rejected=0;
for(const mod of [{type:'action-renki'},{markerCount:0},{markerCount:8},{variant:''},{playerId:'other'},{durationMs:0},{radius:5},{at:171},{at:-5000}]){a.equal(admit({...i,event:{...e,...mod}}),null);rejected++}
for(const mod of [{alive:false},{invisible:true},{inVent:true},{ejected:true}]){a.equal(admit({...i,actor:{...actor,...mod}}),null);rejected++}
for(const mod of [{stale:true},{phase:'ended'},{observedAt:1300}]){a.equal(admit({...i,...mod}),null);rejected++}
let shapes=0;
for(const reduced of [false,true]){
 for(let t=-1;t<=1201;t++)a.ok(Object.values(stateAt(t,{reduced})).every(x=>x>=0&&x<=1));
 a.equal(stateAt(1200,{reduced}).alpha,0);a.equal(stateAt(0,{reduced}).alpha,0);
 for(let t=5;t<1200;t+=5){
  const v=buildMarker(admit(i),t,{reduced});a.deepEqual(v,buildMarker(metamorphic,t,{reduced}));a.equal(v.length,3360);a.ok(v.every(Number.isFinite));
  for(let k=0;k<v.length;k+=8){a.ok(Math.abs(v[k])<.46&&v[k+1]<-.21&&v[k+1]>-.89);a.ok(v[k+5]>=0&&v[k+5]<=1)}
  shapes++;
 }
}
for(const rate of [8000,22050,24000,44100,48000,96000]){const {data,peak}=fillSfx(rate);a.ok(data.every(Number.isFinite));a.equal(data[0],0);a.equal(data.at(-1),0);a.ok(peak>=.02&&peak<=.09)}
console.log({shapes,states:2406,rejected,audioRates:6});
const marker=admit(i);
const nearest=(t,reduced=false)=>{
 const v=buildMarker(marker,t,{reduced});let closest=.5;
 for(let j=0;j<v.length;j+=8)if(v[j+5]>.015)closest=Math.min(closest,Math.abs(v[j]));
 return closest;
};
a.equal(nearest(160),0);
a.ok(nearest(330)>0 && nearest(500)>nearest(330) && nearest(680)>nearest(500));
for(const t of [160,330,500,680])a.equal(nearest(t,true),0);
console.log({fixedReducedMotion:true,centerOpensOutward:true});
