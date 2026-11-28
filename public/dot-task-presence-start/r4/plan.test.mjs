import a from 'node:assert/strict';
import {admit,stateAt} from './plan.mjs';
import {buildPresence} from './mesh.mjs';
import {fillSfx} from './sfx.mjs';
const p={id:'self',role:'defender',special:'fighter',alive:true,ejected:false,inVent:false,taskPresenceTaskId:'t',taskPresenceSince:1000,tasks:[{id:'t',done:false}]};
const d={roomId:'r',phase:'playing',selfId:'self',self:p};
const input={source:'self-task-presence-replay',stale:false,viewerId:'self',observedAt:1070,snapshot:d};
const r=admit(input);a.ok(r);
for(const m of [{role:'attacker'},{special:'alchemist'},{special:'hacker'},{alive:false},{ejected:true},{inVent:true},{taskPresenceTaskId:''},{taskPresenceSince:0},{taskPresenceSince:1200},{tasks:[]},{tasks:[{id:'t',done:true}]}])
 a.equal(admit({...input,snapshot:{...d,self:{...p,...m}}}),null);
for(const m of [{viewerId:'other'},{stale:true},{observedAt:2200},{source:'completed-event'}])a.equal(admit({...input,...m}),null);
const s=admit({...input,snapshot:{...d,self:{...p,taskCoords:[1,2],credits:999,tasks:[{id:'t',done:false,type:'upload',stationId:'hide'}]}}});
a.deepEqual(r,s);
let frames=0;
for(const reduced of [false,true]){
 for(let t=-1;t<=1201;t++)a.ok(Object.values(stateAt(t,{reduced})).every(x=>x>=0&&x<=1));
 for(let t=5;t<1200;t+=5){
  const v=buildPresence(r,t,{reduced});a.deepEqual(v,buildPresence(s,t,{reduced}));a.equal(v.length,2304);
  a.ok(v.every(Number.isFinite));
  for(let k=0;k<v.length;k+=8)a.ok(v[k]>-.95&&v[k]<-.30&&v[k+1]>-.22&&v[k+1]<.23);
  frames++;
 }
 a.equal(buildPresence(r,1200,{reduced}).length,0);
}
for(const rate of [8000,22050,24000,44100,48000,96000]){const {data,peak}=fillSfx(rate);a.ok(data.every(Number.isFinite));a.equal(data[0],0);a.equal(data.at(-1),0);a.ok(peak>=.02&&peak<=.09)}
console.log({shapes:frames,states:2406,rejected:15,audioRates:6});
const mesh=(t,reduced=false)=>buildPresence(r,t,{reduced});
const geo=m=>[...m].filter((_,i)=>i%8<2);
const span=(m,x)=>{let low=1,high=-1;for(let i=0;i<m.length;i+=8)if(Math.abs(m[i]-x)<.001){low=Math.min(low,m[i+1]); high=Math.max(high,m[i+1]);}return [(low+high)/2,high-low]};
const centers=t=>[-.946,-.627,-.308].map(x=>span(mesh(t),x));
const early=centers(160), late=centers(500);
a.ok(early[0][0]<early[1][0]&&early[1][0]<early[2][0]);
for(let i=0;i<3;i++){a.ok(Math.abs(late[i][0]-.012)<.000001);a.ok(Math.abs(early[i][1]-late[i][1])<.000001);}
a.deepEqual(geo(mesh(500)),geo(mesh(950)));
a.deepEqual(geo(mesh(160,true)),geo(mesh(950,true)));
console.log({fixedCenterAndWidth:true,stationaryCrossSectionThickness:true,reducedFixed:true,normalSlopeSettles:true});
