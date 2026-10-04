import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const cwd=process.cwd(),out=process.env.OUTDIR;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const input=path.join(cwd,'outputs/request-20261004/finish-cannon-r9-creative-sol61-r1');
const runtime=path.join(cwd,'outputs/request-20261004/finish-cannon-r9-runtime-luna-r1/runtime-r9');
const natives=path.join(cwd,'outputs/request-20261004/finish-cannon-r9-runtime-luna-r1/native-root');
const creativeDest=path.join(out,'source-binding','creative-draft');
const runtimeDest=path.join(out,'runtime','runtime-r9');
if(fs.readdirSync(out).some(name=>name!=='prepare-gallery-package-r9.mjs')) throw new Error('owned package output folder has existing artifacts; refuse to overwrite');
fs.mkdirSync(path.dirname(creativeDest),{recursive:true});
fs.cpSync(input,creativeDest,{recursive:true,errorOnExist:true});
const runtimeSeal=JSON.parse(fs.readFileSync(path.join(runtime,'RUNTIME-SEAL.json'),'utf8'));
fs.mkdirSync(runtimeDest,{recursive:true});
for(const entry of runtimeSeal.files){const from=path.join(runtime,...entry.route.split('/')),to=path.join(runtimeDest,...entry.route.split('/'));fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);}
for(const name of ['RUNTIME-SEAL.json','PACKAGE-MANIFEST.json','ROUTE-PINS.json','TEST-RESULT.json','ROUTE-CHECK.json'])fs.copyFileSync(path.join(runtime,name),path.join(runtimeDest,name));
const nativeDest=path.join(out,'native-root');fs.mkdirSync(nativeDest,{recursive:true});
for(const name of ['on220.json','on220.jpg','off220.json','off220.jpg','expiry420.json','expiry420.jpg'])fs.copyFileSync(path.join(natives,name),path.join(nativeDest,name));
const sourceEntries=[];
for(const entry of fs.readdirSync(creativeDest,{withFileTypes:true}))if(entry.isFile()){const b=fs.readFileSync(path.join(creativeDest,entry.name));sourceEntries.push({route:`source-binding/creative-draft/${entry.name}`,bytes:b.length,sha256:sha(b)});}
const inputs=JSON.parse(fs.readFileSync(path.join(runtimeDest,'SOURCE-PINS.json'),'utf8'));
const bound={schema:'dva-cannon-r9-package-source-copy-binding/v1',bindingStatus:'copied source bytes are hash-pinned for this transport package; this does NOT assert the producer folder was sealed/frozen',producerInput:{path:'outputs/request-20261004/finish-cannon-r9-creative-sol61-r1',status:'unsealed creative draft at time of copy',author:'GPT-6.1-Sol'},producerHashesSupplied:{effect:'ed8d2c2f8a926dd660c56c96b12bf8c9916f461680ce55b01d9b24d71f055bdd',shaderExport:'851ae4cf391b90b2b3a6f05fccc06a91cfa0327dfb06896a10bea8a36d4b8eb3',audio:'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a'},runtimeSourcePins:inputs.source,files:sourceEntries};
fs.writeFileSync(path.join(out,'SOURCE-FREEZE.json'),JSON.stringify(bound,null,2)+'\n');
const parse=n=>JSON.parse(JSON.parse(fs.readFileSync(path.join(nativeDest,n),'utf8')).result.value);
const proof={schema:'dva-cannon-r9-limited-native-gpu-proof/v1',status:'root-captured limited GPU compile/draw proof; not full visual-quality acceptance',versionId:'alchemy-cannon-sol61-r9',sourcePins:{effect:'ed8d2c2f8a926dd660c56c96b12bf8c9916f461680ce55b01d9b24d71f055bdd',shader:'851ae4cf391b90b2b3a6f05fccc06a91cfa0327dfb06896a10bea8a36d4b8eb3',audio:'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a'},captures:[]};
for(const [name,image] of [['on220.json','on220.jpg'],['off220.json','off220.jpg'],['expiry420.json','expiry420.jpg']]){
 const raw=fs.readFileSync(path.join(nativeDest,name)),img=fs.readFileSync(path.join(nativeDest,image)),record=parse(name),p=record.nativePulseProof;
 proof.captures.push({json:`native-root/${name}`,jsonBytes:raw.length,jsonSha256:sha(raw),image:`native-root/${image}`,imageBytes:img.length,imageSha256:sha(img),imageMagic:img.subarray(0,3).toString('hex'),native:{kind:p.kind,causeId:p.causeId,eventId:p.eventId,frameId:p.frameId,requestedAgeMs:p.requestedAgeMs,sequence:p.submittedFrameSequence,completed:p.completed,submitted:p.submitted,activeEventCount:p.activeEventCount,beamVertexCount:p.vertexCount,sourceEnabled:record.settings.sourceEnabled,observation:record.settings.observation,queueError:p.queue?.error ?? null,shaderMessages:record.shaderMessages?.length ?? null}});
}
const [on,off,exp]=proof.captures;
if(on.native.causeId!==off.native.causeId||on.native.eventId!==off.native.eventId||on.native.frameId!==off.native.frameId||on.native.sequence!==1||off.native.sequence!==2||exp.native.sequence!==3)throw new Error('native sequence/cause/frame mismatch');
if(!on.native.completed||!off.native.completed||!exp.native.completed||on.native.queueError!==null||off.native.queueError!==null||exp.native.queueError!==null)throw new Error('native proof not complete/clean');
if(on.native.beamVertexCount<1||off.native.beamVertexCount<1||exp.native.beamVertexCount!==0||exp.native.activeEventCount!==0)throw new Error('native beam expiry boundary mismatch');
if(exp.native.sourceEnabled!==true)throw new Error('captured expiry source setting differs from actual record; preserve and audit');
proof.same220={causeId:on.native.causeId,eventId:on.native.eventId,frameId:on.native.frameId,onSequence:on.native.sequence,offSequence:off.native.sequence};
proof.expiry={sequence:exp.native.sequence,beamVertexCount:exp.native.beamVertexCount,totalFixtureVertexCount:parse('expiry420.json').lastDraw.vertexCount,activeEventCount:exp.native.activeEventCount,sourceEnabled:exp.native.sourceEnabled};
fs.writeFileSync(path.join(out,'NATIVE-PROOF-BOUND.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({status:'copied-and-bound',sourceFileCount:sourceEntries.length,runtimeSealedFiles:runtimeSeal.files.length,nativeCaptures:proof.captures.map(c=>({json:c.json,jsonSha256:c.jsonSha256,image:c.image,imageSha256:c.imageSha256,sequence:c.native.sequence,completed:c.native.completed})),same220:proof.same220,expiry:proof.expiry},null,2));

