import assert from 'node:assert/strict';
import {admit,stateAt} from './plan.mjs';
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
  const blank={opacity:0,front:0,caustic:0,settled:0};
  assert.deepEqual(stateAt(f,1000,options),blank);
  assert.deepEqual(stateAt(f,field.endsAt,options),blank);
  assert.deepEqual(stateAt(f,NaN,options),blank);
  assert.deepEqual(stateAt(f,2100,options),{opacity:1,front:1,caustic:0,settled:1});
 }
}
console.log({negatives,samples,invariant});
