import a from 'node:assert/strict';
import {admit,TYPE,LAMP,LIFE,stateAt} from './plan.mjs';
import {fixtureReceipt,receipt,buildReceipt,Mesh,fillSfx} from './effect.mjs';
const e=fixtureReceipt(9),owner=e.playerId,now=e.at+2,ctx={owner,now},r=admit(e,ctx);
a.equal(e.type,TYPE);a.equal(e.objectId,LAMP);a.deepEqual(r,{id:e.objectCausalId,at:e.at,age:2});
a.deepEqual(admit({...e,id:'magic_000000000010',gainMana:12,mp:7,x:888,y:999,viewerId:'other'},ctx),r,'same cause canonicalized independent of envelope id and payload');
for(const x of [{playerId:'other'},{type:'gain-mana'},{effectKind:'stamina'},{type:'object-bookshelf'},{objectId:'v302-observatory-readingLamp-2'},{objectCausalId:'map-object:another:object_use_000000000010'},{objectCausalId:'map-object:'+LAMP+':object_use_1'},{objectCausalId:null},{variant:'another'},{radius:99},{durationMs:760},{targetId:'other'},{targetY:0},{at:now+1},{at:now-LIFE},{id:'fake'}])a.equal(admit({...e,...x},ctx),null);
a.ok(receipt(e));const content=(age,reduced)=>{const m=new Mesh(); const f=buildReceipt(m,r,age,{reduced});a.ok(f.triangles<=160);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));return Array.from(m.data.subarray(0,m.length));};
for (const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const q=stateAt(t,{reduced}),v=content(t,reduced);
 if(t<=0||t>=LIFE)a.equal(v.length,0);
 else for(let j=0;j<v.length;j+=8)a.ok(Math.abs(v[j])<.44&&v[j+1]>-.82&&v[j+1]<-.32);
 if(reduced&&t>0&&t<LIFE)a.ok(Math.abs(q.far/q.near-.94)<1e-12);
}
const support=(t,reduced)=>{const m=content(t,reduced);let left=0,right=0,center=0;for(let i=0;i<m.length;i+=8){if(m[i]<-.04)left+=m[i+5];else if(m[i]>.04)right+=m[i+5];else center+=m[i+5];}return {left,right,center};};
for(const [t,L,R] of [[90,true,false],[320,true,true],[560,false,true]]){
 const {left,right,center}=support(t,false);a.equal(left>0,L);a.equal(right>0,R);a.equal(center,0,'the inner faces never join');
}
for(const t of [90,320,560]){const {left,right,center}=support(t,true);a.ok(left>0&&right>0);a.equal(center,0);}
const geom=(a)=>a.filter((_,i)=>i%8<2);a.deepEqual(geom(content(90,false)),geom(content(560,false)));
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.015&&peak<.08&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('16 rejected; 1524 shape states; cause canonicalization; bounded masked reflection; six PCM rates');
