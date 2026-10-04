import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { VERSION,DURATIONS,SHADER,validateEvent,sampleEvent,sampleTransportGeometry } from '../preview/cannon-r12/effect.mjs';
import { GALLERY_VERSION_ID,FRAME_VERTEX_FLOATS,fixtureBodyVertices,collectActiveSamples,readControlQuery,createStartupReporter,createGallerySfxHandler,parsePulseReviewRequest,createNativePulseProof,createWebGPURenderer,EXPECTED_SOURCE_PINS,verifyRuntimeSourcePins } from '../preview/cannon-r12/main.mjs';
import { sampleEvent as sampleR11 } from '../../test-support/finish-cannon-r11-creative-sol61-r1/effect.mjs';

const root = new URL('../', import.meta.url);
const ownedRoot = new URL('../../', import.meta.url);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readRoot = route => fs.readFileSync(new URL(route, root));
const event = (id, type = 'alchemy-particle-beam', frameId = 'r12-frame') => ({
  id, type, playerId: 'fixture-player', variant: 'continuous', startedAt: 0,
  x: 146, y: 270, targetX: 760, targetY: 270,
  handWorld: { x: 160, y: 270, eventId: id, playerId: 'fixture-player', frameId }
});

test('R12 effect, exported WGSL shader and exact audio bytes match the supplied unsealed pins', async () => {
  assert.equal(VERSION, 'alchemy-cannon-new-e-sol61-r12');
  assert.equal(GALLERY_VERSION_ID, 'alchemy-cannon-sol61-r12');
  assert.deepEqual(DURATIONS, { 'alchemy-particle-cannon': 900, 'alchemy-particle-beam': 420 });
  assert.equal(sha(readRoot('preview/cannon-r12/effect.mjs')), 'a083818c5c4c09c90c56c727b9e893329cf8e1bb13f873569585c7a88fa1eb59');
  assert.equal(sha(readRoot('preview/cannon-r12/audio.mjs')), '683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
  assert.equal(sha(Buffer.from(SHADER)), 'c6b03455df10f3006c0a3754d974071180ccde451a5314cd61e341d6963e1aa4');
  assert.equal(EXPECTED_SOURCE_PINS.effectModuleSha256, 'a083818c5c4c09c90c56c727b9e893329cf8e1bb13f873569585c7a88fa1eb59');
  const fetchImpl = async url => ({ ok: true, arrayBuffer: async () => readRoot(`preview/cannon-r12/${new URL(url).pathname.split('/').at(-1)}`) });
  const pins = await verifyRuntimeSourcePins({ fetchImpl, cryptoImpl: webcrypto });
  assert.equal(pins.shaderSha256, EXPECTED_SOURCE_PINS.shaderSha256);
  await assert.rejects(verifyRuntimeSourcePins({ fetchImpl: async () => ({ ok: true, arrayBuffer: async () => Buffer.from('wrong') }), cryptoImpl: webcrypto }), /source pin mismatch/);
});

test('main and gallery are exact R11 adapter identity/hash adaptations', () => {
  let expected = fs.readFileSync(new URL('source-r11/main.mjs', ownedRoot), 'utf8');
  for (const [from,to] of [
    ['alchemy-cannon-sol61-r11','alchemy-cannon-sol61-r12'],
    ['alchemy-cannon-new-e-sol61-r11','alchemy-cannon-new-e-sol61-r12'],
    ['73054d8a0c87963e7664528344c226171f048e2e3515f22a34120d732c39689a','a083818c5c4c09c90c56c727b9e893329cf8e1bb13f873569585c7a88fa1eb59'],
    ['c8e4242b2aba9aea85e2518ef5e6d0556e2a4bfeb170f65e44eedb4e50a4c17d','c6b03455df10f3006c0a3754d974071180ccde451a5314cd61e341d6963e1aa4'],
    ['__cannonR11SourcePins','__cannonR12SourcePins'], ['R11','R12'], ['r11','r12']
  ]) {
    if (!['R11','r11'].includes(from)) assert.equal(expected.split(from).length - 1, 1, `single intended adaptation token ${from}`);
    expected = expected.replaceAll(from,to);
  }
  assert.equal(readRoot('preview/cannon-r12/main.mjs').toString('utf8').trimEnd(), expected.trimEnd());
  const sourceHtml = fs.readFileSync(new URL('source-r11/gallery.html', ownedRoot), 'utf8');
  assert.equal(readRoot('preview/cannon-r12/gallery.html').toString('utf8').trimEnd(), sourceHtml.replaceAll('r11','r12').replaceAll('R11','R12').trimEnd());
});

test('32-byte event tuple semantics and actual endpoint/lifetime remain inherited from R11', () => {
  assert.equal(FRAME_VERTEX_FLOATS, 8);
  for (const type of Object.keys(DURATIONS)) for (const variant of ['continuous','gbo-tenfold'])
    for (const observation of [true,false]) for (const reducedMotion of [true,false])
      for (const age of [-1,0,28,100,150,210,220,280,330,390,419,420,520,899,900]) {
        const e = event(`r12-parity-${type}-${variant}-${age}-${observation}-${reducedMotion}`, type);
        e.variant = variant;
        const current = sampleEvent(e, age, e.handWorld.frameId, { observation, reducedMotion });
        const previous = sampleR11(e, age, e.handWorld.frameId, { observation, reducedMotion });
        assert.deepEqual(current, previous);
        if (age >= 0 && age < DURATIONS[type] && type === 'alchemy-particle-beam') {
          assert.deepEqual(current.endpoint, {x:e.targetX,y:e.targetY});
          assert.equal(current.vertices.length % 8, 0);
        }
      }
  const e = event('r12-source-gate');
  assert.equal(validateEvent(e,e.handWorld.frameId), true);
  assert.equal(collectActiveSamples([e],220,e.handWorld.frameId,{sourceEnabled:false}).length,0);
  assert.equal(sampleEvent(e,420,e.handWorld.frameId).vertices.length,0);
});

test('R12 front samples are monotonic, finite, and reduced shape is settled without moving expiry', () => {
  const values = [28,100,150,200,210].map(age => sampleTransportGeometry(.5,age).front);
  for (let i=1;i<values.length;i++) assert(values[i] > values[i-1]);
  assert.equal(values.at(-1),1);
  assert.equal(sampleTransportGeometry(.5,28,{reducedMotion:true}).shapeAge,210);
  assert.deepEqual(sampleEvent(event('r12-reduced'),420,'r12-frame',{reducedMotion:true}).vertices,new Float32Array());
});

test('root capture API preserves the same cause and exact 420 ms expiry contract', () => {
  const request = parsePulseReviewRequest(new URLSearchParams('pulsePhase=220&causeId=cannon-r12-root-review&variant=continuous'));
  const e = event(request.eventId), on = sampleEvent(e,220,e.handWorld.frameId,{observation:true});
  const off = sampleEvent(e,220,e.handWorld.frameId,{observation:false});
  assert.equal(on.id,off.id); assert(on.vertices.length > 0 && off.vertices.length > 0);
  const display = {cssRect:{left:0,top:0,width:960,height:540},backing:{width:960,height:540},devicePixelRatio:1,view16:[960,540,0,0],view16Bytes:16};
  const proof = createNativePulseProof({request,frameId:e.handWorld.frameId,sample:on,submittedFrames:1,
    lastDraw:{elapsedMs:220,activeEvents:[{id:e.id,type:e.type,ageMs:220}],submitSequence:1,display},
    queue:{completedAt:'done',error:null}});
  assert.equal(proof.causeId,'cannon-r12-root-review'); assert.equal(proof.completed,true);
  const expiry = parsePulseReviewRequest(new URLSearchParams('pulsePhase=420&causeId=cannon-r12-root-review&variant=continuous'));
  const empty = sampleEvent(e,420,e.handWorld.frameId);
  assert.equal(empty.vertices.length,0); assert.equal(expiry.expiry,true);
  const expiryProof = createNativePulseProof({request:expiry,frameId:e.handWorld.frameId,sample:null,submittedFrames:2,
    lastDraw:{elapsedMs:420,activeEvents:[],expiredEventCount:1,submitSequence:2,display,
      reviewCapture:{eventId:expiry.eventId,causeId:expiry.causeId,requestedAgeMs:420,expiry:true}},
    queue:{completedAt:'done',error:null}});
  assert.equal(expiryProof.kind,'native-pulse-expiry'); assert.equal(expiryProof.causeId,proof.causeId);
});

test('gallery control, startup identity and verification hard-mute remain unchanged', async () => {
  assert.equal(readControlQuery(new URLSearchParams('observation=0&source=1'),'observation',true),false);
  const messages=[];
  const startup=createStartupReporter({galleryStartupToken:'a'.repeat(32),galleryVersionId:GALLERY_VERSION_ID,galleryAttemptEpoch:'2'},m=>messages.push(m));
  assert(startup.enabled); startup.send('child-document','ready'); assert.equal(startup.snapshot().versionId,GALLERY_VERSION_ID);
  let played=0; const audio={muted:false,async unlockFromGesture(){return true;},async playActivation(){played++;return true;}};
  const normal=createGallerySfxHandler({audio,verify:false,getRun:()=>({mode:'activation',startedAt:0}),now:()=>30,start:()=>true});
  assert.equal(await normal.activateFromGesture({id:GALLERY_VERSION_ID}),true); assert.equal(played,1);
  const verify=createGallerySfxHandler({audio,verify:true,getRun:()=>({mode:'activation',startedAt:0}),now:()=>30,start:()=>true});
  assert.equal(await verify.activateFromGesture({id:GALLERY_VERSION_ID}),false); assert.equal(played,1);
});

test('WebGPU adapter retains tuple offsets and View16 while importing exact R12 shader', async () => {
  globalThis.GPUBufferUsage={UNIFORM:1,COPY_DST:2,VERTEX:4};
  const writes=[],draws=[],buffers=[]; let descriptor,shaderCode,passes=0;
  const device={lost:Promise.resolve({reason:'none'}),queue:{writeBuffer(buffer,offset,data){writes.push({buffer,offset,data:new data.constructor(data)});},submit(){}},
    addEventListener(){},async pushErrorScope(){},async popErrorScope(){return null;},
    createShaderModule({code}){shaderCode=code;return{async getCompilationInfo(){return{messages:[]}}};},
    createRenderPipeline(d){descriptor=d;return{getBindGroupLayout(i){return{index:i};}};},
    createBuffer(d){const b={...d,destroy(){}};buffers.push(b);return b;},createBindGroup(d){return d;},
    createCommandEncoder(){return{beginRenderPass(){passes++;return{setPipeline(){},setBindGroup(){},setVertexBuffer(){},draw(n){draws.push(n);},end(){}};},finish(){return{};}};},destroy(){}};
  const context={configure(o){assert.equal(o.alphaMode,'premultiplied');assert.equal(o.format,'bgra8unorm');},getCurrentTexture(){return{createView(){return{};}};}};
  const gpu={async requestAdapter(){return{async requestDevice(){return device;}};},getPreferredCanvasFormat(){return'bgra8unorm';}};
  const canvas={width:960,height:540,clientWidth:960,clientHeight:540,isConnected:true,getBoundingClientRect(){return{left:0,top:0,width:960,height:540};},getContext(t){assert.equal(t,'webgpu');return context;}};
  const renderer=await createWebGPURenderer(canvas,gpu);
  assert.equal(shaderCode,SHADER);
  assert.deepEqual(descriptor.vertex.buffers[0],{arrayStride:32,attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x4'},{shaderLocation:2,offset:24,format:'float32x2'}]});
  const e=event('r12-mock-gpu'),sample=sampleEvent(e,220,e.handWorld.frameId),body=fixtureBodyVertices({pulseAgesMs:[220]});
  const result=renderer.render([sample],{observation:true,sourceEnabled:true,elapsedMs:220,bodyVertices:body});
  const uniform=writes.find(w=>w.buffer.usage&GPUBufferUsage.UNIFORM),vertex=writes.find(w=>w.buffer.usage&GPUBufferUsage.VERTEX);
  assert.equal(uniform.data.byteLength,16);assert.deepEqual(vertex.data.slice(body.length),sample.vertices);
  assert.equal(draws[0],result.vertexCount);assert.equal(passes,1);renderer.destroy();
});
