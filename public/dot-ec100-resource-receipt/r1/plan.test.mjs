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
 const m=new Mesh(),z=buildReceipt(m,{},t,{reduced});a.ok(z.triangles<=224);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));if(t>=695)a.equal(z.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate,'100',9);a.ok(peak>.03&&peak<.36&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('1442 meshes and six audio sample rates');
