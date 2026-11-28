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
 const g=new Mesh(),v=buildReceipt(g,{},t,{reduced});a.ok(v.triangles<=40);a.ok(g.data.subarray(0,g.length).every(Number.isFinite));
 if(t<=0||t>=LIFE)a.equal(v.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('1842 finite meshes; six audio rates');
const sample=(t,reduced=false)=>{const g=new Mesh(),q=buildReceipt(g,{},t,{reduced});const verts=[];for(let i=0;i<g.length;i+=8)verts.push([g.data[i],g.data[i+1]]);return {q,verts};};
const start=sample(65),middle=sample(175),stopped=sample(345),held=sample(720);
const endPts=v=>v.verts.filter(([x])=>Math.abs(x+.02)>.4);
const mid=v=>Math.min(...v.verts.filter(([x])=>Math.abs(x+.02)<.01).map(([,y])=>y));
a.deepEqual(endPts(start),endPts(middle));a.deepEqual(endPts(start),endPts(stopped));
a.deepEqual(start.verts.map(([x])=>x),stopped.verts.map(([x])=>x));
a.ok(mid(start)>mid(middle)&&mid(middle)>mid(stopped));
a.deepEqual(stopped.verts,held.verts);
a.deepEqual(sample(65,true).verts,sample(650,true).verts);
a.equal(sample(910).q.stage,'held');a.equal(sample(920).q.stage,'off');
for(const t of [92,154,214,291,392,498,650,880])for(const reduced of [true,false]){
 const one=new Mesh(),two=new Mesh();
 buildReceipt(one,r,t,{reduced});
 const extra=admit({...e,items:['x'],playerX:-100,targetId:'other',empCausalId:'ignored'},'fixture',20);
 buildReceipt(two,extra,t,{reduced});
 a.deepEqual(one.data,two.data);
}
console.log('fixed endpoints and width, center rises and holds through fade; reduced stationary; 16 irrelevant-field comparisons');
