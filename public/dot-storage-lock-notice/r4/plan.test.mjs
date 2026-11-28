import {strict as a} from 'node:assert';
import {admit,stateAt,LIFE} from './plan.mjs';
const e={type:'emp-storage-lock',variant:'storage',durationMs:7000,radius:105,playerId:'fixture',id:'fixture_1',at:10};
const r=admit(e,'fixture',20);a.deepEqual(r,{id:'fixture_1',at:10,age:10});
for(const payload of [{x:100,y:3,empCausalId:'other'}, {targetId:'other',items:[4,5,6],count:320,outcome:'other',direction:[1,-1]}])a.deepEqual(admit({...e,...payload},'fixture',20),r);
for(const bad of [{type:'emp'},{type:'emp-cancel'},{type:'emp-resonance'},{type:'status-poison'},{durationMs:7200},{radius:111},{variant:'other'},{playerId:'other'},{id:''},{at:21},{at:Infinity}])a.equal(admit({...e,...bad},'fixture',20),null);
a.equal(admit(e,'fixture',930),null);
for(const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const q=stateAt(t,{reduced});
 for(const [k,v] of Object.entries(q))a.ok(Number.isFinite(v)&&v>=0&&v<=1,k);
 if(t<=0||t===LIFE)a.equal(q.alpha,0);
 if(reduced)a.equal(q.closure,1);
}
console.log('12 rejects; coordinate/cause/inventory excluded; 1,844 finite envelopes');
const {receipt,fixtureReceipt,Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
a.ok(receipt(fixtureReceipt(1)));
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const g=new Mesh(),v=buildReceipt(g,{},t,{reduced});a.ok(v.triangles<=70);a.ok(g.data.subarray(0,g.length).every(Number.isFinite));
 if(t<=0||t>=LIFE)a.equal(v.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('1842 finite meshes; six audio rates');
const sample=(t,reduced=false)=>{const g=new Mesh(),q=buildReceipt(g,{},t,{reduced});let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(let i=0;i<g.length;i+=8){minX=Math.min(minX,g.data[i]);maxX=Math.max(maxX,g.data[i]);minY=Math.min(minY,g.data[i+1]);maxY=Math.max(maxY,g.data[i+1])}return {q,box:[minX,maxX,minY,maxY]};};
const start=sample(65),middle=sample(160),stopped=sample(345),held=sample(720);
a.deepEqual(start.box,held.box);a.deepEqual(middle.box,stopped.box);
a.ok(start.q.progress<middle.q.progress&&middle.q.progress<stopped.q.progress);
a.equal(stopped.q.progress,1);a.equal(held.q.progress,1);
a.equal(sample(65,true).q.progress,1);
a.equal(sample(910).q.stage,'stop');a.equal(sample(920).q.stage,'off');
console.log('stationary silhouette; monotonic partial traverse → hold → non-semantic clear');
