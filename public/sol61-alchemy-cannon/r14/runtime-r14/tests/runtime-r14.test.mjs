import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { VERSION,DURATIONS,SHADER,validateEvent,sampleEvent,sampleTransportGeometry,sampleTransportMaterial } from '../preview/cannon-r14/effect.mjs';
import { MATERIAL_WGSL,opticalSample } from '../preview/cannon-r14/material.mjs';
import { GALLERY_VERSION_ID,FRAME_VERTEX_FLOATS,collectActiveSamples,createRestartCurrentHandler,parsePulseReviewRequest,createPulseReviewEvent,createNativePulseProof,EXPECTED_SOURCE_PINS,verifyRuntimeSourcePins } from '../preview/cannon-r14/main.mjs';
import { sampleEvent as sampleR13 } from '../test-support/finish-cannon-r13-creative-sol61-r1/effect.mjs';

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const readPreview=route=>fs.readFileSync(new URL(`../preview/cannon-r14/${route}`,import.meta.url));
const readOwned=route=>fs.readFileSync(new URL(`../${route}`,import.meta.url));
const event=(id,type='alchemy-particle-beam',variant='continuous',frameId='r14-frame')=>({id,type,playerId:'fixture-player',variant,startedAt:0,x:160,y:270,targetX:760,targetY:270,handWorld:{x:160,y:270,eventId:id,playerId:'fixture-player',frameId}});

