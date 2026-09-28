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
const statusHandoff22 = JSON.parse(fs.readFileSync(path.join(pagesRoot, 'astra-status-cleanse-v1', 'handoff-r22-r26.json'), 'utf8'));
const statusHandoff27 = JSON.parse(fs.readFileSync(path.join(pagesRoot, 'astra-status-cleanse-v1', 'handoff-r27-r29.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'webgpu-e-gallery.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'webgpu-e-gallery.html'), 'utf8');
for (const filename of ['webgpu-e-gallery.js', 'webgpu-e-gallery.html']) {
  assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, filename))).digest('hex'),
    require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(pagesRoot, filename))).digest('hex'),
    `Pages and root public mirrors match for ${filename}`);
}

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
const healR3SourceRoot = path.join(pagesRoot, 'astra-heal-sparkle-r3');
const healR3Package = JSON.parse(fs.readFileSync(path.join(healR3SourceRoot, 'package-files.json'), 'utf8'));
const healR3Manifest = JSON.parse(fs.readFileSync(path.join(healR3SourceRoot, 'replay-manifest.json'), 'utf8'));
assert.equal(healR3Manifest.id, 'heal-astra-sparkle-r3');
assert.equal(healR3Manifest.quality, 'candidate');
assert.equal(healR3Manifest.autoplay, true);
assert.equal(healR3Manifest.loopSeconds, 12);
assert.equal(healR3Manifest.defaultActorHeightPixels, 64);
assert.equal(healR3Manifest.angleContract.longRayDegrees, -64);
assert.equal(healR3Manifest.angleContract.crossRayDegrees, 26);
assert.equal(healR3Manifest.angleContract.angleDistributionCount, 1, 'Heal r3 uses one uniform sparkle angle');
assert.equal(healR3Package.files.length, 17, 'Heal r3 publishes exactly its frozen package allowlist');
for (const file of healR3Package.files) {
  for (const base of [healR3SourceRoot, path.join(root, 'astra-heal-sparkle-r3'), path.join(pagesPublicRoot, 'astra-heal-sparkle-r3')]) {
    const target = path.join(base, file.path);
    assert(fs.existsSync(target), `Heal r3 package file ${file.path} exists in source and both mirrors`);
    assert.equal(fs.statSync(target).size, file.bytes, `Heal r3 file ${file.path} size matches freeze`);
    assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(target)).digest('hex'),
      file.sha256, `Heal r3 file ${file.path} SHA-256 matches freeze`);
  }
}
const healR2SourceRoot = path.join(pagesRoot, 'astra-heal-sparkle-r2');
const healR2Package = JSON.parse(fs.readFileSync(path.join(healR2SourceRoot, 'package-files.json'), 'utf8'));
const healR2Manifest = JSON.parse(fs.readFileSync(path.join(healR2SourceRoot, 'replay-manifest.json'), 'utf8'));
assert.equal(healR2Manifest.id, 'heal-astra-sparkle-r2');
assert.equal(healR2Manifest.quality, 'candidate');
assert.equal(healR2Package.files.length, 17, 'Heal r2 uses its exact frozen package allowlist');
for (const file of healR2Package.files) {
  for (const base of [healR2SourceRoot, path.join(root, 'astra-heal-sparkle-r2'), path.join(pagesPublicRoot, 'astra-heal-sparkle-r2')]) {
    const target = path.join(base, file.path);
    assert(fs.existsSync(target), `Heal r2 allowlisted file ${file.path} is present`);
    assert.equal(fs.statSync(target).size, file.bytes, `Heal r2 file ${file.path} byte size matches freeze`);
    assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(target)).digest('hex'),
      file.sha256, `Heal r2 file ${file.path} SHA-256 matches freeze`);
  }
}
const healR2Implementation = fs.readFileSync(path.join(healR2SourceRoot, 'heal-sparkle.js'), 'utf8');
assert.match(healR2Implementation, /angle:Math\.atan2\(-17\.8-y,-x\)/,
  'Heal r2 angle varies by receiver anchor and does not meet the unified-angle rule');
const healR3Implementation = fs.readFileSync(path.join(healR3SourceRoot, 'heal-sparkle.js'), 'utf8');
assert.match(healR3Implementation, /ANGLE_DEGREES\s*=\s*-64/,
  'Heal r3 uses its single uniform long-ray angle');
