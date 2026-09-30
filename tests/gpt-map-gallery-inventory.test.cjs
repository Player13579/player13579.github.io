const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repo = path.resolve(__dirname, '../../../../../../');
const app = path.resolve(__dirname, '..');
const gallery = fs.readFileSync(path.join(app, 'asset-gallery.js'), 'utf8');
const assetDir = path.join(app, 'assets/gpt-map-history');
function evaluateVisibleMaps(source = gallery) {
  const start = source.indexOf('  function isEligibleEnvironmentEMapVersion(item) {');
  const end = source.indexOf('  function makeMapPreview(item) {', start);
  assert(start >= 0 && end > start, 'map predicate and production inventory expression exist');
  const fixture = source.slice(start, end) + '\nglobalThis.__visibleMaps = imageGroups; globalThis.__eligibleMapVersion = isEligibleEnvironmentEMapVersion;';
  const context = vm.createContext({});
  vm.runInContext(fixture, context, { timeout: 1000, filename: 'asset-gallery-map-inventory.js' });
  return { maps: context.__visibleMaps, eligible: context.__eligibleMapVersion };
}
const { maps: imageGroups, eligible } = evaluateVisibleMaps();
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// These are preserved provenance inputs. They must remain byte-identical on disk,
// but their historical texture-only groups/versions must not appear in the map view.
const preservedOriginals = [
  ['station-attempt-01', 'outputs/request-20260923/modern-station-map-design/attempt-01/original.png', 'station-attempt-01.png', 'd2a80b2ced722b5ba639b7e38640c1ddb0152c1cadf5c487bf7be31ff7f1d16e'],
  ['station-attempt-02', 'outputs/request-20260923/modern-station-map-design/attempt-02/original.png', 'station-attempt-02.png', '6e20da4be101dc4ed8852d72fb2be5f320a779573158ddb22d386286c0049b18'],
  ['cafeteria-room-attempt-01', 'outputs/request-20260923/modern-station-map-design/one-room-prototype/attempt-01/room-cafeteria-original.png', 'cafeteria-20260923-attempt-01.png', '4475795805cd3dcee358baf3fbccca452488579459179018ccad15eb5b3db5ec'],
  ['cafeteria-room-attempt-02', 'outputs/request-20260923/modern-station-map-design/one-room-prototype/attempt-02/room-cafeteria-original.png', 'cafeteria-20260923-attempt-02.png', '9032820f1a241a45e8e6434cb31ab11936c7bdcd6235bd0ee20402e5e692f8f6'],
  ['cafeteria-room-attempt-03', 'outputs/request-20260923/modern-station-map-design/one-room-prototype/attempt-03/room-cafeteria-original.png', 'cafeteria-20260923-attempt-03.png', 'a86a55567a3377c9df52955c2ca9cbceb23feffda7fce46209780677bf146c10'],
  ['cafeteria-room-attempt-04', 'outputs/request-20260923/modern-station-map-design/one-room-prototype/attempt-04/room-cafeteria-original.png', 'cafeteria-20260923-attempt-04.png', 'c1c1ea6ecb84b643b721760cece01914560093b1e67d5f222e720082af776a65'],
  ['medical-room-attempt-01', 'outputs/request-20260924/modern-station-second-room/medical/medical-chatgpt-original.png', 'medical-attempt-01.png', 'f192d79cacd886615ea438d40764719b17bb74f18749860876e0a0794b67bc2a'],
  ['medical-room-attempt-02-a', 'outputs/request-20260924/modern-station-second-room/medical/medical-chatgpt-attempt2-a.png', 'medical-attempt-02-a.png', '34249c1f432a9ab8798b75524cee80c5f8dbdf2a0659ff9a8894a341ba4072a4'],
  ['medical-room-attempt-02-b', 'outputs/request-20260924/modern-station-second-room/medical/medical-chatgpt-attempt2-b.png', 'medical-attempt-02-b.png', 'eb778cc07b399fc1e6e372615b145ab337fd5afc47d59e41fe28c6bd01fb73c9'],
  ['medical-room-dense-attempt-01', 'outputs/request-20260924/modern-station-second-room/medical/dense-groups-v2/medical-room-attempt-01.png', 'medical-dense-attempt-01.png', 'db22a3413315b6a10dba92d040eef80f396a86efe7b0c2a45c29b8d111c2cc26'],
  ['cafeteria-floor-attempt-02', 'outputs/request-20260923/modern-station-map-design/split/floor/attempt-02/original.png', 'cafeteria-floor-component.png', 'd205dea3669fe9b0a8f63b7cb0078c57a7c99d256853cc1cb2f8fd679e75f25c'],
  ['cafeteria-buffet-attempt-01', 'outputs/request-20260923/modern-station-map-design/split/equipment/buffet/attempt-01/original.png', 'cafeteria-buffet-component.png', 'da99b673cd36a45f055e7442ab1b11e7ebeb9bdaf40699d561055a82ec4623f0']
];
for (const [id, original, copy, expectedHash] of preservedOriginals) {
  assert.equal(sha256(path.join(repo, original)), expectedHash, id + ': preserved source hash');
  assert.equal(sha256(path.join(assetDir, copy)), expectedHash, id + ': preserved gallery-external copy hash');
}

