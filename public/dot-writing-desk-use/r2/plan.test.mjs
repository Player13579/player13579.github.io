import a from 'node:assert/strict';
import {admit,TYPE,DESK,LIFE,stateAt} from './plan.mjs';
import {fixtureReceipt,receipt,buildReceipt,Mesh,fillSfx} from './effect.mjs';
const e=fixtureReceipt(9),owner=e.playerId,now=e.at+2,ctx={owner,now},r=admit(e,ctx);
a.equal(e.type,TYPE);a.equal(e.objectId,DESK);a.deepEqual(r,{id:e.objectCausalId,at:e.at,age:2});
a.deepEqual(admit({...e,id:'magic_000000000010',gainMana:12,mp:7,x:888,y:999,viewerId:'other'},ctx),r,'same cause canonicalized independent of envelope id and payload');
for(const x of [{playerId:'other'},{type:'gain-luckBoost'},{effectKind:'stamina'},{type:'object-readingLamp'},{objectId:'v302-comms-antennaArray-2'},{objectCausalId:'map-object:another:object_use_000000000010'},{objectCausalId:'map-object:'+DESK+':object_use_1'},{objectCausalId:null},{variant:'another'},{radius:99},{durationMs:760},{targetId:'other'},{targetY:0},{at:now+1},{at:now-LIFE},{id:'fake'}])a.equal(admit({...e,...x},ctx),null);
a.ok(receipt(e));const content=(age,reduced)=>{const m=new Mesh(); const f=buildReceipt(m,r,age,{reduced});a.ok(f.triangles<=288);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));return Array.from(m.data.subarray(0,m.length));};
for (const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const q=stateAt(t,{reduced}),v=content(t,reduced);
 if(t<=0||t>=LIFE)a.equal(v.length,0);
 else for(let j=0;j<v.length;j+=8)a.ok(v[j]>-.2&&v[j]<.84&&v[j+1]>-.81&&v[j+1]<-.46);
 if(reduced&&t>0&&t<LIFE)a.equal(q.settle,1);
}
const span=(t,reduced)=>{const m=content(t,reduced);let lx=Infinity,hx=-Infinity;for(let i=0;i<m.length;i+=8)if(m[i+5]>.19){lx=Math.min(m[i],lx);hx=Math.max(m[i],hx);}return hx-lx;};
a.ok(span(250,false)>span(92,false)+.22);
a.ok(Math.abs(span(265,true)-span(390,true))<1e-7);
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.015&&peak<.08&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('16 rejected; 1224 shape states; cause canonicalization; bounded masked reflection; six PCM rates');
