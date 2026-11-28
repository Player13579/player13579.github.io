import {strict as a} from 'node:assert';
import {TYPE,LIFE,STATUS_MS,TIME_SCALE,admit,stateAt} from './plan.mjs';
const e={id:'magic_test',type:TYPE,variant:'',durationMs:8000,radius:150,playerId:'caster',targetId:'target',x:0,y:1,at:1795785600000}, ctx={viewer:'target',now:e.at};
a.deepEqual(admit(e,ctx),{id:e.id,at:e.at,x:0,y:1,age:0});
a.ok(admit({...e,playerId:'target'},ctx));
for (const patch of [
 {variant:'rational-natural-recovery-immune',durationMs:900},{variant:'rational-natural-recovery-immune'},
 {durationMs:900},{variant:undefined},{type:'gravity-accelerate'},{type:'gravity-time-keeper'},
 {type:'gravity-storm'},{id:'fake'},{radius:149},{x:NaN},{targetX:0},{targetY:0},
 {targetId:'other'},{playerId:''},{at:e.at-LIFE},{at:e.at+126}
]) a.equal(admit({...e,...patch},ctx),null);
a.equal(admit(e,{...ctx,viewer:'caster'}),null);
a.equal(admit(e,{...ctx,now:e.at+STATUS_MS}),null);
a.equal(STATUS_MS,8000);
a.equal(stateAt(200).localClockMs-stateAt(199).localClockMs,1);
a.ok(Math.abs((stateAt(500).localClockMs-stateAt(499).localClockMs)-TIME_SCALE)<1e-12);
for(const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const r=stateAt(t,{reduced});
 for(const v of [r.arrival,r.coupling,r.shift,r.alpha])a.ok(v>=0&&v<=1);
 if(t<=0||t>=LIFE)a.equal(r.alpha,0);
 if(reduced)a.equal(r.shift,0);
}
console.log('18 negative event/visibility/lifetime cases; actor-only projection, 2284 bounded time envelopes; 1→0.38 locally paced trajectory');
const {Mesh,buildReceipt,fillSfx,edgeOrigin,fixtureReceipt,receipt}=await import('./effect.mjs');
a.ok(receipt(fixtureReceipt('test')));
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const m=new Mesh(), v=buildReceipt(m,{},t,{reduced});
 a.ok(v.triangles<=96);
 a.ok(m.data.subarray(0,m.length).every(Number.isFinite));
 if(t<=0||t>=LIFE)a.equal(v.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);
 a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));
 a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('2282 finite GPU input meshes, six audio rates');

for(const lane of [0,1])for(let t=2;t<LIFE;t++)
 a.ok(edgeOrigin(t,lane)[0]>edgeOrigin(t-1,lane)[0]);
const slope=u=>edgeOrigin(530,u)[0]-edgeOrigin(529,u)[0];
a.ok(slope(0)>0&&slope(0)<slope(1)*.6);
a.deepEqual(edgeOrigin(220,0,{reduced:true}),edgeOrigin(620,0,{reduced:true}));
for(const t of [240,479,690]){
 const x=new Mesh(),y=new Mesh();buildReceipt(x,{caster:'one',tgtSpeed:1,duration:8000},t);buildReceipt(y,{caster:'two',tgtSpeed:155,duration:1000,hit:true},t);a.deepEqual(x.data,y.data);
}
console.log('two monotonic separate edges; low-motion geometry fixed; external cause/strength ignored');
