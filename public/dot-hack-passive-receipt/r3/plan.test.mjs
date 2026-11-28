import {strict as a} from 'node:assert';
import {TYPE,LIFE,admit,stateAt} from './plan.mjs';
const at=1795779900000,e={id:'magic_local',type:TYPE,variant:'vending',playerId:'self',radius:124,durationMs:0,x:1,y:2,at},ctx={owner:'self',now:at};
a.deepEqual(admit(e,ctx),{id:e.id,x:1,y:2,at,age:0});
for(const p of [{type:'hacker-root'},{type:'action-vending'},{type:'hacker-status-recover'},{type:'action-vibe-coding'},{variant:'hacker-generation'},{playerId:'other'},{radius:123},{targetX:0},{targetId:'other'},{durationMs:LIFE},{at:at-LIFE},{at:at+126}])a.equal(admit({...e,...p},ctx),null);
for(const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const q=stateAt(t,{reduced});for(const x of [q.open,q.alpha,q.core])a.ok(x>=0&&x<=1);
 if(t<0||t>=690)a.equal(q.alpha,0);
}
console.log('exact fictional vending receipt, actor-only, excluded reuse of other actions and 1444 bounded time samples');
const {Mesh,buildReceipt,fillSfx,creasePoints}=await import('./effect.mjs');
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const m=new Mesh(),z=buildReceipt(m,{},t,{reduced});a.ok(z.triangles<=24);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));if(t>=690)a.equal(z.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate,'vending',9);a.ok(peak>.03&&peak<.36&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('1442 meshes and six audio sample rates');

const poly=t=>creasePoints(stateAt(t).folds);
a.deepEqual(poly(175)[0],poly(320)[0]);a.notDeepEqual(poly(175),poly(320));
a.deepEqual(creasePoints(stateAt(70,{reduced:true}).folds),creasePoints(stateAt(320,{reduced:true}).folds));
for(let t=0;t<LIFE;t++){
 const p=poly(t);
 for(let i=1;i<p.length;i++){a.ok(Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1])>.11);a.ok(p[i][0]>.27&&p[i][0]<.75&&p[i][1]>p[i-1][1]);}
}
console.log('pinned continuous crease, ordered directional change, reduced-motion geometry static');
