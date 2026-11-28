import a from 'node:assert/strict';
import {admit,TYPE,DESK,LIFE,stateAt} from './plan.mjs';
import {buildReceipt,drawFixture,fillSfx,fixtureReceipt,Mesh,receipt,response} from './effect.mjs';
const e=fixtureReceipt(9),owner=e.playerId,now=e.at+2,ctx={owner,now},entry=admit(e,ctx);
a.equal(e.type,TYPE);a.equal(e.objectId,DESK);a.deepEqual(entry,{id:e.objectCausalId,at:e.at,age:2});
a.equal(admit(e,{owner:'other',now}),null);a.equal(admit(e,{owner,now:e.at+LIFE-1})?.age,LIFE-1);
const bad=[{playerId:'other'},{type:'gain-luckBoost'},{effectKind:'stamina'},{type:'object-readingLamp'},{objectId:'v302-comms-antennaArray-2'},{objectCausalId:'map-object:another:object_use_000000000010'},{objectCausalId:'map-object:'+DESK+':object_use_1'},{objectCausalId:null},{variant:'another'},{radius:99},{durationMs:760},{targetId:'other'},{targetX:0},{targetY:0},{at:now+1},{at:now-LIFE},{at:Infinity},{id:'fake'}];
for(const diff of bad)a.equal(admit({...e,...diff},ctx),null);
const arbitrary={...e,id:'magic_000000000010',gainMana:12,mp:7,x:888,y:999,viewerId:'other'};
a.deepEqual(admit(arbitrary,ctx),entry);
function geometry(t,reduced,source=entry){
 const m=new Mesh(),r=buildReceipt(m,source,t,{reduced});
 const v=Array.from(m.data.subarray(0,m.length));a.equal(r.triangles*24,v.length);a.ok(r.triangles<=630);a.ok(v.every(Number.isFinite));
 for(let j=0;j<v.length;j+=8){
  const x=v[j],y=v[j+1],u=(.28*(x+.61)-.23*(y+.75))/.36575,vr=(.105*(x+.61)+1.22*(y+.75))/.36575;
  const frontU=(x+.38)/1.22, depth=(y+.47+.105*frontU)/.10;
  const inTop=u>=.079&&u<=.891&&vr>=.549&&vr<=1.001;
  const inFace=frontU>=.079&&frontU<=.891&&depth>=-.001&&depth<=1.001;
  a.ok(inTop||inFace,'existing tabletop or vertical front fascia, not outside fixture');
  a.ok(v[j+5]>=0&&v[j+5]<=1&&v[j+6]>=0&&v[j+6]<.44);
 }return v;
}
for(const less of [false,true])for(let t=-1;t<=LIFE;t++){
 const q=stateAt(t,{reduced:less}),v=geometry(t,less);
 if(t<=0||t>=LIFE||(!less&&t<=3))a.equal(v.length,0);else{
  a.ok(v.length>0&&q.alpha>0);
  if(less)a.equal(q.settle,.79);
 }
}
for(const t of [1,75,240,450,609])a.deepEqual(geometry(t,false,receipt(arbitrary,now)),geometry(t,false,receipt(e,now)));
const middle=(t,reduced=false)=>{const q=stateAt(t,{reduced}); return [response(.477,.85,q,true).a,response(.477,.64,q,true).a,response(.477,.88,q,false).a]};
a.equal(middle(41)[0],0);a.equal(middle(41)[1],0);a.ok(middle(41)[2]>.35);
a.ok(middle(118)[1]===0&&middle(118)[2]>.70);
a.ok(middle(240)[0]>.30&&middle(240)[1]>.83&&middle(240)[2]<.40);
a.ok(middle(399)[1]>.5&&middle(399)[2]<.25);
a.ok(geometry(118,true).length===geometry(240,true).length);
a.equal(response(.88,.50,stateAt(240),true).a,0);
a.equal(response(.477,1,stateAt(240),true).a,0);
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.equal(data.length,Math.round(.5*rate));a.ok(peak>.04&&peak<.075&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.ok(data.slice(Math.ceil(rate*.453)).every(x=>x===0));a.deepEqual(fillSfx(rate).data,data);
}
const stock=new Mesh(),after=new Mesh();drawFixture(stock);drawFixture(after);a.deepEqual(after.data,stock.data);
console.log(JSON.stringify({rejected:bad.length+2,timeMotionSamples:1224,payloadInvariance:5,sampleRates:6,topAndFront:[41,118,240,399].map(t=>middle(t)),peakTriangles:594}));
