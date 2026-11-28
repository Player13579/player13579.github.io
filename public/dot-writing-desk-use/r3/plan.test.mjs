import a from 'node:assert/strict';
import {admit,TYPE,DESK,LIFE,stateAt} from './plan.mjs';
import {buildReceipt,drawFixture,fillSfx,fixtureReceipt,Mesh,receipt,section} from './effect.mjs';
const e=fixtureReceipt(9),owner=e.playerId,now=e.at+2,ctx={owner,now},entry=admit(e,ctx);
a.equal(e.type,TYPE);a.equal(e.objectId,DESK);a.deepEqual(entry,{id:e.objectCausalId,at:e.at,age:2});
a.equal(admit(e,{owner:'other',now}),null);a.equal(admit(e,{owner,now:e.at+LIFE-1})?.age,LIFE-1);
const bad=[{playerId:'other'},{type:'gain-luckBoost'},{effectKind:'stamina'},{type:'object-readingLamp'},{objectId:'v302-comms-antennaArray-2'},{objectCausalId:'map-object:another:object_use_000000000010'},{objectCausalId:'map-object:'+DESK+':object_use_1'},{objectCausalId:null},{variant:'another'},{radius:99},{durationMs:760},{targetId:'other'},{targetX:0},{targetY:0},{at:now+1},{at:now-LIFE},{at:Infinity},{id:'fake'}];
for(const diff of bad)a.equal(admit({...e,...diff},ctx),null);
const arbitrary={...e,id:'magic_000000000010',gainMana:12,mp:7,x:888,y:999,viewerId:'other'};
a.deepEqual(admit(arbitrary,ctx),entry);
function geometry(t,reduced,source=entry){
 const m=new Mesh(),r=buildReceipt(m,source,t,{reduced});
 const v=Array.from(m.data.subarray(0,m.length));a.equal(r.triangles*24,v.length);a.ok(r.triangles<=400);a.ok(v.every(Number.isFinite));
 for(let j=0;j<v.length;j+=8){
  const x=v[j],y=v[j+1],u=(.28*(x+.61)-.23*(y+.75))/.36575,vr=(.105*(x+.61)+1.22*(y+.75))/.36575;
  a.ok(u>=.248&&u<=.961&&vr>=.119&&vr<=.902,'interior tabletop bounded footprint');
  a.ok(v[j+5]>=0&&v[j+5]<=1&&v[j+6]>=0&&v[j+6]<.28);
 }return v;
}
for(const less of [false,true])for(let t=-1;t<=LIFE;t++){
 const q=stateAt(t,{reduced:less}),v=geometry(t,less);
 if(t<=0||t>=LIFE)a.equal(v.length,0);else{
  a.ok(v.length>0&&q.alpha>0);
  if(less)a.equal(q.settle,1);
 }
}
for(const t of [1,75,240,450,609])a.deepEqual(geometry(t,false,receipt(arbitrary,now)),geometry(t,false,receipt(e,now)));
const peakY=(t,reduced)=>Array.from({length:301},(_,i)=>[section(.625,i/300,stateAt(t,{reduced})).intensity,i/300]).sort((x,y)=>y[0]-x[0])[0][1];
a.ok(peakY(130,false)-peakY(55,false)>.07);
a.ok(peakY(230,false)-peakY(130,false)>.08);
a.ok(Math.abs(peakY(230,true)-peakY(55,true))<.01);
const interior=(t,v)=>section(.625,v,stateAt(t));
a.ok(interior(240,.35).shadow>interior(240,.69).shadow+.4);
a.ok(interior(240,.69).intensity>interior(240,.35).intensity+.45);
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.equal(data.length,Math.round(.5*rate));a.ok(peak>.04&&peak<.075&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.ok(data.slice(Math.ceil(rate*.48)).every(x=>x===0));a.deepEqual(fillSfx(rate).data,data);
}
const stock=new Mesh(),after=new Mesh();drawFixture(stock);drawFixture(after);a.deepEqual(after.data,stock.data);
console.log(JSON.stringify({rejected:bad.length+2,timeMotionSamples:1224,payloadInvariance:5,sampleRates:6,movingPeak:[55,130,230].map(t=>peakY(t,false)),reducedPeak:[55,130,230].map(t=>peakY(t,true))}));
