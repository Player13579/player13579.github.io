import {strict as a} from 'node:assert';
import {TYPE,LIFE,admit,stateAt} from './plan.mjs';
const e={type:TYPE,id:'magic_source',variant:'',x:12,y:34,at:1795792500000,targetId:'',targetX:700,targetY:400,playerId:'fixture',radius:125,durationMs:0},ctx={owner:'fixture',now:e.at};
const out=admit(e,ctx);a.deepEqual(out,{id:e.id,at:e.at,x:12,y:34,age:0});
a.deepEqual(admit({...e,targetX:5,targetY:11,remainingCharges:3},ctx),out);
for(const p of [{variant:'arrival'},{variant:'grant'},{type:'teleport-map-scroll-acquired'},{type:'action-teleport'},{type:'action-heart-teleport'},{playerId:'other'},{targetX:null},{targetY:Infinity},{targetId:'other'},{radius:124},{durationMs:200},{id:'abc'},{at:e.at-LIFE},{at:e.at+126}])a.equal(admit({...e,...p},ctx),null);
const {receipt,fixtureReceipt,Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
a.ok(receipt(fixtureReceipt('test')));
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const m=new Mesh(),v=buildReceipt(m,{},t,{reduced}),r=stateAt(t,{reduced});
 for(const k of ['spread','hold','alpha'])a.ok(r[k]>=0&&r[k]<=1);
 a.ok(v.triangles<=170);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));
 if(t<=0||t>=LIFE)a.equal(v.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('14 excluded sources; destination stripped; 1842 finite meshes and six audio sample rates');
