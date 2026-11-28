import a from 'node:assert/strict';
import {admit,TYPE,DESK,LIFE,stateAt} from './plan.mjs';
import {fixtureReceipt,receipt,buildReceipt,Mesh,fillSfx} from './effect.mjs';
const e=fixtureReceipt(9),owner=e.playerId,now=e.at+2,ctx={owner,now},r=admit(e,ctx);
a.equal(e.type,TYPE);a.equal(e.objectId,DESK);a.deepEqual(r,{id:e.objectCausalId,at:e.at,age:2});
a.deepEqual(admit({...e,id:'magic_000000000010',gainMana:12,mp:7,x:888,y:999,viewerId:'other'},ctx),r,'same cause canonicalized independent of envelope id and payload');
for(const x of [{playerId:'other'},{type:'gain-luckBoost'},{effectKind:'stamina'},{type:'object-readingLamp'},{objectId:'v302-comms-antennaArray-2'},{objectCausalId:'map-object:another:object_use_000000000010'},{objectCausalId:'map-object:'+DESK+':object_use_1'},{objectCausalId:null},{variant:'another'},{radius:99},{durationMs:760},{targetId:'other'},{targetY:0},{at:now+1},{at:now-LIFE},{id:'fake'}])a.equal(admit({...e,...x},ctx),null);
a.ok(receipt(e));const content=(age,reduced)=>{const m=new Mesh(); const f=buildReceipt(m,r,age,{reduced});a.ok(f.triangles<=240);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));return Array.from(m.data.subarray(0,m.length));};
for (const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const q=stateAt(t,{reduced}),v=content(t,reduced);
 if(t<=0||t>=LIFE)a.equal(v.length,0);
 else for(let j=0;j<v.length;j+=8)a.ok(v[j]>.1&&v[j]<.84&&v[j+1]>-.8&&v[j+1]<-.48);
 if(reduced&&t>0&&t<LIFE)a.equal(q.settle,1);
}
const xs=(t,reduced)=>{const m=content(t,reduced);let x=0,z=0; for(let i=0;i<m.length;i+=8){x+=m[i]*m[i+5];z+=m[i+5];}return x/z;};
a.ok(xs(350,false)>xs(140,false)+.07);a.ok(Math.abs(xs(350,true)-xs(140,true))<1e-7);
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.015&&peak<.08&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('16 rejected; 1224 shape states; cause canonicalization; bounded masked reflection; six PCM rates');
