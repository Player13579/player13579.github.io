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
const frozenHandoff = JSON.parse(fs.readFileSync(path.join(pagesRoot, 'astra-status-cleanse-v1', 'handoff-r17-r21-frozen.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'webgpu-e-gallery.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'webgpu-e-gallery.html'), 'utf8');

const healPackageRoot = path.join(root, 'astra-heal-sparkle-r1');
const healPagesPackageRoot = path.join(pagesPublicRoot, 'astra-heal-sparkle-r1');
const healManifest = JSON.parse(fs.readFileSync(path.join(healPackageRoot, 'replay-manifest.json'), 'utf8'));
const healAllowlist = JSON.parse(fs.readFileSync(path.join(pagesRoot, 'astra-heal-sparkle-r1', 'package-files.json'), 'utf8'));
assert.equal(healManifest.id, 'heal-astra-sparkle-r1');
assert.equal(healManifest.quality, 'candidate');
assert.equal(healAllowlist.files.length, 27, 'only the frozen Heal package allowlist is published');
for (const mirror of [healPackageRoot, healPagesPackageRoot]) {
  for (const file of healAllowlist.files) {
    const target = path.join(mirror, file.path);
    assert(fs.existsSync(target), `Heal package file ${file.path} exists in both mirrors`);
    assert.equal(fs.statSync(target).size, file.bytes, `Heal package file ${file.path} size matches freeze`);
    assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(target)).digest('hex'),
      file.sha256, `Heal package file ${file.path} hash matches freeze`);
  }
}

for (const group of ['mana-astra', 'stamina-astra', 'status-cleanse-astra']) {
  const match = source.match(new RegExp(`'${group}': \\{ magnification: ([\\d.]+), focusX: ([\\d.]+), focusY: ([\\d.]+) \\}`));
  assert(match, `${group} has a gallery-only magnification and focus`);
  assert(Number(match[1]) >= 4, `${group} uses enough gallery zoom to restore H64-sized artwork`);
  assert(Number(match[2]) >= 0 && Number(match[2]) <= 980, `${group} focusX remains in the source canvas`);
  assert(Number(match[3]) >= 0 && Number(match[3]) <= 620, `${group} focusY remains in the source canvas`);
}
for (const [id, magnification] of [['heal-astra-prototype', '4'],
  ['sunbeam-astra-clean-v3', '1.18'], ['luck-astra-clean-v4', '3.5'],
  ['barrier-astra', '2.3'], ['barrier-pro-r07', '1.0']]) {
  assert.match(source, new RegExp(`'${id}': \\{ magnification: ${magnification.replace('.', '\\.')},`),
    `${id} keeps its existing gallery magnification`);
}

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

const healGroup = window.__webgpuEGallery.entries.find(item => item.id === 'heal-astra');
assert(healGroup, 'Heal Astra replay group exists');
assert.deepEqual(Array.from(healGroup.versions, item => item.id), [
  healManifest.id, ...healManifest.history.slice().reverse().map(item => item.id), 'heal-astra-prototype'
], 'Heal sparkle revisions are newest first while retaining the adopted original');
const healCandidate = healGroup.versions[0];
assert.match(healCandidate.status, /品質審査候補.*未採用.*本編未接続/);
assert.match(healCandidate.detail, /明背景.*コントラスト低下.*聴感と本編統合は未検証/);
for (const historical of healManifest.history) {
  const version = healGroup.versions.find(item => item.id === historical.id);
  assert.match(version.status, /品質不合格.*旧試作.*未採用/);
  assert(version.detail.includes(historical.qualityReason), `${historical.id} keeps its exact recorded review reason`);
  const pageUrl = new URL(version.page, 'https://example.test/webgpu-e-gallery.html');
  assert(pageUrl.pathname.endsWith(`/public/astra-heal-sparkle-r1/${historical.entry}`));
  assert.equal(pageUrl.searchParams.has('verify'), false, `${historical.id} does not force verification mute`);
}
const adoptedHeal = healGroup.versions.find(item => item.id === 'heal-astra-prototype');
assert.match(adoptedHeal.status, /ユーザー品質採用/);
assert.match(adoptedHeal.detail, /キラキラ改修中・新版未採用/);
const adoptedLuck = window.__webgpuEGallery.entries.find(item => item.id === 'luck-astra').versions[0];
assert.match(adoptedLuck.detail, /キラキラ改修中・新版未採用/);
const adoptedCooldown = window.__webgpuEGallery.entries.find(item => item.id === 'cooldown-astra').versions.find(item => item.id === 'astra-cooldown-benefit-r0.5');
assert.match(adoptedCooldown.status, /ユーザー採用済み/);
assert.match(adoptedCooldown.detail, /キラキラ改修中・新版未採用/);
assert.match(html, /astra-history-20260928-v75/);