const luckSourceRoot = path.join(pagesRoot, 'astra-luck-v4-sparkle-v1');
const luckGalleryFiles = JSON.parse(fs.readFileSync(path.join(luckSourceRoot, 'GALLERY-FILES.json'), 'utf8'));
assert.equal(luckGalleryFiles.runtimeExactAllowlist.length, 12, 'Luck sparkle publication uses only its exact runtime allowlist');
for (const file of luckGalleryFiles.runtimeExactAllowlist) {
  for (const base of [luckSourceRoot, path.join(root, 'astra-luck-v4-sparkle-v1'), path.join(pagesPublicRoot, 'astra-luck-v4-sparkle-v1')]) {
    const target = path.join(base, file.path);
    assert(fs.existsSync(target), `Luck allowlisted runtime ${file.path} is present`);
    assert.equal(fs.statSync(target).size, file.bytes, `Luck runtime ${file.path} byte size matches freeze`);
    assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(target)).digest('hex'),
      file.sha256, `Luck runtime ${file.path} SHA-256 matches freeze`);
  }
}
const luckR02Implementation = fs.readFileSync(path.join(luckSourceRoot, 'versions/r02/webgpu-luck-v4-sparkle-r02.js'), 'utf8');
assert.match(luckR02Implementation, /direction=vec2f\(0\.,6\.\)-center/);
assert.match(luckR02Implementation, /if\(owner==3u\).*direction=limb\[id-6u\]/,
  'Luck r02 uses distinct orientation rules by sparkle owner and limb');
const luckZeroSourceRoot = path.join(pagesRoot, 'astra-luck-zero-v1');
const luckZeroPublication = JSON.parse(fs.readFileSync(path.join(luckZeroSourceRoot, 'PUBLICATION-r01-r06.json'), 'utf8'));
const luckZeroR05Quality = JSON.parse(fs.readFileSync(path.join(luckZeroSourceRoot, 'versions/r05/QUALITY-r05.json'), 'utf8'));
const luckZeroR06Quality = JSON.parse(fs.readFileSync(path.join(luckZeroSourceRoot, 'versions/r06/QUALITY-r06.json'), 'utf8'));
assert.equal(luckZeroPublication.runtimeExactAllowlist.length, 24, 'Luck zero publication contains exactly four files for each frozen revision');
assert.deepEqual(luckZeroPublication.entries.map(item => item.revision), ['r01', 'r02', 'r03', 'r04', 'r05', 'r06']);
assert(luckZeroPublication.entries.every(item => item.qualityStatus === 'rejected' && item.adopted === false && item.gameIntegrated === false));
const luckZeroR05Record = luckZeroPublication.entries.find(item => item.revision === 'r05');
assert.equal(luckZeroR05Record.technicalStatus, 'real_webgpu_standalone_replay_pass');
assert.equal(luckZeroR05Record.performanceStatus, 'rejected_continuity');
assert.equal(luckZeroR05Record.auditoryReview, 'not_run');
assert.equal(luckZeroR05Quality.quality, 'rejected');
const luckZeroR06Record = luckZeroPublication.entries.find(item => item.revision === 'r06');
assert.equal(luckZeroR06Record.technicalStatus, 'real_webgpu_standalone_replay_pass');
assert.equal(luckZeroR06Record.performanceStatus, 'rejected_continuity');
assert.equal(luckZeroR06Record.auditoryReview, 'not_run');
assert.equal(luckZeroR06Quality.quality, 'rejected');
assert.equal(luckZeroR06Quality.adopted, false);
assert.equal(luckZeroR06Quality.gameIntegrated, false);
for (const file of luckZeroPublication.runtimeExactAllowlist) {
  for (const base of [luckZeroSourceRoot, path.join(pagesPublicRoot, 'astra-luck-zero-v1'), path.join(root, 'astra-luck-zero-v1')]) {
    const target = path.join(base, file.relativePath);
    assert(fs.existsSync(target), `Luck zero allowlisted runtime ${file.relativePath} exists in source and both public mirrors`);
    assert.equal(fs.statSync(target).size, file.bytes, `Luck zero runtime ${file.relativePath} byte size matches freeze`);
    assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(target)).digest('hex'),
      file.sha256, `Luck zero runtime ${file.relativePath} SHA-256 matches freeze`);
  }
}
assert(!fs.existsSync(path.join(pagesPublicRoot, 'astra-luck-zero-v1', 'index.html')),
  'Luck zero publication excludes the mutable root alias');
