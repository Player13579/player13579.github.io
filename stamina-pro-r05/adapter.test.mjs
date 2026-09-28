import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(root, '../../outputs/request-20260928/pro-stamina-remake-r01/source/DVA_Stamina_E_InwardReserve');
const digest = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');

test('gallery preserves the Pro modules and H64 fixture, with one WGSL reserved-word rename', async () => {
  for (const relative of ['src/renderer.mjs', 'src/runtime.mjs', 'src/audio.mjs', 'src/synthesis.mjs', 'preview/fixture.mjs']) {
    assert.equal(await digest(path.join(root, relative)), await digest(path.join(sourceRoot, relative)), relative);
  }
  const sourceShader = await readFile(path.join(sourceRoot, 'src/stamina.wgsl'), 'utf8');
  const galleryShader = await readFile(path.join(root, 'src/stamina.wgsl'), 'utf8');
  assert.equal((sourceShader.match(/\bmove\b/g) ?? []).length, 3);
  assert.equal(galleryShader, sourceShader.replace(/\bmove\b/g, 'motionProgress'));
});

test('embed page stays controls-free and keeps verification muted', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const adapter = await readFile(path.join(root, 'adapter.js'), 'utf8');
  assert.match(html, /new URLSearchParams\(location\.search\)\.has\('verify'\)/);
  assert.match(html, /audioForcedOff: verificationMode/);
  assert.match(html, /mountStaminaProR05\(host\)/);
  assert.doesNotMatch(html, /<button|<audio|<aside|<pre/i);
  assert.match(adapter, /new StaminaAudio\(\{ verify: verificationMode \}\)/);
  assert.match(adapter, /host\.addEventListener\('pointerdown', unlockAudio\)/);
  assert.match(adapter, /await audio\.dispose\(\)/);
  assert.doesNotMatch(adapter, /getContext\(['"]2d|readPixels|copyTextureToBuffer/);
  assert.match(adapter, /StaminaRenderer\.create\(canvas\)/);
  assert.match(adapter, /height: 620/);
  assert.match(adapter, /scale: 64/);
  assert.match(adapter, /new URLSearchParams\(location\.search\)\.has\('verify'\)/);
  assert.match(adapter, /verify: verificationMode/);
  assert.doesNotMatch(adapter, /AudioContext\s*\(/);
});