const entry = window.__webgpuEGallery.entries.find(item => item.id === 'status-cleanse-astra');
assert(entry, 'status-recovery Astra gallery entry exists');
const statusRecords = manifest.versions.concat(frozenHandoff.versions.map(item => item.version));
assert.equal(entry.versions.length, 21, 'all twenty-one reproducible versions are listed');
assert.deepEqual(Array.from(entry.versions, item => item.id), statusRecords.slice().reverse().map(item => item.id),
  'versions are ordered newest first and match source status records');
assert.match(entry.versions.find(item => item.id === 'status-cleanse-astra-r07').detail, /全身発光部分のみ良好.*品質不合格理由/);
const stamina = window.__webgpuEGallery.entries.find(item => item.id === 'stamina-astra');
assert.match(stamina.versions.find(item => item.id === 'stamina-astra-clean-v3').status, /品質不採用.*本編未採用/);
assert.match(stamina.versions.find(item => item.id === 'stamina-astra-clean-v3').detail, /扇形.*発光ベスト.*品質不採用/);
assert.match(stamina.versions.find(item => item.id === 'stamina-astra-clean-v2').status, /品質未受入.*本編未採用/);
assert.match(stamina.versions.find(item => item.id === 'stamina-astra-clean-v2').detail, /独立識別評価は未実施/);
const empLatest = window.__webgpuEGallery.entries.find(item => item.id === 'emp-astra').versions[0];
assert.match(empLatest.status, /ユーザー採用済み.*本編接続済み.*実発動\/聴感未確認/);
assert.match(empLatest.detail, /接続は完了.*発動と聴感.*未確認/);
const empVersions = window.__webgpuEGallery.entries.find(item => item.id === 'emp-astra').versions;
assert(empVersions.slice(1, 7).every(item => /品質不合格/.test(item.status) && /本編未採用/.test(item.status)),
  'EMP v1.2-v1.7 keep their former rejected/unadopted status');

const manaReplay = JSON.parse(fs.readFileSync(path.join(pagesPublicRoot, 'astra-mana-receive-v1', 'replay-manifest.json'), 'utf8'));
const manaGroup = window.__webgpuEGallery.entries.find(item => item.id === 'mana-astra');
assert.deepEqual(Array.from(manaGroup.versions.slice(0, 6), item => item.id),
  Array.from({ length: 6 }, (_, index) => `mana-astra-r${15 - index}`), 'Mana r10-r15 addenda are newest first');
assert.deepEqual(Array.from(manaGroup.versions.slice(6, 15), item => item.id),
  Array.from({ length: 9 }, (_, index) => `mana-astra-r${9 - index}`), 'Mana replay versions r9–r1 are newest first');
