import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { VERSION, DURATIONS, SHADER, sampleEvent, validateEvent, sampleTransportGeometry, sampleTransportMaterial } from '../preview/cannon-r9/effect.mjs';
import { sampleEvent as sampleR8 } from '../source-r8/effect.mjs';
import { GALLERY_VERSION_ID, FRAME_VERTEX_FLOATS, fixtureBodyVertices, createFixtureEvents, getFrameEvents, readControlQuery, collectActiveSamples, createStartupReporter, createGallerySfxHandler, parsePulseReviewRequest, createNativePulseProof, createWebGPURenderer, EXPECTED_SOURCE_PINS, verifyRuntimeSourcePins } from '../preview/cannon-r9/main.mjs';
import { webcrypto } from 'node:crypto';
const root = new URL('../', import.meta.url);
const adapterRoot = new URL('../source-r8/', import.meta.url);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(new URL(file, root))).digest('hex');

class Param { setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){} }
class Node { constructor(){this.gain=new Param();this.frequency=new Param();this.stops=[];} connect(){return this;} disconnect(){} start(){} stop(...args){this.stops.push(args);} }
class FakeContext { constructor(){this.state='suspended';this.sampleRate=48000;this.currentTime=0;this.destination=new Node();this.sources=[];this.closed=false;} async resume(){this.state='running';} async close(){this.state='closed';this.closed=true;} createBuffer(_c,n){const a=new Float32Array(n);return{getChannelData:()=>a,copyToChannel:d=>a.set(d)};} createBufferSource(){const n=new Node();this.sources.push(n);return n;} createOscillator(){const n=new Node();n.frequency=new Param();return n;} createGain(){return new Node();} createBiquadFilter(){const n=new Node();n.frequency=new Param();return n;} }

const makeEvent = (id, age=0, variant='continuous') => {
 const frameId='r9-runtime-test-frame', eventId=id;
 const event={id:eventId,type:'alchemy-particle-beam',playerId:'fixture-player',variant,startedAt:0,
  handWorld:{x:180,y:270,eventId,playerId:'fixture-player',frameId},targetX:760,targetY:270};
 validateEvent(event,frameId); return {event,frameId,age};
};

