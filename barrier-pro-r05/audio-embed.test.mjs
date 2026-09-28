import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('./embed.html',import.meta.url),'utf8');
const js=await readFile(new URL('./embed.mjs',import.meta.url),'utf8');
test('r0.5 embed sound is gesture-gated and verify-muted',()=>{
  assert.match(html,/id="enable-audio"/);
  assert.match(js,/has\('verify'\)/);
  assert.match(js,/audioButton\.hidden=verifyMode/);
  assert.match(js,/if\(verifyMode\)return/);
  assert.match(js,/addEventListener\('click'/);
  assert.match(js,/new AudioContext\(\)/);
  assert.match(js,/!verifyMode&&state\.audioEnabled/);
  assert.match(js,/playSFX\(audio,branch/);
});