assert.deepEqual(Array.from(manaGroup.versions.slice(15), item => item.id),
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
  const replayVersions = effect === 'astra-mana-receive-v1' ? group.versions.slice(6, 15) : group.versions.slice(0, 8);
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
for (const n of [10, 11, 12, 13, 14, 15]) {
  const revision = `r${n}`;
  const id = `mana-astra-${revision}`;
  const version = manaGroup.versions.find(item => item.id === id);
  const sourceBase = path.join(pagesRoot, 'astra-mana-receive-v1');
  const metadata = JSON.parse(fs.readFileSync(path.join(sourceBase, `replay-manifest-${revision}.json`), 'utf8')).entries[0];
  const packageList = JSON.parse(fs.readFileSync(path.join(sourceBase, `package-files-${revision}.json`), 'utf8'));
  assert(version, `${id} is listed`);
  assert.equal(metadata.id, `astra-mana-receive-v1-${revision}`);
  assert.equal(packageList.quality, metadata.quality);
  assert.equal(packageList.gameAdopted, false);
  assert.equal(metadata.gameAdopted, false);
  assert.match(version.detail, new RegExp(metadata.author));
  assert(version.detail.includes(metadata.qualityReason), `${id} displays its recorded review reason`);
  if (metadata.quality === 'review-pending') assert.match(version.status, /品質審査中.*本編未採用/);
  else assert.match(version.status, /品質不合格.*本編未採用/);
  const url = new URL(version.page, 'https://example.test/webgpu-e-gallery.html');
  assert.equal(url.searchParams.get('embed'), '1');
  assert.equal(url.searchParams.get('scale'), '1');
  assert.equal(url.searchParams.has('verify'), false, `${id} normal replay does not force mute`);
  const pageRelative = decodeURIComponent(version.page).split(/[?#]/, 1)[0].replace(/^public\//, '');
  assert(fs.existsSync(path.join(root, ...pageRelative.split('/'))), `${id} root public page exists`);
  const mirrors = [path.join(pagesPublicRoot, 'astra-mana-receive-v1'), path.join(root, 'astra-mana-receive-v1')];
  for (const relative of packageList.files) {
    const sourceFile = path.join(sourceBase, relative);
    assert(fs.existsSync(sourceFile), `${id} allowlisted source exists: ${relative}`);
    const expected = require('node:crypto').createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
    for (const mirror of mirrors) {
      const mirrorFile = path.join(mirror, relative);
      assert(fs.existsSync(mirrorFile), `${id} is packaged in public mirror: ${relative}`);
      assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(mirrorFile)).digest('hex'), expected,
        `${id} public mirror matches its package source for ${relative}`);
    }
  }
}
for (const version of entry.versions) {
  assert.match(version.status, /品質不合格/);
  assert.match(version.status, /本編未採用/);
  const catalog = statusRecords.find(item => item.id === version.id);
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
  const pageCopy = path.join(pagesPublicRoot, 'astra-status-cleanse-v1', relative);
  assert(fs.existsSync(pageCopy), `allowlisted file exists in Pages public mirror: ${relative}`);
  assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(packageRoot, relative))).digest('hex'),
    require('node:crypto').createHash('sha256').update(fs.readFileSync(pageCopy)).digest('hex'),
    `Pages mirror matches root public for ${relative}`);
}
for (const version of statusRecords) {
  for (const [relative, expectedHash] of Object.entries(version.sourceSha256)) {
    const file = path.join(packageRoot, 'versions', version.id.slice(-3), relative);
    const actualHash = require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    assert.equal(actualHash, expectedHash, `${version.id}/${relative} matches its source SHA-256`);
  }
}
assert.deepEqual(Array.from(window.__webgpuEGallery.entries.find(item => item.id === 'emp-astra').versions, item => item.id),
  ['emp-astra-v1.8', 'emp-astra-v1.7', 'emp-astra-v1.6', 'emp-astra-v1.5', 'emp-astra-v1.4', 'emp-astra-v1.3', 'emp-astra-v1.2', 'emp-astra-zero-v1'],
  'existing EMP gallery versions remain intact');
