import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const [html, preview] = await Promise.all([
  readFile(new URL('index.html', root), 'utf8'),
  readFile(new URL('src/preview.mjs', root), 'utf8')
]);

test('verify query is propagated into a mute guard and hides the sound control', () => {
  assert.match(html, /previewParams\.has\('verify'\).*classList\.add\('verify'\)/);
  assert.match(html, /body\.verify \.sound\{display:none!important\}/);
  assert.match(preview, /const verifyMode=new URLSearchParams\(location\.search\)\.has\('verify'\)/);
  assert.match(preview, /async function togglePreviewAudio\(\)\{\s*if\(verifyMode\)return;/);
  assert.equal((preview.match(/audio\.enable\(\)/g) ?? []).length, 1);
});

test('normal embed exposes only the displayed canvas as a user-gesture SFX toggle', () => {
  assert.match(preview, /const embedMode=new URLSearchParams\(location\.search\)\.get\('embed'\)==='1'/);
  assert.match(preview, /if\(embedMode\)\{const canvas=\$\('normal-dark'\);canvas\.title='クリックで音声を有効化（次の新しい回復Eから）';canvas\.addEventListener\('click',togglePreviewAudio\);\}/);
  assert.match(preview, /\$\('audio'\)\.onclick=togglePreviewAudio/);
  assert.match(html, /body\.embed \.sound,body\.embed \.telemetry/);
  assert.match(html, /body\.embed #normal-dark\{display:block;width:288px;height:192px;cursor:pointer\}/);
});