for (const version of ['r01', 'r02', 'r03', 'r04', 'r05', 'r06']) {
  const implementation = fs.readFileSync(path.join(luckZeroSourceRoot, 'versions', version, `luck-zero-${version}.js`), 'utf8');
  assert.match(implementation, /function loop\(t\)/, `${version} includes automatic animation loop`);
  assert.match(implementation, /cycle=Math\.floor\(/, `${version} repeats its cycle automatically`);
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

class VerifyElement extends Element {
  constructor() { super(); this.listeners = {}; this.tagName = 'DIV'; this.clientWidth = 760; this.clientHeight = 420; }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  append(...children) { for (const child of children) child.parentElement = this; super.append(...children); }
  querySelector(selector) { return selector === 'iframe' ? this.children.find(child => child.tagName === 'IFRAME') ?? null : null; }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); }
}
const verifyElements = new Map();
const verifyDocument = {
  getElementById(id) { if (!verifyElements.has(id)) verifyElements.set(id, new VerifyElement()); return verifyElements.get(id); },
  createElement(tag) { const element = new VerifyElement(); element.tagName = String(tag).toUpperCase(); return element; }
};
vm.runInNewContext(source, {
  document: verifyDocument, window: {}, URL, URLSearchParams,
  location: { search: '?verify=1', href: 'https://example.test/webgpu-e-gallery.html?verify=1' },
  navigator: { gpu: {} }, ResizeObserver: class { observe() {} disconnect() {} }
});
const healCatalogButton = verifyElements.get('catalog').children.find(button => button.dataset.id === 'heal-astra');
healCatalogButton.listeners.click();
const healIframe = verifyElements.get('stage').querySelector('iframe');
assert(healIframe, 'Heal gallery entry creates a replay iframe');
assert.equal(healIframe.allow, 'autoplay');
const verifiedHealReplay = new URL(healIframe.src);
assert(verifiedHealReplay.pathname.endsWith('/public/astra-heal-sparkle-r3/index.html'));
assert.equal(verifiedHealReplay.searchParams.get('verify'), '1', 'gallery verification mode propagates to Heal r3');
assert.equal(verifiedHealReplay.searchParams.get('embed'), '1');
assert.equal(verifiedHealReplay.searchParams.get('height'), '64');
const statusCatalogButton = verifyElements.get('catalog').children.find(button => button.dataset.id === 'status-cleanse-astra');
statusCatalogButton.listeners.click();
const statusIframe = verifyElements.get('stage').querySelector('iframe');
assert(statusIframe, 'status gallery entry creates a replay iframe');
assert.equal(statusIframe.allow, 'autoplay', 'status replay iframe permits its tested auto-loop');
assert.match(statusIframe.title, /自動再生/);
const verifiedReplay = new URL(statusIframe.src);
assert.equal(verifiedReplay.searchParams.get('verify'), '1', 'gallery verification mode propagates to replay');
assert.equal(verifiedReplay.searchParams.get('embed'), '1');
assert.equal(verifiedReplay.searchParams.get('h'), '64');
assert.equal(verifiedReplay.searchParams.get('galleryRelease'), 'astra-history-20260928-v81');
const luckCatalogButton = verifyElements.get('catalog').children.find(button => button.dataset.id === 'luck-astra');
luckCatalogButton.listeners.click();
const verifiedLuckZeroIframe = verifyElements.get('stage').querySelector('iframe');
assert(verifiedLuckZeroIframe, 'Luck zero gallery selection creates a replay iframe');
assert.equal(verifiedLuckZeroIframe.allow, 'autoplay', 'Luck zero iframe permits automatic replay audio under browser policy');
const verifiedLuckZeroReplay = new URL(verifiedLuckZeroIframe.src);
assert(verifiedLuckZeroReplay.pathname.endsWith('/public/astra-luck-zero-v1/versions/r06/index.html'));
assert.equal(verifiedLuckZeroReplay.searchParams.get('verify'), '1', 'gallery verification mode propagates to Luck zero');
assert.equal(verifiedLuckZeroReplay.searchParams.get('embed'), '1');
assert.equal(verifiedLuckZeroReplay.searchParams.get('height'), '64');

