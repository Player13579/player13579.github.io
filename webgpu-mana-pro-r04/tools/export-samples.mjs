import fs from 'node:fs/promises';import {sampleInstances} from '../src/sampler.js';import {bodyFixture} from '../preview/fixture.js';
const root=new URL('..',import.meta.url),cases=[];
function make(name,t,scenario='single',duration=1500,scale=1,light=false,occlusion=false){const offsets=scenario==='burst'?[0,160,320]:[0];const samples=sampleInstances(offsets.filter(o=>t>=o&&t-o<duration).map((o,i)=>({key:`cause-${i}`,beneficiaryPlayerId:'beneficiary',body:bodyFixture(),ageMs:t-o,durationMs:duration,radiusPx:82})));return {name,actorMs:t,scenario,duration,scale,light,occlusion,samples};}
for(const t of [30,140,300,450,650,850,1009,1200,1380,1460,1500,1720])for(const light of [false,true])cases.push(make(`phase-${t}-${light?'light':'dark'}`,t,'single',1500,1,light));
for(const scale of [1,2,3])for(const light of [false,true])cases.push(make(`size-${scale}-${light?'light':'dark'}`,450,'single',1500,scale,light));
for(const scenario of ['single','burst'])for(const light of [false,true])for(const occlusion of [false,true])cases.push(make(`${scenario}-${light?'light':'dark'}-${occlusion?'occluded':'clear'}`,680,scenario,1500,1,light,occlusion));
for(const p of [0.1,0.3,0.6,0.9,1])cases.push(make(`minimum-${Math.round(p*900)}`,p*900,'single',900,2));
await fs.writeFile(new URL('qa/samples.json',root),JSON.stringify({release:'r0.4',scope:'CPU diagnostic geometry; NOT GPU execution or quality acceptance',source:'src/sampler.js',cases})+'\n');
console.log(`${cases.length} independent diagnostic cases exported from current sampler.`);