const visibleIds = new Set(imageGroups.map(group => group.id));
assert.deepEqual([...visibleIds], ['security-server-gpt6sol-r01', 'medical-r3-original-environment-r1'], 'only the current server set and the replayable medical E candidate are listed');
const server = imageGroups[0];
assert.equal(server.adoptionUnit, 'original-map-plus-environment-e');
assert.equal(server.adoption, 'adopted');
assert.equal(server.defaultVersionId, 'security-room-e-gpt6sol-luna-r04', 'adopted r04 remains the current default');
assert.equal(server.versions.length, 2, 'r04 and r05 are paired versions; standalone original remains non-selectable');
const adopted = server.versions[0];
assert.equal(adopted.id, 'security-room-e-gpt6sol-luna-r04');
assert.equal(adopted.adoption, 'adopted');
assert.equal(adopted.previewKind, 'webgpu');
assert.equal(adopted.replayable, true);
assert.equal(adopted.environmentEStatus, 'technically-replayable');
assert.equal(adopted.originalSrc, 'public/sol61-server-room-e/r04/security-room-r01-original.png');
assert.equal(adopted.originalHash, 'b13814c922b644ef1c29929c7604df8e9e5f5980ef32c9fe466335e57d01ea64');
assert.equal(sha256(path.join(app, adopted.originalSrc)), adopted.originalHash);
assert.equal(fs.existsSync(path.join(app, adopted.page.split('?')[0])), true, 'the paired environment-E replay page exists');
assert.equal(fs.existsSync(path.join(app, adopted.source)), true, 'the paired runtime/package source exists');
assert.ok(gallery.includes('"id":"security-server-gpt6sol-r01-original"'), 'preserved original-reference metadata remains source data');
assert.equal(server.versions.some(version => version.id === 'security-server-gpt6sol-r01-original'), false, 'standalone original is not surfaced in the map selector');
const serverR05 = server.versions.find(version => version.id === 'security-room-e-gpt6sol-r05');
assert.ok(serverR05, 'server r05 candidate appears under the existing server group');
assert.equal(serverR05.adoption, 'not-adopted');
assert.equal(serverR05.qualityStatus, 'unknown');
assert.equal(serverR05.originalSrc, adopted.originalSrc.replace('/r04/', '/r05/'));
assert.equal(serverR05.originalHash, adopted.originalHash);
assert.equal(sha256(path.join(app, serverR05.originalSrc)), serverR05.originalHash);
assert.equal(fs.existsSync(path.join(app, serverR05.page.split('?')[0])), true, 'server r05 native replay page exists');
assert.equal(fs.existsSync(path.join(app, serverR05.source)), true, 'server r05 package source exists');
assert.equal(serverR05.technicalEvidence, 'outputs/request-20261001/server-r05-improvement/native/QUEUE-FIXED-CASES.json');
assert.equal(serverR05.normalAudioListening, 'not_applicable_no_map_sfx_requested');
const serverEvidence = JSON.parse(fs.readFileSync(path.join(repo, serverR05.technicalEvidence), 'utf8'));
assert.equal(serverEvidence.status.apiReady, true);
assert.equal(serverEvidence.status.lost, false);
assert.equal(serverEvidence.status.firstGPUFrameSubmitted, true);
assert.equal(serverEvidence.status.sourceHash, '0840b7d6f253a8da1b554182abb4efd6fbcf79b3c5ebef0380d8d15260e0dab2');
assert.equal(serverEvidence.status.originalHash, serverR05.originalHash);
assert.deepEqual(serverEvidence.cases.map(item => item.presentation), ['combined', 'combined', 'sourceOnly', 'receiverOnly']);

