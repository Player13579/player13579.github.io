import {strict as a} from 'node:assert';
import {TYPE,LIFE,admit,stateAt} from './plan.mjs';
const e={type:TYPE,id:'magic_release',variant:'throw:remaining-ec-5',x:12,y:34,at:1795786500000,targetId:'',targetX:45,targetY:67,playerId:'fixture',radius:92,durationMs:520},ctx={owner:'fixture',now:e.at};
a.deepEqual(admit(e,ctx),{id:e.id,at:e.at,x:12,y:34,age:0,liveMs:520});
a.deepEqual(admit({...e,variant:'throw:remaining-ec-123',targetX:45e3},ctx),admit(e,ctx));
a.equal(admit({...e,durationMs:920},ctx).liveMs,LIFE);
for(const p of [{type:'fighter-energy-impact'},{type:'action-item-throw'},{type:'fighter-energy-charge'},{type:'gbo-overdrive'},{variant:'throw'},{variant:'throw:remaining-ec--1'},{radius:90},{playerId:'other'},{targetId:'another'},{targetX:undefined},{durationMs:239},{durationMs:241.5},{durationMs:921},{at:e.at-520},{at:e.at+126}])a.equal(admit({...e,...p},ctx),null);
for(const dur of [240,320,540])for(const reduced of [false,true])for(let t=-1;t<=dur;t++){
 const q=stateAt(t,dur,{reduced});
 for(const prop of ['alpha','fold','shift'])a.ok(q[prop]>=0&&q[prop]<=1);
 if(t<=0||t>=dur)a.equal(q.alpha,0);
 if(reduced)a.equal(q.shift,0);
}
console.log('15 excluded inputs; EC amount and destination do not enter the effect; six bounded timelines');
const {receipt,fixtureReceipt,Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
a.ok(receipt(fixtureReceipt('test')));
for(const liveMs of [240,320,540])for(const reduced of [false,true])for(let t=0;t<=liveMs;t++){
 const m=new Mesh(),v=buildReceipt(m,{liveMs},t,{reduced});a.ok(v.triangles<=144);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));
 if(t<=0||t>=liveMs)a.equal(v.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('2206 finite meshes and six sample rates');
