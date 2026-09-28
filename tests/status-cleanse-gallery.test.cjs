'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', '..', '..', 'public');
const pagesRoot = path.resolve(__dirname, '..');
const pagesPublicRoot = path.join(pagesRoot, 'public');
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

const manaReplay = JSON.parse(fs.readFileSync(path.join(pagesPublicRoot, 'astra-mana-receive-v1', 'replay-manifest.json'), 'utf8'));
const manaGroup = window.__webgpuEGallery.entries.find(item => item.id === 'mana-astra');
assert.deepEqual(Array.from(manaGroup.versions.slice(0, 9), item => item.id),
  Array.from({ length: 9 }, (_, index) => `mana-astra-r${9 - index}`), 'Mana replay versions r9–r1 are newest first');
assert.deepEqual(Array.from(manaGroup.versions.slice(9), item => item.id),
  ['mana-astra-v5-pilot', 'mana-astra-clean-v4-pilot', 'mana-astra-clean-v3', 'mana-astra-clean-v2', 'mana-astra-clean-v1', 'mana-astra-zero-v1'],
  'existing Mana Astra versions remain after the new replay series');
const staminaVersions = JSON.parse(fs.readFileSync(path.join(pagesPublicRoot, 'astra-stamina-gain-v1', 'VERSIONS.json'), 'utf8'));
const staminaGroup = window.__webgpuEGallery.entries.find(item => item.id === 'stamina-astra');
assert.deepEqual(Array.from(staminaGroup.versions.slice(0, 8), item => item.id),
  Array.from({ length: 8 }, (_, index) => `stamina-astra-r${8 - index}`), 'Stamina replay versions r8–r1 are newest first');
assert.deepEqual(Array.from(staminaGroup.versions.slice(8), item => item.id),
  ['stamina-astra-clean-v3', 'stamina-astra-clean-v2', 'stamina-astra-clean-v1', 'stamina-astra-zero-v2', 'stamina-astra-zero-v1'],
  'existing Stamina Astra versions remain after the new replay series');

for (const [effect, records, group] of [
  ['astra-mana-receive-v1', manaReplay.entries, manaGroup],
  ['astra-stamina-gain-v1', staminaVersions.versions, staminaGroup]
]) {
  const byRevision = new Map(records.map(record => [record.revision, record]));
  const replayVersions = effect === 'astra-mana-receive-v1' ? group.versions.slice(0, 9) : group.versions.slice(0, 8);
  for (const version of replayVersions) {
    const revision = version.id.match(/-r(\d+)$/)[1];
    const record = byRevision.get(`r${revision}`);
    assert(record, `${effect} r${revision} has authoritative version metadata`);
    const quality = record.quality ?? record.qualityStatus;
    if (quality === 'review-pending') assert.match(version.status, /品質審査中/);
    else if (quality === 'review_pending_quality_unmet') assert.match(version.status, /品質未達・審査中/);
    else assert.equal(quality === 'failed' || quality === 'rejected', /品質不合格/.test(version.status),
      `${effect} r${revision} preserves the manifest quality decision`);
    assert.match(version.status, /本編未採用/);
    assert.match(version.detail, new RegExp(record.author));
    assert(version.detail.includes(record.qualityReason ?? record.reason), `${effect} r${revision} displays its recorded quality reason`);
    assert.equal(record.gameAdopted ?? record.gameIntegrated ?? record.userAdoption, false,
      `${effect} r${revision} is not game adopted`);
    if (effect === 'astra-stamina-gain-v1') {
      const revisionData = JSON.parse(fs.readFileSync(path.join(pagesPublicRoot, effect, 'versions', `r${revision}`, 'REVISION.json'), 'utf8'));
      assert.equal(revisionData.qualityStatus, quality, `${effect} r${revision} REVISION metadata matches VERSIONS`);
      assert.equal(revisionData.author, record.author);
    }
    const pageUrl = new URL(version.page, 'https://example.test/webgpu-e-gallery.html');
    assert(pageUrl.pathname.startsWith(`/public/${effect}/versions/r${revision}/`));
    assert.equal(pageUrl.searchParams.get('embed'), '1');
    if (effect === 'astra-mana-receive-v1') assert.equal(pageUrl.searchParams.get('scale'), '1');
    else assert.equal(pageUrl.searchParams.get('height'), '64');
    assert.equal(pageUrl.searchParams.has('verify'), false, `${effect} r${revision} normal replay does not force mute`);
    assert(fs.existsSync(path.join(pagesRoot, ...decodeURIComponent(version.page).split(/[?#]/, 1)[0].split('/'))),
      `${effect} r${revision} page exists in the Pages public tree`);
    const sourcePath = decodeURIComponent(version.source).split(/[?#]/, 1)[0];
    assert(fs.existsSync(path.join(pagesRoot, ...sourcePath.split('/'))), `${effect} r${revision} source exists`);
  }
}
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
console.log(`PASS: ${entry.versions.length} status-recovery, ${manaGroup.versions.slice(0, 9).length} Mana, ${staminaGroup.versions.slice(0, 8).length} Stamina replay versions; ${allowlist.publishFiles.length} status package files present`);
