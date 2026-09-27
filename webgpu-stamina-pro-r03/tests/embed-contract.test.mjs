import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const here = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, here), 'utf8');
const [html, script, css, provenance, checksums, gallery] = await Promise.all([
  read('index.html'), read('src/preview.js'), read('embed.css'),
  read('provenance.json').then(JSON.parse),
  read('HASHES.sha256'),
  readFile(new URL('../webgpu-e-gallery.js', here), 'utf8')
]);

test('gallery embed runs one Pro H64 WebGPU panel and exposes errors', () => {
  assert.match(html, /id="dark1" width="256" height="176"/);
  assert.match(html, /id="error" hidden role="alert"/);
  assert.match(html, /href="\.\/embed\.css"/);
  assert.match(script, /const embedMode = params\.get\('embed'\) === '1'/);
  assert.match(script, /embedMode\?\[\['dark1',0,false,'phase1dark'\]\]/);
  assert.match(script, /requestAnimationFrame\(animation\)/);
  assert.match(script, /\$\('error'\)\.hidden=false/);
  assert.match(css, /body\.embed \.views canvas \{ width: 901\.818px; height: 620px;/);
});

test('verify and embed modes cannot enable sound', () => {
  assert.match(script, /const verifyMode = params\.has\('verify'\)/);
  assert.match(script, /\$\('audio'\)\.onclick=async\(\)=>\{if\(verifyMode\|\|embedMode\)return;/);
  assert.match(css, /body\.verify #audio \{ display: none; \}/);
});

test('unchanged Pro renderer, sampler, audio and shaders match preserved hashes', async () => {
  const expected = new Map(checksums.trim().split(/\r?\n/).map(line => {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    assert.ok(match, `malformed checksum line: ${line}`);
    return [match[2], match[1]];
  }));
  for (const path of provenance.copiedUnchanged) {
    const content = await readFile(new URL(path, here));
    assert.equal(createHash('sha256').update(content).digest('hex'), expected.get(path), path);
  }
  assert.match(provenance.quality, /^hold;/);
});

test('catalog lists quality-held r0.3 first and retains replayable r0.1', () => {
  const r03 = gallery.indexOf("version('stamina-pro-r03'");
  const r01 = gallery.indexOf("version('stamina-pro-r01'");
  assert.ok(r03 >= 0 && r01 > r03);
  assert.match(gallery.slice(r03, r01), /品質保留/);
  assert.match(gallery.slice(r03, r01), /全寿命の視覚品質、SFX聴感、実ゲーム接続は未受入/);
});
