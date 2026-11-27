import {strict as a} from 'node:assert';
import {admit,LIFE,stateAt} from './plan.mjs';
const before={roomId:'fixture-room',selfId:'fixture-self',round:7,phase:'playing'};
const after={...before,phase:'ended',winner:'defenders'};
const q={source:'same-session-state',stale:false,sequence:12,currentSequence:12,observedAt:1200,before,after};
const r={round:7,sequence:12,at:1200};a.deepEqual(admit(q),r);
for(const winner of ['attackers','idea'])a.deepEqual(admit({...q,after:{...after,winner,results:[{private:'ignored'}],finishReason:'ignored'}},),r);
a.deepEqual(admit({...q,before:{...before,phase:'meeting'}},),r);
for(const patch of [{source:'boot'},{stale:true},{currentSequence:13},{after:{...after,winner:'none'}},{after:{...after,winner:null}},{after:{...after,phase:'playing'}},{before:after},{before:{...before,phase:'lobby'}},{after:{...after,roomId:'other'}},{after:{...after,selfId:'other'}},{after:{...after,round:8}},{observedAt:Infinity},{after:null}])a.equal(admit({...q,...patch}),null);
for(const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const v=stateAt(t,{reduced});for(const x of ['alpha','pinch','rest'])a.ok(v[x]>=0&&v[x]<=1);
 if(t<=0||t>=LIFE)a.equal(v.alpha,0);
}
console.log('13 exclusions; supported verdict categories render identically; 2044 finite time envelopes');
const {receipt,fixtureReceipt,Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
a.ok(receipt(fixtureReceipt(1)));
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const g=new Mesh(),v=buildReceipt(g,{},t,{reduced});a.ok(v.triangles<=270);a.ok(g.data.subarray(0,g.length).every(Number.isFinite));
 if(t<=0||t>=LIFE)a.equal(v.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('2042 finite meshes, six audio rates');
