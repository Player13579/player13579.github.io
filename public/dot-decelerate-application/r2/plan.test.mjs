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
const {Mesh,buildReceipt,fillSfx,fixtureReceipt,receipt}=await import('./effect.mjs');
a.ok(receipt(fixtureReceipt('test')));
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const m=new Mesh(), v=buildReceipt(m,{},t,{reduced});
 a.ok(v.triangles<=144);
 a.ok(m.data.subarray(0,m.length).every(Number.isFinite));
 if(t<=0||t>=LIFE)a.equal(v.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);
 a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));
 a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('2282 finite GPU input meshes, six audio rates');
const {phasePosition}=await import('./plan.mjs');
a.ok(Math.abs(phasePosition(.61)-phasePosition(.60)-.0038)<1e-12);
a.ok(Math.abs(phasePosition(.18)-phasePosition(.17)-.01)<1e-12);
let last=-Infinity;
for(let c=-.01;c<2.1;c+=.002){const x=phasePosition(c);a.ok(x>last);last=x;}
console.log('phase crests slow through the central field without stopping or reversing');
