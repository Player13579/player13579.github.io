import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const replay = await readFile(new URL('preview/replay.js', root), 'utf8');
const scene = await readFile(new URL('preview/scene.js', root), 'utf8');
const audio = await readFile(new URL('src/audio.js', root), 'utf8');
const index = await readFile(new URL('src/index.js', root), 'utf8');
const integration = await readFile(new URL('src/integration.js', root), 'utf8');
const provenance = JSON.parse(await readFile(new URL('provenance.json', root), 'utf8'));

test('public page is a 980x620 WebGPU embed with diagnostics hidden in embed mode', () => {
  assert.match(html, /<canvas id="stage" width="980" height="620"/);
  assert.match(html, /aspect-ratio: 49 \/ 31/);
  assert.match(replay, /get\('embed'\) === '1'/);
  assert.match(replay, /document\.body\.classList\.add\('embed'\)/);
  assert.match(html, /body\.embed #status \{ display: none; \}/);
  assert.match(html, /body\.embed \.sound-controls, body\.verify \.sound-controls \{ display: none; \}/);
});

test('replay uses the supplied WebGPU scene and auto-loops one committed event', () => {
  assert.match(replay, /requestManaDevice\(\)/);
  assert.match(replay, /new ManaAcquireSystem\(/);
  assert.match(replay, /new ManaAudio\(\)/);
  assert.match(replay, /audio\.unlock\(\)/);
  assert.match(replay, /if \(verifyMode\) return/);
  assert.match(replay, /if \(verifyMode\) audio\.setMuted\(true\)/);
  assert.match(audio, /audioWorklet\.addModule\(new URL\('\.\/mana-worklet\.js',\s*import\.meta\.url\)\)/);
  assert.match(replay, /params\.get\('embed'\) === '1'\) canvas\.addEventListener\('pointerdown', enableSoundFromGesture\)/);
  assert.match(replay, /audio\.setMuted\(false\)/);
  assert.ok(replay.indexOf('if (verifyMode) return') < replay.indexOf('await audio.unlock()'), 'verification mode must guard the unlock path');
  assert.match(replay, /committed: true/);
  assert.match(replay, /nextGain = actorTime \+ 2100/);
  assert.match(replay, /requestAnimationFrame\(frame\)/);
  assert.match(scene, /getContext\('webgpu'\)/);
  assert.doesNotMatch(`${html}\n${replay}\n${scene}`, /getContext\(['"]2d['"]\)|webgl/i);
});

test('copied Pro modules are complete and match their recorded source hashes', async () => {
  assert.match(index, /from '\.\/integration\.js'/);
  assert.match(integration, /export async function createManaAcquireEffect/);
  const imported = await import('../src/index.js');
  assert.equal(typeof imported.createManaAcquireEffect, 'function');
  for (const entry of provenance.copiedFiles) {
    const contents = await readFile(new URL(entry.path, root));
    const hash = createHash('sha256').update(contents).digest('hex');
    assert.equal(hash, entry.sha256, `${entry.path} source hash`);
  }
});