const healGroup = window.__webgpuEGallery.entries.find(item => item.id === 'heal-astra');
assert(healGroup, 'Heal Astra replay group exists');
assert.deepEqual(Array.from(healGroup.versions, item => item.id), [
  healR3Manifest.id, healR2Manifest.id, healManifest.id, ...healManifest.history.slice().reverse().map(item => item.id), 'heal-astra-prototype'
], 'Heal sparkle revisions are newest first while retaining the adopted original');
const healCandidate = healGroup.versions[0];
assert.match(healCandidate.status, /視覚品質候補.*ユーザー未採用.*本編未接続/);
assert.match(healCandidate.detail, /光条角度は全点・全位相で統一.*−64°.*\+26°.*音実聴未実施.*本編未接続/);
assert(healCandidate.detail.includes(healR3Manifest.qualityReason), 'Heal r3 shows its exact review reason');
const healR2Listing = healGroup.versions[1];
assert.match(healR2Listing.status, /比較用旧稿.*角度統一条件未対応.*未採用.*本編未接続/);
assert.match(healR2Listing.detail, /回復リボン接線に合わせて光条ごとに角度を変える/);
assert(healR2Listing.detail.includes(healR2Manifest.qualityReason), 'Heal r2 keeps its original review reason');
assert.match(healGroup.versions[2].status, /品質審査候補.*未採用.*本編未接続/);
const healCandidateUrl = new URL(healCandidate.page, 'https://example.test/webgpu-e-gallery.html');
assert.equal(healCandidateUrl.searchParams.has('verify'), false, 'normal Heal r3 replay does not force mute');
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
const luckGroup = window.__webgpuEGallery.entries.find(item => item.id === 'luck-astra');
const sunbeamLatest = window.__webgpuEGallery.entries.find(item => item.id === 'sunbeam-astra').versions[0];
assert.match(sunbeamLatest.status, /品質保留.*再改修中.*ユーザー採用保留.*本編未採用/,
  'Sunbeam v3 adoption remains on hold during the requested quality revision');
