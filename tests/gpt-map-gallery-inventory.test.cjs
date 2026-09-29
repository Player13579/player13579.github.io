const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repo = path.resolve(__dirname, '../../../../../../');
const app = path.resolve(__dirname, '..');
const gallery = fs.readFileSync(path.join(app, 'asset-gallery.js'), 'utf8');
const assetDir = path.join(app, 'assets/gpt-map-history');
function evaluateImageGroups(source) {
  const start = source.indexOf('  const imageGroups = [');
  assert(start >= 0, 'imageGroups declaration exists');
  const filterStart = source.indexOf('  ].filter(group => ![', start);
  assert(filterStart > start, 'imageGroups exclusion filter exists');
  const filterEnd = source.indexOf(';', filterStart);
  assert(filterEnd > filterStart, 'imageGroups expression ends');
  const expression = source.slice(start, filterEnd + 1).replace('  const imageGroups = [', 'globalThis.__evaluatedImageGroups = [');
  const context = vm.createContext({});
  vm.runInContext(expression, context, { timeout: 1000, filename: 'asset-gallery-imageGroups-fixture.js' });
  return context.__evaluatedImageGroups;
}
const imageGroups = evaluateImageGroups(gallery);
const versions = [
  ['station-attempt-01', 'outputs/request-20260923/modern-station-map-design/attempt-01/original.png', 'station-attempt-01.png', 'd2a80b2ced722b5ba639b7e38640c1ddb0152c1cadf5c487bf7be31ff7f1d16e'],
  ['station-attempt-02', 'outputs/request-20260923/modern-station-map-design/attempt-02/original.png', 'station-attempt-02.png', '6e20da4be101dc4ed8852d72fb2be5f320a779573158ddb22d386286c0049b18'],
  ['cafeteria-room-attempt-01', 'outputs/request-20260923/modern-station-map-design/one-room-prototype/attempt-01/room-cafeteria-original.png', 'cafeteria-20260923-attempt-01.png', '4475795805cd3dcee358baF3fbccca452488579459179018ccad15eb5b3db5ec'.toLowerCase()],
  ['cafeteria-room-attempt-02', 'outputs/request-20260923/modern-station-map-design/one-room-prototype/attempt-02/room-cafeteria-original.png', 'cafeteria-20260923-attempt-02.png', '9032820f1a241a45e8e6434cb31ab11936c7bdcd6235bd0ee20402e5e692f8f6'],
  ['cafeteria-room-attempt-03', 'outputs/request-20260923/modern-station-map-design/one-room-prototype/attempt-03/room-cafeteria-original.png', 'cafeteria-20260923-attempt-03.png', 'a86a55567a3377c9df52955c2ca9cbceb23feffda7fce46209780677bf146c10'],
  ['cafeteria-room-attempt-04', 'outputs/request-20260923/modern-station-map-design/one-room-prototype/attempt-04/room-cafeteria-original.png', 'cafeteria-20260923-attempt-04.png', 'c1c1ea6ecb84b643b721760cece01914560093b1e67d5f222e720082af776a65'],
  ['medical-room-attempt-01', 'outputs/request-20260924/modern-station-second-room/medical/medical-chatgpt-original.png', 'medical-attempt-01.png', 'f192d79cacd886615ea438d40764719b17bb74f18749860876e0a0794b67bc2a'],
  ['medical-room-attempt-02-a', 'outputs/request-20260924/modern-station-second-room/medical/medical-chatgpt-attempt2-a.png', 'medical-attempt-02-a.png', '34249c1f432a9ab8798b75524cee80c5f8dbdf2a0659ff9a8894a341ba4072a4'],
  ['medical-room-attempt-02-b', 'outputs/request-20260924/modern-station-second-room/medical/medical-chatgpt-attempt2-b.png', 'medical-attempt-02-b.png', 'eb778cc07b399fc1e6e372615b145ab337fd5afc47d59e41fe28c6bd01fb73c9'],
  ['medical-room-dense-attempt-01', 'outputs/request-20260924/modern-station-second-room/medical/dense-groups-v2/medical-room-attempt-01.png', 'medical-dense-attempt-01.png', 'db22a3413315b6a10dba92d040eef80f396a86efe7b0c2a45c29b8d111c2cc26'],
  ['cafeteria-floor-attempt-02', 'outputs/request-20260923/modern-station-map-design/split/floor/attempt-02/original.png', 'cafeteria-floor-component.png', 'd205dea3669fe9b0a8f63b7cb0078c57a7c99d256853cc1cb2f8fd679e75f25c'],
  ['cafeteria-buffet-attempt-01', 'outputs/request-20260923/modern-station-map-design/split/equipment/buffet/attempt-01/original.png', 'cafeteria-buffet-component.png', 'da99b673cd36a45f055e7442ab1b11e7ebeb9bdaf40699d561055a82ec4623f0'],
];
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const [id, original, copy, expectedHash] of versions) {
  const originalPath = path.join(repo, original);
  const copiedPath = path.join(assetDir, copy);
  assert.equal(sha256(originalPath), expectedHash, id + ': source manifest hash');
  assert.equal(sha256(copiedPath), expectedHash, id + ': copied original bytes');
  assert.ok(gallery.includes("id:'" + id + "'"), id + ': gallery listing');
  assert.ok(gallery.includes("src:'assets/gpt-map-history/" + copy + "'"), id + ': source asset');
  assert.ok(gallery.includes("creatorDisplayName:") && gallery.includes("id:'" + id + "'"), id + ': author metadata');
}
for (const id of ['station-gpt-history', 'cafeteria-gpt-20260923', 'medical-gpt-history']) {
  assert.ok(gallery.includes("id:'" + id + "'"), id + ': gallery group');
}
const visibleGroupIds = new Set(imageGroups.map(group => group.id));
for (const id of ['cafeteria-gpt-pro', 'cafeteria-floor-component', 'cafeteria-buffet-component', 'station-gpt-history']) {
  assert.equal(visibleGroupIds.has(id), false, id + ': excluded from evaluated gallery inventory');
}
const cafeteriaGroup = imageGroups.find(group => group.id === 'cafeteria-gpt-20260923');
assert(cafeteriaGroup, 'cafeteria prototype history remains listed');
assert.equal(cafeteriaGroup.defaultVersionId, 'cafeteria-room-attempt-04');
const cafeteriaAttempt04 = cafeteriaGroup.versions.find(version => version.id === 'cafeteria-room-attempt-04');
assert.equal(cafeteriaAttempt04.adoption, 'adopted');
assert.equal(cafeteriaAttempt04.qualityStatus, 'user-adopted-geometry-unresolved');
assert.equal(cafeteriaGroup.versions.length, 4, 'older cafeteria prototypes remain in history');
for (const oldVersion of cafeteriaGroup.versions.filter(version => version.id !== 'cafeteria-room-attempt-04')) {
  assert.equal(oldVersion.adoption, 'not-adopted', oldVersion.id + ': retain its own adoption status');
}
const medicalGroup = imageGroups.find(group => group.id === 'medical-gpt-history');
assert(medicalGroup, 'medical prototype history remains listed');
const denseMedical = medicalGroup.versions.find(version => version.id === 'medical-room-dense-attempt-01');
assert.equal(denseMedical, undefined, 'dense medical excluded from displayed gallery history');
assert.equal(medicalGroup.versions.length, 5, 'normal medical prototype history remains listed');
assert.equal(medicalGroup.versions[0].id, 'medical-room-normal-20260930-r2', 'new normal candidate listed first');
assert.equal(sha256(path.join(assetDir, 'medical-zero-normal-r2.png')), 'e511e9fd0bf876ea159004c96bd3336d0260615a1a8929991f85a5080ddf9cd8');
assert.equal(sha256(path.join(assetDir, 'medical-zero-normal-r1.png')), 'e862dd2fd3d7c1b4555df3d4465d82b4ca24c4e593ea1f3aa9e73073844cdeca');
assert.match(gallery, /今後高密度版は制作しない/, 'withdrawn source provenance remains preserved');
assert.match(gallery, /attempt 02-bの受入は一室プロトタイプに限り、ゲーム採用・本編統合を意味しない/);
assert.match(gallery, /完成マップではなく、単一カフェテリア用の床材テクスチャ部品/);
assert.match(gallery, /完成マップではなく単体設備の原画候補/);
assert.match(gallery, /item\.creatorDisplayName\|\|group\.creatorDisplayName/);
for (const hash of ['ef0abe403f5f490613c2d0964675d3be40f096dce6dc51f500ee9ba53d2bf92c', '5f4db0fa28657bde8572b50e7cdb092acd8e3713efea318d61c7a1c1d375bb83', '83987386bb00cc712b10380c25c011f7311ee300307ab35a99153d074886f7f0', 'eaf56895b2d8bfda638ffe12a7ef3f5d812070b1b4d655afca4538c7f7b8f57']) {
  assert.ok(gallery.includes(hash), 'existing 2026-09-29 cafeteria ' + hash);
}
assert.ok(gallery.indexOf("id:'cafeteria-room-attempt-04'") < gallery.indexOf("id:'cafeteria-room-attempt-01'"), 'cafeteria history newest first');
assert.ok(gallery.indexOf("id:'medical-room-attempt-02-b'") < gallery.indexOf("id:'medical-room-attempt-01'"), 'medical versions newest first');
const ids = [...gallery.matchAll(/\bid:'([^']+)'/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'gallery identifiers are unique');
console.log('Validated ' + versions.length + ' saved originals and hashes, evaluated gallery exclusions, adoption metadata and preserved prototype history.');