test('R9 package source and imported shader pins match the exact draft bytes', async()=>{
 assert.equal(VERSION,'alchemy-cannon-new-e-sol61-r9');
 assert.equal(GALLERY_VERSION_ID,'alchemy-cannon-sol61-r9');
 assert.deepEqual(DURATIONS,{'alchemy-particle-cannon':900,'alchemy-particle-beam':420});
 assert.equal(sha('preview/cannon-r9/effect.mjs'),'ed8d2c2f8a926dd660c56c96b12bf8c9916f461680ce55b01d9b24d71f055bdd');
 assert.equal(sha('preview/cannon-r9/audio.mjs'),'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
 assert.equal(sha('source-r9/effect.mjs'),'ed8d2c2f8a926dd660c56c96b12bf8c9916f461680ce55b01d9b24d71f055bdd');
 assert.equal(sha('source-r9/audio.mjs'),'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
 assert.equal(crypto.createHash('sha256').update(SHADER).digest('hex'),'851ae4cf391b90b2b3a6f05fccc06a91cfa0327dfb06896a10bea8a36d4b8eb3');
 const fetchImpl=async url=>({ok:true,arrayBuffer:async()=>fs.readFileSync(new URL(`../preview/cannon-r9/${new URL(url).pathname.split('/').at(-1)}`,import.meta.url))});
 const pins=await verifyRuntimeSourcePins({fetchImpl,cryptoImpl:webcrypto});
 assert.equal(pins.effectModuleSha256,EXPECTED_SOURCE_PINS.effectModuleSha256);
 assert.equal(pins.shaderSha256,EXPECTED_SOURCE_PINS.shaderSha256);
 await assert.rejects(verifyRuntimeSourcePins({fetchImpl:async()=>({ok:true,arrayBuffer:async()=>Buffer.from('wrong')}),cryptoImpl:webcrypto}),/source pin mismatch/);
});

test('copied settled R8 adapter differs only by version/hash/label references',()=>{
 const original=fs.readFileSync(new URL('main.mjs',adapterRoot),'utf8');
 const expected=original.replace('alchemy-cannon-sol61-r8','alchemy-cannon-sol61-r9').replace('alchemy-cannon-new-e-sol61-r8','alchemy-cannon-new-e-sol61-r9').replace('6e6e74680426c7ddeb047afc3d42e79a8694770e53237a345b064b7db21b4839','ed8d2c2f8a926dd660c56c96b12bf8c9916f461680ce55b01d9b24d71f055bdd').replace('cb2178b95f9e06e38e5f45bf2f952875723d7b96ee7191a3c8286813aa20f5d1','851ae4cf391b90b2b3a6f05fccc06a91cfa0327dfb06896a10bea8a36d4b8eb3').replace('R8 runtime version','R9 runtime version').replace('R8 imported shader export pin','R9 imported shader export pin').replace('window.__cannonR8SourcePins','window.__cannonR9SourcePins').replace('__cannonR8SourcePins','__cannonR9SourcePins');
 assert.equal(fs.readFileSync(new URL('preview/cannon-r9/main.mjs',root),'utf8').trimEnd(),expected.trimEnd());
 const originalHtml=fs.readFileSync(new URL('gallery.html',adapterRoot),'utf8');
 assert.equal(fs.readFileSync(new URL('preview/cannon-r9/gallery.html',root),'utf8').trimEnd(),originalHtml.replaceAll('r8','r9').replaceAll('R8','R9').trimEnd());
});

test('R9 keeps 32-byte event vertices, R8 activation behavior and sampler identity',()=>{
 assert.equal(FRAME_VERTEX_FLOATS,8);
 const frame='same-frame';
 for(const variant of ['continuous','gbo-tenfold']) for(const age of [0,55,90,150,220,280,330,419,420,520,899,900]) {
  const event={id:`activation-${variant}-${age}`,type:'alchemy-particle-cannon',playerId:'fixture-player',variant,startedAt:0,
   handWorld:{x:160,y:270,eventId:`activation-${variant}-${age}`,playerId:'fixture-player',frameId:frame},x:146,y:270,targetX:760,targetY:270};
  const current=sampleEvent(event,age,frame,{observation:true,reducedMotion:false});
  const baseline=sampleR8(event,age,frame,{observation:true,reducedMotion:false});
  assert.deepEqual(current.vertices,baseline.vertices,`activation parity ${variant}/${age}`);
 }
 const fixture=makeEvent('r9-beam-220');
 const sample=sampleEvent(fixture.event,220,fixture.frameId);
 assert.equal(sample.vertices.length%8,0);
 assert(sample.vertices.some((v,i)=>i%8===6&&v===-2));
 assert(sample.vertices.some((v,i)=>i%8===6&&v===-1));
 for(let i=0;i<sample.vertices.length;i+=8){
  const tag=sample.vertices[i+6];
  if(tag<0){ assert(tag===-1||tag===-2); assert(sample.vertices[i+2]>=0&&sample.vertices[i+2]<=1); assert(Math.abs(sample.vertices[i+3])<=31); }
 }
 assert.equal(sample.endpoint.x,760); assert.equal(sample.endpoint.y,270);
});

test('R9 charge rolls advect normally, freeze under reduced motion, honor OBS/source and expire at 420ms',()=>{
 const a=sampleTransportGeometry(.5,100),b=sampleTransportGeometry(.5,220),ra=sampleTransportGeometry(.5,100,{reducedMotion:true}),rb=sampleTransportGeometry(.5,220,{reducedMotion:true});
 assert.notEqual(a.q,b.q); assert.equal(ra.q,rb.q); assert.equal(ra.phaseTime,0);
 const mat=sampleTransportMaterial(.5,.1,220,{steps:16});
 assert([mat.radius,mat.center,mat.alpha,...mat.color].every(Number.isFinite));
 assert(mat.alpha>=0&&mat.alpha<=1);
 const {event,frameId}=makeEvent('controls');
 const on=sampleEvent(event,220,frameId,{observation:true});
 const off=sampleEvent(event,220,frameId,{observation:false});
 assert(on.vertices.some((v,i)=>i%8===6&&v===-1));
 assert(!off.vertices.some((v,i)=>i%8===6&&v===-1));
 assert(off.vertices.some((v,i)=>i%8===6&&v===-2));
 const reduced=sampleEvent(event,220,frameId,{reducedMotion:true});
 assert(reduced.vertices.some((v,i)=>i%8===4&&v===-221));
 assert.equal(collectActiveSamples([event],419,frameId).length,1);
 assert.equal(collectActiveSamples([event],420,frameId).length,0);
 assert.equal(collectActiveSamples([event],220,frameId,{sourceEnabled:false}).length,0);
});

test('held 220ms review request/proof is same-cause and expiry is a zero-vertex completed frame',()=>{
 const request=parsePulseReviewRequest(new URLSearchParams('pulsePhase=220&causeId=r9-held-220&variant=continuous'));
 assert.equal(request.eventId,'alchemy-cannon-review:r9-held-220');
 const {event,frameId}=makeEvent(request.eventId);
 const sample=sampleEvent(event,220,frameId);
 const display={cssRect:{left:10,top:20,width:960,height:540},backing:{width:960,height:540},devicePixelRatio:1,view16:[960,540,0,0],view16Bytes:16};
 const draw={elapsedMs:220,activeEvents:[{id:event.id,type:event.type,ageMs:220,phase:sample.phase,endpoint:sample.endpoint}],submitSequence:5,display};
 const proof=createNativePulseProof({request,frameId,sample,submittedFrames:5,lastDraw:draw,queue:{completedAt:'done',error:null}});
 assert.equal(proof.requestedAgeMs,220); assert.equal(proof.causeId,'r9-held-220'); assert.equal(proof.completed,true); assert.equal(proof.vertexCount,sample.vertices.length/8);
 const expiry=parsePulseReviewRequest(new URLSearchParams('pulsePhase=420&causeId=r9-expiry'));
 assert.equal(expiry.expiry,true);
 const empty=sampleEvent(event,420,frameId);
 assert.equal(empty.vertices.length,0);
 const expiryDraw={elapsedMs:420,activeEvents:[],expiredEventCount:1,submitSequence:6,display,reviewCapture:{eventId:expiry.eventId,causeId:expiry.causeId,requestedAgeMs:420,expiry:true}};
 const expiryProof=createNativePulseProof({request:expiry,frameId,sample:null,submittedFrames:6,lastDraw:expiryDraw,queue:{completedAt:'done',error:null}});
 assert.equal(expiryProof.kind,'native-pulse-expiry'); assert.equal(expiryProof.vertexCount,0);
});

test('control URL and gallery startup/audio preserve R8 behavior for R9 identity',async()=>{
 const params=new URLSearchParams('observation=0&source=1');
 assert.equal(readControlQuery(params,'observation',true),false); assert.equal(readControlQuery(params,'source',false),true);
 assert.equal(readControlQuery(new URLSearchParams(),'observation',true),true);
 const messages=[],report=createStartupReporter({galleryStartupToken:'a'.repeat(32),galleryVersionId:GALLERY_VERSION_ID,galleryAttemptEpoch:'2'},m=>messages.push(m));
 assert.equal(report.enabled,true);report.send('child-document','ready');assert.equal(report.snapshot().versionId,GALLERY_VERSION_ID);
 let played=0;const audio={muted:false,async unlockFromGesture(){return true;},async playActivation(){played++;return true;}};
 const handler=createGallerySfxHandler({audio,verify:false,getRun:()=>({mode:'activation',startedAt:0}),now:()=>30,start(){return true;}});
 assert.equal(await handler.activateFromGesture({id:GALLERY_VERSION_ID}),true);assert.equal(played,1);
 assert.equal(await handler.activateFromGesture({id:'alchemy-cannon-sol61-r8'}),false);
 const verifyHandler=createGallerySfxHandler({audio,verify:true,getRun:()=>({mode:'activation',startedAt:0}),now:()=>30,start(){}});
 assert.equal(await verifyHandler.activateFromGesture({id:GALLERY_VERSION_ID}),false);assert.equal(played,1);
});


test('faithful renderer retains 32B attribute offsets, View16, and premultiplied tuple draw',async()=>{
 globalThis.GPUBufferUsage={UNIFORM:1,COPY_DST:2,VERTEX:4};const writes=[],draws=[],buffers=[];let descriptor,shaderCode,passCount=0;
 const device={lost:Promise.resolve({reason:'none'}),queue:{writeBuffer(buffer,offset,data){writes.push({buffer,offset,data:new data.constructor(data)});},submit(){}},addEventListener(){},async pushErrorScope(){},async popErrorScope(){return null;},createShaderModule({code}){shaderCode=code;return{async getCompilationInfo(){return{messages:[]}}};},createRenderPipeline(d){descriptor=d;return{getBindGroupLayout(i){assert.equal(i,0);return{index:i};}};},createBuffer(d){const b={...d,destroy(){}};buffers.push(b);return b;},createBindGroup(d){return d;},createCommandEncoder(){return{beginRenderPass(){passCount++;return{setPipeline(){},setBindGroup(){},setVertexBuffer(){},draw(n){draws.push(n);},end(){}};},finish(){return{};}};},destroy(){}};
 const context={configure(o){assert.equal(o.alphaMode,'premultiplied');assert.equal(o.format,'bgra8unorm');},getCurrentTexture(){return{createView(){return{};}};}};
 const gpu={async requestAdapter(){return{async requestDevice(){return device;}};},getPreferredCanvasFormat(){return'bgra8unorm';}};
 const canvas={width:960,height:540,clientWidth:960,clientHeight:540,isConnected:true,getBoundingClientRect(){return{left:0,top:0,width:960,height:540};},getContext(t){assert.equal(t,'webgpu');return context;}};
 const renderer=await createWebGPURenderer(canvas,gpu);assert.equal(shaderCode,SHADER);
 assert.deepEqual(descriptor.vertex.buffers[0],{arrayStride:32,attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x4'},{shaderLocation:2,offset:24,format:'float32x2'}]});
 assert.equal(descriptor.fragment.targets[0].blend.color.srcFactor,'one');assert.equal(descriptor.fragment.targets[0].blend.color.dstFactor,'one-minus-src-alpha');
 const {event,frameId}=makeEvent('mock-gpu');const sample=sampleEvent(event,220,frameId);const body=fixtureBodyVertices({pulseAgesMs:[220]});const draw=renderer.render([sample],{observation:true,sourceEnabled:true,elapsedMs:220,bodyVertices:body});
 const uniform=writes.find(w=>(w.buffer.usage&GPUBufferUsage.UNIFORM)!==0),vertex=writes.find(w=>(w.buffer.usage&GPUBufferUsage.VERTEX)!==0);
 assert.equal(uniform.data.byteLength,16);assert.deepEqual(vertex.data.slice(body.length),sample.vertices);assert.equal(draw.vertexCount,body.length/8+sample.vertices.length/8);assert.deepEqual(draws,[draw.vertexCount]);assert.equal(passCount,1);assert.equal(draw.display.view16Bytes,16);renderer.destroy();
});



