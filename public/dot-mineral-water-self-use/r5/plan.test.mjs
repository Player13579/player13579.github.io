import assert from 'node:assert/strict';
import {receipt,fixtureReceipt,buildReceipt,Mesh,fillSfx,LIFE} from './effect.mjs';
const f=fixtureReceipt(3),v=receipt(f,f.observedAt);assert(v);
for(const e of [{variant:'mineral-water:thrown'},{variant:'flora'},{variant:'mystery:energy-surge'},{type:'status-burn-cleared'},{type:'action-item-throw'},{effectKind:'heal'},{playerId:'other'},{durationMs:1400},{radius:135},{at:f.observedAt+8},{at:f.observedAt-5000}])assert.equal(receipt({...f,event:{...f.event,...e}},f.observedAt),null);
for(const x of [{stale:true},{phase:'meeting'},{source:'local-guess'},{selfId:'other'}])assert.equal(receipt({...f,...x},f.observedAt),null);
for(const extra of [{amount:0,sourcePlayerId:'a',targetX:125},{amount:999,sourcePlayerId:'b',targetX:-99}])assert.deepEqual(receipt({...f,event:{...f.event,...extra}},f.observedAt),v);
for(const reduced of [true,false]) for(let t=0;t<=LIFE;t++){
 const g=new Mesh(),r=buildReceipt(g,v,t,{reduced});assert(g.data.subarray(0,g.length).every(Number.isFinite));assert((t<=125||t>=900)?r.triangles===0:r.triangles===45);
}
for(const rate of [22050,32000,44100,48000,88200,96000]){const {data,peak}=fillSfx(rate);assert(peak>.02&&peak<.16);assert.equal(data[0],0);assert.equal(data.at(-1),0)}
console.log('15 rejects, 2122 mesh samples and 6 audio rates passed');

const {stateAt}=await import('./plan.mjs');
assert(stateAt(200).lift===1&&stateAt(810).lift===1);
assert.deepEqual([200,330,498,650,810].map(t=>stateAt(t).roll),[0,stateAt(330).roll,stateAt(498).roll,1,1]);
assert(stateAt(330).roll>0&&stateAt(498).roll>stateAt(330).roll);
const held=[214,330,498,650,810].map(t=>buildReceipt(new Mesh(),v,t));
assert.ok(held.every(h=>h.contact.every((v,j)=>v===held[0].contact[j])&&h.p.every((v,j)=>v===held[0].p[j])));
function geometry(t,reduced=false){const g=new Mesh();buildReceipt(g,v,t,{reduced});return Array.from(g.data.subarray(0,g.length)).filter((_,i)=>i%8<2);}
assert.notDeepEqual(geometry(214),geometry(650));
assert.deepEqual(geometry(650),geometry(810));
assert.deepEqual(geometry(214,true),geometry(650,true));
const diameter=t=>{const v=geometry(t).slice(0,24);const u=v.map((_,i)=>i%2?0:(v[i]*Math.cos(-1.29)+v[i+1]*Math.sin(-1.29)));const p=u.filter((_,i)=>!(i%2));return Math.max(...p)-Math.min(...p);};
assert.ok(diameter(650)<.5*diameter(214));
for(const t of [154,390,650])for(const reduced of [true,false]){
 const a=new Mesh(),b=new Mesh();buildReceipt(a,{amount:0,cleared:true},t,{reduced});buildReceipt(b,{amount:900,cleared:false,targetId:'other'},t,{reduced});assert.deepEqual(a.data,b.data);
}
console.log('fixed grip and mouth, one-way axial face roll, reduced static, and outcome metadata invariant');
const {basis,drawFixture}=await import('./effect.mjs');
for(const reduced of [false,true]){
 const a=new Mesh(),b=new Mesh();
 drawFixture(a,basis(v,0,reduced),[]);drawFixture(b,basis(v,LIFE,reduced),[]);
 assert.equal(a.length,b.length);assert.deepEqual(a.data,b.data);
}
console.log('exact idle-pose geometry restored at terminal time');