test('R14 effect, mandatory material module, concatenated shader and audio exact pins', async()=>{
 assert.equal(VERSION,'alchemy-cannon-new-e-sol61-r14');assert.equal(GALLERY_VERSION_ID,'alchemy-cannon-sol61-r14');
 assert.deepEqual(DURATIONS,{'alchemy-particle-cannon':900,'alchemy-particle-beam':420});
 assert.equal(sha(readPreview('effect.mjs')),'d630272a7fed41cc36a93904c3b864cdada483c1c16838ebf221fa454afae278');
 assert.equal(sha(readPreview('material.mjs')),'b0e4157310ccb6c87bc88d4e896d6db8b1af949a9e7925c0c21fee6b47a62515');
 assert.equal(sha(readPreview('audio.mjs')),'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
 assert.equal(sha(Buffer.from(SHADER)),'567b6fe65a253b073bae0092fb1a3466e8e0b7e1e367a82405bec3920d400c3f');
 assert(SHADER.endsWith(MATERIAL_WGSL));assert.match(readPreview('effect.mjs').toString(),/from '\.\/material\.mjs'/);
 assert.equal(EXPECTED_SOURCE_PINS.materialModuleSha256,'b0e4157310ccb6c87bc88d4e896d6db8b1af949a9e7925c0c21fee6b47a62515');
 const fetchImpl=async url=>({ok:true,arrayBuffer:async()=>readPreview(new URL(url).pathname.split('/').at(-1))});
 const verified=await verifyRuntimeSourcePins({fetchImpl,cryptoImpl:webcrypto});assert.equal(verified.materialModuleSha256,EXPECTED_SOURCE_PINS.materialModuleSha256);assert.equal(verified.shaderSha256,EXPECTED_SOURCE_PINS.shaderSha256);
 await assert.rejects(verifyRuntimeSourcePins({fetchImpl:async url=>({ok:true,arrayBuffer:async()=>new URL(url).pathname.endsWith('material.mjs')?Buffer.from('wrong'):readPreview(new URL(url).pathname.split('/').at(-1))}),cryptoImpl:webcrypto}),/material\.mjs source pin mismatch/);
});

test('R14 entry closure pins the exact five allowed modules and keeps the cause-preserving R13 adapter',()=>{
 const pins=JSON.parse(readOwned('ROUTE-PINS.json'));assert.deepEqual(pins.routes.map(x=>x.route),['gallery.html','main.mjs','effect.mjs','material.mjs','audio.mjs']);
 for(const route of pins.routes){const b=readPreview(route.route);assert.equal(b.length,route.bytes);assert.equal(sha(b),route.sha256);}
 const html=readPreview('gallery.html').toString(),main=readPreview('main.mjs').toString(),effect=readPreview('effect.mjs').toString();
 assert.match(html,/<script type="module" src="\.\/main\.mjs"><\/script>/);assert.match(main,/from '\.\/effect\.mjs'/);assert.match(main,/from '\.\/audio\.mjs'/);assert.match(effect,/from '\.\/material\.mjs'/);
 const baseline=readOwned('source-r13-adapter/main.mjs').toString();let expected=baseline;
 for(const [from,to] of [['alchemy-cannon-sol61-r13','alchemy-cannon-sol61-r14'],['alchemy-cannon-new-e-sol61-r13','alchemy-cannon-new-e-sol61-r14'],['281cf3907cd90ef8b0a1623f8f9394854312dd8b7064e1ed5511fa5e1cade7a8','d630272a7fed41cc36a93904c3b864cdada483c1c16838ebf221fa454afae278'],['adf1a666c74e8df2ff1bbe366e5fb5c198580d9e8d97994ad763af7d5e8b2f8b','567b6fe65a253b073bae0092fb1a3466e8e0b7e1e367a82405bec3920d400c3f'],['R13 runtime version','R14 runtime version'],['R13 imported shader export','R14 imported shader export'],['__cannonR13SourcePins','__cannonR14SourcePins']]){assert.equal(expected.split(from).length-1,1,from);expected=expected.replace(from,to);}
 const audioLine="  audioModuleSha256: '683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a',";assert.equal(expected.split(audioLine).length-1,1);expected=expected.replace(audioLine,"  materialModuleSha256: 'b0e4157310ccb6c87bc88d4e896d6db8b1af949a9e7925c0c21fee6b47a62515',\n"+audioLine);
 const audioLoop="    ['audio.mjs', EXPECTED_SOURCE_PINS.audioModuleSha256]]) {";assert.equal(expected.split(audioLoop).length-1,1);expected=expected.replace(audioLoop,"    ['material.mjs', EXPECTED_SOURCE_PINS.materialModuleSha256],\n"+audioLoop);
 assert.equal(main,expected,'R14 runtime preserves repaired R13 control adapter with only source identity/material pin additions');
 assert.equal(readPreview('gallery.html').toString(),readOwned('source-r13-adapter/gallery-base.html').toString().replaceAll('r13','r14'));
});

test('208 mechanical sampler cases remain exact to R13, including variants, source and reduced gates',()=>{
 assert.equal(FRAME_VERTEX_FLOATS,8);let count=0;
 for(const type of Object.keys(DURATIONS))for(const variant of ['continuous','gbo-tenfold'])for(const observation of [false,true])for(const reducedMotion of [false,true])for(const age of [-1,0,28,100,150,210,220,280,330,390,419.999,420,900]){
  const e=event(`r14-${type}-${variant}-${age}-${observation}-${reducedMotion}`,type,variant);const a=sampleEvent(e,age,e.handWorld.frameId,{observation,reducedMotion}),b=sampleR13(e,age,e.handWorld.frameId,{observation,reducedMotion});assert.deepEqual(a,b);count++;
 }
 assert.equal(count,208);const e=event('r14-sourceoff');assert(validateEvent(e,e.handWorld.frameId));assert.deepEqual(collectActiveSamples([e],220,e.handWorld.frameId,{sourceEnabled:false}),[]);assert.equal(sampleEvent(e,420,e.handWorld.frameId).vertices.length,0);
});

test('new open-section material remains finite, bounded, reduced-settled and connected to exact age expiry',()=>{
 const section=sampleTransportGeometry(.5,220),sample=sampleTransportMaterial(.5,0,220);assert(Number.isFinite(section.radius)&&section.radius>0);assert(sample.rgb.every(Number.isFinite));assert(sample.alpha>=0&&sample.alpha<=1);
 const rear=opticalSample(.5,section.center-section.radius*.6,12,220),opening=opticalSample(.5,section.center-section.radius*.6,-12,220),near=opticalSample(.5,section.center+section.radius*.65,-9,220);
 assert(rear.density>0);assert.equal(opening.density,0);assert(near.density>0);
 const reducedA=sampleTransportMaterial(.5,-6,20,{reducedMotion:true}),reducedB=sampleTransportMaterial(.5,-6,390,{reducedMotion:true});assert.deepEqual(reducedA,reducedB);
 const e=event('r14-expiry');assert.equal(sampleEvent(e,420,e.handWorld.frameId,{reducedMotion:true}).vertices.length,0);assert.equal(DURATIONS['alchemy-particle-beam'],420);
});

test('restart control handler preserves active and expired cause through real sampler and completed proof',()=>{
 const causeId='cannon-r14-root-review';let current={mode:'single-pulse',causeId,frameId:'r14-active',startedAt:100};let lastMode='single-pulse',lastCause=causeId;const calls=[];
 const restart=createRestartCurrentHandler({getRun:()=>current,getLastMode:()=>lastMode,getLastSingleCauseId:()=>lastCause,start:(mode,options={})=>{calls.push({mode,options});return options;},continuePulseReview:()=>calls.push({mode:'held'})});
 assert.equal(restart().causeId,causeId);assert.equal(calls.at(-1).options.causeId,causeId);current=null;const restarted=restart();assert.equal(restarted.causeId,causeId);
 const frame='r14-proof-frame',e=createPulseReviewEvent({causeId,frameId:frame,startedAt:500}),sample=sampleEvent(e,720,frame,{observation:true});assert.equal(sample.id,`alchemy-cannon-review:${causeId}`);assert.equal(sample.ageMs,220);assert(sample.vertices.length>0);
 const request=parsePulseReviewRequest(new URLSearchParams(`pulsePhase=220&causeId=${causeId}&variant=continuous`));const proof=createNativePulseProof({request,frameId:frame,sample,submittedFrames:1,lastDraw:{elapsedMs:220,activeEvents:[{id:e.id,type:e.type,ageMs:220}],submitSequence:1,display:{cssRect:{left:0,top:0,width:960,height:540},backing:{width:960,height:540},devicePixelRatio:1,view16:[960,540,0,0],view16Bytes:16}},queue:{completedAt:'done',error:null}});
 assert.equal(proof.causeId,causeId);assert.equal(proof.completed,true);
 let held=false;const heldRestart=createRestartCurrentHandler({getRun:()=>({mode:'pulse-review'}),getLastMode:()=>lastMode,getLastSingleCauseId:()=>lastCause,start:()=>assert.fail('held control changed cause'),continuePulseReview:()=>{held=true;}});heldRestart();assert(held);
 const noCause=createRestartCurrentHandler({getRun:()=>null,getLastMode:()=> 'single-pulse',getLastSingleCauseId:()=>'',start:()=>assert.fail('must not create cause'),continuePulseReview:()=>{}});assert.equal(noCause(),undefined);
});
