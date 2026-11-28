import assert from 'node:assert/strict';
import {receipt,fixtureReceipt,buildReceipt,Mesh,fillSfx,LIFE} from './effect.mjs';
const f=fixtureReceipt(3),v=receipt(f,f.observedAt);assert(v);
for(const e of [{variant:'mineral-water:use'},{variant:'flora'},{variant:'mystery:energy-surge'},{type:'status-burn-cleared'},{type:'action-item-throw'},{effectKind:'heal'},{playerId:'other'},{durationMs:1400},{radius:135},{at:f.observedAt+8},{at:f.observedAt-5000}])assert.equal(receipt({...f,event:{...f.event,...e}},f.observedAt),null);
for(const x of [{stale:true},{phase:'meeting'},{source:'local-guess'},{selfId:'other'}])assert.equal(receipt({...f,...x},f.observedAt),null);
for(const extra of [{amount:0,sourcePlayerId:'a',targetX:125},{amount:999,sourcePlayerId:'b',targetX:-99}])assert.deepEqual(receipt({...f,event:{...f.event,...extra}},f.observedAt),v);
for(const reduced of [true,false]) for(let t=0;t<=LIFE;t++){
 const g=new Mesh(),r=buildReceipt(g,v,t,{reduced});assert(g.data.subarray(0,g.length).every(Number.isFinite));for(let i=0;i<g.length;i+=8){assert(g.data[i]>.22&&g.data[i]<.73);assert(g.data[i+1]<-.60&&g.data[i+1]>-1.20)}
 assert.equal(r.triangles,t===0||t===LIFE?0:320);
}
import {createHash} from 'node:crypto';
const b=fixtureReceipt(4),other=receipt({...b,event:{...b.event,amount:400,sourcePlayer:'would-not-affect',targetX:20,extinguished:true,success:true}},b.observedAt),same=receipt(b,b.observedAt);
assert.deepEqual(other,same);
let unchanged=0;
for(const t of [1,70,132,180,245,313,420,532,710,930,1059]) for(const reduced of [false,true]) {
 const g=new Mesh(),h=new Mesh();buildReceipt(g,other,t,{reduced});buildReceipt(h,same,t,{reduced});
 assert.deepEqual(g.data,h.data);unchanged++;
}
const a=new Mesh(),end=new Mesh();
buildReceipt(a,same,190,{reduced:true});buildReceipt(end,same,440,{reduced:true});
for(let i=0;i<a.length;i+=8)assert.deepEqual(a.data.slice(i,i+2),end.data.slice(i,i+2));
const snd=fillSfx(48000).data;
const a48=createHash('sha256').update(Buffer.from(snd.buffer)).digest('hex');
console.log(JSON.stringify({geometryBudget:320,fieldsNotRead:unchanged,firstSoundMs:44,soundDurationMs:960,waveformSha256At48k:a48}));
for(const rate of [22050,32000,44100,48000,88200,96000]){const {data,peak}=fillSfx(rate);assert(peak>.02&&peak<.16);assert.equal(data[0],0);assert.equal(data.at(-1),0)}
console.log('15 rejects, 2122 mesh samples and 6 audio rates passed');
