import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const here = new URL('../', import.meta.url);
const source = new URL('../../outputs/request-20260928/pro-emp-r03/extracted/EMP-E_r0.3/', here);
const read = path => readFile(new URL(path, here), 'utf8');
const [html, script, css, provenance] = await Promise.all([
  read('index.html'), read('preview/main.js'), read('preview/embed.css'), read('provenance.json').then(JSON.parse)
]);

test('embed mode presents the authored five branches in the WebGPU stage', () => {
  assert.match(html, /preview\/embed\.css/);
  assert.match(html, /<canvas id="vfx"/);
  assert.match(html, /id="error-panel"/);
  assert.match(script, /const embedBranches=\['charge','normal','resonance','cancellation','suppression'\]/);
  assert.match(script, /tour:embedMode,markers:!embedMode/);
  assert.match(script, /if\(embedMode\)return;/);
  assert.match(css, /body\.embed \.stage\s*\{[^}]*width:\s*980px;[^}]*height:\s*620px;/);
  assert.match(css, /body\.embed #ui, body\.embed \.stage-corner\s*\{\s*display:\s*none;/);
});

test('verification forces silence while normal embed audio requires a gesture', async () => {
  assert.match(script, /if\(verifyMode\)fx\.setVolume\(0\)/);
  assert.match(script, /if\(!verifyMode\)fx\?\.setVolume/);
  assert.match(script, /unlockAudioFromGesture\(fx,verifyMode\)/);
  assert.match(script, /addEventListener\('pointerup',enablePreviewAudio\)/);
  assert.match(script, /e\.key==='Enter'\|\|e\.key===' '/);
  assert.match(await read('preview/audio-control.js'), /if \(!fx \|\| verifyMode\) return false;/);
});

test('all declared source files are byte-identical to the Pro package', async () => {
  const sums = await readFile(new URL('SHA256SUMS', source), 'utf8');
  const expected = new Map(sums.trim().split(/\r?\n/).map(line => {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    assert.ok(match, `malformed checksum line: ${line}`);
    return [match[2], match[1]];
  }));
  for (const path of provenance.copiedUnchanged) {
    const [actual, packaged] = await Promise.all([
      readFile(new URL(path, here)), readFile(new URL(path, source))
    ]);
    assert.deepEqual(actual, packaged, `${path} differs from the provided source`);
    assert.equal(createHash('sha256').update(actual).digest('hex'), expected.get(path), path);
  }
});
