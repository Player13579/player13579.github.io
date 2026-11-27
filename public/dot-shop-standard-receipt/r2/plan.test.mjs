import {strict as a} from 'node:assert';
import {TYPE,LIFE,admit,stateAt} from './plan.mjs';
const t=1795795800000;
const e={type:TYPE,id:'magic_test',radius:90,variant:'',durationMs:0,targetId:'',targetX:null,targetY:null,x:12,y:15,at:t,playerId:'fixture'};
const ctx={owner:'fixture',now:t};const out=admit(e,ctx);
a.deepEqual(out,{id:e.id,at:t,x:12,y:15,age:0});
a.deepEqual(admit({...e,spent:120,quantity:6,remainingCredits:8,itemId:'arbitrary'},ctx),out);
for(const p of [{type:'mystery-reveal'},{type:'action-item-pickup'},{type:'gain-credits'},{type:'instant-fire-acquired'},{variant:'shop-ability:common:dodge',radius:96},{radius:96},{variant:'vending'},{playerId:'other'},{targetX:0},{targetId:'b'},{durationMs:600},{id:'fake'},{at:t-LIFE},{at:t+126}])a.equal(admit({...e,...p},ctx),null);
for(const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const q=stateAt(t,{reduced});
 for(const k of ['alpha','settle','pulse'])a.ok(q[k]>=0&&q[k]<=1);
 if(t<=0||t>=LIFE)a.equal(q.alpha,0);
}
console.log('14 excluded cases; item, price, count and balance do not change the receipt; 1564 time states');
const {receipt,fixtureReceipt,Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
a.ok(receipt(fixtureReceipt('test')));
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const m=new Mesh(),v=buildReceipt(m,{},t,{reduced});a.ok(v.triangles<=156);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));
 if(t<=0||t>=LIFE)a.equal(v.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('1562 finite meshes and six audio rates');
