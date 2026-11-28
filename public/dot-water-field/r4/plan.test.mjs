import assert from 'node:assert/strict';
import {admit,stateAt} from './plan.mjs';
import {buildWaterSheet,VERTEX_COUNT} from './mesh.mjs';
let meshes=0;
let negatives=0, samples=0, invariant=0;
for(const [radius,duration] of [[135,4500],[173,5500],[211,6500],[145,12000],[187,12000],[229,12000]]){
 const field={id:'hazard_example',kind:'water',x:32,y:60,radius,strength:1.25,sourceId:'a',createdAt:1000,endsAt:1000+duration};
 const fixture={source:'visible-hazard-field-replay',phase:'playing',stale:false,field,observedAt:1020};
 const f=admit(fixture);
 assert.equal(f.radius,radius);
 for(const patch of [{source:'authoritative-event-replay'},{phase:'meeting'},{stale:true},{retired:true},{observedAt:999},{observedAt:field.endsAt},{observedAt:NaN},
  {field:{...field,kind:'poison'}},{field:{...field,kind:'fire'}},{field:{...field,id:'magic_example'}},{field:{...field,x:Infinity}},{field:{...field,radius:0}},{field:{...field,endsAt:1000}},{field:null}]){
  assert.equal(admit({...fixture,...patch}),null);negatives++;
 }
 for(const reduced of [false,true]){
  const options={reduced};
  const same=admit({...fixture,field:{...field,sourceId:'hidden-b',strength:50,stamina:0,burnCleared:true,affectedCount:20}});
  for(let t=999;t<=field.endsAt+1;t+=13){
   const s=stateAt(f,t,options);
   assert.deepEqual(s,stateAt(same,t,options));invariant++;
   assert.ok(Object.values(s).every(x=>Number.isFinite(x)&&x>=0&&x<=1));samples++;
  }
  for(const t of [0,1,29,169,321,440,700,800,1900,duration-1,duration]){
   const mesh=buildWaterSheet(f,1000+t,options);
   assert.deepEqual(mesh,buildWaterSheet(same,1000+t,options));
   assert.equal(mesh.length,(t===0||t===duration)?0:VERTEX_COUNT*8);
   assert.ok(mesh.every(Number.isFinite));
   for(let k=0;k<mesh.length;k+=8){
    assert.ok(Math.hypot(mesh[k],mesh[k+1])<=radius+.002);
    assert.ok(mesh[k+5]>=0&&mesh[k+5]<=1);
   }
   meshes++;
  }
  const blank={opacity:0,front:0,caustic:0,settled:0};
  assert.deepEqual(stateAt(f,1000,options),blank);
  assert.deepEqual(stateAt(f,field.endsAt,options),blank);
  assert.deepEqual(stateAt(f,NaN,options),blank);
  assert.deepEqual(stateAt(f,2100,options),{opacity:1,front:1,caustic:0,settled:1});
 }
}
console.log({negatives,samples,invariant,meshes});

const field={id:'hazard_fixed',x:0,y:0,radius:135,createdAt:1000,endsAt:5500};
const shape=(t,r)=>(buildWaterSheet(field,t,{reduced:r})),coords=x=>x.filter((v,i)=>i%8<=1);
assert.deepEqual(coords(shape(1170,false)),coords(shape(1430,false)));
assert.deepEqual(coords(shape(1430,false)),coords(shape(1800,false)));
assert.notDeepEqual(shape(1170,false),shape(1430,false));
assert.deepEqual(shape(1170,true),shape(1800,true));
console.log('Fixed geometry; optical travel in normal motion only');
