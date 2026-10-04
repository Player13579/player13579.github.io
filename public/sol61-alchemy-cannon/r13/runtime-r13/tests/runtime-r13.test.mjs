import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { VERSION,DURATIONS,SHADER,validateEvent,sampleEvent,sampleTransportGeometry } from '../preview/cannon-r13/effect.mjs';
import { GALLERY_VERSION_ID,FRAME_VERTEX_FLOATS,fixtureBodyVertices,collectActiveSamples,readControlQuery,createStartupReporter,createGallerySfxHandler,parsePulseReviewRequest,createPulseReviewEvent,getFrameEvents,createNativePulseProof,createRestartCurrentHandler,createWebGPURenderer,EXPECTED_SOURCE_PINS,verifyRuntimeSourcePins } from '../preview/cannon-r13/main.mjs';
import { sampleEvent as sampleR11 } from '../test-support/finish-cannon-r11-creative-sol61-r1/effect.mjs';
import { sampleEvent as sampleR12 } from '../test-support/finish-cannon-r12-creative-sol61-r1/effect.mjs';

const root = new URL('../', import.meta.url);
const ownedRoot = new URL('../', import.meta.url);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readRoot = route => fs.readFileSync(new URL(route, root));
const event = (id, type = 'alchemy-particle-beam', frameId = 'r13-frame') => ({
  id, type, playerId: 'fixture-player', variant: 'continuous', startedAt: 0,
  x: 146, y: 270, targetX: 760, targetY: 270,
  handWorld: { x: 160, y: 270, eventId: id, playerId: 'fixture-player', frameId }
});

