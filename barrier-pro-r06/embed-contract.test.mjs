import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createReplayAudioGate} from './embed-audio.mjs';

test('verification gate never initializes or plays audio',async()=>{
  let ensures=0,plays=0;
  const gate=createReplayAudioGate({verifyMode:true,sfx:{
    ensure:async()=>{ensures++;},play:async()=>{plays++;}
  }});
  assert.equal(await gate.unlock(),false);
  assert.equal(gate.enter('create'),false);
  assert.equal(gate.enter('absorb'),false);
  assert.equal(ensures,0);
  assert.equal(plays,0);
  assert.equal(gate.enabled,false);
});

test('normal gate waits for gesture and plays once per later branch transition',async()=>{
  let ensures=0;
  const plays=[];
  const gate=createReplayAudioGate({verifyMode:false,sfx:{
    ensure:async()=>{ensures++;},play:async event=>{plays.push(event);}
  }});
  assert.equal(gate.enter('create'),false);
  assert.equal(ensures,0);
  assert.equal(await gate.unlock(),true);
  assert.equal(await gate.unlock(),false);
  assert.equal(ensures,1);
  assert.equal(gate.enter('create'),false,'unlock must not replay the current event');
  assert.equal(gate.enter('create'),false,'stable frames must not replay');
  assert.equal(gate.enter('absorb'),true);
  assert.equal(gate.enter('absorb'),false);
  assert.equal(gate.enter('fracture'),true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(plays,['absorb','fracture']);
});

test('gallery wires a hidden-by-default gesture control and drives branch transitions',async()=>{
  const html=await readFile(new URL('./embed.html',import.meta.url),'utf8');
  const source=await readFile(new URL('./embed.mjs',import.meta.url),'utf8');
  assert.match(html,/<div id="audio-control" hidden/);
  assert.match(source,/new URLSearchParams\(location\.search\)\.has\('verify'\)/);
  assert.match(source,/if\(!verifyMode\)\s*\{\s*audioControl\.hidden=false/);
  assert.match(source,/audioButton\.addEventListener\('click'/);
  assert.match(source,/audioGate\.unlock\(\)/);
  assert.match(source,/audioGate\.enter\(branch\)/);
  assert.match(source,/createSfxBank\(\)/);
});
