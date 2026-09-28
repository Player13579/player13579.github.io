import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createReplayAudioGate } from './embed-audio.mjs';

test('verification mode remains silent even if its gate is called', async () => {
  let ensures = 0, plays = 0;
  const gate = createReplayAudioGate({ verifyMode: true, sfx: { ensure: async () => ensures++, play: async () => plays++ } });
  assert.equal(await gate.unlock(), false);
  assert.equal(gate.enter('create'), false);
  assert.equal(ensures, 0);
  assert.equal(plays, 0);
});

test('normal playback waits for a gesture and starts SFX on later event transitions', async () => {
  let ensures = 0;
  const plays = [];
  const gate = createReplayAudioGate({ verifyMode: false, sfx: { ensure: async () => ensures++, play: async event => plays.push(event) } });
  assert.equal(gate.enter('create'), false);
  assert.equal(await gate.unlock(), true);
  assert.equal(ensures, 1);
  assert.equal(gate.enter('create'), false);
  assert.equal(gate.enter('absorb'), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(plays, ['absorb']);
});

test('embed consumes the source WebGPU renderer and reports verification state', async () => {
  const html = await readFile(new URL('./embed.html', import.meta.url), 'utf8');
  const embed = await readFile(new URL('./embed.mjs', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('./barrier-pro-renderer.mjs', import.meta.url), 'utf8');
  const shader = await readFile(new URL('./barrier-pro-shader.wgsl', import.meta.url), 'utf8');
  const sourcePreview = await readFile(new URL('./barrier-pro-gallery.mjs', import.meta.url), 'utf8');
  const sourceHtml = await readFile(new URL('./barrier-pro-gallery.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<canvas /g) || []).length, 8);
  assert.match(embed, /new URLSearchParams\(location\.search\)\.has\('verify'\)/);
  assert.match(embed, /if \(!verifyMode\)/);
  assert.match(embed, /audioButton\.addEventListener\('click'/);
  assert.match(embed, /panel\.renderer\.render\(/);
  assert.match(embed, /panel\.renderer\.diagnostics\.length/);
  assert.match(embed, /states\.eventCycles\[event\] = Math\.floor/);
  assert.match(embed, /GPU errors/);
  assert.match(renderer, /getContext\('webgpu'\)/);
  assert.match(renderer, /uncapturederror/);
  assert.match(shader, /textureLoad\(/);
  assert.match(sourcePreview, /new URLSearchParams\(location\.search\)\.has\('verify'\)/);
  assert.match(sourcePreview, /if \(!verifyMode\)/);
  assert.match(sourceHtml, /id="audio-controls" hidden/);
});

test('embed layout fits all four H64 event rows into the 980×620 gallery stage', async () => {
  const html = await readFile(new URL('./embed.html', import.meta.url), 'utf8');
  const embed = await readFile(new URL('./embed.mjs', import.meta.url), 'utf8');
  assert.match(html, /html,body\{margin:0;width:100%;height:100%;overflow:hidden/);
  assert.match(html, /#top\{[^}]*height:36px/);
  assert.match(html, /main\{position:absolute;inset:36px 0 0;width:100%;height:calc\(100% - 36px\);display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);grid-template-rows:repeat\(4,minmax\(0,1fr\)\);gap:6px;padding:6px\}/);
  assert.match(html, /section\{[^}]*grid-template-rows:20px minmax\(0,1fr\)/);
  assert.match(html, /canvas\{display:block;width:177px;height:114px;max-width:100%;max-height:100%\}/);
  assert.equal((html.match(/<canvas /g) || []).length, 8);
  assert.match(embed, /background, H: 64/);

  const stageHeight = 620;
  const topHeight = 36;
  const gridHeight = stageHeight - topHeight;
  const rowHeight = (gridHeight - 12 - 3 * 6) / 4;
  const canvasAvailableHeight = rowHeight - 2 - 20;
  assert.ok(canvasAvailableHeight >= 114, 'each event canvas fits without vertical overflow');
});