test('R13 effect, exported WGSL shader and exact audio bytes match the supplied unsealed pins', async () => {
  assert.equal(VERSION, 'alchemy-cannon-new-e-sol61-r13');
  assert.equal(GALLERY_VERSION_ID, 'alchemy-cannon-sol61-r13');
  assert.deepEqual(DURATIONS, { 'alchemy-particle-cannon': 900, 'alchemy-particle-beam': 420 });
  assert.equal(sha(readRoot('preview/cannon-r13/effect.mjs')), '281cf3907cd90ef8b0a1623f8f9394854312dd8b7064e1ed5511fa5e1cade7a8');
  assert.equal(sha(readRoot('preview/cannon-r13/audio.mjs')), '683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
  assert.equal(sha(Buffer.from(SHADER)), 'adf1a666c74e8df2ff1bbe366e5fb5c198580d9e8d97994ad763af7d5e8b2f8b');
  assert.equal(EXPECTED_SOURCE_PINS.effectModuleSha256, '281cf3907cd90ef8b0a1623f8f9394854312dd8b7064e1ed5511fa5e1cade7a8');
  const fetchImpl = async url => ({ ok: true, arrayBuffer: async () => readRoot(`preview/cannon-r13/${new URL(url).pathname.split('/').at(-1)}`) });
  const pins = await verifyRuntimeSourcePins({ fetchImpl, cryptoImpl: webcrypto });
  assert.equal(pins.shaderSha256, EXPECTED_SOURCE_PINS.shaderSha256);
  await assert.rejects(verifyRuntimeSourcePins({ fetchImpl: async () => ({ ok: true, arrayBuffer: async () => Buffer.from('wrong') }), cryptoImpl: webcrypto }), /source pin mismatch/);
});

test('ordinary attempt preserves its exact R13 adapter baseline and gallery', () => {
  const baseline = fs.readFileSync(new URL('source-r12-adapter/main.mjs', ownedRoot));
  assert.equal(sha(baseline), 'a9abba461f19548f3f0fc7c20b2f90dcc62e21150c07ae3d9c62071cde78c6d6');
  const galleryBase = fs.readFileSync(new URL('source-r12-adapter/gallery-base.html', ownedRoot), 'utf8');
  assert.equal(sha(Buffer.from(galleryBase)), 'e553734992bf56a54bce435da5863512268331dd6e087aa1acc4f964dd15aae4');
  assert.equal(readRoot('preview/cannon-r13/gallery.html').toString('utf8'), galleryBase.replaceAll('r12', 'r13'));
  let expectedMain = baseline.toString('utf8');
  for (const [from, to] of [
    ['alchemy-cannon-sol61-r12', 'alchemy-cannon-sol61-r13'],
    ['alchemy-cannon-new-e-sol61-r12', 'alchemy-cannon-new-e-sol61-r13'],
    ['a083818c5c4c09c90c56c727b9e893329cf8e1bb13f873569585c7a88fa1eb59', '281cf3907cd90ef8b0a1623f8f9394854312dd8b7064e1ed5511fa5e1cade7a8'],
    ['c6b03455df10f3006c0a3754d974071180ccde451a5314cd61e341d6963e1aa4', 'adf1a666c74e8df2ff1bbe366e5fb5c198580d9e8d97994ad763af7d5e8b2f8b'],
    ['R12 runtime version', 'R13 runtime version'],
    ['R12 imported shader export', 'R13 imported shader export'],
    ['__cannonR12SourcePins', '__cannonR13SourcePins']
  ]) {
    assert.equal(expectedMain.split(from).length - 1, 1, `single bounded adapter replacement: ${from}`);
    expectedMain = expectedMain.replace(from, to);
  }
  const main = readRoot('preview/cannon-r13/main.mjs').toString('utf8');
  assert.equal(sha(Buffer.from(main)), '6c9d86a73d21da8b6c53e89be87b121773db6bc4401ca4fa8649efaff2773585');
  assert.notEqual(main, expectedMain, 'attempt 02 contains the separately scoped restart-cause repair');
  assert.match(main, /export function createRestartCurrentHandler\(/);
  assert.match(main, /const singleCauseId = mode === 'single-pulse'[\s\S]*run\?\.causeId \|\| lastSingleCauseId/);
  assert.match(main, /single-pulse restart requires its original native-review cause ID/);
  assert.match(main, /run\.mode === 'single-pulse' \? DURATIONS\['alchemy-particle-beam'\] : FIELD_MS/);
  assert.match(main, /mode === 'single-pulse' \? createPulseReviewEvent\(\{ causeId: singleCauseId, frameId,/);
  assert.match(main, /singlePulseEvent\.handWorld\?\.frameId !== run\.frameId/);
  assert.match(main, /timing: 'ordinary performance\.now \/ requestAnimationFrame'/);
  assert.match(main, /playSinglePulse: \(\{ causeId \} = \{\}\) => start\('single-pulse', \{ causeId \}\)/);
  assert.match(main, /requestedMode === 'single-pulse-ready'/);
});

test('ordinary single-pulse run stays one cause/frame through the real 420ms sampler expiry', () => {
  const startedAt = 1234.5, frameId = 'r13-ordinary-single-frame', causeId = 'cannon-r13-single-ordinary';
  const pulse = createPulseReviewEvent({ causeId, frameId, startedAt, variant: 'continuous' });
  const run = { mode: 'single-pulse', causeId, frameId, startedAt, singlePulseEvent: pulse };
  for (const elapsed of [0,28,100,150,210,220,280,330,390,419]) {
    const events = getFrameEvents(run, frameId, startedAt + elapsed, null, 'continuous');
    assert.equal(events.length, 1);
    assert.strictEqual(events[0], pulse);
    const sampled = sampleEvent(events[0], startedAt + elapsed, frameId);
    assert.equal(sampled.id, `alchemy-cannon-review:${causeId}`);
    assert.equal(sampled.ageMs, elapsed);
    assert(sampled.vertices.length > 0);
  }
  const expiryEvents = getFrameEvents(run, frameId, startedAt + 420, null, 'continuous');
  assert.equal(expiryEvents.length, 1);
  assert.strictEqual(expiryEvents[0], pulse);
  assert.equal(sampleEvent(pulse, startedAt + 420, frameId).vertices.length, 0);
  assert.equal(startedAt + 420 - pulse.startedAt, DURATIONS['alchemy-particle-beam']);
});

test('32-byte event tuple semantics and actual endpoint/lifetime remain inherited from R11', () => {
  assert.equal(FRAME_VERTEX_FLOATS, 8);
  for (const type of Object.keys(DURATIONS)) for (const variant of ['continuous','gbo-tenfold'])
    for (const observation of [true,false]) for (const reducedMotion of [true,false])
      for (const age of [-1,0,28,100,150,210,220,280,330,390,419,420,520,899,900]) {
        const e = event(`r13-parity-${type}-${variant}-${age}-${observation}-${reducedMotion}`, type);
        e.variant = variant;
        const current = sampleEvent(e, age, e.handWorld.frameId, { observation, reducedMotion });
        const previous = sampleR12(e, age, e.handWorld.frameId, { observation, reducedMotion });
        assert.deepEqual(current, previous);
        assert.deepEqual(current, sampleR11(e, age, e.handWorld.frameId, { observation, reducedMotion }));
        if (age >= 0 && age < DURATIONS[type] && type === 'alchemy-particle-beam') {
          assert.deepEqual(current.endpoint, {x:e.targetX,y:e.targetY});
          assert.equal(current.vertices.length % 8, 0);
        }
      }
  const e = event('r13-source-gate');
  assert.equal(validateEvent(e,e.handWorld.frameId), true);
  assert.equal(collectActiveSamples([e],220,e.handWorld.frameId,{sourceEnabled:false}).length,0);
  assert.equal(sampleEvent(e,420,e.handWorld.frameId).vertices.length,0);
});

test('R13 front samples are monotonic, finite, and reduced shape is settled without moving expiry', () => {
  const values = [28,100,150,200,210].map(age => sampleTransportGeometry(.5,age).front);
  for (let i=1;i<values.length;i++) assert(values[i] > values[i-1]);
  assert.equal(values.at(-1),1);
  assert.equal(sampleTransportGeometry(.5,28,{reducedMotion:true}).shapeAge,210);
  assert.deepEqual(sampleEvent(event('r13-reduced'),420,'r13-frame',{reducedMotion:true}).vertices,new Float32Array());
});

test('root capture API preserves the same cause and exact 420 ms expiry contract', () => {
  const request = parsePulseReviewRequest(new URLSearchParams('pulsePhase=220&causeId=cannon-r13-root-review&variant=continuous'));
  const e = event(request.eventId), on = sampleEvent(e,220,e.handWorld.frameId,{observation:true});
  const off = sampleEvent(e,220,e.handWorld.frameId,{observation:false});
  assert.equal(on.id,off.id); assert(on.vertices.length > 0 && off.vertices.length > 0);
  const display = {cssRect:{left:0,top:0,width:960,height:540},backing:{width:960,height:540},devicePixelRatio:1,view16:[960,540,0,0],view16Bytes:16};
  const proof = createNativePulseProof({request,frameId:e.handWorld.frameId,sample:on,submittedFrames:1,
    lastDraw:{elapsedMs:220,activeEvents:[{id:e.id,type:e.type,ageMs:220}],submitSequence:1,display},
    queue:{completedAt:'done',error:null}});
  assert.equal(proof.causeId,'cannon-r13-root-review'); assert.equal(proof.completed,true);
  const expiry = parsePulseReviewRequest(new URLSearchParams('pulsePhase=420&causeId=cannon-r13-root-review&variant=continuous'));
  const empty = sampleEvent(e,420,e.handWorld.frameId);
  assert.equal(empty.vertices.length,0); assert.equal(expiry.expiry,true);
  const expiryProof = createNativePulseProof({request:expiry,frameId:e.handWorld.frameId,sample:null,submittedFrames:2,
    lastDraw:{elapsedMs:420,activeEvents:[],expiredEventCount:1,submitSequence:2,display,
      reviewCapture:{eventId:expiry.eventId,causeId:expiry.causeId,requestedAgeMs:420,expiry:true}},
    queue:{completedAt:'done',error:null}});
  assert.equal(expiryProof.kind,'native-pulse-expiry'); assert.equal(expiryProof.causeId,proof.causeId);
});

test('real OBS/source restart handler carries the single cause through active and expired runs', () => {
  const causeId = 'cannon-r13-root-review', frameId = 'r13-restart-frame';
  const calls = [];
  let current = { mode: 'single-pulse', causeId, frameId, startedAt: 100 };
  let lastMode = 'single-pulse', lastCause = causeId;
  const restart = createRestartCurrentHandler({
    getRun: () => current, getLastMode: () => lastMode, getLastSingleCauseId: () => lastCause,
    start: (mode, options = {}) => { calls.push({ mode, options }); return options; },
    continuePulseReview: () => calls.push({ mode: 'pulse-review-resume' })
  });

  const activeRestart = restart();
  assert.equal(activeRestart.causeId, causeId);
  assert.equal(calls.at(-1).mode, 'single-pulse');
  assert.equal(calls.at(-1).options.causeId, causeId);

  current = null; // ordinary sampler reached terminal; checkbox remains available
  const expiredRestart = restart();
  assert.equal(expiredRestart.causeId, causeId);
  assert.equal(calls.at(-1).options.causeId, causeId);

  // Bind the retained restart cause to the production event/sampler/proof path,
  // so this regression check validates a real accepted event and completed proof.
  const restartedFrame = 'r13-restart-frame-2';
  const restarted = createPulseReviewEvent({ causeId: expiredRestart.causeId, frameId: restartedFrame, startedAt: 500 });
  const sampled = sampleEvent(restarted, 720, restartedFrame, { observation: false, reducedMotion: false });
  assert.equal(sampled.id, `alchemy-cannon-review:${causeId}`);
  assert.equal(sampled.ageMs, 220);
  assert(sampled.vertices.length > 0);
  const request = parsePulseReviewRequest(new URLSearchParams(`pulsePhase=220&causeId=${causeId}&variant=continuous`));
  const proof = createNativePulseProof({ request, frameId: restartedFrame, sample: sampled, submittedFrames: 1,
    lastDraw: { elapsedMs: 220, activeEvents: [{ id: restarted.id, type: restarted.type, ageMs: 220 }], submitSequence: 1,
      display: { cssRect: { left: 0, top: 0, width: 960, height: 540 }, backing: { width: 960, height: 540 },
        devicePixelRatio: 1, view16: [960, 540, 0, 0], view16Bytes: 16 } },
    queue: { completedAt: 'completed', error: null } });
  assert.equal(proof.causeId, causeId);
  assert.equal(proof.completed, true);

  let resumedHeld = false;
  const heldRestart = createRestartCurrentHandler({ getRun: () => ({ mode: 'pulse-review' }), getLastMode: () => lastMode,
    getLastSingleCauseId: () => lastCause, start: () => assert.fail('held review must not restart'),
    continuePulseReview: () => { resumedHeld = true; } });
  heldRestart();
  assert.equal(resumedHeld, true);
  const noCauseRestart = createRestartCurrentHandler({ getRun: () => null, getLastMode: () => 'single-pulse',
    getLastSingleCauseId: () => '', start: () => assert.fail('must not start a cause-less pulse'), continuePulseReview: () => {} });
  assert.equal(noCauseRestart(), undefined);
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

test('WebGPU adapter retains tuple offsets and View16 while importing exact R13 shader', async () => {
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
  const e=event('r13-mock-gpu'),sample=sampleEvent(e,220,e.handWorld.frameId),body=fixtureBodyVertices({pulseAgesMs:[220]});
  const result=renderer.render([sample],{observation:true,sourceEnabled:true,elapsedMs:220,bodyVertices:body});
  const uniform=writes.find(w=>w.buffer.usage&GPUBufferUsage.UNIFORM),vertex=writes.find(w=>w.buffer.usage&GPUBufferUsage.VERTEX);
  assert.equal(uniform.data.byteLength,16);assert.deepEqual(vertex.data.slice(body.length),sample.vertices);
  assert.equal(draws[0],result.vertexCount);assert.equal(passes,1);renderer.destroy();
});
