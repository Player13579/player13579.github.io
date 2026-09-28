import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const here = new URL('../', import.meta.url);
const original = new URL('../../outputs/request-20260928/pro-emp-r02/extracted/EMP-E_r0.2/', here);
const read = path => readFile(new URL(path, here), 'utf8');
const [html, script, css, provenance, checksums, gallery] = await Promise.all([
  read('index.html'), read('preview/main.js'), read('preview/embed.css'),
  read('provenance.json').then(JSON.parse),
  readFile(new URL('SHA256SUMS', original), 'utf8'),
  readFile(new URL('../webgpu-e-gallery.js', here), 'utf8')
]);

test('embed tours exactly the five authored branches on the WebGPU stage', () => {
  assert.match(html, /preview\/embed\.css/);
  assert.match(script, /const embedBranches=\['charge','normal','resonance','cancellation','suppression'\]/);
  assert.match(script, /tour:embedMode,markers:!embedMode/);
  assert.match(script, /const keys=embedMode\?embedBranches:Object\.keys\(SCENARIOS\)/);
  assert.match(script, /select\(params\.get\('scene'\)\?\?\(embedMode\?'charge':'all'\)\)/);
  assert.match(script, /function drawUI\(\)\{if\(embedMode\)return;/);
  assert.match(css, /body\.embed \.stage\s*\{[^}]*width:\s*980px;[^}]*height:\s*620px;/);
  assert.match(css, /body\.embed #ui, body\.embed \.stage-corner\s*\{\s*display:\s*none;/);
  assert.match(html, /<canvas id="vfx"/);
  assert.match(html, /id="error-panel"/);
});

test('verification mode keeps EMP audio at zero and blocks unlock', async () => {
  assert.match(script, /if\(verifyMode\)fx\.setVolume\(0\)/);
  assert.match(script, /#volume'\)\.oninput=e=>\{if\(!verifyMode\)fx\?\.setVolume/);
  assert.match(script, /document\.body\.classList\.toggle\('audio-gesture-ready',embedMode&&!verifyMode\)/);
  assert.match(script, /unlockAudioFromGesture\(fx,verifyMode\)/);
  assert.match(script, /#audio'\)\.onclick=async\(\)=>\{if\(embedMode\)return;await enablePreviewAudio\(\);\}/);
  assert.match(script, /addEventListener\('pointerup',enablePreviewAudio\)/);
  assert.match(await read('preview/audio-control.js'), /if \(!fx \|\| verifyMode\) return false;/);
});

test('copied Pro runtime files match the preserved release checksums', async () => {
  const expected = new Map(checksums.trim().split(/\r?\n/).map(line => {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    assert.ok(match, `malformed checksum line: ${line}`);
    return [match[2], match[1]];
  }));
  for (const path of provenance.copiedUnchanged) {
    const content = await readFile(new URL(path, here));
    assert.equal(createHash('sha256').update(content).digest('hex'), expected.get(path), path);
  }
});

test('catalog lists r0.2 first with its hold status and retains r0.1', () => {
  const r02 = gallery.indexOf("version('emp-pro-r02'");
  const r01 = gallery.indexOf("version('emp-pro-r01'");
  assert.ok(r02 >= 0 && r01 > r02);
  assert.match(gallery.slice(r02, r01), /品質保留/);
  assert.match(gallery.slice(r02, r01), /全5枝の全寿命と視覚品質、実聴、実ゲームは未受入/);
});
