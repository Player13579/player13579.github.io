import assert from 'node:assert/strict';
import {TYPE,VERSION,LIFE,STATUS_MS,TIME_SCALE,FLOOR_SPEED_MPS,floorFlow,admit,stateAt} from './plan.mjs';
import {Mesh,buildReceipt,fillSfx,fixtureReceipt,receipt} from './effect.mjs';
assert.equal(VERSION,'dot-decelerate-application-r5');assert.equal(LIFE,1140);assert.equal(STATUS_MS,8000);
const t=1795785600000, d={viewer:'target',now:t};
const e={id:'magic_test',type:TYPE,variant:'',durationMs:8000,radius:150,playerId:'caster',targetId:'target',x:0,y:1,at:t};
assert.deepEqual(admit(e,d),{id:e.id,at:e.at,x:0,y:1,age:0});
assert.ok(admit({...e,playerId:'target'},d));
const bad=[
 {variant:'rational-natural-recovery-immune',durationMs:900},{variant:'rational-natural-recovery-immune'},
 {durationMs:900},{variant:undefined},{type:'gravity-accelerate'},{type:'gravity-time-keeper'},{type:'gravity-storm'},
 {variant:'end'},{variant:'release'},{id:'fake'},{radius:149},{x:NaN},{targetX:0},{targetY:0},{targetId:'other'},
 {playerId:''},{at:t-LIFE},{at:t+126}];
for(const q of bad)assert.equal(admit({...e,...q},d),null);
assert.equal(admit(e,{...d,viewer:'caster'}),null);
assert.ok(receipt(fixtureReceipt('test')));
let mesh=0,contr=0;
for(const reduced of [false,true])for(let age=-1;age<=LIFE;age++){
 const p=stateAt(age,{reduced});
 const m=new Mesh(), b=buildReceipt(m,{},age,{reduced});
 assert.deepEqual(b.field,floorFlow(age,{reduced}));assert(m.data.subarray(0,m.length).every(Number.isFinite));
 assert.equal(m.floorMaterial,0);assert.equal(b.triangles,age>0&&age<LIFE?2:0);
 if(b.triangles){
  for(let i=0;i<m.length;i+=8){assert.equal(m.data[i+7],1);assert(m.data[i+1]>.05);assert(Math.abs(m.data[i])<1.85);}
 }else assert.deepEqual(b.field,{outer:0,local:0,mask:0});
 if(age>2&&age<LIFE){
  const old=floorFlow(age-1,{reduced});
  if(reduced){assert.equal(b.field.outer,old.outer);assert.equal(b.field.local,old.local);}
  else{
   const dx=b.field.outer-old.outer,dy=b.field.local-old.local;
   assert(dx>0&&dy>0);assert(Math.abs(dx-.001*FLOOR_SPEED_MPS)<1e-12);
   if(age>=332)assert(Math.abs(dy/dx-TIME_SCALE)<1e-9);
  }
 }
 if(age%120===44){
  const x=new Mesh(),y=new Mesh();
  assert.deepEqual(buildReceipt(x,{caster:'a',scalar:.38,hit:false,held:8000},age,{reduced}),
   buildReceipt(y,{caster:'b',scalar:1,hit:true,held:3},age,{reduced}));
  assert.deepEqual(x.data,y.data);contr++;
 }
 mesh++;
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);assert(data.every(Number.isFinite)&&peak>.025&&peak<.15);
 assert.equal(data.length,Math.round(rate*.93));assert.equal(Math.abs(data[0]),0);assert.equal(Math.abs(data.at(-1)),0);
}
console.log(JSON.stringify({rejected:bad.length+1,mesh,invariantComparisons:contr,audioRates:6,referencePositive:true,localPositive:true,localRateRatio:TIME_SCALE,stableReduced:true}));
