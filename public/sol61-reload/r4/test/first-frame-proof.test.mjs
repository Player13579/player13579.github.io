import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeMockGpu } from '../mock-gpu.mjs';
import { createReloadRenderer, planReloadInput } from '../runtime.mjs';
import { planReloadFrame, packReloadUniform, SHADER_ENTRIES, UNIFORM_BYTES } from '../creative/reload-e-sol61-r4.mjs';
import { createGalleryStartup } from '../startup-bootstrap.mjs';

const passOrder=['world+emission','blur-x','blur-y','composite'];
function startup() {
  const parent={messages:[],postMessage(message){this.messages.push(message);}};
  const env={parent,location:{search:'?galleryStartupToken=token&galleryVersionId=reload-e-zero-sol61-r1&galleryAttemptEpoch=7',origin:'https://gallery.invalid'},performance:{now:()=>42},addEventListener(){},removeEventListener(){}};
  return {api:createGalleryStartup(env),parent};
}
function proof(extra={}) { return {recorded:true,submitted:true,completed:true,nonzeroEmission:true,emissionReadback:{region:{x:0,y:0,width:32,height:32,bytesPerRow:256},finiteRgbComponents:3072,nonFiniteRgbComponents:0,positiveRgbComponents:1,maxRgb:[1,0,0]},canvasConnected:true,causeId:'fixture:reload-1:start',submitId:9,phase:'start',ageMs:41,passOrder:[...passOrder],passes:4,viewportWidth:320,viewportHeight:180,generation:3,targetGeneration:6,...extra}; }

test('first-frame proof retains exact cause, submit and recorded pass sequence',()=>{
  const {api,parent}=startup();
  assert.equal(api.ready(proof()),true);
  const snap=api.snapshot();
  assert.equal(snap.firstFrame.causeId,'fixture:reload-1:start');
  assert.equal(snap.firstFrame.submitId,9);
  assert.deepEqual(snap.firstFrame.passOrder,passOrder);
  assert.deepEqual(snap.firstFrame.emissionReadback.maxRgb,[1,0,0]);
  assert.equal(parent.messages.at(-1).firstFrame.submitId,9);
});

test('missing cause, submit, or pass-order evidence cannot become ready',()=>{
  for(const patch of [{causeId:''},{submitId:null},{passOrder:['world+emission','blur-y','blur-x','composite']},{emissionReadback:null},{emissionReadback:{region:{x:0,y:0,width:32,height:32,bytesPerRow:256},finiteRgbComponents:3072,nonFiniteRgbComponents:0,positiveRgbComponents:0,maxRgb:[0,0,0]}}]) {
    const {api,parent}=startup();
    assert.equal(api.ready(proof(patch)),false);
    assert.equal(api.snapshot().status,'pending');
    assert.equal(parent.messages.length,0);
  }
});

test('first-frame renderer returns numeric emission readback from the awaited four-pass submission',async()=>{
  const shaderSource=await readFile(new URL('../creative/reload-e-sol61-r4.wgsl',import.meta.url),'utf8');
  const mock=makeMockGpu();
  const renderer=await createReloadRenderer({canvas:mock.canvas,gpu:mock.gpu,device:mock.device,shaderSource,shaderEntries:SHADER_ENTRIES,uniformBytes:UNIFORM_BYTES,packReloadUniform});
  await renderer.resize({width:320,height:180});
  const input=planReloadInput({causeId:'fixture:numeric',clockKind:'fixture',phase:'start',weaponId:'handgun',ageMs:40,pending:true,viewport:[320,180],anchor:[160,100],heightPx:64,sourceOn:true,obsOn:true,mainOn:true,visibility:1,strength:1,angleRad:0.18,reducedMotion:false},planReloadFrame);
  const result=await renderer.render(input,{awaitCompletion:true,verifyEmission:true});
  assert.equal(result.completed,true); assert.equal(result.emissionNonzero,true);
  assert.equal(result.causeId,input.causeId); assert.equal(result.submitId,1);
  assert.equal(result.emissionReadback.positiveRgbComponents,1);
  assert.ok(result.emissionReadback.maxRgb.every(Number.isFinite));
  assert.equal(result.emissionReadback.region.width,256);
  await renderer.dispose();
});