const cooldownGroup = window.__webgpuEGallery.entries.find(item => item.id === 'cooldown-astra');
assert(cooldownGroup, 'Cooldown Astra replay group exists');
const cooldownRoot = path.join(root, 'astra-cooldown-benefit-v1');
const cooldownPagesRoot = path.join(pagesPublicRoot, 'astra-cooldown-benefit-v1');
const cooldownManifest = JSON.parse(fs.readFileSync(path.join(cooldownRoot, 'versions.json'), 'utf8'));
const sparkleSourceRoot = path.join(pagesRoot, 'astra-cooldown-benefit-r05-sparkle-v1');
const sparklePagesRoot = path.join(pagesPublicRoot, 'astra-cooldown-benefit-r05-sparkle-v1');
const sparklePackageRoot = path.join(root, 'astra-cooldown-benefit-r05-sparkle-v1');
const sparkleAllowlist = JSON.parse(fs.readFileSync(path.join(sparkleSourceRoot, 'allowlist-r01-r04.json'), 'utf8'));
assert.equal(sparkleAllowlist.files.length, 44, 'only the frozen r01-r04 package paths are published');
for (const file of sparkleAllowlist.files) {
  const sourcePath = path.join(sparkleSourceRoot, file.path);
  assert(fs.existsSync(sourcePath), `frozen Cooldown sparkle source ${file.path} exists`);
  assert.equal(fs.statSync(sourcePath).size, file.bytes, `frozen Cooldown sparkle source ${file.path} byte size matches`);
  assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'),
    file.sha256, `frozen Cooldown sparkle source ${file.path} SHA-256 matches`);
  for (const mirror of [sparklePagesRoot, sparklePackageRoot]) {
    const publicPath = path.join(mirror, file.path);
    assert(fs.existsSync(publicPath), `Cooldown sparkle mirror contains ${file.path}`);
    assert.equal(fs.statSync(publicPath).size, file.bytes, `Cooldown sparkle mirror ${file.path} size matches`);
    assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(publicPath)).digest('hex'),
      file.sha256, `Cooldown sparkle mirror ${file.path} SHA-256 matches`);
  }
}
const sparkleVersions = ['r04', 'r03', 'r02', 'r01'].map(revision => JSON.parse(
  fs.readFileSync(path.join(sparklePagesRoot, 'versions', revision, 'VERSION.json'), 'utf8')));
assert.equal(cooldownGroup.versions.length, 11, 'four sparkle replays plus all seven original Cooldown versions remain listed');
assert.deepEqual(Array.from(cooldownGroup.versions.slice(0, 4), item => item.id),
  sparkleVersions.map(item => item.id), 'Cooldown sparkle revisions are newest first');
const sparkleStatus = { 'review-pending': /品質審査候補.*ユーザー未採用.*本編未接続/,
  'quality-hold': /品質保留.*未採用.*本編未接続/, rejected: /品質不合格.*未採用.*本編未接続/ };
for (let index = 0; index < sparkleVersions.length; index++) {
  const metadata = sparkleVersions[index];
  const version = cooldownGroup.versions[index];
  const revision = `r0${metadata.version.match(/r0\.(\d+)$/)[1]}`;
  assert.equal(version.id, metadata.id);
  assert.match(version.status, sparkleStatus[metadata.qualityStatus], `${version.id} reflects its frozen quality status`);
  assert(version.detail.includes(metadata.qualityReason), `${version.id} preserves its exact review reason`);
  assert.equal(metadata.userAdopted, false, `${version.id} is not user adopted`);
  assert.equal(metadata.gameIntegrated, false, `${version.id} is not game integrated`);
  assert.equal(metadata.parentUserAdopted, true, `${version.id} preserves the adopted parent provenance`);
  const url = new URL(version.page, 'https://example.test/webgpu-e-gallery.html');
  assert(url.pathname.endsWith(`/public/astra-cooldown-benefit-r05-sparkle-v1/versions/${revision}/index.html`));
  assert.equal(url.searchParams.get('embed'), '1');
  assert.equal(url.searchParams.get('height'), '64');
  assert.equal(url.searchParams.has('verify'), false, `${version.id} normal replay does not force mute`);
  const expectedEffectHash = sparkleAllowlist.files.find(file => file.path === `versions/${revision}/effect.mjs`).sha256;
  assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(sparklePagesRoot, 'versions', revision, 'effect.mjs'))).digest('hex'), expectedEffectHash);
}
assert.deepEqual(Array.from(cooldownGroup.versions.slice(4), item => item.id),
  cooldownManifest.versions.slice().reverse().map(item => item.id), 'Cooldown revisions are newest first');
