import assert from 'node:assert/strict';
import {receipt,fixtureReceipt,Mesh,buildReceipt,LIFE,fillSfx} from './effect.mjs';
const f=fixtureReceipt(10), e=f.event, now=f.observedAt, v=receipt(f,now);
assert(v);
for(const o of [
 {type:'emp'},{type:'emp-resonance'},{variant:'normal'},{variant:'same'},{radius:0},{durationMs:1},
 {empCausalId:'interaction:resonance:fixture-east:fixture-west'},{empCausalId:'interaction:cancel:x:y'},{empCausalId:undefined},
 {resolvedEmpPulseIds:['same','same']},{resolvedEmpPulseIds:['fixture-east']},{resolvedEmpPulseIds:[]},
 {empSourceAxis:Infinity},{empSourceAxis:7},{at:now+1},{at:now-LIFE},
])assert.equal(receipt({...f,event:{...e,...o}},now),null);
for(const o of [{stale:true},{phase:'ended'},{source:'local-suggestion'}])assert.equal(receipt({...f,...o},now),null);
function shape(t,reduced=false,r=v){
 const mesh=new Mesh(),summary=buildReceipt(mesh,r,t,{reduced}),data=Array.from(mesh.data.subarray(0,mesh.length));
 assert(data.every(Number.isFinite));return {summary,data,positions:data.filter((_,i)=>i%8<2)};
}
for(const reduced of [true,false])for(let t=-1;t<=LIFE;t++)assert.equal(shape(t,reduced).summary.triangles,t>0&&t<LIFE?72:0);
assert.notDeepEqual(shape(120).positions,shape(500).positions);
assert.deepEqual(shape(500).positions,shape(850).positions);
assert.deepEqual(shape(120,true).positions,shape(500,true).positions);
const unpack=d=>d.positions.flatMap((x,i)=>i%2?[]:[Math.cos(v.axis)*x+Math.sin(v.axis)*d.positions[i+1]]);
for(const side of [-1,1]){
 const X=unpack(shape(120)).filter(x=>x*side>0), Y=unpack(shape(500)).filter(x=>x*side>0);
 assert.equal(Math.max(...X.map(Math.abs)),Math.max(...Y.map(Math.abs))); // outer edge invariant
 assert(Y.some((x,i)=>Math.abs(X[i]-x)>.35)); // genuine pocket formation
}
for(const t of [100,300,550]){
 for(const num of [0,999])assert.deepEqual(shape(t,false,receipt({...f,event:{...e,damage:num,affectedPlayers:num,ownerId:'hidden'}},now)),shape(t));
 const inv=receipt({...f,event:{...e,resolvedEmpPulseIds:[...e.resolvedEmpPulseIds].reverse(),empSourceAxis:e.empSourceAxis+Math.PI}},now);
 assert(inv);assert.deepEqual(shape(t,false,inv),shape(t));
}
for(const r of [22050,32000,44100,48000,88200,96000]){const o=fillSfx(r);assert(o.data.every(Number.isFinite)&&o.peak>0);}
console.log('19 rejects, 2004 finite mesh cases, fixed outer perimeter, notch t500, reduced static, exchange and outcome invariance, 6 audio rates PASS');
