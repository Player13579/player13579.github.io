'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', '..', '..', 'public');
const packageRoot = path.join(root, 'astra-status-cleanse-v1');
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'all-versions-status.json'), 'utf8'));
const allowlist = JSON.parse(fs.readFileSync(path.join(packageRoot, 'allowlist-all.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'webgpu-e-gallery.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'webgpu-e-gallery.html'), 'utf8');

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
vm.runInNewContext(source, {
  document, window, URL, URLSearchParams,
  location: { search: '', href: 'https://example.test/webgpu-e-gallery.html' }, navigator: { gpu: false },
  ResizeObserver: class { observe() {} disconnect() {} }
});

const entry = window.__webgpuEGallery.entries.find(item => item.id === 'status-cleanse-astra');
assert(entry, 'status-recovery Astra gallery entry exists');
assert.equal(entry.versions.length, 9, 'all nine reproducible versions are listed');
assert.deepEqual(Array.from(entry.versions, item => item.id), manifest.versions.slice().reverse().map(item => item.id),
  'versions are ordered newest first and match the source manifest');
const stamina = window.__webgpuEGallery.entries.find(item => item.id === 'stamina-astra');
assert.match(stamina.versions.find(item => item.id === 'stamina-astra-clean-v3').status, /品質不採用.*本編未採用/);
assert.match(stamina.versions.find(item => item.id === 'stamina-astra-clean-v3').detail, /扇形.*発光ベスト.*品質不採用/);
assert.match(stamina.versions.find(item => item.id === 'stamina-astra-clean-v2').status, /品質未受入.*本編未採用/);
assert.match(stamina.versions.find(item => item.id === 'stamina-astra-clean-v2').detail, /独立識別評価は未実施/);
const empLatest = window.__webgpuEGallery.entries.find(item => item.id === 'emp-astra').versions[0];
assert.match(empLatest.status, /ユーザー採用済み.*本編接続中.*実装未完了/);
assert.match(empLatest.detail, /接続作業中.*実装完了.*受入とは別/);
const empVersions = window.__webgpuEGallery.entries.find(item => item.id === 'emp-astra').versions;
assert(empVersions.slice(1, 7).every(item => /品質不合格/.test(item.status) && /本編未採用/.test(item.status)),
  'EMP v1.2-v1.7 keep their former rejected/unadopted status');
for (const version of entry.versions) {
  assert.match(version.status, /品質不合格/);
  assert.match(version.status, /本編未採用/);
  const catalog = manifest.versions.find(item => item.id === version.id);
  assert.equal(catalog.qualityStatus, 'rejected', `${version.id} has the current quality decision`);
  assert.equal(catalog.userAdopted, false);
  assert.equal(catalog.gameIntegrated, false);
  const pageUrl = new URL(version.page, 'https://example.test/webgpu-e-gallery.html');
  assert.equal(pageUrl.searchParams.get('h'), '64', `${version.id} preview uses native H64 size`);
  assert.equal(pageUrl.searchParams.get('embed'), '1', `${version.id} preview hides standalone controls`);
  assert.equal(pageUrl.searchParams.has('verify'), false, `${version.id} normal gallery preview is not forced silent`);
  for (const field of ['page', 'source']) {
    const relative = decodeURIComponent(version[field]).split(/[?#]/, 1)[0];
    assert(fs.existsSync(path.join(root, relative)), `${version.id} has a published ${field}: ${relative}`);
  }
}
for (const relative of allowlist.publishFiles) {
  assert(fs.existsSync(path.join(packageRoot, relative)), `allowlisted file exists: ${relative}`);
}
for (const version of manifest.versions) {
  for (const [relative, expectedHash] of Object.entries(version.sourceSha256)) {
    const file = path.join(packageRoot, 'versions', version.id.slice(-3), relative);
    const actualHash = require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    assert.equal(actualHash, expectedHash, `${version.id}/${relative} matches its source SHA-256`);
  }
}
assert.deepEqual(Array.from(window.__webgpuEGallery.entries.find(item => item.id === 'emp-astra').versions, item => item.id),
  ['emp-astra-v1.8', 'emp-astra-v1.7', 'emp-astra-v1.6', 'emp-astra-v1.5', 'emp-astra-v1.4', 'emp-astra-v1.3', 'emp-astra-v1.2', 'emp-astra-zero-v1'],
  'existing EMP gallery versions remain intact');
const release = source.match(/galleryRelease', '(astra-history-20260928-v\d+)'/);
assert(release && html.includes(`webgpu-e-gallery.js?v=${release[1]}`), 'HTML references the matching catalog cache key');
console.log(`PASS: ${entry.versions.length} status-recovery Astra versions; ${allowlist.publishFiles.length} allowlisted files present`);