assert.match(sunbeamLatest.detail, /以前の視覚採用判断は保留.*本編接続は承認されていません/);
assert.deepEqual(Array.from(luckGroup.versions.slice(0, 9), item => item.id), [
  'luck-astra-zero-r06', 'luck-astra-zero-r05', 'luck-astra-zero-r04', 'luck-astra-zero-r03', 'luck-astra-zero-r02', 'luck-astra-zero-r01',
  'luck-astra-v4-sparkle-r02', 'luck-astra-v4-sparkle-r01', 'luck-astra-clean-v4'
], 'Luck zero revisions are newest first while preserving prior history and adopted original');
for (const record of luckZeroPublication.entries.slice().reverse()) {
  const version = luckGroup.versions.find(item => item.id === `luck-astra-zero-${record.revision}`);
  assert(version, `${record.revision} is listed`);
  if (record.revision === 'r05') {
    assert.match(version.status, /品質不合格・性能不合格・未採用・本編未接続/);
    assert.match(version.detail, /sparkle OFFでも浅い黄色の不規則な床リング.*RAF間隔P95 53\.2ms、最大162\.1ms（原因未特定）/);
    assert.match(version.detail, /形成と受益者応答が分離せず.*袖\/脚への反射も弱い.*光条はこの主因を補えない/);
    assert.equal(Number(luckZeroR05Quality.technical.performance.p95Ms.toFixed(1)), 53.2);
    assert.equal(Number(luckZeroR05Quality.technical.performance.maxMs.toFixed(1)), 162.1);
  } else if (record.revision === 'r06') {
    assert.match(version.status, /品質不合格・性能不合格・未採用・本編未接続/);
    assert.match(version.detail, /Star-OFF H64は肩外の淡い橙2斑点.*RAF間隔P95 53\.9ms、最大161\.7ms（原因未特定）/);
    assert.match(version.detail, /背面alphaに隠れて弱い霞.*2像から良好な受益状態への変化が視認できず/);
    assert.equal(Number(luckZeroR06Quality.technical.performance.p95Ms.toFixed(1)), 53.9);
    assert.equal(Number(luckZeroR06Quality.technical.performance.maxMs.toFixed(1)), 161.7);
  } else {
    assert.match(version.status, /品質不合格・未採用・本編未接続/);
    assert(version.detail.includes(record.qualityReason), `${record.revision} displays exact frozen rejection reason`);
  }
  assert.match(version.detail, /作者: GPT-6-Astra.*実GPU standalone再生確認済み/);
  assert.match(version.detail, /聴感未実施.*ユーザー未採用.*本編未接続/);
  const pageUrl = new URL(version.page, 'https://example.test/webgpu-e-gallery.html');
  const replayURL = record.replayURL || record.technicalReplayURL;
  assert(pageUrl.pathname.endsWith(`/public/${replayURL.split('?')[0]}`));
  assert.equal(pageUrl.searchParams.get('embed'), '1');
  assert.equal(pageUrl.searchParams.get('height'), '64');
  assert.equal(pageUrl.searchParams.has('verify'), false, `${record.revision} normal replay does not force verification mute`);
  assert.equal(pageUrl.searchParams.has('autoplay'), false, `${record.revision} uses its automatic replay loop`);
}
assert.deepEqual(Array.from(luckGroup.versions.slice(6, 9), item => item.id), [
  'luck-astra-v4-sparkle-r02', 'luck-astra-v4-sparkle-r01', 'luck-astra-clean-v4'
], 'Luck sparkle revisions are newest first and retain the adopted original');
const luckStatus = JSON.parse(fs.readFileSync(path.join(luckSourceRoot, 'VERSION-STATUS.json'), 'utf8'));
for (const [index, revision] of [['r02', 6], ['r01', 7]]) {
  const metadata = luckStatus[index];
  const version = luckGroup.versions[revision];
  assert.equal(metadata.userAdopted, false);
  assert.equal(metadata.gameIntegrated, false);
  assert(version.detail.includes(metadata.reason), `${version.id} displays its authoritative review reason`);
  if (index === 'r02') {
    assert.match(version.status, /比較用旧稿.*角度統一条件未対応.*未採用.*本編未接続/);
    assert.match(version.detail, /胴.*受益者.*向きを変える旧稿.*ゼロ設計の新幸運版を制作中/);
  } else assert.match(version.status, /品質不合格.*既採用版の履歴改修.*未採用.*本編未接続/);
  assert.match(version.detail, /作者: GPT-6-Astra.*採用済みv4への履歴改修/);
  assert.match(version.detail, /聴感not_run.*本編未接続/);
  const pageUrl = new URL(version.page, 'https://example.test/webgpu-e-gallery.html');
  assert(pageUrl.pathname.endsWith(`/public/astra-luck-v4-sparkle-v1/versions/${index}/index.html`));
  assert.equal(pageUrl.searchParams.get('embed'), '1');
  assert.equal(pageUrl.searchParams.get('height'), '64');
  assert.equal(pageUrl.searchParams.has('verify'), false, `${version.id} normal replay does not force verification mute`);
}
const adoptedLuck = luckGroup.versions.find(item => item.id === 'luck-astra-clean-v4');
assert.match(adoptedLuck.detail, /キラキラ改修中・新版未採用/);
const adoptedCooldown = window.__webgpuEGallery.entries.find(item => item.id === 'cooldown-astra').versions.find(item => item.id === 'astra-cooldown-benefit-r0.5');
assert.match(adoptedCooldown.status, /ユーザー採用済み/);
assert.match(adoptedCooldown.detail, /キラキラ改修中・新版未採用/);
assert.match(html, /astra-history-20260928-v81/);

const entry = window.__webgpuEGallery.entries.find(item => item.id === 'status-cleanse-astra');
assert(entry, 'status-recovery Astra gallery entry exists');
const statusRecords = manifest.versions.concat(frozenHandoff.versions.map(item => item.version), statusHandoff22.versions, statusHandoff27.versions);
assert.equal(entry.versions.length, 29, 'all twenty-nine reproducible versions are listed');
assert.deepEqual(Array.from(entry.versions, item => item.id), statusRecords.slice().reverse().map(item => item.id),
  'versions are ordered newest first and match source status records');
