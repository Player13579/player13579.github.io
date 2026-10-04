import fs from 'node:fs';import crypto from 'node:crypto';
import {section,opticalSample,sampleTransportMaterial} from '../finish-cannon-r15-creative-sol61-r1/material.mjs';
import {sampleEvent} from '../finish-cannon-r15-creative-sol61-r1/effect.mjs';
const event={id:'diagnostic',playerId:'p',startedAt:0,type:'alchemy-particle-beam',variant:'continuous',x:160,y:270,targetX:760,targetY:270,handWorld:{x:160,y:270,eventId:'diagnostic',playerId:'p',frameId:'f'}};
const s=sampleEvent(event,220,'f',{observation:false});const vertices=[];
for(let i=0;i<s.vertices.length;i+=8)if(s.vertices[i+6]===-2)vertices.push(Array.from(s.vertices.slice(i,i+8)));
const rows=[];
for(const u of [.2,1.5*220/420-.25,.8]){
 const g=section(u,220);
 for(const y of [-24,-20,-18,-15,-12,-9,-6,-3,0,3,6,9,12,15]){
  let nearTau=0;for(let i=0;i<24;i++){const p=opticalSample(u,y,-24+(i+.5)*2,220);nearTau+=p.near*1.75*.48;}
  rows.push({u,y,...sampleTransportMaterial(u,y,220),nearTau,coreTransmissionThroughNear:Math.exp(-nearTau)});
 }
}
const adapter=fs.readFileSync(new URL('../finish-cannon-r15-runtime-luna-r1/preview/cannon-r15/main.mjs',import.meta.url));
fs.writeFileSync(new URL('./R15-DIAGNOSIS.json',import.meta.url),JSON.stringify({kind:'source-derived finite diagnostic, not rendered quality or exact pixel binding',r15MaterialSha256:crypto.createHash('sha256').update(fs.readFileSync(new URL('../finish-cannon-r15-creative-sol61-r1/material.mjs',import.meta.url))).digest('hex'),adapterSha256:crypto.createHash('sha256').update(adapter).digest('hex'),worldQuadVertices:vertices,view:[960,540,0,0],nativeCSS:[960,540],projection:'world y243..297 ->54 CSS px, localY -27..27; no projection compression',rows,display:{configured:'gpu.getPreferredCanvasFormat(); alphaMode premultiplied',blend:'one / one-minus-src-alpha',actualFormatReceipt:'not captured in existing proof',explicitLinearToDisplayTransferInR15:false},conclusions:['quad support is not cropped or geometrically compressed','emission already contains cloud weight; multiplying by opacity reweights it by extinction, making low-density margins weak','rear radiance overlaps high-radiance core in projection; near residual core can remain bright despite attenuation','nearWeight=.12 away from pulse: no stable all-length front body is encoded','native images show thin white beam with upper blue feather; diagnostics do not promote nonzero support to readable body']},null,2));
console.log(JSON.stringify({quad:vertices,exampleRows:rows.filter(p=>Math.abs(p.u-(1.5*220/420-.25))<1e-6&&[-18,-12,-3,3,9].includes(p.y))}));
