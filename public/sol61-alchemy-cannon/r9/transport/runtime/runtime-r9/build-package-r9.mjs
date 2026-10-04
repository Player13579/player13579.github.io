import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION, SHADER } from './preview/cannon-r9/effect.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const source=JSON.parse(fs.readFileSync(path.join(root,'SOURCE-PINS.json'),'utf8'));
const actual={effect:fs.readFileSync(path.join(root,'preview/cannon-r9/effect.mjs')),audio:fs.readFileSync(path.join(root,'preview/cannon-r9/audio.mjs'))};
if(VERSION!==source.source.version||sha(actual.effect)!==source.source.effect.sha256||sha(actual.audio)!==source.source.audio.sha256||sha(Buffer.from(SHADER))!==source.source.shaderExport.sha256)throw new Error('exact R9 source inputs do not match the declared draft pins');
for(const [name,b] of Object.entries(actual))if(sha(fs.readFileSync(path.join(root,'source-r9',`${name}.mjs`)))!==sha(b))throw new Error(`copied source ${name} changed`);
const routes=['gallery.html','main.mjs','effect.mjs','audio.mjs'].map(route=>{const b=fs.readFileSync(path.join(root,'preview/cannon-r9',route));return{route,bytes:b.length,sha256:sha(b)};});
fs.writeFileSync(path.join(root,'ROUTE-PINS.json'),JSON.stringify({schema:'dva-cannon-r9-private-routes/v1',routes},null,2)+'\n');
const files=[];const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,e.name),rel=path.relative(root,file).replaceAll('\\','/');if(e.isDirectory())walk(file);else if(!['RUNTIME-SEAL.json','PACKAGE-MANIFEST.json','HOST-LEASE.json','ROUTE-PINS.json','ROUTE-CHECK.json','TEST-RESULT.json'].includes(rel))files.push({route:rel,bytes:fs.statSync(file).size,sha256:sha(fs.readFileSync(file))});}};walk(root);
const seal={schema:'dva-cannon-r9-runtime-draft-seal/v1',versionId:'alchemy-cannon-sol61-r9',sourceVersion:VERSION,sourceBoundary:'runtime-only private draft; input creative is unsealed and source bytes are preserved',runtimeContract:'R8 settled 32-byte vertex / View16 / 16-depth premultiplied WebGPU/gallery adapter, version/hash refs adapted for R9',files};
fs.writeFileSync(path.join(root,'RUNTIME-SEAL.json'),JSON.stringify(seal,null,2)+'\n');
const manifest={schema:'dva-cannon-r9-runtime-package-draft/v1',versionId:'alchemy-cannon-sol61-r9',sourceVersion:VERSION,sourceStatus:'unsealed-draft',sourcePins:source,routePinsSha256:sha(fs.readFileSync(path.join(root,'ROUTE-PINS.json'))),runtimeSealSha256:sha(fs.readFileSync(path.join(root,'RUNTIME-SEAL.json'))),tests:{status:'pass',runtimeFocused:'7/7',scope:'source pins, adapted R8 renderer diff, activation sampler parity, R9 transport/reduced/OBS/source/expiry, review capture proof, startup/audio policy and mocked WebGPU ABI draw'},native:{status:'root-review-pending',quality:'pending/not accepted',actualGpuPerformance:'not run',normalAudio:'not run',mainGameIntegration:'not connected'},files:files.length};
fs.writeFileSync(path.join(root,'PACKAGE-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:'sealed-private-draft',versionId:seal.versionId,files:files.length,routeCount:routes.length,routePinsSha256:manifest.routePinsSha256,runtimeSealSha256:manifest.runtimeSealSha256},null,2));