for (const record of statusHandoff22.versions.concat(statusHandoff27.versions)) {
  const revision = record.id.match(/r(\d+)$/)[1];
  const item = entry.versions.find(version => version.id === record.id);
  assert.equal(record.technicalStatus, 'webgpu-replay-verified', `${record.id} has source replay verification`);
  assert.equal(record.userAdopted, false, `${record.id} is not adopted`);
  assert.equal(record.gameIntegrated, false, `${record.id} is not integrated`);
  assert.equal(record.verifiedAutoLoops, 3, `${record.id} completed three verified loops`);
  if (record.qualityStatus === 'rejected') assert.match(item.status, /品質不合格.*本編未採用/, `${record.id} retains rejection`);
  else assert.match(item.status, /品質保留.*本編未採用/, `${record.id} remains on quality hold`);
  assert.match(item.detail, /作者: GPT-6-Astra/);
  assert(item.detail.includes(record.qualityReason), `${record.id} retains its exact recorded quality reason`);
  const pageUrl = new URL(item.page, 'https://example.test/webgpu-e-gallery.html');
  assert(pageUrl.pathname.endsWith(`/astra-status-cleanse-v1/versions/r${revision}/index.html`));
  assert.equal(pageUrl.searchParams.get('embed'), '1');
  assert.equal(pageUrl.searchParams.get('h'), '64');
  assert.equal(pageUrl.searchParams.has('verify'), false, `${record.id} normal gallery replay does not force verification mute`);
  assert.equal(pageUrl.searchParams.has('autoplay'), false, `${record.id} uses the package's automatic replay`);
  assert.deepEqual(record.requiredFiles.length, 6, `${record.id} keeps its six-file frozen runtime allowlist`);
  for (const relative of record.requiredFiles) {
    const expected = record.sourceSha256[relative];
    assert(expected, `${record.id}/${relative} has an authoritative source SHA-256`);
    for (const base of [
      path.join(pagesRoot, 'astra-status-cleanse-v1', 'versions', `r${revision}`),
      path.join(pagesPublicRoot, 'astra-status-cleanse-v1', 'versions', `r${revision}`),
      path.join(packageRoot, 'versions', `r${revision}`)
    ]) {
      const file = path.join(base, relative);
      assert(fs.existsSync(file), `${record.id}/${relative} exists in source and both public mirrors`);
      assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
        expected, `${record.id}/${relative} SHA-256 matches its frozen source`);
    }
  }
}
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
const statusRejectedIds = new Set(statusHandoff22.versions.map(record => record.id));
const statusHoldIds = new Set(statusHandoff27.versions.map(record => record.id));
for (const version of entry.versions) {
  const catalog = statusRecords.find(item => item.id === version.id);
  if (statusRejectedIds.has(version.id)) {
    assert.match(version.status, /品質不合格.*本編未採用/);
    assert.equal(catalog.qualityStatus, 'rejected', `${version.id} preserves its source rejection`);
    assert(version.detail.includes(catalog.qualityReason), `${version.id} preserves its exact source review reason`);
  } else if (statusHoldIds.has(version.id)) {
    assert.match(version.status, /品質保留.*本編未採用/);
    assert(version.detail.includes(catalog.qualityReason), `${version.id} preserves its source review reason`);
    assert.equal(catalog.qualityStatus, 'quality-hold', `${version.id} remains on its recorded quality hold`);
  } else {
    assert.match(version.status, /品質不合格.*本編未採用/);
    assert.equal(catalog.qualityStatus, 'rejected', `${version.id} retains its recorded rejection`);
  }
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
assert(release && release[1] === 'astra-history-20260928-v81' && html.includes(`webgpu-e-gallery.js?v=${release[1]}`), 'HTML references the matching catalog cache key');
console.log(`PASS: ${healGroup.versions.length} Heal, ${luckGroup.versions.length} Luck, ${entry.versions.length} status-recovery, ${cooldownGroup.versions.length} Cooldown, ${manaGroup.versions.length} Mana, ${staminaGroup.versions.slice(0, 8).length} Stamina versions; package SHA manifests verified`);
