import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { VERSION,DURATIONS,SHADER,validateEvent,sampleEvent,sampleTransportGeometry,sampleChargeSurfaces,sampleChargeSheets,sampleTransportMaterial } from '../preview/cannon-r11/effect.mjs';
import { GALLERY_VERSION_ID,FRAME_VERTEX_FLOATS,fixtureBodyVertices,collectActiveSamples,readControlQuery,createStartupReporter,createGallerySfxHandler,parsePulseReviewRequest,createNativePulseProof,createWebGPURenderer,EXPECTED_SOURCE_PINS,verifyRuntimeSourcePins } from '../preview/cannon-r11/main.mjs';
import { sampleEvent as sampleR10 } from '../source-r10/effect.mjs';
import { sampleEvent as sampleR9 } from '../source-r9/effect.mjs';
const root=new URL('../',import.meta.url),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(new URL(f,root))).digest('hex');
const event=(id,type='alchemy-particle-beam')=>({id,type,playerId:'fixture-player',variant:'continuous',startedAt:0,x:146,y:270,targetX:760,targetY:270,handWorld:{x:160,y:270,eventId:id,playerId:'fixture-player',frameId:'r11-frame'}});

test('R11 source, imported shader and exact audio bytes match frozen unsealed pins',async()=>{
 assert.equal(VERSION,'alchemy-cannon-new-e-sol61-r11');assert.equal(GALLERY_VERSION_ID,'alchemy-cannon-sol61-r11');
 assert.deepEqual(DURATIONS,{'alchemy-particle-cannon':900,'alchemy-particle-beam':420});
 assert.equal(sha('preview/cannon-r11/effect.mjs'),'73054d8a0c87963e7664528344c226171f048e2e3515f22a34120d732c39689a');
 assert.equal(sha('preview/cannon-r11/audio.mjs'),'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
 assert.equal(sha('source-r11/effect.mjs'),'73054d8a0c87963e7664528344c226171f048e2e3515f22a34120d732c39689a');
 assert.equal(sha('source-r11/audio.mjs'),'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
 assert.equal(crypto.createHash('sha256').update(SHADER).digest('hex'),'c8e4242b2aba9aea85e2518ef5e6d0556e2a4bfeb170f65e44eedb4e50a4c17d');
 assert.equal(EXPECTED_SOURCE_PINS.effectModuleSha256,'73054d8a0c87963e7664528344c226171f048e2e3515f22a34120d732c39689a');
 const fetchImpl=async url=>({ok:true,arrayBuffer:async()=>fs.readFileSync(new URL(`../preview/cannon-r11/${new URL(url).pathname.split('/').at(-1)}`,import.meta.url))});
 const pins=await verifyRuntimeSourcePins({fetchImpl,cryptoImpl:webcrypto});assert.equal(pins.shaderSha256,EXPECTED_SOURCE_PINS.shaderSha256);
 await assert.rejects(verifyRuntimeSourcePins({fetchImpl:async()=>({ok:true,arrayBuffer:async()=>Buffer.from('wrong')}),cryptoImpl:webcrypto}),/source pin mismatch/);
 // The runtime wrapper is constrained to this exact version/source-pin substitution.
 let expected=fs.readFileSync(new URL('source-r10/main.mjs',root),'utf8');
 for(const [a,b] of [['alchemy-cannon-sol61-r10','alchemy-cannon-sol61-r11'],['alchemy-cannon-new-e-sol61-r10','alchemy-cannon-new-e-sol61-r11'],['a532bbefe31fa73c04c3f8bb66ce1d8dc83e21a61423c4d7b5bc33c56b1cc3b4','73054d8a0c87963e7664528344c226171f048e2e3515f22a34120d732c39689a'],['bbbcf682cbd43de7b221ff164973ccf81606ac8fb6bd4634c15754a6c3edac20','c8e4242b2aba9aea85e2518ef5e6d0556e2a4bfeb170f65e44eedb4e50a4c17d'],['R10 runtime version','R11 runtime version'],['R10 imported shader export pin','R11 imported shader export pin'],['__cannonR10SourcePins','__cannonR11SourcePins']]){assert.equal(expected.split(a).length-1,1,a);expected=expected.replace(a,b);}
 assert.equal(fs.readFileSync(new URL('preview/cannon-r11/main.mjs',root),'utf8').trimEnd(),expected.trimEnd());
 const oldHtml=fs.readFileSync(new URL('source-r10/gallery.html',root),'utf8');assert.equal(fs.readFileSync(new URL('preview/cannon-r11/gallery.html',root),'utf8').trimEnd(),oldHtml.replaceAll('r10','r11').replaceAll('R10','R11').trimEnd());
});

test('event validation, activation and beam tuple semantics match the settled sampler',()=>{
 assert.equal(FRAME_VERTEX_FLOATS,8);
 for(const type of Object.keys(DURATIONS))for(const variant of ['continuous','gbo-tenfold'])for(const observation of [true,false])for(const reducedMotion of [true,false])for(const age of [-1,0,28,100,220,330,419,420,520,899,900]){
  const e=event(`sampler-${type}-${variant}-${age}-${observation}-${reducedMotion}`,type);e.variant=variant;
  assert.deepEqual(sampleEvent(e,age,e.handWorld.frameId,{observation,reducedMotion}),sampleR10(e,age,e.handWorld.frameId,{observation,reducedMotion}));
 }
 for(const variant of ['continuous','gbo-tenfold'])for(const age of [0,55,90,150,220,280,330,419,420,520,899,900]){
  const id=`activation-${variant}-${age}`,e=event(id,'alchemy-particle-cannon');e.variant=variant;
  assert.deepEqual(sampleEvent(e,age,e.handWorld.frameId,{observation:true}),sampleR9(e,age,e.handWorld.frameId,{observation:true}));
 }
 const beam=event('tuple');validateEvent(beam,beam.handWorld.frameId);const vertices=sampleEvent(beam,220,beam.handWorld.frameId).vertices;
 assert.equal(vertices.length%8,0);assert(vertices.some((v,i)=>i%8===6&&v===-2));assert(vertices.some((v,i)=>i%8===6&&v===-1));
 for(let i=0;i<vertices.length;i+=8)if(vertices[i+6]<0){assert([-1,-2].includes(vertices[i+6]));assert(Math.abs(vertices[i+3])<=31);}
});

test('R11 finite sleeve stays inside the ABI supports with a connected strong-white corridor',()=>{
 let mainMax=0,obsMax=0,minWhite=Infinity,samples=0;
 for(const reducedMotion of [false,true])for(const age of [0,28,100,150,220,280,330,419])for(let i=0;i<=100;i++){
  const u=i/100,g=sampleTransportGeometry(u,age,{reducedMotion});assert([g.radius,g.center,g.q,g.fold,g.faceLow,g.faceHigh,g.crease].every(Number.isFinite));
  assert(g.fold>=0&&g.fold<=1+1e-12);const main=Math.abs(g.center)+g.radius,obs=main+4*g.axial;
  mainMax=Math.max(mainMax,main);obsMax=Math.max(obsMax,obs);assert(main<=21+1e-12&&main<27);assert(obs<=25+1e-12&&obs<31);
  if(u>=.06&&u<=.86){const w=Math.min(g.faceHigh,g.crease)-g.faceLow;minWhite=Math.min(minWhite,w);assert(w>=6-1e-12);}
  samples++;
 }
 assert(samples>0&&mainMax<=21&&obsMax<=25&&minWhite>=6);assert.equal(sampleChargeSurfaces(.5,0,220).map(s=>s.role).join(','),'sidewall,white-main-face,near-return-face');
});

test('R11 parcel transport is advective; reduced motion freezes it and OBS remains one envelope',()=>{
 for(const u of [.15,.25,.4,.55,.7])for(const age of [28,100,150,220]){
  const dt=21,u2=u+1.22*dt/420,a=sampleTransportGeometry(u,age),b=sampleTransportGeometry(u2,age+dt);assert(Math.abs(a.q-b.q)<1e-12);
  for(const k of ['b0','b1','b2','fold'])assert(Math.abs(a[k]-b[k])<1e-12);
  for(const k of ['radius','center','faceLow','faceHigh','crease'])assert(Math.abs(a[k]/a.axial-b[k]/b.axial)<1e-10);
 }
 for(const u of [.1,.3,.5,.7,.9])for(const age of [0,100,220,419])assert.deepEqual(sampleTransportMaterial(u,0,age,{reducedMotion:true}),sampleTransportMaterial(u,0,0,{reducedMotion:true}));
 assert.equal(sampleChargeSheets(.5,0,220,{spread:4}).length,1);assert.equal(sampleChargeSheets(.5,0,220,{spread:4})[0].role,'observer-envelope');
});

test('R11 role surfaces implement near-return occlusion without losing the bright connected face',()=>{
 let checks=0;
 for(const age of [100,150,220,280,330])for(const q of [-.72,-.23,.18]){
  const u=q+1.22*age/420;if(u<.06||u>.86)continue;const g=sampleTransportGeometry(u,age),surfaces=sampleChargeSurfaces(u,(g.crease+g.faceHigh)/2,age);
  assert.deepEqual(surfaces.map(s=>s.role),['sidewall','white-main-face','near-return-face']);assert.deepEqual(surfaces.map(s=>s.depth).sort((a,b)=>a-b),surfaces.map(s=>s.depth));
  assert.equal(surfaces[2].coverage,1);const hidden=sampleTransportMaterial(u,((g.crease+g.faceHigh)/2-g.center)/g.radius,age);assert(hidden.color[0]<1&&hidden.color[1]>1&&hidden.color[2]>1);
  const y=(g.faceLow+Math.min(g.crease,g.faceHigh))/2,white=sampleTransportMaterial(u,(y-g.center)/g.radius,age);assert(white.color[0]>35&&white.color[1]>21&&white.color[2]>6.5);checks++;
 }
 assert(checks>=7);for(const bad of [NaN,Infinity])assert.throws(()=>sampleTransportGeometry(.4,bad));assert.throws(()=>sampleChargeSheets(.4,0,220,{spread:5}));assert.throws(()=>sampleTransportMaterial(.4,0,220,{steps:0}));
});

test('root capture API provides same-cause 220 ON/OFF and exact beam expiry evidence',()=>{
 const request=parsePulseReviewRequest(new URLSearchParams('pulsePhase=220&causeId=cannon-r11-root-review&variant=continuous'));
 assert.equal(request.eventId,'alchemy-cannon-review:cannon-r11-root-review');const e=event(request.eventId),active=sampleEvent(e,220,e.handWorld.frameId,{observation:true});
 const off=sampleEvent(e,220,e.handWorld.frameId,{observation:false});assert.equal(active.id,off.id);assert(active.vertices.length>0&&off.vertices.length>0);
 const display={cssRect:{left:0,top:0,width:960,height:540},backing:{width:960,height:540},devicePixelRatio:1,view16:[960,540,0,0],view16Bytes:16};
 const proof=createNativePulseProof({request,frameId:e.handWorld.frameId,sample:active,submittedFrames:1,lastDraw:{elapsedMs:220,activeEvents:[{id:e.id,type:e.type,ageMs:220}],submitSequence:1,display},queue:{completedAt:'done',error:null}});
 assert.equal(proof.causeId,'cannon-r11-root-review');assert.equal(proof.requestedAgeMs,220);assert.equal(proof.completed,true);
 const expiry=parsePulseReviewRequest(new URLSearchParams('pulsePhase=420&causeId=cannon-r11-root-review&variant=continuous'));const empty=sampleEvent(e,420,e.handWorld.frameId);
 assert(expiry.expiry);assert.equal(empty.vertices.length,0);const expiryProof=createNativePulseProof({request:expiry,frameId:e.handWorld.frameId,sample:null,submittedFrames:2,lastDraw:{elapsedMs:420,activeEvents:[],expiredEventCount:1,submitSequence:2,display,reviewCapture:{eventId:expiry.eventId,causeId:expiry.causeId,requestedAgeMs:420,expiry:true}},queue:{completedAt:'done',error:null}});
 assert.equal(expiryProof.kind,'native-pulse-expiry');assert.equal(expiryProof.causeId,proof.causeId);assert.equal(expiryProof.vertexCount,0);
});

test('gallery startup and SFX contract retain identity checks and verify hard mute',async()=>{
 assert.equal(readControlQuery(new URLSearchParams('observation=0&source=1'),'observation',true),false);assert.equal(readControlQuery(new URLSearchParams(),'observation',true),true);
 const messages=[],report=createStartupReporter({galleryStartupToken:'a'.repeat(32),galleryVersionId:GALLERY_VERSION_ID,galleryAttemptEpoch:'2'},m=>messages.push(m));assert(report.enabled);report.send('child-document','ready');assert.equal(report.snapshot().versionId,GALLERY_VERSION_ID);
 let played=0;const audio={muted:false,async unlockFromGesture(){return true;},async playActivation(){played++;return true;}};
 const handler=createGallerySfxHandler({audio,verify:false,getRun:()=>({mode:'activation',startedAt:0}),now:()=>30,start:()=>true});assert.equal(await handler.activateFromGesture({id:GALLERY_VERSION_ID}),true);assert.equal(played,1);
 const muted=createGallerySfxHandler({audio,verify:true,getRun:()=>({mode:'activation',startedAt:0}),now:()=>30,start:()=>true});assert.equal(await muted.activateFromGesture({id:GALLERY_VERSION_ID}),false);assert.equal(played,1);
});

test('WebGPU renderer preserves 32-byte tuple offsets, View16 and exact R11 shader bytes',async()=>{
 globalThis.GPUBufferUsage={UNIFORM:1,COPY_DST:2,VERTEX:4};const writes=[],draws=[],buffers=[];let descriptor,shaderCode,passes=0;
 const device={lost:Promise.resolve({reason:'none'}),queue:{writeBuffer(buffer,offset,data){writes.push({buffer,offset,data:new data.constructor(data)});},submit(){}},addEventListener(){},async pushErrorScope(){},async popErrorScope(){return null;},createShaderModule({code}){shaderCode=code;return{async getCompilationInfo(){return{messages:[]}}};},createRenderPipeline(d){descriptor=d;return{getBindGroupLayout(i){return{index:i};}};},createBuffer(d){const b={...d,destroy(){}};buffers.push(b);return b;},createBindGroup(d){return d;},createCommandEncoder(){return{beginRenderPass(){passes++;return{setPipeline(){},setBindGroup(){},setVertexBuffer(){},draw(n){draws.push(n);},end(){}};},finish(){return{};}};},destroy(){}};
 const context={configure(o){assert.equal(o.alphaMode,'premultiplied');assert.equal(o.format,'bgra8unorm');},getCurrentTexture(){return{createView(){return{};}};}};
 const gpu={async requestAdapter(){return{async requestDevice(){return device;}};},getPreferredCanvasFormat(){return'bgra8unorm';}};
 const canvas={width:960,height:540,clientWidth:960,clientHeight:540,isConnected:true,getBoundingClientRect(){return{left:0,top:0,width:960,height:540};},getContext(t){assert.equal(t,'webgpu');return context;}};
 const renderer=await createWebGPURenderer(canvas,gpu);assert.equal(shaderCode,SHADER);assert.deepEqual(descriptor.vertex.buffers[0],{arrayStride:32,attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x4'},{shaderLocation:2,offset:24,format:'float32x2'}]});
 const e=event('r11-mock-gpu'),sample=sampleEvent(e,220,e.handWorld.frameId),body=fixtureBodyVertices({pulseAgesMs:[220]});const result=renderer.render([sample],{observation:true,sourceEnabled:true,elapsedMs:220,bodyVertices:body});
 const uniform=writes.find(w=>w.buffer.usage&GPUBufferUsage.UNIFORM),vertex=writes.find(w=>w.buffer.usage&GPUBufferUsage.VERTEX);assert.equal(uniform.data.byteLength,16);assert.deepEqual(vertex.data.slice(body.length),sample.vertices);assert.equal(draws[0],result.vertexCount);assert.equal(passes,1);renderer.destroy();
});