const medical = imageGroups.find(group => group.id === 'medical-r3-original-environment-r1');
assert.ok(medical, 'medical r3 appears only as its replayable original-plus-E pair');
assert.equal(medical.versions.length, 1);
const medicalR1 = medical.versions[0];
assert.equal(medicalR1.adoption, 'not-adopted');
assert.equal(medicalR1.qualityStatus, 'unknown');
assert.equal(medicalR1.originalSrc, 'public/sol61-medical-r3-environment/r1/medical-room-r3-original.png');
assert.equal(medicalR1.originalHash, '949c6f5d1a5a176e4b9cec098fda7b19b774d1b0cc99fb44f02b18f2e9543bc0');
assert.equal(sha256(path.join(app, medicalR1.originalSrc)), medicalR1.originalHash);
assert.equal(fs.existsSync(path.join(app, medicalR1.page.split('?')[0])), true, 'medical r1 native replay page exists');
assert.equal(fs.existsSync(path.join(app, medicalR1.source)), true, 'medical r1 current package manifest exists');
assert.equal(medicalR1.technicalEvidence, 'outputs/request-20261001/medical-r3-environment/r1/native/CASES-FINAL.json');
assert.equal(medicalR1.normalAudioListening, 'not_applicable_no_map_sfx_requested');
assert.ok(gallery.includes('void showMapOriginal(group, item, generation);'), 'comparison mode uses the selected map version');
assert.ok(gallery.includes('new URL(item.originalSrc, location.href)'), 'comparison fetches that selected version paired original');
assert.ok(gallery.includes("digest !== item.originalHash.toLowerCase()"), 'comparison verifies paired original hash before display');
assert.equal(gallery.includes('"id":"medical-room-code-only-r3"'), true, 'texture-only medical provenance is retained in source data');
assert.equal(imageGroups.some(group => group.id === 'medical-room-code-only-r3'), false, 'texture-only medical original is excluded from visible maps');
const medicalCases = JSON.parse(fs.readFileSync(path.join(repo, medicalR1.technicalEvidence), 'utf8'));
assert.deepEqual(medicalCases.map(item => item.name), ['combined', 'original', 'source-off', 'obs-off']);
for (const item of medicalCases) {
  const evidence = JSON.parse(item.result.result.value).evidence;
  assert.equal(evidence.status, 'ready');
  assert.deepEqual(evidence.errors, []);
  assert.equal(evidence.verify, true);
  assert.equal(evidence.audioGain, 0);
}

function assertEligibilityContract(predicate) {
  const hash = 'a'.repeat(64);
  assert.equal(predicate({ previewKind: 'webgpu', replayable: true, environmentEStatus: 'technically-replayable', originalSrc: 'map/r01.png', originalHash: hash }), true, 'complete paired map E is eligible');
  assert.equal(predicate({ previewKind: 'webgpu', replayable: true, environmentEStatus: 'technically-replayable', originalHash: hash }), false, 'E without its original source is excluded');
  assert.equal(predicate({ previewKind: 'webgpu', replayable: true, environmentEStatus: 'technically-replayable', originalSrc: 'map/r01.png' }), false, 'E without original hash is excluded');
  assert.equal(predicate({ previewKind: 'image', replayable: false, environmentEStatus: 'not-applicable', originalSrc: 'map/r01.png', originalHash: hash }), false, 'texture-only map is excluded');
  assert.equal(predicate({ role: 'reference-only', standaloneAdoption: false, originalSrc: 'map/r01.png', originalHash: hash }), false, 'standalone original reference is excluded');
}
assertEligibilityContract(eligible);
const weakened = gallery.replace(
  "      && typeof item.originalSrc === 'string' && item.originalSrc.length > 0\n      && typeof item.originalHash === 'string' && /^[a-f0-9]{64}$/i.test(item.originalHash);",
  "      && typeof item.originalHash === 'string' && /^[a-f0-9]{64}$/i.test(item.originalHash);"
);
assert.notEqual(weakened, gallery, 'mutation target for original-source requirement found');
const mutantPredicate = evaluateVisibleMaps(weakened).eligible;
assert.throws(() => assertEligibilityContract(mutantPredicate), assert.AssertionError, 'removing the original-source requirement makes the negative fixture fail');
console.log(`Validated ${preservedOriginals.length} preserved historical originals; visible maps contain adopted server r01+r04 plus unadopted server r05 and medical r3 E sets; texture-only/original-only/E-without-pair negative cases pass (mutation detected).`);


