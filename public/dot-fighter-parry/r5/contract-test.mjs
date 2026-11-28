import assert from 'node:assert/strict';
import {VERSION,LIFE,HEIGHT,CSS_PX_PER_M,TYPE,Mesh,basis,fixtureReceipt,receipt,buildParry,fillSfx,drawFixture} from './parry.mjs';

const now=Date.now(), raw={...fixtureReceipt(901,'guard'),at:now};
assert.equal(VERSION,'dot-fighter-parry-r5');assert.equal(HEIGHT*CSS_PX_PER_M,64);
assert.equal(receipt(raw,now).id,raw.id);assert.equal(receipt(raw,now).tier,'guard');
for(const invalid of [{...raw,type:'fighter-slash'},{...raw,id:'no'},{...raw,at:now-LIFE},{...raw,at:now+126},{...raw,x:NaN},{...raw,targetX:0,targetY:0},{...raw,variant:'perfect-reflect:'},{...raw,variant:'bad:physical'}])assert.equal(receipt(invalid,now),null);
const ev=receipt(raw,now), lv=receipt({...raw,targetX:-170,at:now},now);
const pv=receipt({...raw,targetX:125,targetY:-113,at:now},now);
assert.ok(basis(ev).p[0]>0&&basis(lv).p[0]<0&&basis(pv).p[1]<basis(ev).p[1]);
const dv=receipt({...raw,x:111,y:75,targetX:raw.targetX+111,targetY:raw.targetY+75,at:now},now);
assert.ok(Math.abs(basis(dv).p[0]-basis(ev).p[0]-1.11)<1e-9);
assert.ok(Math.abs(basis(dv).p[1]-basis(ev).p[1]-.75)<1e-9);
const normal=new Mesh(), reduced=new Mesh(), a=buildParry(normal,ev,82), b=buildParry(reduced,ev,82,{reduced:true});
assert.equal(a.stage,'settle');assert.ok(a.triangles===b.triangles&&a.triangles>0);
assert.notDeepEqual(normal.data.slice(0,normal.length),reduced.data.slice(0,reduced.length));
assert.equal(buildParry(new Mesh(),ev,0).progress,0);
assert.equal(a.progress,0);assert.equal(b.progress,0);
assert.deepEqual(basis(ev,72).p,basis(ev,0).p);
assert.notEqual(basis(ev,72).twist,basis(ev,0).twist);
assert.equal(basis(ev,72,true).twist,0);
for(const time of [0,11,20,42,86,138,205,320,LIFE]){
 const g=new Mesh(), s=buildParry(g,ev,time);
 assert.ok(g.data.subarray(0,g.length).every(Number.isFinite));assert.equal(s.triangles,g.length/24);
 if(time===0||time>=205)assert.equal(g.length,0);else assert.ok(g.length>0);
}
const fixture=new Mesh();drawFixture(fixture,basis(ev),[]);
const yy=Array.from(fixture.data.subarray(0,fixture.length)).filter((x,i)=>i%8===1);
const hi=Math.min(...yy);
assert.ok(Math.abs(hi-(basis(ev).floor[1]-HEIGHT))<1e-6);
const s=fillSfx(48000,'guard',111), perfect=fillSfx(48000,'perfect-reflect',111);
assert.ok(s.max>.1&&s.max<1&&s.max<perfect.max&&perfect.max<1);
assert.equal(s.data.length,14880);assert.equal(Math.abs(s.data[0]),0);assert.equal(Math.abs(s.data.at(-1)),0);
console.log(JSON.stringify({version:VERSION,receipt:true,basis:true,finiteGeometry:true,visualLifeMs:LIFE,hCss:64,audioSynthesis:true,guardPeak:s.max,perfectPeak:perfect.max,note:'CPU contract only: no WebGPU, visual, listening or gameplay acceptance.'}));


for(const [dir,n] of [[ev,'right'],[lv,'left'],[pv,'above']])for(const reduced of [false,true]){
 for(const time of [1,11,16,42,86,138,159,205,LIFE]){
  const m=new Mesh(),q=buildParry(m,dir,time,{reduced}), b=basis(dir,time,reduced);
  for(let i=0;i<m.length;i+=8){
   const u=(m.data[i]-b.p[0])*b.outward[0]+(m.data[i+1]-b.p[1])*b.outward[1];
   assert.ok(u<=-.153||u>=.031,n);
  }
  assert.ok(q.lum>=0&&q.lum<=.18);
 }
}
for(const t of [16,42,86,138]){
 const ga=new Mesh(),gb=new Mesh();
 buildParry(ga,ev,t);buildParry(gb,{...ev,tier:'perfect-all-reflect',power:1.27,result:5,amount:999},t);
 assert.deepEqual(ga.data,gb.data);
}
console.log('three bearings / both motion modes retain empty blade strip; stationary local reflection; payload visual invariant');
