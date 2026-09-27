import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const here = new URL('../', import.meta.url);
const original = new URL('../../outputs/request-20260928/pro-mana-r02/contents/dva-mana-e-r0.2/', here);
const text = path => readFile(new URL(path, here), 'utf8');
const [html, script, css, provenance, manifest] = await Promise.all([
  text('index.html'), text('preview/main.js'), text('preview/embed.css'),
  text('provenance.json').then(JSON.parse),
  readFile(new URL('manifest.json', original), 'utf8').then(JSON.parse)
]);

test('gallery embed presents one H64 WebGPU view and preserves runtime errors', () => {
  assert.match(html, /preview\/embed\.css/);
  assert.match(script, /params\.get\('embed'\)==='1'/);
  assert.match(script, /embedMode\?\[\{light:false,scale:1\}\]/);
  assert.match(script, /if\(!embedMode\)drawEnvelope\(elapsed\)/);
  assert.match(css, /body\.embed #views\s*\{[^}]*width:\s*980px;[^}]*height:\s*620px;/);
  assert.match(css, /body\.embed \.tile canvas\s*\{[^}]*width:\s*980px;[^}]*height:\s*620px;/);
  assert.match(css, /body\.embed #error:not\(\[hidden\]\)/);
  assert.match(script, /PreviewViewport\.create\(/);
  assert.match(script, /requestAnimationFrame\(tick\)/);
});

test('verification mode cannot unlock or unmute the preview sound', () => {
  assert.match(script, /if\(verifyMode\)\{audio\.setVolume\(0\);audio\.setMuted\(true\);\}/);
  assert.match(script, /#sound'\)\.onclick=async\(\)=>\{if\(verifyMode\)return;/);
  assert.match(script, /#volume'\)\.oninput=e=>\{if\(!verifyMode\)audio\.setVolume/);
});

test('unmodified Pro runtime and shader files match the preserved manifest', async () => {
  const expected = new Map(manifest.files.map(item => [item.path, item.sha256]));
  for (const path of provenance.copiedUnchanged) {
    const content = await readFile(new URL(path, here));
    assert.equal(createHash('sha256').update(content).digest('hex'), expected.get(path), path);
  }
  assert.equal(provenance.quality.startsWith('hold'), true);
});
