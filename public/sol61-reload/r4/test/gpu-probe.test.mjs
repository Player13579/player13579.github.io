import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeMockGpu } from '../mock-gpu.mjs';
import { createReloadRenderer, planReloadInput } from '../runtime.mjs';
import { planReloadFrame, packReloadUniform, SHADER_ENTRIES, UNIFORM_BYTES } from '../creative/reload-e-sol61-r4.mjs';

const shaderSource = await readFile(new URL('../creative/reload-e-sol61-r4.wgsl', import.meta.url), 'utf8');
function plan({ causeId='fixture:one-shot', phase='complete', ageMs=800, sourceOn=true, mainOn=true, obsOn=true }={}) {
  return planReloadInput({ causeId, clockKind:'fixture', phase, weaponId:'handgun', ageMs, pending:false, viewport:[320,180], anchor:[160,100], heightPx:64, sourceOn, obsOn, mainOn, visibility:1, strength:1, angleRad:0.18, reducedMotion:false }, planReloadFrame);
}
async function setup(options={}) {
  const mock=makeMockGpu(options);
  const renderer=await createReloadRenderer({canvas:mock.canvas,gpu:mock.gpu,device:mock.device,shaderSource,shaderEntries:SHADER_ENTRIES,uniformBytes:UNIFORM_BYTES,packReloadUniform});
  await renderer.resize({width:320,height:180});
  return {mock,renderer};
}
async function waitProbe(renderer) {
  for (let i=0;i<20 && !renderer.snapshot().lastDiagnosticProbe;i++) await new Promise(resolve=>setImmediate(resolve));
  return renderer.snapshot().lastDiagnosticProbe;
}

test('manual probe captures one bounded three-texture region from the same four-pass encoder after queueDone', async () => {
  const {mock,renderer}=await setup({seedReadbacks:true});
  let fresh=true;
  const input=plan({mainOn:false,ageMs:275});
  const result=await renderer.render(input,{awaitCompletion:false,diagnosticProbe:{id:'probe-1',epoch:'attempt-7',causeId:input.causeId,phase:input.phase,ageMs:input.ageMs,isCurrent:()=>fresh}});
  assert.equal(result.submitted,true); assert.equal(result.completed,false); assert.equal(result.emissionNonzero,null);
  assert.deepEqual(mock.log.passLabels,['world+emission','blur-x','blur-y','composite']);
  assert.deepEqual(mock.log.copies.map(x=>x.texture.split('/')[1].split('-')[0]),['world','emission','blurY']);
  assert.ok(mock.log.copies.every(x=>x.width<=128&&x.height<=128));
  assert.deepEqual(mock.log.events.slice(0,2),['submit','queueDone']);
  const observed=await waitProbe(renderer);
  assert.equal(observed.id,'probe-1'); assert.equal(observed.epoch,'attempt-7'); assert.equal(observed.causeId,input.causeId);
  assert.equal(observed.submitId,1); assert.equal(observed.generation,renderer.generation); assert.equal(observed.targetGeneration,renderer.targetGeneration);
  assert.deepEqual(observed.lanes4to11,Array.from(packReloadUniform(input).slice(4,12)));
  assert.deepEqual(observed.lanes4to11.slice(4),[1,1,0,1]);
  assert.deepEqual(Object.keys(observed.textures),['world','emission','blurY']);
  assert.ok(Object.values(observed.textures).every(x=>x.nonzeroComponents>0&&x.maxAbs>0));
  assert.ok(mock.log.events.indexOf('queueDone')<mock.log.events.findIndex(x=>x.startsWith('map:')));
  fresh=false;
  await renderer.dispose();
});

test('zero-output probe is recorded as zero and never becomes first-frame readiness evidence', async () => {
  const {mock,renderer}=await setup();
  const input=plan({sourceOn:false,phase:'complete',ageMs:18182});
  const result=await renderer.render(input,{awaitCompletion:false,diagnosticProbe:{id:'zero',epoch:'attempt-zero',causeId:input.causeId,phase:input.phase,ageMs:input.ageMs,isCurrent:()=>true}});
  assert.equal(result.completed,false); assert.equal(result.emissionNonzero,null);
  const observed=await waitProbe(renderer);
  assert.deepEqual(observed.lanes4to11.slice(2,8),[1,0,0,1,1,1]);
  assert.ok(Object.values(observed.textures).every(x=>x.nonzeroComponents===0&&x.maxAbs===0));
  assert.equal(mock.log.submits,1);
  const preview=await readFile(new URL('../preview.mjs',import.meta.url),'utf8');
  const readyBlock=preview.slice(preview.indexOf('if (result.submitted && result.completed'),preview.indexOf('frameDiagnostic.rafRequested();'));
  assert.match(readyBlock,/emissionNonzero !== true/); assert.match(readyBlock,/startup\.ready\(/);
  assert.doesNotMatch(readyBlock,/diagnosticProbe/);
  assert.equal(observed.completion,'queueDone-and-readback-resolved');
  await renderer.dispose();
});

test('late epoch/cause probe cannot overwrite the read-only snapshot', async () => {
  const {renderer}=await setup({seedReadbacks:true});
  const input=plan();
  await renderer.render(input,{awaitCompletion:false,diagnosticProbe:{id:'late',epoch:'old-epoch',causeId:input.causeId,phase:input.phase,ageMs:input.ageMs,isCurrent:()=>false}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(renderer.snapshot().lastDiagnosticProbe,null);
  await renderer.dispose();
});

test('ordinary RAF render adds no readback copies or extra queue completion call', async () => {
  const {mock,renderer}=await setup();
  const input=plan({ageMs:100});
  const result=await renderer.render(input);
  assert.equal(result.submitted,true);
  assert.equal(result.causeId,input.causeId); assert.equal(result.submitId,1);
  assert.deepEqual(result.passesInOrder,['world+emission','blur-x','blur-y','composite']);
  assert.equal(result.submitId,renderer.snapshot().submitCount);
  assert.equal(mock.log.copies.length,0);
  assert.deepEqual(mock.log.events,['submit','queueDone']);
  await renderer.dispose();
});
