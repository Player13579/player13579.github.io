import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const native=path.join(root,'native-root','initial-material');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const expected={version:'alchemy-cannon-new-e-sol61-r16',effect:'668f75747a8ae6f4dbda974cafd647276d785bb354538c1208353391f96523ac',material:'9463347a1b1f677688f5a49e04add407acd484d1777aabb7671325304f9c46f9',shader:'643bc20287ee82fbee45b8c14771b9e60257abf5d9ead67a2ea4f6d8c31330d3',audio:'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a'};
const expectedConfig={alphaMode:'premultiplied',blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}},vertexStrideBytes:32,viewUniformBytes:16,depthSamples:24,depthAttachment:false};
function resultValue(wrapper,key){const value=wrapper[key]?.result?.value;if(typeof value!=='string')throw new Error(`${key} capture snapshot missing`);return JSON.parse(value);}
function snapshot(value){return value.snapshot??value;}
const records=[];
for(const name of ['off220','on220','off420']){
 const jsonBytes=fs.readFileSync(path.join(native,`${name}.json`)),jpg=fs.readFileSync(path.join(native,`${name}.jpg`));
 assert.deepEqual([...jpg.subarray(0,3)],[255,216,255]);
 const wrapper=JSON.parse(jsonBytes.toString('utf8'));
 const beforeValue=resultValue(wrapper,'before'),afterValue=resultValue(wrapper,'after');
 const before=snapshot(beforeValue),after=snapshot(afterValue);
 assert.deepEqual(after,before,`${name} before/after proof snapshots must match`);
 const proof=after.nativePulseProof;
 assert.equal(after.version,'alchemy-cannon-new-e-sol61-r16');assert.equal(proof.versionId,'alchemy-cannon-sol61-r16');
 assert.equal(after.verify,true);assert.equal(after.audioMuted,true);assert.deepEqual(after.shaderMessages,[]);
 assert.equal(proof.causeId,'cannon-r16-root-review');assert.equal(proof.completed,true);assert.equal(proof.submitted,true);assert.ok(proof.queue.completedAt);assert.equal(proof.queue.error,null);
 assert.deepEqual(after.gpuConfiguration,proof.gpuConfiguration);
 for(const [key,value] of Object.entries(expectedConfig))assert.deepEqual(proof.gpuConfiguration[key],value,`${name} GPU ${key}`);
 assert.equal(proof.gpuConfiguration.format,'bgra8unorm');
 assert.deepEqual(after.sourcePins,{version:expected.version,effectModuleSha256:expected.effect,materialModuleSha256:expected.material,audioModuleSha256:expected.audio,shaderSha256:expected.shader,verifiedAt:after.sourcePins.verifiedAt});
 assert.equal(proof.display?.view16Bytes,16);assert.deepEqual(proof.display?.view16,[960,540,0,0]);
 assert.deepEqual(proof.display?.cssClient,{width:960,height:540});assert.deepEqual(proof.display?.backing,{width:960,height:540});assert.equal(proof.display?.devicePixelRatio,1);
 if(name==='off220'||name==='on220'){
  assert.equal(proof.kind,'native-pulse-phase');assert.equal(proof.requestedAgeMs,220);assert.equal(proof.sampledAgeMs,220);
  assert.equal(proof.vertexCount>0,true);assert.equal(proof.activeEventCount,1);assert.equal(proof.expiredEventCount,0);
  assert.equal(proof.frameId,'alchemy-cannon-fixture-frame-1-1');
  assert.equal(proof.display.cssRect.width,960);assert.equal(proof.display.cssRect.height,540);
 }else{
  assert.equal(proof.kind,'native-pulse-expiry');assert.equal(proof.requestedAgeMs,420);assert.equal(proof.sampledAgeMs,null);
  assert.equal(proof.vertexCount,0);assert.equal(proof.activeEventCount,0);assert.equal(proof.expiredEventCount,1);
 }
 assert.equal(after.settings.sourceEnabled,true);assert.equal(after.settings.reducedMotion,false);
 assert.equal(after.settings.observation,name==='on220');
 records.push({name,requestedAgeMs:proof.requestedAgeMs,sampledAgeMs:proof.sampledAgeMs,causeId:proof.causeId,eventId:proof.eventId,frameId:proof.frameId,sourceEnabled:after.settings.sourceEnabled,reducedMotion:after.settings.reducedMotion,observation:after.settings.observation,completed:proof.completed,queueError:proof.queue.error,gpuConfiguration:proof.gpuConfiguration,jpg:{bytes:jpg.length,sha256:sha(jpg)},json:{bytes:jsonBytes.length,sha256:sha(jsonBytes)}});
}
const [off,on,expiry]=records;
assert.equal(off.eventId,on.eventId);assert.equal(off.causeId,on.causeId);assert.equal(off.frameId,on.frameId);
assert.equal(off.gpuConfiguration.format,on.gpuConfiguration.format);assert.equal(on.gpuConfiguration.format,expiry.gpuConfiguration.format);
const consoleBytes=fs.readFileSync(path.join(native,'console.json'));assert.equal(consoleBytes.toString('utf8').replace(/^\uFEFF/,'').trim(),'[]');
const report={schema:'dva-cannon-r16-initial-native-validation/v1',status:'pass-limited-initial-native-gate',scope:'Completed held OFF220/ON220 matched same cause/frame plus OFF420 expiry only; not full quality or lifetime.',sourcePins:expected,captures:records,matchedOffOn:{sameCause:true,sameEvent:true,sameFixtureFrame:true,requestedAndSampled220:true,onlyObservationDiffers:true},expired420:{requested420:true,sampledAgeNull:true,vertices0:true,activeEvents0:true,expiredEvents1:true},gpuConfiguration:expectedConfig,actualPreferredCanvasFormat:'bgra8unorm',console:[],consoleSha256:sha(consoleBytes),limitations:['Actual WebGPU compilation/submit and exact initial capture proved; no visual quality decision inferred.','No ordinary motion or full lifetime review.','Verify hard-mutes audio; ordinary SFX not listened.','No device/performance/game/adoption acceptance.']};
fs.writeFileSync(path.join(root,'NATIVE-INITIAL-VALIDATION.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
