import {mkdir,writeFile} from 'node:fs/promises';
import {renderReference,WIDTH,HEIGHT} from './reference-utils.mjs';
import {encodePNG} from './png.mjs';
const root=new URL('../evidence/cpu-reference/',import.meta.url);await mkdir(root,{recursive:true});
const phases=[0,.08,.16,.24,.32,.40,.48,.56,.64,.72,.80,.88,.96,1];
const sheet=new Uint8Array(WIDTH*HEIGHT*phases.length*4),index=[];
for(let i=0;i<phases.length;i++){
  const u=phases[i],data=renderReference(u);
  sheet.set(data,i*WIDTH*HEIGHT*4);
  const name=`phase-${String(Math.round(u*100)).padStart(3,'0')}.png`;
  await writeFile(new URL(name,root),encodePNG(WIDTH,HEIGHT,data));index.push({row:i,phase:u,file:name});
}
await writeFile(new URL('lifetime-contact-sheet.png',root),encodePNG(WIDTH,HEIGHT*phases.length,sheet));
await writeFile(new URL('index.json',root),JSON.stringify({kind:'CPU_analytic_reference_not_GPU',runtimeFallback:false,qualityAcceptance:false,cssActorHeight:64,scale:1,index},null,2)+'\n');
console.log('CPU reference: 14 phases, dark/light; not WebGPU pixel evidence');
