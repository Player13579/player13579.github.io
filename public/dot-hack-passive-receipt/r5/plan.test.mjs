import assert from 'node:assert/strict';
import {TYPE,LIFE,admit} from './plan.mjs';
import {Mesh,buildReceipt,fillSfx,notice,fixtureReceipt,receipt} from './effect.mjs';
const e={type:TYPE,id:'magic_fixture',variant:'vending',x:5,y:-3,at:1795792500000,playerId:'self',radius:124,durationMs:0},ctx={owner:'self',now:e.at};
const base=admit(e,ctx);assert.ok(base);assert.ok(receipt(fixtureReceipt('self')));
const alt=admit({...e,sourceId:'filtered',result:'irrelevant',count:36},ctx);assert.deepEqual(base,alt);
for(const q of [{type:'action-hack'},{type:'action-warp'},{type:'instant-fire-acquired'},{variant:'mystery-box'},{variant:'hacker'},{variant:''},{targetX:5},{targetY:5},{targetId:'other'},{playerId:'other'},{durationMs:1},{radius:125},{at:e.at-LIFE},{at:e.at+126},{id:'raw'}])assert.equal(admit({...e,...q},ctx),null);
let xy;
for(let t=-1;t<=LIFE;t++)for(const reduced of [false,true]){
 const m=new Mesh(),n=new Mesh(),r=buildReceipt(m,base,t,{reduced}),u=buildReceipt(n,alt,t,{reduced});
 const a=m.data.subarray(0,m.length);
 assert(a.every(Number.isFinite));assert.deepEqual(a,n.data.subarray(0,n.length));assert.equal(r.triangles,u.triangles);
 if(t<=26||t>=690){assert.equal(r.triangles,0);continue}
 assert.equal(r.triangles,60);
 const shape=[...a].filter((_,i)=>i%8<2);xy??=shape;assert.deepEqual(xy,shape);
}
assert(notice(174).lum>notice(480).lum);
for(const f of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(f,'vending',12);
 assert(data.every(Number.isFinite));assert(peak>.02&&peak<.15);assert.equal(Math.abs(data[0]),0);assert.equal(Math.abs(data.at(-1)),0);
}
console.log('1444 CPU phases; 15 rejects; fixed local shape; 60 triangles; non-rendered fields invariant; six audio rates.');
