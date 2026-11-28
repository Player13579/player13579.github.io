import a from 'node:assert/strict';
import {admit,TYPE,DESK,LIFE,stateAt} from './plan.mjs';
import {buildReceipt,drawFixture,fillSfx,fixtureReceipt,Mesh,receipt,grainAt} from './effect.mjs';
const e=fixtureReceipt(9),owner=e.playerId,now=e.at+2,ctx={owner,now},entry=admit(e,ctx);
a.equal(e.type,TYPE);a.equal(e.objectId,DESK);a.deepEqual(entry,{id:e.objectCausalId,at:e.at,age:2});
a.equal(admit(e,{owner:'other',now}),null);a.equal(admit(e,{owner,now:e.at+LIFE-1})?.age,LIFE-1);
const bad=[{playerId:'other'},{type:'gain-luckBoost'},{effectKind:'stamina'},{type:'object-readingLamp'},{objectId:'v302-comms-antennaArray-2'},{objectCausalId:'map-object:another:object_use_000000000010'},{objectCausalId:'map-object:'+DESK+':object_use_1'},{objectCausalId:null},{variant:'another'},{radius:99},{durationMs:760},{targetId:'other'},{targetX:0},{targetY:0},{at:now+1},{at:now-LIFE},{at:Infinity},{id:'fake'}];
for(const diff of bad)a.equal(admit({...e,...diff},ctx),null);
const arbitrary={...e,id:'magic_000000000010',gainMana:12,mp:7,x:888,y:999,viewerId:'other'};
a.deepEqual(admit(arbitrary,ctx),entry);
function geometry(t,reduced,source=entry){
 const m=new Mesh(),r=buildReceipt(m,source,t,{reduced});
 const v=Array.from(m.data.subarray(0,m.length));a.equal(r.triangles*24,v.length);a.ok(r.triangles<=640);a.ok(v.every(Number.isFinite));
 for(let j=0;j<v.length;j+=8){
  const x=v[j],y=v[j+1],u=(.28*(x+.61)-.23*(y+.75))/.36575,vr=(.105*(x+.61)+1.22*(y+.75))/.36575;
  a.ok(u>=.139&&u<=.753&&vr>=.075&&vr<=.87,'interior tabletop bounded footprint');
  a.ok(v[j+5]>=0&&v[j+5]<=1&&v[j+6]>=0&&v[j+6]<.28);
 }return v;
}
for(const less of [false,true])for(let t=-1;t<=LIFE;t++){
 const q=stateAt(t,{reduced:less}),v=geometry(t,less);
 if(t<=0||t>=LIFE)a.equal(v.length,0);else{
  a.ok(v.length>0&&q.alpha>0);
  if(less)a.equal(q.settle,.58);
 }
}
for(const t of [1,75,240,450,609])a.deepEqual(geometry(t,false,receipt(arbitrary,now)),geometry(t,false,receipt(e,now)));
const x=-.105;
const axis=(t,reduced,pos=x)=>grainAt(pos,0,stateAt(t,{reduced})).axis;
const at35=axis(35,false),at118=axis(118,false),at399=axis(399,false),at600=axis(600,false);
a.ok(at35-at118>.18&&at399-at600>.038&&at600-at118>.20);
a.ok(Math.abs(axis(35,true)-axis(399,true))<1e-7);
a.equal(axis(118,false,-.92),axis(399,false,-.92));
a.equal(axis(118,false,.92),axis(399,false,.92));
const locally=w=>grainAt(-.105,w,stateAt(118));
a.ok(locally(-.116).bright>locally(-.03).bright+.10);
a.ok(locally(.033).bright>locally(.08).bright+.18);
a.ok(locally(.135).bright>locally(.085).bright+.15);
a.ok(locally(.24).a===0&&grainAt(1,0,stateAt(118)).a===0);
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.equal(data.length,Math.round(.5*rate));a.ok(peak>.04&&peak<.075&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.ok(data.slice(Math.ceil(rate*.435)).every(x=>x===0));a.deepEqual(fillSfx(rate).data,data);
}
const stock=new Mesh(),after=new Mesh();drawFixture(stock);drawFixture(after);a.deepEqual(after.data,stock.data);
console.log(JSON.stringify({rejected:bad.length+2,timeMotionSamples:1224,payloadInvariance:5,sampleRates:6,axisPositions:[35,118,399,600].map(t=>axis(t,false)),reducedAxis:[35,118,399,600].map(t=>axis(t,true)),peakTriangles:640}));
