import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

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
  assert.match(html, /href="\.\/embed\.css(?:\?[^\"]*)?"/);
  assert.match(script, /const embedMode = params\.get\('embed'\) === '1'/);
  assert.match(script, /embedMode\?\[\['dark1',0,false,'phase1dark'\]\]/);
  assert.match(script, /requestAnimationFrame\(animation\)/);
  assert.match(script, /\$\('error'\)\.hidden=false/);
  assert.ok(gallery.includes("preview.searchParams.set('embed', '1');"));
  assert.ok(gallery.includes("if (params.has('verify')) preview.searchParams.set('verify', params.get('verify') || '1');"));
  assert.match(css, /body\.embed \.views canvas \{ width: 901\.818px; height: 620px;/);
});

test('verify mode stays silent while normal gallery embed offers a gesture-only sound toggle', () => {
  assert.match(script, /const verifyMode = params\.has\('verify'\)/);
  assert.match(script, /async function togglePreviewAudio\(\)\s*\{\s*if\(verifyMode\)return;/);
  assert.match(script, /\$\('audio'\)\.onclick=togglePreviewAudio/);
  assert.match(script, /if\(embedMode\)\{\s*const canvas=\$\('dark1'\);\s*canvas\.title='クリックで音声を有効化（次の新しい回復Eから）';\s*canvas\.addEventListener\('click',togglePreviewAudio\);/);
  assert.match(script, /audio\.enable\(\)/);
  assert.doesNotMatch(script, /if\(verifyMode\|\|embedMode\)return/);
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

test('only replayable Stamina Pro versions are listed, with quality holds preserved', () => {
  const r03 = gallery.indexOf("version('stamina-pro-r03'");
  const r01 = gallery.indexOf("version('stamina-pro-r01'");
  assert.ok(r03 >= 0 && r01 > r03);
  assert.match(gallery.slice(r03, r01), /品質保留/);
  assert.match(gallery.slice(r03, r01), /全寿命の視覚品質、SFX聴感、実ゲーム接続は未受入/);
  class Element {
    constructor() { this.children = []; this.dataset = {}; this.style = {}; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute() {}
    addEventListener() {}
    querySelector() { return null; }
  }
  const elements = new Map();
  const document = {
    getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
    createElement() { return new Element(); }
  };
  const window = {};
  vm.runInNewContext(gallery, { document, window, URL, URLSearchParams,
    location: { search: '', href: 'https://example.test/webgpu-e-gallery.html' },
    navigator: { gpu: false }, ResizeObserver: class { observe() {} disconnect() {} } });
  const stamina = window.__webgpuEGallery.entries.find(group => group.id === 'stamina-pro');
  assert.ok(stamina, 'Stamina Pro group is listed');
  assert.equal(stamina.latest, 'stamina-pro-r03');
  const r03Entry = stamina.versions.find(version => version.id === 'stamina-pro-r03');
  assert.ok(r03Entry, 'technically replayable r0.3 is listed');
  assert.equal(r03Entry.page, 'webgpu-stamina-pro-r03/index.html');
  assert.equal(r03Entry.source, 'webgpu-stamina-pro-r03/src/renderer.js');
  assert.equal(r03Entry.replayable, true);
  assert.match(r03Entry.status, /品質保留/);
  assert.match(r03Entry.status, /SFX聴感未確認/);
  assert.match(r03Entry.status, /本編未採用/);
  assert.match(r03Entry.detail, /全寿命の視覚品質/);
  assert.match(r03Entry.detail, /未受入/);
  const r01Entry = stamina.versions.find(version => version.id === 'stamina-pro-r01');
  assert.ok(r01Entry, 'older r0.1 remains listed because it is independently marked replayable');
  assert.equal(r01Entry.replayable, true);
});
