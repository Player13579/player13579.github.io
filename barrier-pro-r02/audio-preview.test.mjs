import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('./preview.html',import.meta.url),'utf8');
const js=await readFile(new URL('./barrier-pro-r02-preview.mjs',import.meta.url),'utf8');
test('r0.2 preview sound is gesture-gated and verify-muted',()=>{
  assert.match(html,/id="enable-audio"/);
  assert.match(js,/audioButton\.hidden=verify/);
  assert.match(js,/if\(verify\)return/);
  assert.match(js,/addEventListener\('click'/);
  assert.match(js,/new AudioContext\(\)/);
  assert.match(js,/!verify&&state\.audioEnabled/);
  assert.match(js,/playSFX\(audio,branch\)/);
});
