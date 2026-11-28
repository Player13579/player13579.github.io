import {strict as a} from 'node:assert';
import {TYPE,LIFE,admit,stateAt} from './plan.mjs';
const at=1795782600000,e={id:'magic_local',type:TYPE,variant:'100',playerId:'fixture',radius:138,durationMs:0,x:1,y:2,at},ctx={owner:'fixture',now:at};
a.deepEqual(admit(e,ctx),{id:e.id,x:1,y:2,at,age:0});
for(const p of [{type:'fighter-energy-charge'},{type:'fighter-energy-destruction-slash'},{type:'action-mana'},{type:'instant-iai-acquired'},{variant:'500'},{variant:'1000'},{variant:100},{playerId:'other'},{radius:139},{targetX:0},{targetId:'other'},{durationMs:LIFE},{at:at-LIFE},{at:at+126}])a.equal(admit({...e,...p},ctx),null);
for(const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const q=stateAt(t,{reduced});for(const x of [q.travel,q.alpha,q.join])a.ok(x>=0&&x<=1);
 if(t<0||t>=695)a.equal(q.alpha,0);
}
console.log('exact EC100 actor only, 14 other sources/edge cases excluded, 1444 time envelopes');
const {Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const m=new Mesh(),z=buildReceipt(m,{},t,{reduced});a.ok(z.triangles<=100);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));if(t>=695)a.equal(z.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate,'100',9);a.ok(peak>.03&&peak<.36&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('1442 meshes and six audio sample rates');

for(const t of [56,160,380])for(const reduced of [false,true]){
 const a0=new Mesh(),b0=new Mesh();buildReceipt(a0,{amount:1},t,{reduced});buildReceipt(b0,{amount:999,reserve:500,hp:0,targetId:'other'},t,{reduced});a.deepEqual(a0.data,b0.data);
}
const {seamPoint,waistLight}=await import('./effect.mjs');
for(const v of [0,.39,1])for(let i=1;i<=100;i++)
 a.ok(seamPoint(i/100,v)[1]<seamPoint((i-1)/100,v)[1]);
a.ok(waistLight(100,.2)>waistLight(100,.85)*4);
a.ok(waistLight(300,.85)>waistLight(100,.85));
for(const t of [120,300,400])a.ok(waistLight(t,.62,{reduced:true})>0);
console.log('waist-first, collar-later; monotone body seam; abstract local amount-invariant geometry');