for (const version of cooldownGroup.versions.slice(4)) {
  const metadata = cooldownManifest.versions.find(item => item.id === version.id);
  const revision = `r0${version.id.match(/r0\.(\d+)$/)[1]}`;
  assert(metadata, `${version.id} has authoritative metadata`);
  assert.equal(metadata.gameAdopted, false, `${version.id} remains unadopted`);
  assert.match(version.detail, /作者: GPT-6-Astra/);
  assert(version.detail.includes(metadata.reason ?? '主担当へH64/H160証拠を提出済み'), `${version.id} displays its quality reason or pending-review provenance`);
  if (metadata.userAdopted) {
    assert.match(version.status, /ユーザー採用済み.*本編接続は検証中/);
    assert.equal(metadata.adoptionScope, 'visual-version-selection');
    assert.equal(metadata.integrationStatus, 'verification-pending');
    assert.equal(metadata.quality, 'accepted');
    assert.equal(metadata.previousQualityReview.quality, 'rejected');
    assert.equal(metadata.previousQualityReview.reason, metadata.reason, 'the earlier rejection remains in the version history');
  } else if (metadata.quality === 'pending_review') assert.match(version.status, /品質審査中.*本編未採用/);
  else assert.match(version.status, /品質不合格.*本編未採用/);
  const url = new URL(version.page, 'https://example.test/webgpu-e-gallery.html');
  assert(url.pathname.endsWith(`/public/astra-cooldown-benefit-v1/versions/${revision}/index.html`));
  assert(fs.existsSync(path.join(cooldownRoot, 'versions', revision, 'index.html')), `${version.id} gallery page exists`);
  assert.equal(url.searchParams.get('embed'), '1');
  assert.equal(url.searchParams.get('height'), '64');
  assert.equal(url.searchParams.has('verify'), false, `${version.id} normal replay does not force mute`);
  for (const mirror of [cooldownRoot, cooldownPagesRoot]) {
    for (const filename of ['index.html', 'preview.mjs', 'effect.mjs', 'sophia-front-five-v753.png'])
      assert(fs.existsSync(path.join(mirror, 'versions', revision, filename)), `${version.id} has ${filename}`);
    const shaderFile = `shader-${revision}.mjs`;
    if (Number(revision.slice(1)) >= 3)
      assert(fs.existsSync(path.join(mirror, 'versions', revision, shaderFile)), `${version.id} has its shader module`);
  }
  for (const rel of ['index.html', 'preview.mjs', 'effect.mjs', 'sophia-front-five-v753.png']) {
    assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(cooldownRoot, 'versions', revision, rel))).digest('hex'),
      require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(cooldownPagesRoot, 'versions', revision, rel))).digest('hex'),
      `${version.id} Pages mirror matches root public for ${rel}`);
  }
}
const cooldownAdopted = cooldownManifest.versions.find(item => item.id === 'astra-cooldown-benefit-r0.5');
assert.equal(cooldownAdopted.userAdopted, true, 'Cooldown r0.5 is the user-selected visual version');
assert.equal(cooldownAdopted.gameAdopted, false, 'visual selection does not mark game integration complete');
assert.match(cooldownGroup.versions.find(item => item.id === cooldownAdopted.id).detail, /視覚版の選択.*本編への接続と発動は検証中/);
assert.match(cooldownGroup.versions.find(item => item.id === cooldownAdopted.id).detail, /キラキラ改修中・新版未採用/);
const release = source.match(/galleryRelease', '(astra-history-20260928-v\d+)'/);
assert(release && release[1] === 'astra-history-20260928-v75' && html.includes(`webgpu-e-gallery.js?v=${release[1]}`), 'HTML references the matching catalog cache key');
console.log(`PASS: ${entry.versions.length} status-recovery, ${cooldownGroup.versions.length} Cooldown, ${manaGroup.versions.length} Mana, ${staminaGroup.versions.slice(0, 8).length} Stamina replay versions; ${allowlist.publishFiles.length} status package files and ${sparkleAllowlist.files.length} Cooldown sparkle files verified`);
