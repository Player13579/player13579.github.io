import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {routeOptions} from './route.mjs';

const main=await readFile(new URL('./main.mjs',import.meta.url),'utf8');

test('embed selects requested target and forces silence even with verify=0',()=>{
  assert.deepEqual(routeOptions('?embed=1&target=A&verify=0'),{embed:true,target:'A',verify:true});
  assert.deepEqual(routeOptions('?embed=1&target=B&verify=1'),{embed:true,target:'B',verify:true});
});

test('normal manual mode keeps its original verify and audio opt-in semantics',()=>{
  assert.deepEqual(routeOptions('?target=B&verify=0'),{embed:false,target:'B',verify:false});
  assert.deepEqual(routeOptions('?target=unknown'),{embed:false,target:null,verify:true});
});

test('embed starts fresh synthetic receipts after WebGPU boot and pauses/cleans its loop',()=>{
  assert.match(main,/if\(embed\)scheduleEmbedReplay\(\)/);
  assert.match(main,/automatic\?'normal':\$\('eventCase'\)\.value/);
  assert.match(main,/objectCausalId:`preview-only-\$\{\+\+sequence\}`/);
  assert.match(main,/scheduleEmbedReplay\(2600\)/);
  assert.match(main,/document\.hidden/);
  assert.match(main,/replayStopped=true/);
  assert.match(main,/new FacilityAudio\(\{verify:true\}\)/);
});
