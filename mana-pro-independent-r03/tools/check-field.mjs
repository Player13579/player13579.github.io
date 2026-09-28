import {writeFile} from 'node:fs/promises';
import {composePixel,stateAt,domainsAt,sampleField} from '../src/field.mjs';
const records=[],errors=[];
for(let i=0;i<=160;i++){
 const p=i/160,s=stateAt(p),r={phase:p,quantityTotal:s.source+s.transit+s.received,source:s.source,transit:s.transit,received:s.received,backgrounds:[]};
 for(const background of ['dark','light']){
  const contrasts=[[0,-3],[0,-34],[0,-91]].map(([x,y])=>{const a=composePixel(x,y,p,{background,layers:7}),b=composePixel(x,y,1,{background,layers:7});return Math.max(...a.map((v,j)=>Math.abs(v-b[j])));});
  let gaps=0;for(let y=-105;y<=4;y+=2)if(p<1&&sampleField(0,y,p,{layers:7}).primary<.9)gaps++;
  r.backgrounds.push({background,contrasts,centerlineGaps:gaps});
  if(p<1&&(contrasts.some(c=>c<.08)||gaps))errors.push({p,background,contrasts,gaps});
 }
 if(Math.abs(r.quantityTotal-1)>1e-10)errors.push({p,check:'quantity'});records.push(r);
}
const result={kind:'CPU_analytic_technical_checks_NOT_GPU_NOT_perception',status:errors.length?'failed':'pass',phases:161,scope:'原寸用支持形、対比、表示用量の収支。無説明の読解を評価しない。',records,errors,gpu:'not_run',quality:'not_run'};
await writeFile(new URL('../evidence/cpu-field.json',import.meta.url),JSON.stringify(result,null,2));console.log(`CPU field: ${result.status}, ${records.length} samples`);if(errors.length)process.exitCode=1;
