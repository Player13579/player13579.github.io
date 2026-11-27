import {strict as a} from 'node:assert';
import {admit,LIFE,stateAt} from './plan.mjs';
const id0={id:'task_01',type:'download',stationId:'s0',done:true},id1={id:'task_02',type:'upload',stationId:'s1',done:false};
const b={roomId:'fixture-room',selfId:'fixture-self',round:1,battleStartedAt:100,phase:'playing',serverNow:200,tasks:[id0,id1]};
const n={...b,serverNow:210,tasks:[{...id1,done:true},id0]};
const e={type:'action-task',radius:105,variant:'',mode:'upload',playerId:b.selfId,targetId:id1.stationId,at:205};
const x={source:'same-session-state',stale:false,sequence:5,currentSequence:5,observedAt:1200,before:b,after:n,event:e};
const o={round:1,sequence:5,at:1200};a.deepEqual(admit(x),o);
a.deepEqual(admit({...x,event:{...e,variant:'hacker-auto',targetX:30,targetY:70,reward:50},after:{...n,totalScore:999}}),o);
for(const y of [{source:'boot'},{source:'reconnect'},{stale:true},{currentSequence:6},{after:{...n,selfId:'someone-else'}},{after:{...n,roomId:'other'}},{after:{...n,round:2}},{after:{...n,battleStartedAt:101}},{after:{...n,phase:'ended'}},{before:{...b,tasks:n.tasks}},{before:{...b,tasks:[{...id0,done:false},id1]}},{after:{...n,tasks:[id0,{...id1,id:'different',done:true}]}},{after:{...n,tasks:[id0,id0]}},{event:{...e,at:199}},{event:{...e,at:211}},{event:{...e,targetId:'other'}},{event:{...e,mode:'download'}},{event:{...e,variant:'wrong'}},{event:{...e,playerId:'other'}},{event:null}])a.equal(admit({...x,...y}),null);
for(const reduced of [false,true])for(let t=-1;t<=LIFE;t++){const f=stateAt(t,{reduced});a.ok(Object.values(f).every(y=>Number.isFinite(y)&&y>=0&&y<=1));if(t<=0||t===LIFE)a.equal(f.alpha,0);}
console.log('20 exclusions, 1,804 state envelopes; private task list only, ordinary/auto are presentation-invariant');
const {receipt,fixtureReceipt,Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
a.ok(receipt(fixtureReceipt(1)));
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const g=new Mesh(),v=buildReceipt(g,{},t,{reduced});a.ok(v.triangles<=140);a.ok(g.data.subarray(0,g.length).every(Number.isFinite));
 if(t<=0||t>=LIFE)a.equal(v.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('1802 finite meshes; six audio rates');
